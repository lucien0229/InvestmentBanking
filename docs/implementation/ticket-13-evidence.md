# Ticket 13 — First Deal Guide and Internal Controlled Export

Development acceptance on 2026-09-08, from `develop` baseline `900ea71`.
Scope: Ticket 13 only. The user delegated manual acceptance and development
deployment. No later ticket is advanced.

## Authority and declared environment

The implementation consumes [the ticket](../../.scratch/controlled-sell-side-auction-execution-workspace-v1/issues/13-first-value-guide-controlled-export.md),
the feature spec (AC-002, AC-006, AC-064), root `CONTEXT.md`, the UX specification,
user flow, journey, information architecture and wireframes, the technical API,
data and permission contracts, and the confirmed
[`deal-control-high-fidelity`](../../prototypes/deal-control-high-fidelity/) prototype.
The relevant decisions include ADR 0001, 0017, 0041, 0042 and
[ADR 0043](../adr/0043-allow-explicit-development-workbook-alternatives.md).

- HTTPS Cell: <https://dev-banking.aptoren.com> on the authorized development VPS.
- Release: `20260908-controlled-export-v5`, using the existing six-service Docker Cell.
- Supabase project: `xuysyaxzcpntvvzsgkdy`; 92 canonical migrations applied,
  including eight forward migrations for this ticket.
- Exact synthetic scope: Deal `290c3734-3b1a-442d-beab-89ce0f8b5e99`,
  Workbook Revision 05 `24b8a4ec-7bba-465d-bb2f-0bf6b3728627`.
- Accepted `development_foss_v1`: real LibreOffice rendering and the independent
  host signing service. This evidence does not certify Windows Excel, Aspose,
  Google KMS, production, or external use.

## Acceptance results

| Requirement | Observed result |
| --- | --- |
| Authoritative, resumable Guide | Eleven checkpoints derive from same-Deal records. Missing Evidence, deterministic validation and artifact/QC work block completion. Inspection records include exact Revision and basis digest. |
| First Unmistakable Value | Actual Source context `Cash,4.7`, three typed Decisions and downstream consequences, exact deterministic validation, seven-page Native/Reader previews, QC and readiness were inspected. First value was recorded before export and graduation. No artificial conflict was introduced into the accepted predecessor fixture. |
| Fresh sensitive authority | Real Supabase WebAuthn registration/sign-in via Chrome's virtual authenticator produced verified `amr.method=passkey`, timestamp and provider session identity. Stale, missing, future, generic WebAuthn and Magic Link/`iat`-only evidence cannot issue sensitive authority. Hardware-device attestation is not claimed. |
| Exact command and recovery | Five-minute Grant binding covers session, actor, Account, Deal, action, resource, command/dependency digests, key, security epoch and posture. Parallel/repeated commands create one export. Download retries return the same token, Grant ID and expiry. Changed identity is rejected. |
| Authentication return | Cancel returned to the same Review and preserved its key. An explicitly expired synthetic product session was replaced after real Passkey reauthentication, then the same saved command completed. Storage held only Deal/resource IDs, action, key and safe return route; no Grant or material payload. |
| Exact package | Browser-downloaded ZIP has ten members, `index.html` first, unchanged XLSX/PDF bytes, exact control records and signed manifest. Independent ZIP CRC, every member's length/hash, canonical digest and Ed25519 verification pass. Original Source bytes, raw AI payloads, other Revisions and external authority are excluded. |
| Hard gates and lifecycle | Tests reject expired/wrong-session/wrong-command Grants, stale Review dependencies, revoked Worker Scope, inactive artifacts and withdrawn Source rights. Current hard gates also apply to an existing download capability. The artifact lifecycle negative case is an owner-only fault injection in the isolated test DB, not a product deletion operation. |
| Worker failure and resume | Cancel/retry and injected signer failure preserve the accepted export/Job identity. Scope/lease/attempt fencing is rechecked before attachment. Reserved failed output is cleaned; attached output survives cleanup after a successful or uncertain response. |
| Graduation and history | Explicit `enter_deal_execution_desk` records a separate graduation. Reloading the Deal opens Overview; all nine canonical work areas remain. Reopened Guide retains eleven completed checkpoints and history. |
| No external authority | `external_use_authorized=false` in the exported manifest. Audit has one accepted export, one completed export, one first-value and one graduation event. No delivery, recipient-access or external-use event was created. Closed measurement dimensions contain only declared scope/booleans and definition version. |

