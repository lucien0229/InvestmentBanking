"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const fieldStyle = { display: "grid", gap: 6 } as const;

export default function NewDealPage() {
  const router = useRouter();
  const [termsId, setTermsId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { setTermsId(new URLSearchParams(window.location.search).get("terms_id") ?? ""); }, []);

  async function createDeal(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const body = {
      display_name: "New sell-side auction",
      represented_party: "Represented party",
      transaction_subject: "Transaction subject",
      transaction_perimeter: { inclusions: ["Operating business"], exclusions: [] },
      banker_role_or_side: "sell_side_advisor",
      mandate_objective: "Run a controlled sell-side auction",
      transaction_type: "sell_side_auction",
      business_stage: "preparation",
      intended_purpose: "internal_deal_execution",
      intended_audience: "internal_deal_team",
      base_currency: "USD",
      reporting_units: "millions",
      purchase_authority_acknowledgement_id: termsId,
      deal_authority_basis: "engaged_by_represented_party",
      expected_source_use_authority: "provided_under_mandate",
      confidentiality_class: "confidential",
      employer_or_client_restrictions: { posture: "none_known", details: null },
      intended_processing_path: "local_deterministic_only",
      expected_file_families: ["xlsx", "pptx", "pdf"],
      expected_template_posture: "product_default",
      provider_restrictions: ["local_only"],
      special_structures: [],
      identity_confirmed: true,
    };
    const response = await fetch("/api/v1/deals", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": `web-deal-${crypto.randomUUID()}` }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) return setError(result.detail ?? "Deal creation failed.");
    setStatus("Deal created. Capacity is reserved while Paid Preflight is pending.");
    router.push(`/app/deals/${result.deal.id}/setup`);
  }

  return <main style={{ maxWidth: 760, margin: "0 auto", padding: 40 }}>
    <a href="/app">← Deal workspace</a>
    <h1>Create Deal</h1>
    <p>Confirm the represented party, transaction perimeter, banker role, and mandate before any source is processed.</p>
    {error && <p role="alert" style={{ color: "#a22" }}>{error}</p>}
    {status && <p role="status" style={{ color: "#16724b" }}>{status}</p>}
    <form onSubmit={createDeal} style={{ display: "grid", gap: 18 }}>
      <label style={fieldStyle} htmlFor="terms">Completed purchase-authority acknowledgement ID
        <input id="terms" value={termsId} onChange={(event) => setTermsId(event.target.value)} placeholder="UUID from completed checkout terms" required />
      </label>
      <button type="submit">Create identity-complete Deal</button>
    </form>
  </main>;
}
