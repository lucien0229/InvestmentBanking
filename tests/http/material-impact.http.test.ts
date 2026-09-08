import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { buildApi } from "../../apps/api/src/app.js";
import { createTestDatabase } from "../../apps/api/src/test-database.js";
import { hashToken } from "../../apps/api/src/database.js";
import { createWorkbookBasis } from "../helpers/workbook-basis.js";

async function setup() {
  const database = await createTestDatabase();
  const email = `impact-${crypto.randomUUID()}@example.test`;
  const cookie = await database.seedAuthenticatedSession(email);
  const actor = (await database.ownerPool.query<{ id: string; account_id: string }>(
    "SELECT a.id,aa.account_id FROM app.actor a JOIN app.account_actor aa ON aa.actor_id=a.id WHERE a.email_digest=$1",
    [hashToken(email)],
  )).rows[0]!;
  const dealId = crypto.randomUUID();
  await database.ownerPool.query("INSERT INTO app.deal(id,account_id,name,client_label,transaction_subject,mandate_objective,business_stage) VALUES($1,$2,'Impact acceptance','Synthetic','Synthetic valuation','Internal valuation review','Preparation')", [dealId, actor.account_id]);
  await database.ownerPool.query("INSERT INTO app.deal_workspace(account_id,deal_id,overview_revision_id,displayed_state,processing_posture,commercial_posture) VALUES($1,$2,'acceptance','{}','permitted','entitled')", [actor.account_id, dealId]);
  const api = await buildApi({ database, authMode: "local" });
  const basis = await createWorkbookBasis(api, dealId, cookie);
  const version = (await database.ownerPool.query<{ id: string }>("SELECT calculation_version_id AS id FROM analysis.calculation_run WHERE id=$1", [basis.calculation_run_id])).rows[0]!;
  return { database, api, cookie, dealId, versionId: version.id };
}

test("material impact HTTP loop rejects foreign triggers, replays, resolves every action, and closes", async (t) => {
  const f = await setup(); t.after(() => f.api.close()); t.after(() => f.database.close());
  const postChange = (triggerObjectId: string, key: string, deal = f.dealId) => f.api.inject({
    method: "POST",
    url: `/api/v1/deals/${deal}/material-changes`,
    headers: { cookie: f.cookie, "idempotency-key": key },
    payload: {
      trigger_kind: "calculation_version",
      trigger_object_id: triggerObjectId,
      reason: "The pinned calculation method changed and requires an exact downstream impact review.",
      basis: { test: "material-impact-http" },
    },
  });

  const unknown = await postChange(crypto.randomUUID(), crypto.randomUUID());
  assert.equal(unknown.statusCode, 404, unknown.body);

  const other = await setup();
  t.after(() => other.api.close()); t.after(() => other.database.close());
  const crossDeal = await postChange(other.versionId, crypto.randomUUID());
  assert.equal(crossDeal.statusCode, 404, crossDeal.body);

  const key = crypto.randomUUID();
  const created = await postChange(f.versionId, key);
  assert.equal(created.statusCode, 201, created.body);
  const replay = await postChange(f.versionId, key);
  assert.equal(replay.statusCode, 200, replay.body);
  assert.equal(replay.json().data.id, created.json().data.id);
  assert.equal(replay.json().data.idempotent_replayed, true);

  const assessmentId = created.json().data.id as string;
  const projection = await f.api.inject({ method: "GET", url: `/api/v1/deals/${f.dealId}/impact-assessments/${assessmentId}`, headers: { cookie: f.cookie } });
  assert.equal(projection.statusCode, 200, projection.body);
  const items = projection.json().data.items as Array<Record<string, unknown>>;
  assert.ok(items.length > 1, "fixture must expose independent impact items");
  const requiredActions = (item: Record<string, unknown>) => [
    item.recalculation_required ? "recalculate" : null,
    item.regeneration_required ? "regenerate" : null,
    item.rereview_required ? "rereview" : null,
    item.circulation_blocked ? "block_circulation" : null,
    item.impact_code === "unaffected" ? "retain_unaffected" : null,
  ].filter(Boolean) as string[];
  const disposition = (item: Record<string, unknown>, action: string, keyFor: string) => f.api.inject({ method: "POST", url: `/api/v1/deals/${f.dealId}/impact-assessments/${assessmentId}/dispositions`, headers: { cookie: f.cookie, "idempotency-key": keyFor }, payload: { items: [{ impact_item_id: item.id, disposition_code: action }], rationale: "Reviewed exact dependency closure and recorded the bounded recovery action." } });
  const first = await disposition(items[0]!, requiredActions(items[0]!)[0]!, crypto.randomUUID());
  assert.equal(first.statusCode, 201, first.body);
  const incomplete = await f.api.inject({ method: "GET", url: `/api/v1/deals/${f.dealId}/impact-assessments/${assessmentId}`, headers: { cookie: f.cookie } });
  assert.notEqual(incomplete.json().data.status, "recovered");
  for (const item of items) for (const action of requiredActions(item)) {
    if (item === items[0] && action === requiredActions(items[0]!)[0]) continue;
    const response = await disposition(item, action, crypto.randomUUID()); assert.equal(response.statusCode, 201, response.body);
  }
  const complete = await f.api.inject({ method: "GET", url: `/api/v1/deals/${f.dealId}/impact-assessments/${assessmentId}`, headers: { cookie: f.cookie } });
  assert.equal(complete.json().data.status, "recovered", complete.body);
  const after = await disposition(items[0]!, requiredActions(items[0]!)[0]!, crypto.randomUUID());
  assert.equal(after.statusCode, 409, after.body);
});
