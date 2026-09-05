import { WorkbookRuntime } from "./workbook-runtime.js";
const runtime = new WorkbookRuntime();
runtime.start();
await new Promise<void>((resolve) => {
  process.once("SIGTERM", resolve);
  process.once("SIGINT", resolve);
});
await runtime.close();
