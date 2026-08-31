import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import pg from "pg";
import { Database } from "../../apps/api/src/database.js";
import { ReferenceJobRuntime } from "../../apps/api/src/jobs.js";
import { createTestDatabase } from "../../apps/api/src/test-database.js";

test("dedicated worker and dispatcher pools load the configured database CA", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "reference-job-ca-"));
  const caPath = path.join(tempDir, "supabase-chain.pem");
  const ca = "test-supabase-ca";
  await fs.writeFile(caPath, ca);
  const previousCaPath = process.env.DATABASE_SSL_CA_FILE;
  const previousWorkerUrl = process.env.JOB_WORKER_DATABASE_URL;
  const previousDispatcherUrl = process.env.JOB_DISPATCHER_DATABASE_URL;
  process.env.DATABASE_SSL_CA_FILE = caPath;
  process.env.JOB_WORKER_DATABASE_URL = "postgres://job-worker.test";
  process.env.JOB_DISPATCHER_DATABASE_URL = "postgres://job-dispatcher.test";
  const runtime = new ReferenceJobRuntime({} as Database, { autoRun: false });
  t.after(async () => {
    await runtime.close();
    await fs.rm(tempDir, { recursive: true, force: true });
    if (previousCaPath === undefined) delete process.env.DATABASE_SSL_CA_FILE;
    else process.env.DATABASE_SSL_CA_FILE = previousCaPath;
    if (previousWorkerUrl === undefined) delete process.env.JOB_WORKER_DATABASE_URL;
    else process.env.JOB_WORKER_DATABASE_URL = previousWorkerUrl;
    if (previousDispatcherUrl === undefined) delete process.env.JOB_DISPATCHER_DATABASE_URL;
    else process.env.JOB_DISPATCHER_DATABASE_URL = previousDispatcherUrl;
  });
  const pools = runtime as unknown as { workerPool: pg.Pool; dispatcherPool: pg.Pool };
  assert.deepEqual(pools.workerPool.options.ssl, { ca });
  assert.deepEqual(pools.dispatcherPool.options.ssl, { ca });
});

test("worker and dispatcher principals cannot query tenant tables directly", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const worker = new pg.Pool({ connectionString: process.env.JOB_WORKER_DATABASE_URL ?? "postgres://job_worker:job_worker_dev@localhost:55432/investment_banking" });
  const dispatcher = new pg.Pool({ connectionString: process.env.JOB_DISPATCHER_DATABASE_URL ?? "postgres://job_dispatcher:job_dispatcher_dev@localhost:55432/investment_banking" });
  t.after(async () => { await worker.end(); await dispatcher.end(); });
  await assert.rejects(() => worker.query("SELECT * FROM app.deal"), /permission denied/);
  await assert.rejects(() => worker.query("SELECT * FROM jobs.job"), /permission denied/);
  await assert.rejects(() => dispatcher.query("SELECT * FROM app.deal"), /permission denied/);
  await assert.rejects(() => dispatcher.query("SELECT * FROM jobs.job"), /permission denied/);
  const roles = await database.ownerPool.query<{ rolname: string; rolbypassrls: boolean; rolsuper: boolean }>("SELECT rolname, rolbypassrls, rolsuper FROM pg_roles WHERE rolname IN ('job_worker', 'job_dispatcher') ORDER BY rolname");
  assert.deepEqual(roles.rows, [
    { rolname: "job_dispatcher", rolbypassrls: false, rolsuper: false },
    { rolname: "job_worker", rolbypassrls: false, rolsuper: false },
  ]);
});
