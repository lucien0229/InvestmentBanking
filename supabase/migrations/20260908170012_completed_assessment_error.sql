-- Distinguish completed immutable assessments from missing assessments.

CREATE OR REPLACE FUNCTION analysis.record_impact_disposition(p_account uuid,p_actor uuid,p_deal uuid,p_assessment uuid,p_items jsonb,p_rationale text,p_follow_up jsonb,p_key_hash text,p_request_digest text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=analysis,app,pg_catalog AS $$
DECLARE prior analysis.command_idempotency%ROWTYPE; x jsonb; item_row impact_item%ROWTYPE; action text; count_items integer:=0; pending integer; result jsonb;
BEGIN
  PERFORM analysis.assert_impact_scope(p_account,p_actor,p_deal);
  SELECT * INTO prior FROM analysis.command_idempotency WHERE account_id=p_account AND actor_id=p_actor AND deal_id=p_deal AND command_type='record_impact_disposition' AND key_hash=p_key_hash;
  IF FOUND THEN IF prior.request_digest<>p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused'; END IF; RETURN jsonb_build_object('assessment_id',p_assessment,'status','replayed','idempotent_replayed',true); END IF;
  IF EXISTS(SELECT 1 FROM impact_assessment WHERE id=p_assessment AND account_id=p_account AND deal_id=p_deal AND completed_at IS NOT NULL) THEN RAISE EXCEPTION 'impact_assessment_completed_immutable'; END IF;
  IF NOT EXISTS(SELECT 1 FROM impact_assessment WHERE id=p_assessment AND account_id=p_account AND deal_id=p_deal) THEN RAISE EXCEPTION 'impact_assessment_not_found'; END IF;
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
  SELECT count(*) INTO pending FROM impact_item i WHERE i.assessment_id=p_assessment AND NOT analysis.impact_item_resolved(i.id);
  UPDATE impact_assessment SET status=CASE WHEN pending=0 AND NOT EXISTS(SELECT 1 FROM impact_disposition d WHERE d.assessment_id=p_assessment AND d.disposition_code='unable_to_assess') THEN 'recovered' ELSE 'partially_recovered' END, completed_at=CASE WHEN pending=0 THEN now() ELSE NULL END WHERE id=p_assessment;
  result:=jsonb_build_object('assessment_id',p_assessment,'dispositions',count_items,'status',(SELECT status FROM impact_assessment WHERE id=p_assessment),'idempotent_replayed',false);
  INSERT INTO analysis.command_idempotency(account_id,actor_id,deal_id,command_type,key_hash,request_digest,result_id) VALUES(p_account,p_actor,p_deal,'record_impact_disposition',p_key_hash,p_request_digest,p_assessment);
  RETURN result;
END $$;;
