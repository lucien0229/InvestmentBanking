-- Account usage exposes only an aggregate; Deal-scoped runtime row access stays unchanged.
CREATE FUNCTION app.get_account_capacity_usage(p_account_id uuid, p_actor_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
BEGIN
  IF p_account_id IS NULL OR p_actor_id IS NULL
    OR p_account_id IS DISTINCT FROM app.policy_account_id()
    OR p_actor_id IS DISTINCT FROM app.policy_actor_id() THEN
    RAISE EXCEPTION 'account_scope_mismatch' USING ERRCODE = '42501';
  END IF;
  RETURN (SELECT count(*)::integer FROM app.active_deal_capacity_reservation
    WHERE account_id = p_account_id AND state_code <> 'released');
END;
$$;
GRANT CREATE ON SCHEMA app TO app_commerce_owner;
ALTER FUNCTION app.get_account_capacity_usage(uuid, uuid) OWNER TO app_commerce_owner;
REVOKE CREATE ON SCHEMA app FROM app_commerce_owner;
REVOKE ALL ON FUNCTION app.get_account_capacity_usage(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.get_account_capacity_usage(uuid, uuid) TO app_runtime;
