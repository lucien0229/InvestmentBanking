-- AI Run identity and input bindings are immutable, while its lifecycle and
-- protected outcome fields advance exactly once through the completion seam.
CREATE OR REPLACE FUNCTION ai.prevent_run_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' OR NEW.id IS DISTINCT FROM OLD.id OR NEW.account_id IS DISTINCT FROM OLD.account_id OR NEW.deal_id IS DISTINCT FROM OLD.deal_id OR NEW.actor_id IS DISTINCT FROM OLD.actor_id OR NEW.job_id IS DISTINCT FROM OLD.job_id OR NEW.job_scope_id IS DISTINCT FROM OLD.job_scope_id OR NEW.packet_version_id IS DISTINCT FROM OLD.packet_version_id OR NEW.task_definition IS DISTINCT FROM OLD.task_definition OR NEW.task_definition_version IS DISTINCT FROM OLD.task_definition_version OR NEW.prompt_package_id IS DISTINCT FROM OLD.prompt_package_id OR NEW.provider_profile_id IS DISTINCT FROM OLD.provider_profile_id OR NEW.scope_digest IS DISTINCT FROM OLD.scope_digest OR NEW.canonical_input_digest IS DISTINCT FROM OLD.canonical_input_digest OR NEW.request_digest IS DISTINCT FROM OLD.request_digest OR NEW.request_nonce IS DISTINCT FROM OLD.request_nonce THEN
    RAISE EXCEPTION 'ai_run_identity_immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ai_run_immutable ON ai.run;
CREATE TRIGGER ai_run_immutable BEFORE UPDATE OR DELETE ON ai.run FOR EACH ROW EXECUTE FUNCTION ai.prevent_run_mutation();
GRANT CREATE ON SCHEMA ai TO app_ai_owner;
ALTER FUNCTION ai.prevent_run_mutation() OWNER TO app_ai_owner;
REVOKE CREATE ON SCHEMA ai FROM app_ai_owner;
