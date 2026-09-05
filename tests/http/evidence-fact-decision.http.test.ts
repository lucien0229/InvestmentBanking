import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { buildApi } from "../../apps/api/src/app.js";
import { createTestDatabase } from "../../apps/api/src/test-database.js";
import { hashToken } from "../../apps/api/src/database.js";

type Fixture = Awaited<ReturnType<typeof createTestDatabase>> & { cookie: string; accountId: string; actorId: string; dealId: string; sourceRecordId: string; representationId: string; fragmentId: string };

async function fixture(): Promise<Fixture> {
  const database = await createTestDatabase();
  const email = `knowledge-${crypto.randomUUID()}@example.test`;
  const cookie = await database.seedAuthenticatedSession(email);
  const actor = (await database.ownerPool.query<{ id: string; account_id: string }>("SELECT a.id, aa.account_id FROM app.actor a JOIN app.account_actor aa ON aa.actor_id=a.id AND aa.active WHERE a.email_digest=$1", [hashToken(email)])).rows[0]!;
  const dealId = crypto.randomUUID();
  await database.ownerPool.query("INSERT INTO app.deal(id,account_id,name,client_label,transaction_subject,mandate_objective,business_stage) VALUES ($1,$2,$3,'Client','Subject','Controlled review','Preparation')", [dealId, actor.account_id, `Knowledge ${dealId}`]);
  await database.ownerPool.query("INSERT INTO app.deal_workspace(account_id,deal_id,overview_revision_id,displayed_state) VALUES ($1,$2,$3,$4)", [actor.account_id, dealId, `overview-${dealId}`, JSON.stringify({ stage: "Preparation" })]);
  const materialId = crypto.randomUUID(); const uploadId = crypto.randomUUID(); const uploadSessionId = crypto.randomUUID(); const objectId = crypto.randomUUID(); const coverageId = crypto.randomUUID(); const sourceRecordId = crypto.randomUUID(); const representationId = crypto.randomUUID(); const fragmentId = crypto.randomUUID();
  const digest = "a".repeat(64);
  const fragmentText = "Adjusted EBITDA was 17.8 million";
  const fragmentDigest = crypto.createHash("sha256").update(fragmentText).digest("hex");
  await database.ownerPool.query("INSERT INTO source.source_material(id,account_id,deal_id,stable_name,origin_code) VALUES ($1,$2,$3,'Management Accounts','client_supplied')", [materialId, actor.account_id, dealId]);
  await database.ownerPool.query("INSERT INTO source.upload_session(id,account_id,deal_id,actor_id,purpose_code,batch_id,consent_digest,max_files,max_total_bytes,status_code,expires_at) VALUES ($1,$2,$3,$4,'source_intake',$5,$6,10,100000,'finalized',now()+interval '1 day')", [uploadSessionId, actor.account_id, dealId, actor.id, crypto.randomUUID(), `sha256:${digest}`]);
  await database.ownerPool.query("INSERT INTO source.quarantined_upload(id,account_id,deal_id,actor_id,upload_session_id,client_file_id,display_name,quarantine_storage_key,declared_media_type,declared_byte_length,source_declaration,rights_posture_inputs,confidentiality_posture,processing_posture,status_code,expires_at) VALUES ($1,$2,$3,$4,$5,'fixture','Management Accounts.xlsx',$6,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',10,'{}','{}','{}','{}','accepted',now()+interval '1 day')", [uploadId, actor.account_id, dealId, actor.id, uploadSessionId, `quarantine/${uploadId}.bin`]);
  await database.ownerPool.query("INSERT INTO object_store.protected_object(id,account_id,deal_id,storage_key,plaintext_sha256,ciphertext_sha256,byte_length,media_type,envelope_version,kms_key_version,wrapped_dek) VALUES ($1,$2,$3,$4,$5,$5,10,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','v1','test','{}'::jsonb)", [objectId, actor.account_id, dealId, `objects/${objectId}`, digest]);
  await database.ownerPool.query("INSERT INTO source.processing_coverage(id,account_id,deal_id,source_record_id,coverage_code,parser_identity,coverage_payload) VALUES ($1,$2,$3,$4,'complete','fixture','{}'::jsonb)", [coverageId, actor.account_id, dealId, sourceRecordId]);
  await database.ownerPool.query("INSERT INTO source.source_record(id,account_id,deal_id,source_material_id,version_ordinal,version_label,origin_code,acquisition_method,authority_basis,provenance_class,confidentiality_class,de_identification_posture,rights_posture,rights_basis,content_sha256,byte_length,media_type,record_date,received_at,accepted_at,native_locator_profile_code,native_locator_profile_version,provenance_receipt,accepted_upload_id) VALUES ($1,$2,$3,$4,1,'v1','client_supplied','fixture','provided_under_mandate','synthetic','internal','not_applicable','internal_use_only','{}',$5,10,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','2026-09-01',now(),now(),'xlsx-native','1','{}',$6)", [sourceRecordId, actor.account_id, dealId, materialId, digest, uploadId]);
  await database.ownerPool.query("INSERT INTO source.source_representation(id,account_id,deal_id,source_record_id,protected_object_id,content_sha256,parser_identity,processing_coverage_id) VALUES ($1,$2,$3,$4,$5,$6,'fixture',$7)", [representationId, actor.account_id, dealId, sourceRecordId, objectId, digest, coverageId]);
  await database.ownerPool.query("INSERT INTO source.source_fragment(id,account_id,deal_id,source_record_id,representation_id,locator,content_text,content_sha256) VALUES ($1,$2,$3,$4,$5,'{\"kind\":\"sheet_cell\",\"sheet\":\"Operating Case\",\"cell\":\"F42\"}'::jsonb,$6,$7)", [fragmentId, actor.account_id, dealId, sourceRecordId, representationId, fragmentText, `sha256:${fragmentDigest}`]);
  return Object.assign(database, { cookie, accountId: actor.account_id, actorId: actor.id, dealId, sourceRecordId, representationId, fragmentId }) as Fixture;
}

