-- Temporary ownership-transfer privilege for managed Supabase migration admin.
GRANT CREATE ON SCHEMA deliverable TO app_deliverable_owner;
-- Office compatibility is recorded by the isolated acceptance lab, never manufactured by an online Review command.
CREATE TABLE deliverable.office_compatibility_run (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_id uuid NOT NULL,deal_id uuid NOT NULL,revision_id uuid NOT NULL,
 native_sha256 text NOT NULL CHECK(native_sha256 ~ '^[a-f0-9]{64}$'), reader_sha256 text NOT NULL CHECK(reader_sha256 ~ '^[a-f0-9]{64}$'),
 report_sha256 text NOT NULL CHECK(report_sha256 ~ '^[a-f0-9]{64}$'),platform text NOT NULL CHECK(platform IN ('windows','macos')),
 channel text NOT NULL CHECK(channel IN ('current','other')),application text NOT NULL,build text NOT NULL,
 outcome text NOT NULL CHECK(outcome IN ('passed','failed')),steps jsonb NOT NULL,recorded_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(account_id,deal_id,revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id)
);
ALTER TABLE deliverable.office_compatibility_run ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable.office_compatibility_run FORCE ROW LEVEL SECURITY;
CREATE POLICY artifact_read_scope ON deliverable.office_compatibility_run FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY artifact_command_scope ON deliverable.office_compatibility_run FOR SELECT TO app_deliverable_owner USING(account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal());
GRANT SELECT ON deliverable.office_compatibility_run TO app_runtime,app_deliverable_owner;
CREATE TRIGGER artifact_immutable BEFORE UPDATE OR DELETE ON deliverable.office_compatibility_run FOR EACH ROW EXECUTE FUNCTION deliverable.immutable_record();
-- Only a migration/admin lab identity can insert the independently observed receipt. It is not a runtime permission.
CREATE FUNCTION deliverable.output_scope_current(p_revision uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE row deliverable.deliverable_revision%ROWTYPE; BEGIN
 SELECT * INTO row FROM deliverable.deliverable_revision WHERE id=p_revision;IF NOT FOUND OR row.work_objective_id IS NULL THEN RETURN false;END IF;
 PERFORM source.get_packet_worker_input(row.account_id,row.deal_id,row.packet_version_id,row.work_objective_id,'native_artifact');
 PERFORM source.get_packet_worker_input(row.account_id,row.deal_id,row.packet_version_id,row.work_objective_id,'reader_copy');RETURN true;
 EXCEPTION WHEN insufficient_privilege THEN RETURN false;
END $$;
ALTER FUNCTION deliverable.output_scope_current(uuid) OWNER TO app_deliverable_owner;
REVOKE ALL ON FUNCTION deliverable.output_scope_current(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION deliverable.assess_readiness(p_revision uuid,p_purpose text,p_audience text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE revision deliverable.deliverable_revision%ROWTYPE; checks jsonb; result jsonb; requirements jsonb; posture text:='working_draft'; req record; outcome text; basis text;
BEGIN
 SELECT * INTO revision FROM deliverable.deliverable_revision WHERE id=p_revision; IF NOT FOUND THEN RAISE EXCEPTION 'artifact_scope_unavailable'; END IF;
 SELECT q.checks INTO checks FROM deliverable.qc_run q WHERE revision_id=p_revision ORDER BY created_at DESC LIMIT 1;
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
   SELECT 1 FROM deliverable.office_compatibility_run l JOIN deliverable.review r ON r.revision_id=l.revision_id AND r.evidence->>'report_sha256'=l.report_sha256 AND r.evidence->>'build'=l.build
   WHERE l.revision_id=p_revision AND l.platform='windows' AND l.channel='current' AND l.application='Microsoft Excel' AND l.outcome='passed' AND r.standard='office_roundtrip' AND r.conclusion='passed' AND r.purpose=p_purpose AND r.audience=p_audience
   AND EXISTS(SELECT 1 FROM deliverable.artifact WHERE revision_id=p_revision AND role='native' AND plaintext_sha256=l.native_sha256)
   AND EXISTS(SELECT 1 FROM deliverable.artifact WHERE revision_id=p_revision AND role='reader' AND plaintext_sha256=l.reader_sha256)
  ) THEN outcome:='missing';END IF;
  IF req.code='signed_manifest' AND NOT EXISTS(SELECT 1 FROM deliverable.artifact_manifest WHERE revision_id=p_revision) THEN outcome:='missing'; END IF;
  IF EXISTS(SELECT 1 FROM deliverable.qc_finding f WHERE revision_id=p_revision AND finding_code=req.code AND severity IN ('critical','major') AND NOT EXISTS(SELECT 1 FROM deliverable.finding_retest t WHERE t.finding_id=f.id AND t.outcome='passed')) THEN outcome:='failed'; END IF;
  requirements:=requirements||jsonb_build_array(jsonb_build_object('code',req.code,'gate',req.gate,'outcome',coalesce(outcome,'missing'),'recovery',req.recovery));
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(requirements) r WHERE r->>'outcome'='failed') THEN posture:='blocked';
 ELSE
  FOR req IN SELECT * FROM (VALUES('analysis_ready'),('senior_review_ready'),('circulation_candidate')) g(gate) LOOP
   EXIT WHEN EXISTS(SELECT 1 FROM jsonb_array_elements(requirements) r WHERE r->>'gate'=req.gate AND r->>'outcome'<>'passed'); posture:=req.gate;
  END LOOP;
 END IF;
 result:=jsonb_build_object('revision_id',p_revision,'purpose',p_purpose,'audience',p_audience,'posture',posture,'requirements',requirements,'blockers',(SELECT coalesce(jsonb_agg(r),'[]') FROM jsonb_array_elements(requirements) r WHERE r->>'outcome'<>'passed'),'external_use_authorized',false);
 basis:=encode(extensions.digest(result::text,'sha256'),'hex');
 INSERT INTO deliverable.readiness_assessment(account_id,deal_id,revision_id,purpose,audience,assessment,basis_digest) VALUES(revision.account_id,revision.deal_id,revision.id,p_purpose,p_audience,result,basis) ON CONFLICT DO NOTHING;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION deliverable.build_input(p_deliverable uuid,p_revision uuid,p_basis jsonb,p_limitations jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE parent deliverable.deliverable%ROWTYPE; basis jsonb; run analysis.calculation_run%ROWTYPE; ver analysis.calculation_version%ROWTYPE;
 scenario analysis.scenario_version%ROWTYPE; measure analysis.calculation_input_measure%ROWTYPE; fact knowledge.fact%ROWTYPE; assumption knowledge.assumption%ROWTYPE;
 locator record; decision uuid; measures jsonb; calculations jsonb:='[]'; actual_forecast text; source_classes text[]:=ARRAY[]::text[];
BEGIN
 SELECT * INTO parent FROM deliverable.deliverable WHERE id=p_deliverable; IF NOT FOUND THEN RAISE EXCEPTION 'artifact_scope_unavailable'; END IF;
 IF jsonb_typeof(p_basis)<>'array' OR jsonb_array_length(p_basis) NOT BETWEEN 1 AND 24 THEN RAISE EXCEPTION 'controlled_basis_required'; END IF;
 FOR basis IN SELECT value FROM jsonb_array_elements(p_basis) LOOP
  SELECT * INTO run FROM analysis.calculation_run WHERE id=(basis->>'calculation_run_id')::uuid AND account_id=parent.account_id AND deal_id=parent.deal_id;
  IF NOT FOUND OR run.coverage<>'complete' OR (run.result->>'passed')::boolean IS DISTINCT FROM true OR EXISTS(SELECT 1 FROM jsonb_array_elements(run.checks) c WHERE c->>'outcome'<>'passed') THEN RAISE EXCEPTION 'calculation_integrity_failed'; END IF;
  SELECT * INTO ver FROM analysis.calculation_version WHERE id=run.calculation_version_id AND account_id=parent.account_id AND deal_id=parent.deal_id;
  IF ver.method_code<>'ev_to_equity_tie_out' THEN RAISE EXCEPTION 'unsupported_formula'; END IF;
  IF NOT EXISTS(SELECT 1 FROM analysis.model_version_calculation WHERE model_version_id=(basis->>'model_version_id')::uuid AND calculation_version_id=ver.id AND account_id=parent.account_id AND deal_id=parent.deal_id) THEN RAISE EXCEPTION 'model_basis_mismatch'; END IF;
  SELECT * INTO scenario FROM analysis.scenario_version WHERE id=(basis->>'scenario_version_id')::uuid AND model_version_id=(basis->>'model_version_id')::uuid AND account_id=parent.account_id AND deal_id=parent.deal_id;
  IF NOT FOUND OR scenario.overrides<>'{}'::jsonb THEN RAISE EXCEPTION 'scenario_calculation_not_pinned'; END IF;
  measures:='[]';
  FOR measure IN SELECT * FROM analysis.calculation_input_measure WHERE calculation_version_id=ver.id AND account_id=parent.account_id AND deal_id=parent.deal_id ORDER BY measure_key LOOP
   IF measure.measure_key NOT IN ('enterprise_value','cash','debt') OR num_nonnulls(measure.fact_id,measure.assumption_id)<>1 OR (run.inputs->>measure.measure_key)::numeric IS DISTINCT FROM measure.value_text::numeric THEN RAISE EXCEPTION 'controlled_input_authority_required'; END IF;
   decision:=NULL; actual_forecast:='unknown';
   IF measure.fact_id IS NOT NULL THEN
    SELECT * INTO fact FROM knowledge.fact WHERE id=measure.fact_id AND account_id=parent.account_id AND deal_id=parent.deal_id;
    IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM knowledge.fact_current_selection WHERE current_fact_id=fact.id) OR fact.value_text::numeric IS DISTINCT FROM measure.value_text::numeric OR (fact.period,fact.unit,fact.currency,fact.sign) IS DISTINCT FROM (measure.period,measure.unit,measure.currency,measure.sign) THEN RAISE EXCEPTION 'fact_basis_changed'; END IF;
    decision:=fact.acceptance_decision_id;
   ELSE
    SELECT * INTO assumption FROM knowledge.assumption WHERE id=measure.assumption_id AND account_id=parent.account_id AND deal_id=parent.deal_id;
    IF NOT FOUND OR assumption.value_text::numeric IS DISTINCT FROM measure.value_text::numeric THEN RAISE EXCEPTION 'assumption_basis_mismatch'; END IF;
    SELECT decision_id INTO decision FROM knowledge.assumption_decision WHERE assumption_id=assumption.id AND decision_id=measure.decision_id AND account_id=parent.account_id AND deal_id=parent.deal_id;
    actual_forecast:=CASE WHEN assumption.bounds->>'actual_forecast' IN ('actual','forecast') THEN assumption.bounds->>'actual_forecast' ELSE 'unknown' END;
   END IF;
   IF decision IS NULL OR decision IS DISTINCT FROM measure.decision_id OR NOT EXISTS(SELECT 1 FROM knowledge.human_decision WHERE id=decision AND (expires_at IS NULL OR expires_at>now()) AND NOT EXISTS(SELECT 1 FROM knowledge.human_decision newer WHERE newer.reverses_decision_id=decision OR newer.supersedes_decision_id=decision)) THEN RAISE EXCEPTION 'input_decision_not_current'; END IF;
   SELECT n.source_record_id,n.representation_id,n.selector,s.content_sha256,s.provenance_class,s.confidentiality_class INTO locator
    FROM knowledge.human_decision_evidence de JOIN knowledge.evidence_relationship er ON er.id=de.evidence_relationship_id
    JOIN knowledge.evidence e ON e.id=er.evidence_id JOIN knowledge.native_locator n ON n.id=e.native_locator_id
    JOIN source.source_record s ON s.id=n.source_record_id
    WHERE de.decision_id=decision AND de.account_id=parent.account_id AND de.deal_id=parent.deal_id AND n.resolution_status='resolved'
      AND n.selector=measure.source_locator AND s.disposition_code='accepted' ORDER BY n.id LIMIT 1;
   IF measure.fact_id IS NOT NULL AND locator.source_record_id IS NULL THEN RAISE EXCEPTION 'exact_source_locator_required'; END IF;
   IF locator.source_record_id IS NOT NULL THEN
    source_classes:=array_append(source_classes,locator.provenance_class);
    IF array_position(ARRAY['public','internal','confidential','restricted'],parent.confidentiality)<array_position(ARRAY['public','internal','confidential','restricted'],locator.confidentiality_class) THEN RAISE EXCEPTION 'artifact_confidentiality_downgrade'; END IF;
    SELECT n.actual_forecast INTO actual_forecast FROM analysis.normalized_financial_value n WHERE n.decision_id=decision AND n.value_text=measure.value_text AND n.source_locator=measure.source_locator ORDER BY n.created_at DESC LIMIT 1;
   END IF;
   measures:=measures||jsonb_build_array(jsonb_build_object('key',measure.measure_key,'definition',measure.definition,'value',measure.value_text,
    'period',measure.period,'unit',measure.unit,'currency',measure.currency,'sign',measure.sign,'precision',measure.precision_digits,'actual_forecast',coalesce(actual_forecast,'unknown'),
    'fact_id',measure.fact_id,'assumption_id',measure.assumption_id,'decision_id',decision,'source_record_id',locator.source_record_id,'representation_id',locator.representation_id,
    'source_digest',locator.content_sha256,'locator',coalesce(locator.selector,jsonb_build_object('kind','banker_assumption','decision_id',decision))));
  END LOOP;
  IF jsonb_array_length(measures)<>3 THEN RAISE EXCEPTION 'controlled_inputs_incomplete'; END IF;
  calculations:=calculations||jsonb_build_array(jsonb_build_object('run_id',run.id,'calculation_version_id',ver.id,'model_version_id',scenario.model_version_id,'scenario_version_id',scenario.id,
   'scenario',(SELECT label FROM analysis.scenario WHERE id=scenario.scenario_id),'method',ver.method_code,'expected_equity_value',run.result->>'derived_equity_value','measures',measures));
 END LOOP;
 RETURN jsonb_build_object('schema_version','1.0.0','revision_id',p_revision,'deliverable_id',parent.id,'deal_id',parent.deal_id,
  'deal_name',(SELECT name FROM app.deal WHERE id=parent.deal_id),'purpose',parent.purpose,'audience',parent.audience,'confidentiality',parent.confidentiality,
  'provenance',CASE WHEN 'real'=ANY(source_classes) THEN 'real' WHEN cardinality(source_classes)>0 THEN 'synthetic' ELSE 'banker_declared' END,
  'evaluation_time',to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'template_version','analysis-valuation-1.0.0',
  'limitations',p_limitations,'calculations',calculations);
END $$;

REVOKE CREATE ON SCHEMA deliverable FROM app_deliverable_owner;
