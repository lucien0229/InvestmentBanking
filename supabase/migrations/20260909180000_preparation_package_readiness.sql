-- Ticket 20: immutable Preparation Package snapshots and blocker-first readiness.
-- Package Readiness is a rebuildable projection over exact package members and
-- never becomes an authorization or scalar score.
CREATE SCHEMA IF NOT EXISTS deal;
CREATE SCHEMA IF NOT EXISTS projection;
GRANT USAGE ON SCHEMA deal, projection TO app_runtime, app_deliverable_owner;

CREATE TABLE IF NOT EXISTS deal.execution_package (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  deal_id uuid NOT NULL,
  package_type text NOT NULL DEFAULT 'controlled_auction_execution'
    CHECK (package_type='controlled_auction_execution'),
  purpose text NOT NULL CHECK (length(purpose) BETWEEN 1 AND 500),
  owner_id uuid NOT NULL REFERENCES app.actor(id),
  current_snapshot_id uuid,
  row_version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, deal_id, id),
  FOREIGN KEY(account_id, deal_id) REFERENCES app.deal(account_id, id)
);

CREATE TABLE IF NOT EXISTS deal.package_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  deal_id uuid NOT NULL,
  execution_package_id uuid NOT NULL,
  ordinal integer NOT NULL CHECK (ordinal > 0),
  purpose text NOT NULL,
  audience text NOT NULL,
  business_stage text NOT NULL,
  source_perimeter jsonb NOT NULL DEFAULT '{}'::jsonb,
  readiness_basis_digest text NOT NULL CHECK (readiness_basis_digest ~ '^[a-f0-9]{64}$'),
  manifest_id uuid,
  omissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL REFERENCES app.actor(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, deal_id, id),
  UNIQUE(account_id, deal_id, execution_package_id, id),
  UNIQUE(execution_package_id, ordinal),
  FOREIGN KEY(account_id, deal_id, execution_package_id) REFERENCES deal.execution_package(account_id, deal_id, id),
  FOREIGN KEY(account_id, deal_id) REFERENCES app.deal(account_id, id)
);
ALTER TABLE deal.execution_package
  DROP CONSTRAINT IF EXISTS execution_package_current_snapshot_fk;
ALTER TABLE deal.execution_package
  ADD CONSTRAINT execution_package_current_snapshot_fk
  FOREIGN KEY(account_id, deal_id, current_snapshot_id)
  REFERENCES deal.package_snapshot(account_id, deal_id, id);
CREATE OR REPLACE FUNCTION deal.validate_current_package_snapshot() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.current_snapshot_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM deal.package_snapshot s WHERE s.id=NEW.current_snapshot_id AND s.account_id=NEW.account_id AND s.deal_id=NEW.deal_id AND s.execution_package_id=NEW.id
  ) THEN RAISE EXCEPTION 'package_snapshot_scope_mismatch'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER execution_package_current_snapshot_scope BEFORE INSERT OR UPDATE OF current_snapshot_id ON deal.execution_package
  FOR EACH ROW EXECUTE FUNCTION deal.validate_current_package_snapshot();

CREATE TABLE IF NOT EXISTS deal.package_snapshot_revision (
  account_id uuid NOT NULL,
  deal_id uuid NOT NULL,
  snapshot_id uuid NOT NULL,
  revision_id uuid NOT NULL,
  package_role text NOT NULL CHECK (package_role IN (
    'analysis_valuation_workbook','auction_control_workbook','teaser','cim','conditional'
  )),
  inclusion_reason text NOT NULL,
  stage_applicability text NOT NULL CHECK (stage_applicability IN (
    'always_required','current_stage_required','conditional','not_stage_required'
  )),
  PRIMARY KEY(snapshot_id, revision_id, package_role),
  FOREIGN KEY(account_id, deal_id, snapshot_id) REFERENCES deal.package_snapshot(account_id, deal_id, id),
  FOREIGN KEY(account_id, deal_id, revision_id) REFERENCES deliverable.deliverable_revision(account_id, deal_id, id)
);

