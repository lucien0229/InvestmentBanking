-- Native/Reader generation has the same exact Work Objective and dynamic Output Ceiling gate as its sources.
ALTER TABLE deliverable.deliverable ADD COLUMN work_objective_id uuid REFERENCES app.work_objective(id);
ALTER TABLE deliverable.deliverable_revision ADD COLUMN work_objective_id uuid REFERENCES app.work_objective(id), ADD COLUMN packet_version_id uuid REFERENCES source.source_packet_version(id);
CREATE OR REPLACE FUNCTION deliverable.create_deliverable(p_key text,p_digest text,p_body jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE replay jsonb; row deliverable.deliverable%ROWTYPE; BEGIN
 PERFORM deliverable.assert_write(); replay:=deliverable.replay('create_deliverable',p_key,p_digest); IF replay IS NOT NULL THEN RETURN replay; END IF;
 IF NOT EXISTS(SELECT 1 FROM app.work_objective WHERE id=(p_body->>'work_objective_id')::uuid AND account_id=app.policy_account_id() AND deal_id=app.policy_deal_id()) THEN RAISE EXCEPTION 'artifact_work_objective_required';END IF;
 INSERT INTO deliverable.deliverable(account_id,deal_id,deliverable_type,title,purpose,audience,confidentiality,owner_id,work_objective_id)
 VALUES(app.policy_account_id(),app.policy_deal_id(),'analysis_valuation_workbook',p_body->>'title',p_body->>'purpose',p_body->>'audience',p_body->>'confidentiality',app.policy_actor_id(),(p_body->>'work_objective_id')::uuid) RETURNING * INTO row;
 PERFORM app.record_audit('deliverable_created','completed','deliverable',row.id::text,'analysis_valuation_workbook',gen_random_uuid()::text);
 RETURN deliverable.remember('create_deliverable',p_key,p_digest,to_jsonb(row));
END $$;

CREATE OR REPLACE FUNCTION deliverable.create_revision(p_parent uuid,p_expected bigint,p_key text,p_digest text,p_basis jsonb,p_limitations jsonb,p_release text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE parent deliverable.deliverable%ROWTYPE; replay jsonb; revision uuid:=gen_random_uuid(); job uuid:=gen_random_uuid(); input jsonb; basis jsonb; ordinal integer; objective app.work_objective%ROWTYPE;
BEGIN
 PERFORM deliverable.assert_write(); replay:=deliverable.replay('create_revision',p_key,p_digest); IF replay IS NOT NULL THEN RETURN replay; END IF;
 SELECT * INTO parent FROM deliverable.deliverable WHERE id=p_parent FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'artifact_scope_unavailable'; END IF;
 IF parent.row_version<>p_expected THEN RAISE EXCEPTION 'artifact_version_conflict'; END IF;
 SELECT * INTO objective FROM app.work_objective WHERE id=parent.work_objective_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'artifact_work_objective_required';END IF;
 PERFORM source.get_packet_worker_input(parent.account_id,parent.deal_id,objective.packet_version_id,objective.id,'native_artifact');
 PERFORM source.get_packet_worker_input(parent.account_id,parent.deal_id,objective.packet_version_id,objective.id,'reader_copy');
 input:=deliverable.build_input(p_parent,revision,p_basis,p_limitations)||jsonb_build_object('work_objective_id',objective.id,'packet_version_id',objective.packet_version_id);
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(input->'calculations') c CROSS JOIN LATERAL jsonb_array_elements(c->'measures') m WHERE m->>'source_record_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM source.source_packet_member WHERE packet_version_id=objective.packet_version_id AND source_record_id=(m->>'source_record_id')::uuid)) THEN RAISE EXCEPTION 'artifact_packet_scope_mismatch';END IF;
 SELECT coalesce(max(r.ordinal),0)+1 INTO ordinal FROM deliverable.deliverable_revision r WHERE deliverable_id=p_parent;
 INSERT INTO deliverable.deliverable_revision(id,account_id,deal_id,deliverable_id,ordinal,predecessor_id,purpose,audience,confidentiality,template_version,build_input,basis_digest,created_by,work_objective_id,packet_version_id)
 VALUES(revision,parent.account_id,parent.deal_id,parent.id,ordinal,parent.current_revision_id,parent.purpose,parent.audience,parent.confidentiality,'analysis-valuation-1.0.0',input,encode(extensions.digest(input::text,'sha256'),'hex'),app.policy_actor_id(),objective.id,objective.packet_version_id);
 FOR basis IN SELECT value FROM jsonb_array_elements(p_basis) LOOP
  INSERT INTO deliverable.revision_calculation_run VALUES(parent.account_id,parent.deal_id,revision,(basis->>'calculation_run_id')::uuid) ON CONFLICT DO NOTHING;
  INSERT INTO deliverable.revision_model_version VALUES(parent.account_id,parent.deal_id,revision,(basis->>'model_version_id')::uuid) ON CONFLICT DO NOTHING;
  INSERT INTO deliverable.revision_scenario_version VALUES(parent.account_id,parent.deal_id,revision,(basis->>'scenario_version_id')::uuid) ON CONFLICT DO NOTHING;
 END LOOP;
 INSERT INTO jobs.job(id,account_id,deal_id,actor_id,command_type,purpose_code,accepted_inputs,input_digest,input_version,workflow_version,release_id,allowance_class,allowance_quantity,allowance_posture,workspace_posture_version,security_epoch,state)
 SELECT job,parent.account_id,parent.deal_id,app.policy_actor_id(),'analysis_workbook_build','analysis_workbook_build',jsonb_build_object('revision_id',revision,'basis',p_basis),
  encode(extensions.digest(input::text,'sha256'),'hex'),'1.0.0','analysis-valuation-1.0.0',p_release,'analysis_workbook_build',1,'reserved',w.posture_version,a.security_epoch,'queued'
 FROM app.deal_workspace w JOIN app.account a ON a.id=w.account_id WHERE w.deal_id=parent.deal_id AND w.account_id=parent.account_id;
 INSERT INTO deliverable.workbook_job(job_id,account_id,deal_id,revision_id,input) VALUES(job,parent.account_id,parent.deal_id,revision,input);
 UPDATE deliverable.deliverable SET current_revision_id=revision,row_version=row_version+1 WHERE id=parent.id;
 PERFORM app.record_audit('workbook_revision_requested','completed','revision',revision::text,'exact_controlled_basis',gen_random_uuid()::text);
 RETURN deliverable.remember('create_revision',p_key,p_digest,jsonb_build_object('id',job,'job_type','analysis_workbook_build','state','queued','revision_id',revision,'deliverable_id',parent.id,'row_version',parent.row_version+1));
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
 IF job.command_type IN ('analysis_workbook_build','analysis_workbook_qc') THEN
  IF row.input->>'work_objective_id' IS NULL OR row.input->>'packet_version_id' IS NULL THEN RAISE EXCEPTION 'artifact_work_objective_required';END IF;
  PERFORM source.get_packet_worker_input(row.account_id,row.deal_id,(row.input->>'packet_version_id')::uuid,(row.input->>'work_objective_id')::uuid,'native_artifact');
  PERFORM source.get_packet_worker_input(row.account_id,row.deal_id,(row.input->>'packet_version_id')::uuid,(row.input->>'work_objective_id')::uuid,'reader_copy');
 END IF;
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
  'manifest',(SELECT to_jsonb(m)||jsonb_build_object('public_key_pem',k.public_key_pem) FROM deliverable.artifact_manifest m JOIN deliverable.integrity_key k USING(key_version) WHERE m.revision_id=row.revision_id),
  'report',(SELECT report FROM deliverable.qc_run WHERE revision_id=row.revision_id ORDER BY created_at DESC LIMIT 1));
END $$;
