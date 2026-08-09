import { ArrowRight, Check, ChevronRight, CircleAlert, FileCheck2, FileSpreadsheet, LockKeyhole, RotateCcw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from '../router';
import { StatusBadge } from '../components/StatusBadge';

const proofSteps = [
  { title: 'Complete Execution Package', value: 'Revision 0.4', detail: 'Inspect synthetic results across workbooks, CIM, Reader Copy, control records, and Manifest.' },
  { title: 'EBITDA conflict', value: '$18.4m ↔ $17.8m', detail: 'Compare exact Source Records and locators in the Draft CIM and Management Model.' },
  { title: 'Original Cash extraction', value: '$6.2m', detail: 'Preserve AI extraction v1 rather than presenting the later correction as the original result.' },
  { title: 'Banker correction', value: '$4.7m', detail: 'Record a typed Human Decision with scope, basis, rationale, and downstream Impact.' },
  { title: 'Deterministic recovery', value: '$1.5m → $0.0m', detail: 'Repeatable rules close the stated tie-out gate without establishing Professional Usability.' },
  { title: 'Affected outputs', value: '8 synthetic objects', detail: 'Show recalculation, regeneration, re-review, and circulation blocks separately.' },
  { title: 'Revision change', value: '0.3 → 0.4', detail: 'The new Revision preserves prior history, Sources, Decisions, and exact differences.' },
  { title: 'Authorization boundary', value: 'Prior authorization does not carry forward', detail: 'An External-Use Decision always binds an exact Revision, audience, purpose, and conditions.' },
  { title: 'Manifest', value: 'Exact objects and hashes', detail: 'Inspect internal export contents, limitations, exclusions, and declared boundaries.' },
];

export function OutcomeScreen() {
  return (
    <div className="public-page" data-od-id="public-outcome-screen">
      <section className="public-hero" aria-labelledby="outcome-title" data-od-id="public-outcome-hero">
        <div className="public-hero-copy">
          <p className="eyebrow">For execution-oriented Individual Bankers</p>
          <h1 id="outcome-title">Run an auditable sell-side auction from source evidence to controlled Revision</h1>
          <p>Keep Sources, Evidence, Banker judgment, deterministic validation, Deliverables, Revisions, and external-use boundaries in one authoritative Deal Workspace.</p>
          <div className="public-actions">
            <Link className="button button-primary" to="/project-northstar" data-od-id="inspect-project-northstar">Inspect Project Northstar<ArrowRight aria-hidden="true" size={16} /></Link>
            <Link className="text-link" to="/qualification">Check qualification</Link>
            <Link className="text-link" to="/pricing">View pricing</Link>
          </div>
        </div>
        <div className="package-preview" aria-label="Controlled Auction Execution Package preview" data-od-id="controlled-package-preview">
          <div className="preview-title"><span>Controlled Auction Execution Package</span><StatusBadge tone="warning">Revision 0.4 · Review required</StatusBadge></div>
          {['Analysis & Valuation Workbook', 'Auction Control Workbook', 'Teaser & CIM', 'Bid Recommendation Memo'].map((item, index) => <div key={item} className="preview-row"><span className="mono">0{index + 1}</span><strong>{item}</strong><span>{index < 2 ? 'Always required' : index === 2 ? 'Required in Preparation' : 'Not required at this stage'}</span></div>)}
        </div>
      </section>

      <section className="public-mechanism" aria-labelledby="mechanism-title" data-od-id="public-control-loop">
        <div><p className="eyebrow">Controlled loop</p><h2 id="mechanism-title">Not one-time generation—an auditable chain of control</h2></div>
        <ol className="mechanism-steps">
          {['Exact Evidence', 'Typed Banker Decision', 'Deterministic result', 'Revision consequence'].map((step, index) => <li key={step}><span className="mono">0{index + 1}</span><strong>{step}</strong>{index < 3 ? <ChevronRight aria-hidden="true" size={17} /> : null}</li>)}
        </ol>
      </section>

      <section className="boundary-split" aria-labelledby="boundary-title" data-od-id="public-product-boundary">
        <div><p className="eyebrow">Product boundary</p><h2 id="boundary-title">Professional control stays with the Banker; the system makes the boundary inspectable</h2></div>
        <div className="boundary-column"><h3>The product records</h3><ul><li>Exact objects, versions, and Native Locators</li><li>Observable AI Proposal and Job states</li><li>Deterministic rules, Impact, and immutable history</li><li>Native and Reader Artifacts with a Manifest</li></ul></div>
        <div className="boundary-column"><h3>The product does not claim</h3><ul><li>AI owns professional judgment or sign-off authority</li><li>Passing validation permits external circulation</li><li>Payment or an Assumption can bypass a hard gate</li><li>Team governance, approval routing, or human Deal services</li></ul></div>
      </section>

      <section className="public-closing" aria-labelledby="proof-entry-title" data-od-id="public-proof-entry">
        <div><p className="eyebrow">Synthetic proof without registration</p><h2 id="proof-entry-title">Inspect how a conflict becomes a controlled Revision</h2><p>Every company, Source, amount, timestamp, and action is synthetic. The proof demonstrates the interaction and control model, not verified production processing capability.</p></div>
        <Link className="button button-secondary" to="/project-northstar">Open synthetic control loop</Link>
      </section>
    </div>
  );
}

export function NorthstarProofScreen() {
  const [checkpoint, setCheckpoint] = useState(() => {
    const stored = Number(window.localStorage.getItem('northstar-proof-checkpoint') ?? 0);
    return Number.isFinite(stored) ? Math.max(0, Math.min(stored, proofSteps.length - 1)) : 0;
  });
  const active = proofSteps[checkpoint];

  useEffect(() => window.localStorage.setItem('northstar-proof-checkpoint', String(checkpoint)), [checkpoint]);

  return (
    <div className="proof-page" data-od-id="project-northstar-proof-screen">
      <section className="proof-disclosure" role="note" data-od-id="synthetic-proof-disclosure"><ShieldCheck aria-hidden="true" size={18} /><div><strong>Synthetic Deal proof</strong><span>Every company, Source, value, action, and Artifact is synthetic. Nothing shown proves production processing or security capability.</span></div></section>
      <section className="proof-workspace" aria-labelledby="proof-title" data-od-id="project-northstar-proof-workspace">
        <aside className="proof-checkpoints" aria-label="Proof checkpoints">
          <p className="eyebrow">Recoverable checkpoints</p>
          {proofSteps.map((step, index) => <button key={step.title} type="button" className={checkpoint === index ? 'active' : ''} aria-current={checkpoint === index ? 'step' : undefined} onClick={() => setCheckpoint(index)} data-od-id={`proof-checkpoint-${index + 1}`}><span className="mono">{index + 1}</span><strong>{step.title}</strong>{index < checkpoint ? <Check aria-hidden="true" size={14} /> : null}</button>)}
        </aside>
        <div className="proof-inspection">
          <p className="eyebrow">Project Northstar · Revision 0.4</p>
          <h1 id="proof-title">{active.title}</h1>
          <strong className="proof-value mono">{active.value}</strong>
          <p>{active.detail}</p>
          <div className="proof-artifact">
            <div className="proof-sheet"><FileSpreadsheet aria-hidden="true" size={22} /><span>Exact Source / Artifact region</span><strong className="mono">{checkpoint === 1 ? 'Operating Case!F42' : checkpoint === 2 || checkpoint === 3 ? 'Balance Sheet!F28' : `Checkpoint ${checkpoint + 1}`}</strong></div>
            <div className="proof-control"><FileCheck2 aria-hidden="true" size={22} /><span>Control and consequence</span><StatusBadge tone={checkpoint < 4 ? 'warning' : checkpoint === 7 ? 'critical' : 'success'}>{checkpoint < 4 ? 'Banker control required' : checkpoint === 7 ? 'New Revision not authorized' : 'Record preserved'}</StatusBadge></div>
          </div>
          <div className="public-actions">
            <button className="button button-primary" type="button" onClick={() => setCheckpoint((value) => Math.min(value + 1, proofSteps.length - 1))} disabled={checkpoint === proofSteps.length - 1} data-od-id="proof-next-checkpoint">{checkpoint === proofSteps.length - 1 ? 'Checkpoint complete' : 'Inspect next control point'}<ArrowRight aria-hidden="true" size={16} /></button>
            <button className="button button-secondary" type="button" onClick={() => setCheckpoint(0)} data-od-id="proof-reset"><RotateCcw aria-hidden="true" size={15} />Restart</button>
          </div>
        </div>
        <aside className="proof-context" aria-label="Current control context"><p className="eyebrow">Current object</p><dl className="key-value-list compact-list"><div><dt>Proof state</dt><dd className="mono">{checkpoint + 1} / 9</dd></div><div><dt>Revision</dt><dd className="mono">0.4</dd></div><div><dt>Source Packet</dt><dd className="mono">SP-004 v2</dd></div><div><dt>External authority</dt><dd>Not inherited</dd></div></dl><Link className="text-link" to="/qualification">Continue to qualification<ArrowRight aria-hidden="true" size={14} /></Link></aside>
      </section>
    </div>
  );
}

const mechanismPages: Record<string, { eyebrow: string; title: string; summary: string; stages: string[]; limitations: string[] }> = {
  '/how-it-works/evidence-and-decisions': { eyebrow: 'How it works', title: 'Evidence and Human Decisions retain separate authority', summary: 'The system preserves supporting and challenging Evidence. Bankers record decisions only against exact objects, versions, purposes, and scope.', stages: ['Source Record and locator', 'Separate Evidence / Claim / Fact / Assumption', 'Typed Control Review', 'Immutable Decision and downstream Impact'], limitations: ['There is no “approve AI” action', 'A Decision never rewrites original Evidence'] },
  '/how-it-works/deterministic-validation': { eyebrow: 'How it works', title: 'Deterministic validation closes only the gate it declares', summary: 'Rules produce repeatable results from exact inputs, versions, units, periods, and engine versions.', stages: ['Accepted input boundary', 'Versioned rule set', 'Result and exceptions', 'Affected gate'], limitations: ['A pass does not establish Professional Usability', 'Uncovered judgment remains visible'] },
  '/how-it-works/revisions-and-impact': { eyebrow: 'How it works', title: 'Material change creates an Impact Assessment before a new Revision', summary: 'The system distinguishes recalculation, regeneration, re-review, circulation blocks, and checked-but-unaffected objects.', stages: ['Accept material change', 'Check dependencies', 'Create Impact Assessment tasks', 'Create new Revision and preserve history'], limitations: ['Downstream controls are not cleared automatically', 'Prior authorization does not carry forward'] },
  '/how-it-works/native-and-reader-artifacts': { eyebrow: 'How it works', title: 'Native Artifacts and Reader Copies require exact parity', summary: 'Workbooks, presentations, and documents retain native structure while producing an inspectable Reader Copy.', stages: ['Artifact Template', 'Native generation', 'Reader rendering', 'Location-level QC and Manifest'], limitations: ['Visual equivalence is not claimed', 'Native structure is never silently flattened'] },
  '/security-data/source-rights': { eyebrow: 'Security & data use', title: 'Source rights are controlled per Source Record', summary: 'Purchase authority, Deal authority, and Source-use authority remain separate. Each version retains provenance, rights, confidentiality, and purpose.', stages: ['Authority declaration', 'Quarantine', 'Compatibility', 'Source Record'], limitations: ['Payment does not establish Source rights', 'An Assumption cannot bypass a gate'] },
  '/security-data/confidentiality-and-processing': { eyebrow: 'Security & data use', title: 'Confidentiality determines the available processing path', summary: 'Material provenance, confidentiality, de-identification, and rights posture are evaluated separately.', stages: ['Classification and restrictions', 'Paid Preflight', 'Compatible provider profile', 'Minimum task input'], limitations: ['Unverified certifications are not claimed', 'Restricted material does not inherit standard Confidential eligibility'] },
  '/security-data/retention-export-deletion': { eyebrow: 'Security & data use', title: 'Retention, export, external authority, and deletion are separate records', summary: 'Internal Controlled Export supports internal portability. External-Use Decision, delivery, and actual use are recorded separately.', stages: ['Retention boundary', 'Internal export', 'External authority and delivery', 'Deletion lifecycle'], limitations: ['Internal export does not authorize external circulation', 'Deletion is not presented as instantaneous'] },
};

export function MechanismScreen() {
  const route = useLocation().pathname.split(/[?#]/)[0];
  const content = mechanismPages[route] ?? { eyebrow: 'Public resources', title: 'Controlled sell-side auction execution resources', summary: 'Use rights-cleared synthetic Artifacts, tools, or recorded walkthroughs to enter the corresponding Project Northstar checkpoint.', stages: ['Synthetic Artifact', 'Accessible walkthrough', 'Boundary statement', 'Return to proof state'], limitations: ['No real Deal Material is accepted', 'Resource outcomes are not production Deal outcomes'] };
  return (
    <div className="public-page public-content-page" data-od-id="public-mechanism-screen">
      <section className="content-hero" aria-labelledby="mechanism-page-title" data-od-id="mechanism-page-hero"><p className="eyebrow">{content.eyebrow}</p><h1 id="mechanism-page-title">{content.title}</h1><p>{content.summary}</p></section>
      <section className="mechanism-detail" aria-label="Mechanism steps" data-od-id="mechanism-process"><ol>{content.stages.map((stage, index) => <li key={stage}><span className="mono">0{index + 1}</span><strong>{stage}</strong>{index < content.stages.length - 1 ? <ArrowRight aria-hidden="true" size={16} /> : null}</li>)}</ol></section>
      <section className="public-evidence-grid" aria-labelledby="scope-title" data-od-id="mechanism-scope"><div><p className="eyebrow">Implemented scope</p><h2 id="scope-title">Every statement must resolve to an inspectable object</h2><p>These pages describe only the documented V1 contract. Live production provider, capacity, and Capability Manifest values still require formal environment validation.</p></div><div><h3>Current limitations</h3><ul>{content.limitations.map((item) => <li key={item}>{item}</li>)}</ul></div></section>
      <section className="public-closing" data-od-id="mechanism-proof-link"><div><h2>Inspect this mechanism in Project Northstar</h2><p>Use rights-cleared synthetic objects to inspect exact Evidence, states, and consequences.</p></div><Link className="button button-primary" to="/project-northstar">Open the corresponding proof<ArrowRight aria-hidden="true" size={16} /></Link></section>
    </div>
  );
}

export function PricingScreen() {
  return (
    <div className="public-page public-content-page" data-od-id="pricing-screen">
      <section className="content-hero pricing-hero" aria-labelledby="pricing-title" data-od-id="pricing-hero"><p className="eyebrow">Precise commercial terms</p><h1 id="pricing-title">One named Banker, two billing terms with the same capability</h1><p>Price, renewal, Active Deal capacity, Guarantee, cancellation, and Post-Term Access are visible together before purchase.</p></section>
      <section className="pricing-ledger" aria-label="Pricing plans" data-od-id="pricing-ledger"><article><span>Monthly</span><strong className="mono">$995</strong><small>Per month · monthly renewal</small></article><article><span>Annual prepaid</span><strong className="mono">$10,950</strong><small>Per year · same product capability</small></article><article><span>Account boundary</span><strong>1 Individual Banker</strong><small>2 concurrent Active Deal Workspaces</small></article></section>
      <section className="pricing-details" aria-labelledby="pricing-included-title" data-od-id="pricing-details"><div><h2 id="pricing-included-title">Included professional controls</h2><ul><li>Complete V1 Sell-Side Auction work domain</li><li>Evidence inspection, Correction, Validation, QC, and Review</li><li>Human Decisions, ordinary target Revisions, and Internal Controlled Export</li><li>Processing allowance within the current Capability Manifest</li></ul></div><div><h2>Capacity and boundaries</h2><ul><li>Additional Active Deal, intensive processing, and archive capacity may be purchased separately</li><li>No metering by prompt, model call, token, citation, review, or export</li><li>No retroactive overages</li><li>Purchase does not establish Source rights or external-use authority</li></ul></div></section>
      <section className="commercial-terms" aria-label="Guarantee, cancellation, and post-term access" data-od-id="commercial-terms">{['First-Deal Control-Loop Guarantee', 'End-of-term cancellation and refund conditions', '30-day Post-Term Access', 'Current Capability Manifest'].map((item) => <div key={item}><Check aria-hidden="true" size={16} /><span>{item}</span></div>)}</section>
      <section className="public-closing" data-od-id="pricing-qualification"><div><h2>Check fit before entering the account flow</h2><p>Qualification collects only non-confidential category information and does not accept real Deal Material.</p></div><Link className="button button-primary" to="/qualification">Check qualification<ArrowRight aria-hidden="true" size={16} /></Link></section>
    </div>
  );
}

export function QualificationScreen() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="public-page qualification-page" data-od-id="qualification-screen">
      <section className="qualification-layout" aria-labelledby="qualification-title" data-od-id="qualification-workflow">
        <aside className="task-steps" aria-label="Qualification steps">{['Banker profile', 'Intended work', 'Input categories', 'Authority and restrictions', 'Review result'].map((step, index) => <div key={step} className={submitted || index < 4 ? 'complete' : 'current'}><span className="mono">0{index + 1}</span><strong>{step}</strong></div>)}</aside>
        <form className="qualification-form" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
          <p className="eyebrow">No real materials accepted</p><h1 id="qualification-title">Check product qualification</h1><p>Provide only categories, authority, and restrictions. Do not enter company names, amounts, files, or Confidential / Restricted content.</p>
          <div className="form-grid public-form-grid"><label className="field"><span>Banker role</span><select className="input" required defaultValue="individual"><option value="individual">Execution-oriented Individual Banker</option><option value="advisor">Independent transaction advisor</option></select></label><label className="field"><span>Independent purchase authority</span><select className="input" required defaultValue="yes"><option value="yes">Yes</option><option value="unknown">Not yet confirmed</option></select></label><label className="field"><span>Deal type</span><select className="input" required defaultValue="sell-side"><option value="sell-side">Sell-Side Auction</option><option value="other">Other transaction work</option></select></label><label className="field"><span>Intended use</span><input className="input" required defaultValue="Sell-side preparation, marketing materials, and auction execution" /></label><label className="field"><span>Expected Source types</span><input className="input" required defaultValue="Financial statements, QoE, management model, and CIM" /></label><label className="field"><span>Expected confidentiality</span><select className="input" required defaultValue="confidential"><option value="confidential">Confidential</option><option value="restricted">Restricted</option><option value="unknown">Not yet confirmed</option></select></label></div>
          <label className="field"><span>Known employer, client, provider, or geographic restrictions</span><textarea className="textarea" defaultValue="Paid Preflight must confirm actual Source rights, provider profiles, and processing regions." rows={3} /></label>
          <button className="button button-primary" type="submit" data-od-id="review-qualification">Review qualification</button>
        </form>
        <aside className="qualification-review" aria-label="Qualification result"><p className="eyebrow">Review result</p>{submitted ? <><StatusBadge tone="warning">Potential restrictions · pre-purchase review</StatusBadge><h2>The work type fits; processing boundaries still require Paid Preflight</h2><p>Sell-Side Auction work is in V1 scope. Providers, rights, exact files, and the Minimum Source Packet for Confidential material remain unverified.</p><dl className="key-value-list compact-list"><div><dt>Confirmed</dt><dd>Banker and workflow fit</dd></div><div><dt>Unverified</dt><dd>Exact Sources, templates, and geographic restrictions</dd></div><div><dt>Next gate</dt><dd>Paid Preflight</dd></div></dl><Link className="button button-secondary button-full" to="/account-access">Continue to account access</Link></> : <><h2>Waiting for non-confidential input</h2><p>The result is a pre-purchase preview only. It does not authorize Sources, establish file compatibility, or replace Paid Preflight.</p></>}</aside>
      </section>
    </div>
  );
}

export function CheckoutScreen({ step }: { step: 'order' | 'terms' | 'payment' | 'confirmation' | 'recovery' }) {
  const navigate = useNavigate();
  const steps = ['order', 'terms', 'payment', 'confirmation'];
  const labels = ['Order', 'Terms', 'Payment', 'Confirmation'];
  const index = Math.max(steps.indexOf(step), 0);
  const title = step === 'order' ? 'Confirm Order' : step === 'terms' ? 'Accept purchase terms' : step === 'payment' ? 'Complete payment' : step === 'recovery' ? 'Recover Checkout' : 'Entitlement activated';
  function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const next = step === 'order' ? 'terms' : step === 'terms' ? 'payment' : 'confirmation'; navigate(`/checkout/${next}`); }
  return (
    <div className="checkout-page" data-od-id={`checkout-${step}-screen`}>
      <section className="checkout-layout" aria-labelledby="checkout-title" data-od-id="checkout-task">
        <aside className="checkout-steps" aria-label="Checkout steps">{labels.map((label, stepIndex) => <div key={label} className={stepIndex === index ? 'current' : stepIndex < index ? 'complete' : ''}><span className="mono">0{stepIndex + 1}</span><strong>{label}</strong></div>)}</aside>
        <div className="checkout-main"><p className="eyebrow">Order ORD-SYN-0042 · synthetic demonstration</p><h1 id="checkout-title">{title}</h1>
          {step === 'confirmation' ? <div className="confirmation-receipt"><ShieldCheck aria-hidden="true" size={28} /><h2>Payment and Entitlement confirmed once</h2><p>Monthly plan · 2 Active Deals · next renewal shown as a synthetic demonstration record. Purchase did not establish Source rights or external-use authority.</p><dl className="key-value-list"><div><dt>Receipt</dt><dd className="mono">RCT-SYN-0042</dd></div><div><dt>Guarantee</dt><dd>First-Deal Control-Loop</dd></div><div><dt>Active Deal capacity</dt><dd className="mono">0 / 2</dd></div></dl><Link className="button button-primary" to="/app/deals/new">Set up the first Deal</Link></div> : step === 'recovery' ? <div className="material-blocker"><CircleAlert aria-hidden="true" size={22} /><div><h2>The Order and current step are saved</h2><p>Account or payment recovery returns to the same Checkout checkpoint without creating a duplicate Entitlement.</p></div><Link className="button button-primary" to="/checkout/payment">Return to payment</Link></div> : <form className="checkout-form" onSubmit={submit}>{step === 'order' ? <><label className="field"><span>Billing term</span><select className="input" defaultValue="monthly"><option value="monthly">Monthly · $995</option><option value="annual">Annual prepaid · $10,950</option></select></label><label className="field"><span>Additional capacity</span><select className="input" defaultValue="none"><option value="none">None</option><option value="deal">Additional Active Deal · price pending formal offer</option></select></label></> : step === 'terms' ? <div className="terms-checklist">{['I am authorized to complete this purchase', 'Purchase does not establish Source-use authority', 'I reviewed the Guarantee, cancellation, and refund conditions', 'I reviewed Post-Term, export, retention, and deletion boundaries', 'I reviewed the processing boundaries in Security & Data Use'].map((term) => <label className="check-field" key={term}><input type="checkbox" required /><span><strong>{term}</strong></span></label>)}</div> : <div className="form-grid public-form-grid"><label className="field"><span>Payment method</span><input className="input" required defaultValue="Hosted payment integration · synthetic demonstration" /></label><label className="field"><span>Billing name</span><input className="input" required defaultValue="W. Banker" /></label><label className="field"><span>Billing address</span><input className="input" required defaultValue="Synthetic demonstration address" /></label><label className="field"><span>Country or region</span><select className="input" defaultValue="us"><option value="us">United States</option></select></label></div>}<button className="button button-primary" type="submit" data-od-id={`checkout-${step}-continue`}>{step === 'order' ? 'Continue to terms' : step === 'terms' ? 'Accept terms and continue to payment' : 'Pay $995 and begin monthly term'}<ArrowRight aria-hidden="true" size={16} /></button></form>}
        </div>
        <aside className="checkout-summary" aria-label="Order summary"><p className="eyebrow">Order summary</p><dl className="key-value-list compact-list"><div><dt>Due now</dt><dd className="mono">$995</dd></div><div><dt>Renewal</dt><dd>Monthly · synthetic date</dd></div><div><dt>Active Deals</dt><dd className="mono">2</dd></div><div><dt>Tax</dt><dd>Confirmed at checkout when applicable</dd></div><div><dt>Guarantee</dt><dd>First-Deal Control-Loop</dd></div></dl><LockKeyhole aria-hidden="true" size={18} /><p>The Order is saved. Account recovery and payment failure both return to the current step.</p></aside>
      </section>
    </div>
  );
}
