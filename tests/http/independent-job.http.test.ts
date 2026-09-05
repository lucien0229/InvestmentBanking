import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";
import { buildApi } from "../../apps/api/src/app.js";
import { createTestDatabase } from "../../apps/api/src/test-database.js";

// Real processes and the real 90-second lease. Opt in on the development host.
test("independent PGMQ workers survive process loss, preserve checkpoints and meet AC-071", { skip: !process.env.INDEPENDENT_JOB_REAL, timeout: 160_000 }, async (t) => {
  const database = await createTestDatabase(); t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local", referenceJobRuntime: { autoRun: false } }); t.after(() => api.close());
  const cookie = await database.seedAuthenticatedSession("banker-a@example.test");
  const dealId = "00000000-0000-4000-8000-000000000101";
  const start = () => api.inject({ method: "POST", url: `/api/v1/deals/${dealId}/reference-jobs`, headers: { cookie, "idempotency-key": crypto.randomUUID() }, payload: { purpose: "reference_workspace_build", inputs: { source_packet: "northstar-source-packet-v1", requested_scope: "synthetic_reference_fixture" } } });
  const job = await start(); assert.equal(job.statusCode, 202, job.body); const jobId = job.json().id as string;
  // A separate worker process commits the first checkpoint, claims the second,
  // then is killed while that lease is outstanding; no clock is edited.
  const child = spawn(process.execPath, ["--input-type=module", "-e", `
    import pg from 'pg'; import crypto from 'node:crypto';
    const db=new pg.Client({connectionString:process.env.JOB_WORKER_DATABASE_URL});await db.connect();
    const job=process.argv[1];const token=crypto.randomBytes(32).toString('hex');
    const first=(await db.query("SELECT * FROM jobs.claim_reference_step($1,'reference_worker','reference-worker-credential-v1',$2)",[job,token])).rows[0];
    await db.query("SELECT * FROM jobs.commit_reference_step($1,$2,$3,$4,'succeeded')",[first.scope_id,token,job+':accepted_inputs:accepted',crypto.createHash('sha256').update('accepted:'+job+':accepted_inputs').digest('hex')]);
    const next=(await db.query("SELECT * FROM jobs.claim_reference_step($1,'reference_worker','reference-worker-credential-v1',$2)",[job,crypto.randomBytes(32).toString('hex')])).rows[0];
    if(!next)throw new Error('claim_missing');console.log('second_checkpoint_claimed');setInterval(()=>{},1000);
  `, jobId], { env: { NODE_ENV: "production", PATH: process.env.PATH, JOB_WORKER_DATABASE_URL: process.env.JOB_WORKER_DATABASE_URL }, stdio: ["ignore", "pipe", "inherit"] });
  t.after(() => { if (child.exitCode === null) child.kill("SIGKILL"); });
  const claimed = await Promise.race([once(child.stdout!, "data").then(() => true), once(child, "exit").then(() => false)]);
  assert.equal(claimed, true, "Independent worker exited before claiming its checkpoint");
  const killed = once(child, "exit"); child.kill("SIGKILL"); await killed;
  const processes = ["dispatcher", "worker"].map((role) => spawn(process.execPath, ["node_modules/tsx/dist/cli.mjs", "apps/api/src/job-process.ts", role], { env: { NODE_ENV: "production", PATH: process.env.PATH, JOB_EXECUTION_MODE: "external", [role === "worker" ? "JOB_WORKER_DATABASE_URL" : "JOB_DISPATCHER_DATABASE_URL"]: process.env[role === "worker" ? "JOB_WORKER_DATABASE_URL" : "JOB_DISPATCHER_DATABASE_URL"] }, stdio: ["ignore", "ignore", "inherit"] }));
  t.after(async () => { await Promise.all(processes.map(async (process) => { process.kill("SIGTERM"); await once(process, "exit"); })); });
  const read = async (id: string) => (await api.inject({ method: "GET", url: `/api/v1/jobs/${id}`, headers: { cookie } }));
  const deadline = Date.now() + 100_000;
  let detail = await read(jobId);
  while (detail.json().state !== "failed_retryable" && Date.now() < deadline) { await new Promise((resolve) => setTimeout(resolve, 1000)); detail = await read(jobId); }
  assert.equal(detail.json().state, "failed_retryable", detail.body);
  const retry = await api.inject({ method: "POST", url: `/api/v1/jobs/${jobId}/retries`, headers: { cookie, "if-match": detail.headers.etag! } }); assert.equal(retry.statusCode, 200, retry.body);
  const resumedAt = performance.now();
  do { await new Promise((resolve) => setTimeout(resolve, 100)); detail = await read(jobId); } while (detail.json().state !== "completed" && performance.now() - resumedAt < 5000);
  assert.equal(detail.json().state, "completed", detail.body);
  const counts = await database.ownerPool.query("SELECT (SELECT count(*) FROM jobs.job_attempt a JOIN jobs.job_step s ON s.id=a.step_id WHERE s.job_id=$1 AND s.ordinal=1) AS first_attempts,(SELECT count(*) FROM commerce.usage_ledger_entry l JOIN commerce.usage_reservation r ON r.id=l.reservation_id WHERE r.job_id=$1 AND l.entry_type='commit') AS commits", [jobId]);
  assert.deepEqual(counts.rows[0], { first_attempts: "1", commits: "1" });
  // Duplicate delivery cannot create a second accepted result or allowance.
  await database.ownerPool.query("SELECT pgmq.send('reference_jobs',jsonb_build_object('job_id',$1::text,'contract_version','1.0.0'))", [jobId]);
  const commands: number[] = []; const visibility: number[] = [];
  for (let sample = 0; sample < 20; sample++) {
    const beginning = performance.now(); const accepted = await start(); assert.equal(accepted.statusCode, 202, accepted.body); commands.push(performance.now() - beginning);
    let state = await read(accepted.json().id);
    while (state.json().state !== "completed" && performance.now() - beginning < 5000) { await new Promise((resolve) => setTimeout(resolve, 50)); state = await read(accepted.json().id); }
    assert.equal(state.json().state, "completed", state.body); visibility.push(performance.now() - beginning);
  }
  const p95 = (values: number[]) => values.sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1]!;
  const afterDuplicate = await database.ownerPool.query("SELECT count(*) AS commits FROM commerce.usage_ledger_entry l JOIN commerce.usage_reservation r ON r.id=l.reservation_id WHERE r.job_id=$1 AND l.entry_type='commit'", [jobId]);
  assert.equal(afterDuplicate.rows[0]?.commits, "1");
  assert.ok(p95(commands) < 2000); assert.ok(p95(visibility) < 5000);
  t.diagnostic(JSON.stringify({ samples: 20, command_p95_ms: p95(commands), completed_visibility_p95_ms: p95(visibility), lease_seconds: 90, process_kill: "SIGKILL", first_checkpoint_attempts: 1 }));
});
