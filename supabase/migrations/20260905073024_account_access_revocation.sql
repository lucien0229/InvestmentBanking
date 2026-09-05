-- Membership is checked by the existing typed Deal-list projection. Runtime
-- callers still cannot enumerate a different Account or establish its context.
GRANT SELECT ON app.account_actor TO app_commerce_owner;
CREATE POLICY commerce_membership_read ON app.account_actor FOR SELECT TO app_commerce_owner
  USING (account_id = app.policy_account_id() AND actor_id = app.policy_actor_id());

CREATE ROLE app_access_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
GRANT app_access_owner TO postgres;
GRANT USAGE, CREATE ON SCHEMA app TO app_access_owner;
GRANT SELECT, UPDATE ON app.auth_session TO app_access_owner;
GRANT EXECUTE ON FUNCTION app.policy_account_id(), app.policy_actor_id(), app.record_audit(text,text,text,text,text,text) TO app_access_owner;
CREATE POLICY access_session_read ON app.auth_session FOR SELECT TO app_access_owner
  USING (account_id = app.policy_account_id() AND actor_id = app.policy_actor_id());
CREATE POLICY access_session_revoke ON app.auth_session FOR UPDATE TO app_access_owner
  USING (account_id = app.policy_account_id() AND actor_id = app.policy_actor_id())
  WITH CHECK (account_id = app.policy_account_id() AND actor_id = app.policy_actor_id());

CREATE FUNCTION app.revoke_current_session(p_token_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
DECLARE revoked_id uuid;
BEGIN
  UPDATE app.auth_session SET expires_at = clock_timestamp()
    WHERE token_hash = p_token_hash AND expires_at > clock_timestamp()
      AND account_id = app.policy_account_id() AND actor_id = app.policy_actor_id()
    RETURNING id INTO revoked_id;
  IF revoked_id IS NULL THEN RETURN false; END IF;
  PERFORM app.record_audit('session.revoked','completed','session',revoked_id::text,'banker_logout',gen_random_uuid()::text);
  RETURN true;
END $$;
ALTER FUNCTION app.revoke_current_session(text) OWNER TO app_access_owner;
REVOKE ALL ON FUNCTION app.revoke_current_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.revoke_current_session(text) TO app_runtime;
REVOKE CREATE ON SCHEMA app FROM app_access_owner;
