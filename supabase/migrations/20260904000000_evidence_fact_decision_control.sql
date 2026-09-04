-- Ticket 10: Evidence inspection, typed Claims/Facts/Assumptions, scoped
-- Human Decisions, conflict control, and append-only correction history.
-- Runtime callers receive only these SECURITY DEFINER command/projection
-- functions; authoritative knowledge tables remain forced-RLS and read-only
-- to app_runtime.

CREATE SCHEMA IF NOT EXISTS knowledge;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_knowledge_owner') THEN
    CREATE ROLE app_knowledge_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
  ELSE
    ALTER ROLE app_knowledge_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
  END IF;
END $$;

GRANT app_knowledge_owner TO postgres;
GRANT USAGE ON SCHEMA app, source, ai, knowledge TO app_knowledge_owner;
GRANT USAGE ON SCHEMA extensions TO app_knowledge_owner;
GRANT EXECUTE ON FUNCTION extensions.digest(text,text), extensions.digest(bytea,text) TO app_knowledge_owner;
GRANT EXECUTE ON FUNCTION app.policy_account_id(), app.policy_actor_id(), app.policy_deal_id(), app.record_audit(text,text,text,text,text,text) TO app_knowledge_owner;
GRANT SELECT ON app.account, app.actor, app.account_actor, app.deal, app.deal_workspace, app.work_objective TO app_knowledge_owner;
GRANT SELECT ON source.source_record, source.source_representation, source.source_fragment, source.processing_coverage, source.source_rights_current_selection, source.source_rights_posture_assessment, source.reliance_current_selection, source.source_reliance_assessment, source.source_condition_current_selection, source.source_condition_assessment TO app_knowledge_owner;
GRANT SELECT ON ai.proposal, ai.run, ai.run_fragment TO app_knowledge_owner;

CREATE TABLE IF NOT EXISTS knowledge.native_locator (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  source_record_id uuid NOT NULL REFERENCES source.source_record(id),
  representation_id uuid NOT NULL REFERENCES source.source_representation(id),
  profile_code text NOT NULL,
  profile_version text NOT NULL,
  selector jsonb NOT NULL,
  locator_digest text NOT NULL CHECK (locator_digest ~ '^sha256:[a-f0-9]{64}$'),
  parser_identity text NOT NULL,
  context_digest text NOT NULL CHECK (context_digest ~ '^sha256:[a-f0-9]{64}$'),
  resolution_status text NOT NULL CHECK (resolution_status IN ('resolved','ambiguous','unresolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, id),
  UNIQUE (representation_id, locator_digest),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, source_record_id) REFERENCES source.source_record(account_id, id),
  FOREIGN KEY (account_id, representation_id) REFERENCES source.source_representation(account_id, id)
);

CREATE TABLE IF NOT EXISTS knowledge.evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  source_record_id uuid NOT NULL REFERENCES source.source_record(id),
  representation_id uuid NOT NULL REFERENCES source.source_representation(id),
  native_locator_id uuid NOT NULL REFERENCES knowledge.native_locator(id),
  context_digest text NOT NULL CHECK (context_digest ~ '^sha256:[a-f0-9]{64}$'),
  source_date date,
  source_scope text,
  source_definition text,
  accepted_origin text NOT NULL CHECK (accepted_origin IN ('human','deterministic')),
  accepted_by_actor_id uuid NOT NULL REFERENCES app.actor(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, id),
  UNIQUE (representation_id, native_locator_id, context_digest),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, source_record_id) REFERENCES source.source_record(account_id, id),
  FOREIGN KEY (account_id, representation_id) REFERENCES source.source_representation(account_id, id),
  FOREIGN KEY (account_id, accepted_by_actor_id) REFERENCES app.account_actor(account_id, actor_id)
);

CREATE TABLE IF NOT EXISTS knowledge.claim (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  proposition text NOT NULL CHECK (length(btrim(proposition)) BETWEEN 1 AND 4000),
  attribution text NOT NULL CHECK (length(btrim(attribution)) BETWEEN 1 AND 500),
  definition text NOT NULL,
  period text NOT NULL,
  unit text NOT NULL,
  currency text NOT NULL,
  sign text NOT NULL CHECK (sign IN ('positive','negative','not_applicable','unknown')),
  value_text text,
  purpose_code text NOT NULL,
  scope text NOT NULL,
  origin_code text NOT NULL CHECK (origin_code IN ('human_authored','ai_generated','correction')),
  source_proposal_id uuid,
  created_by_actor_id uuid NOT NULL REFERENCES app.actor(id),
  supersedes_claim_id uuid REFERENCES knowledge.claim(id),
  corrects_claim_id uuid REFERENCES knowledge.claim(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, created_by_actor_id) REFERENCES app.account_actor(account_id, actor_id),
  FOREIGN KEY (account_id, supersedes_claim_id) REFERENCES knowledge.claim(account_id, id),
  FOREIGN KEY (account_id, corrects_claim_id) REFERENCES knowledge.claim(account_id, id)
);

CREATE TABLE IF NOT EXISTS knowledge.evidence_relationship (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  claim_id uuid NOT NULL REFERENCES knowledge.claim(id),
  evidence_id uuid NOT NULL REFERENCES knowledge.evidence(id),
  relationship_code text NOT NULL CHECK (relationship_code IN ('supports','challenges')),
  supported_scope text NOT NULL,
  qualification text,
  limitation text,
  origin_code text NOT NULL CHECK (origin_code IN ('human','deterministic')),
  accepted_by_actor_id uuid NOT NULL REFERENCES app.actor(id),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, id),
  UNIQUE (claim_id, evidence_id, relationship_code, supported_scope),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, claim_id) REFERENCES knowledge.claim(account_id, id),
  FOREIGN KEY (account_id, evidence_id) REFERENCES knowledge.evidence(account_id, id),
  FOREIGN KEY (account_id, accepted_by_actor_id) REFERENCES app.account_actor(account_id, actor_id)
);

CREATE TABLE IF NOT EXISTS knowledge.evidence_candidate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  ai_proposal_id uuid REFERENCES ai.proposal(id),
  claim_id uuid REFERENCES knowledge.claim(id),
  candidate_key text NOT NULL,
  run_fragment_id uuid,
  proposed_relationship text NOT NULL CHECK (proposed_relationship IN ('supports','challenges')),
  proposed_scope text NOT NULL,
  validation_outcome text NOT NULL CHECK (validation_outcome IN ('pending','accepted','rejected','unsupported')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, id),
  UNIQUE (ai_proposal_id, candidate_key),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, claim_id) REFERENCES knowledge.claim(account_id, id)
);

CREATE TABLE IF NOT EXISTS knowledge.human_decision (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  decision_type_code text NOT NULL CHECK (decision_type_code IN ('fact_acceptance','assumption_approval','conflict_resolution','correction')),
  controlled_object_id text NOT NULL,
  controlled_object_version text NOT NULL,
  question_text text NOT NULL,
  selected_option_code text NOT NULL,
  alternatives jsonb NOT NULL DEFAULT '[]'::jsonb,
  contrary_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  rationale_text text NOT NULL,
  scope text NOT NULL,
  purpose_code text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  downstream_effect jsonb NOT NULL DEFAULT '{}'::jsonb,
  decided_by_actor_id uuid NOT NULL REFERENCES app.actor(id),
  effective_at timestamptz NOT NULL DEFAULT now(),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  policy_version text NOT NULL DEFAULT 'ticket-10-v1',
  authority_basis_code text NOT NULL DEFAULT 'authenticated_individual_banker',
  supersedes_decision_id uuid REFERENCES knowledge.human_decision(id),
  reverses_decision_id uuid REFERENCES knowledge.human_decision(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, decided_by_actor_id) REFERENCES app.account_actor(account_id, actor_id)
);

CREATE TABLE IF NOT EXISTS knowledge.fact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  claim_id uuid NOT NULL REFERENCES knowledge.claim(id),
  purpose_code text NOT NULL,
  scope text NOT NULL,
  work_objective_id uuid REFERENCES app.work_objective(id),
  proposition text NOT NULL,
  definition text NOT NULL,
  period text NOT NULL,
  unit text NOT NULL,
  currency text NOT NULL,
  sign text NOT NULL,
  value_text text,
  qualification text,
  acceptance_decision_id uuid NOT NULL REFERENCES knowledge.human_decision(id),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  supersedes_fact_id uuid REFERENCES knowledge.fact(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, claim_id) REFERENCES knowledge.claim(account_id, id),
  FOREIGN KEY (account_id, work_objective_id) REFERENCES app.work_objective(account_id, id),
  FOREIGN KEY (account_id, acceptance_decision_id) REFERENCES knowledge.human_decision(account_id, id),
  FOREIGN KEY (account_id, supersedes_fact_id) REFERENCES knowledge.fact(account_id, id)
);

