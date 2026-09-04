-- AI source proposals are an internal, proposal-only analysis operation. A
-- full `supported_internal_processing` ceiling may admit that operation, but
-- bounded/anchor/metadata ceilings still fail closed. Provider capability and
-- rights checks remain separate gates in the AI control plane.
CREATE OR REPLACE FUNCTION source.get_packet_worker_input(
  p_account_id uuid, p_deal_id uuid, p_packet_version_id uuid, p_work_objective_id uuid, p_operation_code text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, app, pg_catalog AS $$
DECLARE ceiling_row app.output_ceiling_assessment%ROWTYPE; operation_row app.output_ceiling_operation%ROWTYPE; dynamic_blockers jsonb; dynamic_ceiling text; purpose_value text; workspace_status text; workspace_ceiling text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM source.source_packet_version v WHERE v.id=p_packet_version_id AND v.account_id=p_account_id AND v.deal_id=p_deal_id) THEN RAISE EXCEPTION 'packet_worker_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM app.work_objective o WHERE o.id=p_work_objective_id AND o.account_id=p_account_id AND o.deal_id=p_deal_id AND o.packet_version_id=p_packet_version_id) THEN RAISE EXCEPTION 'packet_worker_scope_mismatch' USING ERRCODE='42501'; END IF;
  SELECT * INTO ceiling_row FROM app.output_ceiling_assessment WHERE account_id=p_account_id AND deal_id=p_deal_id AND packet_version_id=p_packet_version_id AND work_objective_id=p_work_objective_id ORDER BY assessed_at DESC,id DESC LIMIT 1;
  IF ceiling_row.id IS NULL THEN RAISE EXCEPTION 'output_ceiling_missing' USING ERRCODE='42501'; END IF;
  SELECT purpose_code INTO purpose_value FROM source.source_packet_version WHERE id=p_packet_version_id;
  dynamic_blockers := source.packet_blockers(p_account_id,p_deal_id,p_packet_version_id,purpose_value);
  dynamic_ceiling := source.ceiling_code(dynamic_blockers,EXISTS (SELECT 1 FROM source.source_packet_member WHERE packet_version_id=p_packet_version_id));
  SELECT paid_preflight_status, output_ceiling INTO workspace_status, workspace_ceiling FROM app.deal_workspace WHERE account_id=p_account_id AND deal_id=p_deal_id;
  IF coalesce(workspace_status,'pending') NOT IN ('pass','limited-proceed') THEN dynamic_ceiling := 'blocked';
  ELSIF workspace_ceiling = 'internal_analysis_and_internal_controlled_export' AND dynamic_ceiling = 'supported_internal_processing' THEN dynamic_ceiling := 'bounded_analysis_only';
  END IF;
  IF p_operation_code IN ('deterministic_analysis','native_artifact','reader_copy','internal_controlled_export','external_circulation') AND dynamic_ceiling IN ('metadata_only','blocked') THEN RAISE EXCEPTION 'output_ceiling_exceeded' USING ERRCODE='42501'; END IF;
  IF p_operation_code IN ('deterministic_analysis','native_artifact','reader_copy','internal_controlled_export','external_circulation') AND dynamic_ceiling='anchor_inventory_only' THEN RAISE EXCEPTION 'output_ceiling_exceeded' USING ERRCODE='42501'; END IF;
  IF p_operation_code IN ('ai_processing','native_artifact','reader_copy','internal_controlled_export','external_circulation') AND dynamic_ceiling='bounded_analysis_only' THEN RAISE EXCEPTION 'output_ceiling_exceeded' USING ERRCODE='42501'; END IF;
  SELECT * INTO operation_row FROM app.output_ceiling_operation WHERE account_id=p_account_id AND deal_id=p_deal_id AND assessment_id=ceiling_row.id AND operation_code=p_operation_code;
  IF NOT (p_operation_code='ai_processing' AND dynamic_ceiling='supported_internal_processing') AND (operation_row.id IS NULL OR operation_row.posture <> 'permitted') THEN RAISE EXCEPTION 'output_ceiling_exceeded' USING ERRCODE='42501'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(dynamic_blockers) x WHERE x->>'code' IN ('rights_blocked','withdrawn_source')) AND p_operation_code <> 'source_inventory' THEN RAISE EXCEPTION 'source_condition_blocked' USING ERRCODE='42501'; END IF;
  IF EXISTS (SELECT 1 FROM source.source_rights_current_selection cs JOIN source.source_rights_posture_assessment ra ON ra.id=cs.assessment_id JOIN source.source_packet_member m ON m.source_record_id=cs.source_record_id WHERE cs.account_id=p_account_id AND cs.deal_id=p_deal_id AND cs.purpose_code=purpose_value AND m.packet_version_id=p_packet_version_id AND ra.rights_code='limited' AND NOT (ra.permitted_operations ? p_operation_code)) THEN RAISE EXCEPTION 'output_ceiling_exceeded' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object('account_id',p_account_id,'deal_id',p_deal_id,'packet_version_id',p_packet_version_id,'work_objective_id',p_work_objective_id,'operation_code',p_operation_code,'output_ceiling_id',ceiling_row.id,'ceiling_code',ceiling_row.ceiling_code,'members',coalesce((SELECT jsonb_agg(jsonb_build_object('source_record_id',m.source_record_id,'version',r.version_ordinal) ORDER BY m.sort_key,m.created_at) FROM source.source_packet_member m JOIN source.source_record r ON r.id=m.source_record_id WHERE m.packet_version_id=p_packet_version_id),'[]'::jsonb));
END $$;
GRANT CREATE ON SCHEMA source TO app_source_owner;
ALTER FUNCTION source.get_packet_worker_input(uuid,uuid,uuid,uuid,text) OWNER TO app_source_owner;
REVOKE CREATE ON SCHEMA source FROM app_source_owner;
