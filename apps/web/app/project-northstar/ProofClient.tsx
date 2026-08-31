"use client";

import { type MouseEvent, useEffect, useMemo, useState } from "react";

type Artifact = { id: string; filename: string; format: string; revision: string; sha256: string; download_url: string };
type Source = { id: string; label: string; version?: string; locator: Record<string, string | number>; rights_posture?: string; claim_ids?: string[] };
type Revision = { id: string; number: string; source_record_ids: string[]; immutable: boolean; external_use_authorization: { status: string; carry_forward: boolean; decision_id: string | null; bound_revision: string; prior_authorization?: string }; artifacts: Artifact[] };
type Proof = {
  id?: string;
  synthetic: boolean;
  disclosure: string;
  fixture_version: string;
  required_checkpoints: string[];
  observed_checkpoints?: string[];
  state?: string;
  current_revision: Revision;
  revisions?: Revision[];
  completion?: { status: string; event?: { synthetic: boolean; counts_as_paid_activation: boolean; counts_as_production_provider_evidence: boolean; counts_as_production_security_evidence: boolean } };
  cash_extraction?: { original_value: string; source_value: string; original_source_record_id: string; source_record_id: string; source_locator: string; correction_delta: string; correction_required: boolean };
  claims?: Array<{ id: string; kind: string; value: string; corrected_value?: string; state: string; source_record_id?: string }>;
  source_lineage?: Source[];
  conflict?: { id: string; claims: Array<{ id: string; kind: string; value: string }>; required_disposition: string; forbidden: string[] };
  conflict_resolution?: { disposition: string; retained_values: string[]; retained_claim_ids: string[]; scope: string; rationale: string; actor_id: string; overwrite: boolean; average: boolean } | null;
  correction?: { original_value: string; corrected_value: string; delta: string; actor_id: string; reason: string; evidence_id: string; claim_id: string } | null;
  deterministic_recovery?: { tie_out_before: string; tie_out_after: string; change: string; rule_set?: string; engine?: string } | null;
  affected_outputs?: { affected_scope: string[]; recalculation: string; regeneration: string; re_review: string; circulation: string } | null;
  package_readiness?: { source_lineage: string; deterministic_validation: string; native_artifact: string; reader_copy: string; qc: string; package_readiness: string; external_use: string };
  revision_boundary?: { previous_revision: Revision; returned_revision: Revision | null; source_record: string; history_preserved: boolean };
  authorization_boundary?: { prior_revision: string; prior_status: string; returned_revision: string; returned_status: string; carry_forward: boolean };
  events?: Array<{ type: string; synthetic: boolean }>;
};

const labels: Record<string, string> = {
  package_outcome: "Package outcome and source lineage",
  ebitda_conflict: "EBITDA conflict",
  cash_extraction: "Cash extraction",
  cash_correction: "Record Cash correction",
  deterministic_recovery: "$1.5m deterministic recovery",
  affected_outputs: "Affected artifacts and Package Readiness",
  revision_boundary: "Revision 0.3 → 0.4",
  authorization_boundary: "External-use authorization boundary",
  manifest_download: "Exact artifact hashes and manifest",
};

const stepStates = ["package-outcome", "ebitda-conflict", "cash-extraction", "affected-outputs", "revision-boundary", "authorization-boundary", "manifest-download"];

