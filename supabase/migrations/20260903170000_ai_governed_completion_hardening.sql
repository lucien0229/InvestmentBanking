BEGIN;

-- Task definitions are immutable versions, not one mutable row per task name.
ALTER TABLE ai.prompt_package ADD COLUMN IF NOT EXISTS task_definition_version text;
ALTER TABLE ai.prompt_package DISABLE TRIGGER ai_prompt_package_immutable;
UPDATE ai.prompt_package p
SET task_definition_version = t.task_definition_version
FROM ai.task_definition t
WHERE t.task_definition = p.task_definition
  AND p.task_definition_version IS NULL;
ALTER TABLE ai.prompt_package ALTER COLUMN task_definition_version SET NOT NULL;
ALTER TABLE ai.prompt_package ENABLE TRIGGER ai_prompt_package_immutable;
ALTER TABLE ai.prompt_package DROP CONSTRAINT IF EXISTS prompt_package_task_definition_fkey;
ALTER TABLE ai.task_enablement DROP CONSTRAINT IF EXISTS task_enablement_task_definition_fkey;
ALTER TABLE ai.run DROP CONSTRAINT IF EXISTS run_task_definition_fkey;
ALTER TABLE ai.task_definition DROP CONSTRAINT IF EXISTS task_definition_pkey;
ALTER TABLE ai.task_definition ADD PRIMARY KEY (task_definition, task_definition_version);
ALTER TABLE ai.prompt_package DROP CONSTRAINT IF EXISTS prompt_package_task_definition_package_version_key;
ALTER TABLE ai.prompt_package ADD CONSTRAINT prompt_package_task_definition_version_fkey
  FOREIGN KEY (task_definition, task_definition_version)
  REFERENCES ai.task_definition(task_definition, task_definition_version);
ALTER TABLE ai.prompt_package ADD CONSTRAINT prompt_package_task_definition_package_version_key
  UNIQUE (task_definition, task_definition_version, package_version);
ALTER TABLE ai.task_enablement ADD CONSTRAINT task_enablement_task_definition_version_fkey
  FOREIGN KEY (task_definition, task_definition_version)
  REFERENCES ai.task_definition(task_definition, task_definition_version);
ALTER TABLE ai.run ADD CONSTRAINT run_task_definition_version_fkey
  FOREIGN KEY (task_definition, task_definition_version)
  REFERENCES ai.task_definition(task_definition, task_definition_version);

ALTER TABLE ai.run
  ADD COLUMN IF NOT EXISTS environment_code text NOT NULL DEFAULT 'development'
    CHECK (environment_code IN ('local','development','production')),
  ADD COLUMN IF NOT EXISTS release_id text,
  ADD COLUMN IF NOT EXISTS context_plan_version text,
  ADD COLUMN IF NOT EXISTS input_envelope_digest text,
  ADD COLUMN IF NOT EXISTS response_digest text,
  ADD COLUMN IF NOT EXISTS parameter_identity jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS omissions jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE ai.run_fragment
  ADD COLUMN IF NOT EXISTS source_record_version integer,
  ADD COLUMN IF NOT EXISTS representation_digest text,
  ADD COLUMN IF NOT EXISTS coverage_code text,
  ADD COLUMN IF NOT EXISTS rights_assessment_id text;

ALTER TABLE ai.proposal
  ADD COLUMN IF NOT EXISTS origin_code text NOT NULL DEFAULT 'ai_generated'
    CHECK (origin_code = 'ai_generated');

CREATE TABLE IF NOT EXISTS ai.run_omission (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  run_id uuid NOT NULL REFERENCES ai.run(id),
  omission_key text NOT NULL,
  affected_scope text NOT NULL,
  reason_code text NOT NULL,
  explanation text NOT NULL,
  recovery_action text,
  material boolean NOT NULL DEFAULT false CHECK (material = false),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, omission_key),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id)
);
ALTER TABLE ai.run_omission ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.run_omission FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_run_omission_scope ON ai.run_omission;
CREATE POLICY ai_run_omission_scope ON ai.run_omission FOR SELECT TO app_runtime
  USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
GRANT SELECT ON ai.run_omission TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai.run_omission TO app_ai_owner;

