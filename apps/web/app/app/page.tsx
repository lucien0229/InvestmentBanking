"use client";

import { useEffect, useState } from "react";

export default function DealWorkspacePage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { void fetch("/api/v1/deals", { cache: "no-store" }).then(async (response) => { const body = await response.json().catch(() => ({})); if (!response.ok) setError(body.detail ?? "Authenticate to view Deals."); else setDeals(body.deals ?? []); }).catch(() => setError("The API could not be reached. Return to Account Access and retry.")); }, []);
  return <main className="dc-page"><a href="/">← Public entry</a><p className="dc-eyebrow">BANKER ACCOUNT / DEALS</p><h1>Deal Workspace</h1><p>Account-scoped paid Deals and their current Paid Preflight posture.</p>{error && <p role="alert">{error}</p>}<div className="dc-page-actions"><a className="dc-button" href="/app/deals/new">Create Deal</a><a className="dc-button dc-button-secondary" href="/app/account/usage-plan">Usage & plan</a></div>{deals.length > 0 ? <section className="dc-surface-card"><h2>Active Deals</h2><ul>{deals.map((deal) => <li key={deal.id}><a href={`/app/deals/${deal.id}/setup`}>{deal.name}</a> — <span className="dc-mono">{deal.paid_preflight_status}</span></li>)}</ul></section> : <section className="dc-surface-card"><span className="dc-eyebrow">EMPTY STATE</span><h2>No Deals available in this Account</h2><p>Complete purchase authority before creating the first Deal. Existing Deals will appear here with their current stage and Preflight posture.</p><a href="/app/deals/new">Create the first Deal →</a></section>}</main>;
}
