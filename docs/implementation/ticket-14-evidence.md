# Ticket 14 development evidence

Status: resolved for the authorized development implementation boundary on `develop`; local implementation and fresh-migration verification are complete. The public development boundary remains available for release verification.

## Implementation

- Material changes preserve predecessor, origin, actor, reason, effective time, evidence basis and current-pointer history in `analysis.material_change`; typed Impact Assessment, edge, item, disposition and revision-link records are Deal-scoped and forced RLS.
- Deterministic closure runs before semantic proposals, includes correction predecessors, cells/ranges, Deliverables, Reader Copies, QC, Package Readiness and prospective authorization blocks, and the semantic contract rejects omitted candidates or invented identifiers.
- Impact actions are independently dispositioned. A single item may require recalculation, regeneration, re-review and circulation hold; completed assessments reject later mutation and every required action is required before recovery or Revision creation.
- Revision creation preserves the predecessor and carries the exact Work Objective/packet scope into the new immutable Revision. A material Impact Assessment and 20-character change reason are required for the new Revision.
- The Analysis UI follows the confirmed prototype groups and canonical `/review-readiness/impact-assessments/{assessment-id}` route, exposes exact object IDs, locator/basis and independent action rows, keeps one page-level heading, and provides desktop handoff guards.

## Verification

- `npm run contracts:check` passed.
- `npm run domain:naming` passed.
- `npm run db:validate` passed: 95 ordered migrations.
- `npx tsc --noEmit` passed.
- `npm run web:build` passed with the canonical dynamic Impact route.
- Fresh PostgreSQL 18 clusters were created from zero and migrated through `20260908155142`; `npm run db:seed` passed.
- On the fresh migrated database, 20 HTTP/contract tests passed, including authenticated Evidence/Fact/Decision, Claim correction, Workbook Revision scope, public proof, AI semantic closure validation and AI RLS boundaries.
- Public development probes returned `200` for the web shell and Impact route, and unauthenticated `GET /api/v1/session` returned `401 application/problem+json` at `https://dev-banking.aptoren.com`.

## Boundary

This ticket implements prospective authorization invalidation through `analysis.prospective_authorization_block` and `authorization_scope_matches`; a separate persisted External-Use Decision workflow remains outside Ticket 14 and is not fabricated here. Authenticated browser acceptance could not be repeated while the local Mac was locked; no authenticated session evidence is claimed from that unavailable UI run. The development host already has the Ticket 14 release shell and public boundary checks; a final release switch for this commit remains a deployment operation.