-- A run may receive its immutable execution envelope exactly once while queued.
CREATE OR REPLACE FUNCTION ai.bind_run_manifest(
  p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_run_id uuid,
  p_environment_code text, p_release_id text, p_context_plan_version text,
  p_input_envelope_digest text, p_parameter_identity jsonb
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ai, app, pg_catalog AS $$
DECLARE changed integer;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id()
     OR p_actor_id IS DISTINCT FROM app.policy_actor_id()
     OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN
    RAISE EXCEPTION 'ai_run_scope_mismatch' USING ERRCODE='42501';
  END IF;
  IF p_environment_code NOT IN ('local','development','production')
     OR p_release_id IS NULL OR p_context_plan_version IS NULL
     OR p_input_envelope_digest IS NULL THEN
    RAISE EXCEPTION 'ai_run_manifest_invalid' USING ERRCODE='22023';
  END IF;
  UPDATE ai.run
  SET environment_code = p_environment_code,
      release_id = p_release_id,
      context_plan_version = p_context_plan_version,
      input_envelope_digest = p_input_envelope_digest,
      parameter_identity = coalesce(p_parameter_identity, '{}'::jsonb)
  WHERE id = p_run_id AND account_id = p_account_id AND deal_id = p_deal_id
    AND status_code = 'queued' AND release_id IS NULL;
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN RAISE EXCEPTION 'ai_run_manifest_already_bound' USING ERRCODE='23514'; END IF;
  RETURN true;
END $$;

-- The worker-facing start seam binds an exact, live Job Scope and enabled profile.
CREATE OR REPLACE FUNCTION ai.start_run_v2(
  p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_job_id uuid, p_job_scope_id uuid,
  p_packet_version_id uuid, p_work_objective_id uuid, p_task_definition text,
  p_task_definition_version text, p_prompt_package_id uuid, p_provider_profile_id text,
  p_environment_code text, p_provenance_class text, p_confidentiality_class text,
  p_de_identification_posture text, p_scope_digest text, p_canonical_input_digest text,
  p_request_digest text, p_request_nonce text, p_key_hash text, p_release_id text,
  p_context_plan_version text, p_input_envelope_digest text, p_parameter_identity jsonb
) RETURNS TABLE(run_id uuid, idempotent_replayed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ai, source, app, jobs, pg_catalog AS $$
DECLARE existing ai.command_idempotency%ROWTYPE; new_id uuid := gen_random_uuid();
DECLARE profile_row ai.provider_capability_profile%ROWTYPE;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id()
     OR p_actor_id IS DISTINCT FROM app.policy_actor_id()
     OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN
    RAISE EXCEPTION 'ai_scope_mismatch' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jobs.job_scope s
    WHERE s.id = p_job_scope_id AND s.job_id = p_job_id
      AND s.account_id = p_account_id AND s.deal_id = p_deal_id
      AND s.revoked_at IS NULL AND s.expires_at > clock_timestamp()
      AND s.operation_code IN ('ai_source_proposal','reference_workspace_build')
  ) THEN RAISE EXCEPTION 'ai_job_scope_invalid' USING ERRCODE='42501'; END IF;
  SELECT * INTO profile_row FROM ai.provider_capability_profile
  WHERE id = p_provider_profile_id AND provider_code = 'hellox'
    AND environment_code = p_environment_code AND lifecycle_status = 'enabled';
  IF NOT FOUND THEN RAISE EXCEPTION 'ai_provider_profile_ineligible' USING ERRCODE='42501'; END IF;
  SELECT * INTO existing FROM ai.command_idempotency
  WHERE account_id=p_account_id AND actor_id=p_actor_id AND deal_id=p_deal_id
    AND command_type='start_ai_run' AND key_hash=p_key_hash;
  IF FOUND THEN
    IF existing.request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE='23505'; END IF;
    RETURN QUERY SELECT existing.run_id, true; RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM source.source_packet_version v WHERE v.id=p_packet_version_id AND v.account_id=p_account_id AND v.deal_id=p_deal_id) THEN RAISE EXCEPTION 'ai_packet_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF p_work_objective_id IS NULL OR NOT EXISTS (SELECT 1 FROM app.work_objective o WHERE o.id=p_work_objective_id AND o.account_id=p_account_id AND o.deal_id=p_deal_id AND o.packet_version_id=p_packet_version_id) THEN RAISE EXCEPTION 'ai_objective_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM ai.task_definition t
    JOIN ai.prompt_package p ON p.id=p_prompt_package_id AND p.task_definition=t.task_definition AND p.task_definition_version=t.task_definition_version AND p.lifecycle_status='enabled'
    JOIN ai.task_enablement e ON e.task_definition=t.task_definition AND e.task_definition_version=t.task_definition_version AND e.prompt_package_id=p.id AND e.provider_profile_id=p_provider_profile_id AND e.environment_code=p_environment_code AND e.provenance_class=p_provenance_class AND e.confidentiality_class=p_confidentiality_class AND e.status_code='enabled'
    WHERE t.task_definition=p_task_definition AND t.task_definition_version=p_task_definition_version AND t.lifecycle_status='enabled'
  ) THEN RAISE EXCEPTION 'ai_task_disabled' USING ERRCODE='42501'; END IF;
  IF p_confidentiality_class IN ('confidential','restricted') AND (NOT profile_row.capability_verified OR NOT profile_row.processing_evidence_verified OR (p_confidentiality_class='restricted' AND NOT profile_row.restricted_approved)) THEN RAISE EXCEPTION 'ai_provider_capability_blocked' USING ERRCODE='42501'; END IF;
  INSERT INTO ai.run(id,account_id,deal_id,actor_id,job_id,job_scope_id,packet_version_id,work_objective_id,task_definition,task_definition_version,prompt_package_id,provider_profile_id,provenance_class,confidentiality_class,de_identification_posture,scope_digest,canonical_input_digest,request_digest,request_nonce,environment_code,release_id,context_plan_version,input_envelope_digest,parameter_identity,outcome_class,status_code)
  VALUES (new_id,p_account_id,p_deal_id,p_actor_id,p_job_id,p_job_scope_id,p_packet_version_id,p_work_objective_id,p_task_definition,p_task_definition_version,p_prompt_package_id,p_provider_profile_id,p_provenance_class,p_confidentiality_class,p_de_identification_posture,p_scope_digest,p_canonical_input_digest,p_request_digest,p_request_nonce,p_environment_code,p_release_id,p_context_plan_version,p_input_envelope_digest,coalesce(p_parameter_identity,'{}'::jsonb),'queued','queued');
  INSERT INTO ai.command_idempotency(account_id,actor_id,deal_id,command_type,key_hash,request_digest,run_id) VALUES (p_account_id,p_actor_id,p_deal_id,'start_ai_run',p_key_hash,p_request_digest,new_id);
  PERFORM app.record_audit('ai_run_started','completed','ai_run',new_id::text,'proposal_only',gen_random_uuid()::text);
  RETURN QUERY SELECT new_id, false;
