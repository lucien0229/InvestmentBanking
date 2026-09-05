-- Temporary ownership-transfer privilege for managed Supabase migration admin.
GRANT CREATE ON SCHEMA deliverable TO app_deliverable_owner;
-- Reinspect the exact stored pair; only a targeted successful retest clears its own Finding.
ALTER TABLE deliverable.workbook_job ADD COLUMN retest_finding_id uuid REFERENCES deliverable.qc_finding(id);
CREATE TABLE deliverable.finding_retest (
 account_id uuid NOT NULL, deal_id uuid NOT NULL, finding_id uuid NOT NULL, qc_run_id uuid NOT NULL,
 outcome text NOT NULL CHECK(outcome IN ('passed','failed','missing')), created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(finding_id,qc_run_id),
 FOREIGN KEY(account_id,deal_id,finding_id) REFERENCES deliverable.qc_finding(account_id,deal_id,id),
 FOREIGN KEY(account_id,deal_id,qc_run_id) REFERENCES deliverable.qc_run(account_id,deal_id,id)
);
ALTER TABLE deliverable.finding_retest ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable.finding_retest FORCE ROW LEVEL SECURITY;
CREATE POLICY artifact_read_scope ON deliverable.finding_retest FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY artifact_command_scope ON deliverable.finding_retest TO app_deliverable_owner USING(account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal()) WITH CHECK(account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal());
GRANT SELECT ON deliverable.finding_retest TO app_runtime;
GRANT SELECT,INSERT ON deliverable.finding_retest TO app_deliverable_owner;
CREATE TRIGGER artifact_immutable BEFORE UPDATE OR DELETE ON deliverable.finding_retest FOR EACH ROW EXECUTE FUNCTION deliverable.immutable_record();

