import { ArrowRight, ExternalLink, FileSpreadsheet, GitBranch, ScanSearch } from 'lucide-react';
import { Link } from '../router';
import { DesktopActionLink } from '../components/DesktopActionLink';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { dealBasePath } from '../data/demoData';
import { useInspector } from '../hooks/useInspector';
import { usePrototypeState } from '../hooks/usePrototypeState';

export function EvidenceScreen() {
  const { state } = usePrototypeState();
  const { openInspector, closeInspector } = useInspector();

  return (
    <div className="screen" data-od-id="evidence-screen">
      <PageHeader
        eyebrow="CLM-018 · Current · AI proposal origin"
        title="Evidence & Decisions"
        description="Compare exact Source Records and Native Locators, preserve conflicting Claims, and let the Banker record a scope-bound controlled treatment."
        dataOdId="evidence-heading"
        actions={state.decisionRecorded ? (
          <Link className="button button-primary" to={`${dealBasePath}/analysis`} data-od-id="open-analysis-after-decision">
            Open deterministic validation<ArrowRight aria-hidden="true" size={16} />
          </Link>
        ) : (
          <DesktopActionLink
            to={`${dealBasePath}/evidence-decisions/control-review`}
            scope="CLM-018 v2, Cash extraction v1, and their downstream Revision"
            dataOdId="prepare-human-decision"
          >
            Prepare material control decision<ArrowRight aria-hidden="true" size={16} />
          </DesktopActionLink>
        )}
      />

      {state.decisionRecorded ? (
        <section className="receipt-banner" aria-labelledby="decision-receipt-title" data-od-id="decision-recorded-banner">
          <div className="receipt-icon"><GitBranch aria-hidden="true" size={20} /></div>
          <div><p className="eyebrow">Immutable receipt</p><h2 id="decision-receipt-title">Decision DEC-014 recorded</h2><p>$17.8m is recorded as the controlled treatment for the Rev 0.3 valuation purpose. The $18.4m seller Claim and original Cash extraction are preserved.</p></div>
          <StatusBadge tone="success">Treatment recorded</StatusBadge>
        </section>
      ) : null}

      <section className="evidence-workbench" aria-labelledby="evidence-workbench-title" data-od-id="evidence-workbench">
        <div className="workbench-header">
          <div>
            <p className="eyebrow">Evidence split inspector</p>
            <h2 id="evidence-workbench-title">EBITDA basis · Rev 0.3 valuation purpose</h2>
          </div>
          <StatusBadge tone={state.decisionRecorded ? 'success' : 'warning'}>{state.decisionRecorded ? 'Decision recorded' : 'Material conflict'}</StatusBadge>
        </div>
        <div className="evidence-split">
          <div className="source-representation" data-od-id="source-representation">
            <div className="source-pane-header">
              <FileSpreadsheet aria-hidden="true" size={18} />
              <div><strong>Management_Model_v7.xlsx</strong><span className="mono">SR-002 · v7</span></div>
              <button className="button button-secondary button-compact" type="button" onClick={() => openInspector({
                eyebrow: 'Source Record',
                title: 'SR-002 · Management_Model_v7.xlsx',
                description: 'The exact Source Record binds a byte digest, parsed representation, and versioned Native Locator.',
                metadata: [{ label: 'Representation', value: 'XLSX parsed structure v1' }, { label: 'Rights posture', value: 'Synthetic · rights-cleared' }, { label: 'SHA-256', value: '9f28…1ad4 (demo)' }],
              })}>Inspect record</button>
            </div>
            <div className="sheet-tabs" aria-label="Worksheets"><span className="active">Operating Case</span><span>Balance Sheet</span></div>
            <div className="spreadsheet" role="img" aria-label="Synthetic workbook Operating Case F42, Adjusted EBITDA of 17.8 million dollars">
              <div className="sheet-corner" /><div className="sheet-col">E</div><div className="sheet-col active">F</div><div className="sheet-col">G</div>
              <div className="sheet-row">40</div><div>Adjusted EBITDA</div><div className="sheet-value muted">—</div><div className="sheet-value">—</div>
              <div className="sheet-row active">42</div><div className="highlight-label">Adjusted EBITDA · LTM</div><div className="sheet-value selected">$17.8m</div><div className="sheet-value">FY25</div>
              <div className="sheet-row">43</div><div>Definition note</div><div className="sheet-value muted">QoE adjusted</div><div className="sheet-value">—</div>
            </div>
            <div className="locator-footer">
              <ScanSearch aria-hidden="true" size={15} />
              <span className="mono">SR-002 / Operating Case!F42</span>
              <StatusBadge tone="info">Exact locator</StatusBadge>
            </div>
          </div>

          <div className="structured-pane" data-od-id="structured-evidence-pane">
            <div className="pane-tabs" role="group" aria-label="Structured Evidence actions"><button className="active" type="button" onClick={closeInspector}>Evidence</button><button type="button" onClick={() => openInspector({ eyebrow: 'Controls', title: 'Material control requirements', description: 'The Decision must bind the object, version, purpose, Evidence, Impact, rationale, and generated record.', metadata: [{ label: 'Control', value: 'Human Decision required' }, { label: 'Target', value: 'CLM-018 v2' }] })}>Controls</button><button type="button" onClick={() => openInspector({ eyebrow: 'Lineage', title: 'Downstream dependencies', description: 'These two Claims affect the valuation workbook, CIM statement, Reader Copy, QC, Readiness, and future authorization.', metadata: [{ label: 'Direct dependencies', value: '3 (synthetic demo)' }, { label: 'Affected outputs', value: '8 (synthetic demo)' }] })}>Lineage</button></div>
            <article className="claim-block selected-claim">
              <div className="claim-heading"><span className="mono">CLM-018-B</span><StatusBadge tone="info">Control candidate</StatusBadge></div>
              <strong className="claim-value mono">$17.8m</strong>
              <p>Management Model value for LTM Adjusted EBITDA; the QoE-adjusted definition is visible.</p>
              <dl className="claim-metadata"><div><dt>Source</dt><dd>SR-002 v7</dd></div><div><dt>Locator</dt><dd className="mono">Operating Case!F42</dd></div><div><dt>Origin</dt><dd>Source extraction</dd></div></dl>
            </article>
            <article className="claim-block">
              <div className="claim-heading"><span className="mono">CLM-018-A</span><StatusBadge tone="warning">Challenging Evidence</StatusBadge></div>
              <strong className="claim-value mono">$18.4m</strong>
              <p>Seller Claim from the Draft CIM. It is not deleted or relabeled as false by the controlled treatment.</p>
              <dl className="claim-metadata"><div><dt>Source</dt><dd>SR-001 v3</dd></div><div><dt>Locator</dt><dd className="mono">display page 18 · Table 4</dd></div><div><dt>Origin</dt><dd>Seller Claim</dd></div></dl>
            </article>
          </div>
        </div>
      </section>

      <section className="cash-exception" aria-labelledby="cash-exception-title" data-od-id="cash-extraction-exception">
        <div className="exception-summary">
          <div><p className="eyebrow">Second material exception</p><h2 id="cash-exception-title">Cash extraction does not match the Native Locator</h2></div>
          <StatusBadge tone={state.cashCorrected ? 'success' : 'critical'}>{state.cashCorrected ? 'Correction appended' : 'Deterministic validation failed'}</StatusBadge>
        </div>
        <div className="comparison-ledger">
          <div><span>AI extraction v1</span><strong className="mono">$6.2m</strong><small>Preserved as the original Proposal</small></div>
          <div className="comparison-arrow" aria-hidden="true">≠</div>
          <div><span>Native Locator</span><strong className="mono">$4.7m</strong><small>SR-002 / Balance Sheet!F28</small></div>
          <div className="comparison-consequence"><span>Current consequence</span><strong className="mono">$1.5m tie-out</strong><small>{state.cashCorrected ? 'Deterministic recalculation pending or completed' : 'Analysis and downstream Revision blocked'}</small></div>
        </div>
      </section>

      <section className="lineage-strip" aria-labelledby="lineage-title" data-od-id="evidence-lineage">
        <div><p className="eyebrow">Selected path</p><h2 id="lineage-title">Source → Evidence → Analysis → Revision → QC</h2></div>
        <div className="lineage-nodes" aria-label="Selected lineage path">
          {['SR-002 v7', 'EVD-001', 'ANL-014 v3', `CIM ${state.currentRevision}`, 'QC-022'].map((node, index) => (
            <span key={node}>{node}{index < 4 ? <i aria-hidden="true">→</i> : null}</span>
          ))}
        </div>
        <div className="inline-link-row"><Link className="text-link" to={`${dealBasePath}/claims/clm-018`}>Open Claim details<ExternalLink aria-hidden="true" size={14} /></Link><Link className="text-link" to={`${dealBasePath}/analysis`}>Inspect analysis and impact<ExternalLink aria-hidden="true" size={14} /></Link></div>
      </section>
    </div>
  );
}
