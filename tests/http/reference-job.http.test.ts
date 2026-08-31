import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import pg from "pg";
import { buildApi } from "../../apps/api/src/app.js";
import { createTestDatabase } from "../../apps/api/src/test-database.js";
import { Database } from "../../apps/api/src/database.js";

const northstarDealId = "00000000-0000-4000-8000-000000000101";

const buildPayload = () => ({ purpose: "reference_workspace_build" as const, inputs: { source_packet: "northstar-source-packet-v1", requested_scope: "synthetic_reference_fixture" as const } });

async function startJob(api: Awaited<ReturnType<typeof buildApi>>, cookie: string, key: string) {
  return api.inject({ method: "POST", url: `/api/v1/deals/${northstarDealId}/reference-jobs`, headers: { cookie, "idempotency-key": key }, payload: buildPayload() });
}

test("Banker starts one durable Reference Deal Job and can read its authoritative snapshot", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local", referenceJobRuntime: { autoRun: false } });
  t.after(() => api.close());

  const cookie = await database.seedAuthenticatedSession("banker-a@example.test");
  const response = await api.inject({
    method: "POST",
    url: `/api/v1/deals/${northstarDealId}/reference-jobs`,
    headers: { cookie, "idempotency-key": "reference-job-command-0001" },
    payload: buildPayload(),
  });

  assert.equal(response.statusCode, 202);
  const accepted = response.json();
  assert.match(accepted.id, /^[0-9a-f-]{36}$/);
  assert.equal(accepted.state, "queued");
  assert.equal(response.headers.location, `/api/v1/jobs/${accepted.id}`);

  const snapshot = await api.inject({ method: "GET", url: `/api/v1/jobs/${accepted.id}`, headers: { cookie } });
  assert.equal(snapshot.statusCode, 200);
  const body = snapshot.json();
  assert.equal(body.id, accepted.id);
  assert.equal(body.job_type, "reference_workspace_build");
  assert.equal(body.state, "queued");
  assert.deepEqual(body.progress, { message_code: "queued" });
  assert.deepEqual(body.scope, {
    account_id: "00000000-0000-0000-0000-000000000001",
    deal_id: northstarDealId,
    purpose: "reference_workspace_build",
    input_digest: body.scope.input_digest,
    input_version: "reference-input-v1",
    workflow_version: "reference-workflow-v1",
    release_id: "local-reference-release",
    allowance: { class: "reference_workspace_build", quantity: "1.0000", posture: "reserved" },
    workspace_posture_version: 1,
    security_epoch: 1,
    scope_id: null,
    runtime_principal: null,
    operations: [],
    expires_at: null,
  });
  assert.deepEqual(body.result, null);
  assert.deepEqual(body.problem, null);
  assert.deepEqual(body.accepted_inputs, { source_packet: "northstar-source-packet-v1", requested_scope: "synthetic_reference_fixture" });
  assert.equal(body.row_version, 1);
  assert.equal(body.worker_heartbeat_at, null);
});

test("accepted asynchronous command becomes completed through the default dispatcher/worker within the visibility bound", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local" });
  t.after(() => api.close());
  const cookie = await database.seedAuthenticatedSession("banker-a@example.test");
  const startedAt = performance.now();
  const started = await startJob(api, cookie, "reference-job-command-async-01");
  assert.equal(started.statusCode, 202);
  const jobId = started.json().id as string;
  const accepted = await api.inject({ method: "GET", url: `/api/v1/jobs/${jobId}`, headers: { cookie } });
  assert.ok(["queued", "running", "completed"].includes(accepted.json().state));
  let detail = accepted.json();
  while (detail.state !== "completed" && performance.now() - startedAt < 5_000) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    detail = (await (await api.inject({ method: "GET", url: `/api/v1/jobs/${jobId}`, headers: { cookie } })).json()) as typeof detail;
  }
  assert.equal(detail.state, "completed");
  assert.ok(performance.now() - startedAt < 5_000);
});

