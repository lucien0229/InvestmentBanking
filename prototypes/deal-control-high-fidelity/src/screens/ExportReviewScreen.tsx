import { ArrowLeft, CheckCircle2, FileArchive, LockKeyhole, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from '../router';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { dealBasePath } from '../data/demoData';
import { usePrototypeState } from '../hooks/usePrototypeState';

export function ExportReviewScreen() {
  const navigate = useNavigate();
  const { state, requestSensitiveAction } = usePrototypeState();
  const [purpose, setPurpose] = useState('Internal inspection, controlled backup, and subsequent Office editing');
  const [acknowledged, setAcknowledged] = useState(false);

  if (!state.validationPassed) {
    return (
      <div className="screen" data-od-id="export-review-screen">
        <PageHeader eyebrow="Internal Controlled Export" title="Create an Internal Controlled Export" description="Close the deterministic blocker on the current Cash basis before generating an exact, internally consistent export manifest." dataOdId="export-blocked-heading" />
        <section className="material-blocker" aria-labelledby="export-blocked-title" data-od-id="export-blocked-state">
          <ShieldAlert aria-hidden="true" size={22} /><div><p className="eyebrow">Export blocked</p><h2 id="export-blocked-title">VAL-009 has not passed</h2><p>Return to Analysis and run deterministic validation. The recorded Human Decision and correction will be preserved.</p></div><Link className="button button-primary" to={`${dealBasePath}/analysis`}>Open deterministic validation</Link>
        </section>
      </div>
    );
  }

  if (state.exportCreated) {
    return (
      <div className="screen" data-od-id="export-review-screen">
        <PageHeader eyebrow="Internal Controlled Export · receipt" title="Export EXP-021" description="This immutable receipt binds the exact Revision, hashes, limitations, and Manifest. It does not authorize external circulation." dataOdId="export-receipt-heading" />
        <section className="decision-receipt" aria-labelledby="export-receipt-title" data-od-id="export-created-receipt">
          <CheckCircle2 aria-hidden="true" size={26} /><div><p className="eyebrow">Created · 2026-08-04 15:21</p><h2 id="export-receipt-title">Internal Controlled Export created</h2><p>EXP-021 contains the Native and Reader Artifacts, Evidence and control records, and Manifest for Revision 0.4. The CIM re-review limitation remains with the package.</p></div><Link className="button button-primary" to={`${dealBasePath}/history-portability`}>Open history and receipt</Link>
        </section>
      </div>
    );
  }

  function submitExport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!acknowledged || !purpose.trim()) return;
    requestSensitiveAction({
      code: 'internal-controlled-export',
      returnPath: `${dealBasePath}/history-portability`,
      safeReturnLabel: 'Return to the Internal Controlled Export receipt',
      commandDigest: 'sha256:exp-021-rev-0.4',
      resourceVersion: state.currentRevision,
      idempotencyKey: 'export-exp-021',
    });
    navigate('/account-access/reauthenticate');
  }

  return (
    <div className="screen control-review-screen" data-od-id="export-review-screen">
      <Link className="back-link" to={`${dealBasePath}/review-readiness`}><ArrowLeft aria-hidden="true" size={15} />Return to Package Readiness</Link>
      <PageHeader eyebrow="Internal Controlled Export Review" title={`Create an Internal Controlled Export for Revision ${state.currentRevision}`} description="List included and excluded objects, hashes, current limitations, internal purpose, and Manifest exactly. Ordinary readiness limitations remain in the export." dataOdId="export-review-heading" />

      <form className="control-review-form export-review-form" onSubmit={submitExport} data-od-id="export-review-form">
        <div className="control-review-main">
          <section className="review-section" aria-labelledby="export-objects-title" data-od-id="export-exact-objects">
            <div className="review-section-heading"><span className="step-number">01</span><div><h2 id="export-objects-title">Exact objects and hashes</h2><p>Hashes are synthetic demo values used only to demonstrate the interface structure.</p></div></div>
            <div className="export-file-list">
              <div><FileArchive aria-hidden="true" size={18} /><span><strong>Analysis_Valuation_Workbook_Rev0.4.xlsx</strong><small className="mono">SHA-256 · 53a1…a98c</small></span><StatusBadge tone="success">Included</StatusBadge></div>
              <div><FileArchive aria-hidden="true" size={18} /><span><strong>Analysis_Valuation_Workbook_Rev0.4.pdf</strong><small className="mono">SHA-256 · e96b…f413</small></span><StatusBadge tone="success">Included</StatusBadge></div>
              <div><FileArchive aria-hidden="true" size={18} /><span><strong>CIM_Rev0.4.pptx / .pdf</strong><small className="mono">SHA-256 · 2c71…4ee0 / 81d2…923a</small></span><StatusBadge tone="warning">Included with re-review limitation</StatusBadge></div>
              <div><LockKeyhole aria-hidden="true" size={18} /><span><strong>External-Use Decision / Recipient Access</strong><small>Not recorded and not included</small></span><StatusBadge tone="neutral">Excluded</StatusBadge></div>
            </div>
          </section>

          <section className="review-section" aria-labelledby="export-controls-title" data-od-id="export-controls">
            <div className="review-section-heading"><span className="step-number">02</span><div><h2 id="export-controls-title">Control records and limitations</h2><p>The export never marks unresolved work as resolved.</p></div></div>
            <dl className="review-grid">
              <div><dt>Human Decision</dt><dd className="mono">DEC-014</dd></div>
              <div><dt>Validation</dt><dd className="mono">VAL-009 · passed</dd></div>
              <div><dt>Impact Assessment</dt><dd className="mono">IA-014</dd></div>
              <div><dt>QC / Re-review</dt><dd><StatusBadge tone="warning">Still required</StatusBadge></dd></div>
              <div><dt>External-use posture</dt><dd><StatusBadge tone="critical">Not authorized</StatusBadge></dd></div>
              <div><dt>Manifest</dt><dd className="mono">AM-021 · synthetic</dd></div>
            </dl>
          </section>

          <section className="review-section" aria-labelledby="export-purpose-title" data-od-id="export-purpose">
            <div className="review-section-heading"><span className="step-number">03</span><div><h2 id="export-purpose-title">Internal-use purpose</h2><p>The purpose does not expand Source rights or external authorization.</p></div></div>
            <label className="field"><span>Intended internal use</span><textarea className="textarea" value={purpose} onChange={(event) => setPurpose(event.target.value)} rows={3} required /></label>
            <label className="check-field"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} required /><span><strong>I understand that this export does not authorize external circulation</strong><small>An External-Use Decision, Delivery, and actual External-Use Event must be recorded separately.</small></span></label>
          </section>
        </div>

        <aside className="control-review-summary" aria-labelledby="export-summary-title" data-od-id="export-summary">
          <p className="eyebrow">Export summary</p><h2 id="export-summary-title">EXP-021</h2>
          <dl className="key-value-list compact-list"><div><dt>Revision perimeter</dt><dd className="mono">0.4</dd></div><div><dt>Included files</dt><dd className="mono">4 + control records</dd></div><div><dt>Known limitation</dt><dd>CIM re-review pending</dd></div><div><dt>External authority</dt><dd>None</dd></div></dl>
          <div className="scope-warning"><LockKeyhole aria-hidden="true" size={18} /><p><strong>Purpose boundary</strong>The export supports Banker inspection, Office editing, controlled backup, or reimport only.</p></div>
          <button className="button button-primary button-full" type="submit" disabled={!acknowledged || !purpose.trim()} data-od-id="create-internal-controlled-export">Create Internal Controlled Export</button>
          <Link className="button button-secondary button-full" to={`${dealBasePath}/review-readiness`}>Cancel and return to Readiness</Link>
        </aside>
      </form>
    </div>
  );
}
