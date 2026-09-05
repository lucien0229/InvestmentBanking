import { buildApi } from "./app.js";

if (!process.env.APP_ENV) throw new Error("APP_ENV must be explicitly set for the API runtime");
const api = await buildApi();
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "127.0.0.1";
await api.listen({ port, host });
console.log(`api listening on http://${host}:${port}`);
