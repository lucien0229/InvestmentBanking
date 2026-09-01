import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { buildApi } from "../../apps/api/src/app.js";
import { createTestDatabase } from "../../apps/api/src/test-database.js";
import { hashToken } from "../../apps/api/src/database.js";

const dealInput = (termsId: string, overrides: Record<string, unknown> = {}) => ({
  display_name: `Source Deal ${crypto.randomUUID()}`,
  represented_party: "Northstar Holdings",
  transaction_subject: "Northstar Software",
  transaction_perimeter: { inclusions: ["Northstar Software operating business"], exclusions: [] },
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
  expected_template_posture: "product_default",
  provider_restrictions: ["local_only"],
  special_structures: [],
  identity_confirmed: true,
  source_reference: "source:ticket06",
  source_rights: "confirmed",
  intended_use: "internal_deal_execution",
  minimum_packet: "complete",
  compatibility: "pass",
  ...overrides,
});

async function provisionEntitlement(database: Awaited<ReturnType<typeof createTestDatabase>>, email: string) {
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
  return { termsId, accountId };
}

function validXlsxBytes() {
  // The safety scanner only needs a structurally valid OOXML ZIP envelope for
  // this bounded synthetic test fixture.
  return Buffer.from("PK\x03\x04[Content_Types].xml\x00xl/workbook.xml\x00xl/worksheets/sheet1.xml\x00PK\x05\x06", "binary");
}

function unsafeXlsxBytes(entry: string) {
  return Buffer.from(`PK\x03\x04[Content_Types].xml\x00xl/workbook.xml\x00${entry}\x00PK\x05\x06`, "binary");
}

async function createDeal(api: Awaited<ReturnType<typeof buildApi>>, database: Awaited<ReturnType<typeof createTestDatabase>>, email: string) {
  const cookie = await database.seedAuthenticatedSession(email);
  const { termsId } = await provisionEntitlement(database, email);
  const created = await api.inject({ method: "POST", url: "/api/v1/deals", headers: { cookie, "idempotency-key": `deal-${crypto.randomUUID()}` }, payload: dealInput(termsId) });
  assert.equal(created.statusCode, 201);
  const dealId = created.json().deal.id as string;
  const preflight = await api.inject({ method: "POST", url: `/api/v1/deals/${dealId}/preflights`, headers: { cookie, "idempotency-key": `preflight-${crypto.randomUUID()}` }, payload: {} });
  assert.equal(preflight.statusCode, 201);
  assert.equal(preflight.json().data.result, "pass");
  return { cookie, dealId };
}

async function createUpload(api: Awaited<ReturnType<typeof buildApi>>, cookie: string, dealId: string, bytes: Buffer, overrides: Record<string, unknown> = {}) {
  const preflights = await api.inject({ method: "GET", url: `/api/v1/deals/${dealId}/preflights`, headers: { cookie } });
  assert.equal(preflights.statusCode, 200);
  const operationPreviewId = preflights.json().data.at(-1)?.id as string | undefined;
  assert.ok(operationPreviewId);
  const response = await api.inject({
    method: "POST",
    url: `/api/v1/deals/${dealId}/upload-sessions`,
    headers: { cookie },
    payload: {
      purpose: "source_intake",
      operation_preview_id: operationPreviewId,
      consent_digest: `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`,
      files: [{
        client_file_id: "fixture-1",
        display_name: "Management Accounts.xlsx",
        byte_length: String(bytes.byteLength),
        media_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
        source_declaration: { source_material_id: null, new_source_material_name: "Management accounts", origin: "client_supplied", authority_basis: "provided_under_mandate", intended_purpose: "financial_analysis" },
        rights_posture_inputs: { receipt_permitted: true, processing_operations: ["quarantine", "parse", "analyze"], conditions: [] },
        confidentiality_posture: { confidentiality_class: "confidential", de_identification_posture: "not_de_identified" },
        processing_posture: { expected_file_family: "xlsx", special_structures: [] },
      }],
      ...overrides,
    },
  });
  assert.equal(response.statusCode, 201);
  return response.json();
}

