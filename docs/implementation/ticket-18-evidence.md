# Ticket 18 — Teaser Native/Reader Loop Evidence

## Scope

Ticket 18 implements the stage-required Teaser from a strict `teaser_content_draft` proposal. The Native PPTX and Reader PDF are generated from one exact Revision, with point citations, machine lineage, confidentiality, proposal-only status, and native/Reader parity checks. When applicability is `not_stage_required`, the database returns that state without creating a false completeness blocker or build job.

## Local acceptance

- `teaser_content_draft` contract, schemas, prompt package, and contract test are present.
- `python3 services/office/run_workbook.py` generated editable `teaser.pptx`, exact `teaser.pdf`, reader-page PNGs, render report, and inspection output from a seeded three-section draft.
- Native/Reader inspection passed: `native_structure`, `revision_identity`, `citation_lineage`, `native_editable`, `native_reader_parity`, `confidentiality`, and `proposal_only`.
- The observer now rejects seeded Reader page reordering, missing native chart/table shapes, unapproved citations, reference IDs outside the supplied Evidence/Facts/Assumptions perimeter, and sections exceeding the cover-inclusive Output Ceiling. Failed checks carry exact slide/page or shape locators, severity, impact, owner, disposition, and intended-use consequence.
- `python3 -m unittest tests/unit/test_teaser_observer.py` passes both the clean render and adversarial page-reorder/missing-chart/Output-Ceiling cases.
- The exact render receipt records the observed LibreOffice Impress version, render time, selected slide/page mapping, declared audience/purpose/confidentiality, native and Reader SHA-256 values, fonts/substitutions, and per-section/per-element lineage.
- `npm run db:validate`, `npm run contracts:check`, TypeScript no-emit, Python compilation, web build, contract test, and `git diff --check` pass.

## Development-server acceptance

The restored development host completed real Ticket 18 builds on release `20260909-ticket18`.

- Route: `https://dev-banking.aptoren.com/app/deals/290c3734-3b1a-442d-beab-89ce0f8b5e99/teaser?deliverable_id=ba1d37e8-5280-42d8-b9ee-3d91b78f2a9a` returned HTTP 200 and the served UI shell contains `Teaser`, `Applicability`, `Native`, `Reader`, `Lineage`, and `Review` markers.
- The initial raw-browser screenshot was caused by an incomplete web release: `.next/static` was absent, so the CSS and JavaScript chunks returned 404. The development web release was repaired from the immutable build output; the route now returns HTTP 200 and its stylesheet returns HTTP 200. `scripts/deploy-docker-cell.sh` now fails closed when `.next/static` is missing or empty.
- The reviewed route set for Tickets 14–18 all returned HTML 200 with CSS 200 on the development host. Ticket 18 visual acceptance screenshot after repair: `output/playwright/ticket18-teaser-after-static.png`.
- Deliverable: `ba1d37e8-5280-42d8-b9ee-3d91b78f2a9a` (`current_stage_required`).
- Revision: `d97e9ef4-4dd8-44c3-8748-0bbf62324cd9` (ordinal 9, proposal-only, synthetic controlled inputs).
- Job: `264b3dc0-ad59-4890-8c4f-0e99f3f5933f` completed with `artifacts_and_qc_recorded`; QC run `2221f02f-bc43-41f1-9a18-1c9a65687d55`.
- Native artifact: `teaser.pptx`, SHA-256 `4580045d04577fc6997383bb831fdefe39042b85f29f793f243ebc860f75bc46`, 38,556 bytes.
- Reader artifact: `teaser.pdf`, SHA-256 `5dd538ebd3f4a3b845c4d0ee24cb5601489c0e437f59627259631faaa8e6466e`, 39,541 bytes.
- Reader previews and render report were stored as six exact protected artifacts. The receipt reports LibreOffice Impress `7.4.7.2`, template `teaser-1.0.0`, image digest `sha256:c8501f568ab6a57ca9dd118b4b5a1015c49d82d9328ba1a1278a31f12b8b9ed0`, three selected slides/pages, no font substitutions, and matching native/Reader identity.
- All semantic/native/Reader checks passed: `native_structure`, `revision_identity`, `citation_lineage`, `native_editable`, `native_reader_parity`, `confidentiality`, and `proposal_only`. Every section has point-of-use disclosure, Evidence, Fact, Assumption, source, native locator, Reader locator, and qualification lineage.

After the signer service was restored, revision `4aa4f954-e628-455c-bc9a-ac786ae56791` (ordinal 11) completed with job `39947e1c-3a4c-4f9e-a76a-c8e6a4798c68`. Its manifest endpoint returned HTTP 200 with manifest `a621b343-1a22-48de-8185-bb84193fe795`, Ed25519 key `development/artifact/20260906/versions/1`, canonical SHA-256 `6e1a6918eccccf08238291dfdeb5162c9e8adddea6a62814e4c4f4f3ab17ee1`, and `signed_manifest=passed` against the exact six artifact members. Native `teaser.pptx` SHA-256 is `2d774bef2704182c2bf76bc141008f2137baeeffc4deb9fc4a5f76e5f9f61ce7`; Reader `teaser.pdf` SHA-256 is `224c319f84fceadba429205aa75734d6554bd3e66bce8bda2ecb1e5f20b2a49c`.
- Authenticated development UI acceptance screenshot: `output/playwright/ticket18-authenticated-final.png`; the route loaded the real Deal header, Revision 11, exact identity, proposal-only boundary, and the Overview/Native/Reader/Lineage/Review & QC tabs.

The host required a restored Live-environment fallback: rootful Podman with a persistent graph root because rootless user delegation was unavailable. The repository-side Office image was corrected to install `libreoffice-impress`; the resulting image was manually exercised and then used by the real job. The development signer is now a compose-managed, isolated, read-only `network_mode: none` service with a persistent socket and development Ed25519 key. Its first Teaser attempt correctly exposed a signer policy gap for `libreoffice.impress`; the signer was narrowed to the authorized development profile and the fresh revision above passed exact signature verification. Per the authorized development alternative, LibreOffice Impress is the Office observer for this environment; Microsoft 365 remains a separate production compatibility evidence requirement.

## Known evidence boundary

LibreOffice Impress is the declared development renderer and observer; the semantic/native-reader receipt records its version, fonts/substitutions, selected slides, and hashes. The fresh development revision records a signed manifest and exact member hashes. Microsoft 365/Windows compatibility remains outside the authorized development acceptance boundary.
