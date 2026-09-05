import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import test, { type TestContext } from "node:test";
import { buildApi } from "../../apps/api/src/app.js";
import { HelloXAiProvider } from "../../apps/api/src/ai-source-proposals.js";
import { createTestDatabase } from "../../apps/api/src/test-database.js";
import { hashToken } from "../../apps/api/src/database.js";
import { prepareWorkbookObjective } from "../helpers/workbook-objective.js";

const dealId = "00000000-0000-4000-8000-000000000101";
function decrypt(bytes: Buffer) {
  assert.equal(bytes.subarray(0,5).toString(), "IBAI1");
  const key = crypto.createHash("sha256").update(process.env.AI_RUN_PROTECTED_KEY ?? "test-only-ai-run-protected-key").digest();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, bytes.subarray(5,17)); decipher.setAuthTag(bytes.subarray(17,33));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(33)),decipher.final()]).toString());
}
async function setup(t: TestContext, provider: HelloXAiProvider) {
  const database = await createTestDatabase(); t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local", aiProvider: provider, referenceJobRuntime: { autoRun: false } }); t.after(() => api.close());
  const cookie = await database.seedAuthenticatedSession("banker-a@example.test");
  const scope = await database.withContext(cookie.split("=")[1]!.split(";")[0]!,dealId,async (_client,context) => context); assert.equal(scope.kind,"ok"); if(scope.kind!=="ok")throw new Error("fixture_scope");
  const objective = await prepareWorkbookObjective(database.ownerPool,api,scope.value.accountId,scope.value.actorId,dealId,cookie);
  const createScope = async () => {
    const accepted = await api.inject({method:"POST",url:`/api/v1/deals/${dealId}/reference-jobs`,headers:{cookie,"idempotency-key":crypto.randomUUID()},payload:{purpose:"reference_workspace_build",inputs:{source_packet:"northstar-source-packet-v1",requested_scope:"synthetic_reference_fixture"}}}); assert.equal(accepted.statusCode,202,accepted.body);
    const token = hashToken(crypto.randomUUID());
    const claim = (await database.ownerPool.query("SELECT * FROM jobs.claim_reference_step($1,'reference_worker','reference-worker-credential-v1',$2)",[accepted.json().id,token])).rows[0]; assert.ok(claim);
    // Disclosed acceptance harness: keep the real issued lease alive while the
    // existing source-proposal HTTP seam calls the external provider.
    const heartbeat = setInterval(()=>void database.ownerPool.query("SELECT jobs.heartbeat_reference_step($1,$2)",[claim.scope_id,token]).catch(()=>undefined),20000);
    t.after(()=>clearInterval(heartbeat));
    return {job_id:accepted.json().id,job_scope_id:claim.scope_id,packet_version_id:objective.packet_version_id,work_objective_id:objective.id};
  };
  return {database,api,cookie,createScope};
}

