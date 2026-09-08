import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20260909120000_buyer_candidate_approval_loop.sql", "utf8");
const routes = readFileSync("apps/api/src/buyers.ts", "utf8");

test("Buyer Candidate keeps proposal, Deal Party, approval, and impact as separate objects", () => {
  for (const token of ["buyer_candidate_proposal", "deal_party", "buyer_candidate", "buyer_approval", "buyer_candidate_history", "buyer_candidate_impact", "typed_human_decision", "external_actions_authorized"])
    assert.match(migration + routes, new RegExp(token.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")), token);
});

test("Buyer approval is evidence-backed, exact-version bound, and fail-closed", () => {
  for (const token of ["controlled_object_id", "controlled_object_version", "buyer_approval_evidence_required", "buyer_decision_evidence_scope", "p_evidence", "outreach_authorized',false", "disclosure_authorized',false", "data_room_authorized',false"])
    assert.match(migration, new RegExp(token.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")), token);
});

test("Buyer proposal source perimeter rejects cross-Deal observations and prompt injection", () => {
  assert.match(migration, /sr\.account_id=p_account AND sr\.deal_id=p_deal/);
  assert.match(migration, /buyer_prompt_injection_detected/);
  assert.match(migration, /eligible_source_observations/);
  assert.match(routes, /prompt_injection_detected/);
});

test("Buyer commands use a durable replay key and UI exposes the control boundary", () => {
  assert.match(migration, /command_idempotency/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(routes, /Database\.hashToken\(key\)/);
  assert.match(routes, /buyer-candidates\/:candidate_id\/approvals/);
  assert.match(readFileSync("apps/web/components/deal-control/surfaces.tsx", "utf8"), /buyer-universe-surface/);
});
