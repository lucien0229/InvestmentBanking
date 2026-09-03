-- Account and Commerce: qualified checkout, canonical provider evidence, and product-owned entitlement.
-- Provider payload bytes are intentionally not stored. Only the versioned canonical
-- allowlist below is durable and is sufficient for product reconciliation/recovery.

CREATE TABLE IF NOT EXISTS app.qualification_assessment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_digest text NOT NULL UNIQUE,
  result text NOT NULL CHECK (result IN ('Likely compatible', 'Potential constraint — review before purchase', 'Not supported for this intended use')),
  basis text NOT NULL,
  unverified_conditions text[] NOT NULL DEFAULT '{}',
  preflight_recheck text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.checkout_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  product_code text NOT NULL DEFAULT 'individual-deal-desk-v1',
  capability_version text NOT NULL DEFAULT 'v1.0.0',
  billing_term text NOT NULL CHECK (billing_term IN ('monthly', 'annual')),
  add_on_code text NOT NULL DEFAULT 'none' CHECK (add_on_code IN ('none', 'additional_active_deal', 'intensive_processing', 'archive_capacity')),
  amount_minor integer NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL DEFAULT 'usd' CHECK (currency = 'usd'),
  tax_posture text NOT NULL DEFAULT 'calculated_before_payment_confirmation',
  tax_amount_minor integer NOT NULL DEFAULT 0 CHECK (tax_amount_minor >= 0),
  renewal_amount_minor integer NOT NULL CHECK (renewal_amount_minor > 0),
  included_active_deals integer NOT NULL DEFAULT 2 CHECK (included_active_deals = 2),
  allowances jsonb NOT NULL,
  unmetered_actions text[] NOT NULL,
  guarantee_version text NOT NULL DEFAULT 'first-deal-control-loop-v1',
  cancellation_version text NOT NULL DEFAULT 'cancels_next_renewal_only',
  contract_version text NOT NULL DEFAULT 'commerce-contract-v1.0.0',
  contract_digest text NOT NULL,
  current_step text NOT NULL DEFAULT 'order' CHECK (current_step IN ('order', 'terms', 'payment', 'confirmation')),
  payment_state text NOT NULL DEFAULT 'not_started' CHECK (payment_state IN ('not_started', 'failed', 'pending', 'requires_action', 'duplicate_charge', 'succeeded')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'ambiguous')),
  idempotency_key text NOT NULL,
  provider_checkout_id text UNIQUE,
  session_idempotency_key text,
  session_request_digest text,
  row_version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (account_id, idempotency_key)
);
ALTER TABLE app.checkout_order ADD COLUMN IF NOT EXISTS session_idempotency_key text;
ALTER TABLE app.checkout_order ADD COLUMN IF NOT EXISTS session_request_digest text;
CREATE UNIQUE INDEX IF NOT EXISTS checkout_order_account_session_idempotency ON app.checkout_order(account_id, session_idempotency_key) WHERE session_idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS app.checkout_terms_acceptance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_order_id uuid NOT NULL REFERENCES app.checkout_order(id),
  account_id uuid NOT NULL REFERENCES app.account(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  displayed_contract_digest text NOT NULL,
  acknowledgements jsonb NOT NULL,
  idempotency_key text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (checkout_order_id)
);
ALTER TABLE app.checkout_terms_acceptance ADD COLUMN IF NOT EXISTS idempotency_key text;
UPDATE app.checkout_terms_acceptance SET idempotency_key = 'legacy-' || id::text WHERE idempotency_key IS NULL;
ALTER TABLE app.checkout_terms_acceptance ALTER COLUMN idempotency_key SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS checkout_terms_account_idempotency_key ON app.checkout_terms_acceptance(account_id, idempotency_key);

