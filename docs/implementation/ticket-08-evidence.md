# Ticket 08 implementation evidence

Status: local implementation complete; development web/API release switched on the authorized host. Database migration is blocked by the host's runtime-only database credential and is not claimed as applied.

## Scope

Ticket 08 only: exact Source Packet roots and immutable versions, purpose-bound Work Objectives, durable Output Ceiling assessments, source condition and rights assessments, prospective reliance removal, impact/circulation blocking, safe worker-input gating, API/OpenAPI routes, and the Sources control surface. No later-ticket scope was advanced.

## Implementation surface

- `supabase/migrations/20260830070000_source_packet_output_ceiling.sql` adds the forced-RLS packet/version/member/exclusion, Work Objective, Output Ceiling, condition, rights, impact, and circulation-control tables plus definer procedures and immutable triggers.
- `supabase/migrations/20260830080000_source_packet_projection_guard.sql` and `20260830110000_source_packet_version_projection_guard.sql` keep unknown packets non-enumerating and make an exact-version read use that version's own ceiling/objective/impact/circulation state.
- `supabase/migrations/20260830100000_source_reliance_assessment.sql` and `20260830130000_source_condition_reliance_guard.sql` persist purpose-bound reliance assessments and remove prospective reliance on withdrawal, stale, conflict, or blocked rights changes.
- `supabase/migrations/20260830120000_source_packet_command_idempotency.sql` and `20260830150000_source_packet_idempotency_retention.sql` provide durable digest-checked command replay for Ticket 08 mutations with a 30-day replay window.
- `supabase/migrations/20260830140000_source_packet_preflight_cap.sql` caps packet ceilings to the current limited-proceed Paid Preflight posture.
- `apps/api/src/ticket08.ts` registers the scoped packet/version/objective/condition/rights APIs, required `If-Match`/`Idempotency-Key` headers, RFC 9457 problems, private no-store responses, and replay headers.
- `apps/web/app/app/deals/[deal_id]/sources/page.tsx` renders the exact packet boundary, source version/member posture, freshness/conflict/coverage, Output Ceiling, Work Objective, blockers, exclusions, recovery actions, and an inspect-only synthetic fallback. UUID routes do not silently fall back to synthetic data.
- `contracts/openapi.json` and `packages/contracts/generated/openapi.ts` declare the routes, schemas, If-Match and Idempotency-Key requirements.

## Verification

- `npm run db:migrate` — all migrations through `0015-source-packet-idempotency-retention.sql` applied successfully on the local PostgreSQL instance.
- `npm exec tsx -- --test tests/http/source-packet-output-ceiling.http.test.ts tests/unit/ticket08-rls.contract.test.ts` — 3 tests passed, 0 failed. This covers exact membership/version history, immutable mutation rejection, stale/withdrawn conditions, prospective reliance removal, circulation blocking, stale `If-Match`, rights blocking, worker ceiling denial, idempotent replay, forced RLS, and contract declarations.
- `npm test` — 51 tests passed, 0 failed across Tickets 01–08.
- `npm exec tsc -- --noEmit` — passed.
- `npm run contracts:generate && npm run contracts:check` — passed.
- `npm run web:build` — passed with Next.js 15.5.24.
- `git diff --check` — passed.
- Playwright CLI against the isolated local Web/API servers rendered `/app/deals/project-northstar/sources` with the synthetic-data banner, exact packet boundary, permitted/excluded Output Ceiling, Work Objective, immutable members, freshness/conflict/coverage columns, blockers, exclusions, and recovery links. A fresh browser session reported 0 console errors and 0 warnings. Screenshot: `output/playwright/ticket08-sources-final.png`.

## Development boundary

The authorized host was reachable over SSH after the user supplied its password. Release `/opt/investmentbanking/releases/20260902-ticket08-dev-v1` was extracted, dependencies copied from the prior development release, the Next standalone build completed, static assets were staged, and `current` was atomically switched to that release. `investmentbanking-api.service`, `investmentbanking-web.service`, and `nginx` all reported `active` after restart. Unauthenticated probes to `https://dev-banking.aptoren.com/app/deals/project-northstar/sources` returned `200 text/html` containing the Ticket 08 Source Packet control surface markers (`Source Packet control`, `Output Ceiling`, `SP-004`, `Freshness`); `/api/v1/session` returned the expected `401 application/problem+json`.

Applying the SQL migrations on the host could not complete: the shared `DATABASE_URL` authenticates as `app_runtime`, and `npm run db:migrate` returned PostgreSQL `42501 permission denied for database postgres`. No migration-admin credential is present in the authorized host environment, so the database schema and authenticated Ticket 08 API path are not claimed as deployed. The old development release remains available under `/opt/investmentbanking/releases/20260902-ui-remediation-dev-v1`; no production/provider/restore claim is made.

The authorized SSH deployment used `root@152.53.90.227`; only the development release path and its services were changed. The database migration blocker above is explicit; no production/provider/recovery evidence is claimed.

## Review boundary

The required standards/spec two-axis review was run against the Ticket 08 diff. The implementation fixes the review findings that were in scope for this slice: required command keys with durable replay, exact historical projection semantics, nested/top-level condition routes, duplicate membership protection, reliance persistence, preflight ceiling capping, worker invocation revocation, helper execute restrictions, and private response caching. Remaining follow-up debt is recorded rather than presented as production proof: explicit Output Ceiling acceptance/status transition, Job Scope/lease/runtime-principal integration for a future worker adapter, typed rights-operation rows, assessment-pointer composite FKs, preflight expiry/posture revalidation, and full source-selection checkbox UX.
