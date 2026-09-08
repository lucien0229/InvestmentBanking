import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260909110000_reimport_backend_hardening.sql", "utf8");
const routes = readFileSync("apps/api/src/reimport.ts", "utf8");

test("Native reimport reimport commands persist idempotency responses", () => {
  for (const token of ["reimport_command_idempotency", "pg_advisory_xact_lock", "idempotency_key_reused", "idempotent_replayed", "REVOKE EXECUTE"]) assert.match(migration, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), token);
  assert.match(routes, /Database\.hashToken\(key\)/);
  assert.match(routes, /canonicalDigest\(/);
});

test("Native reimport disposition is bound to the exact import and current conflict Decision", () => {
  for (const token of ["p_import uuid,p_conflict uuid", "c.import_id=p_import", "decision_type_code='conflict_resolution'", "controlled_object_id=c.id::text", "selected_option_code=p_disposition", "decided_by_actor_id=app.policy_actor_id()", "reimport_human_decision_binding"]) assert.match(migration, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), token);
});

test("Native reimport finalization fails closed for unsafe comparison classes", () => {
  for (const token of ["c.classification IN ('unsupported','requires_review')", "unsafe>0", "i.completed_at IS NOT NULL", "reimport_state_conflict"]) assert.match(migration, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), token);
});