test("Evidence Inspector accepts exact source Evidence and exposes independent dimensions", async (t) => {
  const database = await fixture(); t.after(() => database.close()); const api = await buildApi({ database, authMode: "local" }); t.after(() => api.close());
  const accepted = await api.inject({ method: "POST", url: `/api/v1/deals/${database.dealId}/evidence-acceptances`, headers: { cookie: database.cookie, "idempotency-key": `evidence-${crypto.randomUUID()}` }, payload: { source_record_id: database.sourceRecordId, representation_id: database.representationId, locator: { kind: "sheet_cell", sheet: "Operating Case", cell: "F42" }, proposition: "Adjusted EBITDA was 17.8 million", relationship: "supports", supported_scope: "FY2025E adjusted EBITDA", qualification: "Management model basis", limitation: null } });
  assert.equal(accepted.statusCode, 201, accepted.body); const evidenceId = accepted.json().data.id as string;
  const inspector = await api.inject({ method: "GET", url: `/api/v1/deals/${database.dealId}/evidence`, headers: { cookie: database.cookie } });
  assert.equal(inspector.statusCode, 200, inspector.body); const data = inspector.json().data; assert.equal(data[0].id, evidenceId); assert.deepEqual(data[0].dimensions, { extraction: "complete", coverage: "complete", authority: "provided_under_mandate", freshness: "unassessed", conflict: "unassessed", calculation: "not_applicable", model: "not_applicable", professional_judgment: "not_assessed", intended_use: "unbounded" }); assert.equal(data[0].truth_score, undefined);
});

