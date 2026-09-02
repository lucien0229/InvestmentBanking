"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckoutStepper } from "../../../components/deal-control/ui";

type Order = { id: string; billing_term: string; amount_due_now: { amount_minor: number; currency: string }; tax: { posture: string; amount_minor: number }; renewal: { amount_minor: number; term: string }; current_step: string; payment_state: string };

export default function CheckoutPaymentPage() {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [termsId, setTermsId] = useState("");
  const [hostedUrl, setHostedUrl] = useState("");
  const [message, setMessage] = useState("Loading the saved terms acceptance…");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order");
    const acceptanceId = params.get("terms");
    if (!orderId || !acceptanceId) return setMessage("Return to Terms to continue with the saved Checkout Order.");
    setTermsId(acceptanceId);
    fetch(`/api/v1/checkout-orders/${encodeURIComponent(orderId)}`).then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage(body.detail ?? "The Checkout Order is unavailable.");
      setOrder(body); setMessage("");
    }).catch(() => setMessage("The API could not be reached. Retry without creating a duplicate payment."));
  }, []);

  async function startPayment() {
    if (!order) return;
    setError("");
    const response = await fetch("/api/v1/checkout-sessions", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": `web-session-${order.id}` },
      body: JSON.stringify({ checkout_order_id: order.id, terms_acceptance_id: termsId }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setError(body.detail ?? "Payment session could not be created. Refresh the saved Order.");
    if (typeof body.hosted_url === "string" && body.hosted_url.length > 0) setHostedUrl(body.hosted_url);
    setMessage("Provider payment session created. Open it, complete payment there, then return to this Checkout Order for product reconciliation.");
  }

  return <main className="dc-page">
    <a href={order ? `/checkout/terms?order=${encodeURIComponent(order.id)}` : "/checkout/order"}>← Terms</a>
    <p style={{ fontFamily: "monospace", fontSize: 12, marginTop: 32 }}>CHECKOUT / PAYMENT</p>
    <h1>Payment details</h1>
    <CheckoutStepper active="Payment" />
    {message && !order ? <section className="dc-state-panel" data-tone="warning" role="status"><span className="dc-state-label">Payment status</span><strong className="dc-state-title">Saved Checkout context required</strong><span className="dc-state-detail">{message}</span><div className="dc-page-actions"><a className="dc-button" href="/checkout/order">Return to saved Order</a><a className="dc-button dc-button-secondary" href="/account-access?return_to=%2Fcheckout%2Forder">Re-authenticate</a></div></section> : message ? <p role="status">{message}</p> : null}
    {error && <p role="alert">{error}</p>}
    {order && <section style={{ display: "grid", gap: 16, background: "white", border: "1px solid #ccd5d8", padding: 24 }}>
      <dl><dt>Billing name</dt><dd>Named Individual Banker account</dd><dt>Billing address</dt><dd>Collected by the payment provider at hosted checkout</dd><dt>Country / tax</dt><dd>Tax is calculated before payment confirmation ({order.tax.posture})</dd><dt>Amount due now</dt><dd>${(order.amount_due_now.amount_minor / 100).toLocaleString("en-US")} {order.amount_due_now.currency.toUpperCase()}</dd><dt>Renewal</dt><dd>${(order.renewal.amount_minor / 100).toLocaleString("en-US")} {order.renewal.term}{order.billing_term === "annual" ? " · $912.50/month equivalent · save $990 (8.29%)" : ""}</dd></dl>
      <p>Card details are collected only by the provider-hosted payment page; this product does not accept or store card numbers. Returning here is safe and does not create a second charge.</p>
      {hostedUrl ? <p><a href={hostedUrl} target="_blank" rel="noreferrer">Open provider payment page</a> · <a href={`/checkout/confirmation?order=${encodeURIComponent(order.id)}`}>Check product confirmation</a></p> : <button type="button" onClick={startPayment}>Create provider payment session</button>}
    </section>}
  </main>;
}
