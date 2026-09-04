-- Forward fixes for cells that already applied 20260904010000.
-- Keep this migration additive: the full deterministic-analysis migration is
-- safe to replay in a fresh cell, while this file repairs deployed control
-- plane constraints and task enablement without relying on edited history.

UPDATE ai.provider_capability_profile
SET lifecycle_status = 'enabled'
WHERE provider_code = 'hellox' AND environment_code = 'local';

GRANT USAGE ON SCHEMA source TO app_analysis_owner;
GRANT SELECT ON source.source_fragment TO app_analysis_owner;

UPDATE ai.task_definition
SET manifest_digest = CASE task_definition
  WHEN 'financial_semantic_extraction' THEN 'sha256:65d4ef4da47aecb0aa148d26b22094df275ac5cabe62a4665f9ea93e80f1b9c1'
  WHEN 'financial_normalization_mapping' THEN 'sha256:8a95aa1893ebd42b682ef71aad89b69dd5ac7e8194254691d367ba3da4f81bd5'
  WHEN 'sell_side_analysis_draft' THEN 'sha256:3a30b20ef31fc5798872e993832e64a4d4735d119d7544f850f43f294677ccd7'
  WHEN 'valuation_commentary_draft' THEN 'sha256:76de2caff92c3e0b82227dd1a92bdb2986c65f5907784a7d6ee6bf5d4641f4ae'
END
WHERE task_definition IN ('financial_semantic_extraction','financial_normalization_mapping','sell_side_analysis_draft','valuation_commentary_draft') AND task_definition_version='1.0.0';

ALTER TABLE ai.prompt_package DISABLE TRIGGER ai_prompt_package_immutable;
UPDATE ai.prompt_package
SET prompt_digest = CASE task_definition
  WHEN 'financial_semantic_extraction' THEN 'sha256:3dc7dbc3328f1296a4f68d90853dd1ef92d7ffb9d851c6ce2c4c1ac84401ecbc'
  WHEN 'financial_normalization_mapping' THEN 'sha256:7f7d4f5589e9d61ab7ab9504af4d34e7d9ded53d0be9ec67db691d01af60789d'
  WHEN 'sell_side_analysis_draft' THEN 'sha256:4b94eed0379c92bacf8fa9241ea464d77403f4da9a67a49cf344e2a3bf8c848b'
  WHEN 'valuation_commentary_draft' THEN 'sha256:ba5b3e005c147aa746c2f45125bd7c8c9b1b900fe6ef1c82bd9eda141841c0f4'
END,
input_schema_digest = CASE task_definition
  WHEN 'financial_semantic_extraction' THEN 'sha256:1254c77744a740462846d88de9f16c4116d053d0cf96f337af93fcbca792c16d'
  WHEN 'financial_normalization_mapping' THEN 'sha256:4e00b023062b4d2f272feba925d9cf9748541da80f8094253e7cce46f87a3629'
  WHEN 'sell_side_analysis_draft' THEN 'sha256:6894879ed5b741961147c8c41036e9f3f081933c0860ca797e3df176cdb828d5'
  WHEN 'valuation_commentary_draft' THEN 'sha256:060db85761046f677e1126e0e99349749d585e78417737e963ecf6d2203e0ae2'
END,
output_schema_digest = CASE task_definition
  WHEN 'financial_semantic_extraction' THEN 'sha256:48e6518d178d073f356c0417e804c708c370251628934a5a182663740f3e56a8'
  WHEN 'financial_normalization_mapping' THEN 'sha256:4eb7a9debfd7cb78fce55af6f33640b273bfdf4c452dd908e2dd13d62c351afc'
  WHEN 'sell_side_analysis_draft' THEN 'sha256:a279dfd712ceec65b102585c66763fae882a4d0fbed2d7298db09d5128f1e29f'
  WHEN 'valuation_commentary_draft' THEN 'sha256:29a8db4c1139b87e77b19ddcccfcc6ec27ec95881021b7ec123eca979eb9a91e'
END
WHERE task_definition IN ('financial_semantic_extraction','financial_normalization_mapping','sell_side_analysis_draft','valuation_commentary_draft') AND task_definition_version='1.0.0' AND package_version='1.0.0';
ALTER TABLE ai.prompt_package ENABLE TRIGGER ai_prompt_package_immutable;

DO $$ DECLARE c record; BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='ai.proposal'::regclass AND contype='c' AND pg_get_constraintdef(oid) ILIKE '%proposal_kind%' LOOP
    EXECUTE format('ALTER TABLE ai.proposal DROP CONSTRAINT %I', c.conname);
  END LOOP;
  ALTER TABLE ai.proposal ADD CONSTRAINT ai_proposal_kind_forward_check CHECK (proposal_kind IN ('claim','evidence_link','conflict','normalized_value_proposal','mapping_proposal','analysis_draft'));
END $$;

