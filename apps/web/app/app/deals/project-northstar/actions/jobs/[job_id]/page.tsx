"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Job = {
  id: string;
  job_type: string;
  state: string;
  progress: { message_code?: string };
  scope: {
    account_id: string;
    deal_id: string;
    purpose: string;
    input_digest: string;
    input_version: string;
    workflow_version: string;
    release_id: string;
    allowance: { class: string; quantity: string; posture: string };
    workspace_posture_version: number;
    security_epoch: number;
    scope_id: string | null;
    runtime_principal: string | null;
    operations: string[];
    expires_at: string | null;
  };
  accepted_inputs: Record<string, string>;
  result: { resource?: { type: string; id: string } } | null;
  problem: { code?: string; recovery_action?: string } | null;
  worker_heartbeat_at: string | null;
  row_version: number;
  latest_event: { message_code: string; stage_code: string | null } | null;
};

export default function DurableJobPage() {
  const params = useParams<{ job_id: string }>();
  const jobId = params.job_id;
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/v1/jobs/${jobId}`, { cache: "no-store" });
        const body = await response.json();
        if (active && response.ok) setJob(body);
        else if (active) setError(body.detail ?? "The Job detail is unavailable.");
      } catch {
        if (active) setError("The API could not be reached.");
      }
    };
    void load();
    const stream = new EventSource(`/api/v1/jobs/${jobId}/events`);
    const update = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as Partial<Job>;
        setJob((current) => current ? { ...current, ...payload, progress: payload.progress ?? current.progress } : current);
      } catch {
        // Ignore malformed notification data; the authoritative GET remains the recovery path.
      }
    };
    for (const eventName of ["job_snapshot", "job_state_changed", "job_progressed", "job_problem", "job_terminal"]) stream.addEventListener(eventName, update);
    stream.onerror = () => stream.close();
    return () => { active = false; stream.close(); };
  }, [jobId]);

  const mutate = async (path: string, method: "POST", body?: Record<string, string>) => {
    if (!job) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/jobs/${job.id}/${path}`, {
        method,
        headers: { "content-type": "application/json", "if-match": `"job-${job.row_version}"` },
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = await response.json();
      if (!response.ok) setError(result.detail ?? "The Job command could not be completed.");
      else setJob((current) => current ? { ...current, state: result.state, row_version: result.row_version } : current);
    } catch {
      setError("The API could not be reached.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: 40 }}>
      <p style={{ fontFamily: "monospace", fontSize: 12 }}>DEAL WORKSPACE / DURABLE JOB</p>
      <p><a href="/app/deals/project-northstar/overview">Back to Deal Overview</a></p>
      <h1>Reference workspace operation</h1>
      {error && <div role="alert" style={{ border: "1px solid #a22", padding: 16 }}>{error}</div>}
      {!job && !error && <p role="status">Loading durable Job…</p>}
      {job && <>
        <section aria-label="Job status" style={{ border: "1px solid #ccd5d8", background: "white", padding: 20 }}>
          <h2>{job.state.replaceAll("_", " ")}</h2>
          <p>Checkpoint: {job.latest_event?.stage_code ?? "accepted command"}</p>
          <p aria-live="polite">State detail: {job.progress.message_code ?? "not specified"}</p>
          <p>Worker heartbeat: {job.worker_heartbeat_at ?? "Not yet claimed"}</p>
          {job.problem && <p role="alert">Problem: {job.problem.code} ({job.problem.recovery_action})</p>}
          {job.state === "failed_retryable" && <button type="button" disabled={busy} onClick={() => void mutate("retries", "POST")}>Retry Job</button>}
          {!(["completed", "failed_terminal", "canceled"].includes(job.state)) && <button type="button" disabled={busy} onClick={() => void mutate("cancellations", "POST", { reason: "banker_requested" })}>Cancel Job</button>}
        </section>
        <section aria-label="Job scope" style={{ marginTop: 20, border: "1px solid #ccd5d8", background: "white", padding: 20 }}>
          <h2>Exact Job Scope</h2>
          <dl>
            <dt>Account</dt><dd>{job.scope.account_id}</dd>
            <dt>Deal</dt><dd>{job.scope.deal_id}</dd>
            <dt>Purpose</dt><dd>{job.scope.purpose}</dd>
            <dt>Input version</dt><dd>{job.scope.input_version} / {job.scope.input_digest}</dd>
            <dt>Workflow / release</dt><dd>{job.scope.workflow_version} / {job.scope.release_id}</dd>
            <dt>Security epoch</dt><dd>{job.scope.security_epoch}</dd>
            <dt>Allowance</dt><dd>{job.scope.allowance.class} · {job.scope.allowance.quantity} · {job.scope.allowance.posture}</dd>
            <dt>Runtime principal</dt><dd>{job.scope.runtime_principal ?? "Issued when a worker claims a step"}</dd>
            <dt>Operations</dt><dd>{job.scope.operations.length ? job.scope.operations.join(", ") : "Issued when a worker claims a step"}</dd>
            <dt>Scope expiry</dt><dd>{job.scope.expires_at ?? "Issued when a worker claims a step"}</dd>
          </dl>
        </section>
        <section aria-label="Accepted inputs" style={{ marginTop: 20, border: "1px solid #ccd5d8", background: "white", padding: 20 }}>
          <h2>Accepted inputs</h2>
          <dl><dt>Source Packet</dt><dd>{job.accepted_inputs.source_packet}</dd><dt>Requested scope</dt><dd>{job.accepted_inputs.requested_scope}</dd></dl>
          {job.result?.resource && <p>Result: {job.result.resource.type} {job.result.resource.id}</p>}
        </section>
      </>}
    </main>
  );
}
