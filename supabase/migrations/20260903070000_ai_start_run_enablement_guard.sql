CREATE OR REPLACE FUNCTION ai.start_run(
  p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_job_id uuid, p_job_scope_id uuid,
  p_packet_version_id uuid, p_work_objective_id uuid, p_task_definition text,
  p_task_definition_version text, p_prompt_package_id uuid, p_provider_profile_id text,
  p_provenance_class text, p_confidentiality_class text, p_de_identification_posture text,
  p_scope_digest text, p_canonical_input_digest text, p_request_digest text, p_request_nonce text,
  p_key_hash text, p_material_capability_verified boolean, p_processing_evidence_verified boolean,
  p_restricted_approved boolean
) RETURNS TABLE(run_id uuid, idempotent_replayed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ai, source, app, pg_catalog AS $$
DECLARE existing ai.command_idempotency%ROWTYPE; new_id uuid := gen_random_uuid();
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN RAISE EXCEPTION 'ai_scope_mismatch' USING ERRCODE='42501'; END IF;
  SELECT * INTO existing FROM ai.command_idempotency WHERE account_id=p_account_id AND actor_id=p_actor_id AND deal_id=p_deal_id AND command_type='start_ai_run' AND key_hash=p_key_hash;
  IF FOUND THEN
    IF existing.request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE='23505'; END IF;
    RETURN QUERY SELECT existing.run_id, true; RETURN;
  END IF;
  IF p_work_objective_id IS NULL OR NOT EXISTS (SELECT 1 FROM app.work_objective o WHERE o.id=p_work_objective_id AND o.account_id=p_account_id AND o.deal_id=p_deal_id AND o.packet_version_id=p_packet_version_id) THEN RAISE EXCEPTION 'ai_objective_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM source.source_packet_version v WHERE v.id=p_packet_version_id AND v.account_id=p_account_id AND v.deal_id=p_deal_id) THEN RAISE EXCEPTION 'ai_packet_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF p_provider_profile_id NOT LIKE 'hellox%' THEN RAISE EXCEPTION 'ai_provider_not_allowed' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (
    SELECT 1
      FROM ai.task_definition t
      JOIN ai.prompt_package p ON p.id=p_prompt_package_id AND p.task_definition=t.task_definition AND p.package_version='1.0.0' AND p.lifecycle_status='enabled'
      JOIN ai.task_enablement e ON e.task_definition=t.task_definition AND e.task_definition_version=t.task_definition_version AND e.prompt_package_id=p.id AND e.provider_profile_id=p_provider_profile_id AND e.environment_code='local' AND e.provenance_class=p_provenance_class AND e.confidentiality_class=p_confidentiality_class AND e.status_code='enabled'
     WHERE t.task_definition=p_task_definition AND t.task_definition_version=p_task_definition_version AND t.lifecycle_status='enabled'
  ) THEN RAISE EXCEPTION 'ai_task_disabled' USING ERRCODE='42501'; END IF;
  IF p_confidentiality_class IN ('confidential','restricted') AND (NOT p_material_capability_verified OR NOT p_processing_evidence_verified OR (p_confidentiality_class='restricted' AND NOT p_restricted_approved)) THEN RAISE EXCEPTION 'ai_provider_capability_blocked' USING ERRCODE='42501'; END IF;
  INSERT INTO ai.run(id,account_id,deal_id,actor_id,job_id,job_scope_id,packet_version_id,work_objective_id,task_definition,task_definition_version,prompt_package_id,provider_profile_id,provenance_class,confidentiality_class,de_identification_posture,scope_digest,canonical_input_digest,request_digest,request_nonce,outcome_class,status_code)
  VALUES (new_id,p_account_id,p_deal_id,p_actor_id,p_job_id,p_job_scope_id,p_packet_version_id,p_work_objective_id,p_task_definition,p_task_definition_version,p_prompt_package_id,p_provider_profile_id,p_provenance_class,p_confidentiality_class,p_de_identification_posture,p_scope_digest,p_canonical_input_digest,p_request_digest,p_request_nonce,'queued','queued');
  INSERT INTO ai.command_idempotency(account_id,actor_id,deal_id,command_type,key_hash,request_digest,run_id) VALUES (p_account_id,p_actor_id,p_deal_id,'start_ai_run',p_key_hash,p_request_digest,new_id);
  PERFORM app.record_audit('ai_run_started','completed','ai_run',new_id::text,'proposal_only',gen_random_uuid()::text);
  RETURN QUERY SELECT new_id, false;
END $$;

ALTER FUNCTION ai.start_run(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,uuid,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean) OWNER TO app_ai_owner;