test("Evidence acceptance rejects a locator that is not an eligible Source fragment", async (t) => {
  const database = await fixture(); t.after(() => database.close()); const api = await buildApi({ database, authMode: "local" }); t.after(() => api.close());
  const response = await api.inject({ method: "POST", url: `/api/v1/deals/${database.dealId}/evidence-acceptances`, headers: { cookie: database.cookie, "idempotency-key": `evidence-unresolved-${crypto.randomUUID()}` }, payload: { source_record_id: database.sourceRecordId, representation_id: database.representationId, locator: { kind: "sheet_cell", sheet: "Operating Case", cell: "Z99" }, proposition: "Adjusted EBITDA was 17.8 million", relationship: "supports", supported_scope: "FY2025E adjusted EBITDA" } });
  assert.equal(response.statusCode, 409, response.body); assert.equal(response.json().code, "locator_unresolved");
});

test("Claim promotion requires accepted Evidence and a typed Banker Decision; Assumption approval stays an Assumption", async (t) => {
  const database = await fixture(); t.after(() => database.close()); const api = await buildApi({ database, authMode: "local" }); t.after(() => api.close());
  const claim = await api.inject({ method: "POST", url: `/api/v1/deals/${database.dealId}/claims`, headers: { cookie: database.cookie, "idempotency-key": `claim-${crypto.randomUUID()}` }, payload: { proposition: "Adjusted EBITDA was 17.8 million", attribution: "management", definition: "adjusted EBITDA", period: "FY2025E", unit: "USD million", currency: "USD", sign: "positive", value: "17.8", purpose: "valuation", scope: "internal analysis" } });
  assert.equal(claim.statusCode, 201, claim.body); const claimId = claim.json().data.id as string;
  const blocked = await api.inject({ method: "POST", url: `/api/v1/deals/${database.dealId}/claims/${claimId}/fact-acceptances`, headers: { cookie: database.cookie, "idempotency-key": `fact-${crypto.randomUUID()}` }, payload: { evidence_relationship_ids: [], purpose: "valuation", scope: "internal analysis", rationale: "No evidence yet", alternatives: [], contrary_evidence: [] } });
  assert.equal(blocked.statusCode, 409); assert.equal(blocked.json().code, "fact_evidence_required");
  const evidence = await api.inject({ method: "POST", url: `/api/v1/deals/${database.dealId}/evidence-acceptances`, headers: { cookie: database.cookie, "idempotency-key": `evidence-${crypto.randomUUID()}` }, payload: { source_record_id: database.sourceRecordId, representation_id: database.representationId, locator: { kind: "sheet_cell", sheet: "Operating Case", cell: "F42" }, proposition: "Adjusted EBITDA was 17.8 million", relationship: "supports", supported_scope: "FY2025E adjusted EBITDA", qualification: null, limitation: null } });
  const relationshipId = evidence.json().data.relationship.id as string;
  const fact = await api.inject({ method: "POST", url: `/api/v1/deals/${database.dealId}/claims/${claimId}/fact-acceptances`, headers: { cookie: database.cookie, "idempotency-key": `fact-${crypto.randomUUID()}` }, payload: { evidence_relationship_ids: [relationshipId], purpose: "valuation", scope: "internal analysis", rationale: "Exact workbook cell supports the proposition", alternatives: ["Retain as unresolved Claim"], contrary_evidence: [] } });
  assert.equal(fact.statusCode, 201, fact.body); assert.equal(fact.json().data.type, "Fact"); assert.equal(fact.json().data.human_decision.selected_option_code, "accept_fact");
  const normalized = await api.inject({ method: "POST", url: `/api/v1/deals/${database.dealId}/normalized-financial-values`, headers: { cookie: database.cookie, "idempotency-key": `normalized-${crypto.randomUUID()}` }, payload: { definition: "adjusted EBITDA", period: "FY2025E", unit: "USD million", currency: "USD", sign: "positive", precision: 1, value_text: "17.8", actual_forecast: "forecast", source_locator: { kind: "sheet_cell", sheet: "Operating Case", cell: "F42" }, source_fragment_id: database.fragmentId, decision_id: fact.json().data.human_decision.id } });
  assert.equal(normalized.statusCode, 201, normalized.body); assert.equal(normalized.json().data.value_text, "17.8");
  const assumption = await api.inject({ method: "POST", url: `/api/v1/deals/${database.dealId}/assumptions`, headers: { cookie: database.cookie, "idempotency-key": `assumption-${crypto.randomUUID()}` }, payload: { proposition: "Use 8.0x exit multiple", value: "8.0", purpose: "valuation", scope: "internal analysis", rationale: "Scenario input", bounds: { min: "6.0", max: "10.0" }, invalidation_triggers: ["market multiple refresh"] } });
  assert.equal(assumption.statusCode, 201, assumption.body); const assumptionId = assumption.json().data.id as string;
  const approval = await api.inject({ method: "POST", url: `/api/v1/deals/${database.dealId}/assumptions/${assumptionId}/approvals`, headers: { cookie: database.cookie, "idempotency-key": `assumption-approval-${crypto.randomUUID()}` }, payload: { purpose: "valuation", scope: "internal analysis", allowed_uses: ["valuation_scenario"], rationale: "Approved for this scenario only", alternatives: ["Leave unapproved"], evidence_relationship_ids: [], conditions: ["Review quarterly"], invalidation_triggers: ["market multiple refresh"] } });
  assert.equal(approval.statusCode, 201, approval.body); assert.equal(approval.json().data.decision_type, "assumption_approval"); assert.equal(approval.json().data.assumption.id, assumptionId); assert.equal(approval.json().data.assumption.type, "Assumption");
});

