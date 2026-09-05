-- Temporary ownership-transfer privilege for managed Supabase migration admin.
GRANT CREATE ON SCHEMA deliverable TO app_deliverable_owner;
-- Each workbook AI Job authorizes one accepted task, packet, objective and Revision.
GRANT SELECT ON ai.task_enablement TO job_worker;
CREATE POLICY workbook_task_definitions ON ai.task_definition FOR SELECT TO job_worker USING(true);
CREATE POLICY workbook_prompt_packages ON ai.prompt_package FOR SELECT TO job_worker USING(true);
CREATE POLICY workbook_provider_profiles ON ai.provider_capability_profile FOR SELECT TO job_worker USING(true);
CREATE POLICY workbook_task_enablement ON ai.task_enablement FOR SELECT TO job_worker USING(true);
CREATE FUNCTION deliverable.guard_ai_job() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE job jobs.job%ROWTYPE; BEGIN
 SELECT * INTO job FROM jobs.job WHERE id=NEW.job_id;
 IF job.command_type='workbook_ai_review' THEN
  IF NEW.task_definition IS DISTINCT FROM job.accepted_inputs->>'task_definition' OR NEW.packet_version_id::text IS DISTINCT FROM job.accepted_inputs->>'packet_version_id' OR NEW.work_objective_id::text IS DISTINCT FROM job.accepted_inputs->>'work_objective_id' OR EXISTS(SELECT 1 FROM ai.run WHERE job_id=NEW.job_id) THEN RAISE EXCEPTION 'ai_artifact_scope_invalid' USING ERRCODE='42501';END IF;
 ELSIF NEW.task_definition IN ('workbook_commentary_draft','deliverable_semantic_qc','native_reader_semantic_parity_review') THEN RAISE EXCEPTION 'ai_artifact_scope_invalid' USING ERRCODE='42501';END IF;
 RETURN NEW;
END $$;
ALTER FUNCTION deliverable.guard_ai_job() OWNER TO app_deliverable_owner;
REVOKE ALL ON FUNCTION deliverable.guard_ai_job() FROM PUBLIC;
CREATE TRIGGER workbook_ai_job_guard BEFORE INSERT ON ai.run FOR EACH ROW EXECUTE FUNCTION deliverable.guard_ai_job();
CREATE OR REPLACE FUNCTION deliverable.attach_ai_revision(p_run uuid,p_revision uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM deliverable.deliverable_revision WHERE id=p_revision) OR NOT EXISTS(SELECT 1 FROM ai.run r JOIN jobs.job j ON j.id=r.job_id WHERE r.id=p_run AND r.account_id=app.policy_account_id() AND r.deal_id=app.policy_deal_id() AND j.command_type='workbook_ai_review' AND j.accepted_inputs->>'revision_id'=p_revision::text AND r.task_definition=j.accepted_inputs->>'task_definition') THEN RAISE EXCEPTION 'ai_artifact_scope_invalid' USING ERRCODE='42501';END IF;
 INSERT INTO deliverable.ai_revision_run VALUES(app.policy_account_id(),app.policy_deal_id(),p_revision,p_run) ON CONFLICT DO NOTHING;
END $$;
CREATE FUNCTION deliverable.get_revision_analysis_input(p_revision uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT jsonb_build_object(
  'calculations',(SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]') FROM analysis.calculation_run r JOIN deliverable.revision_calculation_run d ON d.calculation_run_id=r.id WHERE d.revision_id=p_revision),
  'models',(SELECT coalesce(jsonb_agg(to_jsonb(m)),'[]') FROM analysis.model_version m JOIN deliverable.revision_model_version d ON d.model_version_id=m.id WHERE d.revision_id=p_revision),
  'scenarios',(SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]') FROM analysis.scenario_version s JOIN deliverable.revision_scenario_version d ON d.scenario_version_id=s.id WHERE d.revision_id=p_revision))
 WHERE EXISTS(SELECT 1 FROM deliverable.deliverable_revision WHERE id=p_revision)
$$;
ALTER FUNCTION deliverable.get_revision_analysis_input(uuid) OWNER TO app_deliverable_owner;
REVOKE ALL ON FUNCTION deliverable.get_revision_analysis_input(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION deliverable.get_revision_analysis_input(uuid) TO app_runtime,job_worker;

REVOKE CREATE ON SCHEMA deliverable FROM app_deliverable_owner;
