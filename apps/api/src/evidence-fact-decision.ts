import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { canonicalDigest } from "./commerce.js";
import { Database } from "./database.js";

const uuid = z.string().uuid();
const problemType = "https://investment-banking.local/problems";

type RouteDeps = {
  requireBanker: (request: FastifyRequest, reply: FastifyReply) => Promise<string | null>;
  commandKey: (request: FastifyRequest, reply: FastifyReply) => string | null;
};

const locator = z.record(z.string(), z.unknown());
const evidenceAcceptance = z.object({
  source_record_id: uuid,
  representation_id: uuid,
  locator,
  proposition: z.string().min(1).max(4000),
  relationship: z.enum(["supports", "challenges"]),
  supported_scope: z.string().min(1).max(1000),
  qualification: z.string().max(2000).nullable().optional(),
  limitation: z.string().max(2000).nullable().optional(),
}).strict();
const claimInput = z.object({
  proposition: z.string().min(1).max(4000), attribution: z.string().min(1).max(500),
  definition: z.string().min(1).max(500), period: z.string().min(1).max(120),
  unit: z.string().min(1).max(120), currency: z.string().min(1).max(20),
  sign: z.enum(["positive", "negative", "not_applicable", "unknown"]),
  value: z.union([z.string(), z.number(), z.null()]).optional(),
  purpose: z.string().min(1).max(200), scope: z.string().min(1).max(1000),
  origin: z.enum(["human_authored", "ai_generated", "correction"]).optional(),
  source_proposal_id: uuid.nullable().optional(), corrects_claim_id: uuid.nullable().optional(),
}).strict();
const factAcceptance = z.object({
  evidence_relationship_ids: z.array(uuid).default([]), purpose: z.string().min(1).max(200),
  scope: z.string().min(1).max(1000), rationale: z.string().min(1).max(4000),
  alternatives: z.array(z.string().min(1).max(1000)).max(30).default([]),
  contrary_evidence: z.array(z.unknown()).max(30).default([]),
  conditions: z.array(z.string().min(1).max(1000)).max(30).default([]),
}).strict();
const assumptionInput = z.object({
  proposition: z.string().min(1).max(4000), value: z.union([z.string(), z.number(), z.null()]).optional(),
  purpose: z.string().min(1).max(200), scope: z.string().min(1).max(1000),
  rationale: z.string().min(1).max(4000), bounds: z.record(z.string(), z.unknown()).default({}),
  invalidation_triggers: z.array(z.string().min(1).max(1000)).max(30).default([]),
  origin: z.enum(["human_authored", "ai_generated", "correction"]).optional(), source_proposal_id: uuid.nullable().optional(),
}).strict();
const assumptionApproval = z.object({
  purpose: z.string().min(1).max(200), scope: z.string().min(1).max(1000),
  allowed_uses: z.array(z.string().min(1).max(500)).max(30).default([]),
  rationale: z.string().min(1).max(4000), alternatives: z.array(z.string().min(1).max(1000)).max(30).default([]),
  evidence_relationship_ids: z.array(uuid).max(30).default([]), conditions: z.array(z.string().min(1).max(1000)).max(30).default([]),
  invalidation_triggers: z.array(z.string().min(1).max(1000)).max(30).default([]),
}).strict();
const conflictInput = z.object({
  dimension: z.enum(["definition", "period", "unit", "currency", "sign", "value", "source_version", "scope", "meaning"]),
  affected_scope: z.string().min(1).max(1000), affected_uses: z.array(z.string().min(1).max(500)).max(30).default([]),
  claim_ids: z.array(uuid).min(2).max(30),
}).strict();
const conflictResolution = z.object({
  disposition: z.string().min(1).max(160), scope: z.string().min(1).max(1000), rationale: z.string().min(1).max(4000),
  selected_claim_ids: z.array(uuid).min(2).max(30), evidence_relationship_ids: z.array(uuid).max(30).default([]),
  alternatives: z.array(z.string().min(1).max(1000)).max(30).default([]),
}).strict();
const claimCorrection = z.object({
  corrected_value: z.union([z.string(), z.number(), z.null()]), corrected_proposition: z.string().min(1).max(4000).optional(),
  scope: z.string().min(1).max(1000), purpose: z.string().min(1).max(200), rationale: z.string().min(1).max(4000),
  evidence_relationship_ids: z.array(uuid).min(1).max(30), alternatives: z.array(z.string().min(1).max(1000)).max(30).default([]),
}).strict();

