"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, StatePanel, StatusBadge } from "./ui";

const base = (dealId: string) => `/app/deals/${dealId}`;
type Package = { id: string; purpose: string; row_version: number; current_snapshot_id: string | null; business_stage?: string };
type Snapshot = { id: string; ordinal: number; purpose: string; audience: string; business_stage: string; readiness_basis_digest: string; limitations: string[]; omissions: string[]; revisions?: Array<{ revision_id: string; package_role: string; stage_applicability: string }> };
type ReadinessRow = { requirement: string; exact_scope: string; package_role?: string; current_posture: string; evidence_control: string; blocker: string | null; next_controlled_action: string; stage_applicability: string };
type Readiness = { snapshot_id: string; execution_package_id: string; purpose: string; audience: string; business_stage: string; package_readiness: string; rows: ReadinessRow[]; blockers: Array<{ requirement: string; exact_scope: string; blocker: string; next_controlled_action: string }>; limitations: string[]; omissions: string[]; external_use_authorized: boolean; external_use_posture: string; scalar_score: null; basis_digest: string };
type Deliverable = { id: string; deliverable_type: string; title: string; current_revision_id: string | null; stage_applicability?: string; current_revision_ordinal?: number | null };

const roleFor = (type: string) => type === "analysis_valuation_workbook" ? "analysis_valuation_workbook" : type === "auction_control_workbook" ? "auction_control_workbook" : type === "teaser_presentation" ? "teaser" : type === "cim_presentation" ? "cim" : "conditional";
const words = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const tone = (value: string) => value === "passed" || value === "analysis_ready" || value === "senior_review_ready" ? "success" : value === "blocked" || value === "failed" || value === "not_authorized" ? "critical" : value === "not_stage_required" ? "info" : "warning";

