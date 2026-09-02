-- Ticket 08: durable, purpose-bound Source Reliance Assessment. Rights and
-- condition changes write a new assessment and advance only the current
-- display pointer; historical assessments remain immutable.
CREATE TABLE IF NOT EXISTS source.source_reliance_assessment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  source_record_id uuid NOT NULL REFERENCES source.source_record(id),
  purpose_code text NOT NULL,
  reliance_state text NOT NULL CHECK (reliance_state IN ('unassessed','reliance_limited','reliance_eligible','blocked')),
  basis jsonb NOT NULL DEFAULT '{}'::jsonb,
  limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
  effective_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid NOT NULL REFERENCES app.actor(id),
  supersedes_id uuid REFERENCES source.source_reliance_assessment(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, id),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, source_record_id) REFERENCES source.source_record(account_id, id),
  FOREIGN KEY (account_id, recorded_by) REFERENCES app.account_actor(account_id, actor_id)
);

CREATE TABLE IF NOT EXISTS source.reliance_current_selection (
  account_id uuid NOT NULL REFERENCES app.account(id),
  deal_id uuid NOT NULL REFERENCES app.deal(id),
  source_record_id uuid NOT NULL REFERENCES source.source_record(id),
  purpose_code text NOT NULL,
  assessment_id uuid NOT NULL REFERENCES source.source_reliance_assessment(id),
  row_version bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, source_record_id, purpose_code),
  FOREIGN KEY (account_id, deal_id) REFERENCES app.deal(account_id, id),
  FOREIGN KEY (account_id, source_record_id) REFERENCES source.source_record(account_id, id),
  FOREIGN KEY (account_id, assessment_id) REFERENCES source.source_reliance_assessment(account_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS source_reliance_deal_scope_uq ON source.source_reliance_assessment(account_id, deal_id, id);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='reliance_current_record_deal_fk') THEN
    ALTER TABLE source.reliance_current_selection ADD CONSTRAINT reliance_current_record_deal_fk FOREIGN KEY (account_id, deal_id, source_record_id) REFERENCES source.source_record(account_id, deal_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='reliance_current_assessment_deal_fk') THEN
    ALTER TABLE source.reliance_current_selection ADD CONSTRAINT reliance_current_assessment_deal_fk FOREIGN KEY (account_id, deal_id, assessment_id) REFERENCES source.source_reliance_assessment(account_id, deal_id, id);
  END IF;
END $$;

ALTER TABLE source.source_reliance_assessment ENABLE ROW LEVEL SECURITY;
ALTER TABLE source.source_reliance_assessment FORCE ROW LEVEL SECURITY;
ALTER TABLE source.reliance_current_selection ENABLE ROW LEVEL SECURITY;
ALTER TABLE source.reliance_current_selection FORCE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname='source_reliance_scope' AND polrelid='source.source_reliance_assessment'::regclass) THEN
    CREATE POLICY source_reliance_scope ON source.source_reliance_assessment FOR SELECT TO app_runtime USING (account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
    CREATE POLICY reliance_current_scope ON source.reliance_current_selection FOR SELECT TO app_runtime USING (account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
  END IF;
END $$;
GRANT USAGE ON SCHEMA source TO app_source_owner;
GRANT SELECT, INSERT, UPDATE ON source.source_reliance_assessment, source.reliance_current_selection TO app_source_owner;
GRANT SELECT ON source.source_reliance_assessment, source.reliance_current_selection TO app_runtime;

CREATE OR REPLACE FUNCTION source.prevent_reliance_assessment_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path=source,pg_catalog AS $$ BEGIN RAISE EXCEPTION 'reliance_assessment_immutable' USING ERRCODE='23514'; END $$;
DROP TRIGGER IF EXISTS source_reliance_immutable ON source.source_reliance_assessment;
CREATE TRIGGER source_reliance_immutable BEFORE UPDATE OR DELETE ON source.source_reliance_assessment FOR EACH ROW EXECUTE FUNCTION source.prevent_reliance_assessment_mutation();

CREATE OR REPLACE FUNCTION source.record_reliance_assessment(
  p_account_id uuid, p_actor_id uuid, p_deal_id uuid, p_source_record_id uuid,
  p_purpose_code text, p_reliance_state text, p_basis jsonb, p_limitations jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=source,app,pg_catalog AS $$
DECLARE assessment_id uuid:=gen_random_uuid(); prior_id uuid;
BEGIN
  IF p_account_id IS DISTINCT FROM app.policy_account_id() OR p_actor_id IS DISTINCT FROM app.policy_actor_id() OR p_deal_id IS DISTINCT FROM app.policy_deal_id() THEN RAISE EXCEPTION 'source_reliance_scope_mismatch' USING ERRCODE='42501'; END IF;
  SELECT rc.assessment_id INTO prior_id FROM source.reliance_current_selection rc WHERE rc.account_id=p_account_id AND rc.deal_id=p_deal_id AND rc.source_record_id=p_source_record_id AND rc.purpose_code=p_purpose_code FOR UPDATE;
  INSERT INTO source.source_reliance_assessment(id,account_id,deal_id,source_record_id,purpose_code,reliance_state,basis,limitations,recorded_by,supersedes_id) VALUES (assessment_id,p_account_id,p_deal_id,p_source_record_id,p_purpose_code,p_reliance_state,coalesce(p_basis,'{}'::jsonb),coalesce(p_limitations,'[]'::jsonb),p_actor_id,prior_id);
  INSERT INTO source.reliance_current_selection(account_id,deal_id,source_record_id,purpose_code,assessment_id,row_version) VALUES (p_account_id,p_deal_id,p_source_record_id,p_purpose_code,assessment_id,1) ON CONFLICT (account_id,source_record_id,purpose_code) DO UPDATE SET assessment_id=EXCLUDED.assessment_id,row_version=source.reliance_current_selection.row_version+1,updated_at=clock_timestamp();
  RETURN assessment_id;
END $$;
REVOKE ALL ON FUNCTION source.record_reliance_assessment(uuid,uuid,uuid,uuid,text,text,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION source.record_reliance_assessment(uuid,uuid,uuid,uuid,text,text,jsonb,jsonb) TO app_source_owner;
ALTER FUNCTION source.record_reliance_assessment(uuid,uuid,uuid,uuid,text,text,jsonb,jsonb) OWNER TO app_source_owner;
REVOKE CREATE ON SCHEMA source FROM app_source_owner;
