-- Hosted Ticket 11 bootstrap contains unused zero-digest metadata. Reconcile it
-- before the already-published forward fix; never rewrite a definition used by a Run.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM ai.task_definition t JOIN ai.run r USING(task_definition,task_definition_version)
  WHERE t.task_definition IN ('financial_semantic_extraction','financial_normalization_mapping','sell_side_analysis_draft','valuation_commentary_draft')
   AND t.manifest_digest='sha256:'||repeat('0',64)) THEN
  RAISE EXCEPTION 'used_placeholder_contract_requires_new_version';
 END IF;
END $$;
ALTER TABLE ai.task_definition DISABLE TRIGGER ai_task_definition_immutable;
UPDATE ai.task_definition
SET manifest_digest = CASE task_definition
  WHEN 'financial_semantic_extraction' THEN 'sha256:65d4ef4da47aecb0aa148d26b22094df275ac5cabe62a4665f9ea93e80f1b9c1'
  WHEN 'financial_normalization_mapping' THEN 'sha256:8a95aa1893ebd42b682ef71aad89b69dd5ac7e8194254691d367ba3da4f81bd5'
  WHEN 'sell_side_analysis_draft' THEN 'sha256:3a30b20ef31fc5798872e993832e64a4d4735d119d7544f850f43f294677ccd7'
  WHEN 'valuation_commentary_draft' THEN 'sha256:76de2caff92c3e0b82227dd1a92bdb2986c65f5907784a7d6ee6bf5d4641f4ae'
END
WHERE task_definition IN ('financial_semantic_extraction','financial_normalization_mapping','sell_side_analysis_draft','valuation_commentary_draft') AND task_definition_version='1.0.0' AND manifest_digest='sha256:'||repeat('0',64);

ALTER TABLE ai.task_definition ENABLE TRIGGER ai_task_definition_immutable;
