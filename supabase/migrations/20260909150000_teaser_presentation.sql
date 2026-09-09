-- Stage-triggered Teaser: strict proposal input, editable Native PPTX and exact Reader PDF.
DO $$ DECLARE c text; BEGIN
  ALTER TABLE deliverable.deliverable DROP CONSTRAINT IF EXISTS deliverable_type_check;
  SELECT conname INTO c FROM pg_constraint WHERE conrelid='deliverable.deliverable'::regclass AND pg_get_constraintdef(oid) LIKE '%deliverable_type%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE deliverable.deliverable DROP CONSTRAINT %I', c); END IF;
  -- Keep the out-of-order migration safe when a remote already has CIM rows
  -- from the later 20260909170000 migration.
  ALTER TABLE deliverable.deliverable ADD CONSTRAINT deliverable_type_check CHECK (deliverable_type IN ('analysis_valuation_workbook','auction_control_workbook','teaser_presentation','cim_presentation'));
  ALTER TABLE deliverable.deliverable_revision DROP CONSTRAINT IF EXISTS deliverable_template_version_check;
  SELECT conname INTO c FROM pg_constraint WHERE conrelid='deliverable.deliverable_revision'::regclass AND pg_get_constraintdef(oid) LIKE '%template_version%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE deliverable.deliverable_revision DROP CONSTRAINT %I', c); END IF;
  ALTER TABLE deliverable.deliverable_revision ADD CONSTRAINT deliverable_template_version_check CHECK (template_version IN ('analysis-valuation-1.0.0','auction-control-1.0.0','teaser-1.0.0','cim-1.0.0'));
  SELECT conname INTO c FROM pg_constraint WHERE conrelid='jobs.job'::regclass AND pg_get_constraintdef(oid) LIKE '%command_type%'; IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE jobs.job DROP CONSTRAINT %I',c); END IF;
  SELECT conname INTO c FROM pg_constraint WHERE conrelid='jobs.job'::regclass AND pg_get_constraintdef(oid) LIKE '%purpose_code%'; IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE jobs.job DROP CONSTRAINT %I',c); END IF;
  SELECT conname INTO c FROM pg_constraint WHERE conrelid='jobs.job'::regclass AND pg_get_constraintdef(oid) LIKE '%allowance_class%'; IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE jobs.job DROP CONSTRAINT %I',c); END IF;
  ALTER TABLE jobs.job ADD CONSTRAINT job_command_type_check CHECK(command_type IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','auction_control_workbook_build','teaser_presentation_build','cim_presentation_build','internal_controlled_export','workbook_ai_review')),
    ADD CONSTRAINT job_purpose_code_check CHECK(purpose_code IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','auction_control_workbook_build','teaser_presentation_build','cim_presentation_build','internal_controlled_export','workbook_ai_review')),
    ADD CONSTRAINT job_allowance_class_check CHECK(allowance_class IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','auction_control_workbook_build','teaser_presentation_build','cim_presentation_build','internal_controlled_export','workbook_ai_review'));
  SELECT conname INTO c FROM pg_constraint WHERE conrelid='deliverable.qc_run'::regclass AND pg_get_constraintdef(oid) LIKE '%ruleset%'; IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE deliverable.qc_run DROP CONSTRAINT %I',c); END IF;
  ALTER TABLE deliverable.qc_run ADD CONSTRAINT qc_run_ruleset_check CHECK(ruleset IN ('analysis-workbook-qc-1.0.0','teaser-presentation-qc-1.0.0','cim-presentation-qc-1.0.0'));
END $$;
DROP POLICY IF EXISTS artifact_job_owner ON jobs.job;
CREATE POLICY artifact_job_owner ON jobs.job TO app_deliverable_owner USING(command_type IN ('analysis_workbook_build','analysis_workbook_qc','auction_control_workbook_build','teaser_presentation_build','workbook_ai_review') AND account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal()) WITH CHECK(command_type IN ('analysis_workbook_build','analysis_workbook_qc','auction_control_workbook_build','teaser_presentation_build','workbook_ai_review') AND account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal());
ALTER TABLE jobs.job_step DROP CONSTRAINT job_step_operation_class_check;
ALTER TABLE jobs.job_step ADD CONSTRAINT job_step_operation_class_check CHECK(operation_class IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','ai_source_proposal','internal_controlled_export','auction_control_workbook_build','teaser_presentation_build','cim_presentation_build'));
ALTER TABLE jobs.job_scope DROP CONSTRAINT job_scope_operation_code_check;
ALTER TABLE jobs.job_scope ADD CONSTRAINT job_scope_operation_code_check CHECK(operation_code IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','ai_source_proposal','internal_controlled_export','auction_control_workbook_build','teaser_presentation_build','cim_presentation_build'));
ALTER TABLE jobs.job_scope_operation DROP CONSTRAINT job_scope_operation_operation_code_check;
ALTER TABLE jobs.job_scope_operation ADD CONSTRAINT job_scope_operation_operation_code_check CHECK(operation_code IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','ai_source_proposal','internal_controlled_export','auction_control_workbook_build','teaser_presentation_build','cim_presentation_build'));

CREATE TABLE IF NOT EXISTS deliverable.teaser_lineage (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL, deal_id uuid NOT NULL, revision_id uuid NOT NULL,
 section_key text NOT NULL, claim_key text NOT NULL, citation_refs jsonb NOT NULL, source_refs jsonb NOT NULL,
 native_locator jsonb NOT NULL, reader_locator jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(account_id,deal_id,revision_id,section_key,claim_key), FOREIGN KEY(account_id,deal_id,revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id)
);
ALTER TABLE deliverable.teaser_lineage ENABLE ROW LEVEL SECURITY; ALTER TABLE deliverable.teaser_lineage FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS teaser_lineage_read_scope ON deliverable.teaser_lineage; DROP POLICY IF EXISTS teaser_lineage_owner ON deliverable.teaser_lineage;
CREATE POLICY teaser_lineage_read_scope ON deliverable.teaser_lineage FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY teaser_lineage_owner ON deliverable.teaser_lineage TO app_deliverable_owner USING(account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal()) WITH CHECK(account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal());
GRANT SELECT ON deliverable.teaser_lineage TO app_runtime; GRANT SELECT,INSERT ON deliverable.teaser_lineage TO app_deliverable_owner;

CREATE OR REPLACE FUNCTION deliverable.create_teaser_deliverable(p_key text,p_digest text,p_body jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE replay jsonb; row deliverable.deliverable%ROWTYPE; stage text:=CASE WHEN coalesce((p_body->>'stage_required')::boolean,true) THEN 'current_stage_required' ELSE 'not_stage_required' END;
BEGIN
 PERFORM deliverable.assert_write(); replay:=deliverable.replay('create_teaser_deliverable',p_key,p_digest); IF replay IS NOT NULL THEN RETURN replay; END IF;
 INSERT INTO deliverable.deliverable(account_id,deal_id,deliverable_type,title,purpose,audience,confidentiality,stage_applicability,owner_id) VALUES(app.policy_account_id(),app.policy_deal_id(),'teaser_presentation',p_body->>'title',p_body->>'purpose',p_body->>'audience',p_body->>'confidentiality',stage,app.policy_actor_id()) RETURNING * INTO row;
 PERFORM app.record_audit('deliverable_created','completed','deliverable',row.id::text,'teaser_presentation',gen_random_uuid()::text);
 RETURN deliverable.remember('create_teaser_deliverable',p_key,p_digest,to_jsonb(row));
END $$;

CREATE OR REPLACE FUNCTION deliverable.build_teaser_input(p_deliverable uuid,p_revision uuid,p_draft jsonb,p_limitations jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=deliverable,app,pg_catalog AS $$
DECLARE parent deliverable.deliverable%ROWTYPE; section jsonb; sections jsonb:=p_draft->'sections';
BEGIN
 SELECT * INTO parent FROM deliverable.deliverable WHERE id=p_deliverable AND deliverable_type='teaser_presentation'; IF NOT FOUND THEN RAISE EXCEPTION 'artifact_scope_unavailable'; END IF;
 IF jsonb_typeof(p_draft)<>'object' OR p_draft->>'task_definition'<>'teaser_content_draft' OR p_draft->>'status'<>'proposal_only' OR jsonb_typeof(sections)<>'array' OR jsonb_array_length(sections) NOT BETWEEN 1 AND 12 THEN RAISE EXCEPTION 'teaser_content_contract_invalid'; END IF;
 FOR section IN SELECT value FROM jsonb_array_elements(sections) LOOP
  IF jsonb_typeof(section)<>'object' OR section->>'section_key' IS NULL OR section->>'title' IS NULL OR section->>'body' IS NULL OR jsonb_typeof(section->'citations')<>'array' OR jsonb_array_length(section->'citations')<1 THEN RAISE EXCEPTION 'teaser_citation_required'; END IF;
 END LOOP;
 RETURN jsonb_build_object('schema_version','1.0.0','task_definition','teaser_content_draft','status','proposal_only','revision_id',p_revision,'deliverable_id',parent.id,'deal_id',parent.deal_id,'template_version','teaser-1.0.0','purpose',parent.purpose,'audience',parent.audience,'confidentiality',parent.confidentiality,'evaluation_time',to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'limitations',coalesce(p_limitations,'[]'::jsonb),'approved_disclosure_set',coalesce(p_draft->'approved_disclosure_set','[]'::jsonb),'output_ceiling',coalesce(p_draft->'output_ceiling',jsonb_build_object('max_slides',12)),'content_draft',p_draft);
END $$;

CREATE OR REPLACE FUNCTION deliverable.create_teaser_revision(p_parent uuid,p_expected_version bigint,p_key text,p_digest text,p_draft jsonb,p_limitations jsonb,p_release text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE parent deliverable.deliverable%ROWTYPE; revision uuid:=gen_random_uuid(); job uuid:=gen_random_uuid(); input jsonb; ordinal integer; workspace record;
BEGIN
 PERFORM deliverable.assert_write(); PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws(':',app.policy_account_id(),app.policy_deal_id(),p_parent,'teaser_revision'),0));
 SELECT * INTO parent FROM deliverable.deliverable WHERE id=p_parent AND deliverable_type='teaser_presentation' FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'artifact_scope_unavailable'; END IF;
 IF parent.row_version<>p_expected_version THEN RAISE EXCEPTION 'artifact_version_conflict'; END IF;
 IF parent.stage_applicability='not_stage_required' THEN RETURN jsonb_build_object('state','not_stage_required','deliverable_id',parent.id,'row_version',parent.row_version,'idempotent_replayed',false); END IF;
 IF deliverable.replay('create_teaser_revision',p_key,p_digest) IS NOT NULL THEN RETURN deliverable.replay('create_teaser_revision',p_key,p_digest); END IF;
 input:=deliverable.build_teaser_input(parent.id,revision,p_draft,p_limitations); SELECT coalesce(max(r.ordinal),0)+1 INTO ordinal FROM deliverable.deliverable_revision r WHERE deliverable_id=parent.id;
 INSERT INTO deliverable.deliverable_revision(id,account_id,deal_id,deliverable_id,ordinal,predecessor_id,purpose,audience,confidentiality,template_version,build_input,basis_digest,created_by) VALUES(revision,parent.account_id,parent.deal_id,parent.id,ordinal,parent.current_revision_id,parent.purpose,parent.audience,parent.confidentiality,'teaser-1.0.0',input,encode(extensions.digest(input::text,'sha256'),'hex'),app.policy_actor_id());
 INSERT INTO deliverable.teaser_lineage(account_id,deal_id,revision_id,section_key,claim_key,citation_refs,source_refs,native_locator,reader_locator)
   SELECT parent.account_id,parent.deal_id,revision,s->>'section_key',coalesce(s->>'claim_key',s->>'section_key'),s->'citations',coalesce(s->'source_refs','[]'::jsonb),jsonb_build_object('slide',row_number() OVER ()),jsonb_build_object('page',row_number() OVER ()) FROM jsonb_array_elements(input->'content_draft'->'sections') s;
 SELECT w.posture_version,a.security_epoch INTO workspace FROM app.deal_workspace w JOIN app.account a ON a.id=w.account_id WHERE w.deal_id=parent.deal_id AND w.account_id=parent.account_id;
 INSERT INTO jobs.job(id,account_id,deal_id,actor_id,command_type,purpose_code,accepted_inputs,input_digest,input_version,workflow_version,release_id,allowance_class,allowance_quantity,allowance_posture,workspace_posture_version,security_epoch,state) VALUES(job,parent.account_id,parent.deal_id,app.policy_actor_id(),'teaser_presentation_build','teaser_presentation_build',jsonb_build_object('revision_id',revision),encode(extensions.digest(input::text,'sha256'),'hex'),'1.0.0','teaser-1.0.0',p_release,'teaser_presentation_build',1,'reserved',workspace.posture_version,workspace.security_epoch,'queued');
 INSERT INTO deliverable.workbook_job(job_id,account_id,deal_id,revision_id,input) VALUES(job,parent.account_id,parent.deal_id,revision,input); UPDATE deliverable.deliverable SET current_revision_id=revision,row_version=row_version+1 WHERE id=parent.id;
 RETURN deliverable.remember('create_teaser_revision',p_key,p_digest,jsonb_build_object('id',job,'job_type','teaser_presentation_build','state','queued','revision_id',revision,'deliverable_id',parent.id,'row_version',parent.row_version+1));
END $$;
REVOKE ALL ON FUNCTION deliverable.create_teaser_deliverable(text,text,jsonb),deliverable.build_teaser_input(uuid,uuid,jsonb,jsonb),deliverable.create_teaser_revision(uuid,bigint,text,text,jsonb,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION deliverable.create_teaser_deliverable(text,text,jsonb),deliverable.create_teaser_revision(uuid,bigint,text,text,jsonb,jsonb,text) TO app_runtime;
DO $$ DECLARE c text; BEGIN
 SELECT conname INTO c FROM pg_constraint WHERE conrelid='ai.task_definition'::regclass AND pg_get_constraintdef(oid) LIKE '%task_definition%'; IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE ai.task_definition DROP CONSTRAINT %I',c); END IF;
 ALTER TABLE ai.task_definition ADD CONSTRAINT ai_task_definition_code_check CHECK(task_definition IN ('claim_evidence_linking','contract_repair','deliverable_semantic_qc','financial_normalization_mapping','financial_semantic_extraction','material_source_conflict_analysis','native_reader_semantic_parity_review','sell_side_analysis_draft','semantic_change_impact_proposal','source_claim_extraction','teaser_content_draft','cim_content_draft','valuation_commentary_draft','workbook_commentary_draft'));
 SELECT conname INTO c FROM pg_constraint WHERE conrelid='ai.proposal'::regclass AND pg_get_constraintdef(oid) LIKE '%proposal_kind%'; IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE ai.proposal DROP CONSTRAINT %I',c); END IF;
 ALTER TABLE ai.proposal ADD CONSTRAINT ai_proposal_kind_check CHECK(proposal_kind IN ('claim','parity_finding','semantic_qc_finding','teaser_content','cim_content','workbook_commentary'));
END $$;
INSERT INTO ai.task_definition(task_definition,task_family,task_definition_version,input_contract_version,output_contract_version,logical_model_role,lifecycle_status,manifest_digest) SELECT 'teaser_content_draft','deliverable_content_draft','1.0.0','1.0.0','1.0.0','reasoning_primary','enabled','sha256:1111111111111111111111111111111111111111111111111111111111111111' WHERE NOT EXISTS(SELECT 1 FROM ai.task_definition WHERE task_definition='teaser_content_draft');
INSERT INTO ai.prompt_package(task_definition,task_definition_version,package_version,prompt_digest,input_schema_digest,output_schema_digest,context_plan_version,ai_evidence_policy_version,lifecycle_status) VALUES('teaser_content_draft','1.0.0','1.0.0','sha256:2222222222222222222222222222222222222222222222222222222222222222','sha256:3333333333333333333333333333333333333333333333333333333333333333','sha256:4444444444444444444444444444444444444444444444444444444444444444','1.0.0','1.0.0','enabled') ON CONFLICT DO NOTHING;

-- Keep QC ruleset aligned with the native presentation template.
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
  INSERT INTO deliverable.qc_run(id,account_id,deal_id,revision_id,job_id,ruleset,checks,report,input_digest) VALUES(qc,row.account_id,row.deal_id,row.revision_id,p_job,CASE WHEN revision.template_version='teaser-1.0.0' THEN 'teaser-presentation-qc-1.0.0' ELSE 'analysis-workbook-qc-1.0.0' END,p_checks,p_report,revision.basis_digest);
  FOR check_row IN SELECT value FROM jsonb_array_elements(p_checks) WHERE value->>'outcome'='failed' LOOP
   INSERT INTO deliverable.qc_finding(account_id,deal_id,revision_id,qc_run_id,finding_code,severity,detail,locator,consequence) VALUES(row.account_id,row.deal_id,row.revision_id,qc,check_row->>'code','critical',coalesce(check_row->>'detail','Exact artifact acceptance failed'),coalesce(check_row->'locator','{}'),'Blocks circulation of this exact Revision');
  END LOOP;
  UPDATE jobs.job SET state='completed',progress='{"message_code":"artifacts_and_qc_recorded"}',result=jsonb_build_object('resource',jsonb_build_object('type','deliverable_revision','id',row.revision_id),'qc_run_id',qc),problem=NULL,allowance_posture='committed',terminal_at=now(),row_version=row_version+1 WHERE id=p_job;
 END IF;
 UPDATE deliverable.workbook_job SET finished=true WHERE job_id=p_job;
 PERFORM deliverable.clear_workbook_step();
 RETURN jsonb_build_object('revision_id',row.revision_id,'qc_run_id',qc,'state',CASE WHEN p_failure IS NULL THEN 'completed' ELSE 'failed_terminal' END);
END $$;
