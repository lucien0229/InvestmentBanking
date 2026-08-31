import crypto from "node:crypto";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import { z } from "zod";
import { AuthError, LocalAuthAdapter, SupabaseAuthAdapter, type AuthAdapter, type AuthMode } from "./auth.js";
import { Database } from "./database.js";
import { canonicalDigest, canonicalizeStripeEvent, checkoutContractDigest, publicOffer, rawPayloadDigest, stableJson, StripeCheckoutAdapter, StripeTestCheckoutAdapter, stripeEventId, verifyStripeSignature, type AddOnCode, type BillingTerm, type CheckoutProviderAdapter } from "./commerce.js";
import {
  PROJECT_NORTHSTAR_FIXTURE_VERSION,
  PROJECT_NORTHSTAR_PROOF_COOKIE,
  SyntheticProofError,
  SyntheticProofStore,
} from "./synthetic-proof.js";
import { ReferenceJobRuntime, type ReferenceJobRuntimeOptions } from "./jobs.js";

const dealIdSchema = z.string().uuid();
const emailSchema = z.string().email().max(320);
const problemType = "https://investment-banking.local/problems";

export interface BuildApiOptions {
  database?: Database;
  authMode?: AuthMode;
  authAdapter?: AuthAdapter;
  syntheticProofStore?: SyntheticProofStore;
  checkoutAdapter?: CheckoutProviderAdapter;
  referenceJobRuntime?: ReferenceJobRuntime | ReferenceJobRuntimeOptions;
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

function headerValue(request: FastifyRequest, name: string) {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function etag(rowVersion: number) {
  return `"job-${rowVersion}"`;
}

export async function buildApi(options: BuildApiOptions = {}): Promise<FastifyInstance & { database: Database; referenceJobRuntime: ReferenceJobRuntime }> {
  const database = options.database ?? new Database();
  const authMode = options.authMode ?? (process.env.AUTH_ADAPTER === "supabase" ? "supabase" : "local");
  if (authMode === "local" && process.env.APP_ENV === "production") throw new Error("local auth adapter is forbidden in production");
  const auth = options.authAdapter ?? (authMode === "supabase" ? new SupabaseAuthAdapter(database) : new LocalAuthAdapter(database));
  const syntheticProof = options.syntheticProofStore ?? new SyntheticProofStore();
  const checkoutAdapter = options.checkoutAdapter ?? StripeCheckoutAdapter.fromEnv() ?? new StripeTestCheckoutAdapter();
  if (process.env.APP_ENV === "production" && checkoutAdapter.name === "stripe_test_adapter") throw new Error("live Stripe Checkout adapter is required in production");
  const api = Fastify({ logger: false }) as unknown as FastifyInstance & { database: Database; referenceJobRuntime: ReferenceJobRuntime };
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
  // Stripe signature verification needs the exact request bytes. Other JSON
  // routes keep Fastify's normal object parsing behavior.
  api.removeContentTypeParser("application/json");
  api.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
    if (request.url === "/webhooks/stripe") return done(null, body);
    try {
      done(null, JSON.parse(body as string));
    } catch {
      done(new Error("invalid json"));
    }
  });
  const ownsReferenceJobRuntime = !(options.referenceJobRuntime instanceof ReferenceJobRuntime);
  api.referenceJobRuntime = options.referenceJobRuntime instanceof ReferenceJobRuntime
    ? options.referenceJobRuntime
    : new ReferenceJobRuntime(database, options.referenceJobRuntime);
  if (ownsReferenceJobRuntime) api.addHook("onClose", async () => api.referenceJobRuntime.close());
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

  api.get("/api/v1/public/offer", async (_request, reply) => reply.code(200).send(publicOffer));

  api.post("/api/v1/public/qualification-assessments", async (request, reply) => {
    const body = z.object({
      banker_role: z.string().min(1).max(120),
      can_purchase_independently: z.boolean(),
      deal_type: z.string().min(1).max(120),
      intended_use: z.string().min(1).max(240),
      intended_audience: z.string().min(1).max(240),
      expected_source_types: z.array(z.string().min(1).max(80)).max(20),
      expected_template_types: z.array(z.string().min(1).max(80)).max(20),
      known_special_structures: z.array(z.string().min(1).max(120)).max(20),
      source_authority: z.string().min(1).max(120),
      confidentiality_class: z.enum(["public", "internal", "confidential", "restricted"]),
      employer_restrictions: z.string().min(1).max(240),
      provider_or_geographic_restrictions: z.string().min(1).max(240),
      minimum_source_packet: z.string().min(1).max(240),
    }).strict().parse(request.body);
    const digest = canonicalDigest({ ...body, expected_source_types: [...body.expected_source_types].sort(), expected_template_types: [...body.expected_template_types].sort(), known_special_structures: [...body.known_special_structures].sort() });
    const sellSideScope = body.deal_type.toLowerCase().includes("sell-side") || body.deal_type.toLowerCase().includes("sell side");
    const resultLabel = !body.can_purchase_independently || !sellSideScope ? "Not supported for this intended use" : body.employer_restrictions.toLowerCase() === "none" && body.provider_or_geographic_restrictions.toLowerCase() === "none" && body.confidentiality_class !== "restricted" ? "Likely compatible" : "Potential constraint — review before purchase";
    const assessment = await database.pool.query<{ id: string; result: string; basis: string; unverified_conditions: string[]; preflight_recheck: string[] }>(
      "SELECT * FROM app.create_qualification_assessment($1,$2,$3,$4,$5)",
      [digest, resultLabel, "Non-confidential category information was evaluated against the current V1 capability boundary; exact files, rights, provider, and minimum packet remain unverified.", ["exact source rights", "provider/geographic restrictions", "minimum Source Packet"], ["purchase authority", "intended use", "source rights", "confidentiality", "processing compatibility", "minimum Source Packet"]],
    );
    const row = assessment.rows[0];
    return reply.code(201).send({ id: row.id, result: row.result, basis: row.basis, unverified_conditions: row.unverified_conditions, preflight_recheck: row.preflight_recheck, source_material_authorized: false });
  });

