# Ticket 18 — Teaser Native/Reader Loop Evidence

## Scope

Ticket 18 implements the stage-required Teaser from a strict `teaser_content_draft` proposal. The Native PPTX and Reader PDF are generated from one exact Revision, with point citations, machine lineage, confidentiality, proposal-only status, and native/Reader parity checks. When applicability is `not_stage_required`, the database returns that state without creating a false completeness blocker or build job.

## Local acceptance

- `teaser_content_draft` contract, schemas, prompt package, and contract test are present.
- `python3 services/office/run_workbook.py` generated editable `teaser.pptx`, exact `teaser.pdf`, reader-page PNGs, render report, and inspection output from a seeded three-section draft.
- Native/Reader inspection passed: `native_structure`, `revision_identity`, `citation_lineage`, `native_editable`, `native_reader_parity`, `confidentiality`, and `proposal_only`.
- The observer now rejects seeded Reader page reordering, missing native chart/table shapes, unapproved citations, reference IDs outside the supplied Evidence/Facts/Assumptions perimeter, and sections exceeding the cover-inclusive Output Ceiling. Failed checks carry exact slide/page or shape locators, severity, impact, owner, disposition, and intended-use consequence.
- The exact render receipt records the observed LibreOffice Impress version, render time, selected slide/page mapping, declared audience/purpose/confidentiality, native and Reader SHA-256 values, fonts/substitutions, and per-section/per-element lineage.
- `npm run db:validate`, `npm run contracts:check`, TypeScript no-emit, Python compilation, web build, contract test, and `git diff --check` pass.

## Development-server acceptance

Pending final remote job execution and authenticated route verification. The remote migration and Office image build were prepared, but the development host currently rejects SSH with `Not allowed at this time`/banner timeout and its public upstream returns `502 Bad Gateway`. The final evidence must record the exact deliverable, Revision, job, QC, artifact hashes, Office image digest, and public UI route after the host accepts a session.

## Known evidence boundary

The development host does not have a licensed Microsoft Office observer. LibreOffice Impress is the declared renderer and the semantic/native-reader receipt records its version, fonts/substitutions, selected slides, and hashes. A signed manifest is recorded when the configured signer is available; signer unavailability remains an explicit QC check rather than a fabricated proof.
