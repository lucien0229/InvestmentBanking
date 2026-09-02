import { PublicShell } from "../../components/deal-control/ui";

export default function CapabilityManifestPage() {
  return <PublicShell><main className="dc-page">
    <a href="/pricing">← Pricing</a>
    <p className="dc-eyebrow">CAPABILITY MANIFEST / V1.0.0</p>
    <h1>Current verified product boundary</h1>
    <p>This public manifest describes product capability and commercial capacity. It does not authorize any Source, Recipient, External-Use, or Human Decision action.</p>
    <section style={{ background: "white", border: "1px solid #ccd5d8", padding: 24 }}>
      <h2>Individual Deal Desk</h2>
      <ul><li>One named Individual Banker and two concurrent Active Deal Workspaces.</li><li>Per Active Deal per billing month: 250 newly processed files, 2,500 newly processed logical pages, 25 GB active storage, and 20 Full-Workflow Operations.</li><li>Evidence inspection, correction, deterministic validation, QC, Review, Human Decision, targeted Revision, Internal Controlled Export, and product-failure recovery are unmetered.</li><li>Unsupported or rights-limited inputs remain blocked or limited by paid preflight; a purchase never substitutes for Source authority.</li></ul>
    </section>
  </main></PublicShell>;
}
