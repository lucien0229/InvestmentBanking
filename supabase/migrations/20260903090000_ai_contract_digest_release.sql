-- Release the actual checked-in contract digests. A zero digest is never an
-- enablement proof; these values bind the database package to this source
-- release and make drift detectable before a provider call.
UPDATE ai.task_definition SET manifest_digest = CASE task_definition
  WHEN 'source_claim_extraction' THEN 'sha256:3c8efb170acba9494e20f552fcae0dd5f11f79ded0104c6fddf1321b9350767b'
  WHEN 'claim_evidence_linking' THEN 'sha256:8fc6a75edc9dee8e024fdf16724a3042d7f333ae9a0e5595261637bad0cd606b'
  WHEN 'material_source_conflict_analysis' THEN 'sha256:fe1e267d7b4b52feb615bbce67725f001b8c350028f4230190fd79554d65aed6'
  WHEN 'contract_repair' THEN 'sha256:8b441450b895c953c56532a1ccdee77645010dbfc802ccd9583fe383c7998ebc'
  ELSE manifest_digest END;

UPDATE ai.prompt_package p SET
  prompt_digest = CASE p.task_definition
    WHEN 'source_claim_extraction' THEN 'sha256:ffed0cd17cf3e1ece898cb873448e3aac1be54225af09765fa8e50507338661f'
    WHEN 'claim_evidence_linking' THEN 'sha256:d27f60ed3d12b5bfb2e72a5aead38f283de019811068c18d95ca9a66e2fa0754'
    WHEN 'material_source_conflict_analysis' THEN 'sha256:7d10127813607e157e9bb8a3b83f96ac5c03cc35011ab68c19c53b21bfaa9e6d'
    WHEN 'contract_repair' THEN 'sha256:bf175377b161d425f2ec0b7fdda11ca82b83adfddd825b289f5b370a446f992e'
    ELSE p.prompt_digest END,
  input_schema_digest = CASE p.task_definition
    WHEN 'source_claim_extraction' THEN 'sha256:a8e9a8872a6b9d618c520437a0b08ccf21a050edfa7d7d60d49940adaaa56c59'
    WHEN 'claim_evidence_linking' THEN 'sha256:6b3f4d877f040197b8cde73cf8e30ccb8d43cf40abab52cb689aa67a47cf1bed'
    WHEN 'material_source_conflict_analysis' THEN 'sha256:bfa4a1bffef1e5839f60c4258c4f47ac996d761709a62dbc6db3b000fb70ab6b'
    WHEN 'contract_repair' THEN 'sha256:7f3c3378313b7898cbf50e479f253b358361024ab4bb74229c27862efad65641'
    ELSE p.input_schema_digest END,
  output_schema_digest = CASE p.task_definition
    WHEN 'source_claim_extraction' THEN 'sha256:cee31f93e01eb4b0104fe5cb2f7f2aacc321604bb98ef84c1070c9d04318a863'
    WHEN 'claim_evidence_linking' THEN 'sha256:e0a2c8d2516621b2108c845212bc76c3dc240cebad343477afb1ef8e7f7832bc'
    WHEN 'material_source_conflict_analysis' THEN 'sha256:f461c77c0b21d8997d62c5a713c932f28c6f5aa98df604eeffa66aec1adcafd5'
    WHEN 'contract_repair' THEN 'sha256:366d50f421b82c4436679f22fade2ddbb0f02b1c80b8074762d988c71ace77e0'
    ELSE p.output_schema_digest END;
