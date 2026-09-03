import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { Database } from "./database.js";

const uuid = z.string().uuid();
const problemType = "https://investment-banking.local/problems";
const MAX_TEMPLATE_BYTES = 100 * 1024 * 1024;
const MAX_PUBLIC_RESPONSE_BYTES = 10 * 1024 * 1024;
const supportedTemplateMedia = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
  "text/csv",
]);

export type PublicWebFetcher = (url: string) => Promise<{
  status: number;
  headers: Record<string, string>;
  body: string | Buffer;
}>;

type AccountTemplateWebEvidenceDeps = {
  requireBanker: (request: FastifyRequest, reply: FastifyReply) => Promise<string | null>;
  commandKey: (request: FastifyRequest, reply: FastifyReply) => string | null;
  publicWebFetcher?: PublicWebFetcher;
};

function problem(reply: FastifyReply, status: number, code: string, detail: string, recovery: string, instance: string) {
  return reply.code(status).type("application/problem+json").send({
    type: `${problemType}/${code.replaceAll("_", "-")}`,
    title: code.replaceAll("_", " "),
    status,
    code,
    detail,
    instance,
    outcome: "rejected",
    retryable: status === 401 || status === 429 || status === 503,
    recovery_action: recovery,
  });
}

function errorCode(error: unknown) {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : String(error);
  return message;
}

function accountTemplateWebEvidenceError(error: unknown, request: FastifyRequest, reply: FastifyReply) {
  const code = errorCode(error);
  const mapped: Record<string, [number, string, string]> = {
    account_template_scope_mismatch: [404, "resource_not_found", "return_to_safe_parent"],
    account_template_operation_preview_required: [409, "operation_preview_required", "create_operation_preview"],
    account_template_upload_limit_exceeded: [413, "upload_limit_exceeded", "reduce_file_or_batch_size"],
    account_template_upload_scope_mismatch: [404, "resource_not_found", "return_to_safe_parent"],
    account_template_rights_not_permitted: [409, "rights_not_permitted", "provide_rights_basis"],
    account_template_digest_mismatch: [409, "file_digest_mismatch", "reupload_template"],
    account_template_upload_offset_mismatch: [409, "upload_offset_mismatch", "resume_from_server_offset"],
    account_template_scan_incomplete: [409, "safety_check_incomplete", "retry_safety_check"],
    account_template_quarantine_required: [409, "template_quarantine_required", "complete_quarantine"],
    account_template_rights_attestation_required: [409, "rights_attestation_required", "provide_rights_attestation"],
    live_deal_material_forbidden: [409, "live_deal_material_forbidden", "provide_account_only_template"],
    public_response_too_large: [413, "public_response_too_large", "use_smaller_public_resource"],
    template_not_production_ready: [409, "template_not_production_ready", "complete_template_preflight_and_review"],
    template_selection_scope_mismatch: [404, "resource_not_found", "return_to_safe_parent"],
    idempotency_key_reused: [409, "idempotency_key_reused", "use_new_idempotency_key"],
  };
  const found = Object.entries(mapped).find(([key]) => code.includes(key));
  if (!found) throw error;
  const [status, responseCode, recovery] = found[1];
  return problem(reply, status, responseCode, "The requested source operation is not available in the current scope or posture.", recovery, request.url);
}

function storageRoot() {
  const configured = process.env.PROTECTED_STORAGE_ROOT;
  if (configured) return configured;
  if (process.env.APP_ENV === "production") throw new Error("PROTECTED_STORAGE_ROOT is required in production");
  return path.join(process.cwd(), ".local-protected-storage");
}

function quarantinePath(storageKey: string) {
  const root = path.resolve(storageRoot());
  const resolved = path.resolve(root, storageKey);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error("invalid_storage_key");
  return resolved;
}

