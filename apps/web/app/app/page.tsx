"use client";

import { useEffect, useState } from "react";

export default function DealWorkspacePage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { void fetch("/api/v1/deals", { cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) setError(body.detail ?? "Authenticate to view Deals."); else setDeals(body.deals ?? []); }); }, []);
  return <main style={{ maxWidth: 860, margin: "0 auto", padding: 40 }}><a href="/">← Public entry</a><h1>Deal Workspace</h1><p>Account-scoped paid Deals and their current Paid Preflight posture.</p>{error && <p role="alert" style={{ color: "#a22" }}>{error}</p>}<p><a href="/app/deals/new">Create Deal</a></p><ul>{deals.map((deal) => <li key={deal.id}><a href={`/app/deals/${deal.id}/setup`}>{deal.name}</a> — {deal.paid_preflight_status}</li>)}</ul></main>;
}