test("Ticket 06 binds resumable upload to exact Deal scope and keeps TUS headers non-secret", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local" });
  t.after(() => api.close());
  const { cookie, dealId } = await createDeal(api, database, `ticket06-upload-${crypto.randomUUID()}@example.test`);
  const bytes = validXlsxBytes();
  const upload = await createUpload(api, cookie, dealId, bytes);
  assert.equal(upload.data.deal_id, dealId);
  assert.equal(upload.data.purpose, "source_intake");
  assert.equal(upload.data.files[0].state, "created");
  assert.ok(!Object.keys(upload.data.files[0].tus_headers).some((key) => /authorization|cookie|token/i.test(key)));
  const file = upload.data.files[0];
  const first = bytes.subarray(0, Math.ceil(bytes.length / 2));
  const second = bytes.subarray(Math.ceil(bytes.length / 2));
  const unsupportedProtocol = await api.inject({ method: "PATCH", url: file.tus_url, headers: { cookie, "content-type": "application/offset+octet-stream", "upload-offset": "0", "tus-resumable": "0.2.0" }, payload: first });
  assert.equal(unsupportedProtocol.statusCode, 400);
  const firstPatch = await api.inject({ method: "PATCH", url: file.tus_url, headers: { cookie, "content-type": "application/offset+octet-stream", "upload-offset": "0", "tus-resumable": "1.0.0" }, payload: first });
  assert.equal(firstPatch.statusCode, 204);
  assert.equal(firstPatch.headers["upload-offset"], String(first.length));
  const wrongOffset = await api.inject({ method: "PATCH", url: file.tus_url, headers: { cookie, "content-type": "application/offset+octet-stream", "upload-offset": "0", "tus-resumable": "1.0.0" }, payload: second });
  assert.equal(wrongOffset.statusCode, 409);
  assert.equal(wrongOffset.json().code, "upload_offset_mismatch");
  const secondPatch = await api.inject({ method: "PATCH", url: file.tus_url, headers: { cookie, "content-type": "application/offset+octet-stream", "upload-offset": String(first.length), "tus-resumable": "1.0.0" }, payload: second });
  assert.equal(secondPatch.statusCode, 204);
  const finalized = await api.inject({ method: "POST", url: `/api/v1/upload-sessions/${upload.data.id}/finalizations`, headers: { cookie }, payload: { file_ids: [file.server_file_id] } });
  assert.equal(finalized.statusCode, 200);
  assert.equal(finalized.json().items[0].outcome, "succeeded");
});

