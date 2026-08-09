import { AlertTriangle, ArrowRight, Check, ChevronRight, CircleAlert, FileCheck2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from '../router';
import { StatusBadge } from '../components/StatusBadge';
import { dealBasePath } from '../data/demoData';

const setupSteps = ['Deal identity', 'Business Stage', 'Controlled purpose', 'Default restrictions', 'Confirm setup'];

export function DealSetupScreen({ existing = false }: { existing?: boolean }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(existing ? 4 : 0);
  const [error, setError] = useState('');
  const titles = ['Define Deal identity', 'Select the current Business Stage', 'Bound the first controlled purpose', 'Confirm default control boundaries', 'Confirm and create the Deal Workspace'];
  function next() {
    if (step === 0 && !existing) {
      const name = (document.getElementById('deal-name') as HTMLInputElement | null)?.value.trim();
      if (!name) { setError('Enter a Deal code name to continue.'); return; }
    }
    setError('');
    if (step < setupSteps.length - 1) setStep((value) => value + 1);
    else navigate(`${dealBasePath}/controls/preflight`);
  }
  return (
    <section className="setup-screen" aria-labelledby="deal-setup-title" data-od-id="deal-setup-screen">
      <aside className="task-steps setup-steps" aria-label="Deal Setup steps">{setupSteps.map((label, index) => <button key={label} type="button" onClick={() => index <= step && setStep(index)} className={index === step ? 'current' : index < step ? 'complete' : ''} disabled={index > step}><span className="mono">0{index + 1}</span><strong>{label}</strong>{index < step ? <Check aria-hidden="true" size={14} /> : null}</button>)}</aside>
      <div className="setup-main"><p className="eyebrow">{existing ? 'Deal Setup · Project Northstar' : 'Create Deal · Synthetic demo'}</p><h1 id="deal-setup-title">{titles[step]}</h1>
        {error ? <div className="error-summary" role="alert" tabIndex={-1}><CircleAlert aria-hidden="true" size={18} /><span>{error}</span></div> : null}
        {step === 0 ? <div className="setup-form"><label className="field"><span>Deal code name</span><input id="deal-name" className="input" defaultValue={existing ? 'Project Northstar' : ''} placeholder="For example, Project Northstar" aria-invalid={error ? 'true' : undefined} /></label><label className="field"><span>Transaction type</span><select className="input" defaultValue="sell-side"><option value="sell-side">Sell-Side Auction</option></select></label><label className="field"><span>Industry label</span><input className="input" defaultValue="Industrial services" /></label></div> : null}
        {step === 1 ? <div className="choice-grid">{['Preparation', 'Launch', 'First Round', 'Final Round / Signing'].map((stage) => <label className="option-card" key={stage}><input type="radio" name="stage" defaultChecked={stage === 'Preparation'} /><span><strong>{stage}</strong><small>{stage === 'Preparation' ? 'Current Project Northstar documentation path' : 'Changes stage applicability without deleting objects'}</small></span></label>)}</div> : null}
        {step === 2 ? <div className="choice-grid">{['Establish the first inspectable Source Packet', 'Prepare a controlled Analysis & Valuation Workbook', 'Create the first Teaser / CIM Revision', 'Continue an auction process already in progress'].map((purpose, index) => <label className="option-card" key={purpose}><input type="radio" name="purpose" defaultChecked={index === 0} /><span><strong>{purpose}</strong><small>Bounds the first controlled loop without limiting later work areas.</small></span></label>)}</div> : null}
        {step === 3 ? <div className="setup-boundaries"><div><LockKeyhole aria-hidden="true" size={19} /><span><strong>External use blocked by default</strong><small>No Revision may circulate without an exact External-Use Decision.</small></span></div><div><ShieldCheck aria-hidden="true" size={19} /><span><strong>AI produces Proposals only</strong><small>Facts, Human Decisions, authorization, and business side effects can be created only by auditable controls.</small></span></div><div><FileCheck2 aria-hidden="true" size={19} /><span><strong>Source rights must be verified</strong><small>Do not upload real Confidential Deal Materials before Paid Preflight.</small></span></div></div> : null}
        {step === 4 ? <div className="setup-review"><StatusBadge tone="warning">Paid Preflight pending</StatusBadge><dl className="key-value-list"><div><dt>Deal</dt><dd>Project Northstar · Synthetic</dd></div><div><dt>Type</dt><dd>Sell-Side Auction</dd></div><div><dt>Stage</dt><dd>Preparation</dd></div><div><dt>First purpose</dt><dd>Establish a Source Packet and complete the first controlled loop</dd></div><div><dt>Default external use</dt><dd>Blocked</dd></div></dl><p>Creating the Workspace does not permit material processing. Paid Preflight is still required next.</p></div> : null}
        <div className="setup-actions"><button className="button button-secondary" type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>Back</button><button className="button button-primary" type="button" onClick={next} data-od-id="deal-setup-continue">{step === setupSteps.length - 1 ? 'Create and start Paid Preflight' : 'Continue'}<ArrowRight aria-hidden="true" size={16} /></button></div>
      </div>
      <aside className="setup-aside"><p className="eyebrow">What setup establishes</p><ol>{setupSteps.map((label, index) => <li key={label} className={index === step ? 'current' : ''}><span className="mono">0{index + 1}</span><span>{label}</span></li>)}</ol></aside>
    </section>
  );
}

export function PreflightScreen() {
  const [outcome, setOutcome] = useState<'pending' | 'review' | 'passed'>('pending');
  const checks = [
    ['Source rights', outcome === 'passed' ? 'Confirmed' : 'Explicit evidence required', 'Files are provided by an authorized Banker; the uploader remains responsible for actual rights.'],
    ['Confidentiality', 'Confidential', 'The current supported provider profile is required.'],
    ['Provider / region', outcome === 'review' ? 'Review required' : 'Synthetic profile matched', 'The production Capability Manifest is not verified live in this prototype.'],
    ['Minimum Source Packet', outcome === 'passed' ? 'Satisfied' : 'Pending inspection', 'Management Model, QoE, historical financials, and material drafts.'],
    ['Output ceiling', 'Restricted', 'Create controlled internal drafts first, without establishing external-use authorization.'],
  ];
  return (
    <section className="screen" aria-labelledby="preflight-title" data-od-id="paid-preflight-screen">
      <header className="page-header"><div><p className="eyebrow">Paid Preflight · Project Northstar</p><h1 id="preflight-title">Lock rights, capability, and Output Ceiling before processing real material</h1><p>This page uses synthetic classification data only. Production must reconfirm the exact Source, provider profile, and Capability Manifest.</p></div><StatusBadge tone={outcome === 'passed' ? 'success' : outcome === 'review' ? 'warning' : 'neutral'}>{outcome === 'passed' ? 'Passed · Synthetic' : outcome === 'review' ? 'Manual review required' : 'Pending inspection'}</StatusBadge></header>
      <div className="preflight-grid"><div className="account-panel preflight-checks"><h2>Preflight checks</h2>{checks.map(([label, state, detail]) => <div className="preflight-row" key={label}><div><strong>{label}</strong><p>{detail}</p></div><span>{state}</span></div>)}</div><aside className="account-panel"><h2>Three explicit outcomes</h2><dl className="key-value-list"><div><dt>What may be processed</dt><dd>Synthetic Office and PDF material matching the current profile</dd></div><div><dt>What may be generated</dt><dd>Internal controlled Drafts, Evidence, and Revisions</dd></div><div><dt>What cannot be inferred</dt><dd>Source rights, Professional Usability, or external authorization</dd></div></dl></aside></div>
      {outcome === 'pending' ? <div className="page-actions"><button className="button button-secondary" type="button" onClick={() => setOutcome('review')}>Simulate review required</button><button className="button button-primary" type="button" onClick={() => setOutcome('passed')} data-od-id="complete-preflight">Run synthetic Preflight</button></div> : outcome === 'review' ? <div className="material-blocker"><AlertTriangle aria-hidden="true" size={21} /><div><h2>Provider / region requires manual review</h2><p>Preserve the current form, confirm the production Capability Manifest, and retry. Do not upload real material.</p></div><button className="button button-primary" type="button" onClick={() => setOutcome('passed')}>Record controlled demo exception</button></div> : <div className="completion-banner" role="status"><Check aria-hidden="true" size={20} /><div><h2>Paid Preflight passed the synthetic checks</h2><p>This permits entry into the demo Source flow only. External use remains blocked.</p></div><Link className="button button-primary" to={`${dealBasePath}/guide`}>Start First Deal Guide<ArrowRight aria-hidden="true" size={16} /></Link></div>}
    </section>
  );
}

const guideTasks = [
  { title: 'Establish the first Source Packet', detail: 'Add synthetic Source Records for the Management Model, QoE, and Draft CIM.', href: `${dealBasePath}/sources/add` },
  { title: 'Inspect the first material conflict', detail: 'Inspect exact Evidence, locators, and relationships for EBITDA and Cash.', href: `${dealBasePath}/evidence-decisions` },
  { title: 'Record the first Human Decision', detail: 'Use Control Review to preserve rationale, Impact, and the immutable record.', href: `${dealBasePath}/evidence-decisions/control-review` },
  { title: 'Validate and establish a Revision', detail: 'Run deterministic rules and understand their boundary with professional review.', href: `${dealBasePath}/analysis` },
  { title: 'Inspect the first controlled outcome', detail: 'Confirm Package Readiness and the Internal Controlled Export.', href: `${dealBasePath}/review-readiness` },
];

export function FirstDealGuideScreen({ completed = false }: { completed?: boolean }) {
  return (
    <section className="screen guide-screen" aria-labelledby="guide-title" data-od-id={completed ? 'first-loop-completion-screen' : 'first-deal-guide-screen'}>
      <header className="page-header"><div><p className="eyebrow">First Deal Guide · Canonical work areas stay unchanged</p><h1 id="guide-title">{completed ? 'The first controlled loop is complete' : 'Complete the first controlled loop for Project Northstar'}</h1><p>{completed ? 'Review the Source, Decision, Validation, Revision, and Internal Export created. These outcomes still do not establish external authorization.' : 'The Guide sequences the first high-risk flow only. Objects, states, and history remain on their canonical pages.'}</p></div>{completed ? <StatusBadge tone="success">Control mechanism verified</StatusBadge> : <StatusBadge tone="warning">2 / 5 checkpoints</StatusBadge>}</header>
      {completed ? <div className="completion-ledger">{[['Source Packet','SP-004'],['Human Decision','HD-018'],['Validation','VAL-009'],['Revision','0.4'],['Internal Export','EXP-021']].map(([label, value]) => <article key={label}><Check aria-hidden="true" size={18} /><span>{label}</span><strong className="mono">{value}</strong></article>)}</div> : <ol className="guide-task-list">{guideTasks.map((task, index) => <li key={task.title} className={index < 2 ? 'complete' : index === 2 ? 'current' : ''}><span className="guide-index mono">0{index + 1}</span><div><h2>{task.title}</h2><p>{task.detail}</p></div><Link className="button button-secondary" to={task.href}>{index < 2 ? 'Reinspect' : index === 2 ? 'Continue current checkpoint' : 'Open task'}<ChevronRight aria-hidden="true" size={15} /></Link></li>)}</ol>}
      <aside className="guide-boundary"><LockKeyhole aria-hidden="true" size={18} /><p><strong>Completing the Guide does not:</strong> establish Source rights, replace Banker judgment on Professional Usability, clear re-review, or authorize any external use.</p></aside>
      {!completed ? <div className="page-actions"><Link className="button button-secondary" to={dealBasePath + "/guide/completion"}>View loop-completion state</Link></div> : null}{completed ? <div className="page-actions"><Link className="button button-secondary" to={`${dealBasePath}/history-portability`}>Inspect audit history</Link><Link className="button button-primary" to={`${dealBasePath}/overview`}>Enter Deal Overview<ArrowRight aria-hidden="true" size={16} /></Link></div> : null}
    </section>
  );
}
