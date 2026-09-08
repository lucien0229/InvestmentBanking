# Ticket 15 development evidence

Status: resolved for the authorized development implementation boundary on `develop`; native reimport control-plane implementation, fail-closed gates, UI, and public development release are complete.

## Implementation

- `deliverable.external_edit_import` records the exact Deal-scoped export, baseline Revision, current Revision, manifest digest, edited protected object digest, compatibility result, row-version and accepted Revision lineage.
- `deliverable.artifact_region_comparison` preserves baseline, edited and current region payloads with stable region identity, ownership class, deterministic classification and comparison digest. The classifier covers unchanged, Banker edit, generated-region, source/formula, style/layout, comment/review, unsupported, requires-review and conflict states.
- Any dual change with non-convergent digests creates `deliverable.merge_conflict`; resolution is limited to `keep_banker`, `take_generated` or `manually_reconciled_import`, requires an exact Human Decision and uses `If-Match` row-version control. No last-write-wins path exists.
- Metadata, manifest, Deal scope, active protected edited object and digest are checked before comparison. Compatibility gates automatic readiness; unresolved conflicts and unsupported or ambiguous regions remain blocked. Blocked finalization can be retried with a fresh idempotency key without reopening a completed comparison.
- Acceptance calls Ticket 14's Impact-bound `deliverable.create_revision`, carries selected region receipts into the new build input and Job accepted inputs, preserves the current Revision, writes import provenance and change reason, and advances only through an immutable Revision.
- API routes cover session creation, finalization, comparison/conflict inspection, conflict disposition and accepted Revision creation under the Deal-scoped banker command boundary. The confirmed prototype route `/app/deals/{deal-id}/history-portability/reimports/{reimport-id}` exposes the fixed baseline, edited artifact, current target, exact locator ledger and blocked recovery posture.

## Verification

- `npm run contracts:check`, `npm run domain:naming`, and `npm run db:validate` passed: 99 ordered migrations.
- `npx tsc --noEmit --pretty false --incremental false` passed.
- `npx tsx --test tests/unit/reimport-comparator.test.ts tests/unit/reimport-hardening.contract.test.ts` passed: 7/7.
- `npm run web:build` passed with the reimport comparison route.
- A fresh PostgreSQL 18 cluster was migrated from zero through `20260909110000_reimport_backend_hardening.sql` successfully. The new function arities are executable by `app_runtime`; the old unbound arities are revoked.
- Remote development release `20260909-ticket15` is running with healthy API/workers/web containers. Public probes returned `200` for the web shell and reimport comparison route; unauthenticated `GET /api/v1/session` returned `401 application/problem+json`.
- Playwright verified the public reimport route heading, fixed baseline/current cards and Difference ledger. The page calls the Deal-scoped API and explicitly discloses when an authenticated receipt is unavailable.

## Boundary and blockers

The implementation stores metadata, region receipts and lineage in PostgreSQL; file bytes continue to live in the Protected Object Gateway. The repository has no independent Microsoft 365/Windows observer in this environment, so AC-052/056/064 and the confirmed Office save/reopen round-trip remain unverified. Authenticated browser acceptance was unavailable because the local Mac was locked; no authenticated session evidence is claimed. These are environment verification blockers, not silently promoted product evidence.

## Review outcome

The independent review findings were addressed in the hardening migration and API/UI changes: caller-supplied compatibility no longer overrides server unsafe classifications, Human Decisions are bound to the exact conflict and selected disposition, commands persist replay receipts, blocked comparisons remain retryable, accepted region choices are carried into the immutable Revision build input, and the page fetches the Deal-scoped reimport receipt. The remaining gaps are the unavailable external Office observer and authenticated browser session described above.
