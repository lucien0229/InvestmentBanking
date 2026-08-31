"use client";

import { useEffect, useState } from "react";

const dealId = "00000000-0000-4000-8000-000000000101";

type Overview = {
  account: { display_name: string };
  deal: { id: string; name: string; client_label: string; transaction_subject: string; mandate_objective: string };
  workspace: { id: string; posture: string; posture_version: number; current_pointers: { overview_revision_id: string } };
  displayed_state: { stage: string; materiality: string; source_posture: string; next_controlled_action: string };
};

export default function DealOverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [jobLink, setJobLink] = useState("");
  const [startingJob, setStartingJob] = useState(false);
  useEffect(() => {
    fetch(`/api/v1/deals/${dealId}/overview`).then(async (response) => {
      const body = await response.json();
      if (!response.ok) return setError(body.detail ?? "The Deal Overview is unavailable.");
      setOverview(body);
    }).catch(() => setError("The API could not be reached."));
  }, []);

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: 40 }}>
      <p style={{ fontFamily: "monospace", fontSize: 12 }}>BANKER ACCOUNT / DEAL WORKSPACE</p>
      <h1>Project Northstar — Deal Overview</h1>
      {error && <div role="alert" style={{ border: "1px solid #a22", padding: 16 }}>{error} <a href="/account-access">Return to Account Access</a></div>}
      {overview && <>
        <section aria-label="Deal identity" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <article><h2>Account</h2><p>{overview.account.display_name}</p></article>
          <article><h2>Deal</h2><p>{overview.deal.name}</p><p>{overview.deal.client_label} / {overview.deal.transaction_subject}</p></article>
          <article><h2>Workspace</h2><p>Posture: {overview.workspace.posture}</p><p>Revision: {overview.workspace.current_pointers.overview_revision_id}</p></article>
        </section>
        <section aria-label="Displayed state" style={{ marginTop: 24, border: "1px solid #ccd5d8", background: "white", padding: 20 }}>
          <h2>Current controlled state</h2>
          <dl><dt>Business stage</dt><dd>{overview.displayed_state.stage}</dd><dt>Source posture</dt><dd>{overview.displayed_state.source_posture}</dd><dt>Next controlled action</dt><dd>{overview.displayed_state.next_controlled_action}</dd></dl>
          <p style={{ fontFamily: "monospace", fontSize: 12 }}>Account/Deal authorization is checked by the API and database policy for this exact object identity.</p>
        </section>
        <section aria-label="Reference workspace operation" style={{ marginTop: 24, border: "1px solid #ccd5d8", background: "white", padding: 20 }}>
          <h2>Reference workspace operation</h2>
          <p>Run the synthetic Project Northstar workspace build through the durable Job controls.</p>
          <button type="button" disabled={startingJob} onClick={async () => {
            setStartingJob(true);
            setError("");
            try {
              const response = await fetch(`/api/v1/deals/${dealId}/reference-jobs`, {
                method: "POST",
                headers: { "content-type": "application/json", "idempotency-key": `reference-ui-${crypto.randomUUID()}` },
                body: JSON.stringify({ purpose: "reference_workspace_build", inputs: { source_packet: "northstar-source-packet-v1", requested_scope: "synthetic_reference_fixture" } }),
              });
              const body = await response.json();
              if (!response.ok) setError(body.detail ?? "The Reference Job could not be started.");
              else setJobLink(`/app/deals/project-northstar/actions/jobs/${body.id}`);
            } catch {
              setError("The API could not be reached.");
            } finally {
              setStartingJob(false);
            }
          }}>{startingJob ? "Starting…" : "Start reference operation"}</button>
          {jobLink && <p><a href={jobLink}>Open durable Job detail</a></p>}
          <p style={{ fontFamily: "monospace", fontSize: 12 }}>Job state, checkpoints, heartbeat and recovery are authoritative in the versioned API.</p>
        </section>
      </>}
    </main>
  );
}
