import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { createTestDatabase } from "../../apps/api/src/test-database.js";

test("AI source proposal migration declares strict contracts, protected payloads, and no authority promotion", async () => {
  const migration = await fs.readFile("supabase/migrations/20260903010000_ai_source_proposal_loop.sql", "utf8");
  for (const token of ["CREATE SCHEMA IF NOT EXISTS ai", "ai.task_definition", "ai.prompt_package", "ai.provider_capability_profile", "ai.task_enablement", "ai.run", "ai.run_fragment", "ai.proposal", "ai.conflict_proposal", "ai.abstention", "ai.run_validation", "ai.run_retry", "ai.command_idempotency", "ai.start_run", "ai.complete_run", "ai.get_run_projection", "raw_request_ciphertext", "raw_response_ciphertext", "proposal_only", "ai.prevent_immutable_mutation"]) assert.match(migration, new RegExp(token.replaceAll(".", "\\.")), token);
  assert.match(migration, /NOT \(payload \? 'fact_id'\).*NOT \(payload \? 'decision_id'\).*NOT \(payload \? 'readiness'\)/s);
  const controls = await fs.readFile("supabase/migrations/20260903050000_ai_task_controls_and_ceiling_access.sql", "utf8");
  for (const token of ["source.get_packet_worker_input", "ai.suspend_task", "ai.enable_task", "ai.rollback_task", "provenance_class", "confidentiality_class"]) assert.match(controls, new RegExp(token.replaceAll(".", "\\.")), token);
  const scopedFragments = await fs.readFile("supabase/migrations/20260903130000_ai_run_scoped_fragment_ids.sql", "utf8");
  assert.match(scopedFragments, /run_fragment_id/);
  const fragmentScope = await fs.readFile("supabase/migrations/20260903140000_ai_fragment_scope_guard.sql", "utf8");
  assert.match(fragmentScope, /source_record_id=NEW.source_record_id/);
});

test("AI source proposal tables are forced RLS and runtime cannot write them", async (t) => {
  const database = await createTestDatabase(); t.after(() => database.close());
  const tables = ["task_definition", "prompt_package", "provider_capability_profile", "task_enablement", "run", "run_fragment", "proposal", "conflict_proposal", "abstention", "run_validation", "run_retry", "command_idempotency"];
  const result = await database.ownerPool.query<{ relname: string; relforcerowsecurity: boolean }>("SELECT c.relname,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ai' AND c.relname=ANY($1)", [tables]);
  assert.deepEqual(result.rows.filter((row) => row.relforcerowsecurity).map((row) => row.relname).sort(), [...tables].sort());
  const role = await database.ownerPool.query<{ rolbypassrls: boolean; rolsuper: boolean }>("SELECT rolbypassrls,rolsuper FROM pg_roles WHERE rolname='app_ai_owner'");
  assert.equal(role.rows[0]?.rolbypassrls, true);
  assert.equal(role.rows[0]?.rolsuper, false);
  const rawAcl = await database.ownerPool.query<{ allowed: boolean }>("SELECT has_column_privilege('app_runtime','ai.run','raw_request_ciphertext','SELECT') AS allowed");
  assert.equal(rawAcl.rows[0]?.allowed, false);
  const writeAcl = await database.ownerPool.query<{ allowed: boolean }>("SELECT has_table_privilege('app_runtime','ai.proposal','INSERT') AS allowed");
  assert.equal(writeAcl.rows[0]?.allowed, false);
  const releaseDigests = await database.ownerPool.query<{ zero_count: string; zero_output_count: string }>("SELECT (SELECT count(*) FILTER (WHERE manifest_digest LIKE 'sha256:000%') FROM ai.task_definition)::text AS zero_count, (SELECT count(*) FILTER (WHERE output_schema_digest LIKE 'sha256:000%') FROM ai.prompt_package)::text AS zero_output_count");
  assert.deepEqual(releaseDigests.rows[0], { zero_count: "0", zero_output_count: "0" });
});
