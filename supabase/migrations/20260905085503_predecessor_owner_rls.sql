-- Definer owners retain only their existing table privileges and receive scoped
-- policies before BYPASSRLS is removed. Public configuration is read-only.
DO $$
DECLARE owner_name text; relation record; predicate text; has_account boolean; has_deal boolean;
BEGIN
 FOREACH owner_name IN ARRAY ARRAY['app_ai_owner','app_source_owner','app_knowledge_owner','app_analysis_owner'] LOOP
  FOR relation IN SELECT c.oid,n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN('r','p') AND n.nspname IN('app','ai','source','knowledge','analysis','jobs','object_store') AND has_table_privilege(owner_name,c.oid,'SELECT,INSERT,UPDATE,DELETE') LOOP
   SELECT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=relation.oid AND attname='account_id' AND NOT attisdropped),EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=relation.oid AND attname='deal_id' AND NOT attisdropped) INTO has_account,has_deal;
   IF relation.nspname='ai' AND relation.relname IN('task_definition','task_enablement','prompt_package','provider_capability_profile') THEN
    EXECUTE format('REVOKE INSERT,UPDATE,DELETE ON %I.%I FROM %I',relation.nspname,relation.relname,owner_name);
    EXECUTE format('CREATE POLICY predecessor_owner_config_%s ON %I.%I FOR SELECT TO %I USING(true)',owner_name,relation.nspname,relation.relname,owner_name);
    CONTINUE;
   ELSIF relation.nspname='app' AND relation.relname='account' THEN predicate:='id=app.policy_account_id()';
   ELSIF relation.nspname='app' AND relation.relname='actor' THEN predicate:='id=app.policy_actor_id()';
   ELSIF relation.nspname='app' AND relation.relname='deal' THEN predicate:='account_id=app.policy_account_id() AND id=app.policy_deal_id()';
   ELSIF has_account THEN
    predicate:='account_id=app.policy_account_id()';
    IF has_deal AND NOT (relation.nspname='source' AND relation.relname IN('upload_session','quarantined_upload','intake_job')) AND NOT (relation.nspname='app' AND relation.relname='audit_event') THEN predicate:=predicate||' AND deal_id=app.policy_deal_id()'; END IF;
   ELSE RAISE EXCEPTION 'unclassified_owner_relation: %.% %',relation.nspname,relation.relname,owner_name;
   END IF;
   EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',relation.nspname,relation.relname);
   EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY',relation.nspname,relation.relname);
   EXECUTE format('CREATE POLICY predecessor_owner_scope_%s ON %I.%I TO %I USING(%s) WITH CHECK(%s)',owner_name,relation.nspname,relation.relname,owner_name,predicate,predicate);
  END LOOP;
  EXECUTE format('ALTER ROLE %I NOBYPASSRLS',owner_name);
 END LOOP;
END $$;

-- Stripe ingestion is credential-verified by the API. Reconciliation uses a
-- private exact-order context because a webhook has no Banker request context.
CREATE TABLE app.commerce_event_context(backend_pid integer PRIMARY KEY,checkout_order_id uuid NOT NULL);
REVOKE ALL ON app.commerce_event_context FROM PUBLIC,app_runtime,job_worker,job_dispatcher;
GRANT ALL ON app.commerce_event_context TO app_commerce_owner;
ALTER TABLE app.commerce_event_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.commerce_event_context FORCE ROW LEVEL SECURITY;
CREATE POLICY commerce_private_context ON app.commerce_event_context TO app_commerce_owner USING(true) WITH CHECK(true);
GRANT CREATE ON SCHEMA app TO app_commerce_owner;
CREATE FUNCTION app.commerce_event_order_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=app,pg_catalog AS $$ SELECT checkout_order_id FROM app.commerce_event_context WHERE backend_pid=pg_backend_pid() $$;
ALTER FUNCTION app.commerce_event_order_id() OWNER TO app_commerce_owner;
REVOKE ALL ON FUNCTION app.commerce_event_order_id() FROM PUBLIC;
CREATE POLICY commerce_order_context ON app.checkout_order TO app_commerce_owner USING(account_id=app.policy_account_id() OR id=app.commerce_event_order_id()) WITH CHECK(account_id=app.policy_account_id() OR id=app.commerce_event_order_id());
CREATE FUNCTION app.commerce_event_identity(p_kind text) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=app,pg_catalog AS $$ SELECT CASE p_kind WHEN 'account' THEN account_id WHEN 'actor' THEN actor_id END FROM app.checkout_order WHERE id=app.commerce_event_order_id() $$;
ALTER FUNCTION app.commerce_event_identity(text) OWNER TO app_commerce_owner;
REVOKE ALL ON FUNCTION app.commerce_event_identity(text) FROM PUBLIC;
DO $$
DECLARE relation record; predicate text;
BEGIN
 FOR relation IN SELECT c.oid,n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN('r','p') AND n.nspname='app' AND c.relname NOT IN('checkout_order','commerce_event_context') AND has_table_privilege('app_commerce_owner',c.oid,'SELECT,INSERT,UPDATE,DELETE') LOOP
  IF relation.relname IN('provider_event','provider_event_outbox','qualification_assessment') THEN predicate:='true';
  ELSIF relation.relname='account' THEN predicate:='id=coalesce(app.policy_account_id(),app.commerce_event_identity(''account''))';
  ELSIF relation.relname='actor' THEN predicate:='id=coalesce(app.policy_actor_id(),app.commerce_event_identity(''actor''))';
  ELSIF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=relation.oid AND attname='account_id' AND NOT attisdropped) THEN predicate:='account_id=coalesce(app.policy_account_id(),app.commerce_event_identity(''account''))';
  ELSE RAISE EXCEPTION 'unclassified_commerce_relation: %',relation.relname;
  END IF;
  EXECUTE format('CREATE POLICY predecessor_commerce_scope ON app.%I TO app_commerce_owner USING(%s) WITH CHECK(%s)',relation.relname,predicate,predicate);
 END LOOP;
END $$;
ALTER FUNCTION app.reconcile_provider_event(text) RENAME TO reconcile_provider_event_scoped;
REVOKE ALL ON FUNCTION app.reconcile_provider_event_scoped(text) FROM PUBLIC,app_runtime,job_worker,job_dispatcher;
CREATE FUNCTION app.reconcile_provider_event(p_event_id text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=app,pg_catalog AS $$
DECLARE order_text text; result text;
BEGIN
 DELETE FROM app.commerce_event_context WHERE backend_pid=pg_backend_pid();
 SELECT canonical_payload #>> '{data,object,metadata,checkout_order_id}' INTO order_text FROM app.provider_event WHERE provider='stripe' AND provider_event_id=p_event_id;
 IF order_text ~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' THEN INSERT INTO app.commerce_event_context VALUES(pg_backend_pid(),order_text::uuid); END IF;
 result:=app.reconcile_provider_event_scoped(p_event_id);
 DELETE FROM app.commerce_event_context WHERE backend_pid=pg_backend_pid();
 RETURN result;
END $$;
ALTER FUNCTION app.reconcile_provider_event(text) OWNER TO app_commerce_owner;
REVOKE ALL ON FUNCTION app.reconcile_provider_event(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.reconcile_provider_event(text) TO app_runtime;
ALTER ROLE app_commerce_owner NOBYPASSRLS;
REVOKE CREATE ON SCHEMA app FROM app_commerce_owner;

-- Integrity checks must run in the inserting owner's scoped context, including
-- the independent processing owner whose context is deliberately not a Banker.
ALTER FUNCTION source.validate_fragment_scope() SECURITY INVOKER;
