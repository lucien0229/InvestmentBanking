-- One explicit three-attempt transport recovery; total attempts are never reset.
ALTER TABLE source.processing_task DROP CONSTRAINT processing_task_attempts_check;
ALTER TABLE source.processing_task ADD CONSTRAINT processing_task_attempts_check CHECK(attempts BETWEEN 0 AND 6);
ALTER TABLE source.processing_task ADD COLUMN recovery_count integer NOT NULL DEFAULT 0 CHECK(recovery_count BETWEEN 0 AND 1),
 ADD COLUMN recovery_key_hash text, ADD COLUMN recovery_requested_at timestamptz, ADD COLUMN recovery_actor_id uuid;
CREATE POLICY source_processing_recover ON source.processing_task FOR UPDATE TO app_source_owner
 USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id())
 WITH CHECK(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
GRANT UPDATE(state,problem_code,lease_hash,lease_expires_at,completed_at,workspace_posture_version,security_epoch,recovery_count,recovery_key_hash,recovery_requested_at,recovery_actor_id) ON source.processing_task TO app_source_owner;
CREATE FUNCTION source.retry_processing_transport(p_task_id uuid,p_key_hash text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=source,app,pg_catalog AS $$
DECLARE task source.processing_task%ROWTYPE; posture bigint; epoch bigint;
BEGIN
 SELECT * INTO task FROM source.processing_task WHERE id=p_task_id AND account_id=app.policy_account_id() AND deal_id=app.policy_deal_id() FOR UPDATE;
 IF task.id IS NULL THEN RAISE EXCEPTION 'source_scope_mismatch'; END IF;
 IF task.recovery_key_hash=p_key_hash THEN RETURN task.id; END IF;
 IF task.state<>'failed' OR task.problem_code IS DISTINCT FROM 'worker_lease_expired' OR task.recovery_count<>0 THEN RAISE EXCEPTION 'processing_recovery_not_available'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('source-processing:'||task.source_record_id::text,0));
 PERFORM source.enqueue_processing(task.source_record_id);
 SELECT w.posture_version,a.security_epoch INTO posture,epoch FROM app.deal d JOIN app.deal_workspace w ON w.deal_id=d.id JOIN app.account a ON a.id=d.account_id
 WHERE d.id=task.deal_id AND d.activity_posture='active' AND w.processing_posture='permitted' FOR SHARE OF d,w,a;
 IF posture IS NULL OR EXISTS(SELECT 1 FROM source.source_rights_current_selection cs JOIN source.source_rights_posture_assessment a ON a.id=cs.assessment_id WHERE cs.source_record_id=task.source_record_id AND a.rights_code IN ('blocked','withdrawn')) OR EXISTS(SELECT 1 FROM source.source_condition_current_selection cs JOIN source.source_condition_assessment a ON a.id=cs.assessment_id WHERE cs.source_record_id=task.source_record_id AND a.disposition_code='withdrawn') THEN RAISE EXCEPTION 'processing_not_permitted'; END IF;
 UPDATE source.processing_task SET state='queued',problem_code=NULL,lease_hash=NULL,lease_expires_at=NULL,completed_at=NULL,
 workspace_posture_version=posture,security_epoch=epoch,recovery_count=1,recovery_key_hash=p_key_hash,recovery_requested_at=clock_timestamp(),recovery_actor_id=app.policy_actor_id() WHERE id=task.id;
 PERFORM app.record_audit('source_processing_recovery_requested','completed','source_processing_task',task.id::text,'transport_failure',gen_random_uuid()::text);
 RETURN task.id;
END $$;
GRANT CREATE ON SCHEMA source TO app_source_owner;
ALTER FUNCTION source.retry_processing_transport(uuid,text) OWNER TO app_source_owner;
REVOKE CREATE ON SCHEMA source FROM app_source_owner;
REVOKE ALL ON FUNCTION source.retry_processing_transport(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION source.retry_processing_transport(uuid,text) TO app_runtime;
DO $$
DECLARE definition text; changed text;
BEGIN
 definition:=pg_get_functiondef('source.claim_processing(text)'::regprocedure);
 changed:=replace(definition,'attempts>=3','attempts>=3*(recovery_count+1)');
 changed:=replace(changed,'attempts<3','attempts<3*(recovery_count+1)');
 IF changed=definition THEN RAISE EXCEPTION 'source_transport_recovery_migration_mismatch'; END IF;
 EXECUTE changed;
END $$;