END $$;

CREATE OR REPLACE FUNCTION ai.complete_run_v2(
  p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_run_id uuid,p_status_code text,p_outcome_class text,
  p_proposals jsonb,p_abstentions jsonb,p_omissions jsonb,p_validations jsonb,p_raw_request_ciphertext bytea,p_raw_response_ciphertext bytea,
  p_provider_request_id text,p_model_code text,p_usage jsonb,p_cost_minor_units integer,p_latency_ms integer,p_response_digest text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ai, source, app, pg_catalog AS $$
DECLARE item jsonb; result jsonb;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id()
     OR p_actor_id IS DISTINCT FROM app.policy_actor_id()
     OR p_deal_id IS DISTINCT FROM app.policy_deal_id()
     OR NOT EXISTS (SELECT 1 FROM ai.run r JOIN jobs.job_scope s ON s.id=r.job_scope_id AND s.job_id=r.job_id WHERE r.id=p_run_id AND r.account_id=p_account_id AND r.deal_id=p_deal_id AND s.revoked_at IS NULL AND s.expires_at > clock_timestamp()) THEN
    RAISE EXCEPTION 'ai_run_scope_mismatch' USING ERRCODE='42501';
  END IF;
  result := ai.complete_run(p_account_id,p_actor_id,p_deal_id,p_run_id,p_status_code,p_outcome_class,p_proposals,p_abstentions,p_validations,p_raw_request_ciphertext,p_raw_response_ciphertext,p_provider_request_id,p_model_code,p_usage,p_cost_minor_units,p_latency_ms);
  FOR item IN SELECT value FROM jsonb_array_elements(coalesce(p_omissions,'[]'::jsonb)) LOOP
    INSERT INTO ai.run_omission(account_id,deal_id,run_id,omission_key,affected_scope,reason_code,explanation,recovery_action,material)
    VALUES (p_account_id,p_deal_id,p_run_id,item->>'omission_key',item->>'affected_scope',item->>'reason_code',item->>'explanation',item->>'recovery_action',false)
    ON CONFLICT (run_id, omission_key) DO NOTHING;
  END LOOP;
  UPDATE ai.run SET response_digest=p_response_digest, omissions=coalesce(p_omissions,'[]'::jsonb) WHERE id=p_run_id AND account_id=p_account_id AND deal_id=p_deal_id;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION ai.attach_run_fragments(p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_run_id uuid,p_fragments jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ai, source, app, pg_catalog AS $$
DECLARE item jsonb; run_row ai.run%ROWTYPE; fragment_row source.source_fragment%ROWTYPE; record_row source.source_record%ROWTYPE; ordinal integer := 0; run_fragment_id_value uuid;
BEGIN
  SELECT * INTO run_row FROM ai.run WHERE id=p_run_id AND account_id=p_account_id AND deal_id=p_deal_id FOR UPDATE;
  IF NOT FOUND OR p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN RAISE EXCEPTION 'ai_run_scope_mismatch' USING ERRCODE='42501'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(coalesce(p_fragments,'[]'::jsonb)) LOOP
    SELECT * INTO fragment_row FROM source.source_fragment WHERE id=(item->>'fragment_id')::uuid AND account_id=p_account_id AND deal_id=p_deal_id;
    SELECT * INTO record_row FROM source.source_record WHERE id=fragment_row.source_record_id AND account_id=p_account_id AND deal_id=p_deal_id;
    IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM source.source_packet_member m JOIN source.source_packet_version v ON v.id=m.packet_version_id WHERE m.packet_version_id=run_row.packet_version_id AND v.account_id=p_account_id AND v.deal_id=p_deal_id AND m.source_record_id=fragment_row.source_record_id) THEN RAISE EXCEPTION 'ai_fragment_not_in_packet' USING ERRCODE='42501'; END IF;
    run_fragment_id_value := coalesce((item->>'run_fragment_id')::uuid,gen_random_uuid());
    INSERT INTO ai.run_fragment(run_id,run_fragment_id,account_id,deal_id,fragment_id,source_record_id,source_record_version,representation_id,representation_digest,locator,content_digest,coverage_code,rights_assessment_id,ordinal)
    VALUES (p_run_id,run_fragment_id_value,p_account_id,p_deal_id,fragment_row.id,fragment_row.source_record_id,record_row.version_ordinal,fragment_row.representation_id,(SELECT content_sha256 FROM source.source_representation WHERE id=fragment_row.representation_id),fragment_row.locator,fragment_row.content_sha256,fragment_row.coverage_code,coalesce((item->>'rights_assessment_id'),'not-recorded'),ordinal)
    ON CONFLICT (run_id,fragment_id) DO NOTHING;
    ordinal := ordinal + 1;
  END LOOP;
  UPDATE ai.run SET status_code='running', outcome_class='running' WHERE id=p_run_id;
  RETURN true;
END $$;

ALTER FUNCTION ai.attach_run_fragments(uuid,uuid,uuid,uuid,jsonb) OWNER TO app_ai_owner;

CREATE OR REPLACE FUNCTION source.get_packet_worker_input(
  p_account_id uuid, p_deal_id uuid, p_packet_version_id uuid, p_work_objective_id uuid, p_operation_code text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, app, pg_catalog AS $$
DECLARE ceiling_row app.output_ceiling_assessment%ROWTYPE; operation_row app.output_ceiling_operation%ROWTYPE; dynamic_blockers jsonb; dynamic_ceiling text; purpose_value text; workspace_status text; workspace_ceiling text;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN RAISE EXCEPTION 'packet_worker_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM source.source_packet_version v WHERE v.id=p_packet_version_id AND v.account_id=p_account_id AND v.deal_id=p_deal_id) THEN RAISE EXCEPTION 'packet_worker_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM app.work_objective o WHERE o.id=p_work_objective_id AND o.account_id=p_account_id AND o.deal_id=p_deal_id AND o.packet_version_id=p_packet_version_id) THEN RAISE EXCEPTION 'packet_worker_scope_mismatch' USING ERRCODE='42501'; END IF;
  SELECT * INTO ceiling_row FROM app.output_ceiling_assessment WHERE account_id=p_account_id AND deal_id=p_deal_id AND packet_version_id=p_packet_version_id AND work_objective_id=p_work_objective_id ORDER BY assessed_at DESC,id DESC LIMIT 1;
  IF ceiling_row.id IS NULL THEN RAISE EXCEPTION 'output_ceiling_missing' USING ERRCODE='42501'; END IF;
  SELECT purpose_code INTO purpose_value FROM source.source_packet_version WHERE id=p_packet_version_id;
  dynamic_blockers := source.packet_blockers(p_account_id,p_deal_id,p_packet_version_id,purpose_value);
  dynamic_ceiling := source.ceiling_code(dynamic_blockers,EXISTS (SELECT 1 FROM source.source_packet_member WHERE packet_version_id=p_packet_version_id));
  SELECT paid_preflight_status, output_ceiling INTO workspace_status, workspace_ceiling FROM app.deal_workspace WHERE account_id=p_account_id AND deal_id=p_deal_id;
  IF coalesce(workspace_status,'pending') NOT IN ('pass','limited-proceed') THEN dynamic_ceiling := 'blocked'; ELSIF workspace_ceiling = 'internal_analysis_and_internal_controlled_export' AND dynamic_ceiling = 'supported_internal_processing' THEN dynamic_ceiling := 'bounded_analysis_only'; END IF;
  IF p_operation_code IN ('ai_processing','deterministic_analysis','native_artifact','reader_copy','internal_controlled_export','external_circulation') AND dynamic_ceiling IN ('metadata_only','blocked','anchor_inventory_only','bounded_analysis_only') THEN RAISE EXCEPTION 'output_ceiling_exceeded' USING ERRCODE='42501'; END IF;
  SELECT * INTO operation_row FROM app.output_ceiling_operation WHERE account_id=p_account_id AND deal_id=p_deal_id AND assessment_id=ceiling_row.id AND operation_code=p_operation_code;
  IF NOT (p_operation_code='ai_processing' AND dynamic_ceiling='supported_internal_processing') AND (operation_row.id IS NULL OR operation_row.posture <> 'permitted') THEN RAISE EXCEPTION 'output_ceiling_exceeded' USING ERRCODE='42501'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(dynamic_blockers) x WHERE x->>'code' IN ('rights_blocked','withdrawn_source')) AND p_operation_code <> 'source_inventory' THEN RAISE EXCEPTION 'source_condition_blocked' USING ERRCODE='42501'; END IF;
  IF EXISTS (SELECT 1 FROM source.source_rights_current_selection cs JOIN source.source_rights_posture_assessment ra ON ra.id=cs.assessment_id JOIN source.source_packet_member m ON m.source_record_id=cs.source_record_id WHERE cs.account_id=p_account_id AND cs.deal_id=p_deal_id AND cs.purpose_code=purpose_value AND m.packet_version_id=p_packet_version_id AND ra.rights_code='limited' AND NOT (ra.permitted_operations ? p_operation_code)) THEN RAISE EXCEPTION 'output_ceiling_exceeded' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object('account_id',p_account_id,'deal_id',p_deal_id,'packet_version_id',p_packet_version_id,'work_objective_id',p_work_objective_id,'operation_code',p_operation_code,'output_ceiling_id',ceiling_row.id,'ceiling_code',ceiling_row.ceiling_code,'members',coalesce((SELECT jsonb_agg(jsonb_build_object('source_record_id',m.source_record_id,'version',r.version_ordinal) ORDER BY m.sort_key,m.created_at) FROM source.source_packet_member m JOIN source.source_record r ON r.id=m.source_record_id WHERE m.packet_version_id=p_packet_version_id),'[]'::jsonb));
