import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { buildApi } from "../../apps/api/src/app.js";
import { createTestDatabase } from "../../apps/api/src/test-database.js";
import { hashToken } from "../../apps/api/src/database.js";

const validDealInput = (termsId: string, name = `product account-template ${crypto.randomUUID()}`) => ({
  display_name: name,
  represented_party: "Northstar Holdings",
  transaction_subject: "Northstar Software",
  transaction_perimeter: { inclusions: ["operating business"], exclusions: [] },
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
  expected_file_families: ["xlsx"],
  expected_template_posture: "banker_supplied_pending_preflight",
  provider_restrictions: ["local_only"],
  special_structures: [],
  identity_confirmed: true,
  source_rights: "confirmed",
  intended_use: "internal_deal_execution",
  minimum_packet: "complete",
  compatibility: "pass",
});

async function provision(database: Awaited<ReturnType<typeof createTestDatabase>>, email: string) {
  const actor = (await database.ownerPool.query<{ id: string; account_id: string }>(
    `SELECT a.id, aa.account_id FROM app.actor a JOIN app.account_actor aa ON aa.actor_id=a.id AND aa.active WHERE a.email_digest=$1`, [hashToken(email)],
  )).rows[0];
  assert.ok(actor);
  const order = crypto.randomUUID(); const terms = crypto.randomUUID(); const receipt = crypto.randomUUID(); const entitlement = crypto.randomUUID();
  await database.ownerPool.query(`INSERT INTO app.checkout_order(id,account_id,actor_id,billing_term,amount_minor,renewal_amount_minor,allowances,unmetered_actions,contract_digest,idempotency_key,current_step,payment_state,status,completed_at) VALUES ($1,$2,$3,'monthly',99500,99500,'{}','{}','sha256:test',$4,'confirmation','succeeded','completed',now())`, [order, actor.account_id, actor.id, `fixture-${order}`]);
  await database.ownerPool.query(`INSERT INTO app.checkout_terms_acceptance(id,checkout_order_id,account_id,actor_id,displayed_contract_digest,acknowledgements,idempotency_key) VALUES ($1,$2,$3,$4,'sha256:test','{"purchase_authority":true,"source_authority_separate":true}'::jsonb,$5)`, [terms, order, actor.account_id, actor.id, `terms-${terms}`]);
  await database.ownerPool.query(`INSERT INTO app.commercial_receipt(id,account_id,actor_id,checkout_order_id,provider_event_id,provider_payment_id,amount_minor,currency) VALUES ($1,$2,$3,$4,$5,$6,99500,'usd')`, [receipt, actor.account_id, actor.id, order, `event-${receipt}`, `payment-${receipt}`]);
  await database.ownerPool.query(`INSERT INTO app.product_entitlement(id,account_id,actor_id,product_code,capability_version,term_start,term_end,active_deal_capacity,capabilities,source_receipt_id) VALUES ($1,$2,$3,'individual-deal-desk-v1','v1.0.0',now(),now()+interval '1 month',2,'["complete_v1_core_capability"]'::jsonb,$4)`, [entitlement, actor.account_id, actor.id, receipt]);
  await database.ownerPool.query(`INSERT INTO app.usage_ledger_entry(account_id,checkout_order_id,entitlement_id,allowance_class,entry_type,quantity) VALUES ($1,$2,$3,'active_deal_capacity','grant',2)`, [actor.account_id, order, entitlement]);
  return { terms, actorId: actor.id, accountId: actor.account_id };
}

async function createDeal(api: Awaited<ReturnType<typeof buildApi>>, database: Awaited<ReturnType<typeof createTestDatabase>>, email: string) {
  const cookie = await database.seedAuthenticatedSession(email);
  const { terms } = await provision(database, email);
  const created = await api.inject({ method: "POST", url: "/api/v1/deals", headers: { cookie, "idempotency-key": `deal-${crypto.randomUUID()}` }, payload: validDealInput(terms) });
  assert.equal(created.statusCode, 201);
  const dealId = created.json().deal.id as string;
  const preflight = await api.inject({ method: "POST", url: `/api/v1/deals/${dealId}/preflights`, headers: { cookie, "idempotency-key": `preflight-${crypto.randomUUID()}` }, payload: {} });
  assert.equal(preflight.statusCode, 201);
  return { cookie, dealId };
}

