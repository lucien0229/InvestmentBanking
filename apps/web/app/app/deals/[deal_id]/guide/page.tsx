"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const guideTasks = [
  ["Establish the first Source Packet", "Add synthetic Source Records for the Management Model, QoE, and Draft CIM.", "sources/add"],
  ["Inspect the first material conflict", "Inspect exact Evidence, locators, and relationships for EBITDA and Cash.", "evidence-decisions"],
  ["Record the first Human Decision", "Preserve rationale, impact, and the immutable control-review record.", "evidence-decisions/control-review"],
  ["Validate and establish a Revision", "Run deterministic rules and understand their boundary with professional review.", "analysis"],
  ["Inspect the first controlled outcome", "Confirm Package Readiness and the Internal Controlled Export.", "review-readiness"],
] as const;

export default function FirstDealGuidePage() {
  const { deal_id: dealId } = useParams<{ deal_id: string }>();
  const [guide, setGuide] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => { void fetch(`/api/v1/deals/${dealId}/guide`, { cache: "no-store" }).then(async (response) => { const body = await response.json().catch(() => ({})); if (response.ok) setGuide(body.data); else setError(body.detail ?? "First Deal Guide is unavailable."); }).catch(() => setError("The API could not be reached. Return to Deal Setup and retry.")); }, [dealId]);
  return <main className="dc-page"><a href={`/app/deals/${dealId}/setup`}>← Deal Setup</a><p className="dc-eyebrow">DEAL SETUP / FIRST DEAL GUIDE</p><h1>First Deal Guide</h1><p>Complete the first controlled loop without moving objects out of their canonical work areas. Each checkpoint preserves the same Account, Deal, and Workspace identity.</p>{guide ? <section className="dc-surface-card"><span className="dc-status-badge" data-tone="info">{guide.status}</span><h2>Next controlled action</h2><p>{guide.current_action}</p></section> : <div className="dc-state-panel" data-tone={error ? "critical" : "info"} role={error ? "alert" : "status"}><span className="dc-state-label">Guide status</span><strong className="dc-state-title">{error ? "First Deal Guide unavailable" : "Loading First Deal Guide…"}</strong><span className="dc-state-detail">{error || "The saved guide will show the next canonical object and its control boundary."}</span><a href={`/app/deals/${dealId}/setup`}>Return to Deal Setup →</a></div>}<ol className="dc-guide-task-list" aria-label="First Deal Guide checkpoints">{guideTasks.map(([title, detail, slug], index) => <li key={title} className={index < 2 ? "is-complete" : index === 2 ? "is-current" : undefined}><span className="dc-guide-index">0{index + 1}</span><div><h2>{title}</h2><p>{detail}</p></div><a className="dc-button dc-button-secondary" href={`/app/deals/${dealId}/${slug}`}>{index < 2 ? "Reinspect" : index === 2 ? "Continue" : "Open task"}</a></li>)}</ol><section className="dc-state-panel" data-tone="warning"><span className="dc-state-label">Control boundary</span><strong className="dc-state-title">Completing the Guide does not authorize external use</strong><span className="dc-state-detail">Source rights, Professional Usability, re-review, and external circulation remain separate controlled decisions.</span></section></main>;
}
