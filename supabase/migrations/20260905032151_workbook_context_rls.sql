-- The non-login command owner can establish only the context already bound to
-- its current backend's validated workbook lease. Workers cannot write this table.
CREATE POLICY workbook_leased_context ON app.request_context TO app_deliverable_owner
 USING (backend_pid=pg_backend_pid() AND EXISTS (
  SELECT 1 FROM deliverable.worker_context c WHERE c.backend_pid=pg_backend_pid()
   AND c.account_id=request_context.account_id AND c.deal_id=request_context.deal_id
 ))
 WITH CHECK (backend_pid=pg_backend_pid() AND EXISTS (
  SELECT 1 FROM deliverable.worker_context c JOIN jobs.job j ON j.id=c.job_id
   WHERE c.backend_pid=pg_backend_pid() AND c.account_id=request_context.account_id
    AND c.deal_id=request_context.deal_id AND j.actor_id=request_context.actor_id
 ));
