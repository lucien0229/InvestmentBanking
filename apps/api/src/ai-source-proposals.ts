import type pg from "pg";
import crypto from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { canonicalDigest } from "./commerce.js";
import { Database } from "./database.js";
import {
  AI_OUTPUT_SCHEMA_VERSION,
  taskDefinitions, workbookAiTasks, aiProviderOutputSchema,
  AI_ORIGIN,
  buildAiInputEnvelope,
  canRouteMaterial,
  detectRepairSemanticChange,
  stableDigest,
  validateAiOutput,
  type AiInputEnvelope,
  type AiOutput,
  type TaskDefinition,
} from "../../../packages/ai-contracts/src/index.js";

const uuid = z.string().uuid();
const problemType = "https://investment-banking.local/problems";

export type AiSourceFragment = {
  fragment_id: string;
  run_fragment_id?: string;
  source_record_id: string;
  source_record_version: number;
  source_record_digest: string;
  representation_id: string;
  representation_digest: string;
  locator: Record<string, unknown>;
  content_digest: string;
  coverage_code: string;
  content_text: string;
  provenance_class: "synthetic" | "real";
  confidentiality_class: "public" | "internal" | "confidential" | "restricted";
  de_identification_posture: string;
  rights_assessment_id: string;
};

export interface AiProvider {
  readonly providerCode: "hellox";
  invoke(input: { taskDefinition: TaskDefinition; envelope: AiInputEnvelope; fragments: AiSourceFragment[]; onRequest?: (request: unknown) => void | Promise<void> }): Promise<{ response: unknown; providerRequestId: string; model: string; usage: Record<string, unknown>; costMinorUnits: number }>;
}

/** OpenAI-compatible HelloX provider used only when an API key is configured. */
type CompletionResponse = { id?: string; model?: string; usage?: Record<string, unknown>; choices?: Array<{ message?: { content?: string | null } }> };

export async function readCompletionStream(response: Response): Promise<CompletionResponse> {
  if (!response.body) throw new Error("ai_provider_empty_response");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const result: CompletionResponse = {};
  let pending = "", content = "", received = 0, completed = false;
  try {
    stream: while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      received += chunk.value.byteLength;
      if (received > 2 * 1024 * 1024) throw new Error("ai_provider_response_limit");
      pending = (pending + decoder.decode(chunk.value, { stream: true })).replaceAll("\r\n", "\n");
      let boundary: number;
      while ((boundary = pending.indexOf("\n\n")) >= 0) {
        const event = pending.slice(0, boundary); pending = pending.slice(boundary + 2);
        const data = event.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n");
        if (!data) continue;
        if (data === "[DONE]") { completed = true; break stream; }
        const value = JSON.parse(data) as { error?: unknown; id?: string; model?: string; usage?: Record<string, unknown>; choices?: Array<{ delta?: { content?: string } }> };
        if (value.error) throw new Error("ai_provider_stream_failed");
        if (value.id) result.id = value.id;
        if (value.model) result.model = value.model;
        if (value.usage) result.usage = value.usage;
        const delta = value.choices?.[0]?.delta?.content;
        if (typeof delta === "string") content += delta;
      }
    }
  } finally { await reader.cancel().catch(() => undefined); }
  if (!completed) throw new Error("ai_provider_incomplete_stream");
  return { ...result, choices: [{ message: { content } }] };
}

export class HelloXAiProvider implements AiProvider {
  readonly providerCode = "hellox" as const;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly reasoningEffort: string;

  constructor(options: { baseUrl?: string; apiKey?: string; model?: string } = {}) {
    this.baseUrl = (options.baseUrl ?? process.env.HELLOX_BASE_URL ?? "https://www.hellox.cloud").replace(/\/$/, "");
    this.apiKey = options.apiKey ?? process.env.HELLOX_API_KEY ?? "";
    this.model = options.model ?? process.env.HELLOX_MODEL ?? "gpt-5.6-sol";
    this.reasoningEffort = process.env.HELLOX_REASONING_EFFORT ?? "xhigh";
  }

  async invoke(input: { taskDefinition: TaskDefinition; envelope: AiInputEnvelope; fragments: AiSourceFragment[]; onRequest?: (request: unknown) => void | Promise<void> }) {
    if (!this.apiKey) throw new Error("ai_provider_unconfigured");
    const system = [
      "You are a proposal-only source-analysis worker.",
      "Return exactly one JSON object and no markdown; do not rename, omit, or add top-level fields.",
      "Never invent facts, authority, approvals, decisions, or locators.",
      "Every result must include origin=ai_generated and only cite the supplied run_fragment_id values.",
      "Envelope status must satisfy these exact invariants: complete requires at least one result and empty abstentions and omissions; partial requires at least one result AND at least one top-level abstention or omission; abstained requires zero results AND at least one top-level abstention. Result-level limitations or uncertainty_flags do not satisfy a partial boundary. If visual coverage is missing, explicitly record its scope and smallest recovery condition in the top-level abstentions or omissions using the supplied schema. Never use partial with both arrays empty.",
      `The task is ${input.taskDefinition}. Follow the task contract exactly. The required top-level shape is {status, schema_version, task_definition, scope_digest_echo, results, abstentions, omissions}. Use schema_version=1.0.0, task_definition=${input.taskDefinition}, and scope_digest_echo=${input.envelope.scope.scope_digest}.`,
      "For source_claim_extraction payload use proposition, attribution, definition, period, unit, currency, sign, value, text, source_fragment_id, qualification.",
      "For claim_evidence_linking payload use proposition_key, fragment_id, relationship, supported_scope, qualification, relationship_limitation. proposition_key is the supplied run_fragment_id containing the proposition, not a newly invented Claim key. fragment_id is the supplied run_fragment_id of the supporting or challenging evidence.",
      "For material_source_conflict_analysis payload use conflict_key, dimension, competing_refs, affected_scope, unresolved_alternatives, affected_uses.",
      "For financial_semantic_extraction payload use proposition, definition, period, unit, currency, sign, precision, value_text, actual_forecast, source_fragment_id, source_locator, qualification.",
      "For financial_normalization_mapping payload use mapping_key, source_fragment_id, source_definition, canonical_definition, canonical_taxonomy_version, period, unit, currency, sign, precision, value_text, actual_forecast, decision_id, assumption_id, mapping_notes.",
      "For sell_side_analysis_draft payload use question, conclusion, supporting_fact_ids, supporting_assumption_ids, supporting_calculation_run_ids, supporting_evidence_ids, limitations, intended_use, audience.",
      "Workbook tasks must use the supplied exact Revision, manifest regions, artifact IDs and strict task payload schema. Findings are proposals; never assert readiness, professional approval or resolved QC. Missing visual or source coverage requires abstention.",
      "For workbook_commentary_draft, payload.citations contains only this request's fragments[].run_fragment_id values (the same IDs as envelope.inputs.source_fragments[].fragment_id), never Source Record, Fact, Calculation Run, Artifact or prior-run fragment IDs. Put exact Calculation Run IDs only in payload.refresh_calculation_run_ids. Copy citation IDs verbatim from the same pre-issued fragments used by evidence_links; if no supplied fragment supports the commentary, use citations=[] and explain that limitation or abstain. Never invent or translate an ID.",
      "For workbook artifact-only observations, support_status=not_applicable denotes that source-fragment support is not being assessed; retain exact artifact/region IDs and explain the limitation. Never mark a result supported or challenged without at least one supplied run_fragment_id that actually supports that proposition. If the necessary evidence is absent, abstain instead of inventing a link.",
      "For native_reader_semantic_parity_review copy native_locator.sheet and native_locator.range verbatim from the matching native artifact region. reader_locator.page must belong to that same region's reader_pages; reader_locator.region_label must equal its region_key. A physically plausible output cell is not a substitute for a pre-issued locator. Keep candidate_key to 1–80 ASCII letters, digits, dots, underscores or hyphens, starting with a letter or digit.",
      "For valuation_commentary_draft payload use valuation_question, commentary, model_version_id, calculation_run_ids, assumption_ids, evidence_ids, scenario_version_ids, limitations.",
      "For semantic_change_impact_proposal payload use candidate_key, affected_object_kind, affected_object_id, impact_code, proposed_action, rationale. Only propose objects already present in the deterministic closure; never create or modify authoritative state.",
      "Each result also requires candidate_key, origin, evidence_links, support_status, conflicts, uncertainty_flags, limitations, required_human_decision.",
      "If the contract cannot be satisfied, return status=abstained with a typed abstentions entry instead of inventing fields.",
      `Required JSON Schema: ${JSON.stringify(aiProviderOutputSchema(input.taskDefinition,input.envelope.scope.scope_digest))}`,
    ].join(" ");
    const user = JSON.stringify({ envelope: input.envelope, fragments: input.fragments.map((fragment) => ({ run_fragment_id: fragment.run_fragment_id, locator: fragment.locator, content_text: fragment.content_text })) });
    // Keep the provider request bounded even when the upstream ignores the
    // envelope's larger theoretical ceiling. This prevents an unbounded
    // completion from exhausting the provider/gateway timeout while leaving
    // the model and reasoning posture unchanged.
    const providerMaxOutputTokens = 8000;
    const requestBody = { model: this.model, reasoning_effort: this.reasoningEffort, temperature: 0, max_tokens: Math.min(input.envelope.limits.max_output_tokens, providerMaxOutputTokens), response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }], stream: true, stream_options: { include_usage: true } };
    await input.onRequest?.({ method: "POST", url: `${this.baseUrl}/v1/chat/completions`, body: requestBody });
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(600_000),
    });
    if (!response.ok) throw new Error(`ai_provider_http_${response.status}`);
    const body = await readCompletionStream(response);
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new Error("ai_provider_empty_response");
    let parsed: unknown;
    try { parsed = JSON.parse(content.replace(/^```json\s*/i, "").replace(/\s*```$/i, "")); } catch { throw new Error("ai_provider_invalid_json"); }
    // The governed completion seam validates and retains the protected raw response.
    return { response: parsed, providerRequestId: body.id ?? `hellox-${crypto.randomUUID()}`, model: body.model ?? this.model, usage: body.usage ?? {}, costMinorUnits: 0 };
  }
}

