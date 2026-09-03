-- Source Packet command infrastructure: durable command replay for every mutating Source Packet,
-- Work Objective, condition, and rights command.
CREATE TABLE IF NOT EXISTS source.packet_command_idempotency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  command_type text NOT NULL CHECK (command_type IN ('create_source_packet','create_source_packet_version','create_work_objective','create_source_condition_assessment','create_source_rights_assessment')),
  key_hash text NOT NULL,
  request_digest text NOT NULL,
  response jsonb NOT NULL,
  status_code integer NOT NULL CHECK (status_code BETWEEN 200 AND 299),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, actor_id, command_type, key_hash),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, actor_id) REFERENCES app.account_actor(account_id, actor_id)
);

ALTER TABLE source.packet_command_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE source.packet_command_idempotency FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS packet_command_idempotency_scope ON source.packet_command_idempotency;
CREATE POLICY packet_command_idempotency_scope ON source.packet_command_idempotency
  FOR SELECT TO app_runtime
  USING (account_id = app.policy_account_id() AND actor_id = app.policy_actor_id() AND deal_id = app.policy_deal_id());

GRANT USAGE ON SCHEMA source TO app_source_owner;
GRANT SELECT, INSERT, UPDATE ON source.packet_command_idempotency TO app_source_owner;

CREATE OR REPLACE FUNCTION source.packet_command_replay(
  p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_command_type text, p_key_hash text, p_request_digest text
)
RETURNS TABLE(response jsonb, status_code integer, idempotent_replayed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, app, pg_catalog AS $$
DECLARE prior source.packet_command_idempotency%ROWTYPE;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id()
     OR p_actor_id IS DISTINCT FROM app.policy_actor_id()
     OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN
    RAISE EXCEPTION 'source_packet_scope_mismatch' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO prior
  FROM source.packet_command_idempotency
  WHERE account_id = p_account_id AND actor_id = p_actor_id AND deal_id = p_deal_id
    AND command_type = p_command_type AND key_hash = p_key_hash
  FOR UPDATE;
  IF FOUND THEN
    IF prior.request_digest IS DISTINCT FROM p_request_digest THEN
      RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE = '23505';
    END IF;
    RETURN QUERY SELECT prior.response, prior.status_code, true;
    RETURN;
  END IF;
  RETURN QUERY SELECT NULL::jsonb, NULL::integer, false;
END $$;

CREATE OR REPLACE FUNCTION source.packet_command_record(
  p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_command_type text, p_key_hash text, p_request_digest text, p_response jsonb, p_status_code integer
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, app, pg_catalog AS $$
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id()
     OR p_actor_id IS DISTINCT FROM app.policy_actor_id()
     OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN
    RAISE EXCEPTION 'source_packet_scope_mismatch' USING ERRCODE = '42501';
  END IF;
  INSERT INTO source.packet_command_idempotency(account_id, actor_id, deal_id, command_type, key_hash, request_digest, response, status_code)
  VALUES (p_account_id, p_actor_id, p_deal_id, p_command_type, p_key_hash, p_request_digest, p_response, p_status_code);
END $$;

GRANT CREATE ON SCHEMA source TO app_source_owner;
ALTER FUNCTION source.packet_command_replay(uuid,uuid,uuid,text,text,text) OWNER TO app_source_owner;
ALTER FUNCTION source.packet_command_record(uuid,uuid,uuid,text,text,text,jsonb,integer) OWNER TO app_source_owner;
REVOKE ALL ON FUNCTION source.packet_command_replay(uuid,uuid,uuid,text,text,text), source.packet_command_record(uuid,uuid,uuid,text,text,text,jsonb,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION source.packet_command_replay(uuid,uuid,uuid,text,text,text), source.packet_command_record(uuid,uuid,uuid,text,text,text,jsonb,integer) TO app_runtime;
REVOKE CREATE ON SCHEMA source FROM app_source_owner;