function errorMessage(error: unknown) { return error && typeof error === "object" && "message" in error ? String(error.message) : String(error); }

function problem(reply: FastifyReply, status: number, code: string, detail: string, recovery: string, instance: string) {
  return reply.code(status).type("application/problem+json").send({ type: `${problemType}/${code.replaceAll("_", "-")}`, title: code === "resource_not_found" ? "Resource not found" : code.replaceAll("_", " "), status, code, detail, instance, outcome: "rejected", retryable: status === 401 || status === 429 || status === 503, recovery_action: recovery });
}

function versionFromIfMatch(request: FastifyRequest) {
  const value = request.headers["if-match"];
  const header = Array.isArray(value) ? value[0] : value;
  if (!header) return null;
  const match = header.match(/(\d+)\s*"?\s*$/);
  return match ? Number(match[1]) : null;
}

function mapError(error: unknown, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof z.ZodError) return problem(reply, 400, "invalid_request", "The request could not be accepted.", "correct_request", request.url);
  const message = errorMessage(error);
  const mappings: Record<string, [number, string, string, string]> = {
    idempotency_key_reused: [409, "idempotency_key_reused", "This Idempotency-Key was already used for a different request.", "use_new_idempotency_key"],
    knowledge_scope_mismatch: [404, "resource_not_found", "The requested resource is not available in this Deal.", "return_to_safe_parent"],
    evidence_source_scope_mismatch: [409, "evidence_source_scope_mismatch", "Evidence must resolve to an eligible Source Record and Representation in this Deal.", "choose_an_eligible_source_fragment"],
    evidence_relationship_invalid: [400, "invalid_request", "The Evidence relationship is not supported.", "correct_request"],
    locator_unresolved: [409, "locator_unresolved", "The material proposition does not have an exact native Source locator.", "resolve_source_locator"],
    rights_blocked: [409, "rights_blocked", "Rights posture blocks this Evidence operation.", "resolve_rights_posture"],
    evidence_processing_blocked: [409, "evidence_processing_blocked", "Corrupt or unsupported processing cannot be used as authoritative Evidence.", "repair_source_processing"],
    fact_evidence_required: [409, "fact_evidence_required", "A Claim cannot become a Fact without accepted supporting Evidence.", "accept_exact_source_evidence"],
    fact_evidence_invalid: [409, "fact_evidence_invalid", "The selected Evidence does not support this Claim in the requested scope.", "select_matching_evidence"],
    fact_scope_mismatch: [409, "fact_scope_mismatch", "Fact acceptance must use the Claim's exact purpose and scope.", "keep_exact_claim_scope"],
    material_conflict_unresolved: [409, "material_conflict_unresolved", "A material conflict remains unresolved for this Fact scope.", "resolve_material_conflict"],
    conflict_resolution_scope_mismatch: [409, "conflict_resolution_scope_mismatch", "Conflict resolution must use the conflict's exact affected scope.", "keep_exact_conflict_scope"],
    decision_cannot_waive_hard_block: [409, "decision_cannot_waive_hard_block", "Human Decision cannot waive a rights, contamination, corruption, unsupported-Fact, or deterministic-invariant block.", "resolve_hard_block"],
    knowledge_version_conflict: [412, "knowledge_version_conflict", "The controlled object changed after it was loaded.", "reload_and_compare"],
    conflict_selection_invalid: [409, "conflict_selection_invalid", "The selected Claims are not the exact members of this conflict.", "select_conflict_members"],
    decision_evidence_scope_mismatch: [409, "decision_evidence_scope_mismatch", "Decision Evidence must remain inside the current Deal and Claim scope.", "choose_in_scope_evidence"],
    correction_evidence_required: [409, "correction_evidence_required", "A correction requires accepted supporting Evidence.", "accept_exact_source_evidence"],
    correction_evidence_invalid: [409, "correction_evidence_invalid", "Correction Evidence must support the original Claim in this Deal.", "choose_matching_evidence"],
    claim_scope_mismatch: [404, "resource_not_found", "The Claim is not available in this Deal.", "return_to_safe_parent"],
    source_proposal_scope_mismatch: [404, "resource_not_found", "The source proposal is not available in this Deal.", "return_to_safe_parent"],
    assumption_scope_mismatch: [404, "resource_not_found", "The Assumption is not available in this Deal.", "return_to_safe_parent"],
    conflict_scope_mismatch: [404, "resource_not_found", "The conflict is not available in this Deal.", "return_to_safe_parent"],
  };
  const match = Object.entries(mappings).find(([key]) => message.includes(key));
  if (!match) throw error;
  const [status, code, detail, recovery] = match[1]!;
  return problem(reply, status, code, detail, recovery, request.url);
}

