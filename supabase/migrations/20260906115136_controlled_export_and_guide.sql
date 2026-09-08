CREATE SCHEMA external_use;
CREATE ROLE app_export_owner NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
GRANT app_runtime TO app_export_owner;
GRANT app_export_owner TO postgres;
GRANT USAGE,CREATE ON SCHEMA external_use TO app_export_owner;
GRANT USAGE ON SCHEMA external_use TO app_runtime,job_dispatcher,job_worker;

ALTER TABLE app.auth_session ADD COLUMN passkey_authenticated_at timestamptz,
 ADD COLUMN provider_session_id text;
GRANT CREATE ON SCHEMA app TO app_access_owner;
CREATE FUNCTION app.record_passkey_evidence(p_session text,p_time timestamptz,p_provider_session text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF p_time IS NULL OR p_time>clock_timestamp() OR length(p_provider_session) NOT BETWEEN 8 AND 200 THEN RAISE EXCEPTION 'passkey_evidence_invalid'; END IF;
 UPDATE app.auth_session SET passkey_authenticated_at=p_time,provider_session_id=p_provider_session
 WHERE token_hash=p_session AND account_id=app.policy_account_id() AND actor_id=app.policy_actor_id()
 AND expires_at>clock_timestamp() AND passkey_verified;
 IF NOT FOUND THEN RAISE EXCEPTION 'passkey_evidence_invalid';END IF;
END $$;
ALTER FUNCTION app.record_passkey_evidence(text,timestamptz,text) OWNER TO app_access_owner;
REVOKE ALL ON FUNCTION app.record_passkey_evidence(text,timestamptz,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.record_passkey_evidence(text,timestamptz,text) TO app_runtime;
REVOKE CREATE ON SCHEMA app FROM app_access_owner;

CREATE TABLE external_use.control_inspection (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_id uuid NOT NULL,deal_id uuid NOT NULL,actor_id uuid NOT NULL REFERENCES app.actor(id),
 revision_id uuid NOT NULL,checkpoint text NOT NULL CHECK(checkpoint IN ('evidence','decision_validation','native','reader','readiness')),
 basis_digest text NOT NULL,observed_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(account_id,deal_id,actor_id,revision_id,checkpoint,basis_digest),
 FOREIGN KEY(account_id,deal_id,revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id)
);
CREATE TABLE external_use.first_value (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_id uuid NOT NULL,deal_id uuid NOT NULL UNIQUE,actor_id uuid NOT NULL REFERENCES app.actor(id),
 revision_id uuid NOT NULL,basis jsonb NOT NULL,recorded_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(account_id,deal_id,revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id)
);
CREATE TABLE external_use.export_review (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_id uuid NOT NULL,deal_id uuid NOT NULL,actor_id uuid NOT NULL REFERENCES app.actor(id),
 revision_id uuid NOT NULL,purpose text NOT NULL CHECK(purpose IN ('inspection','native_editing','backup','controlled_reimport')),
 scope jsonb NOT NULL,dependency_digest text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(account_id,deal_id,id),FOREIGN KEY(account_id,deal_id,revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id)
);
CREATE TABLE external_use.internal_export (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_id uuid NOT NULL,deal_id uuid NOT NULL,actor_id uuid NOT NULL REFERENCES app.actor(id),
 review_id uuid NOT NULL,revision_id uuid NOT NULL,job_id uuid NOT NULL UNIQUE REFERENCES jobs.job(id),
 idempotency_hash text NOT NULL,command_digest text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(account_id,deal_id,id),UNIQUE(account_id,deal_id,actor_id,idempotency_hash),
 FOREIGN KEY(account_id,deal_id,review_id) REFERENCES external_use.export_review(account_id,deal_id,id),
 FOREIGN KEY(account_id,deal_id,revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id)
);
CREATE TABLE external_use.internal_export_object (
 export_id uuid PRIMARY KEY,account_id uuid NOT NULL,deal_id uuid NOT NULL,protected_object_id uuid NOT NULL,
 manifest jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(account_id,deal_id,export_id) REFERENCES external_use.internal_export(account_id,deal_id,id),
 FOREIGN KEY(account_id,protected_object_id) REFERENCES object_store.protected_object(account_id,id)
);
CREATE TABLE external_use.guide_graduation (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_id uuid NOT NULL,deal_id uuid NOT NULL UNIQUE,actor_id uuid NOT NULL REFERENCES app.actor(id),
 first_value_id uuid NOT NULL REFERENCES external_use.first_value(id),export_id uuid NOT NULL,
 intent text NOT NULL CHECK(intent='enter_deal_execution_desk'),occurred_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(account_id,deal_id,export_id) REFERENCES external_use.internal_export(account_id,deal_id,id)
);
CREATE TABLE external_use.measurement_event (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_id uuid NOT NULL,deal_id uuid NOT NULL,
 event_code text NOT NULL CHECK(event_code IN ('first_value_completed','internal_export_completed','guide_graduated')),
 definition_version text NOT NULL DEFAULT 'controlled-loop-1.0.0',dedupe_digest text NOT NULL UNIQUE,
 dimensions jsonb NOT NULL,occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE external_use.sensitive_action_grant (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_id uuid NOT NULL,deal_id uuid NOT NULL,actor_id uuid NOT NULL REFERENCES app.actor(id),
 session_hash text NOT NULL,provider_session_id text NOT NULL,token_hash text NOT NULL UNIQUE,
 action text NOT NULL CHECK(action IN ('internal_controlled_export','export_object_retrieval')),
 review_id uuid,export_id uuid,command_digest text NOT NULL,dependency_digest text NOT NULL,idempotency_hash text NOT NULL,
 security_epoch bigint NOT NULL,posture_version bigint NOT NULL,issued_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT(now()+interval '5 minutes'),consumed_at timestamptz,
 CHECK((action='internal_controlled_export' AND review_id IS NOT NULL AND export_id IS NULL) OR (action='export_object_retrieval' AND export_id IS NOT NULL AND review_id IS NULL)),
 FOREIGN KEY(account_id,deal_id,review_id) REFERENCES external_use.export_review(account_id,deal_id,id),
 FOREIGN KEY(account_id,deal_id,export_id) REFERENCES external_use.internal_export(account_id,deal_id,id)
);
CREATE TABLE external_use.stream_grant (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_id uuid NOT NULL,deal_id uuid NOT NULL,export_id uuid NOT NULL,
 session_hash text NOT NULL,token_hash text NOT NULL UNIQUE,security_epoch bigint NOT NULL,posture_version bigint NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT(now()+interval '5 minutes'),
 FOREIGN KEY(account_id,deal_id,export_id) REFERENCES external_use.internal_export(account_id,deal_id,id)
);
CREATE TABLE external_use.export_job (
 job_id uuid PRIMARY KEY REFERENCES jobs.job(id),account_id uuid NOT NULL,deal_id uuid NOT NULL,actor_id uuid NOT NULL,
 export_id uuid NOT NULL,lease_hash text,lease_expires_at timestamptz,attempt integer NOT NULL DEFAULT 0,finished boolean NOT NULL DEFAULT false,
 FOREIGN KEY(account_id,deal_id,export_id) REFERENCES external_use.internal_export(account_id,deal_id,id)
);

DO $$ DECLARE t text;BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='external_use' LOOP
  EXECUTE format('ALTER TABLE external_use.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE external_use.%I FORCE ROW LEVEL SECURITY',t);
  IF t='export_job' THEN
   EXECUTE format('CREATE POLICY export_queue_owner ON external_use.%I TO app_export_owner USING(true) WITH CHECK(true)',t);
  ELSE
   EXECUTE format('CREATE POLICY export_owner_scope ON external_use.%I TO app_export_owner USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id()) WITH CHECK(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id())',t);
   IF t NOT IN ('sensitive_action_grant','stream_grant') THEN
    EXECUTE format('CREATE POLICY export_read_scope ON external_use.%I FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id())',t);
    EXECUTE format('GRANT SELECT ON external_use.%I TO app_runtime',t);
    EXECUTE format('CREATE TRIGGER export_immutable BEFORE UPDATE OR DELETE ON external_use.%I FOR EACH ROW EXECUTE FUNCTION deliverable.immutable_record()',t);
   END IF;
  END IF;
 END LOOP;
END $$;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA external_use TO app_export_owner;
GRANT SELECT ON app.auth_session,app.account_actor TO app_export_owner;
CREATE POLICY export_session ON app.auth_session FOR SELECT TO app_export_owner USING(account_id=app.policy_account_id() AND actor_id=app.policy_actor_id());
CREATE POLICY export_actor ON app.account_actor FOR SELECT TO app_export_owner USING(account_id=app.policy_account_id() AND actor_id=app.policy_actor_id());

CREATE FUNCTION external_use.loop_basis(p_revision uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE r deliverable.deliverable_revision%ROWTYPE; result jsonb;
BEGIN
 SELECT * INTO r FROM deliverable.deliverable_revision WHERE id=p_revision;
 IF NOT FOUND THEN RAISE EXCEPTION 'export_scope_unavailable';END IF;
 SELECT jsonb_build_object(
  'revision',to_jsonb(r)-'build_input','calculations',r.build_input->'calculations','limitations',coalesce(r.build_input->'limitations','[]'),
  'artifacts',(SELECT coalesce(jsonb_agg(to_jsonb(a)-'protected_object_id' ORDER BY a.id),'[]') FROM deliverable.artifact a WHERE a.revision_id=r.id),
  'lineage',(SELECT coalesce(jsonb_agg(to_jsonb(l)||jsonb_build_object('native_locator',ar.native_locator) ORDER BY l.id),'[]') FROM deliverable.artifact_region_lineage l JOIN deliverable.artifact_region ar ON ar.id=l.region_id JOIN deliverable.artifact a ON a.id=ar.artifact_id WHERE a.revision_id=r.id),
  'decisions',(SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.id),'[]') FROM knowledge.human_decision d WHERE d.id IN (SELECT l.decision_id FROM deliverable.artifact_region_lineage l JOIN deliverable.artifact_region ar ON ar.id=l.region_id JOIN deliverable.artifact a ON a.id=ar.artifact_id WHERE a.revision_id=r.id)),
  'evidence',(SELECT coalesce(jsonb_agg(to_jsonb(e)||jsonb_build_object('locator',to_jsonb(n)) ORDER BY e.id),'[]') FROM knowledge.evidence e JOIN knowledge.native_locator n ON n.id=e.native_locator_id WHERE e.id IN (SELECT er.evidence_id FROM knowledge.evidence_relationship er JOIN knowledge.human_decision_evidence he ON he.evidence_relationship_id=er.id WHERE he.decision_id IN (SELECT l.decision_id FROM deliverable.artifact_region_lineage l JOIN deliverable.artifact_region ar ON ar.id=l.region_id JOIN deliverable.artifact a ON a.id=ar.artifact_id WHERE a.revision_id=r.id))),
  'validations',(SELECT coalesce(jsonb_agg(to_jsonb(v) ORDER BY v.id),'[]') FROM analysis.deterministic_validation_record v WHERE v.calculation_run_id IN (SELECT calculation_run_id FROM deliverable.revision_calculation_run WHERE revision_id=r.id)),
  'reviews',(SELECT coalesce(jsonb_agg(to_jsonb(v) ORDER BY v.id),'[]') FROM deliverable.review v WHERE v.revision_id=r.id),
  'qc',(SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.id),'[]') FROM deliverable.qc_run q WHERE q.revision_id=r.id),
  'findings',(SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY f.id),'[]') FROM deliverable.qc_finding f WHERE f.revision_id=r.id),
  'manifest',(SELECT to_jsonb(m)||jsonb_build_object('public_key_pem',k.public_key_pem) FROM deliverable.artifact_manifest m JOIN deliverable.integrity_key k USING(key_version) WHERE m.revision_id=r.id),
  'readiness',deliverable.assess_readiness(r.id,r.purpose,r.audience)
 ) INTO result;
 RETURN result;
