-- Temporary ownership-transfer privilege for managed Supabase migration admin.
GRANT CREATE ON SCHEMA deliverable TO app_deliverable_owner;
-- Closed worker privileges and exact Job Scope integration; no Banker Session is handed to workers.
GRANT USAGE ON SCHEMA extensions TO app_deliverable_owner;
GRANT EXECUTE ON FUNCTION extensions.digest(text,text),extensions.digest(bytea,text) TO app_deliverable_owner;
GRANT SELECT,INSERT,DELETE ON app.request_context TO app_deliverable_owner;
ALTER TABLE deliverable.workbook_job ADD COLUMN active_scope_id uuid REFERENCES jobs.job_scope(id);
ALTER TABLE app.runtime_principal DROP CONSTRAINT runtime_principal_principal_code_check;
ALTER TABLE app.runtime_principal ADD CHECK(principal_code IN ('reference_worker','workbook_worker'));
INSERT INTO app.runtime_principal(principal_code,credential_version) VALUES('workbook_worker','workbook-worker-credential-v1');
ALTER TABLE jobs.job DROP CONSTRAINT job_command_type_check,DROP CONSTRAINT job_purpose_code_check,DROP CONSTRAINT job_allowance_class_check;
ALTER TABLE jobs.job ADD CHECK(command_type IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','workbook_ai_review')),
 ADD CHECK(purpose_code IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','workbook_ai_review')),
 ADD CHECK(allowance_class IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','workbook_ai_review'));
DROP POLICY artifact_job_owner ON jobs.job;
CREATE POLICY artifact_job_owner ON jobs.job TO app_deliverable_owner USING(command_type IN ('analysis_workbook_build','analysis_workbook_qc','workbook_ai_review') AND account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal()) WITH CHECK(command_type IN ('analysis_workbook_build','analysis_workbook_qc','workbook_ai_review') AND account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal());
ALTER TABLE jobs.job_step DROP CONSTRAINT job_step_operation_class_check,DROP CONSTRAINT job_step_step_code_check;
ALTER TABLE jobs.job_step ADD CHECK(operation_class IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','ai_source_proposal')),
 ADD CHECK(step_code IN ('accepted_inputs','source_checkpoint','workspace_checkpoint','reference_result','artifact_execution'));
ALTER TABLE jobs.job_scope DROP CONSTRAINT job_scope_operation_code_check;
ALTER TABLE jobs.job_scope ADD CHECK(operation_code IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','ai_source_proposal'));
ALTER TABLE jobs.job_scope_operation DROP CONSTRAINT job_scope_operation_operation_code_check;
ALTER TABLE jobs.job_scope_operation ADD CHECK(operation_code IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','ai_source_proposal'));
DO $$ DECLARE table_name text; BEGIN
 FOREACH table_name IN ARRAY ARRAY['job_step','job_attempt','job_lease','job_scope','job_scope_deal'] LOOP
  EXECUTE format('GRANT SELECT,INSERT,UPDATE ON jobs.%I TO app_deliverable_owner',table_name);
  EXECUTE format('CREATE POLICY workbook_worker_scope ON jobs.%I TO app_deliverable_owner USING(account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal()) WITH CHECK(account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal())',table_name);
 END LOOP;
END $$;
GRANT SELECT,INSERT ON jobs.job_scope_operation TO app_deliverable_owner;
CREATE POLICY workbook_worker_operation ON jobs.job_scope_operation TO app_deliverable_owner USING(EXISTS(SELECT 1 FROM jobs.job_scope WHERE id=scope_id AND account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal())) WITH CHECK(EXISTS(SELECT 1 FROM jobs.job_scope WHERE id=scope_id AND account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal()));

CREATE OR REPLACE FUNCTION deliverable.dispatch_workbook_job() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE row deliverable.workbook_job%ROWTYPE; token text:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''); BEGIN
 SELECT * INTO row FROM deliverable.workbook_job WHERE NOT finished AND (lease_expires_at IS NULL OR lease_expires_at<now()) ORDER BY job_id FOR UPDATE SKIP LOCKED LIMIT 1;
 IF NOT FOUND THEN RETURN NULL; END IF;
 INSERT INTO deliverable.worker_context VALUES(pg_backend_pid(),row.account_id,row.deal_id,row.job_id,coalesce(row.lease_hash,''));
 IF row.active_scope_id IS NOT NULL THEN
  UPDATE jobs.job_scope SET revoked_at=clock_timestamp() WHERE id=row.active_scope_id;
  UPDATE jobs.job_lease SET released_at=clock_timestamp(),outcome='expired' WHERE id=(SELECT lease_id FROM jobs.job_scope WHERE id=row.active_scope_id);
 END IF;
 IF row.attempt>=3 THEN
  UPDATE jobs.job SET state='failed_terminal',problem='{"code":"artifact_attempt_limit","recovery_action":"inspect_failure_and_retry_explicitly"}',terminal_at=now(),allowance_posture='released',row_version=row_version+1 WHERE id=row.job_id;
  UPDATE deliverable.workbook_job SET finished=true WHERE job_id=row.job_id;
  PERFORM deliverable.clear_workbook_step(); RETURN NULL;
 END IF;
 UPDATE deliverable.workbook_job SET lease_hash=encode(extensions.digest(token,'sha256'),'hex'),lease_expires_at=now()+interval '20 minutes',attempt=attempt+1,active_scope_id=NULL WHERE job_id=row.job_id;
 PERFORM deliverable.clear_workbook_step();
 RETURN jsonb_build_object('job_id',row.job_id,'lease_token',token);
END $$;
CREATE OR REPLACE FUNCTION deliverable.begin_workbook_step(p_job uuid,p_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE row deliverable.workbook_job%ROWTYPE; job jobs.job%ROWTYPE; step uuid; attempt uuid; lease uuid; scope uuid; operation text;
BEGIN
 DELETE FROM deliverable.worker_context WHERE backend_pid=pg_backend_pid();
 SELECT * INTO row FROM deliverable.workbook_job WHERE job_id=p_job AND lease_hash=encode(extensions.digest(p_token,'sha256'),'hex') AND lease_expires_at>now() AND NOT finished FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'artifact_worker_scope_invalid' USING ERRCODE='42501'; END IF;
 INSERT INTO deliverable.worker_context VALUES(pg_backend_pid(),row.account_id,row.deal_id,row.job_id,row.lease_hash);
 SELECT * INTO job FROM jobs.job WHERE id=p_job FOR UPDATE;
 IF job.state IN ('canceled','completed','failed_terminal') OR NOT EXISTS(SELECT 1 FROM app.deal_workspace w JOIN app.deal d ON d.id=w.deal_id JOIN app.account a ON a.id=w.account_id WHERE w.deal_id=row.deal_id AND w.posture_version=job.workspace_posture_version AND a.security_epoch=job.security_epoch AND d.activity_posture='active' AND w.processing_posture='permitted' AND w.commercial_posture='entitled') THEN RAISE EXCEPTION 'artifact_workspace_fence_changed' USING ERRCODE='42501'; END IF;
 operation:=CASE WHEN job.command_type='workbook_ai_review' THEN 'ai_source_proposal' ELSE job.command_type END;
 scope:=row.active_scope_id;
 IF scope IS NULL THEN
  INSERT INTO jobs.job_step(account_id,deal_id,job_id,step_code,ordinal,operation_class,input_digest,state) VALUES(row.account_id,row.deal_id,p_job,'artifact_execution',1,operation,job.input_digest,'running') ON CONFLICT(job_id,step_code) DO UPDATE SET state='running' RETURNING id INTO step;
  INSERT INTO jobs.job_attempt(account_id,deal_id,step_id,attempt_ordinal,runtime_principal_code,credential_version,configuration_version,outcome) VALUES(row.account_id,row.deal_id,step,row.attempt,'workbook_worker','workbook-worker-credential-v1',job.release_id,'running') RETURNING id INTO attempt;
  INSERT INTO jobs.job_lease(account_id,deal_id,step_id,attempt_id,runtime_principal_code,lease_token_hash,expires_at,outcome) VALUES(row.account_id,row.deal_id,step,attempt,'workbook_worker',row.lease_hash,row.lease_expires_at,'active') RETURNING id INTO lease;
  INSERT INTO jobs.job_scope(account_id,deal_id,job_id,step_id,attempt_id,lease_id,runtime_principal_code,operation_code,input_digest,input_version,workflow_version,release_id,workspace_posture_version,security_epoch,expires_at,scope_digest)
  VALUES(row.account_id,row.deal_id,p_job,step,attempt,lease,'workbook_worker',operation,job.input_digest,job.input_version,job.workflow_version,job.release_id,job.workspace_posture_version,job.security_epoch,row.lease_expires_at,encode(extensions.digest(concat_ws('|',row.account_id,row.deal_id,p_job,step,attempt,lease,operation,job.input_digest,job.release_id,job.workspace_posture_version,job.security_epoch,row.lease_expires_at,row.lease_hash),'sha256'),'hex')) RETURNING id INTO scope;
  INSERT INTO jobs.job_scope_deal VALUES(scope,row.account_id,row.deal_id);
  INSERT INTO jobs.job_scope_operation VALUES(scope,operation);
  UPDATE deliverable.workbook_job SET active_scope_id=scope WHERE job_id=p_job;
 END IF;
 UPDATE jobs.job SET state='running',worker_heartbeat_at=clock_timestamp(),progress='{"message_code":"artifact_execution"}',row_version=row_version+1,updated_at=clock_timestamp() WHERE id=p_job;
 RETURN jsonb_build_object('input',row.input,'revision_id',row.revision_id,'account_id',row.account_id,'actor_id',job.actor_id,'deal_id',row.deal_id,'job_type',job.command_type,'input_digest',job.input_digest,'job_scope_id',scope,
  'artifacts',(SELECT coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('object',to_jsonb(o))),'[]') FROM deliverable.artifact a JOIN object_store.protected_object o ON o.id=a.protected_object_id WHERE a.revision_id=row.revision_id),
  'report',(SELECT report FROM deliverable.qc_run WHERE revision_id=row.revision_id ORDER BY created_at DESC LIMIT 1));
END $$;

CREATE FUNCTION deliverable.begin_ai_worker_context(p_job uuid,p_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE scope jsonb; BEGIN
 scope:=deliverable.begin_workbook_step(p_job,p_token);
 IF scope->>'job_type'<>'workbook_ai_review' THEN RAISE EXCEPTION 'artifact_worker_operation_invalid' USING ERRCODE='42501'; END IF;
 DELETE FROM app.request_context WHERE backend_pid=pg_backend_pid();
 INSERT INTO app.request_context(backend_pid,account_id,actor_id,deal_id) VALUES(pg_backend_pid(),(scope->>'account_id')::uuid,(scope->>'actor_id')::uuid,(scope->>'deal_id')::uuid);
 RETURN scope;
END $$;
CREATE OR REPLACE FUNCTION deliverable.clear_workbook_step() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM deliverable.worker_context WHERE backend_pid=pg_backend_pid()) THEN DELETE FROM app.request_context WHERE backend_pid=pg_backend_pid(); END IF;
 DELETE FROM deliverable.worker_context WHERE backend_pid=pg_backend_pid();
END $$;

CREATE FUNCTION deliverable.create_ai_review_job(p_revision uuid,p_key text,p_digest text,p_body jsonb,p_release text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE revision deliverable.deliverable_revision%ROWTYPE; replay jsonb; job uuid:=gen_random_uuid(); input jsonb; BEGIN
 PERFORM deliverable.assert_write();replay:=deliverable.replay('workbook_ai_review',p_key,p_digest);IF replay IS NOT NULL THEN RETURN replay; END IF;
 SELECT * INTO revision FROM deliverable.deliverable_revision WHERE id=p_revision;IF NOT FOUND THEN RAISE EXCEPTION 'artifact_scope_unavailable';END IF;
 IF p_body->>'task_definition' NOT IN ('workbook_commentary_draft','deliverable_semantic_qc','native_reader_semantic_parity_review') THEN RAISE EXCEPTION 'artifact_worker_operation_invalid';END IF;
 PERFORM source.get_packet_worker_input(revision.account_id,revision.deal_id,(p_body->>'packet_version_id')::uuid,(p_body->>'work_objective_id')::uuid,'ai_processing');
 IF (SELECT count(*) FROM deliverable.artifact WHERE revision_id=p_revision AND role IN ('native','reader'))<>2 THEN RAISE EXCEPTION 'native_reader_pair_required';END IF;
 input:=p_body||jsonb_build_object('revision_id',p_revision);
 INSERT INTO jobs.job(id,account_id,deal_id,actor_id,command_type,purpose_code,accepted_inputs,input_digest,input_version,workflow_version,release_id,allowance_class,allowance_quantity,allowance_posture,workspace_posture_version,security_epoch,state)
 SELECT job,revision.account_id,revision.deal_id,app.policy_actor_id(),'workbook_ai_review','workbook_ai_review',input,encode(extensions.digest(input::text,'sha256'),'hex'),'1.0.0','workbook-ai-review-1.0.0',p_release,'workbook_ai_review',1,'reserved',w.posture_version,a.security_epoch,'queued' FROM app.deal_workspace w JOIN app.account a ON a.id=w.account_id WHERE w.deal_id=revision.deal_id;
 INSERT INTO deliverable.workbook_job(job_id,account_id,deal_id,revision_id,input) VALUES(job,revision.account_id,revision.deal_id,p_revision,input);
 RETURN deliverable.remember('workbook_ai_review',p_key,p_digest,jsonb_build_object('id',job,'state','queued','job_type','workbook_ai_review','revision_id',p_revision));
END $$;
CREATE FUNCTION deliverable.complete_ai_worker_step(p_job uuid,p_token text,p_run uuid,p_failure text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE scope jsonb; BEGIN
 scope:=deliverable.begin_workbook_step(p_job,p_token);
 IF scope->>'job_type'<>'workbook_ai_review' THEN RAISE EXCEPTION 'artifact_worker_operation_invalid';END IF;
 IF p_run IS NOT NULL AND NOT EXISTS(SELECT 1 FROM deliverable.ai_revision_run WHERE ai_run_id=p_run AND revision_id=(scope->>'revision_id')::uuid) THEN RAISE EXCEPTION 'ai_artifact_scope_invalid';END IF;
 UPDATE jobs.job SET state=CASE WHEN p_failure IS NULL THEN 'completed' ELSE 'failed_terminal' END,result=CASE WHEN p_run IS NOT NULL THEN jsonb_build_object('resource',jsonb_build_object('type','ai_run','id',p_run)) ELSE NULL END,problem=CASE WHEN p_failure IS NULL THEN NULL ELSE jsonb_build_object('code',p_failure,'recovery_action','inspect_ai_run') END,allowance_posture=CASE WHEN p_failure IS NULL THEN 'committed' ELSE 'released' END,terminal_at=now(),row_version=row_version+1 WHERE id=p_job;
 UPDATE deliverable.workbook_job SET finished=true WHERE job_id=p_job;
 PERFORM deliverable.clear_workbook_step();
END $$;
-- The worker can read only the scoped inputs used by the common governed AI seam.
GRANT USAGE ON SCHEMA app,ai,source,knowledge,analysis TO job_worker;
GRANT EXECUTE ON FUNCTION app.policy_account_id(),app.policy_actor_id(),app.policy_deal_id() TO job_worker;
GRANT SELECT ON source.source_packet_member,source.source_fragment,source.source_record,source.source_representation,source.source_rights_current_selection,source.source_packet_version,ai.task_definition,ai.prompt_package,ai.provider_capability_profile TO job_worker;
DO $$ DECLARE table_name text; BEGIN
 FOREACH table_name IN ARRAY ARRAY['source_packet_member','source_fragment','source_record','source_representation','source_rights_current_selection','source_packet_version'] LOOP
  EXECUTE format('CREATE POLICY workbook_ai_input_scope ON source.%I FOR SELECT TO job_worker USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id())',table_name);
 END LOOP;
 FOREACH table_name IN ARRAY ARRAY['deliverable_revision','artifact','artifact_region','qc_run','artifact_manifest'] LOOP
  EXECUTE format('GRANT SELECT ON deliverable.%I TO job_worker',table_name);
  EXECUTE format('CREATE POLICY workbook_ai_input_scope ON deliverable.%I FOR SELECT TO job_worker USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id())',table_name);
 END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION source.get_packet_worker_input(uuid,uuid,uuid,uuid,text),knowledge.get_fact_projection(uuid,uuid,uuid,uuid),knowledge.get_assumption_projection(uuid,uuid,uuid,uuid),knowledge.get_evidence_projection(uuid,uuid,uuid,uuid),knowledge.get_decision_projection(uuid,uuid,uuid,uuid),analysis.get_analysis_projection(uuid,uuid,uuid,text,uuid) TO job_worker;
DO $$ DECLARE fn record; BEGIN
 FOR fn IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='ai' AND p.proname IN ('start_run_v2','attach_run_fragments','complete_run_v2') LOOP EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO job_worker',fn.signature);END LOOP;
 FOR fn IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='deliverable' AND p.proname IN ('begin_ai_worker_context','create_ai_review_job','complete_ai_worker_step') LOOP
  EXECUTE format('ALTER FUNCTION %s OWNER TO app_deliverable_owner',fn.signature);EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',fn.signature);
 END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION deliverable.begin_ai_worker_context(uuid,text),deliverable.complete_ai_worker_step(uuid,text,uuid,text),deliverable.attach_ai_revision(uuid,uuid) TO job_worker;
GRANT EXECUTE ON FUNCTION deliverable.create_ai_review_job(uuid,text,text,jsonb,text) TO app_runtime;

REVOKE CREATE ON SCHEMA deliverable FROM app_deliverable_owner;
