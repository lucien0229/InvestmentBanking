import { ArrowLeft, CheckCircle2, FileCheck2, ShieldAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from '../router';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { dealBasePath } from '../data/demoData';
import { usePrototypeState } from '../hooks/usePrototypeState';

export function DecisionReviewScreen() {
  const navigate = useNavigate();
  const { state, recordDecision } = usePrototypeState();
  const [ebitdaChoice, setEbitdaChoice] = useState('17.8');
  const [cashValue, setCashValue] = useState('4.7');
  const [rationale, setRationale] = useState(state.decisionRationale);
  const [errors, setErrors] = useState<string[]>([]);
  const errorRef = useRef<HTMLDivElement>(null);
  const ebitdaError = errors.find((error) => error.includes('exact Source Record'));
  const cashError = errors.find((error) => error.includes('Cash'));
  const rationaleError = errors.find((error) => error.includes('20 characters'));

  useEffect(() => {
    if (errors.length) errorRef.current?.focus();
  }, [errors]);

  if (state.decisionRecorded) {
    return (
      <div className="screen" data-od-id="decision-review-screen">
        <PageHeader eyebrow="Historical control receipt" title="Human Decision DEC-014" description="This immutable record has been created and cannot be edited in place. A correction must create a new record from the current control context." dataOdId="decision-receipt-heading" />
        <section className="decision-receipt" aria-labelledby="immutable-receipt-title" data-od-id="immutable-decision-receipt">
          <CheckCircle2 aria-hidden="true" size={26} />
          <div><p className="eyebrow">Recorded · 2026-08-04 15:12</p><h2 id="immutable-receipt-title">Rev 0.3 valuation treatment recorded</h2><p>$17.8m is the controlled treatment for this scope. The $18.4m seller Claim and AI extraction v1 remain in history. Cash is corrected to $4.7m.</p></div>
          <Link className="button button-primary" to={`${dealBasePath}/analysis`}>Continue to deterministic validation</Link>
        </section>
      </div>
    );
  }

  function submitDecision(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: string[] = [];
    if (ebitdaChoice !== '17.8') nextErrors.push('This demo flow requires the $17.8m controlled treatment that matches the exact Source Record.');
    if (cashValue !== '4.7') nextErrors.push('The corrected Cash value must match $4.7m at SR-002 / Balance Sheet!F28.');
    if (rationale.trim().length < 20) nextErrors.push('Enter at least 20 characters explaining the Decision scope, basis, and preserved matters.');
    setErrors(nextErrors);
    if (nextErrors.length) return;
    recordDecision(rationale.trim());
    navigate(`${dealBasePath}/analysis`);
  }

  return (
    <div className="screen control-review-screen" data-od-id="decision-review-screen">
      <Link className="back-link" to={`${dealBasePath}/evidence-decisions`}><ArrowLeft aria-hidden="true" size={15} />Return to Evidence</Link>
      <PageHeader
        eyebrow="Material Control Review · CLM-018 v2"
        title="Record the material controlled treatment for Rev 0.3"
        description="This is not an approval of AI. Submission creates an immutable Human Decision bound to the Deal, object, version, purpose, Evidence, Impact, rationale, and time."
        dataOdId="decision-review-heading"
      />

      {errors.length ? (
        <div className="error-summary" role="alert" tabIndex={-1} ref={errorRef} data-od-id="decision-error-summary">
          <ShieldAlert aria-hidden="true" size={20} />
          <div><h2>Review the fields that require attention</h2><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>
        </div>
      ) : null}

      <form className="control-review-form" onSubmit={submitDecision} noValidate data-od-id="decision-review-form">
        <div className="control-review-main">
          <section className="review-section" aria-labelledby="review-scope-title" data-od-id="decision-scope">
            <div className="review-section-heading"><span className="step-number">01</span><div><h2 id="review-scope-title">Exact object and scope</h2><p>Inspect the immutable context that this submission will bind.</p></div></div>
            <dl className="review-grid">
              <div><dt>Deal</dt><dd>Project Northstar</dd></div>
              <div><dt>Object</dt><dd className="mono">CLM-018 v2</dd></div>
              <div><dt>Purpose</dt><dd>Rev 0.3 internal valuation and CIM preparation</dd></div>
              <div><dt>Source Packet</dt><dd className="mono">SP-004 v2</dd></div>
              <div><dt>Current Revision</dt><dd className="mono">0.3</dd></div>
              <div><dt>External use</dt><dd><StatusBadge tone="critical">Not authorized</StatusBadge></dd></div>
            </dl>
          </section>

          <section className="review-section" aria-labelledby="ebitda-choice-title" data-od-id="ebitda-control-choice">
            <div className="review-section-heading"><span className="step-number">02</span><div><h2 id="ebitda-choice-title">Select the EBITDA controlled treatment</h2><p>The selection applies only to the stated purpose. The other Claim is preserved.</p></div></div>
            <fieldset className="option-list" aria-describedby={ebitdaError ? 'ebitda-choice-error' : undefined}>
              <legend className="sr-only">EBITDA controlled treatment</legend>
              <label className={`option-card ${ebitdaChoice === '17.8' ? 'selected' : ''}`}>
                <input type="radio" name="ebitda" value="17.8" checked={ebitdaChoice === '17.8'} onChange={(event) => setEbitdaChoice(event.target.value)} aria-invalid={Boolean(ebitdaError)} />
                <span className="option-indicator" aria-hidden="true" />
                <span><strong className="mono">$17.8m</strong><small>SR-002 v7 · Operating Case!F42 · QoE adjusted</small></span>
                <StatusBadge tone="info">Recommended controlled treatment</StatusBadge>
              </label>
              <label className={`option-card ${ebitdaChoice === '18.4' ? 'selected' : ''}`}>
                <input type="radio" name="ebitda" value="18.4" checked={ebitdaChoice === '18.4'} onChange={(event) => setEbitdaChoice(event.target.value)} aria-invalid={Boolean(ebitdaError)} />
                <span className="option-indicator" aria-hidden="true" />
                <span><strong className="mono">$18.4m</strong><small>SR-001 v3 · display page 18 · seller Claim</small></span>
                <StatusBadge tone="warning">Challenging Evidence</StatusBadge>
              </label>
            </fieldset>
            {ebitdaError ? <p className="field-error" id="ebitda-choice-error">{ebitdaError}</p> : null}
          </section>

          <section className="review-section" aria-labelledby="cash-correction-title" data-od-id="cash-correction">
            <div className="review-section-heading"><span className="step-number">03</span><div><h2 id="cash-correction-title">Append a Cash-extraction correction</h2><p>The original AI extraction v1 is not overwritten.</p></div></div>
            <div className="form-grid">
              <label className="field"><span>Original extraction</span><input className="input mono" value="$6.2m" disabled aria-describedby="original-extraction-help" /><small id="original-extraction-help">AI Proposal v1 · Preserved in history</small></label>
              <label className="field"><span>Corrected Cash (USD millions)</span><div className="input-prefix"><span>$</span><input className="input mono" inputMode="decimal" value={cashValue} onChange={(event) => setCashValue(event.target.value)} required aria-invalid={Boolean(cashError)} aria-describedby={cashError ? 'cash-correction-error cash-correction-help' : 'cash-correction-help'} /></div><small id="cash-correction-help">Based on SR-002 / Balance Sheet!F28</small>{cashError ? <span className="field-error" id="cash-correction-error">{cashError}</span> : null}</label>
            </div>
          </section>

          <section className="review-section" aria-labelledby="decision-rationale-title" data-od-id="decision-rationale">
            <div className="review-section-heading"><span className="step-number">04</span><div><h2 id="decision-rationale-title">Record rationale, boundaries, and preserved matters</h2><p>Explain why this treatment is used and what it does not establish.</p></div></div>
            <label className="field"><span>Decision rationale</span><textarea className="textarea" value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="For example: use the QoE-adjusted definition in the Management Model as the controlled treatment for the Rev 0.3 internal valuation purpose; preserve the seller Claim in the Draft CIM and require the subsequent CIM statement to disclose the difference." rows={5} required aria-invalid={Boolean(rationaleError)} aria-describedby={rationaleError ? 'decision-rationale-count decision-rationale-error' : 'decision-rationale-count'} /><small id="decision-rationale-count">{rationale.trim().length} / 20 characters minimum</small>{rationaleError ? <span className="field-error" id="decision-rationale-error">{rationaleError}</span> : null}</label>
          </section>
        </div>

        <aside className="control-review-summary" aria-labelledby="decision-summary-title" data-od-id="decision-summary">
          <p className="eyebrow">Record to be created</p>
          <h2 id="decision-summary-title">Human Decision DEC-014</h2>
          <dl className="key-value-list compact-list">
            <div><dt>Controlled treatment</dt><dd className="mono">$17.8m EBITDA</dd></div>
            <div><dt>Cash correction</dt><dd className="mono">$6.2m → $4.7m</dd></div>
            <div><dt>History</dt><dd>Preserve both Claims and the original extraction</dd></div>
            <div><dt>Consequence</dt><dd>Permit deterministic validation to rerun without closing QC or authorizing external use</dd></div>
          </dl>
          <div className="scope-warning"><FileCheck2 aria-hidden="true" size={18} /><p><strong>Exact scope</strong>This record applies only to Project Northstar, CLM-018 v2, and the stated purpose for Rev 0.3.</p></div>
          <button className="button button-primary button-full" type="submit" data-od-id="record-material-decision">Record treatment and Cash correction</button>
          <Link className="button button-secondary button-full" to={`${dealBasePath}/evidence-decisions`}>Cancel and return to Evidence</Link>
        </aside>
      </form>
    </div>
  );
}
