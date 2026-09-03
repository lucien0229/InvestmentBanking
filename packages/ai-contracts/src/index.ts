import crypto from "node:crypto";
import { z } from "zod";

export const AI_INPUT_SCHEMA_VERSION = "1.0.0" as const;
export const AI_OUTPUT_SCHEMA_VERSION = "1.0.0" as const;
export const AI_EVIDENCE_POLICY_VERSION = "1.0.0" as const;
export const HELLOX_PROVIDER = "hellox" as const;

export const taskDefinitions = [
  "source_claim_extraction",
  "claim_evidence_linking",
  "material_source_conflict_analysis",
  "contract_repair",
] as const;
export type TaskDefinition = (typeof taskDefinitions)[number];
export type MaterialProvenanceClass = "synthetic" | "real";
export type ConfidentialityClass = "public" | "internal" | "confidential" | "restricted";

type MaterialClassification = {
  provenanceClass: MaterialProvenanceClass;
  confidentialityClass: ConfidentialityClass;
  deIdentificationPosture: string;
  assessmentIds: string[];
};

type InputFragment = {
  id: string;
  sourceRecordId: string;
  sourceRecordVersion?: number;
  sourceRecordDigest?: string;
  representationId: string;
  representationDigest?: string;
  locator: Record<string, string | number>;
  contentDigest: string;
  coverageCode?: string;
  /** Content is intentionally never included in the authoritative envelope. */
  content?: never;
};

type EnvelopeFragment = {
  fragment_id: string;
  source_record_id: string;
  representation_id: string;
  locator: Record<string, string | number>;
  content_digest: string;
  /** Raw source content is never part of the provider input envelope. */
  content?: never;
};

export type AiInputEnvelope = {
  envelope_version: typeof AI_INPUT_SCHEMA_VERSION;
  task: {
    task_definition: TaskDefinition;
    task_definition_version: string;
    prompt_package_version: string;
    input_contract_version: string;
    output_contract_version: string;
    ai_evidence_policy_version: string;
    context_plan_version: string;
  };
  scope: {
    account_id: string;
    deal_id: string;
    job_id: string;
    job_scope_id: string;
    packet_version_id: string;
    work_objective: string;
    intended_use: string;
    audience: string;
    material_classification: {
      provenance_class: MaterialProvenanceClass;
      confidentiality_class: ConfidentialityClass;
      de_identification_posture: string;
      assessment_ids: string[];
    };
    rights_posture: { assessment_id: string; required_operation: "ai_processing" };
    scope_digest: string;
  };
  inputs: {
    source_records: Array<{ source_record_id: string; version: number; content_digest: string }>;
    source_representations: Array<{ representation_id: string; source_record_id: string; content_digest: string }>;
    source_fragments: EnvelopeFragment[];
    processing_coverage: Array<{ source_record_id: string; coverage_code: string; coverage_digest: string }>;
    facts: unknown[];
    assumptions: unknown[];
    human_decisions: unknown[];
    calculations: unknown[];
    models: unknown[];
    scenarios: unknown[];
    artifact_contracts: unknown[];
    current_revisions: unknown[];
    deterministic_results: unknown[];
  };
  coverage: {
    required_input_keys: string[];
    included_input_keys: string[];
    excluded_input_keys: string[];
    failed_input_keys: string[];
    coverage_complete: boolean;
  };
  limits: { max_context_bytes: number; max_output_tokens: number; timeout_seconds: number; max_cost_minor_units: number };
  request_nonce: string;
  canonical_input_digest: string;
};

export type AiOutput = {
  status: "complete" | "partial" | "abstained";
  schema_version: typeof AI_OUTPUT_SCHEMA_VERSION;
  task_definition: TaskDefinition;
  scope_digest_echo: string;
  results: Array<{
    candidate_key: string;
    payload: Record<string, unknown>;
    evidence_links: Array<{ fragment_id: string; relationship: "supports" | "challenges"; proposition_scope: string; qualification: string | null; limitation: string | null }>;
    support_status: "supported" | "challenged" | "conflicted" | "insufficient_support" | "unresolved_locator" | "coverage_incomplete" | "rights_blocked" | "out_of_scope" | "not_applicable";
    conflicts: Array<Record<string, unknown>>;
    uncertainty_flags: string[];
    limitations: string[];
    required_human_decision: Record<string, unknown> | null;
  }>;
  abstentions: Array<Record<string, unknown>>;
  omissions: Array<Record<string, unknown>>;
};

