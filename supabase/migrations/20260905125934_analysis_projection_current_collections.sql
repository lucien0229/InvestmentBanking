-- Restore the complete collection projection on databases that received the early Ticket 11 definition.
-- Forward-only: retain the scoped owner and existing execute grants.
CREATE OR REPLACE FUNCTION analysis.get_analysis_projection(p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_object_type text DEFAULT NULL,p_object_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=analysis,app,pg_catalog AS $$
WITH scoped AS (SELECT analysis.assert_scope(p_account_id,p_actor_id,p_deal_id) AS authorized)
SELECT jsonb_build_object(
  'normalized_financial_values', coalesce((SELECT jsonb_agg(to_jsonb(n) ORDER BY n.created_at) FROM analysis.normalized_financial_value n WHERE n.account_id=p_account_id AND n.deal_id=p_deal_id), '[]'::jsonb),
  'calculations', coalesce((SELECT jsonb_agg(jsonb_build_object(
    'id', c.id, 'calculation_code', c.calculation_code, 'label', c.label, 'row_version', c.row_version,
    'versions', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', v.id, 'version_ordinal', v.version_ordinal, 'method_code', v.method_code,
      'formula_text', v.formula_text, 'method_version', v.method_version, 'unit', v.unit,
      'currency', v.currency, 'period', v.period, 'input_digest', v.input_digest, 'definition', v.definition,
      'runs', coalesce((SELECT jsonb_agg(jsonb_build_object('id', r.id, 'result', r.result, 'checks', r.checks, 'engine', r.engine, 'engine_version', r.engine_version, 'inputs', r.inputs) ORDER BY r.created_at) FROM analysis.calculation_run r WHERE r.calculation_version_id=v.id AND r.account_id=p_account_id AND r.deal_id=p_deal_id), '[]'::jsonb)
    )) FROM analysis.calculation_version v WHERE v.calculation_id = c.id), '[]'::jsonb)
  )) FROM analysis.calculation c WHERE c.account_id = p_account_id AND c.deal_id = p_deal_id
    AND (p_object_type IS DISTINCT FROM 'calculation' OR p_object_id IS NULL OR c.id = p_object_id)), '[]'::jsonb),
  'models', coalesce((SELECT jsonb_agg(jsonb_build_object('id', m.id, 'model_code', m.model_code, 'label', m.label, 'row_version', m.row_version, 'versions', coalesce((SELECT jsonb_agg(jsonb_build_object('id', mv.id, 'version_ordinal', mv.version_ordinal, 'definition', mv.definition) ORDER BY mv.version_ordinal) FROM analysis.model_version mv WHERE mv.model_id=m.id AND mv.account_id=p_account_id AND mv.deal_id=p_deal_id), '[]'::jsonb))) FROM analysis.model m WHERE m.account_id = p_account_id AND m.deal_id = p_deal_id), '[]'::jsonb),
  'scenarios', coalesce((SELECT jsonb_agg(jsonb_build_object('id', s.id, 'scenario_code', s.scenario_code, 'label', s.label, 'row_version', s.row_version, 'versions', coalesce((SELECT jsonb_agg(jsonb_build_object('id', sv.id, 'version_ordinal', sv.version_ordinal, 'model_version_id', sv.model_version_id) ORDER BY sv.version_ordinal) FROM analysis.scenario_version sv WHERE sv.scenario_id=s.id AND sv.account_id=p_account_id AND sv.deal_id=p_deal_id), '[]'::jsonb))) FROM analysis.scenario s WHERE s.account_id = p_account_id AND s.deal_id = p_deal_id), '[]'::jsonb),
  'analyses', coalesce((SELECT jsonb_agg(jsonb_build_object(
    'id', a.id, 'analysis_code', a.analysis_code, 'title', a.title, 'row_version', a.row_version,
    'versions', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', v.id, 'version_ordinal', v.version_ordinal, 'status', v.status, 'draft', v.draft,
      'calculation_run_ids', to_jsonb(v.calculation_run_ids), 'model_version_ids', to_jsonb(v.model_version_ids),
      'scenario_version_ids', to_jsonb(v.scenario_version_ids), 'fact_ids', to_jsonb(v.fact_ids),
      'assumption_ids', to_jsonb(v.assumption_ids), 'evidence_ids', to_jsonb(v.evidence_ids)
    )) FROM analysis.analysis_version v WHERE v.analysis_id = a.id), '[]'::jsonb)
  )) FROM analysis.analysis a WHERE a.account_id = p_account_id AND a.deal_id = p_deal_id
    AND (p_object_type IS DISTINCT FROM 'analysis' OR p_object_id IS NULL OR a.id = p_object_id)), '[]'::jsonb)
)
FROM scoped;
$$;