INSERT INTO ai.task_enablement(task_definition,task_definition_version,prompt_package_id,provider_profile_id,environment_code,provenance_class,confidentiality_class,status_code,reason,enabled_at)
SELECT t.task_definition,t.task_definition_version,p.id,profile.id,profile.environment_code,c.provenance_class,c.confidentiality_class,'enabled',CASE WHEN profile.environment_code='local' THEN 'Synthetic local provider double; proposal-only loop' ELSE 'Development HelloX proposal-only route; controlled input lineage remains explicit' END,clock_timestamp()
FROM ai.task_definition t
JOIN ai.prompt_package p ON p.task_definition=t.task_definition AND p.task_definition_version=t.task_definition_version AND p.package_version='1.0.0'
JOIN ai.provider_capability_profile profile ON profile.provider_code='hellox' AND profile.environment_code IN ('local','development') AND profile.lifecycle_status='enabled'
CROSS JOIN (VALUES ('synthetic','public'),('synthetic','internal'),('real','public'),('real','internal')) c(provenance_class,confidentiality_class)
WHERE t.task_definition IN ('financial_semantic_extraction','financial_normalization_mapping','sell_side_analysis_draft','valuation_commentary_draft')
ON CONFLICT DO NOTHING;

ALTER TABLE analysis.calculation_run ADD COLUMN IF NOT EXISTS inputs jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION analysis.prevent_immutable_mutation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=analysis,app,pg_catalog AS $$
BEGIN
  RAISE EXCEPTION 'analysis_immutable_record' USING ERRCODE='23514';
END $$;
CREATE OR REPLACE FUNCTION analysis.validate_ticket11_input() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'normalized_financial_value' AND (coalesce(jsonb_object_length(NEW.source_locator),0) = 0 OR (NEW.source_fragment_id IS NULL AND NEW.decision_id IS NULL AND NEW.assumption_id IS NULL)) THEN RAISE EXCEPTION 'financial_value_lineage_required'; END IF;
  IF TG_TABLE_NAME = 'calculation_version' AND coalesce(jsonb_array_length(NEW.definition->'measures'),0) = 0 THEN RAISE EXCEPTION 'calculation_measures_required'; END IF;
  IF TG_TABLE_NAME = 'analysis_version' AND (NOT (NEW.draft ?& ARRAY['question','method','conclusion','limitations']) OR NEW.draft ?| ARRAY['fact','fact_id','decision','decision_id','readiness','professional_usability','external_authorization','approval_status'] OR (coalesce(array_length(NEW.calculation_run_ids,1),0)=0 AND coalesce(array_length(NEW.model_version_ids,1),0)=0 AND coalesce(array_length(NEW.scenario_version_ids,1),0)=0 AND coalesce(array_length(NEW.fact_ids,1),0)=0 AND coalesce(array_length(NEW.assumption_ids,1),0)=0 AND coalesce(array_length(NEW.evidence_ids,1),0)=0)) THEN RAISE EXCEPTION 'analysis_draft_invalid'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS analysis_normalized_financial_value_validate ON analysis.normalized_financial_value;
CREATE TRIGGER analysis_normalized_financial_value_validate BEFORE INSERT ON analysis.normalized_financial_value FOR EACH ROW EXECUTE FUNCTION analysis.validate_ticket11_input();
DROP TRIGGER IF EXISTS analysis_calculation_version_validate ON analysis.calculation_version;
CREATE TRIGGER analysis_calculation_version_validate BEFORE INSERT ON analysis.calculation_version FOR EACH ROW EXECUTE FUNCTION analysis.validate_ticket11_input();
DROP TRIGGER IF EXISTS analysis_analysis_version_validate ON analysis.analysis_version;
CREATE TRIGGER analysis_analysis_version_validate BEFORE INSERT ON analysis.analysis_version FOR EACH ROW EXECUTE FUNCTION analysis.validate_ticket11_input();
DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['normalized_financial_value','calculation_version','calculation_input_measure','calculation_run','calculation_input_fact','calculation_input_assumption','calculation_check','model_version','model_version_calculation','model_version_fact','model_version_assumption','scenario_version','analysis_version','analysis_model_version','analysis_scenario_version','analysis_calculation_run','analysis_fact','analysis_assumption','analysis_evidence','analysis_state_assessment','deterministic_validation_record','command_idempotency'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS analysis_%I_immutable ON analysis.%I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER analysis_%I_immutable BEFORE UPDATE OR DELETE ON analysis.%I FOR EACH ROW EXECUTE FUNCTION analysis.prevent_immutable_mutation()', table_name, table_name);
  END LOOP;
END $$;

-- The v2 completion wrapper delegates proposal persistence here.  Re-declare
-- the allow-list forward so deployed cells can close the four new proposal
-- kinds after the historical migration has already run.
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
    IF coalesce(item->>'proposal_kind','') NOT IN ('claim','evidence_link','conflict','normalized_value_proposal','mapping_proposal','analysis_draft') THEN RAISE EXCEPTION 'ai_proposal_kind_invalid' USING ERRCODE='22023'; END IF;
    INSERT INTO ai.proposal(id,account_id,deal_id,run_id,candidate_key,proposal_kind,schema_version,payload,payload_digest,support_status,evidence_candidates,limitations,unsupported_states,required_human_decision)
      VALUES (proposal_id,p_account_id,p_deal_id,p_run_id,item->>'candidate_key',item->>'proposal_kind',item->>'schema_version',item->'payload',item->>'payload_digest',item->>'support_status',coalesce(item->'evidence_candidates','[]'::jsonb),coalesce(item->'limitations','[]'::jsonb),coalesce(item->'unsupported_states','[]'::jsonb),item->'required_human_decision');
    conflict_payload := CASE WHEN item->>'proposal_kind'='conflict' THEN item->'payload' ELSE item->'conflict' END;
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
ALTER FUNCTION ai.complete_run(uuid,uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb,bytea,bytea,text,text,jsonb,integer,integer) OWNER TO app_ai_owner;
