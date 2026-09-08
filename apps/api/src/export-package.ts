import crypto from "node:crypto";
import { canonicalJson, sha256, type ArtifactSigner } from "./artifact-integrity.js";

type Member = { path: string; bytes: Buffer };
export function verifyExportMembers(expected: Array<{ path: string; sha256: string; byte_length: number }>, actual: Member[]) {
  return actual.length === expected.length && new Set(actual.map((item) => item.path)).size === actual.length && expected.every((item) => {
    const member = actual.find((entry) => entry.path === item.path);
    return member !== undefined && member.bytes.length === Number(item.byte_length) && sha256(member.bytes) === item.sha256;
  });
}
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

export async function buildExportArchive(input: { exportId: string; revisionId: string; purpose: string; scope: Record<string, unknown>; files: Member[] }, signer: ArtifactSigner) {
  if ((input.scope.revision as { id: string })?.id !== input.revisionId) throw new Error("export_revision_mismatch");
  for (const key of ["lineage", "decisions", "evidence", "validations", "reviews", "qc", "findings", "source_records", "exclusions", "limitations"]) {
    if (!Array.isArray(input.scope[key])) throw new Error("export_required_record_missing");
  }
  if (!input.scope.manifest || !input.scope.readiness || input.files.length !== 2) throw new Error("export_required_record_missing");
  const json = (path: string, value: unknown): Member => ({ path, bytes: Buffer.from(canonicalJson(value)) });
  const records = [
    json("controls/lineage.json", input.scope.lineage),
    json("controls/decisions.json", input.scope.decisions),
    json("controls/evidence.json", { sources: input.scope.source_records, evidence: input.scope.evidence }),
    json("controls/validation-qc-review.json", { validations: input.scope.validations, qc: input.scope.qc, reviews: input.scope.reviews, findings: input.scope.findings, readiness: input.scope.readiness }),
    json("controls/scope-and-exclusions.json", { purpose: input.purpose, revision_id: input.revisionId, exclusions: input.scope.exclusions, limitations: input.scope.limitations, external_use_authorized: false }),
    json("controls/artifact-manifest.json", input.scope.manifest),
    ...input.files.map((file) => {
      if (!/^[A-Za-z0-9][A-Za-z0-9_. -]{0,180}$/.test(file.path)) throw new Error("export_member_path_invalid");
      return { path: `artifacts/${file.path}`, bytes: file.bytes };
    }),
  ];
  const index: Member = { path: "index.html", bytes: Buffer.from(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Internal Controlled Export</title><style>body{font:15px system-ui;margin:40px auto;padding:0 24px;max-width:900px;color:#263238}h1{font-size:28px}li{margin:14px 0}code{overflow-wrap:anywhere}a{color:#236b43}</style><h1>Internal Controlled Export</h1><p>Export <code>${escapeHtml(input.exportId)}</code><br>Exact Revision <code>${escapeHtml(input.revisionId)}</code></p><p>Intended internal use: ${escapeHtml(input.purpose)}. This package does not authorize external circulation. Current limitations and excluded scope remain in the control records.</p><ul>${records.map((file) => `<li><a href="${encodeURI(file.path)}">${escapeHtml(file.path)}</a><br><code>SHA-256 ${sha256(file.bytes)}</code></li>`).join("")}</ul><p><a href="manifest.json">Signed canonical manifest</a> · Ed25519 over RFC 8785 canonical JSON. The signature proves origin and byte integrity only; it does not prove correctness or professional approval.</p></html>`) };
  const members = [index, ...records];
  const manifest = { schema_version: "internal-controlled-export-1.0.0", export_id: input.exportId, revision_id: input.revisionId, purpose: input.purpose, scope: input.scope, canonicalization: "RFC8785", digest_algorithm: "SHA-256", signature_algorithm: "Ed25519", external_use_authorized: false, members: members.map((member) => ({ path: member.path, byte_length: member.bytes.length, sha256: sha256(member.bytes) })) };
  const canonical = canonicalJson(manifest);
  const signature = await signer.sign(canonical);
  if (signature.canonical_sha256 !== sha256(canonical) || !crypto.verify(null, Buffer.from(canonical), signature.public_key_pem, Buffer.from(signature.signature, "base64"))) throw new Error("export_signature_invalid");
  const signedManifest = { manifest, ...signature };
  const archive = storeZip([...members, json("manifest.json", signedManifest)]);
  return { archive, signedManifest };
}

function crc32(bytes: Buffer) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
/** Bounded, uncompressed ZIP32; original Office/PDF bytes remain unchanged. */
function storeZip(members: Member[]) {
  if (members.length > 100 || new Set(members.map((item) => item.path)).size !== members.length) throw new Error("export_duplicate_member");
  const local: Buffer[] = [], central: Buffer[] = [];
  let offset = 0;
  for (const member of members) {
    const path = Buffer.from(member.path, "utf8"), crc = crc32(member.bytes), header = Buffer.alloc(30), directory = Buffer.alloc(46);
    if (member.path.startsWith("/") || member.path.split("/").some((part) => part === "..") || member.path.includes("\\")) throw new Error("export_member_path_invalid");
    header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6); header.writeUInt16LE(33, 12);
    header.writeUInt32LE(crc, 14); header.writeUInt32LE(member.bytes.length, 18); header.writeUInt32LE(member.bytes.length, 22); header.writeUInt16LE(path.length, 26);
    directory.writeUInt32LE(0x02014b50); directory.writeUInt16LE(20, 4); directory.writeUInt16LE(20, 6); directory.writeUInt16LE(0x800, 8); directory.writeUInt16LE(33, 14);
    directory.writeUInt32LE(crc, 16); directory.writeUInt32LE(member.bytes.length, 20); directory.writeUInt32LE(member.bytes.length, 24); directory.writeUInt16LE(path.length, 28); directory.writeUInt32LE(offset, 42);
    local.push(header, path, member.bytes); central.push(directory, path); offset += header.length + path.length + member.bytes.length;
    if (offset > 128 * 1024 * 1024) throw new Error("export_package_limit");
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(members.length, 8); end.writeUInt16LE(members.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}
