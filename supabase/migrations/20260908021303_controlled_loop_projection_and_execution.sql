-- Exact read projections retain RLS while protected storage locators stay private.
GRANT CREATE ON SCHEMA external_use TO app_export_owner;
ALTER FUNCTION external_use.export_projection(uuid) SECURITY DEFINER;
ALTER FUNCTION external_use.export_scope(uuid) SECURITY DEFINER;


CREATE OR REPLACE FUNCTION external_use.loop_basis(p_revision uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE r deliverable.deliverable_revision%ROWTYPE; result jsonb;
BEGIN
 SELECT * INTO r FROM deliverable.deliverable_revision WHERE id=p_revision;
 IF NOT FOUND THEN RAISE EXCEPTION 'export_scope_unavailable';END IF;
 SELECT jsonb_build_object(
  'revision',to_jsonb(r)-'build_input','calculations',r.build_input->'calculations','limitations',coalesce(r.build_input->'limitations','[]'),
  'artifacts',(SELECT coalesce(jsonb_agg(to_jsonb(a)-'protected_object_id' ORDER BY a.id),'[]') FROM deliverable.artifact a WHERE a.revision_id=r.id),
  'lineage',(SELECT coalesce(jsonb_agg(to_jsonb(l)||jsonb_build_object('native_locator',ar.native_locator) ORDER BY l.id),'[]') FROM deliverable.artifact_region_lineage l JOIN deliverable.artifact_region ar ON ar.id=l.region_id JOIN deliverable.artifact a ON a.id=ar.artifact_id WHERE a.revision_id=r.id),
  'decisions',(SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.id),'[]') FROM knowledge.human_decision d WHERE d.id IN (SELECT l.decision_id FROM deliverable.artifact_region_lineage l JOIN deliverable.artifact_region ar ON ar.id=l.region_id JOIN deliverable.artifact a ON a.id=ar.artifact_id WHERE a.revision_id=r.id)),
  'evidence',(SELECT coalesce(jsonb_agg(to_jsonb(e)||jsonb_build_object('locator',to_jsonb(n),'source_context',(SELECT coalesce(jsonb_agg(jsonb_build_object('locator',sf.locator,'text',sf.content_text,'sha256',sf.content_sha256) ORDER BY sf.id),'[]') FROM source.source_fragment sf WHERE sf.source_record_id=e.source_record_id AND sf.representation_id=e.representation_id AND sf.locator=n.selector)) ORDER BY e.id),'[]') FROM knowledge.evidence e JOIN knowledge.native_locator n ON n.id=e.native_locator_id WHERE e.id IN (SELECT er.evidence_id FROM knowledge.evidence_relationship er JOIN knowledge.human_decision_evidence he ON he.evidence_relationship_id=er.id WHERE he.decision_id IN (SELECT l.decision_id FROM deliverable.artifact_region_lineage l JOIN deliverable.artifact_region ar ON ar.id=l.region_id JOIN deliverable.artifact a ON a.id=ar.artifact_id WHERE a.revision_id=r.id))),
  'validations',(SELECT coalesce(jsonb_agg(to_jsonb(v) ORDER BY v.id),'[]') FROM analysis.deterministic_validation_record v WHERE v.calculation_run_id IN (SELECT calculation_run_id FROM deliverable.revision_calculation_run WHERE revision_id=r.id)),
  'reviews',(SELECT coalesce(jsonb_agg(to_jsonb(v) ORDER BY v.id),'[]') FROM deliverable.review v WHERE v.revision_id=r.id),
  'qc',(SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.id),'[]') FROM deliverable.qc_run q WHERE q.revision_id=r.id),
  'findings',(SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY f.id),'[]') FROM deliverable.qc_finding f WHERE f.revision_id=r.id),
  'manifest',(SELECT (to_jsonb(m)-'protected_object_id')||jsonb_build_object('public_key_pem',k.public_key_pem) FROM deliverable.artifact_manifest m JOIN deliverable.integrity_key k USING(key_version) WHERE m.revision_id=r.id),
  'readiness',deliverable.assess_readiness(r.id,r.purpose,r.audience)
 ) INTO result;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION external_use.guide_projection() RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE r uuid; basis jsonb; f jsonb; g jsonb; ex jsonb; checks jsonb:='[]'; item record; okay boolean; has_basis boolean; digest text; blockers jsonb;
