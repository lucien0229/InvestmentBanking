Status: `implemented for the authorized local development boundary` — Ticket 07 is covered by the local PostgreSQL/RLS and browser-visible Sources seams. The authorized development VPS remains on Ticket 06 because this session has no SSH credential; no deployment or production-complete claim is made.

## Scope

Ticket 07 only: immutable public Web Evidence Observations and Account-scoped reusable-template intake in the Sources workspace. No downstream Evidence, artifact, AI, rendering, export, or production rollout work was advanced.

## Implementation surface

- `db/migrations/0006-web-evidence-account-templates.sql` adds forced-RLS Web Observation, observation-impact, Account operation preview, Account quarantine upload/session, reusable-template/version, compatibility, Deal selection, and typed Protected Account Object tables. Definer procedures enforce public HTTPS observation creation, immutable versioning, rights-lowered capture posture, Account-only quarantine, safety completion, compatibility preflight, exact preview consent/template declaration binding, exact Deal mapping/validation/review, and non-enumerating scope. Web observations are FK-linked to their typed Source Record; snapshot mode creates the corresponding protected object, representation, and processing-coverage rows.
- `apps/api/src/ticket07.ts` adds the Account preview/upload/finalization/template/preflight/version routes, Deal template selection, public Web retrieval/list/get routes, bounded public-URL validation, digest and exact locator metadata, local quarantine scanning, and envelope encryption for Account template bytes. Default Web retrieval has a 10-second timeout, redirect rejection, and a 10 MiB response ceiling; deterministic tests inject a fetcher. `apps/api/src/app.ts` registers the routes and raises the parser ceiling to the Ticket 07 100 MiB file bound for resumable chunks.
- `apps/web/app/app/deals/[deal_id]/sources/page.tsx` keeps native Source Records, Web Observations, and Account Reusable Templates in one Sources workspace and renders explicit empty, error/recovery, quarantine, reliance, compatibility, and audit-posture states.
- `contracts/openapi.json` and `packages/contracts/generated/openapi.ts` declare the new routes and schemas.
- `tests/http/web-evidence-account-template.http.test.ts` and `tests/unit/ticket07-rls.contract.test.ts` cover immutable refresh, rights-lowered citation-only capture, SSRF/private-URL rejection, Account quarantine/finalization, protected Account-object creation, preflight gating, cross-Account hiding, live-Deal-material rejection, forced RLS, and non-login definer ownership.

## Verification

- `npm test` — 48 tests passed, 0 failed on a clean temporary PostgreSQL instance at `127.0.0.1:55432`; this includes all prior Ticket 01–06 suites and the Ticket 07 focused HTTP/RLS tests.
- `npm run contracts:check` — passed.
- `npm exec tsc -- --noEmit` — passed.
- `npm run web:build` — passed.
- `git diff --check` — passed.
- Real browser review used the Playwright CLI against the isolated local Web server. The Sources page visibly rendered Source Records, Public Web Observations, Account Reusable Templates, empty states, and a safe `Authenticate to continue` recovery state. The local HTTP path cannot send the production-style secure Banker cookie, so this browser pass does not claim authenticated production UI evidence.
- Public development probes remain healthy: `https://dev-banking.aptoren.com/` returned `200`, and `/api/v1/session` returned the expected unauthenticated `401 application/problem+json`. The VPS still resolves to the Ticket 06 release because SSH access was unavailable (`Permission denied (publickey,password)`); Ticket 07 was not deployed remotely.

## Development/production boundary and follow-up debt

This is local development evidence only. The public fetcher is bounded to unauthenticated HTTPS, redirect rejection, timeout, response size, and loopback/private host forms, but live DNS-rebinding/robots retrieval and a separately deployed fetch sandbox were not verified. Local Account-object envelope encryption is present; a production KMS/Protected Object Gateway, browser-direct Supabase TUS/Storage RLS, worker/outbox execution, scheduled quarantine cleanup, authenticated remote browser acceptance, and rollback/restore remain unverified. The local fallback storage/KEK is rejected when `APP_ENV=production`.

## Review boundary

The two-axis `/code-review` was run against implementation commit `64e79e9` from fixed point `4e46de8`. Any standards/spec findings remain bounded to this Ticket and are recorded with the final handoff; no unrelated cleanup or downstream ticket work was performed.