CREATE TABLE IF NOT EXISTS app.provider_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider = 'stripe'),
  provider_event_id text NOT NULL,
  provider_api_version text NOT NULL,
  event_type text NOT NULL,
  canonical_schema_version text NOT NULL DEFAULT 'stripe-canonical-v1',
  canonical_payload jsonb NOT NULL,
  canonical_digest text NOT NULL,
  raw_payload_digest text NOT NULL,
  signature_verified boolean NOT NULL,
  state text NOT NULL DEFAULT 'received' CHECK (state IN ('received', 'ignored', 'ambiguous', 'reconciled', 'duplicate')),
  received_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  UNIQUE (provider, provider_event_id)
);
ALTER TABLE app.provider_event ADD COLUMN IF NOT EXISTS raw_payload_digest text;
UPDATE app.provider_event SET raw_payload_digest = canonical_digest WHERE raw_payload_digest IS NULL;
ALTER TABLE app.provider_event ALTER COLUMN raw_payload_digest SET NOT NULL;

CREATE TABLE IF NOT EXISTS app.provider_event_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_event_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz
);

CREATE TABLE IF NOT EXISTS app.commercial_receipt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  checkout_order_id uuid NOT NULL REFERENCES app.checkout_order(id),
  provider_event_id text NOT NULL,
  provider_payment_id text NOT NULL,
  amount_minor integer NOT NULL,
  currency text NOT NULL CHECK (currency = 'usd'),
  tax_amount_minor integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'paid' CHECK (status = 'paid'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (checkout_order_id),
  UNIQUE (provider_payment_id)
);

CREATE TABLE IF NOT EXISTS app.product_entitlement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  product_code text NOT NULL,
  capability_version text NOT NULL,
  term_start timestamptz NOT NULL,
  term_end timestamptz NOT NULL,
  active_deal_capacity integer NOT NULL CHECK (active_deal_capacity >= 0),
  capabilities jsonb NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'billing_recovery', 'post_term', 'ended')),
  source_receipt_id uuid NOT NULL REFERENCES app.commercial_receipt(id),
  row_version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_receipt_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS product_entitlement_one_active_v1 ON app.product_entitlement(account_id, product_code) WHERE status IN ('active', 'billing_recovery');

CREATE TABLE IF NOT EXISTS app.entitlement_mutation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  checkout_order_id uuid NOT NULL REFERENCES app.checkout_order(id),
  entitlement_id uuid NOT NULL REFERENCES app.product_entitlement(id),
  commercial_receipt_id uuid NOT NULL REFERENCES app.commercial_receipt(id),
  mutation_type text NOT NULL CHECK (mutation_type IN ('grant', 'adjust', 'revoke')),
  before_capacity integer NOT NULL,
  after_capacity integer NOT NULL,
  reason_code text NOT NULL,
  effective_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (commercial_receipt_id)
);

CREATE TABLE IF NOT EXISTS app.usage_ledger_entry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  checkout_order_id uuid NOT NULL REFERENCES app.checkout_order(id),
  entitlement_id uuid NOT NULL REFERENCES app.product_entitlement(id),
  allowance_class text NOT NULL DEFAULT 'active_deal_capacity',
  entry_type text NOT NULL CHECK (entry_type IN ('grant', 'reserve', 'commit', 'release', 'expire', 'adjust')),
  quantity integer NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (checkout_order_id, allowance_class, entry_type)
);

CREATE TABLE IF NOT EXISTS app.checkout_completed_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  checkout_order_id uuid NOT NULL REFERENCES app.checkout_order(id),
  commercial_receipt_id uuid NOT NULL REFERENCES app.commercial_receipt(id),
  event_digest text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (checkout_order_id)
);

CREATE TABLE IF NOT EXISTS app.product_measurement_candidate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  event_code text NOT NULL,
  definition_version text NOT NULL DEFAULT 'checkout-completed-v1',
  source_kind text NOT NULL DEFAULT 'server_domain_event',
  source_identity text NOT NULL,
  properties jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_code, source_identity)
);

