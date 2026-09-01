# 07 — Capture public Web Evidence and a scoped Account template safely

**What to build:** Add two governed non-Deal-file source routes to the same Sources workspace: immutable Public Web Observations with exact capture metadata, and quarantined Account templates with purpose-scoped reuse. Neither route may silently become customer Source Material, production truth, or a cross-customer template.

**Blocked by:** 05 — Create an exact Deal and complete Paid Preflight.

**Status:** resolved

- [x] Public retrieval records URL, document identity, permitted representation or digest, access/as-of time, version, exact locator, rights posture, and retrieval limitations.
- [x] Refreshing mutable public material creates a new immutable observation and never rewrites an earlier observation or silently changes downstream Evidence.
- [x] Publisher rights, source terms, robots posture, or retention limits reduce capture/reliance truthfully and prevent unsupported archival claims.
- [x] An Account template enters quarantine, safety and compatibility preflight, rights classification, purpose scope, and immutable version history before any Deal may use it.
- [x] Template reuse never imports live Deal material, does not cross Accounts, and cannot make an artifact production-ready without exact Deal mapping, validation, and Review.
- [x] Both routes appear as correctly typed Source records with safe empty/error/recovery states and complete Audit evidence.
- [x] Cross-scope, stale observation, changed rights, incompatible template, and hidden live-material fixtures satisfy AC-023, AC-029, AC-030 and ADR 0018, 0019, and 0033 within the authorized local development boundary.

## Answer

Ticket 07 is resolved for the authorized local development boundary. The implementation is committed in `64e79e9` plus the follow-up hardening commit recorded in the handoff, with no downstream ticket scope advanced.

- `0006-web-evidence-account-templates.sql` adds forced-RLS Web Observation, impact, Account preview/quarantine, reusable-template/version, compatibility, Deal-selection, and typed Protected Account Object tables. Web observations are FK-linked to typed Source Records; immutable triggers protect observations and template versions; definer functions are owned by non-login `app_source_owner` with direct runtime writes revoked.
- Public Web capture creates a new observation/version per retrieval, preserves the prior row, records identity/as-of/locator/rights/limitations, lowers to citation-only when rights or retention do not permit a snapshot, and stores encrypted snapshot bytes plus Source Representation/coverage when permitted.
- Account template intake is Account-only, rejects live Deal/Source IDs, binds uploads to a fresh preview consent digest and declared template class, enforces resumable offsets and bounded size, scans/quarantines before acceptance, encrypts accepted bytes, records immutable version history, and keeps Deal selection blocked until compatibility, exact mapping, validation, and Review facts are present.
- Sources UI and OpenAPI/generated contracts expose native Source Records, Web Observations, and Account templates with explicit empty/error/recovery and non-production-ready states.

Verification: `npm test` (48 passed), `npm run contracts:check`, `npm exec tsc -- --noEmit`, `npm run web:build`, and `git diff --check` passed against a clean temporary PostgreSQL instance. Playwright CLI reviewed the local Sources page in the unauthenticated safe state. Public HTTPS probes returned `200` for `/` and the expected `401 application/problem+json` for `/api/v1/session`.

The development VPS was not changed: SSH to `root@152.53.90.227` failed with `Permission denied (publickey,password)` because no authorized credential was available. Production-shaped Public Fetch Coordinator/sandbox, DNS-rebinding checks, Supabase TUS/Storage RLS, worker/Outbox quarantine, KMS-backed Protected Object Gateway, downstream async Job execution, authenticated remote browser acceptance, and rollback/restore remain explicit follow-up debt and are not claimed as proven here.

## Review

The required two-axis `/code-review` against fixed point `4e46de8` identified the production/deployment follow-up debt above and no unrelated scope changes. Standards findings covered the local adapter boundaries, async Job semantics, full-buffer scanner, and idempotency gaps; Spec findings covered the same production seams plus Sources action controls. The local hardening applied the highest-risk correctness items (snapshot object linkage, preview consent/class binding, Source Record FK, public response timeout/size bound, and parser ceiling) without expanding into downstream tickets.
