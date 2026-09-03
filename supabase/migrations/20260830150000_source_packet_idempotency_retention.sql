-- Keep command replay evidence within the documented 30-day window.
ALTER TABLE source.source_packet_command_idempotency
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;
UPDATE source.source_packet_command_idempotency
SET expires_at = created_at + interval '30 days'
WHERE expires_at IS NULL;
ALTER TABLE source.source_packet_command_idempotency
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days'),
  ALTER COLUMN expires_at SET NOT NULL;

CREATE OR REPLACE FUNCTION source.ticket08_command_replay(
  p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_command_type text, p_key_hash text, p_request_digest text
)
RETURNS TABLE(response jsonb, status_code integer, idempotent_replayed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, app, pg_catalog AS $$
DECLARE prior source.source_packet_command_idempotency%ROWTYPE;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN
    RAISE EXCEPTION 'source_packet_scope_mismatch' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO prior FROM source.source_packet_command_idempotency
  WHERE account_id=p_account_id AND actor_id=p_actor_id AND deal_id=p_deal_id AND command_type=p_command_type AND key_hash=p_key_hash AND expires_at>clock_timestamp()
  FOR UPDATE;
  IF FOUND THEN
    IF prior.request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE = '23505'; END IF;
    RETURN QUERY SELECT prior.response, prior.status_code, true; RETURN;
  END IF;
  RETURN QUERY SELECT NULL::jsonb, NULL::integer, false;
END $$;

GRANT CREATE ON SCHEMA source TO app_source_owner;
ALTER FUNCTION source.ticket08_command_replay(uuid,uuid,uuid,text,text,text) OWNER TO app_source_owner;
REVOKE CREATE ON SCHEMA source FROM app_source_owner;