test("Fact acceptance preserves conflicts and rejects stale concurrent control reviews", async (t) => {
  const database = await fixture(); t.after(() => database.close()); const api = await buildApi({ database, authMode: "local" }); t.after(() => api.close());
  const claimA = await api.inject({ method: "POST", url: `/api/v1/deals/${database.dealId}/claims`, headers: { cookie: database.cookie, "idempotency-key": `claim-a-${crypto.randomUUID()}` }, payload: { proposition: "Adjusted EBITDA was 18.4 million", attribution: "seller CIM", definition: "adjusted EBITDA", period: "FY2025E", unit: "USD million", currency: "USD", sign: "positive", value: "18.4", purpose: "valuation", scope: "FY2025E valuation" } });
  const claimB = await api.inject({ method: "POST", url: `/api/v1/deals/${database.dealId}/claims`, headers: { cookie: database.cookie, "idempotency-key": `claim-b-${crypto.randomUUID()}` }, payload: { proposition: "Adjusted EBITDA was 17.8 million", attribution: "management model", definition: "adjusted EBITDA", period: "FY2025E", unit: "USD million", currency: "USD", sign: "positive", value: "17.8", purpose: "valuation", scope: "FY2025E valuation" } });
  const conflict = await api.inject({ method: "POST", url: `/api/v1/deals/${database.dealId}/conflicts`, headers: { cookie: database.cookie, "idempotency-key": `conflict-${crypto.randomUUID()}` }, payload: { dimension: "value", affected_scope: "FY2025E valuation", affected_uses: ["valuation"], claim_ids: [claimA.json().data.id, claimB.json().data.id] } });
  assert.equal(conflict.statusCode, 201, conflict.body); const conflictId = conflict.json().data.id as string;
  const evidence = await api.inject({ method: "POST", url: `/api/v1/deals/${database.dealId}/evidence-acceptances`, headers: { cookie: database.cookie, "idempotency-key": `evidence-${crypto.randomUUID()}` }, payload: { source_record_id: database.sourceRecordId, representation_id: database.representationId, locator: { kind: "sheet_cell", sheet: "Operating Case", cell: "F42" }, proposition: "Adjusted EBITDA was 17.8 million", relationship: "supports", supported_scope: "FY2025E adjusted EBITDA", qualification: null, limitation: null } });
  const linked = await api.inject({ method: "POST", url: `/api/v1/deals/${database.dealId}/claims/${claimB.json().data.id}/fact-acceptances`, headers: { cookie: database.cookie, "idempotency-key": `fact-${crypto.randomUUID()}` }, payload: { evidence_relationship_ids: [evidence.json().data.relationship.id], purpose: "valuation", scope: "FY2025E valuation", rationale: "Choose model basis", alternatives: ["Use CIM value"], contrary_evidence: [conflictId] } });
  assert.equal(linked.statusCode, 409); assert.equal(linked.json().code, "material_conflict_unresolved");
  const hardBlock = await api.inject({ method: "POST", url: `/api/v1/deals/${database.dealId}/conflicts/${conflictId}/resolutions`, headers: { cookie: database.cookie, "if-match": '"conflict-1"', "idempotency-key": `resolution-hard-block-${crypto.randomUUID()}` }, payload: { disposition: "waive_rights_block", scope: "FY2025E valuation", rationale: "Attempted waiver", selected_claim_ids: [claimA.json().data.id, claimB.json().data.id], evidence_relationship_ids: [], alternatives: ["Resolve rights"] } });
  assert.equal(hardBlock.statusCode, 409); assert.equal(hardBlock.json().code, "decision_cannot_waive_hard_block");
  const resolution = await api.inject({ method: "POST", url: `/api/v1/deals/${database.dealId}/conflicts/${conflictId}/resolutions`, headers: { cookie: database.cookie, "if-match": '"conflict-1"', "idempotency-key": `resolution-${crypto.randomUUID()}` }, payload: { disposition: "retain_both_scope_bound", scope: "FY2025E valuation", rationale: "Retain both values and use 17.8m only for the management-model cross-check", selected_claim_ids: [claimA.json().data.id, claimB.json().data.id], evidence_relationship_ids: [evidence.json().data.relationship.id], alternatives: ["Average values"] } });
  assert.equal(resolution.statusCode, 201, resolution.body); const version = resolution.headers.etag!;
  const stale = await api.inject({ method: "POST", url: `/api/v1/deals/${database.dealId}/conflicts/${conflictId}/resolutions`, headers: { cookie: database.cookie, "if-match": '"conflict-0"', "idempotency-key": `resolution-stale-${crypto.randomUUID()}` }, payload: { disposition: "retain_both_scope_bound", scope: "FY2025E valuation", rationale: "stale", selected_claim_ids: [claimA.json().data.id, claimB.json().data.id], evidence_relationship_ids: [evidence.json().data.relationship.id], alternatives: ["Average values"] } });
  assert.equal(stale.statusCode, 412); assert.notEqual(version, undefined);
});

