-- A native selector is only unique within its Representation. Persist both.
ALTER TABLE analysis.normalized_financial_value ADD COLUMN source_basis jsonb;
ALTER TABLE analysis.calculation_input_measure ADD COLUMN source_basis jsonb;
GRANT SELECT ON knowledge.human_decision_evidence,knowledge.evidence_relationship,knowledge.native_locator TO app_analysis_owner;
CREATE POLICY financial_basis_decision_evidence ON knowledge.human_decision_evidence FOR SELECT TO app_analysis_owner USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY financial_basis_relationship ON knowledge.evidence_relationship FOR SELECT TO app_analysis_owner USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY financial_basis_locator ON knowledge.native_locator FOR SELECT TO app_analysis_owner USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE FUNCTION analysis.guard_financial_source_basis() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.source_basis IS NULL THEN RETURN NEW; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM knowledge.fact f JOIN knowledge.human_decision_evidence de ON de.decision_id=f.acceptance_decision_id
  JOIN knowledge.evidence_relationship er ON er.id=de.evidence_relationship_id AND er.claim_id=f.claim_id AND er.relationship_code='supports'
  JOIN knowledge.evidence e ON e.id=er.evidence_id JOIN knowledge.native_locator n ON n.id=e.native_locator_id
  WHERE f.id=(NEW.source_basis->>'fact_id')::uuid AND f.account_id=NEW.account_id AND f.deal_id=NEW.deal_id AND f.acceptance_decision_id=NEW.decision_id
  AND e.id=(NEW.source_basis->>'evidence_id')::uuid AND e.source_record_id=(NEW.source_basis->>'source_record_id')::uuid AND e.representation_id=(NEW.source_basis->>'representation_id')::uuid
  AND n.selector=NEW.source_locator AND n.resolution_status='resolved'
 ) THEN RAISE EXCEPTION 'cross_deal_dependency'; END IF;
 IF TG_TABLE_NAME='calculation_input_measure' AND to_jsonb(NEW)->>'fact_id' IS DISTINCT FROM NEW.source_basis->>'fact_id' THEN RAISE EXCEPTION 'cross_deal_dependency'; END IF;
 RETURN NEW;
END $$;
GRANT CREATE ON SCHEMA analysis TO app_analysis_owner;
ALTER FUNCTION analysis.guard_financial_source_basis() OWNER TO app_analysis_owner;
REVOKE ALL ON FUNCTION analysis.guard_financial_source_basis() FROM PUBLIC;
CREATE TRIGGER financial_value_source_basis BEFORE INSERT ON analysis.normalized_financial_value FOR EACH ROW EXECUTE FUNCTION analysis.guard_financial_source_basis();
CREATE TRIGGER calculation_measure_source_basis BEFORE INSERT ON analysis.calculation_input_measure FOR EACH ROW EXECUTE FUNCTION analysis.guard_financial_source_basis();
DO $$
DECLARE definition text; changed text;
BEGIN
 definition:=pg_get_functiondef('analysis.create_normalized_financial_value(uuid,uuid,uuid,text,text,text,text,text,text,text,integer,text,text,jsonb,uuid,uuid,uuid)'::regprocedure);
 changed:=replace(definition,'FUNCTION analysis.create_normalized_financial_value(', 'FUNCTION analysis.create_normalized_financial_value_with_basis(');
 changed:=replace(changed,'p_assumption_id uuid)', 'p_assumption_id uuid, p_source_basis jsonb)');
 changed:=replace(changed,'source_fragment_id,decision_id,assumption_id) VALUES', 'source_fragment_id,decision_id,assumption_id,source_basis) VALUES');
 changed:=replace(changed,'p_source_fragment_id,p_decision_id,p_assumption_id);', 'p_source_fragment_id,p_decision_id,p_assumption_id,p_source_basis);');
 IF position('assumption_id,source_basis) VALUES' in changed)=0 THEN RAISE EXCEPTION 'normalized_source_basis_migration_mismatch'; END IF;
 EXECUTE changed;
 definition:=pg_get_functiondef('analysis.create_calculation_version(uuid,uuid,uuid,uuid,bigint,text,text,text,text,text,text,text,text,text,jsonb)'::regprocedure);
 changed:=replace(definition,'source_locator,fact_id,assumption_id,decision_id) VALUES','source_locator,fact_id,assumption_id,decision_id,source_basis) VALUES');
 changed:=replace(changed,'nullif(measure->>''decision_id'','''')::uuid);','nullif(measure->>''decision_id'','''')::uuid,measure->''source_basis'');');
 IF changed=definition THEN RAISE EXCEPTION 'calculation_source_basis_migration_mismatch'; END IF;
 EXECUTE changed;
 -- Downstream Artifact input must use the same selected file, including when
 -- another accepted Source has an identical sheet/cell selector.
 definition:=pg_get_functiondef('deliverable.build_input(uuid,uuid,jsonb,jsonb)'::regprocedure);
 changed:=replace(definition,'AND n.selector=measure.source_locator AND s.disposition_code=', 'AND (measure.source_basis IS NULL OR (e.id=(measure.source_basis->>''evidence_id'')::uuid AND n.source_record_id=(measure.source_basis->>''source_record_id'')::uuid AND n.representation_id=(measure.source_basis->>''representation_id'')::uuid)) AND n.selector=measure.source_locator AND s.disposition_code=');
 changed:=replace(changed,'AND n.source_locator=measure.source_locator ORDER BY', 'AND n.source_locator=measure.source_locator AND (measure.source_basis IS NULL OR n.source_basis=measure.source_basis) ORDER BY');
 -- The expected equity benchmark is retained in the Calculation definition;
 -- the financial workbook consumes its three formula inputs.
 changed:=replace(changed,'AND deal_id=parent.deal_id ORDER BY measure_key LOOP','AND deal_id=parent.deal_id AND measure_key IN (''enterprise_value'',''cash'',''debt'') ORDER BY measure_key LOOP');
 IF changed=definition THEN RAISE EXCEPTION 'artifact_source_basis_migration_mismatch'; END IF;
 EXECUTE changed;
END $$;
ALTER FUNCTION analysis.create_normalized_financial_value_with_basis(uuid,uuid,uuid,text,text,text,text,text,text,text,integer,text,text,jsonb,uuid,uuid,uuid,jsonb) OWNER TO app_analysis_owner;
REVOKE ALL ON FUNCTION analysis.create_normalized_financial_value_with_basis(uuid,uuid,uuid,text,text,text,text,text,text,text,integer,text,text,jsonb,uuid,uuid,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION analysis.create_normalized_financial_value_with_basis(uuid,uuid,uuid,text,text,text,text,text,text,text,integer,text,text,jsonb,uuid,uuid,uuid,jsonb) TO app_runtime;
REVOKE CREATE ON SCHEMA analysis FROM app_analysis_owner;
