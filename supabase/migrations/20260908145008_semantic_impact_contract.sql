-- Ticket 14 semantic Impact proposal contract and expanded typed closure.
DO $$ DECLARE c record; BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='analysis.material_change'::regclass AND contype='c' AND pg_get_constraintdef(oid) ILIKE '%trigger_kind%' LOOP EXECUTE format('ALTER TABLE analysis.material_change DROP CONSTRAINT %I',c.conname); END LOOP;
  ALTER TABLE analysis.material_change ADD CONSTRAINT material_change_trigger_kind_ticket14_check CHECK (trigger_kind IN ('source_record','source_condition','calculation_version','claim','fact','assumption','human_decision','source_packet_version','audience','purpose','source_perimeter','revision'));
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='analysis.impact_item'::regclass AND contype='c' AND pg_get_constraintdef(oid) ILIKE '%object_kind%' LOOP EXECUTE format('ALTER TABLE analysis.impact_item DROP CONSTRAINT %I',c.conname); END LOOP;
  ALTER TABLE analysis.impact_item ADD CONSTRAINT impact_item_object_kind_ticket14_check CHECK (object_kind IN ('source_record','source_packet_version','evidence','claim','fact','assumption','calculation_version','calculation_run','model_version','scenario_version','analysis_version','cell_range','deliverable','deliverable_revision','reader_copy','artifact','review','qc_finding','human_decision','external_use_decision','prospective_authorization','package_readiness'));
END $$;