BEGIN
 SELECT to_jsonb(v) INTO f FROM external_use.first_value v WHERE deal_id=app.policy_deal_id();
 SELECT to_jsonb(v) INTO g FROM external_use.guide_graduation v WHERE deal_id=app.policy_deal_id();
 SELECT v.id INTO r FROM deliverable.deliverable_revision v ORDER BY v.created_at DESC,v.id DESC LIMIT 1;
 IF f IS NOT NULL THEN r:=(f->>'revision_id')::uuid;END IF;
 IF r IS NOT NULL THEN basis:=external_use.loop_basis(r);digest:=encode(extensions.digest(basis::text,'sha256'),'hex');END IF;
 SELECT to_jsonb(e)||jsonb_build_object('state',j.state) INTO ex FROM external_use.internal_export e JOIN jobs.job j ON j.id=e.job_id
  WHERE e.revision_id=r AND j.state='completed' ORDER BY e.created_at LIMIT 1;
 FOR item IN SELECT * FROM (VALUES
 ('preflight','Deal identity and Paid Preflight','controls/preflight'),('source_perimeter','Accept the Source perimeter','sources'),
 ('packet_objective','Source Packet and Work Objective','sources'),('processing','Observe controlled work','analysis'),
 ('evidence','Inspect exact Evidence','guide/inspect'),('decision','Record a typed Banker Decision','evidence-decisions'),
 ('deterministic','Inspect deterministic validation','guide/inspect'),('artifacts','Inspect Native and Reader results','guide/inspect'),
 ('readiness','Inspect QC and Package Readiness','guide/inspect'),('internal_export','Create Internal Controlled Export','history-portability/internal-export'),
 ('graduation','Enter Deal Execution Desk','guide/completion')) v(code,title,route) LOOP
  okay:=false;
  CASE item.code
   WHEN 'preflight' THEN okay:=EXISTS(SELECT 1 FROM app.deal_workspace WHERE deal_id=app.policy_deal_id() AND paid_preflight_status IN ('pass','limited-proceed') AND processing_posture='permitted');
   WHEN 'source_perimeter' THEN okay:=EXISTS(SELECT 1 FROM source.source_record WHERE accepted_at IS NOT NULL AND disposition_code='current');
   WHEN 'packet_objective' THEN okay:=EXISTS(SELECT 1 FROM app.work_objective WHERE packet_version_id IS NOT NULL);
   WHEN 'processing' THEN okay:=r IS NOT NULL AND jsonb_array_length(coalesce(basis->'calculations','[]'))>0;
   WHEN 'evidence' THEN okay:=EXISTS(SELECT 1 FROM external_use.control_inspection WHERE revision_id=r AND actor_id=app.policy_actor_id() AND basis_digest=digest AND checkpoint='evidence');
   WHEN 'decision' THEN okay:=jsonb_array_length(coalesce(basis->'decisions','[]'))>0;
   WHEN 'deterministic' THEN okay:=EXISTS(SELECT 1 FROM external_use.control_inspection WHERE revision_id=r AND actor_id=app.policy_actor_id() AND basis_digest=digest AND checkpoint='decision_validation');
   WHEN 'artifacts' THEN okay:=(SELECT count(DISTINCT checkpoint)=2 FROM external_use.control_inspection WHERE revision_id=r AND actor_id=app.policy_actor_id() AND basis_digest=digest AND checkpoint IN ('native','reader'));
   WHEN 'readiness' THEN okay:=EXISTS(SELECT 1 FROM external_use.control_inspection WHERE revision_id=r AND actor_id=app.policy_actor_id() AND basis_digest=digest AND checkpoint='readiness');
   WHEN 'internal_export' THEN okay:=ex IS NOT NULL;
   WHEN 'graduation' THEN okay:=g IS NOT NULL;
  END CASE;
  blockers:='[]';
  IF NOT okay AND r IS NOT NULL AND item.code IN ('artifacts','readiness','internal_export') THEN blockers:=external_use.export_scope(r)->'hard_blockers';END IF;
  IF NOT okay AND item.code='preflight' THEN blockers:='[{"code":"paid_preflight_required","recovery":"Complete or re-run the exact Paid Preflight"}]';END IF;
  checks:=checks||jsonb_build_array(jsonb_build_object('code',item.code,'title',item.title,'route',item.route,'status',CASE WHEN okay THEN 'completed' WHEN jsonb_array_length(blockers)>0 THEN 'blocked' ELSE 'waiting' END,'blockers',blockers));
 END LOOP;
 RETURN jsonb_build_object('status',CASE WHEN g IS NOT NULL THEN 'graduated' WHEN f IS NOT NULL THEN 'first_value_completed' ELSE 'in_progress' END,
  'mode',CASE WHEN g IS NULL THEN 'guide' ELSE 'execution_desk' END,'revision_id',r,'first_value',f,'graduation',g,'first_export',ex,'checkpoints',checks,
  'current_action',(SELECT value->>'route' FROM jsonb_array_elements(checks) WHERE value->>'status'<>'completed' LIMIT 1),
  'etag',(SELECT row_version FROM app.deal WHERE id=app.policy_deal_id()));