test("public Web retrieval creates immutable observations and lowers posture when snapshot rights are unavailable", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local", publicWebFetcher: async (url) => ({ status: 200, headers: { "content-type": "text/html", etag: `etag-${url}` }, body: "<html><title>Northstar filing</title><body>Public statement</body></html>" }) });
  t.after(() => api.close());
  const owner = await createDeal(api, database, `account-template-web-${crypto.randomUUID()}@example.test`);
  const body = { url: "https://public.example.test/filing", purpose: "internal_analysis", rights_basis: { publisher_rights: "citation_only", source_terms: "no_archival_copy", robots_posture: "allowed", retention_limit_days: 0 }, capture_posture: "snapshot" };
  const first = await api.inject({ method: "POST", url: `/api/v1/deals/${owner.dealId}/web-evidence-observations`, headers: { cookie: owner.cookie, "idempotency-key": `web-${crypto.randomUUID()}` }, payload: body });
  assert.equal(first.statusCode, 202);
  assert.equal(first.json().data.observation.capture_mode, "citation_only");
  assert.equal(first.json().data.observation.rights.snapshot_permitted, false);
  assert.ok(first.json().data.observation.retrieval_limitations.includes("snapshot_prohibited_by_rights"));
  const recordId = first.json().data.observation.source_record_id as string;
  const second = await api.inject({ method: "POST", url: `/api/v1/deals/${owner.dealId}/web-evidence-observations`, headers: { cookie: owner.cookie, "idempotency-key": `web-${crypto.randomUUID()}` }, payload: { ...body, rights_basis: { ...body.rights_basis, publisher_rights: "snapshot_permitted", source_terms: "permitted", retention_limit_days: 7 } } });
  assert.equal(second.statusCode, 202);
  assert.notEqual(second.json().data.observation.source_record_id, recordId);
  assert.equal(second.json().data.observation.capture_mode, "snapshot");
  assert.equal(second.json().data.observation.permitted_representation.bytes_retained, true);
  const storedWebBytes = await database.ownerPool.query("SELECT 1 FROM source.source_representation WHERE source_record_id=$1", [second.json().data.observation.source_record_id]);
  assert.equal(storedWebBytes.rowCount, 1);
  const old = await api.inject({ method: "GET", url: `/api/v1/deals/${owner.dealId}/web-evidence-observations/${recordId}`, headers: { cookie: owner.cookie } });
  assert.equal(old.statusCode, 200);
  assert.equal(old.json().data.rights.snapshot_permitted, false);
  assert.equal(old.json().data.capture_mode, "citation_only");
  const privateUrl = await api.inject({ method: "POST", url: `/api/v1/deals/${owner.dealId}/web-evidence-observations`, headers: { cookie: owner.cookie, "idempotency-key": `web-${crypto.randomUUID()}` }, payload: { ...body, url: "http://127.0.0.1:3001/internal" } });
  assert.equal(privateUrl.statusCode, 400);
  assert.equal(privateUrl.json().code, "public_https_required");
});

