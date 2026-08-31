import assert from "node:assert/strict";
import test from "node:test";
import { buildApi } from "../../apps/api/src/app.js";
import { createTestDatabase } from "../../apps/api/src/test-database.js";

function cookieFrom(response: any) {
  const raw = response.headers["set-cookie"];
  assert.ok(raw);
  const value = Array.isArray(raw) ? raw[0] : raw;
  assert.match(value, /__Host-northstar_proof=/);
  return value.split(";", 1)[0];
}

async function jsonRequest(api: any, options: { method: any; url: string; cookie?: string; payload?: unknown }) {
  const response = await api.inject({
    method: options.method,
    url: options.url,
    headers: { origin: process.env.PUBLIC_WEB_ORIGIN ?? "http://localhost", ...(options.cookie ? { cookie: options.cookie } : {}) },
    ...(options.payload === undefined ? {} : { payload: options.payload }),
  });
  return { response, body: response.body ? response.json() : undefined };
}

test("anonymous browser completes the resumable synthetic Project Northstar control loop", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local" });
  t.after(() => api.close());

  const created = await jsonRequest(api, { method: "POST", url: "/api/v1/public/project-northstar/sessions", payload: { fixture_version: "1.0.0" } });
  assert.equal(created.response.statusCode, 201);
  const cookie = cookieFrom(created.response);
  const sessionId = created.body.id as string;
  assert.equal(created.body.synthetic, true);
  assert.equal(created.body.completion.status, "incomplete");
  assert.equal(created.body.current_revision.number, "0.3");

  const staticProof = await jsonRequest(api, { method: "GET", url: "/api/v1/public/project-northstar" });
  assert.equal(staticProof.response.statusCode, 200);
  assert.equal(staticProof.body.synthetic, true);
  assert.equal(staticProof.body.real_uploads_allowed, false);
  assert.equal(staticProof.body.confidential_processing_allowed, false);
  const revisionPreview = await jsonRequest(api, { method: "GET", url: "/api/v1/public/project-northstar/states/revision-boundary" });
  assert.equal(revisionPreview.body.current_revision.number, "0.4");
  assert.ok(revisionPreview.body.source_lineage.some((source: { id: string }) => source.id === "synthetic-sr-006"));
  assert.equal(revisionPreview.body.package_readiness.package_readiness, "blocked");
  assert.deepEqual(revisionPreview.body.current_revision.artifacts, []);

  for (const state of ["package_outcome", "ebitda_conflict", "cash_extraction"]) {
    const result = await jsonRequest(api, { method: "POST", url: `/api/v1/public/project-northstar/sessions/${sessionId}/observations`, cookie, payload: { proof_state: state } });
    assert.equal(result.response.statusCode, 201);
    assert.equal(result.body.synthetic, true);
  }

  const conflict = await jsonRequest(api, {
    method: "POST",
    url: `/api/v1/public/project-northstar/sessions/${sessionId}/conflict-resolutions`,
    cookie,
    payload: {
      conflict_id: "synthetic-conflict-ebitda",
      disposition: "scoped_simulated_disposition",
      retained_claim_ids: ["synthetic-claim-ebitda-18-4", "synthetic-claim-ebitda-17-8"],
      scope: "illustrative_adjusted_ebitda_cross_check",
      rationale: "Retain both Claims and scope the comparison for Banker review.",
    },
  });
  assert.equal(conflict.response.statusCode, 201);
  assert.deepEqual(conflict.body.retained_values, ["18.4", "17.8"]);
  assert.equal(conflict.body.overwrite, false);
  assert.equal(conflict.body.average, false);

  const cash = await jsonRequest(api, { method: "GET", url: "/api/v1/public/project-northstar/states/cash-extraction", cookie });
  assert.equal(cash.body.cash_extraction.original_value, "6.2");
  assert.equal(cash.body.cash_extraction.source_value, "4.7");

  const correction = await jsonRequest(api, {
    method: "POST",
    url: `/api/v1/public/project-northstar/sessions/${sessionId}/claim-corrections`,
    cookie,
    payload: {
      claim_id: "synthetic-claim-cash-extraction",
      evidence_id: "synthetic-evidence-cash-balance-sheet-f28",
      corrected_value: "4.7",
      reason: "Balance Sheet!F28 is the rights-cleared source for reported cash.",
    },
  });
  assert.equal(correction.response.statusCode, 201);
  assert.equal(correction.body.original_value, "6.2");
  assert.equal(correction.body.corrected_value, "4.7");
  assert.equal(correction.body.delta, "1.5");
  assert.equal(correction.body.actor_id, "synthetic-prospective-banker");
  assert.equal(correction.body.reason, "Balance Sheet!F28 is the rights-cleared source for reported cash.");

  const run = await jsonRequest(api, {
    method: "POST",
    url: `/api/v1/public/project-northstar/sessions/${sessionId}/deterministic-runs`,
    cookie,
    payload: { rule_set: "synthetic-northstar-tie-out-v1", corrected_cash: "4.7" },
  });
  assert.equal(run.response.statusCode, 202);
  assert.equal(run.body.synthetic, true);
  assert.equal(run.body.state, "completed");
  assert.equal(run.body.result.tie_out_before, "1.5");
  assert.equal(run.body.result.tie_out_after, "0.0");
  assert.equal(run.body.result.change, "1.5");

  const impact = await jsonRequest(api, {
    method: "POST",
    url: `/api/v1/public/project-northstar/sessions/${sessionId}/impact-acceptances`,
    cookie,
    payload: { assessment_id: "synthetic-impact-014", accepted_scope: ["workbook", "cim", "reader_copy", "qc", "package_readiness"] },
  });
  assert.equal(impact.response.statusCode, 201);
  assert.deepEqual(impact.body.affected_scope, ["workbook", "cim", "reader_copy", "qc", "package_readiness"]);

  const revision = await jsonRequest(api, {
    method: "POST",
    url: `/api/v1/public/project-northstar/sessions/${sessionId}/revisions`,
    cookie,
    payload: { source_record_id: "synthetic-sr-006", reason: "Append July actuals without replacing prior history." },
  });
  assert.equal(revision.response.statusCode, 202);
  assert.equal(revision.body.result.revision.number, "0.4");
  assert.equal(revision.body.result.previous_revision.number, "0.3");
  assert.equal(revision.body.result.revision.external_use_authorization.carry_forward, false);
  const postRevision = await jsonRequest(api, {
    method: "GET",
    url: `/api/v1/public/project-northstar/sessions/${sessionId}`,
    cookie,
  });
  assert.equal(postRevision.body.package_readiness.package_readiness, "blocked");
  assert.equal(postRevision.body.package_readiness.external_use, "not_authorized");
  assert.equal(postRevision.body.affected_outputs.circulation, "blocked");

  for (const state of ["affected-outputs", "revision-boundary", "authorization-boundary", "manifest-download"]) {
    const result = await jsonRequest(api, { method: "POST", url: `/api/v1/public/project-northstar/sessions/${sessionId}/observations`, cookie, payload: { proof_state: state } });
    assert.equal(result.response.statusCode, 201);
  }

  const beforeDownloads = await jsonRequest(api, { method: "GET", url: `/api/v1/public/project-northstar/sessions/${sessionId}`, cookie });
  assert.equal(beforeDownloads.body.completion.status, "incomplete");
  assert.equal((await api.inject({ method: "GET", url: "/api/v1/public/project-northstar/artifacts/synthetic-northstar-rev-0.4-xlsx" })).statusCode, 404);
  assert.equal((await api.inject({ method: "GET", url: "/api/v1/public/project-northstar/artifacts/synthetic-northstar-rev-0.4-xlsx/download" })).statusCode, 404);
  const currentArtifacts = beforeDownloads.body.current_revision.artifacts as Array<{ id: string; sha256: string; download_url: string }>;
  for (const artifact of currentArtifacts) {
    const metadata = await jsonRequest(api, { method: "GET", url: `/api/v1/public/project-northstar/artifacts/${artifact.id}`, cookie });
    assert.equal(metadata.response.statusCode, 200);
    assert.equal(metadata.body.revision, "0.4");
    const download = await api.inject({ method: "GET", url: metadata.body.download_url, headers: { cookie } });
    assert.equal(download.statusCode, 200);
    assert.equal(download.headers["x-synthetic-revision"], "0.4");
    assert.equal((await import("node:crypto")).createHash("sha256").update(download.rawPayload).digest("hex"), artifact.sha256);
    const invalidReceipt = await jsonRequest(api, { method: "POST", url: `/api/v1/public/project-northstar/sessions/${sessionId}/artifact-inspections`, cookie, payload: { artifact_id: artifact.id, sha256: "0".repeat(64) } });
    assert.equal(invalidReceipt.response.statusCode, 422);
    const receipt = await jsonRequest(api, { method: "POST", url: `/api/v1/public/project-northstar/sessions/${sessionId}/artifact-inspections`, cookie, payload: { artifact_id: artifact.id, sha256: artifact.sha256 } });
    assert.equal(receipt.response.statusCode, 201);
  }
  const completed = await jsonRequest(api, { method: "GET", url: `/api/v1/public/project-northstar/sessions/${sessionId}`, cookie });
  assert.equal(completed.response.statusCode, 200);
  assert.equal(completed.body.completion.status, "completed");
  assert.equal(completed.body.completion.event.synthetic, true);
  assert.equal(completed.body.completion.event.counts_as_paid_activation, false);
  assert.equal(completed.body.completion.event.counts_as_production_provider_evidence, false);
  assert.equal(completed.body.completion.event.counts_as_production_security_evidence, false);
  assert.equal(completed.body.revisions[0].number, "0.3");
  assert.equal(completed.body.revisions[1].number, "0.4");
  assert.ok(completed.body.source_lineage.some((source: { id: string }) => source.id === "synthetic-sr-006"));
  assert.equal(completed.body.revisions[0].external_use_authorization.status, "authorized");
  assert.equal(completed.body.revisions[0].external_use_authorization.carry_forward, false);
  assert.equal(completed.body.revisions[1].external_use_authorization.status, "not_authorized");
});

