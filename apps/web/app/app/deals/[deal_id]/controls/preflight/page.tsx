"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

export default function PreflightPage() {
  const { deal_id: dealId } = useParams<{ deal_id: string }>();
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  async function run() {
    const response = await fetch(`/api/v1/deals/${dealId}/preflights`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": `web-preflight-${crypto.randomUUID()}` }, body: "{}" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setError(body.detail ?? "Paid Preflight failed.");
    setResult(body.data);
  }
  return <main className="dc-page">
    <a href={`/app/deals/${dealId}/setup`}>← Deal Setup</a>
    <h1>Paid Preflight</h1>
    <p>Control results are privacy-safe. Source bytes are not sent to this screen or to a provider.</p>
    {error && <p role="alert">{error}</p>}
    <button type="button" onClick={run}>Run Paid Preflight</button>
    {result && <section aria-live="polite"><h2>{result.result}</h2><p>{result.reason_code}</p><p>Recovery: {result.recovery_action}</p><p>Output ceiling: {result.output_ceiling ?? "none"}</p><ul>{(result.controls ?? []).map((control: any) => <li key={control.dimension}>{control.dimension}: {control.outcome} — {control.reason_code}</li>)}</ul></section>}
  </main>;
}
