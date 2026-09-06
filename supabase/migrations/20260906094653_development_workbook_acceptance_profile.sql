GRANT CREATE ON SCHEMA deliverable TO app_deliverable_owner;
-- ADR 0043: exact synthetic Revision opt-in, never an Account runtime setting.
CREATE TABLE deliverable.development_acceptance_scope (
 revision_id uuid PRIMARY KEY,account_id uuid NOT NULL,deal_id uuid NOT NULL,
 profile text NOT NULL CHECK(profile='development_foss_v1'),reason text NOT NULL CHECK(length(reason) BETWEEN 20 AND 2000),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(account_id,deal_id,revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id)
);
ALTER TABLE deliverable.development_acceptance_scope ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable.development_acceptance_scope FORCE ROW LEVEL SECURITY;
CREATE POLICY artifact_command_scope ON deliverable.development_acceptance_scope FOR SELECT TO app_deliverable_owner USING(account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal());
GRANT SELECT ON deliverable.development_acceptance_scope TO app_deliverable_owner;
CREATE TRIGGER artifact_immutable BEFORE UPDATE OR DELETE ON deliverable.development_acceptance_scope FOR EACH ROW EXECUTE FUNCTION deliverable.immutable_record();
CREATE FUNCTION deliverable.require_synthetic_acceptance() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM deliverable.deliverable_revision WHERE id=NEW.revision_id AND build_input->>'provenance'='synthetic') THEN RAISE EXCEPTION 'synthetic_revision_required';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION deliverable.require_synthetic_acceptance() FROM PUBLIC;
CREATE TRIGGER synthetic_acceptance_scope BEFORE INSERT ON deliverable.development_acceptance_scope FOR EACH ROW EXECUTE FUNCTION deliverable.require_synthetic_acceptance();
ALTER TABLE deliverable.office_compatibility_run DROP CONSTRAINT office_compatibility_run_platform_check;
ALTER TABLE deliverable.office_compatibility_run ADD CONSTRAINT office_compatibility_run_platform_check CHECK(platform IN ('windows','macos','linux'));

