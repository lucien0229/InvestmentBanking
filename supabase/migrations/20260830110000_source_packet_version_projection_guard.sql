-- Ticket 08: an exact-version read must not expose the packet's newer
-- current Output Ceiling, Work Objective, impact candidates, or circulation
-- block as if they belonged to the requested historical version.
CREATE OR REPLACE FUNCTION source.get_source_packet_version_projection(
  p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_packet_id uuid, p_version_id uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, app, analysis, pg_catalog AS $$
DECLARE
  packet_row source.source_packet%ROWTYPE;
  version_row source.source_packet_version%ROWTYPE;
  ceiling_row app.output_ceiling_assessment%ROWTYPE;
  objective_row app.work_objective%ROWTYPE;
  version_json jsonb;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id()
     OR p_actor_id IS DISTINCT FROM app.policy_actor_id()
     OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN
    RETURN NULL;
  END IF;

  SELECT * INTO packet_row
  FROM source.source_packet
  WHERE id = p_packet_id AND account_id = p_account_id AND deal_id = p_deal_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO version_row
  FROM source.source_packet_version
  WHERE id = p_version_id
    AND packet_id = p_packet_id
    AND account_id = p_account_id
    AND deal_id = p_deal_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO ceiling_row
  FROM app.output_ceiling_assessment
  WHERE account_id = p_account_id AND deal_id = p_deal_id AND packet_version_id = p_version_id
  ORDER BY assessed_at DESC, id DESC
  LIMIT 1;
  SELECT * INTO objective_row
  FROM app.work_objective
  WHERE account_id = p_account_id AND deal_id = p_deal_id AND packet_version_id = p_version_id
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  version_json := jsonb_build_object(
    'id', version_row.id,
    'packet_id', version_row.packet_id,
    'version', version_row.version_ordinal,
    'purpose', version_row.purpose_code,
    'scope_statement', version_row.scope_statement,
    'change_reason', version_row.change_reason,
    'created_by', version_row.created_by,
    'created_at', version_row.created_at,
    'members', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'source_record_id', m.source_record_id,
        'source_material_id', r.source_material_id,
        'version', r.version_ordinal,
        'version_label', r.version_label,
        'member_role', m.member_role,
        'inclusion_reason', m.inclusion_reason,
        'rights_posture', r.rights_posture,
        'reliance_state', r.reliance_state,
        'disposition', r.disposition_code,
        'limitations', r.limitations
      ) ORDER BY m.sort_key, m.created_at)
      FROM source.source_packet_member m
      JOIN source.source_record r ON r.id = m.source_record_id
      WHERE m.packet_version_id = version_row.id
    ), '[]'::jsonb),
    'exclusions', coalesce((
      SELECT jsonb_agg(jsonb_build_object('material', e.excluded_material, 'reason', e.exclusion_reason) ORDER BY e.created_at)
      FROM source.source_packet_exclusion e
      WHERE e.packet_version_id = version_row.id
    ), '[]'::jsonb)
  );

  RETURN jsonb_build_object(
    'id', packet_row.id,
    'account_id', packet_row.account_id,
    'deal_id', packet_row.deal_id,
    'packet_name', packet_row.packet_name,
    'purpose', packet_row.purpose_code,
    'owner_actor_id', packet_row.owner_actor_id,
    'row_version', packet_row.row_version,
    'requested_version_id', p_version_id,
    'requested_version_exists', true,
    'is_current_version', packet_row.current_version_id = p_version_id,
    'current_version', CASE WHEN packet_row.current_version_id = p_version_id THEN version_json ELSE NULL END,
    'version', version_json,
    'output_ceiling', CASE WHEN ceiling_row.id IS NULL THEN NULL ELSE jsonb_build_object('id', ceiling_row.id, 'code', ceiling_row.ceiling_code, 'permitted_scope', ceiling_row.permitted_scope, 'excluded_scope', ceiling_row.excluded_scope, 'blockers', ceiling_row.blockers, 'recovery_plan', ceiling_row.recovery_plan, 'assessed_at', ceiling_row.assessed_at) END,
    'version_output_ceiling', CASE WHEN ceiling_row.id IS NULL THEN NULL ELSE jsonb_build_object('id', ceiling_row.id, 'code', ceiling_row.ceiling_code, 'permitted_scope', ceiling_row.permitted_scope, 'excluded_scope', ceiling_row.excluded_scope, 'blockers', ceiling_row.blockers, 'recovery_plan', ceiling_row.recovery_plan, 'assessed_at', ceiling_row.assessed_at) END,
    'work_objective', CASE WHEN objective_row.id IS NULL THEN NULL ELSE jsonb_build_object('id', objective_row.id, 'objective_type', objective_row.objective_type, 'purpose', objective_row.purpose_code, 'objective_text', objective_row.objective_text, 'intended_use', objective_row.intended_use, 'intended_audience', objective_row.intended_audience, 'requested_scope', objective_row.requested_scope, 'status', objective_row.status_code) END,
    'impact_candidates', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', i.id, 'trigger_kind', i.trigger_kind, 'trigger_object_id', i.trigger_object_id, 'impact_code', i.impact_code, 'affected_scope', i.affected_scope, 'recalculation_required', i.recalculation_required, 'regeneration_required', i.regeneration_required, 'rereview_required', i.rereview_required, 'circulation_blocked', i.circulation_blocked, 'created_at', i.created_at) ORDER BY i.created_at DESC)
      FROM analysis.impact_assessment_candidate i
      WHERE i.account_id = p_account_id AND i.deal_id = p_deal_id AND i.packet_version_id = p_version_id
    ), '[]'::jsonb),
    'circulation_blocked', EXISTS (
      SELECT 1 FROM app.circulation_candidate_block b
      WHERE b.account_id = p_account_id AND b.deal_id = p_deal_id AND b.packet_version_id = p_version_id AND b.resolved_at IS NULL
    )
  );
END $$;

GRANT CREATE ON SCHEMA source TO app_source_owner;
ALTER FUNCTION source.get_source_packet_version_projection(uuid,uuid,uuid,uuid,uuid) OWNER TO app_source_owner;
REVOKE ALL ON FUNCTION source.get_source_packet_version_projection(uuid,uuid,uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION source.get_source_packet_version_projection(uuid,uuid,uuid,uuid,uuid) TO app_runtime;
REVOKE CREATE ON SCHEMA source FROM app_source_owner;

-- Internal ceiling helpers are only callable by the definer procedures; they
-- are not an API or worker surface.
REVOKE ALL ON FUNCTION source.packet_blockers(uuid,uuid,uuid,text), source.create_packet_ceiling(uuid,uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION source.packet_blockers(uuid,uuid,uuid,text), source.create_packet_ceiling(uuid,uuid,uuid,uuid) TO app_source_owner;