export function PreparationPackageWorkspace({ dealId, readinessOnly = false }: { dealId: string; readinessOnly?: boolean }) {
  const api = `/api/v1/deals/${dealId}`;
  const [packages, setPackages] = useState<Package[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [packageResponse, deliverableResponse] = await Promise.all([
        fetch(`${api}/execution-packages`, { credentials: "same-origin", cache: "no-store" }),
        fetch(`${api}/deliverables`, { credentials: "same-origin", cache: "no-store" }),
      ]);
      const packagePayload = packageResponse.ok ? await packageResponse.json() : null;
      const deliverablePayload = deliverableResponse.ok ? await deliverableResponse.json() : null;
      const packageRows = Array.isArray(packagePayload?.data) ? packagePayload.data : [];
      const deliverableRows = Array.isArray(deliverablePayload?.data) ? deliverablePayload.data : [];
      setPackages(packageRows); setDeliverables(deliverableRows);
      const current = packageRows[0] as Package | undefined;
      if (!current?.current_snapshot_id) { setSnapshot(null); setReadiness(null); return; }
      const snapshotResponse = await fetch(`${api}/execution-packages/${current.id}/snapshots/${current.current_snapshot_id}`, { credentials: "same-origin", cache: "no-store" });
      const snapshotPayload = snapshotResponse.ok ? await snapshotResponse.json() : null;
      const exact = snapshotPayload?.data as Snapshot | null;
      setSnapshot(exact);
      if (exact) {
        const readinessResponse = await fetch(`${api}/execution-packages/${current.id}/snapshots/${exact.id}/readiness?purpose=${encodeURIComponent(exact.purpose)}&audience=${encodeURIComponent(exact.audience)}`, { credentials: "same-origin", cache: "no-store" });
        const readinessPayload = readinessResponse.ok ? await readinessResponse.json() : null;
        setReadiness((readinessPayload?.data as Readiness | null) ?? null);
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Preparation Package could not be loaded."); }
    finally { setLoading(false); }
  }, [api]);
  useEffect(() => { void load(); }, [load]);

  async function command(url: string, body: unknown, etag?: number) {
    const response = await fetch(url, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID(), ...(etag ? { "if-match": `\"${etag}\"` } : {}) }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail ?? payload.code ?? "Preparation Package command failed.");
    return payload.data;
  }
  async function createPackage() {
    setBusy(true); setError("");
    try { await command(`${api}/execution-packages`, { purpose: "Preparation launch package and controlled auction execution" }); setNotice("Execution Package created. Build an exact Snapshot from current Deliverable Revisions."); await load(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Execution Package creation failed."); }
    finally { setBusy(false); }
  }
  async function createSnapshot() {
    const current = packages[0]; if (!current) return;
    const revisions = deliverables.filter((item) => item.current_revision_id).map((item) => ({ revision_id: item.current_revision_id as string, package_role: roleFor(item.deliverable_type), inclusion_reason: "Current exact Deliverable Revision for the Preparation Package", stage_applicability: item.stage_applicability === "not_stage_required" ? "not_stage_required" : item.deliverable_type.includes("workbook") ? "always_required" : "current_stage_required" }));
    setBusy(true); setError("");
    try { await command(`${api}/execution-packages/${current.id}/snapshots`, { revisions, controls: [], dependencies: [], omissions: [], limitations: ["Professional suitability and External-Use Decision remain separate Banker controls."], reason: "Freeze current Preparation Package perimeter" }, current.row_version); setNotice("Exact Package Snapshot recorded. Readiness is being recomputed from that immutable scope."); await load(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Package Snapshot creation failed."); }
    finally { setBusy(false); }
  }

  if (loading) return <StatePanel tone="info" label="Loading" title="Loading the exact Preparation Package…" />;
  if (error) return <><PageHeader eyebrow="Review & Readiness" title="Preparation Package" description="The exact Deal-scoped package could not be loaded." actions={<StatusBadge tone="critical">Needs attention</StatusBadge>} /><StatePanel tone="critical" label="Request failed" title={error} /><button className="dc-button" type="button" onClick={() => void load()}>Retry</button></>;
  const current = packages[0];
  if (!current) return <><PageHeader eyebrow="Deal workspace · Execution Package" title="Preparation Package" description="Create the persistent aggregate before freezing an exact Package Snapshot." actions={<StatusBadge tone="warning">Not started</StatusBadge>} /><StatePanel tone="warning" label="No Execution Package" title="Create the Preparation Package control record" detail="This creates only the aggregate identity. It does not create a readiness result or external authority." /><button className="dc-button" type="button" disabled={busy} onClick={() => void createPackage()}>{busy ? "Creating…" : "Create Execution Package"}</button></>;
  if (!snapshot) return <><PageHeader eyebrow="Deal workspace · Execution Package" title="Preparation Package" description="Freeze the current Deliverable Revisions, controls and limitations into one immutable Package Snapshot." actions={<><StatusBadge tone="warning">Snapshot required</StatusBadge><span className="dc-mono">PKG {current.id.slice(0, 8)}</span></>} /><section className="dc-surface-card"><h2>Current package perimeter</h2><p>{deliverables.filter((item) => item.current_revision_id).length} Deliverable Revisions are available for exact inclusion. Stage applicability will be retained per member.</p><div className="dc-deliverable-rows">{deliverables.filter((item) => item.current_revision_id).map((item) => <article className="dc-deliverable-row" key={item.id}><div><strong>{item.title}</strong><small className="dc-mono">{item.current_revision_id} · Revision {item.current_revision_ordinal ?? "—"}</small></div><StatusBadge tone={item.stage_applicability === "not_stage_required" ? "info" : "warning"}>{item.stage_applicability === "not_stage_required" ? "Not stage-required" : "Included candidate"}</StatusBadge></article>)}</div><button className="dc-button" type="button" disabled={busy || !deliverables.some((item) => item.current_revision_id)} onClick={() => void createSnapshot()}>{busy ? "Freezing exact Snapshot…" : "Create exact Package Snapshot"}</button></section></>;

  const rows = readiness?.rows ?? [];
  const groups = ["Always required", "Current-stage required", "Conditional", "Not stage-required"];
  return <div className="dc-analysis-page" data-od-id="preparation-package-readiness"><PageHeader eyebrow={readinessOnly ? "Review & Readiness · Package Snapshot" : "Deal workspace · Execution Package"} title={readinessOnly ? "Package Readiness" : "Preparation Package"} description="Inspect exact package scope, independent readiness families and blocker-first next actions. Readiness never authorizes external use." actions={<><StatusBadge tone={tone(readiness?.package_readiness ?? "blocked")}>{words(readiness?.package_readiness ?? "loading")}</StatusBadge><span className="dc-mono">Snapshot {snapshot.ordinal} · {snapshot.id.slice(0, 8)}</span></>} />
    <section className="dc-grid-three"><article className="dc-surface-card"><span className="dc-eyebrow">Exact Snapshot</span><h2 className="dc-mono">{snapshot.id.slice(0, 12)}</h2><p>{snapshot.business_stage} · {snapshot.audience}</p></article><article className="dc-surface-card"><span className="dc-eyebrow">Active blockers</span><h2 className="dc-mono">{readiness?.blockers.length ?? 0}</h2><p>Each blocker links to one controlled recovery action.</p></article><article className="dc-surface-card"><span className="dc-eyebrow">External use</span><h2>Not authorized</h2><p>External-Use Decision, delivery and actual use remain separate.</p><StatusBadge tone="critical">{readiness?.external_use_posture ?? "not_authorized"}</StatusBadge></article></section>
    <section className="dc-surface-card"><div className="dc-section-heading"><div><p className="dc-eyebrow">Package perimeter</p><h2>Deliverables and applicability</h2></div><a className="dc-inline-button" href={`${base(dealId)}/execution-package`}>Package overview</a></div><div className="dc-table-wrap"><table><thead><tr><th>Requirement</th><th>Exact scope</th><th>Current posture</th><th>Evidence / control</th><th>Blocker</th><th>Next controlled action</th></tr></thead><tbody>{rows.filter((row) => groups.includes(row.stage_applicability === "not_stage_required" ? "Not stage-required" : row.package_role?.includes("workbook") ? "Always required" : "Current-stage required")).map((row) => <tr key={`${row.requirement}:${row.exact_scope}`}><td><strong>{row.requirement}</strong></td><td className="dc-mono">{row.exact_scope.slice(0, 16)}</td><td><StatusBadge tone={tone(row.current_posture)}>{words(row.current_posture)}</StatusBadge></td><td>{words(row.evidence_control)}</td><td>{row.blocker ?? "None"}</td><td>{row.next_controlled_action}</td></tr>)}</tbody></table></div><p className="dc-inline-notice">No scalar score or master green state is calculated. A successful check changes only its exact scope.</p></section>
    <section className="dc-surface-card"><h2>Independent readiness families</h2><div className="dc-grid-three">{rows.filter((row) => !row.package_role).map((row) => <article key={row.requirement}><span className="dc-eyebrow">{row.evidence_control}</span><h3>{row.requirement}</h3><StatusBadge tone={tone(row.current_posture)}>{words(row.current_posture)}</StatusBadge><p>{row.blocker ?? row.next_controlled_action}</p></article>)}</div></section>
    {readiness?.limitations?.length ? <section className="dc-surface-card"><h2>Retained limitations</h2>{readiness.limitations.map((item) => <p key={item}>{item}</p>)}</section> : null}
    <div className="dc-page-actions"><a className="dc-button" href={`${base(dealId)}/review-readiness/package-readiness`}>Review exact readiness</a><a className="dc-button dc-button-secondary" href={`${base(dealId)}/history-portability`}>Open Package history</a></div>{notice ? <p className="dc-inline-notice" role="status">{notice}</p> : null}</div>;
}
