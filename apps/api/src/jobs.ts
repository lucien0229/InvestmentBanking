import crypto from "node:crypto";
import fs from "node:fs";
import pg from "pg";
import { Database, hashToken } from "./database.js";

export const REFERENCE_WORKER_PRINCIPAL = "reference_worker";
export const REFERENCE_WORKER_CREDENTIAL_VERSION = "reference-worker-credential-v1";

export interface ReferenceJobRuntimeOptions {
  autoRun?: boolean;
  failureStage?: string;
}

/**
 * Local/test coordinator seam. Production uses the same claim/commit functions
 * from a separately credentialed worker process; this class only supplies the
 * deterministic Project Northstar fixture worker for the acceptance seam.
 */
export class ReferenceJobRuntime {
  private readonly workerPool: pg.Pool;
  private readonly dispatcherPool: pg.Pool;
  private readonly options: Required<ReferenceJobRuntimeOptions>;
  private readonly scheduled = new Set<string>();

  constructor(_database: Database, options: ReferenceJobRuntimeOptions = {}) {
    this.options = { autoRun: options.autoRun ?? true, failureStage: options.failureStage ?? "" };
    if (process.env.APP_ENV === "production" && (!process.env.JOB_WORKER_DATABASE_URL || !process.env.JOB_DISPATCHER_DATABASE_URL)) throw new Error("JOB_WORKER_DATABASE_URL and JOB_DISPATCHER_DATABASE_URL are required in production");
    const sslCaFile = process.env.DATABASE_SSL_CA_FILE;
    const ssl = sslCaFile ? { ca: fs.readFileSync(sslCaFile, "utf8") } : undefined;
    this.workerPool = new pg.Pool({
      connectionString: process.env.JOB_WORKER_DATABASE_URL ?? "postgres://job_worker:job_worker_dev@localhost:55432/investment_banking",
      ...(ssl ? { ssl } : {}),
    });
    this.dispatcherPool = new pg.Pool({
      connectionString: process.env.JOB_DISPATCHER_DATABASE_URL ?? "postgres://job_dispatcher:job_dispatcher_dev@localhost:55432/investment_banking",
      ...(ssl ? { ssl } : {}),
    });
  }

  schedule(jobId: string) {
    if (!this.options.autoRun || this.scheduled.has(jobId)) return;
    this.scheduled.add(jobId);
    setImmediate(() => {
      void this.run(jobId).catch(() => this.recover(jobId)).catch(() => undefined).finally(() => this.scheduled.delete(jobId));
    });
  }

  setFailureStage(stage: string) {
    this.options.failureStage = stage;
  }

  async run(jobId: string): Promise<void> {
    await this.dispatch(jobId);
    const client = await this.workerPool.connect();
    try {
      for (let i = 0; i < 8; i += 1) {
        const token = crypto.randomBytes(24).toString("base64url");
        const claim = await client.query<{
          scope_id: string;
          step_id: string;
          attempt_id: string;
          lease_id: string;
          step_code: string;
        }>(
          "SELECT scope_id, step_id, attempt_id, lease_id, step_code FROM jobs.claim_reference_step($1, $2, $3, $4)",
          [jobId, REFERENCE_WORKER_PRINCIPAL, REFERENCE_WORKER_CREDENTIAL_VERSION, hashToken(token)],
        );
        if (claim.rowCount !== 1) return;
        const row = claim.rows[0];
        if (this.options.failureStage === row.step_code) {
          await client.query(
            "SELECT * FROM jobs.commit_reference_step($1, $2, $3, $4, $5, $6)",
            [row.scope_id, hashToken(token), `${jobId}:${row.step_code}:terminated`, hashToken(`terminated:${jobId}:${row.step_code}`), "failed_retryable", "worker_terminated"],
          );
          return;
        }
        const heartbeat = await client.query<{ heartbeat_reference_step: boolean }>(
          "SELECT jobs.heartbeat_reference_step($1, $2)",
          [row.scope_id, hashToken(token)],
        );
        if (heartbeat.rows[0]?.heartbeat_reference_step !== true) return;
        await client.query(
          "SELECT * FROM jobs.commit_reference_step($1, $2, $3, $4, $5)",
          [row.scope_id, hashToken(token), `${jobId}:${row.step_code}:accepted`, hashToken(`accepted:${jobId}:${row.step_code}`), "succeeded"],
        );
      }
    } finally {
      client.release();
    }
  }

  async dispatch(jobId: string): Promise<void> {
    const client = await this.dispatcherPool.connect();
    try {
      await client.query("SELECT jobs.dispatch_reference_outbox($1)", [jobId]);
    } finally {
      client.release();
    }
  }

  async recover(jobId: string): Promise<boolean> {
    const client = await this.dispatcherPool.connect();
    try {
      const result = await client.query<{ recover_expired_reference_job: boolean }>("SELECT jobs.recover_expired_reference_job($1)", [jobId]);
      return result.rows[0]?.recover_expired_reference_job === true;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.workerPool.end();
    await this.dispatcherPool.end();
  }
}
