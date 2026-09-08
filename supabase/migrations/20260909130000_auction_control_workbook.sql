-- Auction Control Workbook is a Native Artifact projection of governed process state.
-- It never becomes a second process database: the build input is a point-in-time
-- snapshot with explicit not-applicable states for process families not yet present.
DO $$ DECLARE c text; BEGIN
  SELECT conname INTO c FROM pg_constraint WHERE conrelid='deliverable.deliverable'::regclass AND pg_get_constraintdef(oid) LIKE '%deliverable_type%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE deliverable.deliverable DROP CONSTRAINT %I', c); END IF;
  ALTER TABLE deliverable.deliverable ADD CONSTRAINT deliverable_type_check CHECK (deliverable_type IN ('analysis_valuation_workbook','auction_control_workbook'));
  SELECT conname INTO c FROM pg_constraint WHERE conrelid='deliverable.deliverable_revision'::regclass AND pg_get_constraintdef(oid) LIKE '%template_version%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE deliverable.deliverable_revision DROP CONSTRAINT %I', c); END IF;
  ALTER TABLE deliverable.deliverable_revision ADD CONSTRAINT deliverable_template_version_check CHECK (template_version IN ('analysis-valuation-1.0.0','auction-control-1.0.0'));
  SELECT conname INTO c FROM pg_constraint WHERE conrelid='jobs.job'::regclass AND pg_get_constraintdef(oid) LIKE '%command_type%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE jobs.job DROP CONSTRAINT %I', c); END IF;
  SELECT conname INTO c FROM pg_constraint WHERE conrelid='jobs.job'::regclass AND pg_get_constraintdef(oid) LIKE '%purpose_code%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE jobs.job DROP CONSTRAINT %I', c); END IF;
  SELECT conname INTO c FROM pg_constraint WHERE conrelid='jobs.job'::regclass AND pg_get_constraintdef(oid) LIKE '%allowance_class%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE jobs.job DROP CONSTRAINT %I', c); END IF;
  ALTER TABLE jobs.job ADD CONSTRAINT job_command_type_check CHECK(command_type IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','auction_control_workbook_build','internal_controlled_export','workbook_ai_review')),
    ADD CONSTRAINT job_purpose_code_check CHECK(purpose_code IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','auction_control_workbook_build','internal_controlled_export','workbook_ai_review')),
    ADD CONSTRAINT job_allowance_class_check CHECK(allowance_class IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','auction_control_workbook_build','internal_controlled_export','workbook_ai_review'));
END $$;
DROP POLICY IF EXISTS artifact_job_owner ON jobs.job;
CREATE POLICY artifact_job_owner ON jobs.job TO app_deliverable_owner USING(command_type IN ('analysis_workbook_build','analysis_workbook_qc','auction_control_workbook_build','workbook_ai_review') AND account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal()) WITH CHECK(command_type IN ('analysis_workbook_build','analysis_workbook_qc','auction_control_workbook_build','workbook_ai_review') AND account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal());

ALTER TABLE jobs.job_step DROP CONSTRAINT job_step_operation_class_check;
ALTER TABLE jobs.job_step ADD CONSTRAINT job_step_operation_class_check CHECK(operation_class IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','ai_source_proposal','internal_controlled_export','auction_control_workbook_build'));
ALTER TABLE jobs.job_scope DROP CONSTRAINT job_scope_operation_code_check;
ALTER TABLE jobs.job_scope ADD CONSTRAINT job_scope_operation_code_check CHECK(operation_code IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','ai_source_proposal','internal_controlled_export','auction_control_workbook_build'));
ALTER TABLE jobs.job_scope_operation DROP CONSTRAINT job_scope_operation_operation_code_check;
ALTER TABLE jobs.job_scope_operation ADD CONSTRAINT job_scope_operation_operation_code_check CHECK(operation_code IN ('reference_workspace_build','analysis_workbook_build','analysis_workbook_qc','ai_source_proposal','internal_controlled_export','auction_control_workbook_build'));

CREATE TABLE IF NOT EXISTS deliverable.auction_control_lineage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL, deal_id uuid NOT NULL, revision_id uuid NOT NULL,
  object_id uuid NOT NULL, object_type text NOT NULL, object_version text, state_code text NOT NULL,
  native_locator jsonb NOT NULL, reader_locator jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id,deal_id,revision_id,object_id,object_version),
  FOREIGN KEY(account_id,deal_id,revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id),
  FOREIGN KEY(account_id,deal_id) REFERENCES app.deal(account_id,id)
);
ALTER TABLE deliverable.auction_control_lineage ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable.auction_control_lineage FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auction_lineage_read_scope ON deliverable.auction_control_lineage;
DROP POLICY IF EXISTS auction_lineage_owner ON deliverable.auction_control_lineage;
CREATE POLICY auction_lineage_read_scope ON deliverable.auction_control_lineage FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY auction_lineage_owner ON deliverable.auction_control_lineage TO app_deliverable_owner USING(account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal()) WITH CHECK(account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal());
GRANT SELECT ON deliverable.auction_control_lineage TO app_runtime;
GRANT SELECT,INSERT ON deliverable.auction_control_lineage TO app_deliverable_owner;

CREATE OR REPLACE FUNCTION deliverable.create_auction_control_deliverable(p_key text,p_digest text,p_body jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE replay jsonb; row deliverable.deliverable%ROWTYPE;
BEGIN
  PERFORM deliverable.assert_write(); replay:=deliverable.replay('create_auction_control_deliverable',p_key,p_digest); IF replay IS NOT NULL THEN RETURN replay; END IF;
  INSERT INTO deliverable.deliverable(account_id,deal_id,deliverable_type,title,purpose,audience,confidentiality,owner_id)
  VALUES(app.policy_account_id(),app.policy_deal_id(),'auction_control_workbook',p_body->>'title',p_body->>'purpose',p_body->>'audience',p_body->>'confidentiality',app.policy_actor_id()) RETURNING * INTO row;
  PERFORM app.record_audit('deliverable_created','completed','deliverable',row.id::text,'auction_control_workbook',gen_random_uuid()::text);
  RETURN deliverable.remember('create_auction_control_deliverable',p_key,p_digest,to_jsonb(row));
END $$;

CREATE OR REPLACE FUNCTION deliverable.build_auction_control_input(p_deliverable uuid,p_revision uuid,p_limitations jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=process,deliverable,app,pg_catalog AS $$
DECLARE parent deliverable.deliverable%ROWTYPE; buyers jsonb; input jsonb; source_classes text[];
BEGIN
  SELECT * INTO parent FROM deliverable.deliverable WHERE id=p_deliverable AND deliverable_type='auction_control_workbook'; IF NOT FOUND THEN RAISE EXCEPTION 'artifact_scope_unavailable'; END IF;
  SELECT process.get_buyer_candidate_projection(app.policy_account_id(),app.policy_actor_id(),app.policy_deal_id(),NULL) INTO buyers;
  input:=jsonb_build_object('schema_version','1.0.0','revision_id',p_revision,'deliverable_id',parent.id,'deal_id',parent.deal_id,'deal_name',(SELECT name FROM app.deal WHERE id=parent.deal_id),'template_version','auction-control-1.0.0','provenance','governed_process_snapshot','purpose',parent.purpose,'audience',parent.audience,'confidentiality',parent.confidentiality,'evaluation_time',to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'limitations',coalesce(p_limitations,'[]'::jsonb),'calculations','[]'::jsonb,'process_state',jsonb_build_object('buyers',coalesce(buyers,'[]'::jsonb),'outreach',jsonb_build_object('state','not_applicable','reason','Outreach is a later governed process object'),'nda_access',jsonb_build_object('state','not_applicable','reason','NDA and Data-Room Access are not fabricated before their authority objects exist'),'diligence',jsonb_build_object('state','not_applicable','reason','Diligence requests are a later governed process object'),'bids',jsonb_build_object('state','not_applicable','reason','Bid objects are a later governed process object'),'milestones',jsonb_build_object('state','not_applicable','reason','Milestone objects are a later governed process object'),'decisions',jsonb_build_object('state','current','reason','Buyer approval decisions remain distinct and linked to each Buyer Candidate'),'history',jsonb_build_object('state','current','reason','Candidate history is included in each Buyer row')));
  SELECT array_agg(DISTINCT sr.provenance_class) INTO source_classes FROM process.buyer_candidate_proposal pr
    CROSS JOIN LATERAL jsonb_array_elements(pr.eligible_source_observations) observation
    JOIN source.source_record sr ON sr.id=(observation->>'source_record_id')::uuid
    WHERE pr.account_id=parent.account_id AND pr.deal_id=parent.deal_id;
  input:=input||jsonb_build_object('provenance',CASE WHEN 'real'=ANY(source_classes) THEN 'real' ELSE 'synthetic' END);
  RETURN input;
END $$;

CREATE OR REPLACE FUNCTION deliverable.create_auction_control_revision(p_parent uuid,p_expected_version bigint,p_key text,p_digest text,p_limitations jsonb,p_release text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE parent deliverable.deliverable%ROWTYPE; revision uuid:=gen_random_uuid(); job uuid:=gen_random_uuid(); input jsonb; ordinal integer; workspace record;
BEGIN
  PERFORM deliverable.assert_write(); PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws(':',app.policy_account_id(),app.policy_deal_id(),p_parent,'auction_control_revision'),0));
  SELECT * INTO parent FROM deliverable.deliverable WHERE id=p_parent AND deliverable_type='auction_control_workbook' FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'artifact_scope_unavailable'; END IF;
  IF parent.row_version<>p_expected_version THEN RAISE EXCEPTION 'artifact_version_conflict'; END IF;
  IF deliverable.replay('create_auction_control_revision',p_key,p_digest) IS NOT NULL THEN RETURN deliverable.replay('create_auction_control_revision',p_key,p_digest); END IF;
  input:=deliverable.build_auction_control_input(parent.id,revision,p_limitations); SELECT coalesce(max(r.ordinal),0)+1 INTO ordinal FROM deliverable.deliverable_revision r WHERE deliverable_id=parent.id;
  INSERT INTO deliverable.deliverable_revision(id,account_id,deal_id,deliverable_id,ordinal,predecessor_id,purpose,audience,confidentiality,template_version,build_input,basis_digest,created_by) VALUES(revision,parent.account_id,parent.deal_id,parent.id,ordinal,parent.current_revision_id,parent.purpose,parent.audience,parent.confidentiality,'auction-control-1.0.0',input,encode(extensions.digest(input::text,'sha256'),'hex'),app.policy_actor_id());
  INSERT INTO deliverable.auction_control_lineage(account_id,deal_id,revision_id,object_id,object_type,object_version,state_code,native_locator,reader_locator)
    SELECT parent.account_id,parent.deal_id,revision,(item->>'id')::uuid,'BuyerCandidate',item->>'version',CASE WHEN jsonb_array_length(coalesce(item->'approvals','[]'::jsonb))>0 THEN 'approved' ELSE 'candidate' END,
      jsonb_build_object('sheet','Buyer Universe','range',format('A%s:H%s',9+row_number() OVER (),9+row_number() OVER ())),jsonb_build_object('pages',jsonb_build_array(2),'identity',item->>'id')
    FROM jsonb_array_elements(input->'process_state'->'buyers') item;
  SELECT w.posture_version,a.security_epoch INTO workspace FROM app.deal_workspace w JOIN app.account a ON a.id=w.account_id WHERE w.deal_id=parent.deal_id AND w.account_id=parent.account_id;
  INSERT INTO jobs.job(id,account_id,deal_id,actor_id,command_type,purpose_code,accepted_inputs,input_digest,input_version,workflow_version,release_id,allowance_class,allowance_quantity,allowance_posture,workspace_posture_version,security_epoch,state) VALUES(job,parent.account_id,parent.deal_id,app.policy_actor_id(),'auction_control_workbook_build','auction_control_workbook_build',jsonb_build_object('revision_id',revision),encode(extensions.digest(input::text,'sha256'),'hex'),'1.0.0','auction-control-1.0.0',p_release,'auction_control_workbook_build',1,'reserved',workspace.posture_version,workspace.security_epoch,'queued');
  INSERT INTO deliverable.workbook_job(job_id,account_id,deal_id,revision_id,input) VALUES(job,parent.account_id,parent.deal_id,revision,input);
  UPDATE deliverable.deliverable SET current_revision_id=revision,row_version=row_version+1 WHERE id=parent.id;
  RETURN deliverable.remember('create_auction_control_revision',p_key,p_digest,jsonb_build_object('id',job,'job_type','auction_control_workbook_build','state','queued','revision_id',revision,'deliverable_id',parent.id,'row_version',parent.row_version+1));
END $$;

REVOKE ALL ON FUNCTION deliverable.create_auction_control_deliverable(text,text,jsonb),deliverable.build_auction_control_input(uuid,uuid,jsonb),deliverable.create_auction_control_revision(uuid,bigint,text,text,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION deliverable.create_auction_control_deliverable(text,text,jsonb),deliverable.create_auction_control_revision(uuid,bigint,text,text,jsonb,text) TO app_runtime;
