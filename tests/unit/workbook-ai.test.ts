import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  buildAiInputEnvelope,
  validateAiOutput,
} from "../../packages/ai-contracts/src/index.js";

test("workbook AI findings stay proposals on the exact delivered pair", () => {
  const revision = crypto.randomUUID(),
    native = crypto.randomUUID(),
    reader = crypto.randomUUID(),
    fragment = crypto.randomUUID();
  const envelope = buildAiInputEnvelope({
    taskDefinition: "native_reader_semantic_parity_review",
    taskDefinitionVersion: "1.0.0",
    promptPackageVersion: "1.0.0",
    inputContractVersion: "1.0.0",
    outputContractVersion: "1.0.0",
    aiEvidencePolicyVersion: "1.0.0",
    contextPlanVersion: "1.0.0",
    accountId: crypto.randomUUID(),
    dealId: crypto.randomUUID(),
    jobId: crypto.randomUUID(),
    jobScopeId: crypto.randomUUID(),
    packetVersionId: crypto.randomUUID(),
    workObjective: "Review exact parity",
    intendedUse: "valuation",
    audience: "banker",
    materialClassification: {
      provenanceClass: "synthetic",
      confidentialityClass: "internal",
      deIdentificationPosture: "not_applicable",
      assessmentIds: [],
    },
    rightsAssessmentId: "test",
    fragments: [
      {
        id: fragment,
        sourceRecordId: crypto.randomUUID(),
        representationId: crypto.randomUUID(),
        contentDigest: "sha256:" + "a".repeat(64),
        locator: { sheet: "Valuation", cell: "E8" },
      },
    ],
    controlledInputs: {
      currentRevisions: [
        {
          id: revision,
          artifacts: [
            { id: native, role: "native" },
            { id: reader, role: "reader" },
          ],
          regions: [
            {
              region_key: "valuation",
              artifact_id: native,
              native_locator: {
                sheet: "Valuation",
                range: "E8",
                reader_pages: [4],
              },
            },
          ],
        },
      ],
    },
    requiredInputKeys: [fragment],
    excludedInputKeys: [],
    failedInputKeys: [],
    limits: {
      maxContextBytes: 10000,
      maxOutputTokens: 1000,
      timeoutSeconds: 30,
      maxCostMinorUnits: 0,
    },
  });
  const output = {
    status: "complete",
    schema_version: "1.0.0",
    task_definition: envelope.task.task_definition,
    scope_digest_echo: envelope.scope.scope_digest,
    results: [
      {
        candidate_key: "parity-1",
        origin: "ai_generated",
        payload: {
          revision_id: revision,
          native_artifact_id: native,
          reader_artifact_id: reader,
          region_key: "valuation",
          native_locator: { sheet: "Valuation", range: "E8" },
          reader_locator: { page: 4, region_label: "valuation" },
          category: "numbers",
          severity_proposal: "critical",
          observed_condition:
            "The reader amount differs from the exact native cache.",
          expected_contract: "Both must show the same controlled value.",
          remediation_proposal: "Regenerate and retest the exact pair.",
        },
        evidence_links: [
          {
            fragment_id: fragment,
            relationship: "supports",
            proposition_scope: "Exact parity",
            qualification: null,
            limitation: null,
          },
        ],
        support_status: "supported",
        conflicts: [],
        uncertainty_flags: [],
        limitations: [
          "Proposal only; deterministic checks and professional Review remain required.",
        ],
        required_human_decision: null,
      },
    ],
    abstentions: [],
    omissions: [],
  };
  assert.deepEqual(validateAiOutput(output, envelope), { ok: true });
  const foreign = structuredClone(output);
  foreign.results[0]!.payload.reader_artifact_id = crypto.randomUUID();
  assert.equal(validateAiOutput(foreign, envelope).ok, false);
  const locator = structuredClone(output);
  locator.results[0]!.payload.reader_locator.page = 2;
  assert.equal(validateAiOutput(locator, envelope).ok, false);
  const forged = structuredClone(output);
  Object.assign(forged.results[0]!.payload, {
    readiness: "circulation_candidate",
  });
  assert.equal(validateAiOutput(forged, envelope).ok, false);
});
