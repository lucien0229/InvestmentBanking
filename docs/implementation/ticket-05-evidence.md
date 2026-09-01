# Ticket 05 implementation evidence

Status: `resolved for the authorized development environment` — Supabase dev schema, the new VPS release, and the public HTTPS boundary are verified. No production-complete claim is made.

## Scope

This change is limited to identity-complete paid Deal Setup, Active Deal capacity reservation, privacy-safe Paid Preflight, linked Deal identity changes, First Deal Guide state, Audit events, and the minimum Web/API surface for that loop. Tickets 01–04 and Ticket 06+ were not reimplemented or advanced.

## Implementation surface

- `db/migrations/0004_deal_setup_paid_preflight.sql` adds identity fields and digest immutability to `app.deal`, versioned Setup drafts, capacity reservations with a per-account advisory lock and partial unique slot index, Paid Preflight/control-result history, First Deal Guide checkpoint, command idempotency, forced RLS, and closed `SECURITY DEFINER` procedures owned by the NOLOGIN `app_commerce_owner` role.
- `apps/api/src/app.ts` adds account/deal-scoped create/list/setup/preflight/limited-proceed/identity-change/guide routes and a processing guard that rejects preflight-restricted and Confidential/Restricted operations before parsing, AI, rendering, or provider egress.
- `apps/web/app/app/page.tsx`, `apps/web/app/app/deals/new/page.tsx`, and the dynamic Deal Setup, Paid Preflight, and First Deal Guide routes provide a resumable minimum UI without accepting source bytes.
- `contracts/openapi.json` and generated `packages/contracts/generated/openapi.ts` describe the Ticket 05 routes and payloads.
- `tests/http/deal-setup-paid-preflight.http.test.ts` and `tests/unit/ticket05-rls.contract.test.ts` provide the red/green HTTP and authorization coverage.

## Verification commands

- TDD red phase: the Ticket 05 HTTP tests initially failed with absent routes; after the migration/API seam was added, all focused tests passed.
- `npm test` — 39 tests passed, 0 failed. This includes contracts, existing Ticket 01–04 regressions, Ticket 05 HTTP scenarios, and forced-RLS/function-owner checks.
- Current-turn rerun note: the local Docker daemon was unavailable, so the DB-backed suite could not be rerun after the final hosted-owner privilege hardening; contracts, TypeScript, and Web build were rerun successfully. The hosted Supabase verification below is independent evidence.
- `npm run contracts:check` — passed.
- `npx tsc --noEmit` — passed.
- `npm run web:build` — passed; Next.js generated `/app`, `/app/deals/new`, and the dynamic Deal Setup/Preflight/Guide routes.
- Real local HTTP checks: the API returned `401 application/problem+json` for unauthenticated `GET /api/v1/deals`; the local Web development server returned `200` for `/app`, `/app/deals/new`, and each dynamic Ticket 05 route.
- Real local browser check: Playwright opened `/app/deals/new`, snapshotting the Create Deal form; the dynamic Setup route rendered its unauthenticated recovery state. A viewport screenshot was inspected with `view_image` and removed as a temporary QA artifact.
- Remote staged-process checks (before any symlink switch): the Ticket 05 API process returned `401 application/problem+json` for unauthenticated `GET /api/v1/deals` on `127.0.0.1:3011`, and the standalone Web process returned `200` with the Create Deal marker for `/app/deals/new` on `127.0.0.1:3010`; both temporary processes were stopped.
- Supabase `InvestmentBanking (dev)` SQL Editor: all six Ticket 05 tables exist; all eight Ticket 05 functions are owned by `app_commerce_owner` with `can_login=false` and `bypasses_rls=true`; the temporary schema `CREATE` privilege used for hosted ownership transfer is revoked. Existing data was preserved; no `DROP`, `TRUNCATE`, reset, or rollback operation was issued.
- VPS deployment: `/opt/investmentbanking/current` points to `/opt/investmentbanking/releases/20260901-ticket05-dev-v2`; API and Web systemd units are active; `nginx -t` passes; the temporary upload archive and all prior application release directories were removed after verification per the user's no-rollback authorization. The only remaining application release directory is `20260901-ticket05-dev-v2`.
- Public HTTPS after cleanup: `https://dev-banking.aptoren.com/app/deals/new` returns `200 text/html` and renders `Create Deal`; unauthenticated `GET /api/v1/session` returns `401 application/problem+json`.
- Browser recheck after cleanup: the authenticated Chrome session loaded the same public URL and the visible snapshot contains the `Create Deal` heading, purchase-authority acknowledgement field, and identity-complete Deal action.

## Acceptance mapping

| Boundary | Local/test evidence |
|---|---|
| AC-012 | Processing guard requires the permitted preflight posture, rejects provider/AI/rendering operations, and rejects Confidential/Restricted parse/AI/render/provider operations before any content field is accepted. No source-byte ingestion route exists in Ticket 05. |
| AC-013 | Paid Preflight persists eight dimension results with privacy-safe reason/recovery pairs and returns `pass`, `limited-proceed`, `blocked`, or `waiting-for-user`; focused tests exercise blocked, limited, pass, and waiting states. |
| AC-014 | Versioned Setup drafts allow source replacement/removal, intended-use narrowing, compatibility/minimum-packet updates, and resume through a new preflight. |
| AC-019/020 | Creation persists identity, role/side, stage, purpose, currency/units, authority context, actor, acceptance time, digest, and capacity reservation. Identity changes create a new linked Deal and leave the predecessor unchanged. |
| AC-021 | The identity immutability trigger prevents in-place identity mutation; future source/Bid/Process Event state remains Deal-scoped for downstream tickets. |
| Cross-tenant safety | `withContext` exact Account/Deal binding, forced RLS, non-public definer functions, concurrent capacity tests, and cross-account 404 tests passed. |

## Local/test versus development/production boundary

The local database and API use a deterministic test entitlement fixture and local Auth adapter. They are not evidence of live Stripe collection, provider compatibility, real Confidential/Restricted processing, remote Supabase migration state, or production resilience. The local API/Web development servers were started only for verification and stopped afterward; the local PostgreSQL volume was preserved.

The authorized public development host now runs the new release and passes the public Web/API boundary checks above. The configured `app_runtime` role remains intentionally unable to apply offline migrations; the migration was applied through the authenticated Supabase SQL Editor for project `InvestmentBanking (dev)`, preserving existing data. This is development evidence only, not proof of live provider compatibility, Confidential/Restricted processing, or production recovery.

## Review/debt boundary

Remaining debt is intentionally explicit: live provider evidence, production independent processing/provider egress, source-byte quarantine/parse/render implementation, later Deal artifacts (Bids/Process Events), and production restore/recovery measurements. No production-complete claim is made.
