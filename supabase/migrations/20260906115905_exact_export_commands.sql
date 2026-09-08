GRANT CREATE ON SCHEMA external_use TO app_export_owner;
GRANT EXECUTE ON FUNCTION source.packet_blockers(uuid,uuid,uuid,text) TO app_export_owner;

-- Snapshot only the exact Revision's typed control dependencies. Raw AI inputs,
-- provider requests/responses and original Source bytes are never export members.
CREATE FUNCTION external_use.export_scope(p_revision uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE basis jsonb; r deliverable.deliverable_revision%ROWTYPE; hard jsonb:='[]'; rights jsonb; checks jsonb; result jsonb;
BEGIN
 basis:=external_use.loop_basis(p_revision);
 SELECT * INTO r FROM deliverable.deliverable_revision WHERE id=p_revision;
 IF (SELECT count(*) FROM deliverable.artifact WHERE revision_id=r.id AND role IN ('native','reader'))<>2 THEN hard:=hard||'[{"code":"native_reader_pair_required","recovery":"Complete the exact Workbook build"}]';END IF;
 IF basis->'manifest'='null'::jsonb THEN hard:=hard||'[{"code":"signed_manifest_required","recovery":"Complete exact manifest signing"}]';END IF;
 IF jsonb_array_length(basis->'lineage')=0 OR jsonb_array_length(basis->'decisions')=0 THEN hard:=hard||'[{"code":"required_control_records_missing","recovery":"Restore exact lineage and controlling Decisions"}]';END IF;
 SELECT q.checks INTO checks FROM deliverable.qc_run q WHERE revision_id=r.id ORDER BY created_at DESC,id DESC LIMIT 1;
 IF EXISTS(SELECT 1 FROM (VALUES('native_structure'),('recalculation'),('lineage'),('native_reader_parity'),('signed_manifest')) required(code)
  WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(checks,'[]')) c WHERE c->>'code'=required.code AND c->>'outcome'='passed')) THEN
  hard:=hard||'[{"code":"artifact_integrity_unverified","recovery":"Run QC against the exact stored Native, Reader and manifest"}]';
 END IF;
 IF EXISTS(SELECT 1 FROM deliverable.qc_finding f WHERE revision_id=r.id AND severity='critical'
  AND finding_code IN ('native_structure','recalculation','lineage','native_reader_parity','signed_manifest')
  AND NOT EXISTS(SELECT 1 FROM deliverable.finding_retest t WHERE t.finding_id=f.id AND t.outcome='passed')) THEN
  hard:=hard||'[{"code":"artifact_integrity_failed","recovery":"Repair the failed file or exact control record and retest"}]';END IF;
 IF r.packet_version_id IS NULL OR r.work_objective_id IS NULL THEN hard:=hard||'[{"code":"exact_packet_required","recovery":"Bind the exact Source Packet and Work Objective"}]';
 ELSE
  rights:=source.packet_blockers(r.account_id,r.deal_id,r.packet_version_id,(SELECT purpose_code FROM source.source_packet_version WHERE id=r.packet_version_id));
  hard:=hard||coalesce((SELECT jsonb_agg(x) FROM jsonb_array_elements(rights) x WHERE x->>'code' IN ('rights_blocked','rights_unassessed','withdrawn_source')),'[]');
  IF EXISTS(SELECT 1 FROM source.source_rights_current_selection cs JOIN source.source_rights_posture_assessment ra ON ra.id=cs.assessment_id
   JOIN source.source_packet_member m ON m.source_record_id=cs.source_record_id
   WHERE m.packet_version_id=r.packet_version_id AND cs.purpose_code=(SELECT purpose_code FROM source.source_packet_version WHERE id=r.packet_version_id)
   AND ra.rights_code='limited' AND NOT(ra.permitted_operations ? 'internal_controlled_export')) THEN hard:=hard||'[{"code":"rights_limit_export","recovery":"Obtain a permitted internal export basis"}]';END IF;
 END IF;
 IF r.confidentiality IN ('confidential','restricted') THEN hard:=hard||'[{"code":"confidential_export_not_enabled","recovery":"Use the configured supported synthetic development scope"}]';END IF;
 IF EXISTS(SELECT 1 FROM deliverable.artifact a JOIN object_store.protected_object o ON o.id=a.protected_object_id WHERE a.revision_id=r.id AND (o.deal_id<>r.deal_id OR o.account_id<>r.account_id)) THEN RAISE EXCEPTION 'export_scope_unavailable';END IF;
 result:=basis||jsonb_build_object('schema_version','internal-controlled-export-1.0.0','hard_blockers',hard,
  'source_records',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'content_sha256',s.content_sha256,'rights_posture',s.rights_posture,'rights_basis',s.rights_basis,'confidentiality_class',s.confidentiality_class,'disposition_code',s.disposition_code,'limitations',s.limitations) ORDER BY s.id),'[]') FROM source.source_record s WHERE s.id IN (SELECT (x->>'source_record_id')::uuid FROM jsonb_array_elements(basis->'lineage') x WHERE x->>'source_record_id' IS NOT NULL)),
  'exclusions','[{"scope":"original_source_bytes","reason":"Only source identity, permitted citation context and lineage are included"},{"scope":"ai_provider_payloads","reason":"Raw prompts, provider requests and responses are excluded"},{"scope":"other_revisions_and_deliverables","reason":"Outside the exact reviewed Revision"},{"scope":"external_use_authority","reason":"No External-Use Decision, Delivery, Recipient Access or Actual Use is created"}]'::jsonb,
  'security_epoch',(SELECT security_epoch FROM app.account WHERE id=app.policy_account_id()),
  'posture_version',(SELECT posture_version FROM app.deal_workspace WHERE deal_id=app.policy_deal_id()),
  'external_use_authorized',false);
 RETURN result;
