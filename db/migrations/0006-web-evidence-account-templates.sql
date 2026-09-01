-- Ticket 07: immutable public-Web observations and Account-scoped reusable
-- template intake.  Both surfaces use the existing source owner/Runtime
-- context boundary; no browser role receives direct write access.

CREATE TABLE IF NOT EXISTS source.web_evidence_observation (
  source_record_id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  source_material_id uuid NOT NULL REFERENCES source.source_material(id),
  observation_ordinal integer NOT NULL CHECK (observation_ordinal > 0),
  requested_url text NOT NULL,
  canonical_url text NOT NULL,
  document_identity jsonb NOT NULL,
  retrieved_at timestamptz NOT NULL,
  as_of_time timestamptz NOT NULL,
  version_label text NOT NULL,
  capture_mode text NOT NULL CHECK (capture_mode IN ('snapshot','citation_only')),
  response_metadata jsonb NOT NULL,
  permitted_representation jsonb NOT NULL,
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  byte_length bigint NOT NULL CHECK (byte_length > 0),
  exact_locator jsonb NOT NULL,
  rights_posture jsonb NOT NULL,
  retrieval_limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
  reliance_state text NOT NULL DEFAULT 'reliance_limited' CHECK (reliance_state IN ('unassessed','reliance_limited','reliance_eligible','blocked')),
  stale_after timestamptz,
  supersedes_id uuid REFERENCES source.web_evidence_observation(source_record_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, source_record_id),
  UNIQUE (source_material_id, observation_ordinal),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, source_material_id) REFERENCES source.source_material(account_id, id)
);

ALTER TABLE source.web_evidence_observation
  DROP CONSTRAINT IF EXISTS web_evidence_observation_source_record_fk;
ALTER TABLE source.web_evidence_observation
  ADD CONSTRAINT web_evidence_observation_source_record_fk
  FOREIGN KEY (source_record_id) REFERENCES source.source_record(id);

CREATE TABLE IF NOT EXISTS source.web_observation_impact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  observation_id uuid NOT NULL REFERENCES source.web_evidence_observation(source_record_id),
  previous_observation_id uuid REFERENCES source.web_evidence_observation(source_record_id),
  impact_code text NOT NULL CHECK (impact_code IN ('new_observation','material_change','rights_changed','stale_previous')),
  affected_scope jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id)
);

CREATE TABLE IF NOT EXISTS source.account_operation_preview (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  operation_code text NOT NULL CHECK (operation_code = 'account_reusable_template_upload'),
  template_class text NOT NULL,
  purpose_code text NOT NULL CHECK (purpose_code = 'account_reusable_template'),
  consent_digest text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, id)
);

CREATE TABLE IF NOT EXISTS source.account_template_upload_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  purpose_code text NOT NULL CHECK (purpose_code = 'account_reusable_template'),
  batch_id uuid NOT NULL,
  consent_digest text NOT NULL,
  operation_preview_id uuid NOT NULL REFERENCES source.account_operation_preview(id),
  max_files integer NOT NULL DEFAULT 1 CHECK (max_files = 1),
  max_total_bytes bigint NOT NULL DEFAULT 2147483648 CHECK (max_total_bytes > 0),
  status_code text NOT NULL DEFAULT 'open' CHECK (status_code IN ('open','finalized','canceled','expired')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  row_version bigint NOT NULL DEFAULT 1,
  UNIQUE (account_id, id)
);

CREATE TABLE IF NOT EXISTS source.account_template_quarantined_upload (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  upload_session_id uuid NOT NULL REFERENCES source.account_template_upload_session(id),
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
  template_declaration jsonb NOT NULL,
  rights_posture_inputs jsonb NOT NULL,
  confidentiality_posture jsonb NOT NULL,
  processing_posture jsonb NOT NULL,
  scan_result jsonb,
  status_code text NOT NULL DEFAULT 'created' CHECK (status_code IN ('created','uploading','uploaded','quarantined','accepted','rejected','canceled','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  received_at timestamptz,
  expires_at timestamptz NOT NULL,
  row_version bigint NOT NULL DEFAULT 1,
  UNIQUE (upload_session_id, client_file_id),
  UNIQUE (account_id, id),
  FOREIGN KEY (account_id, upload_session_id) REFERENCES source.account_template_upload_session(account_id, id)
);

CREATE TABLE IF NOT EXISTS source.account_reusable_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  template_class text NOT NULL CHECK (length(btrim(template_class)) BETWEEN 1 AND 80),
  status_code text NOT NULL DEFAULT 'quarantined' CHECK (status_code IN ('quarantined','preflight_required','eligible','blocked','retired')),
  current_version_id uuid,
  row_version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, id)
);

CREATE TABLE IF NOT EXISTS source.account_reusable_template_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  template_id uuid NOT NULL REFERENCES source.account_reusable_template(id),
  version_ordinal integer NOT NULL CHECK (version_ordinal > 0),
  version_label text NOT NULL,
  display_name text NOT NULL,
  media_type text NOT NULL,
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  byte_length bigint NOT NULL CHECK (byte_length > 0),
  rights_attestation jsonb NOT NULL,
  clean_template_basis text NOT NULL CHECK (clean_template_basis IN ('separately_supplied_outside_live_deal','new_sanitized_outside_live_deal')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, version_ordinal),
  UNIQUE (account_id, id),
  FOREIGN KEY (account_id, template_id) REFERENCES source.account_reusable_template(account_id, id)
);

ALTER TABLE source.account_reusable_template
  DROP CONSTRAINT IF EXISTS account_reusable_template_current_version_fk;
ALTER TABLE source.account_reusable_template
  ADD CONSTRAINT account_reusable_template_current_version_fk
  FOREIGN KEY (account_id, current_version_id) REFERENCES source.account_reusable_template_version(account_id, id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS source.account_template_compatibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  template_id uuid NOT NULL REFERENCES source.account_reusable_template(id),
  version_id uuid NOT NULL REFERENCES source.account_reusable_template_version(id),
  compatibility_profile text NOT NULL,
  status_code text NOT NULL CHECK (status_code IN ('pending','eligible','incompatible')),
  report jsonb NOT NULL,
  limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
  assessed_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (account_id, template_id) REFERENCES source.account_reusable_template(account_id, id),
  FOREIGN KEY (account_id, version_id) REFERENCES source.account_reusable_template_version(account_id, id)
);

CREATE TABLE IF NOT EXISTS source.account_template_command_idempotency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  command_type text NOT NULL CHECK (command_type IN ('create_template','select_template')),
  key_hash text NOT NULL,
  request_digest text NOT NULL,
  template_id uuid,
  template_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, actor_id, command_type, key_hash)
);

