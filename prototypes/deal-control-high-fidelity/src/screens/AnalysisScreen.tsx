import { ArrowRight, CheckCircle2, Clock3, LoaderCircle, Play, RotateCcw, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Link } from '../router';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { dealBasePath } from '../data/demoData';
import { usePrototypeState } from '../hooks/usePrototypeState';

export function AnalysisScreen() {
  const { state, runValidation } = usePrototypeState();
  const [isRunning, setIsRunning] = useState(false);

  function handleValidation() {
    if (!state.decisionRecorded || isRunning) return;
    setIsRunning(true);
    window.setTimeout(() => {
      runValidation();
      setIsRunning(false);
    }, 450);
  }

  return (
    <div className="screen" data-od-id="analysis-screen">
      <PageHeader
        eyebrow="ANL-014 v3 · deterministic validation"
        title="Analysis"
        description="Separate AI Proposals, Banker Decisions, and repeatable calculations while showing actual inputs, rules, differences, and downstream Impact."
        dataOdId="analysis-heading"
        actions={state.validationPassed ? (
          <Link className="button button-primary" to={`${dealBasePath}/review-readiness`} data-od-id="open-readiness-after-validation">Inspect package readiness<ArrowRight aria-hidden="true" size={16} /></Link>
        ) : (
          <button className="button button-primary" type="button" onClick={handleValidation} disabled={!state.decisionRecorded || isRunning} aria-busy={isRunning} data-od-id="run-deterministic-validation">
            {isRunning ? <LoaderCircle className="spinner" aria-hidden="true" size={16} /> : <Play aria-hidden="true" size={16} />}{isRunning ? 'Validating…' : 'Run deterministic validation'}
          </button>
        )}
      />

      {!state.decisionRecorded ? (
        <section className="material-blocker" aria-labelledby="analysis-blocker-title" data-od-id="analysis-material-blocker">
          <ShieldAlert aria-hidden="true" size={22} />
          <div><p className="eyebrow">Waiting for user</p><h2 id="analysis-blocker-title">A material Human Decision has not been recorded</h2><p>Forecast reconciliation and affected Deliverables are blocked. Buyer research and other work that does not depend on this Claim can continue.</p></div>
          <Link className="button button-primary" to={`${dealBasePath}/evidence-decisions`}>Open Evidence & Decisions</Link>
        </section>
      ) : null}

      <section className="validation-workbench" aria-labelledby="validation-title" data-od-id="deterministic-validation-workbench">
        <div className="section-heading-row">
          <div><p className="eyebrow">VAL-009 · EV-to-equity tie-out</p><h2 id="validation-title">Deterministic validation result</h2></div>
          <StatusBadge tone={isRunning ? 'warning' : state.validationPassed ? 'success' : 'critical'}>{isRunning ? 'Recalculating' : state.validationPassed ? 'Mechanical Validity passed' : 'Mechanical Validity failed'}</StatusBadge>
        </div>
        <div className="validation-grid">
          <div className="validation-inputs">
            <h3>Inputs and control records</h3>
            <dl className="calculation-list">
              <div><dt>Controlled EBITDA</dt><dd><span className="mono">$17.8m</span><small>{state.decisionRecorded ? 'DEC-014' : 'Decision required'}</small></dd></div>
              <div><dt>AI extraction v1 · Cash</dt><dd><span className="mono struck">$6.2m</span><small>Historical Proposal · Not overwritten</small></dd></div>
              <div><dt>Current Cash basis</dt><dd><span className="mono">${state.cashCorrected ? '4.7' : '6.2'}m</span><small>{state.cashCorrected ? 'Correction v2 · DEC-014' : 'Uncorrected'}</small></dd></div>
              <div><dt>Rule set</dt><dd><span className="mono">EV-EQ-TIE-004 v2</span><small>Exact unit, period, and sign rules</small></dd></div>
            </dl>
          </div>
          <div className={`validation-result ${state.validationPassed ? 'passed' : 'failed'}`}>
            {state.validationPassed ? <CheckCircle2 aria-hidden="true" size={30} /> : <RotateCcw aria-hidden="true" size={30} />}
            <span className="result-label">Current difference</span>
            <strong className="mono">${state.validationPassed ? '0.0' : '1.5'}m</strong>
            <p>{state.validationPassed ? 'Deterministic validation closed the difference caused by the Cash extraction. This result does not establish Professional Usability.' : 'The Cash extraction does not match the Native Locator, so validation remains open. It can be rerun after the material Decision.'}</p>
          </div>
        </div>
        <div className="job-strip" role="status" aria-live="polite" aria-busy={isRunning}>
          {isRunning ? <LoaderCircle className="spinner" aria-hidden="true" size={16} /> : <Clock3 aria-hidden="true" size={16} />}
          <div><strong>{isRunning ? 'Job JOB-0098 · running' : state.validationPassed ? 'Job JOB-0098 · completed' : state.decisionRecorded ? 'Job JOB-0098 · ready to run' : 'Job JOB-0098 · waiting-for-user'}</strong><span>{isRunning ? 'Recalculating the cash bridge, units, tie-out, and dependency Impact.' : state.validationPassed ? 'Extraction, unit normalization, tie-out, and dependency checks are recorded.' : 'Accepted extraction and unit-normalization progress remains unchanged.'}</span></div>
          <span className="mono">{isRunning ? 'Progress · deterministic steps 2 / 4' : `Last heartbeat · ${state.validationPassed ? '15:16:22' : '15:04:09'}`}</span>
        </div>
      </section>

      <section className="impact-assessment" aria-labelledby="impact-title" data-od-id="impact-assessment">
        <div className="section-heading-row">
          <div><p className="eyebrow">IA-014 · task-oriented impact</p><h2 id="impact-title">Downstream Impact of Cash $6.2m → $4.7m</h2></div>
          <p className="section-note">3 direct dependencies · 8 affected objects · 11 checked and unaffected (all synthetic demo data)</p>
        </div>
        <div className="impact-groups">
          <article><span className="impact-count mono">2</span><div><strong>Recalculation required</strong><p>Valuation-workbook cash bridge and equity value output.</p></div><StatusBadge tone={state.validationPassed ? 'success' : 'critical'}>{state.validationPassed ? 'Completed' : 'Pending'}</StatusBadge></article>
          <article><span className="impact-count mono">2</span><div><strong>Regeneration required</strong><p>Analysis-workbook Reader Copy and CIM value statement.</p></div><StatusBadge tone={state.validationPassed ? 'warning' : 'critical'}>{state.validationPassed ? 'Rev 0.4 generated' : 'Blocked'}</StatusBadge></article>
          <article><span className="impact-count mono">3</span><div><strong>Re-review required</strong><p>Native/Reader parity, QC Finding, and Professional Usability.</p></div><StatusBadge tone="warning">Banker re-review required</StatusBadge></article>
          <article><span className="impact-count mono">1</span><div><strong>External circulation blocked</strong><p>Any authorization for Rev 0.3 does not carry forward to Rev 0.4.</p></div><StatusBadge tone="critical">Not authorized</StatusBadge></article>
          <article><span className="impact-count mono">11</span><div><strong>Checked and unaffected</strong><p>Buyer, NDA, Data-Room Access, and process objects that do not depend on this Cash basis.</p></div><StatusBadge tone="neutral">State preserved</StatusBadge></article>
        </div>
        <div className="section-footer-action"><Link className="button button-secondary" to={`${dealBasePath}/analysis/analyses/anl-014`}>Open Analysis object</Link><Link className="button button-primary" to={`${dealBasePath}/review-readiness/impact-assessments/ia-014`}>Inspect full Impact<ArrowRight aria-hidden="true" size={15} /></Link></div>
      </section>
    </div>
  );
}
