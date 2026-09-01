Status: `claimed` — local implementation and browser proof complete; development VPS verification is blocked by unavailable SSH credentials.

## Scope

This slice implements Ticket 06 only: Deal-bound resumable source intake, safety quarantine, immutable Source Records, envelope-encrypted protected objects, short-lived Object Grants, a typed gateway, Sources/Add Source Web routes, OpenAPI additions, and forced-RLS/function-owner checks. Later source packets, AI, rendering, Bids, and Process Events remain out of scope.

## Implementation surface

- `db/migrations/0005_protected_source_intake.sql` adds forced-RLS Source, protected-object, grant, receipt, coverage, and intake-job tables plus closed `app_source_owner` definer procedures. Upload sessions require the exact current Deal Operation Preview, consent digest, declared limits (50 files/2 GiB batch with a 100 MiB local inspection bound), source declaration, and quarantine key. Cancellation uses an Upload Session ETag and either exact unfinished file IDs or the whole remaining session.
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

## Development/production boundary

Development VPS verification is not complete. `ssh -o BatchMode=yes root@152.53.90.227` and both existing local keys (`~/.ssh/id_ed25519`, `~/.ssh/id_rsa`) returned `Permission denied (publickey,password)`; ssh-agent has no identities. No release upload, remote migration, Supabase dev SQL, systemd restart, or public HTTPS claim was made. The Ticket remains `claimed` until an authorized credential is supplied and the dev host plus Supabase `InvestmentBanking (dev)` state are independently verified.

The local development fallback KEK and filesystem are explicitly rejected when `APP_ENV=production`; production still requires configured protected storage and `PROTECTED_OBJECT_KEK`/KMS integration.

## Review boundary and follow-up debt

The required two-axis review found the local seam bounded but not a production-shaped Supabase deployment proof. The remaining contract work is explicit: browser-direct Supabase Access-Token/Storage-RLS TUS rather than the local Banker-cookie/filesystem adapter; host-owned sandbox plus ClamAV/structural inspection and durable worker/outbox execution; a separately deployed Protected Object Gateway with KMS-only decryption, bounded streaming, and current entitlement/security-posture revalidation; complete POST idempotency/replay records (including one-time Grant responses); chained Audit Events for upload lifecycle, grants, and streams; scheduled quarantine cleanup; the full four-stage Add Source parse-review/Source-Packet interaction from the confirmed prototype; and DB-side enforcement of declared provenance/classification plus storage-key/object binding. The review also identified a 100 MiB local per-file bound versus the technical design's 250 MB ordinary-file target, and missing TUS/If-Range/ETag contract declarations. These are not claimed as verified by the local tests or browser run and remain outside the authorized development proof until the dev VPS/Supabase credentials and deployment seams are available. The review's accepted-upload reopening and false-receipt-permission findings were corrected and covered by the focused tests above.