export type SourceClaimCandidate = {
  proposition: string;
  attribution: string;
  definition: string;
  period: string;
  unit: string;
  currency: string;
  sign: "positive" | "negative" | "not_applicable" | "unknown";
  value: number | null;
  text: string | null;
  source_fragment_id: string;
  qualification: string | null;
};

export type ClaimEvidenceLinkCandidate = {
  proposition_key: string;
  fragment_id: string;
  relationship: "supports" | "challenges";
  supported_scope: string;
  qualification: string | null;
  relationship_limitation: string | null;
};

export type MaterialSourceConflictCandidate = {
  conflict_key: string;
  dimension: "definition" | "period" | "unit" | "currency" | "sign" | "value" | "source_version" | "scope" | "meaning";
  competing_refs: string[];
  affected_scope: string;
  unresolved_alternatives: string[];
  affected_uses: string[];
};

export type ContractRepairCandidate = {
  original_candidate_key: string;
  repaired_payload: Record<string, unknown>;
};

type InputOptions = {
  taskDefinition: TaskDefinition;
  taskDefinitionVersion: string;
  promptPackageVersion: string;
  inputContractVersion: string;
  outputContractVersion: string;
  aiEvidencePolicyVersion: string;
  contextPlanVersion: string;
  accountId: string;
  dealId: string;
  jobId: string;
  jobScopeId: string;
  packetVersionId: string;
  workObjective: string;
  intendedUse: string;
  audience: string;
  materialClassification: MaterialClassification;
  rightsAssessmentId: string;
  fragments: InputFragment[];
  requiredInputKeys: string[];
  excludedInputKeys: string[];
  failedInputKeys: string[];
  limits: { maxContextBytes: number; maxOutputTokens: number; timeoutSeconds: number; maxCostMinorUnits: number };
};

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
}

function digest(value: unknown) { return `sha256:${crypto.createHash("sha256").update(canonical(value)).digest("hex")}`; }

export function buildAiInputEnvelope(options: InputOptions): AiInputEnvelope {
  const fragments = options.fragments.map((fragment) => ({ fragment_id: fragment.id, source_record_id: fragment.sourceRecordId, representation_id: fragment.representationId, locator: fragment.locator, content_digest: fragment.contentDigest }));
  const scope = {
    account_id: options.accountId,
    deal_id: options.dealId,
    job_id: options.jobId,
    job_scope_id: options.jobScopeId,
    packet_version_id: options.packetVersionId,
    work_objective: options.workObjective,
    intended_use: options.intendedUse,
    audience: options.audience,
    material_classification: {
      provenance_class: options.materialClassification.provenanceClass,
      confidentiality_class: options.materialClassification.confidentialityClass,
      de_identification_posture: options.materialClassification.deIdentificationPosture,
      assessment_ids: [...options.materialClassification.assessmentIds].sort(),
    },
    rights_posture: { assessment_id: options.rightsAssessmentId, required_operation: "ai_processing" as const },
  };
  const scopeWithDigest = { ...scope, scope_digest: digest(scope) };
  const inputs = {
    source_records: [...new Map(options.fragments.map((fragment) => [fragment.sourceRecordId, { source_record_id: fragment.sourceRecordId, version: fragment.sourceRecordVersion ?? 0, content_digest: fragment.sourceRecordDigest ?? fragment.contentDigest }])).values()],
    source_representations: [...new Map(options.fragments.map((fragment) => [fragment.representationId, { representation_id: fragment.representationId, source_record_id: fragment.sourceRecordId, content_digest: fragment.representationDigest ?? fragment.contentDigest }])).values()],
    source_fragments: fragments,
    processing_coverage: [...new Map(options.fragments.map((fragment) => [fragment.sourceRecordId, { source_record_id: fragment.sourceRecordId, coverage_code: fragment.coverageCode ?? "parsed", coverage_digest: digest({ source_record_id: fragment.sourceRecordId, coverage_code: fragment.coverageCode ?? "parsed" }) }])).values()],
    facts: [], assumptions: [], human_decisions: [], calculations: [], models: [], scenarios: [], artifact_contracts: [], current_revisions: [], deterministic_results: [],
  };
  const coverage = {
    required_input_keys: [...options.requiredInputKeys], included_input_keys: fragments.map((fragment) => fragment.fragment_id),
    excluded_input_keys: [...options.excludedInputKeys], failed_input_keys: [...options.failedInputKeys], coverage_complete: options.failedInputKeys.length === 0 && options.requiredInputKeys.every((key) => fragments.some((fragment) => fragment.fragment_id === key)),
  };
  const unsigned = {
    envelope_version: AI_INPUT_SCHEMA_VERSION,
    task: { task_definition: options.taskDefinition, task_definition_version: options.taskDefinitionVersion, prompt_package_version: options.promptPackageVersion, input_contract_version: options.inputContractVersion, output_contract_version: options.outputContractVersion, ai_evidence_policy_version: options.aiEvidencePolicyVersion, context_plan_version: options.contextPlanVersion },
    scope: scopeWithDigest,
    inputs,
    coverage,
    limits: { max_context_bytes: options.limits.maxContextBytes, max_output_tokens: options.limits.maxOutputTokens, timeout_seconds: options.limits.timeoutSeconds, max_cost_minor_units: options.limits.maxCostMinorUnits },
    request_nonce: crypto.randomBytes(24).toString("base64url"),
  };
  return { ...unsigned, canonical_input_digest: digest(unsigned) };
}

