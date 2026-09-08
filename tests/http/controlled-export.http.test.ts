import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { buildApi } from "../../apps/api/src/app.js";
import { createTestDatabase } from "../../apps/api/src/test-database.js";

test("First Deal Guide derives incomplete work and cannot graduate from unrelated seeded objects", async (t) => {
  const database = await createTestDatabase();
  const api = await buildApi({ database, authMode: "local" });
  t.after(async () => { await api.close(); await database.close(); });
  const cookie = await database.seedAuthenticatedSession("banker-a@example.test");
  const root = "/api/v1/deals/00000000-0000-4000-8000-000000000101";
  const guide = await api.inject({ url: `${root}/guide`, headers: { cookie } });
  assert.equal(guide.statusCode, 200, guide.body);
  assert.equal(guide.json().data.first_value, null);
  assert.equal(guide.json().data.graduation, null);
  assert.equal(guide.json().data.checkpoints.length, 11);
  assert.equal(guide.json().data.checkpoints.find((row: { code: string }) => row.code === "internal_export").status, "waiting");
  const graduate = await api.inject({ method: "POST", url: `${root}/guide/graduations`, headers: { cookie, "idempotency-key": crypto.randomUUID(), "if-match": '"1"' }, payload: { intent: "enter_deal_execution_desk" } });
  assert.equal(graduate.statusCode, 409, graduate.body);
  assert.equal(graduate.json().code, "guide_prerequisites_incomplete");
  assert.equal((await api.inject({ url: `${root}/guide` })).statusCode, 401);
  assert.equal((await api.inject({ url: "/api/v1/deals/00000000-0000-4000-8000-000000000201/guide", headers: { cookie } })).statusCode, 404);
});
