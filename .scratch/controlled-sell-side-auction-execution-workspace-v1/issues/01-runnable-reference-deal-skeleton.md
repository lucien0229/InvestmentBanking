# 01 — Establish the Supabase-authenticated Reference Deal acceptance seam

**What to build:** Establish the smallest production-shaped vertical path in which an Individual Banker enters through Supabase Auth, completes the V1 Magic Link bootstrap and mandatory Passkey posture, and opens the seeded Project Northstar Deal Overview through the real Web, versioned API, authoritative PostgreSQL state, and forced-RLS permission boundary. This slice creates the shared black-box Reference Deal acceptance seam that later tickets extend; the confirmed prototype remains subordinate visual input and is not a production runtime or data source.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A supported local production-shaped topology starts the Web, versioned API, authoritative database, and required contract-generation checks without using prototype mocks or localStorage as authority.
- [ ] A new Individual Banker can complete the supported Supabase Magic Link bootstrap, register the mandatory Passkey, and then open a seeded Project Northstar Deal Overview whose Account, Deal, Workspace, current pointers, and displayed state come through the real API and database path.
- [ ] Ordinary authenticated product use requires the current Passkey-backed session posture defined by ADR 0041; password, TOTP, SMS OTP, broad service-role credentials, and prototype-only authentication are not introduced as alternate V1 authority paths.
- [ ] Every authoritative tenant-bearing table introduced by the slice uses non-owner `NOBYPASSRLS` runtime roles and `FORCE ROW LEVEL SECURITY`; application authorization and database policy both deny a second Account, second Deal, and manipulated object identity.
- [ ] The initial read and any seeded command produce privacy-minimized Audit evidence and stable API/error contracts without leaking another tenant's existence.
- [ ] Browser and HTTP black-box tests prove the successful Reference Deal path and the cross-Account/cross-Deal negative path independently of internal module implementation.
- [ ] The slice records how it satisfies Spec AC-030, AC-065, AC-071, and AC-074 and the applicable ADR 0002, 0003, 0006, 0023, 0040, and 0041 boundaries.
