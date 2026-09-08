-- Native artifact reimport: protected three-way reimport control plane. File bytes remain in
-- the Protected Object Gateway; these tables retain only exact identities,
-- digests, regions and immutable comparison receipts.
CREATE TABLE deliverable.external_edit_import (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL, deal_id uuid NOT NULL,
  export_id uuid NOT NULL, baseline_revision_id uuid NOT NULL, current_revision_id uuid NOT NULL,
  actor_id uuid NOT NULL REFERENCES app.actor(id), edited_object_id uuid, edited_digest text,
  baseline_manifest_digest text NOT NULL, edited_file jsonb NOT NULL DEFAULT '{}'::jsonb,
  compatibility_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'awaiting_upload' CHECK(status IN ('awaiting_upload','comparing','blocked','ready','conflicted','accepted','rejected')),
  row_version bigint NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
  FOREIGN KEY(account_id,deal_id,export_id) REFERENCES external_use.internal_export(account_id,deal_id,id),
  FOREIGN KEY(account_id,deal_id,baseline_revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id),
  FOREIGN KEY(account_id,deal_id,current_revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id),
  UNIQUE(account_id,deal_id,id)
);
ALTER TABLE deliverable.external_edit_import ADD COLUMN accepted_revision_id uuid;
ALTER TABLE deliverable.external_edit_import ADD CONSTRAINT external_edit_import_accepted_revision_fkey FOREIGN KEY(account_id,deal_id,accepted_revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id);
CREATE TABLE deliverable.artifact_region_comparison (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL, deal_id uuid NOT NULL,
  import_id uuid NOT NULL, region_key text NOT NULL, ownership text NOT NULL CHECK(ownership IN ('generated-owned','banker-owned','protected-formula','shared-merge','unmanaged')),
  classification text NOT NULL CHECK(classification IN ('unchanged','banker_edit','generated_region_change','source_formula_change','style_layout_change','comment_review_change','unsupported','requires_review','conflict')),
  baseline_region jsonb NOT NULL, edited_region jsonb NOT NULL, current_region jsonb NOT NULL, detail text NOT NULL, comparison_digest text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(account_id,deal_id,id), UNIQUE(import_id,region_key), FOREIGN KEY(account_id,deal_id,import_id) REFERENCES deliverable.external_edit_import(account_id,deal_id,id)
);
CREATE TABLE deliverable.merge_conflict (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL, deal_id uuid NOT NULL, import_id uuid NOT NULL, comparison_id uuid NOT NULL,
  conflict_kind text NOT NULL, posture text NOT NULL DEFAULT 'open' CHECK(posture IN ('open','resolved','rejected')),
  row_version bigint NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz,
  UNIQUE(account_id,deal_id,id), FOREIGN KEY(account_id,deal_id,import_id) REFERENCES deliverable.external_edit_import(account_id,deal_id,id), FOREIGN KEY(account_id,deal_id,comparison_id) REFERENCES deliverable.artifact_region_comparison(account_id,deal_id,id)
);
CREATE TABLE deliverable.merge_conflict_disposition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL, deal_id uuid NOT NULL, conflict_id uuid NOT NULL,
  human_decision_id uuid NOT NULL REFERENCES knowledge.human_decision(id), disposition text NOT NULL CHECK(disposition IN ('keep_banker','take_generated','manually_reconciled_import')),
  accepted_source text NOT NULL, rationale text NOT NULL CHECK(length(rationale) BETWEEN 20 AND 2000), created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(account_id,deal_id,conflict_id) REFERENCES deliverable.merge_conflict(account_id,deal_id,id)
);
ALTER TABLE deliverable.external_edit_import ENABLE ROW LEVEL SECURITY; ALTER TABLE deliverable.external_edit_import FORCE ROW LEVEL SECURITY;
ALTER TABLE deliverable.artifact_region_comparison ENABLE ROW LEVEL SECURITY; ALTER TABLE deliverable.artifact_region_comparison FORCE ROW LEVEL SECURITY;
ALTER TABLE deliverable.merge_conflict ENABLE ROW LEVEL SECURITY; ALTER TABLE deliverable.merge_conflict FORCE ROW LEVEL SECURITY;
ALTER TABLE deliverable.merge_conflict_disposition ENABLE ROW LEVEL SECURITY; ALTER TABLE deliverable.merge_conflict_disposition FORCE ROW LEVEL SECURITY;
CREATE POLICY native_reimport_import_runtime ON deliverable.external_edit_import FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY native_reimport_comparison_runtime ON deliverable.artifact_region_comparison FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY native_reimport_conflict_runtime ON deliverable.merge_conflict FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY native_reimport_disposition_runtime ON deliverable.merge_conflict_disposition FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
GRANT SELECT ON deliverable.external_edit_import,deliverable.artifact_region_comparison,deliverable.merge_conflict,deliverable.merge_conflict_disposition TO app_runtime;

