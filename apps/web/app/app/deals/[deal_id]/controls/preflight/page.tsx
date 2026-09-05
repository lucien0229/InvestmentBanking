"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatePanel, StatusBadge } from "../../../../../../components/deal-control/ui";

type Preflight = { id: string; result: string; reason_code: string; recovery_action: string; output_ceiling?: string; permitted_scope: string[]; excluded_scope: string[]; controls?: { dimension: string; outcome: string; reason_code: string; recovery_action: string }[] };
const words = (value: string) => value.replaceAll("_", " ").replaceAll("-", " ");

export default function PreflightPage() {
  const { deal_id: dealId } = useParams<{ deal_id: string }>();
  const [result, setResult] = useState<Preflight | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [limitedAccepted, setLimitedAccepted] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    void fetch(`/api/v1/deals/${dealId}/preflights`, { cache: "no-store", signal: abort.signal }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail ?? "Saved Paid Preflight is unavailable.");
      const latest = body.data.at(-1);
      if (!latest) return;
      const [detailResponse, setupResponse, auditResponse] = await Promise.all([fetch(`/api/v1/deals/${dealId}/preflights/${latest.id}`, { cache: "no-store", signal: abort.signal }), fetch(`/api/v1/deals/${dealId}/setup`, { cache: "no-store", signal: abort.signal }), fetch(`/api/v1/account/audit-events?deal_id=${dealId}`, { cache: "no-store", signal: abort.signal })]);
      const [detail, setup, audit] = await Promise.all([detailResponse.json(), setupResponse.json(), auditResponse.json()]);
      if (!detailResponse.ok || !setupResponse.ok || !auditResponse.ok) throw new Error("The exact saved Preflight could not be loaded.");
      if (!abort.signal.aborted) { setResult(detail.data); setLimitedAccepted(setup.data.paid_preflight.id === latest.id && setup.data.workspace.processing_posture === "limited" && audit.events.some((event: { code: string; object_id: string }) => event.code === "limited_preflight_scope_accepted" && event.object_id === latest.id)); }
    }).catch((cause) => { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : "Saved Paid Preflight is unavailable."); }).finally(() => { if (!abort.signal.aborted) setBusy(false); });
    return () => abort.abort();
  }, [dealId]);
  async function run() {
    setBusy(true); setError(""); setLimitedAccepted(false);
    try {
    const response = await fetch(`/api/v1/deals/${dealId}/preflights`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": `web-preflight-${crypto.randomUUID()}` }, body: "{}" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setError(body.detail ?? "Paid Preflight failed.");
    setResult(body.data);
    } catch { setError("Paid Preflight could not be confirmed. Reload the saved result before retrying."); }
    finally { setBusy(false); }
  }
  async function acceptLimited() {
    if (!result || !result.output_ceiling) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/v1/deals/${dealId}/preflights/${result.id}/limited-proceed-acceptances`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": `web-limited-${result.id}` }, body: JSON.stringify({ accepted_scope: result.permitted_scope, excluded_scope: result.excluded_scope, output_ceiling: result.output_ceiling }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail ?? "The limited scope was not accepted. Reload the current result.");
      const currentResponse = await fetch(`/api/v1/deals/${dealId}/setup`, { cache: "no-store" });
      const current = await currentResponse.json();
      const currentAcceptance = currentResponse.ok && body.data.accepted === true && current.data.paid_preflight.id === result.id && current.data.workspace.processing_posture === "limited";
      setLimitedAccepted(currentAcceptance);
      if (!currentAcceptance) setError("The acceptance receipt belongs to an earlier Setup. Run Paid Preflight for the current declarations before continuing.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Limited acceptance could not be confirmed. Reload before retrying."); }
    finally { setBusy(false); }
  }
  return <main className="dc-page">
    <a href={`/app/deals/${dealId}/setup`}>← Deal Setup</a>
    <h1>Paid Preflight</h1>
    <p>Control results are privacy-safe. Source bytes are not sent to this screen or to a provider.</p>
    {error && <p role="alert">{error}</p>}
    <div className="dc-page-actions"><button type="button" onClick={run} disabled={busy}>{busy ? "Checking boundaries…" : "Run Paid Preflight"}</button><a className="dc-button dc-button-secondary" href={`/app/deals/${dealId}/setup`}>Review setup declarations</a></div>
    {result && <section className="dc-surface-card" aria-live="polite"><StatusBadge tone={result.result === "pass" ? "success" : "warning"}>{words(result.result)}</StatusBadge><h2>Saved control results</h2><p>{words(result.reason_code)}</p><p>Recovery: {words(result.recovery_action)}</p><p>Output ceiling: {words(result.output_ceiling ?? "none")}</p><div className="dc-table-wrap"><table><thead><tr><th>Control</th><th>Outcome</th><th>Basis / recovery</th></tr></thead><tbody>{(result.controls ?? []).map((control) => <tr key={control.dimension}><td>{words(control.dimension)}</td><td>{words(control.outcome)}</td><td>{words(control.reason_code)}<br /><small>{words(control.recovery_action)}</small></td></tr>)}</tbody></table></div><div className="dc-grid-two"><div><h3>Permitted scope</h3><ul>{result.permitted_scope.map((scope) => <li key={scope}>{words(scope)}</li>)}</ul></div><div><h3>Excluded scope</h3><ul>{result.excluded_scope.map((scope) => <li key={scope}>{words(scope)}</li>)}</ul></div></div>{result.result === "limited-proceed" && <StatePanel tone="warning" label="Exact limited scope" title={limitedAccepted ? "Limited scope acceptance recorded" : "Accept the displayed limits before continuing"} detail="Only the displayed permitted scope is available. Excluded operations and external use remain blocked.">{!limitedAccepted && <button type="button" className="dc-button dc-material-command" onClick={acceptLimited} disabled={busy}>Accept this exact limited scope</button>}</StatePanel>}{result.result === "pass" ? <div className="dc-page-actions"><a className="dc-button" href={`/app/deals/${dealId}/sources/add`}>Add the first Source</a><a className="dc-button dc-button-secondary" href={`/app/deals/${dealId}/guide`}>Open First Deal Guide</a></div> : result.result === "limited-proceed" && limitedAccepted ? <p><a href={`/app/deals/${dealId}/sources`}>Inspect Sources within the accepted scope →</a></p> : <StatePanel label="Setup action required" title="Complete the stated declarations before processing" detail="Review Source rights and minimum input readiness in Deal Setup, then run Paid Preflight again." />}</section>}
  </main>;
}
