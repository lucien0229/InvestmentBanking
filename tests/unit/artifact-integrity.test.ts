import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalJson,
  makeManifest,
  verifyManifest,
} from "../../apps/api/src/artifact-integrity.js";
import { generateKeyPairSync, sign } from "node:crypto";

test("manifest binds exact bytes and rejects a substituted member", () => {
  const keys = generateKeyPairSync("ed25519");
  const manifest = makeManifest({
    revisionId: "revision-1",
    purpose: "valuation review",
    audience: "banker",
    dependencies: [],
    engine: {
      name: "aspose.cells.python.net",
      version: "26.8.0",
      template: "analysis-valuation-1.0.0",
    },
    limitations: ["Professional review pending"],
    members: [
      {
        id: "native-1",
        role: "native",
        path: "analysis.xlsx",
        bytes: Buffer.from("exact delivered bytes"),
      },
    ],
    lineage: [],
    qc: [],
  });
  const canonical = canonicalJson(manifest);
  const signature = sign(
    null,
    Buffer.from(canonical),
    keys.privateKey,
  ).toString("base64");
  assert.equal(
    verifyManifest(manifest, signature, keys.publicKey, [
      { id: "native-1", bytes: Buffer.from("exact delivered bytes") },
    ]),
    true,
  );
  assert.equal(
    verifyManifest(manifest, signature, keys.publicKey, [
      { id: "native-1", bytes: Buffer.from("substituted") },
    ]),
    false,
  );
  assert.equal(
    verifyManifest(
      { ...manifest, purpose: "external circulation" },
      signature,
      keys.publicKey,
      [],
    ),
    false,
  );
  assert.equal(
    canonicalJson({ z: 1, a: { z: 2, a: "x" } }),
    '{"a":{"a":"x","z":2},"z":1}',
  );
  assert.throws(() => canonicalJson({ malformed: "\ud800" }));
});