CREATE TABLE IF NOT EXISTS source.deal_template_selection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  template_id uuid NOT NULL REFERENCES source.account_reusable_template(id),
  template_version_id uuid NOT NULL REFERENCES source.account_reusable_template_version(id),
  artifact_class text NOT NULL,
  exact_deal_mapping text NOT NULL,
  validation_id text NOT NULL,
  review_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, template_id) REFERENCES source.account_reusable_template(account_id, id),
  FOREIGN KEY (account_id, template_version_id) REFERENCES source.account_reusable_template_version(account_id, id)
);

CREATE TABLE IF NOT EXISTS object_store.protected_account_object (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  template_version_id uuid NOT NULL REFERENCES source.account_reusable_template_version(id),
  storage_key text NOT NULL UNIQUE,
  plaintext_sha256 text NOT NULL CHECK (plaintext_sha256 ~ '^[a-f0-9]{64}$'),
  ciphertext_sha256 text NOT NULL CHECK (ciphertext_sha256 ~ '^[a-f0-9]{64}$'),
  byte_length bigint NOT NULL CHECK (byte_length > 0),
  media_type text NOT NULL,
  envelope_version text NOT NULL,
  kms_key_version text NOT NULL,
  wrapped_dek jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, id),
  FOREIGN KEY (account_id, template_version_id) REFERENCES source.account_reusable_template_version(account_id, id)
);

