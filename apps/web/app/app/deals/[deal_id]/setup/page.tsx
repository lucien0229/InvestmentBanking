"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DealSetupStepper } from "../../../../../components/deal-control/ui";

export default function DealSetupPage() {
  const { deal_id: dealId } = useParams<{ deal_id: string }>();
  const [projection, setProjection] = useState<Record<string, any> | null>(null);
  const [source, setSource] = useState("");
  const [rights, setRights] = useState("confirmed");
  const [minimumPacket, setMinimumPacket] = useState("incomplete");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  async function load() {
    setError("");
    try {
    const response = await fetch(`/api/v1/deals/${dealId}/setup`, { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setError(body.detail ?? "Deal Setup is unavailable.");
    setProjection(body);
    setSource(body.data.setup.source_reference.reference ?? "");
    setRights(body.data.setup.source_rights);
    setMinimumPacket(body.data.setup.minimum_packet);
    } catch { setError("Deal Setup could not be reached. Retry to load the saved state."); }
  }
  useEffect(() => { void load(); }, [dealId]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(""); setSaved("");
    try {
    const response = await fetch(`/api/v1/deals/${dealId}/setup`, { method: "PATCH", headers: { "content-type": "application/json", "if-match": `"deal-setup-${projection?.data.setup.version}"` }, body: JSON.stringify({ source_reference: source || null, source_rights: rights, minimum_packet: minimumPacket }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setError(body.detail ?? "Setup save failed.");
    setProjection(body); setSaved("Setup saved. Run Paid Preflight to evaluate the changed scope.");
    } catch { setError("Setup save could not be confirmed. Reload before retrying."); }
  }

  if (!projection) return <main className="dc-page"><p className="dc-eyebrow">DEAL SETUP / LOADING</p><h1>Deal Setup</h1><DealSetupStepper active="Confirm setup" /><div className="dc-state-panel" data-tone={error ? "critical" : "info"}><span className="dc-state-label">Setup status</span><strong className="dc-state-title">{error ? "Deal Setup unavailable" : "Loading Deal Setup…"}</strong><span className="dc-state-detail">{error || "The saved setup is being loaded. Retry from this page without creating a duplicate Deal."}</span>{error ? <a href="/app/deals">Return to Deals →</a> : null}</div></main>;
  const deal = projection.data;
  return <main className="dc-page">
    <a href="/app/deals/new">← New Deal</a>
    <h1>{deal.identity.display_name}</h1>
    <p>{deal.identity.represented_party} · {deal.identity.transaction_subject}</p>
    <p>Capacity: {deal.capacity.slot ? `slot ${deal.capacity.slot} · ${deal.capacity.state}` : "No capacity reservation recorded"}. Guide: {deal.first_deal_guide.status ?? "Not established"}.</p>
    <DealSetupStepper active="Confirm setup" />
    <section className="dc-surface-card dc-setup-review" aria-label="Deal setup review"><span className="dc-status-badge" data-tone={deal.paid_preflight.result === "pass" ? "success" : "warning"}>Paid Preflight · {deal.paid_preflight.result}</span><h2>Confirm default control boundaries</h2><p>{deal.identity.display_name} · {deal.paid_preflight.reason_code?.replaceAll("_", " ") ?? "Review the saved control boundaries before processing."}</p><dl><dt>Business stage</dt><dd>{deal.identity.business_stage?.replaceAll("_", " ") ?? "Not recorded"}</dd><dt>Controlled purpose</dt><dd>{deal.setup.intended_use?.replaceAll("_", " ") ?? deal.identity.intended_purpose}</dd><dt>External use</dt><dd>Blocked by default</dd><dt>AI boundary</dt><dd>Proposals only; facts and Human Decisions require auditable controls</dd></dl></section>
    {error && <p role="alert" style={{ color: "#a22" }}>{error}</p>}
    {saved && <p role="status" style={{ color: "#16724b" }}>{saved}</p>}
    <form onSubmit={save} style={{ display: "grid", gap: 14, maxWidth: 560 }}>
      <label>Source reference<input value={source} onChange={(event) => setSource(event.target.value)} placeholder="source:packet-v1" /></label>
      <small>Use a stable reference such as source:management-accounts for the planned input set. This declaration does not accept Source bytes or assess Packet coverage.</small>
      <label>Source-use rights<select value={rights} onChange={(event) => setRights(event.target.value)}><option value="missing">Missing</option><option value="confirmed">Confirmed</option><option value="limited">Limited</option><option value="blocked">Blocked</option></select></label>
      <label>Minimum input readiness<select value={minimumPacket} onChange={(event) => setMinimumPacket(event.target.value)}><option value="missing">No input set identified</option><option value="incomplete">Input set still incomplete</option><option value="complete">Minimum input set identified for the declared purpose</option></select></label>
      <button type="submit">Save setup</button>
    </form>
    <p><a href={`/app/deals/${dealId}/controls/preflight`}>Run Paid Preflight →</a> · <a href={`/app/deals/${dealId}/sources`}>Sources →</a> · <a href={`/app/deals/${dealId}/sources/add`}>Add Source →</a> · <a href={`/app/deals/${dealId}/guide`}>First Deal Guide</a></p>
  </main>;
}
