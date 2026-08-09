import { AlertTriangle, ArrowRight, Check, CircleAlert, Clock3, Download, FileArchive, LockKeyhole, ShieldAlert, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from '../router';
import { StatusBadge } from '../components/StatusBadge';
import { dealBasePath } from '../data/demoData';
import { usePrototypeState } from '../hooks/usePrototypeState';

export function QCFindingScreen() {
  const [resolved, setResolved] = useState(false);
  return (
    <section className="screen narrow-control-screen" aria-labelledby="qc-title" data-od-id="qc-finding-screen"><Link className="back-link" to={`${dealBasePath}/review-readiness`}>← Back to Review & Readiness</Link><header className="page-header"><div><p className="eyebrow">QC Finding · QC-022</p><h1 id="qc-title">CIM Reader Copy page 18 does not match the Native Artifact</h1><p>A QC Finding points to an exact artifact, rule, severity, and disposition. It is not a generic quality score.</p></div><StatusBadge tone={resolved ? 'success' : 'warning'}>{resolved ? 'Resolved · re-review required' : 'Open · Material'}</StatusBadge></header><div className="control-review-layout"><section className="control-review-card" data-od-id="qc-finding-evidence"><h2>Exact finding</h2><div className="evidence-comparison"><article><span className="mono">Native PPTX · slide 18</span><strong className="mono">$17.8m</strong><p>FY2025E Adjusted EBITDA</p></article><article><span className="mono">Reader PDF · page 18</span><strong className="mono critical-text">$18.4m</strong><p>Prior seller Claim not refreshed</p></article></div><dl className="key-value-list"><div><dt>Rule</dt><dd>Critical finance value parity</dd></div><div><dt>Impact</dt><dd>DEL-004 re-review + circulation blocked</dd></div><div><dt>Source Decision</dt><dd className="mono">HD-018</dd></div></dl></section><aside className="control-sidebar"><h2>Disposition</h2><p>Regenerate the Reader Copy while preserving the prior PDF and Finding history.</p>{resolved ? <div className="inline-success" role="status"><Check aria-hidden="true" size={17} />New Reader Copy generated; Professional Review remains incomplete.</div> : <button className="button button-primary button-full" type="button" onClick={() => setResolved(true)} data-od-id="resolve-qc-finding">Regenerate and record disposition</button>}</aside></div></section>
  );
}

export function ImpactAssessmentScreen() {
  const groups: Array<[string, string[]]> = [
    ['Recalculation required',['ANL-014 EV-to-Equity Bridge','CALC-028 Valuation Range']],
    ['Regeneration required',['DEL-001 Analysis Workbook','DEL-004 CIM Reader Copy']],
    ['Re-review required',['CIM page 18 finance narrative','Package Readiness for Rev 0.4']],
    ['External circulation blocked',['Prior External-Use Decision does not carry forward','All Recipient Access remains unavailable']],
    ['Unaffected',['Buyer universe and NDA records','Auction milestone dates']],
  ];
  return (
    <section className="screen" aria-labelledby="impact-title" data-od-id="impact-assessment-screen"><Link className="back-link" to={`${dealBasePath}/review-readiness`}>← Back to Review & Readiness</Link><header className="page-header"><div><p className="eyebrow">Impact Assessment · IA-014</p><h1 id="impact-title">How a Source / Decision change propagates to exact downstream objects</h1><p>Impact is grouped by action type. “Unaffected” is also recorded explicitly so the entire Deal is not marked with a vague stale state.</p></div><StatusBadge tone="warning">8 objects affected</StatusBadge></header><div className="impact-groups">{groups.map(([title,items],index) => <section key={title} data-od-id={`impact-group-${index + 1}`}><header><h2>{title}</h2><span className="mono">{(items as string[]).length}</span></header><ul>{(items as string[]).map((item) => <li key={item}>{item}</li>)}</ul></section>)}</div><div className="page-actions"><Link className="button button-secondary" to={`${dealBasePath}/analysis/analyses/anl-014`}>Inspect affected Analysis</Link><Link className="button button-primary" to={`${dealBasePath}/review-readiness/package-readiness`}>Inspect exact Package Readiness<ArrowRight aria-hidden="true" size={16} /></Link></div></section>
  );
}

export function PackageReadinessDetailScreen() {
  const rows = [
    ['Analysis workbook','Revision 0.4','Mechanical passed','—','Enter Professional Review'],
    ['Auction control workbook','Revision 0.2','Current','—','Keep current'],
    ['Teaser','Revision 0.2','Reviewed','—','Available at current stage'],
    ['CIM','Revision 0.4','Re-review required','QC-022','Resolve parity Finding'],
    ['Bid memo','Not stage-required','Not applicable','—','No action'],
    ['External use','Revision 0.4','Not authorized','EUD not recorded','Complete Professional Review first'],
  ];
  return (
    <section className="screen" aria-labelledby="readiness-detail-title" data-od-id="package-readiness-detail-screen"><Link className="back-link" to={`${dealBasePath}/review-readiness`}>← Back to Review & Readiness</Link><header className="page-header"><div><p className="eyebrow">Package Readiness · Revision 0.4</p><h1 id="readiness-detail-title">Judge exact scope with a blocker-first matrix</h1><p>Each requirement shows scope, posture, Evidence, blockers, and next action separately—never collapsed into a percentage or a single green Ready state.</p></div><StatusBadge tone="warning">Internally controlled · external use blocked</StatusBadge></header><div className="compact-table-wrap" tabIndex={0} aria-label="Package Readiness matrix"><table className="data-table readiness-table"><thead><tr><th>Requirement</th><th>Exact scope</th><th>Posture</th><th>Blocker</th><th>Next action</th></tr></thead><tbody>{rows.map((row) => <tr key={row[0]}>{row.map((cell,index) => <td key={cell} className={index === 1 ? 'mono' : index === 0 ? 'strong-cell' : ''}>{cell}</td>)}</tr>)}</tbody></table></div><div className="page-actions"><Link className="button button-secondary" to={`${dealBasePath}/review-readiness/qc-findings/qc-022`}>Resolve QC-022</Link><Link className="button button-primary" to={`${dealBasePath}/review-readiness/external-use-decisions/new`}>Prepare External-Use Decision<ArrowRight aria-hidden="true" size={16} /></Link></div></section>
  );
}

export function ExternalUseDecisionScreen({ existing = false }: { existing?: boolean }) {
  const navigate = useNavigate();
  const { state, requestSensitiveAction } = usePrototypeState();
  const recorded = existing || state.externalUseDecisionRecorded;
  const [acknowledged, setAcknowledged] = useState(existing);
  return (
    <section className="screen narrow-control-screen" aria-labelledby="external-title" data-od-id={existing ? 'external-use-decision-detail-screen' : 'external-use-decision-control-screen'}><Link className="back-link" to={`${dealBasePath}/review-readiness`}>← Back to Review & Readiness</Link><header className="page-header"><div><p className="eyebrow">External-Use Decision · {recorded ? 'EUD-018' : 'New'}</p><h1 id="external-title">{recorded ? 'External-use Decision for Revision 0.4' : 'Review the exact external-use scope for Revision 0.4'}</h1><p>Authorization binds an exact Revision, artifact, Recipient, purpose, conditions, and term. A new Revision never inherits it automatically.</p></div><StatusBadge tone={recorded ? 'success' : 'warning'}>{recorded ? 'Recorded · conditional' : 'Awaiting Banker Decision'}</StatusBadge></header><div className="control-review-layout"><section className="control-review-card" data-od-id="external-use-scope"><h2>Proposed authorization scope</h2><dl className="key-value-list"><div><dt>Revision</dt><dd className="mono">0.4</dd></div><div><dt>Artifacts</dt><dd>Teaser 0.2 + CIM 0.4 Reader Copy</dd></div><div><dt>Recipient</dt><dd>Northfield Capital · BUYER-07</dd></div><div><dt>Purpose</dt><dd>Final Round confirmatory diligence</dd></div><div><dt>Expires</dt><dd className="mono">2026-08-18 18:00 ET</dd></div><div><dt>Conditions</dt><dd>No download, no forwarding, secure Viewer only</dd></div></dl><div className="risk-note"><ShieldAlert aria-hidden="true" size={18} /><p>While the CIM retains QC-022, the Decision can only be saved as Draft. Recipient Access can activate after resolution.</p></div></section><aside className="control-sidebar"><h2>Banker confirmation</h2><label className="check-field"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} disabled={recorded} /><span><strong>I confirm conditional authorization for this exact Revision and audience</strong><small>This does not authorize other Buyers, files, purposes, or new Revisions.</small></span></label>{recorded ? <><div className="inline-success"><Check aria-hidden="true" size={17} />EUD-018 saved. Delivery and actual use remain separate downstream events.</div><Link className="button button-primary button-full" to={`${dealBasePath}/review-readiness/recipient-access/new`} data-od-id="create-recipient-access">Create Recipient Access</Link></> : <button className="button button-primary button-full" type="button" disabled={!acknowledged} onClick={() => { requestSensitiveAction({ code: 'external-use-decision', returnPath: `${dealBasePath}/review-readiness/external-use-decisions/new`, safeReturnLabel: 'Return to the exact External-Use Decision', commandDigest: 'sha256:eud-018-rev-0.4', resourceVersion: '0.4', idempotencyKey: 'external-use-eud-018' }); navigate('/account-access/reauthenticate'); }} data-od-id="record-external-use-decision">Record conditional External-Use Decision</button>}</aside></div></section>
  );
}

