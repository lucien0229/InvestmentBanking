import { ArrowRight, CalendarClock, Filter, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from '../router';
import { PageHeader } from '../components/PageHeader';
import { SearchEmptyState } from '../components/SearchEmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { TableFrame } from '../components/TableFrame';
import { dealBasePath, syntheticBuyerRows } from '../data/demoData';
import { useInspector } from '../hooks/useInspector';

export function AuctionScreen() {
  const { openInspector } = useInspector();
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase('en-US');
  const filteredBuyers = normalizedQuery
    ? syntheticBuyerRows.filter((row) => [row.buyer, row.type, row.status, row.nda, row.access]
      .some((value) => value.toLocaleLowerCase('en-US').includes(normalizedQuery)))
    : syntheticBuyerRows;
  return (
    <div className="screen" data-od-id="auction-screen">
      <PageHeader eyebrow="Stage-aware · Preparation" title="Auction Process" description="Manage Buyer, Outreach Wave, NDA, Data-Room Access, Diligence, Bid, and Milestone object families in stable locations. Stage changes priority, not object location." dataOdId="auction-heading" actions={<div className="button-row"><Link className="button button-secondary" to={`${dealBasePath}/auction-process/stage-transition`}>Transition stage</Link><Link className="button button-primary" to={`${dealBasePath}/auction-process/bids/compare`}>Compare Bids<ArrowRight aria-hidden="true" size={15} /></Link></div>} />

      <section className="process-stage" aria-labelledby="process-stage-title" data-od-id="current-process-stage">
        <div><p className="eyebrow">Current Deal Business Stage</p><h2 id="process-stage-title">Preparation</h2><p>The Deal is established and Paid Preflight has passed. Current priorities are material control, Buyer Universe, and first-round outreach preparation.</p></div>
        <div className="stage-timeline" aria-label="Deal Business Stage timeline">
          {['Initiated', 'Preparation', 'In Market', 'Bid Evaluation', 'Exclusive Execution', 'Signed', 'Closed'].map((stage, index) => <span key={stage} className={stage === 'Preparation' ? 'current' : index === 0 ? 'complete' : ''}>{stage}</span>)}
        </div>
      </section>

      <TableFrame
        label="Buyers and outreach"
        dataOdId="buyer-process-table"
        toolbar={<><label className="search-field"><Search aria-hidden="true" size={16} /><span className="sr-only">Search Buyers</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Buyer or status" aria-controls="buyer-process-grid" /></label><button className="button button-secondary button-compact" type="button" onClick={() => openInspector({ eyebrow: 'Stage-aware view', title: 'Default priorities in Preparation', description: 'The view prioritizes Buyer approval, NDA, and first-round outreach preparation. Canonical object locations do not move when the stage changes.', metadata: [{ label: 'Stage', value: 'Preparation' }, { label: 'Default filter', value: 'Current process objects' }] })}><Filter aria-hidden="true" size={15} />Current-stage view</button></>}
      >
        <table className="data-table" id="buyer-process-grid">
          <thead><tr><th>Buyer (synthetic)</th><th>Type</th><th>Process status</th><th>NDA</th><th>Data-Room Access</th><th>Updated</th><th>Open</th></tr></thead>
          <tbody>{filteredBuyers.map((row) => <tr key={row.buyer}><td className="strong-cell">{row.buyer}</td><td>{row.type}</td><td><StatusBadge tone={row.status.includes('Approved') ? 'success' : 'neutral'}>{row.status}</StatusBadge></td><td>{row.nda}</td><td>{row.access}</td><td className="mono">{row.updated}</td><td>{row.buyer === 'Northfield Capital' ? <Link className="table-action" to={`${dealBasePath}/auction-process/buyers/buyer-07`}>Open</Link> : <button className="table-action button-reset" type="button" onClick={() => openInspector({ eyebrow: 'Buyer · Synthetic', title: row.buyer, description: 'Buyer, NDA, Access, and Process Events remain separate objects.', metadata: [{ label: 'Status', value: row.status }, { label: 'NDA', value: row.nda }, { label: 'Access', value: row.access }] })}>Preview</button>}</td></tr>)}</tbody>
        </table>
        {query && filteredBuyers.length === 0 ? <SearchEmptyState query={query} onClear={() => setQuery('')} dataOdId="buyer-search-empty-state" /> : null}
      </TableFrame>

      <section className="milestone-list" aria-labelledby="milestone-title" data-od-id="stage-milestones">
        <div className="section-heading-row"><div><p className="eyebrow">Milestones</p><h2 id="milestone-title">Preparation milestones</h2></div><StatusBadge tone="warning">2 affected by material control</StatusBadge></div>
        <div className="milestone-rows">
          <div><CalendarClock aria-hidden="true" size={17} /><span><strong>Buyer Universe established</strong><small>Each Approved Buyer still requires a separate Human Decision.</small></span><StatusBadge tone="success">Recorded</StatusBadge></div>
          <div><CalendarClock aria-hidden="true" size={17} /><span><strong>Internal CIM review</strong><small>Waiting for targeted review and QC of Rev 0.4.</small></span><StatusBadge tone="warning">Re-review required</StatusBadge></div>
          <div><CalendarClock aria-hidden="true" size={17} /><span><strong>First-round outreach</strong><small>Not yet due and never triggered automatically by Package content.</small></span><StatusBadge tone="neutral">Not started</StatusBadge></div>
        </div>
      </section>
    </div>
  );
}
