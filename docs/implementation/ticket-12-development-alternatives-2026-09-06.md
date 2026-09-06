# Ticket 12 — alternative development acceptance, 2026-09-06

Ticket status: **resolved for the authorized `development_foss_v1` profile**.
All 12 readiness requirements pass for exact synthetic Revision 05. The three
unavailable configurations no longer block this development path.

The user explicitly requested workable alternatives to all three unavailable
configurations and delegated the remaining manual validation. ADR 0043 defines
`development_foss_v1` for an administrator-bound exact synthetic Revision.
Production requirements remain unchanged. Tickets 01–11's already accepted
repairs remain in place; no Ticket 13+ implementation was undertaken.

## Replacements and their limits

| Unavailable dependency | Implemented replacement | Evidence boundary |
| --- | --- | --- |
| Aspose license | Pinned Linux LibreOffice Calc 7.4.7.2 40(Build:2), openpyxl 3.1.5, PyMuPDF 1.28.2 | Native XLSX formulas/names/charts/comments; actual Calc recalculation; clean same-Revision PDF 1.7 with embedded fonts. Original Aspose path remains available. |
| Google KMS Ed25519/broker | Dedicated `ib-artifact-sign` host service, separate Ed25519 key and Unix socket | API cannot see signer socket/key; Workbook Worker sees socket but not private key. Exact canonical signature verified independently. Host root can access the key; this is not cloud custody. |
| Windows Microsoft 365 lab | Actual declared Linux Calc application/build opens, edits notes, saves, closes, reopens, recalculates and inspects returned XLSX | All 12 recorded steps pass. This establishes the declared Calc development path only, not Windows Excel compatibility. |

No additional paid license or Google identity is needed to reproduce this
synthetic development acceptance. External use remains unauthorized. Real
financial suitability, Windows Excel, cloud KMS and production approval are not
established by this profile. Ordinary Account commands cannot enable it.

## Exact delivered evidence

Development host: existing Docker Cell at `152.53.90.227`, public HTTPS
`https://dev-banking.aptoren.com`, existing Supabase project
`xuysyaxzcpntvvzsgkdy`. API/Web use loopback 3101/3102.

- Artifact build release: `20260906-ticket12-accepted-5d62669`; final application release: `20260906-ticket12-final-beab2e8` (commit `beab2e8`). All 26 changed committed source files match the deployed release; API/Web are healthy and all six Cell containers run that final release.
- Final Office image: `sha256:c195fa00da8dd1a252982d53c4a72bdc0668088342fa4b06d2d4eacb369fea36`.
- Canonical migrations: 84, through `20260906103109`.
- Deal: `290c3734-3b1a-442d-beab-89ce0f8b5e99`; Workbook: `b266b056-8173-4d85-b367-4f3220b7fc44`.
- Revision 05: `24b8a4ec-7bba-465d-bb2f-0bf6b3728627`; build Job `052bb1b0-b0de-4ee8-8294-c1b01e423a4e`.
- Native SHA-256: `f29d53e28728b932286f2db6586b19a950ffd2ada0aad19d9bc7f03a801e6cfa`.
- Reader SHA-256: `0e74db0b37ebde27bc4668a81ae5e31218c870b1f05154a75ff73053cd60fba5`.
- Saved/reopened copy SHA-256: `9fbb2642ba1b2de6edcf91276cf6a94781bfbdc4c0eabf45af329c59f145902f`.
- Office lab report SHA-256: `bfc005102544c5b1c6c06e13cb7ae127f7b5b5fac7eab4d08ed2f4b2cd7b14f7`.
- Visual parity report SHA-256: `52aad01b9e324a756d0cdfc42ea4af673aac75a9172c224625ed375d867c66ab`.
- Admin lab receipt: `eca80b7f-de7b-4dd5-8337-5009f1dde263`.

All 17 protected objects were independently decrypted using the existing
configured envelope key; both ciphertext and plaintext hashes matched immutable
metadata. The exact signature, registry public key and all 17 manifest members
verified. Changed payload/signature bytes failed verification. Public registry
requires `/.well-known/integrity-keys.json?purpose=artifact`.

[Delivered XLSX](ticket-12-development-alternatives/artifacts/analysis-valuation.xlsx),
[exact Reader PDF](ticket-12-development-alternatives/artifacts/analysis-valuation.pdf),
[Office lab](ticket-12-development-alternatives/office-lab-report.json),
[saved/reopened copy](ticket-12-development-alternatives/office-returned-copy.xlsx),
[visual comparisons](ticket-12-development-alternatives/visual-parity-report.json),
[signature observer](ticket-12-development-alternatives/signature-observer.json),
and [signed manifest](ticket-12-development-alternatives/signed-manifest.json)
contain the scoped evidence. The copied artifacts are synthetic fixtures, not
client transaction material. The returned copy is not a new Deliverable Revision.

