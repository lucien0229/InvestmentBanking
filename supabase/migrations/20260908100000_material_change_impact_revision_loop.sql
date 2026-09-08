-- Ticket 14: append-only material changes, deterministic dependency closure and
-- exact disposition/revision boundaries.  This migration deliberately keeps the
-- closure in typed rows; AI proposals may describe semantics but cannot create it.
CREATE TABLE analysis.material_change (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL REFERENCES app.account(id), deal_id uuid NOT NULL REFERENCES app.deal(id),
  trigger_kind text NOT NULL CHECK (trigger_kind IN ('source_record','claim','fact','assumption','human_decision','source_packet_version','audience','purpose','source_perimeter','revision')),
  trigger_object_id uuid NOT NULL, previous_object_id uuid, reason text NOT NULL CHECK (length(reason) BETWEEN 20 AND 2000),
  basis jsonb NOT NULL DEFAULT '{}'::jsonb, origin_code text NOT NULL DEFAULT 'human_authored' CHECK (origin_code IN ('human_authored','correction','system')),
  actor_id uuid NOT NULL REFERENCES app.actor(id), effective_at timestamptz NOT NULL DEFAULT now(), recorded_at timestamptz NOT NULL DEFAULT now(), UNIQUE(account_id,id),
  FOREIGN KEY(account_id,deal_id) REFERENCES app.deal(account_id,id), FOREIGN KEY(account_id,actor_id) REFERENCES app.account_actor(account_id,actor_id)
);
CREATE TABLE analysis.impact_assessment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL, deal_id uuid NOT NULL, material_change_id uuid NOT NULL,
  closure_version text NOT NULL DEFAULT 'ticket-14-1.0.0', status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','partially_recovered','recovered')),
  origin_code text NOT NULL DEFAULT 'system', created_by uuid NOT NULL REFERENCES app.actor(id), created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
  UNIQUE(account_id,id), UNIQUE(account_id,deal_id,id), UNIQUE(material_change_id), FOREIGN KEY(account_id,deal_id) REFERENCES app.deal(account_id,id), FOREIGN KEY(account_id,material_change_id) REFERENCES analysis.material_change(account_id,id)
);
CREATE TABLE analysis.impact_candidate_edge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL, deal_id uuid NOT NULL, assessment_id uuid NOT NULL,
  upstream_kind text NOT NULL, upstream_id uuid NOT NULL, downstream_kind text NOT NULL, downstream_id uuid NOT NULL,
  dependency_role text NOT NULL, edge_digest text NOT NULL, resolution_status text NOT NULL DEFAULT 'candidate' CHECK(resolution_status IN ('candidate','accepted','unaffected','unable_to_assess')),
  UNIQUE(assessment_id,upstream_kind,upstream_id,downstream_kind,downstream_id), FOREIGN KEY(account_id,deal_id,assessment_id) REFERENCES analysis.impact_assessment(account_id,deal_id,id)
);
CREATE TABLE analysis.impact_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL, deal_id uuid NOT NULL, assessment_id uuid NOT NULL,
  object_kind text NOT NULL CHECK(object_kind IN ('source_record','evidence','claim','fact','assumption','calculation_version','calculation_run','model_version','scenario_version','analysis_version','deliverable_revision','artifact','review','qc_finding','human_decision','external_use_decision','package_readiness')),
  object_id uuid NOT NULL, impact_code text NOT NULL CHECK(impact_code IN ('unaffected','potentially_affected','materially_affected','unable_to_assess')),
  recalculation_required boolean NOT NULL DEFAULT false, regeneration_required boolean NOT NULL DEFAULT false, rereview_required boolean NOT NULL DEFAULT false, circulation_blocked boolean NOT NULL DEFAULT false,
  basis jsonb NOT NULL DEFAULT '{}'::jsonb, current_state text, UNIQUE(account_id,deal_id,id), UNIQUE(assessment_id,object_kind,object_id), FOREIGN KEY(account_id,deal_id,assessment_id) REFERENCES analysis.impact_assessment(account_id,deal_id,id)
);
CREATE TABLE analysis.impact_disposition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL, deal_id uuid NOT NULL, assessment_id uuid NOT NULL, impact_item_id uuid NOT NULL,
  disposition_code text NOT NULL CHECK(disposition_code IN ('recalculate','regenerate','rereview','block_circulation','retain_unaffected','unable_to_assess')),
  rationale text NOT NULL CHECK(length(rationale) BETWEEN 20 AND 2000), follow_up jsonb NOT NULL DEFAULT '{}'::jsonb, decided_by uuid NOT NULL REFERENCES app.actor(id), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(impact_item_id), FOREIGN KEY(account_id,deal_id,assessment_id) REFERENCES analysis.impact_assessment(account_id,deal_id,id), FOREIGN KEY(account_id,deal_id,impact_item_id) REFERENCES analysis.impact_item(account_id,deal_id,id)
);
CREATE TABLE analysis.impact_revision_link (
  assessment_id uuid NOT NULL, account_id uuid NOT NULL, deal_id uuid NOT NULL, revision_id uuid NOT NULL, predecessor_revision_id uuid, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(assessment_id,revision_id), FOREIGN KEY(account_id,deal_id,assessment_id) REFERENCES analysis.impact_assessment(account_id,deal_id,id), FOREIGN KEY(account_id,deal_id,revision_id) REFERENCES deliverable.deliverable_revision(account_id,deal_id,id)
);
CREATE INDEX impact_item_lookup ON analysis.impact_item(account_id,deal_id,assessment_id,object_kind,object_id);
ALTER TABLE deliverable.deliverable_revision ADD COLUMN impact_assessment_id uuid REFERENCES analysis.impact_assessment(id), ADD COLUMN change_reason text;

ALTER TABLE analysis.material_change ENABLE ROW LEVEL SECURITY; ALTER TABLE analysis.material_change FORCE ROW LEVEL SECURITY;
ALTER TABLE analysis.impact_assessment ENABLE ROW LEVEL SECURITY; ALTER TABLE analysis.impact_assessment FORCE ROW LEVEL SECURITY;
ALTER TABLE analysis.impact_candidate_edge ENABLE ROW LEVEL SECURITY; ALTER TABLE analysis.impact_candidate_edge FORCE ROW LEVEL SECURITY;
ALTER TABLE analysis.impact_item ENABLE ROW LEVEL SECURITY; ALTER TABLE analysis.impact_item FORCE ROW LEVEL SECURITY;
ALTER TABLE analysis.impact_disposition ENABLE ROW LEVEL SECURITY; ALTER TABLE analysis.impact_disposition FORCE ROW LEVEL SECURITY;
ALTER TABLE analysis.impact_revision_link ENABLE ROW LEVEL SECURITY; ALTER TABLE analysis.impact_revision_link FORCE ROW LEVEL SECURITY;
CREATE POLICY impact_runtime_scope ON analysis.material_change FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY impact_assessment_runtime_scope ON analysis.impact_assessment FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY impact_edge_runtime_scope ON analysis.impact_candidate_edge FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY impact_item_runtime_scope ON analysis.impact_item FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY impact_disposition_runtime_scope ON analysis.impact_disposition FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY impact_revision_runtime_scope ON analysis.impact_revision_link FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
GRANT SELECT ON analysis.material_change,analysis.impact_assessment,analysis.impact_candidate_edge,analysis.impact_item,analysis.impact_disposition,analysis.impact_revision_link TO app_runtime;