  api.get<{ Params: { assessment_id: string } }>("/api/v1/public/qualification-assessments/:assessment_id", async (request, reply) => {
    const assessmentId = z.string().uuid().parse(request.params.assessment_id);
    const assessment = await database.pool.query("SELECT * FROM app.get_qualification_assessment($1)", [assessmentId]);
    if (assessment.rowCount !== 1) return problem(reply, 404, "resource_not_found", "The qualification assessment is not available.", "start_new_qualification", request.url);
    return reply.code(200).send({ ...assessment.rows[0], source_material_authorized: false });
  });

  function sessionFor(request: FastifyRequest) {
    return cookieValue(request, "__Host-banker_session");
  }

  async function requireBanker(request: FastifyRequest, reply: FastifyReply) {
    const session = sessionFor(request);
    if (!session) {
      problem(reply, 401, "authentication_required", "Authenticate to continue.", "authenticate", request.url);
      return null;
    }
    return session;
  }

  function orderProjection(row: {
    id: string; billing_term: "monthly" | "annual"; add_on_code: string; amount_minor: number; currency: string; tax_posture: string; tax_amount_minor: number; renewal_amount_minor: number; included_active_deals: number; allowances: Record<string, unknown>; unmetered_actions: string[]; guarantee_version: string; cancellation_version: string; contract_version: string; contract_digest: string; current_step: string; payment_state: string; status: string; provider_checkout_id: string | null; row_version: number; created_at: string; completed_at: string | null;
  }) {
    return {
      id: row.id,
      product_code: publicOffer.product_code,
      capability_version: publicOffer.capability_version,
      billing_term: row.billing_term,
      annual_equivalent: { monthly_amount_minor: publicOffer.annual.monthly_equivalent_minor, savings_minor: publicOffer.annual.savings_minor, discount_percent: publicOffer.annual.discount_percent },
      add_on: row.add_on_code,
      amount_minor: row.amount_minor,
      amount_due_now: { amount_minor: row.amount_minor, currency: row.currency },
      currency: row.currency,
      tax: { posture: row.tax_posture, amount_minor: row.tax_amount_minor },
      renewal: { amount_minor: row.renewal_amount_minor, term: row.billing_term },
      included_active_deals: row.included_active_deals,
      allowances: row.allowances,
      unmetered_actions: row.unmetered_actions,
      guarantee: row.guarantee_version,
      cancellation: row.cancellation_version,
      contract_version: row.contract_version,
      contract_digest: row.contract_digest,
      current_step: row.current_step,
      payment_state: row.payment_state,
      status: row.status,
      provider_checkout_id: row.provider_checkout_id,
      row_version: Number(row.row_version),
      created_at: row.created_at,
      completed_at: row.completed_at,
    };
  }

