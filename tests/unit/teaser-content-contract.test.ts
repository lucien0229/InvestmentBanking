import test from "node:test";
import assert from "node:assert/strict";
import { teaserContentPayload, taskDefinitions } from "../../packages/ai-contracts/src/index.js";

test("teaser content is a closed proposal payload with citation and qualification", () => {
  assert.ok(taskDefinitions.includes("teaser_content_draft"));
  const parsed = teaserContentPayload.parse({ revision_id: "11111111-1111-4111-8111-111111111111", section_key: "overview", title: "Overview", body: "Proposal", citations: ["DISC-001"], qualification: "Proposal-only", approved_disclosure_set: ["DISC-001"], evidence_refs: ["22222222-2222-4222-8222-222222222222"], fact_refs: [], assumption_refs: [] });
  assert.equal(parsed.section_key, "overview");
  assert.throws(() => teaserContentPayload.parse({ revision_id: "11111111-1111-4111-8111-111111111111", section_key: "overview", title: "Overview", body: "Proposal", citations: [], qualification: "Proposal-only", approved_disclosure_set: ["DISC-001"], evidence_refs: ["22222222-2222-4222-8222-222222222222"] }));
  assert.throws(() => teaserContentPayload.parse({ revision_id: "11111111-1111-4111-8111-111111111111", section_key: "overview", title: "Overview", body: "Proposal", citations: ["DISC-001"], qualification: "Proposal-only", approved_disclosure_set: ["DISC-001"] }));
});
