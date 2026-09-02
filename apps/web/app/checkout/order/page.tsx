"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckoutStepper } from "../../../components/deal-control/ui";

type AddOn = "none" | "additional_active_deal" | "intensive_processing" | "archive_capacity";

export default function CheckoutOrderPage() {
  const router = useRouter();
  const [term, setTerm] = useState<"monthly" | "annual">("monthly");
  const [addOn, setAddOn] = useState<AddOn>("none");
  const [addOnConsent, setAddOnConsent] = useState(false);
  const [error, setError] = useState("");
  const addOnPrice = addOn === "additional_active_deal" ? (term === "monthly" ? 50000 : 550000) : addOn === "intensive_processing" ? 100000 : addOn === "archive_capacity" ? 5000 : 0;
  const basePrice = term === "monthly" ? 99500 : 1095000;
  const addOnDescription = addOn === "additional_active_deal" ? "one additional Active Deal with the same allowance" : addOn === "intensive_processing" ? "5,000 logical pages and 20 Full-Workflow Operations for one affected Active Deal-month" : addOn === "archive_capacity" ? "additional 250 GB after export/delete is offered" : "No add-on; the two included Active Deal slots apply";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/v1/checkout-orders", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": `web-order-${term}-${addOn}` }, body: JSON.stringify({ billing_term: term, add_on: addOn }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setError(body.detail ?? "Checkout Order could not be created.");
    router.push(`/checkout/terms?order=${encodeURIComponent(body.id)}`);
  }
  return (
    <main className="dc-page">
      <a href="/pricing">← Pricing</a>
      <p style={{ fontFamily: "monospace", fontSize: 12, marginTop: 32 }}>CHECKOUT / ORDER</p>
      <h1>Confirm Order</h1>
      <p>Order → Terms → Payment → Confirmation. Refresh, account recovery, and payment failure preserve this exact checkpoint.</p>
      <CheckoutStepper active="Order" />
      {error && <p role="alert">{error}</p>}
      <form onSubmit={submit} style={{ display: "grid", gap: 16, maxWidth: 520, background: "white", border: "1px solid #ccd5d8", padding: 24 }}>
        <label>Billing term<select value={term} onChange={(event) => { setTerm(event.target.value as "monthly" | "annual"); if (event.target.value === "annual" && addOn === "archive_capacity") { setAddOn("none"); setAddOnConsent(false); } }}><option value="monthly">Monthly · $995</option><option value="annual">Annual prepaid · $10,950 · $912.50/month equivalent · save $990 (8.29%)</option></select></label>
        <p>2 Active Deals · 250 files · 2,500 logical pages · 25 GB active storage · 20 Full-Workflow Operations per Active Deal per billing month.</p>
        <label>Add-on capacity<select value={addOn} onChange={(event) => { setAddOn(event.target.value as AddOn); setAddOnConsent(false); }}><option value="none">None · included capacity only</option><option value="additional_active_deal">Additional Active Deal · {term === "monthly" ? "$500 monthly" : "$5,500 annual"}</option><option value="intensive_processing">Intensive processing · $1,000 per affected Active Deal-month</option><option value="archive_capacity" disabled={term === "annual"}>Archive capacity · $50 monthly per additional 250 GB{term === "annual" ? " (monthly-only)" : ""}</option></select></label>
        <p>Add-on preview: {addOnDescription}. Amount due now: ${((basePrice + addOnPrice) / 100).toLocaleString("en-US")} USD before applicable tax.</p>
        {addOn !== "none" && <label><input type="checkbox" checked={addOnConsent} onChange={(event) => setAddOnConsent(event.target.checked)} /> I explicitly consent to this add-on and understand it is not retroactive or an overage charge.</label>}
        <p>Evidence inspection, correction, validation, QC, Review, Human Decision, targeted Revision, Internal Controlled Export, and product-failure recovery are unmetered. Renewal, cancellation, Guarantee, and applicable tax are shown again before payment confirmation.</p>
        <button type="submit" disabled={addOn !== "none" && !addOnConsent}>Continue to terms</button>
      </form>
    </main>
  );
}
