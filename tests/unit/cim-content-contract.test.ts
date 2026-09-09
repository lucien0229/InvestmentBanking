import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { cimContentPayload, taskDefinitions } from "../../packages/ai-contracts/src/index.js";
import { cimDraft } from "../../apps/api/src/deliverables.js";

test("cim content is a closed proposal payload with citation and qualification", () => {
  assert.ok(taskDefinitions.includes("cim_content_draft"));
  const parsed = cimContentPayload.parse({ revision_id: "11111111-1111-4111-8111-111111111111", section_key: "overview", title: "Overview", body: "Proposal", citations: ["DISC-001"], qualification: "Proposal-only", approved_disclosure_set: ["DISC-001"], evidence_refs: ["22222222-2222-4222-8222-222222222222"], fact_refs: [], assumption_refs: [], source_refs: ["33333333-3333-4333-8333-333333333333"], table_rows: [["Metric", "Value"]] });
  assert.equal(parsed.section_key, "overview");
  assert.throws(() => cimContentPayload.parse({ revision_id: "11111111-1111-4111-8111-111111111111", section_key: "overview", title: "Overview", body: "Proposal", citations: [], qualification: "Proposal-only", approved_disclosure_set: ["DISC-001"], evidence_refs: ["22222222-2222-4222-8222-222222222222"], source_refs: ["33333333-3333-4333-8333-333333333333"] }));
  assert.throws(() => cimContentPayload.parse({ revision_id: "11111111-1111-4111-8111-111111111111", section_key: "overview", title: "Overview", body: "Proposal", citations: ["DISC-001"], qualification: "Proposal-only", approved_disclosure_set: ["DISC-001"] }));
  const outputSchema = JSON.parse(fs.readFileSync("ai-contracts/tasks/cim_content_draft/output.schema.json", "utf8"));
  assert.deepEqual(outputSchema.properties.sections.items.required.sort(), ["body", "citations", "evidence_refs", "qualification", "section_key", "source_refs", "title"].sort());
  assert.ok(outputSchema.properties.sections.items.properties.table_rows);
  assert.ok(outputSchema.properties.sections.items.properties.chart);
});

test("cim draft binds citations and references to its closed input perimeter", () => {
  const evidence = "22222222-2222-4222-8222-222222222222";
  const source = "33333333-3333-4333-8333-333333333333";
  const fact = "44444444-4444-4444-8444-444444444444";
  const assumption = "55555555-5555-4555-8555-555555555555";
  const valid = { task_definition: "cim_content_draft", status: "proposal_only", approved_disclosure_set: ["DISC-001"], evidence: [{ id: evidence, source_record_id: source }], facts_assumptions: [{ id: fact, kind: "fact", status: "accepted" }, { id: assumption, kind: "assumption", status: "approved" }], output_ceiling: { max_slides: 2 }, sections: [{ section_key: "overview", title: "Overview", body: "Proposal", qualification: "Proposal-only", citations: ["DISC-001"], evidence_refs: [evidence], fact_refs: [fact], assumption_refs: [assumption], source_refs: [source] }] };
  assert.equal(cimDraft.parse(valid).sections.length, 1);
  assert.throws(() => cimDraft.parse({ ...valid, sections: [{ ...valid.sections[0], citations: ["UNAPPROVED"] }] }));
  assert.throws(() => cimDraft.parse({ ...valid, sections: [{ ...valid.sections[0], source_refs: ["66666666-6666-4666-8666-666666666666"] }] }));
  assert.throws(() => cimDraft.parse({ ...valid, output_ceiling: { max_slides: 1 } }));
});
