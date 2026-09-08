import crypto from "node:crypto";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import pg from "pg";
import { DevelopmentArtifactSigner } from "./development-artifact-signer.js";
import { GoogleKmsArtifactSigner, sha256, type ArtifactSigner } from "./artifact-integrity.js";
import { decryptProtected, encryptProtected, protectedPath } from "./sources.js";
import { buildExportArchive } from "./export-package.js";

function signer(): ArtifactSigner { return process.env.ARTIFACT_ACCEPTANCE_PROFILE === "development_foss_v1" ? new DevelopmentArtifactSigner() : new GoogleKmsArtifactSigner(); }
type Lease = { job_id: string; lease_token: string };
type Input = { export_id: string; revision_id: string; purpose: string; scope: Record<string, unknown>; files: Array<{ path: string; sha256: string; byte_length: number; object: { storage_key: string; ciphertext_sha256: string } }> };
export class ExportRuntime {
  private readonly dispatcher: pg.Pool; private readonly worker: pg.Pool; private timer: ReturnType<typeof setTimeout> | null = null; private stopped = false;
  constructor(private readonly options: { signer?: ArtifactSigner } = {}) { const ca = process.env.DATABASE_SSL_CA_FILE; const ssl = ca ? { ca: fsSync.readFileSync(ca, "utf8") } : undefined; this.dispatcher = new pg.Pool({ connectionString: process.env.JOB_DISPATCHER_DATABASE_URL, ssl, max: 1 }); this.worker = new pg.Pool({ connectionString: process.env.JOB_WORKER_DATABASE_URL, ssl, max: 1 }); }
  start() { if (!process.env.JOB_DISPATCHER_DATABASE_URL || !process.env.JOB_WORKER_DATABASE_URL) throw new Error("export_worker_credentials_required"); const tick = async () => { if (this.stopped) return; await this.runOnce().catch(() => undefined); if (!this.stopped) this.timer = setTimeout(tick, 2000); }; void tick(); }
  async runOnce() {
    await this.cleanup();
    const lease = (await this.dispatcher.query<{ data: Lease | null }>("SELECT external_use.dispatch_export() AS data")).rows[0]?.data; if (!lease) return;
    const input = (await this.worker.query<{ data: Input | null }>("SELECT external_use.begin_export($1,$2) AS data", [lease.job_id, lease.lease_token])).rows[0]?.data; if (!input) return;
    try {
      const members: Array<{ path: string; bytes: Buffer }> = []; let total = 0;
      for (const file of input.files) { const container = await fs.readFile(protectedPath(file.object.storage_key)); if (sha256(container) !== file.object.ciphertext_sha256) throw new Error("export_artifact_integrity_failed"); const decrypted = await decryptProtected(container); if (sha256(decrypted.plaintext) !== file.sha256 || decrypted.plaintext.length !== Number(file.byte_length)) throw new Error("export_artifact_integrity_failed"); total += decrypted.plaintext.length; if (total > 96 * 1024 * 1024) throw new Error("export_package_limit"); members.push({ path: file.path, bytes: decrypted.plaintext }); }
      const built = await buildExportArchive({ exportId: input.export_id, revisionId: input.revision_id, purpose: input.purpose, scope: input.scope, files: members }, this.options.signer ?? signer()); const objectId = crypto.randomUUID();
      await this.worker.query("SELECT external_use.reserve_export_output($1,$2,$3)", [lease.job_id, lease.lease_token, objectId]);
      const encrypted = await encryptProtected(built.archive, "application/zip", objectId);
      await this.worker.query("SELECT external_use.finish_export($1,$2,$3,$4,NULL)", [lease.job_id, lease.lease_token, JSON.stringify({ object_id: objectId, storage_key: encrypted.storageKey, sha256: encrypted.plaintextSha256, ciphertext_sha256: encrypted.ciphertextSha256, byte_length: built.archive.length, envelope_version: encrypted.envelopeVersion, kms_key_version: encrypted.kmsKeyVersion, wrapped_dek: encrypted.wrappedDek }), JSON.stringify(built.signedManifest)]);
    } catch (error) { const code = error instanceof Error && /^export_[a-z_]+$/.test(error.message) ? error.message : "export_processing_failed"; await this.worker.query("SELECT external_use.finish_export($1,$2,'{}'::jsonb,'{}'::jsonb,$3)", [lease.job_id, lease.lease_token, code]).catch(() => undefined); }
  }
  private async cleanup() {
    const candidates = (await this.worker.query<{ data: Array<{ object_id: string; storage_key: string }> }>("SELECT external_use.export_cleanup_candidates() AS data")).rows[0]?.data ?? [];
    for (const item of candidates) {
      await fs.rm(protectedPath(item.storage_key), { force: true });
      await this.worker.query("SELECT external_use.confirm_export_cleanup($1)", [item.object_id]);
    }
  }
  async close() { this.stopped = true; if (this.timer) clearTimeout(this.timer); await this.dispatcher.end(); await this.worker.end(); }
}