export function RecipientAccessCreationScreen() {
  const navigate = useNavigate();
  const { state, requestSensitiveAction } = usePrototypeState();
  const created = state.recipientAccessCreated;
  return (
    <section className="screen narrow-control-screen" aria-labelledby="recipient-create-title" data-od-id="recipient-access-creation-screen"><Link className="back-link" to={`${dealBasePath}/review-readiness/external-use-decisions/eud-018`}>← Back to External-Use Decision</Link><header className="page-header"><div><p className="eyebrow">Authorized Delivery · Recipient Access</p><h1 id="recipient-create-title">Create exact, navigation-isolated access for Northfield Capital</h1><p>Delivery implements only the exact Revision authorized by EUD-018. Actual use is recorded separately at first view.</p></div><StatusBadge tone={created ? 'success' : 'warning'}>{created ? 'RA-018 created' : 'Awaiting creation'}</StatusBadge></header><div className="control-review-layout"><section className="control-review-card" data-od-id="recipient-access-settings"><h2>Access settings</h2><div className="setup-form"><label className="field"><span>Recipient email</span><input className="input" type="email" defaultValue="reviewer@northfield.example" /></label><label className="field"><span>Exact authorization</span><input className="input" value="EUD-018 · Revision 0.4" readOnly /></label><label className="field"><span>Viewing restrictions</span><select className="input" defaultValue="viewer"><option value="viewer">Secure Viewer · no download or forwarding</option></select></label><label className="field"><span>Expires</span><input className="input" value="2026-08-18 18:00 ET" readOnly /></label></div></section><aside className="control-sidebar"><h2>Will create</h2><dl className="key-value-list"><div><dt>Authorized Delivery</dt><dd className="mono">DELIVERY-018</dd></div><div><dt>Recipient Access</dt><dd className="mono">RA-018</dd></div><div><dt>Actual use</dt><dd>Not yet occurred</dd></div></dl>{created ? <><div className="inline-success" role="status"><Check aria-hidden="true" size={17} />Access created but not yet viewed.</div><Link className="button button-primary button-full" to="/recipient-access/ra-018">Open Recipient entry</Link></> : <button className="button button-primary button-full" type="button" onClick={() => { requestSensitiveAction({ code: 'recipient-access', returnPath: `${dealBasePath}/review-readiness/recipient-access/new`, safeReturnLabel: 'Return to the exact Recipient Access receipt', commandDigest: 'sha256:ra-018-rev-0.4', resourceVersion: '0.4', idempotencyKey: 'recipient-access-ra-018' }); navigate('/account-access/reauthenticate'); }} data-od-id="confirm-recipient-access"><UserPlus aria-hidden="true" size={16} />Create exact Recipient Access</button>}</aside></div></section>
  );
}

