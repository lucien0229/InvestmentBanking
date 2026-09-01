"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SourcesPage() {
  const { deal_id: dealId } = useParams<{ deal_id: string }>();
  const [materials, setMaterials] = useState<Array<{ id: string; stable_name: string; origin_code: string; created_at: string }>>([]);
  const [observations, setObservations] = useState<Array<{ source_record_id: string; canonical_url: string; version: number; capture_mode: string; reliance_state: string; retrieval_limitations: string[] }>>([]);
  const [templates, setTemplates] = useState<Array<{ id: string; template_class: string; status: string; production_ready: boolean }>>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch(`/api/v1/deals/${dealId}/source-materials`, { cache: "no-store" }),
      fetch(`/api/v1/deals/${dealId}/web-evidence-observations`, { cache: "no-store" }),
      fetch("/api/v1/account/artifact-templates", { cache: "no-store" }),
    ]).then(async ([materialsResponse, observationsResponse, templatesResponse]) => {
      const [materialsBody, observationsBody, templatesBody] = await Promise.all([materialsResponse.json(), observationsResponse.json(), templatesResponse.json()]);
      if (!active) return;
      if (!materialsResponse.ok || !observationsResponse.ok || !templatesResponse.ok) setError(materialsBody.detail ?? observationsBody.detail ?? templatesBody.detail ?? "Sources are unavailable.");
      else { setMaterials(materialsBody.data ?? []); setObservations(observationsBody.data ?? []); setTemplates(templatesBody.data ?? []); }
    }).catch(() => { if (active) setError("Sources are unavailable. Return to Deal Setup and retry."); });
    return () => { active = false; };
  }, [dealId]);
  return <main style={{ maxWidth: 860, margin: "0 auto", padding: 40 }}>
    <a href={`/app/deals/${dealId}/setup`}>← Deal Setup</a>
    <p style={{ color: "#6b7280", letterSpacing: ".08em", textTransform: "uppercase", fontSize: 12 }}>Deal workspace · Sources</p>
    <h1>Sources</h1>
    <p>Every accepted Source Record keeps immutable provenance, rights, classification, and original bytes behind a short-lived grant. Public web material is an immutable observation; Account templates stay quarantined until compatibility and rights checks pass.</p>
    {error && <p role="alert" style={{ color: "#a22" }}>{error}</p>}
    <p><a href={`/app/deals/${dealId}/sources/add`} style={{ display: "inline-block", padding: "10px 16px", borderRadius: 6, background: "#152026", color: "white", textDecoration: "none" }}>Add source</a></p>
    <section aria-labelledby="source-records-heading" style={{ borderTop: "1px solid #d8dee4", marginTop: 28, paddingTop: 20 }}>
      <h2 id="source-records-heading">Source Records</h2>
      {materials.length === 0 ? <p>No Source Material has been accepted yet. Upload a native file to start the controlled intake.</p> : <ul>{materials.map((material) => <li key={material.id}><strong>{material.stable_name}</strong> · {material.origin_code}</li>)}</ul>}
    </section>
    <section aria-labelledby="web-observations-heading" style={{ borderTop: "1px solid #d8dee4", marginTop: 28, paddingTop: 20 }}>
      <h2 id="web-observations-heading">Public Web Observations</h2>
      <p style={{ color: "#4b5563" }}>Each retrieval creates a new immutable version. Rights, robots, retention, exact locator, and as-of time remain visible.</p>
      {observations.length === 0 ? <p>No public observation has been captured in this Deal.</p> : <ul>{observations.map((observation) => <li key={observation.source_record_id}><strong>{observation.canonical_url}</strong> · v{observation.version} · {observation.capture_mode} · {observation.reliance_state}{observation.retrieval_limitations?.length ? ` · ${observation.retrieval_limitations.join(", ")}` : ""}</li>)}</ul>}
    </section>
    <section aria-labelledby="account-templates-heading" style={{ borderTop: "1px solid #d8dee4", marginTop: 28, paddingTop: 20 }}>
      <h2 id="account-templates-heading">Account Reusable Templates</h2>
      <p style={{ color: "#4b5563" }}>Templates are Account-scoped and cannot reuse live Deal material. A template is never production-ready until safety, rights, compatibility, exact Deal mapping, validation, and review are recorded.</p>
      {templates.length === 0 ? <p>No Account template is available.</p> : <ul>{templates.map((template) => <li key={template.id}><strong>{template.template_class}</strong> · {template.status} · {template.production_ready ? "production-ready" : "preflight required"}</li>)}</ul>}
    </section>
    <p style={{ marginTop: 28, color: "#6b7280", fontSize: 13 }}>Audit evidence is append-only and remains scoped to this Account and Deal. Errors keep the safe parent and recovery action visible.</p>
  </main>;
}
