import { AlertTriangle, ArrowRight, Check, Clock3, FileCheck2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from '../router';
import { StatusBadge } from '../components/StatusBadge';

export function RecipientAccessScreen() {
  const [verified, setVerified] = useState(false);
  return (
    <section className="recipient-access-panel" aria-labelledby="recipient-access-title" data-od-id="recipient-access-check-screen">
      <p className="eyebrow">Recipient Access · RA-018</p><h1 id="recipient-access-title">Verify access to one exact authorized Revision</h1><p>This entry point does not expose the Deal Workspace, other Buyers, internal Evidence, Banker notes, Native Artifacts, or unauthorized Revisions.</p>
      <dl className="recipient-scope"><div><dt>Recipient</dt><dd>Northfield Capital reviewer</dd></div><div><dt>Authorization</dt><dd className="mono">EUD-018</dd></div><div><dt>Revision</dt><dd className="mono">0.4</dd></div><div><dt>Expires</dt><dd className="mono">2026-08-18 18:00 ET</dd></div></dl>
      {verified ? <div className="recipient-verified" role="status"><Check aria-hidden="true" size={18} /><div><strong>Identity and access state passed the synthetic checks</strong><p>The first view will create a separate Actual External Use event.</p></div></div> : <form onSubmit={(event) => { event.preventDefault(); setVerified(true); }}><label className="field"><span>Access email</span><input className="input" type="email" required defaultValue="reviewer@northfield.example" /></label><label className="field"><span>One-time access code</span><input className="input mono" inputMode="numeric" required defaultValue="418204" /></label><button className="button button-primary button-full" type="submit" data-od-id="verify-recipient-access">Verify exact access</button></form>}
      {verified ? <Link className="button button-primary button-full" to="/recipient-access/ra-018/viewer">Enter secure Viewer<ArrowRight aria-hidden="true" size={16} /></Link> : null}
      <Link className="text-link recipient-help-link" to="/recipient-access/ra-018/unavailable">Access unavailable?</Link>
    </section>
  );
}

export function RecipientViewerScreen() {
  const [page, setPage] = useState(18);
  return (
    <section className="recipient-viewer" aria-labelledby="recipient-viewer-title" data-od-id="recipient-exact-revision-viewer">
      <header className="viewer-toolbar"><div><p className="eyebrow">CIM · Revision 0.4</p><h1 id="recipient-viewer-title">Project Northstar</h1></div><div className="viewer-status"><StatusBadge tone="success">Authorization active</StatusBadge><span><Clock3 aria-hidden="true" size={14} />Until 2026-08-18 18:00 ET</span></div></header>
      <div className="viewer-layout"><aside className="viewer-pages" aria-label="Reader Copy pages"><button type="button" onClick={() => setPage(1)} className={page === 1 ? 'active' : ''}><span className="mono">01</span><strong>Cover</strong></button><button type="button" onClick={() => setPage(18)} className={page === 18 ? 'active' : ''}><span className="mono">18</span><strong>Financial overview</strong></button><button type="button" onClick={() => setPage(27)} className={page === 27 ? 'active' : ''}><span className="mono">27</span><strong>Growth plan</strong></button></aside><article className="reader-page" aria-label={`Reader Copy page ${page}`}><div className="reader-page-header"><span className="mono">PROJECT NORTHSTAR · SYNTHETIC</span><span className="mono">PAGE {page}</span></div>{page === 18 ? <><h2>Financial overview</h2><p>The following figures are synthetic Project Northstar demo data.</p><div className="reader-metrics"><article><span>FY2025E Revenue</span><strong className="mono">$94.6m</strong></article><article><span>Adjusted EBITDA</span><strong className="mono">$17.8m</strong></article><article><span>Margin</span><strong className="mono">18.8%</strong></article></div><div className="reader-chart" role="img" aria-label="Synthetic revenue bar chart from FY2023A to FY2025E"><div style={{height:'52%'}}><span>2023A</span></div><div style={{height:'72%'}}><span>2024A</span></div><div style={{height:'92%'}}><span>2025E</span></div></div></> : page === 1 ? <div className="reader-cover"><span>Confidential Information Memorandum</span><h2>Project Northstar</h2><p>Revision 0.4 · Authorized exactly for Northfield Capital</p></div> : <><h2>Growth plan</h2><p>Expand growth through pricing discipline, field efficiency, and controlled M&A. All statements are synthetic demo content.</p><ul className="plain-list"><li>Optimize regional customer density</li><li>Improve service mix and renewal quality</li><li>Screen opportunities against explicit return thresholds</li></ul></> }<div className="reader-watermark">NORTHFIELD CAPITAL · RA-018 · SYNTHETIC</div></article><aside className="viewer-boundary"><LockKeyhole aria-hidden="true" size={18} /><h2>Exact access boundary</h2><dl className="key-value-list"><div><dt>Visible</dt><dd>CIM Reader Copy 0.4</dd></div><div><dt>Not visible</dt><dd>Native, Evidence, Notes, other Revisions</dd></div><div><dt>Download</dt><dd>Blocked</dd></div><div><dt>Forwarding</dt><dd>Blocked</dd></div></dl><p>View events are recorded in the Deal's external-use history.</p></aside></div>
    </section>
  );
}

export function RecipientUnavailableScreen() {
  return (
    <section className="recipient-access-panel" aria-labelledby="recipient-unavailable-title" data-od-id="recipient-unavailable-screen"><AlertTriangle aria-hidden="true" size={28} /><p className="eyebrow">Access unavailable</p><h1 id="recipient-unavailable-title">This exact access is currently unavailable</h1><p>Possible reasons include expired or revoked authorization, a Revision mismatch, failed identity verification, or upstream QC or Review blocking circulation again.</p><div className="recipient-boundary-note"><ShieldCheck aria-hidden="true" size={18} /><p>To protect the transaction boundary, this page does not reveal whether a Deal, file, Banker, or other Recipient exists.</p></div><div className="recipient-actions"><Link className="button button-primary" to="/recipient-access/ra-018">Verify access again</Link><a className="text-link" href="mailto:authorized-sender@example.com">Contact authorized sender</a></div></section>
  );
}
