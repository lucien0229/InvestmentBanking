"use client";

import { useEffect, useState } from "react";
import { CheckoutStepper } from "../../../components/deal-control/ui";

type Order = { id: string; current_step: string; payment_state: string; billing_term: string; add_on: string; amount_minor: number; renewal: { amount_minor: number; term: string }; included_active_deals: number; allowances: { per_active_deal_per_billing_month?: { newly_processed_files?: number; newly_processed_logical_pages?: number; active_storage_gb?: number; full_workflow_operations?: number } }; unmetered_actions: string[]; tax: { posture: string; amount_minor: number }; guarantee: string; cancellation: string; terms_acceptance: { id: string } | null; entitlement: { active_deal_capacity: number; actor_name: string } | null; receipt: { id: string; amount_minor?: number; tax_amount_minor?: number } | null };

export default function CheckoutConfirmationPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState("Loading product-authoritative checkout state…");
  const [refresh, setRefresh] = useState(0);
  const advertisedCapacity = order ? order.included_active_deals + (order.add_on === "additional_active_deal" ? 1 : 0) : 0;
  const addOnEffect = order?.add_on === "additional_active_deal" ? "Additional Active Deal with the same allowance" : order?.add_on === "intensive_processing" ? "5,000 logical pages and 20 Full-Workflow Operations for one affected Active Deal-month" : order?.add_on === "archive_capacity" ? "Additional 250 GB after export/delete is offered" : "None";
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const params = new URLSearchParams(window.location.search);
    async function load() {
      try {
        let id = params.get("order");
        // Older provider sessions return only their identity. Resolve it through
        // the authenticated product API; a redirect never creates entitlement.
        if (!id && params.get("session_id")) {
          const response = await fetch(`/api/v1/checkout-sessions/${encodeURIComponent(params.get("session_id")!)}`);
          const body = await response.json().catch(() => ({}));
          if (!active) return;
          if (!response.ok) return setMessage(body.detail ?? "The Checkout session is unavailable.");
          id = body.checkout_order_id;
        }
        if (!id) return setMessage("Return to the saved Checkout Order to continue.");
        const response = await fetch(`/api/v1/checkout-orders/${encodeURIComponent(id)}`);
        const body = await response.json().catch(() => ({}));
        if (!active) return;
        if (!response.ok) return setMessage(body.detail ?? "The Checkout Order is unavailable.");
        setOrder(body); setMessage(body.payment_state === "succeeded" ? "Payment and entitlement reconciled exactly once." : body.payment_state === "failed" ? "Payment did not complete. The saved Order remains available for a safe retry." : "Payment is pending product-owned reconciliation. No entitlement has been granted yet.");
        if (body.payment_state === "pending" && ++attempts < 15) timer = setTimeout(load, 2000);
      } catch {
        if (active) setMessage("The API could not be reached. Retry without creating a duplicate payment.");
      }
    }
    void load();
    return () => { active = false; clearTimeout(timer); };
  }, [refresh]);
  return (
    <main className="dc-page">
      <p className="dc-eyebrow">CHECKOUT / CONFIRMATION</p>
      <h1>{order?.payment_state === "succeeded" ? "Entitlement activated" : "Payment confirmation"}</h1>
      <CheckoutStepper active="Confirmation" />
      {!order ? <section className="dc-state-panel" data-tone="info" role="status"><span className="dc-state-label">Confirmation status</span><strong className="dc-state-title">No payment confirmation loaded</strong><span className="dc-state-detail">{message}</span><div className="dc-page-actions"><a className="dc-button" href="/checkout/order">Return to saved Order</a><a className="dc-button dc-button-secondary" href="/checkout/recovery">Open checkout recovery</a></div></section> : <p role="status">{message}</p>}
      {order && <section style={{ background: "white", border: "1px solid #ccd5d8", padding: 24 }}><dl><dt>Term</dt><dd>{order.billing_term === "annual" ? "$10,950 per year paid upfront · $912.50/month equivalent · save $990 (8.29%)" : "$995 per month"}</dd><dt>Amount due now</dt><dd>${(order.amount_minor / 100).toLocaleString("en-US")}</dd><dt>Renewal</dt><dd>${(order.renewal.amount_minor / 100).toLocaleString("en-US")} · {order.renewal.term}</dd><dt>Tax</dt><dd>{order.receipt ? `$${((order.receipt.tax_amount_minor ?? order.tax.amount_minor) / 100).toFixed(2)} charged` : "Calculated before payment confirmation"}</dd><dt>Active Deal capacity</dt><dd>{order.entitlement?.active_deal_capacity ?? advertisedCapacity} available ({order.included_active_deals} included{order.add_on === "additional_active_deal" ? " + 1 add-on" : ""})</dd><dt>Allowances</dt><dd>{order.allowances.per_active_deal_per_billing_month?.newly_processed_files ?? 250} files · {order.allowances.per_active_deal_per_billing_month?.newly_processed_logical_pages ?? 2500} logical pages · {order.allowances.per_active_deal_per_billing_month?.active_storage_gb ?? 25} GB · {order.allowances.per_active_deal_per_billing_month?.full_workflow_operations ?? 20} Full-Workflow Operations per Active Deal per billing month</dd><dt>Add-on</dt><dd>{addOnEffect}</dd><dt>Unmetered actions</dt><dd>{order.unmetered_actions.map((action) => action.replaceAll("_", " ")).join(", ")}</dd><dt>Guarantee</dt><dd>{order.guarantee === "first-deal-control-loop-v1" ? "First-Deal Control-Loop Guarantee" : order.guarantee.replaceAll("_", " ")}</dd><dt>Cancellation</dt><dd>{order.cancellation === "cancels_next_renewal_only" ? "Cancellation stops the next renewal" : order.cancellation.replaceAll("_", " ")}</dd><dt>Receipt</dt><dd>{order.receipt?.id ?? "Not created until reconciliation"}</dd></dl>{order.entitlement ? <p>Named Individual Banker: {order.entitlement.actor_name}. Purchase does not establish Source rights, Recipient authority, or Human Decision authority.</p> : null}</section>}
      <p style={{ marginTop: 24 }}><button type="button" className="dc-button dc-button-secondary" onClick={() => setRefresh((value) => value + 1)}>Refresh confirmation</button> · <a href="/checkout/order">Return to saved Order</a>{order && !order.entitlement && order.terms_acceptance ? <> · <a href={`/checkout/payment?order=${encodeURIComponent(order.id)}&terms=${encodeURIComponent(order.terms_acceptance.id)}`}>Retry or check payment</a></> : null}{order?.entitlement ? <> · <a href="/app/deals/new">Create your first Deal</a></> : null}</p>
    </main>
  );
}
