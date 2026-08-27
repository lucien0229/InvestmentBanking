import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase } from "../../apps/api/src/test-database.js";
import { hashToken } from "../../apps/api/src/database.js";

test("runtime role and tenant tables enforce the forced-RLS boundary", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const role = await database.ownerPool.query<{ rolbypassrls: boolean; rolsuper: boolean }>("SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = 'app_runtime'");
  assert.equal(role.rows[0].rolbypassrls, false);
  assert.equal(role.rows[0].rolsuper, false);
  const tables = ["account", "actor", "account_actor", "deal", "deal_workspace", "auth_challenge", "auth_session", "passkey_credential", "audit_event", "request_context"];
  const result = await database.ownerPool.query<{ relname: string; relforcerowsecurity: boolean }>("SELECT relname, relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'app' AND c.relname = ANY($1)", [tables]);
  assert.deepEqual(result.rows.filter((row) => row.relforcerowsecurity).map((row) => row.relname).sort(), [...tables].sort());
  const functions = await database.ownerPool.query<{ identity_args: string; proacl: string | null }>("SELECT p.oid::regprocedure::text AS identity_args, p.proacl::text FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'app' AND p.proname IN ('begin_request', 'set_deal_scope', 'clear_request', 'issue_magic_link', 'verify_magic_link', 'register_passkey', 'authenticate_passkey', 'record_audit')");
  assert.ok(functions.rows.length >= 8);
  assert.ok(functions.rows.every((row) => !row.proacl?.includes("{=X") && !row.proacl?.includes(",=X")), "elevated functions must not be executable by PUBLIC");
  const auditPolicy = await database.ownerPool.query<{ definition: string }>("SELECT pg_get_expr(polqual, polrelid) AS definition FROM pg_policy WHERE polname = 'audit_scope' AND polrelid = 'app.audit_event'::regclass");
  assert.match(auditPolicy.rows[0]?.definition ?? "", /deal_id/);
  await assert.rejects(
    () => database.ownerPool.query("INSERT INTO app.account_actor(account_id, actor_id, active) VALUES ($1, $2, true)", ["00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000011"]),
    /duplicate key|unique constraint/,
  );
});

test("database policy cannot be redirected to a different Deal by a caller-supplied object identity", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const cookie = await database.seedAuthenticatedSession("banker-a@example.test");
  const sessionToken = cookie.split("=", 2)[1].split(";", 1)[0];
  const client = await database.pool.connect();
  try {
    await client.query("BEGIN");
    const context = await client.query("SELECT * FROM app.begin_request($1, $2)", [hashToken(sessionToken), "00000000-0000-4000-8000-000000000101"]);
    assert.equal(context.rowCount, 1);
    await client.query("SAVEPOINT manipulated_identity");
    await assert.rejects(() => client.query("INSERT INTO app.request_context(backend_pid, account_id, actor_id, deal_id) VALUES (pg_backend_pid(), $1, $2, $3)", ["00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000012", "00000000-0000-4000-8000-000000000202"]), /permission denied|row-level security/);
    await client.query("ROLLBACK TO SAVEPOINT manipulated_identity");
    const hidden = await client.query("SELECT id FROM app.deal WHERE id = $1", ["00000000-0000-4000-8000-000000000202"]);
    assert.equal(hidden.rowCount, 0);
    await client.query("SELECT app.clear_request()");
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
});
