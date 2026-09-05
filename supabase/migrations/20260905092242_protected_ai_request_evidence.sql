-- Capture reconstruction evidence before provider I/O. Credentials are never
-- included. Request evidence is encrypted, append-only and not an API projection.
CREATE TABLE ai.provider_request_evidence (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL,
 deal_id uuid NOT NULL, run_id uuid NOT NULL REFERENCES ai.run(id),
 evidence_kind text NOT NULL CHECK(evidence_kind IN('input_envelope','provider_request')),
 ciphertext bytea NOT NULL CHECK(octet_length(ciphertext) BETWEEN 32 AND 1048576),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(run_id,evidence_kind)
);
ALTER TABLE ai.provider_request_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.provider_request_evidence FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ai.provider_request_evidence FROM PUBLIC,app_runtime,job_worker,job_dispatcher;
GRANT SELECT,INSERT ON ai.provider_request_evidence TO app_ai_owner;
CREATE POLICY request_evidence_owner ON ai.provider_request_evidence TO app_ai_owner USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id()) WITH CHECK(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE TRIGGER request_evidence_immutable BEFORE UPDATE OR DELETE ON ai.provider_request_evidence FOR EACH ROW EXECUTE FUNCTION ai.prevent_immutable_mutation();
CREATE FUNCTION ai.record_provider_request(p_run_id uuid,p_kind text,p_ciphertext bytea) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=ai,app,pg_catalog AS $$
DECLARE run_row ai.run%ROWTYPE;
BEGIN
 SELECT * INTO run_row FROM ai.run WHERE id=p_run_id AND account_id=app.policy_account_id() AND actor_id=app.policy_actor_id() AND deal_id=app.policy_deal_id() AND status_code IN('queued','running') FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ai_run_scope_mismatch'; END IF;
 INSERT INTO ai.provider_request_evidence(account_id,deal_id,run_id,evidence_kind,ciphertext) VALUES(run_row.account_id,run_row.deal_id,p_run_id,p_kind,p_ciphertext);
 RETURN true;
END $$;
GRANT CREATE ON SCHEMA ai TO app_ai_owner;
ALTER FUNCTION ai.record_provider_request(uuid,text,bytea) OWNER TO app_ai_owner;
REVOKE CREATE ON SCHEMA ai FROM app_ai_owner;
REVOKE ALL ON FUNCTION ai.record_provider_request(uuid,text,bytea) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ai.record_provider_request(uuid,text,bytea) TO app_runtime,app_deliverable_owner;