test("full encrypted AI wire request is committed before transport and survives provider failure", async (t) => {
  let observe: ((body: unknown)=>Promise<void>) | undefined;
  let observerError: unknown;
  const server = http.createServer(async (request,response) => {
    try { const chunks=[]; for await(const chunk of request)chunks.push(chunk); await observe?.(JSON.parse(Buffer.concat(chunks).toString())); }
    catch(error){ observerError=error; }
    response.writeHead(503, {"content-type":"application/json"}).end('{"error":"controlled transport failure"}');
  });
  await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve)); t.after(()=>new Promise<void>(resolve=>server.close(()=>resolve())));
  const address=server.address(); assert.ok(address&&typeof address!=="string");
  const fixture=await setup(t,new HelloXAiProvider({baseUrl:`http://127.0.0.1:${address.port}`,apiKey:"synthetic-transport-key"}));
  const input=await fixture.createScope();
  observe=async body=>{
    const rows=(await fixture.database.ownerPool.query("SELECT e.evidence_kind,e.ciphertext FROM ai.provider_request_evidence e JOIN ai.run r ON r.id=e.run_id WHERE r.job_scope_id=$1",[input.job_scope_id])).rows;
    assert.equal(rows.length,2,"A separate connection must see both committed evidence records before transport");
    const wire=decrypt(rows.find(row=>row.evidence_kind==="provider_request").ciphertext);
    assert.deepEqual(wire.body,body); assert.equal(JSON.stringify(wire).includes("synthetic-transport-key"),false);
    const envelope=decrypt(rows.find(row=>row.evidence_kind==="input_envelope").ciphertext);
    assert.ok(envelope.envelope.canonical_input_digest); assert.ok(envelope.fragments.length>0);
  };
  const response=await fixture.api.inject({method:"POST",url:`/api/v1/deals/${dealId}/ai-runs`,headers:{cookie:fixture.cookie,"idempotency-key":crypto.randomUUID()},payload:{...input,task_definition:"source_claim_extraction"}});
  assert.ifError(observerError); assert.equal(response.statusCode,503,response.body);
  const run=(await fixture.database.ownerPool.query("SELECT id,status_code,outcome_class FROM ai.run WHERE job_scope_id=$1",[input.job_scope_id])).rows[0]; assert.equal(run.status_code,"failed"); assert.equal(run.outcome_class,"provider_failure");
  const projection=await fixture.api.inject({method:"GET",url:`/api/v1/deals/${dealId}/ai-runs/${run.id}`,headers:{cookie:fixture.cookie}}); assert.equal(projection.statusCode,200); assert.doesNotMatch(projection.body,/raw_request_ciphertext|content_text|synthetic-transport-key/);
  const other=await fixture.database.seedAuthenticatedSession("banker-b@example.test");
  assert.equal((await fixture.api.inject({method:"GET",url:`/api/v1/deals/${dealId}/ai-runs`,headers:{cookie:other}})).statusCode,404);
});

test("all three Source proposal families complete against the configured HelloX provider", {skip:!process.env.REAL_SOURCE_AI,timeout:1_900_000}, async(t)=>{
  const fixture=await setup(t,new HelloXAiProvider());
  const tasks=["source_claim_extraction","claim_evidence_linking","material_source_conflict_analysis"].filter(task=>!process.env.REAL_SOURCE_AI_TASK||process.env.REAL_SOURCE_AI_TASK.split(",").includes(task));
  assert.ok(tasks.length,"Select a recognized Source task family");
  for(const task of tasks) await t.test(task,async(t)=>{
    const scope=await fixture.createScope();
    const response=await fixture.api.inject({method:"POST",url:`/api/v1/deals/${dealId}/ai-runs`,headers:{cookie:fixture.cookie,"idempotency-key":crypto.randomUUID()},payload:{...scope,task_definition:task}});
    if(response.statusCode!==201){const failure=(await fixture.database.ownerPool.query("SELECT r.status_code,r.outcome_class,v.code FROM ai.run r LEFT JOIN ai.run_validation v ON v.run_id=r.id WHERE r.job_scope_id=$1",[scope.job_scope_id])).rows;t.diagnostic(JSON.stringify({task,status:response.statusCode,failure}));}
    assert.equal(response.statusCode,201,response.body);
    const run=response.json().data; assert.ok(["completed","abstained"].includes(run.status));
    const evidence=(await fixture.database.ownerPool.query("SELECT evidence_kind,ciphertext FROM ai.provider_request_evidence WHERE run_id=$1",[run.id])).rows; assert.equal(evidence.length,2);
    const wire=decrypt(evidence.find(row=>row.evidence_kind==="provider_request").ciphertext); assert.equal(wire.body.model,"gpt-5.6-sol"); assert.ok(JSON.parse(wire.body.messages[1].content).fragments.length>0);
    t.diagnostic(JSON.stringify({task,run_id:run.id,status:run.status,request_reconstructable:true}));
  });
});
