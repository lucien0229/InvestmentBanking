-- Ticket 08: exact Source Packets, Work Objectives, Output Ceilings, and
-- append-only source condition changes. Runtime writes go through typed
-- SECURITY DEFINER functions owned by the non-login source owner.

CREATE SCHEMA IF NOT EXISTS analysis;

CREATE TABLE IF NOT EXISTS source.source_packet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  packet_name text NOT NULL CHECK (length(btrim(packet_name)) BETWEEN 1 AND 160),
  purpose_code text NOT NULL CHECK (length(btrim(purpose_code)) BETWEEN 1 AND 120),
  owner_actor_id uuid NOT NULL REFERENCES app.actor(id),
  current_version_id uuid,
  row_version bigint NOT NULL DEFAULT 1 CHECK (row_version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, owner_actor_id) REFERENCES app.account_actor(account_id, actor_id)
);

CREATE TABLE IF NOT EXISTS source.source_packet_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  packet_id uuid NOT NULL REFERENCES source.source_packet(id),
  version_ordinal integer NOT NULL CHECK (version_ordinal > 0),
  purpose_code text NOT NULL CHECK (length(btrim(purpose_code)) BETWEEN 1 AND 120),
  scope_statement text NOT NULL CHECK (length(btrim(scope_statement)) BETWEEN 1 AND 1000),
  change_reason text NOT NULL CHECK (length(btrim(change_reason)) BETWEEN 1 AND 500),
  created_by uuid NOT NULL REFERENCES app.actor(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (packet_id, version_ordinal),
  UNIQUE (account_id, id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, packet_id) REFERENCES source.source_packet(account_id, id),
  FOREIGN KEY (account_id, created_by) REFERENCES app.account_actor(account_id, actor_id)
);

ALTER TABLE source.source_packet
  DROP CONSTRAINT IF EXISTS source_packet_current_version_fk;
ALTER TABLE source.source_packet
  ADD CONSTRAINT source_packet_current_version_fk
  FOREIGN KEY (account_id, current_version_id)
  REFERENCES source.source_packet_version(account_id, id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS source.source_packet_member (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  packet_version_id uuid NOT NULL REFERENCES source.source_packet_version(id),
  source_record_id uuid NOT NULL REFERENCES source.source_record(id),
  member_role text NOT NULL DEFAULT 'evidence_input',
  inclusion_reason text NOT NULL CHECK (length(btrim(inclusion_reason)) BETWEEN 1 AND 500),
  sort_key integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (packet_version_id, source_record_id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, packet_version_id) REFERENCES source.source_packet_version(account_id, id),
  FOREIGN KEY (account_id, source_record_id) REFERENCES source.source_record(account_id, id)
);

CREATE TABLE IF NOT EXISTS source.source_packet_exclusion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  packet_version_id uuid NOT NULL REFERENCES source.source_packet_version(id),
  excluded_material text NOT NULL CHECK (length(btrim(excluded_material)) BETWEEN 1 AND 500),
  exclusion_reason text NOT NULL CHECK (length(btrim(exclusion_reason)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (packet_version_id, excluded_material),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, packet_version_id) REFERENCES source.source_packet_version(account_id, id)
);

CREATE TABLE IF NOT EXISTS app.work_objective (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  packet_version_id uuid NOT NULL REFERENCES source.source_packet_version(id),
  objective_type text NOT NULL CHECK (objective_type IN ('analysis','deliverable','process','question')),
  purpose_code text NOT NULL CHECK (length(btrim(purpose_code)) BETWEEN 1 AND 120),
  objective_text text NOT NULL CHECK (length(btrim(objective_text)) BETWEEN 1 AND 1000),
  intended_use text NOT NULL CHECK (intended_use IN ('internal_deal_execution','internal_analysis','controlled_export','external_distribution')),
  intended_audience text NOT NULL CHECK (length(btrim(intended_audience)) BETWEEN 1 AND 240),
  requested_scope text NOT NULL CHECK (length(btrim(requested_scope)) BETWEEN 1 AND 1000),
  accepted_scope text,
  status_code text NOT NULL DEFAULT 'proposed' CHECK (status_code IN ('proposed','accepted','blocked','completed')),
  actor_id uuid NOT NULL REFERENCES app.actor(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (account_id, id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, packet_version_id) REFERENCES source.source_packet_version(account_id, id),
  FOREIGN KEY (account_id, actor_id) REFERENCES app.account_actor(account_id, actor_id)
);

CREATE TABLE IF NOT EXISTS app.output_ceiling_assessment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  packet_version_id uuid NOT NULL REFERENCES source.source_packet_version(id),
  work_objective_id uuid REFERENCES app.work_objective(id),
  ceiling_code text NOT NULL CHECK (ceiling_code IN ('supported_internal_processing','anchor_inventory_only','bounded_analysis_only','metadata_only','blocked')),
  permitted_scope jsonb NOT NULL DEFAULT '[]'::jsonb,
  excluded_scope jsonb NOT NULL DEFAULT '[]'::jsonb,
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  recovery_plan jsonb NOT NULL DEFAULT '[]'::jsonb,
  basis jsonb NOT NULL DEFAULT '{}'::jsonb,
  supersedes_id uuid REFERENCES app.output_ceiling_assessment(id),
  assessed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, packet_version_id) REFERENCES source.source_packet_version(account_id, id),
  FOREIGN KEY (account_id, work_objective_id) REFERENCES app.work_objective(account_id, id)
);

CREATE TABLE IF NOT EXISTS app.output_ceiling_operation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  assessment_id uuid NOT NULL REFERENCES app.output_ceiling_assessment(id),
  operation_code text NOT NULL CHECK (operation_code IN ('source_inventory','claim_mapping','deterministic_analysis','ai_processing','native_artifact','reader_copy','internal_controlled_export','external_circulation')),
  posture text NOT NULL CHECK (posture IN ('permitted','prohibited')),
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (assessment_id, operation_code),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, assessment_id) REFERENCES app.output_ceiling_assessment(account_id, id)
);

CREATE TABLE IF NOT EXISTS app.output_ceiling_blocker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  assessment_id uuid NOT NULL REFERENCES app.output_ceiling_assessment(id),
  blocker_code text NOT NULL CHECK (blocker_code IN ('missing_source','stale_source','conflicted_source','withdrawn_source','rights_blocked','rights_unassessed','rights_limited','insufficient_parse','preflight_required','wrong_source_scope','wrong_source_version')),
  affected_scope text NOT NULL,
  smallest_recovery_action text NOT NULL,
  basis jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (assessment_id, blocker_code, affected_scope),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, assessment_id) REFERENCES app.output_ceiling_assessment(account_id, id)
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='output_ceiling_blocker_blocker_code_check') THEN
    ALTER TABLE app.output_ceiling_blocker DROP CONSTRAINT output_ceiling_blocker_blocker_code_check;
  END IF;
  ALTER TABLE app.output_ceiling_blocker ADD CONSTRAINT output_ceiling_blocker_blocker_code_check CHECK (blocker_code IN ('missing_source','stale_source','conflicted_source','withdrawn_source','rights_blocked','rights_unassessed','rights_limited','insufficient_parse','preflight_required','wrong_source_scope','wrong_source_version'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS source.source_condition_assessment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  source_record_id uuid NOT NULL REFERENCES source.source_record(id),
  purpose_code text NOT NULL,
  freshness_code text NOT NULL CHECK (freshness_code IN ('current','stale','unknown')),
  conflict_code text NOT NULL CHECK (conflict_code IN ('none','conflicted','unknown')),
  disposition_code text NOT NULL CHECK (disposition_code IN ('active','superseded','withdrawn','historical')),
  basis jsonb NOT NULL DEFAULT '{}'::jsonb,
  effective_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid NOT NULL REFERENCES app.actor(id),
  supersedes_id uuid REFERENCES source.source_condition_assessment(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, source_record_id) REFERENCES source.source_record(account_id, id),
  FOREIGN KEY (account_id, recorded_by) REFERENCES app.account_actor(account_id, actor_id)
);

CREATE TABLE IF NOT EXISTS source.source_condition_current_selection (
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  source_record_id uuid NOT NULL REFERENCES source.source_record(id),
  purpose_code text NOT NULL,
  assessment_id uuid NOT NULL REFERENCES source.source_condition_assessment(id),
  row_version bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, source_record_id, purpose_code),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, source_record_id) REFERENCES source.source_record(account_id, id),
  FOREIGN KEY (account_id, assessment_id) REFERENCES source.source_condition_assessment(account_id, id)
);