export default function ProofClient({ initialState }: { initialState?: string }) {
  const [proof, setProof] = useState<Proof | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [message, setMessage] = useState("Loading the synthetic fixture…");
  const [error, setError] = useState("");

  const observed = proof?.observed_checkpoints ?? [];
  const currentArtifacts = proof?.current_revision.artifacts ?? [];
  const sourceById = useMemo(() => new Map((proof?.source_lineage ?? []).map((source) => [source.id, source])), [proof?.source_lineage]);
  const nextAction = useMemo(() => {
    const required = proof?.required_checkpoints ?? [];
    return required.find((checkpoint) => !observed.includes(checkpoint));
  }, [observed, proof?.required_checkpoints]);

  async function request(path: string, options: RequestInit = {}) {
    const response = await fetch(path, { credentials: "same-origin", ...options });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail ?? "The synthetic proof is unavailable.");
    return body as Proof & { id?: string; result?: Proof };
  }

  async function loadSession(id: string) {
    const body = await request(`/api/v1/public/project-northstar/sessions/${id}`);
    setProof(body);
    setSessionId(id);
    setMessage(body.completion?.status === "completed" ? "Interactive proof completed for this synthetic session." : "Progress is resumable in this browser session.");
  }

  useEffect(() => {
    const endpoint = initialState ? `/api/v1/public/project-northstar/states/${encodeURIComponent(initialState)}` : "/api/v1/public/project-northstar";
    void request(endpoint)
      .then((body) => {
        setProof(body);
        if (body.id) setSessionId(body.id);
        setMessage(initialState ? `Inspecting the ${initialState.replaceAll("-", " ")} checkpoint.` : "Start a bounded synthetic session to inspect the control loop.");
      })
      .catch((cause: Error) => setError(cause.message));
  }, [initialState]);

  async function startSession() {
    setError("");
    try {
      const body = await request("/api/v1/public/project-northstar/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fixture_version: "1.0.0" }) });
      await loadSession(body.id as string);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The synthetic proof could not start.");
    }
  }

  async function observe(state: string) {
    if (!sessionId) return startSession();
    setError("");
    try {
      const body = await request(`/api/v1/public/project-northstar/sessions/${sessionId}/observations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ proof_state: state }) });
      setProof(body);
      setMessage(`Observed ${labels[state.replaceAll("-", "_")] ?? state}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The checkpoint could not be observed.");
    }
  }

  async function command(path: string, body: Record<string, unknown>, success: string) {
    if (!sessionId) return startSession();
    setError("");
    try {
      await request(`/api/v1/public/project-northstar/sessions/${sessionId}/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      await loadSession(sessionId);
      setMessage(success);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The synthetic command could not be recorded.");
    }
  }

  async function downloadArtifact(artifact: Artifact, event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch(artifact.download_url, { credentials: "same-origin" });
      if (!response.ok) throw new Error("The exact synthetic artifact could not be downloaded.");
      const bytes = await response.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const downloadedSha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      const blob = new Blob([bytes], { type: response.headers.get("content-type") ?? "application/octet-stream" });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = artifact.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      if (sessionId && artifact.revision === "0.4") {
        await request(`/api/v1/public/project-northstar/sessions/${sessionId}/artifact-inspections`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ artifact_id: artifact.id, sha256: downloadedSha256 }) });
        await loadSession(sessionId);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The exact synthetic artifact could not be downloaded.");
    }
  }

  const has = (checkpoint: string) => observed.includes(checkpoint);

  return (
    <main id="main-content" style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px 64px" }}>
      <a href="#main-content" style={{ position: "absolute", left: -10000 }}>Skip to main content</a>
      <header style={{ borderBottom: "1px solid #ccd5d8", paddingBottom: 24 }}>
        <a href="/" style={{ color: "#16724b" }}>← Public outcome</a>
        <p style={{ fontFamily: "monospace", fontSize: 12, letterSpacing: 1 }}>PROJECT NORTHSTAR / SYNTHETIC DEAL PROOF</p>
        <h1>Controlled Auction Execution Package</h1>
        <p role="note" style={{ background: "#edf6f1", border: "1px solid #a9d5bd", padding: 16 }}>{proof?.disclosure ?? "Every company, source, value, action and artifact is synthetic. This proof demonstrates the product interaction and control model; it is not evidence that production processing or security requirements have passed."}</p>
        <p style={{ color: "#566" }}>No email, card, Account authority, real upload, confidential processing, live provider, payment, or Recipient path is available here.</p>
      </header>

      {error && <div role="alert" style={{ marginTop: 20, border: "1px solid #a22", padding: 16 }}>{error} <button type="button" onClick={() => window.location.reload()}>Retry interactive proof</button></div>}
      <p role="status" aria-live="polite" style={{ marginTop: 20 }}>{message}</p>

      <section aria-labelledby="checkpoints-heading" style={{ display: "grid", gridTemplateColumns: "minmax(250px, 0.8fr) minmax(0, 1.5fr)", gap: 24, marginTop: 24 }}>
        <div>
          <h2 id="checkpoints-heading">Proof checkpoints</h2>
          {!sessionId && <button type="button" onClick={startSession} style={{ background: "#16724b", color: "#fff", border: 0, padding: "12px 16px", borderRadius: 6 }}>Start interactive proof</button>}
          <ol>
            {(proof?.required_checkpoints ?? Object.keys(labels)).map((checkpoint, index) => (
              <li key={checkpoint} style={{ margin: "12px 0" }}>
                <span>{has(checkpoint) ? "✓" : "○"} {index + 1}. {labels[checkpoint] ?? checkpoint}</span>
              </li>
            ))}
          </ol>
          <p style={{ fontSize: 13, color: "#566" }}>Current next checkpoint: <strong>{nextAction ? labels[nextAction] : "none — all required observations are recorded"}</strong></p>
          <p><a href="/resources/recorded-walkthrough">Watch the accessible recorded walkthrough</a></p>
        </div>

        <div>
          <section aria-labelledby="lineage-heading" style={{ background: "#fff", border: "1px solid #ccd5d8", padding: 20 }}>
            <h2 id="lineage-heading">Synthetic source lineage</h2>
            <ul>
              {(proof?.source_lineage ?? []).map((source) => <li key={source.id}><strong>{source.id}</strong> — {source.label} · {Object.entries(source.locator).map(([key, value]) => `${key} ${value}`).join(", ")}</li>)}
            </ul>
            <h3>Claims retained</h3>
            <ul>
              {(proof?.claims ?? []).map((claim) => {
                const source = claim.source_record_id ? sourceById.get(claim.source_record_id) : undefined;
                return <li key={claim.id}>{claim.kind}: ${claim.value}m{claim.corrected_value ? ` → $${claim.corrected_value}m` : ""} ({claim.state}) · source {claim.source_record_id ?? "not stated"}{source ? ` (${source.locator.sheet ?? source.locator.label ?? source.label} ${source.locator.cell ?? source.locator.slide ?? ""})` : ""}</li>;
              })}
            </ul>
          </section>

          <section aria-labelledby="evidence-heading" style={{ background: "#fff", border: "1px solid #ccd5d8", padding: 20, marginTop: 16 }}>
            <h2 id="evidence-heading">Observed control evidence</h2>
            {proof?.conflict && <div><h3>EBITDA conflict</h3><p>Required disposition: <strong>{proof.conflict.required_disposition}</strong>; forbidden: {proof.conflict.forbidden.join(" / ")}.</p><p>Claims retained: {proof.conflict.claims.map((claim) => `$${claim.value}m`).join(" and ")}.</p></div>}
            {proof?.conflict_resolution && <div><h3>Scoped disposition recorded</h3><p>{proof.conflict_resolution.disposition}; scope: {proof.conflict_resolution.scope}; actor: {proof.conflict_resolution.actor_id}.</p><p>Rationale: {proof.conflict_resolution.rationale}</p><p>Overwrite: {String(proof.conflict_resolution.overwrite)} · average: {String(proof.conflict_resolution.average)} · retained values: {proof.conflict_resolution.retained_values.join(", ")}.</p></div>}
            {proof?.cash_extraction && <div><h3>Cash correction evidence</h3><p>Original extraction ${proof.cash_extraction.original_value}m · source ${proof.cash_extraction.source_value}m · exact locator {proof.cash_extraction.source_locator} · Source Record {proof.cash_extraction.source_record_id}.</p></div>}
            {proof?.correction && <div><p>Correction: ${proof.correction.original_value}m → ${proof.correction.corrected_value}m (change ${proof.correction.delta}m); actor: {proof.correction.actor_id}; reason: {proof.correction.reason}.</p></div>}
            {proof?.deterministic_recovery && <div><h3>Deterministic recovery</h3><p>Tie-out: ${proof.deterministic_recovery.tie_out_before}m → ${proof.deterministic_recovery.tie_out_after}m; exact change ${proof.deterministic_recovery.change}m.</p></div>}
            {proof?.affected_outputs && <div><h3>Affected outputs</h3><p>{proof.affected_outputs.affected_scope.join(", ")}; recalculation {proof.affected_outputs.recalculation}, regeneration {proof.affected_outputs.regeneration}, re-review {proof.affected_outputs.re_review}, circulation {proof.affected_outputs.circulation}.</p></div>}
            {proof?.package_readiness && <div><h3>Package Readiness</h3><p>Source lineage {proof.package_readiness.source_lineage}; deterministic validation {proof.package_readiness.deterministic_validation}; native artifact {proof.package_readiness.native_artifact}; Reader Copy {proof.package_readiness.reader_copy}; QC {proof.package_readiness.qc}; readiness <strong>{proof.package_readiness.package_readiness}</strong>; external use {proof.package_readiness.external_use}.</p></div>}
          </section>

          <section aria-labelledby="actions-heading" style={{ background: "#fff", border: "1px solid #ccd5d8", padding: 20, marginTop: 16 }}>
            <h2 id="actions-heading">Inspect and record the control loop</h2>
            <div style={{ display: "grid", gap: 10 }}>
              <button type="button" disabled={!sessionId || has("package_outcome")} onClick={() => observe(stepStates[0])}>Inspect package and lineage</button>
              <button type="button" disabled={!sessionId || has("ebitda_conflict")} onClick={() => observe(stepStates[1])}>Inspect $18.4m / $17.8m EBITDA conflict</button>
              <button type="button" disabled={!sessionId || !has("ebitda_conflict")} onClick={() => command("conflict-resolutions", { conflict_id: "synthetic-conflict-ebitda", disposition: "scoped_simulated_disposition", retained_claim_ids: ["synthetic-claim-ebitda-18-4", "synthetic-claim-ebitda-17-8"], scope: "illustrative_adjusted_ebitda_cross_check", rationale: "Retain both Claims and scope the comparison for Banker review." }, "Scoped EBITDA disposition recorded; neither Claim was overwritten or averaged.")}>Record scoped EBITDA disposition</button>
              <button type="button" disabled={!sessionId || has("cash_extraction")} onClick={() => observe(stepStates[2])}>Inspect original $6.2m Cash extraction</button>
              <button type="button" disabled={!sessionId || !has("cash_extraction") || has("cash_correction")} onClick={() => command("claim-corrections", { claim_id: "synthetic-claim-cash-extraction", evidence_id: "synthetic-evidence-cash-balance-sheet-f28", corrected_value: "4.7", reason: "Balance Sheet!F28 is the rights-cleared source for reported cash." }, "Cash correction recorded with actor and reason evidence.")}>Record Cash correction to $4.7m</button>
              <button type="button" disabled={!sessionId || !has("cash_correction") || !has("ebitda_conflict") || has("deterministic_recovery")} onClick={() => command("deterministic-runs", { rule_set: "synthetic-northstar-tie-out-v1", corrected_cash: "4.7" }, "Deterministic recovery completed: the $1.5m tie-out changed from $1.5m to $0.0m.")}>Run deterministic recovery</button>
              <button type="button" disabled={!sessionId || !has("deterministic_recovery") || has("affected_outputs")} onClick={() => command("impact-acceptances", { assessment_id: "synthetic-impact-014", accepted_scope: ["workbook", "cim", "reader_copy", "qc", "package_readiness"] }, "Affected workbook, CIM, Reader Copy, QC and Package Readiness scope recorded.")}>Inspect affected outputs and readiness</button>
              <button type="button" disabled={!sessionId || !has("affected_outputs") || has("revision_boundary")} onClick={() => command("revisions", { source_record_id: "synthetic-sr-006", reason: "Append July actuals without replacing prior history." }, "Revision 0.4 created; Revision 0.3 remains preserved and its authorization does not carry forward.")}>Append SR-006 and create Revision 0.4</button>
              <button type="button" disabled={!sessionId || !has("revision_boundary") || has("authorization_boundary")} onClick={() => observe(stepStates[5])}>Inspect authorization boundary</button>
              <button type="button" disabled={!sessionId || !has("authorization_boundary") || has("manifest_download")} onClick={() => observe(stepStates[6])}>Inspect exact hashes and manifest</button>
            </div>
          </section>
        </div>
      </section>

      <section aria-labelledby="revision-heading" style={{ background: "#fff", border: "1px solid #ccd5d8", padding: 20, marginTop: 24 }}>
        <h2 id="revision-heading">Current synthetic Revision {proof?.current_revision.number ?? "0.3"}</h2>
        <p>External-use posture: <strong>{proof?.current_revision.external_use_authorization.status ?? "not_authorized"}</strong>. Authorization is exact-Revision only; a returned Revision does not inherit prior authority.</p>
        {currentArtifacts.length > 0 && <ul>{currentArtifacts.map((artifact) => <li key={artifact.id}><a href={artifact.download_url} onClick={(event) => void downloadArtifact(artifact, event)}>{artifact.filename}</a> · SHA-256 <code>{artifact.sha256}</code></li>)}</ul>}
        {proof?.revisions && <div><h3>Revision history</h3><ul>{proof.revisions.map((revision) => <li key={revision.id}>Revision {revision.number}: {revision.external_use_authorization.status}; sources {revision.source_record_ids.join(", ")}; authorization bound to {revision.external_use_authorization.bound_revision} (carry forward: {String(revision.external_use_authorization.carry_forward)}).</li>)}</ul></div>}
        {proof?.revision_boundary && <p>Revision boundary: {proof.revision_boundary.previous_revision.number} preserved; {proof.revision_boundary.source_record} appended; history preserved: {String(proof.revision_boundary.history_preserved)}.</p>}
        {proof?.authorization_boundary && <p>Authorization boundary: Revision {proof.authorization_boundary.prior_revision} was {proof.authorization_boundary.prior_status}; Revision {proof.authorization_boundary.returned_revision} is {proof.authorization_boundary.returned_status}; carry forward: {String(proof.authorization_boundary.carry_forward)}.</p>}
        {proof?.current_revision.number === "0.4" && <p role="note">Download the exact XLSX Native Artifact, PDF Reader Copy and archive manifest to record the final inspection/completion checkpoints for this synthetic session.</p>}
      </section>

      {proof?.completion?.status === "completed" && <section aria-labelledby="completion-heading" style={{ border: "2px solid #16724b", padding: 20, marginTop: 24 }}>
        <h2 id="completion-heading">Synthetic interactive proof completed</h2>
        <p>This completion records observation of the control loop in one resumable synthetic session. It is not paid activation, production provider evidence, or production security evidence.</p>
        <p><a href="/pricing">Continue to pricing</a> · <a href="/qualification">Check qualification</a></p>
      </section>}
    </main>
  );
}
