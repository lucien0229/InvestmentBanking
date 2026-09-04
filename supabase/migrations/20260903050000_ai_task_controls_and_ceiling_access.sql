-- The API control plane is allowed to ask the already-governed Source Packet
-- seam for the exact Work Objective Output Ceiling. This is not a worker
-- credential: the API still supplies the Deal/account context and the seam
-- performs the packet/objective/rights checks.
GRANT EXECUTE ON FUNCTION source.get_packet_worker_input(uuid,uuid,uuid,uuid,text) TO app_runtime;

-- Enablement is material-classification scoped. Keep both synthetic and real
-- public/internal paths explicit; Confidential and Restricted remain absent
-- until a separately evidenced HelloX profile is enabled.
INSERT INTO ai.task_enablement(task_definition,task_definition_version,prompt_package_id,provider_profile_id,environment_code,provenance_class,confidentiality_class,status_code,reason,enabled_at)
SELECT t.task_definition,t.task_definition_version,p.id,'hellox-source-proposals-v1','local',provenance_class,confidentiality_class,'enabled','Explicit local HelloX task enablement; proposal-only source loop',clock_timestamp()
FROM ai.task_definition t
JOIN ai.prompt_package p ON p.task_definition=t.task_definition AND p.package_version='1.0.0'
CROSS JOIN unnest(ARRAY['synthetic','real']::text[]) AS provenance_class
CROSS JOIN unnest(ARRAY['public','internal']::text[]) AS confidentiality_class
WHERE NOT EXISTS (
  SELECT 1 FROM ai.task_enablement e
  WHERE e.task_definition=t.task_definition
    AND e.task_definition_version=t.task_definition_version
    AND e.provider_profile_id='hellox-source-proposals-v1'
    AND e.environment_code='local'
    AND e.provenance_class=provenance_class
    AND e.confidentiality_class=confidentiality_class
);

CREATE OR REPLACE FUNCTION ai.suspend_task(p_enablement_id uuid, p_reason text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ai, pg_catalog AS $$
DECLARE changed integer;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN RAISE EXCEPTION 'ai_task_control_reason_required' USING ERRCODE='22023'; END IF;
  UPDATE ai.task_enablement
     SET status_code='suspended', suspended_at=clock_timestamp(), reason=p_reason
   WHERE id=p_enablement_id AND status_code='enabled';
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed = 1;
END $$;

CREATE OR REPLACE FUNCTION ai.enable_task(p_enablement_id uuid, p_reason text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ai, pg_catalog AS $$
DECLARE changed integer;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN RAISE EXCEPTION 'ai_task_control_reason_required' USING ERRCODE='22023'; END IF;
  UPDATE ai.task_enablement e
     SET status_code='enabled', enabled_at=coalesce(enabled_at,clock_timestamp()), suspended_at=NULL, reason=p_reason
   WHERE e.id=p_enablement_id
     AND e.status_code IN ('suspended','retired')
     AND EXISTS (SELECT 1 FROM ai.task_definition t WHERE t.task_definition=e.task_definition AND t.task_definition_version=e.task_definition_version AND t.lifecycle_status='enabled')
     AND EXISTS (SELECT 1 FROM ai.prompt_package p WHERE p.id=e.prompt_package_id AND p.lifecycle_status='enabled');
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed = 1;
END $$;

CREATE OR REPLACE FUNCTION ai.rollback_task(p_enablement_id uuid, p_prompt_package_id uuid, p_reason text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ai, pg_catalog AS $$
DECLARE changed integer;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN RAISE EXCEPTION 'ai_task_control_reason_required' USING ERRCODE='22023'; END IF;
  UPDATE ai.task_enablement e
     SET prompt_package_id=p_prompt_package_id, status_code='enabled', enabled_at=clock_timestamp(), suspended_at=NULL, reason=p_reason
   WHERE e.id=p_enablement_id
     AND EXISTS (
       SELECT 1 FROM ai.prompt_package p
       WHERE p.id=p_prompt_package_id
         AND p.task_definition=e.task_definition
         AND p.lifecycle_status='enabled'
     );
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed = 1;
END $$;

REVOKE ALL ON FUNCTION ai.suspend_task(uuid,text), ai.enable_task(uuid,text), ai.rollback_task(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ai.suspend_task(uuid,text), ai.enable_task(uuid,text), ai.rollback_task(uuid,uuid,text) TO app_ai_owner;
GRANT CREATE ON SCHEMA ai TO app_ai_owner;
ALTER FUNCTION ai.suspend_task(uuid,text) OWNER TO app_ai_owner;
ALTER FUNCTION ai.enable_task(uuid,text) OWNER TO app_ai_owner;
ALTER FUNCTION ai.rollback_task(uuid,uuid,text) OWNER TO app_ai_owner;
REVOKE CREATE ON SCHEMA ai FROM app_ai_owner;
