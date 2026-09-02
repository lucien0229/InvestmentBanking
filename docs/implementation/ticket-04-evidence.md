# Ticket 04 implementation evidence

Status: `resolved` for the authorized development-environment acceptance (production-resilience evidence remains explicitly deferred)

## Scope

This change is limited to the V1 synthetic Project Northstar durable reference Job. It does not implement or alter Tickets 02, 03, or later tickets. The Banker can accept one `reference_workspace_build` command, receive a durable Job identity, read its authoritative state, and follow a finite SSE projection of the durable event history.

## Implementation surface

- `supabase/migrations/20260830030000_durable_reference_job.sql` adds the `jobs` and `commerce` schemas, durable Job/Step/Attempt/Lease/Scope/Event/Outbox tables, one usage reservation and ledger, exact runtime-principal procedures, forced RLS, and non-public function grants.
- `apps/api/src/jobs.ts` provides the local/test dispatcher and separately credentialed worker coordinator seam. The worker claims only `reference_worker` with `reference-worker-credential-v1`; the worker and dispatcher use different CA-authenticated pools and cannot query tenant tables directly.
- `apps/api/src/database.ts` adds the authenticated Banker Job context, resolving the Job's exact Account/Deal before any Job read or command.
- `apps/api/src/app.ts` adds versioned command, Job Detail, SSE, cancellation, and retry routes. Responses include `Location`, row-version ETags, accepted inputs, exact scope metadata, problem codes, and durable event cursors.
- `apps/web/app/app/deals/project-northstar/overview/page.tsx` starts the operation; `apps/web/app/app/deals/project-northstar/actions/jobs/[job_id]/page.tsx` renders authoritative state, checkpoint, heartbeat, scope, accepted inputs, result/problem, and bounded retry/cancel controls without a fabricated percentage.
- `contracts/openapi.json` and generated `packages/contracts/generated/openapi.ts` describe the Job/SSE/control contracts. `scripts/seed.ts` resets Job fixtures for isolated runs.

## Verification commands

- TDD red phase: the new reference-Job HTTP/security tests failed before the migration/runtime/API seam existed; the same tests pass in the green run below.
- `npm test` — 21 tests passed, 0 failed. This includes generated-contract checks, HTTP/API lifecycle checks plus owner-role failure-injection support, forced-RLS/privilege checks, and the pre-existing Ticket 01 acceptance tests. The owner-role and direct worker SQL probes are supporting integration evidence, not production black-box proof.
- `npm run test:browser` — passed after waiting for the dynamic Job route. The local browser flow bootstraps Magic Link + Passkey, reaches Project Northstar, starts a reference operation, opens the durable Job detail, renders Exact Job Scope and Accepted inputs, observes a terminal state, and confirms cross-scope/absent Deal reads return `404 application/problem+json`.
- `npm run contracts:check` — passed.
- `npx tsc --noEmit` — passed.
- `npm run web:build` — passed; the Next.js build includes the dynamic durable Job route.
- `npm audit --omit=dev --audit-level=high` — 0 vulnerabilities (from the dependency install used for this run).
- Recheck on 2026-08-31: `npm run contracts:check`, `npx tsc --noEmit`, and `npm run web:build` passed; the full `npm test` command stopped before tests because this worktree's local PostgreSQL endpoint `127.0.0.1:55432` was not running. The earlier 21-test green run remains recorded above; this local infrastructure failure is separate from the Supabase dev-branch evidence.
- Regression recheck on 2026-08-31: the new CA-loading regression test passed (`node --import tsx --test --test-name-pattern='dedicated worker' tests/unit/reference-job-security.test.ts`). The worker/dispatcher pools now load `DATABASE_SSL_CA_FILE`; the development pool URLs intentionally omit `sslmode=require` because the installed `pg` version treats that parameter as strict hostname verification and rejects the Supabase pooler chain.

## Failure-injection and acceptance mapping

