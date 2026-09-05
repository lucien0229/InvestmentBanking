"use client";

import { useEffect, useState } from "react";
import { PageHeader, StatePanel, StatusBadge } from "../../components/deal-control/ui";

type Deal = { id: string; name: string; business_stage: string; workspace_posture: string; paid_preflight_status: string; capacity_slot: number | null };
export default function DealWorkspacePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false;
    setLoading(true); setError("");
    void fetch("/api/v1/deals", { cache: "no-store" }).then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail ?? "Your Deals could not be loaded.");
      if (!disposed) setDeals(body.deals ?? []);
    }).catch((cause) => { if (!disposed) setError(cause instanceof Error ? cause.message : "Your Deals could not be loaded."); })
      .finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; };
  }, [attempt]);
  const visible = deals.filter((deal) => `${deal.name} ${deal.business_stage} ${deal.workspace_posture}`.toLowerCase().includes(query.toLowerCase()));
  return <main className="dc-page"><PageHeader eyebrow="Banker Account" title="Your Deals" description="Open a Deal to continue its controlled work. Each workspace keeps its own sources, decisions and history." actions={<><a className="dc-button" href="/app/deals/new">Create Deal</a><a className="dc-button dc-button-secondary" href="/app/account/usage-plan">Usage & plan</a></>} />
    {loading ? <StatePanel label="Loading" title="Loading your Deals…" /> : error ? <StatePanel tone="critical" label="Deals unavailable" title={error}><div className="dc-page-actions"><button onClick={() => setAttempt((value) => value + 1)}>Retry</button><a href="/account-access?return_to=/app/deals">Sign in with Passkey</a></div></StatePanel> : <>
      <div className="dc-toolbar"><label className="dc-search-field"><span className="dc-sr-only">Search Deals</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Deals…" /></label><span>{deals.length} {deals.length === 1 ? "workspace" : "workspaces"}</span></div>
      {visible.length ? <section className="dc-surface-card"><div className="dc-table-wrap"><table><thead><tr><th>Deal</th><th>Business stage</th><th>Paid Preflight</th><th>Workspace</th><th>Next action</th></tr></thead><tbody>{visible.map((deal) => <tr key={deal.id}><td><a href={`/app/deals/${deal.id}/overview`}><strong>{deal.name}</strong></a><br /><small className="dc-mono">{deal.id.slice(0, 8)}</small></td><td>{deal.business_stage?.replaceAll("_", " ") ?? "Not recorded"}</td><td><StatusBadge tone={deal.paid_preflight_status === "pass" ? "success" : "warning"}>{deal.paid_preflight_status ?? "Not run"}</StatusBadge></td><td>{deal.workspace_posture?.replaceAll("_", " ") ?? "Unavailable"}<br /><small>{deal.capacity_slot ? `Active Deal slot ${deal.capacity_slot}` : "No capacity reservation"}</small></td><td><a href={`/app/deals/${deal.id}/${deal.paid_preflight_status === "pass" ? "overview" : "setup"}`}>{deal.paid_preflight_status === "pass" ? "Open workspace" : "Continue setup"} →</a></td></tr>)}</tbody></table></div></section> : <StatePanel label={query ? "Search" : "First Deal"} title={query ? "No matching Deals" : "Create your first Deal"} detail={query ? "Change or clear the search to see your workspaces." : "Your purchased plan provides the capacity to establish a Deal and complete Paid Preflight."}>{query ? <button onClick={() => setQuery("")}>Clear search</button> : <a href="/app/deals/new">Create Deal →</a>}</StatePanel>}
    </>}
  </main>;
}