## Acceptance criteria

| Criteria | Development evidence |
| --- | --- |
| AC-051 native structure | Seven ordered worksheets; native formulas, names, chart, comments and automatic recalculation pass exact-file checks. |
| AC-052 supported editing path | Actual Linux Calc note edit/save/close/reopen/reimport smoke passes all 12 steps with full returned-file inspection. |
| AC-053 recalculation | Controlled EV 100.0 + cash 4.7 − debt 10.0 = 94.7; exact stored and returned caches, Reader value and chart agree; tie-out difference 0. |
| AC-054 lineage | Cash Fact uses controlled synthetic CSV row 4; EV/Debt remain explicit Assumptions. Exact source/decision/model/scenario/run and cell/range links retained. |
| AC-055 Native/Reader | All 14 actual preview images inspected. Independent XLSX selection images and PDF page images agree in material order, text, numbers, citations, fonts, charts, legends, confidentiality and limitations. |
| AC-056 critical failures | Adversaries reject flattened formulas, corrupt native, wrong cache, locator, chart series, wrong Reader numbers/columns, absent bars and reordered pages. No failed evidence was changed to pass. |
| AC-057 applicability | Always-required Analysis and Valuation Workbook only; no later-ticket deliverables added. |
| AC-058 promotion gates | Six exact scoped Reviews recorded after independent file/manual checks. Purpose/audience and profile remain explicit; no external authorization is granted. |
| AC-059 exact retests | Scoped HTTP regressions retain Critical blocker and retest isolation. Final QC is rerun against stored artifacts and protected manifest, not renderer assertions. |

## Corrections discovered during real verification

- Replaced the initially duplicated PDF-derived Native previews with independent
  `calc_png_Export` output from exact XLSX selections. Seven distinct Native
  previews share no hashes with Reader previews; pagination is labeled explicitly.
- Removed an early `Verified` status from the development profile notice; the
  notice only identifies the profile and limitations.
- Fixed the Workbook Worker's missing `EXECUTE` on the existing scoped protected
  provider-request recorder. A real permission-denied regression became green;
  unknown runs and direct table reads still fail. No broad table grant was added.
- Actual visual review found long citation/model text clipped by fixed row heights
  and Reader annotation icons covering period text. Calc now sizes actual data
  rows; PDF annotation export is disabled while XLSX comments remain. Final
  Revision 05 replaces these bytes; Revision 04 and its history are retained.
- A real commentary response cited a foreign ID. The validator correctly rejected
  it. Runtime guidance now explicitly distinguishes current run Fragment IDs
  from Calculation Run IDs. The registered canonical prompt package and strict
  validator were preserved. A valid real commentary retry completed.
- Job polling used fresh Artifact objects to reset protected previews every few
  seconds. The UI now keys loading by immutable Artifact ID, so the same image
  stays visible while Jobs update. The Manifest label now says Signing key
  version, so the development key is not mislabeled as KMS custody.
- Two real Parity responses used partial without a top-level boundary. Both
  were correctly rejected. Runtime guidance now explicitly describes the
  complete/partial/abstained invariants; no validator was relaxed.

## Verification and bounded review

Final fresh server PostgreSQL 17 / PGMQ 1.5.1 suite: **89 tests, 86 passed,
0 failed, 3 environment-gated skips**. The skips cover the live Source provider
matrix, independent PGMQ process resilience and isolated Source processing;
these are not counted as fresh Ticket 12 proof. Prior Tickets 01–11 accepted
provider/process evidence remains separately documented. Reusing an already
exercised disposable database first failed seed/dependency cleanup; recreating
that exact disposable test container and running all migrations/seed yielded the
result above. Hosted development data was not reset.

Final pinned Office image: **3/3 artifact tests**, including independent previews,
positive/zero/negative calculation scenarios and real edit/save/reopen inspection.
Original Aspose path: **2/2 regression tests**; absent-license evaluation output
still truthfully fails clean-copy acceptance. TypeScript, contract generation
checks, 84-file migration validation and production Web build pass.

The implement/code-review workflow used separate Standards and Spec reviews.
Their concrete findings were fixed and narrowly rechecked. No recursive broad
review or later-ticket implementation was performed.

[Full suite](ticket-12-development-alternatives/ib-alt-full-suite-fresh-final.log),
[Office tests](ticket-12-development-alternatives/office-image-tests.log),
[original engine tests](ticket-12-development-alternatives/original-engine-tests.log),
[permission regression](ticket-12-development-alternatives/worker-permission-tests.log).

## Browser and identity boundary

