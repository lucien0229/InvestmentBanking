import { PublicShell } from "../../components/deal-control/ui";

export default function PricingPage() {
  return (
    <PublicShell><main className="dc-page" id="main-content">
      <a href="/project-northstar">← Project Northstar proof</a>
      <p className="dc-eyebrow">DEAL CONTROL / PRICING</p>
      <h1>One named Banker, the same complete capability on either term</h1>
      <p>Pricing is a continuation action after the synthetic proof. All commercial terms are visible before payment confirmation. This page does not create an Account, accept payment, or establish Deal authority; purchase does not establish Source rights or external-use authority.</p>
      <section aria-label="Pricing plans" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16, marginTop: 28 }}>
        <article style={{ background: "white", border: "1px solid #ccd5d8", padding: 24 }}><h2>Monthly</h2><p style={{ fontSize: 36, fontFamily: "monospace", margin: "12px 0" }}>$995</p><p>Per month · monthly renewal</p></article>
        <article style={{ background: "white", border: "1px solid #ccd5d8", padding: 24 }}><h2>Annual prepaid</h2><p style={{ fontSize: 36, fontFamily: "monospace", margin: "12px 0" }}>$10,950</p><p>Per year paid upfront · $912.50/month equivalent · save $990 (8.29%) · annual renewal</p></article>
      </section>
      <section style={{ background: "white", border: "1px solid #ccd5d8", padding: 24, marginTop: 16 }}>
        <h2>Included contract</h2>
        <dl><dt>Account boundary</dt><dd>1 named Individual Banker</dd><dt>Active Deal capacity</dt><dd>2 concurrent Active Deal Workspaces</dd><dt>Allowances</dt><dd>Per Active Deal per billing month: 250 newly processed files, 2,500 newly processed logical pages, 25 GB active storage, and 20 Full-Workflow Operations.</dd><dt>Add-ons</dt><dd>Additional Active Deal: $500 monthly / $5,500 annual. Intensive processing: $1,000 per affected Active Deal-month. Archive capacity: $50 monthly per additional 250 GB after export/delete is offered.</dd><dt>Unmetered actions</dt><dd>Evidence inspection, correction, deterministic validation, QC, Review, Human Decision, targeted Revision, Internal Controlled Export, and product-failure recovery</dd><dt>Guarantee</dt><dd>Conditional 14-day First-Deal Control-Loop Guarantee for the confirmed supported, authorized, preflighted product-side failure conditions</dd><dt>Cancellation</dt><dd>Cancels the next renewal only; the paid term remains available, followed by 30-day Post-Term Access</dd><dt>Tax</dt><dd>Applicable tax is calculated before payment confirmation</dd></dl>
      </section>
      <p style={{ marginTop: 24 }}><a href="/qualification">Check qualification</a> · <a href="/capability-manifest">View Capability Manifest</a> · <a href="/account-access?return_to=%2Fcheckout%2Forder">Continue to account access</a></p>
    </main></PublicShell>
  );
}
