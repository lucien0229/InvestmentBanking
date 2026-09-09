# Ticket 20 — Preparation Package Readiness evidence

Status: `resolved for the authorized development boundary`.

Ticket 20 adds Deal-scoped `deal.execution_package`, immutable `deal.package_snapshot` and member/control/dependency tables, plus the rebuildable `projection.package_readiness` projection. The SQL function `deal.get_package_readiness` evaluates each exact member and nine independent readiness families. Missing required native/reader artifacts, blocked exact Deliverable Readiness, missing Source/Evidence controls, and absent External-Use authorization remain explicit blockers. `not_stage_required` members do not block. The result includes `scalar_score: null` and `external_use_authorized: false`; no global score or external authorization is created.

The API exposes:

- `GET/POST /api/v1/deals/{deal_id}/execution-packages`
- `GET /api/v1/deals/{deal_id}/execution-packages/{package_id}`
- `GET/POST /api/v1/deals/{deal_id}/execution-packages/{package_id}/snapshots`
- `GET /api/v1/deals/{deal_id}/execution-packages/{package_id}/snapshots/{snapshot_id}`
- `GET /api/v1/deals/{deal_id}/execution-packages/{package_id}/snapshots/{snapshot_id}/readiness`

The UI route `/app/deals/{deal_id}/execution-package` renders the package overview and exact snapshot action. `/review-readiness/package-readiness` renders the prototype-aligned blocker-first matrix with independent readiness families, retained limitations and the explicit internal-only External-Use posture.

Local and disposable PostgreSQL evidence:

- `node --test --import tsx tests/unit/preparation-package-readiness.contract.test.ts` — 2 passed.
- `npx tsx --test tests/http/preparation-package.http.test.ts` against a disposable PostgreSQL database loaded through the Ticket 20 dependency chain — passed. This covered unauthenticated rejection, authenticated package creation, exact revision binding, readiness blockers, `scalar_score: null`, `external_use_authorized: false`, and snapshot immutability.
- `npx tsc --noEmit --pretty false --incremental false` — passed.
- `npm run web:build` — passed.
- `npm run db:validate` — 105 migrations, unique ordered versions.
- Fresh PostgreSQL 18 cluster replayed all 105 migrations with `npm run db:migrate`, including the Teaser/CIM constraint rebuilds and Ticket 20 migration — all applied successfully.

Development VPS evidence:

- Immutable release copied to `/opt/cells/investmentbanking/dev/releases/20260909-ticket20`; web runtime copied to `/opt/cells/investmentbanking/dev/web-releases/20260909-ticket20`.
- Docker Cell `investmentbanking-dev` was recreated from the release. API and Web containers reported healthy/starting, and the public HTTPS root returned `200`.
- `GET https://dev-banking.aptoren.com/api/v1/session` returned the expected unauthenticated `401 application/problem+json`.
- `GET https://dev-banking.aptoren.com/app/deals/project-northstar/execution-package` returned `200` and the served HTML contained `Preparation Package`, `Package Readiness`, and `External use` markers.

The remote Supabase migration credential is intentionally not stored on the VPS. `SUPABASE_DB_URL` is already configured in the development GitHub Environment from the earlier database work; no provider credential was copied into the release or runtime. The latest pushed `develop` workflow run `34325790531` passed both local migration validation and the hosted development Supabase migration, including the out-of-order reconciliation required by the existing CIM rows.
