Status: `resolved for the authorized development environment` — local implementation and browser proof are complete, the Ticket 06 release is deployed to the authorized development VPS/Supabase branch, and no production-complete claim is made.

## Scope

This slice implements Ticket 06 only: Deal-bound resumable source intake, safety quarantine, immutable Source Records, envelope-encrypted protected objects, short-lived Object Grants, a typed gateway, Sources/Add Source Web routes, OpenAPI additions, and forced-RLS/function-owner checks. Later source packets, AI, rendering, Bids, and Process Events remain out of scope.

## Implementation surface

- `supabase/migrations/20260830050000_protected_source_intake.sql` adds forced-RLS Source, protected-object, grant, receipt, coverage, and intake-job tables plus closed `app_source_owner` definer procedures. Upload sessions require the exact current Deal Operation Preview, consent digest, declared limits (50 files/2 GiB batch with a 100 MiB local inspection bound), source declaration, and quarantine key. Cancellation uses an Upload Session ETag and either exact unfinished file IDs or the whole remaining session.
- `apps/api/src/sources.ts` adds resumable TUS-like `HEAD`/`PATCH` transfer, finalization, cancellation, source-material/record projections, immutable acceptance with idempotent replay, AES-256-GCM envelope encryption, safety rejection, grant issuance, and gateway streaming with range receipts.
- `apps/web/app/app/deals/[deal_id]/sources/page.tsx` and `sources/add/page.tsx` provide customer-facing Sources and Add Source flows with visible Ready/Uploading/Quarantined/Accepted/Rejected postures. Setup links to both routes.
- `contracts/openapi.json` and generated `packages/contracts/generated/openapi.ts` declare the Ticket 06 upload, Source, grant, and gateway seams.
- `tests/http/protected-source.http.test.ts`, `tests/unit/ticket06-rls.contract.test.ts`, and `tests/contract-generation.test.ts` cover transfer scope, non-secret TUS headers, safety outcomes, encryption/decryption, immutable history, idempotency, cross-account denial, forced RLS, definer ownership, and contract presence.

## Verification

- TDD red phase: focused Ticket 06 tests initially failed because the upload/Source routes and migration were absent; they now pass against a temporary local PostgreSQL instance on `127.0.0.1:55432`.
- `npm test` — 45 tests passed, 0 failed, including the fail-closed `receipt_permitted=false` case and finalization replay guard that prevents an accepted upload from reopening.
- `npm run contracts:check` — passed; `npm exec tsc -- --noEmit` — passed; `npm run web:build` — passed.
- Real browser on isolated local Web port `3010` with API `3001`: authenticated Magic Link + Passkey, Sources list, Add Source page, preflight gate, actual native OOXML fixture upload (`/tmp/ticket06-native-financial-fixture.xlsx`, SHA-256 `f1e1c54dfd221f13bdfff326406832c7f50be5a7cbfa7eb633168850b42faa65`), resumable transfer, quarantine, Source Record acceptance, and Sources list projection all verified. Visible accepted state named the Source Record and stated that original bytes were behind a short-lived Object Grant.
- Local protected object evidence: stored container begins with `IBPO1`; `strings` found no native financial plaintext markers; the latest isolated browser run reported 4 active protected objects, 4 accepted records, and 2 stream receipts. Range responses return `206`, `Content-Range`, `Accept-Ranges`, content ETag, and idempotent range receipts.
- The repository browser script could not use port 3000 because an unrelated SalesBrief process already listened there; the isolated 3010 run passed the Ticket 06 flow without touching that process.

## Authorized development deployment

- The release was packaged from implementation commit `41f0a3965ef6611b1493040d244286b0a3050867`, built on the VPS as `investmentbanking`, and installed at `/opt/investmentbanking/releases/20260901-ticket06-dev-v1`. `/opt/investmentbanking/current` resolves to that release.
- Supabase dev branch `xuysyaxzcpntvvzsgkdy` accepted migration `protected_source_intake_v1` (recorded version `20260901050612`). The migration exposes the 12 Ticket 06 source/object/grant/receipt tables with `rls_enabled=true`; the protected intake definer procedures are owned by non-login `app_source_owner` with `rolbypassrls=true`.
- `investmentbanking-api.service`, `investmentbanking-web.service`, and Nginx are active after the atomic symlink switch; `nginx -t` passes. Public probes return `200` for `https://dev-banking.aptoren.com/`, and expected unauthenticated `401 application/problem+json` responses for `/api/v1/session` and the upload-session POST boundary.
- Per the explicit authorization in this task, the previous `/opt/investmentbanking/releases/20260901-ticket05-dev-v2` release and the transferred archive were removed after the new `current` target and active services were verified. No Ticket 05 rollback artifact remains on the VPS.
- A remote authenticated browser acceptance run was not completed: the configured Supabase Magic Link flow requires access to the mailbox/OTP, which was not available in this session. The remote evidence above therefore proves deployment health and unauthenticated boundary behavior only; the authenticated acceptance evidence is the isolated local real-browser run documented above.

## Development/production boundary

The development VPS and Supabase dev branch are now independently verified as described above. This is development-environment evidence only; it does not prove production configuration, production provider credentials, live malware scanning, or a production rollback path. The previous Ticket 05 release was intentionally deleted under the user's explicit instruction, so rollback to that artifact is not available.

The local development fallback KEK and filesystem are explicitly rejected when `APP_ENV=production`; production still requires configured protected storage and `PROTECTED_OBJECT_KEK`/KMS integration.

## Review boundary and follow-up debt

The required two-axis review found the local seam bounded but not production-complete. The remaining contract work is explicit: browser-direct Supabase Access-Token/Storage-RLS TUS rather than the local Banker-cookie/filesystem adapter; host-owned sandbox plus ClamAV/structural inspection and durable worker/outbox execution; a separately deployed Protected Object Gateway with KMS-only decryption, bounded streaming, and current entitlement/security-posture revalidation; complete POST idempotency/replay records (including one-time Grant responses); chained Audit Events for upload lifecycle, grants, and streams; scheduled quarantine cleanup; the full four-stage Add Source parse-review/Source-Packet interaction from the confirmed prototype; and DB-side enforcement of declared provenance/classification plus storage-key/object binding. The review also identified a 100 MiB local per-file bound versus the technical design's 250 MB ordinary-file target, and missing TUS/If-Range/ETag contract declarations. Supabase advisors additionally returned WARN-level mutable `search_path` findings for the two source/protected-object mutation trigger functions, plus pre-existing informational RLS/index findings. These remain follow-up debt and are not claimed as production controls. The review's accepted-upload reopening and false-receipt-permission findings were corrected and covered by the focused tests above.
