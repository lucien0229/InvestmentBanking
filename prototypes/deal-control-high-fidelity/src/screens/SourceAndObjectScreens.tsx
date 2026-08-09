import { AlertTriangle, ArrowRight, Check, ChevronRight, CircleAlert, File, FileCheck2, FileSpreadsheet, Link2, LoaderCircle, RotateCcw, ShieldCheck, Upload } from 'lucide-react';
import { useState } from 'react';
import { Link } from '../router';
import { DetailTabs } from '../components/DetailTabs';
import { StatusBadge } from '../components/StatusBadge';
import { dealBasePath } from '../data/demoData';

type ObjectKind = 'source' | 'claim' | 'analysis';

const objectConfig = {
  source: {
    eyebrow: 'Source Record · SR-002', title: 'Management_Model_v7.xlsx', badge: 'Limited dependency', tone: 'warning' as const,
    summary: 'Preserves the native workbook, formulas, values, parse coverage, and exact Native Locators for the Project Northstar management model Source.',
    properties: [['Version','v7'],['Classification','Confidential'],['Rights posture','Declared · pending production verification'],['Received','2026-08-03 14:16'],['Parse coverage','Formulas, values, and cell locators'],['Hash','sha256:9f42…c18a']],
    tabs: ['Overview','Native Structure','Evidence','Lineage','Review History'],
  },
  claim: {
    eyebrow: 'Claim · CLM-018', title: 'FY2025E Adjusted EBITDA', badge: 'Material conflict', tone: 'warning' as const,
    summary: 'The $18.4m seller Claim in the Draft CIM and the $17.8m valuation treatment in the Management Model are both preserved. A Human Decision controls current use.',
    properties: [['Current presentation','$18.4m'],['Controlled treatment','$17.8m'],['Unit','USD million'],['Purpose','Rev 0.3 valuation'],['State','Decision recorded'],['Downstream Impact','8 objects']],
    tabs: ['Evidence','Decision','Lineage','Revisions','History'],
  },
  analysis: {
    eyebrow: 'Analysis · ANL-014', title: 'EV-to-Equity Bridge', badge: 'Mechanical passed', tone: 'success' as const,
    summary: 'Controlled inputs, deterministic rules, and results remain separate from Professional Review. The $1.5m tie-out was restored to $0.0m in Revision 0.4.',
    properties: [['Revision','0.4'],['Enterprise Value','$184.0m'],['Cash','$4.7m'],['Debt','$36.2m'],['Equity Value','$152.5m'],['Tie-out','$0.0m']],
    tabs: ['Inputs','Calculation','Validation','Impact','Review History'],
  },
};

export function ObjectDetailScreen({ kind }: { kind: ObjectKind }) {
  const content = objectConfig[kind];
  const [tab, setTab] = useState(content.tabs[0]);
  const back = kind === 'source' ? `${dealBasePath}/sources` : kind === 'claim' ? `${dealBasePath}/evidence-decisions` : `${dealBasePath}/analysis`;
  return (
    <section className="screen object-screen" aria-labelledby={`${kind}-object-title`} data-od-id={`${kind}-object-detail-screen`}>
      <Link className="back-link" to={back}>← Back to {kind === 'source' ? 'Sources' : kind === 'claim' ? 'Evidence & Decisions' : 'Analysis'}</Link>
      <header className="object-header"><div><p className="eyebrow">{content.eyebrow}</p><h1 id={`${kind}-object-title`}>{content.title}</h1><p>{content.summary}</p></div><div className="object-state"><StatusBadge tone={content.tone}>{content.badge}</StatusBadge><span className="mono">Project Northstar · synthetic</span></div></header>
      <dl className="property-strip">{content.properties.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={/[0-9$]/.test(value) ? 'mono' : ''}>{value}</dd></div>)}</dl>
      <DetailTabs tabs={content.tabs} activeTab={tab} onChange={setTab} label="Object detail views" idPrefix={`${kind}-object`} panelId={`${kind}-object-panel`} dataOdId={`${kind}-object-tabs`} />
      <div className="object-detail-grid"><section id={`${kind}-object-panel`} className="object-workpane" role="tabpanel" aria-label={`${tab} content`} data-od-id="canonical-object-pane"><div className="section-heading"><div><p className="eyebrow">{tab}</p><h2>Exact object content</h2></div><span className="mono">Read-only demonstration</span></div>{kind === 'source' ? <SourceObjectBody tab={tab} /> : kind === 'claim' ? <ClaimObjectBody tab={tab} /> : <AnalysisObjectBody tab={tab} />}</section><aside className="object-relationships" aria-label="Object relationships"><h2>Relationships & history</h2><Relation label="Derived from" value={kind === 'source' ? 'Upload UPL-004' : 'SR-001 / SR-002'} /><Relation label="Supports" value={kind === 'analysis' ? 'DEL-001 / DEL-004' : 'ANL-014 / REV-0.4'} /><Relation label="Controlled by" value={kind === 'source' ? 'Source Packet SP-004' : 'HD-018'} /><Relation label="Latest event" value="2026-08-04 15:16" /><Link className="button button-secondary button-full" to={`${dealBasePath}/history-portability`}>Inspect full history</Link></aside></div>
    </section>
  );
}

