-- Deployment-only controls must keep working without giving the runtime owner
-- direct UPDATE access to global task policy.
CREATE ROLE app_ai_control_owner NOLOGIN NOBYPASSRLS;
GRANT app_ai_control_owner TO postgres;
GRANT USAGE,CREATE ON SCHEMA ai TO app_ai_control_owner;
GRANT SELECT ON ai.task_enablement,ai.task_definition,ai.prompt_package TO app_ai_control_owner;
GRANT UPDATE(status_code,suspended_at,reason,enabled_at,prompt_package_id) ON ai.task_enablement TO app_ai_control_owner;
CREATE POLICY ai_control_read ON ai.task_definition FOR SELECT TO app_ai_control_owner USING(true);
CREATE POLICY ai_control_read ON ai.prompt_package FOR SELECT TO app_ai_control_owner USING(true);
CREATE POLICY ai_control_read ON ai.task_enablement FOR SELECT TO app_ai_control_owner USING(true);
CREATE POLICY ai_control_update ON ai.task_enablement FOR UPDATE TO app_ai_control_owner USING(true) WITH CHECK(true);
ALTER FUNCTION ai.suspend_task(uuid,text) OWNER TO app_ai_control_owner;
ALTER FUNCTION ai.enable_task(uuid,text) OWNER TO app_ai_control_owner;
ALTER FUNCTION ai.rollback_task(uuid,uuid,text) OWNER TO app_ai_control_owner;
REVOKE CREATE ON SCHEMA ai FROM app_ai_control_owner;
REVOKE ALL ON FUNCTION ai.suspend_task(uuid,text),ai.enable_task(uuid,text),ai.rollback_task(uuid,uuid,text) FROM PUBLIC,app_runtime,job_worker,job_dispatcher;
GRANT EXECUTE ON FUNCTION ai.suspend_task(uuid,text),ai.enable_task(uuid,text),ai.rollback_task(uuid,uuid,text) TO app_ai_owner;
