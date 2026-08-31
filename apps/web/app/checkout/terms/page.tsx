"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const acknowledgements = [
  ["purchase_authority", "I have authority to purchase this Individual Deal Desk."],
  ["source_authority_separate", "Purchase does not grant authority to upload, process, or use any Source."],
  ["guarantee", "I have read the exact First-Deal Control-Loop Guarantee conditions."],
  ["cancellation_refund", "Cancellation affects the next renewal; refunds follow the displayed Guarantee only."],
  ["post_term", "After the paid term, Post-Term Access is read-only/export-only for 30 days."],
  ["export_retention_deletion", "I understand the displayed export, retention, and deletion boundaries."],
  ["add_on_preview", "I reviewed the explicit add-on preview; add-ons are not retroactive overage charges."],
  ["provider_boundary", "Provider payment status does not itself grant Account, Deal, Recipient, or Human Decision authority."],
] as const;

type Order = { id: string; billing_term: string; add_on: string; amount_due_now: { amount_minor: number; currency: string }; contract_digest: string; row_version: number; allowances: Record<string, unknown>; unmetered_actions: string[]; guarantee: string; cancellation: string; tax: { posture: string; amount_minor: number } };

export default function CheckoutTermsPage() {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [etag, setEtag] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("Loading the saved Checkout Order…");
  const [error, setError] = useState("");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("order");
    if (!id) return setMessage("Return to the saved Checkout Order to continue.");
    fetch(`/api/v1/checkout-orders/${encodeURIComponent(id)}`).then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage(body.detail ?? "The Checkout Order is unavailable.");
      setOrder(body); setEtag(response.headers.get("etag") ?? `W/\"${body.row_version}\"`); setMessage("");
    }).catch(() => setMessage("The API could not be reached. Retry without creating a duplicate order."));
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    setError("");
    const response = await fetch(`/api/v1/checkout-orders/${encodeURIComponent(order.id)}/terms-acceptances`, {
      method: "POST",
      headers: { "content-type": "application/json", "if-match": etag, "idempotency-key": `web-terms-${order.id}` },
      body: JSON.stringify({ displayed_contract_digest: order.contract_digest, acknowledgements: checked }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setError(body.detail ?? "Terms could not be accepted. Refresh the saved Order.");
    router.push(`/checkout/payment?order=${encodeURIComponent(order.id)}&terms=${encodeURIComponent(body.id)}`);
  }

  return <main style={{ maxWidth: 900, margin: "0 auto", padding: 48 }}>
    <a href="/checkout/order">← Saved Order</a>
    <p style={{ fontFamily: "monospace", fontSize: 12, marginTop: 32 }}>CHECKOUT / TERMS</p>
    <h1>Review terms and acknowledge boundaries</h1>
    {message && <p role="status">{message}</p>}
    {error && <p role="alert" style={{ color: "#a22" }}>{error}</p>}
    {order && <form onSubmit={submit} style={{ display: "grid", gap: 16, background: "white", border: "1px solid #ccd5d8", padding: 24 }}>
      <p><strong>{order.billing_term === "annual" ? "$10,950 per year paid upfront · $912.50/month equivalent · save $990 (8.29%)" : "$995 per month"}</strong> · 2 Active Deals · 250 files · 2,500 logical pages · 25 GB · 20 Full-Workflow Operations per Active Deal per billing month.</p>
      <p>Amount due now: ${(order.amount_due_now.amount_minor / 100).toLocaleString("en-US")} {order.amount_due_now.currency.toUpperCase()}. Tax: calculated before payment confirmation.</p>
      <p>Guarantee: {order.guarantee}. Cancellation: {order.cancellation}. Selected add-on: {order.add_on === "none" ? "none" : order.add_on}. Add-ons are explicit, future capacity purchases; there is no retroactive overage.</p>
      <fieldset style={{ display: "grid", gap: 10 }}><legend>Required acknowledgements</legend>{acknowledgements.map(([key, label]) => <label key={key}><input type="checkbox" checked={checked[key] === true} onChange={(event) => setChecked((current) => ({ ...current, [key]: event.target.checked }))} /> {label}</label>)}</fieldset>
      <button type="submit" disabled={acknowledgements.some(([key]) => checked[key] !== true)}>Continue to payment</button>
    </form>}
  </main>;
}
