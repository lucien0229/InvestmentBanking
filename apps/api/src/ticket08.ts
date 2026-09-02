import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type pg from "pg";
import { Database } from "./database.js";
import { canonicalDigest } from "./commerce.js";

const uuid = z.string().uuid();
const problemType = "https://investment-banking.local/problems";

type Ticket08Deps = {
  requireBanker: (request: FastifyRequest, reply: FastifyReply) => Promise<string | null>;
  commandKey: (request: FastifyRequest, reply: FastifyReply) => string | null;
};

function problem(reply: FastifyReply, status: number, code: string, detail: string, recovery: string, instance: string) {
  return reply.code(status).type("application/problem+json").send({
    type: `${problemType}/${code.replaceAll("_", "-")}`,
    title: code === "resource_not_found" ? "Resource not found" : code.replaceAll("_", " "),
    status,
    code,
    detail,
    instance,
    outcome: "rejected",
    retryable: status === 401 || status === 429 || status === 503,
    recovery_action: recovery,
  });
}

function errorCode(error: unknown) {
  return error && typeof error === "object" && "message" in error ? String(error.message) : String(error);
}

function ticket08Error(error: unknown, request: FastifyRequest, reply: FastifyReply) {
  const code = errorCode(error);
  const mappings: Record<string, [number, string, string, string]> = {
    source_packet_scope_mismatch: [404, "resource_not_found", "The Source Packet is not available in this Deal.", "return_to_safe_parent"],
    source_packet_current_pointer_mismatch: [409, "version_conflict", "The Source Packet current version is inconsistent; reload the packet.", "reload_source_packet"],
    source_packet_version_conflict: [412, "version_conflict", "The Source Packet changed after it was loaded.", "reload_source_packet"],
    source_packet_members_invalid: [400, "invalid_request", "Each selected Source Record and exclusion needs an explicit reason.", "correct_request"],
    source_record_scope_mismatch: [404, "resource_not_found", "The Source Record is not available in this Deal.", "return_to_sources"],
    work_objective_scope_mismatch: [404, "resource_not_found", "The Work Objective or Source Packet version is not available in this Deal.", "return_to_source_packet"],
    source_condition_scope_mismatch: [404, "resource_not_found", "The Source Record condition is not available in this Deal.", "return_to_sources"],
    source_rights_scope_mismatch: [404, "resource_not_found", "The Source Record rights posture is not available in this Deal.", "return_to_sources"],
    source_packet_purpose_mismatch: [409, "preflight_required", "The packet purpose is outside the Deal's current Paid Preflight scope.", "run_targeted_re_preflight"],
    idempotency_key_reused: [409, "idempotency_key_reused", "This command key was already used for a different request.", "use_new_idempotency_key"],
    output_ceiling_exceeded: [409, "output_ceiling_exceeded", "The requested operation exceeds the current Source Packet Output Ceiling.", "resolve_source_packet_blocker"],
    source_condition_blocked: [409, "source_condition_blocked", "Prospective reliance is blocked for the affected Source Record.", "replace_remove_or_narrow_source"],
    output_ceiling_missing: [409, "output_ceiling_missing", "No Output Ceiling is available for this exact Work Objective.", "rebuild_source_packet_ceiling"],
    packet_worker_scope_mismatch: [404, "resource_not_found", "The packet worker input is not available in this Deal.", "return_to_safe_parent"],
  };
  const mapping = Object.entries(mappings).find(([key]) => code.includes(key))?.[1];
  if (!mapping) throw error;
  return problem(reply, mapping[0], mapping[1], mapping[2], mapping[3], request.url);
}

function packetEtag(version: number | string) {
  return `"source-packet-${Number(version)}"`;
}

function expectedPacketVersion(value: string | undefined) {
  const match = value?.match(/^(?:W\/)?"source-packet-(\d+)"$/);
  return match ? Number(match[1]) : null;
}

