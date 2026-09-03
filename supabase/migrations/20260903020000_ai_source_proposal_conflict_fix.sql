-- Keep conflict proposals inspectable when the strict conflict payload itself
-- is the source of the conflict record.
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
    IF coalesce(item->>'proposal_kind','') NOT IN ('claim','evidence_link','conflict') THEN RAISE EXCEPTION 'ai_proposal_kind_invalid' USING ERRCODE='22023'; END IF;
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