CREATE TABLE IF NOT EXISTS deal.package_snapshot_control (
  account_id uuid NOT NULL,
  deal_id uuid NOT NULL,
  snapshot_id uuid NOT NULL,
  control_kind text NOT NULL CHECK (control_kind IN (
    'source_packet','source_record','evidence','decision','review','qc_run','qc_finding',
    'validation','buyer_universe','process_state','confidentiality','audience'
  )),
  control_id uuid,
  control_role text NOT NULL,
  basis jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY(snapshot_id, control_kind, control_role),
  FOREIGN KEY(account_id, deal_id, snapshot_id) REFERENCES deal.package_snapshot(account_id, deal_id, id)
);

CREATE TABLE IF NOT EXISTS deal.package_snapshot_dependency (
  account_id uuid NOT NULL,
  deal_id uuid NOT NULL,
  snapshot_id uuid NOT NULL,
  dependency_kind text NOT NULL CHECK (dependency_kind IN (
    'source_packet_version','source_record','evidence','fact','assumption','calculation_run',
    'model_version','scenario_version','buyer_candidate','process_event','human_decision'
  )),
  dependency_id uuid NOT NULL,
  dependency_version text,
  dependency_role text NOT NULL,
  PRIMARY KEY(snapshot_id, dependency_kind, dependency_id, dependency_role),
  FOREIGN KEY(account_id, deal_id, snapshot_id) REFERENCES deal.package_snapshot(account_id, deal_id, id)
);

CREATE TABLE IF NOT EXISTS deal.package_command_idempotency (
  account_id uuid NOT NULL,
  deal_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  command_code text NOT NULL,
  key_hash text NOT NULL,
  request_digest text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(account_id, deal_id, actor_id, command_code, key_hash)
);

CREATE TABLE IF NOT EXISTS projection.package_readiness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  deal_id uuid NOT NULL,
  execution_package_id uuid NOT NULL,
  snapshot_id uuid NOT NULL,
  purpose text NOT NULL,
  audience text NOT NULL,
  assessment jsonb NOT NULL,
  basis_digest text NOT NULL CHECK (basis_digest ~ '^[a-f0-9]{64}$'),
  assessed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, deal_id, snapshot_id, purpose, audience, basis_digest),
  FOREIGN KEY(account_id, deal_id, execution_package_id) REFERENCES deal.execution_package(account_id, deal_id, id),
  FOREIGN KEY(account_id, deal_id, snapshot_id) REFERENCES deal.package_snapshot(account_id, deal_id, id)
);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['execution_package','package_snapshot','package_snapshot_revision','package_snapshot_control','package_snapshot_dependency','package_command_idempotency'] LOOP
    EXECUTE format('ALTER TABLE deal.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE deal.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS ticket20_read_scope ON deal.%I', t);
    EXECUTE format('CREATE POLICY ticket20_read_scope ON deal.%I FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id())', t);
    EXECUTE format('DROP POLICY IF EXISTS ticket20_owner_scope ON deal.%I', t);
    EXECUTE format('CREATE POLICY ticket20_owner_scope ON deal.%I TO app_deliverable_owner USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id()) WITH CHECK(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id())', t);
    EXECUTE format('GRANT SELECT ON deal.%I TO app_runtime', t);
    EXECUTE format('GRANT SELECT,INSERT,UPDATE ON deal.%I TO app_deliverable_owner', t);
  END LOOP;
END $$;
ALTER TABLE projection.package_readiness ENABLE ROW LEVEL SECURITY;
ALTER TABLE projection.package_readiness FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ticket20_projection_read ON projection.package_readiness;
CREATE POLICY ticket20_projection_read ON projection.package_readiness FOR SELECT TO app_runtime
  USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
GRANT SELECT ON projection.package_readiness TO app_runtime;
GRANT SELECT,INSERT,UPDATE ON projection.package_readiness TO app_deliverable_owner;

CREATE OR REPLACE FUNCTION deal.immutable_package_record() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'package_snapshot_immutable' USING ERRCODE='23514';
END $$;
CREATE TRIGGER package_snapshot_immutable BEFORE UPDATE OR DELETE ON deal.package_snapshot
  FOR EACH ROW EXECUTE FUNCTION deal.immutable_package_record();