| Boundary | Local/test evidence |
|---|---|
| AC-069; ADR 0025 commit/effect fence | Concurrent duplicate commands replay one Job, one reservation, and one outbox row. The commit procedure has idempotent result/allowance branches. Executed evidence covers the duplicate command path and one completed allowance/material result; repeated queue delivery, callback/webhook retry, and a duplicate-claim race remain unexecuted follow-up evidence. A changed payload under the same key returns `idempotency_key_reused`. |
| AC-070 | Deterministic `failureStage` injection at each material stage (`accepted_inputs`, `source_checkpoint`, `workspace_checkpoint`, `reference_result`) calls the retryable commit path, preserves accepted inputs, and completes only after an explicit retry. This is not an OS process-kill proof. An expired lease becomes `lease_lost` and is retryable. Cancellation releases unused allowance exactly once. |
| AC-071 visibility/state contract | The accepted command is `202` with a durable ID and immediate `queued` snapshot; the local async worker reaches `completed` within the test's five-second visibility bound. Job Detail and the bounded local SSE notification projection expose queued/running/checkpoint/heartbeat/problem/terminal state with durable sequence replay. Continuous live delivery, watchdog recovery, and production-shaped p95 command/visibility/heartbeat measurement are not claimed here. |
| ADR 0025 | Job Scope contains exact Account, Deal, purpose, input digest/version, workflow version, release, allowance posture, workspace posture version, Account security epoch, operation, expiry, and runtime principal. Worker/dispatcher roles are non-superuser, `NOBYPASSRLS`, have no direct tenant-table SELECT, and receive only the procedure seam. |
| ADR 0039 | A worker claim made under posture version 1 cannot commit after the workspace posture advances; the commit returns `workspace_posture_changed` and the durable Job enters `blocked`. |
| ADR 0040 | New tenant-bearing Job/commerce tables are `FORCE ROW LEVEL SECURITY`; policy and function tests cover Account/Deal isolation and no `PUBLIC` execute on elevated procedures. |

## Local/test versus production boundary

The deterministic coordinator is intentionally a local/test fake worker and dispatcher. It preserves the production seam—transactional Outbox, dispatcher procedure, separate worker/dispatcher credentials, Job Scope, runtime principal, lease, heartbeat, checkpoint, and commit fence—but it is not proof of a production queue, multi-process crash/restart, provider delivery, or production resilience. The development role URLs and `reference-worker-credential-v1` are rejected as a complete production configuration unless both `JOB_WORKER_DATABASE_URL` and `JOB_DISPATCHER_DATABASE_URL` are explicitly supplied; the API in-process coordinator remains a local/test arrangement. The browser script uses the local auth adapter and synthetic rights-cleared Northstar fixture.

## Live-verification debt

- Measure AC-071 command latency p95, durable visibility p95, and heartbeat freshness in the production-shaped release environment.
- Exercise a real queue/dispatcher and independent worker processes across duplicate delivery, retry, lease expiry, process kill, and restart; capture durable event and allowance evidence.
- Verify production database/provider configuration, restore behavior, operational alerting, and a real Banker mailbox/Passkey ceremony in the appropriate environment.

No production-complete or production-resilient claim is made by this local/test evidence.

## Review boundary

The required two-axis review used fixed point `73c72a5` against the uncommitted working-tree patch (no commit was created). Both reviewers found the local seam bounded but not a full production/spec pass. The remaining material gaps are continuous live SSE delivery/watchdog scheduling, a persisted dependency graph and exact dependency-resume command, real PGMQ/independent process delivery, complete authorization/entitlement/rights/output commit fences, operation-preview/consent and full idempotency response retention, and the remaining UUIDv7/OpenAPI metadata/audit details. These are intentionally recorded as follow-up debt rather than silently represented as complete acceptance.

## Development re-acceptance (2026-08-31 — supersedes the earlier blocked deployment note)

