import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { buildAiInputEnvelope, validateAiOutput } from "../../packages/ai-contracts/src/index.js";

function envelope(taskDefinition: "financial_semantic_extraction" | "financial_normalization_mapping" | "sell_side_analysis_draft" | "valuation_commentary_draft") {
  const accountId = crypto.randomUUID(); const dealId = crypto.randomUUID(); const fragmentId = crypto.randomUUID();
  return buildAiInputEnvelope({ taskDefinition, taskDefinitionVersion: "1.0.0", promptPackageVersion: "1.0.0", inputContractVersion: "1.0.0", outputContractVersion: "1.0.0", aiEvidencePolicyVersion: "1.0.0", contextPlanVersion: "1.0.0", accountId, dealId, jobId: crypto.randomUUID(), jobScopeId: crypto.randomUUID(), packetVersionId: crypto.randomUUID(), workObjective: "valuation", intendedUse: "internal_analysis", audience: "individual_banker", materialClassification: { provenanceClass: "synthetic", confidentialityClass: "internal", deIdentificationPosture: "not_applicable", assessmentIds: ["assessment"] }, rightsAssessmentId: "assessment", fragments: [{ id: fragmentId, sourceRecordId: crypto.randomUUID(), representationId: crypto.randomUUID(), locator: { sheet: "Operating Case", cell: "F42" }, contentDigest: "sha256:" + "a".repeat(64), content: undefined }], controlledInputs: { facts: [{ id: crypto.randomUUID() }], evidence: [{ id: crypto.randomUUID() }], assumptions: [{ id: crypto.randomUUID() }], calculations: [{ id: crypto.randomUUID() }], models: [{ id: crypto.randomUUID() }], scenarios: [{ id: crypto.randomUUID() }] }, requiredInputKeys: [fragmentId], excludedInputKeys: [], failedInputKeys: [], limits: { maxContextBytes: 1000, maxOutputTokens: 1000, timeoutSeconds: 30, maxCostMinorUnits: 0 } });
}

test("financial AI tasks accept decimal, lineage-bearing proposals only", () => {
  const input = envelope("financial_semantic_extraction"); const fragmentId = input.inputs.source_fragments[0]!.fragment_id;
  const output = { status: "complete", schema_version: "1.0.0", task_definition: input.task.task_definition, scope_digest_echo: input.scope.scope_digest, results: [{ candidate_key: "cash-1", origin: "ai_generated", payload: { proposition: "Cash was 4.7m", definition: "cash", period: "FY2025E", unit: "USD million", currency: "USD", sign: "positive", precision: 1, value_text: "4.7", actual_forecast: "forecast", source_fragment_id: fragmentId, source_locator: { sheet: "Operating Case", cell: "F42" }, qualification: null }, evidence_links: [{ fragment_id: fragmentId, relationship: "supports", proposition_scope: "FY2025E cash", qualification: null, limitation: null }], support_status: "supported", conflicts: [], uncertainty_flags: [], limitations: ["Proposal only"], required_human_decision: null }], abstentions: [], omissions: [] };
  assert.deepEqual(validateAiOutput(output, input), { ok: true });
});

test("analysis drafts cannot smuggle authority fields or foreign source locators", () => {
  const input = envelope("sell_side_analysis_draft"); const fragmentId = input.inputs.source_fragments[0]!.fragment_id;
  const factId = (input.inputs.facts[0] as { id: string }).id;
  const base = { status: "complete", schema_version: "1.0.0", task_definition: input.task.task_definition, scope_digest_echo: input.scope.scope_digest, results: [{ candidate_key: "draft-1", origin: "ai_generated", payload: { question: "What changed?", conclusion: "Cash correction closes the tie-out.", supporting_fact_ids: [factId], supporting_assumption_ids: [], supporting_calculation_run_ids: [], supporting_evidence_ids: [], limitations: ["Proposal only"], intended_use: "internal_analysis", audience: "individual_banker" }, evidence_links: [{ fragment_id: fragmentId, relationship: "supports", proposition_scope: "Cash correction", qualification: null, limitation: null }], support_status: "supported", conflicts: [], uncertainty_flags: [], limitations: ["Proposal only"], required_human_decision: null }], abstentions: [], omissions: [] };
  assert.deepEqual(validateAiOutput(base, input), { ok: true });
  const forbidden = structuredClone(base); (forbidden.results[0]!.payload as Record<string, unknown>).readiness = "ready";
  const forbiddenResult = validateAiOutput(forbidden, input); assert.equal(forbiddenResult.ok, false);
  const foreign = structuredClone(base); (foreign.results[0]!.evidence_links[0] as Record<string, unknown>).fragment_id = crypto.randomUUID();
  const foreignResult = validateAiOutput(foreign, input); assert.equal(foreignResult.ok, false); if (!foreignResult.ok) assert.equal(foreignResult.code, "foreign_locator");
});

test("complete AI output cannot silently omit every result", () => {
  const input = envelope("financial_semantic_extraction");
  const empty = { status: "complete", schema_version: "1.0.0", task_definition: input.task.task_definition, scope_digest_echo: input.scope.scope_digest, results: [], abstentions: [], omissions: [] };
  assert.deepEqual(validateAiOutput(empty, input), { ok: false, code: "complete_without_results" });
});

test("financial proposals reject a value whose lexical scale disagrees with precision", () => {
  const input = envelope("financial_semantic_extraction"); const fragmentId = input.inputs.source_fragments[0]!.fragment_id;
  const output = { status: "complete", schema_version: "1.0.0", task_definition: input.task.task_definition, scope_digest_echo: input.scope.scope_digest, results: [{ candidate_key: "cash-precision", origin: "ai_generated", payload: { proposition: "Cash was 4.70m", definition: "cash", period: "FY2025E", unit: "USD million", currency: "USD", sign: "positive", precision: 1, value_text: "4.70", actual_forecast: "forecast", source_fragment_id: fragmentId, source_locator: { sheet: "Operating Case", cell: "F42" }, qualification: null }, evidence_links: [{ fragment_id: fragmentId, relationship: "supports", proposition_scope: "FY2025E cash", qualification: null, limitation: null }], support_status: "supported", conflicts: [], uncertainty_flags: [], limitations: ["Proposal only"], required_human_decision: null }], abstentions: [], omissions: [] };
  assert.deepEqual(validateAiOutput(output, input), { ok: false, code: "precision_mismatch", pointer: "results.0.payload.value_text" });
});
