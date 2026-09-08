GRANT CREATE ON SCHEMA external_use TO app_export_owner;
GRANT SELECT ON app.runtime_principal TO app_export_owner;
CREATE FUNCTION external_use.assert_export_attempt(p_job uuid,p_token text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE q external_use.export_job%ROWTYPE; s jobs.job_scope%ROWTYPE; l jobs.job_lease%ROWTYPE; a jobs.job_attempt%ROWTYPE; j jobs.job%ROWTYPE;
BEGIN
 SELECT * INTO q FROM external_use.export_job WHERE job_id=p_job AND account_id=app.policy_account_id() AND deal_id=app.policy_deal_id() FOR UPDATE;
 SELECT * INTO s FROM jobs.job_scope WHERE id=q.active_scope_id FOR UPDATE;
 SELECT * INTO l FROM jobs.job_lease WHERE id=s.lease_id FOR UPDATE;
 SELECT * INTO a FROM jobs.job_attempt WHERE id=s.attempt_id FOR UPDATE;
 SELECT * INTO j FROM jobs.job WHERE id=p_job FOR UPDATE;
 IF q.job_id IS NULL OR q.finished OR s.id IS NULL OR s.revoked_at IS NOT NULL OR s.expires_at<=clock_timestamp()
  OR s.job_id<>p_job OR s.input_digest<>j.input_digest OR s.release_id<>j.release_id OR s.operation_code<>'internal_controlled_export'
  OR s.workspace_posture_version<>(SELECT posture_version FROM app.deal_workspace WHERE deal_id=q.deal_id)
  OR s.security_epoch<>(SELECT security_epoch FROM app.account WHERE id=q.account_id)
  OR l.id IS NULL OR l.released_at IS NOT NULL OR l.expires_at<=clock_timestamp() OR l.outcome<>'active'
  OR l.lease_token_hash<>encode(extensions.digest(p_token,'sha256'),'hex') OR l.attempt_id<>a.id
  OR a.outcome<>'running' OR a.completed_at IS NOT NULL OR a.step_id<>s.step_id OR j.state<>'running'
  OR NOT EXISTS(SELECT 1 FROM app.runtime_principal p WHERE p.principal_code=s.runtime_principal_code AND p.principal_code=l.runtime_principal_code AND p.principal_code=a.runtime_principal_code AND p.credential_version=a.credential_version AND p.status_code='active')
  OR NOT EXISTS(SELECT 1 FROM jobs.job_step step WHERE step.id=s.step_id AND step.job_id=p_job AND step.state='running' AND step.input_digest=j.input_digest)
  OR NOT EXISTS(SELECT 1 FROM app.deal d JOIN app.deal_workspace w ON w.deal_id=d.id WHERE d.id=q.deal_id AND d.activity_posture='active' AND w.processing_posture='permitted' AND w.commercial_posture='entitled') THEN RAISE EXCEPTION 'export_worker_scope_invalid';END IF;
END $$;

-- A reserved output survives uncertain transport without becoming an untracked
-- file. Closed cleanup checks attachment before returning its derived path.
CREATE TABLE external_use.export_staging_object(
 object_id uuid PRIMARY KEY,job_id uuid NOT NULL REFERENCES external_use.export_job(job_id),created_at timestamptz NOT NULL DEFAULT now(),cleanup_claimed_at timestamptz,cleaned_at timestamptz
);
ALTER TABLE external_use.export_staging_object ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_use.export_staging_object FORCE ROW LEVEL SECURITY;
CREATE POLICY export_staging_owner ON external_use.export_staging_object TO app_export_owner USING(true) WITH CHECK(true);
GRANT SELECT,INSERT,UPDATE ON external_use.export_staging_object TO app_export_owner;
CREATE FUNCTION external_use.reserve_export_output(p_job uuid,p_token text,p_object uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 PERFORM external_use.enter_worker_context(p_job,p_token);
 PERFORM external_use.assert_export_attempt(p_job,p_token);
 INSERT INTO external_use.export_staging_object(object_id,job_id) VALUES(p_object,p_job);
 PERFORM app.clear_request();
END $$;
CREATE FUNCTION external_use.export_cleanup_candidates() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE item record; result jsonb:='[]';
BEGIN
 FOR item IN SELECT p.object_id,q.job_id,q.account_id,q.deal_id,q.actor_id FROM external_use.export_staging_object p JOIN external_use.export_job q ON q.job_id=p.job_id
  WHERE p.cleaned_at IS NULL AND (q.finished OR q.lease_expires_at<clock_timestamp()) ORDER BY p.created_at LIMIT 20 FOR UPDATE OF q,p SKIP LOCKED LOOP
  DELETE FROM app.request_context WHERE backend_pid=pg_backend_pid();
  INSERT INTO app.request_context(backend_pid,account_id,actor_id,deal_id) VALUES(pg_backend_pid(),item.account_id,item.actor_id,item.deal_id);
  IF EXISTS(SELECT 1 FROM external_use.internal_export_object o WHERE o.protected_object_id=item.object_id) THEN
   UPDATE external_use.export_staging_object SET cleaned_at=clock_timestamp() WHERE object_id=item.object_id;
  ELSE
   UPDATE external_use.export_staging_object SET cleanup_claimed_at=clock_timestamp() WHERE object_id=item.object_id;
   result:=result||jsonb_build_array(jsonb_build_object('object_id',item.object_id,'storage_key','protected/deal/'||item.object_id::text||'.bin'));
  END IF;
 END LOOP;
 PERFORM app.clear_request();RETURN result;
END $$;
CREATE FUNCTION external_use.confirm_export_cleanup(p_object uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN UPDATE external_use.export_staging_object SET cleaned_at=clock_timestamp() WHERE object_id=p_object AND cleanup_claimed_at IS NOT NULL;END $$;


CREATE OR REPLACE FUNCTION external_use.finish_export(p_job uuid,p_token text,p_object jsonb,p_manifest jsonb,p_error text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE row external_use.export_job%ROWTYPE; e external_use.internal_export%ROWTYPE; r external_use.export_review%ROWTYPE;
BEGIN
 row:=external_use.enter_worker_context(p_job,p_token);
 PERFORM external_use.assert_export_attempt(p_job,p_token);
 SELECT * INTO e FROM external_use.internal_export WHERE id=row.export_id;
 SELECT * INTO r FROM external_use.export_review WHERE id=e.review_id;
 IF NOT EXISTS(SELECT 1 FROM jobs.job WHERE id=p_job AND state='running') THEN RAISE EXCEPTION 'export_job_not_runnable';END IF;
 IF p_error IS NOT NULL THEN
  IF p_error !~ '^export_[a-z_]+$' THEN p_error:='export_processing_failed';END IF;
  UPDATE jobs.job SET state='failed_retryable',problem=jsonb_build_object('code',p_error,'recovery_action','retry_same_export'),row_version=row_version+1,updated_at=clock_timestamp() WHERE id=p_job;
  UPDATE external_use.export_job SET finished=true WHERE job_id=p_job;
  INSERT INTO external_use.export_event(account_id,deal_id,export_id,event_code,attempt) VALUES(row.account_id,row.deal_id,row.export_id,p_error,row.attempt);
  PERFORM external_use.close_export_attempt(p_job,'failed_retryable',p_error);
  PERFORM app.clear_request();RETURN jsonb_build_object('state','failed_retryable');
 END IF;
 IF NOT EXISTS(SELECT 1 FROM external_use.export_staging_object WHERE object_id=(p_object->>'object_id')::uuid AND job_id=p_job AND cleanup_claimed_at IS NULL AND cleaned_at IS NULL FOR UPDATE) THEN RAISE EXCEPTION 'export_output_scope_invalid';END IF;
 PERFORM external_use.assert_review(r.id,r.dependency_digest);
 IF p_manifest->'manifest'->>'export_id'<>e.id::text OR p_manifest->'manifest'->>'revision_id'<>e.revision_id::text
  OR p_manifest->'manifest'->'scope' IS DISTINCT FROM r.scope OR p_manifest->'manifest'->>'purpose'<>r.purpose
  OR jsonb_array_length(p_manifest->'manifest'->'members')<7 OR p_object->>'sha256' !~ '^[a-f0-9]{64}$'
  OR NOT EXISTS(SELECT 1 FROM deliverable.integrity_key WHERE key_version=p_manifest->>'key_version' AND public_key_pem=p_manifest->>'public_key_pem') THEN RAISE EXCEPTION 'export_output_invalid';END IF;
 INSERT INTO object_store.protected_object(id,account_id,deal_id,scope_code,storage_key,plaintext_sha256,ciphertext_sha256,byte_length,media_type,envelope_version,kms_key_version,wrapped_dek,lifecycle_status)
 VALUES((p_object->>'object_id')::uuid,row.account_id,row.deal_id,'deal',p_object->>'storage_key',p_object->>'sha256',p_object->>'ciphertext_sha256',(p_object->>'byte_length')::bigint,'application/zip',p_object->>'envelope_version',p_object->>'kms_key_version',p_object->'wrapped_dek','active');
 INSERT INTO external_use.internal_export_object(export_id,account_id,deal_id,protected_object_id,manifest) VALUES(e.id,row.account_id,row.deal_id,(p_object->>'object_id')::uuid,p_manifest);
 UPDATE jobs.job SET state='completed',result=jsonb_build_object('export_id',e.id,'revision_id',e.revision_id,'sha256',p_object->>'sha256'),problem=NULL,terminal_at=clock_timestamp(),row_version=row_version+1,progress='{"message_code":"internal_export_completed"}',updated_at=clock_timestamp() WHERE id=p_job;
 UPDATE external_use.export_job SET finished=true WHERE job_id=p_job;
 INSERT INTO external_use.export_event(account_id,deal_id,export_id,event_code,attempt) VALUES(row.account_id,row.deal_id,row.export_id,'completed',row.attempt);
 PERFORM app.record_audit('internal_export.completed','completed','internal_controlled_export',e.id::text,'exact_signed_package',gen_random_uuid()::text);
 INSERT INTO external_use.measurement_event(account_id,deal_id,event_code,dedupe_digest,dimensions)
 VALUES(row.account_id,row.deal_id,'internal_export_completed',encode(extensions.digest(e.id::text,'sha256'),'hex'),'{"scope":"exact_revision","external_authority":false}') ON CONFLICT DO NOTHING;
 PERFORM external_use.close_export_attempt(p_job,'completed');
 PERFORM app.clear_request();RETURN jsonb_build_object('state','completed','export_id',e.id);
END $$;

ALTER TABLE external_use.stream_grant ADD COLUMN idempotency_hash text,ADD COLUMN command_digest text,ADD COLUMN dependency_digest text;
CREATE UNIQUE INDEX stream_grant_idempotency ON external_use.stream_grant(account_id,deal_id,session_hash,idempotency_hash);


CREATE OR REPLACE FUNCTION external_use.create_stream_grant(p_export uuid,p_session text,p_sensitive text,p_token text,p_digest text,p_dependency text,p_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE row external_use.stream_grant%ROWTYPE;BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws(':','export-download',app.policy_account_id(),p_session,p_key),0));
 SELECT * INTO row FROM external_use.stream_grant WHERE session_hash=p_session AND idempotency_hash=p_key;
 IF FOUND THEN
  IF row.export_id<>p_export OR row.command_digest<>p_digest OR row.dependency_digest<>p_dependency OR row.token_hash<>p_token THEN RAISE EXCEPTION 'idempotency_key_reused';END IF;
  RETURN jsonb_build_object('id',row.id,'export_id',p_export,'expires_at',row.expires_at,'idempotent_replayed',true);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM external_use.internal_export_object o JOIN object_store.protected_object p ON p.id=o.protected_object_id WHERE o.export_id=p_export AND p.plaintext_sha256=p_dependency AND p.lifecycle_status='active') THEN RAISE EXCEPTION 'export_scope_unavailable';END IF;
 PERFORM external_use.consume_sensitive_grant(p_session,p_sensitive,'export_object_retrieval',p_export,p_digest,p_dependency,p_key);
 INSERT INTO external_use.stream_grant(account_id,deal_id,export_id,session_hash,token_hash,security_epoch,posture_version,idempotency_hash,command_digest,dependency_digest)
 VALUES(app.policy_account_id(),app.policy_deal_id(),p_export,p_session,p_token,(SELECT security_epoch FROM app.account WHERE id=app.policy_account_id()),(SELECT posture_version FROM app.deal_workspace WHERE deal_id=app.policy_deal_id()),p_key,p_digest,p_dependency) RETURNING * INTO row;
 RETURN jsonb_build_object('id',row.id,'export_id',p_export,'expires_at',row.expires_at);
END $$;

DO $$ DECLARE fn regprocedure;BEGIN
 FOREACH fn IN ARRAY ARRAY['external_use.assert_export_attempt(uuid,text)'::regprocedure,'external_use.reserve_export_output(uuid,text,uuid)'::regprocedure,'external_use.export_cleanup_candidates()'::regprocedure,'external_use.confirm_export_cleanup(uuid)'::regprocedure] LOOP
  EXECUTE format('ALTER FUNCTION %s OWNER TO app_export_owner',fn);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,app_runtime',fn);
 END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION external_use.reserve_export_output(uuid,text,uuid),external_use.export_cleanup_candidates(),external_use.confirm_export_cleanup(uuid) TO job_worker;
REVOKE CREATE ON SCHEMA external_use FROM app_export_owner;

