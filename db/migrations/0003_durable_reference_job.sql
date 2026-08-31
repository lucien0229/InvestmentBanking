CREATE SCHEMA IF NOT EXISTS jobs;
CREATE SCHEMA IF NOT EXISTS commerce;
CREATE SCHEMA IF NOT EXISTS extensions;

-- Supabase installs pgcrypto under `extensions`; the local PostgreSQL image
-- installs it under `public`. Keep the durable Job functions portable without
-- replacing a provider-managed extension function.
DO $$
BEGIN
  IF to_regprocedure('extensions.digest(text,text)') IS NULL THEN
    EXECUTE $fn$CREATE FUNCTION extensions.digest(data text, algorithm text)
      RETURNS bytea LANGUAGE SQL IMMUTABLE PARALLEL SAFE
      AS 'SELECT public.digest(data, algorithm)'$fn$;
  END IF;
  IF to_regprocedure('extensions.digest(bytea,text)') IS NULL THEN
    EXECUTE $fn$CREATE FUNCTION extensions.digest(data bytea, algorithm text)
      RETURNS bytea LANGUAGE SQL IMMUTABLE PARALLEL SAFE
      AS 'SELECT public.digest(data, algorithm)'$fn$;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'job_worker') THEN
    CREATE ROLE job_worker LOGIN PASSWORD 'job_worker_dev'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'job_dispatcher') THEN
    CREATE ROLE job_dispatcher LOGIN PASSWORD 'job_dispatcher_dev'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS app.runtime_principal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_code text NOT NULL UNIQUE CHECK (principal_code IN ('reference_worker')),
  credential_version text NOT NULL,
  status_code text NOT NULL DEFAULT 'active' CHECK (status_code IN ('active', 'retired')),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app.runtime_principal(principal_code, credential_version)
VALUES ('reference_worker', 'reference-worker-credential-v1')
ON CONFLICT (principal_code) DO UPDATE SET credential_version = EXCLUDED.credential_version, status_code = 'active';

ALTER TABLE app.account ADD COLUMN IF NOT EXISTS security_epoch bigint NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS jobs.idempotency_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  command_type text NOT NULL,
  key_hash text NOT NULL,
  request_digest text NOT NULL,
  result_job_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  UNIQUE(account_id, actor_id, command_type, key_hash)
);

CREATE TABLE IF NOT EXISTS commerce.usage_reservation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  job_id uuid UNIQUE,
  allowance_class text NOT NULL CHECK (allowance_class = 'reference_workspace_build'),
  quantity numeric(20, 4) NOT NULL CHECK (quantity > 0),
  status text NOT NULL CHECK (status IN ('reserved', 'committed', 'released')),
  reserved_at timestamptz NOT NULL DEFAULT now(),
  committed_at timestamptz,
  released_at timestamptz
);

CREATE TABLE IF NOT EXISTS commerce.usage_ledger_entry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  reservation_id uuid NOT NULL REFERENCES commerce.usage_reservation(id),
  entry_type text NOT NULL CHECK (entry_type IN ('commit', 'release')),
  quantity numeric(20, 4) NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(reservation_id, entry_type)
);

CREATE TABLE IF NOT EXISTS jobs.job (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  command_type text NOT NULL CHECK (command_type = 'reference_workspace_build'),
  purpose_code text NOT NULL CHECK (purpose_code = 'reference_workspace_build'),
  accepted_inputs jsonb NOT NULL,
  input_digest text NOT NULL,
  input_version text NOT NULL,
  workflow_version text NOT NULL,
  release_id text NOT NULL,
  allowance_class text NOT NULL CHECK (allowance_class = 'reference_workspace_build'),
  allowance_quantity numeric(20, 4) NOT NULL CHECK (allowance_quantity > 0),
  allowance_posture text NOT NULL CHECK (allowance_posture IN ('reserved', 'committed', 'released')),
  workspace_posture_version bigint NOT NULL,
  security_epoch bigint NOT NULL DEFAULT 1,
  state text NOT NULL CHECK (state IN ('queued', 'running', 'waiting_for_user', 'waiting_for_source', 'blocked', 'failed_retryable', 'failed_terminal', 'canceled', 'completed')),
  progress jsonb NOT NULL DEFAULT '{"message_code":"queued"}'::jsonb,
  result jsonb,
  problem jsonb,
  requested_at timestamptz NOT NULL DEFAULT now(),
  cancel_requested_at timestamptz,
  terminal_at timestamptz,
  worker_heartbeat_at timestamptz,
  row_version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE jobs.job ADD COLUMN IF NOT EXISTS security_epoch bigint NOT NULL DEFAULT 1;

ALTER TABLE jobs.idempotency_record DROP CONSTRAINT IF EXISTS idempotency_record_result_job_fk;
ALTER TABLE jobs.idempotency_record ADD CONSTRAINT idempotency_record_result_job_fk FOREIGN KEY (result_job_id) REFERENCES jobs.job(id);
ALTER TABLE commerce.usage_reservation DROP CONSTRAINT IF EXISTS usage_reservation_job_fk;
ALTER TABLE commerce.usage_reservation ADD CONSTRAINT usage_reservation_job_fk FOREIGN KEY (job_id) REFERENCES jobs.job(id);

CREATE TABLE IF NOT EXISTS jobs.job_step (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  job_id uuid NOT NULL REFERENCES jobs.job(id) ON DELETE CASCADE,
  step_code text NOT NULL CHECK (step_code IN ('accepted_inputs', 'source_checkpoint', 'workspace_checkpoint', 'reference_result')),
  ordinal integer NOT NULL CHECK (ordinal BETWEEN 1 AND 4),
  operation_class text NOT NULL CHECK (operation_class = 'reference_workspace_build'),
  input_digest text NOT NULL,
  state text NOT NULL CHECK (state IN ('queued', 'running', 'completed', 'failed_retryable', 'failed_terminal', 'canceled')),
  result_key text,
  result_digest text,
  row_version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, step_code),
  UNIQUE(job_id, ordinal),
  UNIQUE(job_id, result_key)
);

