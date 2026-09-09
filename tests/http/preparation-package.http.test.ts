import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { buildApi } from "../../apps/api/src/app.js";
import { createTestDatabase } from "../../apps/api/src/test-database.js";
import { hashToken } from "../../apps/api/src/database.js";

test("Preparation Package commands freeze an exact snapshot and expose blocker-first readiness", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const email = `package-${crypto.randomUUID()}@example.test`;
  const cookie = await database.seedAuthenticatedSession(email);
  const actor = (await database.ownerPool.query<{ id: string; account_id: string }>(
    "SELECT a.id,aa.account_id FROM app.actor a JOIN app.account_actor aa ON aa.actor_id=a.id WHERE a.email_digest=$1",
    [hashToken(email)],
  )).rows[0]!;
  const dealId = crypto.randomUUID();
  await database.ownerPool.query(
    "INSERT INTO app.deal(id,account_id,name,client_label,transaction_subject,mandate_objective,business_stage) VALUES($1,$2,'Package acceptance','Synthetic','Synthetic execution','Preparation package acceptance','Preparation')",
    [dealId, actor.account_id],
  );
  await database.ownerPool.query(
    "INSERT INTO app.deal_workspace(account_id,deal_id,overview_revision_id,displayed_state,processing_posture,commercial_posture) VALUES($1,$2,'acceptance','{}','permitted','entitled')",
    [actor.account_id, dealId],
  );
  const api = await buildApi({ database, authMode: "local" });
  t.after(() => api.close());
  api.addHook("onError", async (_request, _reply, error) => { process.stderr.write(`Preparation Package error: ${error.message}\n`); });
  const root = `/api/v1/deals/${dealId}/execution-packages`;
  assert.equal((await api.inject({ method: "GET", url: root })).statusCode, 401);
  const body = { purpose: "Preparation launch package and controlled auction execution" };
  const created = await api.inject({ method: "POST", url: root, headers: { cookie, "idempotency-key": crypto.randomUUID() }, payload: body });
  assert.equal(created.statusCode, 201, created.body);
  const packageId = created.json().data.id as string;
  const revisionId = crypto.randomUUID();
  const deliverableId = crypto.randomUUID();
  const auctionRevisionId = crypto.randomUUID();
  const auctionDeliverableId = crypto.randomUUID();
  await database.ownerPool.query(
    "INSERT INTO deliverable.deliverable(id,account_id,deal_id,deliverable_type,title,purpose,audience,confidentiality,owner_id) VALUES($1,$2,$3,'analysis_valuation_workbook','Synthetic valuation workbook',$4,'Named Individual Banker','internal',$5)",
    [deliverableId, actor.account_id, dealId, body.purpose, actor.id],
  );
  await database.ownerPool.query(
    "INSERT INTO deliverable.deliverable_revision(id,account_id,deal_id,deliverable_id,ordinal,purpose,audience,confidentiality,template_version,build_input,basis_digest,created_by) VALUES($1,$2,$3,$4,1,$5,'Named Individual Banker','internal','analysis-valuation-1.0.0','{}',$6,$7)",
    [revisionId, actor.account_id, dealId, deliverableId, body.purpose, "a".repeat(64), actor.id],
  );
  await database.ownerPool.query(
    "INSERT INTO deliverable.deliverable(id,account_id,deal_id,deliverable_type,title,purpose,audience,confidentiality,owner_id) VALUES($1,$2,$3,'auction_control_workbook','Synthetic auction workbook',$4,'Named Individual Banker','internal',$5)",
    [auctionDeliverableId, actor.account_id, dealId, body.purpose, actor.id],
  );
  await database.ownerPool.query(
    "INSERT INTO deliverable.deliverable_revision(id,account_id,deal_id,deliverable_id,ordinal,purpose,audience,confidentiality,template_version,build_input,basis_digest,created_by) VALUES($1,$2,$3,$4,1,$5,'Named Individual Banker','internal','analysis-valuation-1.0.0','{}',$6,$7)",
    [auctionRevisionId, actor.account_id, dealId, auctionDeliverableId, body.purpose, "b".repeat(64), actor.id],
  );
  await database.ownerPool.query("UPDATE deliverable.deliverable SET current_revision_id=$1 WHERE id=$2", [revisionId, deliverableId]);
  await database.ownerPool.query("UPDATE deliverable.deliverable SET current_revision_id=$1 WHERE id=$2", [auctionRevisionId, auctionDeliverableId]);
  const snapshot = await api.inject({
    method: "POST", url: `${root}/${packageId}/snapshots`, headers: { cookie, "idempotency-key": crypto.randomUUID(), "if-match": '"1"' },
    payload: { revisions: [{ revision_id: revisionId, package_role: "analysis_valuation_workbook", inclusion_reason: "Current exact revision", stage_applicability: "always_required" }, { revision_id: auctionRevisionId, package_role: "auction_control_workbook", inclusion_reason: "Current exact revision", stage_applicability: "always_required" }], controls: [], dependencies: [], omissions: [], limitations: [], reason: "Freeze exact package perimeter" },
  });
  assert.equal(snapshot.statusCode, 201, snapshot.body);
  const snapshotId = snapshot.json().data.id as string;
  const readiness = await api.inject({ method: "GET", url: `${root}/${packageId}/snapshots/${snapshotId}/readiness?purpose=${encodeURIComponent(body.purpose)}&audience=Named%20Individual%20Banker`, headers: { cookie } });
  assert.equal(readiness.statusCode, 200, readiness.body);
  assert.equal(readiness.json().data.external_use_authorized, false);
  assert.equal(readiness.json().data.scalar_score, null);
  assert.equal(readiness.json().data.package_readiness, "blocked");
  assert.ok(readiness.json().data.blockers.some((item: { requirement: string }) => item.requirement === "Source / Evidence perimeter"));
  await assert.rejects(database.ownerPool.query("DELETE FROM deal.package_snapshot WHERE id=$1", [snapshotId]), /package_snapshot_immutable/);
});
