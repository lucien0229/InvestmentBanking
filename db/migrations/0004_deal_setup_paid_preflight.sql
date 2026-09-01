-- Ticket 05: identity-complete paid Deal Setup, Active Deal capacity, and
-- privacy-safe Paid Preflight. All writes below are closed SECURITY DEFINER
-- procedures; the online app_runtime role receives no direct write privilege.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_commerce_owner') THEN
    CREATE ROLE app_commerce_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
  ELSE
    ALTER ROLE app_commerce_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
  END IF;
END
$$;

-- Supabase's hosted `postgres` migration identity is not a superuser. Grant it
-- membership in the NOLOGIN function owner so it can transfer ownership below.
GRANT app_commerce_owner TO postgres;

ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS deal_class text NOT NULL DEFAULT 'synthetic_reference';
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS represented_party text;
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS transaction_perimeter_inclusions text[] NOT NULL DEFAULT '{}';
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS transaction_perimeter_exclusions text[] NOT NULL DEFAULT '{}';
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS banker_role_or_side text;
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS transaction_type text;
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS intended_purpose text;
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS intended_audience text;
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS base_currency text;
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS reporting_units text;
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS purchase_authority_acknowledgement_id uuid REFERENCES app.checkout_terms_acceptance(id);
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS deal_authority_basis text;
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS expected_source_use_authority text;
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS confidentiality_class text;
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS restriction_posture text;
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS restriction_details text;
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS intended_processing_path text;
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS expected_file_families text[] NOT NULL DEFAULT '{}';
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS expected_template_posture text;
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS provider_restrictions text[] NOT NULL DEFAULT '{}';
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS special_structures text[] NOT NULL DEFAULT '{}';
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS stage_basis_reference text;
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS identity_confirmed_by uuid REFERENCES app.actor(id);
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS identity_accepted_at timestamptz;
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS identity_digest text;
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS predecessor_deal_id uuid;
ALTER TABLE app.deal ADD COLUMN IF NOT EXISTS row_version bigint NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_account_id_unique') THEN
    ALTER TABLE app.deal ADD CONSTRAINT deal_account_id_unique UNIQUE (account_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_predecessor_tenant_fk') THEN
    ALTER TABLE app.deal ADD CONSTRAINT deal_predecessor_tenant_fk FOREIGN KEY (account_id, predecessor_deal_id) REFERENCES app.deal(account_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_entitlement_account_id_unique') THEN
    ALTER TABLE app.product_entitlement ADD CONSTRAINT product_entitlement_account_id_unique UNIQUE (account_id, id);
  END IF;
END
$$;

ALTER TABLE app.deal_workspace ADD COLUMN IF NOT EXISTS paid_preflight_status text NOT NULL DEFAULT 'pending';
ALTER TABLE app.deal_workspace ADD COLUMN IF NOT EXISTS processing_posture text NOT NULL DEFAULT 'preflight_restricted';
ALTER TABLE app.deal_workspace ADD COLUMN IF NOT EXISTS output_ceiling text;
ALTER TABLE app.deal_workspace ADD COLUMN IF NOT EXISTS guide_mode text NOT NULL DEFAULT 'first_deal_guide';
ALTER TABLE app.deal_workspace ADD COLUMN IF NOT EXISTS commercial_posture text NOT NULL DEFAULT 'entitled';
ALTER TABLE app.deal_workspace ADD COLUMN IF NOT EXISTS current_setup_draft_id uuid;
ALTER TABLE app.deal_workspace ADD COLUMN IF NOT EXISTS row_version bigint NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_class_check') THEN
    ALTER TABLE app.deal ADD CONSTRAINT deal_class_check CHECK (deal_class IN ('synthetic_reference', 'paid_customer'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'paid_preflight_status_check') THEN
    ALTER TABLE app.deal_workspace ADD CONSTRAINT paid_preflight_status_check CHECK (paid_preflight_status IN ('pending', 'pass', 'limited-proceed', 'blocked', 'waiting-for-user'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'processing_posture_check') THEN
    ALTER TABLE app.deal_workspace ADD CONSTRAINT processing_posture_check CHECK (processing_posture IN ('preflight_restricted', 'limited', 'permitted'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commercial_posture_check') THEN
    ALTER TABLE app.deal_workspace ADD CONSTRAINT commercial_posture_check CHECK (commercial_posture IN ('entitled', 'post_term_read_only', 'locked'));
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS app.active_deal_capacity_reservation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL UNIQUE REFERENCES app.deal(id),
  entitlement_id uuid NOT NULL REFERENCES app.product_entitlement(id),
  slot_ordinal integer NOT NULL CHECK (slot_ordinal > 0),
  state_code text NOT NULL CHECK (state_code IN ('reserved_preflight', 'active', 'released')),
  reserved_by uuid NOT NULL REFERENCES app.actor(id),
  reserved_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  released_at timestamptz,
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, entitlement_id) REFERENCES app.product_entitlement(account_id, id),
  CHECK ((state_code = 'active' AND activated_at IS NOT NULL AND released_at IS NULL) OR (state_code = 'reserved_preflight' AND activated_at IS NULL AND released_at IS NULL) OR (state_code = 'released' AND released_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS active_deal_capacity_current_idx ON app.active_deal_capacity_reservation(account_id, slot_ordinal) WHERE state_code <> 'released';
CREATE UNIQUE INDEX IF NOT EXISTS active_deal_capacity_slot_current_uq ON app.active_deal_capacity_reservation(account_id, slot_ordinal) WHERE state_code <> 'released';

CREATE TABLE IF NOT EXISTS app.deal_setup_draft (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  version integer NOT NULL CHECK (version > 0),
  supersedes_id uuid REFERENCES app.deal_setup_draft(id),
  source_reference text,
  source_reference_posture text NOT NULL CHECK (source_reference_posture IN ('missing', 'provided', 'removed')),
  source_rights text NOT NULL CHECK (source_rights IN ('missing', 'confirmed', 'limited', 'blocked')),
  intended_use text NOT NULL CHECK (intended_use IN ('internal_deal_execution', 'internal_analysis', 'controlled_export', 'external_distribution')),
  intended_audience text NOT NULL CHECK (length(btrim(intended_audience)) > 0),
  confidentiality_class text NOT NULL CHECK (confidentiality_class IN ('public', 'internal', 'confidential', 'restricted')),
  processing_path text NOT NULL CHECK (processing_path IN ('local_deterministic_only', 'local_deterministic_and_approved_ai')),
  provider_restrictions text[] NOT NULL DEFAULT '{}',
  minimum_packet text NOT NULL CHECK (minimum_packet IN ('missing', 'incomplete', 'complete')),
  compatibility text NOT NULL CHECK (compatibility IN ('pass', 'review_required', 'blocked')),
  saved_by uuid NOT NULL REFERENCES app.actor(id),
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, version),
  UNIQUE (account_id, deal_id, id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id)
);

CREATE TABLE IF NOT EXISTS app.paid_preflight (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  setup_draft_id uuid NOT NULL REFERENCES app.deal_setup_draft(id),
  version integer NOT NULL CHECK (version > 0),
  result text NOT NULL CHECK (result IN ('pass', 'limited-proceed', 'blocked', 'waiting-for-user')),
  reason_code text NOT NULL,
  recovery_action text NOT NULL,
  permitted_scope text[] NOT NULL DEFAULT '{}',
  excluded_scope text[] NOT NULL DEFAULT '{}',
  output_ceiling text,
  evaluated_controls jsonb NOT NULL DEFAULT '[]'::jsonb,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  supersedes_id uuid REFERENCES app.paid_preflight(id),
  UNIQUE (deal_id, version),
  UNIQUE (account_id, deal_id, id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id)
);

CREATE TABLE IF NOT EXISTS app.preflight_control_result (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  preflight_id uuid NOT NULL REFERENCES app.paid_preflight(id) ON DELETE CASCADE,
  control_dimension text NOT NULL CHECK (control_dimension IN ('purchase_authority', 'deal_identity', 'intended_use', 'source_rights', 'confidentiality', 'processing_path', 'compatibility', 'minimum_packet')),
  outcome_code text NOT NULL CHECK (outcome_code IN ('pass', 'limited', 'blocked', 'waiting')),
  reason_code text NOT NULL,
  recovery_action text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (preflight_id, control_dimension),
  FOREIGN KEY (account_id, deal_id, preflight_id) REFERENCES app.paid_preflight(account_id, deal_id, id)
);

CREATE TABLE IF NOT EXISTS app.first_deal_guide_checkpoint (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL UNIQUE REFERENCES app.deal(id),
  checkpoint_code text NOT NULL DEFAULT 'deal_and_preflight' CHECK (checkpoint_code = 'deal_and_preflight'),
  status_code text NOT NULL CHECK (status_code IN ('waiting', 'completed', 'blocked', 'recovered')),
  current_action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, deal_id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id)
);

CREATE TABLE IF NOT EXISTS app.deal_command_idempotency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  command_type text NOT NULL CHECK (command_type IN ('create_paid_deal', 'save_deal_setup', 'create_paid_preflight', 'accept_limited_preflight', 'create_identity_change')),
  key_hash text NOT NULL,
  request_digest text NOT NULL,
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, actor_id, command_type, key_hash),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS paid_deal_identity_digest_uq ON app.deal(account_id, identity_digest) WHERE deal_class = 'paid_customer' AND identity_digest IS NOT NULL;

CREATE OR REPLACE FUNCTION app.prevent_paid_deal_identity_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
BEGIN
  IF OLD.deal_class = 'paid_customer' AND (
    NEW.represented_party IS DISTINCT FROM OLD.represented_party OR
    NEW.transaction_subject IS DISTINCT FROM OLD.transaction_subject OR
    NEW.transaction_perimeter_inclusions IS DISTINCT FROM OLD.transaction_perimeter_inclusions OR
    NEW.transaction_perimeter_exclusions IS DISTINCT FROM OLD.transaction_perimeter_exclusions OR
    NEW.banker_role_or_side IS DISTINCT FROM OLD.banker_role_or_side OR
    NEW.mandate_objective IS DISTINCT FROM OLD.mandate_objective OR
    NEW.identity_digest IS DISTINCT FROM OLD.identity_digest OR
    NEW.predecessor_deal_id IS DISTINCT FROM OLD.predecessor_deal_id
  ) THEN
    RAISE EXCEPTION 'paid_deal_identity_immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;
DROP TRIGGER IF EXISTS paid_deal_identity_immutable ON app.deal;
CREATE TRIGGER paid_deal_identity_immutable BEFORE UPDATE ON app.deal FOR EACH ROW EXECUTE FUNCTION app.prevent_paid_deal_identity_mutation();

ALTER TABLE app.active_deal_capacity_reservation ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.active_deal_capacity_reservation FORCE ROW LEVEL SECURITY;
ALTER TABLE app.deal_setup_draft ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.deal_setup_draft FORCE ROW LEVEL SECURITY;
ALTER TABLE app.paid_preflight ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.paid_preflight FORCE ROW LEVEL SECURITY;
ALTER TABLE app.preflight_control_result ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.preflight_control_result FORCE ROW LEVEL SECURITY;
ALTER TABLE app.first_deal_guide_checkpoint ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.first_deal_guide_checkpoint FORCE ROW LEVEL SECURITY;
ALTER TABLE app.deal_command_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.deal_command_idempotency FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ticket05_setup_scope ON app.deal_setup_draft;
CREATE POLICY ticket05_setup_scope ON app.deal_setup_draft FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
DROP POLICY IF EXISTS ticket05_preflight_scope ON app.paid_preflight;
CREATE POLICY ticket05_preflight_scope ON app.paid_preflight FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
DROP POLICY IF EXISTS ticket05_control_scope ON app.preflight_control_result;
CREATE POLICY ticket05_control_scope ON app.preflight_control_result FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
DROP POLICY IF EXISTS ticket05_guide_scope ON app.first_deal_guide_checkpoint;
CREATE POLICY ticket05_guide_scope ON app.first_deal_guide_checkpoint FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
DROP POLICY IF EXISTS ticket05_capacity_scope ON app.active_deal_capacity_reservation;
CREATE POLICY ticket05_capacity_scope ON app.active_deal_capacity_reservation FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());

GRANT SELECT ON app.active_deal_capacity_reservation, app.deal_setup_draft, app.paid_preflight, app.preflight_control_result, app.first_deal_guide_checkpoint TO app_runtime;
GRANT SELECT, INSERT, UPDATE ON app.deal, app.deal_workspace, app.active_deal_capacity_reservation, app.deal_setup_draft, app.paid_preflight, app.preflight_control_result, app.first_deal_guide_checkpoint, app.deal_command_idempotency TO app_commerce_owner;
GRANT USAGE ON SCHEMA extensions TO app_commerce_owner;
GRANT EXECUTE ON FUNCTION extensions.digest(text, text) TO app_commerce_owner;

CREATE OR REPLACE FUNCTION app.append_deal_audit(p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_code text, p_object_id text, p_reason_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
DECLARE previous_hash text; new_id uuid := gen_random_uuid(); new_hash text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_account_id::text || ':ticket05-audit'));
  SELECT event_hash INTO previous_hash FROM app.audit_event WHERE account_id = p_account_id ORDER BY created_at DESC, id DESC LIMIT 1;
  new_hash := md5(concat_ws('|', coalesce(previous_hash, ''), new_id::text, p_code, coalesce(p_object_id, ''), p_reason_code));
  INSERT INTO app.audit_event(id, account_id, deal_id, actor_id, code, outcome, object_kind, object_id, reason_code, trace_id, previous_hash, event_hash)
  VALUES (new_id, p_account_id, p_deal_id, p_actor_id, p_code, 'completed', 'deal_setup', p_object_id, p_reason_code, new_id::text, previous_hash, new_hash);
  RETURN new_id;
END
$$;

CREATE OR REPLACE FUNCTION app.create_paid_deal(p_account_id uuid, p_actor_id uuid, p_key_hash text, p_request_digest text, p_input jsonb)
RETURNS TABLE(deal_id uuid, idempotent_replayed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
DECLARE existing app.deal_command_idempotency%ROWTYPE; entitlement app.product_entitlement%ROWTYPE; terms_id uuid; used_slots integer; capacity integer; slot integer;
  new_deal app.deal%ROWTYPE; draft_id uuid; v_identity_digest text; predecessor_id uuid; stage_value text; source_ref text; source_rights_value text; min_packet text;
  intended_use_value text; audience_value text; provider_restrictions_value text[]; special_structures_value text[]; perimeter_inclusions text[]; perimeter_exclusions text[];
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() THEN RAISE EXCEPTION 'deal scope mismatch' USING ERRCODE = '42501'; END IF;
  SELECT * INTO existing FROM app.deal_command_idempotency WHERE account_id = p_account_id AND actor_id = p_actor_id AND command_type = 'create_paid_deal' AND key_hash = p_key_hash;
  IF FOUND THEN
    IF existing.request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE = '23505'; END IF;
    RETURN QUERY SELECT existing.deal_id, true; RETURN;
  END IF;
  IF coalesce(p_input->>'identity_confirmed','false') <> 'true'
     OR nullif(btrim(coalesce(p_input->>'display_name','')), '') IS NULL
     OR nullif(btrim(coalesce(p_input->>'represented_party','')), '') IS NULL
     OR nullif(btrim(coalesce(p_input->>'transaction_subject','')), '') IS NULL
     OR jsonb_typeof(p_input->'transaction_perimeter'->'inclusions') <> 'array'
     OR jsonb_array_length(p_input->'transaction_perimeter'->'inclusions') = 0
     OR jsonb_typeof(p_input->'transaction_perimeter'->'exclusions') <> 'array'
     OR coalesce(p_input->>'banker_role_or_side','') <> 'sell_side_advisor'
     OR coalesce(p_input->>'transaction_type','') <> 'sell_side_auction'
     OR coalesce(p_input->>'mandate_objective','') = ''
     OR coalesce(p_input->>'intended_purpose','') = ''
     OR coalesce(p_input->>'intended_audience','') = ''
     OR coalesce(p_input->>'base_currency','') !~ '^[A-Z]{3}$'
     OR coalesce(p_input->>'reporting_units','') NOT IN ('ones','thousands','millions')
     OR coalesce(p_input->>'deal_authority_basis','') <> 'engaged_by_represented_party'
     OR coalesce(p_input->>'expected_source_use_authority','') NOT IN ('provided_under_mandate','limited_pending_confirmation','not_confirmed')
     OR coalesce(p_input->>'confidentiality_class','') NOT IN ('public','internal','confidential','restricted')
     OR coalesce(p_input->'employer_or_client_restrictions'->>'posture','') NOT IN ('none_known','declared')
     OR (p_input->'employer_or_client_restrictions'->>'posture' = 'declared' AND nullif(btrim(p_input->'employer_or_client_restrictions'->>'details'),'') IS NULL)
     OR (p_input->'employer_or_client_restrictions'->>'posture' = 'none_known' AND p_input->'employer_or_client_restrictions' ? 'details' AND p_input->'employer_or_client_restrictions'->>'details' IS NOT NULL)
     OR coalesce(p_input->>'intended_processing_path','') NOT IN ('local_deterministic_only','local_deterministic_and_approved_ai')
     OR jsonb_typeof(p_input->'expected_file_families') <> 'array' OR jsonb_array_length(p_input->'expected_file_families') = 0
     OR coalesce(p_input->>'expected_template_posture','') NOT IN ('product_default','banker_supplied_pending_preflight')
     OR jsonb_typeof(p_input->'provider_restrictions') <> 'array'
     OR jsonb_typeof(p_input->'special_structures') <> 'array'
     OR nullif(btrim(coalesce(p_input->>'purchase_authority_acknowledgement_id','')), '') IS NULL
  THEN RAISE EXCEPTION 'invalid_deal_create' USING ERRCODE = '22023'; END IF;

  SELECT pe.* INTO entitlement
  FROM app.product_entitlement pe
  JOIN app.commercial_receipt cr ON cr.id = pe.source_receipt_id AND cr.account_id = p_account_id AND cr.actor_id = p_actor_id
  JOIN app.checkout_order co ON co.id = cr.checkout_order_id AND co.account_id = p_account_id AND co.actor_id = p_actor_id AND co.status = 'completed' AND co.payment_state IN ('succeeded','duplicate_charge')
  WHERE pe.account_id = p_account_id AND pe.actor_id = p_actor_id AND pe.status IN ('active','billing_recovery') AND pe.term_end > clock_timestamp() AND pe.capabilities @> '["complete_v1_core_capability"]'::jsonb
  ORDER BY pe.term_end DESC LIMIT 1;
  IF entitlement.id IS NULL THEN RAISE EXCEPTION 'deal_create_precondition_failed' USING ERRCODE = '42501'; END IF;
  terms_id := nullif(p_input->>'purchase_authority_acknowledgement_id','')::uuid;
  IF NOT EXISTS (SELECT 1 FROM app.checkout_terms_acceptance ta JOIN app.checkout_order co ON co.id = ta.checkout_order_id WHERE ta.id = terms_id AND ta.account_id = p_account_id AND ta.actor_id = p_actor_id AND co.status = 'completed' AND co.payment_state IN ('succeeded','duplicate_charge')) THEN
    RAISE EXCEPTION 'deal_create_precondition_failed' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_account_id::text || ':ticket05-active-deals'));
  SELECT count(*)::integer INTO used_slots FROM app.active_deal_capacity_reservation WHERE account_id = p_account_id AND state_code <> 'released';
  capacity := greatest(entitlement.active_deal_capacity, 0);
  IF used_slots >= capacity THEN RAISE EXCEPTION 'active_deal_capacity_exhausted' USING ERRCODE = '23514'; END IF;
  SELECT candidate INTO slot FROM generate_series(1, capacity) candidate WHERE NOT EXISTS (SELECT 1 FROM app.active_deal_capacity_reservation r WHERE r.account_id = p_account_id AND r.slot_ordinal = candidate AND r.state_code <> 'released') ORDER BY candidate LIMIT 1;
  IF slot IS NULL THEN RAISE EXCEPTION 'active_deal_capacity_exhausted' USING ERRCODE = '23514'; END IF;

  SELECT array_agg(DISTINCT btrim(value) ORDER BY btrim(value)) INTO perimeter_inclusions FROM jsonb_array_elements_text(p_input->'transaction_perimeter'->'inclusions') value WHERE btrim(value) <> '';
  SELECT coalesce(array_agg(DISTINCT btrim(value) ORDER BY btrim(value)), '{}'::text[]) INTO perimeter_exclusions FROM jsonb_array_elements_text(p_input->'transaction_perimeter'->'exclusions') value WHERE btrim(value) <> '';
  IF coalesce(cardinality(perimeter_inclusions), 0) = 0 THEN RAISE EXCEPTION 'invalid_deal_create' USING ERRCODE = '22023'; END IF;
  v_identity_digest := encode(extensions.digest(jsonb_build_object('represented_party',btrim(p_input->>'represented_party'),'transaction_subject',btrim(p_input->>'transaction_subject'),'transaction_perimeter',jsonb_build_object('inclusions',perimeter_inclusions,'exclusions',perimeter_exclusions),'banker_role_or_side',p_input->>'banker_role_or_side','mandate_objective',btrim(p_input->>'mandate_objective'))::text, 'sha256'), 'hex');
  IF EXISTS (SELECT 1 FROM app.deal d WHERE d.account_id = p_account_id AND d.deal_class = 'paid_customer' AND d.identity_digest = v_identity_digest) THEN RAISE EXCEPTION 'deal_identity_unchanged' USING ERRCODE = '23514'; END IF;
  predecessor_id := nullif(p_input->>'predecessor_deal_id','')::uuid;
  IF predecessor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM app.deal predecessor WHERE predecessor.id = predecessor_id AND predecessor.account_id = p_account_id AND predecessor.deal_class = 'paid_customer') THEN
    RAISE EXCEPTION 'invalid_predecessor_deal' USING ERRCODE = '22023';
  END IF;
  stage_value := initcap(replace(coalesce(p_input->>'business_stage','preparation'), '_', ' '));
  source_ref := nullif(btrim(p_input->>'source_reference'), '');
  IF source_ref IS NOT NULL AND source_ref !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$' THEN RAISE EXCEPTION 'invalid_deal_create' USING ERRCODE = '22023'; END IF;
  source_rights_value := coalesce(nullif(p_input->>'source_rights',''), CASE WHEN source_ref IS NULL THEN 'missing' WHEN source_ref LIKE 'restricted:%' OR source_ref LIKE 'blocked:%' THEN 'blocked' ELSE 'confirmed' END);
  intended_use_value := coalesce(nullif(p_input->>'intended_use',''), p_input->>'intended_purpose');
  IF intended_use_value NOT IN ('internal_deal_execution','internal_analysis','controlled_export','external_distribution') THEN intended_use_value := 'internal_deal_execution'; END IF;
  min_packet := coalesce(nullif(p_input->>'minimum_packet',''), CASE WHEN source_ref IS NULL THEN 'missing' ELSE 'complete' END);
  provider_restrictions_value := ARRAY(SELECT jsonb_array_elements_text(p_input->'provider_restrictions'));
  special_structures_value := ARRAY(SELECT jsonb_array_elements_text(p_input->'special_structures'));
  INSERT INTO app.deal(account_id,name,client_label,transaction_subject,mandate_objective,business_stage,deal_class,represented_party,transaction_perimeter_inclusions,transaction_perimeter_exclusions,banker_role_or_side,transaction_type,intended_purpose,intended_audience,base_currency,reporting_units,purchase_authority_acknowledgement_id,deal_authority_basis,expected_source_use_authority,confidentiality_class,restriction_posture,restriction_details,intended_processing_path,expected_file_families,expected_template_posture,provider_restrictions,special_structures,stage_basis_reference,identity_confirmed_by,identity_accepted_at,identity_digest,predecessor_deal_id)
  VALUES (p_account_id,btrim(p_input->>'display_name'),btrim(p_input->>'represented_party'),btrim(p_input->>'transaction_subject'),btrim(p_input->>'mandate_objective'),stage_value,'paid_customer',btrim(p_input->>'represented_party'),perimeter_inclusions,perimeter_exclusions,p_input->>'banker_role_or_side',p_input->>'transaction_type',btrim(p_input->>'intended_purpose'),btrim(p_input->>'intended_audience'),p_input->>'base_currency',p_input->>'reporting_units',terms_id,p_input->>'deal_authority_basis',p_input->>'expected_source_use_authority',p_input->>'confidentiality_class',p_input->'employer_or_client_restrictions'->>'posture',nullif(p_input->'employer_or_client_restrictions'->>'details',''),p_input->>'intended_processing_path',ARRAY(SELECT jsonb_array_elements_text(p_input->'expected_file_families')),p_input->>'expected_template_posture',provider_restrictions_value,special_structures_value,p_input->>'stage_basis_reference',p_actor_id,clock_timestamp(),v_identity_digest,predecessor_id) RETURNING * INTO new_deal;
  INSERT INTO app.active_deal_capacity_reservation(account_id,deal_id,entitlement_id,slot_ordinal,state_code,reserved_by) VALUES (p_account_id,new_deal.id,entitlement.id,slot,'reserved_preflight',p_actor_id);
  INSERT INTO app.deal_setup_draft(account_id,deal_id,version,source_reference,source_reference_posture,source_rights,intended_use,intended_audience,confidentiality_class,processing_path,provider_restrictions,minimum_packet,compatibility,saved_by) VALUES (p_account_id,new_deal.id,1,source_ref,CASE WHEN source_ref IS NULL THEN 'missing' ELSE 'provided' END,source_rights_value,intended_use_value,btrim(p_input->>'intended_audience'),p_input->>'confidentiality_class',p_input->>'intended_processing_path',provider_restrictions_value,min_packet,coalesce(nullif(p_input->>'compatibility',''),'pass'),p_actor_id) RETURNING id INTO draft_id;
  INSERT INTO app.deal_workspace(account_id,deal_id,overview_revision_id,displayed_state) VALUES (p_account_id,new_deal.id,'ticket05-deal-setup-v1','{}'::jsonb) ON CONFLICT ON CONSTRAINT deal_workspace_deal_id_key DO NOTHING;
  UPDATE app.deal_workspace AS dw SET processing_posture='preflight_restricted',paid_preflight_status='pending',guide_mode='first_deal_guide',commercial_posture='entitled',current_setup_draft_id=draft_id,row_version=dw.row_version+1,displayed_state=jsonb_build_object('stage',stage_value,'materiality','paid_customer','source_posture','preflight_restricted','next_controlled_action','Complete Paid Preflight') WHERE dw.account_id=p_account_id AND dw.deal_id=new_deal.id;
  INSERT INTO app.first_deal_guide_checkpoint(account_id,deal_id,status_code,current_action) VALUES (p_account_id,new_deal.id,'waiting','Complete Paid Preflight');
  INSERT INTO app.deal_command_idempotency(account_id,actor_id,command_type,key_hash,request_digest,deal_id) VALUES (p_account_id,p_actor_id,'create_paid_deal',p_key_hash,p_request_digest,new_deal.id);
  PERFORM app.append_deal_audit(p_account_id,p_actor_id,new_deal.id,'deal_created',new_deal.id::text,'identity_complete_capacity_reserved');
  RETURN QUERY SELECT new_deal.id, false;
