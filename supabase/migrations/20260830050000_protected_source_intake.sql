-- Source Intake: Deal-bound quarantine uploads, immutable Source Records, and the
-- protected-object data plane. Runtime writes go through the typed definer
-- procedures below; app_runtime receives no direct write authority.

CREATE SCHEMA IF NOT EXISTS source;
CREATE SCHEMA IF NOT EXISTS object_store;
CREATE SCHEMA IF NOT EXISTS identity;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_source_owner') THEN
    CREATE ROLE app_source_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
  ELSE
    ALTER ROLE app_source_owner NOLOGIN NOINHERIT NOCREATEDB NOCREATEROLE BYPASSRLS;
  END IF;
END
$$;
GRANT app_source_owner TO postgres;
GRANT USAGE ON SCHEMA app TO app_source_owner;
GRANT EXECUTE ON FUNCTION app.policy_account_id(), app.policy_actor_id(), app.policy_deal_id(), app.record_audit(text,text,text,text,text,text) TO app_source_owner;
GRANT SELECT ON app.deal, app.deal_workspace, app.paid_preflight TO app_source_owner;

CREATE TABLE IF NOT EXISTS source.upload_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  purpose_code text NOT NULL CHECK (purpose_code IN ('source_intake')),
  batch_id uuid NOT NULL,
  consent_digest text NOT NULL,
  operation_preview_id uuid,
  max_files integer NOT NULL CHECK (max_files > 0),
  max_total_bytes bigint NOT NULL CHECK (max_total_bytes > 0),
  status_code text NOT NULL DEFAULT 'open' CHECK (status_code IN ('open','finalized','canceled','expired')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  row_version bigint NOT NULL DEFAULT 1,
  UNIQUE (account_id, id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id)
);

CREATE TABLE IF NOT EXISTS source.source_material (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  stable_name text NOT NULL CHECK (length(btrim(stable_name)) BETWEEN 1 AND 240),
  origin_code text NOT NULL CHECK (origin_code IN ('client_supplied','public_observation')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id)
);

CREATE TABLE IF NOT EXISTS source.quarantined_upload (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  upload_session_id uuid NOT NULL REFERENCES source.upload_session(id),
  client_file_id text NOT NULL CHECK (length(btrim(client_file_id)) BETWEEN 1 AND 160),
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 240),
  quarantine_storage_key text NOT NULL UNIQUE,
  declared_media_type text NOT NULL,
  observed_media_type text,
  declared_byte_length bigint NOT NULL CHECK (declared_byte_length > 0),
  observed_byte_length bigint,
  client_sha256 text,
  transport_sha256 text,
  offset_bytes bigint NOT NULL DEFAULT 0 CHECK (offset_bytes >= 0),
  source_declaration jsonb NOT NULL,
  rights_posture_inputs jsonb NOT NULL,
  confidentiality_posture jsonb NOT NULL,
  processing_posture jsonb NOT NULL,
  source_material_id uuid REFERENCES source.source_material(id),
  scan_result jsonb,
  status_code text NOT NULL DEFAULT 'created' CHECK (status_code IN ('created','uploading','uploaded','quarantined','accepted','rejected','canceled','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  received_at timestamptz,
  expires_at timestamptz NOT NULL,
  row_version bigint NOT NULL DEFAULT 1,
  UNIQUE (upload_session_id, client_file_id),
  UNIQUE (account_id, id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, upload_session_id) REFERENCES source.upload_session(account_id, id),
  FOREIGN KEY (account_id, source_material_id) REFERENCES source.source_material(account_id, id)
);

CREATE TABLE IF NOT EXISTS object_store.protected_object (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  scope_code text NOT NULL DEFAULT 'deal' CHECK (scope_code = 'deal'),
  storage_key text NOT NULL UNIQUE,
  plaintext_sha256 text NOT NULL CHECK (plaintext_sha256 ~ '^[a-f0-9]{64}$'),
  ciphertext_sha256 text NOT NULL CHECK (ciphertext_sha256 ~ '^[a-f0-9]{64}$'),
  byte_length bigint NOT NULL CHECK (byte_length > 0),
  media_type text NOT NULL,
  envelope_version text NOT NULL,
  kms_key_version text NOT NULL,
  wrapped_dek jsonb NOT NULL,
  lifecycle_status text NOT NULL DEFAULT 'active' CHECK (lifecycle_status IN ('active','tombstoned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id)
);

CREATE TABLE IF NOT EXISTS source.accepted_source_object (
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  source_record_id uuid NOT NULL,
  protected_object_id uuid NOT NULL REFERENCES object_store.protected_object(id),
  attachment_code text NOT NULL DEFAULT 'original_bytes' CHECK (attachment_code = 'original_bytes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_record_id),
  UNIQUE (protected_object_id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id)
);

CREATE TABLE IF NOT EXISTS source.processing_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  source_record_id uuid NOT NULL,
  coverage_code text NOT NULL,
  parser_identity text NOT NULL,
  coverage_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_record_id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id)
);

CREATE TABLE IF NOT EXISTS source.source_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  source_material_id uuid NOT NULL REFERENCES source.source_material(id),
  version_ordinal integer NOT NULL CHECK (version_ordinal > 0),
  version_label text NOT NULL,
  origin_code text NOT NULL CHECK (origin_code IN ('client_supplied','public_observation')),
  acquisition_method text NOT NULL,
  authority_basis text NOT NULL,
  provenance_class text NOT NULL CHECK (provenance_class IN ('synthetic','real')),
  confidentiality_class text NOT NULL CHECK (confidentiality_class IN ('public','internal','confidential','restricted')),
  de_identification_posture text NOT NULL,
  rights_posture text NOT NULL,
  rights_basis jsonb NOT NULL,
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  byte_length bigint NOT NULL CHECK (byte_length > 0),
  media_type text NOT NULL,
  record_date date NOT NULL,
  received_at timestamptz NOT NULL,
  accepted_at timestamptz NOT NULL,
  disposition_code text NOT NULL DEFAULT 'current',
  reliance_state text NOT NULL DEFAULT 'unassessed',
  native_locator_profile_code text NOT NULL,
  native_locator_profile_version text NOT NULL,
  provenance_receipt jsonb NOT NULL,
  limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
  supersedes_id uuid REFERENCES source.source_record(id),
  accepted_upload_id uuid NOT NULL REFERENCES source.quarantined_upload(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, id),
  UNIQUE (source_material_id, version_ordinal),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, source_material_id) REFERENCES source.source_material(account_id, id),
  FOREIGN KEY (account_id, accepted_upload_id) REFERENCES source.quarantined_upload(account_id, id)
);

