"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DealSetupStepper } from "../../../../components/deal-control/ui";

const setupSteps = ["Deal identity", "Business stage", "Controlled purpose", "Default restrictions", "Confirm setup"] as const;

export default function NewDealPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [termsId, setTermsId] = useState("");
  const [dealName, setDealName] = useState("New sell-side auction");
  const [party, setParty] = useState("");
  const [subject, setSubject] = useState("");
  const [inclusions, setInclusions] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [mandate, setMandate] = useState("");
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const command = useRef({ body: "", key: "" });
  const [stage, setStage] = useState("Preparation");
  const [purpose, setPurpose] = useState("Establish the first inspectable Source Packet");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const abort = new AbortController();
    void (async () => {
      try {
        const receiptsResponse = await fetch("/api/v1/account/commercial-receipts", { signal: abort.signal });
        const receiptsBody = await receiptsResponse.json();
        if (!receiptsResponse.ok) throw new Error(receiptsBody.detail ?? "Your purchase could not be loaded.");
        const receipt = receiptsBody.receipts.filter((item: { status: string }) => item.status === "paid").at(-1);
        if (!receipt) throw new Error("Complete Checkout before creating a Deal.");
        const response = await fetch(`/api/v1/checkout-orders/${encodeURIComponent(receipt.checkout_order_id)}`, { signal: abort.signal });
        const order = await response.json();
        if (!response.ok || !order.entitlement || !order.terms_acceptance?.id) throw new Error(order.detail ?? "The saved purchase is awaiting entitlement confirmation.");
        if (!abort.signal.aborted) setTermsId(order.terms_acceptance.id);
      } catch (cause) { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : "Your purchase could not be loaded."); }
    })();
    return () => abort.abort();
  }, []);

  async function createDeal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== setupSteps.length - 1 || busy) return;
    if (!identityConfirmed || !termsId) return setError("Confirm the displayed Deal identity and completed purchase before creating the Workspace.");
    setError("");
    const body = {
      display_name: dealName,
      represented_party: party,
      transaction_subject: subject,
      transaction_perimeter: { inclusions: inclusions.split("\n").map((line) => line.trim()).filter(Boolean), exclusions: exclusions.split("\n").map((line) => line.trim()).filter(Boolean) },
      banker_role_or_side: "sell_side_advisor",
      mandate_objective: mandate,
      transaction_type: "sell_side_auction",
      business_stage: ({ Preparation: "preparation", Launch: "launch", "First Round": "first_round", "Final Round / Signing": "final_round_signing" })[stage],
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
      expected_file_families: ["xlsx", "pptx", "docx", "pdf", "csv"],
      expected_template_posture: "product_default",
      provider_restrictions: ["local_only"],
      special_structures: [],
      identity_confirmed: identityConfirmed,
    };
    const payload = JSON.stringify(body);
    if (command.current.body !== payload) command.current = { body: payload, key: `web-deal-${crypto.randomUUID()}` };
    setBusy(true);
    try {
      const response = await fetch("/api/v1/deals", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": command.current.key }, body: payload });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return setError(result.detail ?? "Deal creation failed.");
      setStatus("Deal created. Capacity is reserved while Paid Preflight is pending.");
      router.push(`/app/deals/${result.deal.id}/setup`);
    } catch {
      setError("The API could not be reached. Your Deal details remain on this step; retry without creating a duplicate.");
    } finally { setBusy(false); }
  }

  function continueStep() {
    setError("");
    if (step === 0 && !dealName.trim()) return setError("Enter a Deal code name to continue.");
    if (step === 0 && (!party.trim() || !subject.trim() || !inclusions.trim())) return setError("Enter the represented party, transaction subject and included perimeter.");
    if (step === 0 && !termsId) return setError("Complete Checkout before continuing with Deal setup.");
    if (step === 2 && !mandate.trim()) return setError("Describe the mandate objective to continue.");
    if (step < setupSteps.length - 1) setStep((value) => value + 1);
  }

  return <main className="dc-page">
    <a href="/app/deals">← Deals</a>
    <h1>Create Deal</h1>
    <p>Confirm the represented party, transaction perimeter, banker role, and mandate before any source is processed.</p>
    <DealSetupStepper active={setupSteps[step]} />
    {error && <p role="alert" style={{ color: "#a22" }}>{error}</p>}
    {status && <p role="status" style={{ color: "#16724b" }}>{status}</p>}
    <form onSubmit={createDeal} className="dc-surface-card dc-setup-form">
      {step === 0 ? <><p role="status">{termsId ? "Completed purchase and authority acknowledgement loaded from your Account." : "Loading your completed purchase…"}</p>{!termsId && <a href="/checkout/order">Continue Checkout →</a>}<div className="dc-setup-form-grid"><label>Deal code name<input value={dealName} onChange={(event) => setDealName(event.target.value)} maxLength={160} required /></label><label>Transaction type<select defaultValue="sell-side"><option value="sell-side">Sell-Side Auction</option></select></label><label>Represented party<input value={party} onChange={(event) => setParty(event.target.value)} maxLength={240} required /></label><label>Transaction subject<input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={240} required /></label><label>Included perimeter, one item per line<textarea value={inclusions} onChange={(event) => setInclusions(event.target.value)} required /></label><label>Excluded perimeter, one item per line<textarea value={exclusions} onChange={(event) => setExclusions(event.target.value)} /></label></div></> : null}
      {step === 1 ? <fieldset><legend>Select the current Business Stage</legend>{["Preparation", "Launch", "First Round", "Final Round / Signing"].map((option) => <label className="dc-check-row" key={option}><input type="radio" name="stage" value={option} checked={stage === option} onChange={() => setStage(option)} /><span><strong>{option}</strong><small>{option === "Preparation" ? "Establish the Source and control baseline" : "Changes stage applicability without deleting objects"}</small></span></label>)}</fieldset> : null}
      {step === 2 ? <><label>Mandate objective<textarea value={mandate} onChange={(event) => setMandate(event.target.value)} maxLength={500} required /></label><fieldset><legend>Bound the first controlled purpose</legend>{["Establish the first inspectable Source Packet", "Prepare a controlled Analysis & Valuation Workbook", "Create the first Teaser / CIM Revision", "Continue an auction process already in progress"].map((option) => <label className="dc-check-row" key={option}><input type="radio" name="purpose" value={option} checked={purpose === option} onChange={() => setPurpose(option)} /><span><strong>{option}</strong><small>Bounds the first controlled loop without limiting later work areas.</small></span></label>)}</fieldset></> : null}
      {step === 3 ? <div className="dc-boundary-list"><section><span className="dc-status-badge" data-tone="warning">Blocked by default</span><h2>External use</h2><p>No Revision may circulate without an exact External-Use Decision.</p></section><section><span className="dc-status-badge" data-tone="info">Proposal only</span><h2>AI boundary</h2><p>Facts, Human Decisions, authorization, and business side effects require auditable controls.</p></section><section><span className="dc-status-badge" data-tone="success">Verify before upload</span><h2>Source rights</h2><p>Do not upload real Confidential Deal Materials before Paid Preflight.</p></section></div> : null}
      {step === 4 ? <div className="dc-setup-review"><span className="dc-status-badge" data-tone="warning">Paid Preflight pending</span><h2>Confirm and create the Deal Workspace</h2><dl><dt>Deal</dt><dd>{dealName}</dd><dt>Type</dt><dd>Sell-Side Auction</dd><dt>Stage</dt><dd>{stage}</dd><dt>First purpose</dt><dd>{purpose}</dd><dt>Default external use</dt><dd>Blocked</dd></dl><p>Creating the Workspace does not permit material processing. Paid Preflight is still required next.</p></div> : null}
      {step === 4 && <><dl><dt>Represented party / subject</dt><dd>{party} · {subject}</dd><dt>Included / excluded perimeter</dt><dd>{inclusions} / {exclusions || "No exclusions declared"}</dd><dt>Mandate</dt><dd>{mandate}</dd><dt>Banker role / audience</dt><dd>Sell-side advisor · Internal Deal team</dd><dt>Currency / units</dt><dd>USD · millions</dd><dt>Processing / confidentiality</dt><dd>Local deterministic processing only · Confidential</dd><dt>Authority basis</dt><dd>Engaged by the represented party; Sources provided under mandate; no known employer or client restrictions</dd></dl><label className="dc-check-row"><input type="checkbox" checked={identityConfirmed} onChange={(event) => setIdentityConfirmed(event.target.checked)} required /> I confirm this exact Deal identity, mandate and processing boundary.</label></>}
      <div className="dc-page-actions"><button className="dc-button dc-button-secondary" type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0 || busy}>Back</button>{step < setupSteps.length - 1 ? <button key="continue" type="button" onClick={(event) => { event.preventDefault(); continueStep(); }}>Continue</button> : <button key="create" type="submit" disabled={!identityConfirmed || busy}>{busy ? "Creating…" : "Create and start Paid Preflight"}</button>}</div>
    </form>
  </main>;
}
