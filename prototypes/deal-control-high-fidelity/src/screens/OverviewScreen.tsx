import { ArrowRight, Clock3, ExternalLink, FileWarning, GitCompareArrows, ShieldCheck } from 'lucide-react';
import { Link } from '../router';
import { PageHeader } from '../components/PageHeader';
import { StateSummary } from '../components/StateSummary';
import { StatusBadge } from '../components/StatusBadge';
import { dealBasePath } from '../data/demoData';
import { useInspector } from '../hooks/useInspector';
import { usePrototypeState } from '../hooks/usePrototypeState';

export function OverviewScreen() {
  const { state } = usePrototypeState();
  const { openInspector } = useInspector();

  const nextAction = !state.decisionRecorded
    ? {
        title: 'Review the $18.4m / $17.8m material EBITDA conflict',
        description: 'CLM-018 still requires a scope-bound Banker Decision. Both Source Records will be preserved.',
        label: 'Review material conflict',
        href: `${dealBasePath}/evidence-decisions`,
      }
    : !state.validationPassed
      ? {
          title: 'Run the deterministic EV-to-equity validation',
          description: 'Decision DEC-014 is recorded. Now verify whether the Cash correction closes the $1.5m tie-out difference.',
          label: 'Open deterministic validation',
          href: `${dealBasePath}/analysis`,
        }
      : !state.exportCreated
        ? {
            title: 'Inspect the package-readiness boundary for Revision 0.4',
            description: 'Deterministic validation passed. The CIM still requires re-review, and the new Revision has no external-use authorization.',
            label: 'Inspect package readiness',
            href: `${dealBasePath}/review-readiness`,
          }
        : {
            title: 'Inspect the Internal Controlled Export receipt',
            description: 'EXP-021 is created. The receipt preserves the exact Revision, limitations, and Manifest without authorizing external circulation.',
            label: 'Open export receipt',
            href: `${dealBasePath}/history-portability`,
          };

  return (
    <div className="screen" data-od-id="overview-screen">
      <PageHeader
        eyebrow="Deal Execution Desk"
        title="Overview"
        description="Return to the authoritative context for one Deal and complete the smallest safe controlled action next."
        dataOdId="overview-heading"
        actions={
          <button
            className="button button-secondary"
            type="button"
            onClick={() => openInspector({
              eyebrow: 'Current control context',
              title: 'Paid Preflight and Output Ceiling',
              description: 'The listed synthetic Source types are permitted for processing. Preflight does not establish source truth, Professional Usability, or external-use authorization.',
              metadata: [
                { label: 'Preflight', value: 'pass · PF-004' },
                { label: 'Permitted scope', value: 'Synthetic PDF / XLSX · Preparation' },
                { label: 'Source Packet', value: 'SP-004 v2' },
                { label: 'Output Ceiling', value: 'Internal analysis and Internal Controlled Export' },
              ],
            })}
            data-od-id="open-control-context"
          >
            <ShieldCheck aria-hidden="true" size={16} />Inspect control context
          </button>
        }
      />

      <section className="next-action" aria-labelledby="next-action-title" data-od-id="next-controlled-action">
        <div className="next-action-icon" aria-hidden="true"><GitCompareArrows size={21} /></div>
        <div className="next-action-copy">
          <p className="eyebrow">Next controlled action</p>
          <h2 id="next-action-title">{nextAction.title}</h2>
          <p>{nextAction.description}</p>
        </div>
        <Link className="button button-primary" to={nextAction.href} data-od-id="next-action-cta">
          {nextAction.label}<ArrowRight aria-hidden="true" size={16} />
        </Link>
      </section>

      <div className="overview-columns">
        <section className="attention-panel" aria-labelledby="attention-title" data-od-id="overview-attention">
          <div className="section-heading-row compact">
            <div>
              <p className="eyebrow">Attention</p>
              <h2 id="attention-title">Current attention</h2>
            </div>
            <Link className="text-link" to={`${dealBasePath}/actions`}>Open Action Center<ExternalLink aria-hidden="true" size={14} /></Link>
          </div>
          <div className="attention-list">
            <Link to={`${dealBasePath}/evidence-decisions`} className="attention-row">
              <span className="attention-icon warning"><FileWarning aria-hidden="true" size={17} /></span>
              <span><strong>{state.decisionRecorded ? '0' : '1'} material Human Decision</strong><small>CLM-018 · EBITDA basis conflict</small></span>
              <StatusBadge tone={state.decisionRecorded ? 'success' : 'warning'}>{state.decisionRecorded ? 'Recorded' : 'Decision required'}</StatusBadge>
            </Link>
            <Link to={`${dealBasePath}/review-readiness`} className="attention-row">
              <span className="attention-icon critical"><GitCompareArrows aria-hidden="true" size={17} /></span>
              <span><strong>{state.validationPassed ? '1' : '3'} package-control tasks</strong><small>QC, re-review, and circulation boundary</small></span>
              <StatusBadge tone="critical">External circulation blocked</StatusBadge>
            </Link>
            <Link to={`${dealBasePath}/actions`} className="attention-row">
              <span className="attention-icon neutral"><Clock3 aria-hidden="true" size={17} /></span>
              <span><strong>1 source request</strong><small>Forecast source · Safe continuation available</small></span>
              <StatusBadge tone="neutral">Waiting for source</StatusBadge>
            </Link>
          </div>
        </section>

        <section className="control-context-panel" id="deal-controls" aria-labelledby="context-title" data-od-id="overview-control-context">
          <p className="eyebrow">Current control context</p>
          <h2 id="context-title">SP-004 v2 · Rev {state.currentRevision}</h2>
          <dl className="key-value-list">
            <div><dt>Deal stage</dt><dd>Preparation</dd></div>
            <div><dt>Work Objective</dt><dd>Rev 0.3/0.4 internal valuation and CIM preparation</dd></div>
            <div><dt>Output Ceiling</dt><dd>Internal analysis and Internal Controlled Export</dd></div>
            <div><dt>External use</dt><dd><StatusBadge tone="critical">Not authorized</StatusBadge></dd></div>
          </dl>
        </section>
      </div>

      <StateSummary
        dataOdId="overview-state-summary"
        items={[
          { group: 'Source & Evidence', label: 'EBITDA basis', value: state.decisionRecorded ? 'Treatment recorded' : 'Conflicted', tone: state.decisionRecorded ? 'success' : 'warning', note: state.decisionRecorded ? 'DEC-014 preserves both Claims and records the current controlled treatment.' : 'SR-001 and SR-002 provide different values for the same valuation purpose.' },
          { group: 'Analysis & Mechanical', label: 'EV-to-equity tie-out', value: state.validationPassed ? 'Validation passed' : '$1.5m difference', tone: state.validationPassed ? 'success' : 'critical', note: state.validationPassed ? 'VAL-009 records a $0.0m difference using the corrected $4.7m Cash value.' : 'An incorrect Cash extraction prevents downstream analysis from closing.' },
          { group: 'Deliverable & Review', label: `CIM Rev ${state.currentRevision}`, value: state.validationPassed ? 'Re-review required' : 'Blocked', tone: state.validationPassed ? 'warning' : 'critical', note: 'Review and QC do not carry forward to a new Revision.' },
          { group: 'External Use', label: `Revision ${state.currentRevision}`, value: 'External circulation blocked', tone: 'critical', note: 'No External-Use Decision is recorded. An Internal Export does not change this state.' },
        ]}
      />

      <section className="stage-strip" id="first-deal-guide" aria-labelledby="stage-title" data-od-id="stage-applicable-deliverables">
        <div>
          <p className="eyebrow">Stage-aware · not stage-shaped</p>
          <h2 id="stage-title">Deliverables applicable in Preparation</h2>
        </div>
        <div className="stage-items">
          <div><span>Analysis & Valuation Workbook</span><StatusBadge tone={state.validationPassed ? 'success' : 'critical'}>{state.validationPassed ? 'Analysis updated' : 'Blocked'}</StatusBadge></div>
          <div><span>Teaser</span><StatusBadge tone="neutral">Working draft</StatusBadge></div>
          <div><span>CIM</span><StatusBadge tone="warning">Re-review required</StatusBadge></div>
          <div><span>Bid Recommendation Memo</span><StatusBadge tone="neutral">Not required at this stage</StatusBadge></div>
        </div>
      </section>
    </div>
  );
}