END $$;

CREATE FUNCTION external_use.guide_projection() RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE r uuid; basis jsonb; f jsonb; g jsonb; ex jsonb; checks jsonb:='[]'; item record; okay boolean; has_basis boolean;
BEGIN
 SELECT to_jsonb(v) INTO f FROM external_use.first_value v WHERE deal_id=app.policy_deal_id();
 SELECT to_jsonb(v) INTO g FROM external_use.guide_graduation v WHERE deal_id=app.policy_deal_id();
 SELECT v.id INTO r FROM deliverable.deliverable_revision v ORDER BY v.created_at DESC,v.id DESC LIMIT 1;
 IF f IS NOT NULL THEN r:=(f->>'revision_id')::uuid;END IF;
 IF r IS NOT NULL THEN basis:=external_use.loop_basis(r);END IF;
 SELECT to_jsonb(e)||jsonb_build_object('state',j.state) INTO ex FROM external_use.internal_export e JOIN jobs.job j ON j.id=e.job_id
  WHERE e.revision_id=r AND j.state='completed' ORDER BY e.created_at LIMIT 1;
 FOR item IN SELECT * FROM (VALUES
 ('preflight','Deal identity and Paid Preflight','controls/preflight'),('source_perimeter','Accept the Source perimeter','sources'),
 ('packet_objective','Source Packet and Work Objective','sources'),('processing','Observe controlled work','analysis'),
 ('evidence','Inspect exact Evidence','guide/inspect'),('decision','Record a typed Banker Decision','evidence-decisions'),
 ('deterministic','Inspect deterministic validation','guide/inspect'),('artifacts','Inspect Native and Reader results','guide/inspect'),
 ('readiness','Inspect QC and Package Readiness','guide/inspect'),('internal_export','Create Internal Controlled Export','history-portability/internal-export'),
 ('graduation','Enter Deal Execution Desk','guide/completion')) v(code,title,route) LOOP
  okay:=false;
  CASE item.code
   WHEN 'preflight' THEN okay:=EXISTS(SELECT 1 FROM app.deal_workspace WHERE deal_id=app.policy_deal_id() AND paid_preflight_status IN ('pass','limited-proceed') AND processing_posture='permitted');
   WHEN 'source_perimeter' THEN okay:=EXISTS(SELECT 1 FROM source.source_record WHERE accepted_at IS NOT NULL AND disposition_code='current');
   WHEN 'packet_objective' THEN okay:=EXISTS(SELECT 1 FROM app.work_objective WHERE packet_version_id IS NOT NULL);
   WHEN 'processing' THEN okay:=r IS NOT NULL AND jsonb_array_length(coalesce(basis->'calculations','[]'))>0;
   WHEN 'evidence' THEN okay:=EXISTS(SELECT 1 FROM external_use.control_inspection WHERE revision_id=r AND actor_id=app.policy_actor_id() AND checkpoint='evidence');
   WHEN 'decision' THEN okay:=jsonb_array_length(coalesce(basis->'decisions','[]'))>0;
   WHEN 'deterministic' THEN okay:=EXISTS(SELECT 1 FROM external_use.control_inspection WHERE revision_id=r AND actor_id=app.policy_actor_id() AND checkpoint='decision_validation');
   WHEN 'artifacts' THEN okay:=(SELECT count(DISTINCT checkpoint)=2 FROM external_use.control_inspection WHERE revision_id=r AND actor_id=app.policy_actor_id() AND checkpoint IN ('native','reader'));
   WHEN 'readiness' THEN okay:=EXISTS(SELECT 1 FROM external_use.control_inspection WHERE revision_id=r AND actor_id=app.policy_actor_id() AND checkpoint='readiness');
   WHEN 'internal_export' THEN okay:=ex IS NOT NULL;
   WHEN 'graduation' THEN okay:=g IS NOT NULL;
  END CASE;
  checks:=checks||jsonb_build_array(jsonb_build_object('code',item.code,'title',item.title,'route',item.route,'status',CASE WHEN okay THEN 'completed' ELSE 'waiting' END));
 END LOOP;
 RETURN jsonb_build_object('status',CASE WHEN g IS NOT NULL THEN 'graduated' WHEN f IS NOT NULL THEN 'first_value_completed' ELSE 'in_progress' END,
  'mode',CASE WHEN g IS NULL THEN 'guide' ELSE 'execution_desk' END,'revision_id',r,'first_value',f,'graduation',g,'first_export',ex,'checkpoints',checks,
  'current_action',(SELECT value->>'route' FROM jsonb_array_elements(checks) WHERE value->>'status'<>'completed' LIMIT 1),
  'etag',(SELECT row_version FROM app.deal WHERE id=app.policy_deal_id()));
