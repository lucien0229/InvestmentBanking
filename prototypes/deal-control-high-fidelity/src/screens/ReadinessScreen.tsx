import { ExternalLink, FileOutput, ShieldX } from 'lucide-react';
import { Link } from '../router';
import { DesktopActionLink } from '../components/DesktopActionLink';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { TableFrame } from '../components/TableFrame';
import { dealBasePath } from '../data/demoData';
import { usePrototypeState } from '../hooks/usePrototypeState';

export function ReadinessScreen() {
  const { state } = usePrototypeState();

  const rows = [
    { requirement: 'Cash basis', scope: `Valuation Rev ${state.currentRevision}`, posture: state.validationPassed ? 'Mechanical Validity passed' : 'Blocked', tone: state.validationPassed ? 'success' as const : 'critical' as const, control: state.validationPassed ? 'DEC-014 / VAL-009' : 'VAL-009', blocker: state.validationPassed ? 'No mechanical blocker' : 'Cash extraction difference', action: state.validationPassed ? 'Inspect result' : 'Close tie-out', href: `${dealBasePath}/analysis` },
    { requirement: 'CIM Native / Reader parity', scope: `CIM Rev ${state.currentRevision}`, posture: 'Re-review required', tone: 'warning' as const, control: 'PAR-018', blocker: 'Targeted review pending', action: 'Inspect Deliverable', href: `${dealBasePath}/execution-package` },
    { requirement: 'CIM Professional Usability', scope: `CIM Rev ${state.currentRevision}`, posture: 'Not determined', tone: 'neutral' as const, control: 'Review required', blocker: 'Banker judgment', action: 'Open package content', href: `${dealBasePath}/execution-package` },
    { requirement: 'Bid memo', scope: 'Preparation stage', posture: 'Not required at this stage', tone: 'neutral' as const, control: 'Applicability rule', blocker: 'None', action: 'Inspect basis', href: `${dealBasePath}/auction-process` },
    { requirement: 'External use', scope: `Revision ${state.currentRevision}`, posture: 'External circulation blocked', tone: 'critical' as const, control: 'No External-Use Decision', blocker: 'circulation-candidate not reached', action: 'Inspect boundary', href: `${dealBasePath}/execution-package` },
  ];

  return (
    <div className="screen" data-od-id="readiness-screen">
      <PageHeader
        eyebrow="Blocker-first matrix · no scalar score"
        title="Review & Readiness"
        description="Inspect exact scope, current posture, Evidence or control record, blockers, and the next controlled action item by item. No percentage or global green Ready state is produced."
        dataOdId="readiness-heading"
        actions={
          <DesktopActionLink
            to={`${dealBasePath}/history-portability/internal-export`}
            scope={`Revision ${state.currentRevision}, Native / Reader Artifacts, and Manifest`}
            dataOdId="prepare-internal-export"
          >
            <FileOutput aria-hidden="true" size={16} />Prepare Internal Controlled Export
          </DesktopActionLink>
        }
      />

      <section className="readiness-summary" aria-labelledby="readiness-summary-title" data-od-id="readiness-summary">
        <div><p className="eyebrow">Current package perimeter</p><h2 id="readiness-summary-title">Project Northstar · Revision {state.currentRevision}</h2><p>An internal export may preserve ordinary readiness limitations. Rights, confidentiality, corruption, or missing required records still block the affected export.</p></div>
        <dl className="inline-metrics readiness-metrics">
          <div><dt>Active blockers</dt><dd className="mono critical-text">{state.validationPassed ? '1' : '3'}</dd></div>
          <div><dt>Pending re-review</dt><dd className="mono warning-text">2</dd></div>
          <div><dt>Changed today</dt><dd className="mono">4</dd></div>
          <div><dt>External-use posture</dt><dd><StatusBadge tone="critical">Not authorized</StatusBadge></dd></div>
        </dl>
      </section>

      <TableFrame label="Package Readiness" dataOdId="package-readiness-matrix">
        <table className="data-table readiness-table">
          <thead><tr><th>Requirement</th><th>Exact scope</th><th>Current posture</th><th>Evidence / Control</th><th>Blocker</th><th>Next controlled action</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.requirement}>
                <td className="strong-cell">{row.requirement}</td>
                <td className="mono">{row.scope}</td>
                <td><StatusBadge tone={row.tone}>{row.posture}</StatusBadge></td>
                <td className="mono">{row.control}</td>
                <td>{row.blocker}</td>
                <td><Link className="table-action" to={row.href}>{row.action}<ExternalLink aria-hidden="true" size={14} /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableFrame>

      <section className="external-use-boundary" aria-labelledby="external-use-title" data-od-id="external-use-boundary">
        <ShieldX aria-hidden="true" size={24} />
        <div><p className="eyebrow">External use</p><h2 id="external-use-title">Revision {state.currentRevision} cannot enter an External-Use Decision yet</h2><p>Passing deterministic validation does not establish Professional Usability, and Package Readiness does not authorize external use. At minimum, targeted CIM review and applicable QC must close first.</p></div>
        <div className="button-row"><Link className="button button-secondary" to={`${dealBasePath}/review-readiness/package-readiness`}>Exact readiness matrix</Link><Link className="button button-secondary" to={`${dealBasePath}/review-readiness/external-use-decisions/new`}>Prepare External-Use Decision</Link></div>
      </section>
    </div>
  );
}
