-- Use the existing canonical audit outcomes.
CREATE OR REPLACE FUNCTION deliverable.create_deliverable(p_key text,p_digest text,p_body jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE replay jsonb; row deliverable.deliverable%ROWTYPE; BEGIN
 PERFORM deliverable.assert_write(); replay:=deliverable.replay('create_deliverable',p_key,p_digest); IF replay IS NOT NULL THEN RETURN replay; END IF;
 INSERT INTO deliverable.deliverable(account_id,deal_id,deliverable_type,title,purpose,audience,confidentiality,owner_id)
 VALUES(app.policy_account_id(),app.policy_deal_id(),'analysis_valuation_workbook',p_body->>'title',p_body->>'purpose',p_body->>'audience',p_body->>'confidentiality',app.policy_actor_id()) RETURNING * INTO row;
 PERFORM app.record_audit('deliverable_created','completed','deliverable',row.id::text,'analysis_valuation_workbook',gen_random_uuid()::text);
 RETURN deliverable.remember('create_deliverable',p_key,p_digest,to_jsonb(row));
END $$;

CREATE OR REPLACE FUNCTION deliverable.create_revision(p_parent uuid,p_expected bigint,p_key text,p_digest text,p_basis jsonb,p_limitations jsonb,p_release text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE parent deliverable.deliverable%ROWTYPE; replay jsonb; revision uuid:=gen_random_uuid(); job uuid:=gen_random_uuid(); input jsonb; basis jsonb; ordinal integer;
BEGIN
 PERFORM deliverable.assert_write(); replay:=deliverable.replay('create_revision',p_key,p_digest); IF replay IS NOT NULL THEN RETURN replay; END IF;
 SELECT * INTO parent FROM deliverable.deliverable WHERE id=p_parent FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'artifact_scope_unavailable'; END IF;
 IF parent.row_version<>p_expected THEN RAISE EXCEPTION 'artifact_version_conflict'; END IF;
 input:=deliverable.build_input(p_parent,revision,p_basis,p_limitations);
 SELECT coalesce(max(r.ordinal),0)+1 INTO ordinal FROM deliverable.deliverable_revision r WHERE deliverable_id=p_parent;
 INSERT INTO deliverable.deliverable_revision(id,account_id,deal_id,deliverable_id,ordinal,predecessor_id,purpose,audience,confidentiality,template_version,build_input,basis_digest,created_by)
 VALUES(revision,parent.account_id,parent.deal_id,parent.id,ordinal,parent.current_revision_id,parent.purpose,parent.audience,parent.confidentiality,'analysis-valuation-1.0.0',input,encode(extensions.digest(input::text,'sha256'),'hex'),app.policy_actor_id());
 FOR basis IN SELECT value FROM jsonb_array_elements(p_basis) LOOP
  INSERT INTO deliverable.revision_calculation_run VALUES(parent.account_id,parent.deal_id,revision,(basis->>'calculation_run_id')::uuid) ON CONFLICT DO NOTHING;
  INSERT INTO deliverable.revision_model_version VALUES(parent.account_id,parent.deal_id,revision,(basis->>'model_version_id')::uuid) ON CONFLICT DO NOTHING;
  INSERT INTO deliverable.revision_scenario_version VALUES(parent.account_id,parent.deal_id,revision,(basis->>'scenario_version_id')::uuid) ON CONFLICT DO NOTHING;
 END LOOP;
 INSERT INTO jobs.job(id,account_id,deal_id,actor_id,command_type,purpose_code,accepted_inputs,input_digest,input_version,workflow_version,release_id,allowance_class,allowance_quantity,allowance_posture,workspace_posture_version,security_epoch,state)
 SELECT job,parent.account_id,parent.deal_id,app.policy_actor_id(),'analysis_workbook_build','analysis_workbook_build',jsonb_build_object('revision_id',revision,'basis',p_basis),
  encode(extensions.digest(input::text,'sha256'),'hex'),'1.0.0','analysis-valuation-1.0.0',p_release,'analysis_workbook_build',1,'reserved',w.posture_version,a.security_epoch,'queued'
 FROM app.deal_workspace w JOIN app.account a ON a.id=w.account_id WHERE w.deal_id=parent.deal_id AND w.account_id=parent.account_id;
 INSERT INTO deliverable.workbook_job(job_id,account_id,deal_id,revision_id,input) VALUES(job,parent.account_id,parent.deal_id,revision,input);
 UPDATE deliverable.deliverable SET current_revision_id=revision,row_version=row_version+1 WHERE id=parent.id;
 PERFORM app.record_audit('workbook_revision_requested','completed','revision',revision::text,'exact_controlled_basis',gen_random_uuid()::text);
 RETURN deliverable.remember('create_revision',p_key,p_digest,jsonb_build_object('id',job,'job_type','analysis_workbook_build','state','queued','revision_id',revision,'deliverable_id',parent.id,'row_version',parent.row_version+1));
END $$;

CREATE OR REPLACE FUNCTION deliverable.create_review(p_key text,p_digest text,p_body jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE replay jsonb; row deliverable.review%ROWTYPE; revision deliverable.deliverable_revision%ROWTYPE; BEGIN
 PERFORM deliverable.assert_write(); replay:=deliverable.replay('create_review',p_key,p_digest); IF replay IS NOT NULL THEN RETURN replay; END IF;
 SELECT * INTO revision FROM deliverable.deliverable_revision WHERE id=(p_body->>'revision_id')::uuid; IF NOT FOUND THEN RAISE EXCEPTION 'artifact_scope_unavailable'; END IF;
 IF p_body->>'standard' IN ('office_roundtrip','native_reader_parity') AND (p_body->>'conclusion'='passed') AND (jsonb_typeof(p_body->'evidence')<>'object' OR NOT (p_body->'evidence' ?& ARRAY['native_sha256','reader_sha256','report_sha256','application','build','steps']) OR NOT EXISTS(SELECT 1 FROM deliverable.artifact WHERE revision_id=revision.id AND role='native' AND plaintext_sha256=p_body->'evidence'->>'native_sha256') OR NOT EXISTS(SELECT 1 FROM deliverable.artifact WHERE revision_id=revision.id AND role='reader' AND plaintext_sha256=p_body->'evidence'->>'reader_sha256')) THEN RAISE EXCEPTION 'exact_artifact_evidence_required'; END IF;
 INSERT INTO deliverable.review(account_id,deal_id,revision_id,purpose,audience,scope,standard,reviewer_id,conclusion,rationale,limitations,evidence)
 VALUES(revision.account_id,revision.deal_id,revision.id,p_body->>'purpose',p_body->>'audience',p_body->>'scope',p_body->>'standard',app.policy_actor_id(),p_body->>'conclusion',p_body->>'rationale',p_body->'limitations',p_body->'evidence') RETURNING * INTO row;
 PERFORM app.record_audit('artifact_review_recorded','completed','review',row.id::text,row.standard,gen_random_uuid()::text);
 RETURN deliverable.remember('create_review',p_key,p_digest,to_jsonb(row));
END $$;

CREATE OR REPLACE FUNCTION deliverable.resolve_preview_grant(p_artifact uuid,p_session text,p_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb; BEGIN
 SELECT jsonb_build_object('storage_key',o.storage_key,'plaintext_sha256',o.plaintext_sha256,'ciphertext_sha256',o.ciphertext_sha256,'byte_length',o.byte_length,'media_type',o.media_type,'grant_id',g.id) INTO result
 FROM deliverable.preview_grant g JOIN deliverable.artifact a ON a.id=g.artifact_id JOIN object_store.protected_object o ON o.id=a.protected_object_id
 WHERE g.artifact_id=p_artifact AND g.session_hash=p_session AND g.token_hash=p_token AND g.expires_at>now() AND a.role IN ('native_preview','reader_preview') AND o.lifecycle_status='active';
 IF result IS NOT NULL THEN PERFORM app.record_audit('artifact_preview_access','completed','artifact',p_artifact::text,'short_lived_session_bound_grant',gen_random_uuid()::text); END IF; RETURN result;
END $$;