function templateScan(bytes: Buffer, mediaType: string, displayName: string) {
  const family = mediaType.includes("spreadsheet") || /\.xlsx$/i.test(displayName) ? "xlsx"
    : mediaType.includes("presentation") || /\.pptx$/i.test(displayName) ? "pptx"
      : mediaType.includes("word") || /\.docx$/i.test(displayName) ? "docx"
        : mediaType === "application/pdf" || /\.pdf$/i.test(displayName) ? "pdf"
          : mediaType === "text/csv" || /\.csv$/i.test(displayName) ? "csv" : "unknown";
  if (!supportedTemplateMedia.has(mediaType)) return { clean: false, code: "unsupported_media_type", family };
  const text = bytes.toString("latin1");
  if (/EICAR-STANDARD-ANTIVIRUS-TEST-FILE|malware|virus-test/i.test(text)) return { clean: false, code: "malware_detected", family };
  if (/vbaProject\.bin|(?:^|[\\/])(?:oleObject|embeddings)(?:[\\/]|\.)|EncryptedPackage|AgileEncryption|StandardEncryption/i.test(text)) return { clean: false, code: "unsafe_template_content", family };
  if (["xlsx", "pptx", "docx"].includes(family) && (bytes.subarray(0, 2).toString("ascii") !== "PK" || !/\[Content_Types\]\.xml/i.test(text))) return { clean: false, code: "malformed_package", family };
  if (family === "pdf" && !text.startsWith("%PDF")) return { clean: false, code: "malformed_package", family };
  return { clean: true, code: null, family };
}

function accountKeyMaterial() {
  const configured = process.env.PROTECTED_OBJECT_KEK;
  if (configured) {
    const value = /^[a-f0-9]{64}$/i.test(configured) ? Buffer.from(configured, "hex") : Buffer.from(configured, "base64");
    if (value.length === 32) return value;
  }
  if (process.env.APP_ENV === "production") throw new Error("PROTECTED_OBJECT_KEK is required in production");
  return crypto.createHash("sha256").update("account-template-development-key-v1").digest();
}

async function protectEncrypted(bytes: Buffer, mediaType: string, objectId: string, scope: "account" | "deal") {
  const dek = crypto.randomBytes(32); const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", dek, iv); const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
  const wrapIv = crypto.randomBytes(12); const wrapper = crypto.createCipheriv("aes-256-gcm", accountKeyMaterial(), wrapIv); const wrapped = Buffer.concat([wrapper.update(dek), wrapper.final()]);
  const header = { magic: "IBPO1", envelope_version: `aes-256-gcm-${scope}-v1`, iv: iv.toString("base64url"), tag: cipher.getAuthTag().toString("base64url"), wrapped_dek: { iv: wrapIv.toString("base64url"), tag: wrapper.getAuthTag().toString("base64url"), ciphertext: wrapped.toString("base64url") }, plaintext_sha256: crypto.createHash("sha256").update(bytes).digest("hex"), byte_length: bytes.length, media_type: mediaType };
  const headerBytes = Buffer.from(JSON.stringify(header)); const container = Buffer.concat([Buffer.from("IBPO1"), Buffer.alloc(4), headerBytes, ciphertext]); container.writeUInt32BE(headerBytes.length, 5);
  const storageKey = `protected/${scope}/${objectId}.bin`; const filePath = quarantinePath(storageKey); await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 }); await fs.writeFile(filePath, container, { mode: 0o600, flag: "wx" }).catch((error: NodeJS.ErrnoException) => { if (error.code !== "EEXIST") throw error; });
  return { storageKey, plaintextSha256: header.plaintext_sha256, ciphertextSha256: crypto.createHash("sha256").update(container).digest("hex"), envelopeVersion: header.envelope_version, wrappedDek: header.wrapped_dek };
}

async function protectAccountTemplate(bytes: Buffer, mediaType: string, versionId: string) { return protectEncrypted(bytes, mediaType, versionId, "account"); }

function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host === "::1" || host === "0.0.0.0") return true;
  const octets = host.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return octets[0] === 10 || octets[0] === 127 || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168) || (octets[0] === 169 && octets[1] === 254);
}

function publicUrl(value: string) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || isPrivateHostname(parsed.hostname)) throw new Error("public_https_required");
  parsed.hash = "";
  return parsed;
}

function header(headers: Record<string, string>, name: string) {
  return Object.entries(headers).find(([key]) => key.toLowerCase() === name)?.[1];
}

