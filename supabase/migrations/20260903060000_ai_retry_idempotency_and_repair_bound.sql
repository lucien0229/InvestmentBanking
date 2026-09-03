ALTER TABLE ai.command_idempotency
  ADD COLUMN IF NOT EXISTS result_id uuid REFERENCES ai.run_retry(id);

CREATE OR REPLACE FUNCTION ai.record_retry(
  p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_run_id uuid,
  p_retry_kind text,p_reason_code text,p_key_hash text,p_request_digest text
)
RETURNS TABLE(retry_id uuid, retry_ordinal integer, idempotent_replayed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ai, app, pg_catalog AS $$
DECLARE
  existing_command ai.command_idempotency%ROWTYPE;
  run_row ai.run%ROWTYPE;
  next_ordinal integer;
  id_value uuid := gen_random_uuid();
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN
    RAISE EXCEPTION 'ai_scope_mismatch' USING ERRCODE='42501';
  END IF;
  SELECT * INTO existing_command
    FROM ai.command_idempotency
   WHERE account_id=p_account_id AND actor_id=p_actor_id AND deal_id=p_deal_id
     AND command_type='retry_ai_run' AND key_hash=p_key_hash;
  IF FOUND THEN
    IF existing_command.request_digest IS DISTINCT FROM p_request_digest THEN
      RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE='23505';
    END IF;
    IF existing_command.result_id IS NULL THEN
      RAISE EXCEPTION 'ai_retry_idempotency_corrupt' USING ERRCODE='23514';
    END IF;
    RETURN QUERY SELECT existing_command.result_id,
      (SELECT retry_ordinal FROM ai.run_retry WHERE id=existing_command.result_id), true;
    RETURN;
  END IF;
  SELECT * INTO run_row FROM ai.run WHERE id=p_run_id AND account_id=p_account_id AND deal_id=p_deal_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'ai_run_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF p_retry_kind NOT IN ('transient_provider','contract_repair') THEN RAISE EXCEPTION 'ai_retry_kind_invalid' USING ERRCODE='22023'; END IF;
  IF p_reason_code IS NULL OR length(trim(p_reason_code)) = 0 THEN RAISE EXCEPTION 'ai_retry_reason_required' USING ERRCODE='22023'; END IF;
  IF p_retry_kind='contract_repair' AND EXISTS (SELECT 1 FROM ai.run_retry WHERE run_id=p_run_id AND retry_kind='contract_repair') THEN
    RAISE EXCEPTION 'ai_repair_limit_exceeded' USING ERRCODE='22023';
  END IF;
  SELECT coalesce(max(retry_ordinal),0)+1 INTO next_ordinal FROM ai.run_retry WHERE run_id=p_run_id;
  IF next_ordinal > 2 THEN RAISE EXCEPTION 'ai_retry_limit_exceeded' USING ERRCODE='22023'; END IF;
  INSERT INTO ai.run_retry(id,account_id,deal_id,run_id,retry_ordinal,retry_kind,reason_code,outcome)
  VALUES (id_value,p_account_id,p_deal_id,p_run_id,next_ordinal,p_retry_kind,p_reason_code,'queued');
  INSERT INTO ai.command_idempotency(account_id,actor_id,deal_id,command_type,key_hash,request_digest,run_id,result_id)
  VALUES (p_account_id,p_actor_id,p_deal_id,'retry_ai_run',p_key_hash,p_request_digest,p_run_id,id_value);
  RETURN QUERY SELECT id_value,next_ordinal,false;
END $$;

REVOKE ALL ON FUNCTION ai.record_retry(uuid,uuid,uuid,uuid,text,text, text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ai.record_retry(uuid,uuid,uuid,uuid,text,text,text,text) TO app_runtime;
ALTER FUNCTION ai.record_retry(uuid,uuid,uuid,uuid,text,text,text,text) OWNER TO app_ai_owner;
