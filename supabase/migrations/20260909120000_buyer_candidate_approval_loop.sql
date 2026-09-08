-- Deal-local Buyer Candidate -> typed Banker approval loop.
-- Candidate evidence and AI proposals are advisory records; only the typed
-- approval extension creates membership in the controlled buyer universe.
CREATE SCHEMA IF NOT EXISTS process;

CREATE TABLE IF NOT EXISTS process.deal_party (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL REFERENCES app.account(id), deal_id uuid NOT NULL REFERENCES app.deal(id),
  party_kind text NOT NULL CHECK (party_kind IN ('organization','person')), display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 240),
  origin_code text NOT NULL CHECK (origin_code IN ('human_authored','source_observation','ai_proposal')), source_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  row_version bigint NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(account_id,id), UNIQUE(account_id,deal_id,id)
);
CREATE TABLE IF NOT EXISTS process.organization_party (
  deal_party_id uuid PRIMARY KEY REFERENCES process.deal_party(id), account_id uuid NOT NULL REFERENCES app.account(id), deal_id uuid NOT NULL REFERENCES app.deal(id),
  legal_name text NOT NULL CHECK (length(legal_name) BETWEEN 1 AND 240), jurisdiction text, source_supported_domain text, identifiers jsonb NOT NULL DEFAULT '{}'::jsonb,
  FOREIGN KEY(account_id,deal_id) REFERENCES app.deal(account_id,id), FOREIGN KEY(account_id,deal_party_id) REFERENCES process.deal_party(account_id,id), UNIQUE(account_id,deal_party_id)
);
CREATE TABLE IF NOT EXISTS process.buyer_candidate_proposal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL REFERENCES app.account(id), deal_id uuid NOT NULL REFERENCES app.deal(id),
  task_code text NOT NULL DEFAULT 'buyer_candidate_proposal', task_version text NOT NULL DEFAULT 'v1', strategy_criteria jsonb NOT NULL,
  eligible_source_observations jsonb NOT NULL, rationale text NOT NULL CHECK (length(rationale) BETWEEN 1 AND 4000), fit_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  restrictions jsonb NOT NULL DEFAULT '[]'::jsonb, abstention_code text, prompt_injection_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  origin_code text NOT NULL CHECK (origin_code IN ('human_authored','ai_generated')), created_by_actor_id uuid NOT NULL REFERENCES app.actor(id), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id,id), FOREIGN KEY(account_id,deal_id) REFERENCES app.deal(account_id,id)
);
CREATE TABLE IF NOT EXISTS process.buyer_candidate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL REFERENCES app.account(id), deal_id uuid NOT NULL REFERENCES app.deal(id), organization_party_id uuid NOT NULL,
  proposal_id uuid NOT NULL, version bigint NOT NULL DEFAULT 1, status_code text NOT NULL DEFAULT 'candidate' CHECK(status_code IN ('candidate','withdrawn','merged')),
  rationale text NOT NULL, fit_factors jsonb NOT NULL DEFAULT '[]'::jsonb, restrictions jsonb NOT NULL DEFAULT '[]'::jsonb,
  interest_posture text NOT NULL DEFAULT 'unknown' CHECK(interest_posture IN ('unknown','supported','conflicted','unsupported')),
  capacity_posture text NOT NULL DEFAULT 'unknown' CHECK(capacity_posture IN ('unknown','supported','conflicted','unsupported')),
  contactability_posture text NOT NULL DEFAULT 'unknown' CHECK(contactability_posture IN ('unknown','supported','conflicted','unsupported')),
  conflict_posture text NOT NULL DEFAULT 'none_known' CHECK(conflict_posture IN ('none_known','conflicted','resolved')),
  created_by_actor_id uuid NOT NULL REFERENCES app.actor(id), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id,id), FOREIGN KEY(account_id,deal_id) REFERENCES app.deal(account_id,id), FOREIGN KEY(account_id,organization_party_id) REFERENCES process.organization_party(account_id,deal_party_id), FOREIGN KEY(account_id,proposal_id) REFERENCES process.buyer_candidate_proposal(account_id,id)
);
CREATE TABLE IF NOT EXISTS process.buyer_candidate_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL REFERENCES app.account(id), deal_id uuid NOT NULL REFERENCES app.deal(id), candidate_id uuid NOT NULL,
  version bigint NOT NULL, change_code text NOT NULL CHECK(change_code IN ('created','corrected','withdrawn','merged','material_change')), prior_version bigint, change_reason text NOT NULL,
  proposal_id uuid, recorded_by_actor_id uuid NOT NULL REFERENCES app.actor(id), recorded_at timestamptz NOT NULL DEFAULT now(), UNIQUE(account_id,candidate_id,version),
  FOREIGN KEY(account_id,deal_id) REFERENCES app.deal(account_id,id), FOREIGN KEY(account_id,candidate_id) REFERENCES process.buyer_candidate(account_id,id)
);
CREATE TABLE IF NOT EXISTS process.buyer_candidate_impact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL REFERENCES app.account(id), deal_id uuid NOT NULL REFERENCES app.deal(id), candidate_id uuid NOT NULL,
  candidate_version bigint NOT NULL, impact_code text NOT NULL CHECK(impact_code IN ('auction_control_workbook_review','execution_package_review','outreach_scope_review')),
  status_code text NOT NULL DEFAULT 'candidate' CHECK(status_code IN ('candidate','accepted','unaffected','unable_to_assess')), rationale text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(account_id,deal_id) REFERENCES app.deal(account_id,id), FOREIGN KEY(account_id,candidate_id) REFERENCES process.buyer_candidate(account_id,id)
);
CREATE TABLE IF NOT EXISTS process.buyer_approval (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL REFERENCES app.account(id), deal_id uuid NOT NULL REFERENCES app.deal(id), buyer_candidate_id uuid NOT NULL,
  human_decision_id uuid NOT NULL UNIQUE, candidate_version bigint NOT NULL, approved_scope jsonb NOT NULL, restrictions jsonb NOT NULL DEFAULT '[]'::jsonb,
  permitted_wave_audience jsonb NOT NULL DEFAULT '{}'::jsonb, invalidation_triggers jsonb NOT NULL DEFAULT '[]'::jsonb, effective_at timestamptz NOT NULL DEFAULT now(), recorded_at timestamptz NOT NULL DEFAULT now(), invalidated_at timestamptz,
  UNIQUE(account_id,id), FOREIGN KEY(account_id,deal_id) REFERENCES app.deal(account_id,id), FOREIGN KEY(account_id,buyer_candidate_id) REFERENCES process.buyer_candidate(account_id,id), FOREIGN KEY(account_id,human_decision_id) REFERENCES knowledge.human_decision(account_id,id)
);
CREATE TABLE IF NOT EXISTS process.command_idempotency (
  account_id uuid NOT NULL REFERENCES app.account(id), deal_id uuid NOT NULL REFERENCES app.deal(id), actor_id uuid NOT NULL REFERENCES app.actor(id), command_code text NOT NULL,
  key_hash text NOT NULL, request_digest text NOT NULL, result_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(account_id,deal_id,actor_id,command_code,key_hash)
);

