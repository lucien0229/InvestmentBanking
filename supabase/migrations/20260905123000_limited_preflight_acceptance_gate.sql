-- Limited results remain restricted until the current exact scope is accepted.
-- Replaces functions forward; prior applied migrations remain unchanged.
CREATE OR REPLACE FUNCTION app.create_paid_preflight(p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_key_hash text, p_request_digest text)
RETURNS TABLE(preflight_id uuid, result text, reason_code text, recovery_action text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
DECLARE prior_cmd app.deal_command_idempotency%ROWTYPE; deal_row app.deal%ROWTYPE; draft app.deal_setup_draft%ROWTYPE; prior app.paid_preflight%ROWTYPE; v_result text; v_reason text; v_recovery text; v_ceiling text; v_permitted text[] := '{}'; v_excluded text[] := ARRAY['ai','rendering','provider_egress','external_distribution']; v_controls jsonb := '[]'::jsonb; new_id uuid;
  purchase_outcome text; identity_outcome text; use_outcome text; rights_outcome text; confidentiality_outcome text; processing_outcome text; compatibility_outcome text; packet_outcome text;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() THEN RAISE EXCEPTION 'deal scope mismatch' USING ERRCODE = '42501'; END IF;
  SELECT * INTO prior_cmd FROM app.deal_command_idempotency WHERE account_id=p_account_id AND actor_id=p_actor_id AND command_type='create_paid_preflight' AND key_hash=p_key_hash;
  IF FOUND THEN
    IF prior_cmd.request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE = '23505'; END IF;
    SELECT p.id,p.result,p.reason_code,p.recovery_action INTO new_id,v_result,v_reason,v_recovery FROM app.paid_preflight p WHERE p.deal_id=prior_cmd.deal_id ORDER BY p.version DESC LIMIT 1;
    RETURN QUERY SELECT new_id,v_result,v_reason,v_recovery; RETURN;
  END IF;
  SELECT * INTO deal_row FROM app.deal WHERE id=p_deal_id AND account_id=p_account_id AND deal_class='paid_customer' FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO draft FROM app.deal_setup_draft WHERE deal_id=p_deal_id ORDER BY version DESC LIMIT 1;
  IF draft.id IS NULL THEN RETURN; END IF;
  purchase_outcome := CASE WHEN EXISTS (SELECT 1 FROM app.checkout_terms_acceptance ta WHERE ta.id=deal_row.purchase_authority_acknowledgement_id AND ta.account_id=p_account_id AND ta.actor_id=p_actor_id) THEN 'pass' ELSE 'waiting' END;
  identity_outcome := CASE WHEN deal_row.identity_confirmed_by IS NOT NULL AND deal_row.identity_accepted_at IS NOT NULL THEN 'pass' ELSE 'blocked' END;
  rights_outcome := CASE draft.source_rights WHEN 'confirmed' THEN 'pass' WHEN 'limited' THEN 'limited' WHEN 'blocked' THEN 'blocked' ELSE 'waiting' END;
  use_outcome := CASE WHEN draft.intended_use='external_distribution' OR draft.intended_audience IN ('external_recipients','external_audience') THEN 'limited' ELSE 'pass' END;
  confidentiality_outcome := CASE WHEN draft.confidentiality_class='restricted' AND draft.processing_path='local_deterministic_and_approved_ai' THEN 'blocked' ELSE 'pass' END;
  processing_outcome := CASE WHEN draft.processing_path='local_deterministic_and_approved_ai' AND ('unknown'=ANY(draft.provider_restrictions) OR cardinality(draft.provider_restrictions)=0) THEN 'waiting' ELSE 'pass' END;
  compatibility_outcome := CASE WHEN draft.compatibility='blocked' THEN 'blocked' WHEN draft.compatibility='review_required' THEN 'waiting' ELSE 'pass' END;
  packet_outcome := CASE draft.minimum_packet WHEN 'complete' THEN 'pass' WHEN 'incomplete' THEN 'waiting' ELSE 'waiting' END;
  IF purchase_outcome='waiting' THEN v_result:='waiting-for-user'; v_reason:='purchase_authority_missing'; v_recovery:='record_purchase_authority';
  ELSIF identity_outcome='blocked' THEN v_result:='blocked'; v_reason:='deal_identity_incomplete'; v_recovery:='complete_deal_identity';
  ELSIF rights_outcome='blocked' THEN v_result:='blocked'; v_reason:='source_rights_blocked'; v_recovery:='replace_or_remove_blocked_source';
  ELSIF confidentiality_outcome='blocked' THEN v_result:='blocked'; v_reason:='restricted_processing_path_incompatible'; v_recovery:='narrow_to_local_deterministic_only';
  ELSIF compatibility_outcome='blocked' THEN v_result:='blocked'; v_reason:='input_compatibility_blocked'; v_recovery:='replace_source_or_choose_supported_path';
  ELSIF rights_outcome='waiting' THEN v_result:='waiting-for-user'; v_reason:=CASE WHEN draft.source_reference_posture='removed' THEN 'source_reference_removed' ELSE 'source_rights_missing' END; v_recovery:=CASE WHEN draft.source_reference_posture='removed' THEN 'provide_or_replace_source_reference' ELSE 'record_source_rights' END;
  ELSIF packet_outcome='waiting' THEN v_result:='waiting-for-user'; v_reason:='minimum_packet_incomplete'; v_recovery:='complete_minimum_packet';
  ELSIF processing_outcome='waiting' THEN v_result:='waiting-for-user'; v_reason:='provider_restriction_requires_review'; v_recovery:='confirm_provider_compatibility';
  ELSIF use_outcome='limited' OR rights_outcome='limited' THEN v_result:='limited-proceed'; v_reason:=CASE WHEN rights_outcome='limited' THEN 'source_rights_limited' ELSE 'intended_use_scope_limited' END; v_recovery:='accept_exact_limited_scope';
  ELSE v_result:='pass'; v_reason:='all_preflight_controls_passed'; v_recovery:='continue_to_source_intake'; END IF;
  IF v_result='pass' THEN v_permitted := ARRAY['quarantine','parse','deterministic_analysis','internal_controlled_export']; v_ceiling := 'supported_internal_processing';
  ELSIF v_result='limited-proceed' THEN v_permitted := ARRAY['quarantine','parse','deterministic_analysis','internal_controlled_export']; v_ceiling := 'internal_analysis_and_internal_controlled_export';
  END IF;
  new_id := gen_random_uuid();
  INSERT INTO app.paid_preflight(id,account_id,deal_id,setup_draft_id,version,result,reason_code,recovery_action,permitted_scope,excluded_scope,output_ceiling,evaluated_controls,supersedes_id) VALUES (new_id,p_account_id,p_deal_id,draft.id,(SELECT coalesce(max(version),0)+1 FROM app.paid_preflight WHERE deal_id=p_deal_id),v_result,v_reason,v_recovery,v_permitted,v_excluded,v_ceiling,jsonb_build_array(jsonb_build_object('dimension','purchase_authority','outcome',purchase_outcome,'reason_code',CASE WHEN purchase_outcome='pass' THEN 'purchase_authority_confirmed' ELSE 'purchase_authority_missing' END,'recovery_action',CASE WHEN purchase_outcome='pass' THEN 'none' ELSE 'record_purchase_authority' END),jsonb_build_object('dimension','deal_identity','outcome',identity_outcome,'reason_code',CASE WHEN identity_outcome='pass' THEN 'identity_complete' ELSE 'deal_identity_incomplete' END,'recovery_action',CASE WHEN identity_outcome='pass' THEN 'none' ELSE 'complete_deal_identity' END),jsonb_build_object('dimension','intended_use','outcome',use_outcome,'reason_code',CASE WHEN use_outcome='pass' THEN 'internal_use_bounded' ELSE 'intended_use_scope_limited' END,'recovery_action',CASE WHEN use_outcome='pass' THEN 'none' ELSE 'accept_exact_limited_scope' END),jsonb_build_object('dimension','source_rights','outcome',rights_outcome,'reason_code',CASE rights_outcome WHEN 'pass' THEN 'source_rights_confirmed' WHEN 'limited' THEN 'source_rights_limited' WHEN 'blocked' THEN 'source_rights_blocked' ELSE 'source_rights_missing' END,'recovery_action',CASE rights_outcome WHEN 'pass' THEN 'none' WHEN 'limited' THEN 'accept_exact_limited_scope' WHEN 'blocked' THEN 'replace_or_remove_blocked_source' ELSE 'record_source_rights' END),jsonb_build_object('dimension','confidentiality','outcome',confidentiality_outcome,'reason_code',CASE WHEN confidentiality_outcome='pass' THEN 'confidentiality_path_compatible' ELSE 'restricted_processing_path_incompatible' END,'recovery_action',CASE WHEN confidentiality_outcome='pass' THEN 'none' ELSE 'narrow_to_local_deterministic_only' END),jsonb_build_object('dimension','processing_path','outcome',processing_outcome,'reason_code',CASE WHEN processing_outcome='pass' THEN 'processing_path_available' ELSE 'provider_restriction_requires_review' END,'recovery_action',CASE WHEN processing_outcome='pass' THEN 'none' ELSE 'confirm_provider_compatibility' END),jsonb_build_object('dimension','compatibility','outcome',compatibility_outcome,'reason_code',CASE WHEN compatibility_outcome='pass' THEN 'input_compatibility_passed' ELSE 'input_compatibility_blocked' END,'recovery_action',CASE WHEN compatibility_outcome='pass' THEN 'none' ELSE 'replace_source_or_choose_supported_path' END),jsonb_build_object('dimension','minimum_packet','outcome',packet_outcome,'reason_code',CASE WHEN packet_outcome='pass' THEN 'minimum_packet_complete' ELSE 'minimum_packet_incomplete' END,'recovery_action',CASE WHEN packet_outcome='pass' THEN 'none' ELSE 'complete_minimum_packet' END)),(SELECT id FROM app.paid_preflight WHERE deal_id=p_deal_id ORDER BY version DESC LIMIT 1));
  INSERT INTO app.preflight_control_result(account_id,deal_id,preflight_id,control_dimension,outcome_code,reason_code,recovery_action) SELECT p_account_id,p_deal_id,new_id,control->>'dimension',control->>'outcome',control->>'reason_code',control->>'recovery_action' FROM jsonb_array_elements((SELECT evaluated_controls FROM app.paid_preflight WHERE id=new_id)) control;
  UPDATE app.deal_workspace SET paid_preflight_status=v_result,processing_posture=CASE v_result WHEN 'pass' THEN 'permitted' WHEN 'limited-proceed' THEN 'preflight_restricted' ELSE 'preflight_restricted' END,output_ceiling=v_ceiling,row_version=row_version+1,displayed_state=jsonb_build_object('stage',deal_row.business_stage,'materiality','paid_customer','source_posture',CASE v_result WHEN 'pass' THEN 'permitted' WHEN 'limited-proceed' THEN 'limited' ELSE 'preflight_restricted' END,'next_controlled_action',v_recovery) WHERE deal_id=p_deal_id AND account_id=p_account_id;
  IF v_result='pass' THEN UPDATE app.active_deal_capacity_reservation SET state_code='active',activated_at=clock_timestamp() WHERE deal_id=p_deal_id AND account_id=p_account_id AND state_code='reserved_preflight'; END IF;
  UPDATE app.first_deal_guide_checkpoint SET status_code=CASE WHEN v_result='blocked' THEN 'blocked' WHEN v_result IN ('waiting-for-user','limited-proceed') THEN 'waiting' ELSE 'completed' END,current_action=v_recovery,completed_at=CASE WHEN v_result='pass' THEN clock_timestamp() ELSE NULL END,updated_at=clock_timestamp() WHERE deal_id=p_deal_id AND account_id=p_account_id;
  INSERT INTO app.deal_command_idempotency(account_id,actor_id,command_type,key_hash,request_digest,deal_id) VALUES (p_account_id,p_actor_id,'create_paid_preflight',p_key_hash,p_request_digest,p_deal_id);
  PERFORM app.append_deal_audit(p_account_id,p_actor_id,p_deal_id,'paid_preflight_completed',new_id::text,v_reason);
  RETURN QUERY SELECT new_id,v_result,v_reason,v_recovery;
END
$$;

CREATE OR REPLACE FUNCTION app.accept_limited_preflight(p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_preflight_id uuid, p_key_hash text, p_request_digest text, p_scope text[], p_excluded text[], p_ceiling text)
RETURNS TABLE(accepted boolean, reservation_state text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
DECLARE p app.paid_preflight%ROWTYPE; reservation app.active_deal_capacity_reservation%ROWTYPE; existing app.deal_command_idempotency%ROWTYPE;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() THEN RAISE EXCEPTION 'deal scope mismatch' USING ERRCODE = '42501'; END IF;
  SELECT * INTO existing FROM app.deal_command_idempotency WHERE account_id=p_account_id AND actor_id=p_actor_id AND command_type='accept_limited_preflight' AND key_hash=p_key_hash;
  IF FOUND THEN
    IF existing.request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE = '23505'; END IF;
    RETURN QUERY SELECT true, 'active'::text; RETURN;
  END IF;
  SELECT * INTO p FROM app.paid_preflight WHERE id=p_preflight_id AND deal_id=p_deal_id AND account_id=p_account_id AND result='limited-proceed' AND setup_draft_id = (SELECT id FROM app.deal_setup_draft WHERE deal_id=p_deal_id AND account_id=p_account_id ORDER BY version DESC LIMIT 1) AND NOT EXISTS (SELECT 1 FROM app.paid_preflight newer WHERE newer.deal_id=p.deal_id AND newer.version>p.version) FOR UPDATE;
  IF NOT FOUND OR p.permitted_scope <> p_scope OR p.excluded_scope <> p_excluded OR p.output_ceiling IS DISTINCT FROM p_ceiling OR p.expires_at <= clock_timestamp() THEN RETURN QUERY SELECT false, NULL::text; RETURN; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_account_id::text || ':ticket05-active-deals'));
  UPDATE app.active_deal_capacity_reservation SET state_code='active',activated_at=coalesce(activated_at,clock_timestamp()) WHERE deal_id=p_deal_id AND account_id=p_account_id AND state_code='reserved_preflight' RETURNING * INTO reservation;
  IF reservation.id IS NULL THEN SELECT * INTO reservation FROM app.active_deal_capacity_reservation WHERE deal_id=p_deal_id AND account_id=p_account_id; END IF;
  UPDATE app.deal_workspace SET processing_posture='limited',paid_preflight_status='limited-proceed',row_version=row_version+1 WHERE deal_id=p_deal_id AND account_id=p_account_id;
  UPDATE app.first_deal_guide_checkpoint SET status_code='completed',current_action='Continue within the accepted limited scope',completed_at=clock_timestamp(),updated_at=clock_timestamp() WHERE deal_id=p_deal_id AND account_id=p_account_id;
  INSERT INTO app.deal_command_idempotency(account_id,actor_id,command_type,key_hash,request_digest,deal_id) VALUES (p_account_id,p_actor_id,'accept_limited_preflight',p_key_hash,p_request_digest,p_deal_id);
  PERFORM app.append_deal_audit(p_account_id,p_actor_id,p_deal_id,'limited_preflight_scope_accepted',p_preflight_id::text,'exact_limited_scope_accepted');
  RETURN QUERY SELECT true,reservation.state_code;
END
$$;

