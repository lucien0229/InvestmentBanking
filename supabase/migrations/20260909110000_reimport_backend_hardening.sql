-- Native artifact reimport backend hardening: command durability, exact human-decision binding,
-- compatibility gates, and retry-safe reimport commands.
ALTER TABLE object_store.protected_object ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE IF NOT EXISTS deliverable.reimport_revision_lineage (
  account_id uuid NOT NULL, deal_id uuid NOT NULL, revision_id uuid NOT NULL, import_id uuid NOT NULL,
  edited_object_id uuid NOT NULL, actor_id uuid NOT NULL REFERENCES app.actor(id), created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, deal_id, revision_id),
  FOREIGN KEY (account_id, deal_id, revision_id) REFERENCES deliverable.deliverable_revision(account_id, deal_id, id),
  FOREIGN KEY (account_id, deal_id, import_id) REFERENCES deliverable.external_edit_import(account_id, deal_id, id),
  FOREIGN KEY (account_id, edited_object_id) REFERENCES object_store.protected_object(account_id, id)
);
ALTER TABLE deliverable.reimport_revision_lineage ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable.reimport_revision_lineage FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS native_reimport_lineage_runtime ON deliverable.reimport_revision_lineage;
CREATE POLICY native_reimport_lineage_runtime ON deliverable.reimport_revision_lineage FOR SELECT TO app_runtime USING (account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
GRANT SELECT ON deliverable.reimport_revision_lineage TO app_runtime;
CREATE TABLE IF NOT EXISTS deliverable.reimport_command_idempotency (
  account_id uuid NOT NULL,
  deal_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  command_type text NOT NULL,
  key_hash text NOT NULL,
  request_digest text NOT NULL,
  import_id uuid,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, deal_id, actor_id, command_type, key_hash),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, actor_id) REFERENCES app.account_actor(account_id, actor_id),
  FOREIGN KEY (account_id, deal_id, import_id) REFERENCES deliverable.external_edit_import(account_id, deal_id, id)
);
ALTER TABLE deliverable.reimport_command_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable.reimport_command_idempotency FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS native_reimport_reimport_command_runtime ON deliverable.reimport_command_idempotency;
CREATE POLICY native_reimport_reimport_command_runtime ON deliverable.reimport_command_idempotency FOR SELECT TO app_runtime USING (account_id=app.policy_account_id() AND deal_id=app.policy_deal_id() AND actor_id=app.policy_actor_id());
GRANT SELECT ON deliverable.reimport_command_idempotency TO app_runtime;