DO $$ DECLARE c text; BEGIN
  SELECT conname INTO c FROM pg_constraint WHERE conrelid='knowledge.human_decision'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%decision_type_code%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE knowledge.human_decision DROP CONSTRAINT %I', c); END IF;
  ALTER TABLE knowledge.human_decision ADD CONSTRAINT human_decision_type_code_buyer_check CHECK (decision_type_code IN ('fact_acceptance','assumption_approval','conflict_resolution','correction','buyer_approval'));
END $$;

ALTER TABLE process.deal_party ENABLE ROW LEVEL SECURITY; ALTER TABLE process.deal_party FORCE ROW LEVEL SECURITY;
ALTER TABLE process.organization_party ENABLE ROW LEVEL SECURITY; ALTER TABLE process.organization_party FORCE ROW LEVEL SECURITY;
ALTER TABLE process.buyer_candidate_proposal ENABLE ROW LEVEL SECURITY; ALTER TABLE process.buyer_candidate_proposal FORCE ROW LEVEL SECURITY;
ALTER TABLE process.buyer_candidate ENABLE ROW LEVEL SECURITY; ALTER TABLE process.buyer_candidate FORCE ROW LEVEL SECURITY;
ALTER TABLE process.buyer_candidate_history ENABLE ROW LEVEL SECURITY; ALTER TABLE process.buyer_candidate_history FORCE ROW LEVEL SECURITY;
ALTER TABLE process.buyer_candidate_impact ENABLE ROW LEVEL SECURITY; ALTER TABLE process.buyer_candidate_impact FORCE ROW LEVEL SECURITY;
ALTER TABLE process.buyer_approval ENABLE ROW LEVEL SECURITY; ALTER TABLE process.buyer_approval FORCE ROW LEVEL SECURITY;
ALTER TABLE process.command_idempotency ENABLE ROW LEVEL SECURITY; ALTER TABLE process.command_idempotency FORCE ROW LEVEL SECURITY;
CREATE POLICY buyer_party_scope ON process.deal_party FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY buyer_org_scope ON process.organization_party FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY buyer_proposal_scope ON process.buyer_candidate_proposal FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY buyer_candidate_scope ON process.buyer_candidate FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY buyer_history_scope ON process.buyer_candidate_history FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY buyer_impact_scope ON process.buyer_candidate_impact FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY buyer_approval_scope ON process.buyer_approval FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
CREATE POLICY buyer_idempotency_scope ON process.command_idempotency FOR SELECT TO app_runtime USING(account_id=app.policy_account_id() AND deal_id=app.policy_deal_id());
REVOKE ALL ON SCHEMA process FROM PUBLIC; GRANT USAGE ON SCHEMA process TO app_runtime;
GRANT SELECT ON process.deal_party,process.organization_party,process.buyer_candidate_proposal,process.buyer_candidate,process.buyer_candidate_history,process.buyer_candidate_impact,process.buyer_approval,process.command_idempotency TO app_runtime;