END $$;

CREATE OR REPLACE FUNCTION external_use.observe_control(p_revision uuid,p_checkpoint text,p_basis text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE basis jsonb; digest text; f external_use.first_value%ROWTYPE;
BEGIN
 basis:=external_use.loop_basis(p_revision);digest:=encode(extensions.digest(basis::text,'sha256'),'hex');
 IF digest<>p_basis THEN RAISE EXCEPTION 'export_version_conflict';END IF;
 IF p_checkpoint='evidence' AND jsonb_array_length(basis->'evidence')=0 THEN RAISE EXCEPTION 'guide_evidence_required';END IF;
 IF p_checkpoint='decision_validation' AND (jsonb_array_length(basis->'decisions')=0 OR jsonb_array_length(basis->'calculations')=0 OR jsonb_array_length(basis->'validations')=0
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(basis->'validations') v WHERE v->>'outcome'<>'passed')) THEN RAISE EXCEPTION 'guide_validation_required';END IF;
 IF p_checkpoint IN ('native','reader') AND NOT EXISTS(SELECT 1 FROM deliverable.artifact WHERE revision_id=p_revision AND role=p_checkpoint) THEN RAISE EXCEPTION 'guide_artifact_required';END IF;
 IF p_checkpoint='readiness' AND jsonb_array_length(basis->'qc')=0 THEN RAISE EXCEPTION 'guide_qc_required';END IF;
 INSERT INTO external_use.control_inspection(account_id,deal_id,actor_id,revision_id,checkpoint,basis_digest)
 VALUES(app.policy_account_id(),app.policy_deal_id(),app.policy_actor_id(),p_revision,p_checkpoint,digest) ON CONFLICT DO NOTHING;
 PERFORM pg_advisory_xact_lock(hashtextextended('guide:'||app.policy_deal_id()::text,0));
 IF (SELECT count(DISTINCT checkpoint)=5 FROM external_use.control_inspection WHERE revision_id=p_revision AND actor_id=app.policy_actor_id() AND basis_digest=digest)
  AND EXISTS(SELECT 1 FROM app.deal_workspace WHERE deal_id=app.policy_deal_id() AND paid_preflight_status IN ('pass','limited-proceed') AND processing_posture='permitted')
  AND jsonb_array_length(basis->'evidence')>0 AND jsonb_array_length(basis->'decisions')>0 AND jsonb_array_length(basis->'calculations')>0
  AND jsonb_array_length(basis->'validations')>0 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(basis->'validations') v WHERE v->>'outcome'<>'passed')
  AND NOT EXISTS(SELECT 1 FROM (SELECT DISTINCT ON(command_type) state FROM jobs.job WHERE accepted_inputs->>'revision_id'=p_revision::text AND command_type IN ('analysis_workbook_build','analysis_workbook_qc') ORDER BY command_type,created_at DESC,id DESC) latest WHERE state<>'completed') THEN
  INSERT INTO external_use.first_value(account_id,deal_id,actor_id,revision_id,basis)
  VALUES(app.policy_account_id(),app.policy_deal_id(),app.policy_actor_id(),p_revision,basis) ON CONFLICT(deal_id) DO NOTHING RETURNING * INTO f;
  IF f.id IS NOT NULL THEN
   PERFORM app.record_audit('guide.first_value_completed','completed','first_value',f.id::text,'exact_controlled_loop_observed',gen_random_uuid()::text);
   INSERT INTO external_use.measurement_event(account_id,deal_id,event_code,dedupe_digest,dimensions)
   VALUES(f.account_id,f.deal_id,'first_value_completed',encode(extensions.digest(f.id::text,'sha256'),'hex'),jsonb_build_object('scope','same_deal','artifact_pair',true,'external_authority',false));
  END IF;
 END IF;
 RETURN external_use.guide_projection();