function Relation({ label, value }: { label: string; value: string }) { return <div className="relation-row"><span>{label}</span><strong>{value}</strong><ChevronRight aria-hidden="true" size={15} /></div>; }

function SourceObjectBody({ tab }: { tab: string }) {
  if (tab === 'Native Structure') return <div className="native-sheet-preview" aria-label="Synthetic workbook structure preview"><div className="sheet-tabs"><span className="active">Operating Case</span><span>Balance Sheet</span><span>Summary</span></div><div className="sheet-grid"><span>F42</span><strong className="mono">17.8</strong><small>=EBITDA + QoE Adjustments</small><span>F28</span><strong className="mono">4.7</strong><small>=Cash & Equivalents</small></div></div>;
  return <div className="evidence-list"><article><FileSpreadsheet aria-hidden="true" size={18} /><div><strong>Operating Case!F42</strong><p>FY2025E adjusted EBITDA · <span className="mono">$17.8m</span></p></div><StatusBadge tone="success">Parsed</StatusBadge></article><article><FileSpreadsheet aria-hidden="true" size={18} /><div><strong>Balance Sheet!F28</strong><p>Cash & equivalents · <span className="mono">$4.7m</span></p></div><StatusBadge tone="warning">Previously mis-extracted</StatusBadge></article></div>;
}

function ClaimObjectBody({ tab }: { tab: string }) {
  if (tab === 'Decision') return <div className="decision-ledger"><div><span>Human Decision</span><strong className="mono">HD-018</strong></div><p>Use the Management Model's QoE-adjusted definition for the Rev 0.3 valuation purpose. Preserve the $18.4m seller Claim from the Draft CIM without silently overwriting it.</p><Link className="text-link" to={`${dealBasePath}/evidence-decisions/control-review`}>Reopen Control Review</Link></div>;
  return <div className="evidence-comparison"><article><span className="mono">SR-001 · page 18 / Table 4</span><strong className="mono">$18.4m</strong><p>Draft CIM seller Claim · preserved</p></article><article><span className="mono">SR-002 · Operating Case!F42</span><strong className="mono">$17.8m</strong><p>Controlled treatment for the current valuation purpose</p></article></div>;
}

function AnalysisObjectBody({ tab }: { tab: string }) {
  if (tab === 'Validation') return <div className="validation-ledger"><div><span>Rule</span><strong>EV - Debt + Cash = Equity Value</strong></div><div><span>Revision 0.3</span><strong className="mono critical-text">$1.5m variance</strong></div><div><span>Revision 0.4</span><strong className="mono">$0.0m variance</strong></div><p>Mechanical passed proves only that the rule recalculates consistently. The CIM still requires re-review.</p></div>;
  return <div className="calculation-flow"><div><span>Enterprise Value</span><strong className="mono">$184.0m</strong></div><span>−</span><div><span>Debt</span><strong className="mono">$36.2m</strong></div><span>+</span><div><span>Cash</span><strong className="mono">$4.7m</strong></div><span>=</span><div><span>Equity Value</span><strong className="mono">$152.5m</strong></div></div>;
}

const sourceStages = ['Select file', 'Classification & rights', 'Parse review', 'Join Source Packet'];