CREATE OR REPLACE FUNCTION analysis.build_material_impact(p_change uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=analysis,knowledge,source,deliverable,app,pg_catalog AS $$
DECLARE c material_change%ROWTYPE; a uuid:=gen_random_uuid(); e record; iid uuid; has_direct boolean;
BEGIN
 SELECT * INTO c FROM material_change WHERE id=p_change; IF NOT FOUND THEN RAISE EXCEPTION 'impact_change_not_found'; END IF;
 INSERT INTO impact_assessment(id,account_id,deal_id,material_change_id,created_by) VALUES(a,c.account_id,c.deal_id,p_change,c.actor_id);
 -- Every candidate starts from a typed relation, with a digest preserving the reason it entered the closure.
 IF c.trigger_kind IN ('claim','fact') THEN
  FOR e IN SELECT 'fact' kind,f.id object_id FROM knowledge.fact f WHERE f.account_id=c.account_id AND f.deal_id=c.deal_id AND (f.claim_id=c.trigger_object_id OR f.id=c.trigger_object_id) UNION ALL
    SELECT 'calculation_version',m.calculation_version_id FROM analysis.calculation_input_measure m WHERE m.account_id=c.account_id AND m.deal_id=c.deal_id AND (m.fact_id=c.trigger_object_id OR m.assumption_id=c.trigger_object_id) UNION ALL
    SELECT 'calculation_run',r.id FROM analysis.calculation_run r JOIN analysis.calculation_input_measure m ON m.calculation_version_id=r.calculation_version_id WHERE r.account_id=c.account_id AND r.deal_id=c.deal_id AND (m.fact_id=c.trigger_object_id OR m.assumption_id=c.trigger_object_id) UNION ALL
    SELECT 'model_version',mv.id FROM analysis.model_version mv JOIN analysis.model_version_calculation mc ON mc.model_version_id=mv.id JOIN analysis.calculation_version cv ON cv.id=mc.calculation_version_id WHERE mv.account_id=c.account_id AND mv.deal_id=c.deal_id AND cv.id IN (SELECT m.calculation_version_id FROM analysis.calculation_input_measure m WHERE m.fact_id=c.trigger_object_id OR m.assumption_id=c.trigger_object_id) UNION ALL
    SELECT 'analysis_version',av.id FROM analysis.analysis_version av WHERE av.account_id=c.account_id AND av.deal_id=c.deal_id AND (av.fact_ids @> ARRAY[c.trigger_object_id] OR av.calculation_run_ids && ARRAY(SELECT r.id FROM analysis.calculation_run r JOIN analysis.calculation_input_measure m ON m.calculation_version_id=r.calculation_version_id WHERE m.fact_id=c.trigger_object_id))
  LOOP INSERT INTO impact_item(account_id,deal_id,assessment_id,object_kind,object_id,impact_code,recalculation_required,regeneration_required,rereview_required,circulation_blocked,basis) VALUES(c.account_id,c.deal_id,a,e.kind,e.object_id,'materially_affected',e.kind IN ('calculation_version','calculation_run','model_version'),e.kind IN ('analysis_version'),true,true,jsonb_build_object('trigger_kind',c.trigger_kind,'trigger_object_id',c.trigger_object_id)); END LOOP;
 ELSIF c.trigger_kind='assumption' THEN
  FOR e IN SELECT 'calculation_version' kind,m.calculation_version_id object_id FROM analysis.calculation_input_measure m WHERE m.assumption_id=c.trigger_object_id UNION ALL SELECT 'model_version',m.model_version_id FROM analysis.model_version_assumption m WHERE m.assumption_id=c.trigger_object_id UNION ALL SELECT 'scenario_version',s.id FROM analysis.scenario_version s WHERE s.model_version_id IN (SELECT model_version_id FROM analysis.model_version_assumption WHERE assumption_id=c.trigger_object_id)
  LOOP INSERT INTO impact_item(account_id,deal_id,assessment_id,object_kind,object_id,impact_code,recalculation_required,regeneration_required,rereview_required,circulation_blocked,basis) VALUES(c.account_id,c.deal_id,a,e.kind,e.object_id,'materially_affected',true,e.kind='scenario_version',true,true,jsonb_build_object('trigger_kind','assumption')); END LOOP;
 ELSIF c.trigger_kind IN ('source_record','source_packet_version','revision') THEN
  FOR e IN SELECT 'deliverable_revision' kind,r.id object_id FROM deliverable.deliverable_revision r WHERE r.account_id=c.account_id AND r.deal_id=c.deal_id AND (r.packet_version_id=c.trigger_object_id OR r.id=c.trigger_object_id)
  LOOP INSERT INTO impact_item(account_id,deal_id,assessment_id,object_kind,object_id,impact_code,recalculation_required,regeneration_required,rereview_required,circulation_blocked,basis) VALUES(c.account_id,c.deal_id,a,e.kind,e.object_id,'materially_affected',true,true,true,true,jsonb_build_object('trigger_kind',c.trigger_kind)); END LOOP;
 END IF;
 -- Scope-wide controls are explicit and inspectable. They are not a scalar stale flag.
 INSERT INTO impact_item(account_id,deal_id,assessment_id,object_kind,object_id,impact_code,rereview_required,circulation_blocked,basis)
 SELECT c.account_id,c.deal_id,a,'human_decision',d.id,'potentially_affected',true,true,jsonb_build_object('trigger_kind',c.trigger_kind)
 FROM knowledge.human_decision d WHERE d.account_id=c.account_id AND d.deal_id=c.deal_id AND d.id<>c.trigger_object_id
 AND NOT EXISTS(SELECT 1 FROM impact_item x WHERE x.assessment_id=a AND x.object_kind='human_decision' AND x.object_id=d.id);
 INSERT INTO impact_item(account_id,deal_id,assessment_id,object_kind,object_id,impact_code,rereview_required,circulation_blocked,basis)
 SELECT c.account_id,c.deal_id,a,'external_use_decision',gen_random_uuid(),'potentially_affected',true,true,jsonb_build_object('state','no_prior_authorization_carry_forward')
 WHERE c.trigger_kind IN ('source_record','claim','fact','assumption','human_decision','source_packet_version','audience','purpose','source_perimeter','revision');
 UPDATE impact_assessment SET status=CASE WHEN EXISTS(SELECT 1 FROM impact_item WHERE assessment_id=a) THEN 'open' ELSE 'recovered' END WHERE id=a;
 RETURN a;
END $$;

CREATE OR REPLACE FUNCTION analysis.create_material_change(p_account uuid,p_actor uuid,p_deal uuid,p_kind text,p_object uuid,p_previous uuid,p_reason text,p_basis jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=analysis,app,pg_catalog AS $$
DECLARE c uuid:=gen_random_uuid(); a uuid; BEGIN IF p_account<>app.policy_account_id() OR p_actor<>app.policy_actor_id() OR p_deal<>app.policy_deal_id() THEN RAISE EXCEPTION 'impact_scope_mismatch'; END IF; INSERT INTO material_change(id,account_id,deal_id,trigger_kind,trigger_object_id,previous_object_id,reason,basis,actor_id) VALUES(c,p_account,p_deal,p_kind,p_object,p_previous,p_reason,coalesce(p_basis,'{}')); a:=build_material_impact(c); PERFORM app.record_audit('impact_assessment_created','completed','impact_assessment',a::text,p_kind,gen_random_uuid()::text); RETURN jsonb_build_object('id',a,'material_change_id',c,'trigger_kind',p_kind,'trigger_object_id',p_object,'status','open'); END $$;

CREATE OR REPLACE FUNCTION analysis.get_impact_projection(p_account uuid,p_actor uuid,p_deal uuid,p_assessment uuid DEFAULT NULL) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=analysis,app,pg_catalog AS $$
SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'material_change',to_jsonb(c),'status',a.status,'closure_version',a.closure_version,'created_at',a.created_at,'items',(SELECT coalesce(jsonb_agg(to_jsonb(i) ORDER BY i.object_kind,i.object_id),'[]') FROM impact_item i WHERE i.assessment_id=a.id),'edges',(SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.id),'[]') FROM impact_candidate_edge e WHERE e.assessment_id=a.id)) ORDER BY a.created_at DESC),'[]') FROM impact_assessment a JOIN material_change c ON c.id=a.material_change_id WHERE a.account_id=p_account AND a.deal_id=p_deal AND (p_assessment IS NULL OR a.id=p_assessment) AND p_account=app.policy_account_id() AND p_actor=app.policy_actor_id() AND p_deal=app.policy_deal_id(); $$;