CREATE OR REPLACE FUNCTION deliverable.assess_readiness(p_revision uuid,p_purpose text,p_audience text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE revision deliverable.deliverable_revision%ROWTYPE; checks jsonb; result jsonb; requirements jsonb; posture text:='working_draft'; req record; outcome text; basis text; profile text:='production_v1'; latest_office jsonb;
BEGIN
 SELECT * INTO revision FROM deliverable.deliverable_revision WHERE id=p_revision; IF NOT FOUND THEN RAISE EXCEPTION 'artifact_scope_unavailable'; END IF;
 SELECT q.checks INTO checks FROM deliverable.qc_run q WHERE revision_id=p_revision ORDER BY created_at DESC LIMIT 1;
 IF revision.build_input->>'provenance'='synthetic' AND EXISTS(SELECT 1 FROM deliverable.development_acceptance_scope ds WHERE ds.revision_id=p_revision AND ds.profile='development_foss_v1') THEN profile:='development_foss_v1';END IF;
 SELECT evidence INTO latest_office FROM deliverable.review WHERE revision_id=p_revision AND purpose=p_purpose AND audience=p_audience AND standard='office_roundtrip' ORDER BY created_at DESC,id DESC LIMIT 1;
 requirements:='[]';
 FOR req IN SELECT * FROM (VALUES
  ('controlled_inputs','analysis_ready','Complete controlled input authority'),('native_structure','analysis_ready','Inspect native formulas, names, scenarios and charts'),('method_review','analysis_ready','Record exact Banker method review'),
  ('recalculation','senior_review_ready','Recalculate exact stored native bytes'),('lineage','senior_review_ready','Inspect exact source-cell lineage'),('native_reader_parity','senior_review_ready','Compare native and reader content and layout'),('review_scope','senior_review_ready','Confirm purpose, audience and scope'),
  ('clean_copy','circulation_candidate','Provide licensed clean output'),('office_roundtrip','circulation_candidate','Verify declared Windows Microsoft 365 build and edit/save/reopen path'),('rights_confidentiality','circulation_candidate','Review exact rights and confidentiality'),('signed_manifest','circulation_candidate','Verify exact KMS signature and artifact hashes'),('professional_suitability','circulation_candidate','Record professional suitability for this use')) AS r(code,gate,recovery) LOOP
  outcome:=NULL;
  IF req.code IN ('method_review','review_scope','rights_confidentiality','professional_suitability','office_roundtrip') THEN
   SELECT CASE WHEN conclusion='passed' THEN 'passed' WHEN conclusion='failed' THEN 'failed' ELSE 'missing' END INTO outcome FROM deliverable.review WHERE revision_id=p_revision AND purpose=p_purpose AND audience=p_audience AND standard=req.code ORDER BY created_at DESC LIMIT 1;
  ELSE SELECT value->>'outcome' INTO outcome FROM jsonb_array_elements(coalesce(checks,'[]')) WHERE value->>'code'=req.code LIMIT 1; END IF;
  IF req.code='native_reader_parity' AND coalesce(outcome,'missing')='passed' THEN
   SELECT CASE WHEN conclusion='passed' THEN 'passed' WHEN conclusion='failed' THEN 'failed' ELSE 'missing' END INTO outcome FROM deliverable.review WHERE revision_id=p_revision AND purpose=p_purpose AND audience=p_audience AND standard='native_reader_parity' ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF req.code='controlled_inputs' AND NOT deliverable.output_scope_current(p_revision) THEN outcome:='failed';END IF;
  IF req.code='office_roundtrip' AND outcome='passed' AND NOT EXISTS(
   SELECT 1 FROM deliverable.office_compatibility_run l
   WHERE l.revision_id=p_revision AND l.outcome='passed'
   AND latest_office->>'report_sha256'=l.report_sha256 AND latest_office->>'build'=l.build AND latest_office->>'application'=l.application
   AND latest_office->>'native_sha256'=l.native_sha256 AND latest_office->>'reader_sha256'=l.reader_sha256
   AND ((profile='production_v1' AND l.platform='windows' AND l.channel='current' AND l.application='Microsoft Excel')
     OR (profile='development_foss_v1' AND l.platform IN ('linux','macos') AND l.application='LibreOffice Calc' AND l.channel='other'
       AND length(l.build)>5 AND l.steps @> '{"open":true,"edit_notes":true,"save":true,"reopen":true,"reimport":true,"formulas":true,"names":true,"charts":true,"comments":true,"recalculation":true}'::jsonb))
   AND EXISTS(SELECT 1 FROM deliverable.artifact WHERE revision_id=p_revision AND role='native' AND plaintext_sha256=l.native_sha256)
   AND EXISTS(SELECT 1 FROM deliverable.artifact WHERE revision_id=p_revision AND role='reader' AND plaintext_sha256=l.reader_sha256)
  ) THEN outcome:='missing';END IF;
  IF req.code='signed_manifest' AND NOT EXISTS(SELECT 1 FROM deliverable.artifact_manifest m WHERE revision_id=p_revision
    AND ((profile='production_v1' AND m.key_version LIKE 'projects/%/cryptoKeyVersions/%' AND coalesce(m.canonical_payload::jsonb->'engine'->>'acceptance_profile','production_v1')='production_v1')
      OR (profile='development_foss_v1' AND m.key_version LIKE 'development/artifact/%' AND m.canonical_payload::jsonb->'engine'->>'acceptance_profile'=profile AND m.canonical_payload::jsonb->'engine'->>'name'='libreoffice.calc')) ) THEN outcome:='missing'; END IF;
  IF EXISTS(SELECT 1 FROM deliverable.qc_finding f WHERE revision_id=p_revision AND finding_code=req.code AND severity IN ('critical','major') AND NOT EXISTS(SELECT 1 FROM deliverable.finding_retest t WHERE t.finding_id=f.id AND t.outcome='passed')) THEN outcome:='failed'; END IF;
  IF profile='development_foss_v1' AND req.code='office_roundtrip' THEN req.recovery:='Verify exact declared LibreOffice build and open/edit/save/reopen/reimport receipt';END IF;
  IF profile='development_foss_v1' AND req.code='signed_manifest' THEN req.recovery:='Verify exact development Ed25519 signature and artifact hashes';END IF;
  requirements:=requirements||jsonb_build_array(jsonb_build_object('code',req.code,'gate',req.gate,'outcome',coalesce(outcome,'missing'),'recovery',req.recovery));
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(requirements) r WHERE r->>'outcome'='failed') THEN posture:='blocked';
 ELSE
  FOR req IN SELECT * FROM (VALUES('analysis_ready'),('senior_review_ready'),('circulation_candidate')) g(gate) LOOP
   EXIT WHEN EXISTS(SELECT 1 FROM jsonb_array_elements(requirements) r WHERE r->>'gate'=req.gate AND r->>'outcome'<>'passed'); posture:=req.gate;
  END LOOP;
 END IF;
 result:=jsonb_build_object('revision_id',p_revision,'purpose',p_purpose,'audience',p_audience,'posture',posture,'requirements',requirements,'blockers',(SELECT coalesce(jsonb_agg(r),'[]') FROM jsonb_array_elements(requirements) r WHERE r->>'outcome'<>'passed'),'external_use_authorized',false,'acceptance_profile',profile,'limitations',CASE WHEN profile='development_foss_v1' THEN '["Synthetic development acceptance only; Windows Excel compatibility and cloud KMS custody are unverified."]'::jsonb ELSE '[]'::jsonb END);
 basis:=encode(extensions.digest(result::text,'sha256'),'hex');
 INSERT INTO deliverable.readiness_assessment(account_id,deal_id,revision_id,purpose,audience,assessment,basis_digest) VALUES(revision.account_id,revision.deal_id,revision.id,p_purpose,p_audience,result,basis) ON CONFLICT DO NOTHING;
 RETURN result;
END $$;


REVOKE CREATE ON SCHEMA deliverable FROM app_deliverable_owner;
