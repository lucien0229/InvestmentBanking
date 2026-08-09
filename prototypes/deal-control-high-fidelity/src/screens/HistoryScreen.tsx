import { ExternalLink, RotateCcw, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from '../router';
import { PageHeader } from '../components/PageHeader';
import { SearchEmptyState } from '../components/SearchEmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { TableFrame } from '../components/TableFrame';
import { dealBasePath } from '../data/demoData';
import { usePrototypeState } from '../hooks/usePrototypeState';

export function HistoryScreen() {
  const { state, resetDemo } = usePrototypeState();
  const [activeView, setActiveView] = useState('Business & Process');
  const [query, setQuery] = useState('');
  const views = [
    { id: 'business', label: 'Business & Process' },
    { id: 'revision', label: 'Objects & Revisions' },
    { id: 'decision', label: 'Decisions & External Use' },
    { id: 'audit', label: 'Audit / Export' },
  ];
  const events = [
    { view: 'Business & Process', time: '2026-08-03 14:11', actor: 'Product', origin: 'System', object: 'Source Record SR-001 v3', event: 'accepted', result: 'current', tone: 'info' as const, href: `${dealBasePath}/sources` },
    { view: 'Business & Process', time: '2026-08-03 14:16', actor: 'Product', origin: 'System', object: 'Source Record SR-002 v7', event: 'accepted', result: 'current', tone: 'info' as const, href: `${dealBasePath}/sources` },
    ...(state.decisionRecorded ? [{ view: 'Decisions & External Use', time: '2026-08-04 15:12', actor: 'W. Banker', origin: 'Human', object: 'Decision DEC-014', event: 'recorded', result: 'immutable', tone: 'success' as const, href: `${dealBasePath}/evidence-decisions/control-review` }] : []),
    ...(state.validationPassed ? [
      { view: 'Objects & Revisions', time: '2026-08-04 15:16', actor: 'Product', origin: 'Deterministic', object: 'Validation VAL-009', event: 'completed', result: 'scoped pass', tone: 'success' as const, href: `${dealBasePath}/analysis` },
      { view: 'Objects & Revisions', time: '2026-08-04 15:17', actor: 'Product', origin: 'System', object: 'Revision 0.4', event: 'created', result: 'current', tone: 'info' as const, href: `${dealBasePath}/execution-package` },
    ] : []),
    ...(state.exportCreated ? [{ view: 'Audit / Export', time: '2026-08-04 15:21', actor: 'W. Banker', origin: 'Human', object: 'Export EXP-021', event: 'created', result: 'internal only', tone: 'warning' as const, href: `${dealBasePath}/history-portability/internal-export` }] : []),
  ];
  const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');
  const activeEvents = events.filter((event) => event.view === activeView);
  const displayedEvents = normalizedQuery
    ? activeEvents.filter((event) => [event.time, event.actor, event.origin, event.object, event.event, event.result]
      .some((value) => value.toLocaleLowerCase('zh-CN').includes(normalizedQuery)))
    : activeEvents;

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? views.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + views.length) % views.length;
    setActiveView(views[nextIndex].label);
    setQuery('');
    document.getElementById(`history-tab-${views[nextIndex].id}`)?.focus();
  }

  return (
    <div className="screen" data-od-id="history-screen">
      <PageHeader
        eyebrow="Append-only material history"
        title="History & Portability"
        description="Inspect Business and Process Events, objects and Revisions, Human Decisions, external use, and internal exports over time. History cannot be edited to change current domain state."
        dataOdId="history-heading"
        actions={<button className="button button-secondary" type="button" onClick={resetDemo} data-od-id="reset-demo-state"><RotateCcw aria-hidden="true" size={16} />Reset demo state</button>}
      />

      {state.exportCreated ? (
        <section className="receipt-banner" aria-labelledby="history-export-receipt-title" data-od-id="history-export-receipt">
          <div className="receipt-icon">EXP</div><div><p className="eyebrow">Latest portability record</p><h2 id="history-export-receipt-title">Internal Controlled Export EXP-021</h2><p>Revision 0.4 · AM-021 · Includes current limitations · Does not authorize external circulation.</p></div><Link className="button button-secondary" to={`${dealBasePath}/history-portability/internal-export`}>Open receipt</Link>
        </section>
      ) : null}

      <div className="tab-bar history-tabs" role="tablist" aria-label="History views" data-od-id="history-tabs">
        {views.map((view, index) => <button key={view.id} id={`history-tab-${view.id}`} type="button" className={activeView === view.label ? 'active' : ''} role="tab" aria-selected={activeView === view.label} aria-controls="history-panel" tabIndex={activeView === view.label ? 0 : -1} onClick={() => { setActiveView(view.label); setQuery(''); }} onKeyDown={(event) => handleTabKeyDown(event, index)} data-od-id={`history-tab-${view.id}`}>{view.label}</button>)}
      </div>

      <div id="history-panel" role="tabpanel" aria-labelledby={`history-tab-${views.find((view) => view.label === activeView)?.id}`}>
        <TableFrame label="Append-only history" dataOdId="history-table" toolbar={<label className="search-field"><Search aria-hidden="true" size={16} /><span className="sr-only">Search history</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search object, event, or Actor" aria-controls="history-grid" /></label>}>
          <table className="data-table history-table" id="history-grid"><thead><tr><th>Time</th><th>Actor</th><th>Origin</th><th>Exact object / version</th><th>Event</th><th>Result</th><th>Open</th></tr></thead><tbody>{displayedEvents.map((event) => <tr key={`${event.time}-${event.object}`}><td className="mono">{event.time}</td><td>{event.actor}</td><td>{event.origin}</td><td className="mono strong-cell">{event.object}</td><td>{event.event}</td><td><StatusBadge tone={event.tone}>{event.result}</StatusBadge></td><td><Link className="table-action" to={event.href}>Open<ExternalLink aria-hidden="true" size={14} /></Link></td></tr>)}</tbody></table>
          {query && displayedEvents.length === 0 ? <SearchEmptyState query={query} onClear={() => setQuery('')} dataOdId="history-search-empty-state" /> : activeEvents.length === 0 ? <div className="empty-state" role="status"><h2>No records in this history view</h2><p>The current prototype state has not generated an immutable record of this type. It will appear after the corresponding control step is completed.</p></div> : null}
        </TableFrame>
      </div>

      <section className="history-boundaries" aria-labelledby="history-boundaries-title" data-od-id="history-boundaries">
        <div><p className="eyebrow">Authority ledger</p><h2 id="history-boundaries-title">Revision, authorization, and actual use remain separate</h2></div>
        <dl className="boundary-ledger"><div><dt>Current Revision</dt><dd className="mono">{state.currentRevision}</dd></div><div><dt>External-Use Decision</dt><dd><StatusBadge tone="critical">Not recorded</StatusBadge></dd></div><div><dt>Authorized Delivery</dt><dd><StatusBadge tone="neutral">None</StatusBadge></dd></div><div><dt>External-Use Event</dt><dd><StatusBadge tone="neutral">None</StatusBadge></dd></div><div><dt>Internal Controlled Export</dt><dd><StatusBadge tone={state.exportCreated ? 'success' : 'neutral'}>{state.exportCreated ? 'EXP-021 created' : 'Not created'}</StatusBadge></dd></div></dl>
      </section>
      <section className="history-tools" aria-labelledby="history-tools-title" data-od-id="history-portability-tools"><div><p className="eyebrow">Portability controls</p><h2 id="history-tools-title">Archive, Reimport, and Actual Use follow separate flows</h2></div><div className="button-row"><Link className="button button-secondary" to={`${dealBasePath}/history-portability/reimports/ri-004`}>Inspect Reimport</Link><Link className="button button-secondary" to={`${dealBasePath}/history-portability/external-use-events/new`}>Record Actual Use</Link><Link className="button button-primary" to={`${dealBasePath}/history-portability/archive-packages/new`}>Create Archive Package</Link></div></section>
    </div>
  );
}
