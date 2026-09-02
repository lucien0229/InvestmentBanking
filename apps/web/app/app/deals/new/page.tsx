"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DealSetupStepper } from "../../../../components/deal-control/ui";

const setupSteps = ["Deal identity", "Business stage", "Controlled purpose", "Default restrictions", "Confirm setup"] as const;

export default function NewDealPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [termsId, setTermsId] = useState("");
  const [dealName, setDealName] = useState("New sell-side auction");
  const [stage, setStage] = useState("Preparation");
  const [purpose, setPurpose] = useState("Establish the first inspectable Source Packet");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { setTermsId(new URLSearchParams(window.location.search).get("terms_id") ?? ""); }, []);

  async function createDeal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const body = {
      display_name: dealName,
      represented_party: "Represented party",
      transaction_subject: "Transaction subject",
      transaction_perimeter: { inclusions: ["Operating business"], exclusions: [] },
      banker_role_or_side: "sell_side_advisor",
      mandate_objective: "Run a controlled sell-side auction",
      transaction_type: "sell_side_auction",
      business_stage: stage.toLowerCase().replaceAll(" ", "_"),
      intended_purpose: purpose,
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
    try {
      const response = await fetch("/api/v1/deals", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": `web-deal-${crypto.randomUUID()}` }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return setError(result.detail ?? "Deal creation failed.");
      setStatus("Deal created. Capacity is reserved while Paid Preflight is pending.");
      router.push(`/app/deals/${result.deal.id}/setup`);
    } catch {
      setError("The API could not be reached. Your Deal details remain on this step; retry without creating a duplicate.");
    }
  }

  function continueStep() {
    setError("");
    if (step === 0 && !dealName.trim()) return setError("Enter a Deal code name to continue.");
    if (step === 0 && !termsId.trim()) return setError("Enter the completed purchase-authority acknowledgement ID to continue.");
    if (step < setupSteps.length - 1) setStep((value) => value + 1);
  }

  return <main className="dc-page">
    <a href="/app">← Deal workspace</a>
    <h1>Create Deal</h1>
    <p>Confirm the represented party, transaction perimeter, banker role, and mandate before any source is processed.</p>
    <DealSetupStepper active={setupSteps[step]} />
    {error && <p role="alert" style={{ color: "#a22" }}>{error}</p>}
    {status && <p role="status" style={{ color: "#16724b" }}>{status}</p>}
    <form onSubmit={createDeal} className="dc-surface-card dc-setup-form">
      {step === 0 ? <div className="dc-setup-form-grid"><label htmlFor="deal-name">Deal code name<input id="deal-name" value={dealName} onChange={(event) => setDealName(event.target.value)} placeholder="For example, Project Northstar" required /></label><label htmlFor="transaction-type">Transaction type<select id="transaction-type" defaultValue="sell-side"><option value="sell-side">Sell-Side Auction</option></select></label><label htmlFor="industry">Industry label<input id="industry" defaultValue="Industrial services" /></label><label htmlFor="terms">Purchase-authority acknowledgement ID<input id="terms" value={termsId} onChange={(event) => setTermsId(event.target.value)} placeholder="UUID from completed checkout terms" required /></label></div> : null}
      {step === 1 ? <fieldset><legend>Select the current Business Stage</legend>{["Preparation", "Launch", "First Round", "Final Round / Signing"].map((option) => <label className="dc-check-row" key={option}><input type="radio" name="stage" value={option} checked={stage === option} onChange={() => setStage(option)} /><span><strong>{option}</strong><small>{option === "Preparation" ? "Current Project Northstar documentation path" : "Changes stage applicability without deleting objects"}</small></span></label>)}</fieldset> : null}
      {step === 2 ? <fieldset><legend>Bound the first controlled purpose</legend>{["Establish the first inspectable Source Packet", "Prepare a controlled Analysis & Valuation Workbook", "Create the first Teaser / CIM Revision", "Continue an auction process already in progress"].map((option) => <label className="dc-check-row" key={option}><input type="radio" name="purpose" value={option} checked={purpose === option} onChange={() => setPurpose(option)} /><span><strong>{option}</strong><small>Bounds the first controlled loop without limiting later work areas.</small></span></label>)}</fieldset> : null}
      {step === 3 ? <div className="dc-boundary-list"><section><span className="dc-status-badge" data-tone="warning">Blocked by default</span><h2>External use</h2><p>No Revision may circulate without an exact External-Use Decision.</p></section><section><span className="dc-status-badge" data-tone="info">Proposal only</span><h2>AI boundary</h2><p>Facts, Human Decisions, authorization, and business side effects require auditable controls.</p></section><section><span className="dc-status-badge" data-tone="success">Verify before upload</span><h2>Source rights</h2><p>Do not upload real Confidential Deal Materials before Paid Preflight.</p></section></div> : null}
      {step === 4 ? <div className="dc-setup-review"><span className="dc-status-badge" data-tone="warning">Paid Preflight pending</span><h2>Confirm and create the Deal Workspace</h2><dl><dt>Deal</dt><dd>{dealName} · Synthetic</dd><dt>Type</dt><dd>Sell-Side Auction</dd><dt>Stage</dt><dd>{stage}</dd><dt>First purpose</dt><dd>{purpose}</dd><dt>Default external use</dt><dd>Blocked</dd></dl><p>Creating the Workspace does not permit material processing. Paid Preflight is still required next.</p></div> : null}
      <div className="dc-page-actions"><button className="dc-button dc-button-secondary" type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>Back</button>{step < setupSteps.length - 1 ? <button type="button" onClick={continueStep}>Continue</button> : <button type="submit">Create and start Paid Preflight</button>}</div>
    </form>
  </main>;
}
