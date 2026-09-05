-- The existing Reference acceptance seam may pin one exact Source and one
-- bounded Assumption. Their domain commands satisfy dependencies; there is no
-- generic user resume command and accepted checkpoints are never discarded.
CREATE TABLE jobs.job_dependency (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 account_id uuid NOT NULL REFERENCES app.account(id), deal_id uuid NOT NULL REFERENCES app.deal(id),
 job_id uuid NOT NULL REFERENCES jobs.job(id), step_id uuid NOT NULL REFERENCES jobs.job_step(id),
 prior_step_id uuid REFERENCES jobs.job_step(id), source_record_id uuid REFERENCES source.source_record(id),
 assumption_id uuid REFERENCES knowledge.assumption(id),
 CHECK(num_nonnulls(prior_step_id,source_record_id,assumption_id)=1),
 UNIQUE NULLS NOT DISTINCT(step_id,prior_step_id,source_record_id,assumption_id)
);
ALTER TABLE jobs.job_dependency ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs.job_dependency FORCE ROW LEVEL SECURITY;
REVOKE ALL ON jobs.job_dependency FROM PUBLIC,app_runtime,job_worker,job_dispatcher;
CREATE POLICY dependency_scope ON jobs.job_dependency FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
GRANT SELECT ON jobs.job_dependency TO app_runtime;

CREATE FUNCTION jobs.attach_reference_dependencies(p_job_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE j jobs.job%ROWTYPE; source_id uuid; assumption_id uuid;
BEGIN
 SELECT * INTO STRICT j FROM jobs.job WHERE id=p_job_id AND command_type='reference_workspace_build';
 source_id:=(j.accepted_inputs->>'source_record_id')::uuid;
 assumption_id:=(j.accepted_inputs->>'assumption_id')::uuid;
 IF source_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM source.source_record r WHERE r.id=source_id AND r.account_id=j.account_id AND r.deal_id=j.deal_id) THEN RAISE EXCEPTION 'dependency_scope_mismatch'; END IF;
 IF assumption_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM knowledge.assumption a WHERE a.id=assumption_id AND a.account_id=j.account_id AND a.deal_id=j.deal_id) THEN RAISE EXCEPTION 'dependency_scope_mismatch'; END IF;
 INSERT INTO jobs.job_dependency(account_id,deal_id,job_id,step_id,prior_step_id)
 SELECT j.account_id,j.deal_id,j.id,s.id,p.id FROM jobs.job_step s JOIN jobs.job_step p ON p.job_id=s.job_id AND p.ordinal=s.ordinal-1 WHERE s.job_id=j.id;
 IF source_id IS NOT NULL THEN INSERT INTO jobs.job_dependency(account_id,deal_id,job_id,step_id,source_record_id) SELECT j.account_id,j.deal_id,j.id,s.id,source_id FROM jobs.job_step s WHERE s.job_id=j.id AND s.step_code='source_checkpoint'; END IF;
 IF assumption_id IS NOT NULL THEN INSERT INTO jobs.job_dependency(account_id,deal_id,job_id,step_id,assumption_id) SELECT j.account_id,j.deal_id,j.id,s.id,assumption_id FROM jobs.job_step s WHERE s.job_id=j.id AND s.step_code='workspace_checkpoint'; END IF;
END $$;

CREATE FUNCTION jobs.reference_dependency_state(p_step_id uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT CASE
 WHEN EXISTS(SELECT 1 FROM jobs.job_dependency d JOIN jobs.job_step p ON p.id=d.prior_step_id WHERE d.step_id=p_step_id AND p.state<>'completed') THEN 'waiting_for_source'
 WHEN EXISTS(SELECT 1 FROM jobs.job_dependency d WHERE d.step_id=p_step_id AND d.source_record_id IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM source.source_record r JOIN source.source_representation rp ON rp.source_record_id=r.id JOIN source.processing_coverage c ON c.id=rp.processing_coverage_id
  WHERE r.id=d.source_record_id AND r.account_id=d.account_id AND r.deal_id=d.deal_id AND rp.representation_type='native_text' AND coalesce((c.coverage_payload->>'substantive_parsing')::boolean,false)
  AND r.rights_posture NOT IN('blocked','withdrawn') AND r.disposition_code<>'withdrawn'
  AND NOT EXISTS(SELECT 1 FROM source.source_rights_current_selection cs JOIN source.source_rights_posture_assessment a ON a.id=cs.assessment_id WHERE cs.source_record_id=r.id AND a.rights_code IN('blocked','withdrawn'))
  AND NOT EXISTS(SELECT 1 FROM source.source_condition_current_selection cs JOIN source.source_condition_assessment a ON a.id=cs.assessment_id WHERE cs.source_record_id=r.id AND a.disposition_code='withdrawn')
 )) THEN 'waiting_for_source'
 WHEN EXISTS(SELECT 1 FROM jobs.job_dependency d WHERE d.step_id=p_step_id AND d.assumption_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM knowledge.assumption_decision a WHERE a.assumption_id=d.assumption_id AND a.account_id=d.account_id AND a.deal_id=d.deal_id)) THEN 'waiting_for_user'
 ELSE NULL END