export function canRouteMaterial(material: { provenanceClass: MaterialProvenanceClass; confidentialityClass: ConfidentialityClass }, capability: { provider: string; capabilityVerified: boolean; processingEvidenceVerified: boolean; restrictedApproved?: boolean }): boolean {
  if (capability.provider !== HELLOX_PROVIDER) return false;
  if (["public", "internal"].includes(material.confidentialityClass)) return true;
  if (!capability.capabilityVerified || !capability.processingEvidenceVerified) return false;
  if (material.confidentialityClass === "restricted" && capability.restrictedApproved !== true) return false;
  return ["confidential", "restricted"].includes(material.confidentialityClass);
}

const supportStatus = z.enum(["supported", "challenged", "conflicted", "insufficient_support", "unresolved_locator", "coverage_incomplete", "rights_blocked", "out_of_scope", "not_applicable"]);
const evidenceLink = z.object({ fragment_id: z.string().min(1).max(160), relationship: z.enum(["supports", "challenges"]), proposition_scope: z.string().min(1).max(500), qualification: z.string().max(500).nullable(), limitation: z.string().max(500).nullable() }).strict();
const conflict = z.object({ conflict_key: z.string().min(1).max(160), dimension: z.enum(["definition", "period", "unit", "currency", "sign", "value", "source_version", "scope", "meaning"]), competing_refs: z.array(z.string().min(1).max(160)).min(2).max(20), affected_scope: z.string().min(1).max(500), unresolved_alternatives: z.array(z.string().min(1).max(500)).min(2).max(20), affected_uses: z.array(z.string().min(1).max(240)).min(1).max(20) }).strict();
const abstention = z.object({ abstention_key: z.string().min(1).max(160), affected_scope: z.string().min(1).max(500), reason_codes: z.array(z.enum(["evidence_missing", "evidence_conflicted", "definition_unclear", "period_unclear", "unit_or_currency_unclear", "coverage_incomplete", "locator_unresolved", "rights_blocked", "source_stale", "source_not_reliance_eligible", "deterministic_validity_missing", "outside_task_scope"])).min(1).max(20), unsupported_propositions: z.array(z.string().max(500)).max(50), missing_inputs: z.array(z.string().max(160)).max(50), output_ceiling: z.object({ code: z.string().min(1).max(160) }).strict(), permitted_partial_scope: z.array(z.string().max(240)).max(50), smallest_recovery_action: z.string().min(1).max(500), resume_condition: z.string().min(1).max(500) }).strict();
const omission = z.object({ omission_key: z.string().min(1).max(160), affected_scope: z.string().min(1).max(500), reason_code: z.enum(["outside_task_scope", "not_applicable", "duplicate_of_candidate", "independently_invalid", "coverage_incomplete", "rights_blocked"]), explanation: z.string().min(1).max(500), recovery_action: z.string().max(500).nullable(), material: z.literal(false) }).strict();
const requiredHumanDecision = z.object({ decision_type: z.string().min(1).max(160), question: z.string().min(1).max(500), exact_object_and_version_refs: z.array(z.string().min(1).max(200)).min(1).max(20), scope: z.string().min(1).max(500), purpose: z.string().min(1).max(240), audience: z.string().min(1).max(240), alternatives: z.array(z.object({ key: z.string().min(1).max(120), effect: z.string().min(1).max(500) }).strict()).min(2).max(20), evidence_refs: z.array(z.string().min(1).max(160)).max(30), deterministic_check_refs: z.array(z.string().min(1).max(160)).max(30), recommended_option: z.string().min(1).max(120), conditions: z.array(z.string().min(1).max(500)).max(20), invalidation_triggers: z.array(z.string().min(1).max(500)).max(20) }).strict();
const commonResult = z.object({ candidate_key: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/), evidence_links: z.array(evidenceLink).max(30), support_status: supportStatus, conflicts: z.array(conflict).max(20), uncertainty_flags: z.array(z.enum(["evidence_missing", "evidence_conflicted", "definition_unclear", "period_unclear", "unit_or_currency_unclear", "coverage_incomplete", "locator_unresolved", "rights_blocked", "source_stale", "source_not_reliance_eligible", "deterministic_validity_missing", "outside_task_scope"])).max(20), limitations: z.array(z.string().min(1).max(500)).max(20), required_human_decision: requiredHumanDecision.nullable(),
}).strict();
const taskPayloads: Record<TaskDefinition, z.ZodType<Record<string, unknown>>> = {
  source_claim_extraction: z.object({ proposition: z.string().min(1).max(2000), attribution: z.string().min(1).max(240), definition: z.string().min(1).max(500), period: z.string().min(1).max(120), unit: z.string().min(1).max(80), currency: z.string().min(1).max(20), sign: z.enum(["positive", "negative", "not_applicable", "unknown"]), value: z.number().finite().nullable(), text: z.string().max(2000).nullable(), source_fragment_id: z.string().min(1).max(160), qualification: z.string().max(500).nullable() }).strict() as z.ZodType<Record<string, unknown>>,
  claim_evidence_linking: z.object({ proposition_key: z.string().min(1).max(160), fragment_id: z.string().min(1).max(160), relationship: z.enum(["supports", "challenges"]), supported_scope: z.string().min(1).max(500), qualification: z.string().max(500).nullable(), relationship_limitation: z.string().max(500).nullable() }).strict() as z.ZodType<Record<string, unknown>>,
  material_source_conflict_analysis: z.object({ conflict_key: z.string().min(1).max(160), dimension: z.enum(["definition", "period", "unit", "currency", "sign", "value", "source_version", "scope", "meaning"]), competing_refs: z.array(z.string().min(1).max(160)).min(2).max(20), affected_scope: z.string().min(1).max(500), unresolved_alternatives: z.array(z.string().min(1).max(500)).min(2).max(20), affected_uses: z.array(z.string().min(1).max(240)).min(1).max(20) }).strict() as z.ZodType<Record<string, unknown>>,
  contract_repair: z.object({ original_candidate_key: z.string().min(1).max(160), repaired_payload: z.record(z.string(), z.unknown()) }).strict() as z.ZodType<Record<string, unknown>>,
};

