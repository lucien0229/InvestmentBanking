# Ticket 02 implementation evidence

Date: 2026-08-27

## Scope and topology

Only the unauthenticated Project Northstar public proof was added. The browser uses the Next.js route `/project-northstar`, same-origin API rewrites, a short-lived `__Host-northstar_proof` cookie, and a bounded synthetic session. No email, card, Account authority, real upload, confidential-processing endpoint, live provider, payment, or Recipient route is reachable from this slice. Ticket 03/04 files and behavior were left untouched.

The synthetic store is intentionally isolated and explicitly labelled non-production. It is an in-memory adapter for this development/test proof; it is not the Account/Deal control-plane system of record.

## TDD and verification

- Red phase: `npx tsx --test tests/http/public-proof.http.test.ts` failed when the public proof routes were absent.
- Green phase: `npx tsx --test tests/http/public-proof.http.test.ts tests/contract-generation.test.ts` — 5 tests passed.
- Direct test suite: `npx tsx --test tests/*.test.ts tests/**/*.test.ts` — 12 passed; 2 Ticket 01 Reference Deal overview smoke tests still return `404` where the fixture expects `200` (the local seeded database/fixture condition documented below), so they are not used as a Ticket 02 gate.
- `npm test` — blocked before the test phase by the existing local seed database: `scripts/seed.ts` hit PostgreSQL `23503` on `usage_reservation_deal_id_fkey` while updating/deleting a seeded commerce deal. No seed cleanup or foreign-key mutation was performed by this work.
- Type/contract checks: `npx tsc --noEmit`; `npm run contracts:check` — passed.
- Web production build: `npm run web:build` — Next.js build passed and generated all 12 app routes, including the dynamic proof-state route and pricing/qualification continuation routes.
- Dependency check: `npm audit --omit=dev --audit-level=high` — 0 vulnerabilities.
- Formatting: `git diff --check` — passed.
- Browser QA via the bundled Playwright CLI: `/project-northstar` rendered the synthetic disclosure, 9 checkpoints, exact lineage/claims and Revision 0.3 hashes; the interactive route advanced package → EBITDA → Cash and displayed scoped disposition, actor/reason evidence and blocked Package Readiness. `/project-northstar/authorization-boundary` rendered the matching Revision 0.4 preview, SR-006, not-authorized posture and carry-forward false. `/resources/recorded-walkthrough` rendered exact source IDs/locators, $6.2m/$4.7m Cash, $18.4m/$17.8m EBITDA, $1.5m recovery, revision boundary, continuation links and `Interactive completion emitted by this route: no`.
- Artifact bytes: downloaded synthetic XLSX/PPTX/DOCX/PDF; `unzip -t` passed for all OOXML containers and `file` identified the PDF as PDF 1.4, 1 page. HTTP tests independently recompute SHA-256 from downloaded bytes and compare each exact Revision 0.4 metadata digest.

## Development-server verification — 2026-08-27

The live verification target was `https://dev-banking.aptoren.com`, not a local server. The release was deployed as `/opt/investmentbanking/releases/20260827-ticket02-dev` and `/opt/investmentbanking/current` resolves to that release. The prior `/opt/investmentbanking/releases/20260826-ticket01-v3` release remains present for rollback. The API and web systemd units were both `active`, and `nginx -t` passed. Remote `npm run web:build` and remote `npx tsc --noEmit` passed before the symlink switch. The shared development environment received the first-party `PUBLIC_WEB_ORIGIN` needed for the public mutation guard; no secret value was changed or recorded here.

- Playwright against the live HTTPS domain completed the full nine-checkpoint control loop. The same browser session was reloaded after checkpoint 1 and resumed at checkpoint 2, proving cookie-bound resumability. Completion was emitted only after the session recorded all checkpoints and inspected the Revision 0.4 Native Artifact, PDF Reader Copy and archive manifest.
- A separate live keyboard run used `Space` activation for Start, each enabled observation/command, and the exact-download links. It reached the same completed state with the same Cash/EBITDA evidence, Revision boundary and `not_authorized` Revision 0.4 posture. The recorded route's skip link was reached with `Tab`, activated, and its chapter link received focus in sequence.
- The recorded live route `/resources/recorded-walkthrough` exposed the matching facts and continuation links and rendered `Interactive completion emitted by this route: no`. The browser console had zero errors after deployment stabilization.
- Live HTTPS black-box checks returned `200` for the public proof, `403 origin_rejected` for missing and foreign-Origin session starts, `201` for the configured first-party Origin, and `404` for `POST /api/v1/upload-sessions`, `POST /api/v1/public/project-northstar/uploads`, `POST /api/v1/public/project-northstar/confidential-processing`, and `POST /api/v1/confidential-processing`. No real upload or confidential-processing path was reachable.
- The six Revision 0.4 files downloaded through the live route. Local SHA-256 of those live responses matched the exact hashes rendered by the server: XLSX `995261c4ad351b2684151b6089b1c5449167834631a06f495995cb21b0ef465c`, PPTX `5fd4120e4b28aae8b8fefacbf02a7ab0e9c474396bb599fc37f528baa3bb9e09`, DOCX `929fe77f9172fe248bcc98e3761d0fbb36f240b520cc23419a1fb26a756cee8c`, PDF `2473d5c667eb89ef95717102a38fcbf40d559d6136807004f13808d10943dd1e`, control records `cd88ecef27dee0471ba4b1b6b0f97236c78377b8a925e0763888599b86412340`, and archive manifest `3c3a2569127a9d779d6f8f3f3439bdd2393bbc648bd1d094d774a74d189939c2`. `unzip -t` passed for the XLSX/PPTX/DOCX containers; `file` identified the PDF as a one-page PDF. The control records and manifest preserve SR-002/SR-003/SR-005/SR-006, Cash `6.2` → `4.7` with delta `1.5`, both EBITDA claims, and the exact Revision 0.4 no-carry-forward authorization boundary.
- Artifact inspection receipts are now bound to the client-computed SHA-256 of the bytes actually downloaded. A live tampered receipt returned `422 artifact_integrity_mismatch`; valid XLSX/PDF/archive receipts returned `201` and completion remained gated on the same session. After SR-006, the live session retained `package_readiness: blocked` and `circulation: blocked`; a refresh preserved that state. Unauthenticated Revision 0.4 deep links show the boundary and blocked readiness but expose zero downloadable Revision 0.4 links until a session appends SR-006.