CREATE OR REPLACE FUNCTION process.assert_buyer_scope(p_account uuid,p_actor uuid,p_deal uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=process,app,pg_catalog AS $$ BEGIN
  IF p_account IS DISTINCT FROM app.policy_account_id() OR p_actor IS DISTINCT FROM app.policy_actor_id() OR p_deal IS DISTINCT FROM app.policy_deal_id() THEN RAISE EXCEPTION 'buyer_scope_mismatch' USING ERRCODE='42501'; END IF;
END $$;

CREATE OR REPLACE FUNCTION process.get_buyer_candidate_projection(p_account uuid,p_actor uuid,p_deal uuid,p_candidate uuid DEFAULT NULL) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=process,knowledge,app,pg_catalog AS $$
SELECT coalesce(jsonb_agg(jsonb_build_object('id',c.id,'type','BuyerCandidate','version',c.version,'status',c.status_code,'organization',jsonb_build_object('id',p.id,'name',p.display_name,'legal_name',o.legal_name,'jurisdiction',o.jurisdiction,'domain',o.source_supported_domain),'proposal',to_jsonb(pr),'rationale',c.rationale,'fit_factors',c.fit_factors,'restrictions',c.restrictions,'postures',jsonb_build_object('interest',c.interest_posture,'capacity',c.capacity_posture,'contactability',c.contactability_posture,'conflict',c.conflict_posture),'history',(SELECT coalesce(jsonb_agg(to_jsonb(h) ORDER BY h.version),'[]'::jsonb) FROM buyer_candidate_history h WHERE h.candidate_id=c.id),'impacts',(SELECT coalesce(jsonb_agg(to_jsonb(i) ORDER BY i.created_at),'[]'::jsonb) FROM buyer_candidate_impact i WHERE i.candidate_id=c.id),'approvals',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'candidate_version',a.candidate_version,'approved_scope',a.approved_scope,'restrictions',a.restrictions,'permitted_wave_audience',a.permitted_wave_audience,'invalidation_triggers',a.invalidation_triggers,'human_decision',to_jsonb(d)) ORDER BY a.recorded_at),'[]'::jsonb) FROM buyer_approval a JOIN knowledge.human_decision d ON d.id=a.human_decision_id WHERE a.buyer_candidate_id=c.id),'next_action',CASE WHEN EXISTS(SELECT 1 FROM buyer_approval a WHERE a.buyer_candidate_id=c.id AND a.invalidated_at IS NULL) THEN 'review_scope_before_outreach' ELSE 'record_typed_buyer_approval' END) ORDER BY c.created_at) FILTER(WHERE c.id IS NOT NULL),'[]'::jsonb)
FROM buyer_candidate c JOIN deal_party p ON p.id=c.organization_party_id JOIN organization_party o ON o.deal_party_id=p.id JOIN buyer_candidate_proposal pr ON pr.id=c.proposal_id
WHERE c.account_id=p_account AND c.deal_id=p_deal AND (p_candidate IS NULL OR c.id=p_candidate) AND p_account=app.policy_account_id() AND p_actor=app.policy_actor_id() AND p_deal=app.policy_deal_id(); $$;