CREATE TABLE IF NOT EXISTS source.source_rights_posture_assessment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  source_record_id uuid NOT NULL REFERENCES source.source_record(id),
  purpose_code text NOT NULL,
  rights_code text NOT NULL CHECK (rights_code IN ('unassessed','allowed','limited','blocked','withdrawn')),
  permitted_operations jsonb NOT NULL DEFAULT '[]'::jsonb,
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  basis jsonb NOT NULL DEFAULT '{}'::jsonb,
  effective_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid NOT NULL REFERENCES app.actor(id),
  supersedes_id uuid REFERENCES source.source_rights_posture_assessment(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, source_record_id) REFERENCES source.source_record(account_id, id),
  FOREIGN KEY (account_id, recorded_by) REFERENCES app.account_actor(account_id, actor_id)
);

CREATE TABLE IF NOT EXISTS source.source_rights_current_selection (
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  source_record_id uuid NOT NULL REFERENCES source.source_record(id),
  purpose_code text NOT NULL,
  assessment_id uuid NOT NULL REFERENCES source.source_rights_posture_assessment(id),
  row_version bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, source_record_id, purpose_code),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, source_record_id) REFERENCES source.source_record(account_id, id),
  FOREIGN KEY (account_id, assessment_id) REFERENCES source.source_rights_posture_assessment(account_id, id)
);

CREATE TABLE IF NOT EXISTS analysis.impact_assessment_candidate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  trigger_kind text NOT NULL CHECK (trigger_kind IN ('source_condition_changed','source_rights_changed','packet_membership_changed')),
  trigger_object_id uuid NOT NULL,
  packet_version_id uuid REFERENCES source.source_packet_version(id),
  affected_scope jsonb NOT NULL,
  impact_code text NOT NULL CHECK (impact_code IN ('potentially_affected','materially_affected','unable_to_assess')),
  recalculation_required boolean NOT NULL DEFAULT false,
  regeneration_required boolean NOT NULL DEFAULT false,
  rereview_required boolean NOT NULL DEFAULT false,
  circulation_blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, packet_version_id) REFERENCES source.source_packet_version(account_id, id)
);

CREATE TABLE IF NOT EXISTS app.circulation_candidate_block (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  packet_version_id uuid REFERENCES source.source_packet_version(id),
  source_record_id uuid REFERENCES source.source_record(id),
  reason_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, packet_version_id) REFERENCES source.source_packet_version(account_id, id),
  FOREIGN KEY (account_id, source_record_id) REFERENCES source.source_record(account_id, id)
);

