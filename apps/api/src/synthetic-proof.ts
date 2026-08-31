import crypto from "node:crypto";

export const PROJECT_NORTHSTAR_FIXTURE_VERSION = "1.0.0";
export const PROJECT_NORTHSTAR_PROOF_COOKIE = "__Host-northstar_proof";
export const PROJECT_NORTHSTAR_PROOF_TTL_SECONDS = 15 * 60;

const requiredCheckpoints = [
  "package_outcome",
  "ebitda_conflict",
  "cash_extraction",
  "cash_correction",
  "deterministic_recovery",
  "affected_outputs",
  "revision_boundary",
  "authorization_boundary",
  "manifest_download",
] as const;

type Checkpoint = (typeof requiredCheckpoints)[number];

type SyntheticEvent = {
  type: string;
  at: string;
  synthetic: true;
  counts_as_paid_activation: false;
  counts_as_production_provider_evidence: false;
  counts_as_production_security_evidence: false;
  [key: string]: unknown;
};

type ArtifactFormat = "xlsx" | "pptx" | "docx" | "pdf" | "control-records" | "archive-manifest";

type SyntheticArtifact = {
  id: string;
  filename: string;
  format: ArtifactFormat;
  mime_type: string;
  revision: string;
  rights_posture: "rights_cleared_synthetic";
  sha256: string;
  bytes: Buffer;
};

type SyntheticRevision = {
  id: string;
  number: "0.3" | "0.4";
  source_record_ids: string[];
  created_at: string;
  immutable: true;
  external_use_authorization: {
    status: "authorized" | "not_authorized";
    decision_id: string | null;
    bound_revision: string;
    carry_forward: boolean;
    prior_authorization?: "does_not_carry_forward";
  };
  artifacts: SyntheticArtifact[];
};

type SyntheticJob = {
  id: string;
  kind: "deterministic_recovery" | "revision_creation";
  state: "completed";
  synthetic: true;
  created_at: string;
  result: Record<string, unknown>;
};

type SyntheticSession = {
  id: string;
  token_hash: string;
  fixture_version: string;
  created_at: string;
  expires_at: number;
  observed: Set<Checkpoint>;
  events: SyntheticEvent[];
  conflict_resolution?: Record<string, unknown>;
  correction?: Record<string, unknown>;
  deterministic_job?: SyntheticJob;
  impact_acceptance?: Record<string, unknown>;
  revision_job?: SyntheticJob;
  completion_event?: SyntheticEvent;
};

const mimeByFormat: Record<ArtifactFormat, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  "control-records": "application/json",
  "archive-manifest": "application/json",
};

const extensionByFormat: Record<ArtifactFormat, string> = {
  xlsx: "xlsx",
  pptx: "pptx",
  docx: "docx",
  pdf: "pdf",
  "control-records": "json",
  "archive-manifest": "json",
};

function nowIso() {
  return new Date().toISOString();
}

