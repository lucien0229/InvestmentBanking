-- Source parsing is a durable, bounded task. Original coverage and bytes remain immutable.
CREATE ROLE app_source_processing_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
GRANT app_source_processing_owner TO postgres;
GRANT USAGE, CREATE ON SCHEMA source TO app_source_processing_owner;
GRANT USAGE ON SCHEMA app, object_store, extensions TO app_source_processing_owner;
CREATE TABLE source.processing_task (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL, actor_id uuid NOT NULL,
  deal_id uuid NOT NULL, source_record_id uuid NOT NULL UNIQUE REFERENCES source.source_record(id),
  protected_object_id uuid NOT NULL REFERENCES object_store.protected_object(id),
  workspace_posture_version bigint NOT NULL, security_epoch bigint NOT NULL,
  state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','running','completed','failed','canceled')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
  lease_hash text, lease_expires_at timestamptz, heartbeat_at timestamptz,
  problem_code text, representation_id uuid REFERENCES source.source_representation(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), completed_at timestamptz,
  FOREIGN KEY(account_id,deal_id) REFERENCES app.deal_workspace(account_id,deal_id)
);
CREATE TABLE source.processing_context (
  backend_pid integer PRIMARY KEY, task_id uuid NOT NULL,
  account_id uuid NOT NULL, deal_id uuid NOT NULL, source_record_id uuid NOT NULL, protected_object_id uuid NOT NULL
);
ALTER TABLE source.processing_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE source.processing_context FORCE ROW LEVEL SECURITY;
CREATE POLICY source_processing_private_context ON source.processing_context TO app_source_processing_owner USING(true) WITH CHECK(true);
REVOKE ALL ON source.processing_task, source.processing_context FROM PUBLIC, app_runtime, job_worker, job_dispatcher;
ALTER TABLE source.processing_task ENABLE ROW LEVEL SECURITY;
ALTER TABLE source.processing_task FORCE ROW LEVEL SECURITY;
CREATE POLICY source_processing_dispatch ON source.processing_task TO app_source_processing_owner USING(true) WITH CHECK(true);
CREATE POLICY source_processing_read ON source.processing_task FOR SELECT TO app_runtime, app_source_owner USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY source_processing_enqueue ON source.processing_task FOR INSERT TO app_source_owner WITH CHECK(account_id=app.policy_account_id() AND actor_id=app.policy_actor_id() AND deal_id=app.policy_deal_id());
GRANT SELECT ON source.processing_task TO app_runtime;
GRANT SELECT, INSERT ON source.processing_task TO app_source_owner;
GRANT ALL ON source.processing_context TO app_source_processing_owner;
GRANT SELECT, UPDATE ON source.processing_task TO app_source_processing_owner;

CREATE FUNCTION source.processing_identity(p_kind text) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=source,pg_catalog AS $$
 SELECT CASE p_kind WHEN 'account' THEN account_id WHEN 'deal' THEN deal_id WHEN 'record' THEN source_record_id WHEN 'object' THEN protected_object_id END FROM source.processing_context WHERE backend_pid=pg_backend_pid()
$$;
ALTER FUNCTION source.processing_identity(text) OWNER TO app_source_processing_owner;
REVOKE ALL ON FUNCTION source.processing_identity(text) FROM PUBLIC;
GRANT SELECT ON app.account,app.deal,app.deal_workspace,source.source_record,source.source_representation,object_store.protected_object TO app_source_processing_owner;
GRANT UPDATE(id) ON app.account,app.deal,app.deal_workspace TO app_source_processing_owner;
GRANT INSERT ON source.source_representation,source.processing_coverage,source.source_fragment TO app_source_processing_owner;
CREATE POLICY source_processing_account ON app.account FOR SELECT TO app_source_processing_owner USING(id=source.processing_identity('account'));
CREATE POLICY source_processing_deal ON app.deal FOR SELECT TO app_source_processing_owner USING(account_id=source.processing_identity('account') AND id=source.processing_identity('deal'));
CREATE POLICY source_processing_workspace ON app.deal_workspace FOR SELECT TO app_source_processing_owner USING(account_id=source.processing_identity('account') AND deal_id=source.processing_identity('deal'));
CREATE POLICY source_processing_record ON source.source_record FOR SELECT TO app_source_processing_owner USING(account_id=source.processing_identity('account') AND deal_id=source.processing_identity('deal') AND id=source.processing_identity('record'));
CREATE POLICY source_processing_object ON object_store.protected_object FOR SELECT TO app_source_processing_owner USING(account_id=source.processing_identity('account') AND deal_id=source.processing_identity('deal') AND id=source.processing_identity('object'));
CREATE POLICY source_processing_representation ON source.source_representation TO app_source_processing_owner USING(account_id=source.processing_identity('account') AND deal_id=source.processing_identity('deal') AND source_record_id=source.processing_identity('record') AND protected_object_id=source.processing_identity('object')) WITH CHECK(account_id=source.processing_identity('account') AND deal_id=source.processing_identity('deal') AND source_record_id=source.processing_identity('record') AND protected_object_id=source.processing_identity('object'));
CREATE POLICY source_processing_coverage ON source.processing_coverage FOR INSERT TO app_source_processing_owner WITH CHECK(account_id=source.processing_identity('account') AND deal_id=source.processing_identity('deal') AND source_record_id=source.processing_identity('record'));
CREATE POLICY source_processing_fragment ON source.source_fragment FOR INSERT TO app_source_processing_owner WITH CHECK(account_id=source.processing_identity('account') AND deal_id=source.processing_identity('deal') AND source_record_id=source.processing_identity('record'));
ALTER TABLE source.processing_coverage DROP CONSTRAINT processing_coverage_source_record_id_key;
CREATE INDEX processing_coverage_record_history ON source.processing_coverage(source_record_id,created_at DESC);