test("proof completion is gated to one resumable session and real upload paths stay unreachable", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local" });
  t.after(() => api.close());

  const first = await jsonRequest(api, { method: "POST", url: "/api/v1/public/project-northstar/sessions", payload: { fixture_version: "1.0.0" } });
  const second = await jsonRequest(api, { method: "POST", url: "/api/v1/public/project-northstar/sessions", payload: { fixture_version: "1.0.0" } });
  const stateOnly = await jsonRequest(api, { method: "POST", url: "/api/v1/public/project-northstar/sessions", payload: { fixture_version: "1.0.0" } });
  const firstCookie = cookieFrom(first.response);
  const secondCookie = cookieFrom(second.response);
  const stateOnlyCookie = cookieFrom(stateOnly.response);
  const firstId = first.body.id as string;
  const secondId = second.body.id as string;
  const stateOnlyId = stateOnly.body.id as string;

  const partial = await jsonRequest(api, { method: "GET", url: `/api/v1/public/project-northstar/sessions/${firstId}`, cookie: firstCookie });
  assert.equal(partial.body.completion.status, "incomplete");
  const wrongCookie = await jsonRequest(api, { method: "GET", url: `/api/v1/public/project-northstar/sessions/${firstId}`, cookie: secondCookie });
  assert.equal(wrongCookie.response.statusCode, 404);
  assert.equal(wrongCookie.body.code, "resource_not_found");
  assert.equal((await api.inject({ method: "POST", url: "/api/v1/upload-sessions", payload: { filename: "real.xlsx" } })).statusCode, 404);
  assert.equal((await api.inject({ method: "POST", url: "/api/v1/public/project-northstar/uploads", payload: { filename: "real.xlsx" } })).statusCode, 404);

  const recorded = await jsonRequest(api, { method: "GET", url: "/api/v1/public/project-northstar/recorded" });
  assert.equal(recorded.response.statusCode, 200);
  assert.equal(recorded.body.interactive_completion_emitted, false);
  assert.ok(recorded.body.chapters.length >= 9);
  assert.ok(recorded.body.chapters.every((chapter: { href: string }) => chapter.href.startsWith("/project-northstar/")));
  assert.equal((await jsonRequest(api, { method: "GET", url: `/api/v1/public/project-northstar/sessions/${secondId}`, cookie: secondCookie })).body.completion.status, "incomplete");

  for (const state of ["package-outcome", "ebitda-conflict", "cash-extraction", "cash-correction", "deterministic-recovery", "affected-outputs", "revision-boundary", "authorization-boundary", "manifest-download"]) {
    await jsonRequest(api, { method: "GET", url: `/api/v1/public/project-northstar/states/${state}`, cookie: stateOnlyCookie });
  }
  const stateOnlySession = await jsonRequest(api, { method: "GET", url: `/api/v1/public/project-northstar/sessions/${stateOnlyId}`, cookie: stateOnlyCookie });
  assert.equal(stateOnlySession.body.completion.status, "incomplete");
  assert.deepEqual(stateOnlySession.body.observed_checkpoints, []);
});