export function AddSourceScreen() {
  const [stage, setStage] = useState(0);
  const [failed, setFailed] = useState(false);
  return (
    <section className="screen" aria-labelledby="add-source-title" data-od-id="add-source-screen">
      <Link className="back-link" to={`${dealBasePath}/sources`}>← Back to Sources</Link>
      <header className="page-header"><div><p className="eyebrow">Add Source · synthetic file</p><h1 id="add-source-title">Create an inspectable Source Record before controlled processing</h1><p>Four stages confirm the file, rights and confidentiality, parse coverage, and Source Packet membership.</p></div><StatusBadge tone={failed ? 'critical' : 'neutral'}>{failed ? 'Parse failed · recoverable' : `Stage ${stage + 1} / 4`}</StatusBadge></header>
      <ol className="horizontal-steps" aria-label="Add Source steps">{sourceStages.map((item, index) => <li key={item} className={index === stage ? 'current' : index < stage ? 'complete' : ''}><span className="mono">0{index + 1}</span><strong>{item}</strong></li>)}</ol>
      <div className="source-task-panel">
        {failed ? <div className="task-error" role="alert"><CircleAlert aria-hidden="true" size={24} /><h2>Workbook parse incomplete</h2><p>The “Hidden Support” sheet contains a password-protected range. The upload and parse results for the first three sheets have been preserved.</p><button className="button button-primary" type="button" onClick={() => setFailed(false)}><RotateCcw aria-hidden="true" size={16} />Retry with supported scope</button></div> : stage === 0 ? <div className="upload-zone"><Upload aria-hidden="true" size={28} /><h2>Select a synthetic Source file</h2><p>Demonstration file: Management_Model_v8.xlsx · 18.6 MB. Do not upload real Confidential material to this prototype.</p><button className="button button-secondary" type="button" onClick={() => setStage(1)}>Select synthetic workbook</button></div> : stage === 1 ? <div className="setup-form"><label className="field"><span>Source type</span><select className="input" defaultValue="model"><option value="model">Management Model</option><option value="qoe">QoE</option><option value="cim">CIM Draft</option></select></label><label className="field"><span>Confidentiality</span><select className="input" defaultValue="confidential"><option value="confidential">Confidential</option><option value="restricted">Restricted</option></select></label><label className="check-field"><input type="checkbox" defaultChecked /><span><strong>I am authorized to use this material for controlled processing in Project Northstar</strong><small>This declaration will be preserved in the Source Record and will not establish external-use authority.</small></span></label></div> : stage === 2 ? <div className="parse-review"><article><FileSpreadsheet aria-hidden="true" size={18} /><div><strong>Operating Case</strong><p>Formulas, values, labels, and 124 Native Locators</p></div><StatusBadge tone="success">Complete</StatusBadge></article><article><FileSpreadsheet aria-hidden="true" size={18} /><div><strong>Balance Sheet</strong><p>Formulas, values, labels, and 63 Native Locators</p></div><StatusBadge tone="success">Complete</StatusBadge></article><article><AlertTriangle aria-hidden="true" size={18} /><div><strong>Hidden Support</strong><p>Password protected · not parsed</p></div><button className="table-action" type="button" onClick={() => setFailed(true)}>Inspect error</button></article></div> : <div className="packet-membership"><ShieldCheck aria-hidden="true" size={23} /><h2>Join Source Packet SP-004</h2><p>The new Source Record becomes a candidate input for current analyses and Revision recalculation. It will not silently replace SR-002.</p><dl className="key-value-list"><div><dt>New record</dt><dd className="mono">SR-005 · v8</dd></div><div><dt>Packet</dt><dd className="mono">SP-004</dd></div><div><dt>Change consequence</dt><dd>Create Impact Assessment; keep circulation blocked</dd></div></dl></div>}
        {!failed ? <div className="page-actions"><button className="button button-secondary" type="button" onClick={() => setStage((value) => Math.max(value - 1, 0))} disabled={stage === 0}>Back</button>{stage < 3 ? <button className="button button-primary" type="button" onClick={() => setStage((value) => Math.min(value + 1, 3))}>Continue<ArrowRight aria-hidden="true" size={16} /></button> : <Link className="button button-primary" to={`${dealBasePath}/source-packets/sp-004`}>Save and open Source Packet</Link>}</div> : null}
      </div>
    </section>
  );
}

