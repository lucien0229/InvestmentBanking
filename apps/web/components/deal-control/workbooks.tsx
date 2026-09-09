"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { PageHeader, StatePanel, StatusBadge } from "./ui";
const dealBase = (dealId: string) => `/app/deals/${dealId}`;

type Deliverable = {
  id: string;
  title: string;
  purpose: string;
  audience: string;
  confidentiality: string;
  current_revision_id: string | null;
  row_version: number;
  current_revision_ordinal: number | null;
  reader_available: boolean;
  stage_applicability?: string;
};
type Artifact = {
  id: string;
  role: string;
  path_label: string;
  media_type: string;
  plaintext_sha256: string;
  byte_length: number;
};
type Revision = {
  id: string;
  deliverable_id: string;
  ordinal: number;
  purpose: string;
  audience: string;
  confidentiality: string;
  basis_digest: string;
  created_at: string;
  build_input: { limitations: string[] };
  artifacts: Artifact[];
  jobs: Array<{
    id: string;
    job_type: string;
    state: string;
    row_version: number;
    problem: { code: string } | null;
  }>;
};
type Requirement = {
  code: string;
  gate: string;
  outcome: string;
  recovery: string;
};
type Readiness = {
  acceptance_profile?: string;
  limitations?: string[];
  posture: string;
  requirements: Requirement[];
  blockers: Requirement[];
};
type Finding = {
  id: string;
  finding_code: string;
  severity: string;
  detail: string;
  consequence: string;
  revision_id: string;
};
type Review = {
  id: string;
  standard: string;
  conclusion: string;
  purpose: string;
  audience: string;
  rationale: string;
  created_at: string;
};
type Lineage = {
  id: string;
  fact_id: string | null;
  assumption_id: string | null;
  decision_id: string;
  source_record_id: string | null;
  source_locator: Record<string, unknown>;
  calculation_run_id: string;
  model_version_id: string;
  scenario_version_id: string;
  artifact_role: string;
  region: {
    region_key: string;
    native_locator: {
      sheet: string;
      range: string;
      output_sheet: string;
      output_range: string;
      reader_pages: number[];
    };
  };
};
type Report = {
  native_pages: Array<{ sheet: string; page: number; image: string; render_basis?: string; range?: string }>;
  pages: Array<{ page: number; image: string; text: string }>;
  cells: Array<{
    sheet: string;
    cells: Array<{
      cell: string;
      formula: string | null;
      value: string | number | null;
      number_format: string;
      comment: string | null;
    }>;
  }>;
  limitations: string[];
};
const label = (text: string) =>
  text.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