END $$;

CREATE FUNCTION external_use.prepare_export(p_revision uuid,p_purpose text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE scope jsonb; row external_use.export_review%ROWTYPE; digest text;
BEGIN
 IF p_purpose NOT IN ('inspection','native_editing','backup','controlled_reimport') THEN RAISE EXCEPTION 'export_purpose_invalid';END IF;
 scope:=external_use.export_scope(p_revision);digest:=encode(extensions.digest(scope::text,'sha256'),'hex');
 SELECT * INTO row FROM external_use.export_review WHERE revision_id=p_revision AND purpose=p_purpose AND actor_id=app.policy_actor_id() AND dependency_digest=digest LIMIT 1;
 IF NOT FOUND THEN
  INSERT INTO external_use.export_review(account_id,deal_id,actor_id,revision_id,purpose,scope,dependency_digest)
  VALUES(app.policy_account_id(),app.policy_deal_id(),app.policy_actor_id(),p_revision,p_purpose,scope,digest) RETURNING * INTO row;
 END IF;
 RETURN to_jsonb(row);
END $$;

CREATE FUNCTION external_use.assert_review(p_review uuid,p_dependency text) RETURNS external_use.export_review LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE row external_use.export_review%ROWTYPE; scope jsonb;
BEGIN
 SELECT * INTO row FROM external_use.export_review WHERE id=p_review AND actor_id=app.policy_actor_id();
 IF NOT FOUND THEN RAISE EXCEPTION 'export_scope_unavailable';END IF;
 scope:=external_use.export_scope(row.revision_id);
 IF row.dependency_digest<>p_dependency OR encode(extensions.digest(scope::text,'sha256'),'hex')<>row.dependency_digest THEN RAISE EXCEPTION 'export_version_conflict';END IF;
 IF jsonb_array_length(scope->'hard_blockers')>0 THEN RAISE EXCEPTION 'export_hard_gate_blocked';END IF;
 RETURN row;
END $$;

CREATE FUNCTION external_use.issue_sensitive_grant(p_session text,p_token text,p_action text,p_resource uuid,p_digest text,p_dependency text,p_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE session_row app.auth_session%ROWTYPE; result external_use.sensitive_action_grant%ROWTYPE; review external_use.export_review%ROWTYPE;
BEGIN
 SELECT * INTO session_row FROM app.auth_session WHERE token_hash=p_session AND expires_at>clock_timestamp() AND passkey_verified
  AND account_id=app.policy_account_id() AND actor_id=app.policy_actor_id();
 IF NOT FOUND OR session_row.passkey_authenticated_at IS NULL OR session_row.passkey_authenticated_at<clock_timestamp()-interval '5 minutes'
  OR session_row.passkey_authenticated_at>clock_timestamp() OR session_row.provider_session_id IS NULL THEN RAISE EXCEPTION 'passkey_fresh_required';END IF;
 IF p_action='internal_controlled_export' THEN review:=external_use.assert_review(p_resource,p_dependency);
 ELSIF p_action='export_object_retrieval' THEN
  IF NOT EXISTS(SELECT 1 FROM external_use.internal_export_object o JOIN object_store.protected_object p ON p.id=o.protected_object_id WHERE o.export_id=p_resource AND p.plaintext_sha256=p_dependency) THEN RAISE EXCEPTION 'export_scope_unavailable';END IF;
  SELECT r.* INTO review FROM external_use.export_review r JOIN external_use.internal_export e ON e.review_id=r.id WHERE e.id=p_resource;
  IF jsonb_array_length(external_use.export_scope(review.revision_id)->'hard_blockers')>0 THEN RAISE EXCEPTION 'export_hard_gate_blocked';END IF;
 ELSE RAISE EXCEPTION 'sensitive_action_invalid';END IF;
 INSERT INTO external_use.sensitive_action_grant(account_id,deal_id,actor_id,session_hash,provider_session_id,token_hash,action,review_id,export_id,command_digest,dependency_digest,idempotency_hash,security_epoch,posture_version)
 VALUES(app.policy_account_id(),app.policy_deal_id(),app.policy_actor_id(),p_session,session_row.provider_session_id,p_token,p_action,
  CASE WHEN p_action='internal_controlled_export' THEN p_resource END,CASE WHEN p_action='export_object_retrieval' THEN p_resource END,p_digest,p_dependency,p_key,
  (SELECT security_epoch FROM app.account WHERE id=app.policy_account_id()),(SELECT posture_version FROM app.deal_workspace WHERE deal_id=app.policy_deal_id())) RETURNING * INTO result;
 PERFORM app.record_audit('sensitive_action.issued','completed','sensitive_action_grant',result.id::text,p_action,gen_random_uuid()::text);
 RETURN jsonb_build_object('id',result.id,'expires_at',result.expires_at,'action',result.action,'resource_id',p_resource);
END $$;

CREATE FUNCTION external_use.consume_sensitive_grant(p_session text,p_token text,p_action text,p_resource uuid,p_digest text,p_dependency text,p_key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE row external_use.sensitive_action_grant%ROWTYPE;
BEGIN
 SELECT * INTO row FROM external_use.sensitive_action_grant WHERE token_hash=p_token FOR UPDATE;
 IF NOT FOUND OR row.consumed_at IS NOT NULL OR row.expires_at<=clock_timestamp() OR row.session_hash<>p_session
  OR row.actor_id<>app.policy_actor_id() OR row.action<>p_action OR coalesce(row.review_id,row.export_id)<>p_resource
  OR row.command_digest<>p_digest OR row.dependency_digest<>p_dependency OR row.idempotency_hash<>p_key
  OR NOT EXISTS(SELECT 1 FROM app.auth_session s WHERE s.token_hash=p_session AND s.provider_session_id=row.provider_session_id AND s.expires_at>clock_timestamp())
  OR row.security_epoch<>(SELECT security_epoch FROM app.account WHERE id=app.policy_account_id())
  OR row.posture_version<>(SELECT posture_version FROM app.deal_workspace WHERE deal_id=app.policy_deal_id()) THEN RAISE EXCEPTION 'sensitive_grant_invalid';END IF;
 UPDATE external_use.sensitive_action_grant SET consumed_at=clock_timestamp() WHERE id=row.id;
 PERFORM app.record_audit('sensitive_action.consumed','completed','sensitive_action_grant',row.id::text,p_action,gen_random_uuid()::text);
END $$;

ALTER TABLE jobs.job DROP CONSTRAINT job_command_type_check,DROP CONSTRAINT job_purpose_code_check,DROP CONSTRAINT job_allowance_class_check;
ALTER TABLE jobs.job ADD CHECK(command_type IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','workbook_ai_review','internal_controlled_export')),
 ADD CHECK(purpose_code IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','workbook_ai_review','internal_controlled_export')),
 ADD CHECK(allowance_class IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','workbook_ai_review','internal_controlled_export'));
GRANT SELECT,INSERT,UPDATE ON jobs.job TO app_export_owner;
CREATE POLICY export_job_owner ON jobs.job TO app_export_owner USING(command_type='internal_controlled_export' AND account_id=app.policy_account_id() AND deal_id=app.policy_deal_id()) WITH CHECK(command_type='internal_controlled_export' AND account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());

CREATE FUNCTION external_use.create_export(p_review uuid,p_session text,p_token text,p_digest text,p_dependency text,p_key text,p_release text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE review external_use.export_review%ROWTYPE; prior external_use.internal_export%ROWTYPE; result external_use.internal_export%ROWTYPE; job uuid:=gen_random_uuid();
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws(':','export',app.policy_account_id(),app.policy_actor_id(),p_key),0));
 SELECT * INTO prior FROM external_use.internal_export WHERE idempotency_hash=p_key AND actor_id=app.policy_actor_id();
 IF FOUND THEN
  IF prior.command_digest<>p_digest OR prior.review_id<>p_review THEN RAISE EXCEPTION 'idempotency_key_reused';END IF;
  RETURN jsonb_build_object('id',prior.job_id,'export_id',prior.id,'idempotent_replayed',true);
 END IF;
 review:=external_use.assert_review(p_review,p_dependency);
 PERFORM external_use.consume_sensitive_grant(p_session,p_token,'internal_controlled_export',p_review,p_digest,p_dependency,p_key);
 INSERT INTO jobs.job(id,account_id,deal_id,actor_id,command_type,purpose_code,accepted_inputs,input_digest,input_version,workflow_version,release_id,allowance_class,allowance_quantity,allowance_posture,workspace_posture_version,security_epoch,state)
 VALUES(job,review.account_id,review.deal_id,review.actor_id,'internal_controlled_export','internal_controlled_export',jsonb_build_object('review_id',review.id,'revision_id',review.revision_id),p_digest,'1.0.0','controlled-export-1.0.0',p_release,'internal_controlled_export',1,'released',(review.scope->>'posture_version')::bigint,(review.scope->>'security_epoch')::bigint,'queued');
 INSERT INTO external_use.internal_export(account_id,deal_id,actor_id,review_id,revision_id,job_id,idempotency_hash,command_digest)
 VALUES(review.account_id,review.deal_id,review.actor_id,review.id,review.revision_id,job,p_key,p_digest) RETURNING * INTO result;
 INSERT INTO external_use.export_job(job_id,account_id,deal_id,actor_id,export_id) VALUES(job,review.account_id,review.deal_id,review.actor_id,result.id);
 PERFORM app.record_audit('internal_export.accepted','completed','internal_controlled_export',result.id::text,'internal_portability_only',gen_random_uuid()::text);
 RETURN jsonb_build_object('id',job,'export_id',result.id,'state','queued','idempotent_replayed',false);
END $$;

CREATE FUNCTION external_use.export_projection(p_export uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT to_jsonb(e)-'idempotency_hash'-'command_digest'||jsonb_build_object('state',j.state,'row_version',j.row_version,'problem',j.problem,'progress',j.progress,'review',to_jsonb(r),'archive',CASE WHEN o.export_id IS NULL THEN NULL ELSE jsonb_build_object('sha256',p.plaintext_sha256,'byte_length',p.byte_length,'manifest',o.manifest) END,'external_use_authorized',false)
 FROM external_use.internal_export e JOIN jobs.job j ON j.id=e.job_id JOIN external_use.export_review r ON r.id=e.review_id
 LEFT JOIN external_use.internal_export_object o ON o.export_id=e.id LEFT JOIN object_store.protected_object p ON p.id=o.protected_object_id WHERE e.id=p_export
$$;

CREATE FUNCTION external_use.observe_control(p_revision uuid,p_checkpoint text,p_basis text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE basis jsonb; digest text; f external_use.first_value%ROWTYPE;
BEGIN
 basis:=external_use.loop_basis(p_revision);digest:=encode(extensions.digest(basis::text,'sha256'),'hex');
 IF digest<>p_basis THEN RAISE EXCEPTION 'export_version_conflict';END IF;
 IF p_checkpoint='evidence' AND jsonb_array_length(basis->'evidence')=0 THEN RAISE EXCEPTION 'guide_evidence_required';END IF;
 IF p_checkpoint='decision_validation' AND (jsonb_array_length(basis->'decisions')=0 OR jsonb_array_length(basis->'calculations')=0 OR jsonb_array_length(basis->'validations')=0
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(basis->'validations') v WHERE v->>'outcome'<>'passed')) THEN RAISE EXCEPTION 'guide_validation_required';END IF;
 IF p_checkpoint IN ('native','reader') AND NOT EXISTS(SELECT 1 FROM deliverable.artifact WHERE revision_id=p_revision AND role=p_checkpoint) THEN RAISE EXCEPTION 'guide_artifact_required';END IF;
 IF p_checkpoint='readiness' AND jsonb_array_length(basis->'qc')=0 THEN RAISE EXCEPTION 'guide_qc_required';END IF;
 INSERT INTO external_use.control_inspection(account_id,deal_id,actor_id,revision_id,checkpoint,basis_digest)
 VALUES(app.policy_account_id(),app.policy_deal_id(),app.policy_actor_id(),p_revision,p_checkpoint,digest) ON CONFLICT DO NOTHING;
 PERFORM pg_advisory_xact_lock(hashtextextended('guide:'||app.policy_deal_id()::text,0));
 IF (SELECT count(DISTINCT checkpoint)=5 FROM external_use.control_inspection WHERE revision_id=p_revision AND actor_id=app.policy_actor_id() AND basis_digest=digest)
  AND NOT EXISTS(SELECT 1 FROM jobs.job WHERE accepted_inputs->>'revision_id'=p_revision::text AND command_type IN ('analysis_workbook_build','analysis_workbook_qc') AND state IN ('running','queued','failed_retryable','failed_terminal')) THEN
  INSERT INTO external_use.first_value(account_id,deal_id,actor_id,revision_id,basis)
  VALUES(app.policy_account_id(),app.policy_deal_id(),app.policy_actor_id(),p_revision,basis) ON CONFLICT(deal_id) DO NOTHING RETURNING * INTO f;
  IF f.id IS NOT NULL THEN
   PERFORM app.record_audit('guide.first_value_completed','completed','first_value',f.id::text,'exact_controlled_loop_observed',gen_random_uuid()::text);
   INSERT INTO external_use.measurement_event(account_id,deal_id,event_code,dedupe_digest,dimensions)
   VALUES(f.account_id,f.deal_id,'first_value_completed',encode(extensions.digest(f.id::text,'sha256'),'hex'),jsonb_build_object('scope','same_deal','artifact_pair',true,'external_authority',false));
  END IF;
 END IF;
 RETURN external_use.guide_projection();
END $$;

DO $$ DECLARE fn record;BEGIN
 FOR fn IN SELECT p.oid::regprocedure AS name FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='external_use' LOOP
  EXECUTE format('ALTER FUNCTION %s OWNER TO app_export_owner',fn.name);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',fn.name);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO app_runtime',fn.name);
 END LOOP;
END $$;
-- Internal mutation helpers are not independent runtime capabilities.
REVOKE EXECUTE ON FUNCTION external_use.consume_sensitive_grant(text,text,text,uuid,text,text,text) FROM app_runtime;
REVOKE CREATE ON SCHEMA external_use FROM app_export_owner;
