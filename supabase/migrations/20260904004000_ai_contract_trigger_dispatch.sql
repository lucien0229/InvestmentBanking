-- Dispatch by table before dereferencing its typed trigger record.
CREATE OR REPLACE FUNCTION ai.prevent_contract_definition_mutation()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'ai_contract_immutable' USING ERRCODE='23514'; END IF;
  IF TG_TABLE_NAME='task_definition' THEN
    IF (
    NEW.task_definition IS DISTINCT FROM OLD.task_definition OR
    NEW.task_family IS DISTINCT FROM OLD.task_family OR
    NEW.task_definition_version IS DISTINCT FROM OLD.task_definition_version OR
    NEW.input_contract_version IS DISTINCT FROM OLD.input_contract_version OR
    NEW.output_contract_version IS DISTINCT FROM OLD.output_contract_version OR
    NEW.logical_model_role IS DISTINCT FROM OLD.logical_model_role OR
    NEW.manifest_digest IS DISTINCT FROM OLD.manifest_digest
  ) THEN RAISE EXCEPTION 'ai_contract_immutable' USING ERRCODE='23514'; END IF;
  END IF;
  IF TG_TABLE_NAME='prompt_package' THEN
    IF (
    NEW.id IS DISTINCT FROM OLD.id OR
    NEW.task_definition IS DISTINCT FROM OLD.task_definition OR
    NEW.package_version IS DISTINCT FROM OLD.package_version OR
    NEW.prompt_digest IS DISTINCT FROM OLD.prompt_digest OR
    NEW.input_schema_digest IS DISTINCT FROM OLD.input_schema_digest OR
    NEW.output_schema_digest IS DISTINCT FROM OLD.output_schema_digest OR
    NEW.context_plan_version IS DISTINCT FROM OLD.context_plan_version OR
    NEW.ai_evidence_policy_version IS DISTINCT FROM OLD.ai_evidence_policy_version
  ) THEN RAISE EXCEPTION 'ai_contract_immutable' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $$;

