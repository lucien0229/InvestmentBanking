import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase } from "../../apps/api/src/test-database.js";

test("source intake source and protected-object tables are forced-RLS and write through a non-login definer", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const tables = [
    "upload_session", "source_material", "quarantined_upload", "source_record", "source_representation",
    "processing_coverage", "accepted_source_object", "intake_job", "command_idempotency",
  ];
  const sourceTables = await database.ownerPool.query<{ relname: string; relforcerowsecurity: boolean }>(
    "SELECT c.relname, c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='source' AND c.relname=ANY($1)",
    [tables],
  );
  assert.deepEqual(sourceTables.rows.filter((row) => row.relforcerowsecurity).map((row) => row.relname).sort(), [...tables].sort());
  const protectedTables = await database.ownerPool.query<{ schema: string; relname: string; relforcerowsecurity: boolean }>(
    "SELECT n.nspname AS schema, c.relname, c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE (n.nspname='object_store' AND c.relname IN ('protected_object','protected_stream_access_receipt')) OR (n.nspname='identity' AND c.relname='protected_object_stream_grant')",
  );
  assert.equal(protectedTables.rows.length, 3);
  assert.ok(protectedTables.rows.every((row) => row.relforcerowsecurity));
  const role = await database.ownerPool.query<{ rolcanlogin: boolean; rolbypassrls: boolean }>("SELECT rolcanlogin, rolbypassrls FROM pg_roles WHERE rolname='app_source_owner'");
  assert.deepEqual(role.rows[0], { rolcanlogin: false, rolbypassrls: true });
  const functions = await database.ownerPool.query<{ owner_name: string; owner_can_login: boolean; owner_bypasses_rls: boolean; proacl: string | null }>(
    "SELECT r.rolname AS owner_name, r.rolcanlogin AS owner_can_login, r.rolbypassrls AS owner_bypasses_rls, p.proacl::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner WHERE n.nspname='source' AND p.proname=ANY($1)",
    [["create_upload_session", "append_upload_chunk", "mark_upload_finalized", "accept_source_record", "create_object_grant", "resolve_object_grant", "record_stream_receipt"]],
  );
  assert.equal(functions.rows.length, 7);
  assert.ok(functions.rows.every((row) => row.owner_name === "app_source_owner" && !row.owner_can_login && row.owner_bypasses_rls));
  assert.ok(functions.rows.every((row) => !row.proacl?.includes("{=X") && !row.proacl?.includes(",=X")));
  const directWrite = await database.ownerPool.query<{ insertable: boolean; updatable: boolean }>(
    "SELECT has_table_privilege('app_runtime', 'source.source_record', 'INSERT') AS insertable, has_table_privilege('app_runtime', 'source.source_record', 'UPDATE') AS updatable",
  );
  assert.deepEqual(directWrite.rows[0], { insertable: false, updatable: false });
});