$$;

CREATE FUNCTION jobs.wake_satisfied_reference_dependencies() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE j record; next_step uuid; total integer:=0;
BEGIN
 FOR j IN SELECT id FROM jobs.job WHERE command_type='reference_workspace_build' AND state IN('waiting_for_source','waiting_for_user') ORDER BY updated_at LIMIT 50 FOR UPDATE SKIP LOCKED LOOP
  SELECT id INTO next_step FROM jobs.job_step WHERE job_id=j.id AND state='queued' ORDER BY ordinal LIMIT 1;
  IF next_step IS NOT NULL AND jobs.reference_dependency_state(next_step) IS NULL THEN
   UPDATE jobs.job SET state='queued',problem=NULL,progress='{"message_code":"dependency_satisfied"}',row_version=row_version+1,updated_at=clock_timestamp() WHERE id=j.id;
   UPDATE jobs.transactional_outbox SET status='pending',published_at=NULL,claimed_at=NULL WHERE job_id=j.id AND event_type='job.step.dispatch';
   PERFORM jobs.append_job_event(j.id,'job_state_changed','queued',NULL,'dependency_satisfied','observe_job','{"message_code":"dependency_satisfied"}'); total:=total+1;
  END IF;
 END LOOP;
 RETURN total;
END $$;
REVOKE ALL ON FUNCTION jobs.attach_reference_dependencies(uuid),jobs.reference_dependency_state(uuid),jobs.wake_satisfied_reference_dependencies() FROM PUBLIC;

DO $$
DECLARE definition text; changed text;
BEGIN
 definition:=pg_get_functiondef('jobs.start_reference_job(uuid,text,text,jsonb)'::regprocedure);
 changed:=replace(definition,'INSERT INTO jobs.transactional_outbox',E'PERFORM jobs.attach_reference_dependencies(new_job.id);\n  INSERT INTO jobs.transactional_outbox');
 IF changed=definition THEN RAISE EXCEPTION 'dependency_start_contract_mismatch'; END IF; EXECUTE changed;
 definition:=pg_get_functiondef('jobs.claim_reference_step(uuid,text,text,text)'::regprocedure);
 changed:=replace(definition,'SELECT COALESCE(MAX(ja.attempt_ordinal)',E'IF jobs.reference_dependency_state(step_row.id) IS NOT NULL THEN\n UPDATE jobs.job SET state=jobs.reference_dependency_state(step_row.id),problem=jsonb_build_object(''code'',''exact_dependency_required'',''recovery_action'',''complete_exact_source_or_assumption''),progress=jsonb_build_object(''message_code'',''waiting_for_exact_dependency''),row_version=row_version+1,updated_at=clock_timestamp() WHERE id=job_row.id;\n PERFORM jobs.append_job_event(job_row.id,''job_state_changed'',jobs.reference_dependency_state(step_row.id),step_row.step_code,''exact_dependency_required'',''complete_exact_source_or_assumption'',''{}''); RETURN;\n END IF;\n SELECT COALESCE(MAX(ja.attempt_ordinal)');
 changed:=replace(changed,'job_row.state=''failed_retryable''', 'job_row.state IN(''failed_retryable'',''waiting_for_source'',''waiting_for_user'')');
 IF changed=definition THEN RAISE EXCEPTION 'dependency_claim_contract_mismatch'; END IF; EXECUTE changed;
 definition:=pg_get_functiondef('jobs.dispatch_pending_reference_jobs()'::regprocedure);
 changed:=replace(definition,E'BEGIN\n',E'BEGIN\n PERFORM jobs.wake_satisfied_reference_dependencies();\n');
 IF changed=definition THEN RAISE EXCEPTION 'dependency_dispatch_contract_mismatch'; END IF; EXECUTE changed;
END $$;