END $$;

-- The shared worker only receives closed export entry points. Record its exact
-- operation, input identity, release, security/posture fence and leased attempt.
ALTER TABLE external_use.export_job ADD COLUMN active_scope_id uuid REFERENCES jobs.job_scope(id);
ALTER TABLE jobs.job_step DROP CONSTRAINT job_step_operation_class_check,DROP CONSTRAINT job_step_step_code_check;
ALTER TABLE jobs.job_step ADD CHECK(operation_class IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','ai_source_proposal','internal_controlled_export')),
 ADD CHECK(step_code IN ('accepted_inputs','source_checkpoint','workspace_checkpoint','reference_result','artifact_execution','export_execution'));
ALTER TABLE jobs.job_scope DROP CONSTRAINT job_scope_operation_code_check;
ALTER TABLE jobs.job_scope ADD CHECK(operation_code IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','ai_source_proposal','internal_controlled_export'));
ALTER TABLE jobs.job_scope_operation DROP CONSTRAINT job_scope_operation_operation_code_check;
ALTER TABLE jobs.job_scope_operation ADD CHECK(operation_code IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','ai_source_proposal','internal_controlled_export'));
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['job_step','job_attempt','job_lease','job_scope','job_scope_deal'] LOOP
  EXECUTE format('GRANT SELECT,INSERT,UPDATE ON jobs.%I TO app_export_owner',t);
  EXECUTE format('CREATE POLICY export_execution_scope ON jobs.%I TO app_export_owner USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id()) WITH CHECK(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id())',t);
 END LOOP;
END $$;
GRANT SELECT,INSERT ON jobs.job_scope_operation TO app_export_owner;
CREATE POLICY export_operation_scope ON jobs.job_scope_operation TO app_export_owner USING(EXISTS(SELECT 1 FROM jobs.job_scope WHERE id=scope_id AND account_id=app.policy_account_id() AND deal_id=app.policy_deal_id())) WITH CHECK(operation_code='internal_controlled_export' AND EXISTS(SELECT 1 FROM jobs.job_scope WHERE id=scope_id AND account_id=app.policy_account_id() AND deal_id=app.policy_deal_id()));
CREATE FUNCTION external_use.open_export_attempt(p_job uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE q external_use.export_job%ROWTYPE; j jobs.job%ROWTYPE; step uuid; attempt uuid; lease uuid; scope uuid; ordinal integer;
BEGIN
 SELECT * INTO q FROM external_use.export_job WHERE job_id=p_job AND account_id=app.policy_account_id() AND deal_id=app.policy_deal_id();
 SELECT * INTO j FROM jobs.job WHERE id=p_job;
 IF q.job_id IS NULL OR j.command_type<>'internal_controlled_export' THEN RAISE EXCEPTION 'export_worker_scope_invalid';END IF;
 UPDATE jobs.job_scope SET revoked_at=clock_timestamp() WHERE id=q.active_scope_id AND revoked_at IS NULL;
 UPDATE jobs.job_lease SET released_at=clock_timestamp(),outcome='expired' WHERE step_id IN(SELECT id FROM jobs.job_step WHERE job_id=p_job) AND released_at IS NULL;
 UPDATE jobs.job_attempt SET completed_at=clock_timestamp(),outcome='failed_retryable',failure_code='export_lease_expired' WHERE step_id IN(SELECT id FROM jobs.job_step WHERE job_id=p_job) AND completed_at IS NULL;
 INSERT INTO jobs.job_step(account_id,deal_id,job_id,step_code,ordinal,operation_class,input_digest,state) VALUES(q.account_id,q.deal_id,p_job,'export_execution',1,'internal_controlled_export',j.input_digest,'running') ON CONFLICT(job_id,step_code) DO UPDATE SET state='running' RETURNING id INTO step;
 SELECT coalesce(max(attempt_ordinal),0)+1 INTO ordinal FROM jobs.job_attempt WHERE step_id=step;
 INSERT INTO jobs.job_attempt(account_id,deal_id,step_id,attempt_ordinal,runtime_principal_code,credential_version,configuration_version,outcome) VALUES(q.account_id,q.deal_id,step,ordinal,'workbook_worker','workbook-worker-credential-v1',j.release_id,'running') RETURNING id INTO attempt;
 INSERT INTO jobs.job_lease(account_id,deal_id,step_id,attempt_id,runtime_principal_code,lease_token_hash,expires_at,outcome) VALUES(q.account_id,q.deal_id,step,attempt,'workbook_worker',q.lease_hash,q.lease_expires_at,'active') RETURNING id INTO lease;
 INSERT INTO jobs.job_scope(account_id,deal_id,job_id,step_id,attempt_id,lease_id,runtime_principal_code,operation_code,input_digest,input_version,workflow_version,release_id,workspace_posture_version,security_epoch,expires_at,scope_digest)
 VALUES(q.account_id,q.deal_id,p_job,step,attempt,lease,'workbook_worker','internal_controlled_export',j.input_digest,j.input_version,j.workflow_version,j.release_id,j.workspace_posture_version,j.security_epoch,q.lease_expires_at,encode(extensions.digest(concat_ws('|',q.account_id,q.deal_id,p_job,q.export_id,j.input_digest,j.release_id,j.workspace_posture_version,j.security_epoch,q.lease_hash),'sha256'),'hex')) RETURNING id INTO scope;
 INSERT INTO jobs.job_scope_deal VALUES(scope,q.account_id,q.deal_id);
 INSERT INTO jobs.job_scope_operation VALUES(scope,'internal_controlled_export');
 UPDATE external_use.export_job SET active_scope_id=scope WHERE job_id=p_job;
END $$;
CREATE FUNCTION external_use.close_export_attempt(p_job uuid,p_state text,p_code text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE scope jobs.job_scope%ROWTYPE;
BEGIN
 SELECT s.* INTO scope FROM external_use.export_job q JOIN jobs.job_scope s ON s.id=q.active_scope_id WHERE q.job_id=p_job AND q.account_id=app.policy_account_id() AND q.deal_id=app.policy_deal_id();
 IF NOT FOUND THEN RETURN;END IF;
 UPDATE jobs.job_step SET state=CASE WHEN p_state='blocked' THEN 'failed_retryable' ELSE p_state END,updated_at=clock_timestamp(),row_version=row_version+1 WHERE id=scope.step_id;
 UPDATE jobs.job_attempt SET outcome=CASE WHEN p_state='completed' THEN 'succeeded' ELSE p_state END,completed_at=clock_timestamp(),failure_code=p_code WHERE id=scope.attempt_id;
 UPDATE jobs.job_lease SET released_at=clock_timestamp(),outcome=CASE WHEN p_state='completed' THEN 'committed' ELSE p_state END WHERE id=scope.lease_id;
 UPDATE jobs.job_scope SET revoked_at=clock_timestamp() WHERE id=scope.id;
END $$;

CREATE OR REPLACE FUNCTION external_use.begin_export(p_job uuid,p_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE row external_use.export_job%ROWTYPE; e external_use.internal_export%ROWTYPE; r external_use.export_review%ROWTYPE; j jobs.job%ROWTYPE; result jsonb;
BEGIN
 row:=external_use.enter_worker_context(p_job,p_token);
 SELECT * INTO e FROM external_use.internal_export WHERE id=row.export_id;
 SELECT * INTO r FROM external_use.export_review WHERE id=e.review_id;
 SELECT * INTO j FROM jobs.job WHERE id=row.job_id FOR UPDATE;
 IF j.state NOT IN ('queued','running','failed_retryable') THEN RAISE EXCEPTION 'export_job_not_runnable';END IF;
 IF row.attempt>3 THEN
  UPDATE jobs.job SET state='failed_terminal',problem='{"code":"export_attempt_limit","recovery_action":"retry_same_export"}',row_version=row_version+1 WHERE id=p_job;
  UPDATE external_use.export_job SET finished=true WHERE job_id=p_job;
  PERFORM app.clear_request();RETURN NULL;
 END IF;
 BEGIN
  PERFORM external_use.assert_review(r.id,r.dependency_digest);
 EXCEPTION WHEN OTHERS THEN
  UPDATE jobs.job SET state='blocked',problem='{"code":"export_scope_changed","recovery_action":"review_exact_scope"}',row_version=row_version+1 WHERE id=p_job;
  UPDATE external_use.export_job SET finished=true WHERE job_id=p_job;
  PERFORM app.clear_request();RETURN NULL;
 END;
 PERFORM external_use.open_export_attempt(p_job);
 UPDATE jobs.job SET state='running',worker_heartbeat_at=clock_timestamp(),progress='{"message_code":"verify_and_package_exact_members"}',row_version=row_version+1,updated_at=clock_timestamp() WHERE id=p_job;
 INSERT INTO external_use.export_event(account_id,deal_id,export_id,event_code,attempt) VALUES(row.account_id,row.deal_id,row.export_id,'running',row.attempt);
 result:=jsonb_build_object('export_id',e.id,'revision_id',e.revision_id,'purpose',r.purpose,'scope',r.scope,
  'files',(SELECT jsonb_agg(jsonb_build_object('id',a.id,'role',a.role,'path',a.path_label,'sha256',a.plaintext_sha256,'byte_length',a.byte_length,'object',jsonb_build_object('storage_key',o.storage_key,'ciphertext_sha256',o.ciphertext_sha256)) ORDER BY a.id) FROM deliverable.artifact a JOIN object_store.protected_object o ON o.id=a.protected_object_id WHERE a.revision_id=e.revision_id AND a.role IN ('native','reader')));
 PERFORM app.clear_request();RETURN result;
END $$;

CREATE OR REPLACE FUNCTION external_use.finish_export(p_job uuid,p_token text,p_object jsonb,p_manifest jsonb,p_error text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE row external_use.export_job%ROWTYPE; e external_use.internal_export%ROWTYPE; r external_use.export_review%ROWTYPE;
BEGIN
 row:=external_use.enter_worker_context(p_job,p_token);
 SELECT * INTO e FROM external_use.internal_export WHERE id=row.export_id;
 SELECT * INTO r FROM external_use.export_review WHERE id=e.review_id;
 IF NOT EXISTS(SELECT 1 FROM jobs.job WHERE id=p_job AND state='running') THEN RAISE EXCEPTION 'export_job_not_runnable';END IF;
 IF p_error IS NOT NULL THEN
  IF p_error !~ '^export_[a-z_]+$' THEN p_error:='export_processing_failed';END IF;
  UPDATE jobs.job SET state='failed_retryable',problem=jsonb_build_object('code',p_error,'recovery_action','retry_same_export'),row_version=row_version+1,updated_at=clock_timestamp() WHERE id=p_job;
  UPDATE external_use.export_job SET finished=true WHERE job_id=p_job;
  INSERT INTO external_use.export_event(account_id,deal_id,export_id,event_code,attempt) VALUES(row.account_id,row.deal_id,row.export_id,p_error,row.attempt);
  PERFORM external_use.close_export_attempt(p_job,'failed_retryable',p_error);
  PERFORM app.clear_request();RETURN jsonb_build_object('state','failed_retryable');
 END IF;
 PERFORM external_use.assert_review(r.id,r.dependency_digest);
 IF p_manifest->'manifest'->>'export_id'<>e.id::text OR p_manifest->'manifest'->>'revision_id'<>e.revision_id::text
  OR p_manifest->'manifest'->'scope' IS DISTINCT FROM r.scope OR p_manifest->'manifest'->>'purpose'<>r.purpose
  OR jsonb_array_length(p_manifest->'manifest'->'members')<7 OR p_object->>'sha256' !~ '^[a-f0-9]{64}$'
  OR NOT EXISTS(SELECT 1 FROM deliverable.integrity_key WHERE key_version=p_manifest->>'key_version' AND public_key_pem=p_manifest->>'public_key_pem') THEN RAISE EXCEPTION 'export_output_invalid';END IF;
 INSERT INTO object_store.protected_object(id,account_id,deal_id,scope_code,storage_key,plaintext_sha256,ciphertext_sha256,byte_length,media_type,envelope_version,kms_key_version,wrapped_dek,lifecycle_status)
 VALUES((p_object->>'object_id')::uuid,row.account_id,row.deal_id,'deal',p_object->>'storage_key',p_object->>'sha256',p_object->>'ciphertext_sha256',(p_object->>'byte_length')::bigint,'application/zip',p_object->>'envelope_version',p_object->>'kms_key_version',p_object->'wrapped_dek','active');
 INSERT INTO external_use.internal_export_object(export_id,account_id,deal_id,protected_object_id,manifest) VALUES(e.id,row.account_id,row.deal_id,(p_object->>'object_id')::uuid,p_manifest);
 UPDATE jobs.job SET state='completed',result=jsonb_build_object('export_id',e.id,'revision_id',e.revision_id,'sha256',p_object->>'sha256'),problem=NULL,terminal_at=clock_timestamp(),row_version=row_version+1,progress='{"message_code":"internal_export_completed"}',updated_at=clock_timestamp() WHERE id=p_job;
 UPDATE external_use.export_job SET finished=true WHERE job_id=p_job;
 INSERT INTO external_use.export_event(account_id,deal_id,export_id,event_code,attempt) VALUES(row.account_id,row.deal_id,row.export_id,'completed',row.attempt);
 PERFORM app.record_audit('internal_export.completed','completed','internal_controlled_export',e.id::text,'exact_signed_package',gen_random_uuid()::text);
 INSERT INTO external_use.measurement_event(account_id,deal_id,event_code,dedupe_digest,dimensions)
 VALUES(row.account_id,row.deal_id,'internal_export_completed',encode(extensions.digest(e.id::text,'sha256'),'hex'),'{"scope":"exact_revision","external_authority":false}') ON CONFLICT DO NOTHING;
 PERFORM external_use.close_export_attempt(p_job,'completed');
 PERFORM app.clear_request();RETURN jsonb_build_object('state','completed','export_id',e.id);
END $$;

CREATE OR REPLACE FUNCTION external_use.control_export(p_export uuid,p_action text,p_expected bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE e external_use.internal_export%ROWTYPE; j jobs.job%ROWTYPE; r external_use.export_review%ROWTYPE;
BEGIN
 SELECT * INTO e FROM external_use.internal_export WHERE id=p_export AND actor_id=app.policy_actor_id();IF NOT FOUND THEN RAISE EXCEPTION 'export_scope_unavailable';END IF;
 SELECT * INTO j FROM jobs.job WHERE id=e.job_id FOR UPDATE;
 IF j.row_version<>p_expected THEN RAISE EXCEPTION 'export_version_conflict';END IF;
 IF p_action='cancel' AND j.state IN ('queued','running','failed_retryable') THEN
  PERFORM external_use.close_export_attempt(j.id,'canceled');
  UPDATE external_use.export_job SET finished=true,lease_expires_at=clock_timestamp() WHERE job_id=j.id;
  UPDATE jobs.job SET state='canceled',cancel_requested_at=clock_timestamp(),row_version=row_version+1 WHERE id=j.id;
 ELSIF p_action='retry' AND j.state IN ('failed_retryable','failed_terminal','canceled') THEN
  SELECT * INTO r FROM external_use.export_review WHERE id=e.review_id;
  PERFORM external_use.assert_review(r.id,r.dependency_digest);
  UPDATE external_use.export_job SET finished=false,lease_expires_at=NULL,lease_hash=NULL,attempt=0 WHERE job_id=j.id;
  UPDATE jobs.job SET state='queued',problem=NULL,cancel_requested_at=NULL,terminal_at=NULL,row_version=row_version+1 WHERE id=j.id;
 ELSE RAISE EXCEPTION 'export_job_control_invalid';END IF;
 INSERT INTO external_use.export_event(account_id,deal_id,export_id,event_code,attempt) VALUES(e.account_id,e.deal_id,e.id,p_action,0);
 PERFORM app.record_audit('internal_export.'||p_action,'completed','internal_controlled_export',e.id::text,'preserved_export_identity',gen_random_uuid()::text);
 RETURN external_use.export_projection(e.id);
END $$;

ALTER FUNCTION external_use.open_export_attempt(uuid) OWNER TO app_export_owner;
ALTER FUNCTION external_use.close_export_attempt(uuid,text,text) OWNER TO app_export_owner;
REVOKE ALL ON FUNCTION external_use.open_export_attempt(uuid),external_use.close_export_attempt(uuid,text,text) FROM PUBLIC,app_runtime,job_worker,job_dispatcher;
REVOKE CREATE ON SCHEMA external_use FROM app_export_owner;

