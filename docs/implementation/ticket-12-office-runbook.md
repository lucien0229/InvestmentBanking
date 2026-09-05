# Ticket 12 Office / artifact development runbook

## Deployed boundary

The application uses the existing Docker Cell at
`/opt/cells/investmentbanking/dev`, API/Web loopback ports 3101/3102, and
`https://dev-banking.aptoren.com`. Supabase is the existing development branch;
Stripe, Supabase and Docker are not outstanding configuration decisions.

Office processing runs separately as `ib-office` (UID/GID 1001), with lingering
and a delegated systemd user service. The API sees only
`/run/office/renderer.sock`, not a Docker/Podman socket. The service template is
`services/office/investmentbanking-office.service`; the installed supervisor is
`/opt/cells/investmentbanking/dev/office/supervisor.py`.

Declared engine: Aspose.Cells Python via .NET 26.8.0. Final Office image:

```
sha256:3ee44d3e668af1543831cc3773c878ff04cfc8ca5d761fe4a697d22d8e808256
```

The image is pinned in the service and application contract. Each render has
no network, a read-only root, dropped capabilities, no-new-privileges, 1 GiB
memory, one CPU, 128 PIDs, bounded temporary space and exact input/output
mounts. A unique container name, 175-second container deadline, 180-second
client deadline and unconditional exact-name cleanup bound interrupted work.
The rootless supervisor serializes Office requests.

Job Worker inputs and artifact reads are scoped to the current unexpired
lease, accepted Packet, exact Revision and current Work Objective. Provider
I/O occurs outside a database transaction; cancellation is rechecked before
persistence. A canceled Job's late result cannot restore authority. Heartbeat
updates at step boundaries are not evidence of continuous liveness during a
long provider call.

## Remaining configuration and acceptance

### 1. Licensed clean Office output

Provide a valid license for the declared Aspose.Cells Python via .NET engine.
Store it outside application releases, readable by `ib-office`, for example
`/opt/cells/investmentbanking/dev/office/secrets/Aspose.Cells.lic`. Set
`ASPOSE_LICENSE_PATH` in a systemd user-service override. The supervisor mounts
that exact file read-only at `/run/secrets/aspose-license` inside the ephemeral
renderer; the API does not receive it. Reload/restart the user service.

Generate a **new** Revision. Existing evaluation artifacts and their Findings
are immutable. Verify absence of vendor evaluation marks, embedded PDF fonts,
material layout/number/citation/chart parity, and exact final hashes. Do not
strip the vendor watermark or mark an evaluation file as a clean copy.

### 2. Independent Google Cloud KMS artifact signer

Provide an enabled CryptoKeyVersion resource name with algorithm
`EC_SIGN_ED25519` and protection level `SOFTWARE`, distinct from the Audit
signing key. Configure `ARTIFACT_KMS_KEY_VERSION` with the full
`projects/.../locations/.../keyRings/.../cryptoKeys/.../cryptoKeyVersions/...`
resource. Authorize only the intended runtime identity to fetch its public key
and perform asymmetric signing.

Use a host identity broker to refresh a short-lived OAuth token atomically in
`/opt/cells/investmentbanking/dev/shared/artifact-identity/access-token`.
The Cell mounts that directory read-only at `/run/artifact-identity`; set
`GOOGLE_KMS_ACCESS_TOKEN_FILE=/run/artifact-identity/access-token` in the shared
runtime environment. Directory/file ownership must allow only the broker and
API UID 1000 to traverse/read (for example dedicated group, directory 0750 and
file 0640); do not put credentials in Git or image layers. The application
rereads the token on each signing operation. No broker credentials or Google
project authority were available in this acceptance session.

The signer validates the algorithm/protection level, CRC32C request and
response checks, exact key version, canonical SHA-256 and Ed25519 signature.
It signs RFC 8785 canonical manifest bytes. No local private-key fallback is
used. After configuration, generate a new Revision and independently verify
its exact native/reader hashes, dependency/version/scope manifest and public
key verification. A signature never attests correctness or professional
approval.

### 3. Supported Office edit/save/reopen/reimport

The declared primary path is **Windows Microsoft 365 Excel Current Channel**,
with the exact application build recorded in the acceptance receipt. Supply a
licensed, accessible Windows Office acceptance host. The available Mac Excel
16.108.1 (16.108.26041915) was unactivated and could inspect only; there was no
usable primary Windows environment. A Linux/Aspose reopen is not equivalent.

On a copy of the exact generated XLSX: open without repair, inspect formulas,
defined names, scenarios, chart, notes/comments and units; make a bounded
Banker-owned note edit; save, close, reopen, and run the Ticket 12 Office
compatibility smoke observer on the returned copy. Verify no flattening,
formula loss or protected Banker-content loss. Record exact input/output
hashes, platform/build, operations and results via the implemented Office lab
contract. Do not advance into Ticket 15's full returned-file workflow.

## Release / rollback / rerun

Apply canonical migrations through the separate Supabase admin release path;
never give migration credentials to API, Worker or Web containers. This
session reconciled 65 canonical migrations through `20260905052300`.
Deployment uses `scripts/deploy-docker-cell.sh`; migration and deployment are
separate steps. Existing releases and protected artifacts are retained.

The accepted runtime code is `f693bdf`, with the final source-backed SQL/test
corrections at `e33243a`. The v4 Node 22 production build is reused because the
final corrections change only SQL and tests; no application assets changed.
Do not roll back to an application predating the exact-worker projection
migration: it calls functions whose broad Worker grants were revoked.

After supplying the three missing dependencies, run the licensed renderer,
new exact Revision, independent artifact observers, three governed AI task
contracts, professional Reviews and supported Office round-trip checks. Then
re-evaluate AC-051–059 and change Ticket 12 to `resolved` only if all mandatory
gates pass. Existing failed checks must remain truthful until then.
