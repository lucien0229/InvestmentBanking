import { WorkbookRuntime } from "./workbook-runtime.js";
import { ExportRuntime } from "./export-worker.js";
const runtime = new WorkbookRuntime();
const exportRuntime = new ExportRuntime();
runtime.start();
exportRuntime.start();
await new Promise<void>((resolve) => {
  process.once("SIGTERM", resolve);
  process.once("SIGINT", resolve);
});
await runtime.close();
await exportRuntime.close();
