-- The shared legacy trigger dereferenced columns belonging to other tables.
-- Dispatch before accessing NEW's concrete row type; preserve all required checks.
CREATE FUNCTION analysis.validate_financial_input() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 CASE TG_TABLE_NAME
 WHEN 'normalized_financial_value' THEN
  IF coalesce(NEW.source_locator,'{}')='{}' OR jsonb_typeof(NEW.source_locator)<>'object' OR (NEW.source_fragment_id IS NULL AND NEW.decision_id IS NULL AND NEW.assumption_id IS NULL) THEN RAISE EXCEPTION 'financial_value_lineage_required'; END IF;
 WHEN 'calculation_version' THEN
  IF coalesce(jsonb_array_length(NEW.definition->'measures'),0)=0 THEN RAISE EXCEPTION 'calculation_measures_required'; END IF;
 WHEN 'analysis_version' THEN
  IF NOT(NEW.draft ?& ARRAY['question','method','conclusion','limitations']) OR NEW.draft ?| ARRAY['fact','fact_id','decision','decision_id','readiness','professional_usability','external_authorization','approval_status'] OR (coalesce(array_length(NEW.calculation_run_ids,1),0)=0 AND coalesce(array_length(NEW.model_version_ids,1),0)=0 AND coalesce(array_length(NEW.scenario_version_ids,1),0)=0 AND coalesce(array_length(NEW.fact_ids,1),0)=0 AND coalesce(array_length(NEW.assumption_ids,1),0)=0 AND coalesce(array_length(NEW.evidence_ids,1),0)=0) THEN RAISE EXCEPTION 'analysis_draft_invalid'; END IF;
 ELSE RAISE EXCEPTION 'financial_input_table_invalid';
 END CASE;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION analysis.validate_financial_input() FROM PUBLIC;
CREATE OR REPLACE TRIGGER analysis_normalized_financial_value_validate BEFORE INSERT ON analysis.normalized_financial_value FOR EACH ROW EXECUTE FUNCTION analysis.validate_financial_input();
CREATE OR REPLACE TRIGGER analysis_calculation_version_validate BEFORE INSERT ON analysis.calculation_version FOR EACH ROW EXECUTE FUNCTION analysis.validate_financial_input();
CREATE OR REPLACE TRIGGER analysis_analysis_version_validate BEFORE INSERT ON analysis.analysis_version FOR EACH ROW EXECUTE FUNCTION analysis.validate_financial_input();