export interface AiSourceProposalRuntimeOptions {
  provider?: AiProvider;
}


const outputUncertaintyFlags = new Set(["evidence_missing", "evidence_conflicted", "definition_unclear", "period_unclear", "unit_or_currency_unclear", "coverage_incomplete", "locator_unresolved", "rights_blocked", "source_stale", "source_not_reliance_eligible", "deterministic_validity_missing", "outside_task_scope"]);

function normalizeProviderResponse(value: unknown, taskDefinition: TaskDefinition, scopeDigest: string, fallbackFragmentId = ""): unknown {
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  const rawResults = Array.isArray(source.results) ? source.results : Array.isArray(source.claims) ? source.claims : [];
  const results = rawResults.map((raw, index) => {
    const item = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const rawPayload = (item.payload && typeof item.payload === "object" ? item.payload : item.claim && typeof item.claim === "object" ? item.claim : item) as Record<string, unknown>;
    const nestedEvidence = Array.isArray(item.evidence) && item.evidence[0] && typeof item.evidence[0] === "object" ? item.evidence[0] as Record<string, unknown> : {};
    const stringify = (item: unknown, fallback: string) => typeof item === "string" ? item : item == null ? fallback : JSON.stringify(item);
    const sourceFragmentId = String(rawPayload.source_fragment_id ?? rawPayload.run_fragment_id ?? nestedEvidence.run_fragment_id ?? nestedEvidence.fragment_id ?? (taskDefinition.startsWith("financial_") || taskDefinition.endsWith("_draft") ? "" : fallbackFragmentId));
    const payload = taskDefinition === "source_claim_extraction" ? { proposition: stringify(rawPayload.proposition ?? rawPayload.claim_text, "Unspecified source statement"), attribution: stringify(rawPayload.attribution, "not_provided"), definition: stringify(rawPayload.definition, "not_provided"), period: stringify(rawPayload.period, "unknown"), unit: stringify(rawPayload.unit, "not_applicable"), currency: stringify(rawPayload.currency, "not_applicable"), sign: ["positive", "negative", "not_applicable", "unknown"].includes(String(rawPayload.sign)) ? rawPayload.sign : "unknown", value: typeof rawPayload.value === "number" ? rawPayload.value : null, text: rawPayload.text == null ? null : stringify(rawPayload.text, ""), source_fragment_id: sourceFragmentId, qualification: rawPayload.qualification == null ? null : stringify(rawPayload.qualification, "") } : taskDefinition === "claim_evidence_linking" ? { proposition_key: String(rawPayload.proposition_key ?? ""), fragment_id: String(rawPayload.fragment_id ?? rawPayload.run_fragment_id ?? nestedEvidence.run_fragment_id ?? nestedEvidence.fragment_id ?? ""), relationship: rawPayload.relationship === "challenges" ? "challenges" : "supports", supported_scope: stringify(rawPayload.supported_scope ?? rawPayload.relationship_limitation, "source statement"), qualification: rawPayload.qualification == null ? null : stringify(rawPayload.qualification, ""), relationship_limitation: rawPayload.relationship_limitation == null ? null : stringify(rawPayload.relationship_limitation, "") } : taskDefinition === "financial_semantic_extraction" ? { proposition: stringify(rawPayload.proposition, "Unspecified financial statement"), definition: stringify(rawPayload.definition, "not_provided"), period: stringify(rawPayload.period, "unknown"), unit: stringify(rawPayload.unit, "not_applicable"), currency: stringify(rawPayload.currency, "not_applicable"), sign: ["positive", "negative", "not_applicable", "unknown"].includes(String(rawPayload.sign)) ? rawPayload.sign : "unknown", precision: typeof rawPayload.precision === "number" ? Math.trunc(rawPayload.precision) : 0, value_text: rawPayload.value_text == null ? null : stringify(rawPayload.value_text, ""), actual_forecast: ["actual", "forecast", "unknown"].includes(String(rawPayload.actual_forecast)) ? rawPayload.actual_forecast : "unknown", source_fragment_id: sourceFragmentId, source_locator: rawPayload.source_locator && typeof rawPayload.source_locator === "object" ? rawPayload.source_locator : {}, qualification: rawPayload.qualification == null ? null : stringify(rawPayload.qualification, "") } : taskDefinition === "financial_normalization_mapping" ? { mapping_key: String(rawPayload.mapping_key ?? `mapping-${index + 1}`), source_fragment_id: sourceFragmentId, source_definition: stringify(rawPayload.source_definition, "not_provided"), canonical_definition: stringify(rawPayload.canonical_definition, "not_provided"), canonical_taxonomy_version: stringify(rawPayload.canonical_taxonomy_version, "financial-taxonomy.v1"), period: stringify(rawPayload.period, "unknown"), unit: stringify(rawPayload.unit, "not_applicable"), currency: stringify(rawPayload.currency, "not_applicable"), sign: ["positive", "negative", "not_applicable", "unknown"].includes(String(rawPayload.sign)) ? rawPayload.sign : "unknown", precision: typeof rawPayload.precision === "number" ? Math.trunc(rawPayload.precision) : 0, value_text: rawPayload.value_text == null ? null : stringify(rawPayload.value_text, ""), actual_forecast: ["actual", "forecast", "unknown"].includes(String(rawPayload.actual_forecast)) ? rawPayload.actual_forecast : "unknown", decision_id: rawPayload.decision_id == null ? null : String(rawPayload.decision_id), assumption_id: rawPayload.assumption_id == null ? null : String(rawPayload.assumption_id), mapping_notes: stringify(rawPayload.mapping_notes, "Requires Banker review; no normalization is authoritative.") } : taskDefinition === "sell_side_analysis_draft" ? { question: stringify(rawPayload.question, "What changed?"), conclusion: stringify(rawPayload.conclusion, "The source context remains proposal-only."), supporting_fact_ids: Array.isArray(rawPayload.supporting_fact_ids) ? rawPayload.supporting_fact_ids.map(String) : [], supporting_assumption_ids: Array.isArray(rawPayload.supporting_assumption_ids) ? rawPayload.supporting_assumption_ids.map(String) : [], supporting_calculation_run_ids: Array.isArray(rawPayload.supporting_calculation_run_ids) ? rawPayload.supporting_calculation_run_ids.map(String) : [], supporting_evidence_ids: Array.isArray(rawPayload.supporting_evidence_ids) ? rawPayload.supporting_evidence_ids.map(String) : [], limitations: Array.isArray(rawPayload.limitations) ? rawPayload.limitations.map(String) : ["Proposal only; controlled inputs and review remain required."], intended_use: stringify(rawPayload.intended_use, "internal_analysis"), audience: stringify(rawPayload.audience, "individual_banker") } : taskDefinition === "valuation_commentary_draft" ? { valuation_question: stringify(rawPayload.valuation_question, "What is the valuation implication?"), commentary: stringify(rawPayload.commentary, "The valuation implication remains a reviewable proposal."), model_version_id: rawPayload.model_version_id == null ? null : String(rawPayload.model_version_id), calculation_run_ids: Array.isArray(rawPayload.calculation_run_ids) ? rawPayload.calculation_run_ids.map(String) : [], assumption_ids: Array.isArray(rawPayload.assumption_ids) ? rawPayload.assumption_ids.map(String) : [], evidence_ids: Array.isArray(rawPayload.evidence_ids) ? rawPayload.evidence_ids.map(String) : [], scenario_version_ids: Array.isArray(rawPayload.scenario_version_ids) ? rawPayload.scenario_version_ids.map(String) : [], limitations: Array.isArray(rawPayload.limitations) ? rawPayload.limitations.map(String) : ["Proposal only; readiness and external use remain blocked."] } : rawPayload;
    const links = Array.isArray(item.evidence_links) ? item.evidence_links : Array.isArray(item.evidence) ? item.evidence : [];
    const evidenceLinks = links.map((link) => { const e = (link && typeof link === "object" ? link : {}) as Record<string, unknown>; return { fragment_id: String(e.fragment_id ?? e.run_fragment_id ?? sourceFragmentId ?? rawPayload.fragment_id ?? ""), relationship: e.relationship === "challenges" ? "challenges" : "supports", proposition_scope: stringify(e.proposition_scope ?? e.supported_scope, "source statement"), qualification: e.qualification == null ? null : stringify(e.qualification, ""), limitation: e.limitation == null ? (e.relationship_limitation == null ? null : stringify(e.relationship_limitation, "")) : stringify(e.limitation, "") }; });
    const support = String(item.support_status ?? "supported");
    const supportStatus = ({ directly_supported: "supported", direct_support: "supported", supported_by_source: "supported", unsupported: "insufficient_support" } as Record<string, string>)[support] ?? support;
    if (evidenceLinks.length === 0 && sourceFragmentId && ["supported", "challenged"].includes(supportStatus)) evidenceLinks.push({ fragment_id: sourceFragmentId, relationship: supportStatus === "challenged" ? "challenges" : "supports", proposition_scope: "The source statement supplied in the fragment.", qualification: null, limitation: "Normalized from the provider response; review remains required." });
    const humanDecision = item.required_human_decision && typeof item.required_human_decision === "object" && Object.keys(item.required_human_decision).length > 0 ? item.required_human_decision : null;
    return { candidate_key: String(item.candidate_key ?? item.proposition_key ?? `candidate-${index + 1}`), origin: AI_ORIGIN, payload, evidence_links: evidenceLinks, support_status: supportStatus, conflicts: Array.isArray(item.conflicts) ? item.conflicts : [], uncertainty_flags: Array.isArray(item.uncertainty_flags) ? item.uncertainty_flags.filter((flag): flag is string => typeof flag === "string" && outputUncertaintyFlags.has(flag)) : [], limitations: Array.isArray(item.limitations) ? item.limitations.map(String) : [], required_human_decision: humanDecision };
  });
  return { status: source.status === "completed" ? "complete" : source.status === "succeeded" ? "complete" : source.status ?? (results.length ? "complete" : "abstained"), schema_version: AI_OUTPUT_SCHEMA_VERSION, task_definition: taskDefinition, scope_digest_echo: String(source.scope_digest_echo ?? scopeDigest), results, abstentions: Array.isArray(source.abstentions) ? source.abstentions : [], omissions: Array.isArray(source.omissions) ? source.omissions : [] };
}

