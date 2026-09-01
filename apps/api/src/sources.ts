import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { canonicalDigest } from "./commerce.js";
import { Database } from "./database.js";

const uuid = z.string().uuid();
const problemType = "https://investment-banking.local/problems";
const supportedMedia = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
  "text/csv",
]);
const MAX_UPLOAD_FILES = 50;
const MAX_UPLOAD_BATCH_BYTES = 2 * 1024 * 1024 * 1024;
// Individual files remain bounded for the synchronous local inspection seam;
// the product contract's batch ceiling is still enforced at 2 GiB.
const MAX_UPLOAD_FILE_BYTES = 100 * 1024 * 1024;

type SourceRouteDeps = {
  requireBanker: (request: FastifyRequest, reply: FastifyReply) => Promise<string | null>;
  commandKey: (request: FastifyRequest, reply: FastifyReply) => string | null;
};

function sourceProblem(reply: FastifyReply, status: number, code: string, detail: string, recovery: string, instance: string) {
  return reply.code(status).type("application/problem+json").send({
    type: `${problemType}/${code.replaceAll("_", "-")}`,
    title: code === "resource_not_found" ? "Resource not found" : code.replaceAll("_", " "),
    status,
    code,
    detail,
    instance,
    outcome: "rejected",
    retryable: status === 401 || status === 429 || status === 503,
    recovery_action: recovery,
  });
}

function storageRoot() {
  const configured = process.env.PROTECTED_STORAGE_ROOT;
  if (configured) return configured;
  if (process.env.APP_ENV === "production") throw new Error("PROTECTED_STORAGE_ROOT is required in production");
  return path.join(process.cwd(), ".local-protected-storage");
}

function quarantinePath(sessionId: string, fileId: string) {
  return path.join(storageRoot(), "quarantine", sessionId, `${fileId}.bin`);
}

function protectedPath(storageKey: string) {
  const root = storageRoot();
  const resolved = path.resolve(root, storageKey);
  if (!resolved.startsWith(`${path.resolve(root)}${path.sep}`)) throw new Error("invalid_storage_key");
  return resolved;
}

function keyMaterial() {
  const configured = process.env.PROTECTED_OBJECT_KEK;
  if (configured) {
    const asHex = /^[a-f0-9]{64}$/i.test(configured) ? Buffer.from(configured, "hex") : Buffer.from(configured, "base64");
    if (asHex.length === 32) return asHex;
  }
  if (process.env.APP_ENV === "production") throw new Error("PROTECTED_OBJECT_KEK is required in production");
  return crypto.createHash("sha256").update("ticket06-development-envelope-key-v1").digest();
}

type EnvelopeHeader = {
  magic: "IBPO1";
  envelope_version: string;
  iv: string;
  tag: string;
  wrapped_dek: { iv: string; tag: string; ciphertext: string };
  plaintext_sha256: string;
  byte_length: number;
  media_type: string;
};

async function encryptProtected(bytes: Buffer, mediaType: string, objectId: string) {
  const dek = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", dek, iv);
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
  const tag = cipher.getAuthTag();
  const wrapIv = crypto.randomBytes(12);
  const wrapCipher = crypto.createCipheriv("aes-256-gcm", keyMaterial(), wrapIv);
  const wrapped = Buffer.concat([wrapCipher.update(dek), wrapCipher.final()]);
  const wrappedTag = wrapCipher.getAuthTag();
  const header: EnvelopeHeader = {
    magic: "IBPO1",
    envelope_version: "aes-256-gcm-chunked-v1",
    iv: iv.toString("base64url"),
    tag: tag.toString("base64url"),
    wrapped_dek: { iv: wrapIv.toString("base64url"), tag: wrappedTag.toString("base64url"), ciphertext: wrapped.toString("base64url") },
    plaintext_sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    byte_length: bytes.length,
    media_type: mediaType,
  };
  const headerBytes = Buffer.from(JSON.stringify(header), "utf8");
  const container = Buffer.concat([Buffer.from("IBPO1", "ascii"), Buffer.alloc(4), headerBytes, ciphertext]);
  container.writeUInt32BE(headerBytes.length, 5);
  const storageKey = `protected/deal/${objectId}.bin`;
  const filePath = protectedPath(storageKey);
  await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  await fs.writeFile(filePath, container, { mode: 0o600, flag: "wx" });
  return {
    storageKey,
    ciphertextSha256: crypto.createHash("sha256").update(container).digest("hex"),
    plaintextSha256: header.plaintext_sha256,
    envelopeVersion: header.envelope_version,
    kmsKeyVersion: process.env.PROTECTED_OBJECT_KMS_KEY_VERSION ?? "local-development-kek-v1",
    wrappedDek: header.wrapped_dek,
  };
}