function contextResponse(result: Awaited<ReturnType<Database["withContext"]>>, reply: FastifyReply, request: FastifyRequest, singular: string) {
  if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
  if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required for controlled knowledge actions.", "register_passkey", request.url);
  if (result.kind === "not_found" || result.value === null) return problem(reply, 404, "resource_not_found", `The ${singular} is not available in this Deal.`, "return_to_safe_parent", request.url);
  return null;
}

export function registerEvidenceFactDecisionRoutes(api: FastifyInstance, database: Database, deps: RouteDeps) {
  const projection = (fn: string, id?: string) => async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const params = request.params as { deal_id: string; evidence_id?: string; claim_id?: string; fact_id?: string; assumption_id?: string; conflict_id?: string; decision_id?: string };
    try {
      const dealId = uuid.parse(params.deal_id); const target = Object.values(params).find((value) => value !== params.deal_id) ?? id;
      const targetId = target ? uuid.parse(target) : null;
      const result = await database.withContext(session, dealId, async (client, context) => (await client.query<{ data: unknown }>(`SELECT knowledge.${fn}($1,$2,$3,$4) AS data`, [context.accountId, context.actorId, dealId, targetId])).rows[0]?.data ?? []);
      const response = contextResponse(result, reply, request, fn.replace("get_", "")); if (response) return response;
      const data = result.kind === "ok" ? result.value : [];
      if (targetId && Array.isArray(data) && data.length === 0) return problem(reply, 404, "resource_not_found", "The requested object is not available in this Deal.", "return_to_safe_parent", request.url);
      return reply.code(200).header("Cache-Control", "private, no-store").send({ data });
    } catch (error) { return mapError(error, request, reply); }
  };

  api.get("/api/v1/deals/:deal_id/evidence", projection("get_evidence_projection"));
  api.get("/api/v1/deals/:deal_id/evidence/:evidence_id", projection("get_evidence_projection"));
  api.get("/api/v1/deals/:deal_id/claims", projection("get_claim_projection"));
  api.get("/api/v1/deals/:deal_id/claims/:claim_id", projection("get_claim_projection"));
  api.get("/api/v1/deals/:deal_id/facts", projection("get_fact_projection"));
  api.get("/api/v1/deals/:deal_id/facts/:fact_id", projection("get_fact_projection"));
  api.get("/api/v1/deals/:deal_id/assumptions", projection("get_assumption_projection"));
  api.get("/api/v1/deals/:deal_id/assumptions/:assumption_id", projection("get_assumption_projection"));
  api.get("/api/v1/deals/:deal_id/conflicts", projection("get_conflict_projection"));
  api.get("/api/v1/deals/:deal_id/conflicts/:conflict_id", projection("get_conflict_projection"));
  api.get("/api/v1/deals/:deal_id/human-decisions", projection("get_decision_projection"));
  api.get("/api/v1/deals/:deal_id/human-decisions/:decision_id", projection("get_decision_projection"));

  api.post("/api/v1/deals/:deal_id/evidence-acceptances", async (request, reply) => {
    const session = await deps.requireBanker(request, reply); if (!session) return; const key = deps.commandKey(request, reply); if (!key) return;
    const params = request.params as { deal_id: string };
    try {
      const dealId = uuid.parse(params.deal_id); const body = evidenceAcceptance.parse(request.body);
      const requestDigest = canonicalDigest({ method: "POST", route: "/api/v1/deals/{deal_id}/evidence-acceptances", api_version: "v1", deal_id: dealId, body });
      const result = await database.withContext(session, dealId, async (client, context) => (await client.query<{ data: unknown }>("SELECT knowledge.accept_evidence($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) AS data", [context.accountId, context.actorId, dealId, Database.hashToken(key), requestDigest, body.source_record_id, body.representation_id, body.locator, body.proposition, body.relationship, body.supported_scope, body.qualification ?? null, body.limitation ?? null])).rows[0]?.data ?? null);
      const response = contextResponse(result, reply, request, "Evidence"); if (response) return response; if (result.kind !== "ok") return;
      const replay = Boolean((result.value as { idempotent_replayed?: boolean }).idempotent_replayed); reply.header("Location", `/api/v1/deals/${dealId}/evidence/${(result.value as { id: string }).id}`).header("Cache-Control", "private, no-store"); return reply.code(replay ? 200 : 201).send({ data: result.value });
    } catch (error) { return mapError(error, request, reply); }
  });

  api.post("/api/v1/deals/:deal_id/claims", commandRoute("create_claim", "claims", claimInput, async (context, body, key, digest, client, dealId) => (await client.query<{ data: unknown }>("SELECT knowledge.create_claim($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) AS data", [context.accountId, context.actorId, dealId, Database.hashToken(key), digest, body.proposition, body.attribution, body.definition, body.period, body.unit, body.currency, body.sign, body.value == null ? null : String(body.value), body.purpose, body.scope, body.origin ?? "human_authored", body.source_proposal_id ?? null, body.corrects_claim_id ?? null])).rows[0]?.data ?? null, deps, database, "Claim"));
  api.post("/api/v1/deals/:deal_id/assumptions", commandRoute("create_assumption", "assumptions", assumptionInput, async (context, body, key, digest, client, dealId) => (await client.query<{ data: unknown }>("SELECT knowledge.create_assumption($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) AS data", [context.accountId, context.actorId, dealId, Database.hashToken(key), digest, body.proposition, body.value == null ? null : String(body.value), body.purpose, body.scope, body.rationale, JSON.stringify(body.bounds), JSON.stringify(body.invalidation_triggers), body.origin ?? "human_authored", body.source_proposal_id ?? null])).rows[0]?.data ?? null, deps, database, "Assumption"));
  api.post("/api/v1/deals/:deal_id/conflicts", commandRoute("create_conflict", "conflicts", conflictInput, async (context, body, key, digest, client, dealId) => (await client.query<{ data: unknown }>("SELECT knowledge.create_conflict($1,$2,$3,$4,$5,$6,$7,$8,$9) AS data", [context.accountId, context.actorId, dealId, Database.hashToken(key), digest, body.dimension, body.affected_scope, JSON.stringify(body.affected_uses), body.claim_ids])).rows[0]?.data ?? null, deps, database, "Conflict"));

  api.post("/api/v1/deals/:deal_id/claims/:claim_id/fact-acceptances", async (request, reply) => {
    const session = await deps.requireBanker(request, reply); if (!session) return; const key = deps.commandKey(request, reply); if (!key) return;
    const params = request.params as { deal_id: string; claim_id: string };
    try {
      const dealId = uuid.parse(params.deal_id); const claimId = uuid.parse(params.claim_id); const body = factAcceptance.parse(request.body);
      const requestDigest = canonicalDigest({ method: "POST", route: "/api/v1/deals/{deal_id}/claims/{claim_id}/fact-acceptances", api_version: "v1", deal_id: dealId, claim_id: claimId, body });
      const result = await database.withContext(session, dealId, async (client, context) => (await client.query<{ data: unknown }>("SELECT knowledge.accept_claim_as_fact($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) AS data", [context.accountId, context.actorId, dealId, claimId, Database.hashToken(key), requestDigest, body.evidence_relationship_ids, body.purpose, body.scope, body.rationale, JSON.stringify(body.alternatives), JSON.stringify(body.contrary_evidence), JSON.stringify(body.conditions), versionFromIfMatch(request)])).rows[0]?.data ?? null);
      const response = contextResponse(result, reply, request, "Fact"); if (response) return response; if (result.kind !== "ok") return;
      const replay = Boolean((result.value as { idempotent_replayed?: boolean }).idempotent_replayed); reply.header("Location", `/api/v1/deals/${dealId}/facts/${(result.value as { id: string }).id}`).header("Cache-Control", "private, no-store"); return reply.code(replay ? 200 : 201).send({ data: result.value });
    } catch (error) { return mapError(error, request, reply); }
  });

  api.post("/api/v1/deals/:deal_id/claims/:claim_id/corrections", async (request, reply) => {
    const session = await deps.requireBanker(request, reply); if (!session) return; const key = deps.commandKey(request, reply); if (!key) return;
    const params = request.params as { deal_id: string; claim_id: string };
    try {
      const dealId = uuid.parse(params.deal_id); const claimId = uuid.parse(params.claim_id); const body = claimCorrection.parse(request.body);
      const requestDigest = canonicalDigest({ method: "POST", route: "/api/v1/deals/{deal_id}/claims/{claim_id}/corrections", api_version: "v1", deal_id: dealId, claim_id: claimId, body });
      const result = await database.withContext(session, dealId, async (client, context) => (await client.query<{ data: unknown }>("SELECT knowledge.correct_claim($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) AS data", [context.accountId, context.actorId, dealId, claimId, Database.hashToken(key), requestDigest, body.corrected_value == null ? null : String(body.corrected_value), body.corrected_proposition ?? null, body.scope, body.purpose, body.rationale, body.evidence_relationship_ids, JSON.stringify(body.alternatives)])).rows[0]?.data ?? null);
      const response = contextResponse(result, reply, request, "Claim correction"); if (response) return response; if (result.kind !== "ok") return;
      const replay = Boolean((result.value as { idempotent_replayed?: boolean }).idempotent_replayed); reply.header("Location", `/api/v1/deals/${dealId}/claims/${(result.value as { id: string }).id}`).header("Cache-Control", "private, no-store"); return reply.code(replay ? 200 : 201).send({ data: result.value });
    } catch (error) { return mapError(error, request, reply); }
  });

  api.post("/api/v1/deals/:deal_id/assumptions/:assumption_id/approvals", async (request, reply) => {
    const session = await deps.requireBanker(request, reply); if (!session) return; const key = deps.commandKey(request, reply); if (!key) return;
    const params = request.params as { deal_id: string; assumption_id: string };
    try {
      const dealId = uuid.parse(params.deal_id); const assumptionId = uuid.parse(params.assumption_id); const body = assumptionApproval.parse(request.body);
      const requestDigest = canonicalDigest({ method: "POST", route: "/api/v1/deals/{deal_id}/assumptions/{assumption_id}/approvals", api_version: "v1", deal_id: dealId, assumption_id: assumptionId, body });
      const result = await database.withContext(session, dealId, async (client, context) => (await client.query<{ data: unknown }>("SELECT knowledge.approve_assumption($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) AS data", [context.accountId, context.actorId, dealId, assumptionId, Database.hashToken(key), requestDigest, body.purpose, body.scope, JSON.stringify(body.allowed_uses), body.rationale, JSON.stringify(body.alternatives), body.evidence_relationship_ids, JSON.stringify(body.conditions), JSON.stringify(body.invalidation_triggers)])).rows[0]?.data ?? null);
      const response = contextResponse(result, reply, request, "Assumption approval"); if (response) return response; if (result.kind !== "ok") return;
      const replay = Boolean((result.value as { idempotent_replayed?: boolean }).idempotent_replayed); return reply.header("Cache-Control", "private, no-store").code(replay ? 200 : 201).send({ data: result.value });
    } catch (error) { return mapError(error, request, reply); }
  });

  api.post("/api/v1/deals/:deal_id/conflicts/:conflict_id/resolutions", async (request, reply) => {
    const session = await deps.requireBanker(request, reply); if (!session) return; const key = deps.commandKey(request, reply); if (!key) return;
    const params = request.params as { deal_id: string; conflict_id: string };
    try {
      const dealId = uuid.parse(params.deal_id); const conflictId = uuid.parse(params.conflict_id); const body = conflictResolution.parse(request.body); const expected = versionFromIfMatch(request);
      if (expected === null) return problem(reply, 428, "if_match_required", "Conflict resolution requires the exact current conflict version.", "reload_and_compare", request.url);
      const requestDigest = canonicalDigest({ method: "POST", route: "/api/v1/deals/{deal_id}/conflicts/{conflict_id}/resolutions", api_version: "v1", deal_id: dealId, conflict_id: conflictId, body });
      const result = await database.withContext(session, dealId, async (client, context) => (await client.query<{ data: unknown }>("SELECT knowledge.resolve_conflict($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) AS data", [context.accountId, context.actorId, dealId, conflictId, Database.hashToken(key), requestDigest, body.disposition, body.scope, body.rationale, body.selected_claim_ids, body.evidence_relationship_ids, JSON.stringify(body.alternatives), expected])).rows[0]?.data ?? null);
      const response = contextResponse(result, reply, request, "Conflict resolution"); if (response) return response; if (result.kind !== "ok") return;
      const replay = Boolean((result.value as { idempotent_replayed?: boolean }).idempotent_replayed); reply.header("ETag", `"conflict-${Number((result.value as { row_version: number }).row_version ?? expected)}"`).header("Cache-Control", "private, no-store"); return reply.code(replay ? 200 : 201).send({ data: result.value });
    } catch (error) { return mapError(error, request, reply); }
  });
}