  api.post("/api/v1/checkout-orders", async (request, reply) => {
    const session = await requireBanker(request, reply);
    if (!session) return;
    const body = z.object({ billing_term: z.enum(["monthly", "annual"]), add_on: z.enum(["none", "additional_active_deal", "intensive_processing", "archive_capacity"]).default("none") }).strict().parse(request.body);
    if (body.billing_term === "annual" && body.add_on === "archive_capacity") return problem(reply, 400, "invalid_request", "Archive capacity is a monthly-only V1 pack.", "choose_supported_add_on", request.url);
    const idempotencyKey = request.headers["idempotency-key"];
    if (typeof idempotencyKey !== "string" || idempotencyKey.length < 16 || idempotencyKey.length > 128) return problem(reply, 400, "invalid_request", "An Idempotency-Key of 16–128 characters is required for checkout commands.", "correct_request", request.url);
    let result: Awaited<ReturnType<typeof database.withContext>>;
    try {
      result = await database.withContext(session, null, async (client, context) => {
        const response = await client.query(`SELECT * FROM app.create_checkout_order($1,$2,$3,$4,$5,$6,$7,$8)`, [context.accountId, context.actorId, body.billing_term, body.add_on, idempotencyKey, checkoutContractDigest(body.billing_term, body.add_on), publicOffer.allowances, publicOffer.unmetered_actions]);
        return response.rows[0];
      });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "23505") return problem(reply, 409, "idempotency_key_reused", "This Idempotency-Key was already used for a different Checkout Order.", "start_new_checkout_order", request.url);
      throw error;
    }
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required for checkout.", "register_passkey", request.url);
    if (result.kind === "not_found") return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_safe_parent", request.url);
    const bodyResult = orderProjection(result.value as Parameters<typeof orderProjection>[0]);
    reply.header("etag", `W/\"${bodyResult.row_version}\"`);
    return reply.code(201).send(bodyResult);
  });

  api.get<{ Params: { checkout_order_id: string } }>("/api/v1/checkout-orders/:checkout_order_id", async (request, reply) => {
    const session = await requireBanker(request, reply);
    if (!session) return;
    const orderId = z.string().uuid().parse(request.params.checkout_order_id);
    const result = await database.withContext(session, null, async (client) => {
      const order = await client.query("SELECT * FROM app.checkout_order WHERE id = $1", [orderId]);
      if (order.rowCount !== 1) return null;
      const projected = orderProjection(order.rows[0]);
      const terms = await client.query("SELECT id, displayed_contract_digest, acknowledgements, accepted_at FROM app.checkout_terms_acceptance WHERE checkout_order_id = $1", [orderId]);
      if (projected.status === "completed") {
        const entitlement = await client.query("SELECT pe.active_deal_capacity, a.display_name AS actor_name, pe.capabilities, pe.term_start, pe.term_end FROM app.product_entitlement pe JOIN app.actor a ON a.id = pe.actor_id WHERE pe.source_receipt_id IN (SELECT id FROM app.commercial_receipt WHERE checkout_order_id = $1)", [orderId]);
        const receipt = await client.query("SELECT id, provider_payment_id, amount_minor, currency, tax_amount_minor, created_at FROM app.commercial_receipt WHERE checkout_order_id = $1", [orderId]);
        return { ...projected, terms_acceptance: terms.rows[0] ?? null, entitlement: entitlement.rows[0] ? { ...entitlement.rows[0], active_deal_capacity: Number(entitlement.rows[0].active_deal_capacity) } : null, receipt: receipt.rows[0] ?? null };
      }
      return { ...projected, terms_acceptance: terms.rows[0] ?? null, entitlement: null, receipt: null };
    });
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required for checkout.", "register_passkey", request.url);
    if (result.kind === "not_found") return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_safe_parent", request.url);
    if (result.value === null) return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_safe_parent", request.url);
    reply.header("etag", `W/\"${result.value.row_version}\"`);
    return reply.code(200).send(result.value);
  });

  api.post<{ Params: { checkout_order_id: string } }>("/api/v1/checkout-orders/:checkout_order_id/terms-acceptances", async (request, reply) => {
    const session = await requireBanker(request, reply);
    if (!session) return;
    const orderId = z.string().uuid().parse(request.params.checkout_order_id);
    const body = z.object({ displayed_contract_digest: z.string().startsWith("sha256:"), acknowledgements: z.object({ purchase_authority: z.literal(true), source_authority_separate: z.literal(true), guarantee: z.literal(true), cancellation_refund: z.literal(true), post_term: z.literal(true), export_retention_deletion: z.literal(true), add_on_preview: z.literal(true), provider_boundary: z.literal(true) }).strict() }).strict().parse(request.body);
    const ifMatch = request.headers["if-match"];
    if (typeof ifMatch !== "string") return problem(reply, 428, "invalid_request", "The current Checkout Order version is required.", "refresh_checkout_state", request.url);
    const idempotencyKey = request.headers["idempotency-key"];
    if (typeof idempotencyKey !== "string" || idempotencyKey.length < 16 || idempotencyKey.length > 128) return problem(reply, 400, "invalid_request", "An Idempotency-Key of 16–128 characters is required for checkout terms commands.", "correct_request", request.url);
    let result: Awaited<ReturnType<typeof database.withContext>>;
    try {
      result = await database.withContext(session, null, async (client) => {
        const current = await client.query<{ row_version: string }>("SELECT row_version FROM app.checkout_order WHERE id = $1", [orderId]);
        if (current.rowCount !== 1) return { kind: "missing" as const };
        if (ifMatch !== `W/\"${current.rows[0].row_version}\"`) return { kind: "stale" as const };
        return { kind: "accepted" as const, value: (await client.query("SELECT * FROM app.accept_checkout_terms($1,$2,$3,$4)", [orderId, body.displayed_contract_digest, body.acknowledgements, idempotencyKey])).rows[0] };
      });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "23505") return problem(reply, 409, "idempotency_key_reused", "This Idempotency-Key was already used for a different terms command.", "start_new_checkout_order", request.url);
      if (error && typeof error === "object" && "code" in error && (error.code === "22023" || error.code === "40001")) return problem(reply, 409, "checkout_state_ambiguous", "The displayed Checkout terms no longer match the saved Order.", "refresh_checkout_state", request.url);
      throw error;
    }
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required for checkout.", "register_passkey", request.url);
    if (result.kind === "not_found") return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_safe_parent", request.url);
    if (result.kind !== "ok") return problem(reply, 503, "service_unavailable", "The Checkout Order terms could not be accepted.", "retry_after_delay", request.url);
    const termsResult = result.value as { kind: "stale" | "missing" | "accepted"; value?: unknown };
    if (termsResult.kind === "stale") return problem(reply, 409, "checkout_state_ambiguous", "The Checkout Order changed before terms were accepted.", "refresh_checkout_state", request.url);
    if (termsResult.kind === "missing") return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_safe_parent", request.url);
    if (termsResult.kind !== "accepted") return problem(reply, 409, "checkout_state_ambiguous", "The Checkout Order terms could not be accepted.", "refresh_checkout_state", request.url);
    return reply.code(201).send(termsResult.value);
  });

  api.post("/api/v1/checkout-sessions", async (request, reply) => {
    const session = await requireBanker(request, reply);
    if (!session) return;
    const body = z.object({ checkout_order_id: z.string().uuid(), terms_acceptance_id: z.string().uuid() }).strict().parse(request.body);
    const idempotencyKey = request.headers["idempotency-key"];
    if (typeof idempotencyKey !== "string" || idempotencyKey.length < 16 || idempotencyKey.length > 128) return problem(reply, 400, "invalid_request", "An Idempotency-Key of 16–128 characters is required for checkout session commands.", "correct_request", request.url);
    const requestDigest = canonicalDigest({ checkout_order_id: body.checkout_order_id, terms_acceptance_id: body.terms_acceptance_id });
    const result = await database.withContext(session, null, async (client, context) => {
      // Hold a transaction-scoped lock across the provider call so a retried
      // command cannot create two external Checkout sessions for one key.
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`${context.accountId}:${idempotencyKey}`]);
      const order = await client.query("SELECT * FROM app.checkout_order WHERE id = $1", [body.checkout_order_id]);
      const acceptance = await client.query("SELECT 1 FROM app.checkout_terms_acceptance WHERE id = $1 AND checkout_order_id = $2", [body.terms_acceptance_id, body.checkout_order_id]);
      if (order.rowCount !== 1 || acceptance.rowCount !== 1) return { kind: "invalid_state" as const };
      const prior = await client.query("SELECT * FROM app.checkout_order WHERE account_id = app.policy_account_id() AND session_idempotency_key = $1", [idempotencyKey]);
      const orderRow = order.rows[0];
      const priorRow = prior.rows[0] ?? null;
      if (priorRow && (priorRow.id !== orderRow.id || priorRow.session_request_digest !== requestDigest)) return { kind: "idempotency_conflict" as const };
      if (orderRow.provider_checkout_id && orderRow.session_idempotency_key === idempotencyKey) return { kind: "existing" as const, row: orderRow, hosted_url: checkoutAdapter.getHostedSessionUrl?.(orderRow.provider_checkout_id) ?? null };
      if (orderRow.provider_checkout_id && orderRow.session_idempotency_key && orderRow.session_idempotency_key !== idempotencyKey) return { kind: "idempotency_conflict" as const };
      const billingTerm = z.enum(["monthly", "annual"]).parse(orderRow.billing_term) as BillingTerm;
      const addOn = z.enum(["none", "additional_active_deal", "intensive_processing", "archive_capacity"]).parse(orderRow.add_on_code) as AddOnCode;
      const hostedSession = await checkoutAdapter.createHostedSession({ checkoutOrderId: body.checkout_order_id, billingTerm, addOn });
      const created = (await client.query("SELECT * FROM app.create_checkout_session($1,$2,$3,$4)", [body.checkout_order_id, hostedSession.providerSessionId, idempotencyKey, requestDigest])).rows[0];
      return { kind: "created" as const, row: created, hosted_url: hostedSession.hostedUrl };
    });
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required for checkout.", "register_passkey", request.url);
    if (result.kind === "not_found") return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_safe_parent", request.url);
    if (result.kind !== "ok") return problem(reply, 503, "service_unavailable", "The checkout session could not be created.", "retry_after_delay", request.url);
    const sessionResult = result.value as { kind: "invalid_state" | "idempotency_conflict" | "existing" | "created"; row?: { provider_checkout_id: string; id: string; payment_state: string }; hosted_url?: string | null };
    if (sessionResult.kind === "invalid_state") return problem(reply, 409, "checkout_state_ambiguous", "The checkout terms could not be verified for this Order.", "refresh_checkout_state", request.url);
    if (sessionResult.kind === "idempotency_conflict") return problem(reply, 409, "idempotency_key_reused", "This Idempotency-Key was already used for a different checkout command.", "start_new_checkout_order", request.url);
    if (!sessionResult.row) return problem(reply, 503, "service_unavailable", "The checkout session could not be created.", "retry_after_delay", request.url);
    return reply.code(201).send({ id: sessionResult.row.provider_checkout_id, checkout_order_id: sessionResult.row.id, provider_session_id: sessionResult.row.provider_checkout_id, provider: checkoutAdapter.name, live_verification_debt: checkoutAdapter.name === "stripe_test_adapter", hosted_url: sessionResult.hosted_url ?? null, payment_state: sessionResult.row.payment_state });
  });

  api.get<{ Params: { checkout_session_id: string } }>("/api/v1/checkout-sessions/:checkout_session_id", async (request, reply) => {
    const session = await requireBanker(request, reply);
    if (!session) return;
    const providerSessionId = z.string().min(1).max(200).parse(request.params.checkout_session_id);
    const result = await database.withContext(session, null, async (client) => {
      const order = await client.query("SELECT * FROM app.checkout_order WHERE provider_checkout_id = $1", [providerSessionId]);
      return order.rowCount === 1 ? orderProjection(order.rows[0]) : null;
    });
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required for checkout.", "register_passkey", request.url);
    if (result.kind === "not_found") return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_safe_parent", request.url);
    if (result.value === null) return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_safe_parent", request.url);
    return reply.code(200).send({ id: providerSessionId, checkout_order_id: result.value.id, payment_state: result.value.payment_state, product_authoritative_status: result.value.status, current_step: result.value.current_step });
  });

  api.get("/api/v1/account/entitlements", async (request, reply) => {
    const session = await requireBanker(request, reply);
    if (!session) return;
    const result = await database.withContext(session, null, async (client) => {
      const rows = await client.query("SELECT pe.id, pe.product_code, pe.capability_version, pe.term_start, pe.term_end, pe.active_deal_capacity, pe.capabilities, pe.status, a.display_name AS actor_name FROM app.product_entitlement pe JOIN app.actor a ON a.id = pe.actor_id WHERE pe.account_id = app.policy_account_id() ORDER BY pe.created_at ASC");
      return { entitlements: rows.rows.map((row) => ({ ...row, active_deal_capacity: Number(row.active_deal_capacity) })) };
    });
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
    if (result.kind === "not_found") return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_safe_parent", request.url);
    return reply.code(200).send(result.value);
  });

  api.get("/api/v1/account/commercial-receipts", async (request, reply) => {
    const session = await requireBanker(request, reply);
    if (!session) return;
    const result = await database.withContext(session, null, async (client) => (await client.query("SELECT id, checkout_order_id, provider_payment_id, amount_minor, currency, tax_amount_minor, status, created_at FROM app.commercial_receipt WHERE account_id = app.policy_account_id() ORDER BY created_at ASC")).rows);
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
    if (result.kind === "not_found") return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_safe_parent", request.url);
    return reply.code(200).send({ receipts: result.value });
  });

  api.get("/api/v1/account/usage", async (request, reply) => {
    const session = await requireBanker(request, reply);
    if (!session) return;
    const result = await database.withContext(session, null, async (client) => {
      const rows = await client.query("SELECT COALESCE(SUM(quantity) FILTER (WHERE entry_type = 'grant' AND allowance_class IN ('active_deal_capacity', 'active_deal_capacity_add_on')), 0)::int AS granted_active_deals, COALESCE(SUM(quantity) FILTER (WHERE entry_type = 'grant' AND allowance_class = 'logical_pages_intensive_processing'), 0)::int AS intensive_logical_pages, COALESCE(SUM(quantity) FILTER (WHERE entry_type = 'grant' AND allowance_class = 'full_workflow_operations_intensive_processing'), 0)::int AS intensive_operations, COALESCE(SUM(quantity) FILTER (WHERE entry_type = 'grant' AND allowance_class = 'archive_capacity_gb'), 0)::int AS archive_capacity_gb FROM app.usage_ledger_entry WHERE account_id = app.policy_account_id()");
      const ent = await client.query("SELECT COALESCE(MAX(active_deal_capacity), 0)::int AS active_deal_capacity FROM app.product_entitlement WHERE account_id = app.policy_account_id() AND status IN ('active','billing_recovery')");
      return { active_deal_capacity: Number(ent.rows[0].active_deal_capacity), granted_active_deals: Number(rows.rows[0].granted_active_deals), used_active_deals: 0, granted_allowances: { intensive_logical_pages: Number(rows.rows[0].intensive_logical_pages), intensive_operations: Number(rows.rows[0].intensive_operations), archive_capacity_gb: Number(rows.rows[0].archive_capacity_gb) } };
    });
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
    if (result.kind === "not_found") return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_safe_parent", request.url);
    return reply.code(200).send(result.value);
  });

  api.get("/api/v1/account/subscription", async (request, reply) => {
    const session = await requireBanker(request, reply);
    if (!session) return;
    const result = await database.withContext(session, null, async (client) => {
      const row = await client.query("SELECT billing_term, amount_minor, renewal_amount_minor, current_step, payment_state, status, cancellation_version, guarantee_version FROM app.checkout_order WHERE account_id = app.policy_account_id() ORDER BY created_at DESC LIMIT 1");
      return row.rows[0] ?? null;
    });
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
    if (result.kind === "not_found") return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_safe_parent", request.url);
    return reply.code(200).send(result.value ?? { status: "not_started", payment_state: "not_started" });
  });

  api.get("/api/v1/account/commerce-state", async (request, reply) => {
    const session = await requireBanker(request, reply);
    if (!session) return;
    const result = await database.withContext(session, null, async (client) => {
      const [entitlements, receipts, usage, audit, measurements] = await Promise.all([
        client.query("SELECT pe.id, pe.product_code, pe.capability_version, pe.term_start, pe.term_end, pe.active_deal_capacity, pe.capabilities, pe.status, a.display_name AS actor_name FROM app.product_entitlement pe JOIN app.actor a ON a.id = pe.actor_id WHERE pe.account_id = app.policy_account_id() ORDER BY pe.created_at ASC"),
        client.query("SELECT id, checkout_order_id, provider_payment_id, amount_minor, currency, tax_amount_minor, status, created_at FROM app.commercial_receipt WHERE account_id = app.policy_account_id() ORDER BY created_at ASC"),
        client.query("SELECT COALESCE(MAX(active_deal_capacity), 0)::int AS active_deal_capacity, COALESCE(SUM(quantity) FILTER (WHERE entry_type = 'grant' AND allowance_class IN ('active_deal_capacity', 'active_deal_capacity_add_on')), 0)::int AS granted_active_deals, COALESCE(SUM(quantity) FILTER (WHERE entry_type = 'grant' AND allowance_class = 'logical_pages_intensive_processing'), 0)::int AS intensive_logical_pages, COALESCE(SUM(quantity) FILTER (WHERE entry_type = 'grant' AND allowance_class = 'full_workflow_operations_intensive_processing'), 0)::int AS intensive_operations, COALESCE(SUM(quantity) FILTER (WHERE entry_type = 'grant' AND allowance_class = 'archive_capacity_gb'), 0)::int AS archive_capacity_gb FROM app.usage_ledger_entry ul LEFT JOIN app.product_entitlement pe ON pe.id = ul.entitlement_id WHERE ul.account_id = app.policy_account_id()"),
        client.query("SELECT id, code, outcome, object_kind, object_id, created_at FROM app.audit_event WHERE account_id = app.policy_account_id() AND deal_id IS NULL ORDER BY created_at ASC, id ASC"),
        client.query("SELECT event_code, source_identity, properties, created_at FROM app.product_measurement_candidate WHERE account_id = app.policy_account_id() ORDER BY created_at ASC"),
      ]);
      return { entitlements: entitlements.rows.map((row) => ({ ...row, active_deal_capacity: Number(row.active_deal_capacity) })), receipts: receipts.rows, usage: { active_deal_capacity: Number(usage.rows[0].active_deal_capacity), granted_active_deals: Number(usage.rows[0].granted_active_deals), used_active_deals: 0, granted_allowances: { intensive_logical_pages: Number(usage.rows[0].intensive_logical_pages), intensive_operations: Number(usage.rows[0].intensive_operations), archive_capacity_gb: Number(usage.rows[0].archive_capacity_gb) } }, audit_events: audit.rows, measurement_candidates: measurements.rows };
    });
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
    if (result.kind === "not_found") return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_safe_parent", request.url);
    return reply.code(200).send(result.value);
  });

  api.post("/webhooks/stripe", async (request, reply) => {
    const rawBody = typeof request.body === "string" ? request.body : stableJson(request.body);
    const secret = process.env.STRIPE_WEBHOOK_SECRET ?? (process.env.APP_ENV === "production" ? "" : "ticket-03-test-secret");
    if (!secret) return problem(reply, 503, "provider_unavailable", "Stripe Webhook verification is not configured.", "retry_after_delay", request.url);
    const signatureHeader = request.headers["stripe-signature"];
    if (!verifyStripeSignature(rawBody, typeof signatureHeader === "string" ? signatureHeader : undefined, secret)) return problem(reply, 400, "invalid_signature", "The provider signature is invalid or expired.", "provider_retry", request.url);
    let rawEvent: unknown;
    try {
      rawEvent = JSON.parse(rawBody);
    } catch {
      return problem(reply, 400, "invalid_request", "The provider event body is not valid JSON.", "provider_retry", request.url);
    }
    let parsed: ReturnType<typeof canonicalizeStripeEvent>;
    try {
      parsed = canonicalizeStripeEvent(rawEvent);
    } catch {
      return problem(reply, 400, "invalid_request", "The provider event body does not match the supported evidence contract.", "provider_retry", request.url);
    }
    const providerEventId = stripeEventId(rawEvent);
    if (!providerEventId) return problem(reply, 400, "invalid_request", "The provider event identity is missing.", "provider_retry", request.url);
    if (database.failProviderEvidencePersistence) return problem(reply, 503, "provider_event_persistence_failed", "The provider event could not be durably recorded.", "provider_retry", request.url);
    const digest = canonicalDigest(parsed);
    const persisted = await database.pool.query<{ state: string }>("SELECT * FROM app.persist_provider_event($1,$2,$3,$4,$5,$6)", [providerEventId, parsed.api_version, parsed.type, parsed, digest, rawPayloadDigest(rawBody)]);
    const state = persisted.rows[0]?.state;
    const reconciliation = await database.pool.query<{ dispatch_provider_event_outbox: string }>("SELECT app.dispatch_provider_event_outbox($1)", [providerEventId]);
    return reply.code(200).send({ status: reconciliation.rows[0]?.dispatch_provider_event_outbox ?? state ?? "received", provider_event_id: providerEventId, canonical_digest: digest });
  });

  api.post<{ Params: { deal_id: string } }>("/api/v1/deals/:deal_id/reference-jobs", async (request, reply) => {
    const dealId = dealIdSchema.parse(request.params.deal_id);
    const body = z.object({
      purpose: z.literal("reference_workspace_build"),
      inputs: z.object({ source_packet: z.string().min(1).max(160), requested_scope: z.literal("synthetic_reference_fixture") }).strict(),
    }).strict().parse(request.body);
    const idempotencyKey = headerValue(request, "idempotency-key");
    if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 128) {
      return problem(reply, 400, "idempotency_key_required", "A valid Idempotency-Key is required.", "retry_with_idempotency_key", request.url);
    }
    const session = cookieValue(request, "__Host-banker_session") ?? cookieValue(request, "__Host-pending_passkey");
    if (!session) return problem(reply, 401, "authentication_required", "Authenticate to continue.", "authenticate", request.url);
    const requestDigest = canonicalDigest({ method: "POST", route: "/api/v1/deals/{deal_id}/reference-jobs", api_version: "v1", deal_id: dealId, purpose: body.purpose, inputs: body.inputs });
    const result = await database.withContext(session, dealId, async (client) => {
      const created = await client.query<{ job_id: string; created: boolean; conflict: boolean }>(
        "SELECT * FROM jobs.start_reference_job($1, $2, $3, $4)",
        [dealId, Database.hashToken(idempotencyKey), requestDigest, body.inputs],
      );
      const row = created.rows[0];
      if (!row || row.conflict) return { kind: "conflict" as const, jobId: row?.job_id ?? null };
      const job = await client.query<{ id: string; state: string; requested_at: string; row_version: string }>("SELECT id, state, requested_at, row_version FROM jobs.job WHERE id = $1", [row.job_id]);
      if (row.created) await client.query("SELECT app.record_audit($1,$2,$3,$4,$5,$6)", ["reference_job_started", "completed", "job", row.job_id, "accepted", traceId()]);
      return { kind: "ok" as const, job: job.rows[0], created: row.created };
    });
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required for Job access.", "register_passkey", request.url);
    if (result.kind === "not_found") return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_safe_parent", request.url);
    if (result.value.kind === "conflict") return problem(reply, 409, "idempotency_key_reused", "The Idempotency-Key was already used for a different request.", "use_new_idempotency_key", request.url);
    api.referenceJobRuntime.schedule(result.value.job.id);
    reply.header("Location", `/api/v1/jobs/${result.value.job.id}`);
    reply.header("ETag", etag(Number(result.value.job.row_version)));
    if (!result.value.created) reply.header("Idempotent-Replayed", "true");
    return reply.code(202).send({ id: result.value.job.id, job_type: "reference_workspace_build", state: result.value.job.state, accepted_at: result.value.job.requested_at });
  });

  api.get<{ Params: { job_id: string } }>("/api/v1/jobs/:job_id", async (request, reply) => {
    const jobId = dealIdSchema.parse(request.params.job_id);
    const session = cookieValue(request, "__Host-banker_session") ?? cookieValue(request, "__Host-pending_passkey");
    if (!session) return problem(reply, 401, "authentication_required", "Authenticate to continue.", "authenticate", request.url);
    const result = await database.withJobContext(session, jobId, async (client) => {
      const query = await client.query<{
        id: string; account_id: string; deal_id: string; command_type: string; purpose_code: string; accepted_inputs: Record<string, unknown>;
        input_digest: string; input_version: string; workflow_version: string; release_id: string; allowance_class: string; allowance_quantity: string;
        allowance_posture: string; workspace_posture_version: string; security_epoch: string; state: string; progress: Record<string, unknown>; result: Record<string, unknown> | null;
        problem: Record<string, unknown> | null; requested_at: string; updated_at: string; worker_heartbeat_at: string | null; row_version: string; scope_id: string | null; scope_expires_at: string | null; runtime_principal_code: string | null;
      }>(
        `SELECT j.id, j.account_id, j.deal_id, j.command_type, j.purpose_code, j.accepted_inputs, j.input_digest, j.input_version, j.workflow_version,
                j.release_id, j.allowance_class, j.allowance_quantity, j.allowance_posture, j.workspace_posture_version, j.security_epoch, j.state, j.progress,
                j.result, j.problem, j.requested_at, j.updated_at, j.worker_heartbeat_at, j.row_version,
                latest.id AS scope_id, latest.expires_at AS scope_expires_at, latest.runtime_principal_code
         FROM jobs.job j
         LEFT JOIN LATERAL (
           SELECT s.id, s.expires_at, s.runtime_principal_code
           FROM jobs.job_scope s WHERE s.job_id = j.id ORDER BY s.issued_at DESC LIMIT 1
         ) latest ON true
         WHERE j.id = $1`,
        [jobId],
      );
      if (query.rowCount !== 1) return null;
      const row = query.rows[0];
      const events = await client.query<{ sequence: string; event_type: string; state: string; stage_code: string | null; safe_message_code: string; recovery_action: string | null; occurred_at: string }>("SELECT sequence, event_type, state, stage_code, safe_message_code, recovery_action, occurred_at FROM jobs.job_event WHERE job_id = $1 ORDER BY sequence DESC LIMIT 1", [jobId]);
      return {
        id: row.id,
        job_type: row.command_type,
        state: row.state,
        progress: row.progress,
        scope: {
          account_id: row.account_id,
          deal_id: row.deal_id,
          purpose: row.purpose_code,
          input_digest: row.input_digest,
          input_version: row.input_version,
          workflow_version: row.workflow_version,
          release_id: row.release_id,
          allowance: { class: row.allowance_class, quantity: row.allowance_quantity, posture: row.allowance_posture },
          workspace_posture_version: Number(row.workspace_posture_version),
          security_epoch: Number(row.security_epoch),
          scope_id: row.scope_id,
          runtime_principal: row.runtime_principal_code,
          operations: row.scope_id ? ["reference_workspace_build"] : [],
          expires_at: row.scope_expires_at,
        },
        result: row.result,
        problem: row.problem,
        accepted_inputs: row.accepted_inputs,
        created_at: row.requested_at,
        updated_at: row.updated_at,
        worker_heartbeat_at: row.worker_heartbeat_at,
        row_version: Number(row.row_version),
        latest_event: events.rows[0] ? {
          sequence: Number(events.rows[0].sequence), event_type: events.rows[0].event_type, state: events.rows[0].state,
          stage_code: events.rows[0].stage_code, message_code: events.rows[0].safe_message_code, recovery_action: events.rows[0].recovery_action, occurred_at: events.rows[0].occurred_at,
        } : null,
      };
    });
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required for Job access.", "register_passkey", request.url);
    if (result.kind === "not_found" || result.value === null) return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_safe_parent", request.url);
    reply.header("ETag", etag(result.value.row_version)).header("Cache-Control", "private, no-store");
    return reply.code(200).send(result.value);
  });

  api.get<{ Params: { job_id: string } }>("/api/v1/jobs/:job_id/events", async (request, reply) => {
    const jobId = dealIdSchema.parse(request.params.job_id);
    const session = cookieValue(request, "__Host-banker_session") ?? cookieValue(request, "__Host-pending_passkey");
    if (!session) return problem(reply, 401, "authentication_required", "Authenticate to continue.", "authenticate", request.url);
    const lastEventId = Number(headerValue(request, "last-event-id") ?? "0");
    if (!Number.isInteger(lastEventId) || lastEventId < 0) return problem(reply, 400, "invalid_event_cursor", "The event cursor is invalid.", "reconnect_without_cursor", request.url);
    const result = await database.withJobContext(session, jobId, async (client) => {
      const rows = await client.query<{ sequence: string; event_type: string; state: string; stage_code: string | null; progress: Record<string, unknown>; safe_message_code: string; recovery_action: string | null; occurred_at: string }>(
        "SELECT sequence, event_type, state, stage_code, progress, safe_message_code, recovery_action, occurred_at FROM jobs.job_event WHERE job_id = $1 AND sequence > $2 ORDER BY sequence ASC",
        [jobId, lastEventId],
      );
      const snapshot = await client.query<{ state: string; progress: Record<string, unknown>; row_version: string; worker_heartbeat_at: string | null; sequence: string | null }>("SELECT j.state, j.progress, j.row_version, j.worker_heartbeat_at, (SELECT max(sequence) FROM jobs.job_event WHERE job_id = j.id) AS sequence FROM jobs.job j WHERE j.id = $1", [jobId]);
      const bounds = await client.query<{ first_sequence: string | null }>("SELECT min(sequence) AS first_sequence FROM jobs.job_event WHERE job_id = $1", [jobId]);
      return { rows: rows.rows, snapshot: snapshot.rows[0], firstSequence: bounds.rows[0]?.first_sequence ? Number(bounds.rows[0].first_sequence) : null };
    });
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required for Job access.", "register_passkey", request.url);
    if (result.kind === "not_found") return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_safe_parent", request.url);
    if (result.value.firstSequence !== null && lastEventId > 0 && lastEventId < result.value.firstSequence - 1) return problem(reply, 409, "event_cursor_expired", "The event cursor is no longer retained.", "reconnect_without_cursor", request.url);
    const lines = ["retry: 3000", ": heartbeat"];
    const snapshotData = result.value.snapshot ? JSON.stringify({ state: result.value.snapshot.state, progress: result.value.snapshot.progress, row_version: Number(result.value.snapshot.row_version), worker_heartbeat_at: result.value.snapshot.worker_heartbeat_at }) : null;
    const snapshotLine = snapshotData ? `event: job_snapshot\ndata: ${snapshotData}` : null;
    if (lastEventId === 0 && snapshotLine) lines.push(snapshotLine);
    for (const event of result.value.rows) lines.push(`id: ${event.sequence}\nevent: ${event.event_type}\ndata: ${JSON.stringify({ state: event.state, stage_code: event.stage_code, progress: event.progress, message_code: event.safe_message_code, recovery_action: event.recovery_action, occurred_at: event.occurred_at })}`);
    if (lastEventId > 0 && snapshotData) lines.push(`id: ${Number(result.value.snapshot?.sequence ?? lastEventId)}\nevent: job_snapshot\ndata: ${snapshotData}`);
    if (result.value.snapshot && ["completed", "failed_terminal", "canceled"].includes(result.value.snapshot.state)) lines.push("event: stream_closed\ndata: {\"reason\":\"terminal\"}");
    return reply.code(200).type("text/event-stream").header("cache-control", "no-cache").send(`${lines.join("\n\n")}\n\n`);
  });

  api.post<{ Params: { job_id: string } }>("/api/v1/jobs/:job_id/cancellations", async (request, reply) => {
    const jobId = dealIdSchema.parse(request.params.job_id);
    const body = z.object({ reason: z.string().min(1).max(120) }).strict().parse(request.body);
    const version = Number(headerValue(request, "if-match")?.replace(/^\"job-|\"$/g, ""));
    if (!Number.isInteger(version)) return problem(reply, 428, "precondition_required", "The current Job version is required.", "reload_and_retry", request.url);
    const session = cookieValue(request, "__Host-banker_session") ?? cookieValue(request, "__Host-pending_passkey");
    if (!session) return problem(reply, 401, "authentication_required", "Authenticate to continue.", "authenticate", request.url);
    const result = await database.withJobContext(session, jobId, async (client) => (await client.query<{ status: string; job_state: string | null; row_version: string | null }>("SELECT * FROM jobs.cancel_reference_job($1, $2, $3)", [jobId, version, body.reason])).rows[0]);
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required for Job access.", "register_passkey", request.url);
    if (result.kind === "not_found" || !result.value || result.value.status === "not_found") return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_safe_parent", request.url);
    if (result.value.status === "version_conflict") {
      if (result.value.row_version !== null) reply.header("ETag", etag(Number(result.value.row_version)));
      return problem(reply, 412, "version_conflict", "The Job changed after it was loaded.", "reload_and_compare", request.url);
    }
    if (result.value.status === "not_cancelable") return problem(reply, 409, "job_not_cancelable", "The Job cannot be canceled in its current state.", "inspect_job", request.url);
    reply.header("ETag", etag(Number(result.value.row_version)));
    return reply.code(201).send({ job_id: jobId, state: result.value.job_state, row_version: Number(result.value.row_version) });
  });

  api.post<{ Params: { job_id: string } }>("/api/v1/jobs/:job_id/retries", async (request, reply) => {
    const jobId = dealIdSchema.parse(request.params.job_id);
    const version = Number(headerValue(request, "if-match")?.replace(/^\"job-|\"$/g, ""));
    if (!Number.isInteger(version)) return problem(reply, 428, "precondition_required", "The current Job version is required.", "reload_and_retry", request.url);
    const session = cookieValue(request, "__Host-banker_session") ?? cookieValue(request, "__Host-pending_passkey");
    if (!session) return problem(reply, 401, "authentication_required", "Authenticate to continue.", "authenticate", request.url);
    const result = await database.withJobContext(session, jobId, async (client) => (await client.query<{ status: string; job_state: string | null; row_version: string | null }>("SELECT * FROM jobs.retry_reference_job($1, $2)", [jobId, version])).rows[0]);
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required for Job access.", "register_passkey", request.url);
    if (result.kind === "not_found" || !result.value || result.value.status === "not_found") return problem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_safe_parent", request.url);
    if (result.value.status === "version_conflict") {
      if (result.value.row_version !== null) reply.header("ETag", etag(Number(result.value.row_version)));
      return problem(reply, 412, "version_conflict", "The Job changed after it was loaded.", "reload_and_compare", request.url);
    }
    if (result.value.status === "not_retryable") return problem(reply, 409, "job_not_retryable", "Only failed-retryable Jobs can be retried.", "inspect_recovery_action", request.url);
    api.referenceJobRuntime.schedule(jobId);
    reply.header("ETag", etag(Number(result.value.row_version)));
    return reply.code(200).send({ job_id: jobId, state: result.value.job_state, row_version: Number(result.value.row_version) });
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