async function decryptProtected(container: Buffer) {
  if (container.length < 9 || container.subarray(0, 5).toString("ascii") !== "IBPO1") throw new Error("protected_object_corrupt");
  const headerLength = container.readUInt32BE(5);
  if (headerLength <= 0 || headerLength > container.length - 9) throw new Error("protected_object_corrupt");
  const header = JSON.parse(container.subarray(9, 9 + headerLength).toString("utf8")) as EnvelopeHeader;
  const wrappedDecipher = crypto.createDecipheriv("aes-256-gcm", keyMaterial(), Buffer.from(header.wrapped_dek.iv, "base64url"));
  wrappedDecipher.setAuthTag(Buffer.from(header.wrapped_dek.tag, "base64url"));
  const dek = Buffer.concat([wrappedDecipher.update(Buffer.from(header.wrapped_dek.ciphertext, "base64url")), wrappedDecipher.final()]);
  const decipher = crypto.createDecipheriv("aes-256-gcm", dek, Buffer.from(header.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(header.tag, "base64url"));
  const plaintext = Buffer.concat([decipher.update(container.subarray(9 + headerLength)), decipher.final()]);
  const digest = crypto.createHash("sha256").update(plaintext).digest("hex");
  if (digest !== header.plaintext_sha256 || plaintext.length !== header.byte_length) throw new Error("protected_object_integrity_failed");
  return { header, plaintext };
}

function fileFamily(mediaType: string, displayName: string) {
  const lower = displayName.toLowerCase();
  if (mediaType.includes("spreadsheet") || lower.endsWith(".xlsx")) return "xlsx";
  if (mediaType.includes("presentation") || lower.endsWith(".pptx")) return "pptx";
  if (mediaType.includes("word") || lower.endsWith(".docx")) return "docx";
  if (mediaType === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (mediaType === "text/csv" || lower.endsWith(".csv")) return "csv";
  return "unknown";
}

function scanUpload(bytes: Buffer, mediaType: string, displayName: string) {
  const text = bytes.toString("latin1");
  const family = fileFamily(mediaType, displayName);
  if (!supportedMedia.has(mediaType)) return { clean: false, code: "unsupported_media_type", limitations: [] as string[], family };
  if (/EICAR-STANDARD-ANTIVIRUS-TEST-FILE|malware|virus-test/i.test(text)) return { clean: false, code: "malware_detected", limitations: [] as string[], family };
  if (/(^|[\0\r\n])(?:\.\.?[\\/]|[\\/]\.?\.?[\\/]|[A-Za-z]:[\\/])/.test(text) || /(?:^|[\\/])\.\.?[\\/]/.test(text)) return { clean: false, code: "unsafe_archive_path", limitations: [] as string[], family };
  if (/vbaProject\.bin|(?:^|[\\/])(?:oleObject|embeddings)(?:[\\/]|\.)|(?:^|[\\/])(?:[^/]+\.(?:exe|dll|scr|com|msi|js|vbs|ps1|bat|cmd|sh))(?:\0|$)/i.test(text)) return { clean: false, code: "executable_content", limitations: [] as string[], family };
  if (/EncryptedPackage|AgileEncryption|StandardEncryption|workbookProtection/i.test(text)) return { clean: false, code: "protected_file_not_supported", limitations: [] as string[], family };
  if (family === "xlsx" || family === "pptx" || family === "docx") {
    const hasZip = bytes.subarray(0, 2).toString("ascii") === "PK";
    const marker = family === "xlsx" ? /\[Content_Types\]\.xml|xl\/workbook\.xml/i : family === "pptx" ? /\[Content_Types\]\.xml|ppt\/presentation\.xml/i : /\[Content_Types\]\.xml|word\/document\.xml/i;
    if (!hasZip || !marker.test(text)) return { clean: false, code: "malformed_package", limitations: [] as string[], family };
  }
  if (family === "pdf" && !bytes.subarray(0, 5).toString("ascii").startsWith("%PDF")) return { clean: false, code: "malformed_package", limitations: [] as string[], family };
  const limitations: string[] = [];
  if (/externalLinks?|connections\.xml|queryTables|powerquery/i.test(text)) limitations.push("external_links_not_refreshed");
  if (/embedded|oleObject|embeddings/i.test(text)) limitations.push("embedded_content_not_executed");
  return { clean: true, code: null, limitations, family };
}

function parseError(error: unknown) {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : String(error);
  const known = new Set([
    "upload_scope_mismatch", "upload_limit_exceeded", "upload_session_expired", "upload_offset_mismatch", "file_digest_mismatch", "source_material_scope_mismatch", "processing_not_permitted", "source_scope_mismatch", "source_acceptance_not_permitted", "object_grant_scope_mismatch", "object_grant_invalid", "idempotency_key_reused", "source_record_immutable",
  ]);
  return known.has(message) ? message : null;
}

function sourceError(error: unknown, request: FastifyRequest, reply: FastifyReply) {
  const code = parseError(error);
  if (!code) throw error;
  const map: Record<string, [number, string, string]> = {
    upload_scope_mismatch: [404, "resource_not_found", "return_to_safe_parent"],
    upload_limit_exceeded: [413, "upload_limit_exceeded", "reduce_file_or_batch_size"],
    upload_session_expired: [410, "upload_session_expired", "create_new_upload_session"],
    upload_offset_mismatch: [409, "upload_offset_mismatch", "resume_from_server_offset"],
    file_digest_mismatch: [409, "file_digest_mismatch", "reupload_source"],
    source_material_scope_mismatch: [409, "source_condition_blocked", "select_valid_source_material"],
    processing_not_permitted: [409, "processing_not_permitted", "run_paid_preflight"],
    source_scope_mismatch: [404, "resource_not_found", "return_to_safe_parent"],
    source_acceptance_not_permitted: [409, "source_condition_blocked", "complete_safety_quarantine"],
    object_grant_scope_mismatch: [404, "resource_not_found", "return_to_safe_parent"],
    object_grant_invalid: [404, "resource_not_found", "request_new_object_grant"],
    idempotency_key_reused: [409, "idempotency_key_reused", "use_new_idempotency_key"],
    source_record_immutable: [409, "source_record_immutable", "create_new_source_record"],
  };
  const [status, responseCode, recovery] = map[code];
  return sourceProblem(reply, status, responseCode, "The source operation could not be completed in the current scope.", recovery, request.url);
}

const uploadFileSchema = z.object({
  client_file_id: z.string().min(1).max(160),
  display_name: z.string().min(1).max(240),
  byte_length: z.union([z.string(), z.number()]).transform((value) => String(value)).refine((value) => /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= MAX_UPLOAD_FILE_BYTES, "byte_length must be a positive integer no larger than 100 MiB"),
  media_type: z.string().min(1).max(160),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  source_declaration: z.object({ source_material_id: uuid.nullable().optional(), new_source_material_name: z.string().min(1).max(240).optional(), origin: z.string().min(1).max(80), authority_basis: z.string().min(1).max(160), intended_purpose: z.string().min(1).max(240) }).strict(),
  rights_posture_inputs: z.object({ receipt_permitted: z.boolean(), processing_operations: z.array(z.string().min(1).max(80)).min(1).max(20), conditions: z.array(z.string().max(240)).max(20) }).strict(),
  confidentiality_posture: z.object({ confidentiality_class: z.enum(["public", "internal", "confidential", "restricted"]), de_identification_posture: z.string().min(1).max(80) }).strict(),
  processing_posture: z.object({ expected_file_family: z.string().min(1).max(80), special_structures: z.array(z.string().max(120)).max(20) }).strict(),
}).strict();

const uploadSessionSchema = z.object({
  purpose: z.literal("source_intake"),
  operation_preview_id: z.string().uuid(),
  consent_digest: z.string().min(1).max(200),
  files: z.array(uploadFileSchema).min(1).max(MAX_UPLOAD_FILES),
}).strict();

const cancellationSchema = z.object({
  file_ids: z.array(uuid).min(1).max(MAX_UPLOAD_FILES).optional(),
  all_remaining: z.literal(true).optional(),
}).strict().refine((value) => Boolean(value.all_remaining) !== Boolean(value.file_ids), "choose exact file_ids or all_remaining");

function uploadSessionEtag(rowVersion: number) {
  return `\"upload-session-${rowVersion}\"`;
}

function expectedUploadVersion(value: string | undefined) {
  const match = value?.match(/^\"upload-session-(\d+)\"$/);
  return match ? Number(match[1]) : null;
}

export function registerSourceRoutes(api: FastifyInstance, database: Database, deps: SourceRouteDeps) {
  api.post<{ Params: { deal_id: string } }>("/api/v1/deals/:deal_id/upload-sessions", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id);
    const session = await deps.requireBanker(request, reply);
    if (!session) return;
    const body = uploadSessionSchema.parse(request.body);
    const batchId = crypto.randomUUID();
    try {
      const result = await database.withContext(session, dealId, async (client, context) => {
        const created = await client.query<{ create_upload_session: Record<string, unknown> }>("SELECT source.create_upload_session($1,$2,$3,$4,$5,$6,$7,$8) AS create_upload_session", [context.accountId, context.actorId, dealId, body.purpose, batchId, body.consent_digest, body.operation_preview_id, JSON.stringify(body.files)]);
        return created.rows[0]?.create_upload_session ?? null;
      });
      if (result.kind === "invalid") return sourceProblem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
      if (result.kind === "passkey_required") return sourceProblem(reply, 403, "passkey_required", "A Passkey-backed session is required for source intake.", "register_passkey", request.url);
      if (result.kind === "not_found" || result.value === null) return sourceProblem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_safe_parent", request.url);
      const projection = result.value as { id: string; row_version: number; files: Array<Record<string, unknown>> };
      projection.files = projection.files.map((file) => ({ ...file, tus_url: `/api/v1/upload-sessions/${projection.id}/files/${file.server_file_id}`, tus_headers: { "Tus-Resumable": "1.0.0", "Upload-Length": String(file.byte_length) } }));
      reply.header("Location", `/api/v1/upload-sessions/${projection.id}`);
      reply.header("ETag", uploadSessionEtag(Number(projection.row_version)));
      return reply.code(201).send({ data: projection });
    } catch (error) {
      return sourceError(error, request, reply);
    }
  });

  api.get<{ Params: { upload_session_id: string } }>("/api/v1/upload-sessions/:upload_session_id", async (request, reply) => {
    const uploadSessionId = uuid.parse(request.params.upload_session_id);
    const session = await deps.requireBanker(request, reply);
    if (!session) return;
    const result = await database.withContext(session, null, async (client, context) => (await client.query<{ projection: Record<string, unknown> | null }>("SELECT source.get_upload_session_projection($1,$2,$3) AS projection", [context.accountId, context.actorId, uploadSessionId])).rows[0]?.projection ?? null);
    if (result.kind === "invalid") return sourceProblem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return sourceProblem(reply, 403, "passkey_required", "A Passkey-backed session is required for upload inspection.", "register_passkey", request.url);
    if (result.kind === "not_found" || result.value === null) return sourceProblem(reply, 404, "resource_not_found", "The requested resource is not available.", "return_to_safe_parent", request.url);
    const projection = result.value as { id: string; row_version: number; files: Array<Record<string, unknown>> };
    reply.header("ETag", uploadSessionEtag(Number(projection.row_version)));
    projection.files = projection.files.map((file) => ({ ...file, tus_url: `/api/v1/upload-sessions/${projection.id}/files/${file.server_file_id}`, tus_headers: { "Tus-Resumable": "1.0.0", "Upload-Length": String(file.byte_length) } }));
    return reply.code(200).header("Cache-Control", "private, no-store").send({ data: projection });
  });

  const uploadFileHandler = async (request: FastifyRequest<{ Params: { upload_session_id: string; file_id: string } }>, reply: FastifyReply, headOnly: boolean) => {
    const uploadSessionId = uuid.parse(request.params.upload_session_id);
    const fileId = uuid.parse(request.params.file_id);
    const session = await deps.requireBanker(request, reply);
    if (!session) return;
    try {
      const target = await database.withContext(session, null, async (client, context) => (await client.query<{ deal_id: string; declared_byte_length: string; offset_bytes: string; status_code: string; expires_at: string; display_name: string; declared_media_type: string; source_material_id: string | null; new_source_material_name: string | null; quarantine_storage_key: string }>("SELECT * FROM source.get_upload_target($1,$2,$3,$4)", [context.accountId, context.actorId, uploadSessionId, fileId])).rows[0] ?? null);
      if (target.kind === "invalid") return sourceProblem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
      if (target.kind === "passkey_required") return sourceProblem(reply, 403, "passkey_required", "A Passkey-backed session is required for upload.", "register_passkey", request.url);
      if (target.kind !== "ok" || target.value === null) return sourceProblem(reply, 404, "resource_not_found", "The requested upload is not available.", "return_to_safe_parent", request.url);
      const row = target.value;
      if (row.quarantine_storage_key !== `quarantine/${uploadSessionId}/${fileId}.bin`) return sourceProblem(reply, 404, "resource_not_found", "The requested upload is not available.", "return_to_safe_parent", request.url);
      const offset = Number(headerValue(request, "upload-offset") ?? row.offset_bytes);
      if (!Number.isInteger(offset) || offset < 0) return sourceProblem(reply, 400, "invalid_request", "The upload offset is invalid.", "resume_from_server_offset", request.url);
      if (headOnly) {
        return reply.code(200).header("Tus-Resumable", "1.0.0").header("Upload-Length", row.declared_byte_length).header("Upload-Offset", row.offset_bytes).send();
      }
      if (headerValue(request, "tus-resumable") !== "1.0.0") return sourceProblem(reply, 400, "invalid_request", "Tus-Resumable must be 1.0.0.", "retry_with_supported_protocol", request.url);
      const bytes = Buffer.isBuffer(request.body) ? request.body : Buffer.from((request.body as string | undefined) ?? "");
      if (bytes.length === 0) return sourceProblem(reply, 400, "invalid_request", "The upload chunk is empty.", "retry_with_chunk", request.url);
      if (Number(row.offset_bytes) !== offset) return sourceProblem(reply, 409, "upload_offset_mismatch", "The upload offset no longer matches the server state.", "resume_from_server_offset", request.url);
      if (offset + bytes.length > Number(row.declared_byte_length)) return sourceProblem(reply, 413, "upload_limit_exceeded", "The upload exceeds the declared file length.", "reduce_file_or_batch_size", request.url);
      const filePath = quarantinePath(uploadSessionId, fileId);
      await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
      const handle = await fs.open(filePath, offset === 0 ? "w" : "r+");
      try {
        await handle.write(bytes, 0, bytes.length, offset);
        await handle.truncate(offset + bytes.length);
      } finally {
        await handle.close();
      }
      const appended = await database.withContext(session, row.deal_id, async (client, context) => (await client.query<{ offset_bytes: string; status_code: string }>("SELECT * FROM source.append_upload_chunk($1,$2,$3,$4,$5,$6)", [context.accountId, context.actorId, uploadSessionId, fileId, offset, bytes.length])).rows[0] ?? null);
      if (appended.kind === "invalid") return sourceProblem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
      if (appended.kind === "passkey_required") return sourceProblem(reply, 403, "passkey_required", "A Passkey-backed session is required for upload.", "register_passkey", request.url);
      if (appended.kind !== "ok" || appended.value === null) return sourceProblem(reply, 409, "upload_offset_mismatch", "The upload offset no longer matches the server state.", "resume_from_server_offset", request.url);
      return reply.code(204).header("Tus-Resumable", "1.0.0").header("Upload-Offset", appended.value.offset_bytes).send();
    } catch (error) {
      return sourceError(error, request, reply);
    }
  };

  api.head<{ Params: { upload_session_id: string; file_id: string } }>("/api/v1/upload-sessions/:upload_session_id/files/:file_id", (request, reply) => uploadFileHandler(request, reply, true));
  api.patch<{ Params: { upload_session_id: string; file_id: string } }>("/api/v1/upload-sessions/:upload_session_id/files/:file_id", (request, reply) => uploadFileHandler(request, reply, false));

  api.post<{ Params: { upload_session_id: string } }>("/api/v1/upload-sessions/:upload_session_id/finalizations", async (request, reply) => {
    const uploadSessionId = uuid.parse(request.params.upload_session_id);
    const body = z.object({ file_ids: z.array(uuid).min(1).max(MAX_UPLOAD_FILES) }).strict().parse(request.body);
    const session = await deps.requireBanker(request, reply);
    if (!session) return;
    const items: Array<Record<string, unknown>> = [];
    for (const fileId of body.file_ids) {
      try {
        const target = await database.withContext(session, null, async (client, context) => (await client.query<{ deal_id: string; declared_byte_length: string; offset_bytes: string; status_code: string; expires_at: string; display_name: string; declared_media_type: string; source_material_id: string | null; new_source_material_name: string | null; quarantine_storage_key: string }>("SELECT * FROM source.get_upload_target($1,$2,$3,$4)", [context.accountId, context.actorId, uploadSessionId, fileId])).rows[0] ?? null);
        if (target.kind !== "ok" || target.value === null) {
          items.push({ item_id: fileId, outcome: "failed", problem: { code: "resource_not_found", detail: "The upload item is not available." } });
          continue;
        }
        const row = target.value;
        if (row.quarantine_storage_key !== `quarantine/${uploadSessionId}/${fileId}.bin`) {
          items.push({ item_id: fileId, outcome: "failed", problem: { code: "resource_not_found", detail: "The file remains outside accepted Source Material." } });
          continue;
        }
        const filePath = quarantinePath(uploadSessionId, fileId);
        let bytes: Buffer;
        try { bytes = await fs.readFile(filePath); } catch { bytes = Buffer.alloc(0); }
        const digest = crypto.createHash("sha256").update(bytes).digest("hex");
        const scan = bytes.length === 0 ? { clean: false, code: "scan_incomplete", limitations: [] as string[], family: "unknown" } : scanUpload(bytes, row.declared_media_type, row.display_name);
        const marked = await database.withContext(session, row.deal_id, async (client, context) => (await client.query<{ outcome: string; source_material_id: string | null; problem_code: string | null }>("SELECT * FROM source.mark_upload_finalized($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [context.accountId, context.actorId, uploadSessionId, fileId, bytes.length, digest, row.declared_media_type, scan, row.source_material_id, row.new_source_material_name])).rows[0] ?? null);
        if (marked.kind !== "ok" || marked.value === null || marked.value.outcome !== "succeeded") {
          items.push({ item_id: fileId, outcome: "failed", problem: { code: marked.kind === "ok" ? marked.value?.problem_code ?? scan.code ?? "scan_incomplete" : "resource_not_found", detail: "The file remains outside accepted Source Material." } });
        } else {
          items.push({ item_id: fileId, outcome: "succeeded", source_material_id: marked.value.source_material_id, quarantine_status: "quarantined", safety: { state: "completed", limitations: scan.limitations, substantive_processing: false, ai: false, rendering: false } });
        }
      } catch (error) {
        const code = parseError(error) ?? "scan_incomplete";
        items.push({ item_id: fileId, outcome: "failed", problem: { code, detail: "The file remains quarantined or rejected." } });
      }
    }
    return reply.code(200).send({ items });
  });

  api.post<{ Params: { upload_session_id: string } }>("/api/v1/upload-sessions/:upload_session_id/cancellations", async (request, reply) => {
    const uploadSessionId = uuid.parse(request.params.upload_session_id);
    const body = cancellationSchema.parse(request.body);
    const ifMatch = expectedUploadVersion(headerValue(request, "if-match"));
    if (ifMatch === null) return sourceProblem(reply, 428, "precondition_required", "If-Match must identify the current Upload Session version.", "reload_upload_session", request.url);
    const session = await deps.requireBanker(request, reply);
    if (!session) return;
    try {
      const projection = await database.withContext(session, null, async (client, context) => (await client.query<{ projection: { deal_id: string; row_version: number } | null }>("SELECT source.get_upload_session_projection($1,$2,$3) AS projection", [context.accountId, context.actorId, uploadSessionId])).rows[0]?.projection ?? null);
      if (projection.kind !== "ok" || projection.value === null) return sourceProblem(reply, 404, "resource_not_found", "The upload session is not available.", "return_to_safe_parent", request.url);
      if (Number(projection.value.row_version) !== ifMatch) return sourceProblem(reply, 412, "version_conflict", "The Upload Session changed after it was loaded.", "reload_upload_session", request.url);
      const uploadDealId = projection.value.deal_id;
      const result = await database.withContext(session, uploadDealId, async (client, context) => (await client.query<{ canceled: boolean; row_version: number; canceled_file_ids: string[] }>("SELECT * FROM source.cancel_upload_session($1,$2,$3,$4,$5,$6,$7)", [context.accountId, context.actorId, uploadDealId, uploadSessionId, ifMatch, body.file_ids ?? null, body.all_remaining ?? false])).rows[0] ?? null);
      if (result.kind !== "ok" || result.value === null || !result.value.canceled) return sourceProblem(reply, result.kind === "invalid" ? 401 : 412, result.kind === "invalid" ? "session_expired" : "version_conflict", "The Upload Session changed before cancellation completed.", result.kind === "invalid" ? "reauthenticate" : "reload_upload_session", request.url);
      reply.header("ETag", uploadSessionEtag(Number(result.value.row_version)));
      return reply.code(201).send({ data: { upload_session_id: uploadSessionId, state: body.all_remaining ? "canceled" : "open", canceled_file_ids: result.value.canceled_file_ids } });
    } catch (error) {
      return sourceError(error, request, reply);
    }
  });

  api.get<{ Params: { deal_id: string } }>("/api/v1/deals/:deal_id/source-materials", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id);
    const session = await deps.requireBanker(request, reply);
    if (!session) return;
    const result = await database.withContext(session, dealId, async (client) => (await client.query("SELECT id, stable_name, origin_code, created_at FROM source.source_material WHERE deal_id=$1 ORDER BY created_at ASC", [dealId])).rows);
    if (result.kind !== "ok") return sourceProblem(reply, result.kind === "invalid" ? 401 : 404, result.kind === "invalid" ? "session_expired" : "resource_not_found", "The source collection is not available.", result.kind === "invalid" ? "reauthenticate" : "return_to_safe_parent", request.url);
    return reply.code(200).send({ data: result.value });
  });

  api.get<{ Params: { deal_id: string; source_material_id: string } }>("/api/v1/deals/:deal_id/source-materials/:source_material_id", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id); const materialId = uuid.parse(request.params.source_material_id);
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const result = await database.withContext(session, dealId, async (client) => (await client.query("SELECT id, stable_name, origin_code, created_at FROM source.source_material WHERE id=$1 AND deal_id=$2", [materialId, dealId])).rows[0] ?? null);
    if (result.kind !== "ok" || result.value === null) return sourceProblem(reply, result.kind === "invalid" ? 401 : 404, result.kind === "invalid" ? "session_expired" : "resource_not_found", "The source material is not available.", result.kind === "invalid" ? "reauthenticate" : "return_to_safe_parent", request.url);
    return reply.code(200).send({ data: result.value });
  });

  api.get<{ Params: { deal_id: string; source_material_id: string } }>("/api/v1/deals/:deal_id/source-materials/:source_material_id/records", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id); const materialId = uuid.parse(request.params.source_material_id);
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const result = await database.withContext(session, dealId, async (client) => (await client.query("SELECT id, version_ordinal AS version, version_label, content_sha256, byte_length, media_type, authority_basis, confidentiality_class, rights_posture, record_date, accepted_at, supersedes_id FROM source.source_record WHERE source_material_id=$1 AND deal_id=$2 ORDER BY version_ordinal ASC", [materialId, dealId])).rows);
    if (result.kind !== "ok") return sourceProblem(reply, result.kind === "invalid" ? 401 : 404, result.kind === "invalid" ? "session_expired" : "resource_not_found", "The source record collection is not available.", result.kind === "invalid" ? "reauthenticate" : "return_to_safe_parent", request.url);
    return reply.code(200).send({ data: result.value });
  });

  api.post<{ Params: { deal_id: string; source_material_id: string } }>("/api/v1/deals/:deal_id/source-materials/:source_material_id/record-acceptances", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id); const materialId = uuid.parse(request.params.source_material_id);
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const key = deps.commandKey(request, reply); if (!key) return;
    const body = z.object({ server_file_id: uuid, authority_basis: z.string().min(1).max(160), record_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), version_label: z.string().min(1).max(80), rights_posture: z.string().min(1).max(120), confidentiality_class: z.enum(["public", "internal", "confidential", "restricted"]), provenance_class: z.enum(["synthetic", "real"]).optional(), de_identification_posture: z.string().min(1).max(80).optional() }).strict().parse(request.body);
    let protectedFile: string | null = null;
    try {
      const requestDigest = canonicalDigest({ method: "POST", route: "/api/v1/deals/{deal_id}/source-materials/{source_material_id}/record-acceptances", api_version: "v1", deal_id: dealId, source_material_id: materialId, body });
      const replay = await database.withContext(session, dealId, async (client, context) => (await client.query<{ job_id: string; source_record_id: string; protected_object_id: string; request_digest: string }>("SELECT c.job_id, c.source_record_id, rep.protected_object_id, c.request_digest FROM source.command_idempotency c JOIN source.source_representation rep ON rep.source_record_id=c.source_record_id AND rep.representation_type='original' WHERE c.account_id=$1 AND c.actor_id=$2 AND c.command_type='accept_source_record' AND c.key_hash=$3", [context.accountId, context.actorId, Database.hashToken(key)])).rows[0] ?? null);
      if (replay.kind === "ok" && replay.value) {
        if (replay.value.request_digest !== requestDigest) return sourceProblem(reply, 409, "idempotency_key_reused", "This Idempotency-Key was already used for a different request.", "use_new_idempotency_key", request.url);
        return reply.code(202).send({ data: { state: "completed", job_id: replay.value.job_id, source_record_id: replay.value.source_record_id, protected_object_id: replay.value.protected_object_id, idempotent_replayed: true } });
      }
      const upload = await database.withContext(session, dealId, async (client) => (await client.query<{ id: string; upload_session_id: string; quarantine_storage_key: string; display_name: string; declared_media_type: string; observed_byte_length: string; transport_sha256: string; scan_result: Record<string, unknown> | null; received_at: string | null }>("SELECT id, upload_session_id, quarantine_storage_key, display_name, declared_media_type, observed_byte_length, transport_sha256, scan_result, received_at FROM source.quarantined_upload WHERE id=$1 AND source_material_id=$2 AND status_code='quarantined'", [body.server_file_id, materialId])).rows[0] ?? null);
      if (upload.kind !== "ok" || upload.value === null) return sourceProblem(reply, upload.kind === "invalid" ? 401 : 409, upload.kind === "invalid" ? "session_expired" : "source_condition_blocked", "The file has not passed safety quarantine for acceptance.", upload.kind === "invalid" ? "reauthenticate" : "complete_safety_quarantine", request.url);
      if (upload.value.quarantine_storage_key !== `quarantine/${upload.value.upload_session_id}/${body.server_file_id}.bin`) return sourceProblem(reply, 404, "resource_not_found", "The source file is not available.", "return_to_safe_parent", request.url);
      const filePath = quarantinePath(upload.value.upload_session_id, body.server_file_id);
      const bytes = await fs.readFile(filePath);
      const digest = crypto.createHash("sha256").update(bytes).digest("hex");
      if (digest !== upload.value.transport_sha256) return sourceProblem(reply, 409, "file_digest_mismatch", "The quarantined bytes no longer match their receipt.", "reupload_source", request.url);
      const objectId = crypto.randomUUID();
      const encrypted = await encryptProtected(bytes, upload.value.declared_media_type, objectId);
      protectedFile = protectedPath(encrypted.storageKey);
      const family = fileFamily(upload.value.declared_media_type, upload.value.display_name);
      const locatorProfile = `${family === "unknown" ? "generic" : family}-native-v1`;
      const accepted = await database.withContext(session, dealId, async (client, context) => (await client.query<{ job_id: string; source_record_id: string; protected_object_id: string; idempotent_replayed: boolean }>("SELECT * FROM source.accept_source_record($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)", [context.accountId, context.actorId, dealId, materialId, body.server_file_id, Database.hashToken(key), requestDigest, objectId, encrypted.storageKey, encrypted.plaintextSha256, encrypted.ciphertextSha256, bytes.length, upload.value.declared_media_type, encrypted.envelopeVersion, encrypted.kmsKeyVersion, encrypted.wrappedDek, body.authority_basis, body.record_date, body.version_label, body.rights_posture, body.confidentiality_class, body.provenance_class ?? "real", body.de_identification_posture ?? "not_de_identified", locatorProfile, "v1", JSON.stringify((upload.value.scan_result as { limitations?: string[] } | null)?.limitations ?? [])])).rows[0] ?? null);
      if (accepted.kind !== "ok" || accepted.value === null) return sourceProblem(reply, accepted.kind === "invalid" ? 401 : 409, accepted.kind === "invalid" ? "session_expired" : "source_condition_blocked", "The Source Record could not be accepted.", accepted.kind === "invalid" ? "reauthenticate" : "complete_safety_quarantine", request.url);
      if (accepted.value.idempotent_replayed && accepted.value.protected_object_id !== objectId) await fs.unlink(protectedFile).catch(() => undefined);
      await fs.unlink(filePath).catch(() => undefined);
      return reply.code(202).send({ data: { state: "completed", job_id: accepted.value.job_id, source_record_id: accepted.value.source_record_id, protected_object_id: accepted.value.protected_object_id, idempotent_replayed: accepted.value.idempotent_replayed } });
    } catch (error) {
      if (protectedFile) await fs.unlink(protectedFile).catch(() => undefined);
      return sourceError(error, request, reply);
    }
  });

  api.get<{ Params: { deal_id: string; source_material_id: string; source_record_id: string } }>("/api/v1/deals/:deal_id/source-materials/:source_material_id/records/:source_record_id", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id); const materialId = uuid.parse(request.params.source_material_id); const recordId = uuid.parse(request.params.source_record_id);
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const result = await database.withContext(session, dealId, async (client, context) => (await client.query<{ projection: Record<string, unknown> | null }>("SELECT source.get_source_record_projection($1,$2,$3,$4,$5) AS projection", [context.accountId, context.actorId, dealId, materialId, recordId])).rows[0]?.projection ?? null);
    if (result.kind !== "ok" || result.value === null) return sourceProblem(reply, result.kind === "invalid" ? 401 : 404, result.kind === "invalid" ? "session_expired" : "resource_not_found", "The source record is not available.", result.kind === "invalid" ? "reauthenticate" : "return_to_safe_parent", request.url);
    return reply.code(200).header("Cache-Control", "private, no-store").send({ data: result.value });
  });

  api.post<{ Params: { deal_id: string; source_record_id: string } }>("/api/v1/deals/:deal_id/source-records/:source_record_id/object-grants", async (request, reply) => {
    const dealId = uuid.parse(request.params.deal_id); const recordId = uuid.parse(request.params.source_record_id);
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const body = z.object({ purpose: z.literal("source_inspection") }).strict().parse(request.body);
    const token = crypto.randomBytes(32).toString("base64url");
    try {
      const result = await database.withContext(session, dealId, async (client, context) => (await client.query<{ protected_object_id: string; grant_id: string; expires_at: string }>("SELECT * FROM source.create_object_grant($1,$2,$3,$4,$5,$6,$7)", [context.accountId, context.actorId, dealId, Database.hashToken(session), recordId, Database.hashToken(token), body.purpose])).rows[0] ?? null);
      if (result.kind !== "ok" || result.value === null) return sourceProblem(reply, result.kind === "invalid" ? 401 : 404, result.kind === "invalid" ? "session_expired" : "resource_not_found", "The protected object is not available.", result.kind === "invalid" ? "reauthenticate" : "request_new_object_grant", request.url);
      return reply.code(201).send({ token, grant_id: result.value.grant_id, protected_object_id: result.value.protected_object_id, attachment_scope: "deal", attachment_id: recordId, operation: "read", expires_at: result.value.expires_at, stream_url: `/objects/${result.value.protected_object_id}` });
    } catch (error) { return sourceError(error, request, reply); }
  });

  api.get<{ Params: { protected_object_id: string } }>("/objects/:protected_object_id", async (request, reply) => {
    const objectId = uuid.parse(request.params.protected_object_id);
    const session = deps.requireBanker(request, reply);
    const sessionToken = await session;
    if (!sessionToken) return;
    const authorization = request.headers.authorization;
    const grantMatch = authorization?.match(/^ObjectGrant\s+(.+)$/i);
    if (!grantMatch) return sourceProblem(reply, 401, "object_grant_invalid", "A short-lived protected object grant is required.", "request_new_object_grant", request.url);
    try {
      const resolved = await database.withContext(sessionToken, null, async (client, context) => (await client.query<{ deal_id: string; source_record_id: string; storage_key: string; media_type: string; byte_length: string; plaintext_sha256: string; wrapped_dek: Record<string, unknown>; envelope_version: string; kms_key_version: string; grant_id: string }>("SELECT * FROM source.resolve_object_grant($1,$2,$3,$4,$5)", [context.accountId, context.actorId, Database.hashToken(sessionToken), objectId, Database.hashToken(grantMatch[1])])).rows[0] ?? null);
      if (resolved.kind !== "ok" || resolved.value === null) return sourceProblem(reply, 404, "resource_not_found", "The protected object is not available.", "request_new_object_grant", request.url);
      if (!resolved.value.storage_key.startsWith("protected/deal/")) return sourceProblem(reply, 404, "resource_not_found", "The protected object is not available.", "request_new_object_grant", request.url);
      const container = await fs.readFile(protectedPath(resolved.value.storage_key));
      const decrypted = await decryptProtected(container);
      const range = headerValue(request, "range");
      let payload = decrypted.plaintext;
      let status = 200;
      let responseStart = 0;
      let responseEnd = payload.length - 1;
      const objectEtag = `\"${resolved.value.plaintext_sha256}\"`;
      const ifRange = headerValue(request, "if-range");
      if (range && (!ifRange || ifRange === objectEtag)) {
        const match = range.match(/^bytes=(\d+)-(\d*)$/);
        if (!match) return sourceProblem(reply, 416, "range_not_satisfiable", "The requested byte range is not supported.", "request_supported_range", request.url);
        const start = Number(match[1]); const end = match[2] ? Number(match[2]) : payload.length - 1;
        if (start < 0 || start > end || end >= payload.length) return sourceProblem(reply, 416, "range_not_satisfiable", "The requested byte range is not supported.", "request_supported_range", request.url);
        payload = payload.subarray(start, end + 1); status = 206; responseStart = start; responseEnd = end;
        reply.header("Content-Range", `bytes ${start}-${end}/${decrypted.plaintext.length}`);
      }
      await database.withContext(sessionToken, resolved.value.deal_id, async (client, context) => client.query("SELECT source.record_stream_receipt($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [context.accountId, context.actorId, Database.hashToken(sessionToken), resolved.value!.grant_id, objectId, resolved.value!.deal_id, resolved.value!.source_record_id, "completed", responseStart, responseEnd]));
      return reply.code(status).type(resolved.value.media_type).header("Content-Length", String(payload.length)).header("ETag", objectEtag).header("Accept-Ranges", "bytes").header("Cache-Control", "private, no-store").header("Content-Disposition", "inline").send(payload);
    } catch (error) {
      if (error instanceof SyntaxError || String(error).includes("protected_object")) return sourceProblem(reply, 404, "resource_not_found", "The protected object is not available.", "request_new_object_grant", request.url);
      return sourceError(error, request, reply);
    }
  });
}

function headerValue(request: FastifyRequest, name: string) {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}