function sha256(bytes: Buffer) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function crc32(bytes: Buffer) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** A tiny deterministic ZIP writer for rights-cleared synthetic OOXML fixtures. */
function zip(files: Record<string, string>) {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = Buffer.from(name, "utf8");
    const data = Buffer.from(content, "utf8");
    const local = Buffer.alloc(30 + nameBytes.length + data.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc32(data), 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    nameBytes.copy(local, 30);
    data.copy(local, 30 + nameBytes.length);
    locals.push(local);

    const central = Buffer.alloc(46 + nameBytes.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc32(data), 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    nameBytes.copy(central, 46);
    centrals.push(central);
    offset += local.length;
  }
  const localBytes = Buffer.concat(locals);
  const centralBytes = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(centrals.length, 8);
  end.writeUInt16LE(centrals.length, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(localBytes.length, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([localBytes, centralBytes, end]);
}

function officeBytes(format: Exclude<ArtifactFormat, "pdf" | "control-records" | "archive-manifest">, revision: string) {
  const marker = `Project Northstar synthetic fixture; Revision ${revision}; format ${format}`;
  if (format === "xlsx") {
    return zip({
      "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
      "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Synthetic Proof" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
      "xl/worksheets/sheet1.xml": `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>${marker}</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Cash correction: 6.2 to 4.7; deterministic change: 1.5</t></is></c></row></sheetData></worksheet>`,
    });
  }
  if (format === "pptx") {
    return zip({
      "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`,
      "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`,
      "ppt/presentation.xml": `<?xml version="1.0" encoding="UTF-8"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst><p:sldId id="256" r:id="rId1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/></p:sldIdLst></p:presentation>`,
      "ppt/slides/slide1.xml": `<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr/><p:grpSpPr/><p:sp><p:nvSpPr/><p:txBody><a:p xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:r><a:t>${marker}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`,
    });
  }
  return zip({
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${marker}</w:t></w:r></w:p><w:p><w:r><w:t>Cash correction: 6.2 to 4.7; deterministic change: 1.5</w:t></w:r></w:p></w:body></w:document>`,
  });
}

function pdfBytes(revision: string) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length 90 >>\nstream\nBT /F1 12 Tf 72 720 Td (Project Northstar synthetic Revision ${revision}) Tj ET\nendstream`,
  ];
  let output = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets[index] = Buffer.byteLength(output, "utf8");
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(output, "utf8");
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) output += `${String(offset).padStart(10, "0")} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(output, "utf8");
}

function syntheticEvent(type: string, extra: Record<string, unknown> = {}): SyntheticEvent {
  return {
    type,
    at: nowIso(),
    synthetic: true,
    counts_as_paid_activation: false,
    counts_as_production_provider_evidence: false,
    counts_as_production_security_evidence: false,
    ...extra,
  };
}

export class SyntheticProofError extends Error {
  constructor(readonly code: string, message: string, readonly status = 409, readonly recoveryAction = "continue_proof") {
    super(message);
  }
}

/**
 * Isolated proof adapter: this bounded in-memory state is deliberately synthetic
 * and never a production Account/Deal or provider authority. Production wiring
 * must supply the control-plane/session/artifact adapters described by ADR-0009.
 */
export class SyntheticProofStore {
  private readonly sessions = new Map<string, SyntheticSession>();
  private readonly artifacts = new Map<string, SyntheticArtifact>();
  private readonly maxSessions = 1000;

  createSession(fixtureVersion = PROJECT_NORTHSTAR_FIXTURE_VERSION) {
    if (fixtureVersion !== PROJECT_NORTHSTAR_FIXTURE_VERSION) throw new SyntheticProofError("unsupported_fixture", "This synthetic proof fixture version is not available.", 400, "choose_supported_fixture");
    this.cleanupExpiredSessions();
    if (this.sessions.size >= this.maxSessions) throw new SyntheticProofError("rate_limited", "Too many synthetic proof sessions are active. Retry after the existing sessions expire.", 429, "retry_after_delay");
    const token = crypto.randomBytes(32).toString("base64url");
    const session: SyntheticSession = {
      id: `synthetic-proof-session-${crypto.randomUUID()}`,
      token_hash: sha256(Buffer.from(token)),
      fixture_version: fixtureVersion,
      created_at: nowIso(),
      expires_at: Date.now() + PROJECT_NORTHSTAR_PROOF_TTL_SECONDS * 1000,
      observed: new Set(),
      events: [],
    };
    this.sessions.set(session.id, session);
    return { session, token };
  }

  getSession(id: string, token: string) {
    const session = this.sessions.get(id);
    if (!session || session.expires_at <= Date.now() || session.token_hash !== sha256(Buffer.from(token))) return undefined;
    return session;
  }

  getSessionByToken(token: string) {
    const tokenHash = sha256(Buffer.from(token));
    for (const session of this.sessions.values()) {
      if (session.expires_at > Date.now() && session.token_hash === tokenHash) return session;
    }
    return undefined;
  }

  observeState(session: SyntheticSession, checkpoint: Checkpoint) {
    const firstObservation = !session.observed.has(checkpoint);
    session.observed.add(checkpoint);
    if (firstObservation && checkpoint === "package_outcome") session.events.push(syntheticEvent("source_lineage_observed", { checkpoint, source_record_ids: ["synthetic-sr-002", "synthetic-sr-003", "synthetic-sr-005"] }));
    if (firstObservation) session.events.push(syntheticEvent("proof_checkpoint_observed", { checkpoint }));
    this.maybeComplete(session);
    return this.sessionState(session, checkpoint);
  }

  stateSnapshot(session: SyntheticSession, checkpoint: Checkpoint) {
    return { ...this.statePayload(checkpoint, session), ...this.sessionState(session, checkpoint) };
  }

  recordConflictResolution(session: SyntheticSession, input: { conflictId: string; disposition: string; retainedClaimIds: string[]; scope: string; rationale: string }) {
    if (!session.observed.has("ebitda_conflict")) throw new SyntheticProofError("proof_step_required", "Inspect the EBITDA conflict before recording its scoped disposition.");
    if (input.conflictId !== "synthetic-conflict-ebitda" || input.disposition !== "scoped_simulated_disposition" || input.scope.length < 1 || input.rationale.length < 1 || input.retainedClaimIds.slice().sort().join(",") !== ["synthetic-claim-ebitda-17-8", "synthetic-claim-ebitda-18-4"].join(",")) {
      throw new SyntheticProofError("invalid_conflict_disposition", "Retain both EBITDA Claims and record a scoped simulated disposition; overwrite and averaging are not permitted.", 422, "record_scoped_disposition");
    }
    if (!session.conflict_resolution) {
      session.conflict_resolution = {
        id: "synthetic-decision-ebitda-scope",
        conflict_id: input.conflictId,
        disposition: input.disposition,
        retained_claim_ids: input.retainedClaimIds,
        retained_values: ["18.4", "17.8"],
        scope: input.scope,
        rationale: input.rationale,
        actor_id: "synthetic-prospective-banker",
        overwrite: false,
        average: false,
      };
      session.events.push(syntheticEvent("synthetic_conflict_disposition_recorded", session.conflict_resolution));
    }
    this.maybeComplete(session);
    return session.conflict_resolution;
  }

  recordCorrection(session: SyntheticSession, input: { claimId: string; evidenceId: string; correctedValue: string; actorId: string; reason: string }) {
    if (!session.observed.has("cash_extraction")) throw new SyntheticProofError("proof_step_required", "Inspect the original Cash extraction before recording a correction.");
    if (input.claimId !== "synthetic-claim-cash-extraction" || input.evidenceId !== "synthetic-evidence-cash-balance-sheet-f28" || input.correctedValue !== "4.7" || input.actorId.length < 1 || input.reason.length < 1) {
      throw new SyntheticProofError("invalid_cash_correction", "The synthetic Cash correction must preserve 6.2, correct to 4.7, and include an actor and reason.", 422, "record_cash_correction");
    }
    if (!session.correction) {
      session.correction = {
        id: "synthetic-correction-cash-001",
        claim_id: input.claimId,
        evidence_id: input.evidenceId,
        original_value: "6.2",
        corrected_value: "4.7",
        delta: "1.5",
        actor_id: input.actorId,
        reason: input.reason,
      };
      session.events.push(syntheticEvent("synthetic_cash_correction_recorded", session.correction));
      session.observed.add("cash_correction");
    }
    this.maybeComplete(session);
    return session.correction;
  }

  createDeterministicRun(session: SyntheticSession, input: { ruleSet: string; correctedCash: string }) {
    if (!session.correction || !session.conflict_resolution) throw new SyntheticProofError("proof_step_required", "Record the Cash correction and EBITDA disposition before deterministic recovery.");
    if (input.ruleSet !== "synthetic-northstar-tie-out-v1" || input.correctedCash !== "4.7") throw new SyntheticProofError("invalid_deterministic_input", "The deterministic adapter accepts only the recorded 4.7 Cash correction and pinned rule set.", 422, "use_recorded_inputs");
    if (!session.deterministic_job) {
      session.deterministic_job = {
        id: `synthetic-job-${crypto.randomUUID()}`,
        kind: "deterministic_recovery",
        state: "completed",
        synthetic: true,
        created_at: nowIso(),
        result: { tie_out_before: "1.5", tie_out_after: "0.0", change: "1.5", rule_set: input.ruleSet, engine: "synthetic-deterministic-adapter-v1", coverage: "cash_ev_to_equity_tie_out" },
      };
      session.events.push(syntheticEvent("synthetic_deterministic_recovery_completed", { job_id: session.deterministic_job.id, ...session.deterministic_job.result }));
      session.observed.add("deterministic_recovery");
    }
    this.maybeComplete(session);
    return session.deterministic_job;
  }

  recordImpactAcceptance(session: SyntheticSession, input: { assessmentId: string; acceptedScope: string[] }) {
    if (!session.deterministic_job) throw new SyntheticProofError("proof_step_required", "Complete deterministic recovery before accepting its affected scope.");
    const expected = ["workbook", "cim", "reader_copy", "qc", "package_readiness"];
    if (input.assessmentId !== "synthetic-impact-014" || input.acceptedScope.slice().sort().join(",") !== expected.slice().sort().join(",")) throw new SyntheticProofError("invalid_impact_scope", "The affected scope must include the workbook, CIM, Reader Copy, QC and Package Readiness consequences.", 422, "accept_affected_scope");
    if (!session.impact_acceptance) {
      session.impact_acceptance = { id: input.assessmentId, affected_scope: input.acceptedScope, recalculation: "required", regeneration: "required", re_review: "required", circulation: "blocked", unaffected: ["unrelated_buyer_research"] };
      session.events.push(syntheticEvent("synthetic_impact_scope_accepted", session.impact_acceptance));
      session.observed.add("affected_outputs");
    }
    this.maybeComplete(session);
    return session.impact_acceptance;
  }

  createRevision(session: SyntheticSession, input: { sourceRecordId: string; reason: string }) {
    if (!session.impact_acceptance) throw new SyntheticProofError("proof_step_required", "Accept the affected outputs before appending a new synthetic Revision.");
    if (input.sourceRecordId !== "synthetic-sr-006" || input.reason.length < 1) throw new SyntheticProofError("invalid_revision_input", "Revision 0.4 requires the synthetic SR-006 source record and a reason.", 422, "append_sr_006");
    if (!session.revision_job) {
      const revision = this.revision("0.4");
      session.revision_job = {
        id: `synthetic-job-${crypto.randomUUID()}`,
        kind: "revision_creation",
        state: "completed",
        synthetic: true,
        created_at: nowIso(),
        result: { revision: this.revisionProjection(revision), previous_revision: this.revisionProjection(this.revision("0.3")), source_record_id: input.sourceRecordId, reason: input.reason },
      };
      session.events.push(syntheticEvent("synthetic_revision_created", { job_id: session.revision_job.id, revision_id: revision.id, revision: revision.number, previous_revision: "0.3", authorization_carry_forward: false }));
      session.observed.add("revision_boundary");
      session.events.push(syntheticEvent("synthetic_authorization_boundary_observed", { prior_revision: "0.3", returned_revision: "0.4", carry_forward: false }));
    }
    this.maybeComplete(session);
    return session.revision_job;
  }

  getJob(session: SyntheticSession, jobId: string) {
    if (session.deterministic_job?.id === jobId) return session.deterministic_job;
    if (session.revision_job?.id === jobId) return session.revision_job;
    return undefined;
  }

  recordArtifactDownload(session: SyntheticSession, artifactId: string, downloadedSha256: string) {
    const artifact = this.artifact(artifactId);
    if (!artifact) throw new SyntheticProofError("resource_not_found", "The requested resource is not available.", 404, "return_to_public_proof");
    if (artifact.revision === "0.4" && !session.revision_job) throw new SyntheticProofError("resource_not_found", "The requested resource is not available.", 404, "append_sr_006");
    if (downloadedSha256 !== artifact.sha256) throw new SyntheticProofError("artifact_integrity_mismatch", "The downloaded synthetic artifact does not match the exact Revision hash.", 422, "redownload_exact_artifact");
    if (artifact.revision === "0.4") {
      const alreadyRecorded = session.events.some((event) => event.type === "synthetic_artifact_downloaded" && event.artifact_id === artifact.id);
      if (!alreadyRecorded) session.events.push(syntheticEvent("synthetic_artifact_downloaded", { artifact_id: artifact.id, revision: artifact.revision, sha256: artifact.sha256 }));
      if (artifact.format === "archive-manifest") {
        session.observed.add("manifest_download");
        this.maybeComplete(session);
      }
    }
    return artifact;
  }

  artifact(id: string) {
    let artifact = this.artifacts.get(id);
    if (!artifact) {
      const match = id.match(/^synthetic-northstar-rev-(0\.3|0\.4)-(xlsx|pptx|docx|pdf|control-records|archive-manifest)$/);
      if (!match) return undefined;
      const revision = match[1];
      const format = match[2] as ArtifactFormat;
      let bytes: Buffer;
      if (format === "pdf") bytes = pdfBytes(revision);
      else if (format === "control-records" || format === "archive-manifest") bytes = Buffer.from(JSON.stringify(this.controlRecordPayload(revision, format), null, 2));
      else bytes = officeBytes(format, revision);
      const suffix = format === "control-records" || format === "archive-manifest" ? `-${format}` : "";
      artifact = { id, filename: `project-northstar-revision-${revision}${suffix}.${extensionByFormat[format]}`, format, mime_type: mimeByFormat[format], revision, rights_posture: "rights_cleared_synthetic", sha256: sha256(bytes), bytes };
      this.artifacts.set(id, artifact);
    }
    return artifact;
  }

  recorded() {
    return {
      synthetic: true,
      interactive_completion_emitted: false,
      title: "Project Northstar recorded control-loop walkthrough",
      disclosure: "Every company, source, value, action and artifact is synthetic. This recording demonstrates the product interaction and control model; it is not evidence that production processing or security requirements have passed.",
      continuation_actions: [
        { label: "Open the interactive proof", href: "/project-northstar" },
        { label: "Review pricing", href: "/pricing" },
        { label: "Check qualification", href: "/qualification" },
      ],
      chapters: requiredCheckpoints.map((checkpoint, index) => ({ number: index + 1, checkpoint, href: `/project-northstar/${checkpoint.replaceAll("_", "-")}`, transcript: this.chapterTranscript(checkpoint) })),
    };
  }

  publicProof() {
    return {
      synthetic: true,
      fixture: "project_northstar",
      fixture_version: PROJECT_NORTHSTAR_FIXTURE_VERSION,
      disclosure: "Every company, source, value, action and artifact in Project Northstar is synthetic. This proof demonstrates the product interaction and control model; it is not evidence that production processing or security requirements have passed.",
      real_uploads_allowed: false,
      confidential_processing_allowed: false,
      counts_as_paid_activation: false,
      counts_as_production_provider_evidence: false,
      counts_as_production_security_evidence: false,
      current_revision: this.revisionProjection(this.revision("0.3")),
      required_checkpoints: requiredCheckpoints,
      source_lineage: this.sourceLineage(false),
      claims: this.claims(),
      cash_extraction: this.cashExtraction(),
      package_readiness: this.packageReadiness("0.3"),
      next_actions: ["start_synthetic_proof_session", "watch_recorded_walkthrough", "continue_to_pricing", "continue_to_qualification"],
    };
  }

  publicState(checkpointName: string) {
    const checkpoint = this.normalizeCheckpoint(checkpointName);
    if (!checkpoint) return undefined;
    return this.statePayload(checkpoint, undefined);
  }

  sessionState(session: SyntheticSession, lastObserved?: string) {
    const revision = session.revision_job?.result.revision as SyntheticRevision | undefined;
    const projectedCurrentRevision = revision ?? this.revisionProjection(this.revision("0.3"));
    const packageReadiness = session.impact_acceptance
      ? { ...this.packageReadiness(revision?.number ?? "0.3"), package_readiness: "blocked", external_use: "not_authorized" }
      : revision
        ? this.packageReadiness(revision.number)
        : (session.correction || session.conflict_resolution || session.deterministic_job)
          ? { ...this.packageReadiness("0.3"), package_readiness: "blocked", external_use: "not_authorized" }
          : this.packageReadiness("0.3");
    return {
      ...this.publicProof(),
      id: session.id,
      state: lastObserved ?? null,
      session: { id: session.id, fixture_version: session.fixture_version, created_at: session.created_at, expires_at: new Date(session.expires_at).toISOString(), resumable: true, cookie: "__Host-northstar_proof" },
      observed_checkpoints: requiredCheckpoints.filter((checkpoint) => session.observed.has(checkpoint)),
      last_observed_checkpoint: lastObserved ?? null,
      source_lineage: this.sourceLineage(Boolean(revision)),
      current_revision: projectedCurrentRevision,
      package_readiness: packageReadiness,
      revisions: [this.revisionProjection(this.revision("0.3")), ...(revision ? [revision] : [])],
      conflict_resolution: session.conflict_resolution ?? null,
      correction: session.correction ?? null,
      deterministic_recovery: session.deterministic_job?.result ?? null,
      affected_outputs: session.impact_acceptance ?? null,
      events: session.events,
      completion: session.completion_event ? { status: "completed", event: session.completion_event } : { status: "incomplete", required_checkpoints: requiredCheckpoints, missing_checkpoints: requiredCheckpoints.filter((checkpoint) => !session.observed.has(checkpoint)) },
      artifacts: projectedCurrentRevision.artifacts,
    };
  }

  artifactMetadata(id: string) {
    const artifact = this.artifact(id);
    return artifact ? this.toArtifactMetadata(artifact) : undefined;
  }

  normalizeCheckpoint(value: string): Checkpoint | undefined {
    const normalized = value.replaceAll("-", "_");
    return (requiredCheckpoints as readonly string[]).includes(normalized) ? normalized as Checkpoint : undefined;
  }

  private maybeComplete(session: SyntheticSession) {
    const sourceLineageObserved = session.events.some((event) => event.type === "source_lineage_observed");
    const controlledActionsRecorded = Boolean(session.conflict_resolution && session.correction && session.deterministic_job && session.impact_acceptance && session.revision_job);
    const manifestDownloaded = session.events.some((event) => event.type === "synthetic_artifact_downloaded" && event.artifact_id === "synthetic-northstar-rev-0.4-archive-manifest");
    const nativeArtifactInspected = session.events.some((event) => event.type === "synthetic_artifact_downloaded" && event.artifact_id === "synthetic-northstar-rev-0.4-xlsx");
    const readerCopyInspected = session.events.some((event) => event.type === "synthetic_artifact_downloaded" && event.artifact_id === "synthetic-northstar-rev-0.4-pdf");
    if (!session.completion_event && sourceLineageObserved && controlledActionsRecorded && nativeArtifactInspected && readerCopyInspected && manifestDownloaded && requiredCheckpoints.every((checkpoint) => session.observed.has(checkpoint))) {
      session.completion_event = syntheticEvent("synthetic_proof_completed", { completion: "interactive_control_loop_observed", required_checkpoints: requiredCheckpoints, paid_activation: false });
      session.events.push(session.completion_event);
    }
  }

  private statePayload(checkpoint: Checkpoint, session: SyntheticSession | undefined) {
    const currentRevision = session?.revision_job?.result.revision as SyntheticRevision | undefined;
    const postRevisionCheckpoint = ["revision_boundary", "authorization_boundary", "manifest_download"].includes(checkpoint);
    const previewRevision = currentRevision ?? (postRevisionCheckpoint ? this.revision("0.4") : undefined);
    const base = this.publicProof();
    if (previewRevision) {
      const projectedRevision = this.revisionProjection(previewRevision);
      base.current_revision = session ? projectedRevision : { ...projectedRevision, artifacts: [] };
      base.source_lineage = this.sourceLineage(true);
      base.package_readiness = this.packageReadiness(previewRevision.number);
    }
    if (["cash_correction", "deterministic_recovery", "affected_outputs", "revision_boundary", "authorization_boundary", "manifest_download"].includes(checkpoint)) {
      base.package_readiness = { ...base.package_readiness, package_readiness: "blocked", external_use: "not_authorized" };
    }
    const payload: Record<string, unknown> = { ...base, state: checkpoint, current_revision: previewRevision ? base.current_revision : base.current_revision, recorded_interactive_completion: false };
    if (checkpoint === "ebitda_conflict") payload.conflict = { id: "synthetic-conflict-ebitda", claims: this.claims().filter((claim) => claim.kind === "ebitda"), required_disposition: "scoped_simulated_disposition", forbidden: ["overwrite", "average"] };
    if (checkpoint === "cash_extraction" || checkpoint === "cash_correction") payload.cash_extraction = this.cashExtraction();
    if (checkpoint === "cash_correction") payload.correction = session?.correction ?? null;
    if (checkpoint === "deterministic_recovery") payload.deterministic_recovery = session?.deterministic_job?.result ?? { tie_out_before: "1.5", expected_after: "0.0", required_input: "4.7" };
    if (checkpoint === "affected_outputs") payload.affected_outputs = session?.impact_acceptance ?? { recalculation: "required", regeneration: "required", re_review: "required", circulation: "blocked", artifacts: ["workbook", "cim", "reader_copy"] };
    if (checkpoint === "revision_boundary") {
      const returnedRevision = this.revisionProjection(previewRevision ?? this.revision("0.4"));
      payload.revision_boundary = { previous_revision: this.revisionProjection(this.revision("0.3")), returned_revision: session ? returnedRevision : { ...returnedRevision, artifacts: [] }, source_record: "synthetic-sr-006", history_preserved: true };
    }
    if (checkpoint === "authorization_boundary") payload.authorization_boundary = { prior_revision: "0.3", prior_status: "authorized", returned_revision: previewRevision?.number ?? "0.4", returned_status: "not_authorized", carry_forward: false };
    if (checkpoint === "manifest_download") payload.artifacts = base.current_revision.artifacts;
    return payload;
  }

  private revision(number: "0.3" | "0.4"): SyntheticRevision {
    const artifacts = (["xlsx", "pptx", "docx", "pdf", "control-records", "archive-manifest"] as ArtifactFormat[]).map((format) => this.artifact(`synthetic-northstar-rev-${number}-${format}`)!);
    return {
      id: `synthetic-revision-${number.replace(".", "-")}`,
      number,
      source_record_ids: number === "0.3" ? ["synthetic-sr-002", "synthetic-sr-003", "synthetic-sr-005"] : ["synthetic-sr-002", "synthetic-sr-003", "synthetic-sr-005", "synthetic-sr-006"],
      created_at: number === "0.3" ? "2026-08-01T00:00:00.000Z" : "2026-08-01T00:00:01.000Z",
      immutable: true,
      external_use_authorization: number === "0.3" ? { status: "authorized", decision_id: "synthetic-eud-018", bound_revision: "0.3", carry_forward: false } : { status: "not_authorized", decision_id: null, bound_revision: "0.4", carry_forward: false, prior_authorization: "does_not_carry_forward" },
      artifacts,
    };
  }

  private toArtifactMetadata(artifact: SyntheticArtifact) {
    const { bytes: _bytes, ...metadata } = artifact;
    return { synthetic: true, ...metadata, download_url: `/api/v1/public/project-northstar/artifacts/${artifact.id}/download` };
  }

  private revisionProjection(revision: SyntheticRevision) {
    return { ...revision, artifacts: revision.artifacts.map((artifact) => this.toArtifactMetadata(artifact)) };
  }

  private sourceLineage(includeSr006 = true) {
    const sources = [
      { id: "synthetic-sr-002", label: "Draft CIM", version: "0.3", locator: { type: "pptx", slide: 3, label: "CLM-018" }, rights_posture: "rights_cleared_synthetic", claim_ids: ["synthetic-claim-ebitda-18-4"] },
      { id: "synthetic-sr-003", label: "Management Model", version: "0.3", locator: { type: "xlsx", sheet: "Operating Case", cell: "F42" }, rights_posture: "rights_cleared_synthetic", claim_ids: ["synthetic-claim-ebitda-17-8"] },
      { id: "synthetic-sr-005", label: "Balance Sheet extraction", version: "v1", locator: { type: "xlsx", sheet: "Balance Sheet", cell: "F28" }, rights_posture: "rights_cleared_synthetic", claim_ids: ["synthetic-claim-cash-extraction"] },
      { id: "synthetic-sr-006", label: "July Actuals", version: "0.1", locator: { type: "xlsx", sheet: "Actuals", cell: "F28" }, rights_posture: "rights_cleared_synthetic", claim_ids: [] },
    ];
    return includeSr006 ? sources : sources.slice(0, 3);
  }

  private claims() {
    return [
      { id: "synthetic-claim-ebitda-18-4", kind: "ebitda", value: "18.4", unit: "USD millions", currency: "USD", scale: "millions", precision: "0.1", period: "FY2025", source_record_id: "synthetic-sr-002", state: "conflicted", origin: "synthetic_source" },
      { id: "synthetic-claim-ebitda-17-8", kind: "ebitda", value: "17.8", unit: "USD millions", currency: "USD", scale: "millions", precision: "0.1", period: "FY2025", source_record_id: "synthetic-sr-003", state: "conflicted", origin: "synthetic_source" },
      { id: "synthetic-claim-cash-extraction", kind: "cash", value: "6.2", corrected_value: "4.7", unit: "USD millions", currency: "USD", scale: "millions", precision: "0.1", period: "FY2025", source_record_id: "synthetic-sr-005", state: "corrected", origin: "synthetic_extraction" },
    ];
  }

  private cashExtraction() {
    return { original_value: "6.2", source_value: "4.7", original_source_record_id: "synthetic-sr-005", source_record_id: "synthetic-sr-005", source_locator: "Balance Sheet!F28", correction_delta: "1.5", correction_required: true };
  }

  private packageReadiness(revision: string) {
    return { source_lineage: "observed", deterministic_validation: "passed", native_artifact: "available", reader_copy: "available", qc: "reviewed", package_readiness: "analysis-ready", external_use: revision === "0.3" ? "authorized_for_exact_revision_only" : "not_authorized" };
  }

  private cleanupExpiredSessions() {
    const now = Date.now();
    for (const [id, session] of this.sessions) if (session.expires_at <= now) this.sessions.delete(id);
  }

  private controlRecordPayload(revision: string, format: "control-records" | "archive-manifest") {
    const payload: Record<string, unknown> = { synthetic: true, fixture: "project_northstar", revision, record_type: format, source_lineage: this.sourceLineage(revision === "0.4"), cash_correction: { original: "6.2", corrected: "4.7", delta: "1.5" }, ebitda_claims: ["18.4", "17.8"], external_use_authorization: revision === "0.3" ? "authorized_exact_revision_only" : "not_authorized_prior_revision_does_not_carry_forward" };
    if (format === "archive-manifest") {
      payload.members = (["xlsx", "pptx", "docx", "pdf", "control-records"] as const).map((member) => {
        const artifact = this.artifact(`synthetic-northstar-rev-${revision}-${member}`);
        return { id: artifact?.id, revision, sha256: artifact?.sha256 };
      });
    }
    return payload;
  }

  private chapterTranscript(checkpoint: Checkpoint) {
    const text: Record<Checkpoint, string> = {
      package_outcome: "Inspect the complete synthetic Controlled Auction Execution Package and its source lineage.",
      ebitda_conflict: "Both the 18.4 and 17.8 EBITDA Claims remain visible; the recording shows a scoped disposition rather than overwrite or averaging.",
      cash_extraction: "The original 6.2 Cash extraction remains visible alongside the Balance Sheet source value of 4.7.",
      cash_correction: "A synthetic Banker records the correction with actor and reason evidence.",
      deterministic_recovery: "The deterministic tie-out changes by exactly 1.5, from 1.5 to 0.0.",
      affected_outputs: "The workbook, CIM, Reader Copy, QC and Package Readiness consequences are shown separately.",
      revision_boundary: "Appending SR-006 creates Revision 0.4 and preserves Revision 0.3 history.",
      authorization_boundary: "Revision 0.3 authorization does not carry to Revision 0.4.",
      manifest_download: "Rights-cleared synthetic files, control records and archive manifest are bound to their exact Revision and hashes.",
    };
    return text[checkpoint];
  }
}

export type { SyntheticArtifact, SyntheticJob, SyntheticRevision };