The three independent identities are:

- First value: `53d786b8-5c9a-4af0-ac13-76b4352878be`.
- First internal export: `cac90594-dbba-4d1c-876e-85cc912e0598`.
- Explicit graduation: `818ad099-73a3-4a04-9bde-b61e330636ee`.

The exported archive is 286,324 bytes, SHA-256
`200c72837c21ce3b0c3ab7688d8b4458733ecb398ad315227b27aa40749b92d9`.
Its [verification record](ticket-13-acceptance/exact-verification.json) contains
the member identities, canonical hash and public signing evidence.

## UI acceptance

The prototype's tokens, font stacks, 6px controls, 8px panels, 4/8/12/16/24/32px
spacing, numbered review sections and 330px desktop summary are used. The
prototype was rendered beside the implementation for visual inspection.
The export review keeps the summary in the content area without duplicating
the desktop context inspector. Real hashes, control records and limitations
replace prototype fixture labels. Missing Guide inspection/completion surfaces
were implemented using the same design language under the user's authorization.

Review layouts pass at 1440, 1280, 1024 and 390px with no document overflow.
Creation requires at least 1024px; mobile preserves the saved review and supports
reading and downloading an existing receipt. Authentication screens expose no
Deal material. The mobile Guide, authentication return and receipt are inspected
in the real development site.

Screenshots are retained in [ticket-13-acceptance](ticket-13-acceptance/):
`review-1440.png`, `review-1280.png`, `review-1024.png`, `review-390.png`,
`receipt-1440.png`, `receipt-390.png`, `reauth-1440.png`, `reauth-390.png`,
`completion-before-entry.png`, `execution-desk-1440.png` and
`reopened-guide-390.png`.

## Verification and bounded review

The full repository suite ran once on the development server against an isolated
Postgres 17 database. Initial result: 81 passed, eight failed, three opt-in tests
skipped. The failed cases exposed test-runner setup issues (Python unavailable
in the slim image, and missing `NODE_ENV=test` for synthetic scanner fixtures)
and a predecessor assertion that always expected an Aspose evaluation watermark.
The runner was corrected and the assertion now respects the accepted LibreOffice
profile. Only the affected files were rerun: 10 passed, one existing opt-in skip.
Across the complete test inventory, all 89 enabled cases pass after those fixes.
The skipped tests concern live Source AI, predecessor process-loss/AC-071 and
the opt-in isolated Source parser, not this ticket's export runtime.

The final controlled-export HTTP runtime test separately passes with real Office
and signing services, independent worker credentials and encrypted protected
storage. It covers the complete loop, grant denial/replay, archive retrieval,
failure/resume, Scope revocation, cleanup, rights withdrawal and lifecycle fault.
TypeScript, contract check, migration ordering and domain naming pass. The server
Next build passes; pre-existing Autoprefixer alignment warnings remain non-blocking.

The `$code-review` review was bounded to baseline `900ea71` and two independent
axes. Standards found missing commit-time Scope checks and orphan output
cleanup; Spec found cross-Revision inspection drift and non-idempotent download
Grant recovery. All four findings were fixed and exercised by focused tests or
the real browser. UI acceptance additionally fixed inherited definition-list
layout and mobile overflow. No further broad audit was opened.

Required user configuration blockers: **none for this authorized development profile**.
