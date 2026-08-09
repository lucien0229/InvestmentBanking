import { ExternalLink, FileSearch, Filter, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from '../router';
import { PageHeader } from '../components/PageHeader';
import { SearchEmptyState } from '../components/SearchEmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { TableFrame } from '../components/TableFrame';
import { dealBasePath, sourceRecords } from '../data/demoData';
import { useInspector } from '../hooks/useInspector';

export function SourcesScreen() {
  const { openInspector } = useInspector();
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase('en-US');
  const filteredSources = normalizedQuery
    ? sourceRecords.filter((source) => [source.id, source.fileName, source.locator, source.kind, source.version, source.reliance]
      .some((value) => value.toLocaleLowerCase('en-US').includes(normalizedQuery)))
    : sourceRecords;

  return (
    <div className="screen" data-od-id="sources-screen">
      <PageHeader
        eyebrow="Source Records · current only"
        title="Sources"
        description="Inspect rights, confidentiality, compatibility, Native Locators, and parsing coverage on immutable Source Records. Another file version is never substituted silently."
        dataOdId="sources-heading"
        actions={<div className="button-row"><Link className="button button-secondary" to={`${dealBasePath}/source-packets/sp-004`} data-od-id="open-source-packet">Inspect Source Packet</Link><Link className="button button-primary" to={`${dealBasePath}/sources/add`} data-od-id="add-source"><Plus aria-hidden="true" size={15} />Add Source</Link></div>}
      />

      <section className="source-summary-strip" aria-labelledby="source-summary-title" data-od-id="source-summary">
        <div><p className="eyebrow">Current packet</p><h2 id="source-summary-title">SP-004 v2</h2></div>
        <dl className="inline-metrics">
          <div><dt>Source Records</dt><dd className="mono">4</dd></div>
          <div><dt>Conflicted</dt><dd className="mono warning-text">2</dd></div>
          <div><dt>Parsing coverage</dt><dd>Inspectable at file level</dd></div>
          <div><dt>Output Ceiling</dt><dd>Internal analysis</dd></div>
        </dl>
      </section>

      <TableFrame
        label="Source Records"
        dataOdId="source-records-table"
        toolbar={
          <>
            <label className="search-field"><Search aria-hidden="true" size={16} /><span className="sr-only">Search Source Records</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ID, file name, or Native Locator" aria-controls="source-records-grid" /></label>
            <button className="button button-secondary button-compact" type="button" onClick={() => openInspector({
              eyebrow: 'Filter',
              title: 'Current and historical records',
              description: 'Only current Source Records are shown by default. Historical, Superseded, Withdrawn, Stale, and Conflicted records require explicit selection and retain their own states.',
              metadata: [{ label: 'Current view', value: 'Current only' }, { label: 'Order', value: 'Last updated' }],
            })}><Filter aria-hidden="true" size={15} />Current records</button>
          </>
        }
      >
        <table className="data-table source-table" id="source-records-grid">
          <thead><tr><th>ID</th><th>Source Record</th><th>Native Locator</th><th>Reliance posture</th><th>Parsing coverage</th><th>Updated</th><th>Inspect</th></tr></thead>
          <tbody>
            {filteredSources.map((source) => (
              <tr key={source.id}>
                <td className="mono strong-cell">{source.id}</td>
                <td><strong>{source.fileName}</strong><small className="cell-subtext">{source.kind} · {source.version}</small></td>
                <td className="mono locator-cell">{source.locator}</td>
                <td><StatusBadge tone={source.relianceTone}>{source.reliance}</StatusBadge></td>
                <td>{source.coverage}</td>
                <td className="mono">{source.updated}</td>
                <td>
                  {source.id === 'SR-002' ? <Link className="table-action" to={`${dealBasePath}/source-records/sr-002`}>Open<FileSearch aria-hidden="true" size={14} /></Link> : <button className="table-action button-reset" type="button" onClick={() => openInspector({
                    eyebrow: `${source.id} · ${source.version}`,
                    title: source.fileName,
                    description: 'This inspector shows a record summary only. Material Evidence and exact corrections remain on the full object page.',
                    metadata: [
                      { label: 'Native Locator', value: source.locator },
                      { label: 'Source Reliance', value: source.reliance },
                      { label: 'Parsing Coverage', value: source.coverage },
                      { label: 'Confidentiality', value: 'Synthetic · Internal' },
                    ],
                    href: `${dealBasePath}/evidence-decisions`,
                    linkLabel: source.id === 'SR-001' || source.id === 'SR-002' ? 'Open linked Evidence' : 'Open Evidence collection',
                  })}>Preview<FileSearch aria-hidden="true" size={14} /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {query && filteredSources.length === 0 ? <SearchEmptyState query={query} onClear={() => setQuery('')} dataOdId="source-search-empty-state" /> : null}
      </TableFrame>

      <section className="source-packet" id="source-packet" aria-labelledby="source-packet-title" data-od-id="source-packet">
        <div>
          <p className="eyebrow">Exact source perimeter</p>
          <h2 id="source-packet-title">Source Packet SP-004 v2</h2>
          <p>Used for Rev 0.3/0.4 internal valuation and CIM preparation. Conflicts, missing sources, and declared exclusions are preserved; an Assumption never overrides a hard gate.</p>
        </div>
        <dl className="key-value-list compact-list">
          <div><dt>Selected</dt><dd>SR-001, SR-002, SR-003, SR-004</dd></div>
          <div><dt>Missing-source plan</dt><dd>Updated Forecast Source · Does not block Buyer work</dd></div>
          <div><dt>Declared exclusions</dt><dd>No real client material, live data-room connection, or external model</dd></div>
          <div><dt>Current Output Ceiling</dt><dd><StatusBadge tone="warning">Internal analysis and restricted drafts</StatusBadge></dd></div>
        </dl>
        <div className="inline-link-row"><Link className="text-link" to={`${dealBasePath}/source-packets/sp-004`}>Edit Source Packet<ExternalLink aria-hidden="true" size={14} /></Link><Link className="text-link" to={`${dealBasePath}/evidence-decisions`}>Inspect material conflicts in packet<ExternalLink aria-hidden="true" size={14} /></Link></div>
      </section>
    </div>
  );
}
