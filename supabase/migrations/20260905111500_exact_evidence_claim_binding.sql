-- Preserve the existing Source eligibility and immutable Evidence implementation,
-- but bind a UI-selected Claim by identity, never by latest matching wording.
DO $$
DECLARE definition text; changed text;
BEGIN
 definition:=pg_get_functiondef('knowledge.accept_evidence(uuid,uuid,uuid,text,text,uuid,uuid,jsonb,text,text,text,text,text)'::regprocedure);
 changed:=replace(definition,'FUNCTION knowledge.accept_evidence(', 'FUNCTION knowledge.accept_evidence_for_claim(');
 changed:=replace(changed,'p_limitation text)', 'p_limitation text, p_claim_id uuid)');
 changed:=replace(changed,'PERFORM knowledge.assert_scope(p_account_id,p_actor_id,p_deal_id);',
 $code$PERFORM knowledge.assert_scope(p_account_id,p_actor_id,p_deal_id);
 IF p_claim_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM knowledge.claim c WHERE c.id=p_claim_id AND c.account_id=p_account_id AND c.deal_id=p_deal_id AND c.proposition=p_proposition) THEN
  RAISE EXCEPTION 'claim_scope_mismatch' USING ERRCODE='42501';
 END IF;$code$);
 changed:=replace(changed,'c.proposition=p_proposition ORDER BY c.created_at DESC LIMIT 1', 'c.proposition=p_proposition AND (p_claim_id IS NULL OR c.id=p_claim_id) ORDER BY c.created_at DESC LIMIT 1');
 IF changed=definition OR position('p_claim_id uuid' in changed)=0 OR position('c.id=p_claim_id) ORDER' in changed)=0 THEN RAISE EXCEPTION 'exact_claim_binding_migration_mismatch'; END IF;
 EXECUTE changed;
END $$;
GRANT CREATE ON SCHEMA knowledge TO app_knowledge_owner;
ALTER FUNCTION knowledge.accept_evidence_for_claim(uuid,uuid,uuid,text,text,uuid,uuid,jsonb,text,text,text,text,text,uuid) OWNER TO app_knowledge_owner;
REVOKE CREATE ON SCHEMA knowledge FROM app_knowledge_owner;
REVOKE ALL ON FUNCTION knowledge.accept_evidence_for_claim(uuid,uuid,uuid,text,text,uuid,uuid,jsonb,text,text,text,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION knowledge.accept_evidence_for_claim(uuid,uuid,uuid,text,text,uuid,uuid,jsonb,text,text,text,text,text,uuid) TO app_runtime;
