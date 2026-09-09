import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { cimContentPayload, taskDefinitions } from "../../packages/ai-contracts/src/index.js";

const ids = {
  revision: "11111111-1111-4111-8111-111111111111",
  evidence: "22222222-2222-4222-8222-222222222222",
  source: "33333333-3333-4333-8333-333333333333",
  fact: "44444444-4444-4444-8444-444444444444",
  assumption: "55555555-5555-4555-8555-555555555555",
  analysis: "66666666-6666-4666-8666-666666666666",
};

test("cim contract is registered with closed source artifacts", () => {
  assert.ok(taskDefinitions.includes("cim_content_draft"));
  for (const name of ["manifest.yaml", "prompt.md", "input.schema.json", "output.schema.json", "evaluation.yaml"]) {
    assert.equal(fs.existsSync(`ai-contracts/tasks/cim_content_draft/${name}`), true, name);
  }
  const output = JSON.parse(fs.readFileSync("ai-contracts/tasks/cim_content_draft/output.schema.json", "utf8")) as Record<string, unknown>;
  assert.equal(output.additionalProperties, false);
  assert.equal((output.properties as Record<string, Record<string, unknown>>).task_definition.const, "cim_content_draft");
});

test("cim section requires source-bound evidence, qualification and analysis references", () => {
  const valid = { revision_id: ids.revision, section_key: "business_overview", title: "Business Overview", body: "Proposal", citations: ["DISC-CIM-001"], qualification: "Proposal-only; Banker Review required", approved_disclosure_set: ["DISC-CIM-001"], evidence_refs: [ids.evidence], fact_refs: [ids.fact], assumption_refs: [ids.assumption], analysis_refs: [ids.analysis], source_refs: [ids.source] };
  assert.equal(cimContentPayload.parse(valid).section_key, "business_overview");
  assert.throws(() => cimContentPayload.parse({ ...valid, task_definition: "teaser_content_draft" }));
  assert.throws(() => cimContentPayload.parse({ ...valid, evidence_refs: [] }));
  assert.throws(() => cimContentPayload.parse({ ...valid, qualification: "" }));
  assert.throws(() => cimContentPayload.parse({ ...valid, source_refs: [] }));
});