-- Composite tenant/deal keys make a wrong-Deal foreign key impossible even for
-- a privileged writer. The SECURITY DEFINER procedures repeat these checks so
-- API, projection, and worker paths all fail closed with the same scope.
CREATE UNIQUE INDEX IF NOT EXISTS source_record_deal_scope_uq ON source.source_record(account_id, deal_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS source_packet_deal_scope_uq ON source.source_packet(account_id, deal_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS source_packet_version_deal_scope_uq ON source.source_packet_version(account_id, deal_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS output_ceiling_deal_scope_uq ON app.output_ceiling_assessment(account_id, deal_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS source_condition_deal_scope_uq ON source.source_condition_assessment(account_id, deal_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS source_rights_deal_scope_uq ON source.source_rights_posture_assessment(account_id, deal_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS source_packet_member_record_once_uq ON source.source_packet_member(packet_version_id, source_record_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='source_packet_version_packet_deal_fk') THEN
    ALTER TABLE source.source_packet_version ADD CONSTRAINT source_packet_version_packet_deal_fk FOREIGN KEY (account_id, deal_id, packet_id) REFERENCES source.source_packet(account_id, deal_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='source_packet_member_record_deal_fk') THEN
    ALTER TABLE source.source_packet_member ADD CONSTRAINT source_packet_member_record_deal_fk FOREIGN KEY (account_id, deal_id, source_record_id) REFERENCES source.source_record(account_id, deal_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='source_packet_member_version_deal_fk') THEN
    ALTER TABLE source.source_packet_member ADD CONSTRAINT source_packet_member_version_deal_fk FOREIGN KEY (account_id, deal_id, packet_version_id) REFERENCES source.source_packet_version(account_id, deal_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='source_packet_exclusion_version_deal_fk') THEN
    ALTER TABLE source.source_packet_exclusion ADD CONSTRAINT source_packet_exclusion_version_deal_fk FOREIGN KEY (account_id, deal_id, packet_version_id) REFERENCES source.source_packet_version(account_id, deal_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='work_objective_packet_version_deal_fk') THEN
    ALTER TABLE app.work_objective ADD CONSTRAINT work_objective_packet_version_deal_fk FOREIGN KEY (account_id, deal_id, packet_version_id) REFERENCES source.source_packet_version(account_id, deal_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ceiling_packet_version_deal_fk') THEN
    ALTER TABLE app.output_ceiling_assessment ADD CONSTRAINT ceiling_packet_version_deal_fk FOREIGN KEY (account_id, deal_id, packet_version_id) REFERENCES source.source_packet_version(account_id, deal_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='condition_current_record_deal_fk') THEN
    ALTER TABLE source.source_condition_current_selection ADD CONSTRAINT condition_current_record_deal_fk FOREIGN KEY (account_id, deal_id, source_record_id) REFERENCES source.source_record(account_id, deal_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='condition_current_assessment_deal_fk') THEN
    ALTER TABLE source.source_condition_current_selection ADD CONSTRAINT condition_current_assessment_deal_fk FOREIGN KEY (account_id, deal_id, assessment_id) REFERENCES source.source_condition_assessment(account_id, deal_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='rights_current_record_deal_fk') THEN
    ALTER TABLE source.source_rights_current_selection ADD CONSTRAINT rights_current_record_deal_fk FOREIGN KEY (account_id, deal_id, source_record_id) REFERENCES source.source_record(account_id, deal_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='rights_current_assessment_deal_fk') THEN
    ALTER TABLE source.source_rights_current_selection ADD CONSTRAINT rights_current_assessment_deal_fk FOREIGN KEY (account_id, deal_id, assessment_id) REFERENCES source.source_rights_posture_assessment(account_id, deal_id, id);
  END IF;
END
$$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'source_packet','source_packet_version','source_packet_member','source_packet_exclusion',
    'source_condition_assessment','source_condition_current_selection',
    'source_rights_posture_assessment','source_rights_current_selection'
  ] LOOP
    EXECUTE format('ALTER TABLE source.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE source.%I FORCE ROW LEVEL SECURITY', table_name);
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['work_objective','output_ceiling_assessment','output_ceiling_operation','output_ceiling_blocker','circulation_candidate_block'] LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', table_name);
  END LOOP;
  ALTER TABLE analysis.impact_assessment_candidate ENABLE ROW LEVEL SECURITY;
  ALTER TABLE analysis.impact_assessment_candidate FORCE ROW LEVEL SECURITY;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'source_packet_scope' AND polrelid = 'source.source_packet'::regclass) THEN
    CREATE POLICY source_packet_scope ON source.source_packet FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY source_packet_version_scope ON source.source_packet_version FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY source_packet_member_scope ON source.source_packet_member FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY source_packet_exclusion_scope ON source.source_packet_exclusion FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY source_condition_scope ON source.source_condition_assessment FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY source_condition_current_scope ON source.source_condition_current_selection FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY source_rights_scope ON source.source_rights_posture_assessment FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY source_rights_current_scope ON source.source_rights_current_selection FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY work_objective_scope ON app.work_objective FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY ceiling_scope ON app.output_ceiling_assessment FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY ceiling_operation_scope ON app.output_ceiling_operation FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY ceiling_blocker_scope ON app.output_ceiling_blocker FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY circulation_block_scope ON app.circulation_candidate_block FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
    CREATE POLICY impact_candidate_scope ON analysis.impact_assessment_candidate FOR SELECT TO app_runtime USING (account_id = app.policy_account_id() AND deal_id = app.policy_deal_id());
  END IF;
END
$$;

GRANT USAGE ON SCHEMA source, app, analysis TO app_source_owner;
GRANT SELECT, INSERT, UPDATE ON source.source_packet, source.source_packet_version, source.source_packet_member, source.source_packet_exclusion, source.source_condition_assessment, source.source_condition_current_selection, source.source_rights_posture_assessment, source.source_rights_current_selection TO app_source_owner;
GRANT SELECT, INSERT, UPDATE ON app.work_objective, app.output_ceiling_assessment, app.output_ceiling_operation, app.output_ceiling_blocker, app.circulation_candidate_block TO app_source_owner;
GRANT SELECT, INSERT ON analysis.impact_assessment_candidate TO app_source_owner;
GRANT SELECT ON source.source_packet, source.source_packet_version, source.source_packet_member, source.source_packet_exclusion, source.source_condition_assessment, source.source_condition_current_selection, source.source_rights_posture_assessment, source.source_rights_current_selection TO app_runtime;
GRANT SELECT ON app.work_objective, app.output_ceiling_assessment, app.output_ceiling_operation, app.output_ceiling_blocker, app.circulation_candidate_block TO app_runtime;
GRANT SELECT ON analysis.impact_assessment_candidate TO app_runtime;

CREATE OR REPLACE FUNCTION source.prevent_source_packet_version_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = source, pg_catalog AS $$ BEGIN RAISE EXCEPTION 'source_packet_version_immutable' USING ERRCODE = '23514'; END $$;
DROP TRIGGER IF EXISTS source_packet_version_immutable ON source.source_packet_version;
CREATE TRIGGER source_packet_version_immutable BEFORE UPDATE OR DELETE ON source.source_packet_version FOR EACH ROW EXECUTE FUNCTION source.prevent_source_packet_version_mutation();
DROP TRIGGER IF EXISTS source_packet_member_immutable ON source.source_packet_member;
CREATE TRIGGER source_packet_member_immutable BEFORE UPDATE OR DELETE ON source.source_packet_member FOR EACH ROW EXECUTE FUNCTION source.prevent_source_packet_version_mutation();
DROP TRIGGER IF EXISTS source_packet_exclusion_immutable ON source.source_packet_exclusion;
CREATE TRIGGER source_packet_exclusion_immutable BEFORE UPDATE OR DELETE ON source.source_packet_exclusion FOR EACH ROW EXECUTE FUNCTION source.prevent_source_packet_version_mutation();

CREATE OR REPLACE FUNCTION source.prevent_packet_snapshot_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = source, app, analysis, pg_catalog AS $$ BEGIN RAISE EXCEPTION 'packet_snapshot_immutable' USING ERRCODE = '23514'; END $$;
DROP TRIGGER IF EXISTS work_objective_immutable ON app.work_objective;
CREATE TRIGGER work_objective_immutable BEFORE UPDATE OR DELETE ON app.work_objective FOR EACH ROW EXECUTE FUNCTION source.prevent_packet_snapshot_mutation();
DROP TRIGGER IF EXISTS ceiling_assessment_immutable ON app.output_ceiling_assessment;
CREATE TRIGGER ceiling_assessment_immutable BEFORE UPDATE OR DELETE ON app.output_ceiling_assessment FOR EACH ROW EXECUTE FUNCTION source.prevent_packet_snapshot_mutation();
DROP TRIGGER IF EXISTS ceiling_operation_immutable ON app.output_ceiling_operation;
CREATE TRIGGER ceiling_operation_immutable BEFORE UPDATE OR DELETE ON app.output_ceiling_operation FOR EACH ROW EXECUTE FUNCTION source.prevent_packet_snapshot_mutation();
DROP TRIGGER IF EXISTS ceiling_blocker_immutable ON app.output_ceiling_blocker;
CREATE TRIGGER ceiling_blocker_immutable BEFORE UPDATE OR DELETE ON app.output_ceiling_blocker FOR EACH ROW EXECUTE FUNCTION source.prevent_packet_snapshot_mutation();
DROP TRIGGER IF EXISTS source_condition_immutable ON source.source_condition_assessment;
CREATE TRIGGER source_condition_immutable BEFORE UPDATE OR DELETE ON source.source_condition_assessment FOR EACH ROW EXECUTE FUNCTION source.prevent_packet_snapshot_mutation();
DROP TRIGGER IF EXISTS source_rights_immutable ON source.source_rights_posture_assessment;
CREATE TRIGGER source_rights_immutable BEFORE UPDATE OR DELETE ON source.source_rights_posture_assessment FOR EACH ROW EXECUTE FUNCTION source.prevent_packet_snapshot_mutation();
DROP TRIGGER IF EXISTS impact_candidate_immutable ON analysis.impact_assessment_candidate;
CREATE TRIGGER impact_candidate_immutable BEFORE UPDATE OR DELETE ON analysis.impact_assessment_candidate FOR EACH ROW EXECUTE FUNCTION source.prevent_packet_snapshot_mutation();

CREATE OR REPLACE FUNCTION source.prevent_source_packet_pointer_mismatch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, pg_catalog AS $$
BEGIN
  IF NEW.current_version_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM source.source_packet_version v
    WHERE v.id = NEW.current_version_id AND v.account_id = NEW.account_id AND v.deal_id = NEW.deal_id AND v.packet_id = NEW.id
  ) THEN RAISE EXCEPTION 'source_packet_current_pointer_mismatch' USING ERRCODE = '42501'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS source_packet_pointer_scope ON source.source_packet;
CREATE TRIGGER source_packet_pointer_scope BEFORE INSERT OR UPDATE ON source.source_packet FOR EACH ROW EXECUTE FUNCTION source.prevent_source_packet_pointer_mismatch();

CREATE OR REPLACE FUNCTION source.packet_blockers(
  p_account_id uuid, p_deal_id uuid, p_packet_version_id uuid, p_purpose text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, app, pg_catalog AS $$
DECLARE blockers jsonb := '[]'::jsonb; member_row record; coverage_row record; rights_row record; condition_row record; reliance_row record; web_stale boolean;
BEGIN
  FOR member_row IN SELECT m.source_record_id, m.inclusion_reason, r.rights_posture, r.reliance_state, r.disposition_code, r.limitations, r.source_material_id FROM source.source_packet_member m JOIN source.source_record r ON r.id=m.source_record_id WHERE m.account_id=p_account_id AND m.deal_id=p_deal_id AND m.packet_version_id=p_packet_version_id ORDER BY m.sort_key,m.created_at LOOP
    rights_row := NULL;
    SELECT ra.* INTO rights_row FROM source.source_rights_current_selection cs JOIN source.source_rights_posture_assessment ra ON ra.id=cs.assessment_id WHERE cs.account_id=p_account_id AND cs.deal_id=p_deal_id AND cs.source_record_id=member_row.source_record_id AND cs.purpose_code=p_purpose;
    condition_row := NULL;
    SELECT ca.* INTO condition_row FROM source.source_condition_current_selection cs JOIN source.source_condition_assessment ca ON ca.id=cs.assessment_id WHERE cs.account_id=p_account_id AND cs.deal_id=p_deal_id AND cs.source_record_id=member_row.source_record_id AND cs.purpose_code=p_purpose;
    reliance_row := NULL;
    SELECT ra.* INTO reliance_row FROM source.reliance_current_selection rc JOIN source.source_reliance_assessment ra ON ra.id=rc.assessment_id WHERE rc.account_id=p_account_id AND rc.deal_id=p_deal_id AND rc.source_record_id=member_row.source_record_id AND rc.purpose_code=p_purpose;
    web_stale := EXISTS (SELECT 1 FROM source.web_evidence_observation w WHERE w.source_record_id=member_row.source_record_id AND w.stale_after IS NOT NULL AND w.stale_after <= clock_timestamp());
    IF coalesce(rights_row.rights_code, '') IN ('blocked','withdrawn') OR lower(coalesce(member_row.rights_posture,'')) IN ('blocked','withdrawn','rights_blocked') OR coalesce((SELECT (r.rights_basis->>'receipt_permitted')::boolean FROM source.source_record r WHERE r.id=member_row.source_record_id), true) IS FALSE THEN
      blockers := blockers || jsonb_build_array(jsonb_build_object('code',CASE WHEN coalesce(rights_row.rights_code,'')='withdrawn' OR lower(coalesce(member_row.rights_posture,''))='withdrawn' THEN 'withdrawn_source' ELSE 'rights_blocked' END,'source_record_id',member_row.source_record_id,'affected_scope','prospective reliance and dependent circulation','smallest_recovery_action','replace or remove the source, or record a narrower permitted purpose'));
    END IF;
    IF rights_row IS NULL AND lower(coalesce(member_row.rights_posture,'')) IN ('','unassessed') THEN blockers := blockers || jsonb_build_array(jsonb_build_object('code','rights_unassessed','source_record_id',member_row.source_record_id,'affected_scope','all substantive processing','smallest_recovery_action','record the exact Source Record rights posture')); END IF;
    IF coalesce(rights_row.rights_code,'')='limited' THEN blockers := blockers || jsonb_build_array(jsonb_build_object('code','rights_limited','source_record_id',member_row.source_record_id,'affected_scope','operations outside the recorded rights allowlist','smallest_recovery_action','narrow the operation to the rights allowlist or obtain a broader basis')); END IF;
    IF reliance_row IS NULL OR coalesce(reliance_row.reliance_state,'unassessed')='unassessed' THEN blockers := blockers || jsonb_build_array(jsonb_build_object('code','rights_unassessed','source_record_id',member_row.source_record_id,'affected_scope','prospective reliance','smallest_recovery_action','record a purpose-bound Source Reliance Assessment')); END IF;
    IF coalesce(reliance_row.reliance_state,'')='blocked' THEN blockers := blockers || jsonb_build_array(jsonb_build_object('code','rights_blocked','source_record_id',member_row.source_record_id,'affected_scope','prospective reliance and dependent circulation','smallest_recovery_action','replace or remove the source')); END IF;
    IF coalesce(reliance_row.reliance_state,'')='reliance_limited' THEN blockers := blockers || jsonb_build_array(jsonb_build_object('code','rights_limited','source_record_id',member_row.source_record_id,'affected_scope','operations outside the reliance basis','smallest_recovery_action','narrow the Work Objective or record a broader reliance basis')); END IF;
    IF coalesce(condition_row.disposition_code,'')='withdrawn' OR member_row.disposition_code='withdrawn' THEN blockers := blockers || jsonb_build_array(jsonb_build_object('code','withdrawn_source','source_record_id',member_row.source_record_id,'affected_scope','prospective reliance and dependent circulation','smallest_recovery_action','replace or remove the withdrawn source')); END IF;
    IF coalesce(condition_row.freshness_code,'')='stale' OR web_stale OR 'stale_observation' = ANY(ARRAY(SELECT jsonb_array_elements_text(coalesce(member_row.limitations,'[]'::jsonb)))) THEN blockers := blockers || jsonb_build_array(jsonb_build_object('code','stale_source','source_record_id',member_row.source_record_id,'affected_scope','current-period analysis and circulation','smallest_recovery_action','replace with a current Source Record or run Targeted Re-Preflight'));
    END IF;
    IF coalesce(condition_row.conflict_code,'')='conflicted' OR lower(coalesce(member_row.reliance_state,''))='conflicted' OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(coalesce(member_row.limitations,'[]'::jsonb)) x WHERE lower(x) LIKE '%conflict%') THEN blockers := blockers || jsonb_build_array(jsonb_build_object('code','conflicted_source','source_record_id',member_row.source_record_id,'affected_scope','dependent Claims and professional conclusions','smallest_recovery_action','record a scoped Human Decision or narrow the Work Objective'));
    END IF;
    SELECT c.* INTO coverage_row FROM source.processing_coverage c WHERE c.source_record_id=member_row.source_record_id;
    IF coverage_row IS NULL OR coalesce(coverage_row.coverage_code,'') IN ('original_bytes_only','insufficient','partial') OR coalesce((coverage_row.coverage_payload->>'substantive_parsing')::boolean, false) IS FALSE OR coalesce((coverage_row.coverage_payload->>'parse_status'),'') IN ('insufficient','failed') THEN blockers := blockers || jsonb_build_array(jsonb_build_object('code','insufficient_parse','source_record_id',member_row.source_record_id,'affected_scope','structured extraction and derived outputs','smallest_recovery_action','run supported parsing or provide a supported replacement export'));
    END IF;
  END LOOP;
  RETURN blockers;
END $$;

CREATE OR REPLACE FUNCTION source.ceiling_code(p_blockers jsonb, p_has_members boolean)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN NOT p_has_members THEN 'blocked'
    WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(p_blockers) x WHERE x->>'code' IN ('preflight_required')) THEN 'blocked'
    WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(p_blockers) x WHERE x->>'code' IN ('rights_blocked','rights_unassessed','withdrawn_source')) THEN 'metadata_only'
    WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(p_blockers) x WHERE x->>'code' = 'missing_source') THEN 'anchor_inventory_only'
    WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(p_blockers) x WHERE x->>'code' IN ('stale_source','conflicted_source','rights_limited','insufficient_parse')) THEN 'bounded_analysis_only'
    ELSE 'supported_internal_processing'
  END