CREATE TABLE IF NOT EXISTS jobs.job_attempt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  step_id uuid NOT NULL REFERENCES jobs.job_step(id) ON DELETE CASCADE,
  attempt_ordinal integer NOT NULL CHECK (attempt_ordinal > 0),
  runtime_principal_code text NOT NULL REFERENCES app.runtime_principal(principal_code),
  credential_version text NOT NULL,
  configuration_version text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  outcome text CHECK (outcome IN ('running', 'succeeded', 'failed_retryable', 'failed_terminal', 'canceled', 'blocked')),
  failure_code text,
  result_key text,
  UNIQUE(step_id, attempt_ordinal)
);

CREATE TABLE IF NOT EXISTS jobs.job_lease (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  step_id uuid NOT NULL REFERENCES jobs.job_step(id) ON DELETE CASCADE,
  attempt_id uuid NOT NULL UNIQUE REFERENCES jobs.job_attempt(id) ON DELETE CASCADE,
  runtime_principal_code text NOT NULL REFERENCES app.runtime_principal(principal_code),
  lease_token_hash text NOT NULL UNIQUE,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  heartbeat_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  released_at timestamptz,
  outcome text CHECK (outcome IN ('active', 'released', 'expired', 'committed', 'blocked', 'canceled'))
);

ALTER TABLE jobs.job_lease DROP CONSTRAINT IF EXISTS job_lease_outcome_check;
ALTER TABLE jobs.job_lease ADD CONSTRAINT job_lease_outcome_check CHECK (outcome IN ('active', 'released', 'expired', 'committed', 'blocked', 'canceled', 'failed_retryable', 'failed_terminal'));

CREATE UNIQUE INDEX IF NOT EXISTS job_lease_one_active_per_step
  ON jobs.job_lease(step_id) WHERE released_at IS NULL;

CREATE TABLE IF NOT EXISTS jobs.job_scope (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  job_id uuid NOT NULL REFERENCES jobs.job(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES jobs.job_step(id) ON DELETE CASCADE,
  attempt_id uuid NOT NULL REFERENCES jobs.job_attempt(id) ON DELETE CASCADE,
  lease_id uuid NOT NULL REFERENCES jobs.job_lease(id) ON DELETE CASCADE,
  runtime_principal_code text NOT NULL REFERENCES app.runtime_principal(principal_code),
  operation_code text NOT NULL CHECK (operation_code = 'reference_workspace_build'),
  input_digest text NOT NULL,
  input_version text NOT NULL,
  workflow_version text NOT NULL,
  release_id text NOT NULL,
  workspace_posture_version bigint NOT NULL,
  security_epoch bigint NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  scope_digest text NOT NULL
);
ALTER TABLE jobs.job_scope ADD COLUMN IF NOT EXISTS security_epoch bigint NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS jobs.job_scope_deal (
  scope_id uuid PRIMARY KEY REFERENCES jobs.job_scope(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id)
);

CREATE TABLE IF NOT EXISTS jobs.job_scope_operation (
  scope_id uuid NOT NULL REFERENCES jobs.job_scope(id) ON DELETE CASCADE,
  operation_code text NOT NULL CHECK (operation_code = 'reference_workspace_build'),
  PRIMARY KEY(scope_id, operation_code)
);

CREATE TABLE IF NOT EXISTS jobs.job_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  job_id uuid NOT NULL REFERENCES jobs.job(id) ON DELETE CASCADE,
  sequence bigint NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('job_snapshot', 'job_state_changed', 'job_progressed', 'job_problem', 'job_terminal')),
  state text NOT NULL,
  stage_code text,
  progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  safe_message_code text NOT NULL,
  recovery_action text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, sequence)
);

CREATE TABLE IF NOT EXISTS jobs.transactional_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  job_id uuid NOT NULL REFERENCES jobs.job(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type = 'job.step.dispatch'),
  event_version text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  published_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published')),
  UNIQUE(job_id, event_type)
);

