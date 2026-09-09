# Ticket 19 — CIM Native/Reader Loop Evidence

## Scope

Ticket 19 adds a governed `cim_presentation` deliverable. A strict
`cim_content_draft` proposal is bounded to the exact Work Objective packet,
Evidence, Facts, Assumptions, approved disclosure set and Output Ceiling.
Every section has a qualification, point citation, source/Evidence/basis
references and native/Reader locators. Unsupported or out-of-perimeter
references are rejected before a build job is queued. The deliverable remains
proposal-only and external use remains blocked.

## Local acceptance

- `npm run db:validate` — passed, 104 ordered migrations.
- `npm run contracts:check` — passed.
- `npx tsc --noEmit --pretty false --incremental false` — passed.
- `npm run web:build` — passed with the production rewrite target
  `API_ORIGIN=http://api:3001`.
- `npx tsx --test tests/unit/ai-source-proposal.contract.test.ts tests/unit/cim-content-contract.test.ts tests/unit/cim-presentation.contract.test.ts tests/unit/teaser-content-contract.test.ts` — passed, 13/13.
- `python3 -m unittest tests/unit/test_cim_observer.py tests/unit/test_teaser_observer.py` — passed, 4/4.
- Python compilation and `git diff --check` — passed.
- The CIM observer passes native structure, revision identity, citation and
  bidirectional lineage, native editability, Native/Reader parity,
  confidentiality, proposal-only, hidden-note, and render identity/QC-scope
  checks. Adversarial tests cover Reader reordering, missing native charts,
  hidden notes, and the cover-inclusive Output Ceiling.

## Development-server acceptance

The authorized development host is serving immutable release
`20260909-ticket19` at `https://dev-banking.aptoren.com`. Migration
`20260909170000_cim_presentation` was applied to the development Supabase
branch and recorded in `supabase_migrations.schema_migrations`.

- Public CIM route:
  `https://dev-banking.aptoren.com/app/deals/290c3734-3b1a-442d-beab-89ce0f8b5e99/cim`
  returned HTTP 200; its stylesheet returned HTTP 200. The authenticated
  page rendered the confirmed prototype-aligned `Confidential Information
  Memorandum` detail, PPTX + PDF property strip, Revision, Native, Reader,
  Parity/QC-022, Reviews, Revisions, Lineage and blocked External Use states.
- Authenticated CIM deliverable: `f340376e-0040-48b7-ada9-a02454f4779b`.
- Final successful Revision: `fbca1fbb-9357-41c5-a25d-d74a475e1c90` (ordinal 4).
- Final Job: `ab6ace86-42fd-42c3-bdca-0a5b84ed3f5d`, completed with
  `artifacts_and_qc_recorded`.
- QC run: `2f2c305e-8fff-4d67-a545-05c74641c577`, ruleset
  `cim-presentation-qc-1.0.0`, with no QC Findings. All semantic/native/
  Reader checks and `signed_manifest` passed.
- Native `cim.pptx`: 33,776 bytes,
  SHA-256 `9d6cf226177ecef2fde3fc923f045041db5bc55d219ba7a2b488a9880ae4f765`.
- Reader `cim.pdf`: 36,713 bytes,
  SHA-256 `9aead49db9d20f3151f00e3f6fc11cd06b158ec3a37f1a1b0fac0c2675fe5a88`.
- Receipt: LibreOffice Impress `7.4.7.2`, template `cim-1.0.0`, acceptance
  profile `development_foss_v1`, Office image
  `sha256:b5ad6eaf07bc72e860f98e2203ce5aaf7f240b0f4bc7a208b24981d6bc9fe2ae`,
  two exact slides/pages, no font substitutions, matching Native/Reader
  identity and per-element lineage.
- The authenticated browser acceptance screenshot is
  [ticket19-cim-authenticated.png](../../output/playwright/ticket19-cim-authenticated.png).

The first development attempts correctly failed closed because the Office
image still contained only the Ticket 18 scripts. A new immutable development
image was created with the Ticket 19 renderer/observer, loaded into the
development Podman store, and installed behind the persistent
`investmentbanking-office.service`; the final job above then completed.

## Evidence boundary

This resolves Ticket 19 for the authorized development profile. LibreOffice
Impress is the declared development renderer and observer; Microsoft 365/
Windows compatibility and production key custody remain separate production
evidence requirements. No later ticket was implemented or advanced.
