GRANT CREATE ON SCHEMA external_use TO app_export_owner;
GRANT SELECT,INSERT,UPDATE,DELETE ON app.request_context TO app_export_owner;
CREATE POLICY export_private_context ON app.request_context TO app_export_owner USING(backend_pid=pg_backend_pid()) WITH CHECK(backend_pid=pg_backend_pid());
GRANT SELECT,INSERT ON object_store.protected_object TO app_export_owner;
CREATE POLICY export_object_owner ON object_store.protected_object TO app_export_owner USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id()) WITH CHECK(scope_code='deal' AND account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE TABLE external_use.export_event (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_id uuid NOT NULL,deal_id uuid NOT NULL,export_id uuid NOT NULL,
 event_code text NOT NULL,attempt integer NOT NULL,occurred_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(account_id,deal_id,export_id) REFERENCES external_use.internal_export(account_id,deal_id,id)
);
ALTER TABLE external_use.export_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_use.export_event FORCE ROW LEVEL SECURITY;
CREATE POLICY export_read_scope ON external_use.export_event FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY export_owner_scope ON external_use.export_event TO app_export_owner USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id()) WITH CHECK(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
GRANT SELECT ON external_use.export_event TO app_runtime;
GRANT SELECT,INSERT ON external_use.export_event TO app_export_owner;
CREATE TRIGGER export_immutable BEFORE UPDATE OR DELETE ON external_use.export_event FOR EACH ROW EXECUTE FUNCTION deliverable.immutable_record();

CREATE FUNCTION external_use.enter_worker_context(p_job uuid,p_token text) RETURNS external_use.export_job LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE row external_use.export_job%ROWTYPE;BEGIN
 SELECT * INTO row FROM external_use.export_job WHERE job_id=p_job AND lease_hash=encode(extensions.digest(p_token,'sha256'),'hex') AND lease_expires_at>clock_timestamp() AND NOT finished FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'export_worker_scope_invalid';END IF;
 DELETE FROM app.request_context WHERE backend_pid=pg_backend_pid();
 INSERT INTO app.request_context(backend_pid,account_id,actor_id,deal_id) VALUES(pg_backend_pid(),row.account_id,row.actor_id,row.deal_id);
 IF NOT EXISTS(SELECT 1 FROM app.account_actor WHERE account_id=row.account_id AND actor_id=row.actor_id AND active) THEN RAISE EXCEPTION 'export_actor_unavailable';END IF;
 RETURN row;
END $$;
CREATE FUNCTION external_use.dispatch_export() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE row external_use.export_job%ROWTYPE; token text:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');BEGIN
 SELECT * INTO row FROM external_use.export_job WHERE NOT finished AND (lease_expires_at IS NULL OR lease_expires_at<clock_timestamp()) ORDER BY job_id FOR UPDATE SKIP LOCKED LIMIT 1;
 IF NOT FOUND THEN RETURN NULL;END IF;
 UPDATE external_use.export_job SET lease_hash=encode(extensions.digest(token,'sha256'),'hex'),lease_expires_at=clock_timestamp()+interval '5 minutes',attempt=attempt+1 WHERE job_id=row.job_id;
 RETURN jsonb_build_object('job_id',row.job_id,'lease_token',token);
END $$;
CREATE FUNCTION external_use.begin_export(p_job uuid,p_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE row external_use.export_job%ROWTYPE; e external_use.internal_export%ROWTYPE; r external_use.export_review%ROWTYPE; j jobs.job%ROWTYPE; result jsonb;
BEGIN
 row:=external_use.enter_worker_context(p_job,p_token);
 SELECT * INTO e FROM external_use.internal_export WHERE id=row.export_id;
 SELECT * INTO r FROM external_use.export_review WHERE id=e.review_id;
 SELECT * INTO j FROM jobs.job WHERE id=row.job_id FOR UPDATE;
 IF j.state NOT IN ('queued','running','failed_retryable') THEN RAISE EXCEPTION 'export_job_not_runnable';END IF;
 IF row.attempt>3 THEN
  UPDATE jobs.job SET state='failed_terminal',problem='{"code":"export_attempt_limit","recovery_action":"retry_same_export"}',row_version=row_version+1 WHERE id=p_job;
  UPDATE external_use.export_job SET finished=true WHERE job_id=p_job;
  PERFORM app.clear_request();RETURN NULL;
 END IF;
 BEGIN
  PERFORM external_use.assert_review(r.id,r.dependency_digest);
 EXCEPTION WHEN OTHERS THEN
  UPDATE jobs.job SET state='blocked',problem='{"code":"export_scope_changed","recovery_action":"review_exact_scope"}',row_version=row_version+1 WHERE id=p_job;
  UPDATE external_use.export_job SET finished=true WHERE job_id=p_job;
  PERFORM app.clear_request();RETURN NULL;
 END;
 UPDATE jobs.job SET state='running',worker_heartbeat_at=clock_timestamp(),progress='{"message_code":"verify_and_package_exact_members"}',row_version=row_version+1,updated_at=clock_timestamp() WHERE id=p_job;
 INSERT INTO external_use.export_event(account_id,deal_id,export_id,event_code,attempt) VALUES(row.account_id,row.deal_id,row.export_id,'running',row.attempt);
 result:=jsonb_build_object('export_id',e.id,'revision_id',e.revision_id,'purpose',r.purpose,'scope',r.scope,
  'files',(SELECT jsonb_agg(jsonb_build_object('id',a.id,'role',a.role,'path',a.path_label,'sha256',a.plaintext_sha256,'byte_length',a.byte_length,'object',jsonb_build_object('storage_key',o.storage_key,'ciphertext_sha256',o.ciphertext_sha256)) ORDER BY a.id) FROM deliverable.artifact a JOIN object_store.protected_object o ON o.id=a.protected_object_id WHERE a.revision_id=e.revision_id AND a.role IN ('native','reader')));
 PERFORM app.clear_request();RETURN result;
END $$;

CREATE FUNCTION external_use.finish_export(p_job uuid,p_token text,p_object jsonb,p_manifest jsonb,p_error text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE row external_use.export_job%ROWTYPE; e external_use.internal_export%ROWTYPE; r external_use.export_review%ROWTYPE;
BEGIN
 row:=external_use.enter_worker_context(p_job,p_token);
 SELECT * INTO e FROM external_use.internal_export WHERE id=row.export_id;
 SELECT * INTO r FROM external_use.export_review WHERE id=e.review_id;
 IF NOT EXISTS(SELECT 1 FROM jobs.job WHERE id=p_job AND state='running') THEN RAISE EXCEPTION 'export_job_not_runnable';END IF;
 IF p_error IS NOT NULL THEN
  IF p_error !~ '^export_[a-z_]+$' THEN p_error:='export_processing_failed';END IF;
  UPDATE jobs.job SET state='failed_retryable',problem=jsonb_build_object('code',p_error,'recovery_action','retry_same_export'),row_version=row_version+1,updated_at=clock_timestamp() WHERE id=p_job;
  UPDATE external_use.export_job SET finished=true WHERE job_id=p_job;
  INSERT INTO external_use.export_event(account_id,deal_id,export_id,event_code,attempt) VALUES(row.account_id,row.deal_id,row.export_id,p_error,row.attempt);
  PERFORM app.clear_request();RETURN jsonb_build_object('state','failed_retryable');
 END IF;
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
 PERFORM app.clear_request();RETURN jsonb_build_object('state','completed','export_id',e.id);
END $$;

CREATE FUNCTION external_use.control_export(p_export uuid,p_action text,p_expected bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE e external_use.internal_export%ROWTYPE; j jobs.job%ROWTYPE; r external_use.export_review%ROWTYPE;
BEGIN
 SELECT * INTO e FROM external_use.internal_export WHERE id=p_export AND actor_id=app.policy_actor_id();IF NOT FOUND THEN RAISE EXCEPTION 'export_scope_unavailable';END IF;
 SELECT * INTO j FROM jobs.job WHERE id=e.job_id FOR UPDATE;
 IF j.row_version<>p_expected THEN RAISE EXCEPTION 'export_version_conflict';END IF;
 IF p_action='cancel' AND j.state IN ('queued','running','failed_retryable') THEN
  UPDATE external_use.export_job SET finished=true,lease_expires_at=clock_timestamp() WHERE job_id=j.id;
  UPDATE jobs.job SET state='canceled',cancel_requested_at=clock_timestamp(),row_version=row_version+1 WHERE id=j.id;
 ELSIF p_action='retry' AND j.state IN ('failed_retryable','failed_terminal','canceled') THEN
  SELECT * INTO r FROM external_use.export_review WHERE id=e.review_id;
  PERFORM external_use.assert_review(r.id,r.dependency_digest);
  UPDATE external_use.export_job SET finished=false,lease_expires_at=NULL,lease_hash=NULL,attempt=0 WHERE job_id=j.id;
  UPDATE jobs.job SET state='queued',problem=NULL,cancel_requested_at=NULL,terminal_at=NULL,row_version=row_version+1 WHERE id=j.id;
 ELSE RAISE EXCEPTION 'export_job_control_invalid';END IF;
 INSERT INTO external_use.export_event(account_id,deal_id,export_id,event_code,attempt) VALUES(e.account_id,e.deal_id,e.id,p_action,0);
 PERFORM app.record_audit('internal_export.'||p_action,'completed','internal_controlled_export',e.id::text,'preserved_export_identity',gen_random_uuid()::text);
 RETURN external_use.export_projection(e.id);
END $$;

CREATE FUNCTION external_use.create_stream_grant(p_export uuid,p_session text,p_sensitive text,p_token text,p_digest text,p_dependency text,p_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE row external_use.stream_grant%ROWTYPE;BEGIN
 IF NOT EXISTS(SELECT 1 FROM external_use.internal_export_object o JOIN object_store.protected_object p ON p.id=o.protected_object_id WHERE o.export_id=p_export AND p.plaintext_sha256=p_dependency AND p.lifecycle_status='active') THEN RAISE EXCEPTION 'export_scope_unavailable';END IF;
 PERFORM external_use.consume_sensitive_grant(p_session,p_sensitive,'export_object_retrieval',p_export,p_digest,p_dependency,p_key);
 INSERT INTO external_use.stream_grant(account_id,deal_id,export_id,session_hash,token_hash,security_epoch,posture_version)
 VALUES(app.policy_account_id(),app.policy_deal_id(),p_export,p_session,p_token,(SELECT security_epoch FROM app.account WHERE id=app.policy_account_id()),(SELECT posture_version FROM app.deal_workspace WHERE deal_id=app.policy_deal_id())) RETURNING * INTO row;
 RETURN jsonb_build_object('id',row.id,'export_id',p_export,'expires_at',row.expires_at);
END $$;
CREATE FUNCTION external_use.resolve_stream(p_export uuid,p_session text,p_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE row external_use.stream_grant%ROWTYPE; e external_use.internal_export%ROWTYPE; result jsonb;BEGIN
 SELECT * INTO row FROM external_use.stream_grant WHERE export_id=p_export AND token_hash=p_token AND session_hash=p_session AND expires_at>clock_timestamp();
 IF NOT FOUND OR row.security_epoch<>(SELECT security_epoch FROM app.account WHERE id=app.policy_account_id()) OR row.posture_version<>(SELECT posture_version FROM app.deal_workspace WHERE deal_id=app.policy_deal_id()) THEN RAISE EXCEPTION 'export_stream_grant_invalid';END IF;
 SELECT * INTO e FROM external_use.internal_export WHERE id=p_export;
 IF jsonb_array_length(external_use.export_scope(e.revision_id)->'hard_blockers')>0 THEN RAISE EXCEPTION 'export_hard_gate_blocked';END IF;
 SELECT jsonb_build_object('storage_key',p.storage_key,'sha256',p.plaintext_sha256,'ciphertext_sha256',p.ciphertext_sha256,'byte_length',p.byte_length) INTO result
 FROM external_use.internal_export_object o JOIN object_store.protected_object p ON p.id=o.protected_object_id WHERE o.export_id=p_export AND p.lifecycle_status='active';
 IF result IS NULL THEN RAISE EXCEPTION 'export_scope_unavailable';END IF;
 RETURN result;
END $$;
DO $$ DECLARE fn record;BEGIN
 FOR fn IN SELECT p.oid::regprocedure AS name FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='external_use' LOOP
  EXECUTE format('ALTER FUNCTION %s OWNER TO app_export_owner',fn.name);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',fn.name);
 END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION external_use.control_export(uuid,text,bigint),external_use.create_stream_grant(uuid,text,text,text,text,text,text),external_use.resolve_stream(uuid,text,text) TO app_runtime;
GRANT EXECUTE ON FUNCTION external_use.dispatch_export() TO job_dispatcher;
GRANT EXECUTE ON FUNCTION external_use.begin_export(uuid,text),external_use.finish_export(uuid,text,jsonb,jsonb,text) TO job_worker;
REVOKE CREATE ON SCHEMA external_use FROM app_export_owner;
