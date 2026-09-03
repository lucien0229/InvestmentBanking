import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { buildApi } from "../apps/api/src/app.js";
import { StripeCheckoutAdapter, canonicalizeStripeEvent } from "../apps/api/src/commerce.js";
import { createTestDatabase } from "../apps/api/src/test-database.js";

const webhookSecret = "development-webhook-test-secret";

test("Stripe checkout session evidence accepts nullable subscription fields", () => {
  const event = canonicalizeStripeEvent({
    id: "evt_nullable",
    type: "checkout.session.completed",
    api_version: "2026-08-26.dahlia",
    data: { object: { id: "cs_test_nullable", payment_intent: null, payment_status: "paid", amount_total: 99500, currency: "usd", metadata: { checkout_order_id: "order-123" } } },
  });
  assert.equal(event.data.object.id, "cs_test_nullable");
  assert.equal("payment_intent" in event.data.object, false);
});

test("StripeCheckoutAdapter creates a subscription Checkout Session with the confirmed price and metadata", async () => {
  const calls: Array<{ params: Record<string, unknown>; options: Record<string, unknown> }> = [];
  const adapter = new StripeCheckoutAdapter({
    secretKey: "sk_test_unit",
    webOrigin: "https://dev.example.test",
    prices: {
      monthly: "price_monthly",
      annual: "price_annual",
      additional_active_deal_monthly: "price_addon_monthly",
      additional_active_deal_annual: "price_addon_annual",
      intensive_processing: "price_intensive",
      archive_capacity_monthly: "price_archive",
    },
    client: {
      checkout: {
        sessions: {
          async create(params: Record<string, unknown>, options: Record<string, unknown>) {
            calls.push({ params, options });
            return { id: "cs_test_live_adapter", url: "https://checkout.stripe.com/c/pay/cs_test_live_adapter" };
          },
        },
      },
    },
  });

  const result = await adapter.createHostedSession({
    checkoutOrderId: "order-123",
    billingTerm: "annual",
    addOn: "additional_active_deal",
  });

  assert.equal(result.providerSessionId, "cs_test_live_adapter");
  assert.equal(result.hostedUrl, "https://checkout.stripe.com/c/pay/cs_test_live_adapter");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].options, { idempotencyKey: "checkout-order:order-123" });
  assert.deepEqual(calls[0].params, {
    mode: "subscription",
    managed_payments: { enabled: false },
    line_items: [{ price: "price_annual", quantity: 1 }, { price: "price_addon_annual", quantity: 1 }],
    success_url: "https://dev.example.test/checkout/confirmation?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: "https://dev.example.test/checkout/payment?checkout_order_id=order-123",
    client_reference_id: "order-123",
    metadata: { checkout_order_id: "order-123", billing_term: "annual", add_on: "additional_active_deal" },
  });
});

function signedWebhook(payload: Record<string, unknown>, eventId: string, timestamp = Math.floor(Date.now() / 1000)) {
  const raw = JSON.stringify({ ...payload, id: eventId });
  const signature = crypto.createHmac("sha256", webhookSecret).update(`${timestamp}.${raw}`).digest("hex");
  return {
    raw,
    headers: {
      "content-type": "application/json",
      "stripe-signature": `t=${timestamp},v1=${signature}`,
    },
  };
}