const pendingCommands = new Map<string, string>();
async function request<T>(
  url: string,
  body?: unknown,
  etag?: number | string,
): Promise<T> {
  const fingerprint =
    body === undefined ? null : JSON.stringify([url, body, etag]);
  const commandKey = fingerprint
    ? (pendingCommands.get(fingerprint) ?? crypto.randomUUID())
    : "";
  if (fingerprint) pendingCommands.set(fingerprint, commandKey);
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...(body === undefined
      ? {}
      : {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "idempotency-key": commandKey,
            ...(etag
              ? { "if-match": typeof etag === "string" ? etag : `"${etag}"` }
              : {}),
          },
          body: JSON.stringify(body),
        }),
  });
  const payload = await response.json();
  if (fingerprint && (response.ok || response.status < 500))
    pendingCommands.delete(fingerprint);
  if (!response.ok)
    throw new Error(
      `${label(payload.code ?? "request_failed")}. ${label(payload.recovery_action ?? "Retry")}.`,
    );
  return payload.data as T;
}
function Outcome({ value }: { value: string }) {
  return (
    <StatusBadge
      tone={
        value === "passed" || value === "circulation_candidate"
          ? "success"
          : value === "failed" || value === "blocked" || value === "critical"
            ? "critical"
            : value === "missing" || value === "working_draft"
              ? "warning"
              : "info"
      }
    >
      {label(value)}
    </StatusBadge>
  );
}
function ShortId({ id }: { id: string | null }) {
  return id ? (
    <span className="dc-mono" title={id}>
      {id.slice(0, 8)}
    </span>
  ) : (
    <span>—</span>
  );
}
function ErrorPanel({ message }: { message: string }) {
  return (
    <StatePanel
      tone="critical"
      label="Request needs attention"
      title={message}
    />
  );
}
function DecisionInspection({ dealId, id }: { dealId: string; id: string }) {
  const [decision, setDecision] = useState<Record<string, unknown> | null>(
    null,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function inspect() {
    setBusy(true);
    setError("");
    try {
      const items = await request<Record<string, unknown>[]>(
        `/api/v1/deals/${dealId}/human-decisions/${id}`,
      );
      if (!items[0]) throw new Error("Decision is unavailable in this Deal.");
      setDecision(items[0]);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Decision inspection failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details
      onToggle={(event) => {
        if (event.currentTarget.open && !decision && !busy) void inspect();
      }}
    >
      <summary>
        Inspect Decision <ShortId id={id} />
      </summary>
      {busy ? <p role="status">Loading recorded Decision…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {decision ? (
        <dl className="dc-workbook-metadata">
          {[
            "question",
            "selected_option_code",
            "rationale",
            "scope",
            "purpose",
            "controlled_object_id",
            "controlled_object_version",
            "decided_by_actor_id",
            "recorded_at",
            "conditions",
          ].map((key) => (
            <div key={key}>
              <dt>{label(key)}</dt>
              <dd>
                {typeof decision[key] === "object"
                  ? JSON.stringify(decision[key])
                  : String(decision[key] ?? "—")}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </details>
  );
}
function Preview({
  dealId,
  artifact,
  caption,
  zoom,
}: {
  dealId: string;
  artifact: Artifact | undefined;
  caption: string;
  zoom: number;
}) {
  const artifactId = artifact?.id;
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    let objectUrl = "";
    setUrl("");
    setError("");
    if (!artifactId) return;
    (async () => {
      try {
        const grant = await request<{ grant_token: string }>(
          `/api/v1/deals/${dealId}/artifacts/${artifactId}/preview-grants`,
          { purpose: "artifact_inspection" },
        );
        const response = await fetch(
          `/api/v1/deals/${dealId}/artifacts/${artifactId}/preview`,
          {
            credentials: "same-origin",
            cache: "no-store",
            headers: { Authorization: `ObjectGrant ${grant.grant_token}` },
          },
        );
        if (!response.ok)
          throw new Error(
            "Preview unavailable. Request a new inspection grant.",
          );
        objectUrl = URL.createObjectURL(await response.blob());
        if (!disposed) setUrl(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      } catch (e) {
        if (!disposed)
          setError(e instanceof Error ? e.message : "Preview unavailable");
      }
    })();
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [dealId, artifactId]);
  return (
    <figure className="dc-workbook-preview">
      <figcaption>
        {caption}
        {artifact ? (
          <small className="dc-mono" title={artifact.plaintext_sha256}>
            SHA-256 {artifact.plaintext_sha256.slice(0, 12)}
          </small>
        ) : null}
      </figcaption>
      {error ? (
        <p role="alert">{error}</p>
      ) : url ? (
        <div className="dc-workbook-preview-image">
          <img
            src={url}
            alt={caption}
            style={{ width: zoom ? `${zoom}px` : "100%" }}
          />
        </div>
      ) : (
        <p>
          {artifact
            ? "Loading protected preview…"
            : "No page in the exact artifact. Inspect QC coverage."}
        </p>
      )}
    </figure>
  );
}

export function TeaserSurface({ dealId }: { dealId: string }) {
  const [items, setItems] = useState<Deliverable[]>([]);
  const [revision, setRevision] = useState<Revision | null>(null);
  const [lineage, setLineage] = useState<Array<Record<string, unknown>>>([]);
  const [tab, setTab] = useState("Overview");
  const current = items[0];
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/deals/${dealId}/teasers`, { credentials: "same-origin", cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then(async (payload) => {
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        if (cancelled) return;
        setItems(rows);
        const row = rows[0];
        if (!row?.current_revision_id) return;
        const revisionResponse = await fetch(`/api/v1/deals/${dealId}/deliverables/${row.id}/revisions/${row.current_revision_id}`, { credentials: "same-origin", cache: "no-store" });
        const revisionPayload = revisionResponse.ok ? await revisionResponse.json() : null;
        if (cancelled) return;
        setRevision(revisionPayload?.data ?? null);
        const lineageResponse = await fetch(`/api/v1/deals/${dealId}/teasers/${row.id}/revisions/${row.current_revision_id}/lineage`, { credentials: "same-origin", cache: "no-store" });
        const lineagePayload = lineageResponse.ok ? await lineageResponse.json() : null;
        if (!cancelled) setLineage(Array.isArray(lineagePayload?.data) ? lineagePayload.data : []);
      }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [dealId]);
  const base = dealBase(dealId);
  const stageRequired = current?.stage_applicability !== "not_stage_required";
  const tabs = ["Overview", "Native / Reader", "Lineage", "Review & QC"];
  return <div data-od-id="teaser-deliverable-detail" className="dc-analysis-page">
    <PageHeader eyebrow="Deliverable · Teaser" title="Teaser" description="The Native Artifact, Reader Copy, Revision, Lineage, Review, QC and external authority remain separate control states." actions={<><StatusBadge tone="warning">{stageRequired ? "Review required" : "Not stage-required"}</StatusBadge><span className="dc-mono">teaser-1.0.0</span></>} />
    <div className="dc-grid-three"><article className="dc-surface-card"><span className="dc-eyebrow">Applicability</span><h2>{stageRequired ? "Preparation" : "Not stage-required"}</h2><p>{stageRequired ? "Approved disclosure set and controlled basis required before circulation." : "No missing-artifact blocker is created."}</p><StatusBadge tone={stageRequired ? "warning" : "info"}>{stageRequired ? "Proposal-only" : "No blocker"}</StatusBadge></article><article className="dc-surface-card"><span className="dc-eyebrow">Current Revision</span><h2>{revision?.ordinal ? `Revision ${revision.ordinal}` : "Pending"}</h2><p className="dc-mono">{revision?.id ?? current?.current_revision_id ?? "No exact Revision"}</p><StatusBadge tone={revision ? "success" : "warning"}>{revision ? "Exact identity" : "Not generated"}</StatusBadge></article><article className="dc-surface-card"><span className="dc-eyebrow">External use</span><h2>Blocked</h2><p>Proposal-only until Review, QC and exact External-Use Decision.</p><StatusBadge tone="critical">Not authorized</StatusBadge></article></div>
    <nav className="dc-page-actions" aria-label="Teaser detail views">{tabs.map((name) => <button key={name} type="button" className={`dc-button ${tab === name ? "" : "dc-button-secondary"}`} onClick={() => setTab(name)}>{name}</button>)}</nav>
    {tab === "Overview" ? <section className="dc-surface-card"><h2>Deliverable identity and control boundary</h2><dl className="dc-grid-two"><div><dt>Purpose</dt><dd>{current?.purpose ?? "Preparation marketing"}</dd></div><div><dt>Audience</dt><dd>{current?.audience ?? "Internal Banker"}</dd></div><div><dt>Confidentiality</dt><dd>{current?.confidentiality ?? "confidential"}</dd></div><div><dt>Source posture</dt><dd>Approved disclosure set · Evidence · Facts/Assumptions</dd></div></dl><div className="dc-page-actions"><a className="dc-button dc-button-secondary" href={`${base}/execution-package`}>Return to Execution Package</a>{current ? <a className="dc-button dc-button-secondary" href={`${base}/deliverables/${current.id}`}>Open canonical Deliverable</a> : null}</div></section> : null}
    {tab === "Native / Reader" ? <section className="dc-surface-card" data-od-id="teaser-native-reader"><h2>Exact Native / Reader pair</h2>{revision?.artifacts?.length ? <div className="dc-deliverable-rows">{revision.artifacts.map((artifact) => <article className="dc-deliverable-row" key={artifact.id}><div><strong>{artifact.path_label}</strong><p>{artifact.role === "native" ? "Editable Native Artifact · PPTX" : "Exact Reader Copy · PDF"}</p><span className="dc-mono">sha256:{artifact.plaintext_sha256}</span></div><StatusBadge tone="success">Registered</StatusBadge></article>)}</div> : <p className="dc-inline-notice">No authenticated artifact receipt was returned; this view remains inspect-only.</p>}<p className="dc-inline-notice">Declared renderer: LibreOffice Impress development profile. Microsoft 365 compatibility remains an explicit readiness limitation.</p></section> : null}
    {tab === "Lineage" ? <section className="dc-surface-card" data-od-id="teaser-lineage"><h2>Point-of-use lineage</h2>{lineage.length ? <div className="dc-table-wrap"><table><thead><tr><th>Section / claim</th><th>Evidence</th><th>Fact / Assumption</th><th>Native</th><th>Reader</th></tr></thead><tbody>{lineage.map((row) => <tr key={String(row.id)}><td><strong>{String(row.section_key)}</strong><br /><span className="dc-mono">{String(row.claim_key)}</span></td><td className="dc-mono">{JSON.stringify(row.evidence_refs ?? [])}</td><td className="dc-mono">{JSON.stringify([...(Array.isArray(row.fact_refs) ? row.fact_refs : []), ...(Array.isArray(row.assumption_refs) ? row.assumption_refs : [])])}</td><td className="dc-mono">{JSON.stringify(row.native_locator)}</td><td className="dc-mono">{JSON.stringify(row.reader_locator)}</td></tr>)}</tbody></table></div> : <p className="dc-inline-notice">Lineage receipt is available after the exact Revision is generated.</p>}</section> : null}
    {tab === "Review & QC" ? <section className="dc-surface-card" data-od-id="teaser-review-qc"><h2>Review, QC and readiness</h2><div className="dc-grid-two"><p>Native structure, citation lineage, semantic content, native/Reader parity and confidentiality are independent checks. A material mismatch blocks circulation for this Revision only.</p><p>Signed manifest, licensed Office observer and professional suitability remain explicit readiness requirements. No check authorizes external use.</p></div><div className="dc-page-actions"><a className="dc-button dc-button-secondary" href={`${base}/review-readiness`}>Open Package Readiness</a>{revision ? <a className="dc-button dc-button-secondary" href={`${base}/deliverables/${current?.id}/revisions/${revision.id}`}>Inspect Revision</a> : null}</div></section> : null}
  </div>;
}

export function CimSurface({ dealId }: { dealId: string }) {
  const [items, setItems] = useState<Deliverable[]>([]);
  const [revision, setRevision] = useState<Revision | null>(null);
  const [lineage, setLineage] = useState<Array<Record<string, unknown>>>([]);
  const [tab, setTab] = useState("Overview");
  const current = items[0];
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/deals/${dealId}/cims`, { credentials: "same-origin", cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then(async (payload) => {
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        if (cancelled) return;
        setItems(rows);
        const row = rows[0];
        if (!row?.current_revision_id) return;
        const revisionResponse = await fetch(`/api/v1/deals/${dealId}/deliverables/${row.id}/revisions/${row.current_revision_id}`, { credentials: "same-origin", cache: "no-store" });
        const revisionPayload = revisionResponse.ok ? await revisionResponse.json() : null;
        if (cancelled) return;
        setRevision(revisionPayload?.data ?? null);
        const lineageResponse = await fetch(`/api/v1/deals/${dealId}/cims/${row.id}/revisions/${row.current_revision_id}/lineage`, { credentials: "same-origin", cache: "no-store" });
        const lineagePayload = lineageResponse.ok ? await lineageResponse.json() : null;
        if (!cancelled) setLineage(Array.isArray(lineagePayload?.data) ? lineagePayload.data : []);
      }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [dealId]);
  const base = dealBase(dealId);
  const stageRequired = current?.stage_applicability !== "not_stage_required";
  const tabs = ["Overview", "Native / Reader", "Lineage", "Reviews", "Revisions", "External Use"];
  return <div data-od-id="cim-deliverable-detail" className="dc-analysis-page">
    <PageHeader eyebrow="Deliverable · DEL-004" title="Confidential Information Memorandum" description="The CIM's Native Artifact, Reader Copy, Revision, Lineage, Review, QC and external authority remain separate control states." actions={<><StatusBadge tone="warning">{stageRequired ? "Revision · re-review required" : "Not stage-required"}</StatusBadge><span className="dc-mono">cim-1.0.0</span></>} />
    <div className="dc-grid-three" data-od-id="cim-property-strip"><article className="dc-surface-card"><span className="dc-eyebrow">Format</span><h2>PPTX + PDF</h2><p>Editable Native Artifact and exact Reader Copy.</p></article><article className="dc-surface-card"><span className="dc-eyebrow">Revision</span><h2>{revision?.ordinal ? `Revision ${revision.ordinal}` : "Pending"}</h2><p className="dc-mono">{revision?.id ?? current?.current_revision_id ?? "No exact Revision"}</p></article><article className="dc-surface-card"><span className="dc-eyebrow">Native</span><h2>{revision?.artifacts?.some((a) => a.role === "native") ? "Generated" : "Pending"}</h2><p>Banker-native PPTX structure.</p></article><article className="dc-surface-card"><span className="dc-eyebrow">Reader</span><h2>{revision?.artifacts?.some((a) => a.role === "reader") ? "Generated" : "Pending"}</h2><p>PDF from the exact Native Revision.</p></article><article className="dc-surface-card"><span className="dc-eyebrow">Parity</span><h2>Review required</h2><p>Native/Reader comparison remains exact-scope QC.</p><StatusBadge tone="warning">QC-022 scope</StatusBadge></article><article className="dc-surface-card"><span className="dc-eyebrow">External use</span><h2>Blocked</h2><p>Proposal-only until Review, QC and exact External-Use Decision.</p><StatusBadge tone="critical">Not authorized</StatusBadge></article></div>
    <nav className="dc-page-actions" aria-label="CIM detail views">{tabs.map((name) => <button key={name} type="button" className={`dc-button ${tab === name ? "" : "dc-button-secondary"}`} onClick={() => setTab(name)}>{name}</button>)}</nav>
    {tab === "Overview" ? <section className="dc-surface-card"><h2>Deliverable identity and control boundary</h2><dl className="dc-grid-two"><div><dt>Purpose</dt><dd>{current?.purpose ?? "Preparation marketing"}</dd></div><div><dt>Audience</dt><dd>{current?.audience ?? "Internal Banker"}</dd></div><div><dt>Confidentiality</dt><dd>{current?.confidentiality ?? "confidential"}</dd></div><div><dt>Source posture</dt><dd>Approved disclosure set · Evidence · Facts/Assumptions</dd></div></dl><div className="dc-page-actions"><a className="dc-button dc-button-secondary" href={`${base}/execution-package`}>Return to Execution Package</a>{current ? <a className="dc-button dc-button-secondary" href={`${base}/deliverables/${current.id}`}>Open canonical Deliverable</a> : null}</div></section> : null}
    {tab === "Native / Reader" ? <section className="dc-surface-card" data-od-id="cim-native-reader"><h2>Exact Native / Reader pair</h2>{revision?.artifacts?.length ? <div className="dc-deliverable-rows">{revision.artifacts.map((artifact) => <article className="dc-deliverable-row" key={artifact.id}><div><strong>{artifact.path_label}</strong><p>{artifact.role === "native" ? "Editable Native Artifact · PPTX" : "Exact Reader Copy · PDF"}</p><span className="dc-mono">sha256:{artifact.plaintext_sha256}</span></div><StatusBadge tone="success">Registered</StatusBadge></article>)}</div> : <p className="dc-inline-notice">No authenticated artifact receipt was returned; this view remains inspect-only.</p>}<p className="dc-inline-notice">Declared renderer: LibreOffice Impress development profile. Microsoft 365 compatibility remains an explicit readiness limitation.</p></section> : null}
    {tab === "Lineage" ? <section className="dc-surface-card" data-od-id="cim-lineage"><h2>Point-of-use lineage</h2>{lineage.length ? <div className="dc-table-wrap"><table><thead><tr><th>Section / claim</th><th>Evidence</th><th>Fact / Assumption</th><th>Native</th><th>Reader</th></tr></thead><tbody>{lineage.map((row) => <tr key={String(row.id)}><td><strong>{String(row.section_key)}</strong><br /><span className="dc-mono">{String(row.claim_key)}</span></td><td className="dc-mono">{JSON.stringify(row.evidence_refs ?? [])}</td><td className="dc-mono">{JSON.stringify([...(Array.isArray(row.fact_refs) ? row.fact_refs : []), ...(Array.isArray(row.assumption_refs) ? row.assumption_refs : [])])}</td><td className="dc-mono">{JSON.stringify(row.native_locator)}</td><td className="dc-mono">{JSON.stringify(row.reader_locator)}</td></tr>)}</tbody></table></div> : <p className="dc-inline-notice">Lineage receipt is available after the exact Revision is generated.</p>}</section> : null}
    {tab === "Reviews" ? <section className="dc-surface-card" data-od-id="cim-review-qc"><h2>Reviews, QC and readiness</h2><div className="dc-grid-two"><p>Native structure, citation lineage, semantic content, native/Reader parity and confidentiality are independent checks. A material mismatch blocks circulation for this Revision only.</p><p><strong>QC-022 · Native / Reader parity</strong><br />Targeted review is required before circulation. Findings retain exact artifact locations and do not carry forward.</p></div><div className="dc-page-actions"><a className="dc-button dc-button-secondary" href={`${base}/review-readiness`}>Open Package Readiness</a>{revision ? <a className="dc-button dc-button-secondary" href={`${base}/deliverables/${current?.id}/revisions/${revision.id}`}>Inspect Revision</a> : null}</div></section> : null}
    {tab === "Revisions" ? <section className="dc-surface-card"><h2>Revision history</h2><p className="dc-inline-notice">Current scope is bound to {revision?.id ?? "the pending exact Revision"}. Prior revisions remain immutable; Review, QC and authorization never carry forward automatically.</p></section> : null}
    {tab === "External Use" ? <section className="dc-surface-card"><h2>External-use boundary</h2><p>External use is blocked for this proposal-only CIM. An exact Revision, artifact hash, audience, purpose, conditions and Banker Decision are required before any authorization can be recorded.</p><StatusBadge tone="critical">No external authority</StatusBadge></section> : null}
  </div>;
}

export function AuctionControlWorkbookSurface({ dealId }: { dealId: string }) {
  const [items, setItems] = useState<Deliverable[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    fetch(`/api/v1/deals/${dealId}/auction-control-workbooks`, { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload) => { setItems(Array.isArray(payload?.data) ? payload.data : []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [dealId]);
  const current = items[0];
  return <div data-od-id="auction-control-workbook-surface">
    <PageHeader eyebrow="Deal workspace · Auction Control Workbook" title="Auction Control Workbook" description="The first visible view is an executive control surface over governed Buyer and process state. Native XLSX and Reader PDF share one exact Revision identity; neither becomes the source of truth." actions={<><StatusBadge tone="warning">External use blocked</StatusBadge><span className="dc-mono">auction-control-1.0.0</span></>} />
    <div className="dc-grid-three"><article className="dc-surface-card"><span className="dc-eyebrow">Native Artifact</span><h2>XLSX</h2><p>{current?.reader_available ? "Exact paired output available" : "Generation required"}</p><StatusBadge tone={current?.reader_available ? "success" : "warning"}>{current?.reader_available ? "Paired" : "Pending"}</StatusBadge></article><article className="dc-surface-card"><span className="dc-eyebrow">Reader Copy</span><h2>PDF</h2><p>Exact Revision, manifest and lineage identity</p><StatusBadge tone="info">Reader</StatusBadge></article><article className="dc-surface-card"><span className="dc-eyebrow">Readiness</span><h2>Review required</h2><p>No aggregate ready / OK score is calculated</p><StatusBadge tone="warning">Blocker-first</StatusBadge></article></div>
    <section className="dc-surface-card"><h2>Executive Control · first tab</h2><div className="dc-table-wrap"><table><thead><tr><th>Process family</th><th>Current state</th><th>Authoritative boundary</th><th>Next controlled action</th></tr></thead><tbody>{[["Buyer universe","Candidate / Approved Buyer distinct","Buyer Candidate + typed Human Decision","Review exact version and restrictions"],["Outreach / NDA / Access","Not applicable until authority exists","No later process object fabricated","Continue in its dedicated ticket"],["Diligence / Bids / Milestones","Not applicable until authority exists","Planned, occurred and current remain distinct","Continue in its dedicated ticket"],["History / lineage","Current snapshot","Stable identity → exact cell/range → Reader page","Inspect manifest and QC"]].map(([family,state,boundary,next]) => <tr key={family}><td><strong>{family}</strong></td><td><StatusBadge tone={state.startsWith("Not") ? "info" : "warning"}>{state}</StatusBadge></td><td>{boundary}</td><td>{next}</td></tr>)}</tbody></table></div><p className="dc-inline-notice">{loaded ? (current ? `Authoritative deliverable ${current.id} loaded for this Deal.` : "No authenticated deliverable receipt was returned; the control view remains inspect-only.") : "Loading authoritative deliverable receipt…"}</p></section>
    <section className="dc-surface-card"><h2>Stable identity and Office boundary</h2><div className="dc-grid-two"><p>Buyer Candidate, approval, process state, history and exact workbook ranges remain linked bidirectionally in the manifest lineage.</p><p>Declared path: open → inspect → edit → save → reopen → reimport. Protected Banker Notes must survive every supported round trip.</p></div><div className="dc-page-actions"><a className="dc-button dc-button-secondary" href={`/app/deals/${dealId}/auction-process`}>Inspect Buyer universe</a><a className="dc-button dc-button-secondary" href={`/app/deals/${dealId}/execution-package`}>Return to Execution Package</a></div></section>
  </div>;
}

export function WorkbookSurface({
  dealId,
  slug,
}: {
  dealId: string;
  slug: string[];
}) {
  const api = `/api/v1/deals/${dealId}`;
  const base = `/app/deals/${dealId}`;
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Deliverable | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [revision, setRevision] = useState<Revision | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [lineage, setLineage] = useState<Lineage[]>([]);
  const [lineageSource, setLineageSource] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [tab, setTab] = useState(
    slug.includes("parity")
      ? "Native / Reader"
      : slug[0] === "review-readiness"
        ? "Review & QC"
        : "Overview",
  );
  const [query, setQuery] = useState("");
  const [sheet, setSheet] = useState("Valuation");
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(0);
  const [basis, setBasis] = useState<
    Array<{
      calculation_run_id: string;
      model_version_id: string;
      scenario_version_id: string;
      label: string;
    }>
  >([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [purpose, setPurpose] = useState("");
  const [audience, setAudience] = useState("");
  const [workObjectives, setWorkObjectives] = useState<
    Array<{ id: string; objective_text: string }>
  >([]);
  const [reviewStandard, setReviewStandard] = useState("method_review");
  const [creation, setCreation] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const load = useCallback(async () => {
    try {
      const items = await request<Deliverable[]>(`${api}/deliverables`);
      setDeliverables(items);
      setWorkObjectives(
        await request<Array<{ id: string; objective_text: string }>>(
          `${api}/work-objectives`,
        ),
      );
      const current =
        items.find((d) => d.id === slug[1]) ??
        (slug[0] === "review-readiness" ? items[0] : undefined);
      setSelected(current ?? null);
      if (slug[0] === "deliverables" && slug[1] && !current) {
        throw new Error(
          "Workbook unavailable in this Deal. Return to Execution Package.",
        );
      }
      if (current) {
        const history = await request<Revision[]>(
          `${api}/deliverables/${current.id}/revisions`,
        );
        setRevisions(history);
        const rid =
          slug[2] === "revisions" && slug[3]
            ? slug[3]
            : current.current_revision_id;
        if (rid) {
          const r = await request<Revision>(
            `${api}/deliverables/${current.id}/revisions/${rid}`,
          );
          setRevision(r);
          setPurpose((p) => p || r.purpose);
          setAudience((a) => a || r.audience);
          const [f, v, l, q] = await Promise.all([
            request<Finding[]>(`${api}/qc-findings?revision_id=${rid}`),
            request<Review[]>(`${api}/reviews?revision_id=${rid}`),
            request<Lineage[]>(
              `${api}/deliverables/${current.id}/revisions/${rid}/lineage`,
            ),
            request<Array<{ report: Report }>>(
              `${api}/qc-runs?revision_id=${rid}`,
            ),
          ]);
          setFindings(f);
          setReviews(v);
          setLineage(l);
          setReport(q.find((run) => run.report.native_pages)?.report ?? null);
        }
      }
      setLoaded(true);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Workspace unavailable");
      setLoaded(true);
    }
  }, [api, slug.join("/")]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!revision || !selected || !purpose || !audience) return;
    let disposed = false;
    const timer = setTimeout(() => {
      request<Readiness>(
        `${api}/deliverables/${selected.id}/revisions/${revision.id}/readiness?${new URLSearchParams({ purpose, audience })}`,
      )
        .then((value) => {
          if (!disposed) setReadiness(value);
        })
        .catch((e) => {
          if (!disposed) setError(e.message);
        });
    }, 250);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [api, selected, revision, reviews, purpose, audience]);
  useEffect(() => {
    if (!revision?.jobs.some((j) => ["queued", "running"].includes(j.state)))
      return;
    const timer = setTimeout(() => void load(), 3000);
    return () => clearTimeout(timer);
  }, [revision, load]);
  const mutate = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  };
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await mutate(async () => {
      const item = await request<Deliverable>(`${api}/deliverables`, {
        work_objective_id: data.get("work_objective_id"),
        title: data.get("title"),
        purpose: data.get("purpose"),
        audience: data.get("audience"),
        confidentiality: data.get("confidentiality"),
      });
      window.location.assign(`${base}/deliverables/${item.id}`);
    });
  }
  async function openGeneration() {
    setGenerating(true);
    await mutate(async () => {
      setBasis(await request<typeof basis>(`${api}/workbook-bases`));
    });
  }
  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    await mutate(async () => {
      const selectedBasis = basis
        .filter((_, index) => chosen.includes(String(index)))
        .map(({ label: _, ...item }) => item);
      const job = await request<{ revision_id: string }>(
        `${api}/deliverables/${selected.id}/revisions`,
        {
          basis: selectedBasis,
          limitations: String(form.get("limitations") ?? "")
            .split("\n")
            .filter(Boolean),
        },
        Number(selected.row_version),
      );
      window.location.assign(
        `${base}/deliverables/${selected.id}/revisions/${job.revision_id}`,
      );
    });
  }
  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!revision) return;
    const form = new FormData(event.currentTarget);
    await mutate(async () => {
      await request(`${api}/reviews`, {
        revision_id: revision.id,
        purpose,
        audience,
        scope: form.get("scope"),
        standard: form.get("standard"),
        conclusion: form.get("conclusion"),
        rationale: form.get("rationale"),
        limitations: String(form.get("limitations") ?? "")
          .split("\n")
          .filter(Boolean),
        evidence: ["office_roundtrip", "native_reader_parity"].includes(
          reviewStandard,
        )
          ? {
              native_sha256: revision.artifacts.find((a) => a.role === "native")
                ?.plaintext_sha256,
              reader_sha256: revision.artifacts.find((a) => a.role === "reader")
                ?.plaintext_sha256,
              report_sha256: form.get("report_sha256"),
              application: form.get("application"),
              build: form.get("build"),
              platform: form.get("platform"),
              channel: form.get("channel"),
              steps: String(form.get("steps") ?? "")
                .split("\n")
                .filter(Boolean),
            }
          : {},
      });
      setReviewing(false);
      setNotice(
        "Review recorded for this exact Revision, purpose and audience.",
      );
      await load();
    });
  }
  const nativePages =
    report?.native_pages.filter((p) => p.sheet === sheet) ?? [];
  const nativePage = nativePages[page - 1] ?? (nativePages[0]?.render_basis === "exact_xlsx_cell_selection" ? nativePages[0] : undefined);
  const readerPages = report?.pages.filter((p) =>
    p.text.includes(`DEAL CONTROL / ${sheet.toUpperCase()}`),
  ) ?? [];
  const readerPage = readerPages[page - 1];
  const artifacts = revision?.artifacts ?? [];
  return (
    <div className="dc-workbook-screen">
      <div className="dc-workbook-mobile">
        <StatePanel
          tone="info"
          label="Desktop inspection required"
          title="This viewport supports read-only inspection."
          detail="Use a desktop width of at least 1024 pixels for generation and Review commands."
        />
      </div>
      {selected ? (
        <a className="dc-back-link" href={`${base}/execution-package`}>
          ← Execution Package
        </a>
      ) : null}
      <PageHeader
        eyebrow={
          selected || slug[0] === "deliverables"
            ? "Deliverable · Analysis & valuation"
            : "Execution Package"
        }
        title={
          slug[0] === "review-readiness"
            ? "Review & Readiness"
            : (selected?.title ??
              (slug[0] === "deliverables"
                ? "Analysis and Valuation Workbook"
                : "Execution Package"))
        }
        description={
          selected
            ? "Inspect the exact workbook Revision, its source basis and its independent review requirements."
            : "Organize Banker-native Deliverables, exact Reader Copies, Revisions, Lineage, and control summaries by applicability."
        }
        actions={
          selected ? (
            <>
              <Outcome value={readiness?.posture ?? "working_draft"} />
              <button
                className="dc-button dc-workbook-command"
                disabled={busy}
                onClick={() => void openGeneration()}
              >
                Generate new Revision
              </button>
            </>
          ) : (
            <button
              className="dc-button dc-workbook-command"
              disabled={!loaded}
              onClick={() => setCreation(true)}
            >
              Create valuation workbook
            </button>
          )
        }
      />
      {readiness?.acceptance_profile === "development_foss_v1" ? (
        <StatePanel tone="warning" label="Development acceptance" title="LibreOffice development acceptance profile">
          <p>This synthetic Revision uses the declared LibreOffice build and a separate development signing service. Windows Excel compatibility and cloud KMS custody are unverified. External use remains unauthorized.</p>
        </StatePanel>
      ) : null}
      {error ? <ErrorPanel message={error} /> : null}
      {notice ? (
        <StatePanel tone="success" label="Recorded" title={notice} />
      ) : null}
      {!loaded ? (
        <StatePanel
          tone="info"
          label="Loading"
          title="Loading the current Deal’s controlled artifacts…"
        />
      ) : null}
      {creation ? (
        <section className="dc-surface-card dc-workbook-command">
          <h2>Create Analysis and Valuation Workbook</h2>
          <form className="dc-workbook-form" onSubmit={create}>
            <label>
              Exact Work Objective
              <select name="work_objective_id" required>
                <option value="">
                  Choose the controlled Source Packet perimeter
                </option>
                {workObjectives.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.objective_text}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Title
              <input
                name="title"
                required
                defaultValue="Analysis and Valuation Workbook"
                maxLength={240}
              />
            </label>
            <label>
              Intended purpose
              <input
                name="purpose"
                required
                defaultValue="Internal valuation review"
                maxLength={240}
              />
            </label>
            <label>
              Exact audience
              <input
                name="audience"
                required
                defaultValue="Named Individual Banker"
                maxLength={240}
              />
            </label>
            <label>
              Confidentiality
              <select name="confidentiality" defaultValue="confidential">
                <option>public</option>
                <option>internal</option>
                <option>confidential</option>
                <option>restricted</option>
              </select>
            </label>
            <div className="dc-page-actions">
              <button className="dc-button" disabled={busy}>
                Create workbook
              </button>
              <button
                type="button"
                className="dc-button dc-button-secondary"
                onClick={() => setCreation(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}
      {!selected ? (
        <>
          <section className="dc-surface-card dc-package-spine">
            <div>
              <p className="dc-eyebrow">Always-required workbook</p>
              <h2>A continuously updated analysis spine</h2>
            </div>
            <article>
              <WorkbookIcon />
              <div>
                <strong>Analysis & Valuation Workbook</strong>
                <small>Editable XLSX · exact PDF Reader Copy</small>
                <StatusBadge
                  tone={
                    deliverables.some((d) => d.current_revision_id)
                      ? "info"
                      : "warning"
                  }
                >
                  {deliverables.some((d) => d.current_revision_id)
                    ? "Inspect exact Revision readiness"
                    : "Controlled basis required"}
                </StatusBadge>
              </div>
            </article>
          </section>
          <section className="dc-surface-card">
            <div className="dc-workbook-section-head">
              <div>
                <p className="dc-eyebrow">Stage applicability</p>
                <h2>Current Deliverables</h2>
              </div>
              <label className="dc-workbook-search">
                Find deliverable
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Title, purpose or audience"
                />
              </label>
            </div>
            {loaded && !deliverables.length ? (
              <StatePanel
                tone="info"
                label="No workbook yet"
                title="Create the first controlled valuation workbook."
                detail="Generation requires exact Calculation Run, Model Version and Scenario Version dependencies."
              />
            ) : (
              <div className="dc-deliverable-rows">
                {deliverables
                  .filter((d) =>
                    `${d.title} ${d.purpose} ${d.audience}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((d) => (
                    <article className="dc-deliverable-row" key={d.id}>
                      <div className="dc-file-type-icon">
                        <WorkbookIcon />
                      </div>
                      <div>
                        <strong>{d.title}</strong>
                        <small className="dc-mono">
                          {d.id.slice(0, 8)} · XLSX
                        </small>
                      </div>
                      <div>
                        <span className="dc-cell-label">Applicability</span>
                        <StatusBadge>Always required</StatusBadge>
                      </div>
                      <div>
                        <span className="dc-cell-label">Revision</span>
                        <strong className="dc-mono">
                          {d.current_revision_ordinal ?? "—"}
                        </strong>
                      </div>
                      <div>
                        <span className="dc-cell-label">Reader Copy</span>
                        <span>
                          {d.reader_available ? "Generated" : "Not generated"}
                        </span>
                      </div>
                      <div>
                        <span className="dc-cell-label">
                          Exact intended use
                        </span>
                        <span>{d.purpose}</span>
                        <small>{d.audience}</small>
                      </div>
                      <a
                        className="dc-inline-button"
                        href={`${base}/deliverables/${d.id}`}
                      >
                        Inspect →
                      </a>
                    </article>
                  ))}
              </div>
            )}
            {query &&
            !deliverables.some((d) =>
              `${d.title} ${d.purpose} ${d.audience}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            ) ? (
              <StatePanel
                tone="info"
                label="No matching Deliverables"
                title="Try another title, purpose or audience."
              />
            ) : null}
          </section>
          <section className="dc-surface-card dc-workbook-authorization">
            <div>
              <p className="dc-eyebrow">Revision / authorization boundary</p>
              <h2>
                Content, readiness and external authorization are separate
                states
              </h2>
              <p>
                Each workbook retains its exact dependency basis, Review
                perimeter and limitations.
              </p>
            </div>
            <div className="dc-boundary-steps">
              <span>1 · Immutable Revision</span>
              <span>2 · QC / Readiness</span>
              <span className="dc-critical-text">
                3 · External-use Decision
              </span>
            </div>
          </section>
        </>
      ) : null}
      {selected ? (
        <>
          <section className="dc-workbook-context">
            <div>
              <span>Purpose</span>
              <strong>{selected.purpose}</strong>
            </div>
            <div>
              <span>Audience</span>
              <strong>{selected.audience}</strong>
            </div>
            <div>
              <span>Revision</span>
              <strong>
                {revision
                  ? String(revision.ordinal).padStart(2, "0")
                  : "Not generated"}
              </strong>
            </div>
            <div>
              <span>External use</span>
              <Outcome value="blocked" />
            </div>
          </section>
          {generating ? (
            <section className="dc-surface-card dc-workbook-command">
              <h2>Generate from exact controlled basis</h2>
              <form onSubmit={generate} className="dc-workbook-form">
                <fieldset>
                  <legend>Model, Scenario and Calculation Run</legend>
                  {basis.length ? (
                    basis.map((item, index) => (
                      <label
                        className="dc-workbook-checkbox"
                        key={`${item.calculation_run_id}:${item.scenario_version_id}`}
                      >
                        <input
                          type="checkbox"
                          checked={chosen.includes(String(index))}
                          onChange={(e) =>
                            setChosen(
                              e.target.checked
                                ? [...chosen, String(index)]
                                : chosen.filter((id) => id !== String(index)),
                            )
                          }
                        />
                        {item.label}
                      </label>
                    ))
                  ) : (
                    <p>
                      {busy
                        ? "Loading exact controlled dependencies…"
                        : "No complete controlled basis is available. Complete the Analysis model and scenario dependencies first."}
                    </p>
                  )}
                </fieldset>
                <label>
                  Explicit limitations (one per line)
                  <textarea name="limitations" rows={3} />
                </label>
                <p>
                  The server verifies the exact relationship, current Decisions
                  and source locators before accepting generation.
                </p>
                <div className="dc-page-actions">
                  <button
                    className="dc-button"
                    disabled={busy || !chosen.length}
                  >
                    Generate Revision
                  </button>
                  <button
                    type="button"
                    className="dc-button dc-button-secondary"
                    onClick={() => setGenerating(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          ) : null}
          {!revision ? (
            <StatePanel
              tone="info"
              label="No Revision"
              title="Pin a controlled basis to generate the first Native Artifact and Reader Copy."
            />
          ) : (
            <>
              <details className="dc-workbook-jobs">
                <summary>
                  Execution jobs ({revision.jobs.length}) ·{" "}
                  {label(revision.jobs[0]?.state ?? "No jobs")}
                </summary>
                {revision.jobs.map((job) => (
                  <StatePanel
                    key={job.id}
                    tone={
                      job.state === "failed_terminal"
                        ? "critical"
                        : job.state === "completed"
                          ? "success"
                          : "info"
                    }
                    label={`${label(job.job_type)} · ${label(job.state)}`}
                    title={
                      job.problem
                        ? label(job.problem.code)
                        : job.state === "completed"
                          ? "Result recorded for this exact Revision"
                          : job.state === "canceled"
                            ? "Canceled; late results cannot commit"
                            : "Execution in progress"
                    }
                    detail={`Job ${job.id}`}
                  >
                    {["queued", "running"].includes(job.state) ? (
                      <button
                        className="dc-button dc-workbook-command"
                        disabled={busy}
                        onClick={() =>
                          void mutate(async () => {
                            await request(
                              `/api/v1/jobs/${job.id}/cancellations`,
                              {
                                reason:
                                  "Canceled by Banker from exact Revision inspection",
                              },
                              `"job-${job.row_version}"`,
                            );
                            setNotice(
                              "Job canceled. Late provider results cannot commit.",
                            );
                            await load();
                          })
                        }
                      >
                        Cancel {label(job.job_type)}
                      </button>
                    ) : null}
                  </StatePanel>
                ))}
              </details>
              <nav
                className="dc-tab-list"
                role="tablist"
                aria-label="Workbook inspection sections"
              >
                {[
                  "Overview",
                  "Native / Reader",
                  "Lineage",
                  "Review & QC",
                  "Revisions",
                  "Manifest",
                ].map((name) => (
                  <button
                    key={name}
                    className={tab === name ? "is-active" : ""}
                    role="tab"
                    id={`workbook-tab-${name.replaceAll(" ", "-")}`}
                    aria-selected={tab === name}
                    aria-controls="workbook-panel"
                    tabIndex={tab === name ? 0 : -1}
                    onKeyDown={(event) => {
                      const tabs = [
                        "Overview",
                        "Native / Reader",
                        "Lineage",
                        "Review & QC",
                        "Revisions",
                        "Manifest",
                      ];
                      if (
                        event.key === "ArrowRight" ||
                        event.key === "ArrowLeft"
                      ) {
                        event.preventDefault();
                        const next =
                          tabs[
                            (tabs.indexOf(name) +
                              (event.key === "ArrowRight"
                                ? 1
                                : tabs.length - 1)) %
                              tabs.length
                          ];
                        setTab(next);
                        document
                          .getElementById(
                            `workbook-tab-${next.replaceAll(" ", "-")}`,
                          )
                          ?.focus();
                      }
                    }}
                    onClick={() => setTab(name)}
                  >
                    {name}
                  </button>
                ))}
              </nav>
              <div
                id="workbook-panel"
                role="tabpanel"
                aria-labelledby={`workbook-tab-${tab.replaceAll(" ", "-")}`}
              >
                {tab === "Overview" ? (
                  <div className="dc-workbook-two">
                    <section className="dc-surface-card">
                      <h2>Exact artifacts</h2>
                      <div className="dc-table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Artifact</th>
                              <th>Size</th>
                              <th>SHA-256</th>
                            </tr>
                          </thead>
                          <tbody>
                            {artifacts
                              .filter((a) =>
                                ["native", "reader"].includes(a.role),
                              )
                              .map((a) => (
                                <tr key={a.id}>
                                  <td>
                                    <strong>{a.path_label}</strong>
                                    <small>{label(a.role)}</small>
                                  </td>
                                  <td>
                                    {(a.byte_length / 1024).toFixed(1)} KB
                                  </td>
                                  <td className="dc-mono dc-wrap-anywhere">
                                    {a.plaintext_sha256}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                      <h3>Scope & limitations</h3>
                      <ul>
                        {[
                          ...revision.build_input.limitations,
                          ...(report?.limitations ?? []),
                        ].map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                      <p>
                        Generated files do not establish professional
                        suitability or external-use authorization.
                      </p>
                    </section>
                    <section className="dc-surface-card">
                      <h2>Readiness blockers</h2>
                      {readiness?.blockers.map((item) => (
                        <div
                          className="dc-workbook-requirement"
                          key={item.code}
                        >
                          <div>
                            <strong>{label(item.code)}</strong>
                            <small>{item.recovery}</small>
                          </div>
                          <Outcome value={item.outcome} />
                        </div>
                      ))}
                      <button
                        className="dc-inline-button"
                        onClick={() => setTab("Review & QC")}
                      >
                        Inspect all requirements →
                      </button>
                    </section>
                  </div>
                ) : null}
                {tab === "Native / Reader" ? (
                  <section className="dc-surface-card">
                    <div className="dc-workbook-toolbar">
                      <label>
                        Worksheet
                        <select
                          value={sheet}
                          onChange={(e) => {
                            setSheet(e.target.value);
                            setPage(1);
                          }}
                        >
                          {[
                            "Overview",
                            "Inputs",
                            "Assumptions",
                            "Valuation",
                            "Scenarios",
                            "Lineage",
                            "Banker Notes",
                          ].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Page
                        <select
                          value={page}
                          onChange={(e) => setPage(Number(e.target.value))}
                        >
                          {Array.from(
                            { length: Math.max(nativePages.length, readerPages.length, 1) },
                            (_, i) => (
                              <option key={i} value={i + 1}>
                                {i + 1}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                      <label>
                        Preview size
                        <select
                          value={zoom}
                          onChange={(e) => setZoom(Number(e.target.value))}
                        >
                          <option value={0}>Fit width</option>
                          <option value={900}>Readable · 900 px</option>
                          <option value={1400}>Detail · 1400 px</option>
                        </select>
                      </label>
                      <StatusBadge>
                        Same Revision · {revision.ordinal}
                      </StatusBadge>
                    </div>
                    <div className="dc-workbook-viewers">
                      <Preview
                        dealId={dealId}
                        zoom={zoom}
                        artifact={artifacts.find(
                          (a) => a.path_label === nativePage?.image,
                        )}
                        caption={nativePage?.render_basis === "exact_xlsx_cell_selection" ? `Native Artifact · ${sheet} · worksheet ${nativePage.range}` : `Native Artifact · ${sheet} · page ${page}`}
                      />
                      <Preview
                        dealId={dealId}
                        zoom={zoom}
                        artifact={artifacts.find(
                          (a) => a.path_label === readerPage?.image,
                        )}
                        caption={`Reader Copy · page ${readerPage?.page ?? "—"}`}
                      />
                    </div>
                    <details>
                      <summary>Inspect exact stored cells and formulas</summary>
                      <div className="dc-table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Cell</th>
                              <th>Stored formula</th>
                              <th>Recalculated cache / text</th>
                              <th>Comment / citation</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report?.cells
                              .find((s) => s.sheet === sheet)
                              ?.cells.map((cell) => (
                                <tr key={cell.cell}>
                                  <td className="dc-mono">{cell.cell}</td>
                                  <td className="dc-mono">
                                    {cell.formula ?? "—"}
                                  </td>
                                  <td>{String(cell.value ?? "")}</td>
                                  <td>{cell.comment ?? "—"}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </section>
                ) : null}
                {tab === "Lineage" ? (
                  <section className="dc-surface-card">
                    <h2>Bidirectional region lineage</h2>
                    <p>
                      Native and Reader regions retain the same typed
                      Calculation, Model, Scenario, Fact or Assumption, and
                      Decision basis.
                    </p>
                    {lineageSource ? (
                      <p>
                        Showing all regions for Source Record{" "}
                        <span className="dc-mono">{lineageSource}</span>.{" "}
                        <button
                          className="dc-button dc-button-quiet"
                          onClick={() => setLineageSource(null)}
                        >
                          Show all sources
                        </button>
                      </p>
                    ) : null}
                    <div className="dc-table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Artifact region</th>
                            <th>Authority</th>
                            <th>Exact source locator</th>
                            <th>Calculation Run</th>
                            <th>Decision</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineage
                            .filter(
                              (item) =>
                                !lineageSource ||
                                item.source_record_id === lineageSource,
                            )
                            .map((item) => (
                              <tr key={item.id}>
                                <td>
                                  <strong>{label(item.artifact_role)}</strong>
                                  <span className="dc-mono">
                                    {item.region.native_locator.sheet}!
                                    {item.region.native_locator.range}
                                  </span>
                                  <small>
                                    → {item.region.native_locator.output_sheet}!
                                    {item.region.native_locator.output_range}
                                  </small>
                                </td>
                                <td>
                                  {item.fact_id ? "Fact" : "Assumption"}
                                  <ShortId
                                    id={item.fact_id ?? item.assumption_id}
                                  />
                                </td>
                                <td>
                                  {item.source_record_id ? (
                                    <button
                                      className="dc-button dc-button-quiet"
                                      onClick={() =>
                                        setLineageSource(item.source_record_id)
                                      }
                                      title={`Trace Source Record ${item.source_record_id} to all artifact regions`}
                                    >
                                      <ShortId id={item.source_record_id} />
                                    </button>
                                  ) : (
                                    "Banker-declared assumption"
                                  )}
                                  <small className="dc-mono">
                                    {JSON.stringify(item.source_locator)}
                                  </small>
                                </td>
                                <td>
                                  <ShortId id={item.calculation_run_id} />
                                  <small>
                                    Model <ShortId id={item.model_version_id} />
                                  </small>
                                  <small>
                                    Scenario{" "}
                                    <ShortId id={item.scenario_version_id} />
                                  </small>
                                </td>
                                <td>
                                  <DecisionInspection
                                    dealId={dealId}
                                    id={item.decision_id}
                                  />
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ) : null}
                {tab === "Review & QC" ? (
                  <>
                    <section className="dc-surface-card">
                      <div className="dc-workbook-section-head">
                        <h2>Readiness for the exact intended use</h2>
                        <button
                          className="dc-button dc-workbook-command"
                          disabled={busy}
                          onClick={() => setReviewing(true)}
                        >
                          Record professional Review
                        </button>
                      </div>
                      <div className="dc-workbook-toolbar">
                        <label>
                          Purpose
                          <input
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                          />
                        </label>
                        <label>
                          Audience
                          <input
                            value={audience}
                            onChange={(e) => setAudience(e.target.value)}
                          />
                        </label>
                        <Outcome
                          value={readiness?.posture ?? "working_draft"}
                        />
                      </div>
                      <div className="dc-table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Requirement</th>
                              <th>Required gate</th>
                              <th>Outcome</th>
                              <th>Recovery</th>
                            </tr>
                          </thead>
                          <tbody>
                            {readiness?.requirements.map((item) => (
                              <tr key={item.code}>
                                <td>
                                  <strong>{label(item.code)}</strong>
                                </td>
                                <td>{label(item.gate)}</td>
                                <td>
                                  <Outcome value={item.outcome} />
                                </td>
                                <td>{item.recovery}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                    {reviewing ? (
                      <section className="dc-surface-card dc-workbook-command">
                        <h2>Record an exact-use Review</h2>
                        <form className="dc-workbook-form" onSubmit={review}>
                          <p>
                            Revision {revision.ordinal} · {purpose} · {audience}
                          </p>
                          <label>
                            Standard
                            <select
                              name="standard"
                              value={reviewStandard}
                              onChange={(e) =>
                                setReviewStandard(e.target.value)
                              }
                            >
                              <option value="method_review">
                                Method and controlled assumptions
                              </option>
                              <option value="review_scope">
                                Review scope and coverage
                              </option>
                              <option value="rights_confidentiality">
                                Rights and confidentiality
                              </option>
                              <option value="professional_suitability">
                                Professional suitability
                              </option>
                              <option value="native_reader_parity">
                                Native / Reader visual parity
                              </option>
                              <option value="office_roundtrip">
                                Office edit / save / reopen
                              </option>
                            </select>
                          </label>
                          {[
                            "office_roundtrip",
                            "native_reader_parity",
                          ].includes(reviewStandard) ? (
                            <fieldset>
                              <legend>
                                Exact artifact verification evidence
                              </legend>
                              <p>
                                Native and Reader hashes are bound automatically
                                to this Revision.
                              </p>
                              <label>
                                Evidence report SHA-256
                                <input
                                  name="report_sha256"
                                  required
                                  pattern="[a-f0-9]{64}"
                                  maxLength={64}
                                />
                              </label>
                              <label>
                                Application
                                <input
                                  name="application"
                                  required
                                  placeholder="Microsoft Excel"
                                />
                              </label>
                              <label>
                                Exact build
                                <input
                                  name="build"
                                  required
                                  placeholder="16.0. …"
                                />
                              </label>
                              <label>
                                Platform
                                <select name="platform">
                                  <option value="windows">Windows</option>
                                  <option value="macos">
                                    macOS (secondary smoke)
                                  </option>
                                </select>
                              </label>
                              <label>
                                Update channel
                                <select name="channel">
                                  <option value="current">
                                    Microsoft 365 Current Channel
                                  </option>
                                  <option value="other">
                                    Other / visual viewer
                                  </option>
                                </select>
                              </label>
                              <label>
                                Completed steps and observed outcomes
                                <textarea
                                  name="steps"
                                  required
                                  rows={4}
                                  placeholder="Open; inspect formulas, names and charts; edit Banker Notes; save; reopen; inspect reimport integrity"
                                />
                              </label>
                            </fieldset>
                          ) : null}
                          <label>
                            Inspected scope
                            <textarea name="scope" required rows={2} />
                          </label>
                          <label>
                            Conclusion
                            <select name="conclusion">
                              <option value="limited">
                                Limited — restrictions remain
                              </option>
                              <option value="failed">
                                Failed — remediation required
                              </option>
                              <option value="passed">
                                Passed for this exact scope
                              </option>
                            </select>
                          </label>
                          <label>
                            Rationale
                            <textarea
                              name="rationale"
                              required
                              minLength={20}
                              rows={3}
                            />
                          </label>
                          <label>
                            Limitations (one per line)
                            <textarea name="limitations" rows={2} />
                          </label>
                          <div className="dc-page-actions">
                            <button className="dc-button" disabled={busy}>
                              Record Review
                            </button>
                            <button
                              type="button"
                              className="dc-button dc-button-secondary"
                              onClick={() => setReviewing(false)}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </section>
                    ) : null}
                    <WorkbookControls
                      api={api}
                      revision={revision}
                      findings={findings}
                      purpose={purpose}
                      onRefresh={load}
                    />
                    <section className="dc-surface-card">
                      <h2>QC Findings</h2>
                      {findings.length ? (
                        findings.map((f) => (
                          <article className="dc-workbook-finding" key={f.id}>
                            <Outcome value={f.severity} />
                            <div>
                              <strong>{label(f.finding_code)}</strong>
                              <p>{f.detail}</p>
                              <small>{f.consequence}</small>
                              <span className="dc-mono">{f.id}</span>
                            </div>
                          </article>
                        ))
                      ) : (
                        <p>
                          No deterministic findings have been recorded for this
                          Revision. Missing checks remain visible above.
                        </p>
                      )}
                      <h3>Review history</h3>
                      {reviews.map((r) => (
                        <div className="dc-workbook-requirement" key={r.id}>
                          <div>
                            <strong>{label(r.standard)}</strong>
                            <small>
                              {r.purpose} · {r.audience}
                            </small>
                            <p>{r.rationale}</p>
                          </div>
                          <Outcome value={r.conclusion} />
                        </div>
                      ))}
                    </section>
                  </>
                ) : null}
                {tab === "Revisions" ? (
                  <section className="dc-surface-card">
                    <h2>Immutable Revision history</h2>
                    <div className="dc-table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Revision</th>
                            <th>Created</th>
                            <th>Purpose / audience</th>
                            <th>Inspect</th>
                          </tr>
                        </thead>
                        <tbody>
                          {revisions.map((r) => (
                            <tr key={r.id}>
                              <td>
                                <strong>{r.ordinal}</strong>
                                <ShortId id={r.id} />
                              </td>
                              <td>{new Date(r.created_at).toLocaleString()}</td>
                              <td>
                                {r.purpose}
                                <small>{r.audience}</small>
                              </td>
                              <td>
                                <a
                                  href={`${base}/deliverables/${selected.id}/revisions/${r.id}`}
                                >
                                  Inspect →
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p>
                      Reviews, QC and authorization do not carry forward to
                      another Revision.
                    </p>
                  </section>
                ) : null}
                {tab === "Manifest" ? (
                  <Manifest
                    api={`${api}/deliverables/${selected.id}/revisions/${revision.id}/manifest`}
                    digest={revision.basis_digest}
                  />
                ) : null}
              </div>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
function Manifest({ api, digest }: { api: string; digest: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    request<Record<string, unknown>>(api)
      .then(setData)
      .catch(() =>
        setError(
          "No signed Manifest is recorded for this exact Revision. The signing requirement remains blocked.",
        ),
      );
  }, [api]);
  return (
    <section className="dc-surface-card">
      <h2>Exact artifact Manifest</h2>
      <p>
        A signature proves deployment origin and byte integrity. It does not
        prove correctness, approval or external-use authorization.
      </p>
      <dl>
        <dt>Controlled basis digest</dt>
        <dd className="dc-mono dc-wrap-anywhere">{digest}</dd>
      </dl>
      {error ? (
        <StatePanel tone="warning" label="Signature pending" title={error} />
      ) : null}
      {data ? (
        <>
          <dl>
            <dt>Signing key version</dt>
            <dd className="dc-mono dc-wrap-anywhere">
              {String(data.key_version)}
            </dd>
            <dt>Canonical SHA-256</dt>
            <dd className="dc-mono dc-wrap-anywhere">
              {String(data.canonical_sha256)}
            </dd>
          </dl>
          <details>
            <summary>Inspect canonical signed Manifest</summary>
            <pre className="dc-workbook-json">
              {String(data.canonical_payload)}
            </pre>
          </details>
        </>
      ) : null}
    </section>
  );
}
function WorkbookIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M14 3H5v18h14V8l-5-5Z" />
      <path d="M14 3v5h5M8 12h8M8 16h8M12 10v9" />
    </svg>
  );
}
type AiRun = {
  id: string;
  task_definition: string;
  status: string;
  outcome: string;
  proposals?: Array<{
    id: string;
    proposal_kind: string;
    payload: Record<string, unknown>;
    support_status: string;
    limitations: string[];
  }>;
  abstentions?: Array<{ reason: string }>;
};
function WorkbookControls({
  api,
  revision,
  findings,
  purpose,
  onRefresh,
}: {
  api: string;
  revision: Revision;
  findings: Finding[];
  purpose: string;
  onRefresh: () => Promise<void>;
}) {
  const root = `${api}/deliverables/${revision.deliverable_id}/revisions/${revision.id}`;
  const [objectives, setObjectives] = useState<
    Array<{
      id: string;
      packet_version_id: string;
      objective_text: string;
      status: string;
    }>
  >([]);
  const [runs, setRuns] = useState<AiRun[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [findingId, setFindingId] = useState("");
  useEffect(() => {
    let disposed = false;
    Promise.all([
      request<typeof objectives>(`${api}/work-objectives`),
      request<AiRun[]>(`${root}/ai-reviews`),
    ])
      .then(([o, r]) => {
        if (!disposed) {
          setObjectives(o);
          setRuns(r);
        }
      })
      .catch((e) => {
        if (!disposed) setError(e.message);
      });
    return () => {
      disposed = true;
    };
  }, [api, root, revision.jobs]);
  const command = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError("");
    try {
      await action();
      setNotice(message);
      await onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };
  async function aiReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const objective = objectives.find((o) => o.id === form.get("objective"));
    if (!objective) return;
    await command(
      () =>
        request(`${root}/ai-reviews`, {
          task_definition: form.get("task"),
          work_objective_id: objective.id,
          packet_version_id: objective.packet_version_id,
        }),
      "AI review queued. Its results remain proposals for this exact Revision.",
    );
  }
  async function disposition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await command(
      () =>
        request(`${api}/qc-findings/${findingId}/dispositions`, {
          disposition: form.get("disposition"),
          purpose,
          rationale: form.get("rationale"),
        }),
      "Finding disposition recorded. A disposition does not substitute for a passing exact-file retest.",
    );
  }
  return (
    <>
      {error ? <ErrorPanel message={error} /> : null}
      {notice ? (
        <StatePanel tone="info" label="Recorded" title={notice} />
      ) : null}
      <section className="dc-surface-card">
        <div className="dc-workbook-section-head">
          <div>
            <p className="dc-eyebrow">Independent file inspection</p>
            <h2>Run QC on the exact stored artifacts</h2>
          </div>
          <button
            className="dc-button dc-workbook-command"
            disabled={busy || revision.artifacts.length === 0}
            onClick={() =>
              void command(
                () =>
                  request(`${api}/qc-runs`, {
                    revision_id: revision.id,
                    ruleset: "analysis-workbook-qc-1.0.0",
                  }),
                "QC queued against the stored Native Artifact and Reader Copy.",
              )
            }
          >
            Run exact-file QC
          </button>
        </div>
        <p>
          Checks cover formulas, recalculation, lineage, file structure, Reader
          content and signature integrity. Visual comparison and professional
          Review remain separate requirements.
        </p>
        {findings.length ? (
          <div className="dc-workbook-form dc-workbook-command">
            <label>
              Finding to inspect
              <select
                value={findingId}
                onChange={(e) => setFindingId(e.target.value)}
              >
                <option value="">Select exact Finding</option>
                {findings.map((f) => (
                  <option value={f.id} key={f.id}>
                    {label(f.finding_code)} · {f.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
            {findingId ? (
              <form onSubmit={disposition} className="dc-workbook-form">
                <label>
                  Disposition
                  <select name="disposition">
                    <option value="remediation_required">
                      Remediation required
                    </option>
                    <option value="confirmed">Confirmed</option>
                    <option value="rejected">Rejected with rationale</option>
                    {findings.find((f) => f.id === findingId)?.severity !==
                    "critical" ? (
                      <option value="accepted_limitation">
                        Accepted limitation for this purpose
                      </option>
                    ) : null}
                  </select>
                </label>
                <label>
                  Rationale
                  <textarea
                    name="rationale"
                    minLength={20}
                    maxLength={4000}
                    required
                    rows={2}
                  />
                </label>
                <div className="dc-page-actions">
                  <button
                    className="dc-button dc-button-secondary"
                    disabled={busy}
                  >
                    Record disposition
                  </button>
                  <button
                    type="button"
                    className="dc-button"
                    disabled={busy}
                    onClick={() =>
                      void command(
                        () =>
                          request(`${api}/qc-findings/${findingId}/retests`, {
                            revision_id: revision.id,
                            ruleset: "analysis-workbook-qc-1.0.0",
                          }),
                        "Targeted retest queued. Only this Finding can be cleared by its passing result.",
                      )
                    }
                  >
                    Retest this Finding
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        ) : null}
      </section>
      <section className="dc-surface-card">
        <div className="dc-workbook-section-head">
          <div>
            <p className="dc-eyebrow">Governed AI proposals</p>
            <h2>Commentary and semantic review</h2>
          </div>
          <StatusBadge>Banker Review required</StatusBadge>
        </div>
        <form
          onSubmit={aiReview}
          className="dc-workbook-form dc-workbook-command"
        >
          <label>
            Review task
            <select name="task">
              <option value="workbook_commentary_draft">
                Draft workbook commentary
              </option>
              <option value="deliverable_semantic_qc">
                Review deliverable meaning and content
              </option>
              <option value="native_reader_semantic_parity_review">
                Review Native / Reader semantic parity
              </option>
            </select>
          </label>
          <label>
            Exact Work Objective and Source Packet
            <select name="objective" required>
              <option value="">Select an authorized source perimeter</option>
              {objectives.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.objective_text} · {o.packet_version_id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          {!objectives.length ? (
            <p>
              No Work Objective is available. Define the exact Source Packet and
              intended use in Sources before starting AI review.
            </p>
          ) : null}
          <button
            className="dc-button"
            disabled={
              busy || !objectives.length || revision.artifacts.length === 0
            }
          >
            Start AI review
          </button>
        </form>
        <div className="dc-workbook-ai-runs">
          {runs.length ? (
            runs.map((run) => (
              <article className="dc-workbook-ai-run" key={run.id}>
                <div className="dc-workbook-section-head">
                  <strong>{label(run.task_definition)}</strong>
                  <Outcome value={run.outcome ?? run.status} />
                </div>
                <small className="dc-mono">{run.id}</small>
                {run.proposals?.map((proposal) => (
                  <div className="dc-workbook-proposal" key={proposal.id}>
                    <StatusBadge tone="warning">
                      AI proposal · {label(proposal.support_status)}
                    </StatusBadge>
                    <p>
                      {String(
                        proposal.payload.observed_condition ??
                          proposal.payload.summary ??
                          proposal.proposal_kind,
                      )}
                    </p>
                    {Array.isArray(proposal.payload.blocks)
                      ? proposal.payload.blocks.map((block, i) => (
                          <p key={i}>
                            {String((block as { text?: string }).text ?? "")}
                          </p>
                        ))
                      : null}
                    {proposal.payload.remediation_proposal ? (
                      <p>
                        <strong>Suggested remediation: </strong>
                        {String(proposal.payload.remediation_proposal)}
                      </p>
                    ) : null}
                    <small>
                      Region:{" "}
                      {String(proposal.payload.region_key ?? "Not specified")}
                    </small>
                    <details>
                      <summary>
                        Inspect proposal and evidence references
                      </summary>
                      <pre className="dc-workbook-json">
                        {JSON.stringify(proposal, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
                {run.abstentions?.map((a, i) => (
                  <p key={i}>Abstention: {a.reason}</p>
                ))}
              </article>
            ))
          ) : (
            <p>No AI review has been recorded for this exact Revision.</p>
          )}
        </div>
      </section>
    </>
  );
}