const webSchema = z.object({
  url: z.string().url().max(2048),
  purpose: z.string().min(1).max(160),
  rights_basis: z.object({
    publisher_rights: z.enum(["snapshot_permitted", "citation_only", "unknown"]),
    source_terms: z.enum(["permitted", "no_archival_copy", "restricted", "unknown"]),
    robots_posture: z.enum(["allowed", "disallowed", "unknown"]),
    retention_limit_days: z.union([z.number(), z.string()]).refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 3650),
  }).passthrough(),
  capture_posture: z.enum(["snapshot", "citation_only"]),
}).strict();

const operationPreviewSchema = z.object({ operation: z.literal("account_reusable_template_upload"), template_class: z.string().min(1).max(80), purpose: z.literal("account_reusable_template") }).strict();
const accountUploadFileSchema = z.object({
  client_file_id: z.string().min(1).max(160),
  display_name: z.string().min(1).max(240),
  byte_length: z.union([z.string(), z.number()]).transform(String).refine((value) => /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= MAX_TEMPLATE_BYTES),
  media_type: z.string().min(1).max(160),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  template_declaration: z.object({ template_class: z.string().min(1).max(80), source_material_id: uuid.nullable(), deal_id: uuid.nullable(), clean_template_basis: z.string().min(1).max(100), purpose_scope: z.literal("account_only") }).strict(),
  rights_posture_inputs: z.record(z.string(), z.unknown()),
  confidentiality_posture: z.record(z.string(), z.unknown()),
  processing_posture: z.record(z.string(), z.unknown()),
}).strict();
const accountUploadSessionSchema = z.object({ purpose: z.literal("account_reusable_template"), operation_preview_id: uuid, consent_digest: z.string().min(1).max(200), files: z.array(accountUploadFileSchema).length(1) }).strict();