/** Deterministic local provider double. It never calls a network or external tool. */
export class SyntheticAiProvider implements AiProvider {
  readonly providerCode = "hellox" as const;

  async invoke(input: { taskDefinition: TaskDefinition; envelope: AiInputEnvelope; fragments: AiSourceFragment[]; onRequest?: (request: unknown) => void | Promise<void> }) {
    const { taskDefinition, envelope, fragments } = input;
    const injection = fragments.filter((fragment) => /ignore\s+(?:all\s+)?previous|system\s+prompt|call\s+(?:a\s+)?tool|send\s+(?:an\s+)?email|reveal\s+secret/i.test(fragment.content_text));
    const fragmentRef = (fragment: AiSourceFragment) => fragment.run_fragment_id ?? fragment.fragment_id;
    const abstentions = injection.map((fragment, index) => ({
      abstention_key: `injection-${index + 1}`,
      affected_scope: fragmentRef(fragment),
      reason_codes: ["outside_task_scope"],
      unsupported_propositions: [],
      missing_inputs: [fragmentRef(fragment)],
      output_ceiling: { code: "proposal_only" },
      permitted_partial_scope: [],
      smallest_recovery_action: "Remove the instruction-like content or provide a clean Source Fragment.",
      resume_condition: "A clean, eligible fragment is available.",
    }));
    const eligible = fragments.filter((fragment) => !injection.includes(fragment));
    const results: AiOutput["results"] = [];
    if (taskDefinition === "source_claim_extraction") {
      eligible.forEach((fragment, index) => results.push({
        candidate_key: `claim-${index + 1}`, origin: AI_ORIGIN,
        payload: { proposition: fragment.content_text.slice(0, 2000), attribution: "source_fragment", definition: "source statement (unclassified)", period: "unknown", unit: "not_applicable", currency: "not_applicable", sign: "unknown", value: null, text: fragment.content_text.slice(0, 2000), source_fragment_id: fragmentRef(fragment), qualification: "Requires Banker review; this is not a Fact." },
        evidence_links: [{ fragment_id: fragmentRef(fragment), relationship: "supports", proposition_scope: "The exact source statement supplied in this fragment.", qualification: null, limitation: "AI does not establish truth, completeness, or professional usability." }],
        support_status: "supported",
        conflicts: [], uncertainty_flags: [], limitations: ["Proposal only; not a Fact or approval."], required_human_decision: null,
      }));
    } else if (taskDefinition === "claim_evidence_linking") {
      eligible.forEach((fragment, index) => results.push({
        candidate_key: `evidence-link-${index + 1}`, origin: AI_ORIGIN,
        payload: { proposition_key: fragmentRef(fragment), fragment_id: fragmentRef(fragment), relationship: "supports", supported_scope: fragment.content_text.slice(0, 500), qualification: null, relationship_limitation: "Relationship remains an Evidence Candidate pending deterministic checks." },
        evidence_links: [{ fragment_id: fragmentRef(fragment), relationship: "supports", proposition_scope: fragment.content_text.slice(0, 500), qualification: null, limitation: null }],
        support_status: "supported",
        conflicts: [], uncertainty_flags: [], limitations: ["Evidence Candidate only; acceptance is a separate control-plane action."], required_human_decision: null,
      }));
    } else if (taskDefinition === "material_source_conflict_analysis" && eligible.length >= 2) {
      const refs = eligible.slice(0, 20).map(fragmentRef);
      results.push({
        candidate_key: "conflict-1", origin: AI_ORIGIN,
        payload: { conflict_key: "conflict-1", dimension: "meaning", competing_refs: refs, affected_scope: "The competing source statements in this Source Packet.", unresolved_alternatives: ["Statement A may be applicable.", "Statement B may be applicable."], affected_uses: ["internal_analysis", "controlled_export"] },
        evidence_links: refs.map((fragmentId) => ({ fragment_id: fragmentId, relationship: "challenges" as const, proposition_scope: "Competing source statement.", qualification: null, limitation: "No winner selected." })),
        support_status: "conflicted",
        conflicts: [], uncertainty_flags: ["evidence_conflicted"], limitations: ["All alternatives remain unresolved; no winner is selected."], required_human_decision: null,
      });
    } else if (taskDefinition === "financial_semantic_extraction") {
      if (eligible.length > 0) abstentions.push({ abstention_key: "ambiguous-financial-context", affected_scope: "financial_semantic_extraction", reason_codes: ["definition_unclear", "period_unclear", "unit_or_currency_unclear"], unsupported_propositions: [], missing_inputs: ["definition", "period", "unit", "currency"], output_ceiling: { code: "proposal_only" }, permitted_partial_scope: [], smallest_recovery_action: "Provide a source fragment with explicit definition, period, unit, and currency or route the proposal to Banker review.", resume_condition: "The financial context is explicit enough to produce a bounded semantic candidate." });
    } else if (taskDefinition === "financial_normalization_mapping") {
      if (eligible.length > 0) abstentions.push({ abstention_key: "normalization-input-required", affected_scope: "financial_normalization_mapping", reason_codes: ["definition_unclear", "period_unclear", "unit_or_currency_unclear"], unsupported_propositions: [], missing_inputs: ["canonical_definition", "period", "unit", "currency"], output_ceiling: { code: "proposal_only" }, permitted_partial_scope: [], smallest_recovery_action: "Provide accepted semantic context before proposing a canonical mapping.", resume_condition: "A Banker-approved semantic input is available for the exact source fragment." });
    } else if (taskDefinition === "sell_side_analysis_draft") {
      const factId = (envelope.inputs.facts[0] as { id?: unknown } | undefined)?.id;
      const assumptionId = (envelope.inputs.assumptions[0] as { id?: unknown } | undefined)?.id;
      if (typeof factId !== "string" && typeof assumptionId !== "string") abstentions.push({ abstention_key: "controlled-input-required", affected_scope: "sell_side_analysis_draft", reason_codes: ["deterministic_validity_missing"], unsupported_propositions: [], missing_inputs: ["accepted_fact_or_assumption"], output_ceiling: { code: "proposal_only" }, permitted_partial_scope: [], smallest_recovery_action: "Provide accepted controlled inputs for the exact Deal before drafting analysis.", resume_condition: "The envelope contains at least one accepted Fact or Assumption." });
      else eligible.forEach((fragment, index) => results.push({
        candidate_key: `analysis-draft-${index + 1}`, origin: AI_ORIGIN,
        payload: { question: "What does this source context indicate?", conclusion: fragment.content_text.slice(0, 2000), supporting_fact_ids: typeof factId === "string" ? [factId] : [], supporting_assumption_ids: typeof assumptionId === "string" ? [assumptionId] : [], supporting_calculation_run_ids: [], supporting_evidence_ids: typeof (envelope.inputs.evidence[0] as { id?: unknown } | undefined)?.id === "string" ? [String((envelope.inputs.evidence[0] as { id: string }).id)] : [], limitations: ["Proposal only; controlled inputs and Banker review remain required."], intended_use: "internal_analysis", audience: "individual_banker" },
        evidence_links: [{ fragment_id: fragmentRef(fragment), relationship: "supports", proposition_scope: "The source context supplied in this fragment.", qualification: null, limitation: "AI draft cannot establish authority, readiness, or professional usability." }],
        support_status: "supported", conflicts: [], uncertainty_flags: [], limitations: ["Proposal only; no authority is created."], required_human_decision: null,
      }));
    } else if (taskDefinition === "valuation_commentary_draft") {
      const findNestedId = (value: unknown, predicate: (record: Record<string, unknown>) => boolean): string | null => { if (Array.isArray(value)) { for (const item of value) { const found = findNestedId(item, predicate); if (found) return found; } return null; } if (!value || typeof value !== "object") return null; const record = value as Record<string, unknown>; if (typeof record.id === "string" && predicate(record)) return record.id; for (const item of Object.values(record)) { const found = findNestedId(item, predicate); if (found) return found; } return null; };
      const modelId = findNestedId(envelope.inputs.models, (record) => "version_ordinal" in record);
      const calculationId = findNestedId(envelope.inputs.calculations, (record) => "result" in record && "checks" in record);
      const scenarioId = findNestedId(envelope.inputs.scenarios, (record) => "version_ordinal" in record);
      if (typeof modelId !== "string" || typeof calculationId !== "string" || typeof scenarioId !== "string") abstentions.push({ abstention_key: "deterministic-result-required", affected_scope: "valuation_commentary_draft", reason_codes: ["deterministic_validity_missing"], unsupported_propositions: [], missing_inputs: [typeof modelId === "string" ? "" : "model_version", typeof calculationId === "string" ? "" : "calculation_run", typeof scenarioId === "string" ? "" : "scenario_version"].filter(Boolean), output_ceiling: { code: "proposal_only" }, permitted_partial_scope: [], smallest_recovery_action: "Provide a pinned model version, scenario version, and deterministic calculation run.", resume_condition: "The envelope contains the complete controlled valuation dependency set." });
      else eligible.forEach((fragment, index) => results.push({
        candidate_key: `valuation-commentary-${index + 1}`, origin: AI_ORIGIN,
        payload: { valuation_question: "What is the valuation implication?", commentary: fragment.content_text.slice(0, 2000), model_version_id: typeof modelId === "string" ? modelId : null, calculation_run_ids: typeof calculationId === "string" ? [calculationId] : [], assumption_ids: [], evidence_ids: [], scenario_version_ids: typeof scenarioId === "string" ? [scenarioId] : [], limitations: ["Proposal only; deterministic calculation and Banker review remain required."] },
        evidence_links: [{ fragment_id: fragmentRef(fragment), relationship: "supports", proposition_scope: "The source context supplied for valuation commentary.", qualification: null, limitation: "AI draft cannot establish a valuation output or readiness." }],
        support_status: "supported", conflicts: [], uncertainty_flags: ["deterministic_validity_missing"], limitations: ["Proposal only; no authority is created."], required_human_decision: null,
      }));
    } else if (taskDefinition === "semantic_change_impact_proposal") {
      const candidates = new Map<string, string>();
      const collectCandidates = (value: unknown): void => {
        if (Array.isArray(value)) { value.forEach(collectCandidates); return; }
        if (!value || typeof value !== "object") return;
        const record = value as Record<string, unknown>;
        if (typeof record.object_id === "string" && typeof record.object_kind === "string") candidates.set(record.object_id, record.object_kind);
        Object.values(record).forEach(collectCandidates);
      };
      collectCandidates(envelope.inputs.deterministic_results);
      [...candidates.entries()].slice(0, 200).forEach(([objectId, objectKind], index) => results.push({
        candidate_key: `impact-${index + 1}`, origin: AI_ORIGIN,
        payload: { candidate_key: `impact-${index + 1}`, affected_object_kind: objectKind, affected_object_id: objectId, impact_code: "potentially_affected", proposed_action: "rereview", rationale: "The exact deterministic closure includes this object; a Banker must confirm the semantic consequence before any state changes." },
        evidence_links: [], support_status: "not_applicable", conflicts: [], uncertainty_flags: ["outside_task_scope"], limitations: ["Proposal only; deterministic closure and Banker disposition remain authoritative."], required_human_decision: null,
      }));
      if (candidates.size === 0) abstentions.push({ abstention_key: "deterministic-closure-required", affected_scope: "semantic_change_impact_proposal", reason_codes: ["coverage_incomplete"], unsupported_propositions: [], missing_inputs: ["deterministic_impact_candidate"], output_ceiling: { code: "proposal_only" }, permitted_partial_scope: [], smallest_recovery_action: "Build the deterministic typed dependency closure before requesting a semantic proposal.", resume_condition: "The Impact Assessment contains at least one exact candidate object." });
    } else if (taskDefinition === "contract_repair") {
      abstentions.push({ abstention_key: "repair-input-required", affected_scope: "requested task", reason_codes: ["outside_task_scope"], unsupported_propositions: [], missing_inputs: ["invalid_visible_response"], output_ceiling: { code: "proposal_only" }, permitted_partial_scope: [], smallest_recovery_action: "Submit one invalid visible response to the control-plane repair seam.", resume_condition: "The original response and validation pointers are available." });
    }
    if (results.length === 0 && abstentions.length === 0) abstentions.push({ abstention_key: "insufficient-source-context", affected_scope: "requested task", reason_codes: ["coverage_incomplete"], unsupported_propositions: [], missing_inputs: fragments.length === 0 ? ["source_fragment"] : fragments.map(fragmentRef), output_ceiling: { code: "proposal_only" }, permitted_partial_scope: [], smallest_recovery_action: "Provide sufficient eligible Source Packet fragments for this task.", resume_condition: "The exact Source Packet contains the required fragments." });
    const output: AiOutput = { status: results.length > 0 && abstentions.length === 0 ? "complete" : results.length > 0 ? "partial" : abstentions.length > 0 ? "abstained" : "abstained", schema_version: AI_OUTPUT_SCHEMA_VERSION, task_definition: taskDefinition, scope_digest_echo: envelope.scope.scope_digest, results, abstentions, omissions: [] };
    return { response: output, providerRequestId: `synthetic-${crypto.randomUUID()}`, model: "hellox-synthetic-source-v1", usage: { input_tokens: 0, output_tokens: 0 }, costMinorUnits: 0 };
  }
}