export function ExternalUseEventScreen() {
  const [recorded, setRecorded] = useState(false);
  return (
    <section className="screen narrow-control-screen" aria-labelledby="use-event-title" data-od-id="external-use-event-screen"><Link className="back-link" to={`${dealBasePath}/history-portability`}>← Back to History & Portability</Link><header className="page-header"><div><p className="eyebrow">External-Use Event · New</p><h1 id="use-event-title">Record actual external use separately from authorization and Delivery</h1><p>This synthetic event supports manual reconciliation of who actually used an authorized Revision, when, and how.</p></div><StatusBadge tone={recorded ? 'success' : 'neutral'}>{recorded ? 'Event recorded' : 'Not yet recorded'}</StatusBadge></header><div className="control-review-card"><div className="setup-form"><label className="field"><span>Recipient Access</span><input className="input" value="RA-018 · Northfield Capital" readOnly /></label><label className="field"><span>Event type</span><select className="input" defaultValue="view"><option value="view">First view</option><option value="follow-up">Follow-up material discussion</option></select></label><label className="field"><span>Occurred</span><input className="input" value="2026-08-04 16:20 ET · synthetic" readOnly /></label><label className="field"><span>Notes</span><textarea className="textarea" rows={3} defaultValue="Recipient opened Revision 0.4 in the secure Viewer without downloading or forwarding." /></label></div>{recorded ? <div className="inline-success" role="status"><Check aria-hidden="true" size={17} />USE-018 appended to history; EUD-018 was not modified.</div> : <button className="button button-primary" type="button" onClick={() => setRecorded(true)}>Record Actual External Use</button>}</div></section>
  );
}

