-- Complete only typed proposal kinds; inspect the protected signed envelope as well as every member.
CREATE OR REPLACE FUNCTION ai.complete_run(
  p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_run_id uuid,p_status_code text,p_outcome_class text,
  p_proposals jsonb,p_abstentions jsonb,p_validations jsonb,p_raw_request_ciphertext bytea,p_raw_response_ciphertext bytea,
  p_provider_request_id text,p_model_code text,p_usage jsonb,p_cost_minor_units integer,p_latency_ms integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ai, source, app, pg_catalog AS $$
DECLARE run_row ai.run%ROWTYPE; item jsonb; validation jsonb; proposal_id uuid; conflict_payload jsonb;
BEGIN
  SELECT * INTO run_row FROM ai.run WHERE id=p_run_id AND account_id=p_account_id AND deal_id=p_deal_id FOR UPDATE;
  IF NOT FOUND OR p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN RAISE EXCEPTION 'ai_run_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF run_row.status_code IN ('completed','failed','abstained') THEN RETURN jsonb_build_object('run_id',p_run_id,'replayed',true); END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(coalesce(p_proposals,'[]'::jsonb)) LOOP
    proposal_id := gen_random_uuid();
    IF coalesce(item->>'proposal_kind','') NOT IN ('claim','evidence_link','conflict','normalized_value_proposal','mapping_proposal','analysis_draft','workbook_commentary','semantic_qc_finding','parity_finding') THEN RAISE EXCEPTION 'ai_proposal_kind_invalid' USING ERRCODE='22023'; END IF;
    INSERT INTO ai.proposal(id,account_id,deal_id,run_id,candidate_key,proposal_kind,schema_version,payload,payload_digest,support_status,evidence_candidates,limitations,unsupported_states,required_human_decision)
      VALUES (proposal_id,p_account_id,p_deal_id,p_run_id,item->>'candidate_key',item->>'proposal_kind',item->>'schema_version',item->'payload',item->>'payload_digest',item->>'support_status',coalesce(item->'evidence_candidates','[]'::jsonb),coalesce(item->'limitations','[]'::jsonb),coalesce(item->'unsupported_states','[]'::jsonb),item->'required_human_decision');
    conflict_payload := CASE WHEN item->>'proposal_kind'='conflict' THEN item->'payload' ELSE item->'conflict' END;
    IF conflict_payload IS NOT NULL AND jsonb_typeof(conflict_payload)='object' THEN
      INSERT INTO ai.conflict_proposal(account_id,deal_id,run_id,proposal_id,conflict_key,dimension,competing_refs,affected_scope,unresolved_alternatives,affected_uses)
      VALUES (p_account_id,p_deal_id,p_run_id,proposal_id,conflict_payload->>'conflict_key',conflict_payload->>'dimension',coalesce(conflict_payload->'competing_refs','[]'::jsonb),conflict_payload->>'affected_scope',coalesce(conflict_payload->'unresolved_alternatives','[]'::jsonb),coalesce(conflict_payload->'affected_uses','[]'::jsonb));
    END IF;
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(coalesce(p_abstentions,'[]'::jsonb)) LOOP
    INSERT INTO ai.abstention(account_id,deal_id,run_id,abstention_key,affected_scope,reason_codes,unsupported_propositions,missing_inputs,output_ceiling,permitted_partial_scope,smallest_recovery_action,resume_condition)
      VALUES (p_account_id,p_deal_id,p_run_id,item->>'abstention_key',item->>'affected_scope',coalesce(item->'reason_codes','[]'::jsonb),coalesce(item->'unsupported_propositions','[]'::jsonb),coalesce(item->'missing_inputs','[]'::jsonb),coalesce(item->'output_ceiling','{}'::jsonb),coalesce(item->'permitted_partial_scope','[]'::jsonb),item->>'smallest_recovery_action',item->>'resume_condition');
  END LOOP;
  FOR validation IN SELECT value FROM jsonb_array_elements(coalesce(p_validations,'[]'::jsonb)) LOOP
    INSERT INTO ai.run_validation(account_id,deal_id,run_id,stage,code,json_pointer,outcome,normalized_digest) VALUES (p_account_id,p_deal_id,p_run_id,validation->>'stage',validation->>'code',validation->>'json_pointer',validation->>'outcome',validation->>'normalized_digest');
  END LOOP;
  UPDATE ai.run SET status_code=p_status_code,outcome_class=p_outcome_class,raw_request_ciphertext=p_raw_request_ciphertext,raw_response_ciphertext=p_raw_response_ciphertext,provider_request_id=p_provider_request_id,model_code=p_model_code,usage=coalesce(p_usage,'{}'::jsonb),cost_minor_units=p_cost_minor_units,latency_ms=p_latency_ms,completed_at=clock_timestamp() WHERE id=p_run_id;
  PERFORM app.record_audit('ai_run_completed','completed','ai_run',p_run_id::text,p_outcome_class,gen_random_uuid()::text);
  RETURN jsonb_build_object('run_id',p_run_id,'replayed',false,'status',p_status_code,'outcome',p_outcome_class);
END $$;
ALTER FUNCTION ai.complete_run(uuid,uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb,bytea,bytea,text,text,jsonb,integer,integer) OWNER TO app_ai_owner;

-- Closed worker input context is established only after lease and workspace fences pass.
CREATE OR REPLACE FUNCTION deliverable.begin_workbook_step(p_job uuid,p_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE row deliverable.workbook_job%ROWTYPE; job jobs.job%ROWTYPE; step uuid; attempt uuid; lease uuid; scope uuid; operation text;
BEGIN
 DELETE FROM deliverable.worker_context WHERE backend_pid=pg_backend_pid();
 SELECT * INTO row FROM deliverable.workbook_job WHERE job_id=p_job AND lease_hash=encode(extensions.digest(p_token,'sha256'),'hex') AND lease_expires_at>now() AND NOT finished FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'artifact_worker_scope_invalid' USING ERRCODE='42501'; END IF;
 INSERT INTO deliverable.worker_context VALUES(pg_backend_pid(),row.account_id,row.deal_id,row.job_id,row.lease_hash);
 SELECT * INTO job FROM jobs.job WHERE id=p_job FOR UPDATE;
 IF job.state IN ('canceled','completed','failed_terminal') OR NOT EXISTS(SELECT 1 FROM app.deal_workspace w JOIN app.deal d ON d.id=w.deal_id JOIN app.account a ON a.id=w.account_id WHERE w.deal_id=row.deal_id AND w.posture_version=job.workspace_posture_version AND a.security_epoch=job.security_epoch AND d.activity_posture='active' AND w.processing_posture='permitted' AND w.commercial_posture='entitled') THEN RAISE EXCEPTION 'artifact_workspace_fence_changed' USING ERRCODE='42501'; END IF;
 -- Reuse the authenticated, lease-bound actor context expected by existing input projection functions.
 -- No Banker session token or general runtime credential enters the isolated renderer.
 DELETE FROM app.request_context WHERE backend_pid=pg_backend_pid();
 INSERT INTO app.request_context(backend_pid,account_id,actor_id,deal_id) VALUES(pg_backend_pid(),row.account_id,job.actor_id,row.deal_id);
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
  'manifest',(SELECT to_jsonb(m)||jsonb_build_object('public_key_pem',k.public_key_pem,'object',to_jsonb(o),'plaintext_sha256',o.plaintext_sha256,'byte_length',o.byte_length) FROM deliverable.artifact_manifest m JOIN deliverable.integrity_key k USING(key_version) JOIN object_store.protected_object o ON o.id=m.protected_object_id WHERE m.revision_id=row.revision_id),
  'report',(SELECT report FROM deliverable.qc_run WHERE revision_id=row.revision_id ORDER BY created_at DESC LIMIT 1));
END $$;
