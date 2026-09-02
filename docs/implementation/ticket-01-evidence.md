# Ticket 01 implementation evidence

Status: `ready-for-human` (implementation complete at the local/test, development-server, and public DNS/HTTPS boundary; live mailbox/Passkey ceremony and production-provider verification remain open)

## Scope

This slice is limited to the V1 Reference Deal acceptance seam. It adds a separate Next.js Web runtime, a separate Fastify `/api/v1` control-plane runtime, a PostgreSQL migration/seed path, generated OpenAPI contract checks, the Supabase Auth/Passkey adapter seam, a local-only deterministic auth adapter, privacy-minimized Audit, and Account/Deal isolation checks. No Ticket 02 or later files were modified.

## Topology

```text
browser → Next.js Web (127.0.0.1:3000) → same-origin rewrite → Fastify API (127.0.0.1:3001)
                                                        ↓
                                      PostgreSQL app_runtime (NOBYPASSRLS)
                                                        ↓
                       app schema tenant tables with FORCE ROW LEVEL SECURITY
```

The development deployment is publicly reachable at `https://dev-banking.aptoren.com` through Nginx TLS termination. The production domain and production Supabase branch are intentionally outside this Ticket 01 change.

Within each runtime, PostgreSQL is the authoritative source for Account, Actor, Deal, Deal Workspace, session posture, and Audit rows (Docker PostgreSQL for isolated tests; Supabase dev PostgreSQL on the development server). The Web has no database credential and does not use localStorage or prototype state as authority.

## Verification commands

- TDD red phase: before the API/contract implementation existed, `npx tsx --test tests/reference-deal.contract.test.ts tests/contract-generation.test.ts` failed on the missing application/contract seam; the same tests now pass in the green `npm test` run below.
- `npm run db:up`
- `npm test` — 10 tests passed: generated contract, HTTP black-box success/negative paths, Supabase callback bearer, Magic Link + mandatory Passkey local fake, cross-Account/Deal isolation, manipulated identity denial, Supabase identity/passkey assurance, and runtime role/RLS/privilege checks.
- `npm run test:browser` — browser black-box passed: Magic Link bootstrap, Passkey registration/authentication, Project Northstar page, cross-Account and absent Deal both returned 404 `application/problem+json`.
- `npm run contracts:check` — generated contract check passed.
- `npx tsc --noEmit` — passed.
- `npm run web:build` — Next.js production build passed.
- `npm audit --omit=dev --audit-level=high` — 0 vulnerabilities after the pinned PostCSS override.

## Development-server evidence (2026-08-27)