export function ArchivePackageScreen() {
  const [created, setCreated] = useState(false);
  return (
    <section className="screen" aria-labelledby="archive-title" data-od-id="archive-package-screen"><Link className="back-link" to={`${dealBasePath}/history-portability`}>← Back to History & Portability</Link><header className="page-header"><div><p className="eyebrow">Archive Package · New</p><h1 id="archive-title">Generate a portable snapshot of Deal authority</h1><p>The Archive Package contains exact objects, versions, relationships, manifests, hashes, and limitations. It excludes provider secrets and non-exportable runtime state.</p></div><StatusBadge tone={created ? 'success' : 'neutral'}>{created ? 'ARC-004 created' : 'Preparing'}</StatusBadge></header><div className="archive-layout"><section className="account-panel" data-od-id="archive-inclusions"><h2>Included</h2><ul className="artifact-list"><li><Check aria-hidden="true" size={15} />Source Records and Source Packet manifests</li><li><Check aria-hidden="true" size={15} />Evidence, Claims, Facts, Decisions, and Lineage</li><li><Check aria-hidden="true" size={15} />Native / Reader Artifacts, Revisions, and QC</li><li><Check aria-hidden="true" size={15} />Process, External-Use, Job, and audit events</li></ul></section><section className="account-panel" data-od-id="archive-exclusions"><h2>Exclusions & limitations</h2><ul className="artifact-list"><li><LockKeyhole aria-hidden="true" size={15} />Provider secrets and production identity credentials</li><li><LockKeyhole aria-hidden="true" size={15} />Unauthorized original third-party content</li><li><LockKeyhole aria-hidden="true" size={15} />Export does not extend any Recipient Access</li></ul></section></div>{created ? <div className="completion-banner"><FileArchive aria-hidden="true" size={21} /><div><h2>Archive Package ARC-004 created</h2><p>sha256:44e1…c29b · 1.8 GB · Project Northstar synthetic record</p></div><a className="button button-secondary" href="data:text/plain;charset=utf-8,ARC-004%20Project%20Northstar%20synthetic%20manifest" download="ARC-004-manifest.txt"><Download aria-hidden="true" size={16} />Download synthetic Manifest</a></div> : <button className="button button-primary" type="button" onClick={() => setCreated(true)} data-od-id="create-archive-package">Create Archive Package</button>}</section>
  );
}

