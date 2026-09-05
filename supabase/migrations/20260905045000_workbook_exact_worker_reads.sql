-- Narrow direct Worker reads to its accepted object set, including same-Deal isolation.
GRANT CREATE ON SCHEMA deliverable TO app_deliverable_owner;
CREATE FUNCTION deliverable.current_worker_revision() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT w.revision_id FROM deliverable.worker_context c JOIN deliverable.workbook_job w ON w.job_id=c.job_id
 JOIN jobs.job j ON j.id=w.job_id JOIN jobs.job_scope s ON s.id=w.active_scope_id
 WHERE c.backend_pid=pg_backend_pid() AND c.lease_hash=w.lease_hash AND w.lease_expires_at>clock_timestamp()
 AND NOT w.finished AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp() AND j.state='running'
$$;
ALTER FUNCTION deliverable.current_worker_revision() OWNER TO app_deliverable_owner;
REVOKE ALL ON FUNCTION deliverable.current_worker_revision() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION deliverable.current_worker_revision() TO job_worker;
CREATE FUNCTION deliverable.current_worker_packet() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT packet_version_id FROM deliverable.deliverable_revision WHERE id=deliverable.current_worker_revision()
$$;
ALTER FUNCTION deliverable.current_worker_packet() OWNER TO app_deliverable_owner;
REVOKE ALL ON FUNCTION deliverable.current_worker_packet() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION deliverable.current_worker_packet() TO job_worker;
DO $$ DECLARE name text; predicate text; BEGIN
 FOREACH name IN ARRAY ARRAY['source_packet_member','source_packet_version','source_fragment','source_record','source_representation','source_rights_current_selection'] LOOP
  predicate:=CASE name WHEN 'source_packet_member' THEN 'packet_version_id=deliverable.current_worker_packet()'
   WHEN 'source_packet_version' THEN 'id=deliverable.current_worker_packet()'
   WHEN 'source_record' THEN 'id IN (SELECT source_record_id FROM source.source_packet_member WHERE packet_version_id=deliverable.current_worker_packet())'
   ELSE 'source_record_id IN (SELECT source_record_id FROM source.source_packet_member WHERE packet_version_id=deliverable.current_worker_packet())' END;
  EXECUTE format('DROP POLICY workbook_ai_input_scope ON source.%I',name);
  EXECUTE format('CREATE POLICY workbook_ai_input_scope ON source.%I FOR SELECT TO job_worker USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id() AND (%s))',name,predicate);
 END LOOP;
 FOREACH name IN ARRAY ARRAY['deliverable_revision','artifact','artifact_region','qc_run','artifact_manifest'] LOOP
  predicate:=CASE name WHEN 'deliverable_revision' THEN 'id=deliverable.current_worker_revision()'
   WHEN 'artifact_region' THEN 'artifact_id IN (SELECT id FROM deliverable.artifact WHERE revision_id=deliverable.current_worker_revision())'
   ELSE 'revision_id=deliverable.current_worker_revision()' END;
  EXECUTE format('DROP POLICY workbook_ai_input_scope ON deliverable.%I',name);
  EXECUTE format('CREATE POLICY workbook_ai_input_scope ON deliverable.%I FOR SELECT TO job_worker USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id() AND (%s))',name,predicate);
 END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION knowledge.get_fact_projection(uuid,uuid,uuid,uuid),knowledge.get_assumption_projection(uuid,uuid,uuid,uuid),knowledge.get_evidence_projection(uuid,uuid,uuid,uuid),knowledge.get_decision_projection(uuid,uuid,uuid,uuid),analysis.get_analysis_projection(uuid,uuid,uuid,text,uuid),deliverable.get_revision_analysis_input(uuid) FROM job_worker;
GRANT EXECUTE ON FUNCTION knowledge.get_fact_projection(uuid,uuid,uuid,uuid),knowledge.get_assumption_projection(uuid,uuid,uuid,uuid),knowledge.get_decision_projection(uuid,uuid,uuid,uuid) TO app_deliverable_owner;
CREATE FUNCTION deliverable.get_workbook_ai_inputs(p_revision uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE revision deliverable.deliverable_revision%ROWTYPE; measure jsonb; result jsonb; facts jsonb:='[]'; assumptions jsonb:='[]'; decisions jsonb:='[]'; BEGIN
 IF p_revision IS DISTINCT FROM deliverable.current_worker_revision() THEN RAISE EXCEPTION 'ai_artifact_scope_invalid' USING ERRCODE='42501';END IF;
 SELECT * INTO revision FROM deliverable.deliverable_revision WHERE id=p_revision;
 FOR measure IN SELECT DISTINCT m FROM jsonb_array_elements(revision.build_input->'calculations') c CROSS JOIN LATERAL jsonb_array_elements(c->'measures') m LOOP
  IF measure->>'fact_id' IS NOT NULL THEN facts:=facts||knowledge.get_fact_projection(revision.account_id,app.policy_actor_id(),revision.deal_id,(measure->>'fact_id')::uuid);END IF;
  IF measure->>'assumption_id' IS NOT NULL THEN assumptions:=assumptions||knowledge.get_assumption_projection(revision.account_id,app.policy_actor_id(),revision.deal_id,(measure->>'assumption_id')::uuid);END IF;
  decisions:=decisions||knowledge.get_decision_projection(revision.account_id,app.policy_actor_id(),revision.deal_id,(measure->>'decision_id')::uuid);
 END LOOP;
 RETURN jsonb_build_object('facts',facts,'assumptions',assumptions,'decisions',decisions,'evidence','[]'::jsonb,'analysis',deliverable.get_revision_analysis_input(p_revision));
END $$;
ALTER FUNCTION deliverable.get_workbook_ai_inputs(uuid) OWNER TO app_deliverable_owner;
REVOKE ALL ON FUNCTION deliverable.get_workbook_ai_inputs(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION deliverable.get_workbook_ai_inputs(uuid) TO job_worker;
REVOKE CREATE ON SCHEMA deliverable FROM app_deliverable_owner;
