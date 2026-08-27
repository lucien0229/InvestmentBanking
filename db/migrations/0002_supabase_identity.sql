-- External Supabase identity mapping for the production Auth seam.
ALTER TABLE app.actor ADD COLUMN IF NOT EXISTS external_subject text;
CREATE UNIQUE INDEX IF NOT EXISTS actor_external_subject_uq ON app.actor(external_subject) WHERE external_subject IS NOT NULL;

CREATE OR REPLACE FUNCTION app.issue_external_session(p_external_subject text, p_email_digest text, p_session_token_hash text)
RETURNS TABLE(account_id uuid, actor_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  found_actor app.actor%ROWTYPE;
  found_account uuid;
BEGIN
  SELECT * INTO found_actor FROM app.actor WHERE external_subject = p_external_subject;
  IF NOT FOUND THEN
    SELECT * INTO found_actor FROM app.actor WHERE email_digest = p_email_digest;
    IF FOUND AND found_actor.external_subject IS NOT NULL AND found_actor.external_subject <> p_external_subject THEN
      RETURN;
    END IF;
  END IF;
  IF NOT FOUND THEN
    INSERT INTO app.actor(email_digest, external_subject) VALUES (p_email_digest, p_external_subject) RETURNING * INTO found_actor;
    INSERT INTO app.account(display_name) VALUES ('Individual Banker Account') RETURNING id INTO found_account;
    INSERT INTO app.account_actor(account_id, actor_id) VALUES (found_account, found_actor.id);
  ELSE
    UPDATE app.actor SET external_subject = p_external_subject WHERE id = found_actor.id;
    SELECT aa.account_id INTO found_account FROM app.account_actor aa WHERE aa.actor_id = found_actor.id AND aa.active LIMIT 1;
    IF found_account IS NULL THEN
      INSERT INTO app.account(display_name) VALUES ('Individual Banker Account') RETURNING id INTO found_account;
      INSERT INTO app.account_actor(account_id, actor_id) VALUES (found_account, found_actor.id);
    END IF;
  END IF;
  INSERT INTO app.auth_session(token_hash, account_id, actor_id, expires_at)
  VALUES (p_session_token_hash, found_account, found_actor.id, clock_timestamp() + interval '7 days');
  RETURN QUERY SELECT found_account, found_actor.id;
END
$$;

CREATE OR REPLACE FUNCTION app.register_external_passkey(p_session_token_hash text, p_external_subject text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  session_row app.auth_session%ROWTYPE;
BEGIN
  SELECT s.* INTO session_row FROM app.auth_session s JOIN app.actor a ON a.id = s.actor_id
  WHERE s.token_hash = p_session_token_hash AND s.expires_at > clock_timestamp() AND a.external_subject = p_external_subject;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE app.actor SET passkey_registered = true WHERE id = session_row.actor_id;
  UPDATE app.auth_session SET mode = 'passkey_registered' WHERE id = session_row.id;
  RETURN true;
END
$$;

CREATE OR REPLACE FUNCTION app.authenticate_external_passkey(p_session_token_hash text, p_external_subject text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  session_row app.auth_session%ROWTYPE;
BEGIN
  SELECT s.* INTO session_row FROM app.auth_session s JOIN app.actor a ON a.id = s.actor_id
  WHERE s.token_hash = p_session_token_hash AND s.expires_at > clock_timestamp() AND a.external_subject = p_external_subject AND a.passkey_registered;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE app.auth_session SET passkey_verified = true, mode = 'banker' WHERE id = session_row.id;
  RETURN true;
END
$$;

REVOKE ALL ON FUNCTION app.issue_external_session(text, text, text), app.register_external_passkey(text, text), app.authenticate_external_passkey(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.issue_external_session(text, text, text), app.register_external_passkey(text, text), app.authenticate_external_passkey(text, text) TO app_runtime;