type RouteDeps = {
  requireBanker: (request: FastifyRequest, reply: FastifyReply) => Promise<string | null>;
  commandKey: (request: FastifyRequest, reply: FastifyReply) => string | null;
};

const startSchema = z.object({
  packet_version_id: uuid,
  work_objective_id: uuid,
  task_definition: z.enum(taskDefinitions),
  revision_id: uuid.optional(),
  impact_assessment_id: uuid.optional(),
  job_id: uuid,
  job_scope_id: uuid,
}).strict().superRefine((body,ctx)=>{if((workbookAiTasks as readonly string[]).includes(body.task_definition)&&!body.revision_id)ctx.addIssue({code:"custom",message:"exact_revision_required",path:["revision_id"]});if(body.task_definition==="semantic_change_impact_proposal"&&!body.impact_assessment_id)ctx.addIssue({code:"custom",message:"impact_assessment_required",path:["impact_assessment_id"]});});
const retrySchema = z.object({ kind: z.enum(["transient_provider", "contract_repair"]), reason_code: z.string().min(1).max(120) }).strict();

function problem(reply: FastifyReply, status: number, code: string, detail: string, recovery: string, instance: string) {
  return reply.code(status).type("application/problem+json").send({ type: `${problemType}/${code.replaceAll("_", "-")}`, title: code === "resource_not_found" ? "Resource not found" : code.replaceAll("_", " "), status, code, detail, instance, outcome: "rejected", retryable: status === 401 || status === 429 || status === 503, recovery_action: recovery });
}