async function createOrder(api: Awaited<ReturnType<typeof buildApi>>, cookie: string, term: "monthly" | "annual", addOn: "none" | "additional_active_deal" | "intensive_processing" | "archive_capacity" = "none") {
  const orderKey = `order-${term}-${crypto.randomUUID()}`;
  const order = await api.inject({
    method: "POST",
    url: "/api/v1/checkout-orders",
    headers: { cookie, "idempotency-key": orderKey },
    payload: { billing_term: term, add_on: addOn },
  });
  assert.equal(order.statusCode, 201);
  const orderBody = order.json();
  const repeatedOrder = await api.inject({ method: "POST", url: "/api/v1/checkout-orders", headers: { cookie, "idempotency-key": orderKey }, payload: { billing_term: term, add_on: addOn } });
  assert.equal(repeatedOrder.statusCode, 201);
  assert.equal(repeatedOrder.json().id, orderBody.id);
  const conflictingOrder = await api.inject({ method: "POST", url: "/api/v1/checkout-orders", headers: { cookie, "idempotency-key": orderKey }, payload: { billing_term: term === "monthly" ? "annual" : "monthly", add_on: addOn } });
  assert.equal(conflictingOrder.statusCode, 409);
  const missingAddOnPreview = await api.inject({ method: "POST", url: `/api/v1/checkout-orders/${orderBody.id}/terms-acceptances`, headers: { cookie, "if-match": order.headers.etag, "idempotency-key": `terms-missing-${crypto.randomUUID()}` }, payload: { displayed_contract_digest: orderBody.contract_digest, acknowledgements: { purchase_authority: true, source_authority_separate: true, guarantee: true, cancellation_refund: true, post_term: true, export_retention_deletion: true, provider_boundary: true } } });
  assert.equal(missingAddOnPreview.statusCode, 400);
  const termsKey = `terms-${crypto.randomUUID()}`;
  const terms = await api.inject({
    method: "POST",
    url: `/api/v1/checkout-orders/${orderBody.id}/terms-acceptances`,
    headers: { cookie, "if-match": order.headers.etag, "idempotency-key": termsKey },
    payload: {
      displayed_contract_digest: orderBody.contract_digest,
      acknowledgements: {
        purchase_authority: true,
        source_authority_separate: true,
        guarantee: true,
        cancellation_refund: true,
        post_term: true,
        export_retention_deletion: true,
        add_on_preview: true,
        provider_boundary: true,
      },
    },
  });
  assert.equal(terms.statusCode, 201);
  const sessionKey = `session-${term}-${crypto.randomUUID()}`;
  const session = await api.inject({
    method: "POST",
    url: "/api/v1/checkout-sessions",
    headers: { cookie, "idempotency-key": sessionKey },
    payload: { checkout_order_id: orderBody.id, terms_acceptance_id: terms.json().id },
  });
  assert.equal(session.statusCode, 201);
  assert.equal(session.json().provider, "stripe_test_adapter");
  assert.equal(session.json().live_verification_debt, true);
  return { order: orderBody, terms: terms.json(), session: session.json(), termsKey, sessionKey };
}

test("Commerce exposes one public offer and non-confidential qualification result", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database });
  t.after(() => api.close());

  const offer = await api.inject({ method: "GET", url: "/api/v1/public/offer" });
  assert.equal(offer.statusCode, 200);
  assert.deepEqual(offer.json(), {
    product_code: "individual-deal-desk-v1",
    capability_version: "v1.0.0",
    currency: "usd",
    monthly: { amount_minor: 99500, display: "$995 per month", renewal: "monthly" },
    annual: { amount_minor: 1095000, display: "$10,950 per year paid upfront", renewal: "annual", monthly_equivalent_minor: 91250, savings_minor: 99000, discount_percent: 8.29 },
    included_active_deals: 2,
    allowances: { per_active_deal_per_billing_month: { newly_processed_files: 250, newly_processed_logical_pages: 2500, active_storage_gb: 25, full_workflow_operations: 20 } },
    add_ons: [
      { code: "additional_active_deal", monthly_amount_minor: 50000, annual_amount_minor: 550000, effect: "one additional Active Deal with the same allowance" },
      { code: "intensive_processing", amount_minor: 100000, effect: "5,000 logical pages and 20 Full-Workflow Operations for one affected Active Deal-month" },
      { code: "archive_capacity", monthly_amount_minor: 5000, effect: "additional 250 GB after export/delete is offered" },
    ],
    unmetered_actions: ["evidence_inspection", "correction", "deterministic_validation", "qc", "review", "human_decision", "targeted_revision", "internal_controlled_export", "product_failure_recovery"],
    guarantee: "first-deal-control-loop-v1",
    cancellation: "cancels_next_renewal_only",
    tax: "calculated_before_payment_confirmation",
  });

  const qualification = await api.inject({
    method: "POST",
    url: "/api/v1/public/qualification-assessments",
    payload: {
      banker_role: "Individual Banker",
      can_purchase_independently: true,
      deal_type: "Sell-Side Auction",
      intended_use: "internal controlled execution",
      intended_audience: "internal banker team",
      expected_source_types: ["CIM", "management model"],
      expected_template_types: ["CIM", "auction workbook"],
      known_special_structures: [],
      source_authority: "expected",
      confidentiality_class: "confidential",
      employer_restrictions: "unknown",
      provider_or_geographic_restrictions: "unknown",
      minimum_source_packet: "CIM and management model",
    },
  });
  assert.equal(qualification.statusCode, 201);
  assert.equal(qualification.json().result, "Potential constraint — review before purchase");
  assert.equal(JSON.stringify(qualification.json()).includes("CIM"), false);
  const restoredQualification = await api.inject({ method: "GET", url: `/api/v1/public/qualification-assessments/${qualification.json().id}` });
  assert.equal(restoredQualification.statusCode, 200);
  assert.equal(restoredQualification.json().source_material_authorized, false);
});

