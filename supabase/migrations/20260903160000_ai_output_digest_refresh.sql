-- Bind the immutable prompt packages to the strict common-result schema
-- release (including RequiredHumanDecision and omission bounds).
ALTER TABLE ai.prompt_package DISABLE TRIGGER ai_prompt_package_immutable;
UPDATE ai.prompt_package SET output_schema_digest = CASE task_definition
  WHEN 'source_claim_extraction' THEN 'sha256:ff8f0b5d1c857802c165c68f6e1e15096b973d6104303757ac38dd00ed82bf43'
  WHEN 'claim_evidence_linking' THEN 'sha256:4f3cfde63960831b7a9525bdd791625e8addcc45b35cf2c88c9cee7c04211823'
  WHEN 'material_source_conflict_analysis' THEN 'sha256:7058655b5d944779206925b3194626073cf54d94a6dac90709597379ae8d8442'
  WHEN 'contract_repair' THEN 'sha256:9d9e3fab52464072f1068d05fdd0e9d956de857e928a9bf0b1a5f1f4e7865fa6'
  ELSE output_schema_digest END;
ALTER TABLE ai.prompt_package ENABLE TRIGGER ai_prompt_package_immutable;