ALTER TABLE app.qualification_assessment ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.checkout_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.checkout_terms_acceptance ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.provider_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.commercial_receipt ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.product_entitlement ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.entitlement_mutation ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.usage_ledger_entry ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.checkout_completed_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.qualification_assessment FORCE ROW LEVEL SECURITY;
ALTER TABLE app.checkout_order FORCE ROW LEVEL SECURITY;
ALTER TABLE app.checkout_terms_acceptance FORCE ROW LEVEL SECURITY;
ALTER TABLE app.provider_event FORCE ROW LEVEL SECURITY;
ALTER TABLE app.provider_event_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.provider_event_outbox FORCE ROW LEVEL SECURITY;
ALTER TABLE app.commercial_receipt FORCE ROW LEVEL SECURITY;
ALTER TABLE app.product_entitlement FORCE ROW LEVEL SECURITY;
ALTER TABLE app.entitlement_mutation FORCE ROW LEVEL SECURITY;
ALTER TABLE app.usage_ledger_entry FORCE ROW LEVEL SECURITY;
ALTER TABLE app.checkout_completed_event FORCE ROW LEVEL SECURITY;
ALTER TABLE app.product_measurement_candidate ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.product_measurement_candidate FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'checkout_order_scope' AND polrelid = 'app.checkout_order'::regclass) THEN
    CREATE POLICY checkout_order_scope ON app.checkout_order FOR SELECT TO app_runtime USING (account_id = app.policy_account_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'checkout_terms_scope' AND polrelid = 'app.checkout_terms_acceptance'::regclass) THEN
    CREATE POLICY checkout_terms_scope ON app.checkout_terms_acceptance FOR SELECT TO app_runtime USING (account_id = app.policy_account_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'commercial_receipt_scope' AND polrelid = 'app.commercial_receipt'::regclass) THEN
    CREATE POLICY commercial_receipt_scope ON app.commercial_receipt FOR SELECT TO app_runtime USING (account_id = app.policy_account_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'product_entitlement_scope' AND polrelid = 'app.product_entitlement'::regclass) THEN
    CREATE POLICY product_entitlement_scope ON app.product_entitlement FOR SELECT TO app_runtime USING (account_id = app.policy_account_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'entitlement_mutation_scope' AND polrelid = 'app.entitlement_mutation'::regclass) THEN
    CREATE POLICY entitlement_mutation_scope ON app.entitlement_mutation FOR SELECT TO app_runtime USING (account_id = app.policy_account_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'usage_ledger_scope' AND polrelid = 'app.usage_ledger_entry'::regclass) THEN
    CREATE POLICY usage_ledger_scope ON app.usage_ledger_entry FOR SELECT TO app_runtime USING (account_id = app.policy_account_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'checkout_completed_scope' AND polrelid = 'app.checkout_completed_event'::regclass) THEN
    CREATE POLICY checkout_completed_scope ON app.checkout_completed_event FOR SELECT TO app_runtime USING (account_id = app.policy_account_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'product_measurement_scope' AND polrelid = 'app.product_measurement_candidate'::regclass) THEN
    CREATE POLICY product_measurement_scope ON app.product_measurement_candidate FOR SELECT TO app_runtime USING (account_id = app.policy_account_id());
  END IF;
END
$$;

DROP POLICY IF EXISTS audit_scope ON app.audit_event;
CREATE POLICY audit_scope ON app.audit_event FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND (deal_id = app.policy_deal_id() OR (deal_id IS NULL AND app.policy_deal_id() IS NULL)));