test("Account template remains quarantined until compatibility preflight and cannot cross Account or accept live Deal material", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local" });
  t.after(() => api.close());
  const emailA = `account-template-template-a-${crypto.randomUUID()}@example.test`;
  const emailB = `account-template-template-b-${crypto.randomUUID()}@example.test`;
  const cookieA = await database.seedAuthenticatedSession(emailA);
  const provisionedA = await provision(database, emailA);
  const dealCreated = await api.inject({ method: "POST", url: "/api/v1/deals", headers: { cookie: cookieA, "idempotency-key": `deal-${crypto.randomUUID()}` }, payload: validDealInput(provisionedA.terms) });
  assert.equal(dealCreated.statusCode, 201);
  const dealId = dealCreated.json().deal.id as string;
  const preview = await api.inject({ method: "POST", url: "/api/v1/account/operation-previews", headers: { cookie: cookieA }, payload: { operation: "account_reusable_template_upload", template_class: "cim", purpose: "account_reusable_template" } });
  assert.equal(preview.statusCode, 200);
  const bytes = Buffer.from("PK\\x03\\x04[Content_Types].xml\\x00xl/workbook.xml\\x00PK\\x05\\x06", "binary");
  const digest = crypto.createHash("sha256").update(bytes).digest("hex");
  const mismatchedPreview = await api.inject({ method: "POST", url: "/api/v1/account/upload-sessions", headers: { cookie: cookieA }, payload: { purpose: "account_reusable_template", operation_preview_id: preview.json().data.id, consent_digest: "sha256:wrong", files: [{ client_file_id: "template", display_name: "CIM Template.xlsx", byte_length: String(bytes.length), media_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", template_declaration: { template_class: "cim", source_material_id: null, deal_id: null, clean_template_basis: "separately_supplied_outside_live_deal", purpose_scope: "account_only" }, rights_posture_inputs: { receipt_permitted: true }, confidentiality_posture: {}, processing_posture: {} }] } });
  assert.equal(mismatchedPreview.statusCode, 409);
  assert.equal(mismatchedPreview.json().code, "operation_preview_required");
  const upload = await api.inject({ method: "POST", url: "/api/v1/account/upload-sessions", headers: { cookie: cookieA }, payload: { purpose: "account_reusable_template", operation_preview_id: preview.json().data.id, consent_digest: preview.json().data.consent_digest, files: [{ client_file_id: "template", display_name: "CIM Template.xlsx", byte_length: String(bytes.length), media_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", sha256: digest, template_declaration: { template_class: "cim", source_material_id: null, deal_id: null, clean_template_basis: "separately_supplied_outside_live_deal", purpose_scope: "account_only" }, rights_posture_inputs: { receipt_permitted: true, processing_operations: ["quarantine", "compatibility_preflight"], conditions: [] }, confidentiality_posture: { confidentiality_class: "internal", de_identification_posture: "not_de_identified" }, processing_posture: { expected_file_family: "xlsx", special_structures: [] } }] } });
  assert.equal(upload.statusCode, 201);
  const file = upload.json().data.files[0];
  const patch = await api.inject({ method: "PATCH", url: file.tus_url, headers: { cookie: cookieA, "content-type": "application/offset+octet-stream", "tus-resumable": "1.0.0", "upload-offset": "0" }, payload: bytes });
  assert.equal(patch.statusCode, 204, patch.body);
  const finalized = await api.inject({ method: "POST", url: `/api/v1/account/upload-sessions/${upload.json().data.id}/finalizations`, headers: { cookie: cookieA }, payload: { file_ids: [file.server_file_id] } });
  assert.equal(finalized.statusCode, 200);
  const template = await api.inject({ method: "POST", url: "/api/v1/account/artifact-templates", headers: { cookie: cookieA, "idempotency-key": `template-${crypto.randomUUID()}` }, payload: { server_file_id: file.server_file_id, template_class: "cim", rights_attestation: { actor_attests_rights: true, basis: "separately_supplied_outside_live_deal" }, clean_template_basis: "separately_supplied_outside_live_deal" } });
  assert.equal(template.statusCode, 202, template.body);
  assert.equal(template.json().data.status, "quarantined");
  const templateId = template.json().data.template_id as string;
  const versionId = template.json().data.version_id as string;
  const protectedObject = await database.ownerPool.query("SELECT storage_key, plaintext_sha256, ciphertext_sha256 FROM object_store.protected_account_object WHERE template_version_id=$1", [versionId]);
  assert.equal(protectedObject.rowCount, 1);
  assert.match(protectedObject.rows[0].storage_key, /^protected\/account\//);
  const blockedSelection = await api.inject({ method: "POST", url: `/api/v1/deals/${dealId}/template-selections`, headers: { cookie: cookieA, "idempotency-key": `selection-${crypto.randomUUID()}` }, payload: { template_version_id: versionId, artifact_class: "cim" } });
  assert.equal(blockedSelection.statusCode, 409);
  assert.equal(blockedSelection.json().code, "template_not_production_ready");
  const incompatible = await api.inject({ method: "POST", url: `/api/v1/account/artifact-templates/${templateId}/preflights`, headers: { cookie: cookieA, "idempotency-key": `tpl-preflight-incompatible-${crypto.randomUUID()}` }, payload: { version_id: versionId, compatibility_profile: "pdf-v1" } });
  assert.equal(incompatible.statusCode, 201);
  assert.equal(incompatible.json().data.compatibility.status, "incompatible");
  const preflight = await api.inject({ method: "POST", url: `/api/v1/account/artifact-templates/${templateId}/preflights`, headers: { cookie: cookieA, "idempotency-key": `tpl-preflight-${crypto.randomUUID()}` }, payload: { version_id: versionId, compatibility_profile: "xlsx-v1" } });
  assert.equal(preflight.statusCode, 201);
  assert.equal(preflight.json().data.compatibility.status, "eligible");
  assert.equal(preflight.json().data.production_ready, false);
  const cookieB = await database.seedAuthenticatedSession(emailB);
  await provision(database, emailB);
  const hidden = await api.inject({ method: "GET", url: `/api/v1/account/artifact-templates/${templateId}`, headers: { cookie: cookieB } });
  assert.equal(hidden.statusCode, 404);
  const liveMaterial = await api.inject({ method: "POST", url: "/api/v1/account/artifact-templates", headers: { cookie: cookieA, "idempotency-key": `template-${crypto.randomUUID()}` }, payload: { server_file_id: file.server_file_id, template_class: "cim", source_record_id: crypto.randomUUID(), rights_attestation: { actor_attests_rights: true, basis: "sanitized" }, clean_template_basis: "sanitized_from_live_deal" } });
  assert.equal(liveMaterial.statusCode, 409);
  assert.equal(liveMaterial.json().code, "live_deal_material_forbidden");
});