CREATE OR REPLACE FUNCTION process.create_buyer_candidate(p_account uuid,p_actor uuid,p_deal uuid,p_key_hash text,p_request_digest text,p_legal_name text,p_jurisdiction text,p_domain text,p_strategy jsonb,p_observations jsonb,p_rationale text,p_fit jsonb,p_restrictions jsonb,p_interest text,p_capacity text,p_contactability text,p_conflict text,p_origin text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=process,knowledge,app,pg_catalog AS $$
DECLARE party_id uuid:=gen_random_uuid(); proposal_id uuid:=gen_random_uuid(); candidate_id uuid:=gen_random_uuid(); BEGIN
  PERFORM process.assert_buyer_scope(p_account,p_actor,p_deal);
  PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws(':',p_account,p_deal,p_actor,'buyer_candidate',p_key_hash),0));
  IF EXISTS(SELECT 1 FROM process.command_idempotency WHERE account_id=p_account AND deal_id=p_deal AND actor_id=p_actor AND command_code='buyer_candidate' AND key_hash=p_key_hash AND request_digest=p_request_digest) THEN RETURN jsonb_build_object('id',(SELECT result_id FROM process.command_idempotency WHERE account_id=p_account AND deal_id=p_deal AND actor_id=p_actor AND command_code='buyer_candidate' AND key_hash=p_key_hash),'idempotent_replayed',true); END IF;
  IF EXISTS(SELECT 1 FROM process.command_idempotency WHERE account_id=p_account AND deal_id=p_deal AND actor_id=p_actor AND command_code='buyer_candidate' AND key_hash=p_key_hash AND request_digest IS DISTINCT FROM p_request_digest) THEN RAISE EXCEPTION 'idempotency_key_reused'; END IF;
  IF p_origin NOT IN ('human_authored','ai_generated') THEN RAISE EXCEPTION 'buyer_origin_invalid'; END IF;
  IF jsonb_typeof(p_observations) IS DISTINCT FROM 'array' OR jsonb_array_length(p_observations)=0 THEN RAISE EXCEPTION 'buyer_source_observation_required'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_observations) item WHERE NULLIF(item->>'source_record_id','') IS NULL OR NOT EXISTS (SELECT 1 FROM source.source_record sr WHERE sr.id=(item->>'source_record_id')::uuid AND sr.account_id=p_account AND sr.deal_id=p_deal)) THEN RAISE EXCEPTION 'buyer_source_observation_scope'; END IF;
  IF p_observations::text ~* '(ignore previous|system prompt|developer message|jailbreak|disregard instructions)' THEN RAISE EXCEPTION 'buyer_prompt_injection_detected'; END IF;
  INSERT INTO deal_party(id,account_id,deal_id,party_kind,display_name,origin_code,source_context) VALUES(party_id,p_account,p_deal,'organization',p_legal_name,'source_observation',jsonb_build_object('jurisdiction',p_jurisdiction,'domain',p_domain));
  INSERT INTO organization_party(deal_party_id,account_id,deal_id,legal_name,jurisdiction,source_supported_domain) VALUES(party_id,p_account,p_deal,p_legal_name,p_jurisdiction,p_domain);
  INSERT INTO buyer_candidate_proposal(id,account_id,deal_id,strategy_criteria,eligible_source_observations,rationale,fit_factors,restrictions,origin_code,created_by_actor_id) VALUES(proposal_id,p_account,p_deal,p_strategy,p_observations,p_rationale,p_fit,p_restrictions,p_origin,p_actor);
  INSERT INTO buyer_candidate(id,account_id,deal_id,organization_party_id,proposal_id,rationale,fit_factors,restrictions,interest_posture,capacity_posture,contactability_posture,conflict_posture,created_by_actor_id) VALUES(candidate_id,p_account,p_deal,party_id,proposal_id,p_rationale,p_fit,p_restrictions,p_interest,p_capacity,p_contactability,p_conflict,p_actor);
  INSERT INTO buyer_candidate_history(account_id,deal_id,candidate_id,version,change_code,change_reason,proposal_id,recorded_by_actor_id) VALUES(p_account,p_deal,candidate_id,1,'created','Initial evidence-backed candidate proposal',proposal_id,p_actor);
  INSERT INTO buyer_candidate_impact(account_id,deal_id,candidate_id,candidate_version,impact_code,rationale) VALUES(p_account,p_deal,candidate_id,1,'auction_control_workbook_review','New candidate requires Buyer Universe review before outreach preparation');
  INSERT INTO process.command_idempotency(account_id,deal_id,actor_id,command_code,key_hash,request_digest,result_id) VALUES(p_account,p_deal,p_actor,'buyer_candidate',p_key_hash,p_request_digest,candidate_id);
  PERFORM app.record_audit('buyer_candidate_created','completed','buyer_candidate',candidate_id::text,'evidence_backed_proposal',gen_random_uuid()::text);
  RETURN jsonb_build_object('id',candidate_id,'version',1,'status','candidate','proposal_id',proposal_id,'idempotent_replayed',false);