END
$$;

CREATE OR REPLACE FUNCTION app.save_deal_setup(p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_input jsonb, p_expected_version integer DEFAULT NULL)
RETURNS TABLE(draft_id uuid, version integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
DECLARE old_draft app.deal_setup_draft%ROWTYPE; deal_row app.deal%ROWTYPE; new_version integer; new_source text; new_source_rights text; new_use text; new_audience text; new_confidentiality text; new_path text; new_min_packet text; new_compatibility text; new_provider text[]; new_id uuid;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() THEN RAISE EXCEPTION 'deal scope mismatch' USING ERRCODE = '42501'; END IF;
  SELECT * INTO deal_row FROM app.deal WHERE id=p_deal_id AND account_id=p_account_id AND deal_class='paid_customer' FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO old_draft FROM app.deal_setup_draft WHERE deal_id=p_deal_id ORDER BY version DESC LIMIT 1 FOR UPDATE;
  IF old_draft.id IS NULL THEN RETURN; END IF;
  IF p_expected_version IS NOT NULL AND old_draft.version <> p_expected_version THEN RAISE EXCEPTION 'setup_version_conflict' USING ERRCODE = '40001'; END IF;
  IF p_input ? 'represented_party' OR p_input ? 'transaction_subject' OR p_input ? 'transaction_perimeter' OR p_input ? 'banker_role_or_side' OR p_input ? 'mandate_objective' THEN RAISE EXCEPTION 'identity_change_requires_new_deal' USING ERRCODE = '23514'; END IF;
  new_source := CASE WHEN p_input ? 'source_reference' THEN nullif(btrim(p_input->>'source_reference'),'') ELSE old_draft.source_reference END;
  IF new_source IS NOT NULL AND new_source !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$' THEN RAISE EXCEPTION 'invalid_setup_source_reference' USING ERRCODE = '22023'; END IF;
  new_source_rights := coalesce(nullif(p_input->>'source_rights',''), CASE WHEN new_source IS NULL THEN 'missing' WHEN new_source LIKE 'restricted:%' OR new_source LIKE 'blocked:%' THEN 'blocked' ELSE old_draft.source_rights END);
  new_use := coalesce(nullif(p_input->>'intended_use',''),old_draft.intended_use);
  new_audience := coalesce(nullif(btrim(p_input->>'intended_audience'),''),old_draft.intended_audience);
  new_confidentiality := coalesce(nullif(p_input->>'confidentiality_class',''),old_draft.confidentiality_class);
  new_path := coalesce(nullif(p_input->>'processing_path',''),old_draft.processing_path);
  new_min_packet := coalesce(nullif(p_input->>'minimum_packet',''), CASE WHEN new_source IS NULL THEN 'missing' ELSE old_draft.minimum_packet END);
  new_compatibility := coalesce(nullif(p_input->>'compatibility',''),old_draft.compatibility);
  new_provider := CASE WHEN p_input ? 'provider_restrictions' THEN ARRAY(SELECT jsonb_array_elements_text(p_input->'provider_restrictions')) ELSE old_draft.provider_restrictions END;
  new_version := old_draft.version + 1;
  INSERT INTO app.deal_setup_draft(account_id,deal_id,version,supersedes_id,source_reference,source_reference_posture,source_rights,intended_use,intended_audience,confidentiality_class,processing_path,provider_restrictions,minimum_packet,compatibility,saved_by) VALUES (p_account_id,p_deal_id,new_version,old_draft.id,new_source,CASE WHEN new_source IS NULL THEN CASE WHEN p_input ? 'source_reference' THEN 'removed' ELSE 'missing' END ELSE 'provided' END,new_source_rights,new_use,new_audience,new_confidentiality,new_path,new_provider,new_min_packet,new_compatibility,p_actor_id) RETURNING id INTO new_id;
  UPDATE app.deal_workspace SET current_setup_draft_id=new_id,paid_preflight_status='pending',processing_posture='preflight_restricted',output_ceiling=NULL,row_version=row_version+1,displayed_state=jsonb_set(displayed_state,'{next_controlled_action}','"Run Paid Preflight"'::jsonb,true) WHERE deal_id=p_deal_id AND account_id=p_account_id;
  PERFORM app.append_deal_audit(p_account_id,p_actor_id,p_deal_id,'deal_setup_saved',new_id::text,'setup_progress_saved');
  RETURN QUERY SELECT new_id,new_version;
END
$$;

CREATE OR REPLACE FUNCTION app.create_paid_preflight(p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_key_hash text, p_request_digest text)
RETURNS TABLE(preflight_id uuid, result text, reason_code text, recovery_action text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
DECLARE prior_cmd app.deal_command_idempotency%ROWTYPE; deal_row app.deal%ROWTYPE; draft app.deal_setup_draft%ROWTYPE; prior app.paid_preflight%ROWTYPE; v_result text; v_reason text; v_recovery text; v_ceiling text; v_permitted text[] := '{}'; v_excluded text[] := ARRAY['ai','rendering','provider_egress','external_distribution']; v_controls jsonb := '[]'::jsonb; new_id uuid;
  purchase_outcome text; identity_outcome text; use_outcome text; rights_outcome text; confidentiality_outcome text; processing_outcome text; compatibility_outcome text; packet_outcome text;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() THEN RAISE EXCEPTION 'deal scope mismatch' USING ERRCODE = '42501'; END IF;
  SELECT * INTO prior_cmd FROM app.deal_command_idempotency WHERE account_id=p_account_id AND actor_id=p_actor_id AND command_type='create_paid_preflight' AND key_hash=p_key_hash;
  IF FOUND THEN
    IF prior_cmd.request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE = '23505'; END IF;
    SELECT p.id,p.result,p.reason_code,p.recovery_action INTO new_id,v_result,v_reason,v_recovery FROM app.paid_preflight p WHERE p.deal_id=prior_cmd.deal_id ORDER BY p.version DESC LIMIT 1;
    RETURN QUERY SELECT new_id,v_result,v_reason,v_recovery; RETURN;
  END IF;
  SELECT * INTO deal_row FROM app.deal WHERE id=p_deal_id AND account_id=p_account_id AND deal_class='paid_customer' FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO draft FROM app.deal_setup_draft WHERE deal_id=p_deal_id ORDER BY version DESC LIMIT 1;
  IF draft.id IS NULL THEN RETURN; END IF;
  purchase_outcome := CASE WHEN EXISTS (SELECT 1 FROM app.checkout_terms_acceptance ta WHERE ta.id=deal_row.purchase_authority_acknowledgement_id AND ta.account_id=p_account_id AND ta.actor_id=p_actor_id) THEN 'pass' ELSE 'waiting' END;
  identity_outcome := CASE WHEN deal_row.identity_confirmed_by IS NOT NULL AND deal_row.identity_accepted_at IS NOT NULL THEN 'pass' ELSE 'blocked' END;
  rights_outcome := CASE draft.source_rights WHEN 'confirmed' THEN 'pass' WHEN 'limited' THEN 'limited' WHEN 'blocked' THEN 'blocked' ELSE 'waiting' END;
  use_outcome := CASE WHEN draft.intended_use='external_distribution' OR draft.intended_audience IN ('external_recipients','external_audience') THEN 'limited' ELSE 'pass' END;
  confidentiality_outcome := CASE WHEN draft.confidentiality_class='restricted' AND draft.processing_path='local_deterministic_and_approved_ai' THEN 'blocked' ELSE 'pass' END;
  processing_outcome := CASE WHEN draft.processing_path='local_deterministic_and_approved_ai' AND ('unknown'=ANY(draft.provider_restrictions) OR cardinality(draft.provider_restrictions)=0) THEN 'waiting' ELSE 'pass' END;
  compatibility_outcome := CASE WHEN draft.compatibility='blocked' THEN 'blocked' WHEN draft.compatibility='review_required' THEN 'waiting' ELSE 'pass' END;
  packet_outcome := CASE draft.minimum_packet WHEN 'complete' THEN 'pass' WHEN 'incomplete' THEN 'waiting' ELSE 'waiting' END;
  IF purchase_outcome='waiting' THEN v_result:='waiting-for-user'; v_reason:='purchase_authority_missing'; v_recovery:='record_purchase_authority';
  ELSIF identity_outcome='blocked' THEN v_result:='blocked'; v_reason:='deal_identity_incomplete'; v_recovery:='complete_deal_identity';
  ELSIF rights_outcome='blocked' THEN v_result:='blocked'; v_reason:='source_rights_blocked'; v_recovery:='replace_or_remove_blocked_source';
  ELSIF confidentiality_outcome='blocked' THEN v_result:='blocked'; v_reason:='restricted_processing_path_incompatible'; v_recovery:='narrow_to_local_deterministic_only';
  ELSIF compatibility_outcome='blocked' THEN v_result:='blocked'; v_reason:='input_compatibility_blocked'; v_recovery:='replace_source_or_choose_supported_path';
  ELSIF rights_outcome='waiting' THEN v_result:='waiting-for-user'; v_reason:=CASE WHEN draft.source_reference_posture='removed' THEN 'source_reference_removed' ELSE 'source_rights_missing' END; v_recovery:=CASE WHEN draft.source_reference_posture='removed' THEN 'provide_or_replace_source_reference' ELSE 'record_source_rights' END;
  ELSIF packet_outcome='waiting' THEN v_result:='waiting-for-user'; v_reason:='minimum_packet_incomplete'; v_recovery:='complete_minimum_packet';
  ELSIF processing_outcome='waiting' THEN v_result:='waiting-for-user'; v_reason:='provider_restriction_requires_review'; v_recovery:='confirm_provider_compatibility';
  ELSIF use_outcome='limited' OR rights_outcome='limited' THEN v_result:='limited-proceed'; v_reason:=CASE WHEN rights_outcome='limited' THEN 'source_rights_limited' ELSE 'intended_use_scope_limited' END; v_recovery:='accept_exact_limited_scope';
  ELSE v_result:='pass'; v_reason:='all_preflight_controls_passed'; v_recovery:='continue_to_source_intake'; END IF;
  IF v_result='pass' THEN v_permitted := ARRAY['quarantine','parse','deterministic_analysis','internal_controlled_export']; v_ceiling := 'supported_internal_processing';
  ELSIF v_result='limited-proceed' THEN v_permitted := ARRAY['quarantine','parse','deterministic_analysis','internal_controlled_export']; v_ceiling := 'internal_analysis_and_internal_controlled_export';
  END IF;
  new_id := gen_random_uuid();
  INSERT INTO app.paid_preflight(id,account_id,deal_id,setup_draft_id,version,result,reason_code,recovery_action,permitted_scope,excluded_scope,output_ceiling,evaluated_controls,supersedes_id) VALUES (new_id,p_account_id,p_deal_id,draft.id,(SELECT coalesce(max(version),0)+1 FROM app.paid_preflight WHERE deal_id=p_deal_id),v_result,v_reason,v_recovery,v_permitted,v_excluded,v_ceiling,jsonb_build_array(jsonb_build_object('dimension','purchase_authority','outcome',purchase_outcome,'reason_code',CASE WHEN purchase_outcome='pass' THEN 'purchase_authority_confirmed' ELSE 'purchase_authority_missing' END,'recovery_action',CASE WHEN purchase_outcome='pass' THEN 'none' ELSE 'record_purchase_authority' END),jsonb_build_object('dimension','deal_identity','outcome',identity_outcome,'reason_code',CASE WHEN identity_outcome='pass' THEN 'identity_complete' ELSE 'deal_identity_incomplete' END,'recovery_action',CASE WHEN identity_outcome='pass' THEN 'none' ELSE 'complete_deal_identity' END),jsonb_build_object('dimension','intended_use','outcome',use_outcome,'reason_code',CASE WHEN use_outcome='pass' THEN 'internal_use_bounded' ELSE 'intended_use_scope_limited' END,'recovery_action',CASE WHEN use_outcome='pass' THEN 'none' ELSE 'accept_exact_limited_scope' END),jsonb_build_object('dimension','source_rights','outcome',rights_outcome,'reason_code',CASE rights_outcome WHEN 'pass' THEN 'source_rights_confirmed' WHEN 'limited' THEN 'source_rights_limited' WHEN 'blocked' THEN 'source_rights_blocked' ELSE 'source_rights_missing' END,'recovery_action',CASE rights_outcome WHEN 'pass' THEN 'none' WHEN 'limited' THEN 'accept_exact_limited_scope' WHEN 'blocked' THEN 'replace_or_remove_blocked_source' ELSE 'record_source_rights' END),jsonb_build_object('dimension','confidentiality','outcome',confidentiality_outcome,'reason_code',CASE WHEN confidentiality_outcome='pass' THEN 'confidentiality_path_compatible' ELSE 'restricted_processing_path_incompatible' END,'recovery_action',CASE WHEN confidentiality_outcome='pass' THEN 'none' ELSE 'narrow_to_local_deterministic_only' END),jsonb_build_object('dimension','processing_path','outcome',processing_outcome,'reason_code',CASE WHEN processing_outcome='pass' THEN 'processing_path_available' ELSE 'provider_restriction_requires_review' END,'recovery_action',CASE WHEN processing_outcome='pass' THEN 'none' ELSE 'confirm_provider_compatibility' END),jsonb_build_object('dimension','compatibility','outcome',compatibility_outcome,'reason_code',CASE WHEN compatibility_outcome='pass' THEN 'input_compatibility_passed' ELSE 'input_compatibility_blocked' END,'recovery_action',CASE WHEN compatibility_outcome='pass' THEN 'none' ELSE 'replace_source_or_choose_supported_path' END),jsonb_build_object('dimension','minimum_packet','outcome',packet_outcome,'reason_code',CASE WHEN packet_outcome='pass' THEN 'minimum_packet_complete' ELSE 'minimum_packet_incomplete' END,'recovery_action',CASE WHEN packet_outcome='pass' THEN 'none' ELSE 'complete_minimum_packet' END)),(SELECT id FROM app.paid_preflight WHERE deal_id=p_deal_id ORDER BY version DESC LIMIT 1));
  INSERT INTO app.preflight_control_result(account_id,deal_id,preflight_id,control_dimension,outcome_code,reason_code,recovery_action) SELECT p_account_id,p_deal_id,new_id,control->>'dimension',control->>'outcome',control->>'reason_code',control->>'recovery_action' FROM jsonb_array_elements((SELECT evaluated_controls FROM app.paid_preflight WHERE id=new_id)) control;
  UPDATE app.deal_workspace SET paid_preflight_status=v_result,processing_posture=CASE v_result WHEN 'pass' THEN 'permitted' WHEN 'limited-proceed' THEN 'limited' ELSE 'preflight_restricted' END,output_ceiling=v_ceiling,row_version=row_version+1,displayed_state=jsonb_build_object('stage',deal_row.business_stage,'materiality','paid_customer','source_posture',CASE v_result WHEN 'pass' THEN 'permitted' WHEN 'limited-proceed' THEN 'limited' ELSE 'preflight_restricted' END,'next_controlled_action',v_recovery) WHERE deal_id=p_deal_id AND account_id=p_account_id;
  IF v_result='pass' THEN UPDATE app.active_deal_capacity_reservation SET state_code='active',activated_at=clock_timestamp() WHERE deal_id=p_deal_id AND account_id=p_account_id AND state_code='reserved_preflight'; END IF;
  UPDATE app.first_deal_guide_checkpoint SET status_code=CASE WHEN v_result='blocked' THEN 'blocked' WHEN v_result='waiting-for-user' THEN 'waiting' ELSE 'completed' END,current_action=v_recovery,completed_at=CASE WHEN v_result IN ('pass','limited-proceed') THEN clock_timestamp() ELSE NULL END,updated_at=clock_timestamp() WHERE deal_id=p_deal_id AND account_id=p_account_id;
  INSERT INTO app.deal_command_idempotency(account_id,actor_id,command_type,key_hash,request_digest,deal_id) VALUES (p_account_id,p_actor_id,'create_paid_preflight',p_key_hash,p_request_digest,p_deal_id);
  PERFORM app.append_deal_audit(p_account_id,p_actor_id,p_deal_id,'paid_preflight_completed',new_id::text,v_reason);
  RETURN QUERY SELECT new_id,v_result,v_reason,v_recovery;
END
$$;

CREATE OR REPLACE FUNCTION app.accept_limited_preflight(p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_preflight_id uuid, p_key_hash text, p_request_digest text, p_scope text[], p_excluded text[], p_ceiling text)
RETURNS TABLE(accepted boolean, reservation_state text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
DECLARE p app.paid_preflight%ROWTYPE; reservation app.active_deal_capacity_reservation%ROWTYPE; existing app.deal_command_idempotency%ROWTYPE;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() THEN RAISE EXCEPTION 'deal scope mismatch' USING ERRCODE = '42501'; END IF;
  SELECT * INTO existing FROM app.deal_command_idempotency WHERE account_id=p_account_id AND actor_id=p_actor_id AND command_type='accept_limited_preflight' AND key_hash=p_key_hash;
  IF FOUND THEN
    IF existing.request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE = '23505'; END IF;
    RETURN QUERY SELECT true, 'active'::text; RETURN;
  END IF;
  SELECT * INTO p FROM app.paid_preflight WHERE id=p_preflight_id AND deal_id=p_deal_id AND account_id=p_account_id AND result='limited-proceed' AND NOT EXISTS (SELECT 1 FROM app.paid_preflight newer WHERE newer.deal_id=p.deal_id AND newer.version>p.version) FOR UPDATE;
  IF NOT FOUND OR p.permitted_scope <> p_scope OR p.excluded_scope <> p_excluded OR p.output_ceiling IS DISTINCT FROM p_ceiling OR p.expires_at <= clock_timestamp() THEN RETURN QUERY SELECT false, NULL::text; RETURN; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_account_id::text || ':ticket05-active-deals'));
  UPDATE app.active_deal_capacity_reservation SET state_code='active',activated_at=coalesce(activated_at,clock_timestamp()) WHERE deal_id=p_deal_id AND account_id=p_account_id AND state_code='reserved_preflight' RETURNING * INTO reservation;
  IF reservation.id IS NULL THEN SELECT * INTO reservation FROM app.active_deal_capacity_reservation WHERE deal_id=p_deal_id AND account_id=p_account_id; END IF;
  UPDATE app.deal_workspace SET processing_posture='limited',paid_preflight_status='limited-proceed',row_version=row_version+1 WHERE deal_id=p_deal_id AND account_id=p_account_id;
  UPDATE app.first_deal_guide_checkpoint SET status_code='completed',current_action='Continue within the accepted limited scope',completed_at=clock_timestamp(),updated_at=clock_timestamp() WHERE deal_id=p_deal_id AND account_id=p_account_id;
  INSERT INTO app.deal_command_idempotency(account_id,actor_id,command_type,key_hash,request_digest,deal_id) VALUES (p_account_id,p_actor_id,'accept_limited_preflight',p_key_hash,p_request_digest,p_deal_id);
  PERFORM app.append_deal_audit(p_account_id,p_actor_id,p_deal_id,'limited_preflight_scope_accepted',p_preflight_id::text,'exact_limited_scope_accepted');
  RETURN QUERY SELECT true,reservation.state_code;
END
$$;

CREATE OR REPLACE FUNCTION app.create_identity_changed_deal(p_account_id uuid, p_actor_id uuid, p_original_deal_id uuid, p_key_hash text, p_request_digest text, p_changes jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
DECLARE original app.deal%ROWTYPE; input jsonb; new_id uuid;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() THEN RAISE EXCEPTION 'deal scope mismatch' USING ERRCODE = '42501'; END IF;
  IF EXISTS (SELECT 1 FROM app.deal_command_idempotency WHERE account_id=p_account_id AND actor_id=p_actor_id AND command_type='create_identity_change' AND key_hash=p_key_hash) THEN
    IF EXISTS (SELECT 1 FROM app.deal_command_idempotency WHERE account_id=p_account_id AND actor_id=p_actor_id AND command_type='create_identity_change' AND key_hash=p_key_hash AND request_digest=p_request_digest) THEN
      SELECT deal_id INTO new_id FROM app.deal_command_idempotency WHERE account_id=p_account_id AND actor_id=p_actor_id AND command_type='create_identity_change' AND key_hash=p_key_hash;
      RETURN new_id;
    END IF;
    RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE = '23505';
  END IF;
  SELECT * INTO original FROM app.deal WHERE id=p_original_deal_id AND account_id=p_account_id AND deal_class='paid_customer';
  IF NOT FOUND THEN RETURN NULL; END IF;
  input := jsonb_build_object('display_name',original.name || ' (linked)', 'represented_party',original.represented_party, 'transaction_subject',coalesce(p_changes->>'transaction_subject',original.transaction_subject), 'transaction_perimeter',jsonb_build_object('inclusions',to_jsonb(original.transaction_perimeter_inclusions),'exclusions',to_jsonb(original.transaction_perimeter_exclusions)), 'banker_role_or_side',original.banker_role_or_side, 'mandate_objective',original.mandate_objective, 'transaction_type',original.transaction_type, 'business_stage',lower(replace(original.business_stage,' ', '_')), 'intended_purpose',original.intended_purpose, 'intended_audience',original.intended_audience, 'base_currency',original.base_currency, 'reporting_units',original.reporting_units, 'purchase_authority_acknowledgement_id',original.purchase_authority_acknowledgement_id::text, 'deal_authority_basis',original.deal_authority_basis, 'expected_source_use_authority',original.expected_source_use_authority, 'confidentiality_class',original.confidentiality_class, 'employer_or_client_restrictions',jsonb_build_object('posture',original.restriction_posture,'details',original.restriction_details), 'intended_processing_path',original.intended_processing_path, 'expected_file_families',to_jsonb(original.expected_file_families), 'expected_template_posture',original.expected_template_posture, 'provider_restrictions',to_jsonb(original.provider_restrictions), 'special_structures',to_jsonb(original.special_structures), 'stage_basis_reference',original.stage_basis_reference, 'identity_confirmed',true, 'source_reference',NULL);
  input := input || jsonb_build_object('predecessor_deal_id',p_original_deal_id::text);
  -- The normal create function reserves a second slot when available. A
  -- changed identity is intentionally a new Deal, never an in-place update.
  SELECT d.deal_id INTO new_id FROM app.create_paid_deal(p_account_id,p_actor_id,p_key_hash,p_request_digest,input) d;
  IF new_id IS NOT NULL THEN
    INSERT INTO app.deal_command_idempotency(account_id,actor_id,command_type,key_hash,request_digest,deal_id) VALUES (p_account_id,p_actor_id,'create_identity_change',p_key_hash,p_request_digest,new_id);
    PERFORM app.append_deal_audit(p_account_id,p_actor_id,new_id,'deal_identity_changed_linked','' || p_original_deal_id,'new_linked_deal');
  END IF;
  RETURN new_id;
END
$$;

CREATE OR REPLACE FUNCTION app.get_deal_setup_projection(p_account_id uuid, p_actor_id uuid, p_deal_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
DECLARE d app.deal%ROWTYPE; w app.deal_workspace%ROWTYPE; draft app.deal_setup_draft%ROWTYPE; capacity app.active_deal_capacity_reservation%ROWTYPE; guide app.first_deal_guide_checkpoint%ROWTYPE; latest jsonb;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() THEN RETURN NULL; END IF;
  SELECT * INTO d FROM app.deal WHERE id=p_deal_id AND account_id=p_account_id; SELECT * INTO w FROM app.deal_workspace WHERE deal_id=p_deal_id AND account_id=p_account_id; SELECT * INTO draft FROM app.deal_setup_draft WHERE deal_id=p_deal_id ORDER BY version DESC LIMIT 1; SELECT * INTO capacity FROM app.active_deal_capacity_reservation WHERE deal_id=p_deal_id AND account_id=p_account_id; SELECT * INTO guide FROM app.first_deal_guide_checkpoint WHERE deal_id=p_deal_id AND account_id=p_account_id;
  IF d.id IS NULL OR w.id IS NULL THEN RETURN NULL; END IF;
  SELECT jsonb_build_object('id',p.id,'version',p.version,'result',p.result,'reason_code',p.reason_code,'recovery_action',p.recovery_action,'permitted_scope',p.permitted_scope,'excluded_scope',p.excluded_scope,'output_ceiling',p.output_ceiling,'completed_at',p.completed_at,'expires_at',p.expires_at,'controls',coalesce((SELECT jsonb_agg(jsonb_build_object('dimension',c.control_dimension,'outcome',c.outcome_code,'reason_code',c.reason_code,'recovery_action',c.recovery_action) ORDER BY c.control_dimension) FROM app.preflight_control_result c WHERE c.preflight_id=p.id),'[]'::jsonb)) INTO latest FROM app.paid_preflight p WHERE p.deal_id=p_deal_id ORDER BY p.version DESC LIMIT 1;
  RETURN jsonb_build_object('data',jsonb_build_object('id',d.id,'deal_class',d.deal_class,'predecessor_deal_id',d.predecessor_deal_id,'etag',d.row_version::text,'identity',jsonb_build_object('account_id',d.account_id,'actor_id',d.identity_confirmed_by,'display_name',d.name,'represented_party',d.represented_party,'transaction_subject',d.transaction_subject,'transaction_perimeter',jsonb_build_object('inclusions',d.transaction_perimeter_inclusions,'exclusions',d.transaction_perimeter_exclusions),'banker_role_or_side',d.banker_role_or_side,'transaction_type',d.transaction_type,'mandate_objective',d.mandate_objective,'business_stage',d.business_stage,'intended_purpose',d.intended_purpose,'intended_audience',d.intended_audience,'base_currency',d.base_currency,'reporting_units',d.reporting_units,'purchase_authority_acknowledgement_id',d.purchase_authority_acknowledgement_id,'deal_authority_basis',d.deal_authority_basis,'expected_source_use_authority',d.expected_source_use_authority,'confidentiality_class',d.confidentiality_class,'restriction_posture',d.restriction_posture,'restriction_details',d.restriction_details,'intended_processing_path',d.intended_processing_path,'expected_file_families',d.expected_file_families,'expected_template_posture',d.expected_template_posture,'provider_restrictions',d.provider_restrictions,'special_structures',d.special_structures,'identity_accepted_at',d.identity_accepted_at),'capacity',jsonb_build_object('reservation_id',capacity.id,'state',capacity.state_code,'slot',capacity.slot_ordinal,'entitlement_id',capacity.entitlement_id,'reserved_at',capacity.reserved_at),'setup',jsonb_build_object('draft_id',draft.id,'version',draft.version,'source_reference',jsonb_build_object('posture',draft.source_reference_posture,'reference',draft.source_reference),'source_rights',draft.source_rights,'intended_use',draft.intended_use,'intended_audience',draft.intended_audience,'confidentiality_class',draft.confidentiality_class,'processing_path',draft.processing_path,'provider_restrictions',draft.provider_restrictions,'minimum_packet',draft.minimum_packet,'compatibility',draft.compatibility),'workspace',jsonb_build_object('processing_posture',w.processing_posture,'paid_preflight_status',w.paid_preflight_status,'output_ceiling',w.output_ceiling,'guide_mode',w.guide_mode,'posture_version',w.posture_version,'row_version',w.row_version),'paid_preflight',coalesce(latest,jsonb_build_object('result','waiting-for-user','reason_code','preflight_not_run','recovery_action','run_paid_preflight')),'first_deal_guide',jsonb_build_object('checkpoint','deal_and_preflight','status',guide.status_code,'current_action',guide.current_action,'completed_at',guide.completed_at)),'meta',jsonb_build_object('outcome','accepted'));
END
$$;

CREATE OR REPLACE FUNCTION app.list_account_deals(p_account_id uuid, p_actor_id uuid)
RETURNS SETOF jsonb LANGUAGE sql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
  SELECT jsonb_build_object('id',d.id,'name',d.name,'deal_class',d.deal_class,'business_stage',d.business_stage,'predecessor_deal_id',d.predecessor_deal_id,'workspace_posture',w.processing_posture,'paid_preflight_status',w.paid_preflight_status,'capacity_slot',r.slot_ordinal)
  FROM app.deal d JOIN app.deal_workspace w ON w.deal_id=d.id AND w.account_id=d.account_id LEFT JOIN app.active_deal_capacity_reservation r ON r.deal_id=d.id AND r.account_id=d.account_id
  WHERE p_account_id=app.policy_account_id() AND p_actor_id=app.policy_actor_id() AND d.account_id=p_account_id AND d.deal_class='paid_customer' AND EXISTS (SELECT 1 FROM app.account_actor aa WHERE aa.account_id=p_account_id AND aa.actor_id=p_actor_id AND aa.active)
  ORDER BY d.created_at ASC
$$;

REVOKE ALL ON FUNCTION app.create_paid_deal(uuid,uuid,text,text,jsonb), app.save_deal_setup(uuid,uuid,uuid,jsonb,integer), app.create_paid_preflight(uuid,uuid,uuid,text,text), app.accept_limited_preflight(uuid,uuid,uuid,uuid,text,text,text[],text[],text), app.create_identity_changed_deal(uuid,uuid,uuid,text,text,jsonb), app.get_deal_setup_projection(uuid,uuid,uuid), app.list_account_deals(uuid,uuid), app.append_deal_audit(uuid,uuid,uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.create_paid_deal(uuid,uuid,text,text,jsonb), app.save_deal_setup(uuid,uuid,uuid,jsonb,integer), app.create_paid_preflight(uuid,uuid,uuid,text,text), app.accept_limited_preflight(uuid,uuid,uuid,uuid,text,text,text[],text[],text), app.create_identity_changed_deal(uuid,uuid,uuid,text,text,jsonb), app.get_deal_setup_projection(uuid,uuid,uuid), app.list_account_deals(uuid,uuid), app.append_deal_audit(uuid,uuid,uuid,text,text,text) TO app_runtime;

-- Keep the existing application owner as the offline owner in local/test and
-- hosted dev environments; it is NOLOGIN and never used for online traffic.
-- PostgreSQL requires the target owner to have CREATE on the containing schema
-- while ownership is transferred; remove that temporary privilege immediately
-- afterwards so the offline owner cannot create arbitrary app-schema objects.
GRANT USAGE, CREATE ON SCHEMA app TO app_commerce_owner;
ALTER FUNCTION app.append_deal_audit(uuid,uuid,uuid,text,text,text) OWNER TO app_commerce_owner;
ALTER FUNCTION app.create_paid_deal(uuid,uuid,text,text,jsonb) OWNER TO app_commerce_owner;
ALTER FUNCTION app.save_deal_setup(uuid,uuid,uuid,jsonb,integer) OWNER TO app_commerce_owner;
ALTER FUNCTION app.create_paid_preflight(uuid,uuid,uuid,text,text) OWNER TO app_commerce_owner;
ALTER FUNCTION app.accept_limited_preflight(uuid,uuid,uuid,uuid,text,text,text[],text[],text) OWNER TO app_commerce_owner;
ALTER FUNCTION app.create_identity_changed_deal(uuid,uuid,uuid,text,text,jsonb) OWNER TO app_commerce_owner;
ALTER FUNCTION app.get_deal_setup_projection(uuid,uuid,uuid) OWNER TO app_commerce_owner;
ALTER FUNCTION app.list_account_deals(uuid,uuid) OWNER TO app_commerce_owner;
REVOKE CREATE ON SCHEMA app FROM app_commerce_owner;