ALTER TABLE app.runtime_principal ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.runtime_principal FORCE ROW LEVEL SECURITY;
ALTER TABLE jobs.idempotency_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs.idempotency_record FORCE ROW LEVEL SECURITY;
ALTER TABLE jobs.job ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs.job FORCE ROW LEVEL SECURITY;
ALTER TABLE jobs.job_step ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs.job_step FORCE ROW LEVEL SECURITY;
ALTER TABLE jobs.job_attempt ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs.job_attempt FORCE ROW LEVEL SECURITY;
ALTER TABLE jobs.job_lease ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs.job_lease FORCE ROW LEVEL SECURITY;
ALTER TABLE jobs.job_scope ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs.job_scope FORCE ROW LEVEL SECURITY;
ALTER TABLE jobs.job_scope_deal ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs.job_scope_deal FORCE ROW LEVEL SECURITY;
ALTER TABLE jobs.job_scope_operation ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs.job_scope_operation FORCE ROW LEVEL SECURITY;
ALTER TABLE jobs.job_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs.job_event FORCE ROW LEVEL SECURITY;
ALTER TABLE jobs.transactional_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs.transactional_outbox FORCE ROW LEVEL SECURITY;
ALTER TABLE commerce.usage_reservation ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce.usage_reservation FORCE ROW LEVEL SECURITY;
ALTER TABLE commerce.usage_ledger_entry ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce.usage_ledger_entry FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS runtime_principal_none ON app.runtime_principal;
CREATE POLICY runtime_principal_none ON app.runtime_principal FOR SELECT TO app_runtime USING (false);
DROP POLICY IF EXISTS job_scope ON jobs.job;
CREATE POLICY job_scope ON jobs.job FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
DROP POLICY IF EXISTS job_step_scope ON jobs.job_step;
CREATE POLICY job_step_scope ON jobs.job_step FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
DROP POLICY IF EXISTS job_event_scope ON jobs.job_event;
CREATE POLICY job_event_scope ON jobs.job_event FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
DROP POLICY IF EXISTS job_scope_scope ON jobs.job_scope;
CREATE POLICY job_scope_scope ON jobs.job_scope FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
DROP POLICY IF EXISTS job_scope_deal_scope ON jobs.job_scope_deal;
CREATE POLICY job_scope_deal_scope ON jobs.job_scope_deal FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
DROP POLICY IF EXISTS job_scope_operation_scope ON jobs.job_scope_operation;
CREATE POLICY job_scope_operation_scope ON jobs.job_scope_operation FOR SELECT TO app_runtime USING (scope_id IN (SELECT id FROM jobs.job_scope WHERE account_id = app.policy_account_id() AND deal_id = app.policy_deal_id()));
DROP POLICY IF EXISTS outbox_scope ON jobs.transactional_outbox;
CREATE POLICY outbox_scope ON jobs.transactional_outbox FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
DROP POLICY IF EXISTS usage_reservation_scope ON commerce.usage_reservation;
CREATE POLICY usage_reservation_scope ON commerce.usage_reservation FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
DROP POLICY IF EXISTS usage_ledger_scope ON commerce.usage_ledger_entry;
CREATE POLICY usage_ledger_scope ON commerce.usage_ledger_entry FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());

