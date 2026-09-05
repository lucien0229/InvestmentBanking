-- Reference worker commands may never reinterpret a workbook Job.
CREATE OR REPLACE FUNCTION jobs.cancel_reference_job(p_job_id uuid, p_expected_row_version bigint, p_reason text)
RETURNS TABLE(status text, job_state text, row_version bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = jobs, commerce, app, pg_catalog
AS $$
DECLARE
  current_account uuid := app.policy_account_id();
  current_deal uuid := app.policy_deal_id();
  job_row jobs.job%ROWTYPE;
  reservation_row commerce.usage_reservation%ROWTYPE;
BEGIN
  SELECT * INTO job_row FROM jobs.job WHERE id = p_job_id AND account_id = current_account AND deal_id = current_deal AND command_type='reference_workspace_build' FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'not_found', NULL::text, NULL::bigint; RETURN; END IF;
  IF job_row.row_version <> p_expected_row_version THEN RETURN QUERY SELECT 'version_conflict', job_row.state, job_row.row_version; RETURN; END IF;
  IF job_row.state IN ('completed', 'failed_terminal', 'canceled') THEN RETURN QUERY SELECT 'not_cancelable', job_row.state, job_row.row_version; RETURN; END IF;
  UPDATE commerce.usage_reservation AS ur SET status = 'released', released_at = clock_timestamp() WHERE ur.job_id = p_job_id AND ur.status = 'reserved' RETURNING ur.* INTO reservation_row;
  IF reservation_row.id IS NOT NULL THEN
    INSERT INTO commerce.usage_ledger_entry(account_id, deal_id, reservation_id, entry_type, quantity) VALUES (reservation_row.account_id, reservation_row.deal_id, reservation_row.id, 'release', reservation_row.quantity) ON CONFLICT DO NOTHING;
  END IF;
  UPDATE jobs.job AS j SET state = 'canceled', allowance_posture = 'released', cancel_requested_at = clock_timestamp(), terminal_at = clock_timestamp(), progress = jsonb_build_object('message_code', 'canceled'), problem = NULL, row_version = j.row_version + 1, updated_at = clock_timestamp() WHERE j.id = p_job_id RETURNING j.row_version INTO row_version;
  UPDATE jobs.job_lease SET released_at = clock_timestamp(), outcome = 'canceled' WHERE step_id IN (SELECT id FROM jobs.job_step WHERE job_id = p_job_id) AND released_at IS NULL;
  UPDATE jobs.job_scope SET revoked_at = clock_timestamp() WHERE job_id = p_job_id AND revoked_at IS NULL;
  PERFORM jobs.append_job_event(p_job_id, 'job_terminal', 'canceled', NULL, 'canceled', 'return_to_job', jsonb_build_object('message_code', 'canceled'));
  RETURN QUERY SELECT 'canceled', 'canceled', row_version;
END
$$;

CREATE OR REPLACE FUNCTION jobs.retry_reference_job(p_job_id uuid, p_expected_row_version bigint)
RETURNS TABLE(status text, job_state text, row_version bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = jobs, app, pg_catalog
AS $$
DECLARE
  current_account uuid := app.policy_account_id();
  current_deal uuid := app.policy_deal_id();
  job_row jobs.job%ROWTYPE;
BEGIN
  SELECT * INTO job_row FROM jobs.job WHERE id = p_job_id AND account_id = current_account AND deal_id = current_deal AND command_type='reference_workspace_build' FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'not_found', NULL::text, NULL::bigint; RETURN; END IF;
  IF job_row.row_version <> p_expected_row_version THEN RETURN QUERY SELECT 'version_conflict', job_row.state, job_row.row_version; RETURN; END IF;
  IF job_row.state <> 'failed_retryable' THEN RETURN QUERY SELECT 'not_retryable', job_row.state, job_row.row_version; RETURN; END IF;
  UPDATE jobs.job_step SET state = 'queued', updated_at = clock_timestamp() WHERE job_id = p_job_id AND state = 'failed_retryable';
  UPDATE jobs.job AS j SET state = 'queued', problem = NULL, terminal_at = NULL, progress = jsonb_build_object('message_code', 'queued'), row_version = j.row_version + 1, updated_at = clock_timestamp() WHERE j.id = p_job_id RETURNING j.row_version INTO row_version;
  PERFORM jobs.append_job_event(p_job_id, 'job_state_changed', 'queued', NULL, 'retry_accepted', 'observe_job', jsonb_build_object('message_code', 'queued'));
  RETURN QUERY SELECT 'retry_accepted', 'queued', row_version;
END
$$;

CREATE OR REPLACE FUNCTION deliverable.cancel_workbook_job(p_job uuid,p_version bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE row jobs.job%ROWTYPE; BEGIN
 SELECT * INTO row FROM jobs.job WHERE id=p_job FOR UPDATE;IF NOT FOUND THEN RETURN NULL;END IF;
 IF row.row_version<>p_version THEN RETURN jsonb_build_object('status','version_conflict','job_state',row.state,'row_version',row.row_version);END IF;
 IF row.state NOT IN ('queued','running') THEN RETURN jsonb_build_object('status','not_cancelable','job_state',row.state,'row_version',row.row_version);END IF;
 UPDATE jobs.job SET state='canceled',allowance_posture='released',terminal_at=now(),row_version=row_version+1 WHERE id=p_job;
 UPDATE deliverable.workbook_job SET finished=true WHERE job_id=p_job;
 RETURN jsonb_build_object('status','canceled','job_state','canceled','row_version',p_version+1);
END $$;