test("duplicate commands replay one Job and one allowance effect", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local", referenceJobRuntime: { autoRun: false } });
  t.after(() => api.close());
  const cookie = await database.seedAuthenticatedSession("banker-a@example.test");
  const request = {
    method: "POST" as const,
    url: `/api/v1/deals/${northstarDealId}/reference-jobs`,
    headers: { cookie, "idempotency-key": "reference-job-command-dup-01" },
    payload: buildPayload(),
  };
  const [first, second] = await Promise.all([api.inject(request), api.inject(request)]);
  assert.equal(first.statusCode, 202);
  assert.equal(second.statusCode, 202);
  assert.equal(second.json().id, first.json().id);
  assert.equal(second.headers["idempotent-replayed"], "true");
  const counts = await database.ownerPool.query<{ jobs: string; reservations: string; outbox: string }>(
    `SELECT (SELECT count(*) FROM jobs.job WHERE id = $1) AS jobs,
            (SELECT count(*) FROM commerce.usage_reservation WHERE job_id = $1) AS reservations,
            (SELECT count(*) FROM jobs.transactional_outbox WHERE job_id = $1) AS outbox`,
    [first.json().id],
  );
  assert.deepEqual(counts.rows[0], { jobs: "1", reservations: "1", outbox: "1" });

  const changed = await api.inject({ ...request, payload: { ...request.payload, inputs: { ...request.payload.inputs, source_packet: "different-input" } } });
  assert.equal(changed.statusCode, 409);
  assert.equal(changed.json().code, "idempotency_key_reused");
});

test("Reference worker completes from checkpoints with one committed allowance and a replayable SSE history", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local", referenceJobRuntime: { autoRun: false } });
  t.after(() => api.close());
  const cookie = await database.seedAuthenticatedSession("banker-a@example.test");
  const started = await api.inject({
    method: "POST",
    url: `/api/v1/deals/${northstarDealId}/reference-jobs`,
    headers: { cookie, "idempotency-key": "reference-job-command-run-01" },
    payload: buildPayload(),
  });
  const jobId = started.json().id as string;
  await api.referenceJobRuntime.run(jobId);

  const detail = await api.inject({ method: "GET", url: `/api/v1/jobs/${jobId}`, headers: { cookie } });
  assert.equal(detail.statusCode, 200);
  const body = detail.json();
  assert.equal(body.state, "completed");
  assert.equal(body.scope.runtime_principal, "reference_worker");
  assert.equal(body.scope.operations[0], "reference_workspace_build");
  assert.match(body.scope.expires_at, /T/);
  assert.equal(body.scope.allowance.posture, "committed");
  assert.deepEqual(body.result.resource, { type: "reference_workspace", id: "00000000-0000-0000-0000-000000000111" });
  assert.equal(body.progress.completed_units, undefined);
  assert.equal(body.progress.percentage, undefined);

  const effects = await database.ownerPool.query<{ status: string; commits: string; outbox_status: string; outbox_attempts: number }>(
    `SELECT r.status, (SELECT count(*) FROM commerce.usage_ledger_entry l WHERE l.reservation_id = r.id AND l.entry_type = 'commit') AS commits,
            o.status AS outbox_status, o.attempts AS outbox_attempts
     FROM commerce.usage_reservation r JOIN jobs.transactional_outbox o ON o.job_id = r.job_id WHERE r.job_id = $1`,
    [jobId],
  );
  assert.deepEqual(effects.rows[0], { status: "committed", commits: "1", outbox_status: "published", outbox_attempts: 1 });

  const events = await api.inject({ method: "GET", url: `/api/v1/jobs/${jobId}/events`, headers: { cookie } });
  assert.equal(events.statusCode, 200);
  assert.equal(events.headers["content-type"]?.split(";")[0], "text/event-stream");
  assert.match(events.body, /event: job_snapshot/);
  assert.match(events.body, /event: job_terminal/);
  assert.match(events.body, /message_code":"completed/);
  const replay = await api.inject({ method: "GET", url: `/api/v1/jobs/${jobId}/events`, headers: { cookie, "last-event-id": "8" } });
  assert.equal(replay.statusCode, 200);
  assert.match(replay.body, /id: 9/);
  assert.equal(replay.body.includes("id: 1"), false);
});