END $$;

CREATE OR REPLACE FUNCTION process.approve_buyer_candidate(p_account uuid,p_actor uuid,p_deal uuid,p_candidate uuid,p_key_hash text,p_request_digest text,p_purpose text,p_scope text,p_evidence uuid[],p_alternatives jsonb,p_contrary jsonb,p_rationale text,p_conditions jsonb,p_approved_scope jsonb,p_permitted_audience jsonb,p_invalidation jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=process,knowledge,app,pg_catalog AS $$
DECLARE c buyer_candidate%ROWTYPE; decision_id uuid:=gen_random_uuid(); approval_id uuid:=gen_random_uuid(); rel uuid; BEGIN
  PERFORM process.assert_buyer_scope(p_account,p_actor,p_deal); SELECT * INTO c FROM buyer_candidate WHERE id=p_candidate AND account_id=p_account AND deal_id=p_deal FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'buyer_candidate_scope_mismatch'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws(':',p_account,p_deal,p_actor,'buyer_approval',p_key_hash),0));
  IF EXISTS(SELECT 1 FROM process.command_idempotency WHERE account_id=p_account AND deal_id=p_deal AND actor_id=p_actor AND command_code='buyer_approval' AND key_hash=p_key_hash AND request_digest=p_request_digest) THEN RETURN jsonb_build_object('id',(SELECT result_id FROM process.command_idempotency WHERE account_id=p_account AND deal_id=p_deal AND actor_id=p_actor AND command_code='buyer_approval' AND key_hash=p_key_hash),'idempotent_replayed',true); END IF;
  IF EXISTS(SELECT 1 FROM process.command_idempotency WHERE account_id=p_account AND deal_id=p_deal AND actor_id=p_actor AND command_code='buyer_approval' AND key_hash=p_key_hash AND request_digest IS DISTINCT FROM p_request_digest) THEN RAISE EXCEPTION 'idempotency_key_reused'; END IF;
  IF c.status_code <> 'candidate' THEN RAISE EXCEPTION 'buyer_candidate_not_approvable'; END IF;
  IF coalesce(cardinality(p_evidence),0)<1 THEN RAISE EXCEPTION 'buyer_approval_evidence_required'; END IF;
  FOREACH rel IN ARRAY p_evidence LOOP IF NOT EXISTS(SELECT 1 FROM knowledge.evidence_relationship WHERE id=rel AND account_id=p_account AND deal_id=p_deal) THEN RAISE EXCEPTION 'buyer_decision_evidence_scope'; END IF; END LOOP;
  INSERT INTO knowledge.human_decision(id,account_id,deal_id,decision_type_code,controlled_object_id,controlled_object_version,question_text,selected_option_code,alternatives,contrary_evidence,rationale_text,scope,purpose_code,conditions,downstream_effect,decided_by_actor_id) VALUES(decision_id,p_account,p_deal,'buyer_approval',p_candidate::text,c.version::text,'Approve this exact Buyer Candidate for the stated controlled purpose?','approve_buyer',coalesce(p_alternatives,'[]'::jsonb),coalesce(p_contrary,'[]'::jsonb),p_rationale,p_scope,p_purpose,coalesce(p_conditions,'[]'::jsonb),jsonb_build_object('outreach_authorized',false,'disclosure_authorized',false,'data_room_authorized',false),p_actor);
  INSERT INTO process.buyer_approval(id,account_id,deal_id,buyer_candidate_id,human_decision_id,candidate_version,approved_scope,restrictions,permitted_wave_audience,invalidation_triggers) VALUES(approval_id,p_account,p_deal,p_candidate,decision_id,c.version,p_approved_scope,c.restrictions,p_permitted_audience,p_invalidation);
  FOREACH rel IN ARRAY p_evidence LOOP INSERT INTO knowledge.human_decision_evidence(account_id,deal_id,decision_id,evidence_relationship_id) VALUES(p_account,p_deal,decision_id,rel); END LOOP;
  INSERT INTO process.command_idempotency(account_id,deal_id,actor_id,command_code,key_hash,request_digest,result_id) VALUES(p_account,p_deal,p_actor,'buyer_approval',p_key_hash,p_request_digest,approval_id);
  PERFORM app.record_audit('buyer_approved','completed','buyer_approval',approval_id::text,'typed_human_decision',gen_random_uuid()::text);
  RETURN jsonb_build_object('id',approval_id,'buyer_candidate_id',p_candidate,'candidate_version',c.version,'human_decision_id',decision_id,'status','approved','external_actions_authorized',false,'idempotent_replayed',false);
END $$;

REVOKE ALL ON FUNCTION process.assert_buyer_scope(uuid,uuid,uuid),process.get_buyer_candidate_projection(uuid,uuid,uuid,uuid),process.create_buyer_candidate(uuid,uuid,uuid,text,text,text,text,text,jsonb,jsonb,text,jsonb,jsonb,text,text,text,text,text),process.approve_buyer_candidate(uuid,uuid,uuid,uuid,text,text,text,text,uuid[],jsonb,jsonb,text,jsonb,jsonb,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION process.get_buyer_candidate_projection(uuid,uuid,uuid,uuid),process.create_buyer_candidate(uuid,uuid,uuid,text,text,text,text,text,jsonb,jsonb,text,jsonb,jsonb,text,text,text,text,text),process.approve_buyer_candidate(uuid,uuid,uuid,uuid,text,text,text,text,uuid[],jsonb,jsonb,text,jsonb,jsonb,jsonb,jsonb) TO app_runtime;
