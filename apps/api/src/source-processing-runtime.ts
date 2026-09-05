import crypto from "node:crypto";
import fs from "node:fs";
import pg from "pg";
import { decryptProtected, protectedPath } from "./sources.js";
import { inspectSource } from "./source-inspector.js";

type Task = { id: string; source_record_id: string; object_id: string; storage_key: string; ciphertext_sha256: string; content_sha256: string; media_type: string };
const digest = (value: Buffer | string) => crypto.createHash("sha256").update(value).digest("hex");
/** Independent process, exact leased Source only; it has no provider credentials. */
export class SourceProcessingRuntime {
  private readonly pool: pg.Pool;
  constructor() {
    if (!process.env.JOB_WORKER_DATABASE_URL) throw new Error("source_worker_credentials_required");
    this.pool = new pg.Pool({ connectionString: process.env.JOB_WORKER_DATABASE_URL, max: 2, ...(process.env.DATABASE_SSL_CA_FILE ? { ssl: { ca: fs.readFileSync(process.env.DATABASE_SSL_CA_FILE, "utf8") } } : {}) });
  }
  async close() { await this.pool.end(); }
  async runOnce() {
    const leaseHash = digest(crypto.randomBytes(32));
    const task = (await this.pool.query<{ task: Task | null }>("SELECT source.claim_processing($1) AS task", [leaseHash])).rows[0]?.task;
    if (!task) return false;
    let valid = true;
    const heartbeat = setInterval(() => { void this.pool.query<{ valid: boolean }>("SELECT source.heartbeat_processing($1,$2) AS valid", [task.id, leaseHash]).then((result) => { valid = result.rows[0]?.valid === true; }).catch(() => { valid = false; }); }, 20000);
    heartbeat.unref();
    try {
      if (task.storage_key !== `protected/deal/${task.object_id}.bin`) throw new Error("source_storage_identity_mismatch");
      const container = await fs.promises.readFile(protectedPath(task.storage_key));
      if (digest(container) !== task.ciphertext_sha256) throw new Error("source_storage_identity_mismatch");
      const { plaintext } = await decryptProtected(container);
      if (digest(plaintext) !== task.content_sha256) throw new Error("source_content_identity_mismatch");
      const family = task.media_type.includes("spreadsheet") ? "xlsx" : task.media_type.includes("presentation") ? "pptx" : task.media_type.includes("word") ? "docx" : task.media_type === "application/pdf" ? "pdf" : task.media_type === "text/csv" ? "csv" : "unsupported";
      const report = await inspectSource(plaintext, family, "parse");
      if (valid) await this.pool.query("SELECT source.complete_processing($1,$2,$3)", [task.id, leaseHash, report]);
    } catch (cause) {
      // Saturation and transport failures retain the lease for bounded recovery.
      const code = cause instanceof Error ? cause.message : "source_processing_failed";
      if (/identity_mismatch|contract_invalid/.test(code) && valid) await this.pool.query("SELECT source.complete_processing($1,$2,$3)", [task.id, leaseHash, { clean: false }]);
    } finally { clearInterval(heartbeat); }
    return true;
  }
}