CREATE TABLE IF NOT EXISTS source.source_representation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  source_record_id uuid NOT NULL REFERENCES source.source_record(id),
  representation_type text NOT NULL DEFAULT 'original',
  protected_object_id uuid NOT NULL REFERENCES object_store.protected_object(id),
  content_sha256 text NOT NULL,
  parser_identity text NOT NULL,
  processing_coverage_id uuid NOT NULL REFERENCES source.processing_coverage(id),
  processing_result text NOT NULL DEFAULT 'accepted',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_record_id, representation_type),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id)
);

CREATE TABLE IF NOT EXISTS source.command_idempotency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  command_type text NOT NULL CHECK (command_type IN ('accept_source_record','create_object_grant')),
  key_hash text NOT NULL,
  request_digest text NOT NULL,
  source_record_id uuid,
  job_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, actor_id, command_type, key_hash)
);

CREATE TABLE IF NOT EXISTS source.intake_job (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  upload_id uuid REFERENCES source.quarantined_upload(id),
  source_record_id uuid REFERENCES source.source_record(id),
  job_type text NOT NULL CHECK (job_type IN ('source_safety','source_acceptance')),
  state_code text NOT NULL CHECK (state_code IN ('queued','running','completed','failed')),
  problem jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id)
);

CREATE TABLE IF NOT EXISTS identity.protected_object_stream_grant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  session_token_hash text NOT NULL,
  protected_object_id uuid NOT NULL REFERENCES object_store.protected_object(id),
  source_record_id uuid NOT NULL REFERENCES source.source_record(id),
  purpose_code text NOT NULL CHECK (purpose_code IN ('source_inspection')),
  operation_code text NOT NULL DEFAULT 'read' CHECK (operation_code = 'read'),
  token_hash text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id)
);

CREATE TABLE IF NOT EXISTS object_store.protected_stream_access_receipt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  grant_id uuid NOT NULL REFERENCES identity.protected_object_stream_grant(id),
  protected_object_id uuid NOT NULL REFERENCES object_store.protected_object(id),
  source_record_id uuid NOT NULL REFERENCES source.source_record(id),
  principal_code text NOT NULL DEFAULT 'individual_banker',
  purpose_code text NOT NULL,
  receipt_kind text NOT NULL CHECK (receipt_kind IN ('started','completed','failed')),
  byte_start bigint,
  byte_end bigint,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS protected_stream_receipt_idempotency
  ON object_store.protected_stream_access_receipt (grant_id, receipt_kind, byte_start, byte_end);

CREATE UNIQUE INDEX IF NOT EXISTS protected_stream_receipt_idempotency
  ON object_store.protected_stream_access_receipt (grant_id, receipt_kind, byte_start, byte_end);

ALTER TABLE source.upload_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE source.upload_session FORCE ROW LEVEL SECURITY;
ALTER TABLE source.source_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE source.source_material FORCE ROW LEVEL SECURITY;
ALTER TABLE source.quarantined_upload ENABLE ROW LEVEL SECURITY;
ALTER TABLE source.quarantined_upload FORCE ROW LEVEL SECURITY;
ALTER TABLE source.source_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE source.source_record FORCE ROW LEVEL SECURITY;
ALTER TABLE source.source_representation ENABLE ROW LEVEL SECURITY;
ALTER TABLE source.source_representation FORCE ROW LEVEL SECURITY;
ALTER TABLE source.processing_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE source.processing_coverage FORCE ROW LEVEL SECURITY;
ALTER TABLE source.accepted_source_object ENABLE ROW LEVEL SECURITY;
ALTER TABLE source.accepted_source_object FORCE ROW LEVEL SECURITY;
ALTER TABLE source.intake_job ENABLE ROW LEVEL SECURITY;
ALTER TABLE source.intake_job FORCE ROW LEVEL SECURITY;
ALTER TABLE object_store.protected_object ENABLE ROW LEVEL SECURITY;
ALTER TABLE object_store.protected_object FORCE ROW LEVEL SECURITY;
ALTER TABLE object_store.protected_stream_access_receipt ENABLE ROW LEVEL SECURITY;
ALTER TABLE object_store.protected_stream_access_receipt FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.protected_object_stream_grant ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.protected_object_stream_grant FORCE ROW LEVEL SECURITY;
ALTER TABLE source.command_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE source.command_idempotency FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'source_upload_session_scope' AND polrelid = 'source.upload_session'::regclass) THEN
    CREATE POLICY source_upload_session_scope ON source.upload_session FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY source_material_scope ON source.source_material FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY source_quarantine_scope ON source.quarantined_upload FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY source_record_scope ON source.source_record FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY source_representation_scope ON source.source_representation FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY source_coverage_scope ON source.processing_coverage FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY source_accepted_object_scope ON source.accepted_source_object FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY source_intake_job_scope ON source.intake_job FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY protected_object_scope ON object_store.protected_object FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY protected_receipt_scope ON object_store.protected_stream_access_receipt FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY object_grant_scope ON identity.protected_object_stream_grant FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY source_idempotency_scope ON source.command_idempotency FOR SELECT TO app_runtime USING (account_id = app.policy_account_id());
  END IF;
END
$$;

