import { ExternalLink, Filter, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from '../router';
import { PageHeader } from '../components/PageHeader';
import { SearchEmptyState } from '../components/SearchEmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { TableFrame } from '../components/TableFrame';
import { dealBasePath } from '../data/demoData';
import { useInspector } from '../hooks/useInspector';
import { usePrototypeState } from '../hooks/usePrototypeState';

const tabs = [
  { id: 'decision', label: 'Decisions required' },
  { id: 'source', label: 'Sources required' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'events', label: 'New events' },
] as const;
type ActionTab = (typeof tabs)[number]['label'];

export function ActionsScreen() {
  const [activeTab, setActiveTab] = useState<ActionTab>('Decisions required');
  const [query, setQuery] = useState('');
  const { state } = usePrototypeState();
  const { openInspector } = useInspector();

  const rows = activeTab === 'Decisions required'
    ? state.decisionRecorded
      ? []
      : [{ priority: 'High', object: 'CLM-018 v2', reason: 'EBITDA basis conflict', scope: 'Rev 0.3 valuation purpose', action: 'Review conflict', href: `${dealBasePath}/evidence-decisions`, tone: 'warning' as const }]
    : activeTab === 'Sources required'
      ? [{ priority: 'Medium', object: 'SP-004 v2', reason: 'Updated Forecast Source missing', scope: 'Forecast reconciliation', action: 'Inspect Source Packet', href: `${dealBasePath}/sources`, tone: 'neutral' as const }]
      : activeTab === 'Blocked'
        ? [{ priority: 'High', object: `CIM Rev ${state.currentRevision}`, reason: state.validationPassed ? 'Re-review required' : 'Cash basis unresolved', scope: 'Reader Copy and future circulation', action: 'Inspect blocker', href: `${dealBasePath}/review-readiness`, tone: 'critical' as const }]
        : activeTab === 'Jobs'
          ? [{ priority: 'Medium', object: 'JOB-0098', reason: state.validationPassed ? 'Artifact-generation checkpoint available' : 'Reader Copy renderer recoverable', scope: 'DEL-004 · Revision 0.4', action: 'Open Job', href: `${dealBasePath}/actions/jobs/job-0098`, tone: state.validationPassed ? 'success' as const : 'warning' as const }]
          : [{ priority: 'Low', object: 'EVT-042', reason: 'Source SR-002 parsing completed', scope: 'Exact Source Record', action: 'Open Source', href: `${dealBasePath}/sources`, tone: 'info' as const }];
  const normalizedQuery = query.trim().toLocaleLowerCase('en-US');
  const filteredRows = normalizedQuery
    ? rows.filter((row) => [row.object, row.reason, row.scope, row.priority].some((value) => value.toLocaleLowerCase('en-US').includes(normalizedQuery)))
    : rows;

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    setActiveTab(tabs[nextIndex].label);
    setQuery('');
    document.getElementById(`action-tab-${tabs[nextIndex].id}`)?.focus();
  }

  return (
    <div className="screen" data-od-id="actions-screen">
      <PageHeader
        eyebrow="Deal-scoped attention"
        title="Action Center"
        description="Index exact objects that require attention by semantic queue. Work is still completed on the canonical screen or in Control Review."
        dataOdId="actions-heading"
      />

      <div className="tab-bar" role="tablist" aria-label="Action queues" data-od-id="action-queue-tabs">
        {tabs.map((tab, index) => {
          const count = tab.label === 'Decisions required' ? (state.decisionRecorded ? 0 : 1) : 1;
          return (
            <button
              key={tab.id}
              id={`action-tab-${tab.id}`}
              type="button"
              className={activeTab === tab.label ? 'active' : ''}
              role="tab"
              aria-selected={activeTab === tab.label}
              aria-controls="action-queue-panel"
              tabIndex={activeTab === tab.label ? 0 : -1}
              onClick={() => { setActiveTab(tab.label); setQuery(''); }}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              data-od-id={`action-tab-${tab.id}`}
            >
              {tab.label}<span className="tab-count mono">{count}</span>
            </button>
          );
        })}
      </div>

      <div id="action-queue-panel" role="tabpanel" aria-labelledby={`action-tab-${tabs.find((tab) => tab.label === activeTab)?.id}`}>
        <TableFrame
          label={`${activeTab} queue`}
          dataOdId="action-center-table"
          toolbar={
            <>
              <label className="search-field">
                <Search aria-hidden="true" size={16} />
                <span className="sr-only">Search current queue</span>
                <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search exact object or reason" aria-controls="action-queue-table" />
              </label>
              <button className="button button-secondary button-compact" type="button" onClick={() => openInspector({
                eyebrow: 'Queue rules',
                title: `How ${activeTab.toLowerCase()} are ordered`,
                description: 'Default order considers materiality, due or expiry time, blocked dependency scope, and time entered. A queue is not a second copy of the business object.',
                metadata: [{ label: 'Current queue', value: activeTab }, { label: 'Results', value: String(filteredRows.length) }],
              })}>
                <Filter aria-hidden="true" size={15} />Filter guidance
              </button>
            </>
          }
        >
        <table className="data-table" id="action-queue-table">
          <thead><tr><th>Priority</th><th>Exact object / version</th><th>Reason</th><th>Affected scope</th><th>Next action</th></tr></thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.object}>
                <td><StatusBadge tone={row.tone}>{row.priority}</StatusBadge></td>
                <td className="mono strong-cell">{row.object}</td>
                <td>{row.reason}</td>
                <td>{row.scope}</td>
                <td><Link className="table-action" to={row.href}>{row.action}<ExternalLink aria-hidden="true" size={14} /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {query && filteredRows.length === 0 ? (
          <SearchEmptyState query={query} onClear={() => setQuery('')} dataOdId="action-search-empty-state" />
        ) : rows.length === 0 ? (
          <div className="empty-state" role="status">
            <h2>No controlled actions in this queue</h2>
            <p>This queue has no unresolved tasks. Deal Business Stage, Package Readiness, and external-use status remain unchanged.</p>
            <Link className="button button-secondary" to={`${dealBasePath}/overview`}>Return to Overview</Link>
          </div>
        ) : null}
        </TableFrame>
      </div>
    </div>
  );
}
