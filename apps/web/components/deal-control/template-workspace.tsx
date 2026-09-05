"use client";
import { useEffect, useState } from "react";
import { PageHeader, StatePanel, StatusBadge } from "./ui";
import { readDomain, useDomainCommand, shortId, words } from "./domain-client";

type Version = { id: string; version: number; version_label: string; display_name: string; media_type: string; content_sha256: string; byte_length: number; rights_attestation: Record<string, unknown>; clean_template_basis: Record<string, unknown>; created_at: string };
type Template = { id: string; template_class: string; status: string; current_version: Version; compatibility: { status: string; profile?: string; limitations?: string[]; report?: Record<string, unknown>; assessed_at?: string } };
const profileFor = (media: string) => media.includes("spreadsheet") ? "xlsx-v1" : media.includes("presentation") ? "pptx-v1" : media.includes("word") ? "docx-v1" : "pdf-v1";
export function TemplateWorkspace({ dealId, templateId }: { dealId?: string; templateId?: string }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [refresh, setRefresh] = useState(0);
  const command = useDomainCommand();
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setError("");
    void (async () => {
      if (templateId) {
        const [template, history] = await Promise.all([readDomain<Template>(`/api/v1/account/artifact-templates/${templateId}`, abort.signal), readDomain<Version[]>(`/api/v1/account/artifact-templates/${templateId}/versions`, abort.signal)]);
        if (!abort.signal.aborted) { setTemplates([template]); setVersions(history); }
      } else {
        const list = await readDomain<{ id: string }[]>("/api/v1/account/artifact-templates", abort.signal);
        const details = await Promise.all(list.map((item) => readDomain<Template>(`/api/v1/account/artifact-templates/${item.id}`, abort.signal)));
        if (!abort.signal.aborted) setTemplates(details);
      }
    })().catch((cause) => { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : "Templates are unavailable."); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [templateId, refresh]);
  async function preflight(template: Template) {
    setBusy(true); setError("");
    try { await command(`/api/v1/account/artifact-templates/${template.id}/preflights`, { version_id: template.current_version.id, compatibility_profile: profileFor(template.current_version.media_type) }); setRefresh((value) => value + 1); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Compatibility could not be assessed."); } finally { setBusy(false); }
  }
  return <div className="dc-analysis-page"><PageHeader eyebrow="Account reusable templates" title={templateId ? "Template version and compatibility history" : "Templates & Compatibility"} description="Inspect the exact reusable bytes and their declared clean basis. Format compatibility alone does not establish production readiness or apply a template to a Deal." actions={dealId ? <a className="dc-button" href={`/app/deals/${dealId}/sources/add?mode=template`}>Add reusable template</a> : undefined} />
    {error && <StatePanel tone="critical" label="Templates unavailable" title={error}><button onClick={() => setRefresh((value) => value + 1)}>Retry</button></StatePanel>}
    {loading ? <StatePanel label="Loading" title="Loading Account template records…" /> : !error && !templates.length ? <StatePanel label="No templates" title="No reusable template has been accepted in this Account" /> : templates.map((template) => <section className="dc-surface-card" key={template.id}><span className="dc-eyebrow">{words(template.template_class)} · {shortId(template.id)}</span><h2><a href={`/app/account/artifact-templates/${template.id}`}>{template.current_version.display_name}</a></h2><StatusBadge tone={template.status === "blocked" ? "critical" : "warning"}>{words(template.status)}</StatusBadge><dl><dt>Exact version</dt><dd>{template.current_version.version_label} · <span className="dc-mono">{template.current_version.id}</span></dd><dt>Bytes / format</dt><dd>{template.current_version.byte_length.toLocaleString()} bytes · {template.current_version.media_type}</dd><dt>Original identity</dt><dd className="dc-mono">{template.current_version.content_sha256}</dd><dt>Compatibility</dt><dd>{words(template.compatibility.status)} · {template.compatibility.profile ?? "No profile assessed"}</dd><dt>Production readiness</dt><dd>Separate exact mapping, validation and review required</dd><dt>Limitations</dt><dd>{template.compatibility.limitations?.map(words).join("; ") || "Inspect the compatibility report before use"}</dd></dl><details><summary>Rights and clean template declaration</summary><pre className="dc-source-excerpt">{JSON.stringify({ rights: template.current_version.rights_attestation, clean_template_basis: template.current_version.clean_template_basis }, null, 2)}</pre></details>{template.compatibility.report && <details><summary>Recorded compatibility report</summary><pre className="dc-source-excerpt">{JSON.stringify(template.compatibility.report, null, 2)}</pre></details>}<button className="dc-button dc-button-secondary" disabled={busy} onClick={() => void preflight(template)}>{busy ? "Assessing…" : "Run compatibility preflight"}</button></section>)}
    {templateId && versions.length > 0 && <section className="dc-surface-card"><h2>Immutable version history</h2>{versions.map((version) => <article key={version.id}><h3>{version.display_name} · {version.version_label}</h3><p className="dc-mono">{version.id}</p><p>{new Date(version.created_at).toLocaleString()} · {version.byte_length.toLocaleString()} bytes</p><p className="dc-mono">{version.content_sha256}</p></article>)}</section>}
  </div>;
}