- Supabase project branch `dev` (`xuysyaxzcpntvvzsgkdy`) now records migrations `20260831085848 durable_reference_job_v1` and `20260831090300 durable_reference_job_v1_hosted_fix`. The hosted fix schema-qualifies `pgcrypto.digest` as `extensions.digest` and creates the least-privileged worker/dispatcher roles without a managed-Postgres-forbidden `ALTER ROLE`.
- Direct role probes through the Supabase us-east-1 pooler returned `job_worker` and `job_dispatcher` with `rolsuper=false`, `rolbypassrls=false`, `rolinherit=false`, and `rolcanlogin=true`. Direct `SELECT` on `jobs.job` was denied for both roles. Function grants were verified as: worker-only claim/heartbeat/commit, dispatcher-only recovery/dispatch, and no `PUBLIC` execute.
- A real dev-database acceptance run created Job `08c315d7-5c1c-4897-948b-106b6d06c2cb` for the seeded Northstar Deal, replayed the same idempotency command to the same Job, dispatched its outbox row, claimed/heartbeated/committed all four material stages as `job_worker`, and reached `completed`. The authoritative query showed four completed steps, four revoked scopes, one reservation in `committed`, one commit ledger entry, nine durable events, one published outbox row, and the accepted input digest/result resource bound to workspace `00000000-0000-0000-0000-000000000111`. A duplicate final commit returned `lease_invalid` with `accepted=false`.
- The one-time synthetic `app.auth_session` used for that database-only run was deleted by its exact token hash after verification; the completed Job record was retained as development evidence.
- The authorized development release is `/opt/investmentbanking/releases/20260831-ticket04-dev-v1`, and `/opt/investmentbanking/current` was switched atomically from the Ticket 03 release to it. Both `investmentbanking-api.service` and `investmentbanking-web.service` are active; the API logged `api listening on http://127.0.0.1:3001`, and the Next standalone server is ready on `127.0.0.1:3000`. The release contains a clean Next build, `server.cjs`, and 93 copied static files under the standalone runtime directory.
- Existing Supabase/Resend/Stripe values in `/opt/investmentbanking/shared/dev.env` were preserved. Ticket 04 added only `JOB_WORKER_DATABASE_URL` and `JOB_DISPATCHER_DATABASE_URL`, both owned by `investmentbanking:investmentbanking` with mode `600`; the pools load the existing `DATABASE_SSL_CA_FILE`. No Ticket 02/03 issue or source scope was changed.
- Public probes now show the unauthenticated boundary (`GET /api/v1/session` → `401 application/problem+json`), the protected start route (`POST /api/v1/deals/{deal_id}/reference-jobs` → `401` without a session), and the overview HTML (`200`). With a temporary passkey-verified synthetic session bound to the seeded Northstar Account, the real browser at `https://dev-banking.aptoren.com/app/deals/project-northstar/overview` displayed the Reference workspace operation; clicking **Start reference operation** produced Job `e1dcb8a5-ac66-4613-8fb3-b75aaf60e4e1`, navigated to Job Detail, and rendered `completed`, the exact Account/Deal/purpose/input/workflow/release/allowance/runtime-principal/expiry scope, accepted inputs, heartbeat, and the result workspace. Browser fetches for the other Account and an absent Deal returned `404`; the SSE fetch returned `200 text/event-stream` with `job_snapshot` and terminal `stream_closed`.
- The authoritative dev query for Job `e1dcb8a5-ac66-4613-8fb3-b75aaf60e4e1` showed `completed`, row version `3`, one Job, four steps, four revoked scopes, one reservation, one allowance commit, nine events, one outbox row, and one published outbox row. A separate API duplicate-command probe for Job `abe12e83-6a9f-4f09-87d3-6fc06c767cef` returned `202` with `Idempotent-Replayed: true`; the database showed one Job, one reservation, one commit, four scopes, nine events, and one published outbox row.
- Development control paths were exercised through the public API against the same authoritative database: queued Job `129dc12b-52ff-4f4b-94e0-273670570d55` was canceled with `201`, `row_version=2`, `allowance_posture=released`, and exactly one release ledger entry; a stale cancellation returned the expected `412 version_conflict`. Failure Job `49221fc3-7f43-4607-b6a6-59b8937b8909` was claimed by `job_worker`, committed as `worker_terminated`/`failed_retryable`, surfaced through Job Detail with unchanged accepted inputs, retried with `200`, and completed on the next bounded poll. Its terminal query showed one reservation, one allowance commit, four steps, five scopes, twelve events, and one outbox row.
- Direct dev pooler probes authenticated as `job_worker` and `job_dispatcher`; both returned PostgreSQL `42501` for direct `SELECT` against `jobs.job` and `app.deal`. Dispatcher publish and worker claim/heartbeat/commit were available only through their granted procedures. The previous `SELF_SIGNED_CERT_IN_CHAIN` startup/runtime failure is fixed by the explicit CA pool configuration and the normalized dev pool URLs.
- The one-time synthetic `app.auth_session` used for these browser/API checks was deleted by its exact token hash after the final run; it was a development-only fixture, not evidence of a real Magic Link delivery or Passkey ceremony. The completed Job records are retained as non-sensitive synthetic development evidence.

### Development resolution boundary

This ticket is resolved for the authorized development environment: the public Web/API, real Supabase dev branch, durable Job procedures, dedicated runtime credentials, browser Job Detail, SSE projection, idempotency, cancellation, retry, and bounded completion are all live and verified. The deterministic in-process coordinator remains a local/test implementation seam, even though it now connects through real least-privilege dev worker/dispatcher roles. Production acceptance is not implied: independent worker processes, real PGMQ delivery, OS process-kill/watchdog recovery, continuous live SSE, dependency-directed resume, and AC-071 p95 percentile measurements remain follow-up evidence for the production-shaped release suite.
