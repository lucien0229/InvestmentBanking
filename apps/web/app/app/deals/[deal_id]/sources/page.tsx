"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SourcesPage() {
  const { deal_id: dealId } = useParams<{ deal_id: string }>();
  const [materials, setMaterials] = useState<Array<{ id: string; stable_name: string; origin_code: string; created_at: string }>>([]);
  const [error, setError] = useState("");
  useEffect(() => { void fetch(`/api/v1/deals/${dealId}/source-materials`, { cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) setError(body.detail ?? "Sources are unavailable."); else setMaterials(body.data ?? []); }); }, [dealId]);
  return <main style={{ maxWidth: 860, margin: "0 auto", padding: 40 }}>
    <a href={`/app/deals/${dealId}/setup`}>← Deal Setup</a>
    <p style={{ color: "#6b7280", letterSpacing: ".08em", textTransform: "uppercase", fontSize: 12 }}>Deal workspace · Sources</p>
    <h1>Sources</h1>
    <p>Every accepted Source Record keeps immutable provenance, rights, classification, and original bytes behind a short-lived grant.</p>
    {error && <p role="alert" style={{ color: "#a22" }}>{error}</p>}
    <p><a href={`/app/deals/${dealId}/sources/add`} style={{ display: "inline-block", padding: "10px 16px", borderRadius: 6, background: "#152026", color: "white", textDecoration: "none" }}>Add source</a></p>
    {materials.length === 0 ? <p>No Source Material has been accepted yet. Upload a native file to start the controlled intake.</p> : <ul>{materials.map((material) => <li key={material.id}>{material.stable_name} · {material.origin_code}</li>)}</ul>}
  </main>;
}