END $$;
ALTER FUNCTION source.get_packet_worker_input(uuid,uuid,uuid,uuid,text) OWNER TO app_source_owner;

CREATE OR REPLACE FUNCTION ai.get_run_projection(p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_run_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = ai, source, app, pg_catalog AS $$
SELECT CASE WHEN r.id IS NULL THEN NULL ELSE jsonb_build_object(
  'id',r.id,'account_id',r.account_id,'deal_id',r.deal_id,'job_id',r.job_id,'job_scope_id',r.job_scope_id,
  'packet_version_id',r.packet_version_id,'work_objective_id',r.work_objective_id,'task_definition',r.task_definition,
  'task_definition_version',r.task_definition_version,'prompt_package_id',r.prompt_package_id,'provider_profile_id',r.provider_profile_id,
  'environment_code',r.environment_code,'release_id',r.release_id,'context_plan_version',r.context_plan_version,'input_envelope_digest',r.input_envelope_digest,'response_digest',r.response_digest,'parameter_identity',r.parameter_identity,
  'scope_digest',r.scope_digest,'canonical_input_digest',r.canonical_input_digest,'status',r.status_code,'outcome',r.outcome_class,
  'model',r.model_code,'usage',r.usage,'cost_minor_units',r.cost_minor_units,'latency_ms',r.latency_ms,'created_at',r.created_at,'completed_at',r.completed_at,
  'fragments',coalesce((SELECT jsonb_agg(jsonb_build_object('fragment_id',f.fragment_id,'source_record_id',f.source_record_id,'source_record_version',f.source_record_version,'representation_id',f.representation_id,'representation_digest',f.representation_digest,'locator',f.locator,'content_digest',f.content_digest,'coverage_code',f.coverage_code,'rights_assessment_id',f.rights_assessment_id) ORDER BY f.ordinal) FROM ai.run_fragment f WHERE f.run_id=r.id),'[]'::jsonb),
  'proposals',coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'candidate_key',p.candidate_key,'origin',p.origin_code,'proposal_kind',p.proposal_kind,'schema_version',p.schema_version,'payload',p.payload,'support_status',p.support_status,'evidence_candidates',p.evidence_candidates,'limitations',p.limitations,'unsupported_states',p.unsupported_states,'required_human_decision',p.required_human_decision) ORDER BY p.created_at) FROM ai.proposal p WHERE p.run_id=r.id),'[]'::jsonb),
  'conflicts',coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'proposal_id',c.proposal_id,'conflict_key',c.conflict_key,'dimension',c.dimension,'competing_refs',c.competing_refs,'affected_scope',c.affected_scope,'unresolved_alternatives',c.unresolved_alternatives,'affected_uses',c.affected_uses) ORDER BY c.created_at) FROM ai.conflict_proposal c WHERE c.run_id=r.id),'[]'::jsonb),
  'abstentions',coalesce((SELECT jsonb_agg(to_jsonb(a) - 'account_id' - 'deal_id' - 'run_id') FROM ai.abstention a WHERE a.run_id=r.id),'[]'::jsonb),
  'omissions',coalesce((SELECT jsonb_agg(to_jsonb(o) - 'account_id' - 'deal_id' - 'run_id') FROM ai.run_omission o WHERE o.run_id=r.id),'[]'::jsonb),
  'validations',coalesce((SELECT jsonb_agg(to_jsonb(v) - 'account_id' - 'deal_id' - 'run_id') FROM ai.run_validation v WHERE v.run_id=r.id),'[]'::jsonb)
) END FROM ai.run r WHERE r.id=p_run_id AND r.account_id=p_account_id AND r.deal_id=p_deal_id
  AND p_account_id=app.policy_account_id() AND p_actor_id=app.policy_actor_id() AND p_deal_id=app.policy_deal_id();