$$;

CREATE OR REPLACE FUNCTION source.create_packet_ceiling(
  p_account_id uuid, p_deal_id uuid, p_packet_version_id uuid, p_work_objective_id uuid DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, app, pg_catalog AS $$
DECLARE blockers jsonb; ceiling text; assessment_id uuid := gen_random_uuid(); previous_id uuid; purpose_value text; has_members boolean; member_count integer; preflight_status text;
  permitted jsonb; excluded jsonb; recovery jsonb;
BEGIN
  SELECT v.purpose_code INTO purpose_value FROM source.source_packet_version v WHERE v.id=p_packet_version_id AND v.account_id=p_account_id AND v.deal_id=p_deal_id;
  IF purpose_value IS NULL THEN RAISE EXCEPTION 'source_packet_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF p_work_objective_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM app.work_objective o WHERE o.id=p_work_objective_id AND o.account_id=p_account_id AND o.deal_id=p_deal_id AND o.packet_version_id=p_packet_version_id) THEN RAISE EXCEPTION 'work_objective_scope_mismatch' USING ERRCODE='42501'; END IF;
  SELECT count(*)::integer, count(*) > 0 INTO member_count, has_members FROM source.source_packet_member m WHERE m.packet_version_id=p_packet_version_id;
  blockers := source.packet_blockers(p_account_id,p_deal_id,p_packet_version_id,purpose_value);
  IF NOT has_members THEN blockers := blockers || jsonb_build_array(jsonb_build_object('code','missing_source','source_record_id',NULL,'affected_scope','all substantive work','smallest_recovery_action','add an authorized anchor Source Record')); END IF;
  IF member_count = 1 THEN blockers := blockers || jsonb_build_array(jsonb_build_object('code','missing_source','source_record_id',NULL,'affected_scope','complete package and current-period conclusions','smallest_recovery_action','add the smallest additional authorized Source Record or narrow the Work Objective')); END IF;
  SELECT paid_preflight_status INTO preflight_status FROM app.deal_workspace WHERE account_id=p_account_id AND deal_id=p_deal_id;
  IF coalesce(preflight_status,'pending') NOT IN ('pass','limited-proceed') THEN blockers := blockers || jsonb_build_array(jsonb_build_object('code','preflight_required','source_record_id',NULL,'affected_scope','all substantive processing','smallest_recovery_action','run and accept the current Paid Preflight')); END IF;
  ceiling := source.ceiling_code(blockers,has_members);
  permitted := CASE ceiling WHEN 'supported_internal_processing' THEN '["source_inventory","claim_mapping","deterministic_analysis","native_artifact","reader_copy","internal_controlled_export"]'::jsonb WHEN 'bounded_analysis_only' THEN '["source_inventory","claim_mapping","deterministic_analysis"]'::jsonb WHEN 'anchor_inventory_only' THEN '["source_inventory","claim_mapping"]'::jsonb WHEN 'metadata_only' THEN '["source_inventory"]'::jsonb ELSE '[]'::jsonb END;
  excluded := CASE ceiling WHEN 'supported_internal_processing' THEN '["ai_processing","external_circulation"]'::jsonb WHEN 'bounded_analysis_only' THEN '["ai_processing","native_artifact","reader_copy","internal_controlled_export","external_circulation"]'::jsonb WHEN 'anchor_inventory_only' THEN '["deterministic_analysis","ai_processing","native_artifact","reader_copy","internal_controlled_export","external_circulation"]'::jsonb WHEN 'metadata_only' THEN '["claim_mapping","deterministic_analysis","ai_processing","native_artifact","reader_copy","internal_controlled_export","external_circulation"]'::jsonb ELSE '["source_inventory","claim_mapping","deterministic_analysis","ai_processing","native_artifact","reader_copy","internal_controlled_export","external_circulation"]'::jsonb END;
  recovery := coalesce((SELECT jsonb_agg(DISTINCT x->>'smallest_recovery_action') FROM jsonb_array_elements(blockers) x),'[]'::jsonb);
  SELECT id INTO previous_id FROM app.output_ceiling_assessment WHERE account_id=p_account_id AND packet_version_id=p_packet_version_id AND work_objective_id IS NOT DISTINCT FROM p_work_objective_id ORDER BY assessed_at DESC, id DESC LIMIT 1;
  INSERT INTO app.output_ceiling_assessment(id,account_id,deal_id,packet_version_id,work_objective_id,ceiling_code,permitted_scope,excluded_scope,blockers,recovery_plan,basis,supersedes_id) VALUES (assessment_id,p_account_id,p_deal_id,p_packet_version_id,p_work_objective_id,ceiling,permitted,excluded,blockers,recovery,jsonb_build_object('purpose',purpose_value,'packet_version_id',p_packet_version_id,'evaluated_at',clock_timestamp()),previous_id);
  INSERT INTO app.output_ceiling_operation(account_id,deal_id,assessment_id,operation_code,posture,conditions)
  SELECT p_account_id,p_deal_id,assessment_id,op,CASE WHEN permitted ? op THEN 'permitted' ELSE 'prohibited' END,CASE WHEN permitted ? op THEN '[]'::jsonb ELSE blockers END FROM jsonb_array_elements_text(excluded || permitted) op ON CONFLICT DO NOTHING;
  INSERT INTO app.output_ceiling_blocker(account_id,deal_id,assessment_id,blocker_code,affected_scope,smallest_recovery_action,basis)
  SELECT p_account_id,p_deal_id,assessment_id,x->>'code',x->>'affected_scope',x->>'smallest_recovery_action',x FROM jsonb_array_elements(blockers) x ON CONFLICT DO NOTHING;
  RETURN assessment_id;
END $$;

CREATE OR REPLACE FUNCTION source.create_source_packet(
  p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_packet_name text, p_purpose_code text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, app, pg_catalog AS $$
DECLARE packet_id uuid := gen_random_uuid();
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN RAISE EXCEPTION 'source_packet_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM app.deal d WHERE d.id=p_deal_id AND d.account_id=p_account_id AND d.activity_posture='active') THEN RAISE EXCEPTION 'source_packet_scope_mismatch' USING ERRCODE='42501'; END IF;
  INSERT INTO source.source_packet(id,account_id,deal_id,packet_name,purpose_code,owner_actor_id) VALUES (packet_id,p_account_id,p_deal_id,btrim(p_packet_name),btrim(p_purpose_code),p_actor_id);
  PERFORM app.record_audit('source_packet_created','completed','source_packet',packet_id::text,'packet_identity_created',gen_random_uuid()::text);
  RETURN jsonb_build_object('id',packet_id,'account_id',p_account_id,'deal_id',p_deal_id,'packet_name',btrim(p_packet_name),'purpose',btrim(p_purpose_code),'row_version',1,'current_version',NULL,'created_by',p_actor_id);
END $$;

CREATE OR REPLACE FUNCTION source.create_source_packet_version(
  p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_packet_id uuid, p_expected_row_version bigint,
  p_purpose_code text, p_scope_statement text, p_change_reason text, p_members jsonb, p_exclusions jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, app, pg_catalog AS $$
DECLARE packet_row source.source_packet%ROWTYPE; version_id uuid := gen_random_uuid(); ordinal integer; item jsonb; excluded_item jsonb; record_row source.source_record%ROWTYPE; ceiling_id uuid; members_out jsonb := '[]'::jsonb; exclusions_out jsonb := '[]'::jsonb;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN RAISE EXCEPTION 'source_packet_scope_mismatch' USING ERRCODE='42501'; END IF;
  SELECT * INTO packet_row FROM source.source_packet WHERE id=p_packet_id AND account_id=p_account_id AND deal_id=p_deal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'source_packet_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF packet_row.row_version <> p_expected_row_version THEN RAISE EXCEPTION 'source_packet_version_conflict' USING ERRCODE='40001'; END IF;
  IF btrim(p_purpose_code) IS DISTINCT FROM packet_row.purpose_code THEN RAISE EXCEPTION 'source_packet_purpose_mismatch' USING ERRCODE='22023'; END IF;
  IF jsonb_typeof(p_members) <> 'array' OR jsonb_typeof(p_exclusions) <> 'array' THEN RAISE EXCEPTION 'source_packet_members_invalid' USING ERRCODE='22023'; END IF;
  SELECT coalesce(max(version_ordinal),0)+1 INTO ordinal FROM source.source_packet_version WHERE packet_id=p_packet_id;
  INSERT INTO source.source_packet_version(id,account_id,deal_id,packet_id,version_ordinal,purpose_code,scope_statement,change_reason,created_by) VALUES (version_id,p_account_id,p_deal_id,p_packet_id,ordinal,btrim(p_purpose_code),btrim(p_scope_statement),btrim(p_change_reason),p_actor_id);
  FOR item IN SELECT value FROM jsonb_array_elements(p_members) LOOP
    IF nullif(item->>'source_record_id','') IS NULL OR nullif(item->>'inclusion_reason','') IS NULL THEN RAISE EXCEPTION 'source_packet_members_invalid' USING ERRCODE='22023'; END IF;
    SELECT * INTO record_row FROM source.source_record WHERE id=(item->>'source_record_id')::uuid AND account_id=p_account_id AND deal_id=p_deal_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'source_record_scope_mismatch' USING ERRCODE='42501'; END IF;
    INSERT INTO source.source_packet_member(account_id,deal_id,packet_version_id,source_record_id,member_role,inclusion_reason,sort_key) VALUES (p_account_id,p_deal_id,version_id,record_row.id,coalesce(nullif(item->>'member_role',''),'evidence_input'),btrim(item->>'inclusion_reason'),coalesce((item->>'sort_key')::integer,0));
    members_out := members_out || jsonb_build_array(jsonb_build_object('source_record_id',record_row.id,'source_material_id',record_row.source_material_id,'version',record_row.version_ordinal,'version_label',record_row.version_label,'member_role',coalesce(nullif(item->>'member_role',''),'evidence_input'),'inclusion_reason',btrim(item->>'inclusion_reason')));
  END LOOP;
  FOR excluded_item IN SELECT value FROM jsonb_array_elements(p_exclusions) LOOP
    IF jsonb_typeof(excluded_item)='string' THEN INSERT INTO source.source_packet_exclusion(account_id,deal_id,packet_version_id,excluded_material,exclusion_reason) VALUES (p_account_id,p_deal_id,version_id,btrim(trim(both '"' from excluded_item::text)),'declared outside this packet'); exclusions_out := exclusions_out || jsonb_build_array(jsonb_build_object('material',trim(both '"' from excluded_item::text),'reason','declared outside this packet'));
    ELSE INSERT INTO source.source_packet_exclusion(account_id,deal_id,packet_version_id,excluded_material,exclusion_reason) VALUES (p_account_id,p_deal_id,version_id,btrim(excluded_item->>'material'),btrim(coalesce(excluded_item->>'reason','declared outside this packet'))); exclusions_out := exclusions_out || jsonb_build_array(jsonb_build_object('material',btrim(excluded_item->>'material'),'reason',btrim(coalesce(excluded_item->>'reason','declared outside this packet')))); END IF;
  END LOOP;
  UPDATE source.source_packet SET current_version_id=version_id,row_version=row_version+1 WHERE id=p_packet_id;
  IF packet_row.current_version_id IS NOT NULL THEN
    INSERT INTO analysis.impact_assessment_candidate(account_id,deal_id,trigger_kind,trigger_object_id,packet_version_id,affected_scope,impact_code,recalculation_required,regeneration_required,rereview_required,circulation_blocked)
    VALUES (p_account_id,p_deal_id,'packet_membership_changed',version_id,version_id,jsonb_build_object('previous_packet_version_id',packet_row.current_version_id,'current_packet_version_id',version_id),'potentially_affected',true,true,true,false);
  END IF;
  ceiling_id := source.create_packet_ceiling(p_account_id,p_deal_id,version_id,NULL);
  PERFORM app.record_audit('source_packet_version_created','completed','source_packet_version',version_id::text,'exact_membership_and_ceiling_recorded',gen_random_uuid()::text);
  RETURN jsonb_build_object('id',version_id,'packet_id',p_packet_id,'version',ordinal,'purpose',p_purpose_code,'scope_statement',p_scope_statement,'change_reason',p_change_reason,'created_by',p_actor_id,'members',members_out,'exclusions',exclusions_out,'output_ceiling_id',ceiling_id,'packet_row_version',packet_row.row_version+1);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'source_packet_members_invalid' USING ERRCODE='23505';
END $$;

CREATE OR REPLACE FUNCTION source.create_work_objective(
  p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_packet_version_id uuid, p_objective_type text,
  p_purpose_code text, p_objective_text text, p_intended_use text, p_intended_audience text, p_requested_scope text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, app, pg_catalog AS $$
DECLARE objective_id uuid := gen_random_uuid(); ceiling_id uuid; latest app.output_ceiling_assessment%ROWTYPE; packet_purpose text; deal_purpose text; workspace_status text;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN RAISE EXCEPTION 'work_objective_scope_mismatch' USING ERRCODE='42501'; END IF;
  SELECT v.purpose_code INTO packet_purpose FROM source.source_packet_version v JOIN source.source_packet p ON p.id=v.packet_id WHERE v.id=p_packet_version_id AND v.account_id=p_account_id AND v.deal_id=p_deal_id;
  IF packet_purpose IS NULL THEN RAISE EXCEPTION 'source_packet_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF btrim(p_purpose_code) IS DISTINCT FROM packet_purpose THEN RAISE EXCEPTION 'source_packet_purpose_mismatch' USING ERRCODE='22023'; END IF;
  SELECT d.intended_purpose, w.paid_preflight_status INTO deal_purpose, workspace_status FROM app.deal d JOIN app.deal_workspace w ON w.deal_id=d.id WHERE d.id=p_deal_id AND d.account_id=p_account_id;
  IF p_intended_use='external_distribution' AND coalesce(deal_purpose,'') <> 'external_distribution' THEN RAISE EXCEPTION 'source_packet_purpose_mismatch' USING ERRCODE='22023'; END IF;
  INSERT INTO app.work_objective(id,account_id,deal_id,packet_version_id,objective_type,purpose_code,objective_text,intended_use,intended_audience,requested_scope,actor_id) VALUES (objective_id,p_account_id,p_deal_id,p_packet_version_id,p_objective_type,btrim(p_purpose_code),btrim(p_objective_text),p_intended_use,btrim(p_intended_audience),btrim(p_requested_scope),p_actor_id);
  ceiling_id := source.create_packet_ceiling(p_account_id,p_deal_id,p_packet_version_id,objective_id);
  SELECT * INTO latest FROM app.output_ceiling_assessment WHERE id=ceiling_id;
  PERFORM app.record_audit('work_objective_created','completed','work_objective',objective_id::text,'packet_bound_objective_recorded',gen_random_uuid()::text);
  RETURN jsonb_build_object('id',objective_id,'packet_version_id',p_packet_version_id,'objective_type',p_objective_type,'purpose',p_purpose_code,'objective_text',p_objective_text,'intended_use',p_intended_use,'intended_audience',p_intended_audience,'requested_scope',p_requested_scope,'status',CASE WHEN latest.ceiling_code='blocked' THEN 'blocked' ELSE 'proposed' END,'output_ceiling',jsonb_build_object('id',latest.id,'code',latest.ceiling_code,'permitted_scope',latest.permitted_scope,'excluded_scope',latest.excluded_scope,'blockers',latest.blockers,'recovery_plan',latest.recovery_plan));
END $$;

CREATE OR REPLACE FUNCTION source.get_source_packet_projection(
  p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_packet_id uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, app, analysis, pg_catalog AS $$
DECLARE packet_row source.source_packet%ROWTYPE; version_id uuid; ceiling_row app.output_ceiling_assessment%ROWTYPE; latest_objective app.work_objective%ROWTYPE;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN RETURN NULL; END IF;
  SELECT * INTO packet_row FROM source.source_packet WHERE id=p_packet_id AND account_id=p_account_id AND deal_id=p_deal_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF packet_row.current_version_id IS NULL THEN RETURN jsonb_build_object('id',packet_row.id,'account_id',packet_row.account_id,'deal_id',packet_row.deal_id,'packet_name',packet_row.packet_name,'purpose',packet_row.purpose_code,'owner_actor_id',packet_row.owner_actor_id,'row_version',packet_row.row_version,'current_version',NULL,'versions',jsonb_build_array(),'output_ceiling',NULL,'work_objective',NULL,'impact_candidates','[]'::jsonb,'circulation_blocked',false); END IF;
  version_id := packet_row.current_version_id;
  SELECT * INTO ceiling_row FROM app.output_ceiling_assessment WHERE packet_version_id=version_id ORDER BY assessed_at DESC,id DESC LIMIT 1;
  SELECT * INTO latest_objective FROM app.work_objective WHERE packet_version_id=version_id ORDER BY created_at DESC,id DESC LIMIT 1;
  RETURN jsonb_build_object('id',packet_row.id,'account_id',packet_row.account_id,'deal_id',packet_row.deal_id,'packet_name',packet_row.packet_name,'purpose',packet_row.purpose_code,'owner_actor_id',packet_row.owner_actor_id,'row_version',packet_row.row_version,'current_version',jsonb_build_object('id',version_id,'version',(SELECT version_ordinal FROM source.source_packet_version WHERE id=version_id),'purpose',(SELECT purpose_code FROM source.source_packet_version WHERE id=version_id),'scope_statement',(SELECT scope_statement FROM source.source_packet_version WHERE id=version_id),'change_reason',(SELECT change_reason FROM source.source_packet_version WHERE id=version_id),'created_by',(SELECT created_by FROM source.source_packet_version WHERE id=version_id),'created_at',(SELECT created_at FROM source.source_packet_version WHERE id=version_id),'members',coalesce((SELECT jsonb_agg(jsonb_build_object('source_record_id',m.source_record_id,'source_material_id',r.source_material_id,'version',r.version_ordinal,'version_label',r.version_label,'member_role',m.member_role,'inclusion_reason',m.inclusion_reason,'rights_posture',r.rights_posture,'reliance_state',r.reliance_state,'disposition',r.disposition_code,'limitations',r.limitations) ORDER BY m.sort_key,m.created_at) FROM source.source_packet_member m JOIN source.source_record r ON r.id=m.source_record_id WHERE m.packet_version_id=version_id),'[]'::jsonb),'exclusions',coalesce((SELECT jsonb_agg(jsonb_build_object('material',e.excluded_material,'reason',e.exclusion_reason) ORDER BY e.created_at) FROM source.source_packet_exclusion e WHERE e.packet_version_id=version_id),'[]'::jsonb)),'output_ceiling',CASE WHEN ceiling_row.id IS NULL THEN NULL ELSE jsonb_build_object('id',ceiling_row.id,'code',ceiling_row.ceiling_code,'permitted_scope',ceiling_row.permitted_scope,'excluded_scope',ceiling_row.excluded_scope,'blockers',ceiling_row.blockers,'recovery_plan',ceiling_row.recovery_plan,'assessed_at',ceiling_row.assessed_at) END,'work_objective',CASE WHEN latest_objective.id IS NULL THEN NULL ELSE jsonb_build_object('id',latest_objective.id,'objective_type',latest_objective.objective_type,'purpose',latest_objective.purpose_code,'objective_text',latest_objective.objective_text,'intended_use',latest_objective.intended_use,'intended_audience',latest_objective.intended_audience,'requested_scope',latest_objective.requested_scope,'status',latest_objective.status_code) END,'impact_candidates',coalesce((SELECT jsonb_agg(jsonb_build_object('id',i.id,'trigger_kind',i.trigger_kind,'trigger_object_id',i.trigger_object_id,'impact_code',i.impact_code,'affected_scope',i.affected_scope,'recalculation_required',i.recalculation_required,'regeneration_required',i.regeneration_required,'rereview_required',i.rereview_required,'circulation_blocked',i.circulation_blocked,'created_at',i.created_at) ORDER BY i.created_at DESC) FROM analysis.impact_assessment_candidate i WHERE i.account_id=p_account_id AND i.deal_id=p_deal_id AND i.packet_version_id=version_id),'[]'::jsonb),'circulation_blocked',EXISTS (SELECT 1 FROM app.circulation_candidate_block b WHERE b.account_id=p_account_id AND b.deal_id=p_deal_id AND b.packet_version_id=version_id AND b.resolved_at IS NULL));
END $$;

CREATE OR REPLACE FUNCTION source.get_source_packet_version_projection(
  p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_packet_id uuid, p_version_id uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, app, analysis, pg_catalog AS $$
DECLARE base jsonb; version_row source.source_packet_version%ROWTYPE; ceiling_row app.output_ceiling_assessment%ROWTYPE;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN RETURN NULL; END IF;
  SELECT * INTO version_row FROM source.source_packet_version v WHERE v.id=p_version_id AND v.packet_id=p_packet_id AND v.account_id=p_account_id AND v.deal_id=p_deal_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  base := source.get_source_packet_projection(p_account_id,p_actor_id,p_deal_id,p_packet_id);
  SELECT * INTO ceiling_row FROM app.output_ceiling_assessment c WHERE c.account_id=p_account_id AND c.deal_id=p_deal_id AND c.packet_version_id=p_version_id ORDER BY c.assessed_at DESC,c.id DESC LIMIT 1;
  RETURN base || jsonb_build_object(
    'requested_version_id',p_version_id,
    'requested_version_exists',true,
    'version',jsonb_build_object('id',version_row.id,'packet_id',version_row.packet_id,'version',version_row.version_ordinal,'purpose',version_row.purpose_code,'scope_statement',version_row.scope_statement,'change_reason',version_row.change_reason,'created_by',version_row.created_by,'created_at',version_row.created_at,
      'members',coalesce((SELECT jsonb_agg(jsonb_build_object('source_record_id',m.source_record_id,'source_material_id',r.source_material_id,'version',r.version_ordinal,'version_label',r.version_label,'member_role',m.member_role,'inclusion_reason',m.inclusion_reason,'rights_posture',r.rights_posture,'reliance_state',r.reliance_state,'disposition',r.disposition_code,'limitations',r.limitations) ORDER BY m.sort_key,m.created_at) FROM source.source_packet_member m JOIN source.source_record r ON r.id=m.source_record_id WHERE m.packet_version_id=version_row.id),'[]'::jsonb),
      'exclusions',coalesce((SELECT jsonb_agg(jsonb_build_object('material',e.excluded_material,'reason',e.exclusion_reason) ORDER BY e.created_at) FROM source.source_packet_exclusion e WHERE e.packet_version_id=version_row.id),'[]'::jsonb)),
    'version_output_ceiling',CASE WHEN ceiling_row.id IS NULL THEN NULL ELSE jsonb_build_object('id',ceiling_row.id,'code',ceiling_row.ceiling_code,'permitted_scope',ceiling_row.permitted_scope,'excluded_scope',ceiling_row.excluded_scope,'blockers',ceiling_row.blockers,'recovery_plan',ceiling_row.recovery_plan,'assessed_at',ceiling_row.assessed_at) END
  );
END $$;

CREATE OR REPLACE FUNCTION source.create_source_condition_assessment(
  p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_source_record_id uuid, p_purpose_code text,
  p_freshness_code text, p_conflict_code text, p_disposition_code text, p_basis jsonb, p_effective_at timestamptz
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, app, analysis, pg_catalog AS $$
DECLARE assessment_id uuid := gen_random_uuid(); prior_id uuid; packet_row record; packet_version record; impact_id uuid;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN RAISE EXCEPTION 'source_condition_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM source.source_record r WHERE r.id=p_source_record_id AND r.account_id=p_account_id AND r.deal_id=p_deal_id) THEN RAISE EXCEPTION 'source_record_scope_mismatch' USING ERRCODE='42501'; END IF;
  SELECT cs.assessment_id INTO prior_id FROM source.source_condition_current_selection cs WHERE cs.account_id=p_account_id AND cs.deal_id=p_deal_id AND cs.source_record_id=p_source_record_id AND cs.purpose_code=p_purpose_code FOR UPDATE;
  INSERT INTO source.source_condition_assessment(id,account_id,deal_id,source_record_id,purpose_code,freshness_code,conflict_code,disposition_code,basis,effective_at,recorded_by,supersedes_id) VALUES (assessment_id,p_account_id,p_deal_id,p_source_record_id,p_purpose_code,p_freshness_code,p_conflict_code,p_disposition_code,coalesce(p_basis,'{}'::jsonb),coalesce(p_effective_at,clock_timestamp()),p_actor_id,prior_id);
  PERFORM source.record_reliance_assessment(p_account_id,p_actor_id,p_deal_id,p_source_record_id,p_purpose_code,CASE WHEN p_disposition_code='withdrawn' THEN 'blocked' WHEN p_freshness_code='stale' OR p_conflict_code='conflicted' THEN 'reliance_limited' ELSE 'reliance_eligible' END,coalesce(p_basis,'{}'::jsonb),'[]'::jsonb);
  INSERT INTO source.source_condition_current_selection(account_id,deal_id,source_record_id,purpose_code,assessment_id,row_version) VALUES (p_account_id,p_deal_id,p_source_record_id,p_purpose_code,assessment_id,1) ON CONFLICT (account_id,source_record_id,purpose_code) DO UPDATE SET assessment_id=EXCLUDED.assessment_id,row_version=source.source_condition_current_selection.row_version+1,updated_at=clock_timestamp();
  FOR packet_row IN SELECT DISTINCT p.id AS packet_id,p.current_version_id FROM source.source_packet p JOIN source.source_packet_version v ON v.id=p.current_version_id JOIN source.source_packet_member m ON m.packet_version_id=v.id WHERE p.account_id=p_account_id AND p.deal_id=p_deal_id AND m.source_record_id=p_source_record_id LOOP
    PERFORM source.create_packet_ceiling(p_account_id,p_deal_id,packet_row.current_version_id,NULL);
    INSERT INTO analysis.impact_assessment_candidate(account_id,deal_id,trigger_kind,trigger_object_id,packet_version_id,affected_scope,impact_code,recalculation_required,regeneration_required,rereview_required,circulation_blocked) VALUES (p_account_id,p_deal_id,'source_condition_changed',assessment_id,packet_row.current_version_id,jsonb_build_object('source_record_id',p_source_record_id,'purpose',p_purpose_code,'freshness',p_freshness_code,'conflict',p_conflict_code,'disposition',p_disposition_code),'materially_affected',true,true,true,p_disposition_code='withdrawn' OR p_conflict_code='conflicted' OR p_freshness_code='stale');
    IF p_disposition_code='withdrawn' OR p_freshness_code='stale' OR p_conflict_code='conflicted' THEN INSERT INTO app.circulation_candidate_block(account_id,deal_id,packet_version_id,source_record_id,reason_code) VALUES (p_account_id,p_deal_id,packet_row.current_version_id,p_source_record_id,CASE WHEN p_disposition_code='withdrawn' THEN 'source_withdrawn' WHEN p_conflict_code='conflicted' THEN 'source_conflicted' ELSE 'source_stale' END); END IF;
  END LOOP;
  PERFORM app.record_audit('source_condition_assessed','completed','source_condition_assessment',assessment_id::text,CASE WHEN p_disposition_code='withdrawn' THEN 'prospective_reliance_removed' ELSE 'condition_changed' END,gen_random_uuid()::text);
  RETURN jsonb_build_object('id',assessment_id,'source_record_id',p_source_record_id,'purpose',p_purpose_code,'freshness',p_freshness_code,'conflict',p_conflict_code,'disposition',p_disposition_code,'supersedes_id',prior_id,'prospective_reliance',CASE WHEN p_disposition_code='withdrawn' THEN 'removed' ELSE 'unchanged_until_reassessed' END,'impact_assessment_candidate',true,'circulation_blocked',p_disposition_code='withdrawn' OR p_freshness_code='stale' OR p_conflict_code='conflicted');
END $$;

CREATE OR REPLACE FUNCTION source.create_source_rights_assessment(
  p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_source_record_id uuid, p_purpose_code text,
  p_rights_code text, p_permitted_operations jsonb, p_conditions jsonb, p_basis jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, app, analysis, pg_catalog AS $$
DECLARE assessment_id uuid := gen_random_uuid(); prior_id uuid; packet_row record;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN RAISE EXCEPTION 'source_rights_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM source.source_record r WHERE r.id=p_source_record_id AND r.account_id=p_account_id AND r.deal_id=p_deal_id) THEN RAISE EXCEPTION 'source_record_scope_mismatch' USING ERRCODE='42501'; END IF;
  SELECT cs.assessment_id INTO prior_id FROM source.source_rights_current_selection cs WHERE cs.account_id=p_account_id AND cs.deal_id=p_deal_id AND cs.source_record_id=p_source_record_id AND cs.purpose_code=p_purpose_code FOR UPDATE;
  INSERT INTO source.source_rights_posture_assessment(id,account_id,deal_id,source_record_id,purpose_code,rights_code,permitted_operations,conditions,basis,recorded_by,supersedes_id) VALUES (assessment_id,p_account_id,p_deal_id,p_source_record_id,p_purpose_code,p_rights_code,coalesce(p_permitted_operations,'[]'::jsonb),coalesce(p_conditions,'[]'::jsonb),coalesce(p_basis,'{}'::jsonb),p_actor_id,prior_id);
  PERFORM source.record_reliance_assessment(p_account_id,p_actor_id,p_deal_id,p_source_record_id,p_purpose_code,CASE WHEN p_rights_code IN ('blocked','withdrawn') THEN 'blocked' WHEN p_rights_code='limited' THEN 'reliance_limited' WHEN p_rights_code='allowed' THEN 'reliance_eligible' ELSE 'unassessed' END,coalesce(p_basis,'{}'::jsonb),coalesce(p_conditions,'[]'::jsonb));
  INSERT INTO source.source_rights_current_selection(account_id,deal_id,source_record_id,purpose_code,assessment_id,row_version) VALUES (p_account_id,p_deal_id,p_source_record_id,p_purpose_code,assessment_id,1) ON CONFLICT (account_id,source_record_id,purpose_code) DO UPDATE SET assessment_id=EXCLUDED.assessment_id,row_version=source.source_rights_current_selection.row_version+1,updated_at=clock_timestamp();
  FOR packet_row IN SELECT DISTINCT p.current_version_id FROM source.source_packet p JOIN source.source_packet_version v ON v.id=p.current_version_id JOIN source.source_packet_member m ON m.packet_version_id=v.id WHERE p.account_id=p_account_id AND p.deal_id=p_deal_id AND m.source_record_id=p_source_record_id LOOP
    PERFORM source.create_packet_ceiling(p_account_id,p_deal_id,packet_row.current_version_id,NULL);
    IF p_rights_code IN ('blocked','withdrawn') THEN INSERT INTO analysis.impact_assessment_candidate(account_id,deal_id,trigger_kind,trigger_object_id,packet_version_id,affected_scope,impact_code,recalculation_required,regeneration_required,rereview_required,circulation_blocked) VALUES (p_account_id,p_deal_id,'source_rights_changed',assessment_id,packet_row.current_version_id,jsonb_build_object('source_record_id',p_source_record_id,'purpose',p_purpose_code,'rights_code',p_rights_code),'materially_affected',true,true,true,true); INSERT INTO app.circulation_candidate_block(account_id,deal_id,packet_version_id,source_record_id,reason_code) VALUES (p_account_id,p_deal_id,packet_row.current_version_id,p_source_record_id,CASE WHEN p_rights_code='withdrawn' THEN 'source_withdrawn' ELSE 'rights_blocked' END); END IF;
  END LOOP;
  PERFORM app.record_audit('source_rights_assessed','completed','source_rights_posture_assessment',assessment_id::text,CASE WHEN p_rights_code IN ('blocked','withdrawn') THEN 'prospective_reliance_removed' ELSE 'rights_posture_recorded' END,gen_random_uuid()::text);
  RETURN jsonb_build_object('id',assessment_id,'source_record_id',p_source_record_id,'purpose',p_purpose_code,'rights',p_rights_code,'supersedes_id',prior_id,'prospective_reliance',CASE WHEN p_rights_code IN ('blocked','withdrawn') THEN 'removed' ELSE p_rights_code END,'impact_assessment_candidate',p_rights_code IN ('blocked','withdrawn'),'circulation_blocked',p_rights_code IN ('blocked','withdrawn'));
END $$;

CREATE OR REPLACE FUNCTION source.get_packet_worker_input(
  p_account_id uuid, p_deal_id uuid, p_packet_version_id uuid, p_work_objective_id uuid, p_operation_code text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = source, app, pg_catalog AS $$
DECLARE ceiling_row app.output_ceiling_assessment%ROWTYPE; operation_row app.output_ceiling_operation%ROWTYPE; dynamic_blockers jsonb; dynamic_ceiling text; purpose_value text; workspace_status text; workspace_ceiling text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM source.source_packet_version v WHERE v.id=p_packet_version_id AND v.account_id=p_account_id AND v.deal_id=p_deal_id) THEN RAISE EXCEPTION 'packet_worker_scope_mismatch' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM app.work_objective o WHERE o.id=p_work_objective_id AND o.account_id=p_account_id AND o.deal_id=p_deal_id AND o.packet_version_id=p_packet_version_id) THEN RAISE EXCEPTION 'packet_worker_scope_mismatch' USING ERRCODE='42501'; END IF;
  SELECT * INTO ceiling_row FROM app.output_ceiling_assessment WHERE account_id=p_account_id AND deal_id=p_deal_id AND packet_version_id=p_packet_version_id AND work_objective_id=p_work_objective_id ORDER BY assessed_at DESC,id DESC LIMIT 1;
  IF ceiling_row.id IS NULL THEN RAISE EXCEPTION 'output_ceiling_missing' USING ERRCODE='42501'; END IF;
  SELECT purpose_code INTO purpose_value FROM source.source_packet_version WHERE id=p_packet_version_id;
  dynamic_blockers := source.packet_blockers(p_account_id,p_deal_id,p_packet_version_id,purpose_value);
  dynamic_ceiling := source.ceiling_code(dynamic_blockers,EXISTS (SELECT 1 FROM source.source_packet_member WHERE packet_version_id=p_packet_version_id));
  SELECT paid_preflight_status, output_ceiling INTO workspace_status, workspace_ceiling FROM app.deal_workspace WHERE account_id=p_account_id AND deal_id=p_deal_id;
  IF coalesce(workspace_status,'pending') NOT IN ('pass','limited-proceed') THEN dynamic_ceiling := 'blocked';
  ELSIF workspace_ceiling = 'internal_analysis_and_internal_controlled_export' AND dynamic_ceiling = 'supported_internal_processing' THEN dynamic_ceiling := 'bounded_analysis_only';
  END IF;
  IF p_operation_code IN ('deterministic_analysis','ai_processing','native_artifact','reader_copy','internal_controlled_export','external_circulation') AND dynamic_ceiling IN ('metadata_only','blocked') THEN RAISE EXCEPTION 'output_ceiling_exceeded' USING ERRCODE='42501'; END IF;
  IF p_operation_code IN ('deterministic_analysis','ai_processing','native_artifact','reader_copy','internal_controlled_export','external_circulation') AND dynamic_ceiling='anchor_inventory_only' THEN RAISE EXCEPTION 'output_ceiling_exceeded' USING ERRCODE='42501'; END IF;
  IF p_operation_code IN ('ai_processing','native_artifact','reader_copy','internal_controlled_export','external_circulation') AND dynamic_ceiling='bounded_analysis_only' THEN RAISE EXCEPTION 'output_ceiling_exceeded' USING ERRCODE='42501'; END IF;
  SELECT * INTO operation_row FROM app.output_ceiling_operation WHERE account_id=p_account_id AND deal_id=p_deal_id AND assessment_id=ceiling_row.id AND operation_code=p_operation_code;
  IF operation_row.id IS NULL OR operation_row.posture <> 'permitted' THEN RAISE EXCEPTION 'output_ceiling_exceeded' USING ERRCODE='42501'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(dynamic_blockers) x WHERE x->>'code' IN ('rights_blocked','withdrawn_source')) AND p_operation_code <> 'source_inventory' THEN RAISE EXCEPTION 'source_condition_blocked' USING ERRCODE='42501'; END IF;
  IF EXISTS (SELECT 1 FROM source.source_rights_current_selection cs JOIN source.source_rights_posture_assessment ra ON ra.id=cs.assessment_id JOIN source.source_packet_member m ON m.source_record_id=cs.source_record_id WHERE cs.account_id=p_account_id AND cs.deal_id=p_deal_id AND cs.purpose_code=purpose_value AND m.packet_version_id=p_packet_version_id AND ra.rights_code='limited' AND NOT (ra.permitted_operations ? p_operation_code)) THEN RAISE EXCEPTION 'output_ceiling_exceeded' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object('account_id',p_account_id,'deal_id',p_deal_id,'packet_version_id',p_packet_version_id,'work_objective_id',p_work_objective_id,'operation_code',p_operation_code,'output_ceiling_id',ceiling_row.id,'ceiling_code',ceiling_row.ceiling_code,'members',coalesce((SELECT jsonb_agg(jsonb_build_object('source_record_id',m.source_record_id,'version',r.version_ordinal) ORDER BY m.sort_key,m.created_at) FROM source.source_packet_member m JOIN source.source_record r ON r.id=m.source_record_id WHERE m.packet_version_id=p_packet_version_id),'[]'::jsonb));
END $$;

REVOKE ALL ON FUNCTION source.create_source_packet(uuid,uuid,uuid,text,text), source.create_source_packet_version(uuid,uuid,uuid,uuid,bigint,text,text,text,jsonb,jsonb), source.create_work_objective(uuid,uuid,uuid,uuid,text,text,text,text,text,text), source.get_source_packet_projection(uuid,uuid,uuid,uuid), source.get_source_packet_version_projection(uuid,uuid,uuid,uuid,uuid), source.create_source_condition_assessment(uuid,uuid,uuid,uuid,text,text,text,text,jsonb,timestamptz), source.create_source_rights_assessment(uuid,uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb), source.get_packet_worker_input(uuid,uuid,uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION source.create_source_packet(uuid,uuid,uuid,text,text), source.create_source_packet_version(uuid,uuid,uuid,uuid,bigint,text,text,text,jsonb,jsonb), source.create_work_objective(uuid,uuid,uuid,uuid,text,text,text,text,text,text), source.get_source_packet_projection(uuid,uuid,uuid,uuid), source.get_source_packet_version_projection(uuid,uuid,uuid,uuid,uuid), source.create_source_condition_assessment(uuid,uuid,uuid,uuid,text,text,text,text,jsonb,timestamptz), source.create_source_rights_assessment(uuid,uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb) TO app_runtime;
-- No unscoped worker credential can invoke this seam. A production worker
-- adapter must add Job Scope, lease, and runtime-principal binding first.
REVOKE EXECUTE ON FUNCTION source.get_packet_worker_input(uuid,uuid,uuid,uuid,text) FROM job_worker;

-- Supabase's postgres role is not a superuser. PostgreSQL requires the
-- target function owner to have CREATE on the containing schema; grant that
-- privilege only for the ownership transfer and revoke it immediately after.
GRANT CREATE ON SCHEMA source, analysis TO app_source_owner;
ALTER FUNCTION source.create_source_packet(uuid,uuid,uuid,text,text) OWNER TO app_source_owner;
ALTER FUNCTION source.create_source_packet_version(uuid,uuid,uuid,uuid,bigint,text,text,text,jsonb,jsonb) OWNER TO app_source_owner;
ALTER FUNCTION source.create_work_objective(uuid,uuid,uuid,uuid,text,text,text,text,text,text) OWNER TO app_source_owner;
ALTER FUNCTION source.get_source_packet_projection(uuid,uuid,uuid,uuid) OWNER TO app_source_owner;
ALTER FUNCTION source.get_source_packet_version_projection(uuid,uuid,uuid,uuid,uuid) OWNER TO app_source_owner;
ALTER FUNCTION source.create_source_condition_assessment(uuid,uuid,uuid,uuid,text,text,text,text,jsonb,timestamptz) OWNER TO app_source_owner;
ALTER FUNCTION source.create_source_rights_assessment(uuid,uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb) OWNER TO app_source_owner;
ALTER FUNCTION source.get_packet_worker_input(uuid,uuid,uuid,uuid,text) OWNER TO app_source_owner;
ALTER FUNCTION source.packet_blockers(uuid,uuid,uuid,text) OWNER TO app_source_owner;
ALTER FUNCTION source.create_packet_ceiling(uuid,uuid,uuid,uuid) OWNER TO app_source_owner;
REVOKE CREATE ON SCHEMA source, analysis FROM app_source_owner;