test("Commerce reconciles a monthly purchase exactly once and keeps provider status non-authoritative", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database });
  t.after(() => api.close());
  const cookie = await database.seedAuthenticatedSession(`commerce-monthly-${crypto.randomUUID()}@example.test`);
  const { order, session, termsKey, sessionKey } = await createOrder(api, cookie, "monthly");
  const refreshedOrder = await api.inject({ method: "GET", url: `/api/v1/checkout-orders/${order.id}`, headers: { cookie } });
  const sameTerms = await api.inject({ method: "POST", url: `/api/v1/checkout-orders/${order.id}/terms-acceptances`, headers: { cookie, "if-match": refreshedOrder.headers.etag, "idempotency-key": termsKey }, payload: { displayed_contract_digest: order.contract_digest, acknowledgements: { purchase_authority: true, source_authority_separate: true, guarantee: true, cancellation_refund: true, post_term: true, export_retention_deletion: true, add_on_preview: true, provider_boundary: true } } });
  assert.equal(sameTerms.statusCode, 201);
  const repeatedTerms = await api.inject({ method: "POST", url: `/api/v1/checkout-orders/${order.id}/terms-acceptances`, headers: { cookie, "if-match": refreshedOrder.headers.etag, "idempotency-key": `terms-replay-${crypto.randomUUID()}` }, payload: { displayed_contract_digest: order.contract_digest, acknowledgements: { purchase_authority: true, source_authority_separate: true, guarantee: true, cancellation_refund: true, post_term: true, export_retention_deletion: true, add_on_preview: true, provider_boundary: true } } });
  assert.equal(repeatedTerms.statusCode, 201);
  const repeatedSession = await api.inject({ method: "POST", url: "/api/v1/checkout-sessions", headers: { cookie, "idempotency-key": `session-replay-${crypto.randomUUID()}` }, payload: { checkout_order_id: order.id, terms_acceptance_id: repeatedTerms.json().id } });
  assert.equal(repeatedSession.statusCode, 409);
  const sameSession = await api.inject({ method: "POST", url: "/api/v1/checkout-sessions", headers: { cookie, "idempotency-key": sessionKey }, payload: { checkout_order_id: order.id, terms_acceptance_id: repeatedTerms.json().id } });
  assert.equal(sameSession.statusCode, 201);
  assert.equal(sameSession.json().provider_session_id, session.provider_session_id);

  const providerOnlyId = `evt_invoice_first_${crypto.randomUUID()}`;
  const providerOnly = signedWebhook({ type: "invoice.paid", api_version: "2026-01-01", data: { object: { id: "in_001", status: "paid" } } }, providerOnlyId);
  const providerOnlyResponse = await api.inject({ method: "POST", url: "/webhooks/stripe", headers: providerOnly.headers, payload: providerOnly.raw });
  assert.equal(providerOnlyResponse.statusCode, 200);
  const before = await api.inject({ method: "GET", url: `/api/v1/checkout-sessions/${session.id}`, headers: { cookie } });
  assert.equal(before.json().payment_state, "pending");

  const completed = signedWebhook({
    type: "checkout.session.completed",
    api_version: "2026-01-01",
    data: { object: { id: session.provider_session_id, payment_status: "paid", amount_total: 99500, currency: "usd", metadata: { checkout_order_id: order.id } } },
  }, `evt_checkout_completed_${crypto.randomUUID()}`);
  const first = await api.inject({ method: "POST", url: "/webhooks/stripe", headers: completed.headers, payload: completed.raw });
  assert.equal(first.statusCode, 200);
  const duplicate = await api.inject({ method: "POST", url: "/webhooks/stripe", headers: completed.headers, payload: completed.raw });
  assert.equal(duplicate.statusCode, 200);
  const conflictingPayload = JSON.parse(completed.raw) as Record<string, unknown>;
  const conflictingObject = (conflictingPayload.data as { object: Record<string, unknown> }).object;
  conflictingObject.amount_total = 99501;
  const conflicting = signedWebhook(conflictingPayload, JSON.parse(completed.raw).id);
  const conflictingResponse = await api.inject({ method: "POST", url: "/webhooks/stripe", headers: conflicting.headers, payload: conflicting.raw });
  assert.equal(conflictingResponse.statusCode, 200);
  assert.equal(conflictingResponse.json().status, "ambiguous");
  const reordered = signedWebhook(JSON.parse(completed.raw), `evt_reordered_${crypto.randomUUID()}`);
  const reorderedResponse = await api.inject({ method: "POST", url: "/webhooks/stripe", headers: reordered.headers, payload: reordered.raw });
  assert.equal(reorderedResponse.statusCode, 200);

  const confirmation = await api.inject({ method: "GET", url: `/api/v1/checkout-orders/${order.id}`, headers: { cookie } });
  assert.equal(confirmation.statusCode, 200);
  assert.equal(confirmation.json().current_step, "confirmation");
  assert.equal(confirmation.json().payment_state, "succeeded");
  assert.equal(confirmation.json().entitlement.active_deal_capacity, 2);
  assert.equal(confirmation.json().entitlement.actor_name, "Individual Banker");

  const entitlements = await api.inject({ method: "GET", url: "/api/v1/account/entitlements", headers: { cookie } });
  assert.equal(entitlements.statusCode, 200);
  assert.equal(entitlements.json().entitlements.length, 1);
  assert.deepEqual(entitlements.json().entitlements[0].capabilities, ["complete_v1_core_capability"]);

  const counts = await database.ownerPool.query<{ receipts: string; mutations: string; completed: string; grants: string; measurements: string; dispatched: string }>(`SELECT
    (SELECT count(*) FROM app.commercial_receipt WHERE checkout_order_id = $1)::text AS receipts,
    (SELECT count(*) FROM app.entitlement_mutation WHERE checkout_order_id = $1)::text AS mutations,
    (SELECT count(*) FROM app.checkout_completed_event WHERE checkout_order_id = $1)::text AS completed,
    (SELECT count(*) FROM app.usage_ledger_entry WHERE checkout_order_id = $1 AND entry_type = 'grant')::text AS grants,
    (SELECT count(*) FROM app.product_measurement_candidate WHERE source_identity = $1::text AND event_code = 'checkout_completed')::text AS measurements,
    (SELECT count(*) FROM app.provider_event_outbox o JOIN app.provider_event e ON e.provider_event_id = o.provider_event_id WHERE e.canonical_payload #>> '{data,object,metadata,checkout_order_id}' = $1::text AND o.dispatched_at IS NOT NULL)::text AS dispatched`, [order.id]);
  assert.deepEqual(counts.rows[0], { receipts: "1", mutations: "1", completed: "1", grants: "1", measurements: "1", dispatched: "2" });

  const evidence = await database.ownerPool.query<{ canonical_payload: Record<string, unknown>; canonical_digest: string; raw_payload_digest: string; raw_payload?: unknown }>("SELECT canonical_payload, canonical_digest, raw_payload_digest, to_jsonb(provider_event) ? 'raw_payload' AS raw_payload FROM app.provider_event WHERE canonical_payload #>> '{data,object,metadata,checkout_order_id}' = $1", [order.id]);
  assert.equal(evidence.rowCount, 2);
  assert.ok(evidence.rows[0].canonical_digest.startsWith("sha256:"));
  assert.ok(evidence.rows[0].raw_payload_digest.startsWith("sha256:"));
  assert.equal(evidence.rows[0].raw_payload, false);
  assert.equal(JSON.stringify(evidence.rows[0].canonical_payload).includes(providerOnly.raw), false);
});