function errorMessage(error: unknown) { return error && typeof error === "object" && "message" in error ? String(error.message) : String(error); }

function encrypted(value: unknown): Buffer {
  const configuredKey = process.env.AI_RUN_PROTECTED_KEY;
  if (!configuredKey && process.env.APP_ENV !== "test" && process.env.NODE_ENV !== "test") throw new Error("ai_protected_key_unconfigured");
  const key = crypto.createHash("sha256").update(configuredKey ?? "test-only-ai-run-protected-key").digest();
  const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv("aes-256-gcm", key, iv); const body = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([Buffer.from("IBAI1"), iv, cipher.getAuthTag(), body]);
}

function materialFromFragments(fragments: AiSourceFragment[]) {
  const first = fragments[0];
  if (!first) return { provenanceClass: "synthetic" as const, confidentialityClass: "internal" as const, deIdentificationPosture: "not_applicable", rightsAssessmentId: "not-recorded", rightsAssessmentIds: ["not-recorded"] };
  const rightsAssessmentIds = [...new Set(fragments.map((fragment) => fragment.rights_assessment_id))].sort();
  return { provenanceClass: first.provenance_class, confidentialityClass: first.confidentiality_class, deIdentificationPosture: first.de_identification_posture, rightsAssessmentId: rightsAssessmentIds.length === 1 ? rightsAssessmentIds[0]! : stableDigest(rightsAssessmentIds), rightsAssessmentIds };
}

function asFragment(row: Record<string, unknown>): AiSourceFragment {
  return { fragment_id: String(row.fragment_id), source_record_id: String(row.source_record_id), source_record_version: Number(row.source_record_version ?? 0), source_record_digest: String(row.source_record_digest ?? row.content_digest), representation_id: String(row.representation_id), representation_digest: String(row.representation_digest ?? row.content_digest), locator: (row.locator ?? {}) as Record<string, unknown>, content_digest: String(row.content_digest), content_text: String(row.content_text), coverage_code: String(row.coverage_code ?? "parsed"), provenance_class: row.provenance_class as AiSourceFragment["provenance_class"], confidentiality_class: row.confidentiality_class as AiSourceFragment["confidentiality_class"], de_identification_posture: String(row.de_identification_posture), rights_assessment_id: String(row.rights_assessment_id ?? "not-recorded") };
}