CREATE OR REPLACE FUNCTION analysis.record_impact_disposition(p_account uuid,p_actor uuid,p_deal uuid,p_assessment uuid,p_items jsonb,p_rationale text,p_follow_up jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=analysis,app,pg_catalog AS $$
DECLARE x jsonb; item impact_item; count integer:=0; BEGIN IF p_account<>app.policy_account_id() OR p_actor<>app.policy_actor_id() OR p_deal<>app.policy_deal_id() THEN RAISE EXCEPTION 'impact_scope_mismatch'; END IF; IF NOT EXISTS(SELECT 1 FROM impact_assessment WHERE id=p_assessment AND account_id=p_account AND deal_id=p_deal) THEN RAISE EXCEPTION 'impact_assessment_not_found'; END IF;
 FOR x IN SELECT value FROM jsonb_array_elements(p_items) LOOP SELECT * INTO item FROM impact_item WHERE id=(x->>'impact_item_id')::uuid AND assessment_id=p_assessment FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'impact_item_not_found'; END IF; INSERT INTO impact_disposition(account_id,deal_id,assessment_id,impact_item_id,disposition_code,rationale,follow_up,decided_by) VALUES(p_account,p_deal,p_assessment,item.id,x->>'disposition_code',p_rationale,coalesce(p_follow_up,'{}'),p_actor); count:=count+1; END LOOP;
 UPDATE impact_assessment SET status='partially_recovered',completed_at=CASE WHEN NOT EXISTS(SELECT 1 FROM impact_item i WHERE i.assessment_id=p_assessment AND i.impact_code='materially_affected' AND NOT EXISTS(SELECT 1 FROM impact_disposition d WHERE d.impact_item_id=i.id)) THEN now() ELSE NULL END WHERE id=p_assessment;
 RETURN jsonb_build_object('assessment_id',p_assessment,'dispositions',count,'status',(SELECT status FROM impact_assessment WHERE id=p_assessment)); END $$;

GRANT EXECUTE ON FUNCTION analysis.create_material_change(uuid,uuid,uuid,text,uuid,uuid,text,jsonb),analysis.get_impact_projection(uuid,uuid,uuid,uuid),analysis.record_impact_disposition(uuid,uuid,uuid,uuid,jsonb,text,jsonb) TO app_runtime;
CREATE OR REPLACE FUNCTION analysis.on_material_claim_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=analysis,app,pg_catalog AS $$ BEGIN IF NEW.corrects_claim_id IS NOT NULL THEN PERFORM analysis.create_material_change(NEW.account_id,NEW.created_by_actor_id,NEW.deal_id,'claim',NEW.id,NEW.corrects_claim_id,'A material Claim correction requires deterministic dependency closure and targeted recovery.',jsonb_build_object('original_claim_id',NEW.corrects_claim_id,'corrected_claim_id',NEW.id,'origin',NEW.origin_code)); END IF; RETURN NEW; END $$;
CREATE TRIGGER material_claim_change AFTER INSERT ON knowledge.claim FOR EACH ROW EXECUTE FUNCTION analysis.on_material_claim_change();
CREATE OR REPLACE FUNCTION analysis.on_material_source_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=analysis,app,pg_catalog AS $$ BEGIN IF NEW.version_ordinal>1 THEN PERFORM analysis.create_material_change(NEW.account_id,app.policy_actor_id(),NEW.deal_id,'source_record',NEW.id,NULL,'A new Source Record version requires deterministic dependency closure and targeted recovery.',jsonb_build_object('version',NEW.version_ordinal)); END IF; RETURN NEW; END $$;
CREATE TRIGGER material_source_change AFTER INSERT ON source.source_record FOR EACH ROW EXECUTE FUNCTION analysis.on_material_source_change();
CREATE OR REPLACE FUNCTION analysis.on_material_revision_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=analysis,app,pg_catalog AS $$ DECLARE marker text; BEGIN SELECT value INTO marker FROM jsonb_array_elements_text(coalesce(NEW.build_input->'limitations','[]'::jsonb)) value WHERE value LIKE '__ticket14_impact=%' LIMIT 1; IF marker IS NOT NULL THEN NEW.impact_assessment_id:=substring(marker from 20)::uuid; END IF; SELECT value INTO marker FROM jsonb_array_elements_text(coalesce(NEW.build_input->'limitations','[]'::jsonb)) value WHERE value LIKE '__ticket14_reason=%' LIMIT 1; IF marker IS NOT NULL THEN NEW.change_reason:=substring(marker from 19); END IF; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS material_revision_link ON deliverable.deliverable_revision;
CREATE TRIGGER material_revision_link BEFORE INSERT ON deliverable.deliverable_revision FOR EACH ROW EXECUTE FUNCTION analysis.on_material_revision_change();
CREATE OR REPLACE FUNCTION analysis.link_material_revision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=analysis,app,pg_catalog AS $$ BEGIN IF NEW.impact_assessment_id IS NOT NULL THEN INSERT INTO analysis.impact_revision_link(assessment_id,account_id,deal_id,revision_id,predecessor_revision_id) VALUES(NEW.impact_assessment_id,NEW.account_id,NEW.deal_id,NEW.id,NEW.predecessor_id) ON CONFLICT DO NOTHING; END IF; RETURN NEW; END $$;
CREATE TRIGGER material_revision_link_after AFTER INSERT ON deliverable.deliverable_revision FOR EACH ROW EXECUTE FUNCTION analysis.link_material_revision();

-- Ticket 14 forward hardening: deterministic typed edges, exact action checks,
-- idempotent API commands, and direct revision metadata.
CREATE INDEX IF NOT EXISTS impact_assessment_deal_created_idx ON analysis.impact_assessment(account_id, deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS impact_edge_downstream_idx ON analysis.impact_candidate_edge(account_id, deal_id, downstream_kind, downstream_id);
ALTER TABLE analysis.impact_candidate_edge ADD CONSTRAINT impact_edge_digest_format CHECK (edge_digest ~ '^[a-f0-9]{64}$');

CREATE OR REPLACE FUNCTION analysis.add_impact_item(
  p_assessment uuid, p_upstream_kind text, p_upstream_id uuid, p_downstream_kind text,
  p_downstream_id uuid, p_role text, p_code text, p_recalculate boolean,
  p_regenerate boolean, p_rereview boolean, p_block boolean, p_basis jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=analysis,app,extensions,pg_catalog AS $$
DECLARE assessment_row impact_assessment%ROWTYPE; item_id uuid;
BEGIN
  SELECT * INTO assessment_row FROM impact_assessment WHERE id=p_assessment;
  IF NOT FOUND THEN RAISE EXCEPTION 'impact_assessment_not_found'; END IF;
  INSERT INTO impact_item(account_id,deal_id,assessment_id,object_kind,object_id,impact_code,recalculation_required,regeneration_required,rereview_required,circulation_blocked,basis)
  VALUES(assessment_row.account_id,assessment_row.deal_id,p_assessment,p_downstream_kind,p_downstream_id,p_code,p_recalculate,p_regenerate,p_rereview,p_block,coalesce(p_basis,'{}'::jsonb))
  ON CONFLICT (assessment_id,object_kind,object_id) DO UPDATE SET
    impact_code=CASE WHEN impact_item.impact_code='materially_affected' OR EXCLUDED.impact_code='materially_affected' THEN 'materially_affected' ELSE EXCLUDED.impact_code END,
    recalculation_required=impact_item.recalculation_required OR EXCLUDED.recalculation_required,
    regeneration_required=impact_item.regeneration_required OR EXCLUDED.regeneration_required,
    rereview_required=impact_item.rereview_required OR EXCLUDED.rereview_required,
    circulation_blocked=impact_item.circulation_blocked OR EXCLUDED.circulation_blocked,
    basis=impact_item.basis || EXCLUDED.basis
  RETURNING id INTO item_id;
  INSERT INTO impact_candidate_edge(account_id,deal_id,assessment_id,upstream_kind,upstream_id,downstream_kind,downstream_id,dependency_role,edge_digest)
  VALUES(assessment_row.account_id,assessment_row.deal_id,p_assessment,p_upstream_kind,p_upstream_id,p_downstream_kind,p_downstream_id,p_role,encode(extensions.digest(concat_ws('|',p_upstream_kind,p_upstream_id,p_downstream_kind,p_downstream_id,p_role),'sha256'),'hex'))
  ON CONFLICT DO NOTHING;
  RETURN item_id;
END $$;

CREATE OR REPLACE FUNCTION analysis.validate_material_trigger(p_account uuid,p_deal uuid,p_kind text,p_object uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=analysis,knowledge,source,deliverable,app,pg_catalog AS $$
DECLARE valid_trigger boolean:=false;
BEGIN
  IF p_kind='claim' THEN SELECT EXISTS(SELECT 1 FROM knowledge.claim WHERE id=p_object AND account_id=p_account AND deal_id=p_deal) INTO valid_trigger;
  ELSIF p_kind='fact' THEN SELECT EXISTS(SELECT 1 FROM knowledge.fact WHERE id=p_object AND account_id=p_account AND deal_id=p_deal) INTO valid_trigger;
  ELSIF p_kind='assumption' THEN SELECT EXISTS(SELECT 1 FROM knowledge.assumption WHERE id=p_object AND account_id=p_account AND deal_id=p_deal) INTO valid_trigger;
  ELSIF p_kind='human_decision' THEN SELECT EXISTS(SELECT 1 FROM knowledge.human_decision WHERE id=p_object AND account_id=p_account AND deal_id=p_deal) INTO valid_trigger;
  ELSIF p_kind='source_record' THEN SELECT EXISTS(SELECT 1 FROM source.source_record WHERE id=p_object AND account_id=p_account AND deal_id=p_deal) INTO valid_trigger;
  ELSIF p_kind='source_packet_version' THEN SELECT EXISTS(SELECT 1 FROM source.source_packet_version WHERE id=p_object AND account_id=p_account AND deal_id=p_deal) INTO valid_trigger;
  ELSIF p_kind='revision' THEN SELECT EXISTS(SELECT 1 FROM deliverable.deliverable_revision WHERE id=p_object AND account_id=p_account AND deal_id=p_deal) INTO valid_trigger;
  ELSIF p_kind IN ('audience','purpose','source_perimeter') THEN valid_trigger:=p_object=p_deal;
  END IF;
  IF NOT valid_trigger THEN RAISE EXCEPTION 'impact_trigger_not_found'; END IF;
END $$;

CREATE OR REPLACE FUNCTION analysis.build_material_impact(p_change uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=analysis,knowledge,source,deliverable,app,extensions,pg_catalog AS $$
DECLARE c material_change%ROWTYPE; a uuid:=gen_random_uuid(); r record; root_kind text;
BEGIN
  SELECT * INTO c FROM material_change WHERE id=p_change;
  IF NOT FOUND THEN RAISE EXCEPTION 'impact_change_not_found'; END IF;
  INSERT INTO impact_assessment(id,account_id,deal_id,material_change_id,created_by) VALUES(a,c.account_id,c.deal_id,p_change,c.actor_id);
  root_kind:=CASE c.trigger_kind WHEN 'source_packet_version' THEN 'source_record' WHEN 'revision' THEN 'deliverable_revision' WHEN 'audience' THEN 'package_readiness' WHEN 'purpose' THEN 'package_readiness' WHEN 'source_perimeter' THEN 'package_readiness' ELSE c.trigger_kind END;
  PERFORM analysis.add_impact_item(a,c.trigger_kind,c.trigger_object_id,root_kind,c.trigger_object_id,'material_change','materially_affected',false,false,true,true,jsonb_build_object('origin',c.origin_code,'reason',c.reason,'effective_at',c.effective_at));
  IF c.trigger_kind IN ('claim','fact') THEN
    FOR r IN
      SELECT 'fact'::text kind,f.id object_id,'claim_to_fact' role FROM knowledge.fact f WHERE f.account_id=c.account_id AND f.deal_id=c.deal_id AND (f.claim_id=c.trigger_object_id OR f.id=c.trigger_object_id)
      UNION SELECT 'calculation_version',m.calculation_version_id,'fact_to_calculation' FROM analysis.calculation_input_measure m WHERE m.account_id=c.account_id AND m.deal_id=c.deal_id AND (m.fact_id=c.trigger_object_id OR m.assumption_id=c.trigger_object_id)
      UNION SELECT 'calculation_run',x.id,'calculation_to_run' FROM analysis.calculation_run x JOIN analysis.calculation_input_measure m ON m.calculation_version_id=x.calculation_version_id WHERE x.account_id=c.account_id AND x.deal_id=c.deal_id AND (m.fact_id=c.trigger_object_id OR m.assumption_id=c.trigger_object_id)
      UNION SELECT 'model_version',mv.id,'calculation_to_model' FROM analysis.model_version mv JOIN analysis.model_version_calculation mc ON mc.model_version_id=mv.id JOIN analysis.calculation_input_measure m ON m.calculation_version_id=mc.calculation_version_id WHERE mv.account_id=c.account_id AND mv.deal_id=c.deal_id AND (m.fact_id=c.trigger_object_id OR m.assumption_id=c.trigger_object_id)
      UNION SELECT 'scenario_version',sv.id,'model_to_scenario' FROM analysis.scenario_version sv JOIN analysis.model_version mv ON mv.id=sv.model_version_id JOIN analysis.model_version_calculation mc ON mc.model_version_id=mv.id JOIN analysis.calculation_input_measure m ON m.calculation_version_id=mc.calculation_version_id WHERE sv.account_id=c.account_id AND sv.deal_id=c.deal_id AND (m.fact_id=c.trigger_object_id OR m.assumption_id=c.trigger_object_id)
      UNION SELECT 'analysis_version',av.id,'analysis_to_input' FROM analysis.analysis_version av WHERE av.account_id=c.account_id AND av.deal_id=c.deal_id AND (c.trigger_object_id=ANY(av.fact_ids) OR c.trigger_object_id=ANY(av.assumption_ids))
    LOOP
      PERFORM analysis.add_impact_item(a,c.trigger_kind,c.trigger_object_id,r.kind,r.object_id,r.role,'materially_affected',r.kind IN ('calculation_version','calculation_run'),r.kind IN ('analysis_version','model_version','scenario_version'),true,true,jsonb_build_object('deterministic',true));
    END LOOP;
  ELSIF c.trigger_kind='assumption' THEN
    FOR r IN
      SELECT 'calculation_version'::text kind,m.calculation_version_id object_id,'assumption_to_calculation' role FROM analysis.calculation_input_measure m WHERE m.account_id=c.account_id AND m.deal_id=c.deal_id AND m.assumption_id=c.trigger_object_id
      UNION SELECT 'model_version',m.model_version_id,'assumption_to_model' FROM analysis.model_version_assumption m WHERE m.account_id=c.account_id AND m.deal_id=c.deal_id AND m.assumption_id=c.trigger_object_id
      UNION SELECT 'scenario_version',s.id,'model_to_scenario' FROM analysis.scenario_version s JOIN analysis.model_version_assumption m ON m.model_version_id=s.model_version_id WHERE s.account_id=c.account_id AND s.deal_id=c.deal_id AND m.assumption_id=c.trigger_object_id
    LOOP PERFORM analysis.add_impact_item(a,c.trigger_kind,c.trigger_object_id,r.kind,r.object_id,r.role,'materially_affected',true,r.kind='scenario_version',true,true,jsonb_build_object('deterministic',true)); END LOOP;
  ELSIF c.trigger_kind='human_decision' THEN
    FOR r IN
      SELECT 'fact'::text kind,f.id object_id,'decision_to_fact' role FROM knowledge.fact f WHERE f.acceptance_decision_id=c.trigger_object_id AND f.account_id=c.account_id AND f.deal_id=c.deal_id
      UNION SELECT 'assumption',x.id,'decision_to_assumption' FROM knowledge.assumption_decision d JOIN knowledge.assumption x ON x.id=d.assumption_id WHERE d.decision_id=c.trigger_object_id AND x.account_id=c.account_id AND x.deal_id=c.deal_id
    LOOP PERFORM analysis.add_impact_item(a,c.trigger_kind,c.trigger_object_id,r.kind,r.object_id,r.role,'materially_affected',true,true,true,true,jsonb_build_object('deterministic',true)); END LOOP;
  ELSIF c.trigger_kind='source_record' THEN
    FOR r IN
      SELECT 'evidence'::text kind,e.id object_id,'source_to_evidence' role FROM knowledge.evidence e WHERE e.source_record_id=c.trigger_object_id AND e.account_id=c.account_id AND e.deal_id=c.deal_id
      UNION SELECT 'claim',cl.id,'evidence_to_claim' FROM knowledge.evidence_relationship er JOIN knowledge.claim cl ON cl.id=er.claim_id JOIN knowledge.evidence e ON e.id=er.evidence_id WHERE e.source_record_id=c.trigger_object_id AND cl.account_id=c.account_id AND cl.deal_id=c.deal_id
      UNION SELECT 'fact',f.id,'claim_to_fact' FROM knowledge.fact f WHERE f.claim_id IN (SELECT cl.id FROM knowledge.claim cl JOIN knowledge.evidence_relationship er ON er.claim_id=cl.id JOIN knowledge.evidence e ON e.id=er.evidence_id WHERE e.source_record_id=c.trigger_object_id) AND f.account_id=c.account_id AND f.deal_id=c.deal_id
    LOOP PERFORM analysis.add_impact_item(a,c.trigger_kind,c.trigger_object_id,r.kind,r.object_id,r.role,'materially_affected',r.kind='fact',r.kind='claim',true,true,jsonb_build_object('deterministic',true)); END LOOP;
  ELSIF c.trigger_kind IN ('revision','source_packet_version','audience','purpose','source_perimeter') THEN
    FOR r IN
      SELECT 'deliverable_revision'::text kind,dr.id object_id,'revision_scope' role FROM deliverable.deliverable_revision dr WHERE dr.account_id=c.account_id AND dr.deal_id=c.deal_id AND (dr.id=c.trigger_object_id OR c.trigger_kind<>'revision')
      UNION SELECT 'artifact',ar.id,'revision_to_artifact' FROM deliverable.artifact ar JOIN deliverable.deliverable_revision dr ON dr.id=ar.revision_id WHERE dr.account_id=c.account_id AND dr.deal_id=c.deal_id AND (dr.id=c.trigger_object_id OR c.trigger_kind<>'revision')
      UNION SELECT 'review',rv.id,'revision_to_review' FROM deliverable.review rv WHERE rv.account_id=c.account_id AND rv.deal_id=c.deal_id AND (rv.revision_id=c.trigger_object_id OR c.trigger_kind<>'revision')
      UNION SELECT 'qc_finding',q.id,'revision_to_qc' FROM deliverable.qc_finding q WHERE q.account_id=c.account_id AND q.deal_id=c.deal_id AND (q.revision_id=c.trigger_object_id OR c.trigger_kind<>'revision')
      UNION SELECT 'package_readiness',ra.id,'revision_to_readiness' FROM deliverable.readiness_assessment ra WHERE ra.account_id=c.account_id AND ra.deal_id=c.deal_id AND (ra.revision_id=c.trigger_object_id OR c.trigger_kind<>'revision')
    LOOP PERFORM analysis.add_impact_item(a,c.trigger_kind,c.trigger_object_id,r.kind,r.object_id,r.role,'materially_affected',r.kind='deliverable_revision',r.kind IN ('artifact','review','qc_finding'),true,true,jsonb_build_object('deterministic',true)); END LOOP;
  END IF;
  -- Record explicit unaffected state for exact objects in the same Deal that
  -- were checked and did not enter the typed closure. This keeps the UI and
  -- audit trail from collapsing the whole Deal into a vague stale flag.
  INSERT INTO impact_item(account_id,deal_id,assessment_id,object_kind,object_id,impact_code,basis)
  SELECT c.account_id,c.deal_id,a,'analysis_version',av.id,'unaffected',jsonb_build_object('deterministic',true,'scope_exclusion',true)
  FROM analysis.analysis_version av
  WHERE av.account_id=c.account_id AND av.deal_id=c.deal_id
    AND NOT EXISTS(SELECT 1 FROM impact_item i WHERE i.assessment_id=a AND i.object_kind='analysis_version' AND i.object_id=av.id);
  INSERT INTO impact_item(account_id,deal_id,assessment_id,object_kind,object_id,impact_code,basis)
  SELECT c.account_id,c.deal_id,a,'deliverable_revision',dr.id,'unaffected',jsonb_build_object('deterministic',true,'scope_exclusion',true)
  FROM deliverable.deliverable_revision dr
  WHERE dr.account_id=c.account_id AND dr.deal_id=c.deal_id
    AND NOT EXISTS(SELECT 1 FROM impact_item i WHERE i.assessment_id=a AND i.object_kind='deliverable_revision' AND i.object_id=dr.id);
  PERFORM analysis.add_impact_item(a,c.trigger_kind,c.trigger_object_id,'external_use_decision',c.deal_id,'authorization_boundary','potentially_affected',false,false,true,true,jsonb_build_object('prior_authorization_carries_forward',false));
  UPDATE impact_assessment ia SET status=CASE WHEN EXISTS(SELECT 1 FROM impact_item ii WHERE ii.assessment_id=ia.id AND ii.impact_code IN ('materially_affected','potentially_affected')) THEN 'open' ELSE 'recovered' END WHERE ia.id=a;
  RETURN a;
END $$;

CREATE OR REPLACE FUNCTION analysis.create_material_change_internal(p_account uuid,p_actor uuid,p_deal uuid,p_kind text,p_object uuid,p_previous uuid,p_reason text,p_basis jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=analysis,app,pg_catalog AS $$
DECLARE change_id uuid:=gen_random_uuid(); assessment_id uuid;
BEGIN
  PERFORM analysis.assert_impact_scope(p_account,p_actor,p_deal);
  PERFORM analysis.validate_material_trigger(p_account,p_deal,p_kind,p_object);
  INSERT INTO analysis.material_change(id,account_id,deal_id,trigger_kind,trigger_object_id,previous_object_id,reason,basis,origin_code,actor_id) VALUES(change_id,p_account,p_deal,p_kind,p_object,p_previous,p_reason,coalesce(p_basis,'{}'::jsonb),CASE WHEN p_kind IN ('claim','fact','assumption') THEN 'correction' ELSE 'human_authored' END,p_actor);
  assessment_id:=analysis.build_material_impact(change_id);
  PERFORM app.record_audit('impact_assessment_created','completed','impact_assessment',assessment_id::text,p_kind,change_id::text);
  RETURN jsonb_build_object('id',assessment_id,'material_change_id',change_id,'trigger_kind',p_kind,'trigger_object_id',p_object,'status','open','idempotent_replayed',false);
END $$;

CREATE OR REPLACE FUNCTION analysis.create_material_change(p_account uuid,p_actor uuid,p_deal uuid,p_kind text,p_object uuid,p_previous uuid,p_reason text,p_basis jsonb,p_key_hash text,p_request_digest text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=analysis,app,pg_catalog AS $$
DECLARE prior analysis.command_idempotency%ROWTYPE; result jsonb;
BEGIN
  PERFORM analysis.assert_impact_scope(p_account,p_actor,p_deal);
  SELECT * INTO prior FROM analysis.command_idempotency WHERE account_id=p_account AND actor_id=p_actor AND deal_id=p_deal AND command_type='create_material_change' AND key_hash=p_key_hash;
  IF FOUND THEN IF prior.request_digest<>p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused'; END IF; RETURN jsonb_build_object('id',prior.result_id,'idempotent_replayed',true); END IF;
  result:=analysis.create_material_change_internal(p_account,p_actor,p_deal,p_kind,p_object,p_previous,p_reason,p_basis);
  INSERT INTO analysis.command_idempotency(account_id,actor_id,deal_id,command_type,key_hash,request_digest,result_id) VALUES(p_account,p_actor,p_deal,'create_material_change',p_key_hash,p_request_digest,(result->>'id')::uuid);
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION analysis.get_impact_projection(p_account uuid,p_actor uuid,p_deal uuid,p_assessment uuid DEFAULT NULL) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=analysis,app,pg_catalog AS $$
SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'status',a.status,'closure_version',a.closure_version,'created_at',a.created_at,'material_change',to_jsonb(c),'items',(SELECT coalesce(jsonb_agg(to_jsonb(i) ORDER BY i.object_kind,i.object_id),'[]'::jsonb) FROM impact_item i WHERE i.assessment_id=a.id),'edges',(SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.id),'[]'::jsonb) FROM impact_candidate_edge e WHERE e.assessment_id=a.id),'dispositions',(SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.created_at),'[]'::jsonb) FROM impact_disposition d WHERE d.assessment_id=a.id)) ORDER BY a.created_at DESC),'[]'::jsonb) FROM impact_assessment a JOIN material_change c ON c.id=a.material_change_id WHERE a.account_id=p_account AND a.deal_id=p_deal AND (p_assessment IS NULL OR a.id=p_assessment) AND p_account=app.policy_account_id() AND p_actor=app.policy_actor_id() AND p_deal=app.policy_deal_id();
$$;