const packetCreateSchema = z.object({
  packet_name: z.string().min(1).max(160).optional(),
  name: z.string().min(1).max(160).optional(),
  purpose: z.string().min(1).max(120).optional(),
  purpose_code: z.string().min(1).max(120).optional(),
}).strict().superRefine((value, context) => {
  if (!value.packet_name && !value.name) context.addIssue({ code: "custom", path: ["packet_name"], message: "packet_name is required" });
  if (!value.purpose && !value.purpose_code) context.addIssue({ code: "custom", path: ["purpose"], message: "purpose is required" });
});

const memberSchema = z.object({
  source_record_id: uuid,
  member_role: z.string().min(1).max(80).optional(),
  inclusion_reason: z.string().min(1).max(500).optional(),
  reason: z.string().min(1).max(500).optional(),
  sort_key: z.number().int().min(0).max(100000).optional(),
}).strict().superRefine((value, context) => {
  if (!value.inclusion_reason && !value.reason) context.addIssue({ code: "custom", path: ["inclusion_reason"], message: "inclusion_reason is required" });
});

const exclusionSchema = z.union([
  z.string().min(1).max(500),
  z.object({ material: z.string().min(1).max(500), reason: z.string().min(1).max(500).optional() }).strict(),
]);

const packetVersionSchema = z.object({
  purpose: z.string().min(1).max(120).optional(),
  purpose_code: z.string().min(1).max(120).optional(),
  scope_statement: z.string().min(1).max(1000),
  change_reason: z.string().min(1).max(500),
  members: z.array(memberSchema).max(200).optional(),
  selected_source_records: z.array(memberSchema).max(200).optional(),
  declared_exclusions: z.array(exclusionSchema).max(200).default([]),
}).strict().superRefine((value, context) => {
  if (!value.purpose && !value.purpose_code) context.addIssue({ code: "custom", path: ["purpose"], message: "purpose is required" });
  if (!value.members && !value.selected_source_records) context.addIssue({ code: "custom", path: ["members"], message: "members is required" });
});

const objectiveSchema = z.object({
  packet_version_id: uuid,
  objective_type: z.enum(["analysis", "deliverable", "process", "question"]),
  purpose: z.string().min(1).max(120),
  objective_text: z.string().min(1).max(1000),
  intended_use: z.enum(["internal_deal_execution", "internal_analysis", "controlled_export", "external_distribution"]),
  intended_audience: z.string().min(1).max(240),
  requested_scope: z.string().min(1).max(1000),
}).strict();

const conditionSchema = z.object({
  purpose: z.string().min(1).max(120),
  freshness: z.enum(["current", "stale", "unknown"]).optional(),
  freshness_code: z.enum(["current", "stale", "unknown"]).optional(),
  conflict: z.enum(["none", "conflicted", "unknown"]).optional(),
  conflict_code: z.enum(["none", "conflicted", "unknown"]).optional(),
  disposition: z.enum(["active", "superseded", "withdrawn", "historical"]).optional(),
  disposition_code: z.enum(["active", "superseded", "withdrawn", "historical"]).optional(),
  basis: z.record(z.string(), z.unknown()).default({}),
  effective_at: z.string().datetime().optional(),
}).strict().superRefine((value, context) => {
  if (!value.freshness && !value.freshness_code) context.addIssue({ code: "custom", path: ["freshness"], message: "freshness is required" });
  if (!value.conflict && !value.conflict_code) context.addIssue({ code: "custom", path: ["conflict"], message: "conflict is required" });
  if (!value.disposition && !value.disposition_code) context.addIssue({ code: "custom", path: ["disposition"], message: "disposition is required" });
});
const conditionCommandSchema = conditionSchema.extend({ source_record_id: uuid });

const rightsSchema = z.object({
  source_record_id: uuid,
  purpose: z.string().min(1).max(120),
  rights: z.enum(["unassessed", "allowed", "limited", "blocked", "withdrawn"]).optional(),
  rights_code: z.enum(["unassessed", "allowed", "limited", "blocked", "withdrawn"]).optional(),
  permitted_operations: z.array(z.string().min(1).max(100)).max(30).default([]),
  conditions: z.array(z.string().max(500)).max(30).default([]),
  basis: z.record(z.string(), z.unknown()).default({}),
}).strict().superRefine((value, context) => {
  if (!value.rights && !value.rights_code) context.addIssue({ code: "custom", path: ["rights"], message: "rights is required" });
});

