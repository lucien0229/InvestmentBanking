import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import test, { after, before } from "node:test";

const origin = "http://127.0.0.1:3101";
const northstarDealId = "00000000-0000-4000-8000-000000000101";
const otherAccountDealId = "00000000-0000-4000-8000-000000000202";
let server: ChildProcess;

before(async () => {
  server = spawn(process.execPath, ["node_modules/tsx/dist/cli.mjs", "apps/api/src/server.ts"], {
    cwd: process.cwd(),
    env: { ...process.env, APP_ENV: "test", AUTH_ADAPTER: "local", PORT: "3101", HOST: "127.0.0.1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/api/v1/session`);
      if (response.status === 401) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("API server did not start");
});

after(() => {
  server.kill("SIGTERM");
});

function cookieFrom(response: Response, name: string) {
  const raw = response.headers.get("set-cookie");
  assert.ok(raw, `missing ${name} cookie`);
  const match = raw.split(", ").find((part) => part.startsWith(`${name}=`));
  assert.ok(match, `missing ${name} cookie`);
  return match.split(";", 1)[0];
}

test("HTTP black-box: bootstrap, Passkey posture, overview and privacy-safe Audit", async () => {
  const start = await fetch(`${origin}/api/v1/session/bootstrap`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "banker-a@example.test" }) });
  assert.equal(start.status, 202);
  const token = (await start.json()).test_verification_token as string;
  const verified = await fetch(`${origin}/api/v1/session/bootstrap/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
  assert.equal(verified.status, 200);
  const pending = cookieFrom(verified, "__Host-pending_passkey");
  assert.equal((await (await fetch(`${origin}/api/v1/session/passkey/register`, { method: "POST", headers: { cookie: pending } })).json()).posture, "passkey_registered");
  const authenticated = await fetch(`${origin}/api/v1/session/passkey/authenticate`, { method: "POST", headers: { cookie: pending } });
  assert.equal(authenticated.status, 200);
  const banker = cookieFrom(authenticated, "__Host-banker_session");
  const overview = await fetch(`${origin}/api/v1/deals/${northstarDealId}/overview`, { headers: { cookie: banker } });
  assert.equal(overview.status, 200);
  assert.equal((await overview.json()).deal.name, "Project Northstar");
  const audit = await fetch(`${origin}/api/v1/account/audit-events?deal_id=${northstarDealId}`, { headers: { cookie: banker } });
  assert.equal(audit.status, 200);
  assert.equal((await audit.text()).includes("Project Northstar"), false);
});

test("HTTP black-box: cross-Account/cross-Deal and absent resources are indistinguishable", async () => {
  const start = await fetch(`${origin}/api/v1/session/bootstrap`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "banker-a@example.test" }) });
  const token = (await start.json()).test_verification_token as string;
  const verified = await fetch(`${origin}/api/v1/session/bootstrap/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
  const pending = cookieFrom(verified, "__Host-pending_passkey");
  await fetch(`${origin}/api/v1/session/passkey/register`, { method: "POST", headers: { cookie: pending } });
  const authenticated = await fetch(`${origin}/api/v1/session/passkey/authenticate`, { method: "POST", headers: { cookie: pending } });
  const banker = cookieFrom(authenticated, "__Host-banker_session");
  const [cross, absent] = await Promise.all([
    fetch(`${origin}/api/v1/deals/${otherAccountDealId}/overview`, { headers: { cookie: banker } }),
    fetch(`${origin}/api/v1/deals/00000000-0000-4000-8000-000000000404/overview`, { headers: { cookie: banker } }),
  ]);
  assert.equal(cross.status, 404);
  assert.equal(absent.status, 404);
  const crossBody = await cross.json();
  const absentBody = await absent.json();
  assert.equal(cross.headers.get("content-type")?.split(";")[0], "application/problem+json");
  assert.deepEqual({ ...crossBody, instance: undefined }, { ...absentBody, instance: undefined });
});
