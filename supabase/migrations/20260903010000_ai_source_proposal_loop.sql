-- Governed AI source proposals. The AI domain stores immutable runs and
-- proposal-only results; no model-authored value can become domain authority.
CREATE SCHEMA IF NOT EXISTS ai;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_ai_owner') THEN
    CREATE ROLE app_ai_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
  ELSE
    ALTER ROLE app_ai_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
  END IF;
END $$;

GRANT app_ai_owner TO postgres;
GRANT USAGE ON SCHEMA app, source, jobs, ai TO app_ai_owner;
-- Managed Supabase's non-superuser `postgres` role requires the target owner
-- to hold CREATE on the containing schema during ownership transfer.
GRANT CREATE ON SCHEMA ai TO app_ai_owner;
GRANT EXECUTE ON FUNCTION app.policy_account_id(), app.policy_actor_id(), app.policy_deal_id(), app.record_audit(text,text,text,text,text,text) TO app_ai_owner;

CREATE UNIQUE INDEX IF NOT EXISTS source_representation_account_id_uq ON source.source_representation(account_id, id);

-- Pre-issued, immutable source fragments are the only Evidence references an
-- AI Run may use. Content is Deal-scoped data and is never returned by a run
-- projection or written to telemetry.
CREATE TABLE IF NOT EXISTS source.source_fragment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  source_record_id uuid NOT NULL REFERENCES source.source_record(id),
  representation_id uuid NOT NULL REFERENCES source.source_representation(id),
  locator jsonb NOT NULL,
  content_text text NOT NULL CHECK (length(content_text) BETWEEN 1 AND 200000),
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^sha256:[a-f0-9]{64}$'),
  coverage_code text NOT NULL DEFAULT 'parsed',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, id),
  UNIQUE (representation_id, locator),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, source_record_id) REFERENCES source.source_record(account_id, id),
  FOREIGN KEY (account_id, representation_id) REFERENCES source.source_representation(account_id, id)
);

