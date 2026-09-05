-- Provider I/O runs outside database transactions. Terminal Jobs close any
-- committed in-flight proposal Run without allowing late completion authority.
GRANT UPDATE(status_code,outcome_class,completed_at) ON ai.run TO app_deliverable_owner;
CREATE POLICY workbook_interrupted_run ON ai.run FOR UPDATE TO app_deliverable_owner
 USING(account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal())
 WITH CHECK(account_id=deliverable.scope_account() AND deal_id=deliverable.scope_deal());

CREATE OR REPLACE FUNCTION deliverable.finish_worker_scope() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE job jobs.job%ROWTYPE; scope jobs.job_scope%ROWTYPE;
BEGIN
 IF NEW.finished AND NOT OLD.finished AND NEW.active_scope_id IS NOT NULL THEN
  SELECT * INTO job FROM jobs.job WHERE id=NEW.job_id;
  SELECT * INTO scope FROM jobs.job_scope WHERE id=NEW.active_scope_id;
  UPDATE jobs.job_scope SET revoked_at=clock_timestamp() WHERE id=scope.id;
  UPDATE jobs.job_lease SET released_at=clock_timestamp(),outcome=CASE WHEN job.state='completed' THEN 'committed' WHEN job.state='canceled' THEN 'canceled' ELSE 'failed_terminal' END WHERE id=scope.lease_id;
  UPDATE jobs.job_attempt SET completed_at=clock_timestamp(),outcome=CASE WHEN job.state='completed' THEN 'succeeded' WHEN job.state='canceled' THEN 'canceled' ELSE 'failed_terminal' END WHERE id=scope.attempt_id;
  UPDATE jobs.job_step SET state=CASE WHEN job.state='completed' THEN 'completed' WHEN job.state='canceled' THEN 'canceled' ELSE 'failed_terminal' END,updated_at=clock_timestamp() WHERE id=scope.step_id;
  IF job.state<>'completed' THEN
   UPDATE ai.run SET status_code='failed',outcome_class='policy_block',completed_at=clock_timestamp()
    WHERE job_id=NEW.job_id AND status_code IN ('queued','running');
  END IF;
 END IF;
 RETURN NEW;
END $$;
