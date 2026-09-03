import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { buildApi } from "../../apps/api/src/app.js";
import { createTestDatabase } from "../../apps/api/src/test-database.js";
import { hashToken } from "../../apps/api/src/database.js";

const dealInput = (termsId: string, overrides: Record<string, unknown> = {}) => ({
  display_name: `Deal ${crypto.randomUUID()}`,
  represented_party: "Northstar Holdings",
  transaction_subject: "Northstar Software",
  transaction_perimeter: { inclusions: ["Northstar Software operating business"], exclusions: ["legacy real estate"] },
  banker_role_or_side: "sell_side_advisor",
  mandate_objective: "Run a controlled sell-side auction",
  transaction_type: "sell_side_auction",
  business_stage: "preparation",
  intended_purpose: "internal_deal_execution",
  intended_audience: "internal_deal_team",
  base_currency: "USD",
  reporting_units: "millions",
  purchase_authority_acknowledgement_id: termsId,
  deal_authority_basis: "engaged_by_represented_party",
  expected_source_use_authority: "provided_under_mandate",
  confidentiality_class: "confidential",
  employer_or_client_restrictions: { posture: "none_known", details: null },
  intended_processing_path: "local_deterministic_only",
  expected_file_families: ["xlsx", "pptx", "pdf"],
  expected_template_posture: "product_default",
  provider_restrictions: ["local_only"],
  special_structures: [],
  identity_confirmed: true,
  ...overrides,
});

async function provisionEntitlement(database: Awaited<ReturnType<typeof createTestDatabase>>, email = "banker-a@example.test") {
  const actorId = (await database.ownerPool.query<{ id: string }>("SELECT id FROM app.actor WHERE email_digest = $1", [hashToken(email)])).rows[0]?.id;
  assert.ok(actorId);
  const accountId = (await database.ownerPool.query<{ account_id: string }>("SELECT account_id FROM app.account_actor WHERE actor_id = $1 AND active", [actorId])).rows[0]?.account_id;
  assert.ok(accountId);
  const orderId = crypto.randomUUID();
  const termsId = crypto.randomUUID();
  const receiptId = crypto.randomUUID();
  const entitlementId = crypto.randomUUID();
  await database.ownerPool.query(
    `INSERT INTO app.checkout_order(id, account_id, actor_id, billing_term, amount_minor, renewal_amount_minor, allowances, unmetered_actions, contract_digest, idempotency_key, current_step, payment_state, status, completed_at)
     VALUES ($1,$2,$3,'monthly',99500,99500,'{}','{}','sha256:test-contract',$4,'confirmation','succeeded','completed',now())`,
    [orderId, accountId, actorId, `fixture-${orderId}`],
  );
  await database.ownerPool.query(
    `INSERT INTO app.checkout_terms_acceptance(id, checkout_order_id, account_id, actor_id, displayed_contract_digest, acknowledgements, idempotency_key)
     VALUES ($1,$2,$3,$4,'sha256:test-contract','{"purchase_authority":true,"source_authority_separate":true}'::jsonb,$5)`,
    [termsId, orderId, accountId, actorId, `terms-${termsId}`],
  );
  await database.ownerPool.query(
    `INSERT INTO app.commercial_receipt(id, account_id, actor_id, checkout_order_id, provider_event_id, provider_payment_id, amount_minor, currency)
     VALUES ($1,$2,$3,$4,$5,$6,99500,'usd')`,
    [receiptId, accountId, actorId, orderId, `fixture-event-${receiptId}`, `fixture-payment-${receiptId}`],
  );
  await database.ownerPool.query(
    `INSERT INTO app.product_entitlement(id, account_id, actor_id, product_code, capability_version, term_start, term_end, active_deal_capacity, capabilities, source_receipt_id)
     VALUES ($1,$2,$3,'individual-deal-desk-v1','v1.0.0',now(),now()+interval '1 month',2,'["complete_v1_core_capability"]'::jsonb,$4)`,
    [entitlementId, accountId, actorId, receiptId],
  );
  await database.ownerPool.query(
    `INSERT INTO app.usage_ledger_entry(account_id, checkout_order_id, entitlement_id, allowance_class, entry_type, quantity)
     VALUES ($1,$2,$3,'active_deal_capacity','grant',2)`,
    [accountId, orderId, entitlementId],
  );
  return { termsId, accountId, actorId };
}