CREATE TABLE IF NOT EXISTS ai.task_definition (
  task_definition text PRIMARY KEY CHECK (task_definition IN ('source_claim_extraction','claim_evidence_linking','material_source_conflict_analysis','contract_repair')),
  task_family text NOT NULL,
  task_definition_version text NOT NULL,
  input_contract_version text NOT NULL,
  output_contract_version text NOT NULL,
  logical_model_role text NOT NULL,
  lifecycle_status text NOT NULL CHECK (lifecycle_status IN ('draft','candidate','enabled','suspended','retired')),
  manifest_digest text NOT NULL CHECK (manifest_digest ~ '^sha256:[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_definition, task_definition_version)
);

CREATE TABLE IF NOT EXISTS ai.prompt_package (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_definition text NOT NULL REFERENCES ai.task_definition(task_definition),
  package_version text NOT NULL,
  prompt_digest text NOT NULL CHECK (prompt_digest ~ '^sha256:[a-f0-9]{64}$'),
  input_schema_digest text NOT NULL CHECK (input_schema_digest ~ '^sha256:[a-f0-9]{64}$'),
  output_schema_digest text NOT NULL CHECK (output_schema_digest ~ '^sha256:[a-f0-9]{64}$'),
  context_plan_version text NOT NULL,
  ai_evidence_policy_version text NOT NULL,
  lifecycle_status text NOT NULL CHECK (lifecycle_status IN ('draft','candidate','enabled','suspended','retired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_definition, package_version)
);

CREATE TABLE IF NOT EXISTS ai.provider_capability_profile (
  id text PRIMARY KEY,
  provider_code text NOT NULL CHECK (provider_code = 'hellox'),
  profile_version text NOT NULL,
  capability_verified boolean NOT NULL DEFAULT false,
  processing_evidence_verified boolean NOT NULL DEFAULT false,
  restricted_approved boolean NOT NULL DEFAULT false,
  environment_code text NOT NULL CHECK (environment_code IN ('local','development','production')),
  endpoint_digest text,
  model_contract jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  lifecycle_status text NOT NULL CHECK (lifecycle_status IN ('candidate','enabled','suspended','retired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_code, profile_version, environment_code)
);

CREATE TABLE IF NOT EXISTS ai.task_enablement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_definition text NOT NULL REFERENCES ai.task_definition(task_definition),
  task_definition_version text NOT NULL,
  prompt_package_id uuid NOT NULL REFERENCES ai.prompt_package(id),
  provider_profile_id text NOT NULL REFERENCES ai.provider_capability_profile(id),
  environment_code text NOT NULL CHECK (environment_code IN ('local','development','production')),
  provenance_class text NOT NULL CHECK (provenance_class IN ('synthetic','real')),
  confidentiality_class text NOT NULL CHECK (confidentiality_class IN ('public','internal','confidential','restricted')),
  status_code text NOT NULL CHECK (status_code IN ('enabled','suspended','retired')),
  reason text NOT NULL,
  enabled_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_definition, task_definition_version, provider_profile_id, environment_code, provenance_class, confidentiality_class)
);

CREATE TABLE IF NOT EXISTS ai.run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  job_id uuid NOT NULL,
  job_scope_id uuid NOT NULL,
  packet_version_id uuid NOT NULL REFERENCES source.source_packet_version(id),
  work_objective_id uuid REFERENCES app.work_objective(id),
  task_definition text NOT NULL REFERENCES ai.task_definition(task_definition),
  task_definition_version text NOT NULL,
  prompt_package_id uuid NOT NULL REFERENCES ai.prompt_package(id),
  provider_profile_id text NOT NULL REFERENCES ai.provider_capability_profile(id),
  provenance_class text NOT NULL CHECK (provenance_class IN ('synthetic','real')),
  confidentiality_class text NOT NULL CHECK (confidentiality_class IN ('public','internal','confidential','restricted')),
  de_identification_posture text NOT NULL,
  scope_digest text NOT NULL CHECK (scope_digest ~ '^sha256:[a-f0-9]{64}$'),
  canonical_input_digest text NOT NULL CHECK (canonical_input_digest ~ '^sha256:[a-f0-9]{64}$'),
  request_digest text NOT NULL CHECK (request_digest ~ '^sha256:[a-f0-9]{64}$'),
  request_nonce text NOT NULL,
  outcome_class text NOT NULL CHECK (outcome_class IN ('queued','running','succeeded','business_abstention','policy_block','contract_failure','provider_failure')),
  status_code text NOT NULL CHECK (status_code IN ('queued','running','completed','failed','abstained')),
  provider_request_id text,
  model_code text,
  usage jsonb NOT NULL DEFAULT '{}'::jsonb,
  cost_minor_units integer CHECK (cost_minor_units IS NULL OR cost_minor_units >= 0),
  latency_ms integer CHECK (latency_ms IS NULL OR latency_ms >= 0),
  raw_request_ciphertext bytea,
  raw_response_ciphertext bytea,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (account_id, id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, packet_version_id) REFERENCES source.source_packet_version(account_id, id),
  FOREIGN KEY (account_id, work_objective_id) REFERENCES app.work_objective(account_id, id)
);

CREATE TABLE IF NOT EXISTS ai.run_fragment (
  run_id uuid NOT NULL REFERENCES ai.run(id),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  fragment_id uuid NOT NULL REFERENCES source.source_fragment(id),
  source_record_id uuid NOT NULL REFERENCES source.source_record(id),
  representation_id uuid NOT NULL REFERENCES source.source_representation(id),
  locator jsonb NOT NULL,
  content_digest text NOT NULL,
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  PRIMARY KEY (run_id, fragment_id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id)
);

CREATE TABLE IF NOT EXISTS ai.proposal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  run_id uuid NOT NULL REFERENCES ai.run(id),
  candidate_key text NOT NULL CHECK (candidate_key ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$'),
  proposal_kind text NOT NULL CHECK (proposal_kind IN ('claim','evidence_link','conflict')),
  schema_version text NOT NULL,
  payload jsonb NOT NULL,
  payload_digest text NOT NULL CHECK (payload_digest ~ '^sha256:[a-f0-9]{64}$'),
  support_status text NOT NULL CHECK (support_status IN ('supported','challenged','conflicted','insufficient_support','unresolved_locator','coverage_incomplete','rights_blocked','out_of_scope','not_applicable')),
  evidence_candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
  limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
  unsupported_states jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_human_decision jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, candidate_key),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  CHECK (NOT (payload ? 'fact_id') AND NOT (payload ? 'decision_id') AND NOT (payload ? 'readiness') AND NOT (payload ? 'external_action') AND NOT (payload ? 'professional_usability'))
);

CREATE TABLE IF NOT EXISTS ai.conflict_proposal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  run_id uuid NOT NULL REFERENCES ai.run(id),
  proposal_id uuid NOT NULL UNIQUE REFERENCES ai.proposal(id),
  conflict_key text NOT NULL,
  dimension text NOT NULL CHECK (dimension IN ('definition','period','unit','currency','sign','value','source_version','scope','meaning')),
  competing_refs jsonb NOT NULL,
  affected_scope text NOT NULL,
  unresolved_alternatives jsonb NOT NULL,
  affected_uses jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id)
);

