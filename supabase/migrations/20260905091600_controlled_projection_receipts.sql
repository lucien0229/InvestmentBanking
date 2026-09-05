-- Expose the exact current selection needed for concurrent Fact reviews.
DO $$
DECLARE definition text; changed text;
BEGIN
 definition:=pg_get_functiondef('knowledge.get_fact_projection(uuid,uuid,uuid,uuid)'::regprocedure);
 changed:=replace(definition,'''qualification'',f.qualification', '''qualification'',f.qualification,''current_selection'',EXISTS(SELECT 1 FROM knowledge.fact_current_selection s WHERE s.current_fact_id=f.id),''selection_version'',(SELECT s.row_version FROM knowledge.fact_current_selection s WHERE s.current_fact_id=f.id)');
 IF changed=definition THEN RAISE EXCEPTION 'fact_selection_projection_mismatch'; END IF;
 EXECUTE changed;
 definition:=pg_get_functiondef('knowledge.get_assumption_projection(uuid,uuid,uuid,uuid)'::regprocedure);
 changed:=replace(definition,'FROM knowledge.assumption_decision ad WHERE ad.assumption_id=a.id ORDER BY ad.decision_id DESC LIMIT 1','FROM knowledge.assumption_decision ad JOIN knowledge.human_decision d ON d.id=ad.decision_id WHERE ad.assumption_id=a.id ORDER BY d.recorded_at DESC,d.id DESC LIMIT 1');
 IF changed=definition THEN RAISE EXCEPTION 'assumption_receipt_projection_mismatch'; END IF;
 EXECUTE changed;
END $$;