CREATE TABLE IF NOT EXISTS knowledge.fact_evidence_basis (
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  fact_id uuid NOT NULL REFERENCES knowledge.fact(id),
  evidence_relationship_id uuid NOT NULL REFERENCES knowledge.evidence_relationship(id),
  basis_role text NOT NULL CHECK (basis_role IN ('supporting','challenging')),
  PRIMARY KEY (fact_id, evidence_relationship_id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, fact_id) REFERENCES knowledge.fact(account_id, id),
  FOREIGN KEY (account_id, evidence_relationship_id) REFERENCES knowledge.evidence_relationship(account_id, id)
);

CREATE TABLE IF NOT EXISTS knowledge.fact_current_selection (
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  claim_id uuid NOT NULL REFERENCES knowledge.claim(id),
  purpose_code text NOT NULL,
  scope_digest text NOT NULL CHECK (scope_digest ~ '^sha256:[a-f0-9]{64}$'),
  current_fact_id uuid NOT NULL REFERENCES knowledge.fact(id),
  row_version bigint NOT NULL DEFAULT 1 CHECK (row_version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, claim_id, purpose_code, scope_digest),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, claim_id) REFERENCES knowledge.claim(account_id, id),
  FOREIGN KEY (account_id, current_fact_id) REFERENCES knowledge.fact(account_id, id)
);

CREATE TABLE IF NOT EXISTS knowledge.assumption (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  proposition text NOT NULL,
  value_text text,
  purpose_code text NOT NULL,
  scope text NOT NULL,
  rationale text NOT NULL,
  bounds jsonb NOT NULL DEFAULT '{}'::jsonb,
  invalidation_triggers jsonb NOT NULL DEFAULT '[]'::jsonb,
  origin_code text NOT NULL CHECK (origin_code IN ('human_authored','ai_generated','correction')),
  source_proposal_id uuid,
  created_by_actor_id uuid NOT NULL REFERENCES app.actor(id),
  supersedes_assumption_id uuid REFERENCES knowledge.assumption(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, created_by_actor_id) REFERENCES app.account_actor(account_id, actor_id),
  FOREIGN KEY (account_id, supersedes_assumption_id) REFERENCES knowledge.assumption(account_id, id)
);

CREATE TABLE IF NOT EXISTS knowledge.assumption_decision (
  decision_id uuid PRIMARY KEY REFERENCES knowledge.human_decision(id),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  assumption_id uuid NOT NULL REFERENCES knowledge.assumption(id),
  allowed_uses jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_bounds jsonb NOT NULL DEFAULT '{}'::jsonb,
  review_triggers jsonb NOT NULL DEFAULT '[]'::jsonb,
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, assumption_id) REFERENCES knowledge.assumption(account_id, id)
);

CREATE TABLE IF NOT EXISTS knowledge.information_conflict (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  conflict_dimension text NOT NULL CHECK (conflict_dimension IN ('definition','period','unit','currency','sign','value','source_version','scope','meaning')),
  affected_scope text NOT NULL,
  affected_uses jsonb NOT NULL DEFAULT '[]'::jsonb,
  status_code text NOT NULL DEFAULT 'unresolved' CHECK (status_code IN ('unresolved','resolved','reopened')),
  row_version bigint NOT NULL DEFAULT 1 CHECK (row_version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id)
);

CREATE TABLE IF NOT EXISTS knowledge.conflict_claim (
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  conflict_id uuid NOT NULL REFERENCES knowledge.information_conflict(id),
  claim_id uuid NOT NULL REFERENCES knowledge.claim(id),
  PRIMARY KEY (conflict_id, claim_id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, conflict_id) REFERENCES knowledge.information_conflict(account_id, id),
  FOREIGN KEY (account_id, claim_id) REFERENCES knowledge.claim(account_id, id)
);

CREATE TABLE IF NOT EXISTS knowledge.conflict_disposition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  conflict_id uuid NOT NULL REFERENCES knowledge.information_conflict(id),
  human_decision_id uuid NOT NULL REFERENCES knowledge.human_decision(id),
  disposition_code text NOT NULL,
  scope text NOT NULL,
  rationale text NOT NULL,
  selected_claim_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_relationship_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, conflict_id) REFERENCES knowledge.information_conflict(account_id, id),
  FOREIGN KEY (account_id, human_decision_id) REFERENCES knowledge.human_decision(account_id, id)
);

CREATE TABLE IF NOT EXISTS knowledge.conflict_decision (
  decision_id uuid PRIMARY KEY REFERENCES knowledge.human_decision(id),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  conflict_id uuid NOT NULL REFERENCES knowledge.information_conflict(id),
  selected_claim_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, conflict_id) REFERENCES knowledge.information_conflict(account_id, id)
);

CREATE TABLE IF NOT EXISTS knowledge.fact_acceptance_decision (
  decision_id uuid PRIMARY KEY REFERENCES knowledge.human_decision(id),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  claim_id uuid NOT NULL REFERENCES knowledge.claim(id),
  fact_id uuid NOT NULL REFERENCES knowledge.fact(id),
  evidence_relationship_digest text NOT NULL,
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, claim_id) REFERENCES knowledge.claim(account_id, id),
  FOREIGN KEY (account_id, fact_id) REFERENCES knowledge.fact(account_id, id)
);

CREATE TABLE IF NOT EXISTS knowledge.human_decision_evidence (
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  decision_id uuid NOT NULL REFERENCES knowledge.human_decision(id),
  evidence_relationship_id uuid NOT NULL REFERENCES knowledge.evidence_relationship(id),
  PRIMARY KEY (decision_id, evidence_relationship_id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, decision_id) REFERENCES knowledge.human_decision(account_id, id),
  FOREIGN KEY (account_id, evidence_relationship_id) REFERENCES knowledge.evidence_relationship(account_id, id)
);

CREATE TABLE IF NOT EXISTS knowledge.correction_dependency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  original_claim_id uuid NOT NULL REFERENCES knowledge.claim(id),
  corrected_claim_id uuid NOT NULL REFERENCES knowledge.claim(id),
  dependent_kind text NOT NULL,
  dependent_id text NOT NULL,
  impact_state text NOT NULL DEFAULT 'candidate' CHECK (impact_state IN ('candidate','reviewed','recovered')),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, original_claim_id) REFERENCES knowledge.claim(account_id, id),
  FOREIGN KEY (account_id, corrected_claim_id) REFERENCES knowledge.claim(account_id, id)
);

CREATE TABLE IF NOT EXISTS knowledge.command_idempotency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  command_type text NOT NULL,
  key_hash text NOT NULL,
  request_digest text NOT NULL,
  result_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, actor_id, deal_id, command_type, key_hash),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, actor_id) REFERENCES app.account_actor(account_id, actor_id)
);

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['native_locator','evidence','claim','evidence_relationship','evidence_candidate','human_decision','fact','fact_evidence_basis','fact_current_selection','assumption','assumption_decision','information_conflict','conflict_claim','conflict_disposition','conflict_decision','fact_acceptance_decision','human_decision_evidence','correction_dependency','command_idempotency'] LOOP
    EXECUTE format('ALTER TABLE knowledge.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE knowledge.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS knowledge_%I_scope ON knowledge.%I', table_name, table_name);
    EXECUTE format('CREATE POLICY knowledge_%I_scope ON knowledge.%I FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id())', table_name, table_name);
  END LOOP;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA knowledge FROM app_runtime;
GRANT USAGE ON SCHEMA knowledge TO app_runtime;
GRANT SELECT ON ALL TABLES IN SCHEMA knowledge TO app_runtime;
GRANT USAGE, CREATE ON SCHEMA knowledge TO app_knowledge_owner;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA knowledge TO app_knowledge_owner;

CREATE OR REPLACE FUNCTION knowledge.prevent_immutable_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = knowledge, pg_catalog AS $$
BEGIN
  RAISE EXCEPTION 'knowledge_immutable' USING ERRCODE = '23514';