CREATE TABLE IF NOT EXISTS ai.abstention (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  run_id uuid NOT NULL REFERENCES ai.run(id),
  abstention_key text NOT NULL,
  affected_scope text NOT NULL,
  reason_codes jsonb NOT NULL,
  unsupported_propositions jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_inputs jsonb NOT NULL DEFAULT '[]'::jsonb,
  output_ceiling jsonb NOT NULL DEFAULT '{}'::jsonb,
  permitted_partial_scope jsonb NOT NULL DEFAULT '[]'::jsonb,
  smallest_recovery_action text NOT NULL,
  resume_condition text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, abstention_key),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id)
);

CREATE TABLE IF NOT EXISTS ai.run_validation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  run_id uuid NOT NULL REFERENCES ai.run(id),
  stage text NOT NULL CHECK (stage IN ('schema','domain','locator','deterministic','permission','repair')),
  code text NOT NULL,
  json_pointer text,
  outcome text NOT NULL CHECK (outcome IN ('passed','failed','rejected')),
  normalized_digest text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id)
);

CREATE TABLE IF NOT EXISTS ai.run_retry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  run_id uuid NOT NULL REFERENCES ai.run(id),
  retry_ordinal integer NOT NULL CHECK (retry_ordinal BETWEEN 1 AND 2),
  retry_kind text NOT NULL CHECK (retry_kind IN ('transient_provider','contract_repair')),
  reason_code text NOT NULL,
  provider_request_id text,
  outcome text NOT NULL CHECK (outcome IN ('queued','succeeded','failed','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, retry_ordinal),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id)
);

CREATE TABLE IF NOT EXISTS ai.command_idempotency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  command_type text NOT NULL CHECK (command_type IN ('start_ai_run','retry_ai_run')),
  key_hash text NOT NULL,
  request_digest text NOT NULL,
  run_id uuid NOT NULL REFERENCES ai.run(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, actor_id, command_type, key_hash)
);

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['source_fragment'] LOOP
    EXECUTE format('ALTER TABLE source.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE source.%I FORCE ROW LEVEL SECURITY', table_name);
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['task_definition','prompt_package','provider_capability_profile','task_enablement','run','run_fragment','proposal','conflict_proposal','abstention','run_validation','run_retry','command_idempotency'] LOOP
    EXECUTE format('ALTER TABLE ai.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE ai.%I FORCE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'source_fragment_scope' AND polrelid = 'source.source_fragment'::regclass) THEN
    CREATE POLICY source_fragment_scope ON source.source_fragment FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'ai_run_scope' AND polrelid = 'ai.run'::regclass) THEN
    CREATE POLICY ai_run_scope ON ai.run FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY ai_run_fragment_scope ON ai.run_fragment FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY ai_proposal_scope ON ai.proposal FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY ai_conflict_scope ON ai.conflict_proposal FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY ai_abstention_scope ON ai.abstention FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY ai_validation_scope ON ai.run_validation FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY ai_retry_scope ON ai.run_retry FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY ai_idempotency_scope ON ai.command_idempotency FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY ai_task_definition_public ON ai.task_definition FOR SELECT TO app_runtime USING (true);
    CREATE POLICY ai_prompt_package_public ON ai.prompt_package FOR SELECT TO app_runtime USING (true);
    CREATE POLICY ai_provider_profile_public ON ai.provider_capability_profile FOR SELECT TO app_runtime USING (true);
    CREATE POLICY ai_enablement_public ON ai.task_enablement FOR SELECT TO app_runtime USING (true);
  END IF;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA ai FROM app_runtime;