test("Knowledge projections do not enumerate another Deal", async (t) => {
  const database = await fixture(); t.after(() => database.close()); const api = await buildApi({ database, authMode: "local" }); t.after(() => api.close());
  const response = await api.inject({ method: "GET", url: `/api/v1/deals/${crypto.randomUUID()}/evidence`, headers: { cookie: database.cookie } });
  assert.equal(response.statusCode, 404); assert.equal(response.json().code, "resource_not_found");
});

test("Claim correction is append-only and exposes every dependent candidate", async (t) => {
  const database = await fixture(); t.after(() => database.close()); const api = await buildApi({ database, authMode: "local" }); t.after(() => api.close());
  const claim = await api.inject({ method: "POST", url: `/api/v1/deals/${database.dealId}/claims`, headers: { cookie: database.cookie, "idempotency-key": `claim-correction-${crypto.randomUUID()}` }, payload: { proposition: "Cash was 6.2 million", attribution: "management", definition: "cash", period: "FY2025E", unit: "USD million", currency: "USD", sign: "positive", value: "6.2", purpose: "valuation", scope: "internal analysis" } });
  const claimId = claim.json().data.id as string;
  const evidence = await api.inject({ method: "POST", url: `/api/v1/deals/${database.dealId}/evidence-acceptances`, headers: { cookie: database.cookie, "idempotency-key": `evidence-correction-${crypto.randomUUID()}` }, payload: { source_record_id: database.sourceRecordId, representation_id: database.representationId, locator: { kind: "sheet_cell", sheet: "Operating Case", cell: "F42" }, proposition: "Cash was 6.2 million", relationship: "supports", supported_scope: "FY2025E cash", qualification: null, limitation: null } });
  const relationshipId = evidence.json().data.relationship.id as string;
  const fact = await api.inject({ method: "POST", url: `/api/v1/deals/${database.dealId}/claims/${claimId}/fact-acceptances`, headers: { cookie: database.cookie, "idempotency-key": `fact-correction-${crypto.randomUUID()}` }, payload: { evidence_relationship_ids: [relationshipId], purpose: "valuation", scope: "internal analysis", rationale: "Initial extraction", alternatives: [], contrary_evidence: [] } });
  assert.equal(fact.statusCode, 201, fact.body);
  const correction = await api.inject({ method: "POST", url: `/api/v1/deals/${database.dealId}/claims/${claimId}/corrections`, headers: { cookie: database.cookie, "idempotency-key": `correction-${crypto.randomUUID()}` }, payload: { corrected_value: "4.7", scope: "internal analysis", purpose: "valuation", rationale: "Corrected to the exact cash cell after reconciliation", evidence_relationship_ids: [relationshipId], alternatives: ["Retain original 6.2"] } });
  assert.equal(correction.statusCode, 201, correction.body); assert.equal(correction.json().data.origin, "correction"); assert.equal(correction.json().data.original.value, "6.2"); assert.ok(correction.json().data.dependent_candidates.some((candidate: { kind: string }) => candidate.kind === "fact"));
  const original = await api.inject({ method: "GET", url: `/api/v1/deals/${database.dealId}/claims/${claimId}`, headers: { cookie: database.cookie } });
  assert.equal(original.json().data[0].value, "6.2");
});


