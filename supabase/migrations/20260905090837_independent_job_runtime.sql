-- Fixed queue names and typed, bounded operations. Runtime principals receive
-- no PGMQ or tenant-table access; every delivery must claim the existing fence.
CREATE EXTENSION IF NOT EXISTS pgmq VERSION '1.5.1';
SELECT pgmq.create('reference_jobs');
REVOKE ALL ON SCHEMA pgmq FROM PUBLIC,app_runtime,job_worker,job_dispatcher;
REVOKE ALL ON ALL TABLES IN SCHEMA pgmq FROM PUBLIC,app_runtime,job_worker,job_dispatcher;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pgmq FROM PUBLIC,app_runtime,job_worker,job_dispatcher;
CREATE FUNCTION jobs.dispatch_pending_reference_jobs() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE item record; total integer:=0;
BEGIN
 FOR item IN SELECT j.id FROM jobs.job j WHERE j.command_type='reference_workspace_build' AND j.state='running' AND EXISTS(SELECT 1 FROM jobs.job_lease l JOIN jobs.job_step s ON s.id=l.step_id WHERE s.job_id=j.id AND l.released_at IS NULL AND l.expires_at<=clock_timestamp()) LIMIT 50 LOOP
  PERFORM jobs.recover_expired_reference_job(item.id);
 END LOOP;
 FOR item IN SELECT o.id,o.job_id FROM jobs.transactional_outbox o JOIN jobs.job j ON j.id=o.job_id WHERE o.status='pending' AND o.event_type='job.step.dispatch' AND j.command_type='reference_workspace_build' AND j.state='queued' ORDER BY o.created_at LIMIT 50 FOR UPDATE OF o SKIP LOCKED LOOP
  PERFORM pgmq.send('reference_jobs',jsonb_build_object('job_id',item.job_id,'contract_version','1.0.0'));
  UPDATE jobs.transactional_outbox SET claimed_at=clock_timestamp(),published_at=clock_timestamp(),status='published',attempts=attempts+1 WHERE id=item.id;
  total:=total+1;
 END LOOP;
 RETURN total;
END $$;
CREATE FUNCTION jobs.read_reference_delivery() RETURNS TABLE(message_id bigint,job_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE message record; target uuid;
BEGIN
 FOR message IN SELECT * FROM pgmq.read('reference_jobs',90,1) LOOP
  target:=(message.message->>'job_id')::uuid;
  IF EXISTS(SELECT 1 FROM jobs.job j WHERE j.id=target AND j.command_type='reference_workspace_build' AND j.state IN('queued','running')) THEN RETURN QUERY SELECT message.msg_id,target;
  ELSE PERFORM pgmq.archive('reference_jobs',message.msg_id); END IF;
 END LOOP;
END $$;
CREATE FUNCTION jobs.finish_reference_delivery(p_message_id bigint,p_job_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pgmq.q_reference_jobs q WHERE q.msg_id=p_message_id AND q.message->>'job_id'=p_job_id::text) THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM jobs.job j WHERE j.id=p_job_id AND j.command_type='reference_workspace_build' AND j.state NOT IN('queued','running')) THEN RETURN false; END IF;
 RETURN pgmq.archive('reference_jobs',p_message_id);
END $$;
REVOKE ALL ON FUNCTION jobs.dispatch_pending_reference_jobs(),jobs.read_reference_delivery(),jobs.finish_reference_delivery(bigint,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION jobs.dispatch_pending_reference_jobs() TO job_dispatcher;
GRANT EXECUTE ON FUNCTION jobs.read_reference_delivery(),jobs.finish_reference_delivery(bigint,uuid) TO job_worker;

-- The reference worker cannot claim other workflow families. Heartbeats renew
-- both the lease and its exact scope. A user retry republishes the durable outbox.
DO $$
DECLARE definition text; changed text;
BEGIN
 definition:=pg_get_functiondef('jobs.claim_reference_step(uuid,text,text,text)'::regprocedure);
 changed:=replace(definition,'IF NOT FOUND OR job_row.state IN', 'IF NOT FOUND OR job_row.command_type<>''reference_workspace_build'' OR job_row.state=''failed_retryable'' OR job_row.state IN');
 IF changed=definition THEN RAISE EXCEPTION 'reference_claim_migration_mismatch'; END IF;
 EXECUTE changed;
 definition:=pg_get_functiondef('jobs.heartbeat_reference_step(uuid,text)'::regprocedure);
 changed:=replace(definition,'UPDATE jobs.job SET worker_heartbeat_at', 'UPDATE jobs.job_scope SET expires_at=clock_timestamp()+interval ''90 seconds'' WHERE id=scope_row.id AND revoked_at IS NULL; UPDATE jobs.job SET worker_heartbeat_at');
 IF changed=definition THEN RAISE EXCEPTION 'reference_heartbeat_migration_mismatch'; END IF;
 EXECUTE changed;
 definition:=pg_get_functiondef('jobs.retry_reference_job(uuid,bigint)'::regprocedure);
 changed:=replace(definition,'PERFORM jobs.append_job_event(p_job_id', 'UPDATE jobs.transactional_outbox SET status=''pending'',published_at=NULL,claimed_at=NULL WHERE job_id=p_job_id AND event_type=''job.step.dispatch''; PERFORM jobs.append_job_event(p_job_id');
 IF changed=definition THEN RAISE EXCEPTION 'reference_retry_migration_mismatch'; END IF;
 EXECUTE changed;
END $$;

-- Webhook acknowledgements are backed by a persisted outbox. This bounded
-- dispatcher also recovers events whose synchronous reconciliation failed.
CREATE FUNCTION app.dispatch_pending_provider_events() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=app,pg_catalog AS $$
DECLARE item record; total integer:=0;
BEGIN
 FOR item IN SELECT o.provider_event_id FROM app.provider_event_outbox o WHERE o.dispatched_at IS NULL ORDER BY o.created_at LIMIT 20 FOR UPDATE OF o SKIP LOCKED LOOP
  PERFORM app.dispatch_provider_event_outbox(item.provider_event_id);
  total:=total+1;
 END LOOP;
 RETURN total;
END $$;
REVOKE ALL ON FUNCTION app.dispatch_pending_provider_events() FROM PUBLIC;
GRANT USAGE ON SCHEMA app TO job_dispatcher;
GRANT EXECUTE ON FUNCTION app.dispatch_pending_provider_events() TO job_dispatcher;