GRANT SELECT ON ai.task_definition, ai.prompt_package, ai.provider_capability_profile, ai.task_enablement, ai.run, ai.run_fragment, ai.proposal, ai.conflict_proposal, ai.abstention, ai.run_validation, ai.run_retry, ai.command_idempotency TO app_runtime;
GRANT SELECT ON source.source_fragment TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ai TO app_ai_owner;
GRANT SELECT, INSERT ON source.source_fragment TO app_ai_owner;
GRANT USAGE ON SCHEMA ai TO app_runtime;

CREATE OR REPLACE FUNCTION ai.prevent_immutable_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'ai_object_immutable' USING ERRCODE='23514'; END $$;
DROP TRIGGER IF EXISTS ai_run_immutable ON ai.run;
CREATE TRIGGER ai_run_immutable BEFORE UPDATE OR DELETE ON ai.run FOR EACH ROW EXECUTE FUNCTION ai.prevent_immutable_mutation();
DROP TRIGGER IF EXISTS ai_proposal_immutable ON ai.proposal;
CREATE TRIGGER ai_proposal_immutable BEFORE UPDATE OR DELETE ON ai.proposal FOR EACH ROW EXECUTE FUNCTION ai.prevent_immutable_mutation();
DROP TRIGGER IF EXISTS ai_fragment_immutable ON source.source_fragment;
CREATE TRIGGER ai_fragment_immutable BEFORE UPDATE OR DELETE ON source.source_fragment FOR EACH ROW EXECUTE FUNCTION ai.prevent_immutable_mutation();

INSERT INTO ai.task_definition(task_definition,task_family,task_definition_version,input_contract_version,output_contract_version,logical_model_role,lifecycle_status,manifest_digest)
VALUES
 ('source_claim_extraction','source_semantic_extraction','1.0.0','1.0.0','1.0.0','structured_extraction','enabled','sha256:0000000000000000000000000000000000000000000000000000000000000000'),
 ('claim_evidence_linking','evidence_relationship_proposal','1.0.0','1.0.0','1.0.0','structured_extraction','enabled','sha256:0000000000000000000000000000000000000000000000000000000000000000'),
 ('material_source_conflict_analysis','source_conflict_analysis','1.0.0','1.0.0','1.0.0','reasoning_primary','enabled','sha256:0000000000000000000000000000000000000000000000000000000000000000'),
 ('contract_repair','contract_repair','1.0.0','1.0.0','1.0.0','contract_repair','enabled','sha256:0000000000000000000000000000000000000000000000000000000000000000')
ON CONFLICT (task_definition) DO NOTHING;

INSERT INTO ai.provider_capability_profile(id,provider_code,profile_version,environment_code,lifecycle_status)
VALUES ('hellox-source-proposals-v1','hellox','1.0.0','local','candidate'),
       ('hellox-source-proposals-v1-development','hellox','1.0.0','development','candidate'),
       ('hellox-source-proposals-v1-production','hellox','1.0.0','production','candidate')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ai.prompt_package(task_definition,package_version,prompt_digest,input_schema_digest,output_schema_digest,context_plan_version,ai_evidence_policy_version,lifecycle_status)
SELECT t.task_definition,'1.0.0',
       'sha256:0000000000000000000000000000000000000000000000000000000000000000',
       'sha256:0000000000000000000000000000000000000000000000000000000000000000',
       'sha256:0000000000000000000000000000000000000000000000000000000000000000',
       '1.0.0','1.0.0','enabled'
FROM ai.task_definition t
WHERE NOT EXISTS (SELECT 1 FROM ai.prompt_package p WHERE p.task_definition=t.task_definition AND p.package_version='1.0.0');

