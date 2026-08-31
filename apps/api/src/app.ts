import crypto from "node:crypto";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import { z } from "zod";
import { AuthError, LocalAuthAdapter, SupabaseAuthAdapter, type AuthAdapter, type AuthMode } from "./auth.js";
import { Database } from "./database.js";
import {
  PROJECT_NORTHSTAR_FIXTURE_VERSION,
  PROJECT_NORTHSTAR_PROOF_COOKIE,
  SyntheticProofError,
  SyntheticProofStore,
} from "./synthetic-proof.js";

const dealIdSchema = z.string().uuid();
const emailSchema = z.string().email().max(320);
const problemType = "https://investment-banking.local/problems";

export interface BuildApiOptions {
  database?: Database;
  authMode?: AuthMode;
  authAdapter?: AuthAdapter;
  syntheticProofStore?: SyntheticProofStore;
}

function traceId() { return crypto.randomUUID(); }

function problem(reply: FastifyReply, status: number, code: string, detail: string, recoveryAction: string, instance: string) {
  return reply.code(status).type("application/problem+json").send({
    type: `${problemType}/${code.replaceAll("_", "-")}`,
    title: code === "resource_not_found" ? "Resource not found" : code.replaceAll("_", " "),
    status,
    code,
    detail,
    instance,
    outcome: "rejected",
    retryable: status === 401 || status === 429 || status === 503,
    recovery_action: recoveryAction,
  });
}

function cookieValue(request: FastifyRequest, name: string) {
  return request.cookies[name];
}

