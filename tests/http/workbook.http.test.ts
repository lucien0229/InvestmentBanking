import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import pg from "pg";
import { buildApi } from "../../apps/api/src/app.js";
import { createTestDatabase } from "../../apps/api/src/test-database.js";
import { hashToken } from "../../apps/api/src/database.js";
import { createWorkbookBasis } from "../helpers/workbook-basis.js";
import { prepareWorkbookObjective } from "../helpers/workbook-objective.js";
import { WorkbookRuntime } from "../../apps/api/src/workbook-runtime.js";

test("Workbook HTTP commands are authenticated, scoped, idempotent and version guarded", async (t) => {
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
  const key = crypto.randomUUID();
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
    headers: { cookie, "idempotency-key": key },
    payload: body,
  });
  assert.equal(created.statusCode, 201, created.body);
  const id = created.json().data.id;
  const replay = await api.inject({
    method: "POST",
    url,
    headers: { cookie, "idempotency-key": key },
    payload: body,
  });
  assert.equal(replay.json().data.id, id, replay.body);
  const collision = await api.inject({
    method: "POST",
    url,
    headers: { cookie, "idempotency-key": key },
    payload: { ...body, title: "Different" },
  });
  assert.equal(collision.statusCode, 409, collision.body);
  assert.equal(
    (
      await api.inject({
        method: "GET",
        url: `/api/v1/deals/${crypto.randomUUID()}/deliverables/${id}`,
        headers: { cookie },
      })
    ).statusCode,
    404,
  );
  const version = await api.inject({
    method: "POST",
    url: `${url}/${id}/revisions`,
    headers: { cookie, "idempotency-key": crypto.randomUUID() },
    payload: { basis: [], limitations: [] },
  });
  assert.equal(version.statusCode, 428, version.body);
  const revision = await api.inject({
    method: "POST",
    url: `${url}/${id}/revisions`,
    headers: {
      cookie,
      "idempotency-key": crypto.randomUUID(),
      "if-match": '"1"',
    },
    payload: {
      basis: [
        {
          calculation_run_id: crypto.randomUUID(),
          model_version_id: crypto.randomUUID(),
          scenario_version_id: crypto.randomUUID(),
        },
      ],
      limitations: [],
    },
  });
  assert.equal(revision.statusCode, 409, revision.body);
  const list = await api.inject({ method: "GET", url, headers: { cookie } });
  assert.equal(list.json().data.length, 1, list.body);
  const naked = await database.pool.query(
    "SELECT count(*)::int AS count FROM deliverable.deliverable",
  );
  assert.equal(naked.rows[0].count, 0);
  await assert.rejects(
    database.pool.query("UPDATE deliverable.deliverable SET title='forged'"),
    /permission denied/,
  );
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
  const profileReadinessUrl = `${url}/${id}/revisions/${accepted.json().data.revision_id}/readiness?purpose=${encodeURIComponent(body.purpose)}&audience=${encodeURIComponent(body.audience)}`;
  const productionReadiness = await api.inject({method:"GET",url:profileReadinessUrl,headers:{cookie}});
  assert.equal(productionReadiness.statusCode,200,productionReadiness.body);
  assert.equal(productionReadiness.json().data.acceptance_profile,"production_v1");
  await assert.rejects(database.pool.query("INSERT INTO deliverable.development_acceptance_scope(account_id,deal_id,revision_id,profile,reason) VALUES($1,$2,$3,'development_foss_v1','Synthetic authorized acceptance')",[actor.account_id,deal,accepted.json().data.revision_id]),/permission denied/);
  await database.ownerPool.query("INSERT INTO deliverable.development_acceptance_scope(account_id,deal_id,revision_id,profile,reason) VALUES($1,$2,$3,'development_foss_v1','Synthetic authorized acceptance')",[actor.account_id,deal,accepted.json().data.revision_id]);
  const developmentReadiness = await api.inject({method:"GET",url:profileReadinessUrl,headers:{cookie}});
  assert.equal(developmentReadiness.json().data.acceptance_profile,"development_foss_v1");
  assert.equal(developmentReadiness.json().data.external_use_authorized,false);
  assert.notEqual(developmentReadiness.json().data.posture,"circulation_candidate");
  assert.equal(developmentReadiness.json().data.requirements.find((r:{code:string})=>r.code==="office_roundtrip").outcome,"missing");
  await assert.rejects(database.ownerPool.query("DELETE FROM deliverable.development_acceptance_scope WHERE revision_id=$1",[accepted.json().data.revision_id]),/immutable/);

  const exact = await api.inject({
    method: "GET",
    url: `${url}/${id}/revisions/${accepted.json().data.revision_id}`,
    headers: { cookie },
  });
  assert.equal(exact.statusCode, 200, exact.body);
  assert.equal(
    exact.json().data.build_input.calculations[0].expected_equity_value,
    "94.7",
  );
  const unrelated = await prepareWorkbookObjective(
    database.ownerPool,
    api,
    actor.account_id,
    actor.id,
    deal,
    cookie,
  );
  const otherRevision = await api.inject({
    method: "POST",
    url: `${url}/${id}/revisions`,
    headers: {
      cookie,
      "idempotency-key": crypto.randomUUID(),
      "if-match": '"2"',
    },
    payload: { basis: [basis], limitations: ["Same-Deal isolation observer"] },
  });
  assert.equal(otherRevision.statusCode, 202, otherRevision.body);
  const token = crypto.randomUUID();
  await database.ownerPool.query(
    "UPDATE deliverable.workbook_job SET lease_hash=$2,lease_expires_at=now()+interval '2 minutes',attempt=1 WHERE job_id=$1",
    [accepted.json().data.id, hashToken(token)],
  );
  const worker = new pg.Client({
    connectionString: process.env.JOB_WORKER_DATABASE_URL,
  });
  await worker.connect();
  try {
    await worker.query("BEGIN");
    await worker.query("SELECT deliverable.begin_workbook_step($1,$2)", [
      accepted.json().data.id,
      token,
    ]);
    assert.equal(
      (
        await worker.query(
          "SELECT count(*)::int AS count FROM source.source_record WHERE id=$1",
          [unrelated.source_record_id],
        )
      ).rows[0].count,
      0,
      "A same-Deal Source Record outside the accepted Packet must be unreadable",
    );
    assert.equal(
      (
        await worker.query(
          "SELECT count(*)::int AS count FROM deliverable.deliverable_revision WHERE id=$1",
          [otherRevision.json().data.revision_id],
        )
      ).rows[0].count,
      0,
      "A same-Deal unrelated Revision must be unreadable",
    );
    const expectedFragments = (
      await database.ownerPool.query(
        "SELECT count(*)::int AS count FROM source.source_fragment f JOIN source.source_packet_member m ON m.source_record_id=f.source_record_id WHERE m.packet_version_id=$1",
        [objective.packet_version_id],
      )
    ).rows[0].count;
    assert.equal(
      (
        await worker.query(
          "SELECT count(*)::int AS count FROM source.source_fragment",
        )
      ).rows[0].count,
      expectedFragments,
    );
    const inputs = (
      await worker.query(
        "SELECT deliverable.get_workbook_ai_inputs($1) AS data",
        [accepted.json().data.revision_id],
      )
    ).rows[0].data;
    assert.equal(inputs.assumptions.length, 2);
    assert.equal(inputs.facts.length, 1);
    assert.equal(inputs.facts[0].id, fact.id);
    await assert.rejects(
      worker.query("SELECT deliverable.get_workbook_ai_inputs($1)", [
        otherRevision.json().data.revision_id,
      ]),
      /ai_artifact_scope_invalid/,
    );
  } finally {
    await worker.query("ROLLBACK");
    await worker.end();
    await database.ownerPool.query(
      "UPDATE deliverable.workbook_job SET lease_hash=NULL,lease_expires_at=NULL,attempt=0 WHERE job_id=$1",
      [accepted.json().data.id],
    );
  }
  const cancelOther = await api.inject({
    method: "POST",
    url: `/api/v1/jobs/${otherRevision.json().data.id}/cancellations`,
    headers: { cookie, "if-match": '"job-1"' },
    payload: { reason: "Same-Deal scope test complete" },
  });
  assert.equal(cancelOther.statusCode, 201, cancelOther.body);
  if (process.env.OFFICE_RENDERER_SOCKET) {
    const runtime = new WorkbookRuntime();
    t.after(() => runtime.close());
    for (let attempt = 0; attempt < 8; attempt++) {
      await runtime.runOnce();
      const job = await api.inject({
        method: "GET",
        url: `/api/v1/jobs/${accepted.json().data.id}`,
        headers: { cookie },
      });
      assert.equal(job.statusCode, 200, job.body);
      if (job.json().state === "completed") break;
      if (job.json().state === "failed_terminal") assert.fail(job.body);
    }
    const delivered = await api.inject({
      method: "GET",
      url: `${url}/${id}/revisions/${accepted.json().data.revision_id}`,
      headers: { cookie },
    });
    assert.ok(
      delivered
        .json()
        .data.artifacts.some((a: { role: string }) => a.role === "native"),
      delivered.body,
    );
    assert.ok(
      delivered
        .json()
        .data.artifacts.some((a: { role: string }) => a.role === "reader"),
      delivered.body,
    );
    const preview = delivered
      .json()
      .data.artifacts.find(
        (a: { role: string }) => a.role === "native_preview",
      );
    const granted = await api.inject({
      method: "POST",
      url: `/api/v1/deals/${deal}/artifacts/${preview.id}/preview-grants`,
      headers: { cookie },
      payload: { purpose: "artifact_inspection" },
    });
    assert.equal(granted.statusCode, 201, granted.body);
    const shown = await api.inject({
      method: "GET",
      url: `/api/v1/deals/${deal}/artifacts/${preview.id}/preview`,
      headers: {
        cookie,
        authorization: `ObjectGrant ${granted.json().data.grant_token}`,
      },
    });
    assert.equal(shown.statusCode, 200, shown.body.slice(0, 100));
    assert.equal(
      shown.rawPayload.subarray(0, 8).toString("hex"),
      "89504e470d0a1a0a",
    );
    const naked = await api.inject({
      method: "GET",
      url: `/api/v1/deals/${deal}/artifacts/${preview.id}/preview`,
      headers: { cookie },
    });
    assert.equal(naked.statusCode, 401);
    const readiness = await api.inject({
      method: "GET",
      url: `${url}/${id}/revisions/${accepted.json().data.revision_id}/readiness?purpose=Internal%20valuation%20review&audience=Named%20Individual%20Banker`,
      headers: { cookie },
    });
    assert.notEqual(
      readiness.json().data.posture,
      "circulation_candidate",
      readiness.body,
    );
    assert.equal(
      readiness
        .json()
        .data.requirements.find(
          (r: { code: string }) => r.code === "recalculation",
        ).outcome,
      "passed",
    );
    assert.equal(
      readiness
        .json()
        .data.requirements.find(
          (r: { code: string }) => r.code === "office_roundtrip",
        ).outcome,
      "missing",
    );
    assert.equal(
      readiness
        .json()
        .data.requirements.find(
          (r: { code: string }) => r.code === "professional_suitability",
        ).outcome,
      "missing",
    );
    const scopeState = (
      await database.ownerPool.query(
        "SELECT s.revoked_at,l.released_at,a.outcome FROM jobs.job_scope s JOIN jobs.job_lease l ON l.id=s.lease_id JOIN jobs.job_attempt a ON a.id=s.attempt_id WHERE s.job_id=$1",
        [accepted.json().data.id],
      )
    ).rows[0];
    assert.ok(scopeState.revoked_at);
    assert.ok(scopeState.released_at);
    assert.equal(scopeState.outcome, "succeeded");
    const findings = await api.inject({
      method: "GET",
      url: `/api/v1/deals/${deal}/qc-findings?revision_id=${accepted.json().data.revision_id}`,
      headers: { cookie },
    });
    const finding = findings
      .json()
      .data.find(
        (f: { finding_code: string }) => f.finding_code === "clean_copy",
      );
    assert.ok(
      finding,
      "Evaluation artifact must retain a Critical clean-copy Finding",
    );
    const waived = await api.inject({
      method: "POST",
      url: `/api/v1/deals/${deal}/qc-findings/${finding.id}/dispositions`,
      headers: { cookie, "idempotency-key": crypto.randomUUID() },
      payload: {
        disposition: "accepted_limitation",
        purpose: "Internal valuation review",
        rationale: "Attempt to waive a critical licensing failure",
      },
    });
    assert.equal(waived.statusCode, 409, waived.body);
    const retest = await api.inject({
      method: "POST",
      url: `/api/v1/deals/${deal}/qc-findings/${finding.id}/retests`,
      headers: { cookie, "idempotency-key": crypto.randomUUID() },
      payload: {
        revision_id: accepted.json().data.revision_id,
        ruleset: "analysis-workbook-qc-1.0.0",
      },
    });
    assert.equal(retest.statusCode, 202, retest.body);
    await runtime.runOnce();
    const retested = await api.inject({
      method: "GET",
      url: `/api/v1/deals/${deal}/qc-findings/${finding.id}/retests`,
      headers: { cookie },
    });
    assert.equal(retested.json().data[0]?.outcome, "failed", retested.body);
    if (process.env.WORKBOOK_LIVE_AI === "true") {
      for (const task of [
        "workbook_commentary_draft",
        "deliverable_semantic_qc",
        "native_reader_semantic_parity_review",
      ]) {
        const queued = await api.inject({
          method: "POST",
          url: `${url}/${id}/revisions/${accepted.json().data.revision_id}/ai-reviews`,
          headers: { cookie, "idempotency-key": crypto.randomUUID() },
          payload: {
            task_definition: task,
            work_objective_id: objective.id,
            packet_version_id: objective.packet_version_id,
          },
        });
        assert.equal(queued.statusCode, 202, queued.body);
        let state = "queued";
        for (
          let attempt = 0;
          attempt < 12 && ["queued", "running"].includes(state);
          attempt++
        ) {
          await runtime.runOnce();
          const observed = await api.inject({
            method: "GET",
            url: `/api/v1/jobs/${queued.json().data.id}`,
            headers: { cookie },
          });
          state = observed.json().state;
          assert.notEqual(state, "failed_terminal", observed.body);
        }
        assert.equal(state, "completed");
      }
      const runs = await api.inject({
        method: "GET",
        url: `${url}/${id}/revisions/${accepted.json().data.revision_id}/ai-reviews`,
        headers: { cookie },
      });
      assert.equal(runs.json().data.length, 3, runs.body);
      assert.equal(
        (
          await database.ownerPool.query(
            "SELECT count(*)::int AS count FROM deliverable.review WHERE revision_id=$1",
            [accepted.json().data.revision_id],
          )
        ).rows[0].count,
        0,
        "AI must never create Review authority",
      );
    }
    const cancellation = await api.inject({
      method: "POST",
      url: `/api/v1/deals/${deal}/qc-runs`,
      headers: { cookie, "idempotency-key": crypto.randomUUID() },
      payload: {
        revision_id: accepted.json().data.revision_id,
        ruleset: "analysis-workbook-qc-1.0.0",
      },
    });
    assert.equal(cancellation.statusCode, 202, cancellation.body);
    const stopped = await api.inject({
      method: "POST",
      url: `/api/v1/jobs/${cancellation.json().data.id}/cancellations`,
      headers: { cookie, "if-match": '"job-1"' },
      payload: { reason: "Completed bounded acceptance" },
    });
    assert.equal(stopped.statusCode, 201, stopped.body);
    assert.equal(
      (
        await database.ownerPool.query(
          "SELECT finished FROM deliverable.workbook_job WHERE job_id=$1",
          [cancellation.json().data.id],
        )
      ).rows[0]?.finished,
      true,
    );
  }
  const revisionId = accepted.json().data.revision_id;
  const readinessUrl = `${url}/${id}/revisions/${revisionId}/readiness?purpose=Internal%20valuation%20review&audience=Named%20Individual%20Banker`;
  const beforeChange = await api.inject({
    method: "GET",
    url: readinessUrl,
    headers: { cookie },
  });
  assert.notEqual(
    beforeChange
      .json()
      .data.requirements.find(
        (r: { code: string }) => r.code === "controlled_inputs",
      ).outcome,
    "failed",
    beforeChange.body,
  );
  const decisionId =
    exact.json().data.build_input.calculations[0].measures[0].decision_id;
  await database.ownerPool.query(
    "INSERT INTO knowledge.human_decision SELECT (jsonb_populate_record(NULL::knowledge.human_decision,to_jsonb(d)||jsonb_build_object('id',$2::uuid,'supersedes_decision_id',d.id,'recorded_at',clock_timestamp()))).* FROM knowledge.human_decision d WHERE d.id=$1",
    [decisionId, crypto.randomUUID()],
  );
  const changed = await api.inject({
    method: "GET",
    url: readinessUrl,
    headers: { cookie },
  });
  assert.equal(
    changed
      .json()
      .data.requirements.find(
        (r: { code: string }) => r.code === "controlled_inputs",
      ).outcome,
    "failed",
    changed.body,
  );
  assert.equal(changed.json().data.posture, "blocked");
});