export function LifecycleScreen() {
  const [state, setState] = useState<'active' | 'archived' | 'restored'>('active');
  return (
    <section className="screen narrow-control-screen" aria-labelledby="lifecycle-title" data-od-id="lifecycle-control-screen"><Link className="back-link" to="/app/account/data">← Back to Account Data Controls</Link><header className="page-header"><div><p className="eyebrow">Lifecycle Control · Project Northstar</p><h1 id="lifecycle-title">Archiving changes Active capacity without deleting Deal authority</h1><p>Archive, Restore, Post-Term, and Delete use separate state machines and confirmations. The current action is recoverable.</p></div><StatusBadge tone={state === 'active' ? 'success' : state === 'archived' ? 'warning' : 'success'}>{state === 'active' ? 'Active' : state === 'archived' ? 'Archived' : 'Restored · Active'}</StatusBadge></header><div className="control-review-layout"><section className="control-review-card" data-od-id="lifecycle-consequences"><h2>Archive consequences</h2><dl className="key-value-list"><div><dt>Active capacity</dt><dd className="mono">1 / 2 → 0 / 2</dd></div><div><dt>Workspace</dt><dd>Read-only with audit and Controlled Export retained</dd></div><div><dt>Recipient Access</dt><dd>Continues under its exact expiry or revocation state</dd></div><div><dt>Deletion</dt><dd>Does not occur</dd></div></dl></section><aside className="control-sidebar"><h2>Lifecycle actions</h2>{state === 'active' || state === 'restored' ? <button className="button button-primary button-full" type="button" onClick={() => setState('archived')} data-od-id="archive-deal">Archive Project Northstar</button> : <><div className="inline-success"><Check aria-hidden="true" size={17} />Deal archived; Active capacity released.</div><button className="button button-primary button-full" type="button" onClick={() => setState('restored')}>Restore as Active Deal</button></>}<Link className="button button-danger button-full" to={`${dealBasePath}/controls/delete`}><Trash2 aria-hidden="true" size={16} />Review deletion separately</Link></aside></div></section>
  );
}

