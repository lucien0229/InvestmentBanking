GRANT USAGE ON SCHEMA extensions TO app_export_owner;
GRANT CREATE ON SCHEMA external_use TO app_export_owner;
ALTER FUNCTION external_use.guide_projection() SECURITY DEFINER;
CREATE FUNCTION external_use.inspection_projection(p_revision uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT b||jsonb_build_object('inspection_digest',encode(extensions.digest(b::text,'sha256'),'hex')) FROM (SELECT external_use.loop_basis(p_revision) AS b) s
$$;
ALTER FUNCTION external_use.inspection_projection(uuid) OWNER TO app_export_owner;
REVOKE ALL ON FUNCTION external_use.inspection_projection(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION external_use.inspection_projection(uuid) TO app_runtime;
REVOKE CREATE ON SCHEMA external_use FROM app_export_owner;
