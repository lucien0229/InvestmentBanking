"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader, StatePanel, StatusBadge } from "../../../../../components/deal-control/ui";

type Guide = { status: string | null; current_action: string | null };
type Checkpoint = { title: string; detail: string; route: string; receipt: string | null; state: "recorded" | "pending" };
export default function FirstDealGuidePage() {
  const { deal_id: dealId } = useParams<{ deal_id: string }>();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    async function read(path: string) {
      const response = await fetch(`/api/v1/deals/${dealId}/${path}`, { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail ?? "A Guide checkpoint could not be loaded.");
      return body.data;
    }
    void Promise.all([read("guide"), read("source-packets"), read("evidence"), read("human-decisions"), read("deterministic-validation-records")]).then(([saved, packets, evidence, decisions, validations]) => {
      if (disposed) return;
      setGuide(saved);
      const passed = validations.find((record: { outcome?: string; result?: { passed?: boolean } }) => record.outcome === "passed" || record.result?.passed === true);
      const rows = [
        { title: "Establish the first Source Packet", detail: "Select exact Source Record versions, assess rights and coverage, and define the Work Objective.", route: "sources", receipt: packets[0]?.id ?? null },
        { title: "Inspect exact Evidence", detail: "Read the Source context, native locator and supporting or challenging relationships.", route: "evidence-decisions", receipt: evidence[0]?.id ?? null },
        { title: "Record a scoped Human Decision", detail: "Preserve the selected treatment, contrary Evidence, rationale and conditions in an immutable receipt.", route: "evidence-decisions/control-review", receipt: decisions[0]?.id ?? null },
        { title: "Validate controlled financial inputs", detail: "Run deterministic checks against pinned inputs and inspect the exact result and exceptions.", route: "analysis", receipt: passed?.id ?? null },
        { title: "Inspect the controlled outcome", detail: "Review the affected Workbook, Revision and readiness. Internal Controlled Export is a separate checkpoint.", route: "review-readiness", receipt: null },
      ];
      setCheckpoints(rows.map((row) => ({ ...row, state: row.receipt ? "recorded" : "pending" })));
    }).catch((cause) => { if (!disposed) setError(cause instanceof Error ? cause.message : "The Guide is unavailable."); });
    return () => { disposed = true; };
  }, [dealId]);
  const current = checkpoints.findIndex((item) => item.state === "pending");
  return <main className="dc-page"><a href={`/app/deals/${dealId}/setup`}>← Deal Setup</a><PageHeader eyebrow="Deal setup · First Deal Guide" title="Your first controlled loop" description="Continue through the formal objects in this Deal. Recorded objects remain inspectable; opening a page does not complete a checkpoint." />
    {error ? <StatePanel tone="critical" label="Guide unavailable" title={error}><a href={`/app/deals/${dealId}/setup`}>Return to Deal Setup</a></StatePanel> : !guide ? <StatePanel label="Loading" title="Loading saved checkpoints…" /> : <>
      <section className="dc-surface-card"><StatusBadge>{guide.status ?? "Guide not established"}</StatusBadge><h2>Next controlled action</h2><p>{checkpoints[current]?.title ?? "Inspect the recorded control history"}</p><small>{guide.current_action?.replaceAll("_", " ") ?? "Complete Paid Preflight to establish the Guide."}</small></section>
      <ol className="dc-guide-task-list" aria-label="First Deal Guide checkpoints">{checkpoints.map((item, index) => <li key={item.title} className={item.state === "recorded" ? "is-complete" : index === current ? "is-current" : undefined}><span className="dc-guide-index">0{index + 1}</span><div><h2>{item.title}</h2><p>{item.detail}</p><StatusBadge tone={item.state === "recorded" ? "success" : "neutral"}>{item.state === "recorded" ? "Recorded object available" : "Pending"}</StatusBadge>{item.receipt && <small className="dc-mono">{item.receipt}</small>}</div><a className="dc-button dc-button-secondary" href={`/app/deals/${dealId}/${item.route}`}>{item.receipt ? "Inspect" : index === current ? "Continue" : "Open task"}</a></li>)}</ol>
    </>}
    <StatePanel tone="warning" label="Control boundary" title="Each result has its own scope" detail="Source rights, professional review, Internal Controlled Export and external use retain their separate requirements." />
  </main>;
}
