# 01 — Establish the Supabase-authenticated Reference Deal acceptance seam

**What to build:** Establish the smallest production-shaped vertical path in which an Individual Banker enters through Supabase Auth, completes the V1 Magic Link bootstrap and mandatory Passkey posture, and opens the seeded Project Northstar Deal Overview through the real Web, versioned API, authoritative PostgreSQL state, and forced-RLS permission boundary. This slice creates the shared black-box Reference Deal acceptance seam that later tickets extend; the confirmed prototype remains subordinate visual input and is not a production runtime or data source.

**Blocked by:** None — can start immediately.

**Status:** resolved

**Implementation record:** Claimed for the current `/implement` run on 2026-08-26. Scope is limited to the production-shaped Reference Deal acceptance seam: Web, `/api/v1`, PostgreSQL/RLS, Supabase Auth/Passkey seam, privacy-safe Audit, and HTTP/browser isolation evidence. Tickets 02 and later remain untouched.

- [x] A supported local production-shaped topology starts the Web, versioned API, authoritative database, and required contract-generation checks without using prototype mocks or localStorage as authority.
- [x] A new Individual Banker can complete the supported Supabase Magic Link bootstrap, register the mandatory Passkey, and then open a seeded Project Northstar Deal Overview whose Account, Deal, Workspace, current pointers, and displayed state come through the real API and database path.
- [x] Ordinary authenticated product use requires the current Passkey-backed session posture defined by ADR 0041; password, TOTP, SMS OTP, broad service-role credentials, and prototype-only authentication are not introduced as alternate V1 authority paths.
- [x] Every authoritative tenant-bearing table introduced by the slice uses non-owner `NOBYPASSRLS` runtime roles and `FORCE ROW LEVEL SECURITY`; application authorization and database policy both deny a second Account, second Deal, and manipulated object identity.
- [x] The initial read and any seeded command produce privacy-minimized Audit evidence and stable API/error contracts without leaking another tenant's existence.
- [x] Browser and HTTP black-box tests prove the successful Reference Deal path and the cross-Account/cross-Deal negative path independently of internal module implementation.
- [x] The slice records how it satisfies Spec AC-030, AC-065, AC-071, and AC-074 and the applicable ADR 0002, 0003, 0006, 0023, 0040, and 0041 boundaries.

## Comments

Implemented the Ticket 01 vertical seam and stopped at its evidence boundary. Local/test evidence includes 10 passing tests, generated contract checks, TypeScript, Next production build, and dependency audit. The development server is deployed server-natively (systemd Web/API, Nginx, no local Docker authority) and the Supabase `dev` branch contains the migration, seed fixture, forced-RLS tables, and `app_runtime` role. On 2026-08-27 the Namecheap `A dev-banking → 152.53.90.227` record was visibly persisted, public DNS resolved, Let's Encrypt issued the certificate, and HTTP→HTTPS plus TLS renewal probes passed. Connected Resend reports both product domains (`dev-banking.aptoren.com` and `banking.aptoren.com`) verified for sending with tracking disabled. The real development verifier `wxm0229@gmail.com` completed Magic Link delivery, Supabase callback, Passkey registration/authentication, Northstar identity reconciliation, and the seeded Project Northstar Overview read; the API/DB Audit evidence records the completed read. Production-provider/restore evidence remains intentionally deferred. Tickets 02 and later remain untouched.
Human confirmation received on 2026-08-27: Ticket 01 is accepted as complete for the agreed development-environment scope. Production configuration/verification and the explicitly deferred evidence items remain outside this acceptance; Tickets 02 and later remain untouched.
Tracker completion confirmed on 2026-08-27 after implementation commit `cf3fbba` was integrated into `main`. The seven acceptance items above are closed for the agreed development-environment scope; production-provider, production-restore, and other explicitly deferred release evidence remain outside this ticket.