test("Ticket 06 binds uploads to the current operation preview and uses versioned cancellation", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local" });
  t.after(() => api.close());
  const { cookie, dealId } = await createDeal(api, database, `ticket06-cancel-${crypto.randomUUID()}@example.test`);
  const bytes = validXlsxBytes();
  const missingPreview = await api.inject({ method: "POST", url: `/api/v1/deals/${dealId}/upload-sessions`, headers: { cookie }, payload: { purpose: "source_intake", consent_digest: "sha256:missing-preview", files: [{ client_file_id: "missing-preview", display_name: "Management Accounts.xlsx", byte_length: String(bytes.length), media_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", source_declaration: { source_material_id: null, new_source_material_name: "Missing preview", origin: "client_supplied", authority_basis: "provided_under_mandate", intended_purpose: "financial_analysis" }, rights_posture_inputs: { receipt_permitted: true, processing_operations: ["quarantine"], conditions: [] }, confidentiality_posture: { confidentiality_class: "confidential", de_identification_posture: "not_de_identified" }, processing_posture: { expected_file_family: "xlsx", special_structures: [] } }] } });
  assert.equal(missingPreview.statusCode, 400);
  const upload = await createUpload(api, cookie, dealId, bytes);
  const session = await api.inject({ method: "GET", url: `/api/v1/upload-sessions/${upload.data.id}`, headers: { cookie } });
  assert.equal(session.statusCode, 200);
  const etag = session.headers.etag;
  assert.match(etag ?? "", /^\"upload-session-1\"$/);
  const withoutIfMatch = await api.inject({ method: "POST", url: `/api/v1/upload-sessions/${upload.data.id}/cancellations`, headers: { cookie }, payload: { all_remaining: true } });
  assert.equal(withoutIfMatch.statusCode, 428);
  const canceled = await api.inject({ method: "POST", url: `/api/v1/upload-sessions/${upload.data.id}/cancellations`, headers: { cookie, "if-match": etag! }, payload: { file_ids: [upload.data.files[0].server_file_id] } });
  assert.equal(canceled.statusCode, 201);
  assert.equal(canceled.json().data.state, "open");
  assert.deepEqual(canceled.json().data.canceled_file_ids, [upload.data.files[0].server_file_id]);
  const refreshed = await api.inject({ method: "GET", url: `/api/v1/upload-sessions/${upload.data.id}`, headers: { cookie } });
  assert.equal(refreshed.json().data.files[0].state, "canceled");
  assert.equal(refreshed.headers.etag, '"upload-session-2"');
});

test("Ticket 06 quarantines unsafe packages before acceptance and keeps accepted bytes encrypted", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local" });
  t.after(() => api.close());
  const { cookie, dealId } = await createDeal(api, database, `ticket06-safety-${crypto.randomUUID()}@example.test`);
  for (const entry of ["../escape", "xl/vbaProject.bin"]) {
    const bytes = unsafeXlsxBytes(entry);
    const upload = await createUpload(api, cookie, dealId, bytes);
    const file = upload.data.files[0];
    const patch = await api.inject({ method: "PATCH", url: file.tus_url, headers: { cookie, "content-type": "application/offset+octet-stream", "upload-offset": "0", "tus-resumable": "1.0.0" }, payload: bytes });
    assert.equal(patch.statusCode, 204);
    const finalized = await api.inject({ method: "POST", url: `/api/v1/upload-sessions/${upload.data.id}/finalizations`, headers: { cookie }, payload: { file_ids: [file.server_file_id] } });
    assert.equal(finalized.statusCode, 200);
    assert.equal(finalized.json().items[0].outcome, "failed");
    assert.ok(["unsafe_archive_path", "executable_content", "unsupported_active_content"].includes(finalized.json().items[0].problem.code));
  }
  const linkedBytes = unsafeXlsxBytes("xl/externalLinks/externalLink1.xml");
  const linkedUpload = await createUpload(api, cookie, dealId, linkedBytes);
  const linkedFile = linkedUpload.data.files[0];
  await api.inject({ method: "PATCH", url: linkedFile.tus_url, headers: { cookie, "content-type": "application/offset+octet-stream", "upload-offset": "0", "tus-resumable": "1.0.0" }, payload: linkedBytes });
  const linkedFinalized = await api.inject({ method: "POST", url: `/api/v1/upload-sessions/${linkedUpload.data.id}/finalizations`, headers: { cookie }, payload: { file_ids: [linkedFile.server_file_id] } });
  assert.equal(linkedFinalized.json().items[0].outcome, "succeeded");
  assert.deepEqual(linkedFinalized.json().items[0].safety.limitations, ["external_links_not_refreshed"]);
  const bytes = validXlsxBytes();
  const rightsBlockedUpload = await createUpload(api, cookie, dealId, bytes, { files: [{
    client_file_id: "rights-blocked", display_name: "Rights blocked.xlsx", byte_length: String(bytes.length), media_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    source_declaration: { source_material_id: null, new_source_material_name: "Rights blocked", origin: "client_supplied", authority_basis: "provided_under_mandate", intended_purpose: "financial_analysis" },
    rights_posture_inputs: { receipt_permitted: false, processing_operations: ["quarantine"], conditions: ["pending_rights_confirmation"] },
    confidentiality_posture: { confidentiality_class: "confidential", de_identification_posture: "not_de_identified" }, processing_posture: { expected_file_family: "xlsx", special_structures: [] },
  }] });
  const rightsBlockedFile = rightsBlockedUpload.data.files[0];
  const rightsBlockedPatch = await api.inject({ method: "PATCH", url: rightsBlockedFile.tus_url, headers: { cookie, "content-type": "application/offset+octet-stream", "upload-offset": "0", "tus-resumable": "1.0.0" }, payload: bytes });
  assert.equal(rightsBlockedPatch.statusCode, 204);
  const rightsBlockedFinalized = await api.inject({ method: "POST", url: `/api/v1/upload-sessions/${rightsBlockedUpload.data.id}/finalizations`, headers: { cookie }, payload: { file_ids: [rightsBlockedFile.server_file_id] } });
  assert.equal(rightsBlockedFinalized.json().items[0].outcome, "failed");
  assert.equal(rightsBlockedFinalized.json().items[0].problem.code, "source_acceptance_not_permitted");
  const upload = await createUpload(api, cookie, dealId, bytes);
  const file = upload.data.files[0];
  const patch = await api.inject({ method: "PATCH", url: file.tus_url, headers: { cookie, "content-type": "application/offset+octet-stream", "upload-offset": "0", "tus-resumable": "1.0.0" }, payload: bytes });
  assert.equal(patch.statusCode, 204);
  const finalized = await api.inject({ method: "POST", url: `/api/v1/upload-sessions/${upload.data.id}/finalizations`, headers: { cookie }, payload: { file_ids: [file.server_file_id] } });
  assert.equal(finalized.statusCode, 200);
  const sourceMaterialId = finalized.json().items[0].source_material_id as string;
  const accepted = await api.inject({ method: "POST", url: `/api/v1/deals/${dealId}/source-materials/${sourceMaterialId}/record-acceptances`, headers: { cookie, "idempotency-key": `accept-${crypto.randomUUID()}` }, payload: { server_file_id: file.server_file_id, authority_basis: "provided_under_mandate", record_date: "2026-09-01", version_label: "v1", rights_posture: "internal_use_only", confidentiality_class: "confidential" } });
  assert.equal(accepted.statusCode, 202);
  assert.equal(accepted.json().data.state, "completed");
  const recordId = accepted.json().data.source_record_id as string;
  const record = await api.inject({ method: "GET", url: `/api/v1/deals/${dealId}/source-materials/${sourceMaterialId}/records/${recordId}`, headers: { cookie } });
  assert.equal(record.statusCode, 200);
  assert.equal(record.json().data.representation.original_bytes_preserved, true);
  assert.match(record.json().data.content_identity.sha256, /^[a-f0-9]{64}$/);
  assert.equal(record.json().data.classification.confidentiality_class, "confidential");
  assert.equal(record.json().data.rights.basis.receipt_permitted, true);
  const finalizationReplay = await api.inject({ method: "POST", url: `/api/v1/upload-sessions/${upload.data.id}/finalizations`, headers: { cookie }, payload: { file_ids: [file.server_file_id] } });
  assert.equal(finalizationReplay.statusCode, 200);
  assert.equal(finalizationReplay.json().items[0].outcome, "succeeded");
  const duplicateAcceptance = await api.inject({ method: "POST", url: `/api/v1/deals/${dealId}/source-materials/${sourceMaterialId}/record-acceptances`, headers: { cookie, "idempotency-key": `accept-replay-${crypto.randomUUID()}` }, payload: { server_file_id: file.server_file_id, authority_basis: "provided_under_mandate", record_date: "2026-09-01", version_label: "v1-replay", rights_posture: "internal_use_only", confidentiality_class: "confidential" } });
  assert.equal(duplicateAcceptance.statusCode, 409);
  const grant = await api.inject({ method: "POST", url: `/api/v1/deals/${dealId}/source-records/${recordId}/object-grants`, headers: { cookie }, payload: { purpose: "source_inspection" } });
  assert.equal(grant.statusCode, 201);
  const streamed = await api.inject({ method: "GET", url: grant.json().stream_url, headers: { cookie, authorization: `ObjectGrant ${grant.json().token}` } });
  assert.equal(streamed.statusCode, 200);
  assert.deepEqual(Buffer.from(streamed.rawPayload), bytes);
  assert.equal(streamed.headers["accept-ranges"], "bytes");
  assert.match(streamed.headers.etag ?? "", /^[\"]?[a-f0-9]{64}[\"]?$/);
  const ranged = await api.inject({ method: "GET", url: grant.json().stream_url, headers: { cookie, authorization: `ObjectGrant ${grant.json().token}`, range: "bytes=1-3" } });
  assert.equal(ranged.statusCode, 206);
  assert.equal(ranged.headers["content-range"], `bytes 1-3/${bytes.length}`);
  assert.deepEqual(Buffer.from(ranged.rawPayload), bytes.subarray(1, 4));
  const rangedReplay = await api.inject({ method: "GET", url: grant.json().stream_url, headers: { cookie, authorization: `ObjectGrant ${grant.json().token}`, range: "bytes=1-3" } });
  assert.equal(rangedReplay.statusCode, 206);
  const receiptCount = await database.ownerPool.query<{ count: string }>("SELECT count(*)::text AS count FROM object_store.protected_stream_access_receipt WHERE grant_id = $1", [grant.json().grant_id]);
  assert.equal(receiptCount.rows[0].count, "2");
  const publicRead = await api.inject({ method: "GET", url: `/objects/${grant.json().protected_object_id}` });
  assert.equal(publicRead.statusCode, 401);
});

test("Ticket 06 preserves immutable source history and denies cross-account object or record access", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local" });
  t.after(() => api.close());
  const first = await createDeal(api, database, `ticket06-history-a-${crypto.randomUUID()}@example.test`);
  const bytes = validXlsxBytes();
  const upload = await createUpload(api, first.cookie, first.dealId, bytes, { files: [{
    client_file_id: "fixture-1", display_name: "Management Accounts.xlsx", byte_length: String(bytes.length), media_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", sha256: crypto.createHash("sha256").update(bytes).digest("hex"), source_declaration: { source_material_id: null, new_source_material_name: "Management accounts", origin: "client_supplied", authority_basis: "provided_under_mandate", intended_purpose: "financial_analysis" }, rights_posture_inputs: { receipt_permitted: true, processing_operations: ["quarantine", "parse"], conditions: [] }, confidentiality_posture: { confidentiality_class: "confidential", de_identification_posture: "not_de_identified" }, processing_posture: { expected_file_family: "xlsx", special_structures: [] },
  },] });
  const file = upload.data.files[0];
  await api.inject({ method: "PATCH", url: file.tus_url, headers: { cookie: first.cookie, "content-type": "application/offset+octet-stream", "upload-offset": "0", "tus-resumable": "1.0.0" }, payload: bytes });
  const finalized = await api.inject({ method: "POST", url: `/api/v1/upload-sessions/${upload.data.id}/finalizations`, headers: { cookie: first.cookie }, payload: { file_ids: [file.server_file_id] } });
  const materialId = finalized.json().items[0].source_material_id as string;
  const firstAcceptanceBody = { server_file_id: file.server_file_id, authority_basis: "provided_under_mandate", record_date: "2026-09-01", version_label: "v1", rights_posture: "internal_use_only", confidentiality_class: "confidential" };
  const firstAcceptanceKey = `accept-${crypto.randomUUID()}`;
  const accepted1 = await api.inject({ method: "POST", url: `/api/v1/deals/${first.dealId}/source-materials/${materialId}/record-acceptances`, headers: { cookie: first.cookie, "idempotency-key": firstAcceptanceKey }, payload: firstAcceptanceBody });
  assert.equal(accepted1.statusCode, 202);
  const replayed = await api.inject({ method: "POST", url: `/api/v1/deals/${first.dealId}/source-materials/${materialId}/record-acceptances`, headers: { cookie: first.cookie, "idempotency-key": firstAcceptanceKey }, payload: firstAcceptanceBody });
  assert.equal(replayed.statusCode, 202);
  assert.equal(replayed.json().data.idempotent_replayed, true);
  assert.equal(replayed.json().data.source_record_id, accepted1.json().data.source_record_id);
  const upload2 = await createUpload(api, first.cookie, first.dealId, bytes, { files: [{
    client_file_id: "fixture-2", display_name: "Management Accounts v2.xlsx", byte_length: String(bytes.length), media_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", sha256: crypto.createHash("sha256").update(bytes).digest("hex"), source_declaration: { source_material_id: materialId, origin: "client_supplied", authority_basis: "provided_under_mandate", intended_purpose: "financial_analysis" }, rights_posture_inputs: { receipt_permitted: true, processing_operations: ["quarantine", "parse"], conditions: [] }, confidentiality_posture: { confidentiality_class: "confidential", de_identification_posture: "not_de_identified" }, processing_posture: { expected_file_family: "xlsx", special_structures: [] },
  }] });
  const file2 = upload2.data.files[0];
  await api.inject({ method: "PATCH", url: file2.tus_url, headers: { cookie: first.cookie, "content-type": "application/offset+octet-stream", "upload-offset": "0", "tus-resumable": "1.0.0" }, payload: bytes });
  await api.inject({ method: "POST", url: `/api/v1/upload-sessions/${upload2.data.id}/finalizations`, headers: { cookie: first.cookie }, payload: { file_ids: [file2.server_file_id] } });
  const accepted2 = await api.inject({ method: "POST", url: `/api/v1/deals/${first.dealId}/source-materials/${materialId}/record-acceptances`, headers: { cookie: first.cookie, "idempotency-key": `accept-${crypto.randomUUID()}` }, payload: { server_file_id: file2.server_file_id, authority_basis: "limited_pending_confirmation", record_date: "2026-09-01", version_label: "v2", rights_posture: "internal_use_only", confidentiality_class: "confidential" } });
  assert.equal(accepted2.statusCode, 202);
  assert.notEqual(accepted1.json().data.source_record_id, accepted2.json().data.source_record_id);
  const second = await createDeal(api, database, `ticket06-history-b-${crypto.randomUUID()}@example.test`);
  const hidden = await api.inject({ method: "GET", url: `/api/v1/deals/${first.dealId}/source-materials/${materialId}/records/${accepted1.json().data.source_record_id}`, headers: { cookie: second.cookie } });
  assert.equal(hidden.statusCode, 404);
});