CREATE OR REPLACE FUNCTION analysis.record_impact_disposition(p_account uuid,p_actor uuid,p_deal uuid,p_assessment uuid,p_items jsonb,p_rationale text,p_follow_up jsonb,p_key_hash text,p_request_digest text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=analysis,app,pg_catalog AS $$
DECLARE prior analysis.command_idempotency%ROWTYPE; x jsonb; item_row impact_item%ROWTYPE; action text; count_items integer:=0; pending integer; result jsonb;
BEGIN
  PERFORM analysis.assert_impact_scope(p_account,p_actor,p_deal);
  SELECT * INTO prior FROM analysis.command_idempotency WHERE account_id=p_account AND actor_id=p_actor AND deal_id=p_deal AND command_type='record_impact_disposition' AND key_hash=p_key_hash;
  IF FOUND THEN IF prior.request_digest<>p_request_digest THEN RAISE EXCEPTION 'idempotency_key_reused'; END IF; RETURN jsonb_build_object('assessment_id',p_assessment,'status','replayed','idempotent_replayed',true); END IF;
  IF NOT EXISTS(SELECT 1 FROM impact_assessment WHERE id=p_assessment AND account_id=p_account AND deal_id=p_deal) THEN RAISE EXCEPTION 'impact_assessment_not_found'; END IF;
  IF jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'impact_disposition_required'; END IF;
  FOR x IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO item_row FROM impact_item WHERE id=(x->>'impact_item_id')::uuid AND assessment_id=p_assessment AND account_id=p_account AND deal_id=p_deal FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'impact_item_not_found'; END IF;
    action:=x->>'disposition_code';
    IF action='recalculate' AND NOT item_row.recalculation_required THEN RAISE EXCEPTION 'impact_action_mismatch'; END IF;
    IF action='regenerate' AND NOT item_row.regeneration_required THEN RAISE EXCEPTION 'impact_action_mismatch'; END IF;
    IF action='rereview' AND NOT item_row.rereview_required THEN RAISE EXCEPTION 'impact_action_mismatch'; END IF;
    IF action='block_circulation' AND NOT item_row.circulation_blocked THEN RAISE EXCEPTION 'impact_action_mismatch'; END IF;
    IF action='retain_unaffected' AND item_row.impact_code='materially_affected' THEN RAISE EXCEPTION 'impact_action_mismatch'; END IF;
    INSERT INTO impact_disposition(account_id,deal_id,assessment_id,impact_item_id,disposition_code,rationale,follow_up,decided_by) VALUES(p_account,p_deal,p_assessment,item_row.id,action,p_rationale,coalesce(p_follow_up,'{}'::jsonb),p_actor);
    count_items:=count_items+1;
  END LOOP;
  SELECT count(*) INTO pending FROM impact_item i WHERE i.assessment_id=p_assessment AND NOT EXISTS(SELECT 1 FROM impact_disposition d WHERE d.impact_item_id=i.id);
  UPDATE impact_assessment SET status=CASE WHEN pending=0 THEN 'recovered' ELSE 'partially_recovered' END, completed_at=CASE WHEN pending=0 THEN now() ELSE NULL END WHERE id=p_assessment;
  result:=jsonb_build_object('assessment_id',p_assessment,'dispositions',count_items,'status',(SELECT status FROM impact_assessment WHERE id=p_assessment),'idempotent_replayed',false);
  INSERT INTO analysis.command_idempotency(account_id,actor_id,deal_id,command_type,key_hash,request_digest,result_id) VALUES(p_account,p_actor,p_deal,'record_impact_disposition',p_key_hash,p_request_digest,p_assessment);
  RETURN result;
END $$;

GRANT EXECUTE ON FUNCTION analysis.create_material_change(uuid,uuid,uuid,text,uuid,uuid,text,jsonb,text,text), analysis.get_impact_projection(uuid,uuid,uuid,uuid), analysis.record_impact_disposition(uuid,uuid,uuid,uuid,jsonb,text,jsonb,text,text) TO app_runtime;
-- Replace the marker-based revision trigger with direct metadata on the command function.
DROP TRIGGER IF EXISTS material_revision_link ON deliverable.deliverable_revision;
DROP TRIGGER IF EXISTS material_revision_link_after ON deliverable.deliverable_revision;
DROP TRIGGER IF EXISTS material_revision_link_before ON deliverable.deliverable_revision;
CREATE OR REPLACE FUNCTION analysis.link_material_revision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=analysis,pg_catalog AS $$
BEGIN
  IF NEW.impact_assessment_id IS NOT NULL THEN
    INSERT INTO analysis.impact_revision_link(assessment_id,account_id,deal_id,revision_id,predecessor_revision_id) VALUES(NEW.impact_assessment_id,NEW.account_id,NEW.deal_id,NEW.id,NEW.predecessor_id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER material_revision_link_after AFTER INSERT ON deliverable.deliverable_revision FOR EACH ROW EXECUTE FUNCTION analysis.link_material_revision();

CREATE OR REPLACE FUNCTION deliverable.create_revision(p_parent uuid,p_expected bigint,p_key text,p_digest text,p_basis jsonb,p_limitations jsonb,p_release text,p_impact uuid,p_reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=deliverable,analysis,knowledge,source,app,extensions,pg_catalog AS $$
DECLARE parent deliverable.deliverable%ROWTYPE; replay jsonb; revision uuid:=gen_random_uuid(); job uuid:=gen_random_uuid(); input jsonb; basis jsonb; ordinal integer;
BEGIN
  PERFORM deliverable.assert_write(); replay:=deliverable.replay('create_revision',p_key,p_digest); IF replay IS NOT NULL THEN RETURN replay; END IF;
  SELECT * INTO parent FROM deliverable.deliverable WHERE id=p_parent FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'artifact_scope_unavailable'; END IF;
  IF parent.row_version<>p_expected THEN RAISE EXCEPTION 'artifact_version_conflict'; END IF;
  IF p_impact IS NOT NULL AND NOT EXISTS(SELECT 1 FROM analysis.impact_assessment WHERE id=p_impact AND account_id=parent.account_id AND deal_id=parent.deal_id) THEN RAISE EXCEPTION 'impact_assessment_not_found'; END IF;
  IF p_impact IS NOT NULL AND EXISTS(
    SELECT 1
    FROM analysis.impact_assessment ia
    JOIN analysis.impact_item ii ON ii.assessment_id=ia.id
    LEFT JOIN analysis.impact_disposition idp ON idp.impact_item_id=ii.id
    WHERE ia.id=p_impact AND idp.id IS NULL
  ) THEN RAISE EXCEPTION 'impact_disposition_required'; END IF;
  IF p_impact IS NOT NULL AND length(btrim(coalesce(p_reason,'')))<20 THEN RAISE EXCEPTION 'change_reason_required'; END IF;
  input:=deliverable.build_input(p_parent,revision,p_basis,p_limitations);
  SELECT coalesce(max(r.ordinal),0)+1 INTO ordinal FROM deliverable.deliverable_revision r WHERE deliverable_id=p_parent;
  INSERT INTO deliverable.deliverable_revision(id,account_id,deal_id,deliverable_id,ordinal,predecessor_id,purpose,audience,confidentiality,template_version,build_input,basis_digest,created_by,impact_assessment_id,change_reason) VALUES(revision,parent.account_id,parent.deal_id,parent.id,ordinal,parent.current_revision_id,parent.purpose,parent.audience,parent.confidentiality,'analysis-valuation-1.0.0',input,encode(extensions.digest(input::text,'sha256'),'hex'),app.policy_actor_id(),p_impact,p_reason);
  FOR basis IN SELECT value FROM jsonb_array_elements(p_basis) LOOP INSERT INTO deliverable.revision_calculation_run VALUES(parent.account_id,parent.deal_id,revision,(basis->>'calculation_run_id')::uuid) ON CONFLICT DO NOTHING; INSERT INTO deliverable.revision_model_version VALUES(parent.account_id,parent.deal_id,revision,(basis->>'model_version_id')::uuid) ON CONFLICT DO NOTHING; INSERT INTO deliverable.revision_scenario_version VALUES(parent.account_id,parent.deal_id,revision,(basis->>'scenario_version_id')::uuid) ON CONFLICT DO NOTHING; END LOOP;
  INSERT INTO jobs.job(id,account_id,deal_id,actor_id,command_type,purpose_code,accepted_inputs,input_digest,input_version,workflow_version,release_id,allowance_class,allowance_quantity,allowance_posture,workspace_posture_version,security_epoch,state) SELECT job,parent.account_id,parent.deal_id,app.policy_actor_id(),'analysis_workbook_build','analysis_workbook_build',jsonb_build_object('revision_id',revision,'basis',p_basis,'impact_assessment_id',p_impact),encode(extensions.digest(input::text,'sha256'),'hex'),'1.0.0','analysis-valuation-1.0.0',p_release,'analysis_workbook_build',1,'reserved',w.posture_version,a.security_epoch,'queued' FROM app.deal_workspace w JOIN app.account a ON a.id=w.account_id WHERE w.deal_id=parent.deal_id AND w.account_id=parent.account_id;
  INSERT INTO deliverable.workbook_job(job_id,account_id,deal_id,revision_id,input) VALUES(job,parent.account_id,parent.deal_id,revision,input);
  UPDATE deliverable.deliverable SET current_revision_id=revision,row_version=row_version+1 WHERE id=parent.id;
  IF p_impact IS NOT NULL THEN INSERT INTO analysis.impact_revision_link(assessment_id,account_id,deal_id,revision_id,predecessor_revision_id) VALUES(p_impact,parent.account_id,parent.deal_id,revision,parent.current_revision_id) ON CONFLICT DO NOTHING; END IF;
  PERFORM app.record_audit('workbook_revision_requested','accepted','revision',revision::text,'exact_controlled_basis',coalesce(p_impact::text,''));
  RETURN deliverable.remember('create_revision',p_key,p_digest,jsonb_build_object('id',job,'job_type','analysis_workbook_build','state','queued','revision_id',revision,'deliverable_id',parent.id,'row_version',parent.row_version+1,'impact_assessment_id',p_impact));
END $$;
GRANT EXECUTE ON FUNCTION deliverable.create_revision(uuid,bigint,text,text,jsonb,jsonb,text,uuid,text) TO app_runtime;

CREATE OR REPLACE FUNCTION deliverable.create_revision(p_parent uuid,p_expected bigint,p_key text,p_digest text,p_basis jsonb,p_limitations jsonb,p_release text) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=deliverable,analysis,knowledge,source,app,extensions,pg_catalog AS $$ SELECT deliverable.create_revision(p_parent,p_expected,p_key,p_digest,p_basis,p_limitations,p_release,NULL::uuid,NULL::text); $$;

-- Keep the original public arities compatible while routing them through the
-- hardened implementation.
CREATE OR REPLACE FUNCTION analysis.create_material_change(p_account uuid,p_actor uuid,p_deal uuid,p_kind text,p_object uuid,p_previous uuid,p_reason text,p_basis jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=analysis,app,pg_catalog AS $$
BEGIN
  RETURN analysis.create_material_change_internal(p_account,p_actor,p_deal,p_kind,p_object,p_previous,p_reason,p_basis);
END $$;
CREATE OR REPLACE FUNCTION analysis.record_impact_disposition(p_account uuid,p_actor uuid,p_deal uuid,p_assessment uuid,p_items jsonb,p_rationale text,p_follow_up jsonb)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=analysis,app,extensions,pg_catalog AS $$
SELECT analysis.record_impact_disposition(p_account,p_actor,p_deal,p_assessment,p_items,p_rationale,p_follow_up,'legacy-'||encode(extensions.digest(p_assessment::text||p_items::text,'sha256'),'hex'),encode(extensions.digest(p_assessment::text||p_items::text||p_rationale,'sha256'),'hex'));
$$;
GRANT EXECUTE ON FUNCTION analysis.create_material_change(uuid,uuid,uuid,text,uuid,uuid,text,jsonb), analysis.record_impact_disposition(uuid,uuid,uuid,uuid,jsonb,text,jsonb) TO app_runtime;

CREATE OR REPLACE FUNCTION analysis.prevent_ticket14_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'impact_immutable_record' USING ERRCODE='23514'; END $$;
DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['material_change','impact_candidate_edge','impact_item','impact_disposition','impact_revision_link'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS ticket14_%I_immutable ON analysis.%I',table_name,table_name);
    EXECUTE format('CREATE TRIGGER ticket14_%I_immutable BEFORE UPDATE OR DELETE ON analysis.%I FOR EACH ROW EXECUTE FUNCTION analysis.prevent_ticket14_mutation()',table_name,table_name);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION analysis.add_impact_item(
  p_assessment uuid, p_upstream_kind text, p_upstream_id uuid, p_downstream_kind text,
  p_downstream_id uuid, p_role text, p_code text, p_recalculate boolean,
  p_regenerate boolean, p_rereview boolean, p_block boolean, p_basis jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=analysis,app,extensions,pg_catalog AS $$
DECLARE assessment_row impact_assessment%ROWTYPE; item_id uuid;
BEGIN
  SELECT * INTO assessment_row FROM impact_assessment WHERE id=p_assessment;
  IF NOT FOUND THEN RAISE EXCEPTION 'impact_assessment_not_found'; END IF;
  INSERT INTO impact_item(account_id,deal_id,assessment_id,object_kind,object_id,impact_code,recalculation_required,regeneration_required,rereview_required,circulation_blocked,basis)
  VALUES(assessment_row.account_id,assessment_row.deal_id,p_assessment,p_downstream_kind,p_downstream_id,p_code,p_recalculate,p_regenerate,p_rereview,p_block,coalesce(p_basis,'{}'::jsonb)) ON CONFLICT (assessment_id,object_kind,object_id) DO NOTHING;
  SELECT id INTO item_id FROM impact_item WHERE assessment_id=p_assessment AND object_kind=p_downstream_kind AND object_id=p_downstream_id;
  INSERT INTO impact_candidate_edge(account_id,deal_id,assessment_id,upstream_kind,upstream_id,downstream_kind,downstream_id,dependency_role,edge_digest)
  VALUES(assessment_row.account_id,assessment_row.deal_id,p_assessment,p_upstream_kind,p_upstream_id,p_downstream_kind,p_downstream_id,p_role,encode(extensions.digest(concat_ws('|',p_upstream_kind,p_upstream_id,p_downstream_kind,p_downstream_id,p_role),'sha256'),'hex')) ON CONFLICT DO NOTHING;
  RETURN item_id;
END $$;
