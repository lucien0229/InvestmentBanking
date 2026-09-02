-- Keep the packet ceiling no wider than the Deal's current Paid Preflight.
-- A limited-proceed workspace must not expose full artifact or Reader Copy
-- operations merely because the Source Records themselves parse cleanly.
CREATE OR REPLACE FUNCTION source.create_packet_ceiling(
  p_account_id uuid, p_deal_id uuid, p_packet_version_id uuid, p_work_objective_id uuid DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, app, pg_catalog AS $$
DECLARE
  blockers jsonb; ceiling text; assessment_id uuid := gen_random_uuid(); previous_id uuid;
  purpose_value text; has_members boolean; member_count integer;
  preflight_status text; preflight_ceiling text; permitted jsonb; excluded jsonb; recovery jsonb;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN
    RAISE EXCEPTION 'source_packet_scope_mismatch' USING ERRCODE='42501';
  END IF;
  SELECT v.purpose_code INTO purpose_value FROM source.source_packet_version v WHERE v.id=p_packet_version_id AND v.account_id=p_account_id AND v.deal_id=p_deal_id;
  IF purpose_value IS NULL THEN RAISE EXCEPTION 'source_packet_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF p_work_objective_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM app.work_objective o WHERE o.id=p_work_objective_id AND o.account_id=p_account_id AND o.deal_id=p_deal_id AND o.packet_version_id=p_packet_version_id) THEN RAISE EXCEPTION 'work_objective_scope_mismatch' USING ERRCODE='42501'; END IF;
  SELECT count(*)::integer, count(*) > 0 INTO member_count, has_members FROM source.source_packet_member m WHERE m.packet_version_id=p_packet_version_id;
  blockers := source.packet_blockers(p_account_id,p_deal_id,p_packet_version_id,purpose_value);
  IF NOT has_members THEN blockers := blockers || jsonb_build_array(jsonb_build_object('code','missing_source','source_record_id',NULL,'affected_scope','all substantive work','smallest_recovery_action','add an authorized anchor Source Record')); END IF;
  IF member_count = 1 THEN blockers := blockers || jsonb_build_array(jsonb_build_object('code','missing_source','source_record_id',NULL,'affected_scope','complete package and current-period conclusions','smallest_recovery_action','add the smallest additional authorized Source Record or narrow the Work Objective')); END IF;
  SELECT paid_preflight_status, output_ceiling INTO preflight_status, preflight_ceiling FROM app.deal_workspace WHERE account_id=p_account_id AND deal_id=p_deal_id;
  IF coalesce(preflight_status,'pending') NOT IN ('pass','limited-proceed') THEN blockers := blockers || jsonb_build_array(jsonb_build_object('code','preflight_required','source_record_id',NULL,'affected_scope','all substantive processing','smallest_recovery_action','run and accept the current Paid Preflight')); END IF;
  ceiling := source.ceiling_code(blockers,has_members);
  IF preflight_status='limited-proceed' AND preflight_ceiling='internal_analysis_and_internal_controlled_export' AND ceiling='supported_internal_processing' THEN
    ceiling := 'bounded_analysis_only';
    blockers := blockers || jsonb_build_array(jsonb_build_object('code','preflight_required','source_record_id',NULL,'affected_scope','AI, artifact generation, Reader Copy and external circulation','smallest_recovery_action','accept the exact limited-proceed scope or rerun Paid Preflight'));
  END IF;
  permitted := CASE ceiling WHEN 'supported_internal_processing' THEN '["source_inventory","claim_mapping","deterministic_analysis","native_artifact","reader_copy","internal_controlled_export"]'::jsonb WHEN 'bounded_analysis_only' THEN '["source_inventory","claim_mapping","deterministic_analysis"]'::jsonb WHEN 'anchor_inventory_only' THEN '["source_inventory","claim_mapping"]'::jsonb WHEN 'metadata_only' THEN '["source_inventory"]'::jsonb ELSE '[]'::jsonb END;
  excluded := CASE ceiling WHEN 'supported_internal_processing' THEN '["ai_processing","external_circulation"]'::jsonb WHEN 'bounded_analysis_only' THEN '["ai_processing","native_artifact","reader_copy","internal_controlled_export","external_circulation"]'::jsonb WHEN 'anchor_inventory_only' THEN '["deterministic_analysis","ai_processing","native_artifact","reader_copy","internal_controlled_export","external_circulation"]'::jsonb WHEN 'metadata_only' THEN '["claim_mapping","deterministic_analysis","ai_processing","native_artifact","reader_copy","internal_controlled_export","external_circulation"]'::jsonb ELSE '["source_inventory","claim_mapping","deterministic_analysis","ai_processing","native_artifact","reader_copy","internal_controlled_export","external_circulation"]'::jsonb END;
  recovery := coalesce((SELECT jsonb_agg(DISTINCT x->>'smallest_recovery_action') FROM jsonb_array_elements(blockers) x),'[]'::jsonb);
  SELECT id INTO previous_id FROM app.output_ceiling_assessment WHERE account_id=p_account_id AND packet_version_id=p_packet_version_id AND work_objective_id IS NOT DISTINCT FROM p_work_objective_id ORDER BY assessed_at DESC,id DESC LIMIT 1;
  INSERT INTO app.output_ceiling_assessment(id,account_id,deal_id,packet_version_id,work_objective_id,ceiling_code,permitted_scope,excluded_scope,blockers,recovery_plan,basis,supersedes_id) VALUES (assessment_id,p_account_id,p_deal_id,p_packet_version_id,p_work_objective_id,ceiling,permitted,excluded,blockers,recovery,jsonb_build_object('purpose',purpose_value,'packet_version_id',p_packet_version_id,'evaluated_at',clock_timestamp(),'paid_preflight_status',preflight_status,'paid_preflight_output_ceiling',preflight_ceiling),previous_id);
  INSERT INTO app.output_ceiling_operation(account_id,deal_id,assessment_id,operation_code,posture,conditions) SELECT p_account_id,p_deal_id,assessment_id,op,CASE WHEN permitted ? op THEN 'permitted' ELSE 'prohibited' END,CASE WHEN permitted ? op THEN '[]'::jsonb ELSE blockers END FROM jsonb_array_elements_text(excluded || permitted) op ON CONFLICT DO NOTHING;
  INSERT INTO app.output_ceiling_blocker(account_id,deal_id,assessment_id,blocker_code,affected_scope,smallest_recovery_action,basis) SELECT p_account_id,p_deal_id,assessment_id,x->>'code',x->>'affected_scope',x->>'smallest_recovery_action',x FROM jsonb_array_elements(blockers) x ON CONFLICT DO NOTHING;
  RETURN assessment_id;
END $$;

GRANT CREATE ON SCHEMA source TO app_source_owner;
ALTER FUNCTION source.create_packet_ceiling(uuid,uuid,uuid,uuid) OWNER TO app_source_owner;
REVOKE ALL ON FUNCTION source.create_packet_ceiling(uuid,uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION source.create_packet_ceiling(uuid,uuid,uuid,uuid) TO app_source_owner;
REVOKE CREATE ON SCHEMA source FROM app_source_owner;
