import fs from "node:fs";
import pg from "pg";
import { ReferenceJobRuntime } from "./jobs.js";

const role = process.argv[2];
if (role !== "dispatcher" && role !== "worker") throw new Error("job_process_role_required");
process.env.JOB_EXECUTION_MODE = "external";
const connectionString = role === "dispatcher" ? process.env.JOB_DISPATCHER_DATABASE_URL : process.env.JOB_WORKER_DATABASE_URL;
if (!connectionString) throw new Error("job_process_credentials_required");
const pool = new pg.Pool({ connectionString, max: 2, ...(process.env.DATABASE_SSL_CA_FILE ? { ssl: { ca: fs.readFileSync(process.env.DATABASE_SSL_CA_FILE, "utf8") } } : {}) });
const worker = role === "worker" ? new ReferenceJobRuntime(undefined, { autoRun: false }) : null;
let stopping = false;
process.once("SIGTERM", () => { stopping = true; });
process.once("SIGINT", () => { stopping = true; });
while (!stopping) {
  try {
    if (role === "dispatcher") {
      await pool.query("SELECT jobs.dispatch_pending_reference_jobs()");
      await pool.query("SELECT app.dispatch_pending_provider_events()");
    } else {
      const delivery = (await pool.query<{ message_id: string; job_id: string }>("SELECT * FROM jobs.read_reference_delivery()")).rows[0];
      if (delivery) {
        await worker!.run(delivery.job_id, false);
        await pool.query("SELECT jobs.finish_reference_delivery($1,$2)", [delivery.message_id, delivery.job_id]);
      }
    }
  } catch { console.error(`job_${role}_poll_failed`); }
  if (!stopping) await new Promise((resolve) => setTimeout(resolve, 1000));
}
await worker?.close();
await pool.end();