export type AiStartCommand = z.infer<typeof startSchema>;
export async function executeAiProposalRun(client: pg.PoolClient, context: {accountId:string;actorId:string}, dealId:string, command:AiStartCommand, key:string, requestDigest:string, provider:AiProvider, boundary?:{release:()=>Promise<void>;restore:()=>Promise<void>}) {
  const body=startSchema.parse(command);

        const environmentCode = process.env.APP_ENV === "production" ? "production" : process.env.APP_ENV === "development" ? "development" : "local";
        const providerProfileId = environmentCode === "local" ? "hellox-source-proposals-v1" : `hellox-source-proposals-v1-${environmentCode}`;
        const releaseId = process.env.RELEASE_ID ?? process.env.APP_RELEASE_ID ?? "dev-working-tree";
        const contextPlanVersion = "1.0.0";
        await client.query("SELECT source.get_packet_worker_input($1,$2,$3,$4,$5)", [context.accountId, dealId, body.packet_version_id, body.work_objective_id, "ai_processing"]);
        const rows = await client.query<Record<string, unknown>>(`SELECT f.id AS fragment_id,f.source_record_id,r.version_ordinal AS source_record_version,r.content_sha256 AS source_record_digest,f.representation_id,rep.content_sha256 AS representation_digest,f.locator,f.content_sha256 AS content_digest,f.content_text,f.coverage_code,r.provenance_class,r.confidentiality_class,r.de_identification_posture,coalesce((SELECT cs.assessment_id::text FROM source.source_rights_current_selection cs WHERE cs.source_record_id=r.id AND cs.purpose_code=(SELECT purpose_code FROM source.source_packet_version WHERE id=$2) ORDER BY cs.updated_at DESC LIMIT 1),'not-recorded') AS rights_assessment_id FROM source.source_packet_member m JOIN source.source_fragment f ON f.source_record_id=m.source_record_id JOIN source.source_record r ON r.id=f.source_record_id JOIN source.source_representation rep ON rep.id=f.representation_id WHERE m.packet_version_id=$2 AND m.account_id=$1 AND m.deal_id=$3 ORDER BY m.sort_key,f.created_at`, [context.accountId, body.packet_version_id, dealId]);
        const fragments = rows.rows.map((row) => ({ ...asFragment(row), run_fragment_id: crypto.randomUUID() })); const material = materialFromFragments(fragments);
        const workbookTask = (workbookAiTasks as readonly string[]).includes(body.task_definition);
        const controlled = workbookTask ? (await client.query<{data:{facts:unknown;assumptions:unknown;evidence:unknown;decisions:unknown;analysis:Record<string,unknown>}}>("SELECT deliverable.get_workbook_ai_inputs($1) AS data",[body.revision_id])).rows[0]!.data : (await client.query<{ facts: unknown; assumptions: unknown; evidence: unknown; decisions: unknown; analysis: Record<string, unknown> }>("SELECT knowledge.get_fact_projection($1,$2,$3,NULL) AS facts, knowledge.get_assumption_projection($1,$2,$3,NULL) AS assumptions, knowledge.get_evidence_projection($1,$2,$3,NULL) AS evidence, knowledge.get_decision_projection($1,$2,$3,NULL) AS decisions, analysis.get_analysis_projection($1,$2,$3,NULL,NULL) AS analysis", [context.accountId, context.actorId, dealId])).rows[0] ?? { facts: [], assumptions: [], evidence: [], decisions: [], analysis: {} };
        let analysisProjection = controlled.analysis ?? {};
        let impactAssessment: unknown = null;
        if (body.impact_assessment_id) {
          impactAssessment = (await client.query<{ data: unknown }>("SELECT analysis.get_impact_projection($1,$2,$3,$4) AS data", [context.accountId, context.actorId, dealId, body.impact_assessment_id])).rows[0]?.data ?? null;
          if (!impactAssessment) throw new Error("impact_assessment_not_found");
        }
        type WorkbookContext = { id:string; purpose:string; audience:string; confidentiality: "public"|"internal"|"confidential"|"restricted"; build_input:{calculations:Array<{run_id:string;model_version_id:string;scenario_version_id:string;measures:Array<{source_record_id:string|null;fact_id:string|null;assumption_id:string|null;decision_id:string}>}>}; artifacts:unknown[]; regions:unknown[]; render_evidence:unknown; manifest:unknown };
        let workbook: WorkbookContext | null = null;
        if(workbookTask){
          workbook=(await client.query<{data:WorkbookContext}>(`SELECT to_jsonb(r)||jsonb_build_object('artifacts',(SELECT coalesce(jsonb_agg(to_jsonb(a)-'protected_object_id'),'[]') FROM deliverable.artifact a WHERE a.revision_id=r.id),'regions',(SELECT coalesce(jsonb_agg(to_jsonb(g)),'[]') FROM deliverable.artifact_region g JOIN deliverable.artifact a ON a.id=g.artifact_id WHERE a.revision_id=r.id),'render_evidence',(SELECT q.report FROM deliverable.qc_run q WHERE q.revision_id=r.id ORDER BY q.created_at DESC LIMIT 1),'manifest',(SELECT jsonb_build_object('canonical_sha256',m.canonical_sha256,'key_version',m.key_version) FROM deliverable.artifact_manifest m WHERE m.revision_id=r.id)) AS data FROM deliverable.deliverable_revision r WHERE r.id=$1`,[body.revision_id])).rows[0]?.data??null;
          if(!workbook)throw new Error("ai_artifact_scope_invalid");
          const classes=["public","internal","confidential","restricted"];
          if(classes.indexOf(workbook.confidentiality)>classes.indexOf(material.confidentialityClass))material.confidentialityClass=workbook.confidentiality;
          const sourceIds=new Set(fragments.map(f=>f.source_record_id));
          if(workbook.build_input.calculations.some(c=>c.measures.some(m=>m.source_record_id&&!sourceIds.has(m.source_record_id))))throw new Error("ai_artifact_packet_scope_mismatch");
          // Only inputs pinned by this Revision enter the provider envelope.
          const measures=workbook.build_input.calculations.flatMap(c=>c.measures);
          const exact=(rows:unknown,ids:Array<string|null>)=>Array.isArray(rows)?rows.filter(row=>row&&typeof row==="object"&&ids.includes(row.id)):[];
          controlled.facts=exact(controlled.facts,measures.map(m=>m.fact_id));
          controlled.assumptions=exact(controlled.assumptions,measures.map(m=>m.assumption_id));
          controlled.decisions=exact(controlled.decisions,measures.map(m=>m.decision_id));
          controlled.evidence=[];

          if(measures.some(m=>m.assumption_id&&!m.source_record_id))material.provenanceClass="real";

        }
        const materialClasses = new Set(fragments.map((fragment) => `${fragment.provenance_class}:${fragment.confidentiality_class}:${fragment.de_identification_posture}`));
        if (materialClasses.size > 1) throw new Error("ai_material_classification_mismatch");
        const profile = await client.query<{ capability_verified: boolean; processing_evidence_verified: boolean; restricted_approved: boolean }>("SELECT capability_verified,processing_evidence_verified,restricted_approved FROM ai.provider_capability_profile WHERE id=$1 AND environment_code=$2 AND lifecycle_status='enabled'", [providerProfileId, environmentCode]);
        const capability = profile.rows[0] ?? { capability_verified: false, processing_evidence_verified: false, restricted_approved: false };
        if (!canRouteMaterial(material, { provider: provider.providerCode, capabilityVerified: capability.capability_verified, processingEvidenceVerified: capability.processing_evidence_verified, restrictedApproved: capability.restricted_approved })) throw new Error("ai_provider_capability_blocked");
        const task = await client.query<{ task_definition_version: string; prompt_package_id: string; package_version: string; input_contract_version: string; output_contract_version: string; ai_evidence_policy_version: string }>("SELECT t.task_definition_version,p.id AS prompt_package_id,p.package_version,t.input_contract_version,t.output_contract_version,p.ai_evidence_policy_version FROM ai.task_definition t JOIN ai.prompt_package p ON p.task_definition=t.task_definition AND p.task_definition_version=t.task_definition_version AND p.package_version='1.0.0' JOIN ai.task_enablement e ON e.task_definition=t.task_definition AND e.task_definition_version=t.task_definition_version AND e.prompt_package_id=p.id AND e.provider_profile_id=$5 AND e.environment_code=$4 AND e.provenance_class=$2 AND e.confidentiality_class=$3 AND e.status_code='enabled' WHERE t.task_definition=$1 AND t.lifecycle_status='enabled' AND p.lifecycle_status='enabled'", [body.task_definition, material.provenanceClass, material.confidentialityClass, environmentCode, providerProfileId]);
        if (!task.rows[0]) throw new Error("ai_task_disabled");
        const envelope = buildAiInputEnvelope({ taskDefinition: body.task_definition, taskDefinitionVersion: task.rows[0].task_definition_version, promptPackageVersion: task.rows[0].package_version, inputContractVersion: task.rows[0].input_contract_version, outputContractVersion: task.rows[0].output_contract_version, aiEvidencePolicyVersion: task.rows[0].ai_evidence_policy_version, contextPlanVersion, accountId: context.accountId, dealId, jobId: body.job_id, jobScopeId: body.job_scope_id, packetVersionId: body.packet_version_id, workObjective: body.work_objective_id, intendedUse: workbook?.purpose ?? "internal_analysis", audience: workbook?.audience ?? "individual_banker", materialClassification: { provenanceClass: material.provenanceClass, confidentialityClass: material.confidentialityClass, deIdentificationPosture: material.deIdentificationPosture, assessmentIds: material.rightsAssessmentIds }, rightsAssessmentId: material.rightsAssessmentId, fragments: fragments.map((fragment) => ({ id: fragment.run_fragment_id!, sourceRecordId: fragment.source_record_id, sourceRecordVersion: fragment.source_record_version, sourceRecordDigest: fragment.source_record_digest, representationId: fragment.representation_id, representationDigest: fragment.representation_digest, locator: fragment.locator as Record<string, string | number>, contentDigest: fragment.content_digest, coverageCode: fragment.coverage_code })), controlledInputs: { facts: Array.isArray(controlled.facts) ? controlled.facts : [], assumptions: Array.isArray(controlled.assumptions) ? controlled.assumptions : [], evidence: Array.isArray(controlled.evidence) ? controlled.evidence : [], humanDecisions: Array.isArray(controlled.decisions) ? controlled.decisions : [], calculations: Array.isArray(analysisProjection.calculations) ? analysisProjection.calculations : [], models: Array.isArray(analysisProjection.models) ? analysisProjection.models : [], scenarios: Array.isArray(analysisProjection.scenarios) ? analysisProjection.scenarios : [], currentRevisions: workbook ? [workbook] : [], artifactContracts: workbook ? [{id:"analysis-valuation-1.0.0",purpose:workbook.purpose,audience:workbook.audience}] : [], deterministicResults: [ ...(workbook ? [workbook.render_evidence] : []), ...(impactAssessment ? [impactAssessment] : []) ] }, requiredInputKeys: fragments.map((fragment) => fragment.run_fragment_id!), excludedInputKeys: [], failedInputKeys: [], limits: { maxContextBytes: 120000, maxOutputTokens: 8000, timeoutSeconds: 600, maxCostMinorUnits: 500 } });
        const contextBytes = Buffer.byteLength(JSON.stringify(envelope) + fragments.map((fragment) => fragment.content_text).join("\n"), "utf8");
        if (contextBytes > envelope.limits.max_context_bytes) throw new Error("output_ceiling_exceeded");
        const started = await client.query<{ run_id: string; idempotent_replayed: boolean }>("SELECT * FROM ai.start_run_v2($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)", [context.accountId, context.actorId, dealId, body.job_id, body.job_scope_id, body.packet_version_id, body.work_objective_id ?? null, body.task_definition, task.rows[0].task_definition_version, task.rows[0].prompt_package_id, providerProfileId, environmentCode, material.provenanceClass, material.confidentialityClass, material.deIdentificationPosture, envelope.scope.scope_digest, envelope.canonical_input_digest, requestDigest, envelope.request_nonce, Database.hashToken(key), releaseId, contextPlanVersion, envelope.canonical_input_digest, { provider: provider.providerCode, model: process.env.HELLOX_MODEL ?? "gpt-5.6-sol", reasoning_effort: process.env.HELLOX_REASONING_EFFORT ?? "xhigh" }]);
        const run = started.rows[0];
        if (run.idempotent_replayed) {
          if (workbookTask) {
            const prior=(await client.query<{status_code:string;outcome_class:string}>("SELECT status_code,outcome_class FROM ai.run WHERE id=$1",[run.run_id])).rows[0];
            if (!prior || !["completed","abstained"].includes(prior.status_code)) return {runId:run.run_id,replayed:true,failureCode:"ai_prior_outcome_requires_review"};
          }
          return { runId: run.run_id, replayed: true };
        }
        if(workbook) await client.query("SELECT deliverable.attach_ai_revision($1,$2)",[run.run_id,workbook.id]);
        await client.query("SELECT ai.attach_run_fragments($1,$2,$3,$4,$5)", [context.accountId, context.actorId, dealId, run.run_id, JSON.stringify(fragments.map((fragment) => ({ fragment_id: fragment.fragment_id, run_fragment_id: fragment.run_fragment_id, rights_assessment_id: fragment.rights_assessment_id })))]);
        let requestEvidence: unknown = { task_definition: body.task_definition, envelope, fragments };
        const startedAt = Date.now(); let providerResult: Awaited<ReturnType<AiProvider["invoke"]>> | undefined; let providerError: unknown;
        await client.query("SELECT ai.record_provider_request($1,'input_envelope',$2)", [run.run_id, encrypted(requestEvidence)]);
        let released = false;
        try {
          providerResult = await provider.invoke({ taskDefinition: body.task_definition, envelope, fragments, onRequest: async (request) => {
            requestEvidence = request;
            await client.query("SELECT ai.record_provider_request($1,'provider_request',$2)", [run.run_id, encrypted(request)]);
            // This commit completes before the first outbound provider byte.
            await boundary?.release(); released = Boolean(boundary);
          } });
        } catch (error) { providerError = error; }
        // Revalidate the lease and current source fence before retaining any provider result.
        // No transaction or row lock is held while the external provider is running.
        if (released) await boundary!.restore();
        if (!providerResult) { const error=providerError;
          if (errorMessage(error).includes("ai_provider_contract_invalid")) {
            await client.query("SELECT ai.complete_run_v2($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)", [context.accountId, context.actorId, dealId, run.run_id, "failed", "contract_failure", "[]", "[]", "[]", JSON.stringify([{ stage: "schema", code: errorMessage(error), outcome: "failed" }]), encrypted(requestEvidence), encrypted({ error_code: "ai_provider_contract_invalid" }), null, null, {}, null, Date.now() - startedAt, null]);
            return { runId: run.run_id, replayed: false, failureCode: "ai_contract_failure:provider_contract_invalid" };
          }
          // A provider failure is not a business abstention. Preserve only the
          // protected failure evidence and deterministic validation outcome.
          const providerFailure = /^ai_provider_[a-z_0-9]+$/.test(errorMessage(error)) ? errorMessage(error) : error instanceof Error && ["AbortError","TimeoutError"].includes(error.name) ? "ai_provider_timeout" : "provider_request_failed";
          await client.query("SELECT ai.complete_run_v2($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)", [context.accountId, context.actorId, dealId, run.run_id, "failed", "provider_failure", "[]", "[]", "[]", JSON.stringify([{ stage: "provider", code: providerFailure, outcome: "failed" }]), encrypted(requestEvidence), encrypted({ error_code: providerFailure }), null, null, {}, null, Date.now() - startedAt, null]);
          return { runId: run.run_id, replayed: false, failureCode: "ai_provider_failure" };
        }
        const output = providerResult.response as AiOutput; const validation = validateAiOutput(output, envelope);
        if (!validation.ok) {
          await client.query("SELECT ai.complete_run_v2($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)", [context.accountId, context.actorId, dealId, run.run_id, "failed", "contract_failure", "[]", "[]", "[]", JSON.stringify([{ stage: "schema", code: validation.code, json_pointer: validation.pointer, outcome: "failed" }]), encrypted(requestEvidence), encrypted({ response: output }), providerResult.providerRequestId, providerResult.model, providerResult.usage, providerResult.costMinorUnits, Date.now() - startedAt, stableDigest(output)]);
          return { runId: run.run_id, replayed: false, failureCode: `ai_contract_failure:${validation.code}` };
        }
        const proposals = output.results.map((item) => {
          const payload = item.payload; const kind = body.task_definition === "source_claim_extraction" ? "claim" : body.task_definition === "claim_evidence_linking" ? "evidence_link" : body.task_definition === "material_source_conflict_analysis" ? "conflict" : body.task_definition === "financial_semantic_extraction" ? "normalized_value_proposal" : body.task_definition === "financial_normalization_mapping" ? "mapping_proposal" : body.task_definition === "semantic_change_impact_proposal" ? "semantic_change_impact_proposal" : body.task_definition === "workbook_commentary_draft" ? "workbook_commentary" : body.task_definition === "deliverable_semantic_qc" ? "semantic_qc_finding" : body.task_definition === "native_reader_semantic_parity_review" ? "parity_finding" : "analysis_draft";
          return { candidate_key: item.candidate_key, origin: item.origin, proposal_kind: kind, schema_version: AI_OUTPUT_SCHEMA_VERSION, payload, payload_digest: stableDigest(payload), support_status: item.support_status, evidence_candidates: item.evidence_links, limitations: item.limitations, unsupported_states: item.uncertainty_flags, required_human_decision: item.required_human_decision, conflict: kind === "conflict" ? payload : undefined };
        });
        await client.query("SELECT ai.complete_run_v2($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)", [context.accountId, context.actorId, dealId, run.run_id, output.status === "abstained" ? "abstained" : "completed", output.status === "abstained" ? "business_abstention" : "succeeded", JSON.stringify(proposals), JSON.stringify(output.abstentions), JSON.stringify(output.omissions), JSON.stringify([{ stage: "schema", code: "passed", outcome: "passed", normalized_digest: stableDigest(output) }, { stage: "locator", code: "preissued_fragment_ids", outcome: "passed" }, { stage: "permission", code: "proposal_only", outcome: "passed" }]), encrypted(requestEvidence), encrypted(output), providerResult.providerRequestId, providerResult.model, providerResult.usage, providerResult.costMinorUnits, Date.now() - startedAt, stableDigest(output)]);
        return { runId: run.run_id, replayed: false };
}