test("Commerce keeps annual pricing, invalid signatures, ambiguous events, and persistence failures fail closed", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database });
  t.after(() => api.close());
  const cookie = await database.seedAuthenticatedSession(`commerce-annual-${crypto.randomUUID()}@example.test`);
  const { order, session } = await createOrder(api, cookie, "annual");
  assert.equal(order.amount_minor, 1095000);
  const annualPaidCookie = await database.seedAuthenticatedSession(`commerce-annual-paid-${crypto.randomUUID()}@example.test`);
  const annualPaidOrder = await createOrder(api, annualPaidCookie, "annual");
  const annualCompleted = signedWebhook({ type: "checkout.session.completed", api_version: "2026-01-01", data: { object: { id: annualPaidOrder.session.provider_session_id, payment_status: "paid", amount_total: 1095000, currency: "usd", metadata: { checkout_order_id: annualPaidOrder.order.id } } } }, `evt_annual_paid_${crypto.randomUUID()}`);
  const annualCompletedResponse = await api.inject({ method: "POST", url: "/webhooks/stripe", headers: annualCompleted.headers, payload: annualCompleted.raw });
  assert.equal(annualCompletedResponse.statusCode, 200);
  const annualConfirmation = await api.inject({ method: "GET", url: `/api/v1/checkout-orders/${annualPaidOrder.order.id}`, headers: { cookie: annualPaidCookie } });
  assert.equal(annualConfirmation.json().payment_state, "succeeded");
  assert.equal(annualConfirmation.json().entitlement.active_deal_capacity, 2);
  const annualCounts = await database.ownerPool.query("SELECT (SELECT count(*) FROM app.commercial_receipt WHERE checkout_order_id = $1) AS receipts, (SELECT count(*) FROM app.entitlement_mutation WHERE checkout_order_id = $1) AS mutations, (SELECT count(*) FROM app.checkout_completed_event WHERE checkout_order_id = $1) AS completed, (SELECT count(*) FROM app.usage_ledger_entry WHERE checkout_order_id = $1 AND entry_type = 'grant') AS grants", [annualPaidOrder.order.id]);
  assert.deepEqual(annualCounts.rows[0], { receipts: "1", mutations: "1", completed: "1", grants: "1" });

  const invalid = await api.inject({ method: "POST", url: "/webhooks/stripe", headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=bad", "x-provider-event-id": "evt_invalid" }, payload: JSON.stringify({ type: "checkout.session.completed" }) });
  assert.equal(invalid.statusCode, 400);
  const invalidEvidence = await database.ownerPool.query("SELECT 1 FROM app.provider_event WHERE provider_event_id = 'evt_invalid'");
  assert.equal(invalidEvidence.rowCount, 0);

  const malformedRaw = "{";
  const malformedTimestamp = Math.floor(Date.now() / 1000);
  const malformedSignature = crypto.createHmac("sha256", webhookSecret).update(`${malformedTimestamp}.${malformedRaw}`).digest("hex");
  const malformed = await api.inject({ method: "POST", url: "/webhooks/stripe", headers: { "content-type": "application/json", "stripe-signature": `t=${malformedTimestamp},v1=${malformedSignature}` }, payload: malformedRaw });
  assert.equal(malformed.statusCode, 400);
  assert.equal(malformed.json().code, "invalid_request");

  const ambiguousId = `evt_ambiguous_${crypto.randomUUID()}`;
  const ambiguous = signedWebhook({ type: "checkout.session.completed", api_version: "2026-01-01", data: { object: { id: session.provider_session_id, payment_status: "paid", amount_total: 1095000, currency: "usd", metadata: {} } } }, ambiguousId);
  const ambiguousResponse = await api.inject({ method: "POST", url: "/webhooks/stripe", headers: ambiguous.headers, payload: ambiguous.raw });
  assert.equal(ambiguousResponse.statusCode, 200);
  assert.equal((await api.inject({ method: "GET", url: `/api/v1/checkout-orders/${order.id}`, headers: { cookie } })).json().payment_state, "pending");

  const unpaid = signedWebhook({ type: "checkout.session.completed", api_version: "2026-01-01", data: { object: { id: session.provider_session_id, payment_status: "unpaid", amount_total: 1095000, currency: "usd", metadata: { checkout_order_id: order.id } } } }, `evt_unpaid_${crypto.randomUUID()}`);
  const unpaidResponse = await api.inject({ method: "POST", url: "/webhooks/stripe", headers: unpaid.headers, payload: unpaid.raw });
  assert.equal(unpaidResponse.statusCode, 200);
  assert.equal((await api.inject({ method: "GET", url: `/api/v1/checkout-orders/${order.id}`, headers: { cookie } })).json().payment_state, "pending");

  database.failProviderEvidencePersistence = true;
  const failed = signedWebhook({ type: "checkout.session.completed", api_version: "2026-01-01", data: { object: { id: session.provider_session_id, payment_status: "paid", amount_total: 1095000, currency: "usd", metadata: { checkout_order_id: order.id } } } }, `evt_persistence_failure_${crypto.randomUUID()}`);
  const failedResponse = await api.inject({ method: "POST", url: "/webhooks/stripe", headers: failed.headers, payload: failed.raw });
  assert.equal(failedResponse.statusCode, 503);
  assert.equal(failedResponse.json().code, "provider_event_persistence_failed");
  assert.equal((await api.inject({ method: "GET", url: `/api/v1/checkout-orders/${order.id}`, headers: { cookie } })).json().payment_state, "pending");
  database.failProviderEvidencePersistence = false;
  const retry = await api.inject({ method: "POST", url: "/webhooks/stripe", headers: failed.headers, payload: failed.raw });
  assert.equal(retry.statusCode, 200);
  assert.equal(retry.json().status, "reconciled");
  const retriedConfirmation = await api.inject({ method: "GET", url: `/api/v1/checkout-orders/${order.id}`, headers: { cookie } });
  assert.equal(retriedConfirmation.json().payment_state, "succeeded");
});

