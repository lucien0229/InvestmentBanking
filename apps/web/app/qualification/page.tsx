"use client";

import { useEffect, useState } from "react";

export default function QualificationPage() {
  const [status, setStatus] = useState("Provide categories only. Do not upload files or enter Deal content.");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ banker_role: "Individual Banker", can_purchase_independently: true, deal_type: "Sell-Side Auction", intended_use: "internal controlled execution", intended_audience: "internal banker team", expected_source_types: "CIM, management model", expected_template_types: "CIM, auction workbook", known_special_structures: "", source_authority: "expected", confidentiality_class: "confidential", employer_restrictions: "unknown", provider_or_geographic_restrictions: "unknown", minimum_source_packet: "CIM and management model" });
  const update = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    const id = window.localStorage.getItem("qualification_assessment_id");
    if (!id) return;
    fetch(`/api/v1/public/qualification-assessments/${encodeURIComponent(id)}`).then(async (response) => {
      if (!response.ok) return;
      const body = await response.json();
      setStatus(`${body.result}. Restored non-confidential qualification assessment; Paid Preflight will re-evaluate exact sources, rights, processing, and minimum packet.`);
    }).catch(() => undefined);
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/v1/public/qualification-assessments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, expected_source_types: form.expected_source_types.split(",").map((item) => item.trim()).filter(Boolean), expected_template_types: form.expected_template_types.split(",").map((item) => item.trim()).filter(Boolean), known_special_structures: form.known_special_structures.split(",").map((item) => item.trim()).filter(Boolean) }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setError(body.detail ?? "Qualification could not be completed.");
    window.localStorage.setItem("qualification_assessment_id", body.id);
    setStatus(`${body.result}. This is a non-confidential preview only; Paid Preflight will re-evaluate exact sources, rights, processing, and minimum packet.`);
  }
  return (
    <main id="main-content" style={{ maxWidth: 760, margin: "0 auto", padding: 48 }}>
      <a href="#main-content" style={{ position: "absolute", left: -10000 }}>Skip to main content</a>
      <a href="/project-northstar" style={{ color: "#16724b" }}>← Project Northstar proof</a>
      <a href="/pricing">← Pricing</a>
      <p style={{ fontFamily: "monospace", fontSize: 12, marginTop: 32 }}>DEAL CONTROL / QUALIFICATION</p>
      <h1>Check product qualification</h1>
      <p>This check is informational and does not accept Deal Material. Do not submit confidential files or claims here.</p>
      <p>{status}</p>
      {error && <p role="alert" style={{ color: "#a22" }}>{error}</p>}
      <form onSubmit={submit} style={{ display: "grid", gap: 14, background: "white", border: "1px solid #ccd5d8", padding: 24 }}>
        <label>Banker role<input value={form.banker_role} onChange={(event) => update("banker_role", event.target.value)} /></label>
        <label>Can purchase independently<select value={form.can_purchase_independently ? "yes" : "no"} onChange={(event) => update("can_purchase_independently", event.target.value === "yes")}><option value="yes">Yes</option><option value="no">No</option></select></label>
        <label>Deal type<input value={form.deal_type} onChange={(event) => update("deal_type", event.target.value)} /></label>
        <label>Intended use<input value={form.intended_use} onChange={(event) => update("intended_use", event.target.value)} /></label>
        <label>Intended audience<input value={form.intended_audience} onChange={(event) => update("intended_audience", event.target.value)} /></label>
        <label>Expected source categories<input value={form.expected_source_types} onChange={(event) => update("expected_source_types", event.target.value)} /></label>
        <label>Expected template categories<input value={form.expected_template_types} onChange={(event) => update("expected_template_types", event.target.value)} /></label>
        <label>Known special structures<input value={form.known_special_structures} onChange={(event) => update("known_special_structures", event.target.value)} placeholder="None known" /></label>
        <label>Source authority<input value={form.source_authority} onChange={(event) => update("source_authority", event.target.value)} /></label>
        <label>Expected confidentiality class<select value={form.confidentiality_class} onChange={(event) => update("confidentiality_class", event.target.value)}><option value="confidential">Confidential (category only)</option><option value="internal">Internal</option><option value="public">Public</option><option value="restricted">Restricted</option></select></label>
        <label>Employer restrictions<input value={form.employer_restrictions} onChange={(event) => update("employer_restrictions", event.target.value)} /></label>
        <label>Provider or geographic restrictions<input value={form.provider_or_geographic_restrictions} onChange={(event) => update("provider_or_geographic_restrictions", event.target.value)} /></label>
        <label>Minimum Source Packet<input value={form.minimum_source_packet} onChange={(event) => update("minimum_source_packet", event.target.value)} /></label>
        <button type="submit">Review qualification</button>
      </form>
      <p style={{ marginTop: 20 }}><a href="/account-access?return_to=%2Fcheckout%2Forder">Continue to account access</a></p>
    </main>
  );
}