CREATE FUNCTION deliverable.create_qc_job(p_revision uuid,p_finding uuid,p_key text,p_digest text,p_release text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE revision deliverable.deliverable_revision%ROWTYPE; replay jsonb; job uuid:=gen_random_uuid(); input jsonb; BEGIN
 PERFORM deliverable.assert_write();replay:=deliverable.replay('workbook_qc',p_key,p_digest);IF replay IS NOT NULL THEN RETURN replay;END IF;
 SELECT * INTO revision FROM deliverable.deliverable_revision WHERE id=p_revision;IF NOT FOUND THEN RAISE EXCEPTION 'artifact_scope_unavailable';END IF;
 IF p_finding IS NOT NULL AND NOT EXISTS(SELECT 1 FROM deliverable.qc_finding WHERE id=p_finding AND revision_id=p_revision) THEN RAISE EXCEPTION 'artifact_scope_unavailable';END IF;
 IF (SELECT count(*) FROM deliverable.artifact WHERE revision_id=p_revision AND role IN ('native','reader'))<>2 THEN RAISE EXCEPTION 'native_reader_pair_required';END IF;
 input:=revision.build_input||jsonb_build_object('retest_finding_id',p_finding,'artifact_hashes',(SELECT jsonb_object_agg(id::text,plaintext_sha256) FROM deliverable.artifact WHERE revision_id=p_revision));
 INSERT INTO jobs.job(id,account_id,deal_id,actor_id,command_type,purpose_code,accepted_inputs,input_digest,input_version,workflow_version,release_id,allowance_class,allowance_quantity,allowance_posture,workspace_posture_version,security_epoch,state)
 SELECT job,revision.account_id,revision.deal_id,app.policy_actor_id(),'analysis_workbook_qc','analysis_workbook_qc',jsonb_build_object('revision_id',p_revision,'retest_finding_id',p_finding),encode(extensions.digest(input::text,'sha256'),'hex'),'1.0.0','analysis-workbook-qc-1.0.0',p_release,'analysis_workbook_qc',1,'reserved',w.posture_version,a.security_epoch,'queued' FROM app.deal_workspace w JOIN app.account a ON a.id=w.account_id WHERE w.deal_id=revision.deal_id;
 INSERT INTO deliverable.workbook_job(job_id,account_id,deal_id,revision_id,input,retest_finding_id) VALUES(job,revision.account_id,revision.deal_id,p_revision,input,p_finding);
 RETURN deliverable.remember('workbook_qc',p_key,p_digest,jsonb_build_object('id',job,'state','queued','job_type','analysis_workbook_qc','revision_id',p_revision));
END $$;
CREATE FUNCTION deliverable.complete_qc_step(p_job uuid,p_token text,p_checks jsonb,p_report jsonb,p_failure text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE scope jsonb; row deliverable.workbook_job%ROWTYPE; qc uuid:=gen_random_uuid(); item jsonb; finding deliverable.qc_finding%ROWTYPE;
BEGIN
 scope:=deliverable.begin_workbook_step(p_job,p_token);IF scope->>'job_type'<>'analysis_workbook_qc' THEN RAISE EXCEPTION 'artifact_worker_operation_invalid';END IF;
 SELECT * INTO row FROM deliverable.workbook_job WHERE job_id=p_job;
 IF p_failure IS NULL THEN
  IF p_report->>'revision_id'<>row.revision_id::text OR jsonb_typeof(p_checks)<>'array' OR jsonb_array_length(p_checks)<6 THEN RAISE EXCEPTION 'artifact_worker_output_invalid';END IF;
  INSERT INTO deliverable.qc_run(id,account_id,deal_id,revision_id,job_id,ruleset,checks,report,input_digest) VALUES(qc,row.account_id,row.deal_id,row.revision_id,p_job,'analysis-workbook-qc-1.0.0',p_checks,p_report,scope->>'input_digest');
  FOR item IN SELECT value FROM jsonb_array_elements(p_checks) WHERE value->>'outcome'='failed' LOOP
   IF NOT EXISTS(SELECT 1 FROM deliverable.qc_finding f WHERE f.revision_id=row.revision_id AND f.finding_code=item->>'code' AND NOT EXISTS(SELECT 1 FROM deliverable.finding_retest t WHERE t.finding_id=f.id AND t.outcome='passed')) THEN
    INSERT INTO deliverable.qc_finding(account_id,deal_id,revision_id,qc_run_id,finding_code,severity,detail,locator,consequence) VALUES(row.account_id,row.deal_id,row.revision_id,qc,item->>'code','critical',coalesce(item->>'detail','Exact artifact check failed'),coalesce(item->'locator','{}'),'Blocks circulation of this exact Revision');
   END IF;
  END LOOP;
  IF row.retest_finding_id IS NOT NULL THEN
   SELECT * INTO finding FROM deliverable.qc_finding WHERE id=row.retest_finding_id;
   INSERT INTO deliverable.finding_retest(account_id,deal_id,finding_id,qc_run_id,outcome) VALUES(row.account_id,row.deal_id,finding.id,qc,coalesce((SELECT value->>'outcome' FROM jsonb_array_elements(p_checks) WHERE value->>'code'=finding.finding_code LIMIT 1),'missing'));
  END IF;
 END IF;
 UPDATE jobs.job SET state=CASE WHEN p_failure IS NULL THEN 'completed' ELSE 'failed_terminal' END,result=CASE WHEN p_failure IS NULL THEN jsonb_build_object('resource',jsonb_build_object('type','qc_run','id',qc)) ELSE NULL END,problem=CASE WHEN p_failure IS NULL THEN NULL ELSE jsonb_build_object('code',p_failure,'recovery_action','inspect_artifact_and_retest') END,allowance_posture=CASE WHEN p_failure IS NULL THEN 'committed' ELSE 'released' END,terminal_at=now(),row_version=row_version+1 WHERE id=p_job;
 UPDATE deliverable.workbook_job SET finished=true WHERE job_id=p_job;
 PERFORM deliverable.clear_workbook_step();
END $$;

CREATE FUNCTION deliverable.finish_worker_scope() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE job jobs.job%ROWTYPE; scope jobs.job_scope%ROWTYPE; BEGIN
 IF NEW.finished AND NOT OLD.finished AND NEW.active_scope_id IS NOT NULL THEN
  SELECT * INTO job FROM jobs.job WHERE id=NEW.job_id;
  SELECT * INTO scope FROM jobs.job_scope WHERE id=NEW.active_scope_id;
  UPDATE jobs.job_scope SET revoked_at=clock_timestamp() WHERE id=scope.id;
  UPDATE jobs.job_lease SET released_at=clock_timestamp(),outcome=CASE WHEN job.state='completed' THEN 'committed' WHEN job.state='canceled' THEN 'canceled' ELSE 'failed_terminal' END WHERE id=scope.lease_id;
  UPDATE jobs.job_attempt SET completed_at=clock_timestamp(),outcome=CASE WHEN job.state='completed' THEN 'succeeded' WHEN job.state='canceled' THEN 'canceled' ELSE 'failed_terminal' END WHERE id=scope.attempt_id;
  UPDATE jobs.job_step SET state=CASE WHEN job.state='completed' THEN 'completed' WHEN job.state='canceled' THEN 'canceled' ELSE 'failed_terminal' END,updated_at=clock_timestamp() WHERE id=scope.step_id;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER workbook_scope_finalized AFTER UPDATE OF finished ON deliverable.workbook_job FOR EACH ROW EXECUTE FUNCTION deliverable.finish_worker_scope();
-- This recovery function authenticates the lease but reads no source/artifact bytes after a posture fence changes.
CREATE FUNCTION deliverable.fail_workbook_step(p_job uuid,p_token text,p_code text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE row deliverable.workbook_job%ROWTYPE; BEGIN
 SELECT * INTO row FROM deliverable.workbook_job WHERE job_id=p_job AND lease_hash=encode(extensions.digest(p_token,'sha256'),'hex') AND lease_expires_at>now() AND NOT finished FOR UPDATE;
 IF NOT FOUND THEN RETURN;END IF;
 DELETE FROM deliverable.worker_context WHERE backend_pid=pg_backend_pid();
 INSERT INTO deliverable.worker_context VALUES(pg_backend_pid(),row.account_id,row.deal_id,row.job_id,row.lease_hash);
 UPDATE jobs.job SET state='failed_terminal',problem=jsonb_build_object('code',CASE WHEN p_code='artifact_workspace_fence_changed' THEN p_code ELSE 'artifact_worker_failed' END,'recovery_action','inspect_and_create_new_job'),allowance_posture='released',terminal_at=now(),row_version=row_version+1 WHERE id=p_job AND state NOT IN ('completed','canceled','failed_terminal');
 UPDATE deliverable.workbook_job SET finished=true WHERE job_id=p_job;
 PERFORM deliverable.clear_workbook_step();
END $$;
CREATE FUNCTION deliverable.cancel_workbook_job(p_job uuid,p_version bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE row jobs.job%ROWTYPE; BEGIN
 SELECT * INTO row FROM jobs.job WHERE id=p_job FOR UPDATE;IF NOT FOUND THEN RETURN NULL;END IF;
 IF row.row_version<>p_version THEN RAISE EXCEPTION 'artifact_version_conflict';END IF;
 IF row.state NOT IN ('queued','running') THEN RAISE EXCEPTION 'artifact_job_not_cancelable';END IF;
 UPDATE jobs.job SET state='canceled',allowance_posture='released',terminal_at=now(),row_version=row_version+1 WHERE id=p_job;
 UPDATE deliverable.workbook_job SET finished=true WHERE job_id=p_job;
 RETURN jsonb_build_object('id',p_job,'state','canceled','row_version',p_version+1);
END $$;
DO $$ DECLARE fn record; BEGIN
 FOR fn IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='deliverable' AND p.proname IN ('create_qc_job','complete_qc_step','finish_worker_scope','fail_workbook_step','cancel_workbook_job') LOOP
  EXECUTE format('ALTER FUNCTION %s OWNER TO app_deliverable_owner',fn.signature);EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',fn.signature);
 END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION deliverable.create_qc_job(uuid,uuid,text,text,text),deliverable.cancel_workbook_job(uuid,bigint) TO app_runtime;
GRANT EXECUTE ON FUNCTION deliverable.complete_qc_step(uuid,text,jsonb,jsonb,text),deliverable.fail_workbook_step(uuid,text,text) TO job_worker;

CREATE OR REPLACE FUNCTION deliverable.assess_readiness(p_revision uuid,p_purpose text,p_audience text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE revision deliverable.deliverable_revision%ROWTYPE; checks jsonb; result jsonb; requirements jsonb; posture text:='working_draft'; req record; outcome text; basis text;
BEGIN
 SELECT * INTO revision FROM deliverable.deliverable_revision WHERE id=p_revision; IF NOT FOUND THEN RAISE EXCEPTION 'artifact_scope_unavailable'; END IF;
 SELECT q.checks INTO checks FROM deliverable.qc_run q WHERE revision_id=p_revision ORDER BY created_at DESC LIMIT 1;
 requirements:='[]';
 FOR req IN SELECT * FROM (VALUES
  ('controlled_inputs','analysis_ready','Complete controlled input authority'),('native_structure','analysis_ready','Inspect native formulas, names, scenarios and charts'),('method_review','analysis_ready','Record exact Banker method review'),
  ('recalculation','senior_review_ready','Recalculate exact stored native bytes'),('lineage','senior_review_ready','Inspect exact source-cell lineage'),('native_reader_parity','senior_review_ready','Compare native and reader content and layout'),('review_scope','senior_review_ready','Confirm purpose, audience and scope'),
  ('clean_copy','circulation_candidate','Provide licensed clean output'),('office_roundtrip','circulation_candidate','Verify declared Windows Microsoft 365 build and edit/save/reopen path'),('rights_confidentiality','circulation_candidate','Review exact rights and confidentiality'),('signed_manifest','circulation_candidate','Verify exact KMS signature and artifact hashes'),('professional_suitability','circulation_candidate','Record professional suitability for this use')) AS r(code,gate,recovery) LOOP
  outcome:=NULL;
  IF req.code IN ('method_review','review_scope','rights_confidentiality','professional_suitability','office_roundtrip') THEN
   SELECT CASE WHEN conclusion='passed' THEN 'passed' WHEN conclusion='failed' THEN 'failed' ELSE 'missing' END INTO outcome FROM deliverable.review WHERE revision_id=p_revision AND purpose=p_purpose AND audience=p_audience AND standard=req.code ORDER BY created_at DESC LIMIT 1;
  ELSE SELECT value->>'outcome' INTO outcome FROM jsonb_array_elements(coalesce(checks,'[]')) WHERE value->>'code'=req.code LIMIT 1; END IF;
  IF req.code='native_reader_parity' AND coalesce(outcome,'missing')='passed' THEN
   SELECT CASE WHEN conclusion='passed' THEN 'passed' WHEN conclusion='failed' THEN 'failed' ELSE 'missing' END INTO outcome FROM deliverable.review WHERE revision_id=p_revision AND purpose=p_purpose AND audience=p_audience AND standard='native_reader_parity' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF req.code='signed_manifest' AND NOT EXISTS(SELECT 1 FROM deliverable.artifact_manifest WHERE revision_id=p_revision) THEN outcome:='missing'; END IF;
  IF EXISTS(SELECT 1 FROM deliverable.qc_finding f WHERE revision_id=p_revision AND finding_code=req.code AND severity IN ('critical','major') AND NOT EXISTS(SELECT 1 FROM deliverable.finding_retest t WHERE t.finding_id=f.id AND t.outcome='passed')) THEN outcome:='failed'; END IF;
  requirements:=requirements||jsonb_build_array(jsonb_build_object('code',req.code,'gate',req.gate,'outcome',coalesce(outcome,'missing'),'recovery',req.recovery));
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(requirements) r WHERE r->>'outcome'='failed') THEN posture:='blocked';
 ELSE
  FOR req IN SELECT * FROM (VALUES('analysis_ready'),('senior_review_ready'),('circulation_candidate')) g(gate) LOOP
   EXIT WHEN EXISTS(SELECT 1 FROM jsonb_array_elements(requirements) r WHERE r->>'gate'=req.gate AND r->>'outcome'<>'passed'); posture:=req.gate;
  END LOOP;
 END IF;
 result:=jsonb_build_object('revision_id',p_revision,'purpose',p_purpose,'audience',p_audience,'posture',posture,'requirements',requirements,'blockers',(SELECT coalesce(jsonb_agg(r),'[]') FROM jsonb_array_elements(requirements) r WHERE r->>'outcome'<>'passed'),'external_use_authorized',false);
 basis:=encode(extensions.digest(result::text,'sha256'),'hex');
 INSERT INTO deliverable.readiness_assessment(account_id,deal_id,revision_id,purpose,audience,assessment,basis_digest) VALUES(revision.account_id,revision.deal_id,revision.id,p_purpose,p_audience,result,basis) ON CONFLICT DO NOTHING;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION deliverable.assert_write() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF app.policy_actor_id() IS NULL OR app.policy_deal_id() IS NULL OR NOT EXISTS(SELECT 1 FROM app.deal WHERE id=app.policy_deal_id() AND account_id=app.policy_account_id() AND activity_posture='active') THEN RAISE EXCEPTION 'artifact_scope_unavailable' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM app.deal_workspace WHERE deal_id=app.policy_deal_id() AND account_id=app.policy_account_id() AND processing_posture='permitted' AND commercial_posture='entitled') THEN RAISE EXCEPTION 'workspace_processing_blocked' USING ERRCODE='23514'; END IF;
END $$;

REVOKE CREATE ON SCHEMA deliverable FROM app_deliverable_owner;