test("product Deal lifecycle creates an identity-complete Deal atomically with a reserved slot and guide checkpoint", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local" });
  t.after(() => api.close());
  const email = `deal-lifecycle-create-${crypto.randomUUID()}@example.test`;
  const cookie = await database.seedAuthenticatedSession(email);
  const { termsId, accountId, actorId } = await provisionEntitlement(database, email);
  const response = await api.inject({ method: "POST", url: "/api/v1/deals", headers: { cookie, "idempotency-key": `deal-${crypto.randomUUID()}` }, payload: dealInput(termsId) });
  assert.equal(response.statusCode, 201);
  const body = response.json();
  assert.equal(body.deal.deal_class, "paid_customer");
  assert.equal(body.deal.identity.represented_party, "Northstar Holdings");
  assert.equal(body.deal.identity.transaction_subject, "Northstar Software");
  assert.deepEqual(body.deal.identity.transaction_perimeter, { inclusions: ["Northstar Software operating business"], exclusions: ["legacy real estate"] });
  assert.equal(body.deal.identity.actor_id, actorId);
  assert.equal(body.deal.identity.account_id, accountId);
  assert.ok(body.deal.identity.identity_accepted_at);
  assert.equal(body.deal.capacity.state, "reserved_preflight");
  assert.equal(body.deal.capacity.slot, 1);
  assert.equal(body.deal.setup.source_reference.posture, "missing");
  assert.equal(body.deal.paid_preflight.result, "waiting-for-user");
  assert.equal(body.deal.first_deal_guide.status, "waiting");
  const persisted = await database.ownerPool.query<{ deal_class: string; slot_ordinal: number; state_code: string }>(
    "SELECT d.deal_class, r.slot_ordinal, r.state_code FROM app.deal d JOIN app.active_deal_capacity_reservation r ON r.deal_id=d.id WHERE d.id=$1",
    [body.deal.id],
  );
  assert.deepEqual(persisted.rows[0], { deal_class: "paid_customer", slot_ordinal: 1, state_code: "reserved_preflight" });
  const waiting = await api.inject({ method: "POST", url: `/api/v1/deals/${body.deal.id}/preflights`, headers: { cookie, "idempotency-key": `preflight-${crypto.randomUUID()}` }, payload: {} });
  assert.equal(waiting.statusCode, 201);
  assert.equal(waiting.json().data.result, "waiting-for-user");
  assert.equal(waiting.json().data.reason_code, "source_rights_missing");
});

test("product Deal lifecycle preflight returns blocked and recovers after source replacement and narrowed use", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local" });
  t.after(() => api.close());
  const email = `deal-lifecycle-preflight-${crypto.randomUUID()}@example.test`;
  const cookie = await database.seedAuthenticatedSession(email);
  const { termsId } = await provisionEntitlement(database, email);
  const created = await api.inject({ method: "POST", url: "/api/v1/deals", headers: { cookie, "idempotency-key": `deal-${crypto.randomUUID()}` }, payload: dealInput(termsId, { source_reference: "restricted-unconfirmed-source", source_rights: "blocked" }) });
  assert.equal(created.statusCode, 201);
  const dealId = created.json().deal.id as string;
  const blocked = await api.inject({ method: "POST", url: `/api/v1/deals/${dealId}/preflights`, headers: { cookie, "idempotency-key": `preflight-${crypto.randomUUID()}` }, payload: {} });
  assert.equal(blocked.statusCode, 201);
  assert.equal(blocked.json().data.result, "blocked");
  assert.equal(blocked.json().data.reason_code, "source_rights_blocked");
  assert.equal(blocked.json().data.recovery_action, "replace_or_remove_blocked_source");
  const saved = await api.inject({ method: "PATCH", url: `/api/v1/deals/${dealId}/setup`, headers: { cookie, "if-match": created.headers.etag! }, payload: { source_reference: "source:synthetic-packet-v2", source_rights: "confirmed", intended_use: "internal_deal_execution", intended_audience: "internal_deal_team", minimum_packet: "complete", compatibility: "pass" } });
  assert.equal(saved.statusCode, 200);
  const passed = await api.inject({ method: "POST", url: `/api/v1/deals/${dealId}/preflights`, headers: { cookie, "idempotency-key": `preflight-${crypto.randomUUID()}` }, payload: {} });
  assert.equal(passed.statusCode, 201);
  assert.equal(passed.json().data.result, "pass");
  assert.equal(passed.json().data.output_ceiling, "supported_internal_processing");
  const guard = await api.inject({ method: "POST", url: `/api/v1/deals/${dealId}/substantive-processing`, headers: { cookie }, payload: { operation: "provider_egress", confidentiality_class: "confidential" } });
  assert.equal(guard.statusCode, 409);
  assert.equal(guard.json().code, "processing_not_permitted");
  const confidentialParse = await api.inject({ method: "POST", url: `/api/v1/deals/${dealId}/substantive-processing`, headers: { cookie }, payload: { operation: "parse", confidentiality_class: "confidential" } });
  assert.equal(confidentialParse.statusCode, 409);
  assert.equal(confidentialParse.json().code, "confidential_content_not_permitted");
});

