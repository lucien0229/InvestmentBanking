import crypto from "node:crypto";
import fs from "node:fs/promises";

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean")
    return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value))
    return JSON.stringify(value);
  if (typeof value === "string") {
    if (
      Array.from(value).some(
        (character) =>
          character.length === 1 && /[\uD800-\uDFFF]/.test(character),
      )
    )
      throw new Error("manifest_invalid_unicode");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${canonicalJson(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  }
  throw new Error("manifest_invalid_json");
}
export const sha256 = (bytes: Buffer | string) =>
  crypto.createHash("sha256").update(bytes).digest("hex");
export type ManifestInput = {
  revisionId: string;
  purpose: string;
  audience: string;
  dependencies: unknown[];
  engine: {
    name: string;
    version: string;
    template: string;
    container_digest?: string;
    renderer_version?: string;
    font_manifest?: unknown;
    acceptance_profile?: string;
  };
  limitations: string[];
  members: Array<{ id: string; role: string; path: string; bytes: Buffer }>;
  lineage: unknown[];
  qc: unknown[];
};
export function makeManifest(input: ManifestInput) {
  if (
    new Set(input.members.map((x) => x.id)).size !== input.members.length ||
    new Set(input.members.map((x) => x.path)).size !== input.members.length
  )
    throw new Error("manifest_duplicate_member");
  return {
    schema_version: "1.0.0",
    revision_id: input.revisionId,
    purpose: input.purpose,
    audience: input.audience,
    canonicalization: "RFC8785",
    digest_algorithm: "SHA-256",
    signature_algorithm: "Ed25519",
    engine: input.engine,
    dependencies: input.dependencies,
    lineage: input.lineage,
    qc: input.qc,
    limitations: input.limitations,
    claims: {
      deployment_origin_and_integrity_only: true,
      correctness: false,
      professional_approval: false,
      external_use_authorization: false,
    },
    members: input.members.map((x) => ({
      artifact_id: x.id,
      role: x.role,
      path: x.path,
      byte_length: x.bytes.length,
      sha256: sha256(x.bytes),
    })),
  };
}
export function verifyManifest(
  manifest: ReturnType<typeof makeManifest>,
  signature: string,
  key: crypto.KeyObject | string,
  members: Array<{ id: string; bytes: Buffer }>,
): boolean {
  try {
    if (
      !crypto.verify(
        null,
        Buffer.from(canonicalJson(manifest)),
        key,
        Buffer.from(signature, "base64"),
      )
    )
      return false;
    return (
      members.length === manifest.members.length &&
      new Set(members.map((m) => m.id)).size === members.length &&
      manifest.members.every((member) => {
        const actual = members.find((x) => x.id === member.artifact_id);
        return (
          actual?.bytes.length === member.byte_length &&
          sha256(actual.bytes) === member.sha256
        );
      })
    );
  } catch {
    return false;
  }
}

export type CheckOutcome = "passed" | "failed" | "missing";
export type ArtifactCheck = {
  code: string;
  outcome: CheckOutcome;
  detail?: string;
  evidence?: unknown;
};
function crc32c(bytes: Buffer): string {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0x82f63b78 : 0);
  }
  return String((crc ^ 0xffffffff) >>> 0);
}
export type ArtifactSignature = {
  custody?: "google_cloud_kms" | "development_host_service";
  key_version: string;
  algorithm: "EC_SIGN_ED25519";
  signature: string;
  public_key_pem: string;
  canonical_sha256: string;
};
export interface ArtifactSigner {
  sign(canonical: string): Promise<ArtifactSignature>;
}
/** Runtime identity supplies a short-lived OAuth access token; private signing material never enters the application. */
export class GoogleKmsArtifactSigner implements ArtifactSigner {
  constructor(
    private readonly keyVersion = process.env.ARTIFACT_KMS_KEY_VERSION,
    private readonly accessToken = async () =>
      process.env.GOOGLE_KMS_ACCESS_TOKEN_FILE
        ? (
            await fs.readFile(process.env.GOOGLE_KMS_ACCESS_TOKEN_FILE, "utf8")
          ).trim()
        : process.env.GOOGLE_KMS_ACCESS_TOKEN,
  ) {}
  async sign(canonical: string): Promise<ArtifactSignature> {
    if (
      !this.keyVersion?.match(
        /^projects\/[\w-]+\/locations\/[\w-]+\/keyRings\/[\w-]+\/cryptoKeys\/[\w-]+\/cryptoKeyVersions\/[1-9]\d*$/,
      )
    )
      throw new Error("artifact_signer_configuration_required");
    if (this.keyVersion === process.env.AUDIT_KMS_KEY_VERSION)
      throw new Error("artifact_signer_key_separation_required");
    const token = await this.accessToken();
    if (!token) throw new Error("artifact_signer_identity_required");
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const base = `https://cloudkms.googleapis.com/v1/${this.keyVersion}`;
    const keyResponse = await fetch(`${base}/publicKey`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!keyResponse.ok)
      throw new Error("artifact_signer_public_key_unavailable");
    const key = (await keyResponse.json()) as {
      algorithm: string;
      pem: string;
      pemCrc32c: string;
      protectionLevel: string;
    };
    if (
      key.algorithm !== "EC_SIGN_ED25519" ||
      key.protectionLevel !== "SOFTWARE" ||
      crc32c(Buffer.from(key.pem)) !== String(key.pemCrc32c)
    )
      throw new Error("artifact_signer_profile_mismatch");
    const bytes = Buffer.from(canonical);
    const response = await fetch(`${base}:asymmetricSign`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        data: bytes.toString("base64"),
        dataCrc32c: crc32c(bytes),
      }),
    });
    if (!response.ok) throw new Error("artifact_signer_unavailable");
    const signed = (await response.json()) as {
      name: string;
      signature: string;
      signatureCrc32c: string;
      verifiedDataCrc32c: boolean;
    };
    const signature = Buffer.from(signed.signature, "base64");
    if (
      signed.name !== this.keyVersion ||
      !signed.verifiedDataCrc32c ||
      crc32c(signature) !== String(signed.signatureCrc32c) ||
      !crypto.verify(null, bytes, key.pem, signature)
    )
      throw new Error("artifact_signature_verification_failed");
    return {
      key_version: this.keyVersion,
      algorithm: "EC_SIGN_ED25519",
      signature: signed.signature,
      public_key_pem: key.pem,
      canonical_sha256: sha256(bytes),
    };
  }
}