test("worker termination at each material checkpoint is retryable and preserves accepted inputs", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local", referenceJobRuntime: { autoRun: false } });
  t.after(() => api.close());
  const cookie = await database.seedAuthenticatedSession("banker-a@example.test");
  for (const [index, stage] of ["accepted_inputs", "source_checkpoint", "workspace_checkpoint", "reference_result"].entries()) {
    api.referenceJobRuntime.setFailureStage(stage);
    const started = await startJob(api, cookie, `reference-job-command-kill-${index}-01`);
    assert.equal(started.statusCode, 202);
    const jobId = started.json().id as string;
    await api.referenceJobRuntime.run(jobId);
    const failed = await api.inject({ method: "GET", url: `/api/v1/jobs/${jobId}`, headers: { cookie } });
    assert.equal(failed.json().state, "failed_retryable");
    assert.equal(failed.json().accepted_inputs.source_packet, "northstar-source-packet-v1");
    assert.equal(failed.json().problem.code, "worker_terminated");
    const retry = await api.inject({ method: "POST", url: `/api/v1/jobs/${jobId}/retries`, headers: { cookie, "if-match": failed.headers.etag! } });
    assert.equal(retry.statusCode, 200);
    api.referenceJobRuntime.setFailureStage("");
    await api.referenceJobRuntime.run(jobId);
    const completed = await api.inject({ method: "GET", url: `/api/v1/jobs/${jobId}`, headers: { cookie } });
    assert.equal(completed.json().state, "completed");
  }
});

test("lease loss becomes visible and resumes only after an explicit retry", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local", referenceJobRuntime: { autoRun: false } });
  t.after(() => api.close());
  const cookie = await database.seedAuthenticatedSession("banker-a@example.test");
  const started = await startJob(api, cookie, "reference-job-command-lease-01");
  const jobId = started.json().id as string;
  const worker = new pg.Pool({ connectionString: process.env.JOB_WORKER_DATABASE_URL ?? "postgres://job_worker:job_worker_dev@localhost:55432/investment_banking" });
  const token = crypto.randomBytes(24).toString("base64url");
  try {
    const claim = await worker.query<{ scope_id: string }>("SELECT scope_id FROM jobs.claim_reference_step($1, $2, $3, $4)", [jobId, "reference_worker", "reference-worker-credential-v1", Database.hashToken(token)]);
    assert.equal(claim.rowCount, 1);
    await database.ownerPool.query("UPDATE jobs.job_lease SET expires_at = clock_timestamp() - interval '1 second' WHERE lease_token_hash = $1", [Database.hashToken(token)]);
    assert.equal(await api.referenceJobRuntime.recover(jobId), true);
    const recovered = await api.inject({ method: "GET", url: `/api/v1/jobs/${jobId}`, headers: { cookie } });
    assert.equal(recovered.json().state, "failed_retryable");
    assert.equal(recovered.json().problem.code, "lease_lost");
    const retry = await api.inject({ method: "POST", url: `/api/v1/jobs/${jobId}/retries`, headers: { cookie, "if-match": recovered.headers.etag! } });
    assert.equal(retry.statusCode, 200);
    await api.referenceJobRuntime.run(jobId);
    const completed = await api.inject({ method: "GET", url: `/api/v1/jobs/${jobId}`, headers: { cookie } });
    assert.equal(completed.json().state, "completed");
  } finally {
    await worker.end();
  }
});