Browser checks use the real deployed Web/API and hosted synthetic Deal through
an SSH-forwarded loopback proxy on 3134. A temporary, administrator-created
synthetic acceptance session supplies only this fixture's authentication; this
is explicitly **not new physical Passkey evidence**. The user's earlier real
Passkey, Stripe test and Tickets 01–11 browser acceptance are recorded in
[tickets-01-11-repair-acceptance-2026-09-05.md](tickets-01-11-repair-acceptance-2026-09-05.md).
Desktop 1440px and mobile 390px show no document overflow; all file views,
source reverse trace, immutable history, 12 requirements and the integrity
disclaimer were inspected. Two preview object URLs remained unchanged across
background Job polling after the loading fix. See [UI observations](ticket-12-development-alternatives/ui-observer.json).
The temporary session was revoked through the public logout route (201);
replaying it against session and protected Revision routes returned 401.
See [logout observer](ticket-12-development-alternatives/logout-observer.json).
The proxy and temporary test resources were removed after acceptance. No public application
authentication bypass or provider credential was introduced into the frontend.

## Runtime and rollback

The signer keeps private material in a dedicated host-user-only directory,
outside API/Worker mounts. Office remains rootless and sandboxed with no network,
read-only root, bounded memory/CPU/PIDs/tmp and a hard job timeout. Podman storage
was moved to the existing NVMe disk after root-disk pressure during the image
build; existing images were retained. Original release and service/env backups
remain under `shared/rollback-20260906-ticket12-alternatives-d9237a9`.

For a production profile, restore the originally declared licensed engine,
independent cloud key/identity and exact supported Windows Office lab, then
create a new immutable Revision and collect the original evidence. Development
receipts cannot authorize that change or relabel old failures.

## Final scoped readiness

The authenticated HTTP observer returns `circulation_candidate`, all **12/12**
requirements passed, no blockers, `development_foss_v1`, and
`external_use_authorized=false`. A different purpose produces six blockers.
Original Revision 03 remains on `production_v1` and cannot inherit this result.
See [readiness observer](ticket-12-development-alternatives/readiness-observer.json),
[seven independent QC checks](ticket-12-development-alternatives/independent-qc-receipt.json)
and [deployment observer](ticket-12-development-alternatives/deployment-observer.json).

## Governed AI execution

The real final-Revision commentary Job `1c08a1e0-1889-425a-9a80-73b1bd577e46`
completed with `succeeded`, Run `d80ffc68-e4d0-4f7b-bfe7-69fb8a874dc3`.
Semantic QC retry Job `6f10aa95-3b12-46f1-a990-874932f968d1` completed with
`succeeded`, Run `0032e871-ab14-44c9-b58a-410b947ef2b6`, at 11:19:07 UTC.
All three Runs passed schema, pre-issued locator and proposal-only permission
validation, and each stored two protected request records. The existing
HelloX `gpt-5.6-sol` / `xhigh` profile was preserved. See [live AI receipts](ticket-12-development-alternatives/ai-flow-observer.json).

Semantic QC produced three **minor, non-authoritative proposals**, reviewed
under the user's delegated authority. The cash CSV row supplies only the 4.7
value; period, unit, sign and forecast metadata belong to the controlled
synthetic Fact, whose ID is visible in Inputs and whose controlling Decision is
visible in Lineage. This is sufficient for this explicitly synthetic fixture,
not source proof of those attributes for real financial use. The other two
proposals concern the wording `Source None` in assumption cell comments. Both
comments explicitly identify `banker_assumption` and their controlling Decision;
the visible Lineage sheet already says `Not applicable`. These are retained as
non-blocking wording observations, not falsely marked as code fixes or Critical
QC failures. No new financial source authority was inferred from them.
See [exact proposals and disposition](ticket-12-development-alternatives/semantic-qc-disposition.json).

Parity Job `bf3c3c25-83b1-4312-a710-b58ad567426a` completed with a contract-valid
`business_abstention`, Run `aecaf4e7-9482-4c5a-b252-305f02a160a6`: the chosen
`banker_notes` ownership region has no pre-issued `reader_pages` mapping. The
provider correctly refused to invent that locator. The underlying design records
this as a Native Banker-owned region; no automatic AI parity assertion is made
for it. This is a documented AI coverage limitation, not a provider failure or an
AI claim that visual parity passed. Independent exact
file checks and the delegated visual Review above supply that separate evidence.
See [the retained boundary](ticket-12-development-alternatives/ai-parity-abstention.json).
Each run records both encrypted input-envelope and provider-request evidence
before outbound I/O. Generated results remain proposals and cannot write
Reviews, resolve deterministic QC or grant readiness/external authorization.

Historical failed commentary/Parity outputs and the 600-second Semantic QC
provider timeout remain visible. Correct retries create new Jobs/Runs; they do
not rewrite failures, waive strict contracts or relabel technical failures as
business abstentions. One bounded extra Workbook Worker process used the same
lease/scoping functions during validation and was removed on completion.