-- New arities are the only app_runtime entry points. They carry a durable
-- request digest and replay the exact response for a repeated command key.
CREATE OR REPLACE FUNCTION deliverable.create_reimport_session(
  p_export uuid,p_manifest_digest text,p_current_revision uuid,p_edited_file jsonb,p_key_hash text,p_request_digest text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=deliverable,external_use,app,extensions,pg_catalog AS $$
DECLARE e external_use.internal_export%ROWTYPE; i external_edit_import%ROWTYPE; prior reimport_command_idempotency%ROWTYPE; result jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws(':',app.policy_account_id(),app.policy_deal_id(),app.policy_actor_id(),'create_reimport_session',p_key_hash),0));
  SELECT * INTO prior FROM reimport_command_idempotency WHERE account_id=app.policy_account_id() AND deal_id=app.policy_deal_id() AND actor_id=app.policy_actor_id() AND command_type='create_reimport_session' AND key_hash=p_key_hash;
  IF FOUND THEN IF prior.request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused'; END IF; RETURN prior.response||jsonb_build_object('idempotent_replayed',true); END IF;
  SELECT * INTO e FROM external_use.internal_export WHERE id=p_export AND account_id=app.policy_account_id() AND deal_id=app.policy_deal_id();
  IF NOT FOUND THEN RAISE EXCEPTION 'reimport_export_unavailable'; END IF;
  IF NOT EXISTS(SELECT 1 FROM external_use.export_review r WHERE r.id=e.review_id AND r.account_id=e.account_id AND r.deal_id=e.deal_id AND r.purpose='controlled_reimport') THEN RAISE EXCEPTION 'reimport_export_unavailable'; END IF;
  IF NOT EXISTS(SELECT 1 FROM external_use.internal_export_object eo JOIN object_store.protected_object po ON po.id=eo.protected_object_id AND po.account_id=eo.account_id AND po.deal_id=eo.deal_id WHERE eo.export_id=e.id AND eo.account_id=e.account_id AND eo.deal_id=e.deal_id AND po.lifecycle_status='active') THEN RAISE EXCEPTION 'reimport_export_unavailable'; END IF;
  IF NOT EXISTS(SELECT 1 FROM deliverable.deliverable_revision baseline JOIN deliverable.deliverable d ON d.id=baseline.deliverable_id AND d.account_id=baseline.account_id AND d.deal_id=baseline.deal_id JOIN deliverable.deliverable_revision current_revision ON current_revision.id=p_current_revision AND current_revision.deliverable_id=d.id AND current_revision.account_id=d.account_id AND current_revision.deal_id=d.deal_id WHERE baseline.id=e.revision_id AND baseline.account_id=e.account_id AND baseline.deal_id=e.deal_id AND d.current_revision_id=p_current_revision) THEN RAISE EXCEPTION 'reimport_current_revision_unavailable'; END IF;
  IF p_edited_file->>'baseline_export_id' IS DISTINCT FROM e.id::text OR p_edited_file->>'baseline_revision_id' IS DISTINCT FROM e.revision_id::text OR p_edited_file->>'manifest_digest' IS DISTINCT FROM p_manifest_digest THEN RAISE EXCEPTION 'reimport_metadata_invalid'; END IF;
  IF p_manifest_digest IS NULL OR p_manifest_digest<>coalesce((SELECT encode(extensions.digest(manifest::text,'sha256'),'hex') FROM external_use.internal_export_object WHERE export_id=e.id),'') THEN RAISE EXCEPTION 'reimport_manifest_mismatch'; END IF;
  INSERT INTO external_edit_import(account_id,deal_id,export_id,baseline_revision_id,current_revision_id,actor_id,baseline_manifest_digest,edited_file)
    VALUES(e.account_id,e.deal_id,e.id,e.revision_id,p_current_revision,app.policy_actor_id(),p_manifest_digest,coalesce(p_edited_file,'{}'::jsonb)) RETURNING * INTO i;
  result:=jsonb_build_object('id',i.id,'status',i.status,'export_id',i.export_id,'baseline_revision_id',i.baseline_revision_id,'current_revision_id',i.current_revision_id,'row_version',i.row_version,'idempotent_replayed',false);
  INSERT INTO reimport_command_idempotency(account_id,deal_id,actor_id,command_type,key_hash,request_digest,import_id,response) VALUES(i.account_id,i.deal_id,app.policy_actor_id(),'create_reimport_session',p_key_hash,p_request_digest,i.id,result);
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION deliverable.finalize_reimport(
  p_import uuid,p_edited_object uuid,p_edited_digest text,p_comparisons jsonb,p_compatibility jsonb,p_key_hash text,p_request_digest text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=deliverable,app,object_store,extensions,pg_catalog AS $$
DECLARE i external_edit_import%ROWTYPE; x jsonb; c artifact_region_comparison%ROWTYPE; open_conflicts integer:=0; unsafe integer:=0; prior reimport_command_idempotency%ROWTYPE; result jsonb; compatibility jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws(':',app.policy_account_id(),app.policy_deal_id(),app.policy_actor_id(),'finalize_reimport',p_key_hash),0));
  SELECT * INTO prior FROM reimport_command_idempotency WHERE account_id=app.policy_account_id() AND deal_id=app.policy_deal_id() AND actor_id=app.policy_actor_id() AND command_type='finalize_reimport' AND key_hash=p_key_hash;
  IF FOUND THEN IF prior.request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused'; END IF; RETURN prior.response||jsonb_build_object('idempotent_replayed',true); END IF;
  SELECT * INTO i FROM external_edit_import WHERE id=p_import AND account_id=app.policy_account_id() AND deal_id=app.policy_deal_id() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'reimport_not_found'; END IF;
  IF i.completed_at IS NOT NULL OR i.status NOT IN ('awaiting_upload','blocked') THEN RAISE EXCEPTION 'reimport_state_conflict'; END IF;
  IF i.status='blocked' THEN DELETE FROM deliverable.merge_conflict WHERE import_id=i.id; DELETE FROM deliverable.artifact_region_comparison WHERE import_id=i.id; END IF;
  IF NOT EXISTS(SELECT 1 FROM object_store.protected_object WHERE id=p_edited_object AND account_id=i.account_id AND deal_id=i.deal_id AND plaintext_sha256=p_edited_digest AND lifecycle_status='active' AND metadata->>'baseline_export_id'=i.export_id::text AND metadata->>'baseline_revision_id'=i.baseline_revision_id::text AND metadata->>'manifest_digest'=i.baseline_manifest_digest) THEN RAISE EXCEPTION 'reimport_edited_object_unavailable'; END IF;
  IF jsonb_typeof(p_comparisons)<>'array' OR jsonb_array_length(p_comparisons)=0 THEN RAISE EXCEPTION 'reimport_comparison_required'; END IF;
  UPDATE external_edit_import SET status='comparing',edited_object_id=p_edited_object,edited_digest=p_edited_digest,compatibility_result=coalesce(p_compatibility,'{}'::jsonb),row_version=row_version+1 WHERE id=i.id;
  FOR x IN SELECT value FROM jsonb_array_elements(p_comparisons) LOOP
    IF nullif(btrim(x->>'region_key'),'') IS NULL OR x->>'ownership' NOT IN ('generated-owned','banker-owned','protected-formula','shared-merge','unmanaged') OR x->>'classification' NOT IN ('unchanged','banker_edit','generated_region_change','source_formula_change','style_layout_change','comment_review_change','unsupported','requires_review','conflict') OR jsonb_typeof(x->'baseline_region')<>'object' OR jsonb_typeof(x->'edited_region')<>'object' OR jsonb_typeof(x->'current_region')<>'object' OR x->'baseline_region'->>'region_key' IS DISTINCT FROM x->>'region_key' OR x->'edited_region'->>'region_key' IS DISTINCT FROM x->>'region_key' OR x->'current_region'->>'region_key' IS DISTINCT FROM x->>'region_key' THEN RAISE EXCEPTION 'reimport_comparison_invalid'; END IF;
    INSERT INTO artifact_region_comparison(account_id,deal_id,import_id,region_key,ownership,classification,baseline_region,edited_region,current_region,detail,comparison_digest)
      VALUES(i.account_id,i.deal_id,i.id,x->>'region_key',x->>'ownership',x->>'classification',coalesce(x->'baseline_region','{}'),coalesce(x->'edited_region','{}'),coalesce(x->'current_region','{}'),coalesce(x->>'detail',''),encode(extensions.digest(x::text,'sha256'),'hex')) RETURNING * INTO c;
    IF c.classification='conflict' THEN INSERT INTO merge_conflict(account_id,deal_id,import_id,comparison_id,conflict_kind) VALUES(i.account_id,i.deal_id,i.id,c.id,'shared_region'); END IF;
    IF c.classification IN ('unsupported','requires_review') THEN unsafe:=unsafe+1; END IF;
  END LOOP;
  SELECT count(*) INTO open_conflicts FROM merge_conflict WHERE import_id=i.id AND posture='open';
  compatibility:=jsonb_build_object('automatic_merge',unsafe=0 AND open_conflicts=0 AND coalesce((p_compatibility->>'automatic_merge')::boolean,false), 'server_unsafe_regions',unsafe, 'open_conflicts',open_conflicts, 'client',coalesce(p_compatibility,'{}'::jsonb));
  result:=jsonb_build_object('id',i.id,'status',CASE WHEN unsafe>0 OR coalesce((p_compatibility->>'automatic_merge')::boolean,false)=false THEN 'blocked' WHEN open_conflicts>0 THEN 'conflicted' ELSE 'ready' END,'open_conflicts',open_conflicts,'compatibility',compatibility,'idempotent_replayed',false);
  UPDATE external_edit_import SET status=result->>'status',compatibility_result=compatibility,completed_at=CASE WHEN result->>'status' IN ('ready','conflicted') THEN now() ELSE NULL END,row_version=row_version+1 WHERE id=i.id;
  INSERT INTO reimport_command_idempotency(account_id,deal_id,actor_id,command_type,key_hash,request_digest,import_id,response) VALUES(i.account_id,i.deal_id,app.policy_actor_id(),'finalize_reimport',p_key_hash,p_request_digest,i.id,result);
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION deliverable.record_merge_conflict_disposition(
  p_import uuid,p_conflict uuid,p_expected bigint,p_decision uuid,p_disposition text,p_source text,p_rationale text,p_key_hash text,p_request_digest text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=deliverable,knowledge,app,pg_catalog AS $$
DECLARE c merge_conflict%ROWTYPE; d merge_conflict_disposition%ROWTYPE; decision knowledge.human_decision%ROWTYPE; prior reimport_command_idempotency%ROWTYPE; result jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws(':',app.policy_account_id(),app.policy_deal_id(),app.policy_actor_id(),'record_merge_conflict_disposition',p_key_hash),0));
  SELECT * INTO prior FROM reimport_command_idempotency WHERE account_id=app.policy_account_id() AND deal_id=app.policy_deal_id() AND actor_id=app.policy_actor_id() AND command_type='record_merge_conflict_disposition' AND key_hash=p_key_hash;
  IF FOUND THEN IF prior.request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused'; END IF; RETURN prior.response||jsonb_build_object('idempotent_replayed',true); END IF;
  SELECT c.* INTO c FROM merge_conflict c WHERE c.id=p_conflict AND c.import_id=p_import AND c.account_id=app.policy_account_id() AND c.deal_id=app.policy_deal_id() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'reimport_conflict_not_found'; END IF;
  IF c.row_version<>p_expected OR c.posture<>'open' THEN RAISE EXCEPTION 'reimport_conflict_version'; END IF;
  IF p_disposition NOT IN ('keep_banker','take_generated','manually_reconciled_import') OR p_source IS DISTINCT FROM (CASE p_disposition WHEN 'keep_banker' THEN 'edited' WHEN 'take_generated' THEN 'current' ELSE 'manual' END) OR length(btrim(p_rationale))<20 THEN RAISE EXCEPTION 'reimport_disposition_invalid'; END IF;
  SELECT * INTO decision FROM knowledge.human_decision WHERE id=p_decision AND account_id=c.account_id AND deal_id=c.deal_id AND decision_type_code='conflict_resolution' AND controlled_object_id=c.id::text AND selected_option_code=p_disposition AND decided_by_actor_id=app.policy_actor_id() AND (expires_at IS NULL OR expires_at>now()) AND NOT EXISTS(SELECT 1 FROM knowledge.human_decision newer WHERE newer.account_id=c.account_id AND newer.deal_id=c.deal_id AND (newer.reverses_decision_id=decision.id OR newer.supersedes_decision_id=decision.id));
  IF NOT FOUND OR decision.controlled_object_version IS DISTINCT FROM c.row_version::text OR decision.selected_option_code IS DISTINCT FROM p_disposition OR position(p_import::text in decision.scope)=0 THEN RAISE EXCEPTION 'reimport_human_decision_binding'; END IF;
  INSERT INTO merge_conflict_disposition(account_id,deal_id,conflict_id,human_decision_id,disposition,accepted_source,rationale) VALUES(c.account_id,c.deal_id,c.id,p_decision,p_disposition,p_source,p_rationale) RETURNING * INTO d;
  UPDATE merge_conflict SET posture='resolved',resolved_at=now(),row_version=row_version+1 WHERE id=c.id;
  UPDATE external_edit_import SET status=CASE WHEN NOT EXISTS(SELECT 1 FROM merge_conflict WHERE import_id=c.import_id AND posture='open') THEN 'ready' ELSE status END,row_version=row_version+1 WHERE id=c.import_id;
  result:=jsonb_build_object('id',d.id,'conflict_id',d.conflict_id,'disposition',d.disposition,'status','resolved','idempotent_replayed',false);
  INSERT INTO reimport_command_idempotency(account_id,deal_id,actor_id,command_type,key_hash,request_digest,import_id,response) VALUES(c.account_id,c.deal_id,app.policy_actor_id(),'record_merge_conflict_disposition',p_key_hash,p_request_digest,c.import_id,result);
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION deliverable.accept_reimport(
  p_import uuid,p_expected bigint,p_impact uuid,p_reason text,p_key_hash text,p_request_digest text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=deliverable,analysis,knowledge,source,app,extensions,pg_catalog AS $$
DECLARE i external_edit_import%ROWTYPE; d deliverable.deliverable%ROWTYPE; basis jsonb; accepted_regions jsonb; limitations jsonb; result jsonb; prior reimport_command_idempotency%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws(':',app.policy_account_id(),app.policy_deal_id(),app.policy_actor_id(),'accept_reimport',p_key_hash),0));
  SELECT * INTO prior FROM reimport_command_idempotency WHERE account_id=app.policy_account_id() AND deal_id=app.policy_deal_id() AND actor_id=app.policy_actor_id() AND command_type='accept_reimport' AND key_hash=p_key_hash;
  IF FOUND THEN IF prior.request_digest IS DISTINCT FROM p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused'; END IF; RETURN prior.response||jsonb_build_object('idempotent_replayed',true); END IF;
  SELECT * INTO i FROM external_edit_import WHERE id=p_import AND account_id=app.policy_account_id() AND deal_id=app.policy_deal_id() FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'reimport_not_found'; END IF;
  IF i.row_version<>p_expected OR i.status<>'ready' THEN RAISE EXCEPTION 'reimport_version'; END IF;
  IF EXISTS(SELECT 1 FROM merge_conflict WHERE import_id=i.id AND posture='open') THEN RAISE EXCEPTION 'reimport_conflicts_open'; END IF;
  IF length(btrim(p_reason))<20 THEN RAISE EXCEPTION 'reimport_acceptance_reason_required'; END IF;
  SELECT * INTO d FROM deliverable.deliverable WHERE account_id=i.account_id AND deal_id=i.deal_id AND current_revision_id=i.current_revision_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'reimport_current_revision_unavailable'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('calculation_run_id',x.calculation_run_id,'model_version_id',(SELECT model_version_id FROM deliverable.revision_model_version m WHERE m.revision_id=x.revision_id LIMIT 1),'scenario_version_id',(SELECT scenario_version_id FROM deliverable.revision_scenario_version s WHERE s.revision_id=x.revision_id LIMIT 1))),'[]'::jsonb) INTO basis FROM deliverable.revision_calculation_run x WHERE x.revision_id=i.current_revision_id;
  IF jsonb_array_length(basis)=0 THEN RAISE EXCEPTION 'reimport_controlled_basis_required'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('region_key',c.region_key,'ownership',c.ownership,'classification',c.classification,'selected_source',CASE WHEN c.classification='conflict' THEN coalesce((SELECT d.accepted_source FROM deliverable.merge_conflict m JOIN deliverable.merge_conflict_disposition d ON d.conflict_id=m.id WHERE m.comparison_id=c.id ORDER BY d.created_at DESC LIMIT 1),'unresolved') WHEN c.classification IN ('generated_region_change') THEN 'current' ELSE 'edited' END,'selected_region',CASE WHEN c.classification='generated_region_change' THEN c.current_region ELSE c.edited_region END) ORDER BY c.region_key),'[]'::jsonb) INTO accepted_regions FROM deliverable.artifact_region_comparison c WHERE c.import_id=i.id;
  limitations:=jsonb_build_object('accepted_reimport',true,'reimport_id',i.id,'edited_object_id',i.edited_object_id,'edited_digest',i.edited_digest,'regions',accepted_regions);
  result:=deliverable.create_revision(d.id,d.row_version,'reimport-'||i.id,encode(extensions.digest(i.id::text||p_reason,'sha256'),'hex'),basis,limitations,coalesce(nullif(current_setting('app.release_id',true),''),'development'),p_impact,p_reason);
  result:=result||jsonb_build_object('reimport_id',i.id,'status','accepted','accepted_revision_id',result->>'revision_id','idempotent_replayed',false);
  INSERT INTO deliverable.reimport_revision_lineage(account_id,deal_id,revision_id,import_id,edited_object_id,actor_id) VALUES(i.account_id,i.deal_id,(result->>'revision_id')::uuid,i.id,i.edited_object_id,app.policy_actor_id());
  UPDATE jobs.job SET accepted_inputs=accepted_inputs||jsonb_build_object('reimport_id',i.id,'accepted_regions',accepted_regions) WHERE id=(result->>'id')::uuid;
  UPDATE external_edit_import SET status='accepted',accepted_revision_id=(result->>'revision_id')::uuid,row_version=row_version+1,completed_at=now() WHERE id=i.id;
  INSERT INTO reimport_command_idempotency(account_id,deal_id,actor_id,command_type,key_hash,request_digest,import_id,response) VALUES(i.account_id,i.deal_id,app.policy_actor_id(),'accept_reimport',p_key_hash,p_request_digest,i.id,result);
  RETURN result;
END $$;

REVOKE EXECUTE ON FUNCTION deliverable.create_reimport_session(uuid,text,uuid,jsonb),deliverable.finalize_reimport(uuid,uuid,text,jsonb,jsonb),deliverable.record_merge_conflict_disposition(uuid,bigint,uuid,text,text,text),deliverable.accept_reimport(uuid,bigint,uuid,text) FROM PUBLIC,app_runtime;
GRANT EXECUTE ON FUNCTION deliverable.create_reimport_session(uuid,text,uuid,jsonb,text,text),deliverable.finalize_reimport(uuid,uuid,text,jsonb,jsonb,text,text),deliverable.record_merge_conflict_disposition(uuid,uuid,bigint,uuid,text,text,text,text,text),deliverable.accept_reimport(uuid,bigint,uuid,text,text,text) TO app_runtime;
