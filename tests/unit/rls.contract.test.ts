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

test("durable Job tables are forced-RLS and worker procedures are the only write seam", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const result = await database.ownerPool.query<{ schema: string; relname: string; relforcerowsecurity: boolean }>(
    `SELECT n.nspname AS schema, c.relname, c.relforcerowsecurity
     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE (n.nspname = 'jobs' AND c.relname = ANY($1)) OR (n.nspname = 'commerce' AND c.relname = ANY($2))
     ORDER BY n.nspname, c.relname`,
    [["idempotency_record", "job", "job_step", "job_attempt", "job_lease", "job_scope", "job_scope_deal", "job_scope_operation", "job_event", "transactional_outbox"], ["usage_reservation", "usage_ledger_entry"]],
  );
  assert.ok(result.rows.length >= 12);
  assert.ok(result.rows.every((row) => row.relforcerowsecurity));
  const acl = await database.ownerPool.query<{ identity_args: string; proacl: string | null }>(
    "SELECT p.oid::regprocedure::text AS identity_args, p.proacl::text FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'jobs' AND p.proname IN ('start_reference_job', 'claim_reference_step', 'commit_reference_step', 'dispatch_reference_outbox')",
  );
  assert.ok(acl.rows.every((row) => !row.proacl?.includes("{=X") && !row.proacl?.includes(",=X")), "Job procedures must not be executable by PUBLIC");
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

test("commerce authority tables are forced-RLS and provider evidence has no raw payload column", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const tableNames = ["qualification_assessment", "checkout_order", "checkout_terms_acceptance", "provider_event", "commercial_receipt", "product_entitlement", "entitlement_mutation", "usage_ledger_entry", "checkout_completed_event", "product_measurement_candidate"];
  const result = await database.ownerPool.query<{ relname: string; relforcerowsecurity: boolean }>("SELECT c.relname, c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'app' AND c.relname = ANY($1)", [tableNames]);
  assert.deepEqual(result.rows.filter((row) => row.relforcerowsecurity).map((row) => row.relname).sort(), [...tableNames].sort());
  const columns = await database.ownerPool.query<{ column_name: string }>("SELECT column_name FROM information_schema.columns WHERE table_schema = 'app' AND table_name = 'provider_event'");
  assert.equal(columns.rows.some((row) => row.column_name === "raw_payload"), false);
  const policies = await database.ownerPool.query<{ policyname: string }>("SELECT polname AS policyname FROM pg_policy WHERE polrelid = 'app.checkout_order'::regclass");
  assert.ok(policies.rows.some((row) => row.policyname === "checkout_order_scope"));
  const commerceFunctions = await database.ownerPool.query<{ identity_args: string; owner_name: string; owner_can_login: boolean; owner_bypasses_rls: boolean; proacl: string | null }>("SELECT p.oid::regprocedure::text AS identity_args, r.rolname AS owner_name, r.rolcanlogin AS owner_can_login, r.rolbypassrls AS owner_bypasses_rls, p.proacl::text FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace JOIN pg_roles r ON r.oid = p.proowner WHERE n.nspname = 'app' AND p.proname = ANY($1)", [["create_qualification_assessment", "get_qualification_assessment", "create_checkout_order", "accept_checkout_terms", "create_checkout_session", "persist_provider_event", "reconcile_provider_event", "dispatch_provider_event_outbox"]]);
  assert.equal(commerceFunctions.rows.length, 8);
  assert.ok(commerceFunctions.rows.every((row) => row.owner_name === "app_commerce_owner"), "commerce definer functions must have a dedicated NOLOGIN owner");
  assert.ok(commerceFunctions.rows.every((row) => row.owner_can_login === false), "commerce definer owner must not be an online login role");
  assert.ok(commerceFunctions.rows.every((row) => !row.proacl?.includes("{=X") && !row.proacl?.includes(",=X")), "commerce definer functions must not be executable by PUBLIC");
});
