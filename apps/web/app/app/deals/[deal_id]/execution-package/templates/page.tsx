"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

const compatibility = [
  ["Auction workbook", "XLSX", "v1.4", "Supported", "Preserves formula and sheet locator metadata."],
  ["CIM reader copy", "PDF", "v2.1", "Review required", "Reader parity must be checked against the Native Artifact."],
  ["Management presentation", "PPTX", "v1.2", "Limited", "Template excludes external-use authorization and recipient delivery."],
];

export default function TemplatesPage() {
  const { deal_id: dealId } = useParams<{ deal_id: string }>();
  const [selected, setSelected] = useState("");
  return <main className="dc-page"><a href={`/app/deals/${dealId}/sources`}>← Sources</a><p className="dc-eyebrow">EXECUTION PACKAGE / TEMPLATES & COMPATIBILITY</p><div className="dc-page-header"><h1>Templates & Compatibility</h1><p>Review product-owned template versions, supported formats and restrictions before selecting a template for this Deal.</p><div className="dc-page-actions"><span className="dc-status-badge" data-tone="info">Deal-scoped preview</span><span className="dc-mono">DEAL {dealId}</span></div></div><section className="dc-surface-card"><div className="dc-grid-three"><div><span className="dc-eyebrow">Template boundary</span><h2>Account reusable templates</h2><p>Account templates remain isolated from live Deal material until rights, compatibility, exact mapping and review are recorded.</p></div><div><span className="dc-eyebrow">Current revision</span><h2 className="dc-mono">0.3</h2><p>Template selections never authorize external use or recipient access.</p></div><div><span className="dc-eyebrow">Next action</span><h2>Review compatibility</h2><p>Choose one supported format, then continue to a controlled review.</p></div></div></section><section className="dc-surface-card"><h2>Available template versions</h2><div className="dc-table-wrap"><table><thead><tr><th>Template</th><th>Format</th><th>Version</th><th>Status</th><th>Restriction</th><th>Action</th></tr></thead><tbody>{compatibility.map(([name, format, version, status, note]) => <tr key={name}><td><strong>{name}</strong></td><td className="dc-mono">{format}</td><td className="dc-mono">{version}</td><td><span className="dc-status-badge" data-tone={status === "Supported" ? "success" : status === "Limited" ? "warning" : "info"}>{status}</span></td><td>{note}</td><td><button type="button" className="dc-button dc-button-secondary" onClick={() => setSelected(name)}>{selected === name ? "Selected" : "Select"}</button></td></tr>)}</tbody></table></div>{selected ? <div className="dc-state-panel" data-tone="success"><span className="dc-state-label">Selection staged</span><strong className="dc-state-title">{selected}</strong><span className="dc-state-detail">Compatibility review is ready. No template has been accepted or applied to the Deal yet.</span><a href={`/app/deals/${dealId}/sources/add?mode=template`}>Continue to template intake →</a></div> : <p className="dc-state-detail">Select a version to stage compatibility review. Selection alone does not create a Source Record.</p>}</section></main>;
}
