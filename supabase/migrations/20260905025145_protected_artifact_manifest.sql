-- The signed envelope is a protected object; it is not a self-referencing member of its manifest.
ALTER TABLE deliverable.artifact_manifest ADD COLUMN protected_object_id uuid NOT NULL;
ALTER TABLE deliverable.artifact_manifest ADD FOREIGN KEY(account_id,protected_object_id) REFERENCES object_store.protected_object(account_id,id);
CREATE OR REPLACE FUNCTION deliverable.complete_workbook_step(p_job uuid,p_token text,p_files jsonb,p_report jsonb,p_checks jsonb,p_manifest jsonb,p_failure text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE scope jsonb; row deliverable.workbook_job%ROWTYPE; file jsonb; calc jsonb; measure jsonb; native uuid; artifact_id uuid; region uuid; manifest uuid;
 qc uuid:=gen_random_uuid(); check_row jsonb; revision deliverable.deliverable_revision%ROWTYPE;
BEGIN
 scope:=deliverable.begin_workbook_step(p_job,p_token);
 SELECT * INTO row FROM deliverable.workbook_job WHERE job_id=p_job;
 SELECT * INTO revision FROM deliverable.deliverable_revision WHERE id=row.revision_id;
 IF p_failure IS NOT NULL THEN
  UPDATE jobs.job SET state='failed_terminal',problem=jsonb_build_object('code',p_failure,'recovery_action','inspect_configuration_and_create_revision'),progress=jsonb_build_object('message_code',p_failure),terminal_at=now(),allowance_posture='released',row_version=row_version+1 WHERE id=p_job;
 ELSE
  IF jsonb_array_length(p_files) NOT BETWEEN 2 AND 100 OR p_report->>'revision_id'<>row.revision_id::text THEN RAISE EXCEPTION 'artifact_worker_output_invalid'; END IF;
  FOR file IN SELECT value FROM jsonb_array_elements(p_files) LOOP
   INSERT INTO object_store.protected_object(id,account_id,deal_id,scope_code,storage_key,plaintext_sha256,ciphertext_sha256,byte_length,media_type,envelope_version,kms_key_version,wrapped_dek,lifecycle_status)
   VALUES((file->>'object_id')::uuid,row.account_id,row.deal_id,'deal',file->>'storage_key',file->>'sha256',file->>'ciphertext_sha256',(file->>'byte_length')::bigint,file->>'media_type',file->>'envelope_version',file->>'kms_key_version',file->'wrapped_dek','active');
   INSERT INTO deliverable.artifact(id,account_id,deal_id,revision_id,protected_object_id,role,path_label,media_type,plaintext_sha256,byte_length,engine_version,template_version)
   VALUES((file->>'id')::uuid,row.account_id,row.deal_id,row.revision_id,(file->>'object_id')::uuid,file->>'role',file->>'path',file->>'media_type',file->>'sha256',(file->>'byte_length')::bigint,p_report->>'engine_version',revision.template_version);
   IF file->>'role'='native' THEN native:=(file->>'id')::uuid; END IF;
  END LOOP;
  IF native IS NULL OR NOT EXISTS(SELECT 1 FROM deliverable.artifact WHERE revision_id=row.revision_id AND role='reader') THEN RAISE EXCEPTION 'native_reader_pair_required'; END IF;
  FOR calc IN SELECT value FROM jsonb_array_elements(row.input->'calculations') LOOP
   FOR measure IN SELECT value FROM jsonb_array_elements(calc->'measures') LOOP
    -- Region positions come from the bounded renderer; their typed authority comes only from accepted build inputs.
    FOR file IN SELECT value FROM jsonb_array_elements(p_report->'lineage') WHERE value->>'run_id'=calc->>'run_id' AND value->>'key'=measure->>'key' LOOP
     FOREACH artifact_id IN ARRAY ARRAY[native,(SELECT id FROM deliverable.artifact WHERE revision_id=row.revision_id AND role='reader' LIMIT 1)] LOOP
      INSERT INTO deliverable.artifact_region(account_id,deal_id,artifact_id,region_key,ownership_class,native_locator,content_digest)
      VALUES(row.account_id,row.deal_id,artifact_id,concat(calc->>'run_id',':',measure->>'key'),'system',jsonb_build_object('sheet',file->>'native_sheet','range',file->>'native_range','output_sheet',file->>'output_sheet','output_range',file->>'output_range','reader_pages',file->'reader_pages'),encode(extensions.digest(measure::text,'sha256'),'hex')) RETURNING id INTO region;
      INSERT INTO deliverable.artifact_region_lineage(account_id,deal_id,region_id,calculation_run_id,model_version_id,scenario_version_id,fact_id,assumption_id,decision_id,source_record_id,representation_id,source_locator)
      VALUES(row.account_id,row.deal_id,region,(calc->>'run_id')::uuid,(calc->>'model_version_id')::uuid,(calc->>'scenario_version_id')::uuid,(measure->>'fact_id')::uuid,(measure->>'assumption_id')::uuid,(measure->>'decision_id')::uuid,(measure->>'source_record_id')::uuid,(measure->>'representation_id')::uuid,measure->'locator');
     END LOOP;
    END LOOP;
   END LOOP;
  END LOOP;
  INSERT INTO deliverable.artifact_region(account_id,deal_id,artifact_id,region_key,ownership_class,native_locator,content_digest) VALUES(row.account_id,row.deal_id,native,'banker_notes','banker','{"sheet":"Banker Notes","range":"B8:H11"}',encode(extensions.digest('Banker-owned notes','sha256'),'hex'));
  IF p_manifest IS NOT NULL THEN
   file:=p_manifest->'storage';
   IF p_manifest->>'canonical_sha256'<>encode(extensions.digest(p_manifest->>'canonical_payload','sha256'),'hex') OR file IS NULL THEN RAISE EXCEPTION 'manifest_canonical_integrity_failed';END IF;
   INSERT INTO object_store.protected_object(id,account_id,deal_id,scope_code,storage_key,plaintext_sha256,ciphertext_sha256,byte_length,media_type,envelope_version,kms_key_version,wrapped_dek,lifecycle_status)
   VALUES((file->>'object_id')::uuid,row.account_id,row.deal_id,'deal',file->>'storage_key',file->>'sha256',file->>'ciphertext_sha256',(file->>'byte_length')::bigint,'application/json',file->>'envelope_version',file->>'kms_key_version',file->'wrapped_dek','active');
   IF p_manifest->>'revision_id'<>row.revision_id::text THEN RAISE EXCEPTION 'manifest_revision_mismatch'; END IF;
   INSERT INTO deliverable.integrity_key(key_version,algorithm,public_key_pem) VALUES(p_manifest->>'key_version','EC_SIGN_ED25519',p_manifest->>'public_key_pem') ON CONFLICT DO NOTHING;
   IF NOT EXISTS(SELECT 1 FROM deliverable.integrity_key WHERE key_version=p_manifest->>'key_version' AND public_key_pem=p_manifest->>'public_key_pem') THEN RAISE EXCEPTION 'manifest_key_mismatch'; END IF;
   INSERT INTO deliverable.artifact_manifest(account_id,deal_id,revision_id,canonical_payload,canonical_sha256,signature,key_version,protected_object_id) VALUES(row.account_id,row.deal_id,row.revision_id,p_manifest->>'canonical_payload',p_manifest->>'canonical_sha256',p_manifest->>'signature',p_manifest->>'key_version',(file->>'object_id')::uuid) RETURNING id INTO manifest;
   INSERT INTO deliverable.artifact_manifest_member SELECT row.account_id,row.deal_id,manifest,id,plaintext_sha256 FROM deliverable.artifact WHERE revision_id=row.revision_id;
  END IF;
  INSERT INTO deliverable.qc_run(id,account_id,deal_id,revision_id,job_id,ruleset,checks,report,input_digest) VALUES(qc,row.account_id,row.deal_id,row.revision_id,p_job,'analysis-workbook-qc-1.0.0',p_checks,p_report,revision.basis_digest);
  FOR check_row IN SELECT value FROM jsonb_array_elements(p_checks) WHERE value->>'outcome'='failed' LOOP
   INSERT INTO deliverable.qc_finding(account_id,deal_id,revision_id,qc_run_id,finding_code,severity,detail,locator,consequence) VALUES(row.account_id,row.deal_id,row.revision_id,qc,check_row->>'code','critical',coalesce(check_row->>'detail','Exact artifact acceptance failed'),coalesce(check_row->'locator','{}'),'Blocks circulation of this exact Revision');
  END LOOP;
  UPDATE jobs.job SET state='completed',progress='{"message_code":"artifacts_and_qc_recorded"}',result=jsonb_build_object('resource',jsonb_build_object('type','deliverable_revision','id',row.revision_id),'qc_run_id',qc),problem=NULL,allowance_posture='committed',terminal_at=now(),row_version=row_version+1 WHERE id=p_job;
 END IF;
 UPDATE deliverable.workbook_job SET finished=true WHERE job_id=p_job;
 PERFORM deliverable.clear_workbook_step();
 RETURN jsonb_build_object('revision_id',row.revision_id,'qc_run_id',qc,'state',CASE WHEN p_failure IS NULL THEN 'completed' ELSE 'failed_terminal' END);
END $$;