test("Commerce applies an explicit add-on only to its product-owned capacity ledger", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database });
  t.after(() => api.close());
  const cookie = await database.seedAuthenticatedSession(`commerce-addon-${crypto.randomUUID()}@example.test`);
  const { order, session } = await createOrder(api, cookie, "monthly", "additional_active_deal");
  assert.equal(order.amount_minor, 149500);
  assert.equal(order.renewal.amount_minor, 149500);
  const completed = signedWebhook({ type: "checkout.session.completed", api_version: "2026-01-01", data: { object: { id: session.provider_session_id, payment_status: "paid", amount_total: 149500, currency: "usd", metadata: { checkout_order_id: order.id } } } }, `evt_addon_${crypto.randomUUID()}`);
  const response = await api.inject({ method: "POST", url: "/webhooks/stripe", headers: completed.headers, payload: completed.raw });
  assert.equal(response.statusCode, 200);
  const confirmation = await api.inject({ method: "GET", url: `/api/v1/checkout-orders/${order.id}`, headers: { cookie } });
  assert.equal(confirmation.json().entitlement.active_deal_capacity, 3);
  assert.deepEqual(confirmation.json().entitlement.capabilities, ["complete_v1_core_capability", "add_on:additional_active_deal"]);
  const usage = await api.inject({ method: "GET", url: "/api/v1/account/usage", headers: { cookie } });
  assert.equal(usage.statusCode, 200);
  assert.deepEqual(usage.json().granted_allowances, { intensive_logical_pages: 0, intensive_operations: 0, archive_capacity_gb: 0 });
  assert.equal(usage.json().active_deal_capacity, 3);
  assert.equal(usage.json().granted_active_deals, 3);
  const ledger = await database.ownerPool.query("SELECT allowance_class, quantity FROM app.usage_ledger_entry WHERE checkout_order_id = $1 ORDER BY allowance_class", [order.id]);
  assert.deepEqual(ledger.rows, [{ allowance_class: "active_deal_capacity", quantity: 2 }, { allowance_class: "active_deal_capacity_add_on", quantity: 1 }]);
});
