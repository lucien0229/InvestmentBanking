# Ticket 14 development evidence

Status: resolved for the authorized development implementation boundary on `develop`; local implementation, fresh-migration verification, and the public development release are complete.

## Implementation

- Material changes preserve predecessor, origin, actor, reason, effective time, evidence basis and current-pointer history in `analysis.material_change`; typed Impact Assessment, edge, item, disposition and revision-link records are Deal-scoped and forced RLS.
- Deterministic closure runs before semantic proposals, includes correction predecessors, cells/ranges, Deliverables, Reader Copies, QC, Package Readiness and prospective authorization blocks, and the semantic contract rejects omitted candidates or invented identifiers.
- Impact actions are independently dispositioned. A single item may require recalculation, regeneration, re-review and circulation hold; completed assessments reject later mutation and every required action is required before recovery or Revision creation.
- Revision creation preserves the predecessor and carries the exact Work Objective/packet scope into the new immutable Revision. A material Impact Assessment and 20-character change reason are required for the new Revision.
- The Analysis UI follows the confirmed prototype groups and canonical `/review-readiness/impact-assessments/{assessment-id}` route, exposes exact object IDs, locator/basis and independent action rows, keeps one page-level heading, and provides desktop handoff guards.

## Verification

- `npm run contracts:check` passed.
- `npm run db:validate` passed: 98 ordered migrations.
- `npx tsc --noEmit` passed.
- `npm run web:build` passed with the canonical dynamic Impact route.
- Fresh PostgreSQL 18 cluster `55450` was created from zero, migrated and seeded through `20260908170012` plus the native artifact migration; the focused authenticated material-impact HTTP test passed (`1/1`).
- `npm run contracts:check`, `npm run domain:naming`, `npx tsc --noEmit --pretty false --incremental false` and `npm run web:build` pass on the reviewed `develop` tree. The Ticket 14 route was rechecked after the later Ticket 15 UI work and remains free of delivery-number identifiers.
- Release `20260909-ticket14-v4` is running on the development Cell. Remote migration verification reports `20260908170011` and `20260908170012`, the `calculation_version` trigger constraint, and the completed-assessment immutable error branch.
- Public development probes returned `200` for the web shell and Impact route, and unauthenticated `GET /api/v1/session` returned `401 application/problem+json` at `https://dev-banking.aptoren.com`. Playwright also verified the Impact heading, prototype receipt, five independent groups and dependency closure rows.

## Boundary

This ticket implements prospective authorization invalidation through `analysis.prospective_authorization_block` and `authorization_scope_matches`; a separate persisted External-Use Decision workflow remains outside Ticket 14 and is not fabricated here. Authenticated browser acceptance could not be repeated while the local Mac was locked; no authenticated session evidence is claimed from that unavailable UI run. The public development release and anonymous UI acceptance are complete; authenticated browser acceptance remains the only outstanding manual verification.