$$;

CREATE OR REPLACE FUNCTION ai.prevent_run_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' OR NEW.id IS DISTINCT FROM OLD.id OR NEW.account_id IS DISTINCT FROM OLD.account_id OR NEW.deal_id IS DISTINCT FROM OLD.deal_id OR NEW.actor_id IS DISTINCT FROM OLD.actor_id OR NEW.job_id IS DISTINCT FROM OLD.job_id OR NEW.job_scope_id IS DISTINCT FROM OLD.job_scope_id OR NEW.packet_version_id IS DISTINCT FROM OLD.packet_version_id OR NEW.work_objective_id IS DISTINCT FROM OLD.work_objective_id OR NEW.task_definition IS DISTINCT FROM OLD.task_definition OR NEW.task_definition_version IS DISTINCT FROM OLD.task_definition_version OR NEW.prompt_package_id IS DISTINCT FROM OLD.prompt_package_id OR NEW.provider_profile_id IS DISTINCT FROM OLD.provider_profile_id OR NEW.provenance_class IS DISTINCT FROM OLD.provenance_class OR NEW.confidentiality_class IS DISTINCT FROM OLD.confidentiality_class OR NEW.de_identification_posture IS DISTINCT FROM OLD.de_identification_posture OR NEW.scope_digest IS DISTINCT FROM OLD.scope_digest OR NEW.canonical_input_digest IS DISTINCT FROM OLD.canonical_input_digest OR NEW.request_digest IS DISTINCT FROM OLD.request_digest OR NEW.request_nonce IS DISTINCT FROM OLD.request_nonce OR (OLD.release_id IS NOT NULL AND NEW.release_id IS DISTINCT FROM OLD.release_id) OR (OLD.context_plan_version IS NOT NULL AND NEW.context_plan_version IS DISTINCT FROM OLD.context_plan_version) OR (OLD.input_envelope_digest IS NOT NULL AND NEW.input_envelope_digest IS DISTINCT FROM OLD.input_envelope_digest) OR (OLD.environment_code IS DISTINCT FROM NEW.environment_code AND OLD.release_id IS NOT NULL) THEN
    RAISE EXCEPTION 'ai_run_identity_immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ai_run_immutable ON ai.run;