CREATE OR REPLACE FUNCTION jobs.append_job_event(
  p_job_id uuid,
  p_event_type text,
  p_state text,
  p_stage_code text,
  p_message_code text,
  p_recovery_action text,
  p_progress jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = jobs, pg_catalog
AS $$
DECLARE
  job_row jobs.job%ROWTYPE;
  next_sequence bigint;
BEGIN
  SELECT * INTO job_row FROM jobs.job WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job not found' USING ERRCODE = 'P0002'; END IF;
  SELECT COALESCE(MAX(sequence), 0) + 1 INTO next_sequence FROM jobs.job_event WHERE job_id = p_job_id;
  INSERT INTO jobs.job_event(account_id, deal_id, job_id, sequence, event_type, state, stage_code, progress, safe_message_code, recovery_action)
  VALUES (job_row.account_id, job_row.deal_id, job_row.id, next_sequence, p_event_type, p_state, p_stage_code, COALESCE(p_progress, '{}'::jsonb), p_message_code, p_recovery_action);
  RETURN next_sequence;
END
$$;

CREATE OR REPLACE FUNCTION jobs.start_reference_job(
  p_deal_id uuid,
  p_key_hash text,
  p_request_digest text,
  p_accepted_inputs jsonb
)
RETURNS TABLE(job_id uuid, created boolean, conflict boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = jobs, commerce, app, pg_catalog
AS $$
DECLARE
  current_account uuid := app.policy_account_id();
  current_actor uuid := app.policy_actor_id();
  existing jobs.idempotency_record%ROWTYPE;
  deal_row app.deal%ROWTYPE;
  workspace_row app.deal_workspace%ROWTYPE;
  new_job jobs.job%ROWTYPE;
  reservation_id uuid;
  input_digest text;
BEGIN
  IF current_account IS NULL OR current_actor IS NULL OR app.policy_deal_id() IS DISTINCT FROM p_deal_id THEN
    RETURN QUERY SELECT NULL::uuid, false, true;
    RETURN;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(current_account::text || ':' || p_key_hash));
  SELECT * INTO deal_row FROM app.deal WHERE id = p_deal_id AND account_id = current_account AND activity_posture = 'active';
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, false, true;
    RETURN;
  END IF;
  SELECT * INTO workspace_row FROM app.deal_workspace WHERE deal_id = p_deal_id AND account_id = current_account;
  IF NOT FOUND OR workspace_row IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, false, true;
    RETURN;
  END IF;
  SELECT * INTO existing FROM jobs.idempotency_record
  WHERE account_id = current_account AND actor_id = current_actor AND command_type = 'reference_workspace_build' AND key_hash = p_key_hash
  FOR UPDATE;
  IF FOUND THEN
    IF existing.request_digest <> p_request_digest THEN
      RETURN QUERY SELECT existing.result_job_id, false, true;
    ELSE
      RETURN QUERY SELECT existing.result_job_id, false, false;
    END IF;
    RETURN;
  END IF;
  IF jsonb_typeof(p_accepted_inputs) <> 'object'
     OR NOT (p_accepted_inputs ? 'source_packet')
     OR NOT (p_accepted_inputs ? 'requested_scope') THEN
    RETURN QUERY SELECT NULL::uuid, false, true;
    RETURN;
  END IF;
  input_digest := encode(extensions.digest(p_request_digest || ':' || p_accepted_inputs::text, 'sha256'), 'hex');
  INSERT INTO jobs.job(account_id, deal_id, actor_id, command_type, purpose_code, accepted_inputs, input_digest, input_version, workflow_version, release_id, allowance_class, allowance_quantity, allowance_posture, workspace_posture_version, security_epoch, state, progress)
  VALUES (current_account, p_deal_id, current_actor, 'reference_workspace_build', 'reference_workspace_build', p_accepted_inputs, input_digest, 'reference-input-v1', 'reference-workflow-v1', 'local-reference-release', 'reference_workspace_build', 1, 'reserved', workspace_row.posture_version, (SELECT security_epoch FROM app.account WHERE id = current_account), 'queued', '{"message_code":"queued"}'::jsonb)
  RETURNING * INTO new_job;
  INSERT INTO commerce.usage_reservation(account_id, deal_id, job_id, allowance_class, quantity, status)
  VALUES (current_account, p_deal_id, new_job.id, 'reference_workspace_build', 1, 'reserved')
  RETURNING id INTO reservation_id;
  INSERT INTO jobs.job_step(account_id, deal_id, job_id, step_code, ordinal, operation_class, input_digest, state)
  VALUES
    (current_account, p_deal_id, new_job.id, 'accepted_inputs', 1, 'reference_workspace_build', new_job.input_digest, 'queued'),
    (current_account, p_deal_id, new_job.id, 'source_checkpoint', 2, 'reference_workspace_build', new_job.input_digest, 'queued'),
    (current_account, p_deal_id, new_job.id, 'workspace_checkpoint', 3, 'reference_workspace_build', new_job.input_digest, 'queued'),
    (current_account, p_deal_id, new_job.id, 'reference_result', 4, 'reference_workspace_build', new_job.input_digest, 'queued');
  INSERT INTO jobs.transactional_outbox(account_id, deal_id, job_id, event_type, event_version, payload)
  SELECT current_account, p_deal_id, new_job.id, 'job.step.dispatch', '1.0.0', jsonb_build_object('job_id', new_job.id, 'job_type', new_job.command_type, 'contract_version', '1.0.0');
  INSERT INTO jobs.idempotency_record(account_id, actor_id, command_type, key_hash, request_digest, result_job_id)
  VALUES (current_account, current_actor, 'reference_workspace_build', p_key_hash, p_request_digest, new_job.id);
  PERFORM jobs.append_job_event(new_job.id, 'job_snapshot', 'queued', NULL, 'queued', 'observe_job', jsonb_build_object('message_code', 'queued'));
  RETURN QUERY SELECT new_job.id, true, false;
END
$$;

CREATE OR REPLACE FUNCTION jobs.resolve_job_deal(p_job_id uuid)
RETURNS TABLE(deal_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = jobs, app, pg_catalog
AS $$
  SELECT j.deal_id
  FROM jobs.job j
  WHERE j.id = p_job_id
    AND j.account_id = app.policy_account_id()
    AND j.actor_id = app.policy_actor_id()
$$;

CREATE OR REPLACE FUNCTION jobs.claim_reference_step(
  p_job_id uuid,
  p_principal_code text,
  p_credential_version text,
  p_lease_token_hash text
)
RETURNS TABLE(scope_id uuid, step_id uuid, attempt_id uuid, lease_id uuid, job_id uuid, account_id uuid, deal_id uuid, step_code text, input_digest text, input_version text, workflow_version text, release_id text, workspace_posture_version bigint, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = jobs, app, pg_catalog
AS $$
DECLARE
  job_row jobs.job%ROWTYPE;
  step_row jobs.job_step%ROWTYPE;
  principal_row app.runtime_principal%ROWTYPE;
  new_attempt jobs.job_attempt%ROWTYPE;
  new_lease jobs.job_lease%ROWTYPE;
  new_scope jobs.job_scope%ROWTYPE;
  lease_expiry timestamptz := clock_timestamp() + interval '90 seconds';
  next_attempt integer;
BEGIN
  SELECT * INTO principal_row FROM app.runtime_principal WHERE principal_code = p_principal_code AND credential_version = p_credential_version AND status_code = 'active';
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO job_row FROM jobs.job WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND OR job_row.state IN ('canceled', 'failed_terminal', 'completed', 'blocked') THEN RETURN; END IF;
  IF (SELECT d.activity_posture FROM app.deal d WHERE d.id = job_row.deal_id AND d.account_id = job_row.account_id) IS DISTINCT FROM 'active'
     OR (SELECT w.posture_version FROM app.deal_workspace w WHERE w.deal_id = job_row.deal_id AND w.account_id = job_row.account_id) IS DISTINCT FROM job_row.workspace_posture_version
     OR (SELECT a.security_epoch FROM app.account a WHERE a.id = job_row.account_id) IS DISTINCT FROM job_row.security_epoch THEN RETURN; END IF;
  SELECT st.* INTO step_row FROM jobs.job_step st WHERE st.job_id = p_job_id AND st.state = 'queued' ORDER BY st.ordinal LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN; END IF;
  IF step_row.ordinal > 1 AND EXISTS (SELECT 1 FROM jobs.job_step prior WHERE prior.job_id = p_job_id AND prior.ordinal < step_row.ordinal AND prior.state <> 'completed') THEN RETURN; END IF;
  SELECT COALESCE(MAX(ja.attempt_ordinal), 0) + 1 INTO next_attempt FROM jobs.job_attempt ja WHERE ja.step_id = step_row.id;
  INSERT INTO jobs.job_attempt(account_id, deal_id, step_id, attempt_ordinal, runtime_principal_code, credential_version, configuration_version, outcome)
  VALUES (job_row.account_id, job_row.deal_id, step_row.id, next_attempt, p_principal_code, p_credential_version, 'reference-worker-config-v1', 'running')
  RETURNING * INTO new_attempt;
  INSERT INTO jobs.job_lease(account_id, deal_id, step_id, attempt_id, runtime_principal_code, lease_token_hash, expires_at, outcome)
  VALUES (job_row.account_id, job_row.deal_id, step_row.id, new_attempt.id, p_principal_code, p_lease_token_hash, lease_expiry, 'active')
  RETURNING * INTO new_lease;
  INSERT INTO jobs.job_scope(account_id, deal_id, job_id, step_id, attempt_id, lease_id, runtime_principal_code, operation_code, input_digest, input_version, workflow_version, release_id, workspace_posture_version, security_epoch, expires_at, scope_digest)
  VALUES (job_row.account_id, job_row.deal_id, job_row.id, step_row.id, new_attempt.id, new_lease.id, p_principal_code, 'reference_workspace_build', job_row.input_digest, job_row.input_version, job_row.workflow_version, job_row.release_id, job_row.workspace_posture_version, job_row.security_epoch, lease_expiry, encode(extensions.digest(concat_ws('|', p_principal_code, p_credential_version, job_row.account_id::text, job_row.deal_id::text, job_row.id::text, step_row.id::text, new_attempt.id::text, 'reference_workspace_build', job_row.input_digest, job_row.input_version, job_row.workflow_version, job_row.release_id, job_row.workspace_posture_version::text, job_row.security_epoch::text, lease_expiry::text, p_lease_token_hash), 'sha256'), 'hex'))
  RETURNING * INTO new_scope;
  INSERT INTO jobs.job_scope_deal(scope_id, account_id, deal_id) VALUES (new_scope.id, job_row.account_id, job_row.deal_id);
  INSERT INTO jobs.job_scope_operation(scope_id, operation_code) VALUES (new_scope.id, 'reference_workspace_build');
  UPDATE jobs.job_step SET state = 'running', row_version = row_version + 1, updated_at = clock_timestamp() WHERE id = step_row.id;
  IF job_row.state = 'queued' OR job_row.state = 'failed_retryable' THEN
    UPDATE jobs.job SET state = 'running', progress = jsonb_build_object('message_code', 'running'), row_version = row_version + 1, worker_heartbeat_at = clock_timestamp(), updated_at = clock_timestamp() WHERE id = job_row.id;
    PERFORM jobs.append_job_event(job_row.id, 'job_state_changed', 'running', step_row.step_code, 'running', 'observe_job', jsonb_build_object('message_code', 'running'));
  ELSE
    UPDATE jobs.job SET worker_heartbeat_at = clock_timestamp(), updated_at = clock_timestamp() WHERE id = job_row.id;
    PERFORM jobs.append_job_event(job_row.id, 'job_progressed', 'running', step_row.step_code, 'step_started', 'observe_job', jsonb_build_object('message_code', 'step_started'));
  END IF;
  RETURN QUERY SELECT new_scope.id, step_row.id, new_attempt.id, new_lease.id, job_row.id, job_row.account_id, job_row.deal_id, step_row.step_code, job_row.input_digest, job_row.input_version, job_row.workflow_version, job_row.release_id, job_row.workspace_posture_version, lease_expiry;
END
$$;

CREATE OR REPLACE FUNCTION jobs.heartbeat_reference_step(p_scope_id uuid, p_lease_token_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = jobs, pg_catalog
AS $$
DECLARE
  scope_row jobs.job_scope%ROWTYPE;
BEGIN
  SELECT s.* INTO scope_row FROM jobs.job_scope s JOIN jobs.job_lease l ON l.id = s.lease_id WHERE s.id = p_scope_id AND l.lease_token_hash = p_lease_token_hash AND s.revoked_at IS NULL AND l.released_at IS NULL AND l.expires_at > clock_timestamp() FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE jobs.job_lease SET heartbeat_at = clock_timestamp(), expires_at = clock_timestamp() + interval '90 seconds' WHERE id = scope_row.lease_id;
  UPDATE jobs.job SET worker_heartbeat_at = clock_timestamp(), updated_at = clock_timestamp() WHERE id = scope_row.job_id;
  RETURN true;
END
$$;

CREATE OR REPLACE FUNCTION jobs.commit_reference_step(
  p_scope_id uuid,
  p_lease_token_hash text,
  p_result_key text,
  p_result_digest text,
  p_outcome text,
  p_failure_code text DEFAULT NULL
)
RETURNS TABLE(status text, job_state text, step_code text, accepted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = jobs, commerce, app, pg_catalog
AS $$
DECLARE
  scope_row jobs.job_scope%ROWTYPE;
  lease_row jobs.job_lease%ROWTYPE;
  step_row jobs.job_step%ROWTYPE;
  job_row jobs.job%ROWTYPE;
  reservation_row commerce.usage_reservation%ROWTYPE;
  next_state text;
  next_message text;
  all_done boolean;
  fence_code text;
  fence_recovery text;
BEGIN
  SELECT s.* INTO scope_row FROM jobs.job_scope s WHERE s.id = p_scope_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'scope_invalid', NULL::text, NULL::text, false; RETURN; END IF;
  SELECT l.* INTO lease_row FROM jobs.job_lease l WHERE l.id = scope_row.lease_id AND l.lease_token_hash = p_lease_token_hash FOR UPDATE;
  SELECT st.* INTO step_row FROM jobs.job_step st WHERE st.id = scope_row.step_id FOR UPDATE;
  SELECT j.* INTO job_row FROM jobs.job j WHERE j.id = scope_row.job_id FOR UPDATE;
  IF NOT FOUND OR lease_row.released_at IS NOT NULL OR lease_row.expires_at <= clock_timestamp() OR scope_row.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT 'lease_invalid', job_row.state, step_row.step_code, false; RETURN;
  END IF;
  IF (SELECT security_epoch FROM app.account WHERE id = job_row.account_id) IS DISTINCT FROM scope_row.security_epoch THEN
    fence_code := 'security_epoch_changed';
    fence_recovery := 'reauthorize_job';
  ELSIF (SELECT activity_posture FROM app.deal WHERE account_id = job_row.account_id AND id = job_row.deal_id) IS DISTINCT FROM 'active'
     OR (SELECT posture_version FROM app.deal_workspace WHERE account_id = job_row.account_id AND deal_id = job_row.deal_id) IS DISTINCT FROM scope_row.workspace_posture_version THEN
    fence_code := 'workspace_posture_changed';
    fence_recovery := 'resume_after_workspace_posture_change';
  END IF;
  IF fence_code IS NOT NULL THEN
    UPDATE jobs.job_lease SET released_at = clock_timestamp(), outcome = 'blocked' WHERE id = lease_row.id;
    UPDATE jobs.job_scope SET revoked_at = clock_timestamp() WHERE id = scope_row.id;
    UPDATE jobs.job_attempt SET completed_at = clock_timestamp(), outcome = 'blocked', failure_code = fence_code WHERE id = scope_row.attempt_id;
    UPDATE jobs.job_step SET state = 'queued', updated_at = clock_timestamp() WHERE id = step_row.id;
    UPDATE jobs.job SET state = 'blocked', problem = jsonb_build_object('code', fence_code, 'recovery_action', fence_recovery), progress = jsonb_build_object('message_code', 'blocked'), row_version = row_version + 1, updated_at = clock_timestamp() WHERE id = job_row.id;
    PERFORM jobs.append_job_event(job_row.id, 'job_problem', 'blocked', step_row.step_code, fence_code, fence_recovery, jsonb_build_object('message_code', 'blocked'));
    RETURN QUERY SELECT fence_code, 'blocked', step_row.step_code, false; RETURN;
  END IF;
  IF step_row.result_key IS NOT NULL THEN
    RETURN QUERY SELECT 'already_committed', job_row.state, step_row.step_code, true; RETURN;
  END IF;
  IF p_outcome = 'succeeded' THEN
    UPDATE jobs.job_step SET state = 'completed', result_key = p_result_key, result_digest = p_result_digest, row_version = row_version + 1, updated_at = clock_timestamp() WHERE id = step_row.id;
    UPDATE jobs.job_attempt SET completed_at = clock_timestamp(), outcome = 'succeeded', result_key = p_result_key WHERE id = scope_row.attempt_id;
    UPDATE jobs.job_lease SET released_at = clock_timestamp(), outcome = 'committed' WHERE id = lease_row.id;
    UPDATE jobs.job_scope SET revoked_at = clock_timestamp() WHERE id = scope_row.id;
    SELECT NOT EXISTS (SELECT 1 FROM jobs.job_step WHERE job_id = job_row.id AND state <> 'completed') INTO all_done;
    IF all_done THEN
      UPDATE commerce.usage_reservation AS ur SET status = 'committed', committed_at = clock_timestamp() WHERE ur.job_id = job_row.id AND ur.status = 'reserved' RETURNING ur.* INTO reservation_row;
      IF reservation_row.id IS NOT NULL THEN
        INSERT INTO commerce.usage_ledger_entry(account_id, deal_id, reservation_id, entry_type, quantity) VALUES (reservation_row.account_id, reservation_row.deal_id, reservation_row.id, 'commit', reservation_row.quantity) ON CONFLICT DO NOTHING;
      END IF;
      UPDATE jobs.job SET state = 'completed', allowance_posture = 'committed', progress = jsonb_build_object('message_code', 'completed'), result = jsonb_build_object('resource', jsonb_build_object('type', 'reference_workspace', 'id', (SELECT w.id FROM app.deal_workspace w WHERE w.account_id = job_row.account_id AND w.deal_id = job_row.deal_id))), terminal_at = clock_timestamp(), row_version = row_version + 1, updated_at = clock_timestamp() WHERE id = job_row.id;
      PERFORM jobs.append_job_event(job_row.id, 'job_terminal', 'completed', step_row.step_code, 'completed', 'open_result', jsonb_build_object('message_code', 'completed'));
      RETURN QUERY SELECT 'committed', 'completed', step_row.step_code, true; RETURN;
    END IF;
    UPDATE jobs.job SET progress = jsonb_build_object('message_code', 'checkpoint_accepted'), updated_at = clock_timestamp() WHERE id = job_row.id;
    PERFORM jobs.append_job_event(job_row.id, 'job_progressed', 'running', step_row.step_code, 'checkpoint_accepted', 'observe_job', jsonb_build_object('message_code', 'checkpoint_accepted'));
    RETURN QUERY SELECT 'committed', 'running', step_row.step_code, true; RETURN;
  END IF;
  next_state := CASE WHEN p_outcome = 'failed_terminal' THEN 'failed_terminal' ELSE 'failed_retryable' END;
  next_message := CASE WHEN next_state = 'failed_terminal' THEN 'failed_terminal' ELSE 'failed_retryable' END;
  UPDATE jobs.job_step SET state = next_state, row_version = row_version + 1, updated_at = clock_timestamp() WHERE id = step_row.id;
  UPDATE jobs.job_attempt SET completed_at = clock_timestamp(), outcome = next_state, failure_code = p_failure_code WHERE id = scope_row.attempt_id;
  UPDATE jobs.job_lease SET released_at = clock_timestamp(), outcome = next_state WHERE id = lease_row.id;
  UPDATE jobs.job_scope SET revoked_at = clock_timestamp() WHERE id = scope_row.id;
  IF next_state = 'failed_terminal' THEN
    UPDATE commerce.usage_reservation AS ur SET status = 'released', released_at = clock_timestamp() WHERE ur.job_id = job_row.id AND ur.status = 'reserved' RETURNING ur.* INTO reservation_row;
    IF reservation_row.id IS NOT NULL THEN
      INSERT INTO commerce.usage_ledger_entry(account_id, deal_id, reservation_id, entry_type, quantity) VALUES (reservation_row.account_id, reservation_row.deal_id, reservation_row.id, 'release', reservation_row.quantity) ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  UPDATE jobs.job SET state = next_state, allowance_posture = CASE WHEN next_state = 'failed_terminal' THEN 'released' ELSE allowance_posture END, progress = jsonb_build_object('message_code', next_message), problem = jsonb_build_object('code', COALESCE(p_failure_code, 'worker_failure'), 'recovery_action', CASE WHEN next_state = 'failed_terminal' THEN 'inspect_recovery_action' ELSE 'retry_job' END), terminal_at = CASE WHEN next_state = 'failed_terminal' THEN clock_timestamp() ELSE NULL END, row_version = row_version + 1, updated_at = clock_timestamp() WHERE id = job_row.id;
  PERFORM jobs.append_job_event(job_row.id, CASE WHEN next_state = 'failed_terminal' THEN 'job_terminal' ELSE 'job_problem' END, next_state, step_row.step_code, next_message, CASE WHEN next_state = 'failed_terminal' THEN 'inspect_recovery_action' ELSE 'retry_job' END, jsonb_build_object('message_code', next_message));
  RETURN QUERY SELECT 'failed', next_state, step_row.step_code, false;
END
$$;

CREATE OR REPLACE FUNCTION jobs.cancel_reference_job(p_job_id uuid, p_expected_row_version bigint, p_reason text)
RETURNS TABLE(status text, job_state text, row_version bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = jobs, commerce, app, pg_catalog
AS $$
DECLARE
  current_account uuid := app.policy_account_id();
  current_deal uuid := app.policy_deal_id();
  job_row jobs.job%ROWTYPE;
  reservation_row commerce.usage_reservation%ROWTYPE;
BEGIN
  SELECT * INTO job_row FROM jobs.job WHERE id = p_job_id AND account_id = current_account AND deal_id = current_deal FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'not_found', NULL::text, NULL::bigint; RETURN; END IF;
  IF job_row.row_version <> p_expected_row_version THEN RETURN QUERY SELECT 'version_conflict', job_row.state, job_row.row_version; RETURN; END IF;
  IF job_row.state IN ('completed', 'failed_terminal', 'canceled') THEN RETURN QUERY SELECT 'not_cancelable', job_row.state, job_row.row_version; RETURN; END IF;
  UPDATE commerce.usage_reservation AS ur SET status = 'released', released_at = clock_timestamp() WHERE ur.job_id = p_job_id AND ur.status = 'reserved' RETURNING ur.* INTO reservation_row;
  IF reservation_row.id IS NOT NULL THEN
    INSERT INTO commerce.usage_ledger_entry(account_id, deal_id, reservation_id, entry_type, quantity) VALUES (reservation_row.account_id, reservation_row.deal_id, reservation_row.id, 'release', reservation_row.quantity) ON CONFLICT DO NOTHING;
  END IF;
  UPDATE jobs.job AS j SET state = 'canceled', allowance_posture = 'released', cancel_requested_at = clock_timestamp(), terminal_at = clock_timestamp(), progress = jsonb_build_object('message_code', 'canceled'), problem = NULL, row_version = j.row_version + 1, updated_at = clock_timestamp() WHERE j.id = p_job_id RETURNING j.row_version INTO row_version;
  UPDATE jobs.job_lease SET released_at = clock_timestamp(), outcome = 'canceled' WHERE step_id IN (SELECT id FROM jobs.job_step WHERE job_id = p_job_id) AND released_at IS NULL;
  UPDATE jobs.job_scope SET revoked_at = clock_timestamp() WHERE job_id = p_job_id AND revoked_at IS NULL;
  PERFORM jobs.append_job_event(p_job_id, 'job_terminal', 'canceled', NULL, 'canceled', 'return_to_job', jsonb_build_object('message_code', 'canceled'));
  RETURN QUERY SELECT 'canceled', 'canceled', row_version;
END
$$;

CREATE OR REPLACE FUNCTION jobs.retry_reference_job(p_job_id uuid, p_expected_row_version bigint)
RETURNS TABLE(status text, job_state text, row_version bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = jobs, app, pg_catalog
AS $$
DECLARE
  current_account uuid := app.policy_account_id();
  current_deal uuid := app.policy_deal_id();
  job_row jobs.job%ROWTYPE;
BEGIN
  SELECT * INTO job_row FROM jobs.job WHERE id = p_job_id AND account_id = current_account AND deal_id = current_deal FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'not_found', NULL::text, NULL::bigint; RETURN; END IF;
  IF job_row.row_version <> p_expected_row_version THEN RETURN QUERY SELECT 'version_conflict', job_row.state, job_row.row_version; RETURN; END IF;
  IF job_row.state <> 'failed_retryable' THEN RETURN QUERY SELECT 'not_retryable', job_row.state, job_row.row_version; RETURN; END IF;
  UPDATE jobs.job_step SET state = 'queued', updated_at = clock_timestamp() WHERE job_id = p_job_id AND state = 'failed_retryable';
  UPDATE jobs.job AS j SET state = 'queued', problem = NULL, terminal_at = NULL, progress = jsonb_build_object('message_code', 'queued'), row_version = j.row_version + 1, updated_at = clock_timestamp() WHERE j.id = p_job_id RETURNING j.row_version INTO row_version;
  PERFORM jobs.append_job_event(p_job_id, 'job_state_changed', 'queued', NULL, 'retry_accepted', 'observe_job', jsonb_build_object('message_code', 'queued'));
  RETURN QUERY SELECT 'retry_accepted', 'queued', row_version;
END
$$;

CREATE OR REPLACE FUNCTION jobs.recover_expired_reference_job(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = jobs, app, pg_catalog
AS $$
DECLARE
  lease_row jobs.job_lease%ROWTYPE;
  job_row jobs.job%ROWTYPE;
  step_row jobs.job_step%ROWTYPE;
BEGIN
  SELECT * INTO lease_row FROM jobs.job_lease WHERE step_id IN (SELECT id FROM jobs.job_step WHERE job_id = p_job_id) AND released_at IS NULL AND expires_at <= clock_timestamp() ORDER BY expires_at LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO step_row FROM jobs.job_step WHERE id = lease_row.step_id FOR UPDATE;
  SELECT * INTO job_row FROM jobs.job WHERE id = step_row.job_id FOR UPDATE;
  UPDATE jobs.job_lease SET released_at = clock_timestamp(), outcome = 'expired' WHERE id = lease_row.id;
  UPDATE jobs.job_scope SET revoked_at = clock_timestamp() WHERE lease_id = lease_row.id AND revoked_at IS NULL;
  UPDATE jobs.job_attempt SET completed_at = clock_timestamp(), outcome = 'failed_retryable', failure_code = 'lease_lost' WHERE id = lease_row.attempt_id;
  UPDATE jobs.job_step SET state = 'queued', updated_at = clock_timestamp() WHERE id = step_row.id;
  UPDATE jobs.job SET state = 'failed_retryable', progress = jsonb_build_object('message_code', 'lease_lost'), problem = jsonb_build_object('code', 'lease_lost', 'recovery_action', 'retry_job'), row_version = row_version + 1, updated_at = clock_timestamp() WHERE id = job_row.id;
  PERFORM jobs.append_job_event(job_row.id, 'job_problem', 'failed_retryable', step_row.step_code, 'lease_lost', 'retry_job', jsonb_build_object('message_code', 'lease_lost'));
  UPDATE jobs.transactional_outbox SET claimed_at = NULL, published_at = NULL, attempts = attempts + 1, status = 'pending' WHERE job_id = job_row.id AND event_type = 'job.step.dispatch';
  RETURN true;
END
$$;

CREATE OR REPLACE FUNCTION jobs.dispatch_reference_outbox(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = jobs, pg_catalog
AS $$
BEGIN
  UPDATE jobs.transactional_outbox SET claimed_at = COALESCE(claimed_at, clock_timestamp()), published_at = COALESCE(published_at, clock_timestamp()), attempts = attempts + 1, status = 'published' WHERE job_id = p_job_id AND event_type = 'job.step.dispatch' AND status = 'pending';
  RETURN FOUND;
END
$$;

REVOKE ALL ON SCHEMA jobs, commerce FROM PUBLIC;
REVOKE ALL ON TABLE app.runtime_principal FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA jobs FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA commerce FROM PUBLIC;
REVOKE ALL ON FUNCTION jobs.append_job_event(uuid, text, text, text, text, text, jsonb), jobs.start_reference_job(uuid, text, text, jsonb), jobs.resolve_job_deal(uuid), jobs.claim_reference_step(uuid, text, text, text), jobs.heartbeat_reference_step(uuid, text), jobs.commit_reference_step(uuid, text, text, text, text, text), jobs.cancel_reference_job(uuid, bigint, text), jobs.retry_reference_job(uuid, bigint), jobs.recover_expired_reference_job(uuid), jobs.dispatch_reference_outbox(uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA jobs, commerce TO app_runtime, job_worker, job_dispatcher;
GRANT SELECT ON jobs.job, jobs.job_step, jobs.job_event, jobs.job_scope, jobs.job_scope_deal, jobs.job_scope_operation, jobs.transactional_outbox TO app_runtime;
GRANT EXECUTE ON FUNCTION jobs.start_reference_job(uuid, text, text, jsonb), jobs.resolve_job_deal(uuid), jobs.cancel_reference_job(uuid, bigint, text), jobs.retry_reference_job(uuid, bigint) TO app_runtime;
GRANT EXECUTE ON FUNCTION jobs.claim_reference_step(uuid, text, text, text), jobs.heartbeat_reference_step(uuid, text), jobs.commit_reference_step(uuid, text, text, text, text, text) TO job_worker;
GRANT EXECUTE ON FUNCTION jobs.recover_expired_reference_job(uuid), jobs.dispatch_reference_outbox(uuid) TO job_dispatcher;
REVOKE EXECUTE ON FUNCTION jobs.append_job_event(uuid, text, text, text, text, text, jsonb) FROM app_runtime;
REVOKE EXECUTE ON FUNCTION jobs.recover_expired_reference_job(uuid) FROM job_worker;
