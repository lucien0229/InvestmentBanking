import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import pg from "pg";
import {
  encryptProtected,
  decryptProtected,
  protectedPath,
} from "./sources.js";
import {
  canonicalJson,
  GoogleKmsArtifactSigner,
  makeManifest,
  sha256,
  verifyManifest,
  type ArtifactCheck,
  type ArtifactSigner,
} from "./artifact-integrity.js";
import {
  executeAiProposalRun,
  HelloXAiProvider,
  type AiStartCommand,
} from "./ai-source-proposals.js";

import { DevelopmentArtifactSigner } from "./development-artifact-signer.js";

function configuredArtifactSigner(): ArtifactSigner {
  if (process.env.ARTIFACT_ACCEPTANCE_PROFILE === "development_foss_v1") {
    if (process.env.APP_ENV !== "development") throw new Error("artifact_signer_development_only");
    return new DevelopmentArtifactSigner();
  }
  return new GoogleKmsArtifactSigner();
}

type WorkbookInput = {
  revision_id: string;
  provenance?: string;
  purpose: string;
  audience: string;
  calculations: unknown[];
  limitations: string[];
  template_version?: string;
  process_state?: Record<string, unknown>;
};
export type RenderedWorkbook = {
  report: Record<string, unknown>;
  checks: ArtifactCheck[];
  files: Array<{ path: string; content: string }>;
};
export interface OfficeRenderer {
  render(input: WorkbookInput): Promise<RenderedWorkbook>;
  inspect(
    input: WorkbookInput,
    native: Buffer,
    reader: Buffer,
  ): Promise<{ checks: ArtifactCheck[]; report: Record<string, unknown> }>;
}
/** The supervisor accepts only this fixed workbook contract; the app cannot pass commands, host paths or container options. */
export class SocketOfficeRenderer implements OfficeRenderer {
  async render(input: WorkbookInput): Promise<RenderedWorkbook> {
    return this.call({
      operation: input.template_version === "auction-control-1.0.0" ? "build_auction_control_workbook" : "build_analysis_workbook",
      input,
    }) as Promise<RenderedWorkbook>;
  }
  async inspect(input: WorkbookInput, native: Buffer, reader: Buffer) {
    return this.call({
      operation: input.template_version === "auction-control-1.0.0" ? "inspect_auction_control_workbook" : "inspect_analysis_workbook",
      input,
      native: native.toString("base64"),
      reader: reader.toString("base64"),
    }) as Promise<{ checks: ArtifactCheck[]; report: Record<string, unknown> }>;
  }
  private async call(payload: Record<string, unknown>): Promise<unknown> {
    const socket = process.env.OFFICE_RENDERER_SOCKET;
    if (!socket) throw new Error("office_renderer_configuration_required");
    const body = JSON.stringify(payload);
    if (
      Buffer.byteLength(body) >
      (payload.operation === "build_analysis_workbook" || payload.operation === "build_auction_control_workbook"
        ? 250000
        : 64 * 1024 * 1024)
    )
      throw new Error("workbook_input_limit");
    return new Promise((resolve, reject) => {
      const request = http.request(
        {
          socketPath: socket,
          path: "/v1/workbook",
          method: "POST",
          headers: {
            "content-type": "application/json",
            "content-length": Buffer.byteLength(body),
          },
        },
        (response) => {
          const parts: Buffer[] = [];
          let size = 0;
          response.on("data", (part: Buffer) => {
            size += part.length;
            if (size > 96 * 1024 * 1024)
              response.destroy(new Error("artifact_output_limit"));
            else parts.push(part);
          });
          response.on("error", reject);
          response.on("end", () => {
            if (response.statusCode !== 200) {
              reject(new Error("office_renderer_failed"));
              return;
            }
            try {
              resolve(
                JSON.parse(
                  Buffer.concat(parts).toString("utf8"),
                ) as RenderedWorkbook,
              );
            } catch {
              reject(new Error("office_renderer_invalid_output"));
            }
          });
        },
      );
      request.setTimeout(180000, () =>
        request.destroy(new Error("office_renderer_timeout")),
      );
      request.on("error", reject);
      request.end(body);
    });
  }
}
function classify(path: string) {
  if (path === "auction-control.xlsx")
    return { role: "native", media: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
  if (path === "auction-control.pdf") return { role: "reader", media: "application/pdf" };
  if (path === "analysis-valuation.xlsx")
    return {
      role: "native",
      media:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  if (path === "analysis-valuation.pdf")
    return { role: "reader", media: "application/pdf" };
  if (/^(native|reader)-page-[1-9]\d{0,2}\.png$/.test(path))
    return {
      role: path.startsWith("native") ? "native_preview" : "reader_preview",
      media: "image/png",
    };
  if (path === "render-report.json")
    return { role: "render_report", media: "application/json" };
  throw new Error("artifact_output_path_invalid");
}
type StoredArtifact = {
  id: string;
  role: string;
  plaintext_sha256: string;
  byte_length: number;
  object: { storage_key: string; ciphertext_sha256: string };
};
type ScopedStep = {
  input: WorkbookInput;
  revision_id: string;
  input_digest: string;
  job_type: string;
  job_scope_id: string;
  account_id: string;
  actor_id: string;
  deal_id: string;
  artifacts: StoredArtifact[];
  report: Record<string, unknown>;
  manifest:
    | (StoredArtifact & {
        canonical_payload: string;
        signature: string;
        public_key_pem: string;
      })
    | null;
};
async function readStored(artifact: StoredArtifact) {
  const container = await fs.promises.readFile(
    protectedPath(artifact.object.storage_key),
  );
  if (sha256(container) !== artifact.object.ciphertext_sha256)
    throw new Error("artifact_ciphertext_integrity_failed");
  const { plaintext: bytes } = await decryptProtected(container);
  if (
    bytes.length !== Number(artifact.byte_length) ||
    sha256(bytes) !== artifact.plaintext_sha256
  )
    throw new Error("artifact_plaintext_integrity_failed");
  return bytes;
}
export class WorkbookRuntime {
  private readonly dispatcher: pg.Pool;
  private readonly worker: pg.Pool;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private active: Promise<void> | null = null;
  constructor(
    private readonly renderer: OfficeRenderer = new SocketOfficeRenderer(),
    private readonly signer: ArtifactSigner = configuredArtifactSigner(),
  ) {
    const ca = process.env.DATABASE_SSL_CA_FILE;
    const ssl = ca ? { ca: fs.readFileSync(ca, "utf8") } : undefined;
    this.dispatcher = new pg.Pool({
      connectionString: process.env.JOB_DISPATCHER_DATABASE_URL,
      ssl,
      max: 1,
    });
    this.worker = new pg.Pool({
      connectionString: process.env.JOB_WORKER_DATABASE_URL,
      ssl,
      max: 1,
    });
  }
  start() {
    if (
      !process.env.JOB_DISPATCHER_DATABASE_URL ||
      !process.env.JOB_WORKER_DATABASE_URL
    )
      throw new Error("artifact_worker_credentials_required");
    const tick = async () => {
      if (this.stopped) return;
      this.active = this.runOnce().catch(() => {
        /* Lease expires and durable dispatcher retries; no provider details enter logs. */
      });
      await this.active;
      this.active = null;
      if (!this.stopped) this.timer = setTimeout(tick, 2000);
    };
    void tick();
  }
  async runOnce() {
    const lease = (
      await this.dispatcher.query<{
        data: { job_id: string; lease_token: string } | null;
      }>("SELECT deliverable.dispatch_workbook_job() AS data")
    ).rows[0]?.data;
    if (!lease) return;
    const client = await this.worker.connect();
    try {
      await client.query("BEGIN");
      const scoped = (
        await client.query<{ data: ScopedStep }>(
          "SELECT deliverable.begin_workbook_step($1,$2) AS data",
          [lease.job_id, lease.lease_token],
        )
      ).rows[0]!.data;
      await client.query("SELECT deliverable.clear_workbook_step()");
      await client.query("COMMIT");
      if (scoped.job_type === "analysis_workbook_qc") {
        const members = [];
        let checks: ArtifactCheck[] = [];
        let inspection: Record<string, unknown> = {};
        let failure: string | null = null;
        try {
          let size = 0;
          for (const artifact of scoped.artifacts) {
            const bytes = await readStored(artifact);
            size += bytes.length;
            if (size > 64 * 1024 * 1024)
              throw new Error("artifact_output_limit");
            members.push({ id: artifact.id, role: artifact.role, bytes });
          }
          const native = members.find((m) => m.role === "native"),
            reader = members.find((m) => m.role === "reader");
          if (!native || !reader) throw new Error("artifact_pair_missing");
          const inspected = await this.renderer.inspect(
            scoped.input,
            native.bytes,
            reader.bytes,
          );
          checks = inspected.checks;
          inspection = inspected.report;
          const signed = scoped.manifest;
          if (signed) {
            const envelope = JSON.parse(
              (await readStored(signed)).toString("utf8"),
            ) as {
              canonical_payload: string;
              signature: string;
              public_key_pem: string;
            };
            if (
              envelope.canonical_payload !== signed.canonical_payload ||
              envelope.signature !== signed.signature ||
              envelope.public_key_pem !== signed.public_key_pem
            )
              throw new Error("artifact_manifest_integrity_failed");
          }
          const valid = signed
            ? verifyManifest(
                JSON.parse(signed.canonical_payload),
                signed.signature,
                signed.public_key_pem,
                members,
              )
            : false;
          checks.push({
            code: "signed_manifest",
            outcome: signed ? (valid ? "passed" : "failed") : "missing",
            detail: signed
              ? "Exact stored bytes and canonical signature independently verified"
              : "artifact_signer_configuration_required",
          });
        } catch (error) {
          failure =
            error instanceof Error &&
            /^(artifact|office|workbook)_[a-z_]+$/.test(error.message)
              ? error.message
              : "artifact_inspection_failed";
          // Integrity failures are recorded as Critical Findings, even when a file cannot be parsed.
          if (
            failure.includes("integrity") ||
            failure === "artifact_pair_missing"
          ) {
            checks = [
              "native_structure",
              "recalculation",
              "lineage",
              "native_reader_parity",
              "clean_copy",
              "signed_manifest",
            ].map((code) => ({ code, outcome: "failed", detail: failure! }));
            failure = null;
          }
        }
        await client.query("BEGIN");
        await client.query(
          "SELECT deliverable.complete_qc_step($1,$2,$3,$4,$5)",
          [
            lease.job_id,
            lease.lease_token,
            JSON.stringify(checks),
            JSON.stringify({
              ...scoped.report,
              ...inspection,
              revision_id: scoped.revision_id,
            }),
            failure,
          ],
        );
        await client.query("COMMIT");
        return;
      }
      if (scoped.job_type === "workbook_ai_review") {
        await client.query("BEGIN");
        await client.query(
          "SELECT deliverable.begin_ai_worker_context($1,$2)",
          [lease.job_id, lease.lease_token],
        );
        let runId: string | null = null;
        let failureCode: string | null = null;
        if (!process.env.HELLOX_API_KEY)
          failureCode = "ai_provider_configuration_required";
        else {
          const result = await executeAiProposalRun(
            client,
            { accountId: scoped.account_id, actorId: scoped.actor_id },
            scoped.deal_id,
            {
              ...scoped.input,
              job_id: lease.job_id,
              job_scope_id: scoped.job_scope_id,
            } as unknown as AiStartCommand,
            lease.job_id,
            `sha256:${scoped.input_digest}`,
            new HelloXAiProvider(),
            {
              release: async () => {
                await client.query("SELECT deliverable.clear_workbook_step()");
                await client.query("COMMIT");
              },
              restore: async () => {
                await client.query("BEGIN");
                await client.query(
                  "SELECT deliverable.begin_ai_worker_context($1,$2)",
                  [lease.job_id, lease.lease_token],
                );
              },
            },
          );
          runId = result.runId;
          failureCode =
            "failureCode" in result ? (result.failureCode ?? null) : null;
        }
        await client.query(
          "SELECT deliverable.complete_ai_worker_step($1,$2,$3,$4)",
          [lease.job_id, lease.lease_token, runId, failureCode],
        );
        await client.query("COMMIT");
        return;
      }
      let files: Record<string, unknown>[] = [];
      let report: Record<string, unknown> = {};
      let checks: ArtifactCheck[] = [];
      let signed: Record<string, unknown> | null = null;
      let failure: string | null = null;
      try {
        const rendered = await this.renderer.render(scoped.input);
        if (
          rendered.report.revision_id !== scoped.revision_id ||
          !Array.isArray(rendered.files) ||
          rendered.files.length < 2 ||
          rendered.files.length > 100 ||
          new Set(rendered.files.map((f) => f.path)).size !==
            rendered.files.length
        )
          throw new Error("artifact_worker_output_invalid");
        const profile = process.env.ARTIFACT_ACCEPTANCE_PROFILE ?? "production_v1";
        if (profile === "development_foss_v1") {
          if (process.env.APP_ENV !== "development" || scoped.input.provenance !== "synthetic"
            || rendered.report.engine !== "libreoffice.calc"
            || rendered.report.acceptance_profile !== profile)
            throw new Error("artifact_development_scope_invalid");
        } else if (profile !== "production_v1" || rendered.report.engine !== "aspose.cells.python.net"
          || (rendered.report.acceptance_profile ?? "production_v1") !== profile) {
          throw new Error("artifact_renderer_profile_mismatch");
        }
        report = rendered.report;
        checks = rendered.checks;
        if (
          !Array.isArray(checks) ||
          checks.some(
            (c) => !["passed", "failed", "missing"].includes(c.outcome),
          )
        )
          throw new Error("artifact_worker_checks_invalid");
        const members = [];
        let total = 0;
        for (const file of rendered.files) {
          const type = classify(file.path);
          const bytes = Buffer.from(file.content, "base64");
          total += bytes.length;
          if (total > 64 * 1024 * 1024 || !bytes.length)
            throw new Error("artifact_output_limit");
          const id = crypto.randomUUID();
          const object = crypto.randomUUID();
          const encrypted = await encryptProtected(bytes, type.media, object);
          files.push({
            id,
            object_id: object,
            role: type.role,
            path: file.path,
            media_type: type.media,
            byte_length: bytes.length,
            sha256: sha256(bytes),
            storage_key: encrypted.storageKey,
            ciphertext_sha256: encrypted.ciphertextSha256,
            envelope_version: encrypted.envelopeVersion,
            kms_key_version: encrypted.kmsKeyVersion,
            wrapped_dek: encrypted.wrappedDek,
          });
          members.push({ id, role: type.role, path: file.path, bytes });
        }
        const manifest = makeManifest({
          revisionId: scoped.revision_id,
          purpose: scoped.input.purpose,
          audience: scoped.input.audience,
          dependencies: scoped.input.calculations,
          engine: {
            name: String(report.engine),
            acceptance_profile: String(report.acceptance_profile ?? "production_v1"),
            version: String(report.engine_version),
            template: String(report.template_version),
            container_digest: String(report.container_digest),
            renderer_version: "analysis-workbook-renderer-1.0.0",
            font_manifest: report.font_manifest ?? [],
          },
          limitations: [
            ...scoped.input.limitations,
            ...((report.limitations as string[]) ?? []),
          ],
          members,
          lineage: (report.lineage as unknown[]) ?? [],
          qc: checks,
        });
        const canonical = canonicalJson(manifest);
        try {
          const signature = await this.signer.sign(canonical);
          const envelope = {
            ...signature,
            revision_id: scoped.revision_id,
            canonical_payload: canonical,
          };
          const bytes = Buffer.from(canonicalJson(envelope));
          const object = crypto.randomUUID();
          const encrypted = await encryptProtected(
            bytes,
            "application/json",
            object,
          );
          signed = {
            ...envelope,
            storage: {
              object_id: object,
              sha256: sha256(bytes),
              byte_length: bytes.length,
              storage_key: encrypted.storageKey,
              ciphertext_sha256: encrypted.ciphertextSha256,
              envelope_version: encrypted.envelopeVersion,
              kms_key_version: encrypted.kmsKeyVersion,
              wrapped_dek: encrypted.wrappedDek,
            },
          };
          checks.push({
            code: "signed_manifest",
            outcome: "passed",
            detail:
              "Ed25519 signature verified against exact canonical bytes and members",
          });
        } catch (error) {
          const code =
            error instanceof Error && /^artifact_[a-z_]+$/.test(error.message)
              ? error.message
              : "artifact_signer_unavailable";
          checks.push({
            code: "signed_manifest",
            outcome: "missing",
            detail: code,
          });
        }
      } catch (error) {
        failure =
          error instanceof Error &&
          /^(artifact|office|workbook)_[a-z_]+$/.test(error.message)
            ? error.message
            : "artifact_generation_failed";
      }
      await client.query("BEGIN");
      await client.query(
        "SELECT deliverable.complete_workbook_step($1,$2,$3,$4,$5,$6,$7)",
        [
          lease.job_id,
          lease.lease_token,
          JSON.stringify(files),
          JSON.stringify(report),
          JSON.stringify(checks),
          signed ? JSON.stringify(signed) : null,
          failure,
        ],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      await client
        .query("SELECT deliverable.fail_workbook_step($1,$2,$3)", [
          lease.job_id,
          lease.lease_token,
          error instanceof Error ? error.message : "artifact_worker_failed",
        ])
        .catch(() => undefined);
      throw error;
    } finally {
      await client
        .query("SELECT deliverable.clear_workbook_step()")
        .catch(() => undefined);
      client.release();
    }
  }
  async close() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    await this.active;
    await Promise.all([this.dispatcher.end(), this.worker.end()]);
  }
}
