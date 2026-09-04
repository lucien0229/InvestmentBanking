-- The AI definer validates exact packet membership and source locators while
-- remaining unable to log in; only the typed functions are exposed to runtime.
GRANT SELECT ON source.source_packet, source.source_packet_version, source.source_packet_member, source.source_fragment, source.source_record, source.source_representation, source.source_condition_current_selection TO app_ai_owner;
GRANT SELECT ON app.work_objective, app.deal, app.deal_workspace TO app_ai_owner;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ai TO app_ai_owner;
GRANT EXECUTE ON FUNCTION ai.start_run(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,uuid,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean), ai.attach_run_fragments(uuid,uuid,uuid,uuid,jsonb), ai.complete_run(uuid,uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb,bytea,bytea,text,text,jsonb,integer,integer), ai.get_run_projection(uuid,uuid,uuid,uuid), ai.record_retry(uuid,uuid,uuid,uuid,text,text) TO app_runtime;
