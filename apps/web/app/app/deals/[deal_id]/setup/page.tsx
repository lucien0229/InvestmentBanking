"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function DealSetupPage() {
  const { deal_id: dealId } = useParams<{ deal_id: string }>();
  const [projection, setProjection] = useState<Record<string, any> | null>(null);
  const [source, setSource] = useState("");
  const [rights, setRights] = useState("confirmed");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  async function load() {
    const response = await fetch(`/api/v1/deals/${dealId}/setup`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) return setError(body.detail ?? "Deal Setup is unavailable.");
    setProjection(body);
    setSource(body.data.setup.source_reference.reference ?? "");
    setRights(body.data.setup.source_rights);
  }
  useEffect(() => { void load(); }, [dealId]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch(`/api/v1/deals/${dealId}/setup`, { method: "PATCH", headers: { "content-type": "application/json", "if-match": `"deal-setup-${projection?.data.setup.version}"` }, body: JSON.stringify({ source_reference: source || null, source_rights: rights }) });
    const body = await response.json();
    if (!response.ok) return setError(body.detail ?? "Setup save failed.");
    setProjection(body); setSaved("Setup saved. Run Paid Preflight to unlock the next controlled action.");
  }

  if (!projection) return <main style={{ maxWidth: 860, margin: "0 auto", padding: 40 }}><h1>Deal Setup</h1><p>{error || "Loading…"}</p></main>;
  const deal = projection.data;
  return <main style={{ maxWidth: 860, margin: "0 auto", padding: 40 }}>
    <a href="/app/deals/new">← New Deal</a>
    <h1>{deal.identity.display_name}</h1>
    <p>{deal.identity.represented_party} · {deal.identity.transaction_subject}</p>
    <p>Capacity: slot {deal.capacity.slot}, {deal.capacity.state}. Guide: {deal.first_deal_guide.status}.</p>
    {error && <p role="alert" style={{ color: "#a22" }}>{error}</p>}
    {saved && <p role="status" style={{ color: "#16724b" }}>{saved}</p>}
    <form onSubmit={save} style={{ display: "grid", gap: 14, maxWidth: 560 }}>
      <label>Source reference<input value={source} onChange={(event) => setSource(event.target.value)} placeholder="source:packet-v1" /></label>
      <label>Source-use rights<select value={rights} onChange={(event) => setRights(event.target.value)}><option value="missing">Missing</option><option value="confirmed">Confirmed</option><option value="limited">Limited</option><option value="blocked">Blocked</option></select></label>
      <button type="submit">Save setup</button>
    </form>
    <p><a href={`/app/deals/${dealId}/controls/preflight`}>Run Paid Preflight →</a> · <a href={`/app/deals/${dealId}/sources`}>Sources →</a> · <a href={`/app/deals/${dealId}/sources/add`}>Add Source →</a> · <a href={`/app/deals/${dealId}/guide`}>First Deal Guide</a></p>
  </main>;
}
