import { AlertTriangle, ArrowRight, Check, Clock3, Download, FileText, LockKeyhole, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from '../router';
import { StatusBadge } from '../components/StatusBadge';
import { dealBasePath } from '../data/demoData';
import { usePrototypeState } from '../hooks/usePrototypeState';

const deals = [
  { id: 'project-northstar', name: 'Project Northstar', sector: 'Industrial services', stage: 'Preparation', revision: '0.4', state: 'Review required', updated: '2026-08-04 15:21' },
  { id: 'project-harbor', name: 'Project Harbor', sector: 'Vertical software', stage: 'Archived', revision: '1.2', state: 'Archived', updated: '2026-07-18 09:40' },
];

export function DealsScreen() {
  const [query, setQuery] = useState('');
  const matches = useMemo(() => deals.filter((deal) => `${deal.name} ${deal.sector} ${deal.stage}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return (
    <section className="account-screen" aria-labelledby="deals-title" data-od-id="banker-deals-screen">
      <header className="account-page-header">
        <div><p className="eyebrow">Banker Account · Synthetic demo</p><h1 id="deals-title">Deals</h1><p>The Account layer manages Deal entry points, capacity, and lifecycle only. Business records remain in their respective Deal Workspaces.</p></div>
        <Link className="button button-primary" to="/app/deals/new" data-od-id="create-deal"><Plus aria-hidden="true" size={16} />Create Deal</Link>
      </header>
      <div className="account-toolbar"><label className="search-control"><span className="sr-only">Search Deals</span><Search aria-hidden="true" size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Deal, industry, or stage" /></label><StatusBadge tone="neutral">Active capacity · 1 / 2</StatusBadge></div>
      {matches.length ? <div className="deal-list" data-od-id="deal-list">
        {matches.map((deal) => <article className="deal-row" key={deal.id} data-od-id={`deal-row-${deal.id}`}>
          <div className="deal-row-main"><span className="deal-monogram" aria-hidden="true">{deal.name.split(' ').slice(-1)[0]?.slice(0, 1)}</span><div><h2>{deal.name}</h2><p>{deal.sector} · {deal.stage}</p></div></div>
          <dl className="deal-row-meta"><div><dt>Revision</dt><dd className="mono">{deal.revision}</dd></div><div><dt>Status</dt><dd>{deal.state}</dd></div><div><dt>Last updated</dt><dd className="mono">{deal.updated}</dd></div></dl>
          {deal.id === 'project-northstar' ? <Link className="button button-secondary" to={`${dealBasePath}/overview`} data-od-id="open-project-northstar">Open Workspace<ArrowRight aria-hidden="true" size={15} /></Link> : <Link className="button button-secondary" to="/app/account/data">View archive</Link>}
        </article>)}
      </div> : <div className="account-empty" role="status" data-od-id="deals-empty-state"><Search aria-hidden="true" size={24} /><h2>No matching Deals</h2><p>Adjust the search or clear it to view all synthetic records.</p><button className="button button-secondary" type="button" onClick={() => setQuery('')}>Clear search</button></div>}
    </section>
  );
}

export function UsagePlanScreen({ cancellation = false }: { cancellation?: boolean }) {
  const [cancelled, setCancelled] = useState(false);
  if (cancellation) return (
    <section className="account-screen narrow-account-screen" aria-labelledby="cancel-title" data-od-id="cancellation-review-screen">
      <Link className="back-link" to="/app/account/usage-plan">← Return to Usage & plan</Link>
      <div className="control-review-card"><p className="eyebrow">Control Review · Subscription</p><h1 id="cancel-title">Review cancellation and Post-Term Access</h1><p>Cancellation affects the next renewal only. It does not delete a Deal or change recorded authorization and audit history.</p>
        <dl className="key-value-list"><div><dt>Current term</dt><dd>Monthly · $995</dd></div><div><dt>Renewal date</dt><dd>2026-09-04 · Synthetic date</dd></div><div><dt>Post-Term Access</dt><dd>30 days of read-only access and controlled export</dd></div><div><dt>Active Recipient Access</dt><dd>Handled separately under the exact authorization record</dd></div></dl>
        <div className="risk-note"><AlertTriangle aria-hidden="true" size={18} /><p>Cancellation is not deletion. Deletion still requires a separate high-risk confirmation under Data, Exports & Deletion.</p></div>
        {cancelled ? <div className="inline-success" role="status"><Check aria-hidden="true" size={17} /><span>Automatic renewal is off. The current term remains available.</span></div> : <button className="button button-danger" type="button" onClick={() => setCancelled(true)} data-od-id="confirm-plan-cancellation">Confirm automatic-renewal cancellation</button>}
      </div>
    </section>
  );
  return (
    <section className="account-screen" aria-labelledby="usage-title" data-od-id="usage-plan-screen">
      <header className="account-page-header"><div><p className="eyebrow">Entitlement & capacity</p><h1 id="usage-title">Usage & plan</h1><p>Capacity is measured in business outcomes and Active Deals, not Prompts, Tokens, citations, or review counts.</p></div><Link className="button button-secondary" to="/app/account/usage-plan/cancellation">Review cancellation</Link></header>
      <div className="usage-ledger"><article><span>Current plan</span><strong>Monthly</strong><small className="mono">$995 / month</small></article><article><span>Active Deals</span><strong className="mono">1 / 2</strong><small>Project Northstar uses 1 capacity slot</small></article><article><span>Processing allowance</span><strong>Normal</strong><small>Subject to the current Capability Manifest</small></article></div>
      <div className="account-two-column"><section className="account-panel" data-od-id="plan-inclusions"><h2>Included this term</h2><ul className="plain-list"><li>Nine Deal work areas and canonical object records</li><li>Human Decisions, Revisions, QC, and Impact Assessments</li><li>Internal Controlled Exports and 30-day Post-Term Access</li></ul></section><section className="account-panel" data-od-id="plan-boundaries"><h2>Product boundaries</h2><ul className="plain-list"><li>Additional Active Deals and intensive processing capacity are purchased separately</li><li>No retrospective overage</li><li>Purchase does not establish Source rights or external-use authorization</li></ul></section></div>
    </section>
  );
}

const utilityConfig = {
  billing: { eyebrow: 'Billing & invoices', title: 'Billing & Invoices', intro: 'Payment, Invoice, and Receipt records reflect commercial Account state only. They do not change Deal control state.', icon: FileText },
  notifications: { eyebrow: 'Attention settings', title: 'Notifications', intro: 'Send notifications only for Decisions, Sources, Jobs, Revisions, and authorization events that require explicit action.', icon: Clock3 },
  security: { eyebrow: 'Account & security', title: 'Account & Security', intro: 'Inspect sign-in methods, active sessions, and recovery boundaries. This prototype does not simulate production authentication.', icon: ShieldCheck },
  data: { eyebrow: 'Data controls', title: 'Data, Export & Deletion', intro: 'Account export, Deal archive, Post-Term Access, and deletion are separate controls and cannot be merged.', icon: Download },
  help: { eyebrow: 'In-product help', title: 'Help & Support', intro: 'Help explains product mechanisms and recovery paths only. It does not provide substantive investment-banking advice.', icon: LockKeyhole },
} as const;

export function AccountUtilityScreen({ kind }: { kind: keyof typeof utilityConfig }) {
  const navigate = useNavigate();
  const { state, requestSensitiveAction } = usePrototypeState();
  const content = utilityConfig[kind];
  const Icon = content.icon;
  const [saved, setSaved] = useState(false);
  return (
    <section className="account-screen" aria-labelledby={`account-${kind}-title`} data-od-id={`account-${kind}-screen`}>
      <header className="account-page-header"><div><p className="eyebrow">{content.eyebrow}</p><h1 id={`account-${kind}-title`}>{content.title}</h1><p>{content.intro}</p></div><Icon aria-hidden="true" className="account-heading-icon" size={24} /></header>
      {kind === 'billing' ? <div className="account-panel"><h2>Invoices & Receipts</h2><div className="compact-table-wrap" tabIndex={0} aria-label="Billing records"><table className="data-table compact-table"><thead><tr><th>Record</th><th>Term</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody><tr><td className="mono">INV-SYN-0042</td><td>2026-08-04 — 2026-09-03</td><td className="mono">$995</td><td><StatusBadge tone="success">Paid</StatusBadge></td><td><button className="table-action" type="button" onClick={() => setSaved(true)}>Download synthetic PDF</button></td></tr></tbody></table></div>{saved ? <p className="inline-status" role="status">Synthetic Invoice prepared. Production download is not connected.</p> : null}</div> : null}
      {kind === 'notifications' ? <form className="account-panel settings-form" onSubmit={(event) => { event.preventDefault(); setSaved(true); }}><h2>Notification rules</h2>{['Human Decision required', 'New Source or material change', 'Job failed or requires recovery', 'Revision entered re-review', 'External-Use Decision nearing expiry'].map((label, index) => <label className="switch-row" key={label}><span><strong>{label}</strong><small>{index < 2 ? 'Immediate email and in-account notification' : 'In-account notification'}</small></span><input type="checkbox" defaultChecked={index !== 4} /></label>)}<button className="button button-primary" type="submit">Save notification settings</button>{saved ? <p className="inline-status" role="status">Notification settings saved.</p> : null}</form> : null}
      {kind === 'security' ? <div className="account-two-column"><section className="account-panel" data-od-id="security-access"><h2>Sign-in & recovery</h2><dl className="key-value-list"><div><dt>Account email</dt><dd>w.banker@example.com</dd></div><div><dt>Sign-in method</dt><dd>Passkey · required</dd></div><div><dt>Magic Link</dt><dd>Recovery only</dd></div><div><dt>Password / TOTP</dt><dd>Not offered in V1</dd></div></dl><Link className="button button-secondary" to="/account-access/recovery">Open restricted recovery</Link></section><section className="account-panel" data-od-id="security-sessions"><h2>Active session</h2><div className="session-row"><div><strong>Current browser</strong><small>Shanghai · synthetic · 12-hour inactivity · 7-day absolute lifetime</small></div><StatusBadge tone="success">Current</StatusBadge></div><p className="field-hint">V1 permits one active Banker Session per user. A new sign-in invalidates the prior session.</p></section></div> : null}
      {kind === 'data' ? <div className="account-two-column"><section className="account-panel" data-od-id="account-data-export"><h2>Account-level data export</h2><p>Generate an index of the Account, Entitlement, Invoices, and Deals. Deal content still moves through an exact Archive Package.</p><button className="button button-secondary" type="button" onClick={() => { requestSensitiveAction({ code: 'account-data-export', returnPath: '/app/account/data', safeReturnLabel: 'Return to the Account export request', commandDigest: 'sha256:account-index-004', resourceVersion: 'account-v4', idempotencyKey: 'account-index-004' }); navigate('/account-access/reauthenticate'); }} data-od-id="prepare-account-index"><Download aria-hidden="true" size={16} />Prepare Account index</button>{state.accountDataExportRequested ? <p className="inline-status" role="status">The Account index entered the synthetic preparation queue.</p> : null}</section><section className="account-panel danger-panel" data-od-id="account-data-lifecycle"><h2>Archive & deletion</h2><p>Handle Deal lifecycle first, then review Account deletion. Deletion does not replace an Archive Package or Post-Term Access.</p><div className="button-row"><Link className="button button-secondary" to={`${dealBasePath}/controls/lifecycle`}>Open Deal lifecycle</Link><Link className="button button-danger" to={`${dealBasePath}/controls/delete`}><Trash2 aria-hidden="true" size={16} />Review Deal deletion</Link><Link className="button button-danger" to="/app/account/data/delete-account">Review Account deletion</Link></div></section></div> : null}
      {kind === 'help' ? <div className="account-two-column"><section className="account-panel" data-od-id="help-mechanisms"><h2>Product mechanisms</h2><ul className="resource-list"><li><Link to="/how-it-works/evidence-and-decisions">How Evidence and Decisions stay separate<ArrowRight aria-hidden="true" size={14} /></Link></li><li><Link to="/how-it-works/revisions-and-impact">How Revisions propagate through Impact<ArrowRight aria-hidden="true" size={14} /></Link></li><li><Link to="/security-data/retention-export-deletion">Export, retention, and deletion boundaries<ArrowRight aria-hidden="true" size={14} /></Link></li></ul></section><section className="account-panel" data-od-id="help-recovery"><h2>Recovery paths</h2><ul className="plain-list"><li>Account access: use the secure recovery entry point</li><li>Blocked Deal: open the exact task from Action Center</li><li>Failed Job: perform the smallest recovery action from Job detail</li></ul><Link className="button button-secondary" to={`${dealBasePath}/actions`}>Open Action Center</Link></section></div> : null}
    </section>
  );
}
