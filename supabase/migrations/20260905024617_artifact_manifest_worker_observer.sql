-- Exact immutable manifest metadata is returned only inside an authenticated worker lease.
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
  'manifest',(SELECT to_jsonb(m)||jsonb_build_object('public_key_pem',k.public_key_pem) FROM deliverable.artifact_manifest m JOIN deliverable.integrity_key k USING(key_version) WHERE m.revision_id=row.revision_id),
  'report',(SELECT report FROM deliverable.qc_run WHERE revision_id=row.revision_id ORDER BY created_at DESC LIMIT 1));
END $$;