CREATE TRIGGER ai_run_immutable BEFORE UPDATE OR DELETE ON ai.run FOR EACH ROW EXECUTE FUNCTION ai.prevent_run_mutation();

-- Development uses the real HelloX endpoint for public/internal material. The
-- profile stays capability-unverified until endpoint processing evidence is
-- explicitly recorded; confidential/restricted routing remains fail-closed.
INSERT INTO ai.provider_capability_profile(id,provider_code,profile_version,environment_code,lifecycle_status,model_contract,evidence)
VALUES ('hellox-source-proposals-v1-development','hellox','1.0.0','development','enabled','{}'::jsonb,'{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET environment_code='development', lifecycle_status='enabled';
INSERT INTO ai.task_enablement(task_definition,task_definition_version,prompt_package_id,provider_profile_id,environment_code,provenance_class,confidentiality_class,status_code,reason,enabled_at)
SELECT t.task_definition,t.task_definition_version,p.id,'hellox-source-proposals-v1-development','development',c.provenance_class,c.confidentiality_class,'enabled','Development HelloX proposal-only route; confidential classes remain capability-gated',clock_timestamp()
FROM ai.task_definition t
JOIN ai.prompt_package p ON p.task_definition=t.task_definition AND p.task_definition_version=t.task_definition_version AND p.package_version='1.0.0'
CROSS JOIN (VALUES ('synthetic','public'),('synthetic','internal'),('real','public'),('real','internal')) c(provenance_class,confidentiality_class)
WHERE NOT EXISTS (SELECT 1 FROM ai.task_enablement e WHERE e.task_definition=t.task_definition AND e.task_definition_version=t.task_definition_version AND e.provider_profile_id='hellox-source-proposals-v1-development' AND e.environment_code='development' AND e.provenance_class=c.provenance_class AND e.confidentiality_class=c.confidentiality_class);

GRANT USAGE ON SCHEMA ai TO app_runtime, app_ai_owner;
GRANT EXECUTE ON FUNCTION ai.bind_run_manifest(uuid,uuid,uuid,uuid,text,text,text,text,jsonb), ai.start_run_v2(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb), ai.complete_run_v2(uuid,uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb,jsonb,bytea,bytea,text,text,jsonb,integer,integer,text), ai.get_run_projection(uuid,uuid,uuid,uuid) TO app_runtime;
GRANT CREATE ON SCHEMA ai TO app_ai_owner;
ALTER FUNCTION ai.bind_run_manifest(uuid,uuid,uuid,uuid,text,text,text,text,jsonb) OWNER TO app_ai_owner;
ALTER FUNCTION ai.start_run_v2(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb) OWNER TO app_ai_owner;
ALTER FUNCTION ai.complete_run_v2(uuid,uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb,jsonb,bytea,bytea,text,text,jsonb,integer,integer,text) OWNER TO app_ai_owner;
ALTER FUNCTION ai.get_run_projection(uuid,uuid,uuid,uuid) OWNER TO app_ai_owner;
GRANT SELECT ON jobs.job_scope TO app_ai_owner;
REVOKE CREATE ON SCHEMA ai FROM app_ai_owner;

COMMIT;