test("Evidence binds the selected Claim even when proposition wording is identical", async (t) => {
  const database = await fixture(); t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local" }); t.after(() => api.close());
  const root = `/api/v1/deals/${database.dealId}`;
  const post = (url: string, payload: Record<string, unknown>, key = crypto.randomUUID()) => api.inject({ method: "POST", url: root + url, headers: { cookie: database.cookie, "idempotency-key": key }, payload });
  const base = { proposition: "Adjusted EBITDA was 17.8 million", definition: "adjusted EBITDA", unit: "USD million", currency: "USD", sign: "positive", value: "17.8", purpose: "valuation", scope: "internal analysis" };
  const older = await post("/claims", { ...base, attribution: "Management", period: "FY2024" });
  const newer = await post("/claims", { ...base, attribution: "Seller", period: "FY2025" });
  assert.equal(older.statusCode, 201, older.body); assert.equal(newer.statusCode, 201, newer.body);
  const payload = { claim_id: older.json().data.id, source_record_id: database.sourceRecordId, representation_id: database.representationId, locator: { kind: "sheet_cell", sheet: "Operating Case", cell: "F42" }, proposition: base.proposition, relationship: "supports", supported_scope: base.scope };
  const key = crypto.randomUUID(); const accepted = await post("/evidence-acceptances", payload, key);
  assert.equal(accepted.statusCode, 201, accepted.body);
  assert.equal(accepted.json().data.relationship.claim_id, older.json().data.id);
  assert.equal((await post("/evidence-acceptances", payload, key)).statusCode, 200);
  const projection = await api.inject({ method: "GET", url: `${root}/evidence/${accepted.json().data.id}`, headers: { cookie: database.cookie } });
  assert.deepEqual(projection.json().data[0].relationships.map((item: { claim_id: string }) => item.claim_id), [older.json().data.id]);
  assert.equal((await post("/evidence-acceptances", { ...payload, claim_id: crypto.randomUUID() })).statusCode, 404);
  assert.equal((await post("/evidence-acceptances", { ...payload, proposition: "Different proposition" })).statusCode, 404);
  const foreign = await fixture(); t.after(() => foreign.close());
  const denied = await api.inject({ method: "POST", url: `${root}/evidence-acceptances`, headers: { cookie: foreign.cookie, "idempotency-key": crypto.randomUUID() }, payload });
  assert.equal(denied.statusCode, 404);
});
