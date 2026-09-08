import crypto from "node:crypto";
import fs from "node:fs/promises";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type pg from "pg";
import { z } from "zod";
import { Database } from "./database.js";
import { AuthError, type AuthAdapter, type AuthMode } from "./auth.js";
import { canonicalDigest } from "./commerce.js";
import { decryptProtected, protectedPath } from "./sources.js";
import { sha256 } from "./artifact-integrity.js";

type Dependencies = {
  auth: AuthAdapter;
  authMode: AuthMode;
  requireBanker(request: FastifyRequest, reply: FastifyReply): Promise<string | null>;
  commandKey(request: FastifyRequest, reply: FastifyReply): string | null;
};
const uuid = z.string().uuid();
function problem(reply: FastifyReply, status: number, code: string) {
  return reply.code(status).type("application/problem+json").send({
    code, status, title: code.replaceAll("_", " "), detail: code.replaceAll("_", " "),
    outcome: "rejected", recovery_action: status === 401 ? "reauthenticate" : status === 412 ? "reload_and_compare" : "return_to_saved_export_review",
  });
}
export function registerControlledExportRoutes(api: FastifyInstance, database: Database, deps: Dependencies) {
  const scoped = (fn: (client: pg.PoolClient, request: FastifyRequest, session: string) => Promise<unknown>, status = 200) => async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await deps.requireBanker(request, reply);
    if (!session) return;
    if (request.method === "POST" && !deps.commandKey(request, reply)) return;
    try {
      const deal = uuid.parse((request.params as { deal_id: string }).deal_id);
      const result = await database.withContext(session, deal, (client) => fn(client, request, session));
      if (result.kind !== "ok") return problem(reply, result.kind === "invalid" ? 401 : result.kind === "not_found" ? 404 : 403, result.kind === "not_found" ? "resource_not_found" : "authentication_required");
      return reply.code(status).header("cache-control", "private, no-store").send({ data: result.value });
    } catch (error) {
      if (error instanceof z.ZodError) return problem(reply, 400, "invalid_request");
      const code = error instanceof Error ? error.message : "";
      if (code === "export_scope_unavailable") return problem(reply, 404, "resource_not_found");
      if (code === "export_version_conflict") return problem(reply, 412, code);
      if (code === "export_precondition_required") return problem(reply, 428, code);
      if (/^(guide_|export_|sensitive_|passkey_|idempotency_key_reused)/.test(code)) return problem(reply, 409, code);
      throw error;
    }
  };
  const query = async (client: pg.PoolClient, sql: string, values: unknown[] = []) => (await client.query<{ data: unknown }>(sql, values)).rows[0]?.data ?? null;
  const root = "/api/v1/deals/:deal_id";
  api.get(`${root}/guide`, scoped((client) => query(client, "SELECT external_use.guide_projection() AS data")));
  api.get(`${root}/guide/revisions/:revision_id`, scoped((client, request) => query(client, "SELECT external_use.inspection_projection($1) AS data", [uuid.parse((request.params as { revision_id: string }).revision_id)])));
  api.post(`${root}/guide/observations`, scoped((client, request) => {
    const body = z.object({ revision_id: uuid, checkpoint: z.enum(["evidence", "decision_validation", "native", "reader", "readiness"]), inspection_digest: z.string().regex(/^[a-f0-9]{64}$/) }).strict().parse(request.body);
    return query(client, "SELECT external_use.observe_control($1,$2,$3) AS data", [body.revision_id, body.checkpoint, body.inspection_digest]);
  }, 201));
  api.post(`${root}/guide/graduations`, scoped(async (client, request) => {
    z.object({ intent: z.literal("enter_deal_execution_desk") }).strict().parse(request.body);
    const match = request.headers["if-match"];
    if (typeof match !== "string" || !/^"[1-9]\d*"$/.test(match)) throw new Error("export_precondition_required");
    return query(client, "SELECT external_use.graduate_guide($1) AS data", [Number(match.slice(1, -1))]);
  }, 201));
  api.post(`${root}/internal-export-reviews`, scoped((client, request) => {
    const body = z.object({ revision_id: uuid, purpose: z.enum(["inspection", "native_editing", "backup", "controlled_reimport"]) }).strict().parse(request.body);
    return query(client, "SELECT external_use.prepare_export($1,$2) AS data", [body.revision_id, body.purpose]);
  }, 201));
  api.get(`${root}/internal-export-reviews/:review_id`, scoped(async (client, request) => {
    const row = await query(client, "SELECT to_jsonb(r) AS data FROM external_use.export_review r WHERE id=$1", [uuid.parse((request.params as { review_id: string }).review_id)]);
    if (!row) throw new Error("export_scope_unavailable");
    return row;
  }));
  api.get(`${root}/internal-controlled-exports`, scoped((client) => query(client, "SELECT coalesce(jsonb_agg(external_use.export_projection(e.id) ORDER BY e.created_at DESC),'[]') AS data FROM external_use.internal_export e")));
  api.get(`${root}/internal-controlled-exports/:export_id`, scoped(async (client, request) => {
    const row = await query(client, "SELECT external_use.export_projection($1) AS data", [uuid.parse((request.params as { export_id: string }).export_id)]);
    if (!row) throw new Error("export_scope_unavailable");
    return row;
  }));
  api.post(`${root}/internal-controlled-exports/:export_id/controls`, scoped((client, request) => {
    const body = z.object({ action: z.enum(["cancel", "retry"]) }).strict().parse(request.body);
    const match = request.headers["if-match"];
    if (typeof match !== "string" || !/^"[1-9]\d*"$/.test(match)) throw new Error("export_precondition_required");
    return query(client, "SELECT external_use.control_export($1,$2,$3) AS data", [uuid.parse((request.params as { export_id: string }).export_id), body.action, Number(match.slice(1, -1))]);
  }, 201));
  api.post(`${root}/internal-controlled-exports/:export_id/object-grants`, scoped(async (client, request, session) => {
    const body = downloadCommand.parse(request.body);
    if (body.export_id !== (request.params as { export_id: string }).export_id) throw new Error("export_scope_unavailable");
    const token = crypto.randomBytes(32).toString("base64url");
    const dealId = (request.params as { deal_id: string }).deal_id;
    const result = await query(client, "SELECT external_use.create_stream_grant($1,$2,$3,$4,$5,$6,$7) AS data", [body.export_id, Database.hashToken(session), Database.hashToken(String(request.headers["sensitive-action-grant"] ?? "")), Database.hashToken(token), exportCommandDigest(dealId, "export_object_retrieval", body), dependencyHeader(request), Database.hashToken(String(request.headers["idempotency-key"]))]);
    return { ...(result as object), grant_token: token };
  }, 201));
  api.get(`${root}/internal-controlled-exports/:export_id/content`, async (request, reply) => {
    const session = await deps.requireBanker(request, reply);
    if (!session) return;
    const token = request.headers.authorization?.match(/^ObjectGrant ([A-Za-z0-9_-]{43})$/)?.[1];
    if (!token) return problem(reply, 401, "export_stream_grant_invalid");
    const params = request.params as { deal_id: string; export_id: string };
    try {
      const result = await database.withContext(session, uuid.parse(params.deal_id), (client) => query(client, "SELECT external_use.resolve_stream($1,$2,$3) AS data", [uuid.parse(params.export_id), Database.hashToken(session), Database.hashToken(token)]));
      if (result.kind !== "ok") return problem(reply, result.kind === "not_found" ? 404 : 401, "resource_not_found");
      const object = result.value as { storage_key: string; sha256: string; ciphertext_sha256: string; byte_length: number };
      const stored = await fs.readFile(protectedPath(object.storage_key));
      if (sha256(stored) !== object.ciphertext_sha256) throw new Error("export_artifact_integrity_failed");
      const { plaintext } = await decryptProtected(stored);
      if (sha256(plaintext) !== object.sha256 || plaintext.length !== Number(object.byte_length)) throw new Error("export_artifact_integrity_failed");
      return reply.type("application/zip").header("cache-control", "private, no-store").header("content-disposition", `attachment; filename="internal-export-${params.export_id}.zip"`).header("x-content-type-options", "nosniff").send(plaintext);
    } catch (error) {
      if (error instanceof Error && /^export_/.test(error.message)) return problem(reply, 409, error.message);
      throw error;
    }
  });
  api.post(`${root}/internal-controlled-exports`, scoped((client, request, session) => {
    const body = exportCommand.parse(request.body);
    const dependency = dependencyHeader(request);
    const dealId = (request.params as { deal_id: string }).deal_id;
    return query(client, "SELECT external_use.create_export($1,$2,$3,$4,$5,$6,$7) AS data", [body.review_id, Database.hashToken(session), Database.hashToken(String(request.headers["sensitive-action-grant"] ?? "")), exportCommandDigest(dealId, "internal_controlled_export", body), dependency, Database.hashToken(String(request.headers["idempotency-key"])), process.env.RELEASE_ID ?? "development"]);
  }, 202));
  api.get(`${root}/guide/history`, scoped((client) => query(client, `SELECT jsonb_build_object(
    'inspections',(SELECT coalesce(jsonb_agg(to_jsonb(i) ORDER BY observed_at DESC),'[]') FROM external_use.control_inspection i),
    'first_value',(SELECT to_jsonb(f) FROM external_use.first_value f),
    'graduation',(SELECT to_jsonb(g) FROM external_use.guide_graduation g),
    'exports',(SELECT coalesce(jsonb_agg(external_use.export_projection(e.id) ORDER BY created_at DESC),'[]') FROM external_use.internal_export e),
    'audit',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY created_at DESC),'[]') FROM app.audit_event a WHERE deal_id=app.policy_deal_id() AND (code LIKE 'guide.%' OR code LIKE 'internal_export.%' OR code LIKE 'sensitive_action.%')),
    'measurement',(SELECT coalesce(jsonb_agg(jsonb_build_object('event_code',event_code,'definition_version',definition_version,'dimensions',dimensions,'occurred_at',occurred_at) ORDER BY occurred_at),'[]') FROM external_use.measurement_event)) AS data`)));
  api.post("/api/v1/sensitive-action-grants", async (request, reply) => {
    const session = await deps.requireBanker(request, reply);
    if (!session) return;
    const body = z.object({ deal_id: uuid, action: z.enum(["internal_controlled_export", "export_object_retrieval"]), resource_id: uuid, dependency_digest: z.string().regex(/^[a-f0-9]{64}$/), idempotency_key: z.string().min(8).max(200), command: z.union([exportCommand, downloadCommand]) }).strict().parse(request.body);
    const command = body.action === "internal_controlled_export" ? exportCommand.parse(body.command) : downloadCommand.parse(body.command);
    if (("review_id" in command ? command.review_id : command.export_id) !== body.resource_id) return problem(reply, 400, "sensitive_scope_mismatch");
    try {
      // Refresh proof before opening the scoped grant transaction. The Local
      // adapter is explicit test evidence and is never selected in production.
      if (deps.authMode === "supabase") await deps.auth.verifySensitiveSession(session, request.headers.authorization?.replace(/^Bearer /, ""));
      const token = crypto.randomBytes(32).toString("base64url");
      const result = await database.withContext(session, body.deal_id, (client) => query(client, "SELECT external_use.issue_sensitive_grant($1,$2,$3,$4,$5,$6,$7) AS data", [Database.hashToken(session), Database.hashToken(token), body.action, body.resource_id, exportCommandDigest(body.deal_id, body.action, command), body.dependency_digest, Database.hashToken(body.idempotency_key)]));
      if (result.kind !== "ok") return problem(reply, result.kind === "not_found" ? 404 : 401, "resource_not_found");
      return reply.code(201).header("cache-control", "private, no-store").send({ data: { ...(result.value as object), grant_token: token } });
    } catch (error) {
      const code = error instanceof AuthError ? error.code : error instanceof Error ? error.message : "sensitive_grant_unavailable";
      if (code === "export_scope_unavailable") return problem(reply, 404, "resource_not_found");
      if (/^(passkey_|sensitive_|export_)/.test(code)) return problem(reply, code === "export_version_conflict" ? 412 : 409, code);
      throw error;
    }
  });
}

const exportCommand = z.object({ review_id: uuid, acknowledge_internal_use: z.literal(true) }).strict();
const downloadCommand = z.object({ export_id: uuid, purpose: z.literal("internal_export_download") }).strict();
export function exportCommandDigest(dealId: string, action: string, body: object) {
  return canonicalDigest({ api_version: "v1", method: "POST", action, deal_id: dealId, body });
}
function dependencyHeader(request: FastifyRequest) {
  const value = request.headers["if-match"];
  if (typeof value !== "string" || !/^"[a-f0-9]{64}"$/.test(value)) throw new Error("export_precondition_required");
  return value.slice(1, -1);
}