async function scopedResult<T>(database: Database, session: string, dealId: string, fn: (client: pg.PoolClient, context: { accountId: string; actorId: string }) => Promise<T>) {
  return database.withContext(session, dealId, async (client, context) => fn(client, context));
}

type CommandResult<T> = { response: T; statusCode: number; replayed: boolean };

async function commandStart<T>(client: pg.PoolClient, context: { accountId: string; actorId: string }, dealId: string, commandType: string, key: string, requestDigest: string): Promise<CommandResult<T> | null> {
  const keyHash = Database.hashToken(key);
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`ticket08:${context.accountId}:${context.actorId}:${commandType}:${keyHash}`]);
  const row = (await client.query<{ response: T | null; status_code: number | null; idempotent_replayed: boolean }>("SELECT * FROM source.ticket08_command_replay($1,$2,$3,$4,$5,$6)", [context.accountId, context.actorId, dealId, commandType, keyHash, requestDigest])).rows[0];
  return row?.idempotent_replayed ? { response: row.response as T, statusCode: Number(row.status_code), replayed: true } : null;
}

async function commandRecord(client: pg.PoolClient, context: { accountId: string; actorId: string }, dealId: string, commandType: string, key: string, requestDigest: string, response: unknown, statusCode: number) {
  await client.query("SELECT source.ticket08_command_record($1,$2,$3,$4,$5,$6,$7,$8)", [context.accountId, context.actorId, dealId, commandType, Database.hashToken(key), requestDigest, JSON.stringify(response), statusCode]);
}

async function scopedCommand<T>(database: Database, session: string, dealId: string, commandType: string, key: string, requestDigest: string, fn: (client: pg.PoolClient, context: { accountId: string; actorId: string }) => Promise<T>) {
  return scopedResult(database, session, dealId, async (client, context) => {
    const replay = await commandStart<T>(client, context, dealId, commandType, key, requestDigest);
    if (replay) return replay;
    const response = await fn(client, context);
    await commandRecord(client, context, dealId, commandType, key, requestDigest, response, 201);
    return { response, statusCode: 201, replayed: false } satisfies CommandResult<T>;
  });
}

