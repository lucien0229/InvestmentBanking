"use client";
import { useEffect, useState } from "react";
import { PageHeader, StatePanel, StatusBadge } from "./ui";
import { readDomain, words, shortId } from "./domain-client";
type Job = { id: string; job_type: string; state: string; progress: { message_code?: string }; problem: { code?: string; recovery_action?: string } | null; row_version: number; worker_heartbeat_at: string | null; accepted_inputs?: Record<string, unknown>; result?: Record<string, unknown> | null; scope?: { deal_id: string; input_digest: string; input_version: string; workflow_version: string; allowance: { posture: string; quantity: string }; operations: string[]; expires_at: string | null }; latest_event?: { stage_code: string | null } };
export function JobWorkspace({ dealId, jobId }: { dealId: string; jobId?: string }) {
  const [jobs, setJobs] = useState<Job[]>([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const abort = new AbortController(); let stream: EventSource | undefined;
    setLoading(true); setError(""); setJobs([]);
    const load = async () => {
      if (jobId) {
        const response = await fetch(`/api/v1/jobs/${jobId}`, { cache: "no-store", signal: abort.signal }); const body = await response.json();
        if (!response.ok || body.scope?.deal_id !== dealId) throw new Error(response.ok ? "The Job is not available in this Deal." : body.detail ?? "The Job is unavailable.");
        if (!abort.signal.aborted) setJobs([body]);
      } else {
        const data = await readDomain<Job[]>(`/api/v1/deals/${dealId}/jobs`, abort.signal); if (!abort.signal.aborted) setJobs(data);
      }
    };
    const refreshRecords = () => void load().then(() => { if (!abort.signal.aborted) setError(""); }).catch((cause) => { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : "Job status could not be loaded."); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    refreshRecords();
    if (jobId) {
      stream = new EventSource(`/api/v1/jobs/${jobId}/events`);
      for (const event of ["job_state_changed", "job_progressed", "job_problem", "job_terminal"]) stream.addEventListener(event, refreshRecords);
      stream.addEventListener("job_snapshot",refreshRecords);
      stream.addEventListener("stream_closed", (event) => {
        stream?.close();
        const reason = JSON.parse((event as MessageEvent).data).reason;
        if (reason === "authorization_changed") { setJobs([]); setError("Account or Deal access changed. Sign in again to inspect this Job."); } else refreshRecords();
      });
      // EventSource retains Last-Event-ID and reconnects after transient failures.
      stream.onerror = () => { if (!abort.signal.aborted) setError("Live updates interrupted; reconnecting. The last recorded state is shown."); };
    }
    const timer = jobId ? undefined : setInterval(refreshRecords, 5000);
    return () => { abort.abort(); stream?.close(); if (timer) clearInterval(timer); };
  }, [dealId, jobId, refresh]);
  async function mutate(job: Job, action: "retries" | "cancellations") {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/v1/jobs/${job.id}/${action}`, { method: "POST", headers: { "content-type": "application/json", "if-match": `"job-${job.row_version}"`, "idempotency-key": crypto.randomUUID() }, ...(action === "cancellations" ? { body: JSON.stringify({ reason: "banker_requested" }) } : {}) });
      const result = await response.json(); if (!response.ok) throw new Error(result.detail ?? "The Job command was not accepted."); setRefresh((value) => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The Job command was not accepted."); } finally { setBusy(false); }
  }
  return <div className="dc-analysis-page"><PageHeader eyebrow="Action Center · durable operations" title={jobId ? "Inspect exact Job and recovery" : "Job activity"} description="Accepted inputs and completed checkpoints are retained. Recovery acts on the current Job version; a visible running state does not establish completion." />
    {error && <StatePanel tone="warning" label="Job access or update" title={error}><button onClick={() => setRefresh((value) => value + 1)}>Reload current state</button></StatePanel>}
    {loading ? <StatePanel label="Loading" title="Loading authoritative Jobs…" /> : !jobs.length && !error ? <StatePanel label="No Jobs" title="No durable operations have been requested for this Deal" /> : jobs.map((job) => <section key={job.id} className="dc-surface-card"><span className="dc-eyebrow">{shortId(job.id)} · version {job.row_version}</span><h2><a href={`/app/deals/${dealId}/actions/jobs/${job.id}`}>{words(job.job_type)}</a></h2><StatusBadge tone={job.state === "completed" ? "success" : /failed|blocked/.test(job.state) ? "warning" : "neutral"}>{words(job.state)}</StatusBadge><p>{words(job.progress.message_code)}</p><p>Checkpoint: {words(job.latest_event?.stage_code ?? "accepted_command")}</p><p>Last heartbeat: {job.worker_heartbeat_at ? new Date(job.worker_heartbeat_at).toLocaleString() : "Not yet claimed"}</p>{job.problem && <StatePanel tone="warning" label={words(job.problem.code)} title={words(job.problem.recovery_action)} />}
      {job.state === "failed_retryable" && <button className="dc-button" disabled={busy} onClick={() => void mutate(job, "retries")}>Retry from accepted checkpoint</button>}{!["completed", "canceled", "failed_terminal"].includes(job.state) && <button className="dc-button dc-button-secondary" disabled={busy} onClick={() => void mutate(job, "cancellations")}>Cancel Job</button>}
      {job.state==="waiting_for_source"&&<p>Complete processing and inspect rights for the exact accepted Source. <a href={`/app/deals/${dealId}/sources`}>Inspect Source dependency →</a></p>}
      {job.state==="waiting_for_user"&&typeof job.accepted_inputs?.assumption_id==="string"&&<a href={`/app/deals/${dealId}/evidence-decisions/control-review?assumption=${job.accepted_inputs.assumption_id}`}>Review the exact Assumption dependency →</a>}
      {job.scope && <dl><dt>Exact Deal</dt><dd className="dc-mono">{job.scope.deal_id}</dd><dt>Input version / identity</dt><dd>{job.scope.input_version}<br /><span className="dc-mono">{job.scope.input_digest}</span></dd><dt>Workflow</dt><dd>{job.scope.workflow_version}</dd><dt>Allowance</dt><dd>{job.scope.allowance.quantity} · {words(job.scope.allowance.posture)}</dd><dt>Permitted operations</dt><dd>{job.scope.operations.map(words).join(", ") || "Issued when claimed"}</dd></dl>}{job.accepted_inputs && <details><summary>Accepted inputs</summary><pre className="dc-source-excerpt">{JSON.stringify(job.accepted_inputs, null, 2)}</pre></details>}{job.result && <details open><summary>Recorded result</summary><pre className="dc-source-excerpt">{JSON.stringify(job.result, null, 2)}</pre></details>}</section>)}
  </div>;
}
