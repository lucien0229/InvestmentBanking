const chapters = [
  ["package-outcome", "Package outcome and source lineage", "Inspect the complete synthetic Controlled Auction Execution Package and its source lineage."],
  ["ebitda-conflict", "EBITDA conflict", "Both the $18.4m and $17.8m EBITDA Claims remain visible; the recording shows a scoped disposition rather than overwrite or averaging."],
  ["cash-extraction", "Cash extraction", "The original $6.2m Cash extraction remains visible alongside the Balance Sheet source value of $4.7m."],
  ["cash-correction", "Cash correction", "A synthetic Banker records the correction with actor and reason evidence."],
  ["deterministic-recovery", "Deterministic recovery", "The deterministic tie-out changes by exactly $1.5m, from $1.5m to $0.0m."],
  ["affected-outputs", "Affected outputs and readiness", "The workbook, CIM, Reader Copy, QC and Package Readiness consequences are shown separately."],
  ["revision-boundary", "Revision boundary", "Appending SR-006 creates Revision 0.4 and preserves Revision 0.3 history."],
  ["authorization-boundary", "Authorization boundary", "Revision 0.3 authorization does not carry to Revision 0.4."],
  ["manifest-download", "Exact downloads", "Rights-cleared synthetic files, control records and archive manifest are bound to their exact Revision and hashes."],
] as const;

export default function RecordedWalkthroughPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 64px" }}>
      <a href="#recorded-content" style={{ position: "absolute", left: -10000 }}>Skip to main content</a>
      <div id="recorded-content">
      <a href="/project-northstar" style={{ color: "#16724b" }}>← Interactive Project Northstar proof</a>
      <p style={{ fontFamily: "monospace", fontSize: 12, letterSpacing: 1 }}>RESOURCES / ACCESSIBLE RECORDED WALKTHROUGH</p>
      <h1>Project Northstar recorded control-loop walkthrough</h1>
      <p role="note" style={{ background: "#edf6f1", border: "1px solid #a9d5bd", padding: 16 }}>Every company, source, value, action and artifact is synthetic. This recording demonstrates the product interaction and control model; it is not evidence that production processing or security requirements have passed.</p>
      <p>This transcript and chapter route expose the same facts and continuation actions as the interactive proof. Watching this route does not emit interactive-completion events.</p>
      <section aria-labelledby="recorded-facts-heading">
        <h2 id="recorded-facts-heading">Recorded facts</h2>
        <h3>Source lineage and claims</h3>
        <ul>
          <li>synthetic-sr-002 Draft CIM — PPTX slide 3, label CLM-018 — EBITDA Claim $18.4m.</li>
          <li>synthetic-sr-003 Management Model — XLSX Operating Case!F42 — EBITDA Claim $17.8m.</li>
          <li>synthetic-sr-005 Balance Sheet extraction — XLSX Balance Sheet!F28 — Cash $6.2m corrected to source value $4.7m.</li>
          <li>synthetic-sr-006 July Actuals — XLSX Actuals!F28 — appended only in Revision 0.4.</li>
        </ul>
        <h3>Control evidence</h3>
        <ul>
          <li>Both EBITDA Claims remain retained under a scoped simulated disposition; overwrite and averaging are forbidden.</li>
          <li>Cash correction preserves $6.2m, records $4.7m, changes exactly $1.5m, and records actor synthetic-prospective-banker plus the Balance Sheet!F28 reason.</li>
          <li>Deterministic recovery changes the tie-out from $1.5m to $0.0m; affected scope is workbook, CIM, Reader Copy, QC and Package Readiness, with circulation blocked.</li>
          <li>Revision 0.3 is preserved with its exact-only authorization; Revision 0.4 is not authorized and does not carry forward Revision 0.3 authority.</li>
          <li>Rights-cleared synthetic XLSX, PPTX, DOCX, PDF, control-records and archive-manifest files expose exact Revision-bound SHA-256 metadata through the interactive route.</li>
        </ul>
      </section>
      <nav aria-label="Walkthrough chapters"><h2>Chapters</h2><ol>{chapters.map(([state, title, transcript]) => <li key={state} style={{ margin: "14px 0" }}><a href={`/project-northstar/${state}`}>{title}</a><p>{transcript}</p></li>)}</ol></nav>
      <section aria-labelledby="continuation-heading"><h2 id="continuation-heading">Continue</h2><p><a href="/project-northstar">Open the interactive proof</a> · <a href="/pricing">Review pricing</a> · <a href="/qualification">Check qualification</a></p></section>
      <p role="status">Interactive completion emitted by this route: <strong>no</strong>.</p>
      </div>
    </main>
  );
}