export function registerTicket08Routes(api: FastifyInstance, database: Database, deps: Ticket08Deps) {
  api.post<{ Params: { deal_id: string } }>("/api/v1/deals/:deal_id/source-packets", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id);
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const key = deps.commandKey(request, reply); if (!key) return;
    const body = packetCreateSchema.parse(request.body);
    const requestDigest = canonicalDigest({ method: "POST", route: "/api/v1/deals/{deal_id}/source-packets", api_version: "v1", deal_id: dealId, body });
    try {
      const result = await scopedCommand(database, session, dealId, "create_source_packet", key, requestDigest, async (client, context) => (await client.query<{ packet: Record<string, unknown> }>("SELECT source.create_source_packet($1,$2,$3,$4,$5) AS packet", [context.accountId, context.actorId, dealId, body.packet_name ?? body.name, body.purpose ?? body.purpose_code])).rows[0]?.packet ?? null);
      if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
      if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
      if (result.kind !== "ok" || result.value.response === null) return problem(reply, 404, "resource_not_found", "The Deal is not available.", "return_to_safe_parent", request.url);
      reply.header("ETag", packetEtag(1)); if (result.value.replayed) reply.header("Idempotent-Replayed", "true");
      return reply.code(result.value.statusCode).send({ data: result.value.response });
    } catch (error) { return ticket08Error(error, request, reply); }
  });

  api.get<{ Params: { deal_id: string } }>("/api/v1/deals/:deal_id/source-packets", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id);
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const result = await scopedResult(database, session, dealId, async (client) => (await client.query("SELECT p.id,p.packet_name,p.purpose_code AS purpose,p.owner_actor_id,p.current_version_id,p.row_version,p.created_at FROM source.source_packet p WHERE p.deal_id=$1 ORDER BY p.created_at", [dealId])).rows);
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
    if (result.kind !== "ok") return problem(reply, 404, "resource_not_found", "The Deal is not available.", "return_to_safe_parent", request.url);
    return reply.code(200).header("Cache-Control", "private, no-store").send({ data: result.value });
  });

  api.get<{ Params: { deal_id: string; source_packet_id: string } }>("/api/v1/deals/:deal_id/source-packets/:source_packet_id", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id); const packetId = uuid.parse(request.params.source_packet_id);
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const result = await scopedResult(database, session, dealId, async (client, context) => (await client.query<{ projection: Record<string, unknown> | null }>("SELECT source.get_source_packet_projection($1,$2,$3,$4) AS projection", [context.accountId, context.actorId, dealId, packetId])).rows[0]?.projection ?? null);
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
    if (result.kind !== "ok" || result.value === null || !(result.value as { id?: string }).id) return problem(reply, 404, "resource_not_found", "The Source Packet is not available.", "return_to_safe_parent", request.url);
    reply.header("ETag", packetEtag(Number((result.value as { row_version: number }).row_version)));
    return reply.code(200).header("Cache-Control", "private, no-store").send({ data: result.value });
  });

  api.post<{ Params: { deal_id: string; source_packet_id: string } }>("/api/v1/deals/:deal_id/source-packets/:source_packet_id/versions", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id); const packetId = uuid.parse(request.params.source_packet_id);
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const key = deps.commandKey(request, reply); if (!key) return;
    const expected = expectedPacketVersion(typeof request.headers["if-match"] === "string" ? request.headers["if-match"] : undefined);
    if (expected === null) return problem(reply, 428, "precondition_required", "If-Match must identify the current Source Packet version.", "reload_source_packet", request.url);
    const body = packetVersionSchema.parse(request.body);
    const requestDigest = canonicalDigest({ method: "POST", route: "/api/v1/deals/{deal_id}/source-packets/{source_packet_id}/versions", api_version: "v1", deal_id: dealId, source_packet_id: packetId, body });
    try {
      const members = (body.members ?? body.selected_source_records ?? []).map((member) => ({ source_record_id: member.source_record_id, member_role: member.member_role ?? "evidence_input", inclusion_reason: member.inclusion_reason ?? member.reason, sort_key: member.sort_key ?? 0 }));
      const exclusions = body.declared_exclusions.map((item) => typeof item === "string" ? item : { material: item.material, reason: item.reason ?? "declared outside this packet" });
      const result = await scopedCommand(database, session, dealId, "create_source_packet_version", key, requestDigest, async (client, context) => (await client.query<{ version: Record<string, unknown> }>("SELECT source.create_source_packet_version($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) AS version", [context.accountId, context.actorId, dealId, packetId, expected, body.purpose ?? body.purpose_code, body.scope_statement, body.change_reason, JSON.stringify(members), JSON.stringify(exclusions)])).rows[0]?.version ?? null);
      if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
      if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
      if (result.kind !== "ok" || result.value.response === null) return problem(reply, 404, "resource_not_found", "The Source Packet is not available.", "return_to_safe_parent", request.url);
      reply.header("ETag", packetEtag(Number((result.value.response as { packet_row_version: number }).packet_row_version))); if (result.value.replayed) reply.header("Idempotent-Replayed", "true");
      return reply.code(result.value.statusCode).send({ data: result.value.response });
    } catch (error) { return ticket08Error(error, request, reply); }
  });

  api.get<{ Params: { deal_id: string; source_packet_id: string } }>("/api/v1/deals/:deal_id/source-packets/:source_packet_id/versions", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id); const packetId = uuid.parse(request.params.source_packet_id);
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const result = await scopedResult(database, session, dealId, async (client) => (await client.query("SELECT v.id,v.packet_id,v.version_ordinal AS version,v.purpose_code AS purpose,v.scope_statement,v.change_reason,v.created_by,v.created_at FROM source.source_packet_version v WHERE v.packet_id=$1 AND v.deal_id=$2 ORDER BY v.version_ordinal", [packetId, dealId])).rows);
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
    if (result.kind !== "ok") return problem(reply, 404, "resource_not_found", "The Source Packet is not available.", "return_to_safe_parent", request.url);
    return reply.code(200).header("Cache-Control", "private, no-store").send({ data: result.value });
  });

  api.get<{ Params: { deal_id: string; source_packet_id: string; version_id: string } }>("/api/v1/deals/:deal_id/source-packets/:source_packet_id/versions/:version_id", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id); const packetId = uuid.parse(request.params.source_packet_id); const versionId = uuid.parse(request.params.version_id);
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const result = await scopedResult(database, session, dealId, async (client, context) => (await client.query<{ projection: Record<string, unknown> | null }>("SELECT source.get_source_packet_version_projection($1,$2,$3,$4,$5) AS projection", [context.accountId, context.actorId, dealId, packetId, versionId])).rows[0]?.projection ?? null);
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
    if (result.kind !== "ok" || result.value === null || !(result.value as { requested_version_exists?: boolean }).requested_version_exists) return problem(reply, 404, "resource_not_found", "The Source Packet version is not available.", "return_to_safe_parent", request.url);
    return reply.code(200).header("Cache-Control", "private, no-store").send({ data: result.value });
  });

  api.post<{ Params: { deal_id: string } }>("/api/v1/deals/:deal_id/work-objectives", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id); const session = await deps.requireBanker(request, reply); if (!session) return; const key = deps.commandKey(request, reply); if (!key) return; const body = objectiveSchema.parse(request.body);
    const requestDigest = canonicalDigest({ method: "POST", route: "/api/v1/deals/{deal_id}/work-objectives", api_version: "v1", deal_id: dealId, body });
    try {
      const result = await scopedCommand(database, session, dealId, "create_work_objective", key, requestDigest, async (client, context) => (await client.query<{ objective: Record<string, unknown> }>("SELECT source.create_work_objective($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) AS objective", [context.accountId, context.actorId, dealId, body.packet_version_id, body.objective_type, body.purpose, body.objective_text, body.intended_use, body.intended_audience, body.requested_scope])).rows[0]?.objective ?? null);
      if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
      if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
      if (result.kind !== "ok" || result.value.response === null) return problem(reply, 404, "resource_not_found", "The Deal is not available.", "return_to_safe_parent", request.url);
      if (result.value.replayed) reply.header("Idempotent-Replayed", "true");
      return reply.code(result.value.statusCode).send({ data: result.value.response });
    } catch (error) { return ticket08Error(error, request, reply); }
  });

  api.get<{ Params: { deal_id: string } }>("/api/v1/deals/:deal_id/work-objectives", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id); const session = await deps.requireBanker(request, reply); if (!session) return;
    const result = await scopedResult(database, session, dealId, async (client) => (await client.query("SELECT o.id,o.packet_version_id,o.objective_type,o.purpose_code AS purpose,o.objective_text,o.intended_use,o.intended_audience,o.requested_scope,o.status_code AS status,o.actor_id,o.created_at FROM app.work_objective o WHERE o.deal_id=$1 ORDER BY o.created_at", [dealId])).rows);
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
    if (result.kind !== "ok") return problem(reply, 404, "resource_not_found", "The Deal is not available.", "return_to_safe_parent", request.url);
    return reply.code(200).header("Cache-Control", "private, no-store").send({ data: result.value });
  });

  api.get<{ Params: { deal_id: string; work_objective_id: string } }>("/api/v1/deals/:deal_id/work-objectives/:work_objective_id", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id); const objectiveId = uuid.parse(request.params.work_objective_id); const session = await deps.requireBanker(request, reply); if (!session) return;
    const result = await scopedResult(database, session, dealId, async (client, context) => (await client.query("SELECT id,packet_version_id,objective_type,purpose_code AS purpose,objective_text,intended_use,intended_audience,requested_scope,status_code AS status,actor_id,created_at FROM app.work_objective WHERE id=$1 AND account_id=$2 AND deal_id=$3", [objectiveId, context.accountId, dealId])).rows[0] ?? null);
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
    if (result.kind !== "ok" || result.value === null) return problem(reply, 404, "resource_not_found", "The Work Objective is not available.", "return_to_source_packet", request.url);
    return reply.code(200).header("Cache-Control", "private, no-store").send({ data: result.value });
  });

  api.get<{ Params: { deal_id: string } }>("/api/v1/deals/:deal_id/condition-assessments", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id); const session = await deps.requireBanker(request, reply); if (!session) return;
    const result = await scopedResult(database, session, dealId, async (client, context) => (await client.query("SELECT id,source_record_id,purpose_code AS purpose,freshness_code AS freshness,conflict_code AS conflict,disposition_code AS disposition,basis,effective_at,recorded_by,created_at,supersedes_id FROM source.source_condition_assessment WHERE account_id=$1 AND deal_id=$2 ORDER BY created_at", [context.accountId, dealId])).rows);
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
    if (result.kind !== "ok") return problem(reply, 404, "resource_not_found", "The Deal is not available.", "return_to_safe_parent", request.url);
    return reply.code(200).header("Cache-Control", "private, no-store").send({ data: result.value });
  });

  api.get<{ Params: { deal_id: string; assessment_id: string } }>("/api/v1/deals/:deal_id/condition-assessments/:assessment_id", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id); const assessmentId = uuid.parse(request.params.assessment_id); const session = await deps.requireBanker(request, reply); if (!session) return;
    const result = await scopedResult(database, session, dealId, async (client, context) => (await client.query("SELECT id,source_record_id,purpose_code AS purpose,freshness_code AS freshness,conflict_code AS conflict,disposition_code AS disposition,basis,effective_at,recorded_by,created_at,supersedes_id FROM source.source_condition_assessment WHERE id=$1 AND account_id=$2 AND deal_id=$3", [assessmentId, context.accountId, dealId])).rows[0] ?? null);
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
    if (result.kind !== "ok" || result.value === null) return problem(reply, 404, "resource_not_found", "The condition assessment is not available.", "return_to_sources", request.url);
    return reply.code(200).header("Cache-Control", "private, no-store").send({ data: result.value });
  });

  api.get<{ Params: { deal_id: string } }>("/api/v1/deals/:deal_id/rights-assessments", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id); const session = await deps.requireBanker(request, reply); if (!session) return;
    const result = await scopedResult(database, session, dealId, async (client, context) => (await client.query("SELECT id,source_record_id,purpose_code AS purpose,rights_code AS rights,permitted_operations,conditions,basis,effective_at,recorded_by,created_at,supersedes_id FROM source.source_rights_posture_assessment WHERE account_id=$1 AND deal_id=$2 ORDER BY created_at", [context.accountId, dealId])).rows);
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
    if (result.kind !== "ok") return problem(reply, 404, "resource_not_found", "The Deal is not available.", "return_to_safe_parent", request.url);
    return reply.code(200).header("Cache-Control", "private, no-store").send({ data: result.value });
  });

  api.get<{ Params: { deal_id: string; assessment_id: string } }>("/api/v1/deals/:deal_id/rights-assessments/:assessment_id", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id); const assessmentId = uuid.parse(request.params.assessment_id); const session = await deps.requireBanker(request, reply); if (!session) return;
    const result = await scopedResult(database, session, dealId, async (client, context) => (await client.query("SELECT id,source_record_id,purpose_code AS purpose,rights_code AS rights,permitted_operations,conditions,basis,effective_at,recorded_by,created_at,supersedes_id FROM source.source_rights_posture_assessment WHERE id=$1 AND account_id=$2 AND deal_id=$3", [assessmentId, context.accountId, dealId])).rows[0] ?? null);
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
    if (result.kind !== "ok" || result.value === null) return problem(reply, 404, "resource_not_found", "The rights assessment is not available.", "return_to_sources", request.url);
    return reply.code(200).header("Cache-Control", "private, no-store").send({ data: result.value });
  });

  api.post<{ Params: { deal_id: string } }>("/api/v1/deals/:deal_id/condition-assessments", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id); const session = await deps.requireBanker(request, reply); if (!session) return; const key = deps.commandKey(request, reply); if (!key) return; const body = conditionCommandSchema.parse(request.body);
    const requestDigest = canonicalDigest({ method: "POST", route: "/api/v1/deals/{deal_id}/condition-assessments", api_version: "v1", deal_id: dealId, body });
    try {
      const result = await scopedCommand(database, session, dealId, "create_source_condition_assessment", key, requestDigest, async (client, context) => (await client.query<{ assessment: Record<string, unknown> }>("SELECT source.create_source_condition_assessment($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) AS assessment", [context.accountId, context.actorId, dealId, body.source_record_id, body.purpose, body.freshness ?? body.freshness_code, body.conflict ?? body.conflict_code, body.disposition ?? body.disposition_code, JSON.stringify(body.basis), body.effective_at ?? null])).rows[0]?.assessment ?? null);
      if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
      if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
      if (result.kind !== "ok" || result.value.response === null) return problem(reply, 404, "resource_not_found", "The Source Record is not available.", "return_to_sources", request.url);
      if (result.value.replayed) reply.header("Idempotent-Replayed", "true");
      return reply.code(result.value.statusCode).send({ data: result.value.response });
    } catch (error) { return ticket08Error(error, request, reply); }
  });

  api.post<{ Params: { deal_id: string; source_record_id: string } }>("/api/v1/deals/:deal_id/source-records/:source_record_id/condition-assessments", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id); const recordId = uuid.parse(request.params.source_record_id); const session = await deps.requireBanker(request, reply); if (!session) return; const key = deps.commandKey(request, reply); if (!key) return; const body = conditionSchema.parse(request.body);
    const requestDigest = canonicalDigest({ method: "POST", route: "/api/v1/deals/{deal_id}/source-records/{source_record_id}/condition-assessments", api_version: "v1", deal_id: dealId, source_record_id: recordId, body });
    try {
      const result = await scopedCommand(database, session, dealId, "create_source_condition_assessment", key, requestDigest, async (client, context) => (await client.query<{ assessment: Record<string, unknown> }>("SELECT source.create_source_condition_assessment($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) AS assessment", [context.accountId, context.actorId, dealId, recordId, body.purpose, body.freshness ?? body.freshness_code, body.conflict ?? body.conflict_code, body.disposition ?? body.disposition_code, JSON.stringify(body.basis), body.effective_at ?? null])).rows[0]?.assessment ?? null);
      if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
      if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
      if (result.kind !== "ok" || result.value.response === null) return problem(reply, 404, "resource_not_found", "The Source Record is not available.", "return_to_sources", request.url);
      if (result.value.replayed) reply.header("Idempotent-Replayed", "true");
      return reply.code(result.value.statusCode).send({ data: result.value.response });
    } catch (error) { return ticket08Error(error, request, reply); }
  });

  api.post<{ Params: { deal_id: string } }>("/api/v1/deals/:deal_id/rights-assessments", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id); const session = await deps.requireBanker(request, reply); if (!session) return; const key = deps.commandKey(request, reply); if (!key) return; const body = rightsSchema.parse(request.body);
    const requestDigest = canonicalDigest({ method: "POST", route: "/api/v1/deals/{deal_id}/rights-assessments", api_version: "v1", deal_id: dealId, body });
    try {
      const result = await scopedCommand(database, session, dealId, "create_source_rights_assessment", key, requestDigest, async (client, context) => (await client.query<{ assessment: Record<string, unknown> }>("SELECT source.create_source_rights_assessment($1,$2,$3,$4,$5,$6,$7,$8,$9) AS assessment", [context.accountId, context.actorId, dealId, body.source_record_id, body.purpose, body.rights ?? body.rights_code, JSON.stringify(body.permitted_operations), JSON.stringify(body.conditions), JSON.stringify(body.basis)])).rows[0]?.assessment ?? null);
      if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
      if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
      if (result.kind !== "ok" || result.value.response === null) return problem(reply, 404, "resource_not_found", "The Source Record is not available.", "return_to_sources", request.url);
      if (result.value.replayed) reply.header("Idempotent-Replayed", "true");
      return reply.code(result.value.statusCode).send({ data: result.value.response });
    } catch (error) { return ticket08Error(error, request, reply); }
  });
}
