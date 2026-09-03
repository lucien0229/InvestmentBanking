-- Bind the database task definitions to the concrete released manifests.
-- Manifest limits are part of the provider-facing contract and must not remain
-- a probe placeholder when the task is enabled. This is a release migration:
-- the immutable trigger is suspended only for this exact digest replacement,
-- then restored before the transaction commits.
ALTER TABLE ai.task_definition DISABLE TRIGGER ai_task_definition_immutable;
UPDATE ai.task_definition SET manifest_digest = CASE task_definition
  WHEN 'source_claim_extraction' THEN 'sha256:9959c8a70e15b9cf7eb5a7932968f5ca9d3472352225610d680cd10ff679417d'
  WHEN 'claim_evidence_linking' THEN 'sha256:bff52690ecddd4fdf6500e9b04cf9c338e844e3e8a816694c3cf17f8f0ddf4ab'
  WHEN 'material_source_conflict_analysis' THEN 'sha256:1a08b7819bc115e4688facff3eef2de2f07398cf23b6c24fe4aa3002e95fce06'
  WHEN 'contract_repair' THEN 'sha256:c3bfd30c8456853e6343bb0695ed5987fea8ed4b79a5c47b806b2045d99f6d73'
  ELSE manifest_digest END;
ALTER TABLE ai.task_definition ENABLE TRIGGER ai_task_definition_immutable;
