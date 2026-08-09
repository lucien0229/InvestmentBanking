import { ArrowRight, FileText, Sheet, SlidersHorizontal } from 'lucide-react';
import { Link } from '../router';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { baseDeliverables, dealBasePath } from '../data/demoData';
import { useInspector } from '../hooks/useInspector';
import { usePrototypeState } from '../hooks/usePrototypeState';

export function PackageScreen() {
  const { state } = usePrototypeState();
  const { openInspector } = useInspector();
  const deliverables = baseDeliverables.map((item) => item.id === 'DEL-001' ? { ...item, revision: state.currentRevision, readiness: state.validationPassed ? 'Analysis updated' : item.readiness, readinessTone: state.validationPassed ? 'success' as const : item.readinessTone } : item.id === 'DEL-004' ? { ...item, revision: state.currentRevision } : item);

  return (
    <div className="screen" data-od-id="package-screen">
      <PageHeader eyebrow="Controlled Auction Execution Package" title="Execution Package" description="Organize Banker-native Deliverables, exact Reader Copies, Revisions, Lineage, and control summaries by applicability. This is not a generic file generator." dataOdId="package-heading" actions={<Link className="button button-primary" to={`${dealBasePath}/review-readiness`} data-od-id="open-package-readiness">Inspect package readiness<ArrowRight aria-hidden="true" size={16} /></Link>} />

      <section className="package-spine" aria-labelledby="package-spine-title" data-od-id="package-spine">
        <div><p className="eyebrow">Always-required spines</p><h2 id="package-spine-title">Two continuously updated workbook spines</h2></div>
        <div className="spine-items">
          <article><Sheet aria-hidden="true" size={22} /><div><strong>Analysis & Valuation Workbook</strong><span className="mono">DEL-001 · Rev {state.currentRevision}</span></div><StatusBadge tone={state.validationPassed ? 'success' : 'critical'}>{state.validationPassed ? 'Analysis updated' : 'Blocked by material conflict'}</StatusBadge></article>
          <article><Sheet aria-hidden="true" size={22} /><div><strong>Auction Control Workbook</strong><span className="mono">DEL-002 · Rev 0.2</span></div><StatusBadge tone="success">Analysis ready</StatusBadge></article>
        </div>
      </section>

      <section className="deliverable-list" aria-labelledby="deliverable-list-title" data-od-id="deliverable-list">
        <div className="section-heading-row"><div><p className="eyebrow">Stage applicability</p><h2 id="deliverable-list-title">Current Deliverables</h2></div><Link className="button button-secondary button-compact" to={`${dealBasePath}/execution-package/templates`}><SlidersHorizontal aria-hidden="true" size={15} />Templates & compatibility</Link></div>
        <div className="deliverable-rows">
          {deliverables.map((item) => (
            <article className="deliverable-row" key={item.id} data-od-id={`deliverable-${item.id.toLowerCase()}`}>
              <div className="file-type-icon" aria-hidden="true">{item.format === 'XLSX' ? <Sheet size={18} /> : <FileText size={18} />}</div>
              <div className="deliverable-identity"><strong>{item.name}</strong><span className="mono">{item.id} · {item.format}</span></div>
              <div><span className="cell-label">Applicability</span><StatusBadge tone={item.applicabilityTone}>{item.applicability}</StatusBadge></div>
              <div><span className="cell-label">Current Revision</span><strong className="mono">{item.revision}</strong></div>
              <div><span className="cell-label">Reader Copy</span><span>{item.readerCopy}</span></div>
              <div><span className="cell-label">Deliverable Readiness</span><StatusBadge tone={item.readinessTone}>{item.readiness}</StatusBadge></div>
              {item.id === 'DEL-004' ? <Link className="table-action" to={`${dealBasePath}/deliverables/del-004`}>Open</Link> : <button className="table-action button-reset" type="button" onClick={() => openInspector({ eyebrow: `${item.id} · ${item.format}`, title: item.name, description: 'Current Revision, Native Artifact, Reader Copy, Lineage, Review/QC, and authorization states remain separate.', metadata: [{ label: 'Applicability', value: item.applicability }, { label: 'Current Revision', value: item.revision }, { label: 'Reader Copy', value: item.readerCopy }, { label: 'Readiness', value: item.readiness }] })}>Inspect</button>}
            </article>
          ))}
        </div>
      </section>

      <section className="authorization-boundary" aria-labelledby="authorization-boundary-title" data-od-id="authorization-boundary">
        <div><p className="eyebrow">Revision / authorization boundary</p><h2 id="authorization-boundary-title">Content, readiness, and external authorization are separate states</h2><p>Revision {state.currentRevision} can exist, be inspected, and enter an Internal Controlled Export while remaining below circulation-candidate and without any External-Use Decision.</p></div>
        <div className="boundary-steps"><span><b>1</b>Revision {state.currentRevision}</span><i aria-hidden="true">→</i><span><b>2</b>QC / Readiness</span><i aria-hidden="true">→</i><span className="blocked"><b>3</b>External-Use Decision not recorded</span></div>
      </section>
    </div>
  );
}
