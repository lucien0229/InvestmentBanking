-- Closed, proposal-only workbook AI contracts.
ALTER TABLE ai.task_definition DROP CONSTRAINT ai_task_definition_ticket11_check;
ALTER TABLE ai.task_definition ADD CONSTRAINT ai_task_definition_code_check CHECK(task_definition IN ('source_claim_extraction','claim_evidence_linking','material_source_conflict_analysis','contract_repair','financial_semantic_extraction','financial_normalization_mapping','sell_side_analysis_draft','valuation_commentary_draft','workbook_commentary_draft','deliverable_semantic_qc','native_reader_semantic_parity_review'));
ALTER TABLE ai.proposal DROP CONSTRAINT ai_proposal_kind_forward_check;
ALTER TABLE ai.proposal ADD CONSTRAINT ai_proposal_kind_check CHECK(proposal_kind IN ('claim','evidence_link','conflict','normalized_value_proposal','mapping_proposal','analysis_draft','workbook_commentary','semantic_qc_finding','parity_finding'));
INSERT INTO ai.task_definition(task_definition,task_family,task_definition_version,input_contract_version,output_contract_version,logical_model_role,lifecycle_status,manifest_digest) VALUES('workbook_commentary_draft','deliverable_content_draft','1.0.0','1.0.0','1.0.0','reasoning_primary','enabled','sha256:cfabe984d63b4404f0c91dfda2c602ae1bad6963837438a0160e50d7c2bc6e00');
INSERT INTO ai.prompt_package(task_definition,task_definition_version,package_version,prompt_digest,input_schema_digest,output_schema_digest,context_plan_version,ai_evidence_policy_version,lifecycle_status) VALUES('workbook_commentary_draft','1.0.0','1.0.0','sha256:daec3bb5a61eada9bf6080e033399df7cceee4c074de385bfede9b8c094452e7','sha256:5d8e9ce2a0f0f02b72799d1c68e76309e37f7c18b7124bc3d7c971c80c7ef1b1','sha256:a159e7710befda4dd1171d9a7e3a12ffab1423e0f1d78e5dfa5b2d1bee45ae60','1.0.0','1.0.0','enabled');
INSERT INTO ai.task_definition(task_definition,task_family,task_definition_version,input_contract_version,output_contract_version,logical_model_role,lifecycle_status,manifest_digest) VALUES('deliverable_semantic_qc','semantic_qc_review','1.0.0','1.0.0','1.0.0','reasoning_primary','enabled','sha256:8ef205b3e240a07f673dd630a9a54ccaa36547ee8a4b7024491d5c6d818d4b4f');
INSERT INTO ai.prompt_package(task_definition,task_definition_version,package_version,prompt_digest,input_schema_digest,output_schema_digest,context_plan_version,ai_evidence_policy_version,lifecycle_status) VALUES('deliverable_semantic_qc','1.0.0','1.0.0','sha256:198712c5a5bcf968d1a8f96f97c88e981141a77137b042e77b0b13d818c0032d','sha256:6b8767dd79641d575933482522d188325c9a270c07c2e9b37df702e1c5032776','sha256:a80bd6436d2f7fbb4ee17c334dd6ece613696186b52d38dbdabdf4ec3b3d5878','1.0.0','1.0.0','enabled');
INSERT INTO ai.task_definition(task_definition,task_family,task_definition_version,input_contract_version,output_contract_version,logical_model_role,lifecycle_status,manifest_digest) VALUES('native_reader_semantic_parity_review','semantic_qc_review','1.0.0','1.0.0','1.0.0','reasoning_primary','enabled','sha256:22be8bd27f932f0c430afa060e866344a1e343c0f50cd18fd562aaa693b146f8');
INSERT INTO ai.prompt_package(task_definition,task_definition_version,package_version,prompt_digest,input_schema_digest,output_schema_digest,context_plan_version,ai_evidence_policy_version,lifecycle_status) VALUES('native_reader_semantic_parity_review','1.0.0','1.0.0','sha256:cb27c9e3ca9b6823508e8deb41fe09aa691bc044d28eaf4742d42c91eb3ce7cd','sha256:02f591629751af95a4e20d19db933c9fe8c1376e0ddc4a5ea80509e00cad72a0','sha256:78239b280bce0eaa670e149e027aadded3f78e9f10dbb9a48f4ccbbd97dfafd8','1.0.0','1.0.0','enabled');
INSERT INTO ai.task_enablement(task_definition,task_definition_version,prompt_package_id,provider_profile_id,environment_code,provenance_class,confidentiality_class,status_code,reason,enabled_at)
SELECT t.task_definition,t.task_definition_version,p.id,profile.id,profile.environment_code,c.provenance,c.confidentiality,'enabled','Exact workbook Revision proposal-only evaluation',clock_timestamp()
FROM ai.task_definition t JOIN ai.prompt_package p ON p.task_definition=t.task_definition AND p.task_definition_version=t.task_definition_version
JOIN ai.provider_capability_profile profile ON profile.environment_code IN ('local','development') AND profile.provider_code='hellox' AND profile.lifecycle_status='enabled'
CROSS JOIN (VALUES('synthetic','public'),('synthetic','internal'),('real','public'),('real','internal')) c(provenance,confidentiality)
WHERE t.task_definition IN ('workbook_commentary_draft','deliverable_semantic_qc','native_reader_semantic_parity_review') ON CONFLICT DO NOTHING;

CREATE TABLE deliverable.ai_revision_run (
 account_id uuid NOT NULL,deal_id uuid NOT NULL,revision_id uuid NOT NULL,ai_run_id uuid NOT NULL REFERENCES ai.run(id),
 PRIMARY KEY(ai_run_id),FOREIGN KEY(account_id,deal_id,revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id)
);
ALTER TABLE deliverable.ai_revision_run ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable.ai_revision_run FORCE ROW LEVEL SECURITY;
CREATE POLICY workbook_ai_read_scope ON deliverable.ai_revision_run FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY workbook_ai_write_scope ON deliverable.ai_revision_run TO app_deliverable_owner USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id()) WITH CHECK(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
GRANT SELECT ON deliverable.ai_revision_run TO app_runtime;
GRANT SELECT,INSERT ON deliverable.ai_revision_run TO app_deliverable_owner;
CREATE TRIGGER workbook_ai_immutable BEFORE UPDATE OR DELETE ON deliverable.ai_revision_run FOR EACH ROW EXECUTE FUNCTION deliverable.immutable_record();
CREATE FUNCTION deliverable.attach_ai_revision(p_run uuid,p_revision uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM deliverable.deliverable_revision WHERE id=p_revision) OR NOT EXISTS(SELECT 1 FROM ai.run WHERE id=p_run AND account_id=app.policy_account_id() AND deal_id=app.policy_deal_id() AND task_definition IN ('workbook_commentary_draft','deliverable_semantic_qc','native_reader_semantic_parity_review')) THEN RAISE EXCEPTION 'ai_artifact_scope_invalid' USING ERRCODE='42501'; END IF;
 INSERT INTO deliverable.ai_revision_run VALUES(app.policy_account_id(),app.policy_deal_id(),p_revision,p_run);
END $$;
GRANT CREATE ON SCHEMA deliverable TO app_deliverable_owner;
ALTER FUNCTION deliverable.attach_ai_revision(uuid,uuid) OWNER TO app_deliverable_owner;
REVOKE ALL ON FUNCTION deliverable.attach_ai_revision(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION deliverable.attach_ai_revision(uuid,uuid) TO app_runtime;
REVOKE CREATE ON SCHEMA deliverable FROM app_deliverable_owner;
