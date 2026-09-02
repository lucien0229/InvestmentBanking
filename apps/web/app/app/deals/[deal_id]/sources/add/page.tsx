"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";

type IntakeState = "idle" | "uploading" | "quarantined" | "accepted" | "rejected";

export default function AddSourcePage() {
  const { deal_id: dealId } = useParams<{ deal_id: string }>();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "web" ? "web" : searchParams.get("mode") === "template" ? "template" : "file";
  const [file, setFile] = useState<File | null>(null);
  const [materialName, setMaterialName] = useState("Management accounts");
  const [authority, setAuthority] = useState("provided_under_mandate");
  const [state, setState] = useState<IntakeState>("idle");
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(1);
  const [message, setMessage] = useState("Original bytes stay in Deal-bound quarantine until safety checks complete.");
  const [error, setError] = useState("");

  async function addSource(event: React.FormEvent) {
    event.preventDefault();
    if (mode !== "file") {
      setStage(3);
      setState("quarantined");
      setMessage(mode === "web" ? "Public URL captured as a review candidate. No Web Evidence Observation is created until rights, retrieval limits, and exact locator are reviewed." : "Account template is staged for compatibility review. It cannot be used by a Deal until rights, format, and exact mapping are accepted.");
      return;
    }
    if (!file) return setError("Choose a native source file first.");
    setError(""); setState("uploading"); setMessage("Creating a Deal-bound resumable upload…");
    const digestBuffer = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    const sha256 = Array.from(new Uint8Array(digestBuffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const declaration = {
      client_file_id: `${file.name}-${file.lastModified}`,
      display_name: file.name,
      byte_length: String(file.size),
      media_type: file.type || "application/octet-stream",
      sha256,
      source_declaration: { source_material_id: null, new_source_material_name: materialName, origin: "client_supplied", authority_basis: authority, intended_purpose: "financial_analysis" },
      rights_posture_inputs: { receipt_permitted: true, processing_operations: ["quarantine", "parse"], conditions: [] },
      confidentiality_posture: { confidentiality_class: "confidential", de_identification_posture: "not_de_identified" },
      processing_posture: { expected_file_family: file.name.split(".").pop() ?? "unknown", special_structures: [] },
    };
    try {
      const preflightResponse = await fetch(`/api/v1/deals/${dealId}/preflights`, { cache: "no-store" });
      const preflightBody = await preflightResponse.json().catch(() => ({}));
      const latestPreflight = preflightBody.data?.at(-1);
      if (!preflightResponse.ok || !latestPreflight || !["pass", "limited-proceed"].includes(latestPreflight.result)) throw new Error(preflightBody.detail ?? "Complete Paid Preflight before adding a Source.");
      const createdResponse = await fetch(`/api/v1/deals/${dealId}/upload-sessions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ purpose: "source_intake", operation_preview_id: latestPreflight.id, consent_digest: `sha256:${sha256}`, files: [declaration] }) });
      const created = await createdResponse.json().catch(() => ({}));
      if (!createdResponse.ok) throw new Error(created.detail ?? "Upload session could not be created.");
      const upload = created.data.files[0];
      const chunkSize = 1024 * 1024;
      for (let offset = 0; offset < file.size; offset += chunkSize) {
        const chunk = file.slice(offset, Math.min(file.size, offset + chunkSize));
        const patch = await fetch(upload.tus_url, { method: "PATCH", headers: { "content-type": "application/offset+octet-stream", "tus-resumable": "1.0.0", "upload-offset": String(offset) }, body: chunk });
        if (!patch.ok) { const problem = await patch.json().catch(() => ({})); throw new Error(problem.detail ?? "The resumable upload was interrupted."); }
        setMessage(`Uploading ${Math.min(file.size, offset + chunk.size)} of ${file.size} bytes…`);
      }
      const finalizedResponse = await fetch(`/api/v1/upload-sessions/${created.data.id}/finalizations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ file_ids: [upload.server_file_id] }) });
      const finalized = await finalizedResponse.json().catch(() => ({}));
      const item = finalized.items?.[0];
      if (!finalizedResponse.ok || item?.outcome !== "succeeded") { setState("rejected"); setMessage(item?.problem?.detail ?? "Safety checks rejected this file; it remains outside Source Material."); return; }
      setState("quarantined"); setMessage("Safety checks completed. Review the authority and classification before acceptance.");
      const acceptedResponse = await fetch(`/api/v1/deals/${dealId}/source-materials/${item.source_material_id}/record-acceptances`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() }, body: JSON.stringify({ server_file_id: upload.server_file_id, authority_basis: authority, record_date: new Date().toISOString().slice(0, 10), version_label: "v1", rights_posture: "internal_use_only", confidentiality_class: "confidential" }) });
      const accepted = await acceptedResponse.json().catch(() => ({}));
      if (!acceptedResponse.ok) throw new Error(accepted.detail ?? "Source Record acceptance is blocked.");
      setState("accepted"); setMessage(`Accepted Source Record ${accepted.data.source_record_id}. Original bytes are protected behind a short-lived Object Grant.`);
    } catch (caught) {
      setState("rejected"); setError(caught instanceof Error ? caught.message : "Source intake failed.");
    }
  }

  const stateLabel = { idle: "Ready", uploading: "Uploading", quarantined: "Quarantined", accepted: "Accepted", rejected: "Rejected" }[state];
  const title = mode === "web" ? "Capture a public web source" : mode === "template" ? "Intake an account template" : "Bring one native source into the Deal";
  const description = mode === "web" ? "Web retrieval creates an immutable observation with URL, digest, exact locator, rights posture and retrieval limits." : mode === "template" ? "Account templates stay isolated from Deal material until compatibility, rights and exact Deal mapping are recorded." : "Upload is resumable and Deal-scoped. We do not treat a file as a Source Record until quarantine, authority, rights, and classification are explicit.";
  return <main className="dc-page">
    <a href={`/app/deals/${dealId}/setup`}>← Deal Setup</a>
    <p style={{ color: "#6b7280", letterSpacing: ".08em", textTransform: "uppercase", fontSize: 12 }}>Sources · Add source</p>
    <h1>{title}</h1>
    <p>{description}</p>
    <div className="dc-stepper" aria-label="Source intake stages">
      {[['1', 'Select', mode === 'file' ? 'Native file' : mode === 'web' ? 'Public URL' : 'Template file'], ['2', 'Declare', 'Rights and classification'], ['3', 'Review', 'Quarantine and parse'], ['4', 'Handoff', 'Source Packet']].map(([number, label, detail], index) => <div className="dc-step" data-active={stage === index + 1} key={number}><span className="dc-mono">{number}</span><strong>{label}</strong><small>{detail}</small></div>)}
    </div>
    <section aria-label="source intake status" className="dc-state-panel" data-tone={state === "rejected" ? "critical" : state === "accepted" ? "success" : "info"}>
      <span className="dc-state-label">Source intake status</span><strong className="dc-state-title">{stateLabel}</strong><p role={state === "rejected" ? "alert" : "status"} className="dc-state-detail">{error || message}</p>
    </section>
    <form onSubmit={addSource} style={{ display: "grid", gap: 16, maxWidth: 620 }}>
      {mode === "web" ? <label>Public URL<input required type="url" placeholder="https://example.com/source" /></label> : <label>{mode === "template" ? "Template file" : "Native file"}<input required type="file" accept=".xlsx,.pptx,.docx,.pdf,.csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>}
      <label>{mode === "template" ? "Template display name" : "Source Material name"}<input required value={materialName} onChange={(event) => setMaterialName(event.target.value)} /></label>
      <label>Authority basis<select value={authority} onChange={(event) => setAuthority(event.target.value)}><option value="provided_under_mandate">Provided under mandate</option><option value="limited_pending_confirmation">Limited pending confirmation</option></select></label>
      <fieldset><legend>Rights and processing boundary</legend><label><input type="checkbox" required /> I confirm this source may be inspected for the declared Deal purpose.</label></fieldset>
      <p className="dc-state-detail">Safety boundary: macros, executable content, unsafe archive paths, malformed packages, unsupported active content and unverified external rights remain blocked or quarantined.</p>
      <button type="submit" disabled={state === "uploading"}>{state === "uploading" ? "Uploading…" : mode === "web" ? "Review public capture" : mode === "template" ? "Review template compatibility" : "Upload and review source"}</button>
    </form>
  </main>;
}
