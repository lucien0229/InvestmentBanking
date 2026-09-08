import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import { buildExportArchive, verifyExportMembers } from "../../apps/api/src/export-package.js";
import { canonicalJson, sha256 } from "../../apps/api/src/artifact-integrity.js";

test("an independent ZIP reader sees the exact index, unchanged bytes and verifiable signed manifest", async () => {
  const keys = crypto.generateKeyPairSync("ed25519");
  const files = [{ path: "native.xlsx", bytes: Buffer.from("native fixture") }, { path: "reader.pdf", bytes: Buffer.from("reader fixture") }];
  const scope = { revision: { id: "revision-a" }, lineage: [{ source_record_id: "source-a", decision_id: "decision-a" }], decisions: [{ id: "decision-a" }], evidence: [{ id: "evidence-a" }], validations: [{ id: "validation-a", outcome: "passed" }], reviews: [], qc: [{ id: "qc-a" }], findings: [], source_records: [{ id: "source-a" }], exclusions: [{ scope: "other_revisions", reason: "outside scope" }], limitations: [], readiness: { posture: "working_draft" }, manifest: { canonical_payload: "{}" } };
  const result = await buildExportArchive({ exportId: "export-a", revisionId: "revision-a", purpose: "inspection", scope, files }, {
    sign: async (canonical) => ({ algorithm: "EC_SIGN_ED25519", key_version: "development/artifact/test", canonical_sha256: sha256(canonical), public_key_pem: keys.publicKey.export({ type: "spki", format: "pem" }).toString(), signature: crypto.sign(null, Buffer.from(canonical), keys.privateKey).toString("base64") }),
  });
  const inspected = JSON.parse(execFileSync("python3", ["-c", "import sys,zipfile,io,json,hashlib; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); print(json.dumps({'names':z.namelist(),'native':z.read('artifacts/native.xlsx').decode(),'manifest':json.loads(z.read('manifest.json'))})); assert z.testzip() is None"], { input: result.archive }).toString());
  assert.equal(inspected.names[0], "index.html");
  assert.equal(inspected.native, "native fixture");
  assert.equal(inspected.manifest.manifest.revision_id, "revision-a");
  assert.equal(crypto.verify(null, Buffer.from(canonicalJson(inspected.manifest.manifest)), keys.publicKey, Buffer.from(inspected.manifest.signature, "base64")), true);
  const expected = [{ path: "native.xlsx", sha256: sha256(files[0].bytes), byte_length: files[0].bytes.length }];
  assert.equal(verifyExportMembers(expected, [files[0]]), true);
  assert.equal(verifyExportMembers(expected, []), false);
  assert.equal(verifyExportMembers(expected, [{ ...files[0], bytes: Buffer.from("corrupt") }]), false);
  await assert.rejects(buildExportArchive({ exportId: "export-a", revisionId: "revision-b", purpose: "inspection", scope, files }, { sign: async () => { throw new Error("must reject before signing"); } }), /export_revision_mismatch/);
});