REVOKE ALL ON ALL TABLES IN SCHEMA source, object_store, identity FROM app_runtime;
GRANT SELECT ON source.upload_session, source.source_material, source.quarantined_upload, source.source_record, source.source_representation, source.processing_coverage, source.accepted_source_object, source.intake_job, source.command_idempotency TO app_runtime;
GRANT SELECT ON object_store.protected_object, object_store.protected_stream_access_receipt TO app_runtime;
GRANT SELECT ON identity.protected_object_stream_grant TO app_runtime;
GRANT USAGE ON SCHEMA source, object_store, identity TO app_runtime;
GRANT USAGE, CREATE ON SCHEMA source, object_store, identity TO app_source_owner;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA source, object_store, identity TO app_source_owner;

CREATE OR REPLACE FUNCTION source.create_upload_session(p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_purpose text, p_batch_id uuid, p_consent_digest text, p_operation_preview_id uuid, p_files jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, app, pg_catalog AS $$
DECLARE session_id uuid := gen_random_uuid(); expires timestamptz := clock_timestamp() + interval '2 hours'; total_bytes bigint; item jsonb; file_id uuid; result_files jsonb := '[]'::jsonb;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN RAISE EXCEPTION 'upload_scope_mismatch' USING ERRCODE = '42501'; END IF;
  IF p_purpose <> 'source_intake' OR jsonb_typeof(p_files) <> 'array' OR jsonb_array_length(p_files) < 1 OR jsonb_array_length(p_files) > 50 THEN RAISE EXCEPTION 'upload_limit_exceeded' USING ERRCODE = '22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM app.deal d JOIN app.deal_workspace w ON w.deal_id=d.id WHERE d.id=p_deal_id AND d.account_id=p_account_id AND d.activity_posture='active' AND w.paid_preflight_status IN ('pass','limited-proceed') AND w.processing_posture IN ('permitted','limited') AND w.commercial_posture='entitled') THEN
    RAISE EXCEPTION 'processing_not_permitted' USING ERRCODE = '42501';
  END IF;
  IF p_operation_preview_id IS NULL OR NOT EXISTS (SELECT 1 FROM app.paid_preflight p WHERE p.id=p_operation_preview_id AND p.account_id=p_account_id AND p.deal_id=p_deal_id AND p.result IN ('pass','limited-proceed') AND NOT EXISTS (SELECT 1 FROM app.paid_preflight newer WHERE newer.deal_id=p.deal_id AND newer.version>p.version)) THEN
    RAISE EXCEPTION 'processing_not_permitted' USING ERRCODE = '42501';
  END IF;
  SELECT sum((value->>'byte_length')::bigint) INTO total_bytes FROM jsonb_array_elements(p_files);
  IF total_bytes IS NULL OR total_bytes <= 0 OR total_bytes > 2147483648 THEN RAISE EXCEPTION 'upload_limit_exceeded' USING ERRCODE = '22023'; END IF;
  INSERT INTO source.upload_session(id, account_id, deal_id, actor_id, purpose_code, batch_id, consent_digest, operation_preview_id, max_files, max_total_bytes, expires_at)
    VALUES (session_id,p_account_id,p_deal_id,p_actor_id,p_purpose,p_batch_id,p_consent_digest,p_operation_preview_id,jsonb_array_length(p_files),2147483648,expires);
  FOR item IN SELECT value FROM jsonb_array_elements(p_files) LOOP
    IF (item->>'byte_length')::bigint <= 0 OR (item->>'byte_length')::bigint > 104857600 THEN RAISE EXCEPTION 'upload_limit_exceeded' USING ERRCODE = '22023'; END IF;
    file_id := gen_random_uuid();
    INSERT INTO source.quarantined_upload(id,account_id,deal_id,actor_id,upload_session_id,client_file_id,display_name,quarantine_storage_key,declared_media_type,declared_byte_length,client_sha256,source_declaration,rights_posture_inputs,confidentiality_posture,processing_posture,source_material_id,expires_at)
    VALUES (file_id,p_account_id,p_deal_id,p_actor_id,session_id,btrim(item->>'client_file_id'),btrim(item->>'display_name'),'quarantine/'||session_id::text||'/'||file_id::text||'.bin',item->>'media_type',(item->>'byte_length')::bigint,NULLIF(item->>'sha256',''),item->'source_declaration',item->'rights_posture_inputs',item->'confidentiality_posture',item->'processing_posture',NULLIF(item->'source_declaration'->>'source_material_id','')::uuid,expires);
    result_files := result_files || jsonb_build_array(jsonb_build_object('server_file_id',file_id,'client_file_id',item->>'client_file_id','display_name',item->>'display_name','byte_length',(item->>'byte_length')::text,'media_type',item->>'media_type','sha256',NULLIF(item->>'sha256',''),'offset',0,'state','created','expires_at',expires));
  END LOOP;
  RETURN jsonb_build_object('id',session_id,'account_id',p_account_id,'deal_id',p_deal_id,'purpose',p_purpose,'batch_id',p_batch_id,'operation_preview_id',p_operation_preview_id,'max_files',jsonb_array_length(p_files),'max_total_bytes',2147483648,'row_version',1,'expires_at',expires,'status','open','files',result_files);
END
$$;

CREATE OR REPLACE FUNCTION source.get_upload_target(p_account_id uuid, p_actor_id uuid, p_session_id uuid, p_file_id uuid)
RETURNS TABLE(account_id uuid, deal_id uuid, declared_byte_length bigint, offset_bytes bigint, status_code text, expires_at timestamptz, display_name text, declared_media_type text, source_material_id uuid, new_source_material_name text, quarantine_storage_key text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, app, pg_catalog AS $$
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() THEN RETURN; END IF;
  RETURN QUERY SELECT q.account_id,q.deal_id,q.declared_byte_length,q.offset_bytes,q.status_code,q.expires_at,q.display_name,q.declared_media_type,q.source_material_id,q.source_declaration->>'new_source_material_name',q.quarantine_storage_key FROM source.quarantined_upload q WHERE q.id=p_file_id AND q.upload_session_id=p_session_id AND q.account_id=p_account_id AND q.actor_id=p_actor_id AND q.expires_at > clock_timestamp() AND EXISTS (SELECT 1 FROM source.upload_session s WHERE s.id=p_session_id AND s.account_id=p_account_id AND s.status_code='open' AND s.expires_at > clock_timestamp());
END
$$;

CREATE OR REPLACE FUNCTION source.append_upload_chunk(p_account_id uuid, p_actor_id uuid, p_session_id uuid, p_file_id uuid, p_expected_offset bigint, p_chunk_length bigint)
RETURNS TABLE(offset_bytes bigint, status_code text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, app, pg_catalog AS $$
DECLARE q source.quarantined_upload%ROWTYPE;
BEGIN
  SELECT * INTO q FROM source.quarantined_upload WHERE id=p_file_id AND upload_session_id=p_session_id AND account_id=p_account_id AND actor_id=p_actor_id FOR UPDATE;
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR q.id IS NULL THEN RAISE EXCEPTION 'upload_scope_mismatch' USING ERRCODE = '42501'; END IF;
  IF q.expires_at <= clock_timestamp() OR NOT EXISTS (SELECT 1 FROM source.upload_session s WHERE s.id=p_session_id AND s.status_code='open' AND s.expires_at > clock_timestamp()) THEN RAISE EXCEPTION 'upload_session_expired' USING ERRCODE = '22023'; END IF;
  IF q.offset_bytes <> p_expected_offset THEN RAISE EXCEPTION 'upload_offset_mismatch' USING ERRCODE = '22023'; END IF;
  IF p_chunk_length <= 0 OR q.offset_bytes + p_chunk_length > q.declared_byte_length THEN RAISE EXCEPTION 'upload_limit_exceeded' USING ERRCODE = '22023'; END IF;
  UPDATE source.quarantined_upload AS u SET offset_bytes=u.offset_bytes+p_chunk_length,status_code=CASE WHEN u.offset_bytes+p_chunk_length=u.declared_byte_length THEN 'uploaded' ELSE 'uploading' END,row_version=u.row_version+1,received_at=CASE WHEN u.offset_bytes+p_chunk_length=u.declared_byte_length THEN clock_timestamp() ELSE u.received_at END WHERE u.id=q.id;
  RETURN QUERY SELECT u.offset_bytes,u.status_code FROM source.quarantined_upload AS u WHERE u.id=q.id;
END
$$;

CREATE OR REPLACE FUNCTION source.mark_upload_finalized(p_account_id uuid, p_actor_id uuid, p_session_id uuid, p_file_id uuid, p_observed_size bigint, p_transport_sha256 text, p_observed_media_type text, p_scan_result jsonb, p_source_material_id uuid DEFAULT NULL, p_new_source_material_name text DEFAULT NULL)
RETURNS TABLE(outcome text, source_material_id uuid, problem_code text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, app, pg_catalog AS $$
DECLARE q source.quarantined_upload%ROWTYPE; material_id uuid; clean boolean := coalesce((p_scan_result->>'clean')::boolean,false);
BEGIN
  SELECT * INTO q FROM source.quarantined_upload WHERE id=p_file_id AND upload_session_id=p_session_id AND account_id=p_account_id AND actor_id=p_actor_id FOR UPDATE;
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR q.id IS NULL THEN RETURN QUERY SELECT 'failed',NULL::uuid,'upload_scope_mismatch'; RETURN; END IF;
  IF q.status_code = 'accepted' THEN RETURN QUERY SELECT 'succeeded',q.source_material_id,NULL::text; RETURN; END IF;
  IF q.status_code IN ('rejected','canceled') THEN RETURN QUERY SELECT 'failed',q.source_material_id,coalesce(q.scan_result->>'code','upload_not_finalizable'); RETURN; END IF;
  IF q.offset_bytes <> q.declared_byte_length OR p_observed_size <> q.declared_byte_length THEN UPDATE source.quarantined_upload SET status_code='rejected',scan_result=jsonb_build_object('clean',false,'code','upload_offset_mismatch'),row_version=row_version+1 WHERE id=q.id; RETURN QUERY SELECT 'failed',NULL::uuid,'upload_offset_mismatch'; RETURN; END IF;
  IF coalesce((q.rights_posture_inputs->>'receipt_permitted')::boolean,false) IS NOT TRUE THEN UPDATE source.quarantined_upload SET status_code='rejected',observed_byte_length=p_observed_size,transport_sha256=p_transport_sha256,observed_media_type=p_observed_media_type,scan_result=jsonb_build_object('clean',false,'code','source_acceptance_not_permitted'),row_version=row_version+1 WHERE id=q.id; RETURN QUERY SELECT 'failed',NULL::uuid,'source_acceptance_not_permitted'; RETURN; END IF;
  IF q.client_sha256 IS NOT NULL AND q.client_sha256 <> p_transport_sha256 THEN UPDATE source.quarantined_upload SET status_code='rejected',observed_byte_length=p_observed_size,transport_sha256=p_transport_sha256,scan_result=jsonb_build_object('clean',false,'code','file_digest_mismatch'),row_version=row_version+1 WHERE id=q.id; RETURN QUERY SELECT 'failed',NULL::uuid,'file_digest_mismatch'; RETURN; END IF;
  IF NOT clean THEN UPDATE source.quarantined_upload SET status_code='rejected',observed_byte_length=p_observed_size,transport_sha256=p_transport_sha256,observed_media_type=p_observed_media_type,scan_result=p_scan_result,row_version=row_version+1 WHERE id=q.id; RETURN QUERY SELECT 'failed',NULL::uuid,coalesce(p_scan_result->>'code','scan_incomplete'); RETURN; END IF;
  material_id := p_source_material_id;
  IF material_id IS NULL THEN INSERT INTO source.source_material(account_id,deal_id,stable_name,origin_code) VALUES (p_account_id,q.deal_id,coalesce(NULLIF(btrim(p_new_source_material_name),''),q.display_name),'client_supplied') RETURNING id INTO material_id; END IF;
  IF NOT EXISTS (SELECT 1 FROM source.source_material WHERE id=material_id AND account_id=p_account_id AND deal_id=q.deal_id) THEN RETURN QUERY SELECT 'failed',NULL::uuid,'source_material_scope_mismatch'; RETURN; END IF;
  UPDATE source.quarantined_upload SET status_code='quarantined',observed_byte_length=p_observed_size,transport_sha256=p_transport_sha256,observed_media_type=p_observed_media_type,scan_result=p_scan_result,source_material_id=material_id,row_version=row_version+1 WHERE id=q.id;
  RETURN QUERY SELECT 'succeeded',material_id,NULL::text;
END
$$;

DROP FUNCTION IF EXISTS source.get_upload_session_projection(uuid,uuid,uuid);
CREATE OR REPLACE FUNCTION source.get_upload_session_projection(p_account_id uuid, p_actor_id uuid, p_session_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = source, app, pg_catalog AS $$
  SELECT jsonb_build_object('id',s.id,'account_id',s.account_id,'deal_id',s.deal_id,'purpose',s.purpose_code,'batch_id',s.batch_id,'operation_preview_id',s.operation_preview_id,'max_files',s.max_files,'max_total_bytes',s.max_total_bytes,'row_version',s.row_version,'expires_at',s.expires_at,'status',s.status_code,'files',coalesce((SELECT jsonb_agg(jsonb_build_object('server_file_id',q.id,'client_file_id',q.client_file_id,'display_name',q.display_name,'byte_length',q.declared_byte_length::text,'media_type',q.declared_media_type,'sha256',q.client_sha256,'offset',q.offset_bytes,'state',q.status_code,'expires_at',q.expires_at) ORDER BY q.created_at) FROM source.quarantined_upload q WHERE q.upload_session_id=s.id),'[]'::jsonb))
  FROM source.upload_session s WHERE s.id=p_session_id AND s.account_id=p_account_id AND s.actor_id=p_actor_id AND p_account_id=app.policy_account_id() AND p_actor_id=app.policy_actor_id();
$$;

CREATE OR REPLACE FUNCTION source.accept_source_record(p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_source_material_id uuid, p_upload_id uuid, p_key_hash text, p_request_digest text, p_object_id uuid, p_storage_key text, p_plaintext_sha256 text, p_ciphertext_sha256 text, p_byte_length bigint, p_media_type text, p_envelope_version text, p_kms_key_version text, p_wrapped_dek jsonb, p_authority_basis text, p_record_date date, p_version_label text, p_rights_posture text, p_confidentiality_class text, p_provenance_class text, p_de_identification_posture text, p_locator_profile_code text, p_locator_profile_version text, p_limitations jsonb)
RETURNS TABLE(job_id uuid, source_record_id uuid, protected_object_id uuid, idempotent_replayed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, object_store, app, pg_catalog AS $$
DECLARE existing source.command_idempotency%ROWTYPE; q source.quarantined_upload%ROWTYPE; previous source.source_record%ROWTYPE; record_id uuid := gen_random_uuid(); object_id uuid := p_object_id; coverage_id uuid := gen_random_uuid(); representation_id uuid := gen_random_uuid(); new_job uuid := gen_random_uuid(); material source.source_material%ROWTYPE; ordinal integer; receipt_permitted boolean;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN RAISE EXCEPTION 'source_scope_mismatch' USING ERRCODE = '42501'; END IF;
  SELECT * INTO existing FROM source.command_idempotency WHERE account_id=p_account_id AND actor_id=p_actor_id AND command_type='accept_source_record' AND key_hash=p_key_hash;
  IF FOUND THEN IF existing.request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE='23505'; END IF; SELECT rep.protected_object_id INTO object_id FROM source.source_representation AS rep WHERE rep.source_record_id=existing.source_record_id AND rep.representation_type='original'; RETURN QUERY SELECT existing.job_id,existing.source_record_id,object_id,true; RETURN; END IF;
  SELECT * INTO q FROM source.quarantined_upload WHERE id=p_upload_id AND account_id=p_account_id AND deal_id=p_deal_id AND source_material_id=p_source_material_id AND status_code='quarantined' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'source_acceptance_not_permitted' USING ERRCODE='42501'; END IF;
  receipt_permitted := coalesce((q.rights_posture_inputs->>'receipt_permitted')::boolean, false);
  SELECT * INTO material FROM source.source_material WHERE id=p_source_material_id AND account_id=p_account_id AND deal_id=p_deal_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'source_scope_mismatch' USING ERRCODE='42501'; END IF;
  SELECT coalesce(max(version_ordinal),0)+1 INTO ordinal FROM source.source_record WHERE source_material_id=p_source_material_id;
  SELECT * INTO previous FROM source.source_record WHERE source_material_id=p_source_material_id ORDER BY version_ordinal DESC LIMIT 1;
  INSERT INTO object_store.protected_object(id,account_id,deal_id,storage_key,plaintext_sha256,ciphertext_sha256,byte_length,media_type,envelope_version,kms_key_version,wrapped_dek) VALUES (object_id,p_account_id,p_deal_id,p_storage_key,p_plaintext_sha256,p_ciphertext_sha256,p_byte_length,p_media_type,p_envelope_version,p_kms_key_version,p_wrapped_dek);
  INSERT INTO source.processing_coverage(id,account_id,deal_id,source_record_id,coverage_code,parser_identity,coverage_payload) VALUES (coverage_id,p_account_id,p_deal_id,record_id,'original_bytes_only','source-safety-scanner-v1',jsonb_build_object('original_bytes',true,'substantive_parsing',false,'ai',false,'rendering',false,'limitations',p_limitations));
  INSERT INTO source.source_record(id,account_id,deal_id,source_material_id,version_ordinal,version_label,origin_code,acquisition_method,authority_basis,provenance_class,confidentiality_class,de_identification_posture,rights_posture,rights_basis,content_sha256,byte_length,media_type,record_date,received_at,accepted_at,native_locator_profile_code,native_locator_profile_version,provenance_receipt,limitations,supersedes_id,accepted_upload_id)
    VALUES (record_id,p_account_id,p_deal_id,p_source_material_id,ordinal,coalesce(NULLIF(btrim(p_version_label),''),'v'||ordinal::text),'client_supplied','resumable_tus_quarantine',p_authority_basis,p_provenance_class,p_confidentiality_class,p_de_identification_posture,p_rights_posture,jsonb_build_object('basis',p_authority_basis,'receipt_permitted',receipt_permitted,'processing_operations',q.rights_posture_inputs->'processing_operations','conditions',q.rights_posture_inputs->'conditions'),p_plaintext_sha256,p_byte_length,p_media_type,p_record_date,q.received_at,clock_timestamp(),p_locator_profile_code,p_locator_profile_version,jsonb_build_object('upload_id',q.id,'session_id',q.upload_session_id,'authority_basis',p_authority_basis,'received_at',q.received_at,'accepted_at',clock_timestamp()),coalesce(p_limitations,'[]'::jsonb),NULLIF(previous.id,'00000000-0000-0000-0000-000000000000'),q.id);
  INSERT INTO source.source_representation(id,account_id,deal_id,source_record_id,protected_object_id,content_sha256,parser_identity,processing_coverage_id) VALUES (representation_id,p_account_id,p_deal_id,record_id,object_id,p_plaintext_sha256,'source-native-profile-v1',coverage_id);
  INSERT INTO source.accepted_source_object(account_id,deal_id,source_record_id,protected_object_id) VALUES (p_account_id,p_deal_id,record_id,object_id);
  INSERT INTO source.intake_job(id,account_id,deal_id,actor_id,upload_id,source_record_id,job_type,state_code,completed_at) VALUES (new_job,p_account_id,p_deal_id,p_actor_id,q.id,record_id,'source_acceptance','completed',clock_timestamp());
  UPDATE source.quarantined_upload SET status_code='accepted',row_version=row_version+1 WHERE id=q.id;
  INSERT INTO source.command_idempotency(account_id,actor_id,command_type,key_hash,request_digest,source_record_id,job_id) VALUES (p_account_id,p_actor_id,'accept_source_record',p_key_hash,p_request_digest,record_id,new_job);
  PERFORM app.record_audit('source_record_accepted','completed','source_record',record_id::text,'accepted_source_record',gen_random_uuid()::text);
  RETURN QUERY SELECT new_job,record_id,object_id,false;
END
$$;

CREATE OR REPLACE FUNCTION source.get_source_record_projection(p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_source_material_id uuid, p_source_record_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = source, object_store, app, pg_catalog AS $$
  SELECT jsonb_build_object('id',r.id,'deal_id',r.deal_id,'source_material_id',r.source_material_id,'version',r.version_ordinal,'version_label',r.version_label,'status','accepted','content_identity',jsonb_build_object('sha256',r.content_sha256,'byte_length',r.byte_length,'media_type',r.media_type),'provenance',jsonb_build_object('class',r.provenance_class,'origin',r.origin_code,'acquisition_method',r.acquisition_method,'authority_basis',r.authority_basis,'receipt',r.provenance_receipt),'classification',jsonb_build_object('confidentiality_class',r.confidentiality_class,'de_identification_posture',r.de_identification_posture),'rights',jsonb_build_object('posture',r.rights_posture,'basis',r.rights_basis),'dates',jsonb_build_object('record_date',r.record_date,'received_at',r.received_at,'accepted_at',r.accepted_at),'coverage',jsonb_build_object('id',c.id,'code',c.coverage_code,'parser_identity',c.parser_identity,'payload',c.coverage_payload),'representation',jsonb_build_object('id',rep.id,'type',rep.representation_type,'original_bytes_preserved',true,'protected_object_id',rep.protected_object_id,'processing_result',rep.processing_result),'native_locator_profile',jsonb_build_object('code',r.native_locator_profile_code,'version',r.native_locator_profile_version),'limitations',r.limitations,'supersedes_id',r.supersedes_id) AS projection
  FROM source.source_record r JOIN source.source_representation rep ON rep.source_record_id=r.id JOIN source.processing_coverage c ON c.id=rep.processing_coverage_id WHERE r.id=p_source_record_id AND r.source_material_id=p_source_material_id AND r.deal_id=p_deal_id AND r.account_id=p_account_id AND p_account_id=app.policy_account_id() AND p_actor_id=app.policy_actor_id();
$$;

CREATE OR REPLACE FUNCTION source.create_object_grant(p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_session_token_hash text, p_source_record_id uuid, p_token_hash text, p_purpose text)
RETURNS TABLE(protected_object_id uuid, grant_id uuid, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, identity, app, pg_catalog AS $$
DECLARE record_row source.source_record%ROWTYPE; object_id uuid; grant_id_value uuid := gen_random_uuid(); expiry timestamptz := clock_timestamp()+interval '5 minutes';
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN RAISE EXCEPTION 'object_grant_scope_mismatch' USING ERRCODE='42501'; END IF;
  SELECT r.* INTO record_row FROM source.source_record r WHERE r.id=p_source_record_id AND r.account_id=p_account_id AND r.deal_id=p_deal_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'object_grant_scope_mismatch' USING ERRCODE='42501'; END IF;
  SELECT rep.protected_object_id INTO object_id FROM source.source_representation AS rep WHERE rep.source_record_id=p_source_record_id AND rep.representation_type='original';
  IF object_id IS NULL THEN RAISE EXCEPTION 'object_grant_invalid' USING ERRCODE='42501'; END IF;
  INSERT INTO identity.protected_object_stream_grant(id,account_id,deal_id,actor_id,session_token_hash,protected_object_id,source_record_id,purpose_code,token_hash,expires_at) VALUES (grant_id_value,p_account_id,p_deal_id,p_actor_id,p_session_token_hash,object_id,p_source_record_id,p_purpose,p_token_hash,expiry);
  RETURN QUERY SELECT object_id,grant_id_value,expiry;
END
$$;

CREATE OR REPLACE FUNCTION source.resolve_object_grant(p_account_id uuid, p_actor_id uuid, p_session_token_hash text, p_object_id uuid, p_token_hash text)
RETURNS TABLE(deal_id uuid, source_record_id uuid, storage_key text, media_type text, byte_length bigint, plaintext_sha256 text, wrapped_dek jsonb, envelope_version text, kms_key_version text, grant_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, identity, object_store, app, pg_catalog AS $$
BEGIN
  RETURN QUERY SELECT g.deal_id,g.source_record_id,o.storage_key,o.media_type,o.byte_length,o.plaintext_sha256,o.wrapped_dek,o.envelope_version,o.kms_key_version,g.id FROM identity.protected_object_stream_grant g JOIN object_store.protected_object o ON o.id=g.protected_object_id WHERE g.account_id=p_account_id AND g.actor_id=p_actor_id AND g.session_token_hash=p_session_token_hash AND g.protected_object_id=p_object_id AND g.token_hash=p_token_hash AND g.revoked_at IS NULL AND g.expires_at > clock_timestamp() AND o.lifecycle_status='active' AND p_account_id=app.policy_account_id() AND p_actor_id=app.policy_actor_id();
END
$$;

CREATE OR REPLACE FUNCTION source.record_stream_receipt(p_account_id uuid, p_actor_id uuid, p_session_token_hash text, p_grant_id uuid, p_object_id uuid, p_deal_id uuid, p_source_record_id uuid, p_kind text, p_start bigint, p_end bigint)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, identity, object_store, app, pg_catalog AS $$
DECLARE receipt_id uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM identity.protected_object_stream_grant g WHERE g.id=p_grant_id AND g.account_id=p_account_id AND g.actor_id=p_actor_id AND g.session_token_hash=p_session_token_hash AND g.protected_object_id=p_object_id AND g.deal_id=p_deal_id AND g.source_record_id=p_source_record_id) THEN RAISE EXCEPTION 'object_grant_invalid' USING ERRCODE='42501'; END IF;
  INSERT INTO object_store.protected_stream_access_receipt(id,account_id,deal_id,grant_id,protected_object_id,source_record_id,purpose_code,receipt_kind,byte_start,byte_end) VALUES (receipt_id,p_account_id,p_deal_id,p_grant_id,p_object_id,p_source_record_id,'source_inspection',p_kind,p_start,p_end) ON CONFLICT (grant_id, receipt_kind, byte_start, byte_end) DO NOTHING;
  SELECT r.id INTO receipt_id FROM object_store.protected_stream_access_receipt AS r WHERE r.grant_id=p_grant_id AND r.receipt_kind=p_kind AND r.byte_start=p_start AND r.byte_end=p_end;
  RETURN receipt_id;
END
$$;

DROP FUNCTION IF EXISTS source.cancel_upload_session(uuid,uuid,uuid,uuid);
CREATE OR REPLACE FUNCTION source.cancel_upload_session(p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_session_id uuid, p_expected_row_version bigint, p_file_ids uuid[] DEFAULT NULL, p_all_remaining boolean DEFAULT false)
RETURNS TABLE(canceled boolean, row_version bigint, canceled_file_ids uuid[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, app, pg_catalog AS $$
DECLARE session_row source.upload_session%ROWTYPE; selected_ids uuid[] := '{}'::uuid[];
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN RETURN QUERY SELECT false,NULL::bigint,selected_ids; RETURN; END IF;
  SELECT * INTO session_row FROM source.upload_session WHERE id=p_session_id AND account_id=p_account_id AND deal_id=p_deal_id AND status_code='open' FOR UPDATE;
  IF NOT FOUND OR session_row.row_version <> p_expected_row_version THEN RETURN QUERY SELECT false,NULL::bigint,selected_ids; RETURN; END IF;
  IF p_all_remaining THEN
    SELECT coalesce(array_agg(q.id ORDER BY q.created_at),'{}'::uuid[]) INTO selected_ids FROM source.quarantined_upload q WHERE q.upload_session_id=p_session_id AND q.account_id=p_account_id AND q.status_code IN ('created','uploading','uploaded');
    UPDATE source.quarantined_upload AS u SET status_code='canceled',row_version=u.row_version+1 WHERE u.id = ANY(selected_ids);
    UPDATE source.upload_session AS s SET status_code='canceled',row_version=s.row_version+1 WHERE s.id=session_row.id;
  ELSE
    IF p_file_ids IS NULL OR cardinality(p_file_ids) = 0 OR EXISTS (SELECT 1 FROM unnest(p_file_ids) requested(id) WHERE NOT EXISTS (SELECT 1 FROM source.quarantined_upload q WHERE q.id=requested.id AND q.upload_session_id=p_session_id AND q.account_id=p_account_id AND q.status_code IN ('created','uploading','uploaded'))) THEN
      RETURN QUERY SELECT false,NULL::bigint,selected_ids; RETURN;
    END IF;
    SELECT coalesce(array_agg(DISTINCT q.id ORDER BY q.id),'{}'::uuid[]) INTO selected_ids FROM source.quarantined_upload q WHERE q.id = ANY(p_file_ids);
    UPDATE source.quarantined_upload AS u SET status_code='canceled',row_version=u.row_version+1 WHERE u.id = ANY(selected_ids);
    UPDATE source.upload_session AS s SET row_version=s.row_version+1 WHERE s.id=session_row.id;
  END IF;
  SELECT s.row_version INTO session_row.row_version FROM source.upload_session s WHERE s.id=p_session_id;
  RETURN QUERY SELECT true,session_row.row_version,selected_ids;
END
$$;

REVOKE ALL ON FUNCTION source.create_upload_session(uuid,uuid,uuid,text,uuid,text,uuid,jsonb), source.get_upload_target(uuid,uuid,uuid,uuid), source.append_upload_chunk(uuid,uuid,uuid,uuid,bigint,bigint), source.mark_upload_finalized(uuid,uuid,uuid,uuid,bigint,text,text,jsonb,uuid,text), source.get_upload_session_projection(uuid,uuid,uuid), source.accept_source_record(uuid,uuid,uuid,uuid,uuid,text,text,uuid,text,text,text,bigint,text,text,text,jsonb,text,date,text,text,text,text,text,text,text,jsonb), source.get_source_record_projection(uuid,uuid,uuid,uuid,uuid), source.create_object_grant(uuid,uuid,uuid,text,uuid,text,text), source.resolve_object_grant(uuid,uuid,text,uuid,text), source.record_stream_receipt(uuid,uuid,text,uuid,uuid,uuid,uuid,text,bigint,bigint), source.cancel_upload_session(uuid,uuid,uuid,uuid,bigint,uuid[],boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION source.create_upload_session(uuid,uuid,uuid,text,uuid,text,uuid,jsonb), source.get_upload_target(uuid,uuid,uuid,uuid), source.append_upload_chunk(uuid,uuid,uuid,uuid,bigint,bigint), source.mark_upload_finalized(uuid,uuid,uuid,uuid,bigint,text,text,jsonb,uuid,text), source.get_upload_session_projection(uuid,uuid,uuid), source.accept_source_record(uuid,uuid,uuid,uuid,uuid,text,text,uuid,text,text,text,bigint,text,text,text,jsonb,text,date,text,text,text,text,text,text,text,jsonb), source.get_source_record_projection(uuid,uuid,uuid,uuid,uuid), source.create_object_grant(uuid,uuid,uuid,text,uuid,text,text), source.resolve_object_grant(uuid,uuid,text,uuid,text), source.record_stream_receipt(uuid,uuid,text,uuid,uuid,uuid,uuid,text,bigint,bigint), source.cancel_upload_session(uuid,uuid,uuid,uuid,bigint,uuid[],boolean) TO app_runtime;

GRANT USAGE ON SCHEMA source, object_store, identity TO app_source_owner;
ALTER FUNCTION source.create_upload_session(uuid,uuid,uuid,text,uuid,text,uuid,jsonb) OWNER TO app_source_owner;
ALTER FUNCTION source.get_upload_target(uuid,uuid,uuid,uuid) OWNER TO app_source_owner;
ALTER FUNCTION source.append_upload_chunk(uuid,uuid,uuid,uuid,bigint,bigint) OWNER TO app_source_owner;
ALTER FUNCTION source.mark_upload_finalized(uuid,uuid,uuid,uuid,bigint,text,text,jsonb,uuid,text) OWNER TO app_source_owner;
ALTER FUNCTION source.get_upload_session_projection(uuid,uuid,uuid) OWNER TO app_source_owner;
ALTER FUNCTION source.accept_source_record(uuid,uuid,uuid,uuid,uuid,text,text,uuid,text,text,text,bigint,text,text,text,jsonb,text,date,text,text,text,text,text,text,text,jsonb) OWNER TO app_source_owner;
ALTER FUNCTION source.get_source_record_projection(uuid,uuid,uuid,uuid,uuid) OWNER TO app_source_owner;
ALTER FUNCTION source.create_object_grant(uuid,uuid,uuid,text,uuid,text,text) OWNER TO app_source_owner;
ALTER FUNCTION source.resolve_object_grant(uuid,uuid,text,uuid,text) OWNER TO app_source_owner;
ALTER FUNCTION source.record_stream_receipt(uuid,uuid,text,uuid,uuid,uuid,uuid,text,bigint,bigint) OWNER TO app_source_owner;
ALTER FUNCTION source.cancel_upload_session(uuid,uuid,uuid,uuid,bigint,uuid[],boolean) OWNER TO app_source_owner;
REVOKE CREATE ON SCHEMA source, object_store, identity FROM app_source_owner;

CREATE OR REPLACE FUNCTION source.prevent_source_record_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'source_record_immutable' USING ERRCODE='23514'; END $$;
DROP TRIGGER IF EXISTS source_record_immutable ON source.source_record;
CREATE TRIGGER source_record_immutable BEFORE UPDATE OR DELETE ON source.source_record FOR EACH ROW EXECUTE FUNCTION source.prevent_source_record_mutation();

CREATE OR REPLACE FUNCTION source.prevent_protected_artifact_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'protected_artifact_immutable' USING ERRCODE='23514'; END $$;
DROP TRIGGER IF EXISTS protected_object_immutable ON object_store.protected_object;
CREATE TRIGGER protected_object_immutable BEFORE UPDATE OR DELETE ON object_store.protected_object FOR EACH ROW EXECUTE FUNCTION source.prevent_protected_artifact_mutation();
DROP TRIGGER IF EXISTS source_representation_immutable ON source.source_representation;
CREATE TRIGGER source_representation_immutable BEFORE UPDATE OR DELETE ON source.source_representation FOR EACH ROW EXECUTE FUNCTION source.prevent_protected_artifact_mutation();
DROP TRIGGER IF EXISTS processing_coverage_immutable ON source.processing_coverage;
CREATE TRIGGER processing_coverage_immutable BEFORE UPDATE OR DELETE ON source.processing_coverage FOR EACH ROW EXECUTE FUNCTION source.prevent_protected_artifact_mutation();
DROP TRIGGER IF EXISTS accepted_source_object_immutable ON source.accepted_source_object;
CREATE TRIGGER accepted_source_object_immutable BEFORE UPDATE OR DELETE ON source.accepted_source_object FOR EACH ROW EXECUTE FUNCTION source.prevent_protected_artifact_mutation();
