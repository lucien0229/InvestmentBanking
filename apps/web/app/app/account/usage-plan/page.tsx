"use client";

import { useEffect, useState } from "react";

type Usage = { active_deal_capacity: number; granted_active_deals: number; used_active_deals: number; granted_allowances: { intensive_logical_pages: number; intensive_operations: number; archive_capacity_gb: number } };
type Entitlement = { term_start: string; term_end: string; active_deal_capacity: number; actor_name: string; capabilities: string[]; status: string };

export default function UsagePlanPage() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([fetch("/api/v1/account/usage"), fetch("/api/v1/account/entitlements")]).then(async ([usageResponse, entitlementResponse]) => {
      const usageBody = await usageResponse.json(); const entitlementBody = await entitlementResponse.json();
      if (!usageResponse.ok || !entitlementResponse.ok) return setError(usageBody.detail ?? entitlementBody.detail ?? "Account plan is unavailable.");
      setUsage(usageBody); setEntitlement(entitlementBody.entitlements?.[0] ?? null);
    }).catch(() => setError("The API could not be reached."));
  }, []);
  return <main style={{ maxWidth: 900, margin: "0 auto", padding: 48 }}><a href="/app/deals/project-northstar/overview">← Deal Workspace</a><p style={{ fontFamily: "monospace", fontSize: 12, marginTop: 32 }}>BANKER ACCOUNT / USAGE & PLAN</p><h1>Usage & plan</h1>{error && <p role="alert" style={{ color: "#a22" }}>{error}</p>}{entitlement && usage ? <section style={{ background: "white", border: "1px solid #ccd5d8", padding: 24 }}><dl><dt>Named Individual Banker</dt><dd>{entitlement.actor_name}</dd><dt>Term</dt><dd>{new Date(entitlement.term_start).toLocaleDateString("en-US")} — {new Date(entitlement.term_end).toLocaleDateString("en-US")}</dd><dt>Active Deals</dt><dd>{usage.used_active_deals} used / {entitlement.active_deal_capacity} available ({usage.granted_active_deals} slots allocated)</dd><dt>Core capability</dt><dd>{entitlement.capabilities.join(", ")}</dd><dt>Allowances</dt><dd>Per Active Deal per billing month: 250 newly processed files · 2,500 newly processed logical pages · 25 GB active storage · 20 Full-Workflow Operations</dd><dt>Granted add-on allowances</dt><dd>{usage.granted_allowances.intensive_logical_pages.toLocaleString("en-US")} intensive logical pages · {usage.granted_allowances.intensive_operations} intensive Full-Workflow Operations · {usage.granted_allowances.archive_capacity_gb} GB archive capacity</dd><dt>Add-ons</dt><dd>Additional Active Deal $500 monthly / $5,500 annual · intensive processing $1,000 per affected Active Deal-month · archive capacity $50 monthly per additional 250 GB after export/delete is offered</dd></dl><p>Evidence inspection, correction, deterministic validation, QC, Review, Human Decision, targeted Revision, Internal Controlled Export, and product-failure recovery are unmetered. Cancellation affects the next renewal only.</p></section> : <p role="status">No product-owned entitlement has been reconciled for this Account yet.</p>}</main>;
}
