import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase } from "../../apps/api/src/test-database.js";

test("Ticket 05 Deal Setup and Paid Preflight authority tables are forced-RLS and write through definer functions", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const tables = ["active_deal_capacity_reservation", "deal_setup_draft", "paid_preflight", "preflight_control_result", "first_deal_guide_checkpoint", "deal_command_idempotency"];
  const result = await database.ownerPool.query<{ relname: string; relforcerowsecurity: boolean }>("SELECT c.relname, c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='app' AND c.relname=ANY($1)", [tables]);
  assert.deepEqual(result.rows.filter((row) => row.relforcerowsecurity).map((row) => row.relname).sort(), [...tables].sort());
  const functions = await database.ownerPool.query<{ identity_args: string; owner_name: string; owner_can_login: boolean; owner_bypasses_rls: boolean; proacl: string | null }>("SELECT p.oid::regprocedure::text AS identity_args, r.rolname AS owner_name, r.rolcanlogin AS owner_can_login, r.rolbypassrls AS owner_bypasses_rls, p.proacl::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner WHERE n.nspname='app' AND p.proname=ANY($1)", [["create_paid_deal", "save_deal_setup", "create_paid_preflight", "accept_limited_preflight", "create_identity_changed_deal"]]);
  assert.equal(functions.rows.length, 5);
  assert.ok(functions.rows.every((row) => row.owner_name === "app_commerce_owner" && row.owner_can_login === false && row.owner_bypasses_rls === true));
  assert.ok(functions.rows.every((row) => !row.proacl?.includes("{=X") && !row.proacl?.includes(",=X")));
});