INSERT INTO ai.task_enablement(task_definition,task_definition_version,prompt_package_id,provider_profile_id,environment_code,provenance_class,confidentiality_class,status_code,reason,enabled_at)
SELECT t.task_definition,t.task_definition_version,p.id,'hellox-source-proposals-v1','local','synthetic',c,'enabled','Synthetic local provider double; proposal-only source loop',clock_timestamp()
FROM ai.task_definition t JOIN ai.prompt_package p ON p.task_definition=t.task_definition AND p.package_version='1.0.0'
CROSS JOIN unnest(ARRAY['public','internal']::text[]) c
WHERE NOT EXISTS (SELECT 1 FROM ai.task_enablement e WHERE e.task_definition=t.task_definition AND e.task_definition_version=t.task_definition_version AND e.provider_profile_id='hellox-source-proposals-v1' AND e.environment_code='local' AND e.provenance_class='synthetic' AND e.confidentiality_class=c);

CREATE OR REPLACE FUNCTION ai.start_run(
  p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_job_id uuid, p_job_scope_id uuid,
  p_packet_version_id uuid, p_work_objective_id uuid, p_task_definition text,
  p_task_definition_version text, p_prompt_package_id uuid, p_provider_profile_id text,
  p_provenance_class text, p_confidentiality_class text, p_de_identification_posture text,
  p_scope_digest text, p_canonical_input_digest text, p_request_digest text, p_request_nonce text,
  p_key_hash text, p_material_capability_verified boolean, p_processing_evidence_verified boolean,
  p_restricted_approved boolean
) RETURNS TABLE(run_id uuid, idempotent_replayed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ai, source, app, pg_catalog AS $$
DECLARE existing ai.command_idempotency%ROWTYPE; new_id uuid := gen_random_uuid();
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN RAISE EXCEPTION 'ai_scope_mismatch' USING ERRCODE='42501'; END IF;
  SELECT * INTO existing FROM ai.command_idempotency WHERE account_id=p_account_id AND actor_id=p_actor_id AND deal_id=p_deal_id AND command_type='start_ai_run' AND key_hash=p_key_hash;
  IF FOUND THEN
    IF existing.request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE='23505'; END IF;
    RETURN QUERY SELECT existing.run_id, true; RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM source.source_packet_version v WHERE v.id=p_packet_version_id AND v.account_id=p_account_id AND v.deal_id=p_deal_id) THEN RAISE EXCEPTION 'ai_packet_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF p_work_objective_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM app.work_objective o WHERE o.id=p_work_objective_id AND o.account_id=p_account_id AND o.deal_id=p_deal_id AND o.packet_version_id=p_packet_version_id) THEN RAISE EXCEPTION 'ai_objective_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF p_provider_profile_id NOT LIKE 'hellox%' THEN RAISE EXCEPTION 'ai_provider_not_allowed' USING ERRCODE='42501'; END IF;
  IF p_confidentiality_class IN ('confidential','restricted') AND (NOT p_material_capability_verified OR NOT p_processing_evidence_verified OR (p_confidentiality_class='restricted' AND NOT p_restricted_approved)) THEN RAISE EXCEPTION 'ai_provider_capability_blocked' USING ERRCODE='42501'; END IF;
  INSERT INTO ai.run(id,account_id,deal_id,actor_id,job_id,job_scope_id,packet_version_id,work_objective_id,task_definition,task_definition_version,prompt_package_id,provider_profile_id,provenance_class,confidentiality_class,de_identification_posture,scope_digest,canonical_input_digest,request_digest,request_nonce,outcome_class,status_code)
  VALUES (new_id,p_account_id,p_deal_id,p_actor_id,p_job_id,p_job_scope_id,p_packet_version_id,p_work_objective_id,p_task_definition,p_task_definition_version,p_prompt_package_id,p_provider_profile_id,p_provenance_class,p_confidentiality_class,p_de_identification_posture,p_scope_digest,p_canonical_input_digest,p_request_digest,p_request_nonce,'queued','queued');
  INSERT INTO ai.command_idempotency(account_id,actor_id,deal_id,command_type,key_hash,request_digest,run_id) VALUES (p_account_id,p_actor_id,p_deal_id,'start_ai_run',p_key_hash,p_request_digest,new_id);
  PERFORM app.record_audit('ai_run_started','completed','ai_run',new_id::text,'proposal_only',gen_random_uuid()::text);
  RETURN QUERY SELECT new_id, false;
