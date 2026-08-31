export default function QualificationPage() {
  return (
    <main id="main-content" style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 64px" }}>
      <a href="#main-content" style={{ position: "absolute", left: -10000 }}>Skip to main content</a>
      <a href="/project-northstar" style={{ color: "#16724b" }}>← Project Northstar proof</a>
      <p style={{ fontFamily: "monospace", fontSize: 12, letterSpacing: 1 }}>QUALIFICATION / NON-CONFIDENTIAL CHECK</p>
      <h1>Check qualification</h1>
      <p>This check is informational and does not accept Deal Material. Do not submit confidential files or claims here.</p>
      <ul>
        <li>Describe the sell-side auction objective without confidential content.</li>
        <li>Confirm that a Banker remains responsible for source, conflict, QC and external-use decisions.</li>
        <li>Continue to Account Access only when the product boundary fits your workflow.</li>
      </ul>
      <p><a href="/pricing">Review pricing</a> · <a href="/account-access">Open Account Access</a></p>
    </main>
  );
}