- Supabase `dev` branch `xuysyaxzcpntvvzsgkdy` received the Ticket 01 migration and Northstar seed through the connected Supabase integration. The hosted migration required omitting the local-only `ALTER ROLE` clause; `app_runtime` was created explicitly as `rolsuper=false`, `rolbypassrls=false`, `rolcanlogin=true` and granted only the app schema/function privileges.
- A direct TLS PostgreSQL probe from the server returned `current_user = app_runtime` and PostgreSQL 17.6. The runtime uses the Supabase certificate chain at `/opt/investmentbanking/shared/supabase-chain.pem`; the database URL does not downgrade verification to `no-verify`.
- The server runs Node 22.22.2, Nginx 1.30.0, and Certbot 5.5.0. `investmentbanking-api.service` listens on `127.0.0.1:3001`; `investmentbanking-web.service` listens on `127.0.0.1:3000`; Nginx has an explicit `dev-banking.aptoren.com` HTTP reverse-proxy configuration.
- Public Namecheap DNS now contains `A dev-banking → 152.53.90.227`; `dig +short dev-banking.aptoren.com A` resolves to `152.53.90.227`.
- Certbot issued `/etc/letsencrypt/live/dev-banking.aptoren.com/fullchain.pem` (Let's Encrypt, expiry 2026-11-25), deployed it to Nginx, and `certbot renew --dry-run` completed successfully. `nginx -t` passed and the API, Web, and Nginx systemd services are active.
- Public probes returned HTTP `301` to HTTPS, HTTPS Web `200` containing the Reference Deal workspace marker, and HTTPS API `401 application/problem+json` with `authentication_required`. TLS verification returned `Verify return code: 0 (ok)`. These prove public transport/process reachability only; they do not prove a real mailbox or WebAuthn ceremony.
- A public browser snapshot at `https://dev-banking.aptoren.com/account-access` rendered the Account Access Gateway with labeled Email, Send Magic Link, Register mandatory Passkey, and Sign in with Passkey controls. The browser run stopped before sending a real message or invoking a real authenticator.
- On 2026-08-27 the development Auth path was completed with the real provider: `POST /api/v1/session/bootstrap` returned `202 magic_link_sent`, Supabase Auth recorded `/otp` `200`, Gmail received the message from `no-reply@dev-banking.aptoren.com`, and the callback reached `account-access?bootstrap=verified`. Chrome saved the Passkey to the verified development Google Password Manager after Touch ID and then completed Passkey authentication.
- The first real bootstrap created an empty development Account because the synthetic seed Actor was not yet linked to the Supabase subject. The dev database was then reconciled narrowly: the verified Supabase subject was attached to the seeded Northstar Actor/Account, the empty bootstrap Actor/Account was removed after its session references were reassigned, and the current session was re-established. A follow-up browser read now renders `Northstar Banker Account`, `Project Northstar`, `active`, revision `northstar-overview-r1`, stage `Preparation`, and `rights_cleared_synthetic`. The dev verification query confirms one active Account for the Actor, `passkey_registered=true`, a passkey-backed Banker session, and a completed `deal_overview_read` Audit event.
- The connected Supabase project is `ACTIVE_HEALTHY`; both its `main` production project and `dev` branch are `ACTIVE_HEALTHY`/functions deployed. The Supabase security advisor returned no lints. A performance advisor INFO remains for Auth's absolute connection cap; it is recorded as an operational follow-up, not treated as a Ticket 01 functional pass.
- Connected Resend reports both `dev-banking.aptoren.com` and `banking.aptoren.com` as `verified` with sending enabled and open/click tracking disabled. No `hellox` sender domain is used by this product. Domain verification is provider evidence; it is not a delivered-mailbox or completed-Passkey proof.

## Acceptance mapping

| Ticket / Spec boundary | Evidence |
|---|---|
| Production-shaped Web/API/DB topology | `apps/web`, `apps/api`, `supabase/migrations/20260830000000_reference_deal.sql`, `supabase/migrations/20260830010000_supabase_identity.sql`, server systemd units, Nginx reverse proxy, `npm run web:build`, `npm test` |
| Magic Link → mandatory Passkey → seeded Project Northstar Overview | `tests/reference-deal.contract.test.ts`, `tests/http/reference-deal.http.test.ts`, `scripts/browser-blackbox.sh` |
| No alternate password/TOTP/SMS authority | Only Magic Link bootstrap and Passkey routes exist; API rejects Deal access with `passkey_required` until the DB session posture is Passkey-backed |
| NOBYPASSRLS + FORCE RLS + manipulated identity denial | `tests/unit/rls.contract.test.ts`; `app_runtime` is non-superuser/non-bypass, every introduced tenant-bearing table is forced-RLS, elevated functions have no PUBLIC EXECUTE, and V1 prevents one Actor from becoming active in a second Account |
| Privacy-minimized Audit and stable errors | `app.audit_event` stores codes, opaque IDs, reason, trace and hash-chain pointers only; Audit reads require an explicit Deal scope; `application/problem+json` `resource_not_found` is identical for cross-scope and absent resources |
| AC-030 / AC-065 | Account and Deal are validated by `app.begin_request`; tenant policies, including `audit_scope`, carry both Account and Deal; Audit reads are Deal-filtered; HTTP and browser negative paths assert indistinguishable 404s. An explicit same-Account multi-Deal Audit black-box and a second authenticated Banker matrix remain additional release evidence. |
| AC-071 | The synchronous Overview read and bootstrap path are local, deterministic, and observed well below the two-second target; a production percentile run is still required |
| AC-074 | Browser path uses labeled forms, headings, button text, alerts, and visible state; current script completes the real Web path, but a keyboard-only scripted run remains required. |
| ADR 0002 / 0003 / 0006 / 0023 / 0040 / 0041 | One control-plane API with a separate Web, current relational state plus append-only Audit, Account/Deal scope in both app and DB, independent Web/API processes, forced RLS runtime role, and Supabase Auth/Passkey seam |

## Production versus local/test boundary

The `SupabaseAuthAdapter` uses the pinned `@supabase/supabase-js` client with explicit experimental Passkey opt-in and the documented `signInWithOtp`, `registerPasskey`, and `signInWithPasskey` seams. It is selected with `AUTH_ADAPTER=supabase` and requires `SUPABASE_URL`/`SUPABASE_ANON_KEY`; the callback accepts the browser's Supabase access token, verifies it with `auth.getUser`/`auth.getClaims`, maps the external subject to one Actor/Account, and creates the pending product session. Passkey registration and authentication are then bound to the same external subject, with ordinary access requiring a verified `passkey`/`webauthn` `amr`. Production refuses the local adapter.

The local `LocalAuthAdapter` is deterministic and is allowed only outside `APP_ENV=production`. Its one-time verification token is returned only in the local response for black-box testing. It is not production authentication evidence. The seeded Northstar fixture is synthetic and rights-cleared; it cannot establish real-data capability.

## Live-verification debt

- The Supabase `dev` branch URL/key, Auth URL, Custom SMTP, and Passkey/RP settings are configured according to the supplied provider evidence, and Resend reports both product domains verified for sending. The development verifier `wxm0229@gmail.com` completed real mailbox delivery, Supabase callback, Passkey registration, Passkey authentication, and the seeded Northstar Overview read. The synthetic `.test` seed identity remains a test fixture and is not a deliverable mailbox.
- Public DNS and HTTPS are now verified: Namecheap visibly persists `A dev-banking → 152.53.90.227`, public DNS resolves, HTTP redirects to HTTPS, the certificate validates, and Certbot renewal simulation succeeds. This closes the development-domain transport boundary; it does not close live authentication or production-provider evidence.
- The development server uses the Supabase dev PostgreSQL branch as authority. The local Docker PostgreSQL path remains test-only and is not production restore, PITR, Storage, or provider evidence.
- The repository browser black-box script still uses the deterministic local adapter; it proves Web/API/database behavior only and must not be reported as production authentication completion. The separate Chrome run above is the development provider evidence. Production provider, production DNS, and production WebAuthn verification remain intentionally out of scope for this run.
