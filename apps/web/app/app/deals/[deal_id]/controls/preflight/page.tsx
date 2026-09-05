"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatePanel, StatusBadge } from "../../../../../../components/deal-control/ui";

type Preflight = { id: string; result: string; reason_code: string; recovery_action: string; output_ceiling?: string; controls?: { dimension: string; outcome: string; reason_code: string }[] };
const words = (value: string) => value.replaceAll("_", " ").replaceAll("-", " ");

export default function PreflightPage() {
  const { deal_id: dealId } = useParams<{ deal_id: string }>();
  const [result, setResult] = useState<Preflight | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    void fetch(`/api/v1/deals/${dealId}/preflights`, { cache: "no-store", signal: abort.signal }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail ?? "Saved Paid Preflight is unavailable.");
      if (!abort.signal.aborted) setResult(body.data.at(-1) ?? null);
    }).catch((cause) => { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : "Saved Paid Preflight is unavailable."); });
    return () => abort.abort();
  }, [dealId]);
  async function run() {
    setBusy(true); setError("");
    try {
    const response = await fetch(`/api/v1/deals/${dealId}/preflights`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": `web-preflight-${crypto.randomUUID()}` }, body: "{}" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setError(body.detail ?? "Paid Preflight failed.");
    setResult(body.data);
    } catch { setError("Paid Preflight could not be confirmed. Reload the saved result before retrying."); }
    finally { setBusy(false); }
  }
  return <main className="dc-page">
    <a href={`/app/deals/${dealId}/setup`}>← Deal Setup</a>
    <h1>Paid Preflight</h1>
    <p>Control results are privacy-safe. Source bytes are not sent to this screen or to a provider.</p>
    {error && <p role="alert">{error}</p>}
    <div className="dc-page-actions"><button type="button" onClick={run} disabled={busy}>{busy ? "Checking boundaries…" : "Run Paid Preflight"}</button><a className="dc-button dc-button-secondary" href={`/app/deals/${dealId}/setup`}>Review setup declarations</a></div>
    {result && <section className="dc-surface-card" aria-live="polite"><StatusBadge tone={result.result === "pass" ? "success" : "warning"}>{words(result.result)}</StatusBadge><h2>Saved control results</h2><p>{words(result.reason_code)}</p><p>Recovery: {words(result.recovery_action)}</p><p>Output ceiling: {words(result.output_ceiling ?? "none")}</p><div className="dc-table-wrap"><table><thead><tr><th>Control</th><th>Outcome</th><th>Basis</th></tr></thead><tbody>{(result.controls ?? []).map((control) => <tr key={control.dimension}><td>{words(control.dimension)}</td><td>{words(control.outcome)}</td><td>{words(control.reason_code)}</td></tr>)}</tbody></table></div>{["pass", "limited-proceed"].includes(result.result) ? <div className="dc-page-actions"><a className="dc-button" href={`/app/deals/${dealId}/sources/add`}>Add the first Source</a><a className="dc-button dc-button-secondary" href={`/app/deals/${dealId}/guide`}>Open First Deal Guide</a></div> : <StatePanel label="Setup action required" title="Complete the stated declarations before processing" detail="Review Source rights and minimum input readiness in Deal Setup, then run Paid Preflight again." />}</section>}
  </main>;
}
