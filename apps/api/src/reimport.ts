import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type pg from "pg";
import { z } from "zod";
import { Database } from "./database.js";
import { canonicalDigest } from "./commerce.js";
import { compareReimportRegions, type ReimportRegion } from "./reimport-comparator.js";

const uuid = z.string().uuid();
const region = z.object({ region_key: z.string().min(1).max(240), ownership: z.enum(["generated-owned", "banker-owned", "protected-formula", "shared-merge", "unmanaged"]), digest: z.string().min(1), formula_digest: z.string().optional(), style_digest: z.string().optional(), comment_digest: z.string().optional(), unsupported: z.array(z.string()).optional() }).strict();
const comparisonInput = z.object({ baseline_regions: z.array(region), edited_regions: z.array(region), current_regions: z.array(region), compatibility: z.record(z.string(), z.unknown()).default({}) }).strict();
type Dependencies = { requireBanker(request: FastifyRequest, reply: FastifyReply): Promise<string | null>; commandKey(request: FastifyRequest, reply: FastifyReply): string | null };
function problem(reply: FastifyReply, status: number, code: string) { return reply.code(status).type("application/problem+json").send({ code, status, title: code.replaceAll("_", " "), detail: code.replaceAll("_", " "), outcome: "rejected", recovery_action: status === 412 ? "reload_and_compare" : "inspect_and_correct_request" }); }
export function registerReimportRoutes(api: FastifyInstance, database: Database, deps: Dependencies) {
  const root = "/api/v1/deals/:deal_id";
  const scoped = (fn: (client: pg.PoolClient, request: FastifyRequest, session: string, key: string) => Promise<unknown> | unknown, status = 200) => async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const key = request.method === "POST" ? deps.commandKey(request, reply) : ""; if (request.method === "POST" && !key) return;
    try {
      const deal = uuid.parse((request.params as { deal_id: string }).deal_id);
      const result = await database.withContext(session, deal, (client) => Promise.resolve(fn(client, request, session, key ?? "")));
      if (result.kind !== "ok") return problem(reply, result.kind === "invalid" ? 401 : 404, result.kind === "invalid" ? "authentication_required" : "resource_not_found");
      const value = result.value as Record<string, unknown>;
      const replay = Boolean(value?.idempotent_replayed);
      if (replay) reply.header("idempotent-replayed", "true");
      return reply.code(replay ? 200 : status).header("cache-control", "private, no-store").send({ data: result.value });
    } catch (error) { const code = error instanceof Error ? error.message : "reimport_failed"; if (error instanceof z.ZodError) return problem(reply, 400, "invalid_request"); if (/^reimport_/.test(code) || code === "idempotency_key_reused") return problem(reply, code.includes("version") ? 412 : 409, code); throw error; }
  };
  const query = async (client: pg.PoolClient, sql: string, values: unknown[] = []) => (await client.query<{ data: unknown }>(sql, values)).rows[0]?.data ?? null;
  api.post(`${root}/reimport-sessions`, scoped((client, request, _session, key) => {
    const body = z.object({ export_id: uuid, manifest_digest: z.string().regex(/^[a-f0-9]{64}$/), current_revision_id: uuid, edited_file: z.record(z.string(), z.unknown()).default({}) }).strict().parse(request.body);
    const dealId = (request.params as { deal_id: string }).deal_id;
    const digest = canonicalDigest({ method: "POST", route: "/api/v1/deals/{deal_id}/reimport-sessions", api_version: "v1", deal_id: dealId, body });
    return query(client, "SELECT deliverable.create_reimport_session($1,$2,$3,$4,$5,$6) AS data", [body.export_id, body.manifest_digest, body.current_revision_id, body.edited_file, Database.hashToken(key), digest]);
  }, 201));
  api.post(`${root}/reimport-sessions/:session_id/finalizations`, scoped((client, request, _session, key) => {
    const params = request.params as { deal_id: string; session_id: string };
    const sessionId = uuid.parse(params.session_id);
    const body = z.object({ edited_object_id: uuid, edited_digest: z.string().regex(/^[a-f0-9]{64}$/), ...comparisonInput.shape }).strict().parse(request.body);
    const differences = compareReimportRegions(body.baseline_regions as ReimportRegion[], body.edited_regions as ReimportRegion[], body.current_regions as ReimportRegion[]);
    const digest = canonicalDigest({ method: "POST", route: "/api/v1/deals/{deal_id}/reimport-sessions/{session_id}/finalizations", api_version: "v1", deal_id: params.deal_id, session_id: params.session_id, body });
    return query(client, "SELECT deliverable.finalize_reimport($1,$2,$3,$4,$5,$6,$7) AS data", [sessionId, body.edited_object_id, body.edited_digest, differences.map((difference) => ({ ...difference, baseline_region: body.baseline_regions.find((item) => item.region_key === difference.region_key) ?? {}, edited_region: body.edited_regions.find((item) => item.region_key === difference.region_key) ?? {}, current_region: body.current_regions.find((item) => item.region_key === difference.region_key) ?? {} })), body.compatibility, Database.hashToken(key), digest]);
  }, 202));
  api.get(`${root}/reimports`, scoped((client) => query(client, "SELECT coalesce(jsonb_agg(to_jsonb(i) ORDER BY created_at DESC),'[]'::jsonb) AS data FROM deliverable.external_edit_import i")));
  api.get(`${root}/reimports/:reimport_id`, scoped((client, request) => query(client, "SELECT jsonb_build_object('reimport',to_jsonb(i),'comparisons',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.region_key),'[]') FROM deliverable.artifact_region_comparison c WHERE c.import_id=i.id),'conflicts',(SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.created_at),'[]') FROM deliverable.merge_conflict m WHERE m.import_id=i.id)) AS data FROM deliverable.external_edit_import i WHERE i.id=$1 AND i.account_id=app.policy_account_id() AND i.deal_id=app.policy_deal_id()", [uuid.parse((request.params as { reimport_id: string }).reimport_id)])));
  api.get(`${root}/reimports/:reimport_id/merge-conflicts`, scoped((client, request) => query(client, "SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY created_at),'[]') AS data FROM deliverable.merge_conflict c WHERE c.import_id=$1 AND c.account_id=app.policy_account_id() AND c.deal_id=app.policy_deal_id()", [uuid.parse((request.params as { reimport_id: string }).reimport_id)])));
  api.get(`${root}/reimports/:reimport_id/merge-conflicts/:conflict_id`, scoped((client, request) => query(client, "SELECT jsonb_build_object('conflict',to_jsonb(c),'comparison',(SELECT to_jsonb(x) FROM deliverable.artifact_region_comparison x WHERE x.id=c.comparison_id),'dispositions',(SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.created_at),'[]') FROM deliverable.merge_conflict_disposition d WHERE d.conflict_id=c.id)) AS data FROM deliverable.merge_conflict c WHERE c.id=$1 AND c.import_id=$2 AND c.account_id=app.policy_account_id() AND c.deal_id=app.policy_deal_id()", [uuid.parse((request.params as { conflict_id: string }).conflict_id), uuid.parse((request.params as { reimport_id: string }).reimport_id)])));
  api.post(`${root}/reimports/:reimport_id/merge-conflicts/:conflict_id/dispositions`, scoped((client, request, _session, key) => {
    const params = request.params as { deal_id: string; reimport_id: string; conflict_id: string };
    const body = z.object({ human_decision_id: uuid, disposition: z.enum(["keep_banker", "take_generated", "manually_reconciled_import"]), accepted_source: z.enum(["edited", "current", "manual"]), rationale: z.string().min(20).max(2000) }).strict().parse(request.body);
    const match = request.headers["if-match"]; if (typeof match !== "string" || !/^"[1-9]\d*"$/.test(match)) throw new Error("reimport_conflict_version");
    const digest = canonicalDigest({ method: "POST", route: "/api/v1/deals/{deal_id}/reimports/{reimport_id}/merge-conflicts/{conflict_id}/dispositions", api_version: "v1", deal_id: params.deal_id, reimport_id: params.reimport_id, conflict_id: params.conflict_id, body, if_match: match });
    return query(client, "SELECT deliverable.record_merge_conflict_disposition($1,$2,$3,$4,$5,$6,$7,$8,$9) AS data", [uuid.parse(params.reimport_id), uuid.parse(params.conflict_id), Number(match.slice(1, -1)), body.human_decision_id, body.disposition, body.accepted_source, body.rationale, Database.hashToken(key), digest]);
  }, 201));
  api.post(`${root}/reimports/:reimport_id/acceptances`, scoped((client, request, _session, key) => {
    const params = request.params as { deal_id: string; reimport_id: string };
    const body = z.object({ impact_assessment_id: uuid, change_reason: z.string().min(20).max(2000) }).strict().parse(request.body);
    const match = request.headers["if-match"]; if (typeof match !== "string" || !/^"[1-9]\d*"$/.test(match)) throw new Error("reimport_version");
    const digest = canonicalDigest({ method: "POST", route: "/api/v1/deals/{deal_id}/reimports/{reimport_id}/acceptances", api_version: "v1", deal_id: params.deal_id, reimport_id: params.reimport_id, body, if_match: match });
    return query(client, "SELECT deliverable.accept_reimport($1,$2,$3,$4,$5,$6) AS data", [uuid.parse(params.reimport_id), Number(match.slice(1, -1)), body.impact_assessment_id, body.change_reason, Database.hashToken(key), digest]);
  }, 202));
}
