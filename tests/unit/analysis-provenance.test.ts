import test from "node:test";
import assert from "node:assert/strict";
import { factSourceLocator } from "../../apps/web/components/deal-control/analysis-provenance.js";

test("financial inputs retain the selected accepted native Evidence location and reject missing or foreign relationships", () => {
  const fact = { id: "fact", claim_id: "selected-claim", evidence_relationship_ids: ["relation-a", "relation-b"] };
  const evidence = [
    { id: "evidence-a", source_record_id: "source-a", representation_id: "rep-a", locator: { kind: "sheet_cell", sheet: "Operating Case", cell: "F42" }, relationships: [{ id: "relation-a", claim_id: "selected-claim", relationship: "supports" }] },
    { id: "evidence-b", source_record_id: "source-b", representation_id: "rep-b", locator: { kind: "pdf_paragraph", page: 2, bbox: [1, 2, 3, 4] }, relationships: [{ id: "relation-b", claim_id: "selected-claim", relationship: "supports" }] },
  ];
  assert.deepEqual(factSourceLocator(fact, evidence, "evidence-a"), evidence[0].locator);
  assert.deepEqual(factSourceLocator(fact, evidence, "evidence-b"), evidence[1].locator);
  assert.throws(() => factSourceLocator(fact, evidence), /exact supporting/);
  assert.throws(() => factSourceLocator(fact, evidence.slice(0, 1), "evidence-b"), /exact supporting/);
  assert.throws(() => factSourceLocator({ ...fact, claim_id: "other-claim" }, evidence, "evidence-a"), /exact supporting/);
  assert.deepEqual(factSourceLocator({ ...fact, evidence_relationship_ids: ["relation-a"] }, evidence), evidence[0].locator);
});
