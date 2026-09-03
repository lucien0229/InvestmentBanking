import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { buildApi } from "../../apps/api/src/app.js";
import { createTestDatabase } from "../../apps/api/src/test-database.js";
import { hashToken } from "../../apps/api/src/database.js";

const dealInput = (termsId: string, name = `source packet ${crypto.randomUUID()}`) => ({
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
  expected_template_posture: "product_default",
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
  return { terms };
}

function validXlsxBytes() { return Buffer.from("PK\x03\x04[Content_Types].xml\x00xl/workbook.xml\x00PK\x05\x06", "binary"); }

async function createDeal(api: Awaited<ReturnType<typeof buildApi>>, database: Awaited<ReturnType<typeof createTestDatabase>>, email: string) {
  const cookie = await database.seedAuthenticatedSession(email); const { terms } = await provision(database, email);
  const created = await api.inject({ method: "POST", url: "/api/v1/deals", headers: { cookie, "idempotency-key": `deal-${crypto.randomUUID()}` }, payload: dealInput(terms) });
  assert.equal(created.statusCode, 201, created.body); const dealId = created.json().deal.id as string;
  const preflight = await api.inject({ method: "POST", url: `/api/v1/deals/${dealId}/preflights`, headers: { cookie, "idempotency-key": `preflight-${crypto.randomUUID()}` }, payload: {} });
  assert.equal(preflight.statusCode, 201, preflight.body);
  return { cookie, dealId };
}

async function createAcceptedSource(api: Awaited<ReturnType<typeof buildApi>>, cookie: string, dealId: string) {
  const preflights = await api.inject({ method: "GET", url: `/api/v1/deals/${dealId}/preflights`, headers: { cookie } });
  const preview = preflights.json().data.at(-1).id as string; const bytes = validXlsxBytes(); const digest = crypto.createHash("sha256").update(bytes).digest("hex");
  const upload = await api.inject({ method: "POST", url: `/api/v1/deals/${dealId}/upload-sessions`, headers: { cookie }, payload: { purpose: "source_intake", operation_preview_id: preview, consent_digest: `sha256:${digest}`, files: [{ client_file_id: "source-1", display_name: "Management Accounts.xlsx", byte_length: String(bytes.length), media_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", sha256: digest, source_declaration: { source_material_id: null, new_source_material_name: "Management Accounts", origin: "client_supplied", authority_basis: "provided_under_mandate", intended_purpose: "financial_analysis" }, rights_posture_inputs: { receipt_permitted: true, processing_operations: ["quarantine", "parse"], conditions: [] }, confidentiality_posture: { confidentiality_class: "confidential", de_identification_posture: "not_de_identified" }, processing_posture: { expected_file_family: "xlsx", special_structures: [] } }] } });
  assert.equal(upload.statusCode, 201, upload.body); const file = upload.json().data.files[0];
  const patch = await api.inject({ method: "PATCH", url: file.tus_url, headers: { cookie, "content-type": "application/offset+octet-stream", "tus-resumable": "1.0.0", "upload-offset": "0" }, payload: bytes }); assert.equal(patch.statusCode, 204, patch.body);
  const finalized = await api.inject({ method: "POST", url: `/api/v1/upload-sessions/${upload.json().data.id}/finalizations`, headers: { cookie }, payload: { file_ids: [file.server_file_id] } }); assert.equal(finalized.statusCode, 200, finalized.body);
  const materialId = finalized.json().items[0].source_material_id as string;
  const accepted = await api.inject({ method: "POST", url: `/api/v1/deals/${dealId}/source-materials/${materialId}/record-acceptances`, headers: { cookie, "idempotency-key": `accept-${crypto.randomUUID()}` }, payload: { server_file_id: file.server_file_id, authority_basis: "provided_under_mandate", record_date: "2026-09-02", version_label: "v1", rights_posture: "internal_use_only", confidentiality_class: "confidential" } });
  assert.equal(accepted.statusCode, 202, accepted.body); return accepted.json().data.source_record_id as string;
}

test("Source Packet binds exact Source Record version and rejects stale concurrent changes", async (t) => {
  const database = await createTestDatabase(); t.after(() => database.close()); const api = await buildApi({ database, authMode: "local" }); t.after(() => api.close());
  const owner = await createDeal(api, database, `source-packet-packet-${crypto.randomUUID()}@example.test`); const sourceRecordId = await createAcceptedSource(api, owner.cookie, owner.dealId);
  const packetKey = `packet-${crypto.randomUUID()}`;
  const created = await api.inject({ method: "POST", url: `/api/v1/deals/${owner.dealId}/source-packets`, headers: { cookie: owner.cookie, "idempotency-key": packetKey }, payload: { packet_name: "Preparation anchor packet", purpose: "internal_deal_execution" } });
  assert.equal(created.statusCode, 201, created.body); const packetId = created.json().data.id as string;
  const replay = await api.inject({ method: "POST", url: `/api/v1/deals/${owner.dealId}/source-packets`, headers: { cookie: owner.cookie, "idempotency-key": packetKey }, payload: { packet_name: "Preparation anchor packet", purpose: "internal_deal_execution" } });
  assert.equal(replay.statusCode, 201, replay.body); assert.equal(replay.headers["idempotent-replayed"], "true"); assert.equal(replay.json().data.id, packetId);
  const version = await api.inject({ method: "POST", url: `/api/v1/deals/${owner.dealId}/source-packets/${packetId}/versions`, headers: { cookie: owner.cookie, "if-match": created.headers.etag!, "idempotency-key": `packet-version-${crypto.randomUUID()}` }, payload: { purpose: "internal_deal_execution", scope_statement: "Prepare exact internal analysis inputs", change_reason: "Initial authorized anchor selection", members: [{ source_record_id: sourceRecordId, inclusion_reason: "Authorized management accounts anchor" }], declared_exclusions: [{ material: "Buyer outreach materials", reason: "Outside preparation scope" }] } });
  assert.equal(version.statusCode, 201, version.body); assert.equal(version.json().data.members[0].source_record_id, sourceRecordId); assert.equal(version.json().data.exclusions[0].material, "Buyer outreach materials");
  await assert.rejects(() => database.ownerPool.query("UPDATE source.source_packet_version SET scope_statement='mutated' WHERE id=$1", [version.json().data.id]), /source_packet_version_immutable/);
  const packet = await api.inject({ method: "GET", url: `/api/v1/deals/${owner.dealId}/source-packets/${packetId}`, headers: { cookie: owner.cookie } });
  assert.equal(packet.statusCode, 200, packet.body); assert.equal(packet.json().data.current_version.members[0].source_record_id, sourceRecordId); assert.equal(packet.json().data.current_version.members[0].version, 1); assert.equal(packet.json().data.output_ceiling.code, "metadata_only");
  const unknownPacket = await api.inject({ method: "GET", url: `/api/v1/deals/${owner.dealId}/source-packets/${crypto.randomUUID()}`, headers: { cookie: owner.cookie } });
  assert.equal(unknownPacket.statusCode, 404); assert.equal(unknownPacket.json().code, "resource_not_found");
  const secondVersion = await api.inject({ method: "POST", url: `/api/v1/deals/${owner.dealId}/source-packets/${packetId}/versions`, headers: { cookie: owner.cookie, "if-match": packet.headers.etag!, "idempotency-key": `packet-version-${crypto.randomUUID()}` }, payload: { purpose: "internal_deal_execution", scope_statement: "Narrowed internal review", change_reason: "Explicitly preserved v1 and changed scope", members: [{ source_record_id: sourceRecordId, inclusion_reason: "Retained authorized anchor" }], declared_exclusions: [{ material: "Buyer outreach materials", reason: "Still outside scope" }] } });
  assert.equal(secondVersion.statusCode, 201, secondVersion.body);
  const historical = await api.inject({ method: "GET", url: `/api/v1/deals/${owner.dealId}/source-packets/${packetId}/versions/${version.json().data.id}`, headers: { cookie: owner.cookie } });
  assert.equal(historical.statusCode, 200, historical.body); assert.equal(historical.json().data.requested_version_exists, true); assert.equal(historical.json().data.version.version, 1); assert.equal(historical.json().data.version.members[0].source_record_id, sourceRecordId);
  const staleCondition = await api.inject({ method: "POST", url: `/api/v1/deals/${owner.dealId}/source-records/${sourceRecordId}/condition-assessments`, headers: { cookie: owner.cookie, "idempotency-key": `condition-${crypto.randomUUID()}` }, payload: { purpose: "internal_deal_execution", freshness: "stale", conflict: "none", disposition: "active" } });
  assert.equal(staleCondition.statusCode, 201, staleCondition.body);
  const afterStale = await api.inject({ method: "GET", url: `/api/v1/deals/${owner.dealId}/source-packets/${packetId}`, headers: { cookie: owner.cookie } });
  assert.equal(afterStale.statusCode, 200, afterStale.body); assert.equal(afterStale.json().data.output_ceiling.code, "anchor_inventory_only"); assert.equal(afterStale.json().data.circulation_blocked, true);
  const withdrawnCondition = await api.inject({ method: "POST", url: `/api/v1/deals/${owner.dealId}/source-records/${sourceRecordId}/condition-assessments`, headers: { cookie: owner.cookie, "idempotency-key": `condition-${crypto.randomUUID()}` }, payload: { purpose: "internal_deal_execution", freshness: "unknown", conflict: "none", disposition: "withdrawn" } });
  assert.equal(withdrawnCondition.statusCode, 201, withdrawnCondition.body); assert.equal(withdrawnCondition.json().data.prospective_reliance, "removed");
  const afterWithdrawal = await api.inject({ method: "GET", url: `/api/v1/deals/${owner.dealId}/source-packets/${packetId}`, headers: { cookie: owner.cookie } });
  assert.equal(afterWithdrawal.statusCode, 200, afterWithdrawal.body); assert.equal(afterWithdrawal.json().data.output_ceiling.code, "metadata_only"); assert.equal(afterWithdrawal.json().data.circulation_blocked, true);
  const stale = await api.inject({ method: "POST", url: `/api/v1/deals/${owner.dealId}/source-packets/${packetId}/versions`, headers: { cookie: owner.cookie, "if-match": created.headers.etag!, "idempotency-key": `packet-version-${crypto.randomUUID()}` }, payload: { purpose: "internal_deal_execution", scope_statement: "Stale write", change_reason: "Concurrent stale command", members: [{ source_record_id: sourceRecordId, inclusion_reason: "Should not win" }], declared_exclusions: [] } });
  assert.equal(stale.statusCode, 412); assert.equal(stale.json().code, "version_conflict");
  const source = await database.ownerPool.query<{ rights_posture: string; reliance_state: string; disposition_code: string }>("SELECT rights_posture,reliance_state,disposition_code FROM source.source_record WHERE id=$1", [sourceRecordId]);
  assert.equal(source.rows[0].rights_posture, "internal_use_only"); assert.equal(source.rows[0].reliance_state, "unassessed"); assert.equal(source.rows[0].disposition_code, "current");
});

test("rights blocking creates an impact candidate, removes prospective circulation, and caps worker operations", async (t) => {
  const database = await createTestDatabase(); t.after(() => database.close()); const api = await buildApi({ database, authMode: "local" }); t.after(() => api.close());
  const owner = await createDeal(api, database, `source-packet-rights-${crypto.randomUUID()}@example.test`); const sourceRecordId = await createAcceptedSource(api, owner.cookie, owner.dealId);
  const created = await api.inject({ method: "POST", url: `/api/v1/deals/${owner.dealId}/source-packets`, headers: { cookie: owner.cookie, "idempotency-key": `packet-${crypto.randomUUID()}` }, payload: { name: "Rights review packet", purpose_code: "internal_deal_execution" } }); assert.equal(created.statusCode, 201);
  const packetId = created.json().data.id as string; const version = await api.inject({ method: "POST", url: `/api/v1/deals/${owner.dealId}/source-packets/${packetId}/versions`, headers: { cookie: owner.cookie, "if-match": created.headers.etag!, "idempotency-key": `packet-version-${crypto.randomUUID()}` }, payload: { purpose_code: "internal_deal_execution", scope_statement: "Rights-bound analysis", change_reason: "Anchor source selected", selected_source_records: [{ source_record_id: sourceRecordId, reason: "Only authorized anchor" }], declared_exclusions: [] } }); assert.equal(version.statusCode, 201, version.body);
  const versionId = version.json().data.id as string;
  const objective = await api.inject({ method: "POST", url: `/api/v1/deals/${owner.dealId}/work-objectives`, headers: { cookie: owner.cookie, "idempotency-key": `objective-${crypto.randomUUID()}` }, payload: { packet_version_id: versionId, objective_type: "analysis", purpose: "internal_deal_execution", objective_text: "Normalize management accounts", intended_use: "internal_analysis", intended_audience: "internal_deal_team", requested_scope: "Historical and current operating case" } }); assert.equal(objective.statusCode, 201, objective.body);
  const blocked = await api.inject({ method: "POST", url: `/api/v1/deals/${owner.dealId}/rights-assessments`, headers: { cookie: owner.cookie, "idempotency-key": `rights-${crypto.randomUUID()}` }, payload: { source_record_id: sourceRecordId, purpose: "internal_deal_execution", rights: "blocked", permitted_operations: [], conditions: ["client authority withdrawn"], basis: { evidence: "fixture withdrawal" } } }); assert.equal(blocked.statusCode, 201, blocked.body); assert.equal(blocked.json().data.prospective_reliance, "removed");
  const packet = await api.inject({ method: "GET", url: `/api/v1/deals/${owner.dealId}/source-packets/${packetId}`, headers: { cookie: owner.cookie } }); assert.equal(packet.statusCode, 200, packet.body); assert.equal(packet.json().data.output_ceiling.code, "metadata_only"); assert.equal(packet.json().data.circulation_blocked, true); assert.ok(packet.json().data.impact_candidates.length >= 1);
  const worker = await database.ownerPool.query("SELECT source.get_packet_worker_input($1,$2,$3,$4,$5)", [packet.json().data.account_id, owner.dealId, versionId, objective.json().data.id, "deterministic_analysis"]).catch((error: unknown) => error);
  assert.equal(worker instanceof Error ? String(worker.message).includes("output_ceiling_exceeded") : false, true);
});
