-- Analysis and Valuation artifacts. Online owners remain NOBYPASSRLS.
CREATE SCHEMA IF NOT EXISTS deliverable;
CREATE ROLE app_deliverable_owner NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
GRANT app_runtime TO app_deliverable_owner;
GRANT app_deliverable_owner TO postgres;
GRANT USAGE, CREATE ON SCHEMA deliverable TO app_deliverable_owner;
GRANT USAGE ON SCHEMA deliverable TO app_runtime, job_worker, job_dispatcher;

CREATE TABLE deliverable.deliverable (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL, deal_id uuid NOT NULL,
 deliverable_type text NOT NULL CHECK(deliverable_type='analysis_valuation_workbook'), title text NOT NULL CHECK(length(title) BETWEEN 1 AND 240),
 purpose text NOT NULL, audience text NOT NULL, confidentiality text NOT NULL CHECK(confidentiality IN ('public','internal','confidential','restricted')),
 stage_applicability text NOT NULL DEFAULT 'always_required', owner_id uuid NOT NULL REFERENCES app.actor(id),
 current_revision_id uuid, row_version bigint NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(account_id,deal_id,id), FOREIGN KEY(account_id,deal_id) REFERENCES app.deal(account_id,id)
);
CREATE TABLE deliverable.deliverable_revision (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL, deal_id uuid NOT NULL, deliverable_id uuid NOT NULL,
 ordinal integer NOT NULL, predecessor_id uuid, purpose text NOT NULL, audience text NOT NULL, confidentiality text NOT NULL,
 template_version text NOT NULL CHECK(template_version='analysis-valuation-1.0.0'), build_input jsonb NOT NULL,
 basis_digest text NOT NULL CHECK(basis_digest ~ '^[a-f0-9]{64}$'), created_by uuid NOT NULL REFERENCES app.actor(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(account_id,deal_id,id), UNIQUE(deliverable_id,ordinal),
 FOREIGN KEY(account_id,deal_id,deliverable_id) REFERENCES deliverable.deliverable(account_id,deal_id,id),
 FOREIGN KEY(account_id,deal_id,predecessor_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id)
);
ALTER TABLE deliverable.deliverable ADD FOREIGN KEY(account_id,deal_id,current_revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id);
CREATE TABLE deliverable.revision_calculation_run (
 account_id uuid NOT NULL, deal_id uuid NOT NULL, revision_id uuid NOT NULL, calculation_run_id uuid NOT NULL,
 PRIMARY KEY(revision_id,calculation_run_id), FOREIGN KEY(account_id,deal_id,revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id),
 FOREIGN KEY(account_id,calculation_run_id) REFERENCES analysis.calculation_run(account_id,id)
);
CREATE TABLE deliverable.revision_model_version (
 account_id uuid NOT NULL, deal_id uuid NOT NULL, revision_id uuid NOT NULL, model_version_id uuid NOT NULL,
 PRIMARY KEY(revision_id,model_version_id), FOREIGN KEY(account_id,deal_id,revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id),
 FOREIGN KEY(account_id,model_version_id) REFERENCES analysis.model_version(account_id,id)
);
CREATE TABLE deliverable.revision_scenario_version (
 account_id uuid NOT NULL, deal_id uuid NOT NULL, revision_id uuid NOT NULL, scenario_version_id uuid NOT NULL,
 PRIMARY KEY(revision_id,scenario_version_id), FOREIGN KEY(account_id,deal_id,revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id),
 FOREIGN KEY(account_id,scenario_version_id) REFERENCES analysis.scenario_version(account_id,id)
);
CREATE TABLE deliverable.artifact (
 id uuid PRIMARY KEY, account_id uuid NOT NULL, deal_id uuid NOT NULL, revision_id uuid NOT NULL, protected_object_id uuid NOT NULL,
 role text NOT NULL CHECK(role IN ('native','reader','native_preview','reader_preview','render_report')), path_label text NOT NULL CHECK(path_label !~ '[/\\]'),
 media_type text NOT NULL, plaintext_sha256 text NOT NULL CHECK(plaintext_sha256 ~ '^[a-f0-9]{64}$'), byte_length bigint NOT NULL CHECK(byte_length BETWEEN 1 AND 104857600),
 engine_version text NOT NULL, template_version text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(account_id,deal_id,id), UNIQUE(revision_id,path_label),
 FOREIGN KEY(account_id,deal_id,revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id),
 FOREIGN KEY(account_id,protected_object_id) REFERENCES object_store.protected_object(account_id,id)
);
CREATE UNIQUE INDEX artifact_one_native ON deliverable.artifact(revision_id) WHERE role='native';
CREATE TABLE deliverable.artifact_region (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL, deal_id uuid NOT NULL, artifact_id uuid NOT NULL,
 region_key text NOT NULL, ownership_class text NOT NULL CHECK(ownership_class IN ('system','banker')), native_locator jsonb NOT NULL, content_digest text NOT NULL,
 UNIQUE(account_id,deal_id,id), UNIQUE(artifact_id,region_key), FOREIGN KEY(account_id,deal_id,artifact_id) REFERENCES deliverable.artifact(account_id,deal_id,id)
);
CREATE TABLE deliverable.artifact_region_lineage (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL, deal_id uuid NOT NULL, region_id uuid NOT NULL,
 calculation_run_id uuid NOT NULL, model_version_id uuid NOT NULL, scenario_version_id uuid NOT NULL,
 fact_id uuid, assumption_id uuid, decision_id uuid NOT NULL, source_record_id uuid, representation_id uuid, source_locator jsonb NOT NULL,
 CHECK(num_nonnulls(fact_id,assumption_id)=1), CHECK(fact_id IS NULL OR (source_record_id IS NOT NULL AND representation_id IS NOT NULL)),
 FOREIGN KEY(account_id,deal_id,region_id) REFERENCES deliverable.artifact_region(account_id,deal_id,id),
 FOREIGN KEY(account_id,calculation_run_id) REFERENCES analysis.calculation_run(account_id,id),
 FOREIGN KEY(account_id,model_version_id) REFERENCES analysis.model_version(account_id,id),
 FOREIGN KEY(account_id,scenario_version_id) REFERENCES analysis.scenario_version(account_id,id),
 FOREIGN KEY(account_id,fact_id) REFERENCES knowledge.fact(account_id,id), FOREIGN KEY(account_id,assumption_id) REFERENCES knowledge.assumption(account_id,id),
 FOREIGN KEY(account_id,decision_id) REFERENCES knowledge.human_decision(account_id,id), FOREIGN KEY(account_id,source_record_id) REFERENCES source.source_record(account_id,id),
 FOREIGN KEY(account_id,representation_id) REFERENCES source.source_representation(account_id,id)
);
CREATE TABLE deliverable.integrity_key (
 key_version text PRIMARY KEY, algorithm text NOT NULL CHECK(algorithm='EC_SIGN_ED25519'), public_key_pem text NOT NULL, retained_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE deliverable.artifact_manifest (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL, deal_id uuid NOT NULL, revision_id uuid NOT NULL,
 canonical_payload text NOT NULL, canonical_sha256 text NOT NULL, signature text NOT NULL, key_version text NOT NULL REFERENCES deliverable.integrity_key(key_version),
 signed_at timestamptz NOT NULL DEFAULT now(), UNIQUE(account_id,deal_id,id), UNIQUE(revision_id),
 FOREIGN KEY(account_id,deal_id,revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id)
);
CREATE TABLE deliverable.artifact_manifest_member (
 account_id uuid NOT NULL, deal_id uuid NOT NULL, manifest_id uuid NOT NULL, artifact_id uuid NOT NULL, exact_digest text NOT NULL,
 PRIMARY KEY(manifest_id,artifact_id), FOREIGN KEY(account_id,deal_id,manifest_id) REFERENCES deliverable.artifact_manifest(account_id,deal_id,id),
 FOREIGN KEY(account_id,deal_id,artifact_id) REFERENCES deliverable.artifact(account_id,deal_id,id)
);
CREATE TABLE deliverable.review (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL, deal_id uuid NOT NULL, revision_id uuid NOT NULL,
 purpose text NOT NULL, audience text NOT NULL, scope text NOT NULL, standard text NOT NULL CHECK(standard IN ('method_review','review_scope','rights_confidentiality','professional_suitability','office_roundtrip','native_reader_parity')),
 reviewer_id uuid NOT NULL REFERENCES app.actor(id), conclusion text NOT NULL CHECK(conclusion IN ('passed','failed','limited')), rationale text NOT NULL CHECK(length(rationale) BETWEEN 20 AND 4000),
 limitations jsonb NOT NULL, evidence jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(account_id,deal_id,id),
 FOREIGN KEY(account_id,deal_id,revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id)
);
CREATE TABLE deliverable.qc_run (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL, deal_id uuid NOT NULL, revision_id uuid NOT NULL,
 job_id uuid NOT NULL REFERENCES jobs.job(id), ruleset text NOT NULL CHECK(ruleset='analysis-workbook-qc-1.0.0'),
 checks jsonb NOT NULL, report jsonb NOT NULL, input_digest text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(account_id,deal_id,id),
 FOREIGN KEY(account_id,deal_id,revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id)
);
CREATE TABLE deliverable.qc_finding (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL, deal_id uuid NOT NULL, revision_id uuid NOT NULL, qc_run_id uuid NOT NULL,
 finding_code text NOT NULL, severity text NOT NULL CHECK(severity IN ('critical','major','minor')), detail text NOT NULL, locator jsonb NOT NULL, consequence text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(account_id,deal_id,id),
 FOREIGN KEY(account_id,deal_id,qc_run_id) REFERENCES deliverable.qc_run(account_id,deal_id,id), FOREIGN KEY(account_id,deal_id,revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id)
);
CREATE TABLE deliverable.qc_finding_disposition (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL, deal_id uuid NOT NULL, finding_id uuid NOT NULL,
 disposition text NOT NULL CHECK(disposition IN ('confirmed','remediation_required','accepted_limitation','rejected')), purpose text NOT NULL, rationale text NOT NULL,
 actor_id uuid NOT NULL REFERENCES app.actor(id), created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(account_id,deal_id,finding_id) REFERENCES deliverable.qc_finding(account_id,deal_id,id)
);
CREATE TABLE deliverable.readiness_assessment (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL, deal_id uuid NOT NULL, revision_id uuid NOT NULL,
 purpose text NOT NULL, audience text NOT NULL, assessment jsonb NOT NULL, basis_digest text NOT NULL, assessed_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(account_id,deal_id,id), UNIQUE(revision_id,purpose,audience,basis_digest), FOREIGN KEY(account_id,deal_id,revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id)
);
CREATE TABLE deliverable.command_idempotency (
 account_id uuid NOT NULL, deal_id uuid NOT NULL, actor_id uuid NOT NULL, command_code text NOT NULL, key_hash text NOT NULL, digest text NOT NULL, response jsonb NOT NULL,
 PRIMARY KEY(account_id,deal_id,actor_id,command_code,key_hash), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE deliverable.workbook_job (
 job_id uuid PRIMARY KEY REFERENCES jobs.job(id), account_id uuid NOT NULL, deal_id uuid NOT NULL, revision_id uuid NOT NULL,
 input jsonb NOT NULL, lease_hash text, lease_expires_at timestamptz, attempt integer NOT NULL DEFAULT 0, finished boolean NOT NULL DEFAULT false,
 FOREIGN KEY(account_id,deal_id,revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id)
);
CREATE TABLE deliverable.worker_context (backend_pid integer PRIMARY KEY, account_id uuid NOT NULL, deal_id uuid NOT NULL, job_id uuid NOT NULL, lease_hash text NOT NULL);
CREATE FUNCTION deliverable.scope_account() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT coalesce(app.policy_account_id(),(SELECT account_id FROM deliverable.worker_context WHERE backend_pid=pg_backend_pid())) $$;
CREATE FUNCTION deliverable.scope_deal() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT coalesce(app.policy_deal_id(),(SELECT deal_id FROM deliverable.worker_context WHERE backend_pid=pg_backend_pid())) $$;

DO $$ DECLARE t text; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='deliverable' AND tablename NOT IN ('worker_context','integrity_key','workbook_job') LOOP
  EXECUTE format('ALTER TABLE deliverable.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE deliverable.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY artifact_read_scope ON deliverable.%I FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id())',t);
  EXECUTE format('CREATE POLICY artifact_command_scope ON deliverable.%I TO app_deliverable_owner USING(account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal()) WITH CHECK(account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal())',t);
  EXECUTE format('GRANT SELECT ON deliverable.%I TO app_runtime',t);
 END LOOP;
END $$;
-- Only closed dispatcher/worker functions can reach the queue or establish a worker context.
ALTER TABLE deliverable.worker_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable.worker_context FORCE ROW LEVEL SECURITY;
CREATE POLICY artifact_context_owner ON deliverable.worker_context TO app_deliverable_owner USING(backend_pid=pg_backend_pid()) WITH CHECK(backend_pid=pg_backend_pid());
ALTER TABLE deliverable.workbook_job ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable.workbook_job FORCE ROW LEVEL SECURITY;
CREATE POLICY artifact_queue_owner ON deliverable.workbook_job TO app_deliverable_owner USING(true) WITH CHECK(true);
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA deliverable TO app_deliverable_owner;
GRANT SELECT ON deliverable.integrity_key TO app_runtime;

ALTER TABLE jobs.job DROP CONSTRAINT job_command_type_check, DROP CONSTRAINT job_purpose_code_check, DROP CONSTRAINT job_allowance_class_check;
ALTER TABLE jobs.job ADD CHECK(command_type IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc')),
 ADD CHECK(purpose_code IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc')),
 ADD CHECK(allowance_class IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc'));
GRANT SELECT,INSERT,UPDATE ON jobs.job TO app_deliverable_owner;
CREATE POLICY artifact_job_owner ON jobs.job TO app_deliverable_owner USING(command_type IN ('analysis_workbook_build','analysis_workbook_qc') AND account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal()) WITH CHECK(command_type IN ('analysis_workbook_build','analysis_workbook_qc') AND account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal());
GRANT SELECT ON app.deal,app.deal_workspace,app.account TO app_deliverable_owner;
CREATE POLICY artifact_deal_worker ON app.deal FOR SELECT TO app_deliverable_owner USING(account_id=deliverable.scope_account() AND id=deliverable.scope_deal());
CREATE POLICY artifact_workspace_worker ON app.deal_workspace FOR SELECT TO app_deliverable_owner USING(account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal());
CREATE POLICY artifact_account_worker ON app.account FOR SELECT TO app_deliverable_owner USING(id=deliverable.scope_account());
GRANT USAGE ON SCHEMA object_store TO app_deliverable_owner;
GRANT SELECT,INSERT ON object_store.protected_object TO app_deliverable_owner;
CREATE POLICY artifact_object_owner ON object_store.protected_object TO app_deliverable_owner USING(account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal()) WITH CHECK(scope_code='deal' AND account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal());

CREATE FUNCTION deliverable.immutable_record() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'artifact_immutable_record' USING ERRCODE='23514'; END $$;
DO $$ DECLARE t text; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='deliverable' AND tablename NOT IN ('deliverable','worker_context','workbook_job') LOOP
  EXECUTE format('CREATE TRIGGER artifact_immutable BEFORE UPDATE OR DELETE ON deliverable.%I FOR EACH ROW EXECUTE FUNCTION deliverable.immutable_record()',t);
 END LOOP;
END $$;

CREATE FUNCTION deliverable.assert_write() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF app.policy_actor_id() IS NULL OR app.policy_deal_id() IS NULL OR NOT EXISTS(SELECT 1 FROM app.deal WHERE id=app.policy_deal_id() AND account_id=app.policy_account_id() AND activity_posture='active') THEN RAISE EXCEPTION 'artifact_scope_unavailable' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM app.deal_workspace WHERE deal_id=app.policy_deal_id() AND account_id=app.policy_account_id() AND processing_posture='permitted') THEN RAISE EXCEPTION 'workspace_processing_blocked' USING ERRCODE='23514'; END IF;
END $$;
CREATE FUNCTION deliverable.replay(p_command text,p_key text,p_digest text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE previous deliverable.command_idempotency%ROWTYPE; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws(':',app.policy_account_id(),app.policy_deal_id(),app.policy_actor_id(),p_command,p_key),0));
 SELECT * INTO previous FROM deliverable.command_idempotency WHERE account_id=app.policy_account_id() AND deal_id=app.policy_deal_id() AND actor_id=app.policy_actor_id() AND command_code=p_command AND key_hash=p_key;
 IF FOUND THEN IF previous.digest<>p_digest THEN RAISE EXCEPTION 'idempotency_key_reused' USING ERRCODE='23514'; END IF; RETURN previous.response || '{"idempotent_replayed":true}'::jsonb; END IF; RETURN NULL;
END $$;
CREATE FUNCTION deliverable.remember(p_command text,p_key text,p_digest text,p_response jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 INSERT INTO deliverable.command_idempotency(account_id,deal_id,actor_id,command_code,key_hash,digest,response) VALUES(app.policy_account_id(),app.policy_deal_id(),app.policy_actor_id(),p_command,p_key,p_digest,p_response); RETURN p_response; END $$;
CREATE FUNCTION deliverable.create_deliverable(p_key text,p_digest text,p_body jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE replay jsonb; row deliverable.deliverable%ROWTYPE; BEGIN
 PERFORM deliverable.assert_write(); replay:=deliverable.replay('create_deliverable',p_key,p_digest); IF replay IS NOT NULL THEN RETURN replay; END IF;
 INSERT INTO deliverable.deliverable(account_id,deal_id,deliverable_type,title,purpose,audience,confidentiality,owner_id)
 VALUES(app.policy_account_id(),app.policy_deal_id(),'analysis_valuation_workbook',p_body->>'title',p_body->>'purpose',p_body->>'audience',p_body->>'confidentiality',app.policy_actor_id()) RETURNING * INTO row;
 PERFORM app.record_audit('deliverable_created','accepted','deliverable',row.id::text,'analysis_valuation_workbook',NULL);
 RETURN deliverable.remember('create_deliverable',p_key,p_digest,to_jsonb(row));
END $$;

CREATE FUNCTION deliverable.build_input(p_deliverable uuid,p_revision uuid,p_basis jsonb,p_limitations jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
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
    actual_forecast:='forecast';
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

CREATE FUNCTION deliverable.create_revision(p_parent uuid,p_expected bigint,p_key text,p_digest text,p_basis jsonb,p_limitations jsonb,p_release text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
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
 PERFORM app.record_audit('workbook_revision_requested','accepted','revision',revision::text,'exact_controlled_basis',NULL);
 RETURN deliverable.remember('create_revision',p_key,p_digest,jsonb_build_object('id',job,'job_type','analysis_workbook_build','state','queued','revision_id',revision,'deliverable_id',parent.id,'row_version',parent.row_version+1));
END $$;

CREATE FUNCTION deliverable.dispatch_workbook_job() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE row deliverable.workbook_job%ROWTYPE; token text:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''); BEGIN
 SELECT * INTO row FROM deliverable.workbook_job WHERE NOT finished AND attempt<3 AND (lease_expires_at IS NULL OR lease_expires_at<now()) ORDER BY job_id FOR UPDATE SKIP LOCKED LIMIT 1;
 IF NOT FOUND THEN RETURN NULL; END IF;
 UPDATE deliverable.workbook_job SET lease_hash=encode(extensions.digest(token,'sha256'),'hex'),lease_expires_at=now()+interval '10 minutes',attempt=attempt+1 WHERE job_id=row.job_id;
 RETURN jsonb_build_object('job_id',row.job_id,'lease_token',token);
END $$;
CREATE FUNCTION deliverable.begin_workbook_step(p_job uuid,p_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE row deliverable.workbook_job%ROWTYPE; job jobs.job%ROWTYPE; BEGIN
 DELETE FROM deliverable.worker_context WHERE backend_pid=pg_backend_pid();
 SELECT * INTO row FROM deliverable.workbook_job WHERE job_id=p_job AND lease_hash=encode(extensions.digest(p_token,'sha256'),'hex') AND lease_expires_at>now() AND NOT finished FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'artifact_worker_scope_invalid' USING ERRCODE='42501'; END IF;
 INSERT INTO deliverable.worker_context VALUES(pg_backend_pid(),row.account_id,row.deal_id,row.job_id,row.lease_hash);
 SELECT * INTO job FROM jobs.job WHERE id=p_job FOR UPDATE;
 IF job.state IN ('canceled','completed','failed_terminal') OR NOT EXISTS(SELECT 1 FROM app.deal_workspace w JOIN app.deal d ON d.id=w.deal_id JOIN app.account a ON a.id=w.account_id WHERE w.deal_id=row.deal_id AND w.posture_version=job.workspace_posture_version AND a.security_epoch=job.security_epoch AND d.activity_posture='active' AND w.processing_posture='permitted' AND w.commercial_posture='entitled') THEN RAISE EXCEPTION 'artifact_workspace_fence_changed' USING ERRCODE='42501'; END IF;
 UPDATE jobs.job SET state='running',worker_heartbeat_at=clock_timestamp(),progress='{"message_code":"native_generation_and_qc"}',row_version=row_version+1,updated_at=clock_timestamp() WHERE id=p_job;
 RETURN jsonb_build_object('input',row.input,'revision_id',row.revision_id,'account_id',row.account_id,'deal_id',row.deal_id,'job_type',job.command_type,'input_digest',job.input_digest);
END $$;
CREATE FUNCTION deliverable.clear_workbook_step() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$ DELETE FROM deliverable.worker_context WHERE backend_pid=pg_backend_pid() $$;

CREATE FUNCTION deliverable.complete_workbook_step(p_job uuid,p_token text,p_files jsonb,p_report jsonb,p_checks jsonb,p_manifest jsonb,p_failure text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
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
   IF p_manifest->>'revision_id'<>row.revision_id::text THEN RAISE EXCEPTION 'manifest_revision_mismatch'; END IF;
   INSERT INTO deliverable.integrity_key(key_version,algorithm,public_key_pem) VALUES(p_manifest->>'key_version','EC_SIGN_ED25519',p_manifest->>'public_key_pem') ON CONFLICT DO NOTHING;
   IF NOT EXISTS(SELECT 1 FROM deliverable.integrity_key WHERE key_version=p_manifest->>'key_version' AND public_key_pem=p_manifest->>'public_key_pem') THEN RAISE EXCEPTION 'manifest_key_mismatch'; END IF;
   INSERT INTO deliverable.artifact_manifest(account_id,deal_id,revision_id,canonical_payload,canonical_sha256,signature,key_version) VALUES(row.account_id,row.deal_id,row.revision_id,p_manifest->>'canonical_payload',p_manifest->>'canonical_sha256',p_manifest->>'signature',p_manifest->>'key_version') RETURNING id INTO manifest;
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

CREATE FUNCTION deliverable.create_review(p_key text,p_digest text,p_body jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE replay jsonb; row deliverable.review%ROWTYPE; revision deliverable.deliverable_revision%ROWTYPE; BEGIN
 PERFORM deliverable.assert_write(); replay:=deliverable.replay('create_review',p_key,p_digest); IF replay IS NOT NULL THEN RETURN replay; END IF;
 SELECT * INTO revision FROM deliverable.deliverable_revision WHERE id=(p_body->>'revision_id')::uuid; IF NOT FOUND THEN RAISE EXCEPTION 'artifact_scope_unavailable'; END IF;
 IF p_body->>'standard' IN ('office_roundtrip','native_reader_parity') AND (p_body->>'conclusion'='passed') AND (jsonb_typeof(p_body->'evidence')<>'object' OR NOT (p_body->'evidence' ?& ARRAY['native_sha256','reader_sha256','report_sha256','application','build','steps']) OR NOT EXISTS(SELECT 1 FROM deliverable.artifact WHERE revision_id=revision.id AND role='native' AND plaintext_sha256=p_body->'evidence'->>'native_sha256') OR NOT EXISTS(SELECT 1 FROM deliverable.artifact WHERE revision_id=revision.id AND role='reader' AND plaintext_sha256=p_body->'evidence'->>'reader_sha256')) THEN RAISE EXCEPTION 'exact_artifact_evidence_required'; END IF;
 INSERT INTO deliverable.review(account_id,deal_id,revision_id,purpose,audience,scope,standard,reviewer_id,conclusion,rationale,limitations,evidence)
 VALUES(revision.account_id,revision.deal_id,revision.id,p_body->>'purpose',p_body->>'audience',p_body->>'scope',p_body->>'standard',app.policy_actor_id(),p_body->>'conclusion',p_body->>'rationale',p_body->'limitations',p_body->'evidence') RETURNING * INTO row;
 PERFORM app.record_audit('artifact_review_recorded','accepted','review',row.id::text,row.standard,NULL);
 RETURN deliverable.remember('create_review',p_key,p_digest,to_jsonb(row));
END $$;
CREATE FUNCTION deliverable.create_finding_disposition(p_finding uuid,p_key text,p_digest text,p_body jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE finding deliverable.qc_finding%ROWTYPE; result deliverable.qc_finding_disposition%ROWTYPE; replay jsonb; BEGIN
 PERFORM deliverable.assert_write(); replay:=deliverable.replay('finding_disposition',p_key,p_digest); IF replay IS NOT NULL THEN RETURN replay; END IF;
 SELECT * INTO finding FROM deliverable.qc_finding WHERE id=p_finding; IF NOT FOUND THEN RAISE EXCEPTION 'artifact_scope_unavailable'; END IF;
 IF finding.severity='critical' AND p_body->>'disposition'='accepted_limitation' THEN RAISE EXCEPTION 'critical_finding_cannot_be_waived'; END IF;
 INSERT INTO deliverable.qc_finding_disposition(account_id,deal_id,finding_id,disposition,purpose,rationale,actor_id) VALUES(finding.account_id,finding.deal_id,finding.id,p_body->>'disposition',p_body->>'purpose',p_body->>'rationale',app.policy_actor_id()) RETURNING * INTO result;
 RETURN deliverable.remember('finding_disposition',p_key,p_digest,to_jsonb(result));
END $$;

CREATE FUNCTION deliverable.assess_readiness(p_revision uuid,p_purpose text,p_audience text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
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
  IF req.code='signed_manifest' AND NOT EXISTS(SELECT 1 FROM deliverable.artifact_manifest WHERE revision_id=p_revision) THEN outcome:='missing'; END IF;
  IF EXISTS(SELECT 1 FROM deliverable.qc_finding WHERE revision_id=p_revision AND finding_code=req.code AND severity IN ('critical','major')) THEN outcome:='failed'; END IF;
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

DO $$ DECLARE fn record; BEGIN
 FOR fn IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='deliverable' LOOP
  EXECUTE format('ALTER FUNCTION %s OWNER TO app_deliverable_owner',fn.signature);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',fn.signature);
 END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION deliverable.scope_account(),deliverable.scope_deal() TO app_deliverable_owner;
GRANT EXECUTE ON FUNCTION deliverable.create_deliverable(text,text,jsonb),deliverable.create_revision(uuid,bigint,text,text,jsonb,jsonb,text),deliverable.create_review(text,text,jsonb),deliverable.create_finding_disposition(uuid,text,text,jsonb),deliverable.assess_readiness(uuid,text,text) TO app_runtime;
GRANT EXECUTE ON FUNCTION deliverable.dispatch_workbook_job() TO job_dispatcher;
GRANT EXECUTE ON FUNCTION deliverable.begin_workbook_step(uuid,text),deliverable.complete_workbook_step(uuid,text,jsonb,jsonb,jsonb,jsonb,text),deliverable.clear_workbook_step() TO job_worker;
REVOKE CREATE ON SCHEMA deliverable FROM app_deliverable_owner;