test("product Deal lifecycle enforces two-slot capacity under concurrent creates and keeps cross-Deal reads non-enumerating", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local" });
  t.after(() => api.close());
  const email = `deal-lifecycle-capacity-${crypto.randomUUID()}@example.test`;
  const cookie = await database.seedAuthenticatedSession(email);
  const { termsId } = await provisionEntitlement(database, email);
  const requests = [1, 2, 3].map((index) => api.inject({ method: "POST", url: "/api/v1/deals", headers: { cookie, "idempotency-key": `concurrent-deal-${index}-${crypto.randomUUID()}` }, payload: dealInput(termsId, { display_name: `Concurrent ${index}`, transaction_subject: `Northstar Software ${index}` }) }));
  const results = await Promise.all(requests);
  assert.deepEqual(results.map((result) => result.statusCode).sort(), [201, 201, 409]);
  assert.equal(results.find((result) => result.statusCode === 409)?.json().code, "active_deal_capacity_exhausted");
  const otherCookie = await database.seedAuthenticatedSession(`deal-lifecycle-other-${crypto.randomUUID()}@example.test`);
  const firstId = results.find((result) => result.statusCode === 201)?.json().deal.id as string;
  const hidden = await api.inject({ method: "GET", url: `/api/v1/deals/${firstId}/setup`, headers: { cookie: otherCookie } });
  assert.equal(hidden.statusCode, 404);
});

test("product Deal lifecycle exposes limited-proceed acceptance and blocks restricted AI before egress", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local" });
  t.after(() => api.close());

  const limitedEmail = `deal-lifecycle-limited-${crypto.randomUUID()}@example.test`;
  const limitedCookie = await database.seedAuthenticatedSession(limitedEmail);
  const limitedEntitlement = await provisionEntitlement(database, limitedEmail);
  const limitedCreated = await api.inject({ method: "POST", url: "/api/v1/deals", headers: { cookie: limitedCookie, "idempotency-key": `deal-${crypto.randomUUID()}` }, payload: dealInput(limitedEntitlement.termsId, { source_reference: "source:limited-packet", source_rights: "limited", minimum_packet: "complete" }) });
  assert.equal(limitedCreated.statusCode, 201);
  const limitedDealId = limitedCreated.json().deal.id as string;
  const limitedPreflight = await api.inject({ method: "POST", url: `/api/v1/deals/${limitedDealId}/preflights`, headers: { cookie: limitedCookie, "idempotency-key": `preflight-${crypto.randomUUID()}` }, payload: {} });
  assert.equal(limitedPreflight.statusCode, 201);
  const limited = limitedPreflight.json().data;
  assert.equal(limited.result, "limited-proceed");
  const accepted = await api.inject({ method: "POST", url: `/api/v1/deals/${limitedDealId}/preflights/${limited.id}/limited-proceed-acceptances`, headers: { cookie: limitedCookie, "idempotency-key": `accept-${crypto.randomUUID()}` }, payload: { accepted_scope: limited.permitted_scope, excluded_scope: limited.excluded_scope, output_ceiling: limited.output_ceiling } });
  assert.equal(accepted.statusCode, 201);
  assert.equal(accepted.json().data.accepted, true);

  const restrictedEmail = `deal-lifecycle-restricted-${crypto.randomUUID()}@example.test`;
  const restrictedCookie = await database.seedAuthenticatedSession(restrictedEmail);
  const restrictedEntitlement = await provisionEntitlement(database, restrictedEmail);
  const restrictedCreated = await api.inject({ method: "POST", url: "/api/v1/deals", headers: { cookie: restrictedCookie, "idempotency-key": `deal-${crypto.randomUUID()}` }, payload: dealInput(restrictedEntitlement.termsId, { source_reference: "source:restricted-packet", source_rights: "confirmed", confidentiality_class: "restricted", intended_processing_path: "local_deterministic_and_approved_ai" }) });
  assert.equal(restrictedCreated.statusCode, 201);
  const restrictedPreflight = await api.inject({ method: "POST", url: `/api/v1/deals/${restrictedCreated.json().deal.id}/preflights`, headers: { cookie: restrictedCookie, "idempotency-key": `preflight-${crypto.randomUUID()}` }, payload: {} });
  assert.equal(restrictedPreflight.statusCode, 201);
  assert.equal(restrictedPreflight.json().data.result, "blocked");
  assert.equal(restrictedPreflight.json().data.reason_code, "restricted_processing_path_incompatible");
});

test("product Deal lifecycle creates a linked Deal for identity change and preserves the original", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local" });
  t.after(() => api.close());
  const email = `deal-lifecycle-identity-${crypto.randomUUID()}@example.test`;
  const cookie = await database.seedAuthenticatedSession(email);
  const { termsId } = await provisionEntitlement(database, email);
  const created = await api.inject({ method: "POST", url: "/api/v1/deals", headers: { cookie, "idempotency-key": `deal-${crypto.randomUUID()}` }, payload: dealInput(termsId, { display_name: "Original identity" }) });
  assert.equal(created.statusCode, 201);
  const originalId = created.json().deal.id as string;
  const changed = await api.inject({ method: "POST", url: `/api/v1/deals/${originalId}/identity-changes`, headers: { cookie, "idempotency-key": `identity-${crypto.randomUUID()}` }, payload: { transaction_subject: "Northstar Software and Services", identity_confirmed: true } });
  assert.equal(changed.statusCode, 201);
  assert.equal(changed.json().deal.predecessor_deal_id, originalId);
  const original = await api.inject({ method: "GET", url: `/api/v1/deals/${originalId}/setup`, headers: { cookie } });
  assert.equal(original.statusCode, 200);
  assert.equal(original.json().data.identity.transaction_subject, "Northstar Software");
});