export function validateAiOutput(value: unknown, envelope: AiInputEnvelope): { ok: true } | { ok: false; code: string; pointer?: string } {
  const base = z.object({ status: z.enum(["complete", "partial", "abstained"]), schema_version: z.literal(AI_OUTPUT_SCHEMA_VERSION), task_definition: z.enum(taskDefinitions), scope_digest_echo: z.string(), results: z.array(z.record(z.string(), z.unknown())).max(200), abstentions: z.array(z.record(z.string(), z.unknown())).max(200), omissions: z.array(z.record(z.string(), z.unknown())).max(200) }).strict().safeParse(value);
  if (!base.success) return { ok: false, code: "schema_invalid", pointer: base.error.issues[0]?.path.join(".") };
  if (base.data.task_definition !== envelope.task.task_definition || base.data.scope_digest_echo !== envelope.scope.scope_digest) return { ok: false, code: "scope_or_task_mismatch" };
  const resultSchema = commonResult.extend({ payload: taskPayloads[envelope.task.task_definition] });
  const results = z.array(resultSchema).safeParse(base.data.results);
  if (!results.success) return { ok: false, code: "schema_invalid", pointer: results.error.issues[0]?.path.join(".") };
  const abstentions = z.array(abstention).max(200).safeParse(base.data.abstentions);
  if (!abstentions.success) return { ok: false, code: "schema_invalid", pointer: `abstentions.${abstentions.error.issues[0]?.path.join(".") ?? ""}` };
  const omissions = z.array(omission).max(200).safeParse(base.data.omissions);
  if (!omissions.success) return { ok: false, code: "schema_invalid", pointer: `omissions.${omissions.error.issues[0]?.path.join(".") ?? ""}` };
  if (base.data.status === "complete" && (base.data.abstentions.length > 0 || base.data.omissions.length > 0)) return { ok: false, code: "complete_with_omissions" };
  if (base.data.status === "partial" && (results.data.length === 0 || (base.data.abstentions.length === 0 && base.data.omissions.length === 0))) return { ok: false, code: "partial_without_boundary" };
  if (base.data.status === "abstained" && (results.data.length > 0 || base.data.abstentions.length === 0)) return { ok: false, code: "abstention_status_invalid" };
  const fragments = new Set(envelope.inputs.source_fragments.map((fragment) => fragment.fragment_id));
  const candidateKeys = new Set<string>();
  for (const [index, result] of results.data.entries()) {
    if (candidateKeys.has(result.candidate_key)) return { ok: false, code: "duplicate_candidate_key", pointer: `results.${index}.candidate_key` };
    candidateKeys.add(result.candidate_key);
    if (containsForbiddenAuthority(result.payload)) return { ok: false, code: "authority_field_forbidden", pointer: `results.${index}.payload` };
    if (result.required_human_decision && containsForbiddenAuthority(result.required_human_decision)) return { ok: false, code: "authority_field_forbidden", pointer: `results.${index}.required_human_decision` };
    for (const link of result.evidence_links) if (!fragments.has(link.fragment_id)) return { ok: false, code: "foreign_locator", pointer: `results.${index}.evidence_links` };
    if (["supported", "challenged"].includes(result.support_status) && result.evidence_links.length === 0) return { ok: false, code: "material_result_without_evidence", pointer: `results.${index}.evidence_links` };
    const payload = result.payload as Record<string, unknown>;
    const payloadFragment = payload.source_fragment_id ?? payload.fragment_id;
    if (typeof payloadFragment === "string" && !fragments.has(payloadFragment)) return { ok: false, code: "foreign_locator", pointer: `results.${index}.payload` };
    if (envelope.task.task_definition === "claim_evidence_linking" && typeof payload.proposition_key === "string" && !fragments.has(payload.proposition_key)) return { ok: false, code: "foreign_proposition", pointer: `results.${index}.payload.proposition_key` };
    if (envelope.task.task_definition === "material_source_conflict_analysis") {
      const refs = (payload.competing_refs ?? []) as unknown[];
      if (refs.some((ref) => typeof ref !== "string" || !fragments.has(ref))) return { ok: false, code: "foreign_locator", pointer: `results.${index}.payload.competing_refs` };
    }
    for (const conflictItem of result.conflicts) if (conflictItem.competing_refs.some((ref) => !fragments.has(ref))) return { ok: false, code: "foreign_locator", pointer: `results.${index}.conflicts` };
  }
  return { ok: true };
}

function semanticProjection(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(semanticProjection);
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  return Object.fromEntries(Object.entries(record).filter(([key]) => !["schema_version", "scope_digest_echo"].includes(key)).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, semanticProjection(item)]));
}

function containsForbiddenAuthority(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenAuthority);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(([key, item]) => ["fact_id", "fact", "assumption_approved", "approval_status", "human_decision_occurred", "professional_usability", "readiness", "external_action", "process_event"].includes(key) || containsForbiddenAuthority(item));
}

export function detectRepairSemanticChange(original: unknown, repaired: unknown): boolean { return canonical(semanticProjection(original)) !== canonical(semanticProjection(repaired)); }

export function stableDigest(value: unknown) { return digest(value); }