CREATE OR REPLACE FUNCTION deliverable.create_reimport_session(p_export uuid,p_manifest_digest text,p_current_revision uuid,p_edited_file jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=deliverable,external_use,app,pg_catalog AS $$
DECLARE e external_use.internal_export%ROWTYPE; r external_use.export_review%ROWTYPE; i deliverable.external_edit_import%ROWTYPE;
BEGIN
 SELECT * INTO e FROM external_use.internal_export WHERE id=p_export AND account_id=app.policy_account_id() AND deal_id=app.policy_deal_id(); IF NOT FOUND THEN RAISE EXCEPTION 'reimport_export_unavailable'; END IF;
 SELECT * INTO r FROM external_use.export_review WHERE id=e.review_id AND account_id=e.account_id AND deal_id=e.deal_id;
 IF NOT EXISTS(SELECT 1 FROM deliverable.deliverable_revision WHERE id=p_current_revision AND account_id=e.account_id AND deal_id=e.deal_id) THEN RAISE EXCEPTION 'reimport_current_revision_unavailable'; END IF;
 IF p_manifest_digest IS NULL OR p_manifest_digest<>coalesce((SELECT encode(extensions.digest(manifest::text,'sha256'),'hex') FROM external_use.internal_export_object WHERE export_id=e.id),'') THEN RAISE EXCEPTION 'reimport_manifest_mismatch'; END IF;
 INSERT INTO deliverable.external_edit_import(account_id,deal_id,export_id,baseline_revision_id,current_revision_id,actor_id,baseline_manifest_digest,edited_file) VALUES(e.account_id,e.deal_id,e.id,e.revision_id,p_current_revision,app.policy_actor_id(),p_manifest_digest,coalesce(p_edited_file,'{}'::jsonb)) RETURNING * INTO i;
 RETURN jsonb_build_object('id',i.id,'status',i.status,'export_id',i.export_id,'baseline_revision_id',i.baseline_revision_id,'current_revision_id',i.current_revision_id,'row_version',i.row_version);
END $$;
CREATE OR REPLACE FUNCTION deliverable.finalize_reimport(p_import uuid,p_edited_object uuid,p_edited_digest text,p_comparisons jsonb,p_compatibility jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=deliverable,app,object_store,extensions,pg_catalog AS $$
DECLARE i external_edit_import%ROWTYPE; x jsonb; c artifact_region_comparison%ROWTYPE; open_conflicts integer:=0;
BEGIN
 SELECT * INTO i FROM external_edit_import WHERE id=p_import AND account_id=app.policy_account_id() AND deal_id=app.policy_deal_id() FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'reimport_not_found'; END IF;
 IF i.status NOT IN ('awaiting_upload','blocked') THEN RAISE EXCEPTION 'reimport_state_conflict'; END IF;
 IF NOT EXISTS(SELECT 1 FROM object_store.protected_object WHERE id=p_edited_object AND account_id=i.account_id AND deal_id=i.deal_id AND plaintext_sha256=p_edited_digest AND lifecycle_status='active') THEN RAISE EXCEPTION 'reimport_edited_object_unavailable'; END IF;
 IF jsonb_typeof(p_comparisons)<>'array' THEN RAISE EXCEPTION 'reimport_comparison_required'; END IF;
 UPDATE external_edit_import SET status='comparing',edited_object_id=p_edited_object,edited_digest=p_edited_digest,compatibility_result=coalesce(p_compatibility,'{}'::jsonb),row_version=row_version+1 WHERE id=i.id;
 FOR x IN SELECT value FROM jsonb_array_elements(p_comparisons) LOOP
   INSERT INTO artifact_region_comparison(account_id,deal_id,import_id,region_key,ownership,classification,baseline_region,edited_region,current_region,detail,comparison_digest)
   VALUES(i.account_id,i.deal_id,i.id,x->>'region_key',x->>'ownership',x->>'classification',coalesce(x->'baseline_region','{}'),coalesce(x->'edited_region','{}'),coalesce(x->'current_region','{}'),coalesce(x->>'detail',''),encode(extensions.digest(x::text,'sha256'),'hex')) RETURNING * INTO c;
   IF c.classification='conflict' THEN INSERT INTO merge_conflict(account_id,deal_id,import_id,comparison_id,conflict_kind) VALUES(i.account_id,i.deal_id,i.id,c.id,'shared_region'); END IF;
 END LOOP;
 SELECT count(*) INTO open_conflicts FROM merge_conflict WHERE import_id=i.id AND posture='open';
 UPDATE external_edit_import SET status=CASE WHEN coalesce((p_compatibility->>'automatic_merge')::boolean,false)=false THEN 'blocked' WHEN open_conflicts>0 THEN 'conflicted' ELSE 'ready' END,completed_at=now(),row_version=row_version+1 WHERE id=i.id;
 RETURN jsonb_build_object('id',i.id,'status',(SELECT status FROM external_edit_import WHERE id=i.id),'open_conflicts',open_conflicts);
END $$;
CREATE OR REPLACE FUNCTION deliverable.record_merge_conflict_disposition(p_conflict uuid,p_expected bigint,p_decision uuid,p_disposition text,p_source text,p_rationale text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=deliverable,app,pg_catalog AS $$
DECLARE c merge_conflict%ROWTYPE; d merge_conflict_disposition%ROWTYPE;
BEGIN
 SELECT * INTO c FROM merge_conflict WHERE id=p_conflict AND account_id=app.policy_account_id() AND deal_id=app.policy_deal_id() FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'reimport_conflict_not_found'; END IF;
 IF c.row_version<>p_expected OR c.posture<>'open' THEN RAISE EXCEPTION 'reimport_conflict_version'; END IF;
 IF p_disposition NOT IN ('keep_banker','take_generated','manually_reconciled_import') OR length(btrim(p_rationale))<20 THEN RAISE EXCEPTION 'reimport_disposition_invalid'; END IF;
 INSERT INTO merge_conflict_disposition(account_id,deal_id,conflict_id,human_decision_id,disposition,accepted_source,rationale) VALUES(c.account_id,c.deal_id,c.id,p_decision,p_disposition,p_source,p_rationale) RETURNING * INTO d;
 UPDATE merge_conflict SET posture='resolved',resolved_at=now(),row_version=row_version+1 WHERE id=c.id;
 UPDATE external_edit_import SET status=CASE WHEN NOT EXISTS(SELECT 1 FROM merge_conflict WHERE import_id=c.import_id AND posture='open') THEN 'ready' ELSE status END,row_version=row_version+1 WHERE id=c.import_id;
 RETURN jsonb_build_object('id',d.id,'conflict_id',d.conflict_id,'disposition',d.disposition,'status','resolved');
END $$;
CREATE OR REPLACE FUNCTION deliverable.accept_reimport(p_import uuid,p_expected bigint,p_impact uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=deliverable,analysis,app,pg_catalog AS $$
DECLARE i external_edit_import%ROWTYPE; d deliverable.deliverable%ROWTYPE; basis jsonb; result jsonb;
BEGIN
 SELECT * INTO i FROM external_edit_import WHERE id=p_import AND account_id=app.policy_account_id() AND deal_id=app.policy_deal_id() FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'reimport_not_found'; END IF;
 IF i.row_version<>p_expected OR i.status<>'ready' THEN RAISE EXCEPTION 'reimport_version'; END IF;
 IF EXISTS(SELECT 1 FROM merge_conflict WHERE import_id=i.id AND posture='open') THEN RAISE EXCEPTION 'reimport_conflicts_open'; END IF;
 IF length(btrim(p_reason))<20 THEN RAISE EXCEPTION 'reimport_acceptance_reason_required'; END IF;
 SELECT * INTO d FROM deliverable.deliverable WHERE account_id=i.account_id AND deal_id=i.deal_id AND current_revision_id=i.current_revision_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'reimport_current_revision_unavailable'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('calculation_run_id',x.calculation_run_id,'model_version_id',(SELECT model_version_id FROM deliverable.revision_model_version m WHERE m.revision_id=x.revision_id LIMIT 1),'scenario_version_id',(SELECT scenario_version_id FROM deliverable.revision_scenario_version s WHERE s.revision_id=x.revision_id LIMIT 1))),'[]'::jsonb) INTO basis FROM deliverable.revision_calculation_run x WHERE x.revision_id=i.current_revision_id;
 IF jsonb_array_length(basis)=0 THEN RAISE EXCEPTION 'reimport_controlled_basis_required'; END IF;
 result:=deliverable.create_revision(d.id,d.row_version,'reimport-'||i.id,encode(extensions.digest(i.id::text||p_reason,'sha256'),'hex'),basis,'{"accepted_reimport":true}'::jsonb,coalesce(nullif(current_setting('app.release_id',true),''),'development'),p_impact,p_reason);
 UPDATE external_edit_import SET status='accepted',accepted_revision_id=(result->>'revision_id')::uuid,row_version=row_version+1,completed_at=now() WHERE id=i.id;
 RETURN result||jsonb_build_object('reimport_id',i.id,'status','accepted','accepted_revision_id',result->>'revision_id');
END $$;
GRANT EXECUTE ON FUNCTION deliverable.create_reimport_session(uuid,text,uuid,jsonb),deliverable.finalize_reimport(uuid,uuid,text,jsonb,jsonb),deliverable.record_merge_conflict_disposition(uuid,bigint,uuid,text,text,text),deliverable.accept_reimport(uuid,bigint,uuid,text) TO app_runtime;
