-- Historical bytes stay immutable; current readiness rechecks the pinned Decisions and Fact selection.
CREATE OR REPLACE FUNCTION deliverable.output_scope_current(p_revision uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE row deliverable.deliverable_revision%ROWTYPE; basis jsonb; BEGIN
 SELECT * INTO row FROM deliverable.deliverable_revision WHERE id=p_revision;IF NOT FOUND OR row.work_objective_id IS NULL THEN RETURN false;END IF;
 PERFORM source.get_packet_worker_input(row.account_id,row.deal_id,row.packet_version_id,row.work_objective_id,'native_artifact');
 PERFORM source.get_packet_worker_input(row.account_id,row.deal_id,row.packet_version_id,row.work_objective_id,'reader_copy');
 SELECT jsonb_agg(jsonb_build_object('calculation_run_id',c->>'run_id','model_version_id',c->>'model_version_id','scenario_version_id',c->>'scenario_version_id')) INTO basis FROM jsonb_array_elements(row.build_input->'calculations') c;
 PERFORM deliverable.build_input(row.deliverable_id,row.id,basis,row.build_input->'limitations');
 RETURN true;
 EXCEPTION WHEN insufficient_privilege OR raise_exception OR check_violation THEN RETURN false;
END $$;