type CommandContext = { accountId: string; actorId: string };
type CommandBody = Record<string, unknown>;
type CommandHandler = (context: CommandContext, body: CommandBody, key: string, digest: string, client: import("pg").PoolClient, dealId: string) => Promise<unknown>;

function commandRoute<T extends z.ZodType<CommandBody>>(name: string, resourcePath: string, schema: T, handler: CommandHandler, deps: RouteDeps, database: Database, singular: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await deps.requireBanker(request, reply); if (!session) return; const key = deps.commandKey(request, reply); if (!key) return;
    const params = request.params as { deal_id: string };
    try {
      const dealId = uuid.parse(params.deal_id); const body = schema.parse(request.body) as CommandBody;
      const requestDigest = canonicalDigest({ method: "POST", route: `/api/v1/deals/{deal_id}/${name}`, api_version: "v1", deal_id: dealId, body });
      const result = await database.withContext(session, dealId, async (client, context) => handler({ accountId: context.accountId, actorId: context.actorId }, body, key, requestDigest, client, dealId));
      const response = contextResponse(result, reply, request, singular); if (response) return response; if (result.kind !== "ok") return;
      const value = result.value as { id?: string; idempotent_replayed?: boolean }; if (value.id) reply.header("Location", `/api/v1/deals/${dealId}/${resourcePath}/${value.id}`); return reply.header("Cache-Control", "private, no-store").code(value.idempotent_replayed ? 200 : 201).send({ data: value });
    } catch (error) { return mapError(error, request, reply); }
  };
}
