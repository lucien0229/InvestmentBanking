import { SourceProcessingRuntime } from "./source-processing-runtime.js";
const runtime = new SourceProcessingRuntime();
let stopping = false;
process.once("SIGTERM", () => { stopping = true; });
process.once("SIGINT", () => { stopping = true; });
while (!stopping) {
  try { await runtime.runOnce(); } catch { console.error("source_worker_poll_failed"); }
  if (!stopping) await new Promise((resolve) => setTimeout(resolve, 1000));
}
await runtime.close();
