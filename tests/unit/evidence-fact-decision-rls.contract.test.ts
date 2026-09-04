import fs from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase } from "../../apps/api/src/test-database.js";

const migrationPath = "supabase/migrations/20260904000000_evidence_fact_decision_control.sql";
const tables = ["native_locator", "evidence", "claim", "evidence_relationship", "evidence_candidate", "human_decision", "fact", "fact_evidence_basis", "fact_current_selection", "assumption", "assumption_decision", "information_conflict", "conflict_claim", "conflict_disposition", "conflict_decision", "fact_acceptance_decision", "human_decision_evidence", "correction_dependency", "command_idempotency"];

test("Knowledge authority tables are forced-RLS and runtime write-denied", async (t) => {
  const migration = await fs.readFile(migrationPath, "utf8");
  assert.match(migration, /CREATE SCHEMA IF NOT EXISTS knowledge/);
  assert.match(migration, /decision_cannot_waive_hard_block/);
  assert.match(migration, /dependent_readiness/);
  const database = await createTestDatabase(); t.after(() => database.close());
  const state = await database.ownerPool.query<{ relname: string; relforcerowsecurity: boolean }>("SELECT c.relname, c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='knowledge' AND c.relname = ANY($1::text[])", [tables]);
  assert.equal(state.rowCount, tables.length);
  assert.ok(state.rows.every((row) => row.relforcerowsecurity), "every authority table must remain forced-RLS");
  const writes = await database.ownerPool.query<{ relname: string; insertable: boolean; updatable: boolean; deletable: boolean }>("SELECT c.relname, has_table_privilege('app_runtime', format('knowledge.%s', c.relname), 'INSERT') AS insertable, has_table_privilege('app_runtime', format('knowledge.%s', c.relname), 'UPDATE') AS updatable, has_table_privilege('app_runtime', format('knowledge.%s', c.relname), 'DELETE') AS deletable FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='knowledge' AND c.relname = ANY($1::text[])", [tables]);
  assert.ok(writes.rows.every((row) => !row.insertable && !row.updatable && !row.deletable), "runtime must use typed definer commands");
});