CREATE FUNCTION source.enqueue_processing(p_record_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=source,app,pg_catalog AS $$
DECLARE record source.source_record%ROWTYPE; task_id uuid;
BEGIN
 SELECT r.* INTO record FROM source.source_record r WHERE r.id=p_record_id AND r.account_id=app.policy_account_id() AND r.deal_id=app.policy_deal_id();
 IF record.id IS NULL THEN RAISE EXCEPTION 'source_scope_mismatch'; END IF;
 IF record.rights_posture IN ('blocked','withdrawn') OR record.disposition_code='withdrawn' OR NOT coalesce(record.rights_basis->'processing_operations' ? 'parse',false) THEN RAISE EXCEPTION 'processing_not_permitted'; END IF;
 SELECT id INTO task_id FROM source.processing_task WHERE source_record_id=p_record_id;
 IF FOUND THEN RETURN task_id; END IF;
 IF NOT EXISTS(SELECT 1 FROM app.deal d JOIN app.deal_workspace w ON w.deal_id=d.id WHERE d.id=record.deal_id AND d.activity_posture='active' AND w.processing_posture='permitted') THEN RAISE EXCEPTION 'processing_not_permitted'; END IF;
 INSERT INTO source.processing_task(account_id,actor_id,deal_id,source_record_id,protected_object_id,workspace_posture_version,security_epoch)
 SELECT record.account_id,app.policy_actor_id(),record.deal_id,record.id,rep.protected_object_id,w.posture_version,a.security_epoch FROM source.source_representation rep JOIN app.deal_workspace w ON w.deal_id=record.deal_id JOIN app.account a ON a.id=record.account_id WHERE rep.source_record_id=record.id AND rep.representation_type='original' RETURNING id INTO task_id;
 RETURN task_id;
END $$;
GRANT CREATE ON SCHEMA source TO app_source_owner;
ALTER FUNCTION source.enqueue_processing(uuid) OWNER TO app_source_owner;
REVOKE CREATE ON SCHEMA source FROM app_source_owner;
REVOKE ALL ON FUNCTION source.enqueue_processing(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION source.enqueue_processing(uuid) TO app_runtime;

CREATE FUNCTION source.processing_fence(p_task_id uuid,p_lease_hash text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=source,app,pg_catalog AS $$
DECLARE task source.processing_task%ROWTYPE;
BEGIN
 DELETE FROM source.processing_context WHERE backend_pid=pg_backend_pid();
 SELECT * INTO task FROM source.processing_task WHERE id=p_task_id AND state='running' AND lease_hash=p_lease_hash AND lease_expires_at>clock_timestamp() FOR UPDATE;
 IF task.id IS NULL THEN RETURN false; END IF;
 INSERT INTO source.processing_context VALUES(pg_backend_pid(),task.id,task.account_id,task.deal_id,task.source_record_id,task.protected_object_id);
 -- Hold the same posture rows through the commit so lifecycle changes cannot
 -- interleave between the authorization fence and appended derived records.
 PERFORM 1 FROM app.deal d JOIN app.deal_workspace w ON w.deal_id=d.id JOIN app.account a ON a.id=d.account_id WHERE d.id=task.deal_id FOR SHARE OF d,w,a;
 IF NOT EXISTS(SELECT 1 FROM source.source_record r WHERE r.id=task.source_record_id AND r.rights_posture NOT IN ('blocked','withdrawn') AND r.disposition_code<>'withdrawn' AND coalesce(r.rights_basis->'processing_operations' ? 'parse',false)) OR NOT EXISTS(SELECT 1 FROM app.deal d JOIN app.deal_workspace w ON w.deal_id=d.id JOIN app.account a ON a.id=d.account_id WHERE d.id=task.deal_id AND d.activity_posture='active' AND w.posture_version=task.workspace_posture_version AND w.processing_posture='permitted' AND a.security_epoch=task.security_epoch) THEN
   UPDATE source.processing_task SET state='canceled',problem_code='source_scope_changed',completed_at=clock_timestamp() WHERE id=task.id;
   DELETE FROM source.processing_context WHERE backend_pid=pg_backend_pid(); RETURN false;
 END IF;
 RETURN true;
END $$;
ALTER FUNCTION source.processing_fence(uuid,text) OWNER TO app_source_processing_owner;
REVOKE ALL ON FUNCTION source.processing_fence(uuid,text) FROM PUBLIC;

CREATE FUNCTION source.claim_processing(p_lease_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=source,app,pg_catalog AS $$
DECLARE task source.processing_task%ROWTYPE; result jsonb;
BEGIN
 IF p_lease_hash !~ '^[a-f0-9]{64}$' THEN RETURN NULL; END IF;
 UPDATE source.processing_task SET state=CASE WHEN attempts>=3 THEN 'failed' ELSE 'queued' END,problem_code='worker_lease_expired',lease_hash=NULL WHERE state='running' AND lease_expires_at<=clock_timestamp();
 SELECT * INTO task FROM source.processing_task WHERE state='queued' AND attempts<3 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1;
 IF task.id IS NULL THEN RETURN NULL; END IF;
 UPDATE source.processing_task SET state='running',attempts=attempts+1,lease_hash=p_lease_hash,lease_expires_at=clock_timestamp()+interval '90 seconds',heartbeat_at=clock_timestamp() WHERE id=task.id;
 IF NOT source.processing_fence(task.id,p_lease_hash) THEN RETURN NULL; END IF;
 SELECT jsonb_build_object('id',task.id,'source_record_id',r.id,'object_id',o.id,'storage_key',o.storage_key,'ciphertext_sha256',o.ciphertext_sha256,'content_sha256',r.content_sha256,'media_type',r.media_type) INTO result FROM source.source_record r JOIN object_store.protected_object o ON o.id=task.protected_object_id WHERE r.id=task.source_record_id;
 DELETE FROM source.processing_context WHERE backend_pid=pg_backend_pid();
 RETURN result;
END $$;
ALTER FUNCTION source.claim_processing(text) OWNER TO app_source_processing_owner;
REVOKE ALL ON FUNCTION source.claim_processing(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION source.claim_processing(text) TO job_worker;

CREATE FUNCTION source.heartbeat_processing(p_task_id uuid,p_lease_hash text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=source,pg_catalog AS $$
DECLARE valid boolean;
BEGIN
 valid:=source.processing_fence(p_task_id,p_lease_hash);
 IF valid THEN UPDATE source.processing_task SET lease_expires_at=clock_timestamp()+interval '90 seconds',heartbeat_at=clock_timestamp() WHERE id=p_task_id; END IF;
 DELETE FROM source.processing_context WHERE backend_pid=pg_backend_pid(); RETURN valid;
END $$;
ALTER FUNCTION source.heartbeat_processing(uuid,text) OWNER TO app_source_processing_owner;
REVOKE ALL ON FUNCTION source.heartbeat_processing(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION source.heartbeat_processing(uuid,text) TO job_worker;

CREATE FUNCTION source.complete_processing(p_task_id uuid,p_lease_hash text,p_report jsonb) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=source,app,extensions,pg_catalog AS $$
DECLARE task source.processing_task%ROWTYPE; original source.source_record%ROWTYPE; coverage_id uuid:=gen_random_uuid(); rep_id uuid:=gen_random_uuid(); fragment jsonb;
BEGIN
 IF NOT source.processing_fence(p_task_id,p_lease_hash) THEN RETURN false; END IF;
 SELECT * INTO task FROM source.processing_task WHERE id=p_task_id;
 SELECT * INTO original FROM source.source_record WHERE id=task.source_record_id;
 IF coalesce((p_report->>'clean')::boolean,false) IS NOT TRUE OR coalesce((p_report->>'substantive_parsing')::boolean,false) IS NOT TRUE THEN
   UPDATE source.processing_task SET state='failed',problem_code='source_processing_failed',completed_at=clock_timestamp() WHERE id=p_task_id;
   DELETE FROM source.processing_context WHERE backend_pid=pg_backend_pid(); RETURN false;
 END IF;
 IF original.content_sha256 IS DISTINCT FROM p_report->>'original_sha256' OR jsonb_typeof(p_report->'fragments') IS DISTINCT FROM 'array' OR jsonb_array_length(p_report->'fragments')>10000 OR p_report->>'container_digest' !~ 'sha256:[a-f0-9]{64}$' THEN RAISE EXCEPTION 'source_processing_identity_mismatch'; END IF;
 INSERT INTO source.processing_coverage(id,account_id,deal_id,source_record_id,coverage_code,parser_identity,coverage_payload) VALUES(coverage_id,task.account_id,task.deal_id,task.source_record_id,p_report->>'coverage_code',p_report->>'parser_identity',p_report-'fragments');
 INSERT INTO source.source_representation(id,account_id,deal_id,source_record_id,representation_type,protected_object_id,content_sha256,parser_identity,processing_coverage_id,processing_result) VALUES(rep_id,task.account_id,task.deal_id,task.source_record_id,'native_text',task.protected_object_id,original.content_sha256,p_report->>'parser_identity',coverage_id,'parsed');
 FOR fragment IN SELECT value FROM jsonb_array_elements(p_report->'fragments') LOOP
   IF fragment->>'content_sha256' IS DISTINCT FROM 'sha256:'||encode(extensions.digest(fragment->>'content_text','sha256'),'hex') THEN RAISE EXCEPTION 'source_fragment_identity_mismatch'; END IF;
   INSERT INTO source.source_fragment(account_id,deal_id,source_record_id,representation_id,locator,content_text,content_sha256,coverage_code) VALUES(task.account_id,task.deal_id,task.source_record_id,rep_id,fragment->'locator',fragment->>'content_text',fragment->>'content_sha256',p_report->>'coverage_code');
 END LOOP;
 UPDATE source.processing_task SET state='completed',representation_id=rep_id,problem_code=NULL,completed_at=clock_timestamp(),lease_hash=NULL WHERE id=p_task_id;
 DELETE FROM source.processing_context WHERE backend_pid=pg_backend_pid(); RETURN true;
END $$;
ALTER FUNCTION source.complete_processing(uuid,text,jsonb) OWNER TO app_source_processing_owner;
REVOKE ALL ON FUNCTION source.complete_processing(uuid,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION source.complete_processing(uuid,text,jsonb) TO job_worker;
REVOKE CREATE ON SCHEMA source FROM app_source_processing_owner;

-- Read the coverage attached to the exact Representation; historical coverage
-- is never overwritten or accidentally joined to a different interpretation.
DO $$
DECLARE item record; definition text; changed text;
BEGIN
 FOR item IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='knowledge' AND p.proname IN ('accept_evidence','accept_claim_as_fact','get_evidence_projection')) OR (n.nspname='source' AND p.proname IN ('packet_blockers','get_source_record_projection')) LOOP
  definition:=pg_get_functiondef(item.oid); changed:=definition;
  IF item.proname='accept_evidence' THEN changed:=replace(changed,'pc.source_record_id=record_row.id','pc.id=representation_row.processing_coverage_id'); END IF;
  IF item.proname='accept_claim_as_fact' THEN changed:=replace(changed,'JOIN source.processing_coverage pc ON pc.source_record_id = e.source_record_id','JOIN source.source_representation rp ON rp.id=e.representation_id JOIN source.processing_coverage pc ON pc.id=rp.processing_coverage_id'); END IF;
  IF item.proname='get_evidence_projection' THEN changed:=replace(changed,'FROM source.processing_coverage pc WHERE pc.source_record_id=e.source_record_id','FROM source.processing_coverage pc JOIN source.source_representation rp ON rp.processing_coverage_id=pc.id WHERE rp.id=e.representation_id'); END IF;
  IF item.proname='packet_blockers' THEN
   changed:=replace(changed,'WHERE c.source_record_id=member_row.source_record_id;', 'WHERE c.source_record_id=member_row.source_record_id ORDER BY c.created_at DESC,c.id DESC LIMIT 1;');
   changed:=replace(changed,'''original_bytes_only'',''insufficient'',''partial''','''original_bytes_only'',''insufficient'',''partial'',''native_text_partial''');
  END IF;
  IF item.proname='get_source_record_projection' THEN changed:=replace(changed,'JOIN source.source_representation rep ON rep.source_record_id=r.id', 'JOIN LATERAL (SELECT rp.* FROM source.source_representation rp WHERE rp.source_record_id=r.id ORDER BY rp.created_at DESC,rp.id DESC LIMIT 1) rep ON true'); END IF;
  IF changed=definition THEN RAISE EXCEPTION 'source_coverage_projection_migration_mismatch: %',item.proname; END IF;
  EXECUTE changed;
 END LOOP;
END $$;
