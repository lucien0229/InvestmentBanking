CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS app;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime LOGIN PASSWORD 'app_runtime_dev';
  END IF;
  ALTER ROLE app_runtime NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
END
$$;

CREATE TABLE IF NOT EXISTS app.account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 160),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.actor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_kind text NOT NULL DEFAULT 'individual_banker' CHECK (actor_kind = 'individual_banker'),
  email_digest text NOT NULL UNIQUE,
  display_name text NOT NULL DEFAULT 'Individual Banker',
  passkey_registered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE app.actor ADD COLUMN IF NOT EXISTS external_subject text;
CREATE UNIQUE INDEX IF NOT EXISTS actor_external_subject_uq ON app.actor(external_subject) WHERE external_subject IS NOT NULL;

CREATE TABLE IF NOT EXISTS app.account_actor (
  account_id uuid NOT NULL REFERENCES app.account(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  relationship_code text NOT NULL DEFAULT 'owner' CHECK (relationship_code = 'owner'),
  active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (account_id, actor_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS account_actor_one_active_account ON app.account_actor(actor_id) WHERE active;

CREATE TABLE IF NOT EXISTS app.deal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 160),
  client_label text NOT NULL,
  transaction_subject text NOT NULL,
  mandate_objective text NOT NULL,
  business_stage text NOT NULL CHECK (business_stage IN ('Initiated','Preparation','In Market','Bid Evaluation','Exclusive Execution','Signed','Closed','Terminated')),
  activity_posture text NOT NULL DEFAULT 'active' CHECK (activity_posture IN ('active','paused','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, name)
);

CREATE TABLE IF NOT EXISTS app.deal_workspace (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL UNIQUE REFERENCES app.deal(id),
  posture_version bigint NOT NULL DEFAULT 1,
  overview_revision_id text NOT NULL,
  displayed_state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, deal_id)
);

CREATE TABLE IF NOT EXISTS app.auth_challenge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_digest text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  account_id uuid NOT NULL REFERENCES app.account(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);

CREATE TABLE IF NOT EXISTS app.auth_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  account_id uuid NOT NULL REFERENCES app.account(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  passkey_verified boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'magic_link' CHECK (mode IN ('magic_link','passkey_registered','banker')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS app.request_context (
  backend_pid integer PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES app.account(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  deal_id uuid REFERENCES app.deal(id),
  established_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.passkey_credential (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  credential_digest text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.audit_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid REFERENCES app.deal(id),
  actor_id uuid REFERENCES app.actor(id),
  code text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('attempted','completed','rejected')),
  object_kind text NOT NULL,
  object_id text,
  reason_code text NOT NULL,
  trace_id text NOT NULL,
  previous_hash text,
  event_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION app.context_uuid(setting_name text)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting(setting_name, true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app.begin_request(p_session_token_hash text, p_deal_id uuid DEFAULT NULL)
RETURNS TABLE(account_id uuid, actor_id uuid, passkey_verified boolean, mode text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  session_row app.auth_session%ROWTYPE;
BEGIN
  SELECT * INTO session_row
  FROM app.auth_session
  WHERE token_hash = p_session_token_hash
    AND expires_at > clock_timestamp();
  IF NOT FOUND THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM app.account_actor aa
    WHERE aa.account_id = session_row.account_id
      AND aa.actor_id = session_row.actor_id
      AND aa.active
  ) THEN
    RETURN;
  END IF;
  IF p_deal_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM app.deal d
    WHERE d.id = p_deal_id AND d.account_id = session_row.account_id
  ) THEN
    RETURN;
  END IF;
  DELETE FROM app.request_context WHERE backend_pid = pg_backend_pid();
  INSERT INTO app.request_context(backend_pid, account_id, actor_id, deal_id)
  VALUES (pg_backend_pid(), session_row.account_id, session_row.actor_id, p_deal_id);
  RETURN QUERY SELECT session_row.account_id, session_row.actor_id, session_row.passkey_verified, session_row.mode;
END
$$;

CREATE OR REPLACE FUNCTION app.set_deal_scope(p_deal_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  current_account uuid := app.policy_account_id();
BEGIN
  IF current_account IS NULL OR NOT EXISTS (SELECT 1 FROM app.deal WHERE id = p_deal_id AND account_id = current_account) THEN
    RETURN false;
  END IF;
  UPDATE app.request_context SET deal_id = p_deal_id WHERE backend_pid = pg_backend_pid();
  RETURN true;
END
$$;

CREATE OR REPLACE FUNCTION app.clear_request()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$ DELETE FROM app.request_context WHERE backend_pid = pg_backend_pid() $$;

CREATE OR REPLACE FUNCTION app.issue_magic_link(p_email_digest text, p_token_hash text)
RETURNS TABLE(account_id uuid, actor_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  found_actor app.actor%ROWTYPE;
  found_account uuid;
BEGIN
  SELECT * INTO found_actor FROM app.actor WHERE email_digest = p_email_digest;
  IF NOT FOUND THEN
    INSERT INTO app.actor(email_digest) VALUES (p_email_digest) RETURNING * INTO found_actor;
    INSERT INTO app.account(display_name) VALUES ('Individual Banker Account') RETURNING id INTO found_account;
    INSERT INTO app.account_actor(account_id, actor_id) VALUES (found_account, found_actor.id);
  ELSE
    SELECT aa.account_id INTO found_account FROM app.account_actor aa WHERE aa.actor_id = found_actor.id AND aa.active LIMIT 1;
    IF found_account IS NULL THEN
      INSERT INTO app.account(display_name) VALUES ('Individual Banker Account') RETURNING id INTO found_account;
      INSERT INTO app.account_actor(account_id, actor_id) VALUES (found_account, found_actor.id);
    END IF;
  END IF;
  INSERT INTO app.auth_challenge(email_digest, token_hash, account_id, actor_id, expires_at)
  VALUES (p_email_digest, p_token_hash, found_account, found_actor.id, clock_timestamp() + interval '15 minutes');
  RETURN QUERY SELECT found_account, found_actor.id;
END
$$;

CREATE OR REPLACE FUNCTION app.verify_magic_link(p_token_hash text, p_session_token_hash text)
RETURNS TABLE(account_id uuid, actor_id uuid, session_token_hash text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  challenge_row app.auth_challenge%ROWTYPE;
BEGIN
  SELECT * INTO challenge_row FROM app.auth_challenge
  WHERE token_hash = p_token_hash AND consumed_at IS NULL AND expires_at > clock_timestamp();
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE app.auth_challenge SET consumed_at = clock_timestamp() WHERE id = challenge_row.id;
  INSERT INTO app.auth_session(token_hash, account_id, actor_id, expires_at)
  VALUES (p_session_token_hash, challenge_row.account_id, challenge_row.actor_id, clock_timestamp() + interval '7 days');
  RETURN QUERY SELECT challenge_row.account_id, challenge_row.actor_id, p_session_token_hash;
END
$$;

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

CREATE OR REPLACE FUNCTION app.register_passkey(p_session_token_hash text, p_credential_digest text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  session_row app.auth_session%ROWTYPE;
BEGIN
  SELECT * INTO session_row FROM app.auth_session WHERE token_hash = p_session_token_hash AND expires_at > clock_timestamp();
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO app.passkey_credential(actor_id, credential_digest) VALUES (session_row.actor_id, p_credential_digest)
  ON CONFLICT (credential_digest) DO NOTHING;
  UPDATE app.actor SET passkey_registered = true WHERE id = session_row.actor_id;
  UPDATE app.auth_session SET mode = 'passkey_registered' WHERE id = session_row.id;
  RETURN true;
END
$$;

CREATE OR REPLACE FUNCTION app.authenticate_passkey(p_session_token_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  session_row app.auth_session%ROWTYPE;
BEGIN
  SELECT * INTO session_row FROM app.auth_session WHERE token_hash = p_session_token_hash AND expires_at > clock_timestamp();
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM app.actor WHERE id = session_row.actor_id AND passkey_registered) THEN RETURN false; END IF;
  UPDATE app.auth_session SET passkey_verified = true, mode = 'banker' WHERE id = session_row.id;
  RETURN true;
END
$$;

CREATE OR REPLACE FUNCTION app.record_audit(
  p_code text,
  p_outcome text,
  p_object_kind text,
  p_object_id text,
  p_reason_code text,
  p_trace_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  current_account uuid := app.policy_account_id();
  current_actor uuid := app.policy_actor_id();
  current_deal uuid := app.policy_deal_id();
  previous_event_hash text;
  new_id uuid := gen_random_uuid();
  new_hash text;
BEGIN
  IF current_account IS NULL THEN RAISE EXCEPTION 'missing authorization context' USING ERRCODE = '42501'; END IF;
  SELECT event_hash INTO previous_event_hash FROM app.audit_event WHERE account_id = current_account ORDER BY created_at DESC, id DESC LIMIT 1;
  new_hash := md5(concat_ws('|', COALESCE(previous_event_hash,''), new_id::text, p_code, p_object_kind, COALESCE(p_object_id,''), p_trace_id));
  INSERT INTO app.audit_event(id, account_id, deal_id, actor_id, code, outcome, object_kind, object_id, reason_code, trace_id, previous_hash, event_hash)
  VALUES (new_id, current_account, current_deal, current_actor, p_code, p_outcome, p_object_kind, p_object_id, p_reason_code, p_trace_id, previous_event_hash, new_hash);
  RETURN new_id;
END
$$;

CREATE OR REPLACE FUNCTION app.policy_account_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_catalog
AS $$ SELECT account_id FROM app.request_context WHERE backend_pid = pg_backend_pid() $$;
CREATE OR REPLACE FUNCTION app.policy_actor_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_catalog
AS $$ SELECT actor_id FROM app.request_context WHERE backend_pid = pg_backend_pid() $$;
CREATE OR REPLACE FUNCTION app.policy_deal_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_catalog
AS $$ SELECT deal_id FROM app.request_context WHERE backend_pid = pg_backend_pid() $$;

ALTER TABLE app.account ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.actor ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.account_actor ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.deal ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.deal_workspace ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.auth_challenge ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.auth_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.passkey_credential ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.audit_event ENABLE ROW LEVEL SECURITY;

ALTER TABLE app.account FORCE ROW LEVEL SECURITY;
ALTER TABLE app.actor FORCE ROW LEVEL SECURITY;
ALTER TABLE app.account_actor FORCE ROW LEVEL SECURITY;
ALTER TABLE app.deal FORCE ROW LEVEL SECURITY;
ALTER TABLE app.deal_workspace FORCE ROW LEVEL SECURITY;
ALTER TABLE app.auth_challenge FORCE ROW LEVEL SECURITY;
ALTER TABLE app.auth_session FORCE ROW LEVEL SECURITY;
ALTER TABLE app.passkey_credential FORCE ROW LEVEL SECURITY;
ALTER TABLE app.audit_event FORCE ROW LEVEL SECURITY;
ALTER TABLE app.request_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.request_context FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'account_scope' AND polrelid = 'app.account'::regclass) THEN
    CREATE POLICY account_scope ON app.account FOR SELECT TO app_runtime USING (id = app.policy_account_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'actor_scope' AND polrelid = 'app.actor'::regclass) THEN
    CREATE POLICY actor_scope ON app.actor FOR SELECT TO app_runtime USING (id = app.policy_actor_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'account_actor_scope' AND polrelid = 'app.account_actor'::regclass) THEN
    CREATE POLICY account_actor_scope ON app.account_actor FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND actor_id = app.policy_actor_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'deal_scope' AND polrelid = 'app.deal'::regclass) THEN
    CREATE POLICY deal_scope ON app.deal FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND id = app.policy_deal_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'workspace_scope' AND polrelid = 'app.deal_workspace'::regclass) THEN
    CREATE POLICY workspace_scope ON app.deal_workspace FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
  END IF;
END
$$;

DROP POLICY IF EXISTS audit_scope ON app.audit_event;
CREATE POLICY audit_scope ON app.audit_event FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());

REVOKE ALL ON SCHEMA app FROM PUBLIC;
REVOKE ALL ON FUNCTION app.begin_request(text, uuid), app.set_deal_scope(uuid), app.clear_request(), app.issue_magic_link(text, text), app.verify_magic_link(text, text), app.issue_external_session(text, text, text), app.register_external_passkey(text, text), app.authenticate_external_passkey(text, text), app.register_passkey(text, text), app.authenticate_passkey(text), app.record_audit(text, text, text, text, text, text), app.policy_account_id(), app.policy_actor_id(), app.policy_deal_id() FROM PUBLIC;
GRANT USAGE ON SCHEMA app TO app_runtime;
GRANT SELECT ON app.account, app.actor, app.account_actor, app.deal, app.deal_workspace, app.audit_event TO app_runtime;
GRANT EXECUTE ON FUNCTION app.begin_request(text, uuid), app.set_deal_scope(uuid), app.clear_request(), app.issue_magic_link(text, text), app.verify_magic_link(text, text), app.issue_external_session(text, text, text), app.register_external_passkey(text, text), app.authenticate_external_passkey(text, text), app.register_passkey(text, text), app.authenticate_passkey(text), app.record_audit(text, text, text, text, text, text), app.policy_account_id(), app.policy_actor_id(), app.policy_deal_id() TO app_runtime;