DO $$
DECLARE table_name text;
BEGIN
  FOR table_name IN SELECT unnest(ARRAY['web_evidence_observation','web_observation_impact','account_operation_preview','account_template_upload_session','account_template_quarantined_upload','account_reusable_template','account_reusable_template_version','account_template_compatibility','account_template_command_idempotency','deal_template_selection']) LOOP
    EXECUTE format('ALTER TABLE source.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE source.%I FORCE ROW LEVEL SECURITY', table_name);
  END LOOP;
  ALTER TABLE object_store.protected_account_object ENABLE ROW LEVEL SECURITY;
  ALTER TABLE object_store.protected_account_object FORCE ROW LEVEL SECURITY;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname='ticket07_source_account_scope' AND polrelid='source.account_operation_preview'::regclass) THEN
    CREATE POLICY ticket07_web_scope ON source.web_evidence_observation FOR SELECT TO app_runtime USING (account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
    CREATE POLICY ticket07_web_impact_scope ON source.web_observation_impact FOR SELECT TO app_runtime USING (account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
    CREATE POLICY ticket07_source_account_scope ON source.account_operation_preview FOR SELECT TO app_runtime USING (account_id=app.policy_account_id() AND actor_id=app.policy_actor_id());
    CREATE POLICY ticket07_account_upload_scope ON source.account_template_upload_session FOR SELECT TO app_runtime USING (account_id=app.policy_account_id() AND actor_id=app.policy_actor_id());
    CREATE POLICY ticket07_account_quarantine_scope ON source.account_template_quarantined_upload FOR SELECT TO app_runtime USING (account_id=app.policy_account_id() AND actor_id=app.policy_actor_id());
    CREATE POLICY ticket07_template_scope ON source.account_reusable_template FOR SELECT TO app_runtime USING (account_id=app.policy_account_id());
    CREATE POLICY ticket07_template_version_scope ON source.account_reusable_template_version FOR SELECT TO app_runtime USING (account_id=app.policy_account_id());
    CREATE POLICY ticket07_template_compatibility_scope ON source.account_template_compatibility FOR SELECT TO app_runtime USING (account_id=app.policy_account_id());
    CREATE POLICY ticket07_template_command_scope ON source.account_template_command_idempotency FOR SELECT TO app_runtime USING (account_id=app.policy_account_id() AND actor_id=app.policy_actor_id());
    CREATE POLICY ticket07_selection_scope ON source.deal_template_selection FOR SELECT TO app_runtime USING (account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
    CREATE POLICY ticket07_account_object_scope ON object_store.protected_account_object FOR SELECT TO app_runtime USING (account_id=app.policy_account_id() AND app.policy_deal_id() IS NULL);
  END IF;
END
$$;

REVOKE ALL ON source.web_evidence_observation, source.web_observation_impact, source.account_operation_preview, source.account_template_upload_session, source.account_template_quarantined_upload, source.account_reusable_template, source.account_reusable_template_version, source.account_template_compatibility, source.account_template_command_idempotency, source.deal_template_selection, object_store.protected_account_object FROM app_runtime;
GRANT SELECT ON source.web_evidence_observation, source.web_observation_impact, source.account_operation_preview, source.account_template_upload_session, source.account_template_quarantined_upload, source.account_reusable_template, source.account_reusable_template_version, source.account_template_compatibility, source.account_template_command_idempotency, source.deal_template_selection TO app_runtime;
GRANT SELECT ON object_store.protected_account_object TO app_runtime;
GRANT SELECT, INSERT, UPDATE ON source.web_evidence_observation, source.web_observation_impact, source.account_operation_preview, source.account_template_upload_session, source.account_template_quarantined_upload, source.account_reusable_template, source.account_reusable_template_version, source.account_template_compatibility, source.account_template_command_idempotency, source.deal_template_selection, object_store.protected_account_object TO app_source_owner;
GRANT USAGE ON SCHEMA extensions TO app_source_owner;
GRANT EXECUTE ON FUNCTION extensions.digest(text,text), extensions.digest(bytea,text) TO app_source_owner;
GRANT USAGE ON SCHEMA source, object_store TO app_source_owner;

CREATE OR REPLACE FUNCTION source.create_account_operation_preview(p_account_id uuid, p_actor_id uuid, p_operation text, p_template_class text, p_purpose text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=source,app,pg_catalog AS $$
DECLARE preview_id uuid := gen_random_uuid(); expiry timestamptz := clock_timestamp()+interval '30 minutes'; consent text;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_purpose <> 'account_reusable_template' OR p_operation <> 'account_reusable_template_upload' THEN RAISE EXCEPTION 'account_template_scope_mismatch' USING ERRCODE='42501'; END IF;
  consent:='sha256:'||encode(extensions.digest(preview_id::text||'|'||p_operation||'|'||p_template_class||'|'||p_purpose,'sha256'),'hex');
  INSERT INTO source.account_operation_preview(id,account_id,actor_id,operation_code,template_class,purpose_code,consent_digest,expires_at) VALUES (preview_id,p_account_id,p_actor_id,p_operation,p_template_class,p_purpose,consent,expiry);
  PERFORM app.record_audit('account_template_operation_preview_created','completed','account_operation_preview',preview_id::text,'account_reusable_template',gen_random_uuid()::text);
  RETURN jsonb_build_object('id',preview_id,'account_id',p_account_id,'operation',p_operation,'template_class',p_template_class,'purpose',p_purpose,'expires_at',expiry,'status','available','consent_digest',consent);
END
$$;

CREATE OR REPLACE FUNCTION source.create_account_template_upload_session(p_account_id uuid,p_actor_id uuid,p_batch_id uuid,p_consent_digest text,p_operation_preview_id uuid,p_files jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=source,app,pg_catalog AS $$
DECLARE session_id uuid:=gen_random_uuid(); expiry timestamptz:=clock_timestamp()+interval '2 hours'; item jsonb; file_id uuid; result_file jsonb; total bigint; preview source.account_operation_preview%ROWTYPE;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() THEN RAISE EXCEPTION 'account_template_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(p_files)<>'array' OR jsonb_array_length(p_files)<>1 THEN RAISE EXCEPTION 'account_template_upload_limit_exceeded' USING ERRCODE='22023'; END IF;
  SELECT * INTO preview FROM source.account_operation_preview WHERE id=p_operation_preview_id AND account_id=p_account_id AND actor_id=p_actor_id AND expires_at>clock_timestamp();
  IF NOT FOUND OR preview.consent_digest IS DISTINCT FROM p_consent_digest THEN RAISE EXCEPTION 'account_template_operation_preview_required' USING ERRCODE='42501'; END IF;
  SELECT sum((value->>'byte_length')::bigint) INTO total FROM jsonb_array_elements(p_files);
  IF total IS NULL OR total<=0 OR total>2147483648 THEN RAISE EXCEPTION 'account_template_upload_limit_exceeded' USING ERRCODE='22023'; END IF;
  item:=p_files->0;
  IF item->'template_declaration'->>'template_class' IS DISTINCT FROM preview.template_class OR item->'template_declaration'->>'purpose_scope' IS DISTINCT FROM 'account_only' OR item->'template_declaration'->>'source_material_id' IS NOT NULL OR item->'template_declaration'->>'deal_id' IS NOT NULL THEN RAISE EXCEPTION 'live_deal_material_forbidden' USING ERRCODE='42501'; END IF;
  INSERT INTO source.account_template_upload_session(id,account_id,actor_id,purpose_code,batch_id,consent_digest,operation_preview_id,expires_at) VALUES (session_id,p_account_id,p_actor_id,'account_reusable_template',p_batch_id,p_consent_digest,p_operation_preview_id,expiry);
  file_id:=gen_random_uuid();
  INSERT INTO source.account_template_quarantined_upload(id,account_id,actor_id,upload_session_id,client_file_id,display_name,quarantine_storage_key,declared_media_type,declared_byte_length,client_sha256,template_declaration,rights_posture_inputs,confidentiality_posture,processing_posture,expires_at) VALUES (file_id,p_account_id,p_actor_id,session_id,btrim(item->>'client_file_id'),btrim(item->>'display_name'),'quarantine/account/'||session_id::text||'/'||file_id::text||'.bin',item->>'media_type',(item->>'byte_length')::bigint,NULLIF(item->>'sha256',''),item->'template_declaration',item->'rights_posture_inputs',item->'confidentiality_posture',item->'processing_posture',expiry);
  result_file:=jsonb_build_object('server_file_id',file_id,'client_file_id',item->>'client_file_id','display_name',item->>'display_name','byte_length',(item->>'byte_length'),'media_type',item->>'media_type','sha256',NULLIF(item->>'sha256',''),'offset',0,'state','created','expires_at',expiry);
  PERFORM app.record_audit('account_template_upload_session_created','completed','account_template_upload_session',session_id::text,'account_reusable_template_quarantine',gen_random_uuid()::text);
  RETURN jsonb_build_object('id',session_id,'account_id',p_account_id,'deal_id',NULL,'purpose','account_reusable_template','batch_id',p_batch_id,'operation_preview_id',p_operation_preview_id,'max_files',1,'max_total_bytes',2147483648,'row_version',1,'expires_at',expiry,'status','open','files',jsonb_build_array(result_file));
END
$$;

CREATE OR REPLACE FUNCTION source.get_account_template_upload_target(p_account_id uuid,p_actor_id uuid,p_session_id uuid,p_file_id uuid)
RETURNS TABLE(account_id uuid,declared_byte_length bigint,offset_bytes bigint,status_code text,expires_at timestamptz,display_name text,declared_media_type text,quarantine_storage_key text)
LANGUAGE sql SECURITY DEFINER SET search_path=source,app,pg_catalog AS $$
  SELECT q.account_id,q.declared_byte_length,q.offset_bytes,q.status_code,q.expires_at,q.display_name,q.declared_media_type,q.quarantine_storage_key FROM source.account_template_quarantined_upload q JOIN source.account_template_upload_session s ON s.id=q.upload_session_id WHERE q.id=p_file_id AND q.upload_session_id=p_session_id AND q.account_id=p_account_id AND q.actor_id=p_actor_id AND s.status_code='open' AND s.expires_at>clock_timestamp() AND q.expires_at>clock_timestamp() AND p_account_id=app.policy_account_id() AND p_actor_id=app.policy_actor_id();
$$;

CREATE OR REPLACE FUNCTION source.append_account_template_upload_chunk(p_account_id uuid,p_actor_id uuid,p_session_id uuid,p_file_id uuid,p_expected_offset bigint,p_chunk_length bigint)
RETURNS TABLE(offset_bytes bigint,status_code text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=source,app,pg_catalog AS $$
DECLARE q source.account_template_quarantined_upload%ROWTYPE;
BEGIN
  SELECT * INTO q FROM source.account_template_quarantined_upload WHERE id=p_file_id AND upload_session_id=p_session_id AND account_id=p_account_id AND actor_id=p_actor_id FOR UPDATE;
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR q.id IS NULL THEN RAISE EXCEPTION 'account_template_upload_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF q.expires_at<=clock_timestamp() OR p_expected_offset<>q.offset_bytes THEN RAISE EXCEPTION 'account_template_upload_offset_mismatch' USING ERRCODE='22023'; END IF;
  IF p_chunk_length<=0 OR q.offset_bytes+p_chunk_length>q.declared_byte_length THEN RAISE EXCEPTION 'account_template_upload_limit_exceeded' USING ERRCODE='22023'; END IF;
  UPDATE source.account_template_quarantined_upload SET offset_bytes=q.offset_bytes+p_chunk_length,status_code=CASE WHEN q.offset_bytes+p_chunk_length=q.declared_byte_length THEN 'uploaded' ELSE 'uploading' END,row_version=q.row_version+1,received_at=CASE WHEN q.offset_bytes+p_chunk_length=q.declared_byte_length THEN clock_timestamp() ELSE q.received_at END WHERE id=q.id;
  RETURN QUERY SELECT u.offset_bytes,u.status_code FROM source.account_template_quarantined_upload u WHERE u.id=q.id;
END
$$;

CREATE OR REPLACE FUNCTION source.mark_account_template_upload_finalized(p_account_id uuid,p_actor_id uuid,p_session_id uuid,p_file_id uuid,p_observed_size bigint,p_transport_sha256 text,p_observed_media_type text,p_scan_result jsonb)
RETURNS TABLE(outcome text,problem_code text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=source,app,pg_catalog AS $$
DECLARE q source.account_template_quarantined_upload%ROWTYPE; clean boolean:=coalesce((p_scan_result->>'clean')::boolean,false);
BEGIN
  SELECT * INTO q FROM source.account_template_quarantined_upload WHERE id=p_file_id AND upload_session_id=p_session_id AND account_id=p_account_id AND actor_id=p_actor_id FOR UPDATE;
  IF q.id IS NULL OR p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() THEN RETURN QUERY SELECT 'failed','account_template_upload_scope_mismatch'; RETURN; END IF;
  IF q.status_code='accepted' OR q.status_code='quarantined' THEN RETURN QUERY SELECT 'succeeded',NULL::text; RETURN; END IF;
  IF q.offset_bytes<>q.declared_byte_length OR p_observed_size<>q.declared_byte_length THEN UPDATE source.account_template_quarantined_upload SET status_code='rejected',scan_result=jsonb_build_object('clean',false,'code','account_template_upload_offset_mismatch'),row_version=row_version+1 WHERE id=q.id; RETURN QUERY SELECT 'failed','account_template_upload_offset_mismatch'; RETURN; END IF;
  IF coalesce((q.rights_posture_inputs->>'receipt_permitted')::boolean,false) IS NOT TRUE THEN UPDATE source.account_template_quarantined_upload SET status_code='rejected',scan_result=jsonb_build_object('clean',false,'code','account_template_rights_not_permitted'),row_version=row_version+1 WHERE id=q.id; RETURN QUERY SELECT 'failed','account_template_rights_not_permitted'; RETURN; END IF;
  IF q.client_sha256 IS NOT NULL AND lower(q.client_sha256)<>lower(p_transport_sha256) THEN UPDATE source.account_template_quarantined_upload SET status_code='rejected',scan_result=jsonb_build_object('clean',false,'code','account_template_digest_mismatch'),row_version=row_version+1 WHERE id=q.id; RETURN QUERY SELECT 'failed','account_template_digest_mismatch'; RETURN; END IF;
  IF NOT clean THEN UPDATE source.account_template_quarantined_upload SET status_code='rejected',observed_byte_length=p_observed_size,transport_sha256=p_transport_sha256,observed_media_type=p_observed_media_type,scan_result=p_scan_result,row_version=row_version+1 WHERE id=q.id; RETURN QUERY SELECT 'failed',coalesce(p_scan_result->>'code','account_template_scan_incomplete'); RETURN; END IF;
  UPDATE source.account_template_quarantined_upload SET status_code='quarantined',observed_byte_length=p_observed_size,transport_sha256=p_transport_sha256,observed_media_type=p_observed_media_type,scan_result=p_scan_result,row_version=row_version+1 WHERE id=q.id;
  PERFORM app.record_audit('account_template_quarantine_completed','completed','account_template_upload',q.id::text,'safety_preflight_pending',gen_random_uuid()::text);
  RETURN QUERY SELECT 'succeeded',NULL::text;
END
$$;

CREATE OR REPLACE FUNCTION source.get_account_template_upload_projection(p_account_id uuid,p_actor_id uuid,p_session_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=source,app,pg_catalog AS $$
  SELECT jsonb_build_object('id',s.id,'account_id',s.account_id,'deal_id',NULL,'purpose',s.purpose_code,'batch_id',s.batch_id,'operation_preview_id',s.operation_preview_id,'max_files',s.max_files,'max_total_bytes',s.max_total_bytes,'row_version',s.row_version,'expires_at',s.expires_at,'status',s.status_code,'files',coalesce((SELECT jsonb_agg(jsonb_build_object('server_file_id',q.id,'client_file_id',q.client_file_id,'display_name',q.display_name,'byte_length',q.declared_byte_length::text,'media_type',q.declared_media_type,'sha256',q.client_sha256,'offset',q.offset_bytes,'state',q.status_code,'expires_at',q.expires_at) ORDER BY q.created_at) FROM source.account_template_quarantined_upload q WHERE q.upload_session_id=s.id),'[]'::jsonb)) FROM source.account_template_upload_session s WHERE s.id=p_session_id AND s.account_id=p_account_id AND s.actor_id=p_actor_id AND p_account_id=app.policy_account_id() AND p_actor_id=app.policy_actor_id();
$$;

CREATE OR REPLACE FUNCTION source.create_account_reusable_template(p_account_id uuid,p_actor_id uuid,p_upload_id uuid,p_template_class text,p_rights_attestation jsonb,p_clean_template_basis text,p_key_hash text,p_request_digest text)
RETURNS TABLE(template_id uuid,version_id uuid,status text,idempotent_replayed boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path=source,app,pg_catalog AS $$
DECLARE prior source.account_template_command_idempotency%ROWTYPE; q source.account_template_quarantined_upload%ROWTYPE; t_id uuid:=gen_random_uuid(); v_id uuid:=gen_random_uuid();
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() THEN RAISE EXCEPTION 'account_template_scope_mismatch' USING ERRCODE='42501'; END IF;
  SELECT * INTO prior FROM source.account_template_command_idempotency WHERE account_id=p_account_id AND actor_id=p_actor_id AND command_type='create_template' AND key_hash=p_key_hash;
  IF FOUND THEN IF prior.request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE='23505'; END IF; RETURN QUERY SELECT prior.template_id,prior.template_version_id,'quarantined',true; RETURN; END IF;
  SELECT * INTO q FROM source.account_template_quarantined_upload WHERE id=p_upload_id AND account_id=p_account_id AND actor_id=p_actor_id AND status_code='quarantined' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'account_template_quarantine_required' USING ERRCODE='42501'; END IF;
  IF p_clean_template_basis NOT IN ('separately_supplied_outside_live_deal','new_sanitized_outside_live_deal') OR coalesce((p_rights_attestation->>'actor_attests_rights')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'account_template_rights_attestation_required' USING ERRCODE='42501'; END IF;
  INSERT INTO source.account_reusable_template(id,account_id,template_class,status_code) VALUES (t_id,p_account_id,p_template_class,'preflight_required');
  INSERT INTO source.account_reusable_template_version(id,account_id,template_id,version_ordinal,version_label,display_name,media_type,content_sha256,byte_length,rights_attestation,clean_template_basis) VALUES (v_id,p_account_id,t_id,1,'v1',q.display_name,q.declared_media_type,q.transport_sha256,q.observed_byte_length,p_rights_attestation,p_clean_template_basis);
  UPDATE source.account_reusable_template SET current_version_id=v_id WHERE id=t_id;
  UPDATE source.account_template_quarantined_upload SET status_code='accepted',row_version=row_version+1 WHERE id=q.id;
  INSERT INTO source.account_template_command_idempotency(account_id,actor_id,command_type,key_hash,request_digest,template_id,template_version_id) VALUES (p_account_id,p_actor_id,'create_template',p_key_hash,p_request_digest,t_id,v_id);
  PERFORM app.record_audit('account_reusable_template_created','completed','account_reusable_template',t_id::text,'preflight_required',gen_random_uuid()::text);
  RETURN QUERY SELECT t_id,v_id,'quarantined',false;
END
$$;

CREATE OR REPLACE FUNCTION source.create_account_template_preflight(p_account_id uuid,p_actor_id uuid,p_template_id uuid,p_version_id uuid,p_profile text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=source,app,pg_catalog AS $$
DECLARE v source.account_reusable_template_version%ROWTYPE; status_value text; limitations jsonb:='[]'::jsonb; report jsonb;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() THEN RAISE EXCEPTION 'account_template_scope_mismatch' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM source.account_reusable_template_version WHERE id=p_version_id AND template_id=p_template_id AND account_id=p_account_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'account_template_scope_mismatch' USING ERRCODE='42501'; END IF;
  status_value:=CASE WHEN (v.media_type LIKE '%spreadsheet%' AND p_profile='xlsx-v1') OR (v.media_type='application/pdf' AND p_profile='pdf-v1') OR (v.media_type LIKE '%presentation%' AND p_profile='pptx-v1') OR (v.media_type LIKE '%word%' AND p_profile='docx-v1') THEN 'eligible' ELSE 'incompatible' END;
  IF status_value='incompatible' THEN limitations:='["unsupported_template_compatibility_profile"]'::jsonb; END IF;
  report:=jsonb_build_object(
    'profile',p_profile,
    'media_type',v.media_type,
    'status',status_value,
    'limitations',limitations,
    'production_ready',false,
    'inventory',jsonb_build_object(
      'active_content','not_executed',
      'external_links','not_executed',
      'fonts','not_executed',
      'layout_masters','not_executed',
      'styles','not_executed',
      'comments_revisions','not_executed',
      'dimensions','not_executed',
      'mappings','not_executed',
      'unsupported_features','not_executed'
    ),
    'fallback',CASE WHEN status_value='eligible' THEN 'manual_review_required' ELSE 'blocked' END
  );
  INSERT INTO source.account_template_compatibility(account_id,template_id,version_id,compatibility_profile,status_code,report,limitations) VALUES (p_account_id,p_template_id,p_version_id,p_profile,status_value,report,limitations);
  UPDATE source.account_reusable_template SET status_code=CASE WHEN status_value='eligible' THEN 'eligible' ELSE 'blocked' END,row_version=row_version+1 WHERE id=p_template_id AND account_id=p_account_id;
  PERFORM app.record_audit('account_template_preflight_completed','completed','account_reusable_template_version',p_version_id::text,status_value,gen_random_uuid()::text);
  RETURN jsonb_build_object('id',gen_random_uuid(),'template_id',p_template_id,'version_id',p_version_id,'compatibility',jsonb_build_object('status',status_value,'profile',p_profile,'limitations',limitations),'production_ready',false);
END
$$;

CREATE OR REPLACE FUNCTION source.store_account_template_object(p_account_id uuid,p_actor_id uuid,p_version_id uuid,p_storage_key text,p_plaintext_sha256 text,p_ciphertext_sha256 text,p_byte_length bigint,p_media_type text,p_envelope_version text,p_kms_key_version text,p_wrapped_dek jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=source,object_store,app,pg_catalog AS $$
DECLARE object_id uuid:=gen_random_uuid();
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() THEN RAISE EXCEPTION 'account_template_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM source.account_reusable_template_version WHERE id=p_version_id AND account_id=p_account_id) THEN RAISE EXCEPTION 'account_template_scope_mismatch' USING ERRCODE='42501'; END IF;
  INSERT INTO object_store.protected_account_object(id,account_id,template_version_id,storage_key,plaintext_sha256,ciphertext_sha256,byte_length,media_type,envelope_version,kms_key_version,wrapped_dek) VALUES (object_id,p_account_id,p_version_id,p_storage_key,p_plaintext_sha256,p_ciphertext_sha256,p_byte_length,p_media_type,p_envelope_version,p_kms_key_version,p_wrapped_dek) ON CONFLICT (storage_key) DO NOTHING;
  SELECT id INTO object_id FROM object_store.protected_account_object WHERE storage_key=p_storage_key AND account_id=p_account_id;
  PERFORM app.record_audit('account_template_object_stored','completed','protected_account_object',object_id::text,'envelope_encrypted',gen_random_uuid()::text);
  RETURN object_id;
END
$$;

CREATE OR REPLACE FUNCTION source.get_account_reusable_template_projection(p_account_id uuid,p_actor_id uuid,p_template_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=source,app,pg_catalog AS $$
  SELECT jsonb_build_object('id',t.id,'account_id',t.account_id,'template_class',t.template_class,'status',t.status_code,'production_ready',false,'row_version',t.row_version,'current_version',jsonb_build_object('id',v.id,'version',v.version_ordinal,'version_label',v.version_label,'display_name',v.display_name,'media_type',v.media_type,'content_sha256',v.content_sha256,'byte_length',v.byte_length,'rights_attestation',v.rights_attestation,'clean_template_basis',v.clean_template_basis,'created_at',v.created_at),'compatibility',coalesce((SELECT jsonb_build_object('status',c.status_code,'profile',c.compatibility_profile,'report',c.report,'limitations',c.limitations,'assessed_at',c.assessed_at) FROM source.account_template_compatibility c WHERE c.version_id=v.id ORDER BY c.assessed_at DESC LIMIT 1),jsonb_build_object('status','pending','production_ready',false))) FROM source.account_reusable_template t JOIN source.account_reusable_template_version v ON v.id=t.current_version_id WHERE t.id=p_template_id AND t.account_id=p_account_id AND p_account_id=app.policy_account_id() AND p_actor_id=app.policy_actor_id();
$$;

CREATE OR REPLACE FUNCTION source.list_account_reusable_templates(p_account_id uuid,p_actor_id uuid)
RETURNS SETOF jsonb LANGUAGE sql SECURITY DEFINER SET search_path=source,app,pg_catalog AS $$
  SELECT jsonb_build_object('id',t.id,'account_id',t.account_id,'template_class',t.template_class,'status',t.status_code,'production_ready',false,'current_version_id',t.current_version_id,'row_version',t.row_version) FROM source.account_reusable_template t WHERE t.account_id=p_account_id AND p_account_id=app.policy_account_id() AND p_actor_id=app.policy_actor_id() ORDER BY t.created_at;
$$;

CREATE OR REPLACE FUNCTION source.select_account_template_for_deal(p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_template_version_id uuid,p_artifact_class text,p_mapping text,p_validation text,p_review text,p_key_hash text,p_request_digest text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=source,app,pg_catalog AS $$
DECLARE v source.account_reusable_template_version%ROWTYPE; t source.account_reusable_template%ROWTYPE; selection_id uuid:=gen_random_uuid(); compat text;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN RAISE EXCEPTION 'template_selection_scope_mismatch' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM source.account_reusable_template_version WHERE id=p_template_version_id AND account_id=p_account_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'template_selection_scope_mismatch' USING ERRCODE='42501'; END IF;
  SELECT * INTO t FROM source.account_reusable_template WHERE id=v.template_id AND account_id=p_account_id;
  SELECT c.status_code INTO compat FROM source.account_template_compatibility c WHERE c.version_id=v.id ORDER BY c.assessed_at DESC LIMIT 1;
  IF compat IS DISTINCT FROM 'eligible' OR nullif(btrim(coalesce(p_mapping,'')),'') IS NULL OR nullif(btrim(coalesce(p_validation,'')),'') IS NULL OR nullif(btrim(coalesce(p_review,'')),'') IS NULL THEN RAISE EXCEPTION 'template_not_production_ready' USING ERRCODE='42501'; END IF;
  INSERT INTO source.deal_template_selection(id,account_id,deal_id,template_id,template_version_id,artifact_class,exact_deal_mapping,validation_id,review_id) VALUES (selection_id,p_account_id,p_deal_id,t.id,v.id,p_artifact_class,p_mapping,p_validation,p_review);
  INSERT INTO source.account_template_command_idempotency(account_id,actor_id,command_type,key_hash,request_digest,template_id,template_version_id) VALUES (p_account_id,p_actor_id,'select_template',p_key_hash,p_request_digest,t.id,v.id) ON CONFLICT DO NOTHING;
  PERFORM app.record_audit('account_template_selected_for_deal','completed','deal_template_selection',selection_id::text,'exact_mapping_validation_review',gen_random_uuid()::text);
  RETURN jsonb_build_object('id',selection_id,'deal_id',p_deal_id,'template_id',t.id,'template_version_id',v.id,'artifact_class',p_artifact_class,'status','selected','production_ready',false);
END
$$;

CREATE OR REPLACE FUNCTION source.create_web_evidence_observation(p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=source,object_store,app,pg_catalog AS $$
DECLARE observation_id uuid:=coalesce(NULLIF(p_payload->>'source_record_id','')::uuid,gen_random_uuid()); material_id uuid; previous_id uuid; ordinal integer; impact_id uuid:=gen_random_uuid(); rights jsonb:=p_payload->'rights_posture'; limitations jsonb:=coalesce(p_payload->'retrieval_limitations','[]'::jsonb); capture text:=p_payload->>'capture_mode'; final_capture text; stale timestamptz; source_name text:=left('Public Web · '||coalesce(p_payload->>'canonical_url','public resource'),240); rec_date date:=coalesce((p_payload->>'as_of_time')::date,current_date); fake_session uuid:=gen_random_uuid(); fake_upload uuid:=gen_random_uuid(); digest text:=p_payload->>'content_sha256'; bytes bigint:=greatest(coalesce((p_payload->>'byte_length')::bigint,1),1); protected jsonb:=p_payload->'protected_object'; protected_id uuid:=coalesce(NULLIF(protected->>'id','')::uuid,observation_id); coverage_id uuid:=gen_random_uuid(); representation_id uuid:=gen_random_uuid();
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN RAISE EXCEPTION 'web_observation_scope_mismatch' USING ERRCODE='42501'; END IF;
  SELECT id INTO material_id FROM source.source_material WHERE account_id=p_account_id AND deal_id=p_deal_id AND stable_name=source_name ORDER BY created_at LIMIT 1;
  IF material_id IS NULL THEN INSERT INTO source.source_material(account_id,deal_id,stable_name,origin_code) VALUES (p_account_id,p_deal_id,source_name,'public_observation') RETURNING id INTO material_id; END IF;
  SELECT max(observation_ordinal) + 1 INTO ordinal FROM source.web_evidence_observation WHERE source_material_id=material_id;
  ordinal:=coalesce(ordinal,1);
  SELECT source_record_id INTO previous_id FROM source.web_evidence_observation WHERE source_material_id=material_id ORDER BY observation_ordinal DESC LIMIT 1;
  IF capture <> 'snapshot' THEN final_capture:='citation_only'; ELSE final_capture:=coalesce(p_payload->>'effective_capture_mode','citation_only'); END IF;
  stale:=NULLIF(p_payload->>'stale_after','')::timestamptz;
  INSERT INTO source.upload_session(id,account_id,deal_id,actor_id,purpose_code,batch_id,consent_digest,max_files,max_total_bytes,expires_at) VALUES (fake_session,p_account_id,p_deal_id,p_actor_id,'source_intake',gen_random_uuid(),'public-web-observation',1,bytes,clock_timestamp()+interval '1 minute');
  INSERT INTO source.quarantined_upload(id,account_id,deal_id,actor_id,upload_session_id,client_file_id,display_name,quarantine_storage_key,declared_media_type,declared_byte_length,observed_byte_length,transport_sha256,source_declaration,rights_posture_inputs,confidentiality_posture,processing_posture,scan_result,status_code,received_at,expires_at) VALUES (fake_upload,p_account_id,p_deal_id,p_actor_id,fake_session,'web-observation',source_name,'quarantine/observation/'||observation_id::text||'.bin',coalesce(p_payload->>'media_type','text/html'),bytes,bytes,digest,jsonb_build_object('origin','public_https_capture','url',p_payload->>'canonical_url'),rights,jsonb_build_object('confidentiality_class','public','de_identification_posture','not_applicable'),jsonb_build_object('expected_file_family','web'),jsonb_build_object('clean',true), 'accepted',clock_timestamp(),clock_timestamp()+interval '1 minute');
  INSERT INTO source.source_record(id,account_id,deal_id,source_material_id,version_ordinal,version_label,origin_code,acquisition_method,authority_basis,provenance_class,confidentiality_class,de_identification_posture,rights_posture,rights_basis,content_sha256,byte_length,media_type,record_date,received_at,accepted_at,native_locator_profile_code,native_locator_profile_version,provenance_receipt,limitations,supersedes_id,accepted_upload_id) VALUES (observation_id,p_account_id,p_deal_id,material_id,ordinal,coalesce(p_payload->>'version_label','observation-'||ordinal::text),'public_observation','public_https_capture',coalesce(rights->>'basis','publisher_terms'), 'real','public','not_applicable',coalesce(rights->>'reliance_posture','reliance_limited'),rights,digest,bytes,coalesce(p_payload->>'media_type','text/html'),rec_date,coalesce((p_payload->>'retrieved_at')::timestamptz,clock_timestamp()),clock_timestamp(),'web-observation-v1','v1',jsonb_build_object('requested_url',p_payload->>'requested_url','canonical_url',p_payload->>'canonical_url','retrieved_at',p_payload->>'retrieved_at','as_of_time',p_payload->>'as_of_time'),limitations,previous_id,fake_upload);
  IF protected ? 'storage_key' THEN
    INSERT INTO object_store.protected_object(id,account_id,deal_id,storage_key,plaintext_sha256,ciphertext_sha256,byte_length,media_type,envelope_version,kms_key_version,wrapped_dek) VALUES (protected_id,p_account_id,p_deal_id,protected->>'storage_key',protected->>'plaintext_sha256',protected->>'ciphertext_sha256',(protected->>'byte_length')::bigint,coalesce(p_payload->>'media_type','text/html'),protected->>'envelope_version',protected->>'kms_key_version',protected->'wrapped_dek');
    INSERT INTO source.processing_coverage(id,account_id,deal_id,source_record_id,coverage_code,parser_identity,coverage_payload) VALUES (coverage_id,p_account_id,p_deal_id,observation_id,'original_bytes_only','ticket07-public-web-v1',jsonb_build_object('original_bytes',true,'substantive_parsing',false,'ai',false,'rendering',false,'limitations',limitations));
    INSERT INTO source.source_representation(id,account_id,deal_id,source_record_id,protected_object_id,content_sha256,parser_identity,processing_coverage_id) VALUES (representation_id,p_account_id,p_deal_id,observation_id,protected_id,digest,'ticket07-public-web-v1',coverage_id);
    INSERT INTO source.accepted_source_object(account_id,deal_id,source_record_id,protected_object_id) VALUES (p_account_id,p_deal_id,observation_id,protected_id);
  END IF;
  INSERT INTO source.web_evidence_observation(source_record_id,account_id,deal_id,source_material_id,observation_ordinal,requested_url,canonical_url,document_identity,retrieved_at,as_of_time,version_label,capture_mode,response_metadata,permitted_representation,content_sha256,byte_length,exact_locator,rights_posture,retrieval_limitations,reliance_state,stale_after,supersedes_id) VALUES (observation_id,p_account_id,p_deal_id,material_id,ordinal,p_payload->>'requested_url',p_payload->>'canonical_url',p_payload->'document_identity',(p_payload->>'retrieved_at')::timestamptz,(p_payload->>'as_of_time')::timestamptz,p_payload->>'version_label',final_capture,p_payload->'response_metadata',p_payload->'permitted_representation',digest,bytes,p_payload->'exact_locator',rights,limitations,coalesce(rights->>'reliance_state','reliance_limited'),stale,previous_id);
  INSERT INTO source.web_observation_impact(id,account_id,deal_id,observation_id,previous_observation_id,impact_code,affected_scope) VALUES (impact_id,p_account_id,p_deal_id,observation_id,previous_id,CASE WHEN previous_id IS NULL THEN 'new_observation' WHEN rights IS DISTINCT FROM (SELECT rights_posture FROM source.web_evidence_observation WHERE source_record_id=previous_id) THEN 'rights_changed' ELSE 'material_change' END,jsonb_build_object('previous_observation_id',previous_id,'reliance_revalidation_required',final_capture='citation_only'));
  PERFORM app.record_audit('public_web_observation_created','completed','web_evidence_observation',observation_id::text,CASE WHEN final_capture='citation_only' THEN 'citation_only_rights_limited' ELSE 'snapshot_digest_recorded' END,gen_random_uuid()::text);
  RETURN jsonb_build_object('observation',jsonb_build_object('source_record_id',observation_id,'source_material_id',material_id,'requested_url',p_payload->>'requested_url','canonical_url',p_payload->>'canonical_url','document_identity',p_payload->'document_identity','retrieved_at',p_payload->>'retrieved_at','as_of_time',p_payload->>'as_of_time','version',ordinal,'version_label',p_payload->>'version_label','capture_mode',final_capture,'response_metadata',p_payload->'response_metadata','permitted_representation',p_payload->'permitted_representation','content_sha256',digest,'byte_length',bytes,'exact_locator',p_payload->'exact_locator','rights',rights,'retrieval_limitations',limitations,'reliance_state',coalesce(rights->>'reliance_state','reliance_limited'),'stale_after',stale,'supersedes_id',previous_id),'impact_assessment',jsonb_build_object('id',impact_id,'previous_observation_id',previous_id,'code',CASE WHEN previous_id IS NULL THEN 'new_observation' ELSE 'material_change' END,'reliance_revalidation_required',final_capture='citation_only'));
END
$$;

CREATE OR REPLACE FUNCTION source.get_web_evidence_observation(p_account_id uuid,p_actor_id uuid,p_deal_id uuid,p_source_record_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=source,app,pg_catalog AS $$
  SELECT jsonb_build_object('source_record_id',w.source_record_id,'source_material_id',w.source_material_id,'deal_id',w.deal_id,'requested_url',w.requested_url,'canonical_url',w.canonical_url,'document_identity',w.document_identity,'retrieved_at',w.retrieved_at,'as_of_time',w.as_of_time,'version',w.observation_ordinal,'version_label',w.version_label,'capture_mode',w.capture_mode,'response_metadata',w.response_metadata,'permitted_representation',w.permitted_representation,'content_sha256',w.content_sha256,'byte_length',w.byte_length,'exact_locator',w.exact_locator,'rights',w.rights_posture,'retrieval_limitations',w.retrieval_limitations || CASE WHEN w.stale_after IS NOT NULL AND w.stale_after<=clock_timestamp() THEN '["stale_observation"]'::jsonb ELSE '[]'::jsonb END,'reliance_state',CASE WHEN w.stale_after IS NOT NULL AND w.stale_after<=clock_timestamp() THEN 'blocked' ELSE w.reliance_state END,'stale_after',w.stale_after,'supersedes_id',w.supersedes_id) FROM source.web_evidence_observation w WHERE w.source_record_id=p_source_record_id AND w.account_id=p_account_id AND w.deal_id=p_deal_id AND p_account_id=app.policy_account_id() AND p_actor_id=app.policy_actor_id() AND p_deal_id=app.policy_deal_id();
$$;

CREATE OR REPLACE FUNCTION source.list_web_evidence_observations(p_account_id uuid,p_actor_id uuid,p_deal_id uuid)
RETURNS SETOF jsonb LANGUAGE sql SECURITY DEFINER SET search_path=source,app,pg_catalog AS $$
  SELECT source.get_web_evidence_observation(p_account_id,p_actor_id,p_deal_id,w.source_record_id) FROM source.web_evidence_observation w WHERE w.account_id=p_account_id AND w.deal_id=p_deal_id AND p_account_id=app.policy_account_id() AND p_actor_id=app.policy_actor_id() AND p_deal_id=app.policy_deal_id() ORDER BY w.created_at;
$$;

REVOKE ALL ON FUNCTION source.create_account_operation_preview(uuid,uuid,text,text,text),source.create_account_template_upload_session(uuid,uuid,uuid,text,uuid,jsonb),source.get_account_template_upload_target(uuid,uuid,uuid,uuid),source.append_account_template_upload_chunk(uuid,uuid,uuid,uuid,bigint,bigint),source.mark_account_template_upload_finalized(uuid,uuid,uuid,uuid,bigint,text,text,jsonb),source.get_account_template_upload_projection(uuid,uuid,uuid),source.create_account_reusable_template(uuid,uuid,uuid,text,jsonb,text,text,text),source.create_account_template_preflight(uuid,uuid,uuid,uuid,text),source.store_account_template_object(uuid,uuid,uuid,text,text,text,bigint,text,text,text,jsonb),source.get_account_reusable_template_projection(uuid,uuid,uuid),source.list_account_reusable_templates(uuid,uuid),source.select_account_template_for_deal(uuid,uuid,uuid,uuid,text,text,text,text,text,text),source.create_web_evidence_observation(uuid,uuid,uuid,jsonb),source.get_web_evidence_observation(uuid,uuid,uuid,uuid),source.list_web_evidence_observations(uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION source.create_account_operation_preview(uuid,uuid,text,text,text),source.create_account_template_upload_session(uuid,uuid,uuid,text,uuid,jsonb),source.get_account_template_upload_target(uuid,uuid,uuid,uuid),source.append_account_template_upload_chunk(uuid,uuid,uuid,uuid,bigint,bigint),source.mark_account_template_upload_finalized(uuid,uuid,uuid,uuid,bigint,text,text,jsonb),source.get_account_template_upload_projection(uuid,uuid,uuid),source.create_account_reusable_template(uuid,uuid,uuid,text,jsonb,text,text,text),source.create_account_template_preflight(uuid,uuid,uuid,uuid,text),source.store_account_template_object(uuid,uuid,uuid,text,text,text,bigint,text,text,text,jsonb),source.get_account_reusable_template_projection(uuid,uuid,uuid),source.list_account_reusable_templates(uuid,uuid),source.select_account_template_for_deal(uuid,uuid,uuid,uuid,text,text,text,text,text,text),source.create_web_evidence_observation(uuid,uuid,uuid,jsonb),source.get_web_evidence_observation(uuid,uuid,uuid,uuid),source.list_web_evidence_observations(uuid,uuid,uuid) TO app_runtime;

ALTER FUNCTION source.create_account_operation_preview(uuid,uuid,text,text,text) OWNER TO app_source_owner;
ALTER FUNCTION source.create_account_template_upload_session(uuid,uuid,uuid,text,uuid,jsonb) OWNER TO app_source_owner;
ALTER FUNCTION source.get_account_template_upload_target(uuid,uuid,uuid,uuid) OWNER TO app_source_owner;
ALTER FUNCTION source.append_account_template_upload_chunk(uuid,uuid,uuid,uuid,bigint,bigint) OWNER TO app_source_owner;
ALTER FUNCTION source.mark_account_template_upload_finalized(uuid,uuid,uuid,uuid,bigint,text,text,jsonb) OWNER TO app_source_owner;
ALTER FUNCTION source.get_account_template_upload_projection(uuid,uuid,uuid) OWNER TO app_source_owner;
ALTER FUNCTION source.create_account_reusable_template(uuid,uuid,uuid,text,jsonb,text,text,text) OWNER TO app_source_owner;
ALTER FUNCTION source.create_account_template_preflight(uuid,uuid,uuid,uuid,text) OWNER TO app_source_owner;
ALTER FUNCTION source.store_account_template_object(uuid,uuid,uuid,text,text,text,bigint,text,text,text,jsonb) OWNER TO app_source_owner;
ALTER FUNCTION source.get_account_reusable_template_projection(uuid,uuid,uuid) OWNER TO app_source_owner;
ALTER FUNCTION source.list_account_reusable_templates(uuid,uuid) OWNER TO app_source_owner;
ALTER FUNCTION source.select_account_template_for_deal(uuid,uuid,uuid,uuid,text,text,text,text,text,text) OWNER TO app_source_owner;
ALTER FUNCTION source.create_web_evidence_observation(uuid,uuid,uuid,jsonb) OWNER TO app_source_owner;
ALTER FUNCTION source.get_web_evidence_observation(uuid,uuid,uuid,uuid) OWNER TO app_source_owner;
ALTER FUNCTION source.list_web_evidence_observations(uuid,uuid,uuid) OWNER TO app_source_owner;
REVOKE CREATE ON SCHEMA source, object_store FROM app_source_owner;

CREATE OR REPLACE FUNCTION source.prevent_web_observation_mutation() RETURNS trigger LANGUAGE plpgsql SET search_path=source,pg_catalog AS $$ BEGIN RAISE EXCEPTION 'web_observation_immutable' USING ERRCODE='23514'; END $$;
DROP TRIGGER IF EXISTS web_observation_immutable ON source.web_evidence_observation;
CREATE TRIGGER web_observation_immutable BEFORE UPDATE OR DELETE ON source.web_evidence_observation FOR EACH ROW EXECUTE FUNCTION source.prevent_web_observation_mutation();
CREATE OR REPLACE FUNCTION source.prevent_account_template_version_mutation() RETURNS trigger LANGUAGE plpgsql SET search_path=source,pg_catalog AS $$ BEGIN RAISE EXCEPTION 'account_template_version_immutable' USING ERRCODE='23514'; END $$;
DROP TRIGGER IF EXISTS account_template_version_immutable ON source.account_reusable_template_version;
CREATE TRIGGER account_template_version_immutable BEFORE UPDATE OR DELETE ON source.account_reusable_template_version FOR EACH ROW EXECUTE FUNCTION source.prevent_account_template_version_mutation();

DROP POLICY IF EXISTS audit_scope ON app.audit_event;
CREATE POLICY audit_scope ON app.audit_event FOR SELECT TO app_runtime USING (account_id=app.policy_account_id() AND (deal_id=app.policy_deal_id() OR (deal_id IS NULL AND app.policy_deal_id() IS NULL)));

GRANT EXECUTE ON FUNCTION app.policy_account_id(),app.policy_actor_id(),app.policy_deal_id(),app.record_audit(text,text,text,text,text,text) TO app_source_owner;
GRANT SELECT ON app.account,app.actor,app.deal,app.audit_event TO app_source_owner;
