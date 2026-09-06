import crypto from "node:crypto";
import http from "node:http";
import { canonicalJson, sha256, type ArtifactSignature, type ArtifactSigner } from "./artifact-integrity.js";

/** Explicit development-only custody; no private key is mounted into this client. */
export class DevelopmentArtifactSigner implements ArtifactSigner {
  constructor(private readonly socket = process.env.ARTIFACT_SIGNER_SOCKET, private readonly environment = process.env.APP_ENV) {}
  async sign(canonical: string): Promise<ArtifactSignature> {
    if (this.environment !== "development") throw new Error("artifact_signer_development_only");
    if (!this.socket) throw new Error("artifact_signer_configuration_required");
    if (canonicalJson(JSON.parse(canonical)) !== canonical) throw new Error("artifact_manifest_noncanonical");
    const body = JSON.stringify({ canonical_payload: canonical });
    if (Buffer.byteLength(body) > 4 * 1024 * 1024) throw new Error("artifact_manifest_limit");
    const signed = await new Promise<ArtifactSignature>((resolve, reject) => {
      const request = http.request({ socketPath: this.socket, path: "/v1/sign", method: "POST", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) } }, (response) => {
        const parts: Buffer[] = []; let size = 0;
        response.on("data", (part: Buffer) => { size += part.length; if (size > 16384) response.destroy(new Error("artifact_signer_output_limit")); else parts.push(part); });
        response.on("error", reject);
        response.on("end", () => {
          if (response.statusCode !== 200) return reject(new Error("artifact_signer_unavailable"));
          try { resolve(JSON.parse(Buffer.concat(parts).toString("utf8")) as ArtifactSignature); }
          catch { reject(new Error("artifact_signer_invalid_output")); }
        });
      });
      request.setTimeout(15000, () => request.destroy(new Error("artifact_signer_timeout")));
      request.on("error", reject); request.end(body);
    });
    if (!signed.key_version.startsWith("development/artifact/") || signed.algorithm !== "EC_SIGN_ED25519"
      || signed.canonical_sha256 !== sha256(canonical)
      || !crypto.verify(null, Buffer.from(canonical), signed.public_key_pem, Buffer.from(signed.signature, "base64"))) throw new Error("artifact_signature_verification_failed");
    return signed;
  }
}