test("synthetic commands reject overwrite/average and public payloads do not expose production or raw-byte authority", async (t) => {
  const database = await createTestDatabase();
  t.after(() => database.close());
  const api = await buildApi({ database, authMode: "local" });
  t.after(() => api.close());

  const proof = await jsonRequest(api, { method: "GET", url: "/api/v1/public/project-northstar" });
  assert.equal(proof.body.real_uploads_allowed, false);
  assert.equal(proof.body.confidential_processing_allowed, false);
  assert.equal(proof.body.source_lineage.some((source: { id: string }) => source.id === "synthetic-sr-006"), false);
  assert.equal("bytes" in proof.body.current_revision.artifacts[0], false);
  const originRejected = await api.inject({ method: "POST", url: "/api/v1/public/project-northstar/sessions", headers: { origin: "https://not-the-first-party.example" }, payload: {} });
  assert.equal(originRejected.statusCode, 403);
  const originMissing = await api.inject({ method: "POST", url: "/api/v1/public/project-northstar/sessions", payload: {} });
  assert.equal(originMissing.statusCode, 403);

  const created = await jsonRequest(api, { method: "POST", url: "/api/v1/public/project-northstar/sessions", payload: {} });
  const cookie = cookieFrom(created.response);
  const sessionId = created.body.id as string;
  await jsonRequest(api, { method: "POST", url: `/api/v1/public/project-northstar/sessions/${sessionId}/observations`, cookie, payload: { proof_state: "ebitda-conflict" } });
  const rejected = await jsonRequest(api, {
    method: "POST",
    url: `/api/v1/public/project-northstar/sessions/${sessionId}/conflict-resolutions`,
    cookie,
    payload: { conflict_id: "synthetic-conflict-ebitda", disposition: "average", retained_claim_ids: ["synthetic-claim-ebitda-18-4", "synthetic-claim-ebitda-17-8"], scope: "all", rationale: "Average the claims." },
  });
  assert.equal(rejected.response.statusCode, 422);
  assert.equal(rejected.body.code, "invalid_conflict_disposition");
});