export function SourcePacketScreen() {
  const [included, setIncluded] = useState(['SR-001','SR-002','SR-003']);
  const rows = [['SR-001','Draft_CIM_v3.pdf','Seller narrative'],['SR-002','Management_Model_v7.xlsx','Control model'],['SR-003','QoE_Adjustments_v2.xlsx','QoE support'],['SR-004','Buyer_Universe_approved.xlsx','Process control']];
  return (
    <section className="screen" aria-labelledby="packet-title" data-od-id="source-packet-screen">
      <Link className="back-link" to={`${dealBasePath}/sources`}>← Back to Sources</Link><header className="page-header"><div><p className="eyebrow">Source Packet · SP-004</p><h1 id="packet-title">Manage current controlled inputs without silently replacing Sources</h1><p>A Packet is a versioned Source collection. Adding or removing a Source Record creates an Impact Assessment.</p></div><StatusBadge tone="warning">Unsaved changes</StatusBadge></header>
      <div className="packet-builder"><section className="account-panel" data-od-id="source-packet-records"><h2>Available Source Records</h2>{rows.map(([id,name,role]) => <label className="packet-row" key={id}><input type="checkbox" checked={included.includes(id)} onChange={() => setIncluded((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current,id])} /><File aria-hidden="true" size={17} /><span><strong>{name}</strong><small>{id} · {role}</small></span></label>)}</section><aside className="account-panel"><h2>Packet consequences</h2><dl className="key-value-list"><div><dt>Current members</dt><dd className="mono">{included.length}</dd></div><div><dt>Target Revision</dt><dd className="mono">0.5 candidate</dd></div><div><dt>Recalculation</dt><dd>ANL-014 and 2 calculations</dd></div><div><dt>Re-review</dt><dd>DEL-001 / DEL-004</dd></div><div><dt>External use</dt><dd>Remains blocked</dd></div></dl><Link className="button button-primary button-full" to={`${dealBasePath}/review-readiness/impact-assessments/ia-014`} data-od-id="save-source-packet">Save Packet and inspect Impact</Link></aside></div>
    </section>
  );
}

export function JobDetailScreen() {
  const [status, setStatus] = useState<'failed' | 'running' | 'done'>('failed');
  return (
    <section className="screen" aria-labelledby="job-title" data-od-id="durable-job-screen">
      <Link className="back-link" to={`${dealBasePath}/actions`}>← Back to Action Center</Link><header className="page-header"><div><p className="eyebrow">Job · JOB-0098</p><h1 id="job-title">Generate Native / Reader Artifacts for Revision 0.4</h1><p>Progress is shown through completed stages and recoverable checkpoints. No fabricated percentage appears when there is no reliable ETA.</p></div><StatusBadge tone={status === 'failed' ? 'critical' : status === 'running' ? 'warning' : 'success'}>{status === 'failed' ? 'Failed · recoverable' : status === 'running' ? 'Resuming' : 'Complete'}</StatusBadge></header>
      <div className="job-layout"><ol className="job-stages">{['Inputs locked','Native workbook rendered','Reader Copy rendered','Parity checked','Artifacts registered'].map((label,index) => <li key={label} className={status === 'done' || index < 2 ? 'complete' : status === 'running' && index === 2 ? 'current' : index === 2 ? 'failed' : ''}><span>{status === 'done' || index < 2 ? <Check aria-hidden="true" size={15} /> : index === 2 && status === 'running' ? <LoaderCircle className="spinner" aria-hidden="true" size={15} /> : index === 2 ? <CircleAlert aria-hidden="true" size={15} /> : index + 1}</span><div><strong>{label}</strong><small>{index < 2 ? 'Checkpoint saved' : index === 2 ? 'Reader Copy renderer returned a controlled error' : 'Waiting for prior stage'}</small></div></li>)}</ol><aside className="account-panel"><h2>Recovery information</h2><dl className="key-value-list"><div><dt>Last heartbeat</dt><dd className="mono">2026-08-04 15:18:42</dd></div><div><dt>Preserved</dt><dd>Inputs and Native workbook</dd></div><div><dt>Minimum recovery action</dt><dd>Retry only the Reader Copy renderer</dd></div><div><dt>Duplicate side effects</dt><dd>No new Revision will be created</dd></div></dl>{status === 'failed' ? <button className="button button-primary button-full" type="button" onClick={() => { setStatus('running'); window.setTimeout(() => setStatus('done'), 500); }} data-od-id="resume-job"><RotateCcw aria-hidden="true" size={16} />Resume from checkpoint</button> : status === 'running' ? <p className="inline-status" role="status"><LoaderCircle className="spinner" aria-hidden="true" size={16} />Recovering Reader Copy renderer…</p> : <Link className="button button-primary button-full" to={`${dealBasePath}/deliverables/del-004`}>Open completed Deliverable</Link>}</aside></div>
    </section>
  );
}