export function registerAiSourceProposalRoutes(api: FastifyInstance, database: Database, deps: RouteDeps, options: AiSourceProposalRuntimeOptions = {}) {
  const provider = options.provider ?? (process.env.HELLOX_API_KEY ? new HelloXAiProvider() : new SyntheticAiProvider());
  const startAiRunHandler = async (request: FastifyRequest<{ Params: { deal_id: string; work_objective_id?: string } }>, reply: FastifyReply) => {
    const dealId = uuid.parse(request.params.deal_id); const session = await deps.requireBanker(request, reply); if (!session) return; const key = deps.commandKey(request, reply); if (!key) return; const body = startSchema.parse(request.body);
    if((workbookAiTasks as readonly string[]).includes(body.task_definition))return problem(reply,409,"revision_job_required","Submit workbook review against its exact Revision.","create_revision_ai_review_job",request.url);
    if (request.params.work_objective_id && request.params.work_objective_id !== body.work_objective_id) return problem(reply, 409, "ai_objective_scope_mismatch", "The path Work Objective does not match the requested AI scope.", "use_one_work_objective", request.url);
    const requestDigest = canonicalDigest({ method: "POST", route: request.params.work_objective_id ? "/api/v1/deals/{deal_id}/work-objectives/{work_objective_id}/ai-runs" : "/api/v1/deals/{deal_id}/ai-runs", api_version: "v1", deal_id: dealId, work_objective_id: body.work_objective_id, body });
    try {
      const result = await database.withContext(session, dealId, (client, context) => executeAiProposalRun(client,context,dealId,body,key,requestDigest,provider, {
        release: async () => { await client.query("SELECT app.clear_request()"); await client.query("COMMIT"); },
        restore: async () => {
          await client.query("BEGIN");
          const restored = await client.query("SELECT * FROM app.begin_request($1,$2)", [Database.hashToken(session), dealId]);
          if (!restored.rowCount || !restored.rows[0].passkey_verified) throw new Error("ai_scope_mismatch");
        },
      }));
      if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
      if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required for AI source proposals.", "register_passkey", request.url);
      if (result.kind !== "ok") return problem(reply, 404, "resource_not_found", "The Deal is not available.", "return_to_safe_parent", request.url);
      if (result.value.failureCode) {
        if (result.value.failureCode === "ai_provider_failure") return problem(reply, 503, "ai_provider_failure", "The HelloX provider did not return a usable response.", "retry_provider_request", request.url);
        return problem(reply, 502, "ai_contract_failure", "The provider response did not satisfy the pinned AI contract.", "retry_contract_repair", request.url);
      }
      const projection = await database.withContext(session, dealId, async (client, context) => (await client.query<{ projection: Record<string, unknown> | null }>("SELECT ai.get_run_projection($1,$2,$3,$4) AS projection", [context.accountId, context.actorId, dealId, result.value.runId])).rows[0]?.projection ?? null);
      if (projection.kind !== "ok" || projection.value === null) return problem(reply, 404, "resource_not_found", "The AI Run is not available.", "return_to_safe_parent", request.url);
      reply.header("Location", `/api/v1/deals/${dealId}/ai-runs/${result.value.runId}`); if (result.value.replayed) reply.header("Idempotent-Replayed", "true");
      return reply.code(result.value.replayed ? 200 : 201).send({ data: projection.value });
    } catch (error) {
      const message = errorMessage(error); const mappings: Record<string, [number, string, string, string]> = { ai_provider_failure: [503, "ai_provider_failure", "The HelloX provider did not return a usable response.", "retry_provider_request"], ai_provider_capability_blocked: [409, "ai_provider_capability_blocked", "The HelloX capability and processing evidence do not permit this material class.", "complete_provider_capability_evidence"], ai_task_disabled: [409, "ai_task_disabled", "This task version is not enabled for the requested run.", "enable_or_restore_task_version"], ai_material_classification_mismatch: [409, "ai_material_classification_mismatch", "The Source Packet contains incompatible material classifications for one AI Run.", "split_the_source_packet_by_material_class"], output_ceiling_exceeded: [409, "output_ceiling_exceeded", "The requested AI processing exceeds the current Source Packet Output Ceiling.", "resolve_source_packet_blocker"], output_ceiling_missing: [409, "output_ceiling_missing", "No Output Ceiling is available for this exact Work Objective.", "rebuild_source_packet_ceiling"], source_condition_blocked: [409, "source_condition_blocked", "The Source Packet has a rights or condition blocker for AI processing.", "resolve_source_packet_blocker"], packet_worker_scope_mismatch: [404, "resource_not_found", "The Source Packet or Work Objective is not available in this Deal.", "return_to_safe_parent"], ai_scope_mismatch: [404, "resource_not_found", "The AI Run is not available in this Deal.", "return_to_safe_parent"], idempotency_key_reused: [409, "idempotency_key_reused", "This Idempotency-Key was already used for a different request.", "use_new_idempotency_key"], ai_packet_scope_mismatch: [404, "resource_not_found", "The Source Packet version is not available in this Deal.", "return_to_source_packet"], ai_objective_scope_mismatch: [404, "resource_not_found", "The Work Objective is not available in this Deal.", "return_to_safe_parent"] };
      const found = Object.entries({ ...mappings, impact_assessment_not_found: [404, "resource_not_found", "The Impact Assessment is not available in this Deal.", "reload_and_compare"], ai_provider_unconfigured: [503, "ai_provider_failure", "The HelloX provider is not configured for this development Cell.", "configure_provider_credentials"], ai_protected_key_unconfigured: [503, "ai_provider_failure", "The protected payload key is not configured for this development Cell.", "configure_protected_payload_key"], ai_provider_request_failed: [503, "ai_provider_failure", "The HelloX provider did not return a usable response.", "retry_provider_request"], ai_provider_empty_response: [503, "ai_provider_failure", "The HelloX provider returned no response content.", "retry_provider_request"], ai_provider_invalid_json: [503, "ai_provider_failure", "The HelloX provider returned invalid JSON.", "retry_provider_request"] }).find(([code]) => message.includes(code)); if (!found) throw error; const [status, code, detail, recovery] = found[1] as [number, string, string, string]; return problem(reply, status, code, detail, recovery, request.url);
    }
  };
  api.post<{ Params: { deal_id: string } }>("/api/v1/deals/:deal_id/ai-runs", startAiRunHandler);
  api.post<{ Params: { deal_id: string; work_objective_id: string } }>("/api/v1/deals/:deal_id/work-objectives/:work_objective_id/ai-runs", startAiRunHandler);

  api.post<{ Params: { deal_id: string; run_id: string } }>("/api/v1/deals/:deal_id/ai-runs/:run_id/retries", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id); const runId = uuid.parse(request.params.run_id); const session = await deps.requireBanker(request, reply); if (!session) return; const key = deps.commandKey(request, reply); if (!key) return; const body = retrySchema.parse(request.body); const requestDigest = canonicalDigest({ method: "POST", route: "/api/v1/deals/{deal_id}/ai-runs/{run_id}/retries", api_version: "v1", deal_id: dealId, run_id: runId, body });
    try {
      const result = await database.withContext(session, dealId, async (client, context) => (await client.query<{ retry_id: string; retry_ordinal: number; idempotent_replayed: boolean }>("SELECT * FROM ai.record_retry($1,$2,$3,$4,$5,$6,$7,$8)", [context.accountId, context.actorId, dealId, runId, body.kind, body.reason_code, Database.hashToken(key), requestDigest])).rows[0] ?? null);
      if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
      if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required for AI source proposals.", "register_passkey", request.url);
      if (result.kind !== "ok" || result.value === null) return problem(reply, 404, "resource_not_found", "The AI Run is not available.", "return_to_safe_parent", request.url);
      if (result.value.idempotent_replayed) reply.header("Idempotent-Replayed", "true");
      return reply.code(result.value.idempotent_replayed ? 200 : 201).send({ data: { id: result.value.retry_id, run_id: runId, ordinal: result.value.retry_ordinal, kind: body.kind, status: "queued" } });
    } catch (error) {
      const message = errorMessage(error); if (message.includes("ai_retry_limit_exceeded") || message.includes("ai_repair_limit_exceeded")) return problem(reply, 409, message.includes("ai_repair_limit_exceeded") ? "ai_repair_limit_exceeded" : "ai_retry_limit_exceeded", "The bounded retry and repair budget is exhausted.", "start_new_run_after_recovery", request.url); if (message.includes("idempotency_key_reused")) return problem(reply, 409, "idempotency_key_reused", "This Idempotency-Key was already used for a different request.", "use_new_idempotency_key", request.url); if (message.includes("ai_run_scope_mismatch")) return problem(reply, 404, "resource_not_found", "The AI Run is not available.", "return_to_safe_parent", request.url); throw error;
    }
  });

  api.get<{ Params: { deal_id: string; run_id: string } }>("/api/v1/deals/:deal_id/ai-runs/:run_id", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id); const runId = uuid.parse(request.params.run_id); const session = await deps.requireBanker(request, reply); if (!session) return;
    const result = await database.withContext(session, dealId, async (client, context) => (await client.query<{ projection: Record<string, unknown> | null }>("SELECT ai.get_run_projection($1,$2,$3,$4) AS projection", [context.accountId, context.actorId, dealId, runId])).rows[0]?.projection ?? null);
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required for AI source proposals.", "register_passkey", request.url);
    if (result.kind !== "ok" || result.value === null) return problem(reply, 404, "resource_not_found", "The AI Run is not available.", "return_to_safe_parent", request.url);
    return reply.code(200).header("Cache-Control", "private, no-store").send({ data: result.value });
  });

  api.get<{ Params: { deal_id: string } }>("/api/v1/deals/:deal_id/ai-runs", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id); const session = await deps.requireBanker(request, reply); if (!session) return;
    const result = await database.withContext(session, dealId, async (client, context) => (await client.query("SELECT id,job_id,job_scope_id,packet_version_id,task_definition,task_definition_version,scope_digest,status_code AS status,outcome_class AS outcome,created_at,completed_at FROM ai.run WHERE account_id=$1 AND deal_id=$2 ORDER BY created_at DESC", [context.accountId, dealId])).rows);
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required for AI source proposals.", "register_passkey", request.url);
    if (result.kind !== "ok") return problem(reply, 404, "resource_not_found", "The requested Deal is not available.", "return_to_safe_parent", request.url);
    return reply.code(200).header("Cache-Control", "private, no-store").send({ data: result.value });
  });
}

export function repairIsSemanticallySafe(original: unknown, repaired: unknown) { return !detectRepairSemanticChange(original, repaired); }
