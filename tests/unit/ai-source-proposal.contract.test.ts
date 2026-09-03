import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  AI_OUTPUT_SCHEMA_VERSION,
  buildAiInputEnvelope,
  canRouteMaterial,
  detectRepairSemanticChange,
  validateAiOutput,
  type AiOutput,
} from "../../packages/ai-contracts/src/index.js";

const ids = {
  accountId: "00000000-0000-4000-8000-000000000001",
  dealId: "00000000-0000-4000-8000-000000000101",
  jobId: "00000000-0000-4000-8000-000000000201",
  jobScopeId: "00000000-0000-4000-8000-000000000202",
  packetVersionId: "00000000-0000-4000-8000-000000000301",
  sourceRecordId: "00000000-0000-4000-8000-000000000401",
  representationId: "00000000-0000-4000-8000-000000000402",
  fragmentId: "00000000-0000-4000-8000-000000000403",
};

function input() {
  return buildAiInputEnvelope({
    taskDefinition: "source_claim_extraction",
    taskDefinitionVersion: "1.0.0",
    promptPackageVersion: "1.0.0",
    inputContractVersion: "1.0.0",
    outputContractVersion: "1.0.0",
    aiEvidencePolicyVersion: "1.0.0",
    contextPlanVersion: "1.0.0",
    accountId: ids.accountId,
    dealId: ids.dealId,
    jobId: ids.jobId,
    jobScopeId: ids.jobScopeId,
    packetVersionId: ids.packetVersionId,
    workObjective: "Extract operating-performance claims.",
    intendedUse: "internal_analysis",
    audience: "individual_banker",
    materialClassification: { provenanceClass: "synthetic", confidentialityClass: "internal", deIdentificationPosture: "not_applicable", assessmentIds: ["assessment-1"] },
    rightsAssessmentId: "rights-1",
    fragments: [{ id: ids.fragmentId, sourceRecordId: ids.sourceRecordId, representationId: ids.representationId, locator: { kind: "pdf_page", page: 2 }, contentDigest: "sha256:fragment" }],
    requiredInputKeys: [ids.fragmentId],
    excludedInputKeys: [],
    failedInputKeys: [],
    limits: { maxContextBytes: 120000, maxOutputTokens: 8000, timeoutSeconds: 600, maxCostMinorUnits: 500 },
  });
}

test("AI input envelope binds exact packet, versions, fragment locators and canonical digest", () => {
  const envelope = input();
  assert.equal(envelope.envelope_version, "1.0.0");
  assert.equal(envelope.scope.packet_version_id, ids.packetVersionId);
  assert.equal(envelope.inputs.source_fragments[0]?.fragment_id, ids.fragmentId);
  assert.equal(envelope.coverage.coverage_complete, true);
  assert.match(envelope.canonical_input_digest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(envelope.inputs.source_fragments[0]?.content, undefined);
});

test("confidential and restricted material require verified HelloX processing evidence", () => {
  assert.equal(canRouteMaterial({ provenanceClass: "synthetic", confidentialityClass: "internal" }, { provider: "hellox", capabilityVerified: false, processingEvidenceVerified: false }), true);
  assert.equal(canRouteMaterial({ provenanceClass: "real", confidentialityClass: "confidential" }, { provider: "hellox", capabilityVerified: false, processingEvidenceVerified: false }), false);
  assert.equal(canRouteMaterial({ provenanceClass: "real", confidentialityClass: "confidential" }, { provider: "hellox", capabilityVerified: true, processingEvidenceVerified: true }), true);
  assert.equal(canRouteMaterial({ provenanceClass: "real", confidentialityClass: "restricted" }, { provider: "hellox", capabilityVerified: true, processingEvidenceVerified: true, restrictedApproved: false }), false);
  assert.equal(canRouteMaterial({ provenanceClass: "real", confidentialityClass: "restricted" }, { provider: "hellox", capabilityVerified: true, processingEvidenceVerified: true, restrictedApproved: true }), true);
  assert.equal(canRouteMaterial({ provenanceClass: "real", confidentialityClass: "internal" }, { provider: "other", capabilityVerified: true, processingEvidenceVerified: true }), false);
});

test("strict result validation rejects invented locators and authority fields", () => {
  const valid: AiOutput = {
    status: "complete",
    schema_version: AI_OUTPUT_SCHEMA_VERSION,
    task_definition: "source_claim_extraction",
    scope_digest_echo: input().scope.scope_digest,
    results: [{
      candidate_key: "claim-1",
      payload: { proposition: "Revenue was $10m in FY2025.", attribution: "management", definition: "reported revenue", period: "FY2025", unit: "millions", currency: "USD", sign: "positive", value: 10, text: null, source_fragment_id: ids.fragmentId, qualification: null },
      evidence_links: [{ fragment_id: ids.fragmentId, relationship: "supports", proposition_scope: "FY2025 revenue", qualification: null, limitation: null }],
      support_status: "supported",
      conflicts: [],
      uncertainty_flags: [],
      limitations: ["Unaudited management report."],
      required_human_decision: null,
    }],
    abstentions: [],
    omissions: [],
  };
  assert.deepEqual(validateAiOutput(valid, input()), { ok: true });
  const foreign = structuredClone(valid);
  foreign.results[0]!.evidence_links[0]!.fragment_id = "foreign-fragment";
  assert.equal(validateAiOutput(foreign, input()).ok, false);
  const authority = structuredClone(valid) as Record<string, unknown>;
  (authority.results as Array<Record<string, unknown>>)[0]!.fact_id = "forbidden";
  assert.equal(validateAiOutput(authority, input()).ok, false);
});

test("one repair is structure-only and semantic changes reject the response", () => {
  const original = { status: "complete", results: [{ candidate_key: "claim-1", payload: { proposition: "same" } }] };
  const repaired = structuredClone(original);
  assert.equal(detectRepairSemanticChange(original, repaired), false);
  repaired.results[0]!.payload.proposition = "changed";
  assert.equal(detectRepairSemanticChange(original, repaired), true);
});

test("each concrete task ships a versioned strict output contract and synthetic evaluation manifest", () => {
  for (const task of ["source_claim_extraction", "claim_evidence_linking", "material_source_conflict_analysis", "contract_repair"]) {
    const output = JSON.parse(fs.readFileSync(`ai-contracts/tasks/${task}/output.schema.json`, "utf8")) as Record<string, unknown>;
    assert.equal(output.additionalProperties, false, task);
    const resultSchema = (output.$defs as Record<string, unknown>).result as Record<string, unknown>;
    const resultProperties = resultSchema.properties as Record<string, unknown>;
    assert.ok((resultProperties.required_human_decision as Record<string, unknown>).anyOf, `${task}: required human decision must be closed`);
    assert.equal(fs.existsSync(`ai-contracts/tasks/${task}/evaluation.yaml`), true, task);
    assert.match(fs.readFileSync(`ai-contracts/tasks/${task}/manifest.yaml`, "utf8"), /evaluation_suite_version: 1\.0\.0/);
    assert.match(fs.readFileSync(`ai-contracts/tasks/${task}/evaluation.yaml`, "utf8"), /evaluation_suite_version: 1\.0\.0/);
  }
});