END $$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['native_locator','evidence','claim','evidence_relationship','evidence_candidate','human_decision','fact','fact_evidence_basis','assumption','assumption_decision','conflict_claim','conflict_disposition','conflict_decision','fact_acceptance_decision','human_decision_evidence','correction_dependency'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS knowledge_%I_immutable ON knowledge.%I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER knowledge_%I_immutable BEFORE UPDATE OR DELETE ON knowledge.%I FOR EACH ROW EXECUTE FUNCTION knowledge.prevent_immutable_mutation()', table_name, table_name);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION knowledge.assert_scope(p_account_id uuid, p_actor_id uuid, p_deal_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = knowledge, app, pg_catalog AS $$
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN
    RAISE EXCEPTION 'knowledge_scope_mismatch' USING ERRCODE = '42501';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION knowledge.accept_evidence(
  p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_key_hash text, p_request_digest text,
  p_source_record_id uuid, p_representation_id uuid, p_locator jsonb, p_proposition text,
  p_relationship text, p_supported_scope text, p_qualification text, p_limitation text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = knowledge, source, app, pg_catalog, public AS $$
<<accept_evidence_block>>
DECLARE record_row source.source_record%ROWTYPE; representation_row source.source_representation%ROWTYPE; locator_id uuid; evidence_id uuid; relationship_id uuid; matched_claim_id uuid; v_locator_digest text; v_context_digest text; existing knowledge.command_idempotency%ROWTYPE;
BEGIN
  PERFORM knowledge.assert_scope(p_account_id,p_actor_id,p_deal_id);
  SELECT * INTO existing FROM knowledge.command_idempotency WHERE account_id=p_account_id AND actor_id=p_actor_id AND deal_id=p_deal_id AND command_type='accept_evidence' AND key_hash=p_key_hash;
  IF FOUND THEN IF existing.request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE='23505'; END IF; RETURN jsonb_build_object('id',existing.result_id,'idempotent_replayed',true); END IF;
  IF p_relationship NOT IN ('supports','challenges') THEN RAISE EXCEPTION 'evidence_relationship_invalid' USING ERRCODE='22023'; END IF;
  SELECT * INTO record_row FROM source.source_record WHERE id=p_source_record_id AND account_id=p_account_id AND deal_id=p_deal_id;
  SELECT * INTO representation_row FROM source.source_representation WHERE id=p_representation_id AND account_id=p_account_id AND deal_id=p_deal_id AND source_record_id=p_source_record_id;
  IF record_row.id IS NULL OR representation_row.id IS NULL THEN RAISE EXCEPTION 'evidence_source_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM source.processing_coverage pc WHERE pc.id=representation_row.processing_coverage_id AND pc.account_id=p_account_id AND pc.deal_id=p_deal_id AND pc.source_record_id=record_row.id) THEN RAISE EXCEPTION 'evidence_source_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF lower(record_row.rights_posture) IN ('blocked','withdrawn') THEN RAISE EXCEPTION 'rights_blocked' USING ERRCODE='42501'; END IF;
  IF lower(coalesce((SELECT pc.coverage_code FROM source.processing_coverage pc WHERE pc.source_record_id=record_row.id),'')) IN ('corrupt','unsupported','failed') OR lower(coalesce((SELECT pc.coverage_code FROM source.processing_coverage pc WHERE pc.id=representation_row.processing_coverage_id),'')) IN ('corrupt','unsupported','failed') THEN RAISE EXCEPTION 'evidence_processing_blocked' USING ERRCODE='23514'; END IF;
  IF p_locator IS NULL OR jsonb_typeof(p_locator) <> 'object' THEN RAISE EXCEPTION 'locator_unresolved' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM source.source_fragment sf WHERE sf.account_id=p_account_id AND sf.deal_id=p_deal_id AND sf.source_record_id=record_row.id AND sf.representation_id=representation_row.id AND sf.locator=p_locator AND lower(coalesce(sf.coverage_code,'')) NOT IN ('corrupt','unsupported','failed','insufficient') AND sf.content_sha256 = 'sha256:' || encode(extensions.digest(sf.content_text,'sha256'),'hex')) THEN RAISE EXCEPTION 'locator_unresolved' USING ERRCODE='22023'; END IF;
  v_locator_digest := 'sha256:' || encode(extensions.digest(p_locator::text,'sha256'),'hex');
  v_context_digest := 'sha256:' || encode(extensions.digest(coalesce(p_proposition,'') || '|' || coalesce(p_supported_scope,''),'sha256'),'hex');
  SELECT nl.id INTO locator_id FROM knowledge.native_locator nl WHERE nl.representation_id=p_representation_id AND nl.locator_digest=v_locator_digest;
  IF locator_id IS NULL THEN
    locator_id := gen_random_uuid();
    INSERT INTO knowledge.native_locator(id,account_id,deal_id,source_record_id,representation_id,profile_code,profile_version,selector,locator_digest,parser_identity,context_digest,resolution_status)
      VALUES (locator_id,p_account_id,p_deal_id,p_source_record_id,p_representation_id,record_row.native_locator_profile_code,record_row.native_locator_profile_version,p_locator,v_locator_digest,'ticket10-evidence-acceptance-v1',v_context_digest,'resolved');
  END IF;
  SELECT e.id INTO evidence_id FROM knowledge.evidence e WHERE e.representation_id=p_representation_id AND e.native_locator_id=locator_id AND e.context_digest=v_context_digest;
  IF evidence_id IS NULL THEN
    evidence_id := gen_random_uuid();
    INSERT INTO knowledge.evidence(id,account_id,deal_id,source_record_id,representation_id,native_locator_id,context_digest,source_date,source_scope,source_definition,accepted_origin,accepted_by_actor_id)
      VALUES (evidence_id,p_account_id,p_deal_id,p_source_record_id,p_representation_id,locator_id,v_context_digest,record_row.record_date,p_supported_scope,p_proposition,'human',p_actor_id);
  END IF;
  SELECT c.id INTO matched_claim_id FROM knowledge.claim c WHERE c.account_id=p_account_id AND c.deal_id=p_deal_id AND c.proposition=p_proposition ORDER BY c.created_at DESC LIMIT 1;
  IF matched_claim_id IS NOT NULL THEN
    SELECT er.id INTO relationship_id FROM knowledge.evidence_relationship er WHERE er.claim_id=matched_claim_id AND er.evidence_id=accept_evidence_block.evidence_id AND er.relationship_code=p_relationship AND er.supported_scope=p_supported_scope;
    IF relationship_id IS NULL THEN
      relationship_id := gen_random_uuid();
      INSERT INTO knowledge.evidence_relationship(id,account_id,deal_id,claim_id,evidence_id,relationship_code,supported_scope,qualification,limitation,origin_code,accepted_by_actor_id)
        VALUES (relationship_id,p_account_id,p_deal_id,matched_claim_id,evidence_id,p_relationship,p_supported_scope,p_qualification,p_limitation,'human',p_actor_id);
    END IF;
  END IF;
  INSERT INTO knowledge.command_idempotency(account_id,actor_id,deal_id,command_type,key_hash,request_digest,result_id) VALUES (p_account_id,p_actor_id,p_deal_id,'accept_evidence',p_key_hash,p_request_digest,evidence_id);
  PERFORM app.record_audit('evidence_accepted','completed','evidence',evidence_id::text,'exact_source_locator',gen_random_uuid()::text);
  RETURN jsonb_build_object('id',evidence_id,'relationship',CASE WHEN relationship_id IS NULL THEN NULL ELSE jsonb_build_object('id',relationship_id,'claim_id',(SELECT er.claim_id FROM knowledge.evidence_relationship er WHERE er.id=relationship_id),'relationship',p_relationship) END,'source_record_id',p_source_record_id,'representation_id',p_representation_id,'locator_id',locator_id,'locator',p_locator,'idempotent_replayed',false);
END $$;

CREATE OR REPLACE FUNCTION knowledge.create_claim(
  p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_key_hash text,p_request_digest text,
  p_proposition text,p_attribution text,p_definition text,p_period text,p_unit text,p_currency text,p_sign text,p_value_text text,purpose_code text,p_scope text,p_origin_code text DEFAULT 'human_authored',p_source_proposal_id uuid DEFAULT NULL,p_corrects_claim_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = knowledge, app, pg_catalog AS $$
DECLARE claim_id uuid:=gen_random_uuid(); existing knowledge.command_idempotency%ROWTYPE;
BEGIN
  PERFORM knowledge.assert_scope(p_account_id,p_actor_id,p_deal_id);
  SELECT * INTO existing FROM knowledge.command_idempotency WHERE account_id=p_account_id AND actor_id=p_actor_id AND deal_id=p_deal_id AND command_type='create_claim' AND key_hash=p_key_hash;
  IF FOUND THEN IF existing.request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE='23505'; END IF; RETURN jsonb_build_object('id',existing.result_id,'idempotent_replayed',true); END IF;
  IF p_origin_code NOT IN ('human_authored','ai_generated','correction') THEN RAISE EXCEPTION 'claim_origin_invalid' USING ERRCODE='22023'; END IF;
  IF p_source_proposal_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ai.proposal p WHERE p.id=p_source_proposal_id AND p.account_id=p_account_id AND p.deal_id=p_deal_id) THEN RAISE EXCEPTION 'source_proposal_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF p_corrects_claim_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM knowledge.claim WHERE id=p_corrects_claim_id AND account_id=p_account_id AND deal_id=p_deal_id) THEN RAISE EXCEPTION 'claim_scope_mismatch' USING ERRCODE='42501'; END IF;
  INSERT INTO knowledge.claim(id,account_id,deal_id,proposition,attribution,definition,period,unit,currency,sign,value_text,purpose_code,scope,origin_code,source_proposal_id,created_by_actor_id,corrects_claim_id) VALUES (claim_id,p_account_id,p_deal_id,p_proposition,p_attribution,p_definition,p_period,p_unit,p_currency,p_sign,p_value_text,purpose_code,p_scope,p_origin_code,p_source_proposal_id,p_actor_id,p_corrects_claim_id);
  IF p_corrects_claim_id IS NOT NULL THEN INSERT INTO knowledge.correction_dependency(account_id,deal_id,original_claim_id,corrected_claim_id,dependent_kind,dependent_id) SELECT p_account_id,p_deal_id,p_corrects_claim_id,claim_id,'claim',p_corrects_claim_id::text; END IF;
  INSERT INTO knowledge.command_idempotency(account_id,actor_id,deal_id,command_type,key_hash,request_digest,result_id) VALUES (p_account_id,p_actor_id,p_deal_id,'create_claim',p_key_hash,p_request_digest,claim_id);
  PERFORM app.record_audit('claim_created','completed','claim',claim_id::text,p_origin_code,gen_random_uuid()::text);
  RETURN jsonb_build_object('id',claim_id,'type','Claim','origin',p_origin_code,'proposition',p_proposition,'attribution',p_attribution,'definition',p_definition,'period',p_period,'unit',p_unit,'currency',p_currency,'sign',p_sign,'value',p_value_text,'purpose',purpose_code,'scope',p_scope,'corrects_claim_id',p_corrects_claim_id,'idempotent_replayed',false);
END $$;

CREATE OR REPLACE FUNCTION knowledge.create_assumption(
  p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_key_hash text,p_request_digest text,p_proposition text,p_value_text text,p_purpose_code text,p_scope text,p_rationale text,p_bounds jsonb,p_invalidation_triggers jsonb,p_origin_code text DEFAULT 'human_authored',p_source_proposal_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = knowledge, app, pg_catalog AS $$
DECLARE assumption_id uuid:=gen_random_uuid(); existing knowledge.command_idempotency%ROWTYPE;
BEGIN
  PERFORM knowledge.assert_scope(p_account_id,p_actor_id,p_deal_id);
  SELECT * INTO existing FROM knowledge.command_idempotency WHERE account_id=p_account_id AND actor_id=p_actor_id AND deal_id=p_deal_id AND command_type='create_assumption' AND key_hash=p_key_hash;
  IF FOUND THEN IF existing.request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE='23505'; END IF; RETURN jsonb_build_object('id',existing.result_id,'idempotent_replayed',true); END IF;
  IF p_source_proposal_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ai.proposal p WHERE p.id=p_source_proposal_id AND p.account_id=p_account_id AND p.deal_id=p_deal_id) THEN RAISE EXCEPTION 'source_proposal_scope_mismatch' USING ERRCODE='42501'; END IF;
  INSERT INTO knowledge.assumption(id,account_id,deal_id,proposition,value_text,purpose_code,scope,rationale,bounds,invalidation_triggers,origin_code,source_proposal_id,created_by_actor_id) VALUES (assumption_id,p_account_id,p_deal_id,p_proposition,p_value_text,p_purpose_code,p_scope,p_rationale,coalesce(p_bounds,'{}'::jsonb),coalesce(p_invalidation_triggers,'[]'::jsonb),p_origin_code,p_source_proposal_id,p_actor_id);
  INSERT INTO knowledge.command_idempotency(account_id,actor_id,deal_id,command_type,key_hash,request_digest,result_id) VALUES (p_account_id,p_actor_id,p_deal_id,'create_assumption',p_key_hash,p_request_digest,assumption_id);
  PERFORM app.record_audit('assumption_created','completed','assumption',assumption_id::text,'typed_assumption',gen_random_uuid()::text);
  RETURN jsonb_build_object('id',assumption_id,'type','Assumption','status','proposed','origin',p_origin_code,'proposition',p_proposition,'value',p_value_text,'purpose',p_purpose_code,'scope',p_scope,'rationale',p_rationale,'bounds',coalesce(p_bounds,'{}'::jsonb),'invalidation_triggers',coalesce(p_invalidation_triggers,'[]'::jsonb),'idempotent_replayed',false);
END $$;

CREATE OR REPLACE FUNCTION knowledge.create_conflict(
  p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_key_hash text,p_request_digest text,p_dimension text,p_affected_scope text,p_affected_uses jsonb,p_claim_ids uuid[]
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = knowledge, app, pg_catalog AS $$
DECLARE conflict_id uuid:=gen_random_uuid(); claim_id uuid; existing knowledge.command_idempotency%ROWTYPE;
BEGIN
  PERFORM knowledge.assert_scope(p_account_id,p_actor_id,p_deal_id);
  SELECT * INTO existing FROM knowledge.command_idempotency WHERE account_id=p_account_id AND actor_id=p_actor_id AND deal_id=p_deal_id AND command_type='create_conflict' AND key_hash=p_key_hash;
  IF FOUND THEN IF existing.request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE='23505'; END IF; RETURN jsonb_build_object('id',existing.result_id,'idempotent_replayed',true); END IF;
  IF coalesce(cardinality(p_claim_ids),0) < 2 OR cardinality(p_claim_ids) <> (SELECT count(DISTINCT x) FROM unnest(p_claim_ids) x) OR EXISTS (SELECT 1 FROM unnest(p_claim_ids) x WHERE NOT EXISTS (SELECT 1 FROM knowledge.claim c WHERE c.id=x AND c.account_id=p_account_id AND c.deal_id=p_deal_id)) THEN RAISE EXCEPTION 'conflict_claim_scope_mismatch' USING ERRCODE='42501'; END IF;
  INSERT INTO knowledge.information_conflict(id,account_id,deal_id,conflict_dimension,affected_scope,affected_uses) VALUES (conflict_id,p_account_id,p_deal_id,p_dimension,p_affected_scope,coalesce(p_affected_uses,'[]'::jsonb));
  FOREACH claim_id IN ARRAY p_claim_ids LOOP INSERT INTO knowledge.conflict_claim(account_id,deal_id,conflict_id,claim_id) VALUES (p_account_id,p_deal_id,conflict_id,claim_id); END LOOP;
  INSERT INTO knowledge.command_idempotency(account_id,actor_id,deal_id,command_type,key_hash,request_digest,result_id) VALUES (p_account_id,p_actor_id,p_deal_id,'create_conflict',p_key_hash,p_request_digest,conflict_id);
  RETURN jsonb_build_object('id',conflict_id,'type','InformationConflict','dimension',p_dimension,'affected_scope',p_affected_scope,'affected_uses',coalesce(p_affected_uses,'[]'::jsonb),'status','unresolved','row_version',1,'claim_ids',to_jsonb(p_claim_ids),'idempotent_replayed',false);
END $$;

CREATE OR REPLACE FUNCTION knowledge.accept_claim_as_fact(
  p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_claim_id uuid,p_key_hash text,p_request_digest text,p_evidence_relationship_ids uuid[],p_purpose_code text,p_scope text,p_rationale text,p_alternatives jsonb,p_contrary_evidence jsonb,p_conditions jsonb,p_expected_row_version bigint DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = knowledge, source, app, pg_catalog AS $$
DECLARE claim_row knowledge.claim%ROWTYPE; fact_id uuid:=gen_random_uuid(); decision_id uuid:=gen_random_uuid(); relation_id uuid; v_scope_digest text; existing knowledge.command_idempotency%ROWTYPE; conflict_id uuid; current_row_version bigint;
BEGIN
  PERFORM knowledge.assert_scope(p_account_id,p_actor_id,p_deal_id);
  SELECT * INTO existing FROM knowledge.command_idempotency WHERE account_id=p_account_id AND actor_id=p_actor_id AND deal_id=p_deal_id AND command_type='accept_fact' AND key_hash=p_key_hash;
  IF FOUND THEN IF existing.request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE='23505'; END IF; RETURN jsonb_build_object('id',existing.result_id,'idempotent_replayed',true); END IF;
  SELECT * INTO claim_row FROM knowledge.claim WHERE id=p_claim_id AND account_id=p_account_id AND deal_id=p_deal_id;
  IF claim_row.id IS NULL THEN RAISE EXCEPTION 'claim_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF claim_row.purpose_code IS DISTINCT FROM p_purpose_code OR claim_row.scope IS DISTINCT FROM p_scope THEN RAISE EXCEPTION 'fact_scope_mismatch' USING ERRCODE='23514'; END IF;
  IF coalesce(cardinality(p_evidence_relationship_ids),0) < 1 THEN RAISE EXCEPTION 'fact_evidence_required' USING ERRCODE='23514'; END IF;
  IF cardinality(p_evidence_relationship_ids) <> (SELECT count(DISTINCT x) FROM unnest(p_evidence_relationship_ids) x) THEN RAISE EXCEPTION 'fact_evidence_invalid' USING ERRCODE='23514'; END IF;
  IF EXISTS (
    SELECT 1
    FROM unnest(p_evidence_relationship_ids) x
    WHERE NOT EXISTS (
      SELECT 1
      FROM knowledge.evidence_relationship er
      JOIN knowledge.evidence e ON e.id = er.evidence_id
      JOIN source.processing_coverage pc ON pc.source_record_id = e.source_record_id
      WHERE er.id = x
        AND er.account_id = p_account_id
        AND er.deal_id = p_deal_id
        AND er.claim_id = p_claim_id
        AND er.relationship_code = 'supports'
        AND lower(coalesce((SELECT rights_posture FROM source.source_record sr WHERE sr.id = e.source_record_id), 'allowed')) NOT IN ('blocked', 'withdrawn')
        AND lower(coalesce(pc.coverage_code, '')) NOT IN ('corrupt', 'unsupported', 'failed', 'original_bytes_only', 'insufficient', 'partial')
        AND lower(coalesce(pc.coverage_payload->>'parse_status', 'complete')) NOT IN ('failed', 'insufficient', 'unsupported', 'corrupt')
    )
  ) THEN RAISE EXCEPTION 'fact_evidence_invalid' USING ERRCODE='23514'; END IF;
  IF EXISTS (SELECT 1 FROM knowledge.conflict_claim cc JOIN knowledge.information_conflict c ON c.id=cc.conflict_id WHERE cc.claim_id=p_claim_id AND cc.account_id=p_account_id AND c.status_code='unresolved' AND c.affected_scope=p_scope) THEN RAISE EXCEPTION 'material_conflict_unresolved' USING ERRCODE='23514'; END IF;
  v_scope_digest := 'sha256:' || encode(extensions.digest(p_purpose_code || '|' || p_scope,'sha256'),'hex');
  SELECT fcs.row_version INTO current_row_version FROM knowledge.fact_current_selection fcs WHERE fcs.account_id=p_account_id AND fcs.claim_id=p_claim_id AND fcs.purpose_code=p_purpose_code AND fcs.scope_digest=v_scope_digest FOR UPDATE;
  IF p_expected_row_version IS NOT NULL AND (current_row_version IS NULL OR p_expected_row_version <> current_row_version) THEN RAISE EXCEPTION 'knowledge_version_conflict' USING ERRCODE='40001'; END IF;
  IF current_row_version IS NOT NULL AND p_expected_row_version IS NULL THEN RAISE EXCEPTION 'knowledge_version_conflict' USING ERRCODE='40001'; END IF;
  INSERT INTO knowledge.human_decision(id,account_id,deal_id,decision_type_code,controlled_object_id,controlled_object_version,question_text,selected_option_code,alternatives,contrary_evidence,rationale_text,scope,purpose_code,conditions,downstream_effect,decided_by_actor_id) VALUES (decision_id,p_account_id,p_deal_id,'fact_acceptance',p_claim_id::text,'claim-v1','Accept this exact Claim as a Fact for the stated purpose?','accept_fact',coalesce(p_alternatives,'[]'::jsonb),coalesce(p_contrary_evidence,'[]'::jsonb),p_rationale,p_scope,p_purpose_code,coalesce(p_conditions,'[]'::jsonb),jsonb_build_object('readiness','impact_assessment_required'),p_actor_id);
  INSERT INTO knowledge.fact(id,account_id,deal_id,claim_id,purpose_code,scope,proposition,definition,period,unit,currency,sign,value_text,qualification,acceptance_decision_id) VALUES (fact_id,p_account_id,p_deal_id,p_claim_id,p_purpose_code,p_scope,claim_row.proposition,claim_row.definition,claim_row.period,claim_row.unit,claim_row.currency,claim_row.sign,claim_row.value_text,'Accepted only for the exact stated scope.',decision_id);
  FOREACH relation_id IN ARRAY p_evidence_relationship_ids LOOP INSERT INTO knowledge.fact_evidence_basis(account_id,deal_id,fact_id,evidence_relationship_id,basis_role) VALUES (p_account_id,p_deal_id,fact_id,relation_id,'supporting'); INSERT INTO knowledge.human_decision_evidence(account_id,deal_id,decision_id,evidence_relationship_id) VALUES (p_account_id,p_deal_id,decision_id,relation_id); END LOOP;
  INSERT INTO knowledge.fact_acceptance_decision(decision_id,account_id,deal_id,claim_id,fact_id,evidence_relationship_digest) VALUES (decision_id,p_account_id,p_deal_id,p_claim_id,fact_id,'sha256:' || encode(extensions.digest(array_to_string(p_evidence_relationship_ids::text[],','),'sha256'),'hex'));
  INSERT INTO knowledge.fact_current_selection(account_id,deal_id,claim_id,purpose_code,scope_digest,current_fact_id,row_version) VALUES (p_account_id,p_deal_id,p_claim_id,p_purpose_code,v_scope_digest,fact_id,1) ON CONFLICT (account_id,claim_id,purpose_code,scope_digest) DO UPDATE SET current_fact_id=EXCLUDED.current_fact_id,row_version=knowledge.fact_current_selection.row_version+1,updated_at=clock_timestamp();
  INSERT INTO knowledge.command_idempotency(account_id,actor_id,deal_id,command_type,key_hash,request_digest,result_id) VALUES (p_account_id,p_actor_id,p_deal_id,'accept_fact',p_key_hash,p_request_digest,fact_id);
  PERFORM app.record_audit('fact_accepted','completed','fact',fact_id::text,'typed_human_decision',gen_random_uuid()::text);
  RETURN jsonb_build_object('id',fact_id,'type','Fact','claim_id',p_claim_id,'purpose',p_purpose_code,'scope',p_scope,'proposition',claim_row.proposition,'value',claim_row.value_text,'human_decision',jsonb_build_object('id',decision_id,'decision_type','fact_acceptance','selected_option_code','accept_fact'),'evidence_relationship_ids',to_jsonb(p_evidence_relationship_ids),'idempotent_replayed',false);
END $$;

CREATE OR REPLACE FUNCTION knowledge.approve_assumption(
  p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_assumption_id uuid,p_key_hash text,p_request_digest text,p_purpose_code text,p_scope text,p_allowed_uses jsonb,p_rationale text,p_alternatives jsonb,p_evidence_relationship_ids uuid[],p_conditions jsonb,p_invalidation_triggers jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = knowledge, app, pg_catalog AS $$
DECLARE assumption_row knowledge.assumption%ROWTYPE; decision_id uuid:=gen_random_uuid(); existing knowledge.command_idempotency%ROWTYPE; relation_id uuid;
BEGIN
  PERFORM knowledge.assert_scope(p_account_id,p_actor_id,p_deal_id);
  SELECT * INTO existing FROM knowledge.command_idempotency WHERE account_id=p_account_id AND actor_id=p_actor_id AND deal_id=p_deal_id AND command_type='approve_assumption' AND key_hash=p_key_hash;
  IF FOUND THEN IF existing.request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE='23505'; END IF; RETURN jsonb_build_object('id',existing.result_id,'idempotent_replayed',true); END IF;
  SELECT * INTO assumption_row FROM knowledge.assumption WHERE id=p_assumption_id AND account_id=p_account_id AND deal_id=p_deal_id;
  IF assumption_row.id IS NULL THEN RAISE EXCEPTION 'assumption_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(coalesce(p_evidence_relationship_ids,'{}'::uuid[])) x WHERE NOT EXISTS (SELECT 1 FROM knowledge.evidence_relationship er WHERE er.id=x AND er.account_id=p_account_id AND er.deal_id=p_deal_id)) THEN RAISE EXCEPTION 'decision_evidence_scope_mismatch' USING ERRCODE='42501'; END IF;
  INSERT INTO knowledge.human_decision(id,account_id,deal_id,decision_type_code,controlled_object_id,controlled_object_version,question_text,selected_option_code,alternatives,contrary_evidence,rationale_text,scope,purpose_code,conditions,downstream_effect,decided_by_actor_id) VALUES (decision_id,p_account_id,p_deal_id,'assumption_approval',p_assumption_id::text,'assumption-v1','Approve this Assumption for the stated use?','approve_assumption',coalesce(p_alternatives,'[]'::jsonb),'[]'::jsonb,p_rationale,p_scope,p_purpose_code,coalesce(p_conditions,'[]'::jsonb),jsonb_build_object('allowed_uses',coalesce(p_allowed_uses,'[]'::jsonb),'type_remains','Assumption'),p_actor_id);
  INSERT INTO knowledge.assumption_decision(decision_id,account_id,deal_id,assumption_id,allowed_uses,approved_bounds,review_triggers) VALUES (decision_id,p_account_id,p_deal_id,p_assumption_id,coalesce(p_allowed_uses,'[]'::jsonb),assumption_row.bounds,coalesce(p_invalidation_triggers,assumption_row.invalidation_triggers));
  FOREACH relation_id IN ARRAY coalesce(p_evidence_relationship_ids,'{}'::uuid[]) LOOP INSERT INTO knowledge.human_decision_evidence(account_id,deal_id,decision_id,evidence_relationship_id) VALUES (p_account_id,p_deal_id,decision_id,relation_id); END LOOP;
  INSERT INTO knowledge.command_idempotency(account_id,actor_id,deal_id,command_type,key_hash,request_digest,result_id) VALUES (p_account_id,p_actor_id,p_deal_id,'approve_assumption',p_key_hash,p_request_digest,decision_id);
  PERFORM app.record_audit('assumption_approved','completed','assumption',p_assumption_id::text,'typed_human_decision',gen_random_uuid()::text);
  RETURN jsonb_build_object('id',decision_id,'decision_type','assumption_approval','selected_option_code','approve_assumption','assumption',jsonb_build_object('id',p_assumption_id,'type','Assumption','status','approved','proposition',assumption_row.proposition,'value',assumption_row.value_text,'allowed_uses',coalesce(p_allowed_uses,'[]'::jsonb)),'idempotent_replayed',false);
END $$;

CREATE OR REPLACE FUNCTION knowledge.resolve_conflict(
  p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_conflict_id uuid,p_key_hash text,p_request_digest text,p_disposition_code text,p_scope text,p_rationale text,p_selected_claim_ids uuid[],p_evidence_relationship_ids uuid[],p_alternatives jsonb,p_expected_row_version bigint DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = knowledge, app, pg_catalog AS $$
DECLARE conflict_row knowledge.information_conflict%ROWTYPE; decision_id uuid:=gen_random_uuid(); disposition_id uuid:=gen_random_uuid(); existing knowledge.command_idempotency%ROWTYPE; relation_id uuid;
BEGIN
  PERFORM knowledge.assert_scope(p_account_id,p_actor_id,p_deal_id);
  SELECT * INTO existing FROM knowledge.command_idempotency WHERE account_id=p_account_id AND actor_id=p_actor_id AND deal_id=p_deal_id AND command_type='resolve_conflict' AND key_hash=p_key_hash;
  IF FOUND THEN IF existing.request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE='23505'; END IF; RETURN jsonb_build_object('id',existing.result_id,'idempotent_replayed',true); END IF;
  SELECT * INTO conflict_row FROM knowledge.information_conflict WHERE id=p_conflict_id AND account_id=p_account_id AND deal_id=p_deal_id FOR UPDATE;
  IF conflict_row.id IS NULL THEN RAISE EXCEPTION 'conflict_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF p_expected_row_version IS NOT NULL AND p_expected_row_version <> conflict_row.row_version THEN RAISE EXCEPTION 'knowledge_version_conflict' USING ERRCODE='40001'; END IF;
  IF p_scope IS DISTINCT FROM conflict_row.affected_scope THEN RAISE EXCEPTION 'conflict_resolution_scope_mismatch' USING ERRCODE='23514'; END IF;
  IF coalesce(cardinality(p_selected_claim_ids),0) < 2 OR cardinality(p_selected_claim_ids) <> (SELECT count(DISTINCT x) FROM unnest(p_selected_claim_ids) x) OR EXISTS (SELECT 1 FROM unnest(p_selected_claim_ids) x WHERE NOT EXISTS (SELECT 1 FROM knowledge.conflict_claim cc WHERE cc.conflict_id=p_conflict_id AND cc.claim_id=x AND cc.account_id=p_account_id)) THEN RAISE EXCEPTION 'conflict_selection_invalid' USING ERRCODE='23514'; END IF;
  IF p_disposition_code IN ('waive_rights_block','waive_cross_deal','waive_corrupt_file','waive_unsupported_fact','waive_deterministic_invariant') THEN RAISE EXCEPTION 'decision_cannot_waive_hard_block' USING ERRCODE='23514'; END IF;
  INSERT INTO knowledge.human_decision(id,account_id,deal_id,decision_type_code,controlled_object_id,controlled_object_version,question_text,selected_option_code,alternatives,contrary_evidence,rationale_text,scope,purpose_code,conditions,downstream_effect,decided_by_actor_id) VALUES (decision_id,p_account_id,p_deal_id,'conflict_resolution',p_conflict_id::text,conflict_row.row_version::text,'Resolve this material information conflict for the exact scope? ',p_disposition_code,coalesce(p_alternatives,'[]'::jsonb),'[]'::jsonb,p_rationale,p_scope,'conflict_resolution','[]'::jsonb,jsonb_build_object('selected_claim_ids',to_jsonb(p_selected_claim_ids),'readiness','affected_dependents_candidate'),p_actor_id);
  INSERT INTO knowledge.conflict_decision(decision_id,account_id,deal_id,conflict_id,selected_claim_ids) VALUES (decision_id,p_account_id,p_deal_id,p_conflict_id,to_jsonb(p_selected_claim_ids));
  INSERT INTO knowledge.conflict_disposition(id,account_id,deal_id,conflict_id,human_decision_id,disposition_code,scope,rationale,selected_claim_ids,evidence_relationship_ids) VALUES (disposition_id,p_account_id,p_deal_id,p_conflict_id,decision_id,p_disposition_code,p_scope,p_rationale,to_jsonb(p_selected_claim_ids),to_jsonb(p_evidence_relationship_ids));
  FOREACH relation_id IN ARRAY coalesce(p_evidence_relationship_ids,'{}'::uuid[]) LOOP IF NOT EXISTS (SELECT 1 FROM knowledge.evidence_relationship WHERE id=relation_id AND account_id=p_account_id AND deal_id=p_deal_id AND claim_id = ANY(p_selected_claim_ids)) THEN RAISE EXCEPTION 'decision_evidence_scope_mismatch' USING ERRCODE='42501'; END IF; INSERT INTO knowledge.human_decision_evidence(account_id,deal_id,decision_id,evidence_relationship_id) VALUES (p_account_id,p_deal_id,decision_id,relation_id); END LOOP;
  UPDATE knowledge.information_conflict SET status_code='resolved',row_version=row_version+1 WHERE id=p_conflict_id;
  INSERT INTO knowledge.command_idempotency(account_id,actor_id,deal_id,command_type,key_hash,request_digest,result_id) VALUES (p_account_id,p_actor_id,p_deal_id,'resolve_conflict',p_key_hash,p_request_digest,decision_id);
  PERFORM app.record_audit('conflict_resolved','completed','information_conflict',p_conflict_id::text,'typed_human_decision',gen_random_uuid()::text);
  RETURN jsonb_build_object('id',decision_id,'decision_type','conflict_resolution','conflict_id',p_conflict_id,'disposition_id',disposition_id,'selected_claim_ids',to_jsonb(p_selected_claim_ids),'status','resolved','row_version',conflict_row.row_version+1,'idempotent_replayed',false);
END $$;

CREATE OR REPLACE FUNCTION knowledge.correct_claim(
  p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_claim_id uuid,p_key_hash text,p_request_digest text,
  p_corrected_value text,p_corrected_proposition text,p_scope text,p_purpose_code text,p_reason text,p_evidence_relationship_ids uuid[],p_alternatives jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = knowledge, app, source, pg_catalog AS $$
DECLARE original knowledge.claim%ROWTYPE; corrected_id uuid:=gen_random_uuid(); decision_id uuid:=gen_random_uuid(); relation_id uuid; existing knowledge.command_idempotency%ROWTYPE; dependent_count integer:=0;
BEGIN
  PERFORM knowledge.assert_scope(p_account_id,p_actor_id,p_deal_id);
  SELECT * INTO existing FROM knowledge.command_idempotency WHERE account_id=p_account_id AND actor_id=p_actor_id AND deal_id=p_deal_id AND command_type='correct_claim' AND key_hash=p_key_hash;
  IF FOUND THEN IF existing.request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE='23505'; END IF; RETURN jsonb_build_object('id',existing.result_id,'idempotent_replayed',true); END IF;
  SELECT * INTO original FROM knowledge.claim WHERE id=p_claim_id AND account_id=p_account_id AND deal_id=p_deal_id;
  IF original.id IS NULL THEN RAISE EXCEPTION 'claim_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF cardinality(coalesce(p_evidence_relationship_ids,'{}'::uuid[])) < 1 THEN RAISE EXCEPTION 'correction_evidence_required' USING ERRCODE='23514'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_evidence_relationship_ids) x WHERE NOT EXISTS (SELECT 1 FROM knowledge.evidence_relationship er JOIN knowledge.evidence e ON e.id=er.evidence_id WHERE er.id=x AND er.account_id=p_account_id AND er.deal_id=p_deal_id AND er.claim_id=p_claim_id AND er.relationship_code='supports')) THEN RAISE EXCEPTION 'correction_evidence_invalid' USING ERRCODE='23514'; END IF;
  INSERT INTO knowledge.claim(id,account_id,deal_id,proposition,attribution,definition,period,unit,currency,sign,value_text,purpose_code,scope,origin_code,created_by_actor_id,corrects_claim_id)
    VALUES (corrected_id,p_account_id,p_deal_id,coalesce(p_corrected_proposition,original.proposition),original.attribution,original.definition,original.period,original.unit,original.currency,original.sign,p_corrected_value,p_purpose_code,p_scope,'correction',p_actor_id,p_claim_id);
  INSERT INTO knowledge.human_decision(id,account_id,deal_id,decision_type_code,controlled_object_id,controlled_object_version,question_text,selected_option_code,alternatives,contrary_evidence,rationale_text,scope,purpose_code,downstream_effect,decided_by_actor_id)
    VALUES (decision_id,p_account_id,p_deal_id,'correction',p_claim_id::text,'claim-v1','Correct the original Claim while preserving its immutable Origin?','accept_correction',coalesce(p_alternatives,'[]'::jsonb),'[]'::jsonb,p_reason,p_scope,p_purpose_code,jsonb_build_object('original_value',original.value_text,'original_origin',original.origin_code,'dependent_readiness','invalidated_until_review'),p_actor_id);
  FOREACH relation_id IN ARRAY p_evidence_relationship_ids LOOP INSERT INTO knowledge.human_decision_evidence(account_id,deal_id,decision_id,evidence_relationship_id) VALUES (p_account_id,p_deal_id,decision_id,relation_id); END LOOP;
  INSERT INTO knowledge.correction_dependency(account_id,deal_id,original_claim_id,corrected_claim_id,dependent_kind,dependent_id)
    SELECT p_account_id,p_deal_id,p_claim_id,corrected_id,'fact',f.id::text FROM knowledge.fact f WHERE f.claim_id=p_claim_id;
  GET DIAGNOSTICS dependent_count = ROW_COUNT;
  INSERT INTO knowledge.correction_dependency(account_id,deal_id,original_claim_id,corrected_claim_id,dependent_kind,dependent_id)
    SELECT p_account_id,p_deal_id,p_claim_id,corrected_id,'human_decision',f.acceptance_decision_id::text FROM knowledge.fact f WHERE f.claim_id=p_claim_id;
  INSERT INTO knowledge.command_idempotency(account_id,actor_id,deal_id,command_type,key_hash,request_digest,result_id) VALUES (p_account_id,p_actor_id,p_deal_id,'correct_claim',p_key_hash,p_request_digest,corrected_id);
  PERFORM app.record_audit('claim_corrected','completed','claim',corrected_id::text,'append_only_correction',gen_random_uuid()::text);
  RETURN jsonb_build_object('id',corrected_id,'type','Claim','origin','correction','corrects_claim_id',p_claim_id,'proposition',coalesce(p_corrected_proposition,original.proposition),'value',p_corrected_value,'purpose',p_purpose_code,'scope',p_scope,'human_decision',jsonb_build_object('id',decision_id,'decision_type','correction','selected_option_code','accept_correction'),'original',jsonb_build_object('id',p_claim_id,'value',original.value_text,'origin',original.origin_code),'dependent_candidates',coalesce((SELECT jsonb_agg(jsonb_build_object('kind',d.dependent_kind,'id',d.dependent_id,'impact_state',d.impact_state)) FROM knowledge.correction_dependency d WHERE d.corrected_claim_id=corrected_id),'[]'::jsonb),'dependent_count',dependent_count,'idempotent_replayed',false);
END $$;

CREATE OR REPLACE FUNCTION knowledge.get_evidence_projection(p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_evidence_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = knowledge, source, app, pg_catalog AS $$
SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.id,'type','Evidence','source_record_id',e.source_record_id,'representation_id',e.representation_id,'locator',l.selector,'locator_id',l.id,'context_digest',e.context_digest,'source_date',e.source_date,'source_scope',e.source_scope,'source_definition',e.source_definition,'accepted_origin',e.accepted_origin,'relationships',coalesce((SELECT jsonb_agg(jsonb_build_object('id',er.id,'claim_id',er.claim_id,'relationship',er.relationship_code,'supported_scope',er.supported_scope,'qualification',er.qualification,'limitation',er.limitation)) FROM knowledge.evidence_relationship er WHERE er.evidence_id=e.id),'[]'::jsonb),'dimensions',jsonb_build_object('extraction','complete','coverage',coalesce((SELECT pc.coverage_code FROM source.processing_coverage pc WHERE pc.source_record_id=e.source_record_id),'unknown'),'authority',coalesce((SELECT sr.authority_basis FROM source.source_record sr WHERE sr.id=e.source_record_id),'unknown'),'freshness','unassessed','conflict',CASE WHEN EXISTS (SELECT 1 FROM knowledge.evidence_relationship er JOIN knowledge.conflict_claim cc ON cc.claim_id=er.claim_id JOIN knowledge.information_conflict c ON c.id=cc.conflict_id WHERE er.evidence_id=e.id AND c.status_code='unresolved') THEN 'material_conflict' ELSE 'unassessed' END,'calculation','not_applicable','model','not_applicable','professional_judgment','not_assessed','intended_use','unbounded')) ORDER BY e.created_at) FILTER (WHERE e.id IS NOT NULL),'[]'::jsonb) FROM knowledge.evidence e JOIN knowledge.native_locator l ON l.id=e.native_locator_id WHERE e.account_id=p_account_id AND e.deal_id=p_deal_id AND (p_evidence_id IS NULL OR e.id=p_evidence_id) AND p_account_id=app.policy_account_id() AND p_actor_id=app.policy_actor_id() AND p_deal_id=app.policy_deal_id();
$$;

CREATE OR REPLACE FUNCTION knowledge.get_claim_projection(p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_claim_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = knowledge, app, pg_catalog AS $$
SELECT coalesce(jsonb_agg(jsonb_build_object('id',c.id,'type','Claim','origin',c.origin_code,'proposition',c.proposition,'attribution',c.attribution,'definition',c.definition,'period',c.period,'unit',c.unit,'currency',c.currency,'sign',c.sign,'value',c.value_text,'purpose',c.purpose_code,'scope',c.scope,'fact_count',(SELECT count(*) FROM knowledge.fact f WHERE f.claim_id=c.id),'corrects_claim_id',c.corrects_claim_id,'dependent_candidates',coalesce((SELECT jsonb_agg(jsonb_build_object('kind',d.dependent_kind,'id',d.dependent_id,'impact_state',d.impact_state)) FROM knowledge.correction_dependency d WHERE d.original_claim_id=c.id),'[]'::jsonb)) ORDER BY c.created_at) FILTER (WHERE c.id IS NOT NULL),'[]'::jsonb) FROM knowledge.claim c WHERE c.account_id=p_account_id AND c.deal_id=p_deal_id AND (p_claim_id IS NULL OR c.id=p_claim_id) AND p_account_id=app.policy_account_id() AND p_actor_id=app.policy_actor_id() AND p_deal_id=app.policy_deal_id();
$$;

CREATE OR REPLACE FUNCTION knowledge.get_fact_projection(p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_fact_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = knowledge, app, pg_catalog AS $$
SELECT coalesce(jsonb_agg(jsonb_build_object('id',f.id,'type','Fact','claim_id',f.claim_id,'purpose',f.purpose_code,'scope',f.scope,'proposition',f.proposition,'definition',f.definition,'period',f.period,'unit',f.unit,'currency',f.currency,'sign',f.sign,'value',f.value_text,'qualification',f.qualification,'acceptance_decision_id',f.acceptance_decision_id,'evidence_relationship_ids',coalesce((SELECT jsonb_agg(b.evidence_relationship_id) FROM knowledge.fact_evidence_basis b WHERE b.fact_id=f.id),'[]'::jsonb)) ORDER BY f.accepted_at) FILTER (WHERE f.id IS NOT NULL),'[]'::jsonb) FROM knowledge.fact f WHERE f.account_id=p_account_id AND f.deal_id=p_deal_id AND (p_fact_id IS NULL OR f.id=p_fact_id) AND p_account_id=app.policy_account_id() AND p_actor_id=app.policy_actor_id() AND p_deal_id=app.policy_deal_id();
$$;

CREATE OR REPLACE FUNCTION knowledge.get_assumption_projection(p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_assumption_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = knowledge, app, pg_catalog AS $$
SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'type','Assumption','status',CASE WHEN EXISTS (SELECT 1 FROM knowledge.assumption_decision ad WHERE ad.assumption_id=a.id) THEN 'approved' ELSE 'proposed' END,'origin',a.origin_code,'proposition',a.proposition,'value',a.value_text,'purpose',a.purpose_code,'scope',a.scope,'rationale',a.rationale,'bounds',a.bounds,'invalidation_triggers',a.invalidation_triggers,'approval_decision_id',(SELECT ad.decision_id FROM knowledge.assumption_decision ad WHERE ad.assumption_id=a.id ORDER BY ad.decision_id DESC LIMIT 1)) ORDER BY a.created_at) FILTER (WHERE a.id IS NOT NULL),'[]'::jsonb) FROM knowledge.assumption a WHERE a.account_id=p_account_id AND a.deal_id=p_deal_id AND (p_assumption_id IS NULL OR a.id=p_assumption_id) AND p_account_id=app.policy_account_id() AND p_actor_id=app.policy_actor_id() AND p_deal_id=app.policy_deal_id();
$$;

CREATE OR REPLACE FUNCTION knowledge.get_conflict_projection(p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_conflict_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = knowledge, app, pg_catalog AS $$
SELECT coalesce(jsonb_agg(jsonb_build_object('id',c.id,'type','InformationConflict','dimension',c.conflict_dimension,'affected_scope',c.affected_scope,'affected_uses',c.affected_uses,'status',c.status_code,'row_version',c.row_version,'claim_ids',coalesce((SELECT jsonb_agg(cc.claim_id) FROM knowledge.conflict_claim cc WHERE cc.conflict_id=c.id),'[]'::jsonb),'dispositions',coalesce((SELECT jsonb_agg(jsonb_build_object('id',d.id,'decision_id',d.human_decision_id,'code',d.disposition_code,'scope',d.scope,'rationale',d.rationale)) FROM knowledge.conflict_disposition d WHERE d.conflict_id=c.id),'[]'::jsonb)) ORDER BY c.created_at) FILTER (WHERE c.id IS NOT NULL),'[]'::jsonb) FROM knowledge.information_conflict c WHERE c.account_id=p_account_id AND c.deal_id=p_deal_id AND (p_conflict_id IS NULL OR c.id=p_conflict_id) AND p_account_id=app.policy_account_id() AND p_actor_id=app.policy_actor_id() AND p_deal_id=app.policy_deal_id();
$$;

CREATE OR REPLACE FUNCTION knowledge.get_decision_projection(p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_decision_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = knowledge, app, pg_catalog AS $$
SELECT coalesce(jsonb_agg(jsonb_build_object('id',d.id,'type','HumanDecision','decision_type',d.decision_type_code,'controlled_object_id',d.controlled_object_id,'controlled_object_version',d.controlled_object_version,'question',d.question_text,'selected_option_code',d.selected_option_code,'alternatives',d.alternatives,'contrary_evidence',d.contrary_evidence,'rationale',d.rationale_text,'scope',d.scope,'purpose',d.purpose_code,'conditions',d.conditions,'downstream_effect',d.downstream_effect,'decided_by_actor_id',d.decided_by_actor_id,'recorded_at',d.recorded_at) ORDER BY d.recorded_at) FILTER (WHERE d.id IS NOT NULL),'[]'::jsonb) FROM knowledge.human_decision d WHERE d.account_id=p_account_id AND d.deal_id=p_deal_id AND (p_decision_id IS NULL OR d.id=p_decision_id) AND p_account_id=app.policy_account_id() AND p_actor_id=app.policy_actor_id() AND p_deal_id=app.policy_deal_id();
$$;

REVOKE ALL ON FUNCTION knowledge.assert_scope(uuid,uuid,uuid), knowledge.accept_evidence(uuid,uuid,uuid,text,text,uuid,uuid,jsonb,text,text,text,text,text), knowledge.create_claim(uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,uuid,uuid), knowledge.create_assumption(uuid,uuid,uuid,text,text,text,text,text,text,text,jsonb,jsonb,text,uuid), knowledge.create_conflict(uuid,uuid,uuid,text,text,text,text,jsonb,uuid[]), knowledge.accept_claim_as_fact(uuid,uuid,uuid,uuid,text,text,uuid[],text,text,text,jsonb,jsonb,jsonb,bigint), knowledge.approve_assumption(uuid,uuid,uuid,uuid,text,text,text,text,jsonb,text,jsonb,uuid[],jsonb,jsonb), knowledge.resolve_conflict(uuid,uuid,uuid,uuid,text,text,text,text,text,uuid[],uuid[],jsonb,bigint), knowledge.correct_claim(uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,uuid[],jsonb), knowledge.get_evidence_projection(uuid,uuid,uuid,uuid), knowledge.get_claim_projection(uuid,uuid,uuid,uuid), knowledge.get_fact_projection(uuid,uuid,uuid,uuid), knowledge.get_assumption_projection(uuid,uuid,uuid,uuid), knowledge.get_conflict_projection(uuid,uuid,uuid,uuid), knowledge.get_decision_projection(uuid,uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION knowledge.assert_scope(uuid,uuid,uuid), knowledge.accept_evidence(uuid,uuid,uuid,text,text,uuid,uuid,jsonb,text,text,text,text,text), knowledge.create_claim(uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,uuid,uuid), knowledge.create_assumption(uuid,uuid,uuid,text,text,text,text,text,text,text,jsonb,jsonb,text,uuid), knowledge.create_conflict(uuid,uuid,uuid,text,text,text,text,jsonb,uuid[]), knowledge.accept_claim_as_fact(uuid,uuid,uuid,uuid,text,text,uuid[],text,text,text,jsonb,jsonb,jsonb,bigint), knowledge.approve_assumption(uuid,uuid,uuid,uuid,text,text,text,text,jsonb,text,jsonb,uuid[],jsonb,jsonb), knowledge.resolve_conflict(uuid,uuid,uuid,uuid,text,text,text,text,text,uuid[],uuid[],jsonb,bigint), knowledge.correct_claim(uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,uuid[],jsonb), knowledge.get_evidence_projection(uuid,uuid,uuid,uuid), knowledge.get_claim_projection(uuid,uuid,uuid,uuid), knowledge.get_fact_projection(uuid,uuid,uuid,uuid), knowledge.get_assumption_projection(uuid,uuid,uuid,uuid), knowledge.get_conflict_projection(uuid,uuid,uuid,uuid), knowledge.get_decision_projection(uuid,uuid,uuid,uuid) TO app_runtime;
REVOKE ALL ON FUNCTION knowledge.prevent_immutable_mutation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION knowledge.prevent_immutable_mutation() TO app_knowledge_owner;
ALTER FUNCTION knowledge.prevent_immutable_mutation() OWNER TO app_knowledge_owner;
GRANT CREATE ON SCHEMA knowledge TO app_knowledge_owner;
ALTER FUNCTION knowledge.assert_scope(uuid,uuid,uuid) OWNER TO app_knowledge_owner;
ALTER FUNCTION knowledge.accept_evidence(uuid,uuid,uuid,text,text,uuid,uuid,jsonb,text,text,text,text,text) OWNER TO app_knowledge_owner;
ALTER FUNCTION knowledge.create_claim(uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,uuid,uuid) OWNER TO app_knowledge_owner;
ALTER FUNCTION knowledge.create_assumption(uuid,uuid,uuid,text,text,text,text,text,text,text,jsonb,jsonb,text,uuid) OWNER TO app_knowledge_owner;
ALTER FUNCTION knowledge.create_conflict(uuid,uuid,uuid,text,text,text,text,jsonb,uuid[]) OWNER TO app_knowledge_owner;
ALTER FUNCTION knowledge.accept_claim_as_fact(uuid,uuid,uuid,uuid,text,text,uuid[],text,text,text,jsonb,jsonb,jsonb,bigint) OWNER TO app_knowledge_owner;
ALTER FUNCTION knowledge.approve_assumption(uuid,uuid,uuid,uuid,text,text,text,text,jsonb,text,jsonb,uuid[],jsonb,jsonb) OWNER TO app_knowledge_owner;
ALTER FUNCTION knowledge.resolve_conflict(uuid,uuid,uuid,uuid,text,text,text,text,text,uuid[],uuid[],jsonb,bigint) OWNER TO app_knowledge_owner;
ALTER FUNCTION knowledge.correct_claim(uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,uuid[],jsonb) OWNER TO app_knowledge_owner;
ALTER FUNCTION knowledge.get_evidence_projection(uuid,uuid,uuid,uuid) OWNER TO app_knowledge_owner;
ALTER FUNCTION knowledge.get_claim_projection(uuid,uuid,uuid,uuid) OWNER TO app_knowledge_owner;
ALTER FUNCTION knowledge.get_fact_projection(uuid,uuid,uuid,uuid) OWNER TO app_knowledge_owner;
ALTER FUNCTION knowledge.get_assumption_projection(uuid,uuid,uuid,uuid) OWNER TO app_knowledge_owner;
ALTER FUNCTION knowledge.get_conflict_projection(uuid,uuid,uuid,uuid) OWNER TO app_knowledge_owner;
ALTER FUNCTION knowledge.get_decision_projection(uuid,uuid,uuid,uuid) OWNER TO app_knowledge_owner;
REVOKE CREATE ON SCHEMA knowledge FROM app_knowledge_owner;
