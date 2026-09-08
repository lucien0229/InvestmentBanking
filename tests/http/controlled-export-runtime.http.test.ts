import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { buildApi } from "../../apps/api/src/app.js";
import { createTestDatabase } from "../../apps/api/src/test-database.js";
import { hashToken } from "../../apps/api/src/database.js";
import { createWorkbookBasis } from "../helpers/workbook-basis.js";
import { prepareWorkbookObjective } from "../helpers/workbook-objective.js";
import { WorkbookRuntime } from "../../apps/api/src/workbook-runtime.js";

import { ExportRuntime } from "../../apps/api/src/export-worker.js";
import { LocalAuthAdapter } from "../../apps/api/src/auth.js";
import { canonicalJson, sha256 } from "../../apps/api/src/artifact-integrity.js";

test("Exact controlled loop exports real Office files with one leased identity and independent graduation", {skip: !process.env.OFFICE_RENDERER_SOCKET}, async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const email = `workbook-${crypto.randomUUID()}@example.test`;
  const cookie = await database.seedAuthenticatedSession(email);
  const actor = (
    await database.ownerPool.query(
      "SELECT a.id,aa.account_id FROM app.actor a JOIN app.account_actor aa ON aa.actor_id=a.id WHERE a.email_digest=$1",
      [hashToken(email)],
    )
  ).rows[0];
  const deal = crypto.randomUUID();
  await database.ownerPool.query(
    "INSERT INTO app.deal(id,account_id,name,client_label,transaction_subject,mandate_objective,business_stage) VALUES($1,$2,'Workbook synthetic acceptance','Synthetic','Synthetic valuation','Internal valuation review','Preparation')",
    [deal, actor.account_id],
  );
  await database.ownerPool.query(
    "INSERT INTO app.deal_workspace(account_id,deal_id,overview_revision_id,displayed_state,processing_posture,commercial_posture) VALUES($1,$2,'acceptance','{}','permitted','entitled')",
    [actor.account_id, deal],
  );
  const api = await buildApi({ database, authMode: "local" });
  t.after(() => api.close());
  api.addHook("onError", async (_request, _reply, error) => {
    process.stderr.write(`Acceptance error: ${error.message}\n`);
  });
  const url = `/api/v1/deals/${deal}/deliverables`;
  const deliverableKey = crypto.randomUUID();
  assert.equal((await api.inject({ method: "GET", url })).statusCode, 401);
  const objective = await prepareWorkbookObjective(
    database.ownerPool,
    api,
    actor.account_id,
    actor.id,
    deal,
    cookie,
  );
  const body = {
    work_objective_id: objective.id,
    title: "Analysis and Valuation Workbook",
    purpose: "Internal valuation review",
    audience: "Named Individual Banker",
    confidentiality: "internal",
  };
  const created = await api.inject({
    method: "POST",
    url,
    headers: { cookie, "idempotency-key": deliverableKey },
    payload: body,
  });
  assert.equal(created.statusCode, 201, created.body);
  const id = created.json().data.id;
  const sourceFragment = (
    await database.ownerPool.query(
      "SELECT id,representation_id,locator FROM source.source_fragment WHERE source_record_id=$1 AND content_text='Cash,4.7'",
      [objective.source_record_id],
    )
  ).rows[0];
  const command = async (path: string, payload: Record<string, unknown>) => {
    const response = await api.inject({
      method: "POST",
      url: `/api/v1/deals/${deal}/${path}`,
      headers: { cookie, "idempotency-key": crypto.randomUUID() },
      payload,
    });
    assert.equal(response.statusCode, 201, response.body);
    return response.json().data;
  };
  const claim = await command("claims", {
    proposition: "Synthetic Cash is 4.7 USD million",
    attribution: "Synthetic CSV",
    definition: "cash",
    period: "FY2025E",
    unit: "USD million",
    currency: "USD",
    sign: "positive",
    value: "4.7",
    purpose: body.purpose,
    scope: "Synthetic valuation acceptance",
  });
  const evidence = await command("evidence-acceptances", {
    source_record_id: objective.source_record_id,
    representation_id: sourceFragment.representation_id,
    locator: sourceFragment.locator,
    proposition: "Synthetic Cash is 4.7 USD million",
    relationship: "supports",
    supported_scope: "Synthetic valuation acceptance",
    qualification: "Controlled synthetic parser fixture",
    limitation: null,
  });
  const fact = await command(`claims/${claim.id}/fact-acceptances`, {
    evidence_relationship_ids: [evidence.relationship.id],
    purpose: body.purpose,
    scope: "Synthetic valuation acceptance",
    rationale: "Exact synthetic CSV row supports the disclosed Cash value.",
    alternatives: [],
    contrary_evidence: [],
  });
  await command("normalized-financial-values", {
    definition: "cash",
    period: "FY2025E",
    unit: "USD million",
    currency: "USD",
    sign: "positive",
    precision: 1,
    value_text: "4.7",
    actual_forecast: "forecast",
    source_locator: sourceFragment.locator,
    source_fragment_id: sourceFragment.id,
    decision_id: fact.human_decision.id,
  });
  const basis = await createWorkbookBasis(api, deal, cookie, {
    id: fact.id,
    decisionId: fact.human_decision.id,
    locator: sourceFragment.locator,
  });
  const accepted = await api.inject({
    method: "POST",
    url: `${url}/${id}/revisions`,
    headers: {
      cookie,
      "idempotency-key": crypto.randomUUID(),
      "if-match": '"1"',
    },
    payload: {
      basis: [basis],
      limitations: ["Synthetic development acceptance only"],
    },
  });
  assert.equal(accepted.statusCode, 202, accepted.body);

  const revision = accepted.json().data.revision_id;
  await database.ownerPool.query("INSERT INTO deliverable.development_acceptance_scope(account_id,deal_id,revision_id,profile,reason) VALUES($1,$2,$3,'development_foss_v1','Controlled export synthetic acceptance')", [actor.account_id,deal,revision]);
  const workbook = new WorkbookRuntime(); t.after(() => workbook.close());
  const root = `/api/v1/deals/${deal}`;
  for (let attempt=0;attempt<8;attempt++) {
    await workbook.runOnce();
    const current = await api.inject({url:`/api/v1/jobs/${accepted.json().data.id}`,headers:{cookie}});
    if(current.json().state==='completed') break;
    assert.notEqual(current.json().state,'failed_terminal',current.body);
  }
  const read = async(path:string) => {const r=await api.inject({url:root+path,headers:{cookie}});assert.equal(r.statusCode,200,r.body);return r.json().data;};
  await command("deterministic-validation-runs", { calculation_run_id: basis.calculation_run_id, validation_code: "EV-EQ-TIE-004" });
  const loop=await read(`/guide/revisions/${revision}`);
  assert.ok(loop.evidence[0].source_context.length>0,'Exact source context must accompany Evidence');
  assert.equal((await read('/guide')).first_value,null);
  for(const checkpoint of ['evidence','decision_validation','native','reader','readiness']) {
    const response=await api.inject({method:'POST',url:root+'/guide/observations',headers:{cookie,'idempotency-key':crypto.randomUUID()},payload:{revision_id:revision,checkpoint,inspection_digest:loop.inspection_digest}});
    assert.equal(response.statusCode,201,response.body);
  }
  const firstValue=await read('/guide'); assert.ok(firstValue.first_value); assert.equal(firstValue.first_export,null);assert.equal(firstValue.graduation,null);
  const reviewResponse=await api.inject({method:'POST',url:root+'/internal-export-reviews',headers:{cookie,'idempotency-key':crypto.randomUUID()},payload:{revision_id:revision,purpose:'inspection'}});
  assert.equal(reviewResponse.statusCode,201,reviewResponse.body); const review=reviewResponse.json().data;
  assert.deepEqual(review.scope.hard_blockers,[],JSON.stringify(review.scope.hard_blockers));
  assert.notEqual(review.scope.readiness.posture,'circulation_candidate','Ordinary readiness gaps must be retained and exportable');
  const requestBody={review_id:review.id,acknowledge_internal_use:true};const key=crypto.randomUUID();
  const headers={cookie,'idempotency-key':key,'if-match':`"${review.dependency_digest}"`};
  const grantBody={deal_id:deal,action:'internal_controlled_export',resource_id:review.id,dependency_digest:review.dependency_digest,idempotency_key:key,command:requestBody};
  const grant=()=>api.inject({method:'POST',url:'/api/v1/sensitive-action-grants',headers:{cookie},payload:grantBody});
  const noFresh=await grant();assert.equal(noFresh.statusCode,409,noFresh.body);
  const raw=cookie.split(';')[0].split('=')[1];await new LocalAuthAdapter(database).authenticatePasskey(raw);
  const expired=await grant();assert.equal(expired.statusCode,201,expired.body);
  await database.ownerPool.query("UPDATE external_use.sensitive_action_grant SET expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",[expired.json().data.id]);
  const stale=await api.inject({method:'POST',url:root+'/internal-controlled-exports',headers:{...headers,'sensitive-action-grant':expired.json().data.grant_token},payload:requestBody});assert.equal(stale.statusCode,409,stale.body);
  assert.equal((await read('/internal-controlled-exports')).length,0);
  const issued=await grant();assert.equal(issued.statusCode,201,issued.body);
  const denied=await api.inject({method:'POST',url:root+'/internal-controlled-exports',headers:{...headers,'sensitive-action-grant':issued.json().data.grant_token,'idempotency-key':crypto.randomUUID()},payload:requestBody});assert.equal(denied.statusCode,409,denied.body);
  const otherSession=await database.seedAuthenticatedSession(email);
  const wrongSession=await api.inject({method:'POST',url:root+'/internal-controlled-exports',headers:{...headers,cookie:otherSession,'sensitive-action-grant':issued.json().data.grant_token},payload:requestBody});assert.equal(wrongSession.statusCode,409,wrongSession.body);
  const unconsumed=await database.ownerPool.query('SELECT consumed_at FROM external_use.sensitive_action_grant WHERE id=$1',[issued.json().data.id]);assert.equal(unconsumed.rows[0].consumed_at,null);
  const responses=await Promise.all([1,2].map(()=>api.inject({method:'POST',url:root+'/internal-controlled-exports',headers:{...headers,'sensitive-action-grant':issued.json().data.grant_token},payload:requestBody})));
  for(const response of responses) assert.equal(response.statusCode,202,response.body);
  const exported=responses[0].json().data;assert.equal(responses[1].json().data.export_id,exported.export_id);
  const replay=await api.inject({method:'POST',url:root+'/internal-controlled-exports',headers,payload:requestBody});assert.equal(replay.statusCode,202,replay.body);assert.equal(replay.json().data.export_id,exported.export_id);
  const runtime=new ExportRuntime();t.after(()=>runtime.close());await runtime.runOnce();
  const receipt=await read(`/internal-controlled-exports/${exported.export_id}`);assert.equal(receipt.state,'completed',JSON.stringify(receipt));assert.ok(receipt.archive);
  const manifest=receipt.archive.manifest;assert.equal(manifest.manifest.external_use_authorized,false);assert.equal(manifest.manifest.revision_id,revision);assert.equal(manifest.manifest.members[0].path,'index.html');
  assert.ok(crypto.verify(null,Buffer.from(canonicalJson(manifest.manifest)),manifest.public_key_pem,Buffer.from(manifest.signature,'base64')));
  assert.equal(JSON.stringify(manifest).includes('storage_key'),false);
  const downloadKey=crypto.randomUUID(),downloadBody={export_id:receipt.id,purpose:'internal_export_download'};
  const downloadGrant=await api.inject({method:'POST',url:'/api/v1/sensitive-action-grants',headers:{cookie},payload:{deal_id:deal,action:'export_object_retrieval',resource_id:receipt.id,dependency_digest:receipt.archive.sha256,idempotency_key:downloadKey,command:downloadBody}});assert.equal(downloadGrant.statusCode,201,downloadGrant.body);
  const objectGrant=await api.inject({method:'POST',url:root+`/internal-controlled-exports/${receipt.id}/object-grants`,headers:{cookie,'idempotency-key':downloadKey,'if-match':`"${receipt.archive.sha256}"`,'sensitive-action-grant':downloadGrant.json().data.grant_token},payload:downloadBody});assert.equal(objectGrant.statusCode,201,objectGrant.body);
  const zip=await api.inject({url:root+`/internal-controlled-exports/${receipt.id}/content`,headers:{cookie,authorization:`ObjectGrant ${objectGrant.json().data.grant_token}`}});assert.equal(zip.statusCode,200,zip.body.slice(0,200));assert.equal(sha256(zip.rawPayload),receipt.archive.sha256);
  const guide=await read('/guide');assert.equal(guide.first_value.id,firstValue.first_value.id);assert.equal(guide.graduation,null);
  const graduation=await api.inject({method:'POST',url:root+'/guide/graduations',headers:{cookie,'idempotency-key':crypto.randomUUID(),'if-match':`"${guide.etag}"`},payload:{intent:'enter_deal_execution_desk'}});assert.equal(graduation.statusCode,201,graduation.body);
  const graduated=await read('/guide');assert.equal(graduated.mode,'execution_desk');assert.ok(graduated.graduation);
  const history=await read('/guide/history');assert.equal(history.exports.length,1);assert.equal(history.measurement.filter((e:{event_code:string})=>e.event_code==='first_value_completed').length,1);assert.equal(history.measurement.filter((e:{event_code:string})=>e.event_code==='internal_export_completed').length,1);
  assert.ok(history.audit.some((e:{code:string})=>e.code==='internal_export.completed'));
  const alternate=await api.inject({method:'POST',url:root+'/internal-export-reviews',headers:{cookie,'idempotency-key':crypto.randomUUID()},payload:{revision_id:revision,purpose:'backup'}});assert.equal(alternate.statusCode,201,alternate.body);
  const backup=alternate.json().data,backupKey=crypto.randomUUID(),backupBody={review_id:backup.id,acknowledge_internal_use:true};
  const collision=await api.inject({method:'POST',url:root+'/internal-controlled-exports',headers,payload:backupBody});assert.equal(collision.statusCode,409,collision.body);assert.equal(collision.json().code,'idempotency_key_reused');
  const backupGrant=await api.inject({method:'POST',url:'/api/v1/sensitive-action-grants',headers:{cookie},payload:{...grantBody,resource_id:backup.id,dependency_digest:backup.dependency_digest,idempotency_key:backupKey,command:backupBody}});assert.equal(backupGrant.statusCode,201,backupGrant.body);
  const second=await api.inject({method:'POST',url:root+'/internal-controlled-exports',headers:{cookie,'idempotency-key':backupKey,'if-match':`"${backup.dependency_digest}"`,'sensitive-action-grant':backupGrant.json().data.grant_token},payload:backupBody});assert.equal(second.statusCode,202,second.body);
  const secondId=second.json().data.export_id;
  const operate=async(action:string)=>{const current=await read(`/internal-controlled-exports/${secondId}`);const r=await api.inject({method:'POST',url:root+`/internal-controlled-exports/${secondId}/controls`,headers:{cookie,'idempotency-key':crypto.randomUUID(),'if-match':`"${current.row_version}"`},payload:{action}});assert.equal(r.statusCode,201,r.body);return r.json().data;};
  assert.equal((await operate('cancel')).state,'canceled');assert.equal((await operate('retry')).state,'queued');
  const failingRuntime=new ExportRuntime({signer:{async sign(){throw new Error('export_signer_unavailable');}}});t.after(()=>failingRuntime.close());await failingRuntime.runOnce();
  assert.equal((await read(`/internal-controlled-exports/${secondId}`)).state,'failed_retryable');
  await operate('retry');await runtime.runOnce();assert.equal((await read(`/internal-controlled-exports/${secondId}`)).state,'completed');
  assert.equal((await read('/internal-controlled-exports')).length,2,'Cancel/failure/resume preserve one identity for each accepted command');
  const preserved=await read('/guide');assert.equal(preserved.first_value.id,firstValue.first_value.id);assert.equal(preserved.graduation.id,graduated.graduation.id);
  const scopes=await database.ownerPool.query("SELECT s.operation_code,s.revoked_at,a.outcome FROM jobs.job_scope s JOIN jobs.job_attempt a ON a.id=s.attempt_id WHERE s.job_id=$1",[exported.id]);assert.equal(scopes.rows[0].operation_code,'internal_controlled_export');assert.equal(scopes.rows[0].outcome,'succeeded');assert.ok(scopes.rows[0].revoked_at);
});