export function DeletionScreen({ scope = 'deal' }: { scope?: 'deal' | 'account' }) {
  const navigate = useNavigate();
  const { state, requestSensitiveAction } = usePrototypeState();
  const [phrase, setPhrase] = useState('');
  const isAccount = scope === 'account';
  const requiredPhrase = isAccount ? 'DELETE ACCOUNT' : 'DELETE PROJECT NORTHSTAR';
  const deleted = isAccount ? state.accountDeletionRequested : state.dealDeletionRequested;
  const backPath = isAccount ? '/app/account/data' : `${dealBasePath}/controls/lifecycle`;
  const backLabel = isAccount ? 'Back to Account Data Controls' : 'Back to Lifecycle Control';
  const returnPath = isAccount ? '/app/account/data/delete-account' : `${dealBasePath}/controls/delete`;
  const actionCode = isAccount ? 'account-deletion' : 'deal-deletion';
  const jobId = isAccount ? 'ACCTDEL-004' : 'DELJOB-004';
  return (
    <section className="screen narrow-control-screen" aria-labelledby="delete-title" data-od-id={isAccount ? 'account-deletion-screen' : 'deal-deletion-screen'}>
      <Link className="back-link" to={backPath}>← {backLabel}</Link>
      <header className="page-header"><div><p className="eyebrow">Deletion Control · high risk</p><h1 id="delete-title">{isAccount ? 'Delete customer-visible Account data' : 'Delete customer-visible Deal data for Project Northstar'}</h1><p>Deletion cannot solve capacity, cancellation, or archive issues. Formal policy determines audit and legal-retention boundaries. This prototype demonstrates confirmation and status only.</p></div><StatusBadge tone="critical">Irreversible action</StatusBadge></header>
      {deleted ? (
        <div className="task-error" role="status"><ShieldCheck aria-hidden="true" size={24} /><h2>Synthetic {isAccount ? 'Account ' : ''}deletion Job {jobId} entered the controlled queue</h2><p>The request now has an inspectable status receipt. This prototype deleted no real data.</p><Link className="button button-primary" to={`/deletion-status/${jobId.toLowerCase()}`}>Open deletion status</Link></div>
      ) : (
        <div className="control-review-card danger-panel"><div className="risk-note"><AlertTriangle aria-hidden="true" size={20} /><p>{isAccount ? 'Complete Account and Deal exports first. Account deletion does not silently erase legal-retention records or active deletion Jobs.' : 'Create an Archive Package first. This action does not silently override Recipient Access, legal holds, or account billing records.'}</p></div><label className="field"><span>Enter {requiredPhrase} to confirm</span><input className="input" value={phrase} onChange={(event) => setPhrase(event.target.value)} aria-describedby="delete-hint" /></label><p id="delete-hint" className="field-hint">This is a synthetic demonstration. It will not delete the InvestmentBanking repository or real customer data.</p><button className="button button-danger" type="button" disabled={phrase !== requiredPhrase} onClick={() => { requestSensitiveAction({ code: actionCode, returnPath, safeReturnLabel: isAccount ? 'Return to the Account deletion receipt' : 'Return to the Deal deletion receipt', commandDigest: isAccount ? 'sha256:account-delete-004' : 'sha256:deljob-004-project-northstar', resourceVersion: isAccount ? 'account-v4' : state.currentRevision, idempotencyKey: isAccount ? 'deletion-account-004' : 'deletion-deljob-004' }); navigate('/account-access/reauthenticate'); }} data-od-id={isAccount ? 'confirm-account-deletion' : 'confirm-deal-deletion'}><Trash2 aria-hidden="true" size={16} />{isAccount ? 'Schedule Account deletion' : 'Schedule controlled deletion'}</button></div>
      )}
    </section>
  );
}

export function DeletionStatusScreen({ scope }: { scope: 'deal' | 'account' }) {
  const isAccount = scope === 'account';
  const jobId = isAccount ? 'ACCTDEL-004' : 'DELJOB-004';
  return (
    <main className="access-page" data-od-id={`${scope}-deletion-status`}>
      <section className="access-panel" aria-labelledby="deletion-status-title" data-od-id={`${scope}-deletion-status-panel`}>
        <p className="eyebrow">Deletion Status · {jobId}</p>
        <h1 id="deletion-status-title">Deletion request accepted and awaiting policy checks</h1>
        <p>No protected Account or Deal payload is shown here. The job will pause for legal hold, retention, active Recipient Access, or dependent Job conflicts.</p>
        <div className="access-state-list" aria-label="Deletion job status"><div><Clock3 aria-hidden="true" size={18} /><span><strong>Queued</strong><small>Identity reauthenticated · single-use Grant consumed</small></span></div><div><ShieldAlert aria-hidden="true" size={18} /><span><strong>Policy checks pending</strong><small>Retention, legal hold, dependent records, and recovery eligibility</small></span></div></div>
        <Link className="button button-primary button-full access-primary" to={isAccount ? '/app/account/data' : '/app/deals'} data-od-id={`${scope}-deletion-status-return`}>{isAccount ? 'Return to Account Data Controls' : 'Return to Deals'}</Link>
      </section>
    </main>
  );
}
