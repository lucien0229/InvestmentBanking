import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { canonicalDigest } from "./commerce.js";
import { Database } from "./database.js";

type Deps = {
  requireBanker: (request: FastifyRequest, reply: FastifyReply) => Promise<string | null>;
  commandKey: (request: FastifyRequest, reply: FastifyReply) => string | null;
};
const uuid = z.string().uuid();
const text = z.string().trim().min(1).max(500);
const revision = z.object({
  revision_id: uuid,
  package_role: z.enum(["analysis_valuation_workbook", "auction_control_workbook", "teaser", "cim", "conditional"]),
  inclusion_reason: text,
  stage_applicability: z.enum(["always_required", "current_stage_required", "conditional", "not_stage_required"]),
}).strict();
const control = z.object({
  control_kind: z.enum(["source_packet", "source_record", "evidence", "decision", "review", "qc_run", "qc_finding", "validation", "buyer_universe", "process_state", "confidentiality", "audience"]),
  control_id: uuid.optional(),
  control_role: text,
  basis: z.record(z.string(), z.unknown()).default({}),
}).strict();
const dependency = z.object({
  dependency_kind: z.enum(["source_packet_version", "source_record", "evidence", "fact", "assumption", "calculation_run", "model_version", "scenario_version", "buyer_candidate", "process_event", "human_decision"]),
  dependency_id: uuid,
  dependency_version: z.string().max(120).optional(),
  dependency_role: text,
}).strict();
const snapshotBody = z.object({
  revisions: z.array(revision).min(1).max(100),
  controls: z.array(control).max(200).default([]),
  dependencies: z.array(dependency).max(500).default([]),
  omissions: z.array(text).max(100).default([]),
  limitations: z.array(text).max(100).default([]),
  reason: text,
}).strict();
const packageBody = z.object({ purpose: text }).strict();

function problem(reply: FastifyReply, status: number, code: string, request: FastifyRequest) {
  return reply.code(status).type("application/problem+json").send({
    type: `https://investment-banking.local/problems/${code.replaceAll("_", "-")}`,
    title: code.replaceAll("_", " "), status, code, instance: request.url,
    detail: "The request could not be completed within the exact Deal-scoped control boundary.",
    outcome: "rejected", retryable: status === 401 || status === 503,
    recovery_action: status === 412 ? "reload_and_compare" : status === 404 ? "return_to_safe_parent" : "inspect_and_correct_request",
  });
}

function mapError(error: unknown, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof z.ZodError) return problem(reply, 400, "invalid_request", request);
  const code = error instanceof Error ? error.message : "unknown";
  if (["package_scope_unavailable", "package_snapshot_not_found", "package_revision_scope_mismatch"].includes(code)) return problem(reply, 404, "resource_not_found", request);
  if (code === "package_use_mismatch") return problem(reply, 409, code, request);
  if (code === "package_version_conflict") return problem(reply, 412, code, request);
  if (["package_revision_members_required", "package_revision_member_invalid", "package_required_revision_missing", "package_snapshot_scope_mismatch", "idempotency_key_reused"].includes(code)) return problem(reply, 409, code, request);
  return problem(reply, 503, "service_unavailable", request);
}