CREATE OR REPLACE FUNCTION analysis.validate_material_trigger(p_account uuid,p_deal uuid,p_kind text,p_object uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=analysis,knowledge,source,deliverable,app,pg_catalog AS $$
DECLARE valid_trigger boolean:=false;
BEGIN
  IF p_kind='claim' THEN SELECT EXISTS(SELECT 1 FROM knowledge.claim WHERE id=p_object AND account_id=p_account AND deal_id=p_deal) INTO valid_trigger;
  ELSIF p_kind='fact' THEN SELECT EXISTS(SELECT 1 FROM knowledge.fact WHERE id=p_object AND account_id=p_account AND deal_id=p_deal) INTO valid_trigger;
  ELSIF p_kind='assumption' THEN SELECT EXISTS(SELECT 1 FROM knowledge.assumption WHERE id=p_object AND account_id=p_account AND deal_id=p_deal) INTO valid_trigger;
  ELSIF p_kind='human_decision' THEN SELECT EXISTS(SELECT 1 FROM knowledge.human_decision WHERE id=p_object AND account_id=p_account AND deal_id=p_deal) INTO valid_trigger;
  ELSIF p_kind='source_record' THEN SELECT EXISTS(SELECT 1 FROM source.source_record WHERE id=p_object AND account_id=p_account AND deal_id=p_deal) INTO valid_trigger;
  ELSIF p_kind='source_condition' THEN SELECT EXISTS(SELECT 1 FROM source.source_condition_assessment WHERE id=p_object AND account_id=p_account AND deal_id=p_deal) INTO valid_trigger;
  ELSIF p_kind='source_packet_version' THEN SELECT EXISTS(SELECT 1 FROM source.source_packet_version WHERE id=p_object AND account_id=p_account AND deal_id=p_deal) INTO valid_trigger;
  ELSIF p_kind='calculation_version' THEN SELECT EXISTS(SELECT 1 FROM analysis.calculation_version WHERE id=p_object AND account_id=p_account AND deal_id=p_deal) INTO valid_trigger;
  ELSIF p_kind='revision' THEN SELECT EXISTS(SELECT 1 FROM deliverable.deliverable_revision WHERE id=p_object AND account_id=p_account AND deal_id=p_deal) INTO valid_trigger;
  ELSIF p_kind IN ('audience','purpose','source_perimeter') THEN valid_trigger:=p_object=p_deal;
  END IF;
  IF NOT valid_trigger THEN RAISE EXCEPTION 'impact_trigger_not_found'; END IF;
END $$;

CREATE OR REPLACE FUNCTION analysis.assert_impact_scope(p_account uuid,p_actor uuid,p_deal uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=analysis,app,pg_catalog AS $$
BEGIN
  IF p_account IS DISTINCT FROM app.policy_account_id() OR p_actor IS DISTINCT FROM app.policy_actor_id() OR p_deal IS DISTINCT FROM app.policy_deal_id() THEN
    RAISE EXCEPTION 'impact_scope_mismatch';
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION analysis.assert_impact_scope(uuid,uuid,uuid) TO app_runtime;

CREATE OR REPLACE FUNCTION analysis.prevent_completed_impact_assessment_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' OR OLD.completed_at IS NOT NULL THEN RAISE EXCEPTION 'impact_assessment_completed_immutable'; END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.account_id IS DISTINCT FROM OLD.account_id OR NEW.deal_id IS DISTINCT FROM OLD.deal_id OR NEW.material_change_id IS DISTINCT FROM OLD.material_change_id OR NEW.closure_version IS DISTINCT FROM OLD.closure_version OR NEW.origin_code IS DISTINCT FROM OLD.origin_code OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'impact_assessment_immutable'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ticket14_assessment_immutable ON analysis.impact_assessment;
CREATE TRIGGER ticket14_assessment_immutable BEFORE UPDATE OR DELETE ON analysis.impact_assessment FOR EACH ROW EXECUTE FUNCTION analysis.prevent_completed_impact_assessment_mutation();

CREATE TABLE IF NOT EXISTS analysis.prospective_authorization_block (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL, deal_id uuid NOT NULL,
  assessment_id uuid NOT NULL, revision_id uuid NOT NULL, audience text NOT NULL, purpose text NOT NULL,
  perimeter_digest text NOT NULL, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id,id), UNIQUE(assessment_id,revision_id),
  FOREIGN KEY(account_id,deal_id,assessment_id) REFERENCES analysis.impact_assessment(account_id,deal_id,id),
  FOREIGN KEY(account_id,deal_id,revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id)
);
ALTER TABLE analysis.prospective_authorization_block ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis.prospective_authorization_block FORCE ROW LEVEL SECURITY;
CREATE POLICY prospective_authorization_runtime_scope ON analysis.prospective_authorization_block FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
GRANT SELECT ON analysis.prospective_authorization_block TO app_runtime;
CREATE TRIGGER ticket14_prospective_authorization_immutable BEFORE UPDATE OR DELETE ON analysis.prospective_authorization_block FOR EACH ROW EXECUTE FUNCTION analysis.prevent_ticket14_mutation();

CREATE OR REPLACE FUNCTION analysis.typed_impact_edges(p_account uuid,p_deal uuid)
RETURNS TABLE(upstream_kind text,upstream_id uuid,downstream_kind text,downstream_id uuid,dependency_role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
SELECT 'source_record'::text,x.source_record_id,'evidence'::text,x.id,'source_record_to_evidence'::text FROM knowledge.evidence x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'source_record'::text,x.source_record_id,'source_packet_version'::text,x.packet_version_id,'source_record_to_source_packet_version'::text FROM source.source_packet_member x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'evidence'::text,x.evidence_id,'claim'::text,x.claim_id,'evidence_to_claim'::text FROM knowledge.evidence_relationship x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'claim'::text,x.claim_id,'fact'::text,x.id,'claim_to_fact'::text FROM knowledge.fact x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'human_decision'::text,x.acceptance_decision_id,'fact'::text,x.id,'human_decision_to_fact'::text FROM knowledge.fact x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'fact'::text,x.id,'human_decision'::text,x.acceptance_decision_id,'fact_to_human_decision'::text FROM knowledge.fact x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'human_decision'::text,x.decision_id,'assumption'::text,x.assumption_id,'human_decision_to_assumption'::text FROM knowledge.assumption_decision x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'fact'::text,x.fact_id,'calculation_version'::text,x.calculation_version_id,'fact_to_calculation_version'::text FROM analysis.calculation_input_measure x WHERE x.account_id=p_account AND x.deal_id=p_deal AND x.fact_id IS NOT NULL
UNION
SELECT 'assumption'::text,x.assumption_id,'calculation_version'::text,x.calculation_version_id,'assumption_to_calculation_version'::text FROM analysis.calculation_input_measure x WHERE x.account_id=p_account AND x.deal_id=p_deal AND x.assumption_id IS NOT NULL
UNION
SELECT 'human_decision'::text,x.decision_id,'calculation_version'::text,x.calculation_version_id,'human_decision_to_calculation_version'::text FROM analysis.calculation_input_measure x WHERE x.account_id=p_account AND x.deal_id=p_deal AND x.decision_id IS NOT NULL
UNION
SELECT 'source_record'::text,(x.source_basis->>'source_record_id')::uuid,'calculation_version'::text,x.calculation_version_id,'source_record_to_calculation_version'::text FROM analysis.calculation_input_measure x WHERE x.account_id=p_account AND x.deal_id=p_deal AND x.source_basis->>'source_record_id' IS NOT NULL
UNION
SELECT 'fact'::text,x.fact_id,'calculation_version'::text,x.calculation_version_id,'fact_to_calculation_version'::text FROM analysis.calculation_input_fact x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'assumption'::text,x.assumption_id,'calculation_version'::text,x.calculation_version_id,'assumption_to_calculation_version'::text FROM analysis.calculation_input_assumption x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'calculation_version'::text,x.calculation_version_id,'calculation_run'::text,x.id,'calculation_version_to_calculation_run'::text FROM analysis.calculation_run x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'calculation_version'::text,x.calculation_version_id,'model_version'::text,x.model_version_id,'calculation_version_to_model_version'::text FROM analysis.model_version_calculation x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'fact'::text,x.fact_id,'model_version'::text,x.model_version_id,'fact_to_model_version'::text FROM analysis.model_version_fact x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'assumption'::text,x.assumption_id,'model_version'::text,x.model_version_id,'assumption_to_model_version'::text FROM analysis.model_version_assumption x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'model_version'::text,x.model_version_id,'scenario_version'::text,x.id,'model_version_to_scenario_version'::text FROM analysis.scenario_version x WHERE x.account_id=p_account AND x.deal_id=p_deal AND x.model_version_id IS NOT NULL
UNION
SELECT 'calculation_run'::text,x.calculation_run_id,'analysis_version'::text,x.analysis_version_id,'calculation_run_to_analysis_version'::text FROM analysis.analysis_calculation_run x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'calculation_run',v,'analysis_version',x.id,'calculation_run_to_analysis_version' FROM analysis.analysis_version x CROSS JOIN LATERAL unnest(x.calculation_run_ids) v WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'model_version'::text,x.model_version_id,'analysis_version'::text,x.analysis_version_id,'model_version_to_analysis_version'::text FROM analysis.analysis_model_version x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'model_version',v,'analysis_version',x.id,'model_version_to_analysis_version' FROM analysis.analysis_version x CROSS JOIN LATERAL unnest(x.model_version_ids) v WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'scenario_version'::text,x.scenario_version_id,'analysis_version'::text,x.analysis_version_id,'scenario_version_to_analysis_version'::text FROM analysis.analysis_scenario_version x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'scenario_version',v,'analysis_version',x.id,'scenario_version_to_analysis_version' FROM analysis.analysis_version x CROSS JOIN LATERAL unnest(x.scenario_version_ids) v WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'fact'::text,x.fact_id,'analysis_version'::text,x.analysis_version_id,'fact_to_analysis_version'::text FROM analysis.analysis_fact x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'fact',v,'analysis_version',x.id,'fact_to_analysis_version' FROM analysis.analysis_version x CROSS JOIN LATERAL unnest(x.fact_ids) v WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'assumption'::text,x.assumption_id,'analysis_version'::text,x.analysis_version_id,'assumption_to_analysis_version'::text FROM analysis.analysis_assumption x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'assumption',v,'analysis_version',x.id,'assumption_to_analysis_version' FROM analysis.analysis_version x CROSS JOIN LATERAL unnest(x.assumption_ids) v WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'evidence'::text,x.evidence_id,'analysis_version'::text,x.analysis_version_id,'evidence_to_analysis_version'::text FROM analysis.analysis_evidence x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'evidence',v,'analysis_version',x.id,'evidence_to_analysis_version' FROM analysis.analysis_version x CROSS JOIN LATERAL unnest(x.evidence_ids) v WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'calculation_run'::text,x.calculation_run_id,'deliverable_revision'::text,x.revision_id,'calculation_run_to_deliverable_revision'::text FROM deliverable.revision_calculation_run x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'model_version'::text,x.model_version_id,'deliverable_revision'::text,x.revision_id,'model_version_to_deliverable_revision'::text FROM deliverable.revision_model_version x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'scenario_version'::text,x.scenario_version_id,'deliverable_revision'::text,x.revision_id,'scenario_version_to_deliverable_revision'::text FROM deliverable.revision_scenario_version x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'source_packet_version'::text,x.packet_version_id,'deliverable_revision'::text,x.id,'source_packet_version_to_deliverable_revision'::text FROM deliverable.deliverable_revision x WHERE x.account_id=p_account AND x.deal_id=p_deal AND x.packet_version_id IS NOT NULL
UNION
SELECT 'deliverable_revision'::text,x.id,'deliverable'::text,x.deliverable_id,'deliverable_revision_to_deliverable'::text FROM deliverable.deliverable_revision x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'deliverable_revision'::text,x.revision_id,'artifact'::text,x.id,'deliverable_revision_to_artifact'::text FROM deliverable.artifact x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'deliverable_revision'::text,x.revision_id,'reader_copy'::text,x.id,'deliverable_revision_to_reader_copy'::text FROM deliverable.artifact x WHERE x.account_id=p_account AND x.deal_id=p_deal AND x.role IN ('reader','reader_preview')
UNION
SELECT 'artifact'::text,x.artifact_id,'cell_range'::text,x.id,'artifact_to_cell_range'::text FROM deliverable.artifact_region x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'cell_range'::text,x.id,'artifact'::text,x.artifact_id,'cell_range_to_artifact'::text FROM deliverable.artifact_region x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'artifact'::text,x.id,'deliverable_revision'::text,x.revision_id,'artifact_to_deliverable_revision'::text FROM deliverable.artifact x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'calculation_run'::text,x.calculation_run_id,'cell_range'::text,x.region_id,'calculation_run_to_cell_range'::text FROM deliverable.artifact_region_lineage x WHERE x.account_id=p_account AND x.deal_id=p_deal AND x.calculation_run_id IS NOT NULL
UNION
SELECT 'model_version'::text,x.model_version_id,'cell_range'::text,x.region_id,'model_version_to_cell_range'::text FROM deliverable.artifact_region_lineage x WHERE x.account_id=p_account AND x.deal_id=p_deal AND x.model_version_id IS NOT NULL
UNION
SELECT 'scenario_version'::text,x.scenario_version_id,'cell_range'::text,x.region_id,'scenario_version_to_cell_range'::text FROM deliverable.artifact_region_lineage x WHERE x.account_id=p_account AND x.deal_id=p_deal AND x.scenario_version_id IS NOT NULL
UNION
SELECT 'fact'::text,x.fact_id,'cell_range'::text,x.region_id,'fact_to_cell_range'::text FROM deliverable.artifact_region_lineage x WHERE x.account_id=p_account AND x.deal_id=p_deal AND x.fact_id IS NOT NULL
UNION
SELECT 'assumption'::text,x.assumption_id,'cell_range'::text,x.region_id,'assumption_to_cell_range'::text FROM deliverable.artifact_region_lineage x WHERE x.account_id=p_account AND x.deal_id=p_deal AND x.assumption_id IS NOT NULL
UNION
SELECT 'human_decision'::text,x.decision_id,'cell_range'::text,x.region_id,'human_decision_to_cell_range'::text FROM deliverable.artifact_region_lineage x WHERE x.account_id=p_account AND x.deal_id=p_deal AND x.decision_id IS NOT NULL
UNION
SELECT 'source_record'::text,x.source_record_id,'cell_range'::text,x.region_id,'source_record_to_cell_range'::text FROM deliverable.artifact_region_lineage x WHERE x.account_id=p_account AND x.deal_id=p_deal AND x.source_record_id IS NOT NULL
UNION
SELECT 'deliverable_revision'::text,x.revision_id,'review'::text,x.id,'deliverable_revision_to_review'::text FROM deliverable.review x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'deliverable_revision'::text,x.revision_id,'qc_finding'::text,x.id,'deliverable_revision_to_qc_finding'::text FROM deliverable.qc_finding x WHERE x.account_id=p_account AND x.deal_id=p_deal
UNION
SELECT 'deliverable_revision'::text,x.revision_id,'package_readiness'::text,x.id,'deliverable_revision_to_package_readiness'::text FROM deliverable.readiness_assessment x WHERE x.account_id=p_account AND x.deal_id=p_deal
$$;
REVOKE ALL ON FUNCTION analysis.typed_impact_edges(uuid,uuid) FROM PUBLIC,app_runtime;

CREATE OR REPLACE FUNCTION analysis.build_material_impact(p_change uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=analysis,app,extensions,pg_catalog AS $$
DECLARE c material_change%ROWTYPE; a uuid:=gen_random_uuid(); e record; root_kind text; root_id uuid;
BEGIN
  SELECT * INTO STRICT c FROM material_change WHERE id=p_change;
  INSERT INTO impact_assessment(id,account_id,deal_id,material_change_id,created_by,closure_version) VALUES(a,c.account_id,c.deal_id,c.id,c.actor_id,'ticket-14-2.0.0');
  root_kind:=CASE c.trigger_kind WHEN 'source_condition' THEN 'source_record' WHEN 'revision' THEN 'deliverable_revision' ELSE c.trigger_kind END;
  root_id:=c.trigger_object_id;
  IF c.trigger_kind='source_condition' THEN SELECT source_record_id INTO root_id FROM source.source_condition_assessment WHERE id=c.trigger_object_id; END IF;
  IF c.trigger_kind IN ('audience','purpose','source_perimeter') THEN
    FOR e IN SELECT r.id FROM deliverable.deliverable_revision r JOIN deliverable.deliverable d ON d.current_revision_id=r.id WHERE r.account_id=c.account_id AND r.deal_id=c.deal_id LOOP
      PERFORM analysis.add_impact_item(a,c.trigger_kind,c.trigger_object_id,'deliverable_revision',e.id,'changed_use_scope','materially_affected',false,true,true,true,jsonb_build_object('deterministic',true,'scope_change',c.trigger_kind));
    END LOOP;
  ELSE
    PERFORM analysis.add_impact_item(a,c.trigger_kind,c.trigger_object_id,root_kind,root_id,'material_change','materially_affected',root_kind='calculation_version',root_kind='deliverable_revision',true,true,jsonb_build_object('deterministic',true,'origin',c.origin_code,'reason',c.reason));
    IF c.previous_object_id IS NOT NULL AND c.trigger_kind<>'source_condition' THEN
      PERFORM analysis.add_impact_item(a,root_kind,root_id,root_kind,c.previous_object_id,'predecessor_dependency','materially_affected',root_kind='calculation_version',root_kind='deliverable_revision',true,true,jsonb_build_object('deterministic',true,'predecessor',true));
    END IF;
  END IF;
  -- UNION reaches a fixed point, including cycles, without dropping typed edges.
  FOR e IN WITH RECURSIVE edges AS MATERIALIZED (SELECT * FROM analysis.typed_impact_edges(c.account_id,c.deal_id)),
    reached(kind,id) AS (
      SELECT object_kind,object_id FROM impact_item WHERE assessment_id=a
      UNION SELECT edge.downstream_kind,edge.downstream_id FROM reached r JOIN edges edge ON edge.upstream_kind=r.kind AND edge.upstream_id=r.id
    ) SELECT DISTINCT edge.* FROM edges edge JOIN reached r ON r.kind=edge.upstream_kind AND r.id=edge.upstream_id
  LOOP
    PERFORM analysis.add_impact_item(a,e.upstream_kind,e.upstream_id,e.downstream_kind,e.downstream_id,e.dependency_role,'materially_affected',e.downstream_kind IN ('calculation_version','calculation_run'),e.downstream_kind IN ('model_version','scenario_version','analysis_version','deliverable_revision','artifact','reader_copy','cell_range'),true,true,jsonb_build_object('deterministic',true));
  END LOOP;
  -- Exact unaffected versions remain valid and never receive authorization blocks.
  INSERT INTO impact_item(account_id,deal_id,assessment_id,object_kind,object_id,impact_code,basis)
  SELECT c.account_id,c.deal_id,a,v.kind,v.id,'unaffected','{"deterministic":true,"scope_exclusion":true}'::jsonb
  FROM (SELECT 'analysis_version'::text kind,id FROM analysis.analysis_version WHERE account_id=c.account_id AND deal_id=c.deal_id UNION ALL SELECT 'deliverable_revision',id FROM deliverable.deliverable_revision WHERE account_id=c.account_id AND deal_id=c.deal_id) v
  WHERE NOT EXISTS(SELECT 1 FROM impact_item i WHERE i.assessment_id=a AND i.object_kind=v.kind AND i.object_id=v.id);
  FOR e IN SELECT r.* FROM deliverable.deliverable_revision r JOIN impact_item i ON i.object_id=r.id AND i.object_kind='deliverable_revision' AND i.impact_code<>'unaffected' WHERE i.assessment_id=a LOOP
    INSERT INTO analysis.prospective_authorization_block(account_id,deal_id,assessment_id,revision_id,audience,purpose,perimeter_digest,reason)
    VALUES(c.account_id,c.deal_id,a,e.id,e.audience,e.purpose,encode(extensions.digest(coalesce(e.packet_version_id::text,'no_packet'),'sha256'),'hex'),'Material change requires an exact new Revision and fresh use authorization.');
    PERFORM analysis.add_impact_item(a,'deliverable_revision',e.id,'prospective_authorization',e.id,'authorization_boundary','materially_affected',false,false,true,true,jsonb_build_object('deterministic',true,'prior_authorization_carries_forward',false));
  END LOOP;
  RETURN a;
END $$;

CREATE OR REPLACE FUNCTION analysis.authorization_scope_matches(p_account uuid,p_deal uuid,p_revision uuid,p_audience text,p_purpose text,p_perimeter_digest text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=analysis,app,pg_catalog AS $$
  SELECT p_account=app.policy_account_id() AND p_deal=app.policy_deal_id()
    AND NOT EXISTS (SELECT 1 FROM analysis.prospective_authorization_block b WHERE b.account_id=p_account AND b.deal_id=p_deal AND b.revision_id=p_revision)
    AND EXISTS (SELECT 1 FROM deliverable.deliverable_revision r WHERE r.account_id=p_account AND r.deal_id=p_deal AND r.id=p_revision AND r.audience=p_audience AND r.purpose=p_purpose)
    AND p_perimeter_digest=(SELECT encode(extensions.digest(coalesce(r.packet_version_id::text,'no_packet'),'sha256'),'hex') FROM deliverable.deliverable_revision r WHERE r.id=p_revision AND r.account_id=p_account AND r.deal_id=p_deal);
$$;
GRANT EXECUTE ON FUNCTION analysis.authorization_scope_matches(uuid,uuid,uuid,text,text,text) TO app_runtime;

DO $$ DECLARE c record; BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='ai.task_definition'::regclass AND contype='c' AND pg_get_constraintdef(oid) ILIKE '%task_definition%' LOOP EXECUTE format('ALTER TABLE ai.task_definition DROP CONSTRAINT %I',c.conname); END LOOP;
  ALTER TABLE ai.task_definition ADD CONSTRAINT ai_task_definition_ticket14_check CHECK (task_definition IN ('source_claim_extraction','claim_evidence_linking','material_source_conflict_analysis','contract_repair','financial_semantic_extraction','financial_normalization_mapping','sell_side_analysis_draft','valuation_commentary_draft','workbook_commentary_draft','deliverable_semantic_qc','native_reader_semantic_parity_review','semantic_change_impact_proposal'));
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='ai.proposal'::regclass AND contype='c' AND pg_get_constraintdef(oid) ILIKE '%proposal_kind%' LOOP EXECUTE format('ALTER TABLE ai.proposal DROP CONSTRAINT %I',c.conname); END LOOP;
  ALTER TABLE ai.proposal ADD CONSTRAINT ai_proposal_kind_ticket14_check CHECK (proposal_kind IN ('claim','evidence_link','conflict','normalized_value_proposal','mapping_proposal','analysis_draft','workbook_commentary','semantic_qc_finding','parity_finding','semantic_change_impact_proposal'));
END $$;
INSERT INTO ai.task_definition(task_definition,task_family,task_definition_version,input_contract_version,output_contract_version,logical_model_role,lifecycle_status,manifest_digest)
VALUES ('semantic_change_impact_proposal','change_impact_proposal','1.0.0','1.0.0','1.0.0','reasoning_primary','enabled','sha256:08bbda4c148feea44e54f28cedeb8bb86365d225bea3097d8f5456cf719f189c') ON CONFLICT (task_definition,task_definition_version) DO UPDATE SET lifecycle_status='enabled';
INSERT INTO ai.prompt_package(task_definition,task_definition_version,package_version,prompt_digest,input_schema_digest,output_schema_digest,context_plan_version,ai_evidence_policy_version,lifecycle_status)
SELECT 'semantic_change_impact_proposal','1.0.0','1.0.0','sha256:203f759e3bbb914b1269a821706cac4cc5004585c4b98790dd18e481588f376c','sha256:142942fd18d137dedd82c7e3f4a90bb95d0b91159624db46e859aa304eafb7cc','sha256:31f162fa4246420e985c9219145f573b5fda4fdee3c19b04dd47755a6db63150','1.0.0','1.0.0','enabled'
WHERE NOT EXISTS (SELECT 1 FROM ai.prompt_package WHERE task_definition='semantic_change_impact_proposal' AND package_version='1.0.0');
INSERT INTO ai.task_enablement(task_definition,task_definition_version,prompt_package_id,provider_profile_id,environment_code,provenance_class,confidentiality_class,status_code,reason,enabled_at)
SELECT 'semantic_change_impact_proposal','1.0.0',p.id,profile.id,profile.environment_code,c.provenance,c.confidentiality,'enabled','Ticket 14 deterministic-closure semantic proposal; proposal-only',clock_timestamp()
FROM ai.prompt_package p JOIN ai.provider_capability_profile profile ON profile.provider_code='hellox' AND profile.lifecycle_status='enabled' CROSS JOIN (VALUES ('synthetic','public'),('synthetic','internal'),('real','public'),('real','internal')) c(provenance,confidentiality)
WHERE p.task_definition='semantic_change_impact_proposal' AND p.package_version='1.0.0' ON CONFLICT DO NOTHING;

-- Recheck/readiness boundary: Impact decisions never rewrite a predecessor's
-- bytes or silently restore its readiness. A fresh exact Revision is required.
DO $$
DECLARE definition text;
BEGIN
  IF to_regprocedure('deliverable.assess_readiness(uuid,text,text)') IS NOT NULL
     AND to_regprocedure('deliverable.assess_readiness_base_ticket14(uuid,text,text)') IS NULL THEN
    ALTER FUNCTION deliverable.assess_readiness(uuid,text,text) RENAME TO assess_readiness_base_ticket14;
  END IF;
END $$;
CREATE OR REPLACE FUNCTION deliverable.assess_readiness(p_revision uuid,p_purpose text,p_audience text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=deliverable,analysis,app,pg_catalog AS $$
DECLARE result jsonb; blocked jsonb;
BEGIN
  result:=deliverable.assess_readiness_base_ticket14(p_revision,p_purpose,p_audience);
  SELECT coalesce(jsonb_agg(jsonb_build_object('code','material_change_impact_pending','gate','analysis_ready','outcome','failed','recovery','Complete the exact Impact actions and create a fresh Revision.')),'[]'::jsonb)
  INTO blocked
  FROM analysis.impact_item i JOIN analysis.impact_assessment a ON a.id=i.assessment_id
  JOIN deliverable.deliverable_revision r ON r.id=i.object_id
  WHERE i.object_kind='deliverable_revision' AND i.object_id=p_revision AND i.impact_code<>'unaffected'
    AND (a.completed_at IS NULL OR i.circulation_blocked);
  IF jsonb_array_length(blocked)>0 THEN
    result:=result || jsonb_build_object('posture','blocked','external_use_authorized',false,'blockers',coalesce(result->'blockers','[]'::jsonb)||blocked);
    UPDATE deliverable.readiness_assessment SET assessment=result,basis_digest=encode(extensions.digest(result::text,'sha256'),'hex') WHERE revision_id=p_revision AND purpose=p_purpose AND audience=p_audience;
  END IF;
  RETURN result;
END $$;
GRANT EXECUTE ON FUNCTION deliverable.assess_readiness(uuid,text,text) TO app_runtime,app_deliverable_owner;
REVOKE ALL ON FUNCTION deliverable.assess_readiness_base_ticket14(uuid,text,text) FROM PUBLIC,app_runtime;

-- No disposition can make an unresolved action look recovered; completed
-- assessments are then immutable through the trigger above.
CREATE OR REPLACE FUNCTION analysis.record_impact_disposition(p_account uuid,p_actor uuid,p_deal uuid,p_assessment uuid,p_items jsonb,p_rationale text,p_follow_up jsonb,p_key_hash text,p_request_digest text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=analysis,app,pg_catalog AS $$
DECLARE prior analysis.command_idempotency%ROWTYPE; x jsonb; item_row impact_item%ROWTYPE; action text; count_items integer:=0; pending integer; result jsonb;
BEGIN
  PERFORM analysis.assert_impact_scope(p_account,p_actor,p_deal);
  SELECT * INTO prior FROM analysis.command_idempotency WHERE account_id=p_account AND actor_id=p_actor AND deal_id=p_deal AND command_type='record_impact_disposition' AND key_hash=p_key_hash;
  IF FOUND THEN IF prior.request_digest<>p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused'; END IF; RETURN jsonb_build_object('assessment_id',p_assessment,'status','replayed','idempotent_replayed',true); END IF;
  IF NOT EXISTS(SELECT 1 FROM impact_assessment WHERE id=p_assessment AND account_id=p_account AND deal_id=p_deal AND completed_at IS NULL) THEN RAISE EXCEPTION 'impact_assessment_not_found'; END IF;
  IF jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'impact_disposition_required'; END IF;
  FOR x IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO item_row FROM impact_item WHERE id=(x->>'impact_item_id')::uuid AND assessment_id=p_assessment AND account_id=p_account AND deal_id=p_deal FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'impact_item_not_found'; END IF;
    action:=x->>'disposition_code';
    IF action='recalculate' AND NOT item_row.recalculation_required THEN RAISE EXCEPTION 'impact_action_mismatch'; END IF;
    IF action='regenerate' AND NOT item_row.regeneration_required THEN RAISE EXCEPTION 'impact_action_mismatch'; END IF;
    IF action='rereview' AND NOT item_row.rereview_required THEN RAISE EXCEPTION 'impact_action_mismatch'; END IF;
    IF action='block_circulation' AND NOT item_row.circulation_blocked THEN RAISE EXCEPTION 'impact_action_mismatch'; END IF;
    IF action='retain_unaffected' AND item_row.impact_code<>'unaffected' THEN RAISE EXCEPTION 'impact_action_mismatch'; END IF;
    INSERT INTO impact_disposition(account_id,deal_id,assessment_id,impact_item_id,disposition_code,rationale,follow_up,decided_by) VALUES(p_account,p_deal,p_assessment,item_row.id,action,p_rationale,coalesce(p_follow_up,'{}'),p_actor);
    count_items:=count_items+1;
  END LOOP;
  SELECT count(*) INTO pending FROM impact_item i WHERE i.assessment_id=p_assessment AND NOT EXISTS(SELECT 1 FROM impact_disposition d WHERE d.impact_item_id=i.id);
  UPDATE impact_assessment SET status=CASE WHEN pending=0 AND NOT EXISTS(SELECT 1 FROM impact_disposition d WHERE d.assessment_id=p_assessment AND d.disposition_code='unable_to_assess') THEN 'recovered' ELSE 'partially_recovered' END, completed_at=CASE WHEN pending=0 THEN now() ELSE NULL END WHERE id=p_assessment;
  result:=jsonb_build_object('assessment_id',p_assessment,'dispositions',count_items,'status',(SELECT status FROM impact_assessment WHERE id=p_assessment),'idempotent_replayed',false);
  INSERT INTO analysis.command_idempotency(account_id,actor_id,deal_id,command_type,key_hash,request_digest,result_id) VALUES(p_account,p_actor,p_deal,'record_impact_disposition',p_key_hash,p_request_digest,p_assessment);
  RETURN result;
END $$;
GRANT EXECUTE ON FUNCTION analysis.record_impact_disposition(uuid,uuid,uuid,uuid,jsonb,text,jsonb,text,text) TO app_runtime;
