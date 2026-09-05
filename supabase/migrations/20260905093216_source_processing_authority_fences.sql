-- Grant lookup bootstraps only metadata belonging to the authenticated actor.
-- The exact grant token then installs Deal scope before any object can be read.
CREATE POLICY source_owner_grant_read ON identity.protected_object_stream_grant FOR SELECT TO app_source_owner USING(account_id=app.policy_account_id() AND actor_id=app.policy_actor_id());
CREATE POLICY source_owner_grant_write ON identity.protected_object_stream_grant FOR INSERT TO app_source_owner WITH CHECK(account_id=app.policy_account_id() AND actor_id=app.policy_actor_id() AND deal_id=app.policy_deal_id());
GRANT EXECUTE ON FUNCTION app.set_deal_scope(uuid) TO app_source_owner;
DO $$
DECLARE definition text; changed text;
BEGIN
 definition:=pg_get_functiondef('source.resolve_object_grant(uuid,uuid,text,uuid,text)'::regprocedure);
 changed:=replace(definition,E'BEGIN\n  RETURN QUERY', E'DECLARE grant_deal uuid;\nBEGIN\n SELECT g.deal_id INTO grant_deal FROM identity.protected_object_stream_grant g WHERE g.account_id=p_account_id AND g.actor_id=p_actor_id AND g.session_token_hash=p_session_token_hash AND g.protected_object_id=p_object_id AND g.token_hash=p_token_hash AND g.revoked_at IS NULL AND g.expires_at>clock_timestamp();\n IF grant_deal IS NULL OR NOT app.set_deal_scope(grant_deal) THEN RETURN; END IF;\n RETURN QUERY');
 IF changed=definition THEN RAISE EXCEPTION 'source_grant_bootstrap_mismatch'; END IF;
 EXECUTE changed;
END $$;

GRANT SELECT ON source.source_rights_current_selection,source.source_rights_posture_assessment,source.source_condition_current_selection,source.source_condition_assessment TO app_source_processing_owner;
DO $$ DECLARE relation text; BEGIN
 FOREACH relation IN ARRAY ARRAY['source_rights_current_selection','source_rights_posture_assessment','source_condition_current_selection','source_condition_assessment'] LOOP
 EXECUTE format('CREATE POLICY processing_exact_source ON source.%I FOR SELECT TO app_source_processing_owner USING(account_id=source.processing_identity(''account'') AND deal_id=source.processing_identity(''deal'') AND source_record_id=source.processing_identity(''record''))',relation);
 END LOOP;
END $$;
-- The same lock serializes assessment changes with the final parsed append,
-- including a first assessment where no selection row exists yet.
DO $$
DECLARE item record; definition text; changed text;
BEGIN
 FOR item IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='source' AND p.proname IN('create_source_rights_assessment','create_source_condition_assessment') LOOP
  definition:=pg_get_functiondef(item.oid);
  changed:=replace(definition,E'BEGIN\n',E'BEGIN\n PERFORM pg_advisory_xact_lock(hashtextextended(''source-processing:''||p_source_record_id::text,0));\n');
  IF changed=definition THEN RAISE EXCEPTION 'source_assessment_lock_mismatch'; END IF;
  EXECUTE changed;
 END LOOP;
 definition:=pg_get_functiondef('source.processing_fence(uuid,text)'::regprocedure);
 changed:=replace(definition,'-- Hold the same posture rows',E'PERFORM pg_advisory_xact_lock(hashtextextended(''source-processing:''||task.source_record_id::text,0));\n -- Hold the same posture rows');
 changed:=replace(changed,'IF NOT EXISTS(SELECT 1 FROM source.source_record r', 'IF EXISTS(SELECT 1 FROM source.source_rights_current_selection cs JOIN source.source_rights_posture_assessment a ON a.id=cs.assessment_id WHERE cs.source_record_id=task.source_record_id AND a.rights_code IN (''blocked'',''withdrawn'')) OR EXISTS(SELECT 1 FROM source.source_condition_current_selection cs JOIN source.source_condition_assessment a ON a.id=cs.assessment_id WHERE cs.source_record_id=task.source_record_id AND a.disposition_code=''withdrawn'') OR NOT EXISTS(SELECT 1 FROM source.source_record r');
 IF changed=definition THEN RAISE EXCEPTION 'source_processing_fence_mismatch'; END IF;
 EXECUTE changed;
END $$;