END $$;

CREATE OR REPLACE FUNCTION ai.attach_run_fragments(p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_run_id uuid,p_fragments jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ai, source, app, pg_catalog AS $$
DECLARE item jsonb; run_row ai.run%ROWTYPE; fragment_row source.source_fragment%ROWTYPE; ordinal integer := 0;
BEGIN
  SELECT * INTO run_row FROM ai.run WHERE id=p_run_id AND account_id=p_account_id AND deal_id=p_deal_id FOR UPDATE;
  IF NOT FOUND OR p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN RAISE EXCEPTION 'ai_run_scope_mismatch' USING ERRCODE='42501'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(coalesce(p_fragments,'[]'::jsonb)) LOOP
    SELECT * INTO fragment_row FROM source.source_fragment WHERE id=(item->>'fragment_id')::uuid AND account_id=p_account_id AND deal_id=p_deal_id;
    IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM source.source_packet_member m WHERE m.packet_version_id=run_row.packet_version_id AND m.source_record_id=fragment_row.source_record_id) THEN RAISE EXCEPTION 'ai_fragment_not_in_packet' USING ERRCODE='42501'; END IF;
    INSERT INTO ai.run_fragment(run_id,account_id,deal_id,fragment_id,source_record_id,representation_id,locator,content_digest,ordinal) VALUES (p_run_id,p_account_id,p_deal_id,fragment_row.id,fragment_row.source_record_id,fragment_row.representation_id,fragment_row.locator,fragment_row.content_sha256,ordinal) ON CONFLICT DO NOTHING;
    ordinal := ordinal + 1;
  END LOOP;
  UPDATE ai.run SET status_code='running', outcome_class='running' WHERE id=p_run_id;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION ai.complete_run(
  p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_run_id uuid,p_status_code text,p_outcome_class text,
  p_proposals jsonb,p_abstentions jsonb,p_validations jsonb,p_raw_request_ciphertext bytea,p_raw_response_ciphertext bytea,
  p_provider_request_id text,p_model_code text,p_usage jsonb,p_cost_minor_units integer,p_latency_ms integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ai, source, app, pg_catalog AS $$
DECLARE run_row ai.run%ROWTYPE; item jsonb; validation jsonb; proposal_id uuid; conflict_payload jsonb;
BEGIN
  SELECT * INTO run_row FROM ai.run WHERE id=p_run_id AND account_id=p_account_id AND deal_id=p_deal_id FOR UPDATE;
  IF NOT FOUND OR p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN RAISE EXCEPTION 'ai_run_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF run_row.status_code IN ('completed','failed','abstained') THEN RETURN jsonb_build_object('run_id',p_run_id,'replayed',true); END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(coalesce(p_proposals,'[]'::jsonb)) LOOP
    proposal_id := gen_random_uuid();
    IF coalesce(item->>'proposal_kind','') NOT IN ('claim','evidence_link','conflict') THEN RAISE EXCEPTION 'ai_proposal_kind_invalid' USING ERRCODE='22023'; END IF;
    INSERT INTO ai.proposal(id,account_id,deal_id,run_id,candidate_key,proposal_kind,schema_version,payload,payload_digest,support_status,evidence_candidates,limitations,unsupported_states,required_human_decision)
      VALUES (proposal_id,p_account_id,p_deal_id,p_run_id,item->>'candidate_key',item->>'proposal_kind',item->>'schema_version',item->'payload',item->>'payload_digest',item->>'support_status',coalesce(item->'evidence_candidates','[]'::jsonb),coalesce(item->'limitations','[]'::jsonb),coalesce(item->'unsupported_states','[]'::jsonb),item->'required_human_decision');
    conflict_payload := item->'conflict';
    IF conflict_payload IS NOT NULL AND jsonb_typeof(conflict_payload)='object' THEN
      INSERT INTO ai.conflict_proposal(account_id,deal_id,run_id,proposal_id,conflict_key,dimension,competing_refs,affected_scope,unresolved_alternatives,affected_uses)
      VALUES (p_account_id,p_deal_id,p_run_id,proposal_id,conflict_payload->>'conflict_key',conflict_payload->>'dimension',coalesce(conflict_payload->'competing_refs','[]'::jsonb),conflict_payload->>'affected_scope',coalesce(conflict_payload->'unresolved_alternatives','[]'::jsonb),coalesce(conflict_payload->'affected_uses','[]'::jsonb));
    END IF;
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(coalesce(p_abstentions,'[]'::jsonb)) LOOP
    INSERT INTO ai.abstention(account_id,deal_id,run_id,abstention_key,affected_scope,reason_codes,unsupported_propositions,missing_inputs,output_ceiling,permitted_partial_scope,smallest_recovery_action,resume_condition)
      VALUES (p_account_id,p_deal_id,p_run_id,item->>'abstention_key',item->>'affected_scope',coalesce(item->'reason_codes','[]'::jsonb),coalesce(item->'unsupported_propositions','[]'::jsonb),coalesce(item->'missing_inputs','[]'::jsonb),coalesce(item->'output_ceiling','{}'::jsonb),coalesce(item->'permitted_partial_scope','[]'::jsonb),item->>'smallest_recovery_action',item->>'resume_condition');
  END LOOP;
  FOR validation IN SELECT value FROM jsonb_array_elements(coalesce(p_validations,'[]'::jsonb)) LOOP
    INSERT INTO ai.run_validation(account_id,deal_id,run_id,stage,code,json_pointer,outcome,normalized_digest) VALUES (p_account_id,p_deal_id,p_run_id,validation->>'stage',validation->>'code',validation->>'json_pointer',validation->>'outcome',validation->>'normalized_digest');
  END LOOP;
  UPDATE ai.run SET status_code=p_status_code,outcome_class=p_outcome_class,raw_request_ciphertext=p_raw_request_ciphertext,raw_response_ciphertext=p_raw_response_ciphertext,provider_request_id=p_provider_request_id,model_code=p_model_code,usage=coalesce(p_usage,'{}'::jsonb),cost_minor_units=p_cost_minor_units,latency_ms=p_latency_ms,completed_at=clock_timestamp() WHERE id=p_run_id;
  PERFORM app.record_audit('ai_run_completed','completed','ai_run',p_run_id::text,p_outcome_class,gen_random_uuid()::text);
  RETURN jsonb_build_object('run_id',p_run_id,'replayed',false,'status',p_status_code,'outcome',p_outcome_class);
END $$;

CREATE OR REPLACE FUNCTION ai.get_run_projection(p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_run_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = ai, source, app, pg_catalog AS $$
SELECT CASE WHEN r.id IS NULL THEN NULL ELSE jsonb_build_object(
  'id',r.id,'account_id',r.account_id,'deal_id',r.deal_id,'job_id',r.job_id,'job_scope_id',r.job_scope_id,
  'packet_version_id',r.packet_version_id,'work_objective_id',r.work_objective_id,'task_definition',r.task_definition,
  'task_definition_version',r.task_definition_version,'prompt_package_id',r.prompt_package_id,'provider_profile_id',r.provider_profile_id,
  'scope_digest',r.scope_digest,'canonical_input_digest',r.canonical_input_digest,'status',r.status_code,'outcome',r.outcome_class,
  'model',r.model_code,'usage',r.usage,'cost_minor_units',r.cost_minor_units,'latency_ms',r.latency_ms,'created_at',r.created_at,'completed_at',r.completed_at,
  'fragments',coalesce((SELECT jsonb_agg(jsonb_build_object('fragment_id',f.fragment_id,'source_record_id',f.source_record_id,'representation_id',f.representation_id,'locator',f.locator,'content_digest',f.content_digest) ORDER BY f.ordinal) FROM ai.run_fragment f WHERE f.run_id=r.id),'[]'::jsonb),
  'proposals',coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'candidate_key',p.candidate_key,'proposal_kind',p.proposal_kind,'schema_version',p.schema_version,'payload',p.payload,'support_status',p.support_status,'evidence_candidates',p.evidence_candidates,'limitations',p.limitations,'unsupported_states',p.unsupported_states,'required_human_decision',p.required_human_decision) ORDER BY p.created_at) FROM ai.proposal p WHERE p.run_id=r.id),'[]'::jsonb),
  'conflicts',coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'proposal_id',c.proposal_id,'conflict_key',c.conflict_key,'dimension',c.dimension,'competing_refs',c.competing_refs,'affected_scope',c.affected_scope,'unresolved_alternatives',c.unresolved_alternatives,'affected_uses',c.affected_uses) ORDER BY c.created_at) FROM ai.conflict_proposal c WHERE c.run_id=r.id),'[]'::jsonb),
  'abstentions',coalesce((SELECT jsonb_agg(to_jsonb(a) - 'account_id' - 'deal_id' - 'run_id') FROM ai.abstention a WHERE a.run_id=r.id),'[]'::jsonb),
  'validations',coalesce((SELECT jsonb_agg(to_jsonb(v) - 'account_id' - 'deal_id' - 'run_id') FROM ai.run_validation v WHERE v.run_id=r.id),'[]'::jsonb)
) END FROM ai.run r WHERE r.id=p_run_id AND r.account_id=p_account_id AND r.deal_id=p_deal_id AND p_account_id=app.policy_account_id() AND p_actor_id=app.policy_actor_id();
$$;

