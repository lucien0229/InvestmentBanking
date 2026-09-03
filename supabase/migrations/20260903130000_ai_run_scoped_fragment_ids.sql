ALTER TABLE ai.run_fragment ADD COLUMN IF NOT EXISTS run_fragment_id uuid DEFAULT gen_random_uuid();
UPDATE ai.run_fragment SET run_fragment_id=gen_random_uuid() WHERE run_fragment_id IS NULL;
ALTER TABLE ai.run_fragment ALTER COLUMN run_fragment_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ai_run_fragment_run_scoped_id_uq ON ai.run_fragment(run_id,run_fragment_id);

CREATE OR REPLACE FUNCTION ai.attach_run_fragments(p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_run_id uuid,p_fragments jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ai, source, app, pg_catalog AS $$
DECLARE item jsonb; run_row ai.run%ROWTYPE; fragment_row source.source_fragment%ROWTYPE; ordinal integer := 0; run_fragment_id_value uuid;
BEGIN
  SELECT * INTO run_row FROM ai.run WHERE id=p_run_id AND account_id=p_account_id AND deal_id=p_deal_id FOR UPDATE;
  IF NOT FOUND OR p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN RAISE EXCEPTION 'ai_run_scope_mismatch' USING ERRCODE='42501'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(coalesce(p_fragments,'[]'::jsonb)) LOOP
    SELECT * INTO fragment_row FROM source.source_fragment WHERE id=(item->>'fragment_id')::uuid AND account_id=p_account_id AND deal_id=p_deal_id;
    IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM source.source_packet_member m JOIN source.source_packet_version v ON v.id=m.packet_version_id WHERE m.packet_version_id=run_row.packet_version_id AND v.account_id=p_account_id AND v.deal_id=p_deal_id AND m.source_record_id=fragment_row.source_record_id) THEN RAISE EXCEPTION 'ai_fragment_not_in_packet' USING ERRCODE='42501'; END IF;
    run_fragment_id_value := coalesce((item->>'run_fragment_id')::uuid,gen_random_uuid());
    INSERT INTO ai.run_fragment(run_id,run_fragment_id,account_id,deal_id,fragment_id,source_record_id,representation_id,locator,content_digest,ordinal) VALUES (p_run_id,run_fragment_id_value,p_account_id,p_deal_id,fragment_row.id,fragment_row.source_record_id,fragment_row.representation_id,fragment_row.locator,fragment_row.content_sha256,ordinal) ON CONFLICT (run_id,fragment_id) DO NOTHING;
    ordinal := ordinal + 1;
  END LOOP;
  UPDATE ai.run SET status_code='running', outcome_class='running' WHERE id=p_run_id;
  RETURN true;
END $$;
ALTER FUNCTION ai.attach_run_fragments(uuid,uuid,uuid,uuid,jsonb) OWNER TO app_ai_owner;

CREATE OR REPLACE FUNCTION ai.get_run_projection(p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_run_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = ai, source, app, pg_catalog AS $$
SELECT CASE WHEN r.id IS NULL THEN NULL ELSE jsonb_build_object(
  'id',r.id,'account_id',r.account_id,'deal_id',r.deal_id,'job_id',r.job_id,'job_scope_id',r.job_scope_id,
  'packet_version_id',r.packet_version_id,'work_objective_id',r.work_objective_id,'task_definition',r.task_definition,
  'task_definition_version',r.task_definition_version,'prompt_package_id',r.prompt_package_id,'provider_profile_id',r.provider_profile_id,
  'scope_digest',r.scope_digest,'canonical_input_digest',r.canonical_input_digest,'status',r.status_code,'outcome',r.outcome_class,
  'model',r.model_code,'usage',r.usage,'cost_minor_units',r.cost_minor_units,'latency_ms',r.latency_ms,'created_at',r.created_at,'completed_at',r.completed_at,
  'fragments',coalesce((SELECT jsonb_agg(jsonb_build_object('fragment_id',f.run_fragment_id,'source_fragment_id',f.fragment_id,'source_record_id',f.source_record_id,'representation_id',f.representation_id,'locator',f.locator,'content_digest',f.content_digest) ORDER BY f.ordinal) FROM ai.run_fragment f WHERE f.run_id=r.id),'[]'::jsonb),
  'proposals',coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'candidate_key',p.candidate_key,'proposal_kind',p.proposal_kind,'schema_version',p.schema_version,'payload',p.payload,'support_status',p.support_status,'evidence_candidates',p.evidence_candidates,'limitations',p.limitations,'unsupported_states',p.unsupported_states,'required_human_decision',p.required_human_decision) ORDER BY p.created_at) FROM ai.proposal p WHERE p.run_id=r.id),'[]'::jsonb),
  'conflicts',coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'proposal_id',c.proposal_id,'conflict_key',c.conflict_key,'dimension',c.dimension,'competing_refs',c.competing_refs,'affected_scope',c.affected_scope,'unresolved_alternatives',c.unresolved_alternatives,'affected_uses',c.affected_uses) ORDER BY c.created_at) FROM ai.conflict_proposal c WHERE c.run_id=r.id),'[]'::jsonb),
  'abstentions',coalesce((SELECT jsonb_agg(to_jsonb(a) - 'account_id' - 'deal_id' - 'run_id') FROM ai.abstention a WHERE a.run_id=r.id),'[]'::jsonb),
  'validations',coalesce((SELECT jsonb_agg(to_jsonb(v) - 'account_id' - 'deal_id' - 'run_id') FROM ai.run_validation v WHERE v.run_id=r.id),'[]'::jsonb)
) END FROM ai.run r WHERE r.id=p_run_id AND r.account_id=p_account_id AND r.deal_id=p_deal_id AND p_account_id=app.policy_account_id() AND p_actor_id=app.policy_actor_id();
$$;
ALTER FUNCTION ai.get_run_projection(uuid,uuid,uuid,uuid) OWNER TO app_ai_owner;