CREATE OR REPLACE FUNCTION app.create_qualification_assessment(p_assessment_digest text, p_result text, p_basis text, p_unverified text[], p_recheck text[])
RETURNS TABLE(id uuid, result text, basis text, unverified_conditions text[], preflight_recheck text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog
AS $$
BEGIN
  INSERT INTO app.qualification_assessment(assessment_digest, result, basis, unverified_conditions, preflight_recheck)
  VALUES (p_assessment_digest, p_result, p_basis, p_unverified, p_recheck)
  ON CONFLICT (assessment_digest) DO NOTHING;
  RETURN QUERY SELECT q.id, q.result, q.basis, q.unverified_conditions, q.preflight_recheck FROM app.qualification_assessment q WHERE q.assessment_digest = p_assessment_digest;
END
$$;

CREATE OR REPLACE FUNCTION app.get_qualification_assessment(p_id uuid)
RETURNS TABLE(id uuid, result text, basis text, unverified_conditions text[], preflight_recheck text[])
LANGUAGE sql SECURITY DEFINER SET search_path = app, pg_catalog
AS $$
  SELECT q.id, q.result, q.basis, q.unverified_conditions, q.preflight_recheck
  FROM app.qualification_assessment q
  WHERE q.id = p_id
$$;

CREATE OR REPLACE FUNCTION app.create_checkout_order(p_account_id uuid, p_actor_id uuid, p_term text, p_add_on text, p_idempotency_key text, p_contract_digest text, p_allowances jsonb, p_unmetered text[])
RETURNS SETOF app.checkout_order
LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog
AS $$
DECLARE
  existing app.checkout_order%ROWTYPE;
  amount integer;
  renewal integer;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() THEN RAISE EXCEPTION 'checkout scope mismatch' USING ERRCODE = '42501'; END IF;
  SELECT * INTO existing FROM app.checkout_order WHERE account_id = p_account_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF existing.contract_digest IS DISTINCT FROM p_contract_digest THEN RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE = '23505'; END IF;
    RETURN NEXT existing;
    RETURN;
  END IF;
  IF p_term = 'monthly' THEN amount := 99500; ELSIF p_term = 'annual' THEN amount := 1095000; ELSE RAISE EXCEPTION 'invalid billing term' USING ERRCODE = '22023'; END IF;
  renewal := amount;
  IF p_add_on = 'additional_active_deal' THEN amount := amount + CASE WHEN p_term = 'monthly' THEN 50000 ELSE 550000 END;
  ELSIF p_add_on = 'intensive_processing' THEN amount := amount + 100000;
  ELSIF p_add_on = 'archive_capacity' THEN
    IF p_term <> 'monthly' THEN RAISE EXCEPTION 'archive capacity is monthly-only in the confirmed V1 contract' USING ERRCODE = '22023'; END IF;
    amount := amount + 5000;
  ELSIF p_add_on <> 'none' THEN RAISE EXCEPTION 'invalid add-on' USING ERRCODE = '22023'; END IF;
  INSERT INTO app.checkout_order(account_id, actor_id, billing_term, add_on_code, amount_minor, renewal_amount_minor, allowances, unmetered_actions, contract_digest, idempotency_key)
  VALUES (p_account_id, p_actor_id, p_term, COALESCE(p_add_on, 'none'), amount, renewal + CASE WHEN p_add_on IN ('additional_active_deal', 'archive_capacity') THEN amount - renewal ELSE 0 END, p_allowances, p_unmetered, p_contract_digest, p_idempotency_key)
  RETURNING * INTO existing;
  RETURN NEXT existing;
END
$$;

DROP FUNCTION IF EXISTS app.accept_checkout_terms(uuid, text, jsonb);
CREATE OR REPLACE FUNCTION app.accept_checkout_terms(p_order_id uuid, p_contract_digest text, p_ack jsonb, p_idempotency_key text)
RETURNS SETOF app.checkout_terms_acceptance
LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog
AS $$
DECLARE
  order_row app.checkout_order%ROWTYPE;
  accepted app.checkout_terms_acceptance%ROWTYPE;
BEGIN
  SELECT * INTO order_row FROM app.checkout_order WHERE id = p_order_id AND account_id = app.policy_account_id() AND actor_id = app.policy_actor_id() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'checkout order not found' USING ERRCODE = '02000'; END IF;
  IF order_row.contract_digest <> p_contract_digest THEN RAISE EXCEPTION 'checkout contract changed' USING ERRCODE = '22023'; END IF;
  SELECT * INTO accepted FROM app.checkout_terms_acceptance WHERE checkout_order_id = order_row.id;
  IF FOUND THEN
    IF accepted.displayed_contract_digest <> p_contract_digest OR accepted.acknowledgements <> p_ack THEN RAISE EXCEPTION 'checkout terms acceptance is immutable' USING ERRCODE = '40001'; END IF;
  ELSE
    INSERT INTO app.checkout_terms_acceptance(checkout_order_id, account_id, actor_id, displayed_contract_digest, acknowledgements, idempotency_key)
    VALUES (order_row.id, order_row.account_id, order_row.actor_id, p_contract_digest, p_ack, p_idempotency_key)
    RETURNING * INTO accepted;
    UPDATE app.checkout_order SET current_step = 'payment', row_version = row_version + 1 WHERE id = order_row.id;
  END IF;
  RETURN NEXT accepted;
END
$$;

DROP FUNCTION IF EXISTS app.create_checkout_session(uuid, text);
CREATE OR REPLACE FUNCTION app.create_checkout_session(p_order_id uuid, p_provider_checkout_id text, p_session_idempotency_key text, p_request_digest text)
RETURNS SETOF app.checkout_order
LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog
AS $$
DECLARE order_row app.checkout_order%ROWTYPE;
  existing_row app.checkout_order%ROWTYPE;
BEGIN
  SELECT * INTO order_row FROM app.checkout_order WHERE id = p_order_id AND account_id = app.policy_account_id() AND actor_id = app.policy_actor_id() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'checkout order not found' USING ERRCODE = '02000'; END IF;
  SELECT * INTO existing_row FROM app.checkout_order WHERE account_id = order_row.account_id AND session_idempotency_key = p_session_idempotency_key FOR UPDATE;
  IF FOUND AND existing_row.id <> order_row.id THEN
    IF existing_row.session_request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE = '23505'; END IF;
    RETURN NEXT existing_row;
    RETURN;
  END IF;
  IF order_row.session_request_digest IS NOT NULL AND order_row.session_request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE = '23505'; END IF;
  IF order_row.provider_checkout_id IS NULL THEN
    UPDATE app.checkout_order SET provider_checkout_id = p_provider_checkout_id, session_idempotency_key = p_session_idempotency_key, session_request_digest = p_request_digest, current_step = 'payment', payment_state = 'pending', row_version = row_version + 1 WHERE id = p_order_id RETURNING * INTO order_row;
  ELSIF order_row.session_idempotency_key IS NULL THEN
    UPDATE app.checkout_order SET session_idempotency_key = p_session_idempotency_key, session_request_digest = p_request_digest WHERE id = p_order_id RETURNING * INTO order_row;
  END IF;
  RETURN NEXT order_row;
END
$$;

DROP FUNCTION IF EXISTS app.persist_provider_event(text, text, text, jsonb, text);
CREATE OR REPLACE FUNCTION app.persist_provider_event(p_event_id text, p_api_version text, p_event_type text, p_canonical_payload jsonb, p_canonical_digest text, p_raw_payload_digest text)
RETURNS TABLE(state text, event_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog
AS $$
DECLARE inserted app.provider_event%ROWTYPE;
BEGIN
  INSERT INTO app.provider_event(provider, provider_event_id, provider_api_version, event_type, canonical_payload, canonical_digest, raw_payload_digest, signature_verified)
  VALUES ('stripe', p_event_id, p_api_version, p_event_type, p_canonical_payload, p_canonical_digest, p_raw_payload_digest, true)
  ON CONFLICT (provider, provider_event_id) DO UPDATE SET acknowledged_at = COALESCE(app.provider_event.acknowledged_at, clock_timestamp()), state = CASE WHEN app.provider_event.canonical_digest <> EXCLUDED.canonical_digest THEN 'ambiguous' WHEN app.provider_event.state = 'reconciled' THEN 'duplicate' ELSE app.provider_event.state END
  RETURNING app.provider_event.state, app.provider_event.id INTO state, event_id;
  INSERT INTO app.provider_event_outbox(provider_event_id) VALUES (p_event_id) ON CONFLICT (provider_event_id) DO NOTHING;
  RETURN NEXT;
END
$$;

CREATE OR REPLACE FUNCTION app.reconcile_provider_event(p_event_id text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog
AS $$
DECLARE
  event_row app.provider_event%ROWTYPE;
  order_row app.checkout_order%ROWTYPE;
  receipt_row app.commercial_receipt%ROWTYPE;
  entitlement_row app.product_entitlement%ROWTYPE;
  order_id uuid;
  provider_session text;
  provider_payment text;
  amount integer;
  currency text;
  capacity integer := 2;
  event_hash text;
  previous_audit_hash text;
BEGIN
  SELECT * INTO event_row FROM app.provider_event WHERE provider = 'stripe' AND provider_event_id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'missing'; END IF;
  IF event_row.state IN ('reconciled', 'duplicate') THEN RETURN 'duplicate'; END IF;
  IF event_row.state = 'ambiguous' THEN RETURN 'ambiguous'; END IF;
  IF event_row.event_type <> 'checkout.session.completed' THEN
    UPDATE app.provider_event SET state = 'ignored', acknowledged_at = clock_timestamp() WHERE id = event_row.id;
    RETURN 'ignored';
  END IF;
  order_id := NULLIF(event_row.canonical_payload #>> '{data,object,metadata,checkout_order_id}', '')::uuid;
  provider_session := event_row.canonical_payload #>> '{data,object,id}';
  provider_payment := COALESCE(event_row.canonical_payload #>> '{data,object,payment_intent}', provider_session);
  amount := NULLIF(event_row.canonical_payload #>> '{data,object,amount_total}', '')::integer;
  currency := event_row.canonical_payload #>> '{data,object,currency}';
  IF order_id IS NULL OR provider_session IS NULL OR amount IS NULL OR currency IS NULL OR COALESCE(event_row.canonical_payload #>> '{data,object,payment_status}', '') <> 'paid' THEN
    UPDATE app.provider_event SET state = 'ambiguous', acknowledged_at = clock_timestamp() WHERE id = event_row.id;
    RETURN 'ambiguous';
  END IF;
  SELECT * INTO order_row FROM app.checkout_order WHERE id = order_id FOR UPDATE;
  IF NOT FOUND OR order_row.provider_checkout_id IS DISTINCT FROM provider_session OR order_row.amount_minor <> amount OR order_row.currency <> currency THEN
    UPDATE app.provider_event SET state = 'ambiguous', acknowledged_at = clock_timestamp() WHERE id = event_row.id;
    RETURN 'ambiguous';
  END IF;
  SELECT * INTO receipt_row FROM app.commercial_receipt WHERE checkout_order_id = order_row.id;
  IF FOUND THEN
    UPDATE app.provider_event SET state = 'duplicate', acknowledged_at = clock_timestamp() WHERE id = event_row.id;
    RETURN 'duplicate';
  END IF;
  INSERT INTO app.commercial_receipt(account_id, actor_id, checkout_order_id, provider_event_id, provider_payment_id, amount_minor, currency, tax_amount_minor)
  VALUES (order_row.account_id, order_row.actor_id, order_row.id, event_row.provider_event_id, provider_payment, amount, currency, order_row.tax_amount_minor)
  RETURNING * INTO receipt_row;
  IF order_row.add_on_code = 'additional_active_deal' THEN capacity := 3; END IF;
  INSERT INTO app.product_entitlement(account_id, actor_id, product_code, capability_version, term_start, term_end, active_deal_capacity, capabilities, source_receipt_id)
  VALUES (order_row.account_id, order_row.actor_id, order_row.product_code, order_row.capability_version, clock_timestamp(), CASE WHEN order_row.billing_term = 'monthly' THEN clock_timestamp() + interval '1 month' ELSE clock_timestamp() + interval '1 year' END, capacity, CASE WHEN order_row.add_on_code = 'none' THEN '["complete_v1_core_capability"]'::jsonb ELSE jsonb_build_array('complete_v1_core_capability', 'add_on:' || order_row.add_on_code) END, receipt_row.id)
  RETURNING * INTO entitlement_row;
  INSERT INTO app.entitlement_mutation(account_id, actor_id, checkout_order_id, entitlement_id, commercial_receipt_id, mutation_type, before_capacity, after_capacity, reason_code)
  VALUES (order_row.account_id, order_row.actor_id, order_row.id, entitlement_row.id, receipt_row.id, 'grant', 0, capacity, 'provider_reconciled_checkout');
  INSERT INTO app.usage_ledger_entry(account_id, checkout_order_id, entitlement_id, entry_type, quantity)
  VALUES (order_row.account_id, order_row.id, entitlement_row.id, 'grant', 2);
  IF order_row.add_on_code = 'additional_active_deal' THEN
    INSERT INTO app.usage_ledger_entry(account_id, checkout_order_id, entitlement_id, allowance_class, entry_type, quantity)
    VALUES (order_row.account_id, order_row.id, entitlement_row.id, 'active_deal_capacity_add_on', 'grant', 1);
  ELSIF order_row.add_on_code = 'intensive_processing' THEN
    INSERT INTO app.usage_ledger_entry(account_id, checkout_order_id, entitlement_id, allowance_class, entry_type, quantity)
    VALUES (order_row.account_id, order_row.id, entitlement_row.id, 'logical_pages_intensive_processing', 'grant', 5000),
           (order_row.account_id, order_row.id, entitlement_row.id, 'full_workflow_operations_intensive_processing', 'grant', 20);
  ELSIF order_row.add_on_code = 'archive_capacity' THEN
    INSERT INTO app.usage_ledger_entry(account_id, checkout_order_id, entitlement_id, allowance_class, entry_type, quantity)
    VALUES (order_row.account_id, order_row.id, entitlement_row.id, 'archive_capacity_gb', 'grant', 250);
  END IF;
  event_hash := md5(concat_ws('|', event_row.canonical_digest, order_row.id::text, receipt_row.id::text));
  INSERT INTO app.checkout_completed_event(account_id, actor_id, checkout_order_id, commercial_receipt_id, event_digest)
  VALUES (order_row.account_id, order_row.actor_id, order_row.id, receipt_row.id, event_hash);
  INSERT INTO app.product_measurement_candidate(account_id, actor_id, event_code, source_identity, properties)
  VALUES (order_row.account_id, order_row.actor_id, 'checkout_completed', order_row.id::text, jsonb_build_object('billing_term', order_row.billing_term, 'amount_minor', amount, 'currency', currency, 'active_deal_capacity', capacity, 'add_on', order_row.add_on_code))
  ON CONFLICT (event_code, source_identity) DO NOTHING;
  SELECT ae.event_hash INTO previous_audit_hash FROM app.audit_event ae WHERE ae.account_id = order_row.account_id ORDER BY ae.created_at DESC, ae.id DESC LIMIT 1;
  event_hash := md5(concat_ws('|', COALESCE(previous_audit_hash, ''), event_hash, order_row.id::text, event_row.provider_event_id));
  INSERT INTO app.audit_event(account_id, actor_id, code, outcome, object_kind, object_id, reason_code, trace_id, previous_hash, event_hash)
  VALUES (order_row.account_id, order_row.actor_id, 'checkout_completed', 'completed', 'checkout_order', order_row.id::text, 'provider_reconciled', event_row.provider_event_id, previous_audit_hash, event_hash);
  UPDATE app.checkout_order SET current_step = 'confirmation', payment_state = 'succeeded', status = 'completed', completed_at = clock_timestamp(), row_version = row_version + 1 WHERE id = order_row.id;
  UPDATE app.provider_event SET state = 'reconciled', acknowledged_at = clock_timestamp() WHERE id = event_row.id;
  RETURN 'reconciled';
END
$$;

CREATE OR REPLACE FUNCTION app.dispatch_provider_event_outbox(p_event_id text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog
AS $$
DECLARE outcome text;
BEGIN
  PERFORM 1 FROM app.provider_event_outbox WHERE provider_event_id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'missing'; END IF;
  outcome := app.reconcile_provider_event(p_event_id);
  IF outcome IN ('reconciled', 'duplicate', 'ignored', 'ambiguous') THEN
    UPDATE app.provider_event_outbox SET dispatched_at = COALESCE(dispatched_at, clock_timestamp()) WHERE provider_event_id = p_event_id;
  END IF;
  RETURN outcome;
END
$$;

REVOKE ALL ON TABLE app.qualification_assessment, app.checkout_order, app.checkout_terms_acceptance, app.provider_event, app.provider_event_outbox, app.commercial_receipt, app.product_entitlement, app.entitlement_mutation, app.usage_ledger_entry, app.checkout_completed_event, app.product_measurement_candidate FROM PUBLIC;
GRANT SELECT ON app.checkout_order, app.checkout_terms_acceptance, app.commercial_receipt, app.product_entitlement, app.entitlement_mutation, app.usage_ledger_entry, app.checkout_completed_event, app.product_measurement_candidate TO app_runtime;

-- Commerce writes run through closed SECURITY DEFINER procedures. Keep their
-- owner offline and non-login, and never leave the default PUBLIC EXECUTE
-- privilege in place. The owner is intentionally BYPASSRLS because it is not
-- an online role; tenant and actor checks remain explicit in the procedures.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_commerce_owner') THEN
    CREATE ROLE app_commerce_owner NOLOGIN;
  END IF;
  ALTER ROLE app_commerce_owner NOLOGIN NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS;
END
$$;

-- PostgreSQL requires the target owner to have CREATE on the containing
-- schema while ownership is transferred. Revoke it immediately afterwards so
-- the non-login owner cannot create arbitrary application objects.
GRANT CREATE ON SCHEMA app TO app_commerce_owner;
ALTER FUNCTION app.create_qualification_assessment(text,text,text,text[],text[]) OWNER TO app_commerce_owner;
ALTER FUNCTION app.get_qualification_assessment(uuid) OWNER TO app_commerce_owner;
ALTER FUNCTION app.create_checkout_order(uuid,uuid,text,text,text,text,jsonb,text[]) OWNER TO app_commerce_owner;
ALTER FUNCTION app.accept_checkout_terms(uuid,text,jsonb,text) OWNER TO app_commerce_owner;
ALTER FUNCTION app.create_checkout_session(uuid,text,text,text) OWNER TO app_commerce_owner;
ALTER FUNCTION app.persist_provider_event(text,text,text,jsonb,text,text) OWNER TO app_commerce_owner;
ALTER FUNCTION app.reconcile_provider_event(text) OWNER TO app_commerce_owner;
ALTER FUNCTION app.dispatch_provider_event_outbox(text) OWNER TO app_commerce_owner;

GRANT USAGE ON SCHEMA app TO app_commerce_owner;
GRANT SELECT ON app.account, app.actor TO app_commerce_owner;
GRANT SELECT, INSERT, UPDATE ON app.qualification_assessment, app.checkout_order, app.checkout_terms_acceptance, app.provider_event, app.provider_event_outbox, app.commercial_receipt, app.product_entitlement, app.entitlement_mutation, app.usage_ledger_entry, app.checkout_completed_event, app.product_measurement_candidate, app.audit_event TO app_commerce_owner;
GRANT EXECUTE ON FUNCTION app.policy_account_id(), app.policy_actor_id(), app.record_audit(text,text,text,text,text,text) TO app_commerce_owner;

REVOKE ALL ON FUNCTION app.create_qualification_assessment(text,text,text,text[],text[]), app.get_qualification_assessment(uuid), app.create_checkout_order(uuid,uuid,text,text,text,text,jsonb,text[]), app.accept_checkout_terms(uuid,text,jsonb,text), app.create_checkout_session(uuid,text,text,text), app.persist_provider_event(text,text,text,jsonb,text,text), app.reconcile_provider_event(text), app.dispatch_provider_event_outbox(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.create_qualification_assessment(text,text,text,text[],text[]), app.get_qualification_assessment(uuid), app.create_checkout_order(uuid,uuid,text,text,text,text,jsonb,text[]), app.accept_checkout_terms(uuid,text,jsonb,text), app.create_checkout_session(uuid,text,text,text), app.persist_provider_event(text,text,text,jsonb,text,text), app.reconcile_provider_event(text), app.dispatch_provider_event_outbox(text) TO app_runtime;
REVOKE CREATE ON SCHEMA app FROM app_commerce_owner;