END $$;

CREATE FUNCTION external_use.graduate_guide(p_expected bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE f external_use.first_value%ROWTYPE; ex uuid; g external_use.guide_graduation%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('guide:'||app.policy_deal_id()::text,0));
 SELECT * INTO g FROM external_use.guide_graduation WHERE deal_id=app.policy_deal_id();IF FOUND THEN RETURN to_jsonb(g);END IF;
 SELECT * INTO f FROM external_use.first_value WHERE deal_id=app.policy_deal_id();
 SELECT e.id INTO ex FROM external_use.internal_export e JOIN jobs.job j ON j.id=e.job_id WHERE e.revision_id=f.revision_id AND j.state='completed' ORDER BY e.created_at LIMIT 1;
 IF f.id IS NULL OR ex IS NULL THEN RAISE EXCEPTION 'guide_prerequisites_incomplete';END IF;
 IF NOT EXISTS(SELECT 1 FROM app.deal WHERE id=app.policy_deal_id() AND row_version=p_expected) THEN RAISE EXCEPTION 'export_version_conflict';END IF;
 INSERT INTO external_use.guide_graduation(account_id,deal_id,actor_id,first_value_id,export_id,intent)
 VALUES(app.policy_account_id(),app.policy_deal_id(),app.policy_actor_id(),f.id,ex,'enter_deal_execution_desk') RETURNING * INTO g;
 PERFORM app.record_audit('guide.graduated','completed','guide_graduation',g.id::text,'explicit_desk_entry',gen_random_uuid()::text);
 INSERT INTO external_use.measurement_event(account_id,deal_id,event_code,dedupe_digest,dimensions)
 VALUES(g.account_id,g.deal_id,'guide_graduated',encode(extensions.digest(g.id::text,'sha256'),'hex'),'{"scope":"same_deal","external_authority":false}');
 RETURN to_jsonb(g);
END $$;

DO $$ DECLARE fn record;BEGIN
 FOR fn IN SELECT p.oid::regprocedure AS name FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='external_use' LOOP
  EXECUTE format('ALTER FUNCTION %s OWNER TO app_export_owner',fn.name);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',fn.name);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO app_runtime',fn.name);
 END LOOP;
END $$;
REVOKE CREATE ON SCHEMA external_use FROM app_export_owner;