An initial deployment probe exposed only release wiring problems (standalone `server.cjs` compatibility and missing standalone static chunks) plus the required first-party Origin configuration. Those were corrected inside the Ticket 02 development release, re-verified above, and did not change the application control model.

The final API-only redeploy after the last hardening change passed remote `npx tsc --noEmit`; the API remained `active`, `nginx -t` passed, and `/opt/investmentbanking/current` still resolved to the Ticket 02 release. The public mutation limiter is now a 30-token burst with refill, matching the proof contract while allowing the complete receipt-bearing flow.

## Acceptance mapping

| Acceptance | Evidence |
|---|---|
| AC-001 / anonymous entry | Public browser route and `POST /api/v1/public/project-northstar/sessions` require no email/card/Account; strict missing/foreign session cookie returns a generic problem. |
| AC-002 / one-session completion | Completion is gated to one cookie-bound session, source-lineage observation, all 9 checkpoints, five controlled actions, and successful Revision 0.4 XLSX Native Artifact, PDF Reader Copy and archive-manifest inspection receipts whose client-computed SHA-256 matches the exact server artifact. GET state/download reads are pure; state-changing observations/receipts are explicit POSTs. |
| AC-003 / Cash lineage and correction | SR-005 `Balance Sheet!F28`; original 6.2, source/corrected 4.7, delta 1.5, server-owned synthetic actor and reason are rendered and asserted. |
| AC-004 / EBITDA conflict | SR-002 `CLM-018` 18.4 and SR-003 `Operating Case!F42` 17.8 remain retained; only `scoped_simulated_disposition` is accepted; overwrite/average requests are rejected. |
| AC-005 / Revision and authority | SR-006 appends Revision 0.4; immutable Revision 0.3 remains in history; 0.4 is `not_authorized`, bound to 0.4, and `carry_forward: false`. |
| AC-006 / exact artifacts | Rights-cleared synthetic XLSX/PPTX/DOCX/PDF/control-records/archive-manifest metadata includes exact Revision, filename, format and SHA-256; six live downloads matched those digests and container checks passed. Unauthenticated Revision 0.4 deep links hide the download list until the same session appends SR-006, while session-bound bytes and hash receipts resolve exactly. |
| AC-007 / recorded route | Recorded transcript exposes the same facts and continuation actions, uses matching `/project-northstar/{proof-state}` chapter links, and explicitly reports no interactive completion. |
| AC-008 / synthetic boundary | Every event/Job/artifact carries synthetic flags; completion explicitly reports false paid activation, provider evidence and production security evidence. |
| AC-074 / accessible route | Live server browser smoke reached the skip link and chapter focus with Tab, activated Start and every enabled proof action/download with Space/Enter, and completed the same nine-checkpoint state. Semantic headings, labelled regions, status/alert text, exact text facts and the recorded alternative are present. |

## Synthetic versus production boundary

Verified here: local Fastify contract behavior, same-session state machine, strict command inputs, synthetic lineage/decision/correction evidence, deterministic arithmetic, exact Revision/hash projections, valid fixture containers, browser rendering, and no-upload route absence.

Not verified and intentionally not claimed: production control-plane persistence/restart recovery, production Account/Deal authorization, real Supabase/Auth/Passkey, real Office/PDF generation/render/parity, live AI/OCR/provider calls, payment/entitlement, external-use delivery, Recipient access, production rate/edge configuration, production security evidence, or paid activation. The in-memory adapter and marker containers are isolated test/demo fixtures and must not be promoted as production authority.

## Git/worktree state

`HEAD` and `main` both resolve to `73c72a5b1d77b41d9cfb5bae72b08412861a907b` at verification. The worktree contains only the Ticket 02 implementation, contract/test changes, and this evidence/status update; no commit, push, PR, cleanup, or Ticket 03/04 change was made.

## Integration update — 2026-08-31

The Ticket 02 implementation commit `010c658` and tracker closure commit `eadc9d4` are now on `main`. The main worktree is clean at `eadc9d4`; no push, PR, cleanup, or Ticket 03/04 change was made. The originating implementation worktree is detached at `c6f7f55` and clean.