function bearerToken(request: FastifyRequest) {
  const value = request.headers.authorization;
  const match = value?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

function setSessionCookie(reply: FastifyReply, name: string, value: string) {
  reply.setCookie(name, value, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}

export async function buildApi(options: BuildApiOptions = {}): Promise<FastifyInstance & { database: Database }> {
  const database = options.database ?? new Database();
  const authMode = options.authMode ?? (process.env.AUTH_ADAPTER === "supabase" ? "supabase" : "local");
  if (authMode === "local" && process.env.APP_ENV === "production") throw new Error("local auth adapter is forbidden in production");
  const auth = options.authAdapter ?? (authMode === "supabase" ? new SupabaseAuthAdapter(database) : new LocalAuthAdapter(database));
  const syntheticProof = options.syntheticProofStore ?? new SyntheticProofStore();
  const api = Fastify({ logger: false }) as unknown as FastifyInstance & { database: Database };
  const publicMutationBuckets = new Map<string, { tokens: number; updatedAt: number }>();
  const allowPublicMutation = (request: FastifyRequest, reply: FastifyReply) => {
    const origin = request.headers.origin;
    const configuredOrigin = process.env.PUBLIC_WEB_ORIGIN;
    const originAllowed = origin ? (configuredOrigin ? origin === configuredOrigin : /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin)) : false;
    if (!originAllowed) {
      problem(reply, 403, "origin_rejected", "The request Origin is not allowed for this first-party proof surface.", "return_to_public_proof", request.url);
      return false;
    }
    const now = Date.now();
    for (const [bucketKey, value] of publicMutationBuckets) if (now - value.updatedAt > 60_000) publicMutationBuckets.delete(bucketKey);
    const key = request.ip || "unknown";
    const bucket = publicMutationBuckets.get(key) ?? { tokens: 30, updatedAt: now };
    bucket.tokens = Math.min(30, bucket.tokens + ((now - bucket.updatedAt) / 60_000) * 180);
    bucket.updatedAt = now;
    if (bucket.tokens < 1) {
      publicMutationBuckets.set(key, bucket);
      reply.header("retry-after", "60");
      problem(reply, 429, "rate_limited", "The synthetic proof request limit has been reached.", "retry_after_delay", request.url);
      return false;
    }
    bucket.tokens -= 1;
    publicMutationBuckets.set(key, bucket);
    return true;
  };
  api.database = database;
  await api.register(cookie);

  api.setErrorHandler((_error, request, reply) => {
    if (_error instanceof z.ZodError) return problem(reply, 400, "invalid_request", "The request could not be accepted.", "correct_request", request.url);
    request.log.error({ code: "internal_error", trace_id: request.id }, "request failed");
    return problem(reply, 503, "service_unavailable", "The request could not be completed.", "retry_after_delay", request.url);
  });

  api.post("/api/v1/session/bootstrap", async (request, reply) => {
    const body = z.object({ email: emailSchema }).strict().parse(request.body);
    try {
      const result = await auth.requestMagicLink(body.email);
      const response: Record<string, string> = { status: result.status };
      if (result.testVerificationToken && authMode === "local") response.test_verification_token = result.testVerificationToken;
      return reply.code(202).send(response);
    } catch (error) {
      if (error instanceof AuthError) return problem(reply, error.code === "provider_unavailable" ? 503 : 400, error.code, error.message, "retry_after_delay", request.url);
      throw error;
    }
  });

  api.post("/api/v1/session/bootstrap/verify", async (request, reply) => {
    const body = request.body === undefined ? undefined : z.object({ token: z.string().min(16).max(512) }).strict().parse(request.body);
    const token = bearerToken(request) ?? body?.token;
    if (!token) return problem(reply, 400, "invalid_request", "The request could not be accepted.", "correct_request", request.url);
    try {
      const result = await auth.verifyMagicLink(token);
      setSessionCookie(reply, "__Host-pending_passkey", result.sessionToken);
      return reply.code(200).send({ status: "mailbox_verified", posture: "passkey_required" });
    } catch (error) {
      if (error instanceof AuthError) return problem(reply, 401, error.code, error.message, "request_new_magic_link", request.url);
      throw error;
    }
  });

  api.post("/api/v1/session/passkey/register", async (request, reply) => {
    const pending = cookieValue(request, "__Host-pending_passkey");
    if (!pending) return problem(reply, 401, "authentication_required", "A verified Magic Link is required.", "authenticate", request.url);
    try {
      await auth.registerPasskey(pending, bearerToken(request));
      return reply.code(201).send({ status: "passkey_registered", posture: "passkey_registered" });
    } catch (error) {
      if (error instanceof AuthError) return problem(reply, error.code === "passkey_required" ? 403 : 401, error.code, error.message, "register_passkey", request.url);
      throw error;
    }
  });

  api.post("/api/v1/session/passkey/authenticate", async (request, reply) => {
    const pending = cookieValue(request, "__Host-pending_passkey");
    if (!pending) return problem(reply, 401, "authentication_required", "Complete the Magic Link bootstrap first.", "authenticate", request.url);
    try {
      await auth.authenticatePasskey(pending, bearerToken(request));
      setSessionCookie(reply, "__Host-banker_session", pending);
      reply.clearCookie("__Host-pending_passkey", { path: "/" });
      return reply.code(200).send({ status: "authenticated", posture: "passkey_backed_session" });
    } catch (error) {
      if (error instanceof AuthError) return problem(reply, 403, error.code, error.message, "register_passkey", request.url);
      throw error;
    }
  });

  api.get("/api/v1/session", async (request, reply) => {
    const session = cookieValue(request, "__Host-banker_session") ?? cookieValue(request, "__Host-pending_passkey");
    if (!session) return problem(reply, 401, "authentication_required", "Authenticate to continue.", "authenticate", request.url);
    const result = await database.withContext(session, null, async () => ({ ok: true }));
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return reply.code(200).send({ status: "authenticated", posture: "passkey_required" });
    return reply.code(200).send({ status: "authenticated", posture: "passkey_backed_session" });
  });

  api.get<{ Params: { deal_id: string } }>("/api/v1/deals/:deal_id/overview", async (request, reply) => {
    const dealId = dealIdSchema.parse(request.params.deal_id);
    const session = cookieValue(request, "__Host-banker_session") ?? cookieValue(request, "__Host-pending_passkey");
    if (!session) return problem(reply, 401, "authentication_required", "Authenticate to continue.", "authenticate", request.url);
    const result = await database.withContext(session, dealId, async (client, context) => {
      const overview = await client.query<{ account_name: string; deal_id: string; deal_name: string; client_label: string; transaction_subject: string; mandate_objective: string; business_stage: string; activity_posture: string; workspace_id: string; posture_version: string; overview_revision_id: string; displayed_state: Record<string, unknown> }>(
        `SELECT a.display_name AS account_name, d.id AS deal_id, d.name AS deal_name, d.client_label, d.transaction_subject, d.mandate_objective, d.business_stage, d.activity_posture, w.id AS workspace_id, w.posture_version, w.overview_revision_id, w.displayed_state
         FROM app.deal d JOIN app.account a ON a.id = d.account_id JOIN app.deal_workspace w ON w.deal_id = d.id
         WHERE d.id = $1`,
        [dealId],
      );
      if (overview.rowCount !== 1) return null;
      const row = overview.rows[0];
      await client.query("SELECT app.record_audit($1,$2,$3,$4,$5,$6)", ["deal_overview_read", "completed", "deal_overview", row.deal_id, "authorized_read", traceId()]);
      return {
        account: { display_name: row.account_name },
        deal: { id: row.deal_id, name: row.deal_name, client_label: row.client_label, transaction_subject: row.transaction_subject, mandate_objective: row.mandate_objective },
        workspace: { id: row.workspace_id, posture: row.activity_posture, posture_version: Number(row.posture_version), current_pointers: { overview_revision_id: row.overview_revision_id } },
        displayed_state: row.displayed_state,
        authorization: { account_scope: context.accountId, deal_scope: row.deal_id, session_posture: "passkey_backed_session" },
      };
    });
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required for Deal access.", "register_passkey", request.url);
    if (result.kind === "not_found" || result.value === null) return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_safe_parent", request.url);
    return reply.code(200).send(result.value);
  });

  api.get("/api/v1/account/audit-events", async (request, reply) => {
    const { deal_id: dealId } = z.object({ deal_id: dealIdSchema }).strict().parse(request.query);
    const session = cookieValue(request, "__Host-banker_session");
    if (!session) return problem(reply, 401, "authentication_required", "Authenticate to continue.", "authenticate", request.url);
    const result = await database.withContext(session, dealId, async (client) => {
      const rows = await client.query<{ id: string; code: string; outcome: string; object_kind: string; object_id: string | null; created_at: string }>("SELECT id, code, outcome, object_kind, object_id, created_at FROM app.audit_event WHERE deal_id = $1 ORDER BY created_at ASC, id ASC", [dealId]);
      return { events: rows.rows };
    });
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required for Audit access.", "register_passkey", request.url);
    if (result.kind === "not_found") return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_safe_parent", request.url);
    if (result.kind !== "ok") return problem(reply, 401, "authentication_required", "Authenticate to continue.", "authenticate", request.url);
    return reply.code(200).send(result.value);
  });

  api.get("/api/v1/public/project-northstar", async (request, reply) => {
    const session = syntheticProof.getSessionByToken(request.cookies[PROJECT_NORTHSTAR_PROOF_COOKIE] ?? "");
    return reply.code(200).send(session ? syntheticProof.sessionState(session) : syntheticProof.publicProof());
  });

  api.get<{ Params: { proof_state: string } }>("/api/v1/public/project-northstar/states/:proof_state", async (request, reply) => {
    const checkpoint = syntheticProof.normalizeCheckpoint(request.params.proof_state);
    if (!checkpoint) return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_public_proof", request.url);
    const token = request.cookies[PROJECT_NORTHSTAR_PROOF_COOKIE];
    const session = token ? syntheticProof.getSessionByToken(token) : undefined;
    if (session) return reply.code(200).send(syntheticProof.stateSnapshot(session, checkpoint));
    return reply.code(200).send(syntheticProof.publicState(checkpoint));
  });

  api.get("/api/v1/public/project-northstar/recorded", async (_request, reply) => reply.code(200).send(syntheticProof.recorded()));

  api.post("/api/v1/public/project-northstar/sessions", async (request, reply) => {
    if (!allowPublicMutation(request, reply)) return;
    const body = z.object({ fixture_version: z.string().optional(), fixture: z.string().optional() }).strict().parse(request.body ?? {});
    const fixtureVersion = body.fixture_version ?? (body.fixture === "project_northstar_v1" ? PROJECT_NORTHSTAR_FIXTURE_VERSION : body.fixture);
    try {
      const created = syntheticProof.createSession(fixtureVersion ?? PROJECT_NORTHSTAR_FIXTURE_VERSION);
      reply.setCookie(PROJECT_NORTHSTAR_PROOF_COOKIE, created.token, { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 15 * 60 });
      return reply.code(201).header("location", `/api/v1/public/project-northstar/sessions/${created.session.id}`).send(syntheticProof.sessionState(created.session));
    } catch (error) {
      if (error instanceof SyntheticProofError) {
        if (error.status === 429) reply.header("retry-after", "60");
        return problem(reply, error.status, error.code, error.message, error.recoveryAction, request.url);
      }
      throw error;
    }
  });

  api.post<{ Params: { session_id: string } }>("/api/v1/public/project-northstar/sessions/:session_id/observations", async (request, reply) => {
    if (!allowPublicMutation(request, reply)) return;
    const session = getSyntheticSession(request, reply, request.params.session_id);
    if (!session) return;
    const body = z.object({ proof_state: z.string() }).strict().parse(request.body);
    const checkpoint = syntheticProof.normalizeCheckpoint(body.proof_state);
    if (!checkpoint) return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_public_proof", request.url);
    return reply.code(201).header("location", `${request.url}`).send(syntheticProof.observeState(session, checkpoint));
  });

  function getSyntheticSession(request: FastifyRequest, reply: FastifyReply, sessionId: string) {
    const token = request.cookies[PROJECT_NORTHSTAR_PROOF_COOKIE];
    if (!token) {
      problem(reply, 401, "authentication_required", "Continue with the same synthetic proof session.", "start_synthetic_proof_session", request.url);
      return undefined;
    }
    const session = syntheticProof.getSession(sessionId, token);
    if (!session) {
      problem(reply, 404, "resource_not_found", "The requested resource is not available.", "restart_synthetic_proof", request.url);
      return undefined;
    }
    return session;
  }

  api.get<{ Params: { session_id: string } }>("/api/v1/public/project-northstar/sessions/:session_id", async (request, reply) => {
    const session = getSyntheticSession(request, reply, request.params.session_id);
    if (!session) return;
    return reply.code(200).send(syntheticProof.sessionState(session));
  });

  api.post<{ Params: { session_id: string } }>("/api/v1/public/project-northstar/sessions/:session_id/claim-corrections", async (request, reply) => {
    if (!allowPublicMutation(request, reply)) return;
    const session = getSyntheticSession(request, reply, request.params.session_id);
    if (!session) return;
    const body = z.object({ claim_id: z.string(), evidence_id: z.string(), corrected_value: z.string(), reason: z.string().min(1) }).strict().parse(request.body);
    try {
      return reply.code(201).header("location", `${request.url}`).send(syntheticProof.recordCorrection(session, { claimId: body.claim_id, evidenceId: body.evidence_id, correctedValue: body.corrected_value, actorId: "synthetic-prospective-banker", reason: body.reason }));
    } catch (error) {
      if (error instanceof SyntheticProofError) return problem(reply, error.status, error.code, error.message, error.recoveryAction, request.url);
      throw error;
    }
  });

  api.post<{ Params: { session_id: string } }>("/api/v1/public/project-northstar/sessions/:session_id/conflict-resolutions", async (request, reply) => {
    if (!allowPublicMutation(request, reply)) return;
    const session = getSyntheticSession(request, reply, request.params.session_id);
    if (!session) return;
    const body = z.object({ conflict_id: z.string(), disposition: z.string(), retained_claim_ids: z.array(z.string()).min(2), scope: z.string().min(1), rationale: z.string().min(1) }).strict().parse(request.body);
    try {
      return reply.code(201).header("location", `${request.url}`).send(syntheticProof.recordConflictResolution(session, { conflictId: body.conflict_id, disposition: body.disposition, retainedClaimIds: body.retained_claim_ids, scope: body.scope, rationale: body.rationale }));
    } catch (error) {
      if (error instanceof SyntheticProofError) return problem(reply, error.status, error.code, error.message, error.recoveryAction, request.url);
      throw error;
    }
  });

  api.post<{ Params: { session_id: string } }>("/api/v1/public/project-northstar/sessions/:session_id/deterministic-runs", async (request, reply) => {
    if (!allowPublicMutation(request, reply)) return;
    const session = getSyntheticSession(request, reply, request.params.session_id);
    if (!session) return;
    const body = z.object({ rule_set: z.string(), corrected_cash: z.string() }).strict().parse(request.body);
    try {
      const job = syntheticProof.createDeterministicRun(session, { ruleSet: body.rule_set, correctedCash: body.corrected_cash });
      return reply.code(202).header("location", `/api/v1/public/project-northstar/sessions/${request.params.session_id}/jobs/${job.id}`).send(job);
    } catch (error) {
      if (error instanceof SyntheticProofError) return problem(reply, error.status, error.code, error.message, error.recoveryAction, request.url);
      throw error;
    }
  });

  api.post<{ Params: { session_id: string } }>("/api/v1/public/project-northstar/sessions/:session_id/impact-acceptances", async (request, reply) => {
    if (!allowPublicMutation(request, reply)) return;
    const session = getSyntheticSession(request, reply, request.params.session_id);
    if (!session) return;
    const body = z.object({ assessment_id: z.string(), accepted_scope: z.array(z.string()).min(1) }).strict().parse(request.body);
    try {
      return reply.code(201).header("location", `${request.url}`).send(syntheticProof.recordImpactAcceptance(session, { assessmentId: body.assessment_id, acceptedScope: body.accepted_scope }));
    } catch (error) {
      if (error instanceof SyntheticProofError) return problem(reply, error.status, error.code, error.message, error.recoveryAction, request.url);
      throw error;
    }
  });

  api.post<{ Params: { session_id: string } }>("/api/v1/public/project-northstar/sessions/:session_id/revisions", async (request, reply) => {
    if (!allowPublicMutation(request, reply)) return;
    const session = getSyntheticSession(request, reply, request.params.session_id);
    if (!session) return;
    const body = z.object({ source_record_id: z.string(), reason: z.string().min(1) }).strict().parse(request.body);
    try {
      const job = syntheticProof.createRevision(session, { sourceRecordId: body.source_record_id, reason: body.reason });
      return reply.code(202).header("location", `/api/v1/public/project-northstar/sessions/${request.params.session_id}/jobs/${job.id}`).send(job);
    } catch (error) {
      if (error instanceof SyntheticProofError) return problem(reply, error.status, error.code, error.message, error.recoveryAction, request.url);
      throw error;
    }
  });

  api.get<{ Params: { session_id: string; job_id: string } }>("/api/v1/public/project-northstar/sessions/:session_id/jobs/:job_id", async (request, reply) => {
    const session = getSyntheticSession(request, reply, request.params.session_id);
    if (!session) return;
    const job = syntheticProof.getJob(session, request.params.job_id);
    if (!job) return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_synthetic_proof", request.url);
    return reply.code(200).send(job);
  });

  api.get<{ Params: { session_id: string; job_id: string } }>("/api/v1/public/project-northstar/sessions/:session_id/jobs/:job_id/events", async (request, reply) => {
    const session = getSyntheticSession(request, reply, request.params.session_id);
    if (!session) return;
    const job = syntheticProof.getJob(session, request.params.job_id);
    if (!job) return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_synthetic_proof", request.url);
    return reply.code(200).type("text/event-stream").header("cache-control", "no-store").send(`id: 1\nevent: completed\ndata: ${JSON.stringify(job)}\n\n`);
  });

  api.post<{ Params: { session_id: string } }>("/api/v1/public/project-northstar/sessions/:session_id/artifact-inspections", async (request, reply) => {
    if (!allowPublicMutation(request, reply)) return;
    const session = getSyntheticSession(request, reply, request.params.session_id);
    if (!session) return;
    const body = z.object({ artifact_id: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict().parse(request.body);
    try {
      const artifact = syntheticProof.recordArtifactDownload(session, body.artifact_id, body.sha256);
      return reply.code(201).header("location", `${request.url}`).send({ synthetic: true, artifact_id: artifact.id, revision: artifact.revision, sha256: artifact.sha256, session: syntheticProof.sessionState(session) });
    } catch (error) {
      if (error instanceof SyntheticProofError) return problem(reply, error.status, error.code, error.message, error.recoveryAction, request.url);
      throw error;
    }
  });

  api.get<{ Params: { artifact_id: string } }>("/api/v1/public/project-northstar/artifacts/:artifact_id", async (request, reply) => {
    const artifact = syntheticProof.artifact(request.params.artifact_id);
    if (!artifact) return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_public_proof", request.url);
    if (artifact.revision === "0.4") {
      const session = syntheticProof.getSessionByToken(request.cookies[PROJECT_NORTHSTAR_PROOF_COOKIE] ?? "");
      if (!session || !session.revision_job) return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "append_sr_006", request.url);
    }
    return reply.code(200).send(syntheticProof.artifactMetadata(artifact.id));
  });

  api.get<{ Params: { artifact_id: string } }>("/api/v1/public/project-northstar/artifacts/:artifact_id/download", async (request, reply) => {
    const artifact = syntheticProof.artifact(request.params.artifact_id);
    if (!artifact) return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_public_proof", request.url);
    if (artifact.revision === "0.4") {
      const session = syntheticProof.getSessionByToken(request.cookies[PROJECT_NORTHSTAR_PROOF_COOKIE] ?? "");
      if (!session || !session.revision_job) return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "append_sr_006", request.url);
    }
    return reply.code(200).type(artifact.mime_type).header("content-disposition", `attachment; filename="${artifact.filename}"`).header("cache-control", "public, max-age=3600, immutable").header("x-synthetic-revision", artifact.revision).send(artifact.bytes);
  });

  return api;
}