export function registerPreparationPackageRoutes(api: FastifyInstance, database: Database, deps: Deps) {
  const scoped = async (request: FastifyRequest, reply: FastifyReply, operation: (client: import("pg").PoolClient, dealId: string, actor: string) => Promise<unknown>, command = false) => {
    const session = await deps.requireBanker(request, reply);
    if (!session) return null;
    const key = command ? deps.commandKey(request, reply) : null;
    if (command && !key) return null;
    try {
      const dealId = uuid.parse((request.params as { deal_id: string }).deal_id);
      const result = await database.withContext(session, dealId, async (client, context) => operation(client, dealId, context.actorId));
      if (result.kind !== "ok") return problem(reply, result.kind === "invalid" ? 401 : result.kind === "passkey_required" ? 403 : 404, result.kind === "invalid" ? "session_expired" : result.kind === "passkey_required" ? "passkey_required" : "resource_not_found", request);
      if (result.value === null) return problem(reply, 404, "resource_not_found", request);
      const value = result.value as Record<string, unknown>;
      if (value.row_version) reply.header("ETag", `"${value.row_version}"`);
      return reply.code(value.idempotent_replayed ? 200 : command ? 201 : 200).header("Cache-Control", "private, no-store").send({ data: result.value });
    } catch (error) { return mapError(error, request, reply); }
  };
  const root = "/api/v1/deals/:deal_id/execution-packages";
  api.get(root, (request, reply) => scoped(request, reply, async (client) => (await client.query("SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.created_at DESC),'[]') AS data FROM deal.execution_package p")).rows[0]?.data ?? []));
  api.post(root, (request, reply) => scoped(request, reply, async (client) => {
    const body = packageBody.parse(request.body); const key = deps.commandKey(request, reply); if (!key) return null;
    const digest = canonicalDigest({ method: "POST", route: "/execution-packages", body });
    return (await client.query("SELECT deal.create_execution_package($1,$2,$3) AS data", [Database.hashToken(key), digest, body])).rows[0]?.data ?? null;
  }, true));
  api.get(`${root}/:package_id`, (request, reply) => scoped(request, reply, async (client) => {
    const packageId = uuid.parse((request.params as { package_id: string }).package_id);
    return (await client.query("SELECT to_jsonb(p)||jsonb_build_object('current_snapshot', (SELECT to_jsonb(s) FROM deal.package_snapshot s WHERE s.id=p.current_snapshot_id)) AS data FROM deal.execution_package p WHERE p.id=$1", [packageId])).rows[0]?.data ?? null;
  }));
  api.get(`${root}/:package_id/snapshots`, (request, reply) => scoped(request, reply, async (client) => {
    const packageId = uuid.parse((request.params as { package_id: string }).package_id);
    return (await client.query("SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.ordinal DESC),'[]') AS data FROM deal.package_snapshot s WHERE s.execution_package_id=$1", [packageId])).rows[0]?.data ?? [];
  }));
  api.post(`${root}/:package_id/snapshots`, async (request, reply) => {
    try {
      const body = snapshotBody.parse(request.body); const key = deps.commandKey(request, reply); if (!key) return;
      const match = String(request.headers["if-match"] ?? "").match(/^"([1-9]\d*)"$/); if (!match) return problem(reply, 428, "if_match_required", request);
      return scoped(request, reply, async (client) => {
        const packageId = uuid.parse((request.params as { package_id: string }).package_id);
        const digest = canonicalDigest({ method: "POST", route: "/execution-packages/{package_id}/snapshots", package_id: packageId, body });
        return (await client.query("SELECT deal.create_package_snapshot($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) AS data", [packageId, Number(match[1]), Database.hashToken(key), digest, JSON.stringify(body.revisions), JSON.stringify(body.controls), JSON.stringify(body.dependencies), JSON.stringify(body.omissions), JSON.stringify(body.limitations), body.reason])).rows[0]?.data ?? null;
      }, true);
    } catch (error) { return mapError(error, request, reply); }
  });
  api.get(`${root}/:package_id/snapshots/:snapshot_id`, (request, reply) => scoped(request, reply, async (client) => {
    const p = request.params as { package_id: string; snapshot_id: string }; const packageId = uuid.parse(p.package_id); const snapshotId = uuid.parse(p.snapshot_id);
    return (await client.query("SELECT to_jsonb(s)||jsonb_build_object('revisions',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.package_role),'[]') FROM deal.package_snapshot_revision r WHERE r.snapshot_id=s.id),'controls',(SELECT coalesce(jsonb_agg(to_jsonb(c)),'[]') FROM deal.package_snapshot_control c WHERE c.snapshot_id=s.id),'dependencies',(SELECT coalesce(jsonb_agg(to_jsonb(d)),'[]') FROM deal.package_snapshot_dependency d WHERE d.snapshot_id=s.id)) AS data FROM deal.package_snapshot s WHERE s.id=$1 AND s.execution_package_id=$2", [snapshotId, packageId])).rows[0]?.data ?? null;
  }));
  api.get(`${root}/:package_id/snapshots/:snapshot_id/readiness`, (request, reply) => scoped(request, reply, async (client) => {
    const p = request.params as { package_id: string; snapshot_id: string }; const query = z.object({ purpose: text, audience: text }).strict().parse(request.query); const packageId = uuid.parse(p.package_id); const snapshotId = uuid.parse(p.snapshot_id);
    return (await client.query("SELECT deal.get_package_readiness($1,$3,$4) AS data FROM deal.package_snapshot s WHERE s.id=$1 AND s.execution_package_id=$2", [snapshotId, packageId, query.purpose, query.audience])).rows[0]?.data ?? null;
  }));
}