test("cancellation releases unused allowance exactly once and cross-Account Job reads remain hidden", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local", referenceJobRuntime: { autoRun: false } });
  t.after(() => api.close());
  const banker = await database.seedAuthenticatedSession("banker-a@example.test");
  const otherBanker = await database.seedAuthenticatedSession("banker-b@example.test");
  const started = await startJob(api, banker, "reference-job-command-cancel-01");
  const jobId = started.json().id as string;
  const canceled = await api.inject({ method: "POST", url: `/api/v1/jobs/${jobId}/cancellations`, headers: { cookie: banker, "if-match": started.headers.etag! }, payload: { reason: "banker_requested" } });
  assert.equal(canceled.statusCode, 201);
  const detail = await api.inject({ method: "GET", url: `/api/v1/jobs/${jobId}`, headers: { cookie: banker } });
  assert.equal(detail.json().state, "canceled");
  assert.equal(detail.json().scope.allowance.posture, "released");
  const counts = await database.ownerPool.query<{ status: string; releases: string }>("SELECT r.status, (SELECT count(*) FROM commerce.usage_ledger_entry l WHERE l.reservation_id = r.id AND l.entry_type = 'release') AS releases FROM commerce.usage_reservation r WHERE r.job_id = $1", [jobId]);
  assert.deepEqual(counts.rows[0], { status: "released", releases: "1" });
  const hidden = await api.inject({ method: "GET", url: `/api/v1/jobs/${jobId}`, headers: { cookie: otherBanker } });
  assert.equal(hidden.statusCode, 404);
});

test("Job controls preserve the Passkey boundary and reject malformed SSE cursors", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local", referenceJobRuntime: { autoRun: false } });
  t.after(() => api.close());
  const pending = await database.seedMagicLinkOnlySession("banker-a@example.test");
  const unknown = "00000000-0000-4000-8000-000000009999";
  const job = await api.inject({ method: "GET", url: `/api/v1/jobs/${unknown}`, headers: { cookie: pending } });
  assert.equal(job.statusCode, 403);
  assert.equal(job.json().code, "passkey_required");
  const cursor = await api.inject({ method: "GET", url: `/api/v1/jobs/${unknown}/events`, headers: { cookie: pending, "last-event-id": "not-a-number" } });
  assert.equal(cursor.statusCode, 400);
  assert.equal(cursor.json().code, "invalid_event_cursor");
});

test("stale Job Scope cannot commit after the Workspace posture version advances", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local", referenceJobRuntime: { autoRun: false } });
  t.after(() => api.close());
  const cookie = await database.seedAuthenticatedSession("banker-a@example.test");
  const started = await startJob(api, cookie, "reference-job-command-posture-01");
  const jobId = started.json().id as string;
  const worker = new pg.Pool({ connectionString: process.env.JOB_WORKER_DATABASE_URL ?? "postgres://job_worker:job_worker_dev@localhost:55432/investment_banking" });
  const token = crypto.randomBytes(24).toString("base64url");
  try {
    const claim = await worker.query<{ scope_id: string }>("SELECT scope_id FROM jobs.claim_reference_step($1, $2, $3, $4)", [jobId, "reference_worker", "reference-worker-credential-v1", Database.hashToken(token)]);
    assert.equal(claim.rowCount, 1);
    await database.ownerPool.query("UPDATE app.deal_workspace SET posture_version = posture_version + 1 WHERE deal_id = $1", [northstarDealId]);
    const commit = await worker.query<{ status: string; job_state: string }>("SELECT status, job_state FROM jobs.commit_reference_step($1, $2, $3, $4, $5)", [claim.rows[0].scope_id, Database.hashToken(token), `${jobId}:stale`, "stale-digest", "succeeded"]);
    assert.deepEqual(commit.rows[0], { status: "workspace_posture_changed", job_state: "blocked" });
    const detail = await api.inject({ method: "GET", url: `/api/v1/jobs/${jobId}`, headers: { cookie } });
    assert.equal(detail.json().state, "blocked");
    assert.equal(detail.json().problem.code, "workspace_posture_changed");
  } finally {
    await database.ownerPool.query("UPDATE app.deal_workspace SET posture_version = 1 WHERE deal_id = $1", [northstarDealId]);
    await worker.end();
  }
});