CREATE TRIGGER package_snapshot_revision_immutable BEFORE UPDATE OR DELETE ON deal.package_snapshot_revision
  FOR EACH ROW EXECUTE FUNCTION deal.immutable_package_record();
CREATE TRIGGER package_snapshot_control_immutable BEFORE UPDATE OR DELETE ON deal.package_snapshot_control
  FOR EACH ROW EXECUTE FUNCTION deal.immutable_package_record();
CREATE TRIGGER package_snapshot_dependency_immutable BEFORE UPDATE OR DELETE ON deal.package_snapshot_dependency
  FOR EACH ROW EXECUTE FUNCTION deal.immutable_package_record();

CREATE OR REPLACE FUNCTION deal.assert_package_scope(p_deal uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=deal,app,pg_catalog AS $$
BEGIN
  IF app.policy_account_id() IS NULL OR app.policy_actor_id() IS NULL
     OR app.policy_deal_id() IS DISTINCT FROM p_deal
     OR NOT EXISTS (SELECT 1 FROM app.deal WHERE id=p_deal AND account_id=app.policy_account_id())
  THEN RAISE EXCEPTION 'package_scope_unavailable' USING ERRCODE='42501'; END IF;
END $$;

CREATE OR REPLACE FUNCTION deal.create_execution_package(p_key text,p_digest text,p_body jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=deal,app,pg_catalog AS $$
DECLARE replay jsonb; replay_digest text; row deal.execution_package%ROWTYPE;
BEGIN
  PERFORM deal.assert_package_scope(app.policy_deal_id());
  SELECT response,request_digest INTO replay,replay_digest FROM deal.package_command_idempotency WHERE account_id=app.policy_account_id() AND deal_id=app.policy_deal_id() AND actor_id=app.policy_actor_id() AND command_code='create_execution_package' AND key_hash=p_key;
  IF replay IS NOT NULL THEN
    IF replay_digest IS DISTINCT FROM p_digest THEN RAISE EXCEPTION 'idempotency_key_reused'; END IF;
    RETURN replay || '{"idempotent_replayed":true}'::jsonb;
  END IF;
  INSERT INTO deal.execution_package(account_id,deal_id,purpose,owner_id)
    VALUES(app.policy_account_id(),app.policy_deal_id(),p_body->>'purpose',app.policy_actor_id()) RETURNING * INTO row;
  replay:=jsonb_build_object('id',row.id,'account_id',row.account_id,'deal_id',row.deal_id,'purpose',row.purpose,'row_version',row.row_version,'current_snapshot_id',row.current_snapshot_id,'idempotent_replayed',false);
  INSERT INTO deal.package_command_idempotency VALUES(app.policy_account_id(),app.policy_deal_id(),app.policy_actor_id(),'create_execution_package',p_key,p_digest,replay);
  PERFORM app.record_audit('execution_package_created','completed','execution_package',row.id::text,'controlled_auction_execution',gen_random_uuid()::text);
  RETURN replay;
END $$;

CREATE OR REPLACE FUNCTION deal.create_package_snapshot(
  p_package uuid,p_expected_version bigint,p_key text,p_digest text,p_revisions jsonb,
  p_controls jsonb,p_dependencies jsonb,p_omissions jsonb,p_limitations jsonb,p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=deal,deliverable,app,source,pg_catalog AS $$
DECLARE package_row deal.execution_package%ROWTYPE; v_snapshot_id uuid:=gen_random_uuid(); ordinal integer; stage text; purpose text; audience text; basis text; replay jsonb; replay_digest text; item jsonb; rev deliverable.deliverable_revision%ROWTYPE;
BEGIN
  PERFORM deal.assert_package_scope(app.policy_deal_id());
  SELECT * INTO package_row FROM deal.execution_package WHERE id=p_package AND account_id=app.policy_account_id() AND deal_id=app.policy_deal_id() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'package_scope_unavailable'; END IF;
  IF package_row.row_version<>p_expected_version THEN RAISE EXCEPTION 'package_version_conflict'; END IF;
  SELECT response,request_digest INTO replay,replay_digest FROM deal.package_command_idempotency WHERE account_id=app.policy_account_id() AND deal_id=app.policy_deal_id() AND actor_id=app.policy_actor_id() AND command_code='create_package_snapshot' AND key_hash=p_key;
  IF replay IS NOT NULL THEN
    IF replay_digest IS DISTINCT FROM p_digest THEN RAISE EXCEPTION 'idempotency_key_reused'; END IF;
    RETURN replay || '{"idempotent_replayed":true}'::jsonb;
  END IF;
  IF jsonb_typeof(p_revisions)<>'array' OR jsonb_array_length(p_revisions)=0 THEN RAISE EXCEPTION 'package_revision_members_required'; END IF;
  SELECT business_stage INTO stage FROM app.deal WHERE id=app.policy_deal_id() AND account_id=app.policy_account_id();
  purpose:=package_row.purpose;
  audience:='Named Individual Banker';
  SELECT coalesce(max(s.ordinal),0)+1 INTO ordinal FROM deal.package_snapshot s WHERE s.execution_package_id=package_row.id;
  basis:=encode(extensions.digest(jsonb_build_object('package',package_row.id,'version',package_row.row_version,'revisions',p_revisions,'controls',p_controls,'dependencies',p_dependencies,'omissions',p_omissions,'limitations',p_limitations,'reason',p_reason)::text,'sha256'),'hex');
  INSERT INTO deal.package_snapshot(id,account_id,deal_id,execution_package_id,ordinal,purpose,audience,business_stage,source_perimeter,readiness_basis_digest,omissions,limitations,created_by)
    VALUES(v_snapshot_id,app.policy_account_id(),app.policy_deal_id(),package_row.id,ordinal,purpose,audience,stage,jsonb_build_object('revision_ids',p_revisions),basis,coalesce(p_omissions,'[]'),coalesce(p_limitations,'[]'),app.policy_actor_id());
  FOR item IN SELECT value FROM jsonb_array_elements(p_revisions) LOOP
    IF item->>'revision_id' IS NULL OR item->>'package_role' IS NULL THEN RAISE EXCEPTION 'package_revision_member_invalid'; END IF;
    IF item->>'package_role' IN ('analysis_valuation_workbook','auction_control_workbook') AND item->>'stage_applicability'='not_stage_required' THEN
      RAISE EXCEPTION 'package_revision_member_invalid';
    END IF;
    SELECT r.* INTO rev FROM deliverable.deliverable_revision r JOIN deliverable.deliverable d ON d.id=r.deliverable_id AND d.current_revision_id=r.id WHERE r.id=(item->>'revision_id')::uuid AND r.account_id=app.policy_account_id() AND r.deal_id=app.policy_deal_id();
    IF NOT FOUND THEN RAISE EXCEPTION 'package_revision_scope_mismatch'; END IF;
    IF (item->>'package_role'='analysis_valuation_workbook' AND NOT EXISTS (SELECT 1 FROM deliverable.deliverable d WHERE d.id=rev.deliverable_id AND d.deliverable_type='analysis_valuation_workbook'))
       OR (item->>'package_role'='auction_control_workbook' AND NOT EXISTS (SELECT 1 FROM deliverable.deliverable d WHERE d.id=rev.deliverable_id AND d.deliverable_type='auction_control_workbook')) THEN
      RAISE EXCEPTION 'package_revision_member_invalid';
    END IF;
    INSERT INTO deal.package_snapshot_revision(account_id,deal_id,snapshot_id,revision_id,package_role,inclusion_reason,stage_applicability)
      VALUES(app.policy_account_id(),app.policy_deal_id(),v_snapshot_id,rev.id,item->>'package_role',coalesce(item->>'inclusion_reason',p_reason),coalesce(item->>'stage_applicability','always_required'));
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM deal.package_snapshot_revision psr WHERE psr.snapshot_id=v_snapshot_id AND psr.package_role='analysis_valuation_workbook' AND psr.stage_applicability<>'not_stage_required')
     OR NOT EXISTS (SELECT 1 FROM deal.package_snapshot_revision psr WHERE psr.snapshot_id=v_snapshot_id AND psr.package_role='auction_control_workbook' AND psr.stage_applicability<>'not_stage_required') THEN
    RAISE EXCEPTION 'package_required_revision_missing';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(coalesce(p_controls,'[]')) LOOP
    INSERT INTO deal.package_snapshot_control(account_id,deal_id,snapshot_id,control_kind,control_id,control_role,basis)
      VALUES(app.policy_account_id(),app.policy_deal_id(),v_snapshot_id,item->>'control_kind',nullif(item->>'control_id','')::uuid,coalesce(item->>'control_role','basis'),coalesce(item->'basis','{}'));
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(coalesce(p_dependencies,'[]')) LOOP
    INSERT INTO deal.package_snapshot_dependency(account_id,deal_id,snapshot_id,dependency_kind,dependency_id,dependency_version,dependency_role)
      VALUES(app.policy_account_id(),app.policy_deal_id(),v_snapshot_id,item->>'dependency_kind',(item->>'dependency_id')::uuid,item->>'dependency_version',coalesce(item->>'dependency_role','required'));
  END LOOP;
  UPDATE deal.execution_package SET current_snapshot_id=v_snapshot_id,row_version=row_version+1 WHERE id=package_row.id;
  replay:=jsonb_build_object('id',v_snapshot_id,'execution_package_id',package_row.id,'ordinal',ordinal,'row_version',package_row.row_version+1,'purpose',purpose,'audience',audience,'business_stage',stage,'readiness_basis_digest',basis,'idempotent_replayed',false);
  INSERT INTO deal.package_command_idempotency VALUES(app.policy_account_id(),app.policy_deal_id(),app.policy_actor_id(),'create_package_snapshot',p_key,p_digest,replay);
  RETURN replay;
END $$;

CREATE OR REPLACE FUNCTION deal.get_package_readiness(p_snapshot uuid,p_purpose text,p_audience text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=deal,deliverable,process,source,knowledge,analysis,app,projection,pg_catalog AS $$
DECLARE snap deal.package_snapshot%ROWTYPE; package_row deal.execution_package%ROWTYPE; rows jsonb:='[]'::jsonb; blockers jsonb:='[]'::jsonb; item record; req record; assessment jsonb; posture text:='circulation_candidate'; outcome text; blocker text; next_action text; role text; stage_required boolean; rev_count integer:=0; basis text; result jsonb;
BEGIN
  PERFORM deal.assert_package_scope(app.policy_deal_id());
  SELECT * INTO snap FROM deal.package_snapshot WHERE id=p_snapshot AND account_id=app.policy_account_id() AND deal_id=app.policy_deal_id();
  IF NOT FOUND THEN RAISE EXCEPTION 'package_snapshot_not_found'; END IF;
  IF snap.purpose IS DISTINCT FROM p_purpose OR snap.audience IS DISTINCT FROM p_audience THEN
    RAISE EXCEPTION 'package_use_mismatch';
  END IF;
  SELECT * INTO package_row FROM deal.execution_package WHERE id=snap.execution_package_id AND account_id=snap.account_id AND deal_id=snap.deal_id;
  FOR item IN SELECT psr.*,d.deliverable_type,d.title,r.ordinal,r.purpose AS revision_purpose,r.audience AS revision_audience FROM deal.package_snapshot_revision psr JOIN deliverable.deliverable_revision r ON r.id=psr.revision_id JOIN deliverable.deliverable d ON d.id=r.deliverable_id WHERE psr.snapshot_id=snap.id ORDER BY psr.package_role, r.ordinal LOOP
    rev_count:=rev_count+1; role:=item.package_role; stage_required:=item.stage_applicability<>'not_stage_required';
    outcome:='passed'; blocker:=NULL; next_action:='Inspect exact Revision';
    IF stage_required AND NOT EXISTS(SELECT 1 FROM deliverable.artifact a WHERE a.revision_id=item.revision_id AND a.role='native') THEN outcome:='missing'; blocker:='Required Native Artifact is missing'; next_action:='Generate the exact Native Artifact'; END IF;
    IF stage_required AND outcome='passed' AND item.deliverable_type IN ('teaser_presentation','cim_presentation') AND NOT EXISTS(SELECT 1 FROM deliverable.artifact a WHERE a.revision_id=item.revision_id AND a.role='reader') THEN outcome:='missing'; blocker:='Required Reader Copy is missing'; next_action:='Render the exact Reader Copy'; END IF;
    SELECT ra.assessment INTO assessment FROM deliverable.readiness_assessment ra WHERE ra.revision_id=item.revision_id AND ra.purpose=p_purpose AND ra.audience=p_audience ORDER BY ra.assessed_at DESC LIMIT 1;
    IF stage_required AND assessment IS NOT NULL AND (assessment->>'posture')='blocked' THEN outcome:='failed'; blocker:='Deliverable readiness is blocked for this exact Revision'; next_action:='Open the exact readiness blockers'; END IF;
    IF NOT stage_required THEN outcome:='not_stage_required'; blocker:=NULL; next_action:='Inspect applicability'; END IF;
    rows:=rows||jsonb_build_array(jsonb_build_object('requirement',item.title,'exact_scope',format('Revision %s · %s',item.ordinal,item.revision_id),'package_role',role,'current_posture',outcome,'evidence_control',coalesce(assessment->>'basis_digest','stage applicability'),'blocker',blocker,'next_controlled_action',next_action,'stage_applicability',item.stage_applicability));
    IF outcome NOT IN ('passed','not_stage_required') THEN blockers:=blockers||jsonb_build_array(jsonb_build_object('requirement',item.title,'exact_scope',item.revision_id,'blocker',blocker,'next_controlled_action',next_action)); posture:='blocked'; END IF;
  END LOOP;
  FOR req IN SELECT * FROM (VALUES
    ('source','Source / Evidence perimeter','Inspect exact Source Packet and Evidence relationships'),
    ('deterministic','Deterministic checks','Complete every required calculation, formula and state check'),
    ('professional','Professional usability','Record Banker suitability Review for the stated purpose'),
    ('native','Native artifact','Verify editable Native Artifact structure'),
    ('render','Render / Reader parity','Verify exact Reader Copy and parity evidence'),
    ('qc','QC and Reviews','Resolve every material QC Finding and required Review'),
    ('confidentiality','Confidentiality and rights','Confirm source rights, confidentiality and disclosure basis'),
    ('audience','Audience and purpose','Bind one exact audience and intended purpose'),
    ('external_use','External use','External-Use Decision remains separate and absent'),
    ('buyer_universe','Buyer universe','Bind the exact Buyer universe control and approval posture'),
    ('decisions','Reviews and Decisions','Bind required Human Decisions and review conclusions')
  ) AS x(code,label,next_action) LOOP
    outcome:='passed'; blocker:=NULL;
    IF req.code='external_use' THEN outcome:='not_authorized'; blocker:='No matching External-Use Decision exists'; posture:=CASE WHEN posture='blocked' THEN posture ELSE 'circulation_candidate' END;
    ELSIF rev_count=0 THEN outcome:='missing'; blocker:='Package Snapshot has no exact Deliverable Revisions'; posture:='blocked';
    ELSIF req.code='source' AND NOT EXISTS(SELECT 1 FROM deal.package_snapshot_control c WHERE c.snapshot_id=snap.id AND c.control_kind IN ('source_packet','source_record','evidence')) THEN outcome:='missing'; blocker:='Source / Evidence control perimeter is missing'; posture:='blocked';
    ELSIF req.code='deterministic' AND NOT EXISTS(SELECT 1 FROM deal.package_snapshot_control c WHERE c.snapshot_id=snap.id AND c.control_kind='validation') THEN outcome:='missing'; blocker:='Deterministic validation control is missing'; posture:='blocked';
    ELSIF req.code='professional' AND NOT EXISTS(SELECT 1 FROM deal.package_snapshot_control c WHERE c.snapshot_id=snap.id AND c.control_kind='review' AND c.control_role IN ('professional_suitability','professional_usability')) THEN outcome:='missing'; blocker:='Professional suitability Review is missing'; posture:='blocked';
    ELSIF req.code='qc' AND (NOT EXISTS(SELECT 1 FROM deal.package_snapshot_control c WHERE c.snapshot_id=snap.id AND c.control_kind IN ('qc_run','review')) OR EXISTS(SELECT 1 FROM deal.package_snapshot_control c WHERE c.snapshot_id=snap.id AND c.control_kind='qc_finding' AND lower(coalesce(c.basis->>'status','unresolved')) IN ('open','unresolved','critical','failed'))) THEN outcome:=CASE WHEN EXISTS(SELECT 1 FROM deal.package_snapshot_control c WHERE c.snapshot_id=snap.id AND c.control_kind='qc_finding' AND lower(coalesce(c.basis->>'status','unresolved')) IN ('open','unresolved','critical','failed')) THEN 'failed' ELSE 'missing' END; blocker:=CASE WHEN outcome='failed' THEN 'Unresolved Critical QC Finding remains' ELSE 'QC Run or Review control is missing' END; posture:='blocked';
    ELSIF req.code='confidentiality' AND NOT EXISTS(SELECT 1 FROM deal.package_snapshot_control c WHERE c.snapshot_id=snap.id AND c.control_kind='confidentiality') THEN outcome:='missing'; blocker:='Confidentiality and rights control is missing'; posture:='blocked';
    ELSIF req.code='audience' AND NOT EXISTS(SELECT 1 FROM deal.package_snapshot_control c WHERE c.snapshot_id=snap.id AND c.control_kind='audience') THEN outcome:='missing'; blocker:='Audience control is missing'; posture:='blocked';
    ELSIF req.code='buyer_universe' AND NOT EXISTS(SELECT 1 FROM deal.package_snapshot_control c WHERE c.snapshot_id=snap.id AND c.control_kind='buyer_universe') THEN outcome:='missing'; blocker:='Buyer universe control is missing'; posture:='blocked';
    ELSIF req.code='decisions' AND NOT EXISTS(SELECT 1 FROM deal.package_snapshot_control c WHERE c.snapshot_id=snap.id AND c.control_kind IN ('decision','review')) THEN outcome:='missing'; blocker:='Required Human Decision or Review is missing'; posture:='blocked';
    ELSIF req.code='audience' AND nullif(trim(p_audience),'') IS NULL THEN outcome:='missing'; blocker:='Audience is missing'; posture:='blocked';
    END IF;
    rows:=rows||jsonb_build_array(jsonb_build_object('requirement',req.label,'exact_scope',snap.id,'current_posture',outcome,'evidence_control',req.code,'blocker',blocker,'next_controlled_action',CASE WHEN blocker IS NULL THEN 'Inspect exact control record' ELSE req.next_action END,'stage_applicability','current_stage_required'));
    IF blocker IS NOT NULL THEN blockers:=blockers||jsonb_build_array(jsonb_build_object('requirement',req.label,'exact_scope',snap.id,'blocker',blocker,'next_controlled_action',req.next_action)); END IF;
  END LOOP;
  basis:=encode(extensions.digest(jsonb_build_object('snapshot',snap.id,'purpose',p_purpose,'audience',p_audience,'rows',rows,'blockers',blockers)::text,'sha256'),'hex');
  result:=jsonb_build_object('snapshot_id',snap.id,'execution_package_id',snap.execution_package_id,'purpose',p_purpose,'audience',p_audience,'business_stage',snap.business_stage,'package_readiness',CASE WHEN jsonb_array_length(blockers)>0 THEN 'blocked' ELSE posture END,'rows',rows,'blockers',blockers,'limitations',snap.limitations,'omissions',snap.omissions,'external_use_authorized',false,'external_use_posture','not_authorized','scalar_score',NULL,'basis_digest',basis);
  INSERT INTO projection.package_readiness(account_id,deal_id,execution_package_id,snapshot_id,purpose,audience,assessment,basis_digest) VALUES(snap.account_id,snap.deal_id,snap.execution_package_id,snap.id,p_purpose,p_audience,result,basis) ON CONFLICT DO NOTHING;
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION deal.assert_package_scope(uuid),deal.create_execution_package(text,text,jsonb),deal.create_package_snapshot(uuid,bigint,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,text),deal.get_package_readiness(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION deal.create_execution_package(text,text,jsonb),deal.create_package_snapshot(uuid,bigint,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,text),deal.get_package_readiness(uuid,text,text) TO app_runtime;
