import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
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
  const basis = await createWorkbookBasis(api, deal, cookie);
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
});