export function registerAccountTemplateWebEvidenceRoutes(api: FastifyInstance, database: Database, deps: AccountTemplateWebEvidenceDeps) {
  api.post("/api/v1/account/operation-previews", async (request, reply) => {
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const body = operationPreviewSchema.parse(request.body);
    try {
      const result = await database.withContext(session, null, async (client, context) => (await client.query<{ preview: Record<string, unknown> }>("SELECT source.create_account_operation_preview($1,$2,$3,$4,$5) AS preview", [context.accountId, context.actorId, body.operation, body.template_class, body.purpose])).rows[0]?.preview ?? null);
      if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
      if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
      if (result.kind !== "ok" || result.value === null) return problem(reply, 404, "resource_not_found", "The Account is not available.", "return_to_safe_parent", request.url);
      return reply.code(200).send({ data: result.value });
    } catch (error) { return accountTemplateWebEvidenceError(error, request, reply); }
  });

  api.post("/api/v1/account/upload-sessions", async (request, reply) => {
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const body = accountUploadSessionSchema.parse(request.body);
    if (body.files.some((file) => file.template_declaration.source_material_id !== null || file.template_declaration.deal_id !== null)) return problem(reply, 409, "live_deal_material_forbidden", "Account reusable templates must be separately supplied outside live Deal history.", "provide_account_only_template", request.url);
    try {
      const result = await database.withContext(session, null, async (client, context) => (await client.query<{ session: Record<string, unknown> }>("SELECT source.create_account_template_upload_session($1,$2,$3,$4,$5,$6) AS session", [context.accountId, context.actorId, crypto.randomUUID(), body.consent_digest, body.operation_preview_id, JSON.stringify(body.files)])).rows[0]?.session ?? null);
      if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
      if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
      if (result.kind !== "ok" || result.value === null) return problem(reply, 404, "resource_not_found", "The Account is not available.", "return_to_safe_parent", request.url);
      const projection = result.value as { id: string; row_version: number; files: Array<Record<string, unknown>> };
      projection.files = projection.files.map((file) => ({ ...file, tus_url: `/api/v1/account/upload-sessions/${projection.id}/files/${file.server_file_id}`, tus_headers: { "Tus-Resumable": "1.0.0", "Upload-Length": String(file.byte_length) } }));
      reply.header("Location", `/api/v1/account/upload-sessions/${projection.id}`);
      return reply.code(201).send({ data: projection });
    } catch (error) { return accountTemplateWebEvidenceError(error, request, reply); }
  });

  api.get<{ Params: { upload_session_id: string } }>("/api/v1/account/upload-sessions/:upload_session_id", async (request, reply) => {
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const sessionId = uuid.parse(request.params.upload_session_id);
    const result = await database.withContext(session, null, async (client, context) => (await client.query<{ projection: Record<string, unknown> | null }>("SELECT source.get_account_template_upload_projection($1,$2,$3) AS projection", [context.accountId, context.actorId, sessionId])).rows[0]?.projection ?? null);
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
    if (result.kind !== "ok" || result.value === null) return problem(reply, 404, "resource_not_found", "The upload session is not available.", "return_to_safe_parent", request.url);
    return reply.code(200).send({ data: result.value });
  });

  api.patch<{ Params: { upload_session_id: string; file_id: string } }>("/api/v1/account/upload-sessions/:upload_session_id/files/:file_id", async (request, reply) => {
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const sessionId = uuid.parse(request.params.upload_session_id); const fileId = uuid.parse(request.params.file_id);
    const expected = Number(request.headers["upload-offset"] ?? 0); const bytes = Buffer.isBuffer(request.body) ? request.body : Buffer.from(request.body as string | Uint8Array);
    try {
      const result = await database.withContext(session, null, async (client, context) => {
        const target = (await client.query<{ quarantine_storage_key: string; declared_byte_length: number; offset_bytes: number }>("SELECT * FROM source.get_account_template_upload_target($1,$2,$3,$4)", [context.accountId, context.actorId, sessionId, fileId])).rows[0];
        if (!target) throw new Error("account_template_upload_scope_mismatch");
        const next = (await client.query<{ offset_bytes: number; status_code: string }>("SELECT * FROM source.append_account_template_upload_chunk($1,$2,$3,$4,$5,$6)", [context.accountId, context.actorId, sessionId, fileId, expected, bytes.length])).rows[0];
        return { target, next };
      });
      if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
      if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
      if (result.kind !== "ok") return problem(reply, 404, "resource_not_found", "The upload file is not available.", "return_to_safe_parent", request.url);
      const filePath = quarantinePath(result.value.target.quarantine_storage_key);
      await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
      const handle = await fs.open(filePath, expected === 0 ? "w" : "r+", 0o600); try { await handle.write(bytes, 0, bytes.length, expected); await handle.truncate(expected + bytes.length); } finally { await handle.close(); }
      reply.header("Upload-Offset", String(result.value.next.offset_bytes));
      return reply.code(204).send();
    } catch (error) { return accountTemplateWebEvidenceError(error, request, reply); }
  });

  api.post<{ Params: { upload_session_id: string } }>("/api/v1/account/upload-sessions/:upload_session_id/finalizations", async (request, reply) => {
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const sessionId = uuid.parse(request.params.upload_session_id); const body = z.object({ file_ids: z.array(uuid).length(1) }).strict().parse(request.body);
    try {
      const result = await database.withContext(session, null, async (client, context) => {
        const fileId = body.file_ids[0];
        const target = (await client.query<{ quarantine_storage_key: string; declared_media_type: string; display_name: string; declared_byte_length: number }>("SELECT * FROM source.get_account_template_upload_target($1,$2,$3,$4)", [context.accountId, context.actorId, sessionId, fileId])).rows[0];
        if (!target) throw new Error("account_template_upload_scope_mismatch");
        const bytes = await fs.readFile(quarantinePath(target.quarantine_storage_key));
        const digest = crypto.createHash("sha256").update(bytes).digest("hex");
        const scan = templateScan(bytes, target.declared_media_type, target.display_name);
        const finalized = (await client.query<{ outcome: string; problem_code: string | null }>("SELECT * FROM source.mark_account_template_upload_finalized($1,$2,$3,$4,$5,$6,$7,$8)", [context.accountId, context.actorId, sessionId, fileId, bytes.length, digest, target.declared_media_type, JSON.stringify(scan)])).rows[0];
        return { finalized, digest, scan };
      });
      if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
      if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
      if (result.kind !== "ok") return problem(reply, 404, "resource_not_found", "The upload session is not available.", "return_to_safe_parent", request.url);
      if (result.value.finalized.outcome !== "succeeded") return accountTemplateWebEvidenceError(new Error(result.value.finalized.problem_code ?? "account_template_scan_incomplete"), request, reply);
      return reply.code(200).send({ data: { upload_session_id: sessionId, file_ids: body.file_ids, status: "quarantined", scan: result.value.scan, content_sha256: result.value.digest } });
    } catch (error) { return accountTemplateWebEvidenceError(error, request, reply); }
  });

  api.post("/api/v1/account/artifact-templates", async (request, reply) => {
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const key = deps.commandKey(request, reply); if (!key) return;
    const body = z.object({ server_file_id: uuid, template_class: z.string().min(1).max(80), source_record_id: uuid.nullable().optional(), rights_attestation: z.record(z.string(), z.unknown()), clean_template_basis: z.string().min(1).max(100) }).strict().parse(request.body);
    if (body.source_record_id || body.clean_template_basis === "sanitized_from_live_deal" || body.rights_attestation.basis === "sanitized_from_live_deal") return problem(reply, 409, "live_deal_material_forbidden", "A live Deal source cannot be promoted into an Account reusable template.", "provide_account_only_template", request.url);
    if (body.clean_template_basis !== "separately_supplied_outside_live_deal" && body.clean_template_basis !== "new_sanitized_outside_live_deal") return problem(reply, 400, "invalid_request", "The template clean basis is not supported.", "correct_request", request.url);
    try {
      const requestDigest = crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex");
      const result = await database.withContext(session, null, async (client, context) => {
        const created = (await client.query<{ template_id: string; version_id: string; status: string; idempotent_replayed: boolean }>("SELECT * FROM source.create_account_reusable_template($1,$2,$3,$4,$5,$6,$7,$8)", [context.accountId, context.actorId, body.server_file_id, body.template_class, JSON.stringify(body.rights_attestation), body.clean_template_basis, Database.hashToken(key), requestDigest])).rows[0];
        if (created && !created.idempotent_replayed) {
          const quarantined = (await client.query<{ quarantine_storage_key: string; declared_media_type: string }>("SELECT quarantine_storage_key, declared_media_type FROM source.account_template_quarantined_upload WHERE id=$1 AND account_id=$2", [body.server_file_id, context.accountId])).rows[0];
          if (quarantined) {
            const bytes = await fs.readFile(quarantinePath(quarantined.quarantine_storage_key));
            const envelope = await protectAccountTemplate(bytes, quarantined.declared_media_type, created.version_id);
            await client.query("SELECT source.store_account_template_object($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)", [context.accountId, context.actorId, created.version_id, envelope.storageKey, envelope.plaintextSha256, envelope.ciphertextSha256, bytes.length, quarantined.declared_media_type, envelope.envelopeVersion, process.env.PROTECTED_OBJECT_KMS_KEY_VERSION ?? "local-development-kek-v1", JSON.stringify(envelope.wrappedDek)]);
            await fs.rm(quarantinePath(quarantined.quarantine_storage_key), { force: true });
          }
        }
        return created;
      });
      if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
      if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
      if (result.kind !== "ok" || !result.value) return problem(reply, 404, "resource_not_found", "The Account is not available.", "return_to_safe_parent", request.url);
      return reply.code(202).send({ data: result.value });
    } catch (error) { return accountTemplateWebEvidenceError(error, request, reply); }
  });

  api.get("/api/v1/account/artifact-templates", async (request, reply) => {
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const result = await database.withContext(session, null, async (client, context) => (await client.query<{ template: Record<string, unknown> }>("SELECT source.list_account_reusable_templates($1,$2) AS template", [context.accountId, context.actorId])).rows.map((row) => row.template));
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
    if (result.kind !== "ok") return problem(reply, 404, "resource_not_found", "The Account is not available.", "return_to_safe_parent", request.url);
    return reply.code(200).send({ data: result.value });
  });

  api.get<{ Params: { template_id: string } }>("/api/v1/account/artifact-templates/:template_id", async (request, reply) => {
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const templateId = uuid.parse(request.params.template_id);
    const result = await database.withContext(session, null, async (client, context) => (await client.query<{ template: Record<string, unknown> | null }>("SELECT source.get_account_reusable_template_projection($1,$2,$3) AS template", [context.accountId, context.actorId, templateId])).rows[0]?.template ?? null);
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
    if (result.kind !== "ok" || result.value === null) return problem(reply, 404, "resource_not_found", "The template is not available.", "return_to_safe_parent", request.url);
    return reply.code(200).send({ data: result.value });
  });

  api.get<{ Params: { template_id: string } }>("/api/v1/account/artifact-templates/:template_id/versions", async (request, reply) => {
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const templateId = uuid.parse(request.params.template_id);
    const result = await database.withContext(session, null, async (client, context) => (await client.query("SELECT id, template_id, version_ordinal AS version, version_label, display_name, media_type, content_sha256, byte_length, rights_attestation, clean_template_basis, created_at FROM source.account_reusable_template_version WHERE account_id=$1 AND template_id=$2 ORDER BY version_ordinal", [context.accountId, templateId])).rows);
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
    if (result.kind !== "ok") return problem(reply, 404, "resource_not_found", "The template is not available.", "return_to_safe_parent", request.url);
    return reply.code(200).send({ data: result.value });
  });

  api.get<{ Params: { template_id: string; version_id: string } }>("/api/v1/account/artifact-templates/:template_id/versions/:version_id", async (request, reply) => {
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const templateId = uuid.parse(request.params.template_id); const versionId = uuid.parse(request.params.version_id);
    const result = await database.withContext(session, null, async (client, context) => (await client.query("SELECT id, template_id, version_ordinal AS version, version_label, display_name, media_type, content_sha256, byte_length, rights_attestation, clean_template_basis, created_at FROM source.account_reusable_template_version WHERE account_id=$1 AND template_id=$2 AND id=$3", [context.accountId, templateId, versionId])).rows[0] ?? null);
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
    if (result.kind !== "ok" || result.value === null) return problem(reply, 404, "resource_not_found", "The template version is not available.", "return_to_safe_parent", request.url);
    return reply.code(200).send({ data: result.value });
  });

  api.post<{ Params: { template_id: string } }>("/api/v1/account/artifact-templates/:template_id/preflights", async (request, reply) => {
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const templateId = uuid.parse(request.params.template_id); const key = deps.commandKey(request, reply); if (!key) return;
    const body = z.object({ version_id: uuid, compatibility_profile: z.string().min(1).max(80) }).strict().parse(request.body);
    try {
      const result = await database.withContext(session, null, async (client, context) => (await client.query<{ preflight: Record<string, unknown> }>("SELECT source.create_account_template_preflight($1,$2,$3,$4,$5) AS preflight", [context.accountId, context.actorId, templateId, body.version_id, body.compatibility_profile])).rows[0]?.preflight ?? null);
      if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
      if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
      if (result.kind !== "ok" || result.value === null) return problem(reply, 404, "resource_not_found", "The template is not available.", "return_to_safe_parent", request.url);
      return reply.code(201).send({ data: result.value });
    } catch (error) { return accountTemplateWebEvidenceError(error, request, reply); }
  });

  api.post<{ Params: { deal_id: string } }>("/api/v1/deals/:deal_id/template-selections", async (request, reply) => {
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const key = deps.commandKey(request, reply); if (!key) return;
    const dealId = uuid.parse(request.params.deal_id); const body = z.object({ template_version_id: uuid, artifact_class: z.string().min(1).max(120), exact_deal_mapping: z.string().min(1).optional(), validation_id: z.string().min(1).optional(), review_id: z.string().min(1).optional() }).strict().parse(request.body);
    try {
      const result = await database.withContext(session, dealId, async (client, context) => (await client.query("SELECT source.select_account_template_for_deal($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) AS selection", [context.accountId, context.actorId, dealId, body.template_version_id, body.artifact_class, body.exact_deal_mapping ?? "", body.validation_id ?? "", body.review_id ?? "", Database.hashToken(key), crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex")])).rows[0]?.selection ?? null);
      if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
      if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
      if (result.kind !== "ok" || result.value === null) return problem(reply, 404, "resource_not_found", "The Deal is not available.", "return_to_safe_parent", request.url);
      return reply.code(201).send({ data: result.value });
    } catch (error) { return accountTemplateWebEvidenceError(error, request, reply); }
  });

  api.post<{ Params: { deal_id: string } }>("/api/v1/deals/:deal_id/web-evidence-observations", async (request, reply) => {
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const key = deps.commandKey(request, reply); if (!key) return;
    const dealId = uuid.parse(request.params.deal_id); const body = webSchema.parse(request.body);
    let parsed: URL;
    try { parsed = publicUrl(body.url); } catch (error) { if (errorCode(error).includes("public_https_required")) return problem(reply, 400, "public_https_required", "Only public unauthenticated HTTPS URLs are allowed.", "provide_public_https_url", request.url); throw error; }
    try {
      let fetched: Awaited<ReturnType<PublicWebFetcher>>;
      try {
        fetched = await (deps.publicWebFetcher ? deps.publicWebFetcher(parsed.toString()) : (async () => {
          const response = await fetch(parsed, { redirect: "error", signal: AbortSignal.timeout(10_000) });
          const declaredLength = Number(response.headers.get("content-length") ?? 0);
          if (Number.isFinite(declaredLength) && declaredLength > MAX_PUBLIC_RESPONSE_BYTES) throw new Error("public_response_too_large");
          return { status: response.status, headers: Object.fromEntries(response.headers.entries()), body: Buffer.from(await response.arrayBuffer()) };
        })());
      } catch (error) {
        if (errorCode(error).includes("public_response_too_large")) return accountTemplateWebEvidenceError(error, request, reply);
        return problem(reply, 502, "public_retrieval_failed", "The public resource could not be retrieved within the bounded fetch window.", "retry_retrieval", request.url);
      }
      if (fetched.status < 200 || fetched.status >= 300) return problem(reply, 502, "public_retrieval_failed", "The public resource could not be retrieved.", "retry_retrieval", request.url);
      const bytes = Buffer.isBuffer(fetched.body) ? fetched.body : Buffer.from(fetched.body, "utf8");
      const declaredLength = Number(header(fetched.headers, "content-length") ?? bytes.length);
      if (!Number.isFinite(declaredLength) || declaredLength > MAX_PUBLIC_RESPONSE_BYTES || bytes.length > MAX_PUBLIC_RESPONSE_BYTES) return problem(reply, 413, "public_response_too_large", "The public response exceeds the bounded observation size.", "use_smaller_public_resource", request.url);
      const digest = crypto.createHash("sha256").update(bytes).digest("hex");
      const retentionDays = Number(body.rights_basis.retention_limit_days ?? 0);
      if (!Number.isFinite(retentionDays) || retentionDays < 0 || retentionDays > 3650) return problem(reply, 400, "invalid_rights_basis", "The retention limit must be a bounded non-negative number of days.", "correct_rights_basis", request.url);
      const snapshotPermitted = body.rights_basis.publisher_rights === "snapshot_permitted" && body.rights_basis.source_terms === "permitted" && body.rights_basis.robots_posture === "allowed" && retentionDays > 0;
      const limitations = [
        ...(snapshotPermitted ? [] : ["snapshot_prohibited_by_rights"]),
        ...(body.rights_basis.robots_posture === "disallowed" ? ["robots_disallow_capture"] : []),
        ...(retentionDays <= 0 ? ["retention_limit_prevents_archival_copy"] : []),
      ];
      const retrievedAt = new Date().toISOString();
      const rights = { ...body.rights_basis, snapshot_permitted: snapshotPermitted, reliance_state: snapshotPermitted ? "reliance_eligible" : "reliance_limited" };
      const observationId = crypto.randomUUID();
      const mediaType = header(fetched.headers, "content-type")?.split(";", 1)[0] ?? "text/html";
      const protectedObject = snapshotPermitted && body.capture_posture === "snapshot" ? await protectEncrypted(bytes, mediaType, observationId, "deal") : null;
      const payload = {
        source_record_id: observationId,
        requested_url: body.url,
        canonical_url: parsed.toString(),
        document_identity: { etag: header(fetched.headers, "etag") ?? null, last_modified: header(fetched.headers, "last-modified") ?? null, content_type: header(fetched.headers, "content-type") ?? null },
        retrieved_at: retrievedAt,
        as_of_time: retrievedAt,
        version_label: header(fetched.headers, "etag") ?? `retrieved-${retrievedAt}`,
        capture_mode: body.capture_posture,
        effective_capture_mode: protectedObject ? "snapshot" : "citation_only",
        response_metadata: { status: fetched.status, headers: fetched.headers },
        permitted_representation: protectedObject ? { mode: "exact_bytes", bytes_retained: true, protected_object_scope: "deal" } : { mode: "citation_context", bytes_retained: false },
        content_sha256: digest,
        byte_length: bytes.length,
        exact_locator: { url: parsed.toString(), etag: header(fetched.headers, "etag") ?? null },
        rights_posture: rights,
        retrieval_limitations: limitations,
        stale_after: retentionDays > 0 ? new Date(Date.now() + retentionDays * 86400000).toISOString() : null,
        media_type: mediaType,
        ...(protectedObject ? {
          protected_object: {
            id: observationId,
            storage_key: protectedObject.storageKey,
            plaintext_sha256: protectedObject.plaintextSha256,
            ciphertext_sha256: protectedObject.ciphertextSha256,
            byte_length: bytes.length,
            envelope_version: protectedObject.envelopeVersion,
            kms_key_version: process.env.PROTECTED_OBJECT_KMS_KEY_VERSION ?? "local-development-kek-v1",
            wrapped_dek: protectedObject.wrappedDek,
          },
        } : {}),
      };
      const result = await database.withContext(session, dealId, async (client, context) => (await client.query<{ observation: Record<string, unknown> }>("SELECT source.create_web_evidence_observation($1,$2,$3,$4) AS observation", [context.accountId, context.actorId, dealId, JSON.stringify(payload)])).rows[0]?.observation ?? null);
      if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
      if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
      if (result.kind !== "ok" || result.value === null) return problem(reply, 404, "resource_not_found", "The Deal is not available.", "return_to_safe_parent", request.url);
      return reply.code(202).send({ data: result.value });
    } catch (error) { return accountTemplateWebEvidenceError(error, request, reply); }
  });

  api.get<{ Params: { deal_id: string; source_record_id: string } }>("/api/v1/deals/:deal_id/web-evidence-observations/:source_record_id", async (request, reply) => {
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const dealId = uuid.parse(request.params.deal_id); const recordId = uuid.parse(request.params.source_record_id);
    const result = await database.withContext(session, dealId, async (client, context) => (await client.query<{ observation: Record<string, unknown> | null }>("SELECT source.get_web_evidence_observation($1,$2,$3,$4) AS observation", [context.accountId, context.actorId, dealId, recordId])).rows[0]?.observation ?? null);
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
    if (result.kind !== "ok" || result.value === null) return problem(reply, 404, "resource_not_found", "The observation is not available.", "return_to_safe_parent", request.url);
    return reply.code(200).send({ data: result.value });
  });

  api.get<{ Params: { deal_id: string } }>("/api/v1/deals/:deal_id/web-evidence-observations", async (request, reply) => {
    const session = await deps.requireBanker(request, reply); if (!session) return;
    const dealId = uuid.parse(request.params.deal_id);
    const result = await database.withContext(session, dealId, async (client, context) => (await client.query<{ observation: Record<string, unknown> }>("SELECT source.list_web_evidence_observations($1,$2,$3) AS observation", [context.accountId, context.actorId, dealId])).rows.map((row) => row.observation));
    if (result.kind === "invalid") return problem(reply, 401, "session_expired", "The session is no longer valid.", "reauthenticate", request.url);
    if (result.kind === "passkey_required") return problem(reply, 403, "passkey_required", "A Passkey-backed session is required.", "register_passkey", request.url);
    if (result.kind !== "ok") return problem(reply, 404, "resource_not_found", "The Deal is not available.", "return_to_safe_parent", request.url);
    return reply.code(200).send({ data: result.value });
  });
}
