import { WorkbookRuntime } from "./workbook-runtime.js";
import { buildApi } from "./app.js";

if (!process.env.APP_ENV) throw new Error("APP_ENV must be explicitly set for the API runtime");
const api = await buildApi();
if (process.env.OFFICE_RENDERER_SOCKET) {
  const workbooks = new WorkbookRuntime();
  workbooks.start();
  api.addHook("onClose", () => workbooks.close());
}
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "127.0.0.1";
await api.listen({ port, host });
console.log(`api listening on http://${host}:${port}`);