CREATE OR REPLACE FUNCTION ai.record_retry(p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_run_id uuid,p_retry_kind text,p_reason_code text)
RETURNS TABLE(retry_id uuid, retry_ordinal integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ai, app, pg_catalog AS $$
DECLARE run_row ai.run%ROWTYPE; next_ordinal integer; id_value uuid := gen_random_uuid();
BEGIN
  SELECT * INTO run_row FROM ai.run WHERE id=p_run_id AND account_id=p_account_id AND deal_id=p_deal_id;
  IF NOT FOUND OR p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN RAISE EXCEPTION 'ai_run_scope_mismatch' USING ERRCODE='42501'; END IF;
  SELECT coalesce(max(retry_ordinal),0)+1 INTO next_ordinal FROM ai.run_retry WHERE run_id=p_run_id;
  IF next_ordinal > 2 THEN RAISE EXCEPTION 'ai_retry_limit_exceeded' USING ERRCODE='22023'; END IF;
  IF p_retry_kind NOT IN ('transient_provider','contract_repair') THEN RAISE EXCEPTION 'ai_retry_kind_invalid' USING ERRCODE='22023'; END IF;
  INSERT INTO ai.run_retry(id,account_id,deal_id,run_id,retry_ordinal,retry_kind,reason_code,outcome) VALUES (id_value,p_account_id,p_deal_id,p_run_id,next_ordinal,p_retry_kind,p_reason_code,'queued');
  RETURN QUERY SELECT id_value,next_ordinal;
END $$;

REVOKE ALL ON FUNCTION ai.start_run(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,uuid,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean), ai.attach_run_fragments(uuid,uuid,uuid,uuid,jsonb), ai.complete_run(uuid,uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb,bytea,bytea,text,text,jsonb,integer,integer), ai.get_run_projection(uuid,uuid,uuid,uuid), ai.record_retry(uuid,uuid,uuid,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ai.start_run(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,uuid,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean), ai.attach_run_fragments(uuid,uuid,uuid,uuid,jsonb), ai.complete_run(uuid,uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb,bytea,bytea,text,text,jsonb,integer,integer), ai.get_run_projection(uuid,uuid,uuid,uuid), ai.record_retry(uuid,uuid,uuid,uuid,text,text) TO app_runtime;
ALTER FUNCTION ai.start_run(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,uuid,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean) OWNER TO app_ai_owner;
ALTER FUNCTION ai.attach_run_fragments(uuid,uuid,uuid,uuid,jsonb) OWNER TO app_ai_owner;
ALTER FUNCTION ai.complete_run(uuid,uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb,bytea,bytea,text,text,jsonb,integer,integer) OWNER TO app_ai_owner;
ALTER FUNCTION ai.get_run_projection(uuid,uuid,uuid,uuid) OWNER TO app_ai_owner;
ALTER FUNCTION ai.record_retry(uuid,uuid,uuid,uuid,text,text) OWNER TO app_ai_owner;
ALTER FUNCTION ai.prevent_immutable_mutation() OWNER TO app_ai_owner;
REVOKE CREATE ON SCHEMA ai FROM app_ai_owner;
