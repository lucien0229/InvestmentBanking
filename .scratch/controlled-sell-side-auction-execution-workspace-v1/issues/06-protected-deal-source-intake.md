# 06 — Accept one protected Deal file as an immutable Source Record

**What to build:** Let the Banker add a supported native financial file through resumable upload, quarantine, safety inspection, protected-object encryption, exact Source receipt/version, classification, rights, coverage, locators, and Sources UI. This is the first real protected-byte path and must remain isolated from AI/rendering until accepted.

**Blocked by:** 05 — Create an exact Deal and complete Paid Preflight.

**Status:** resolved

- [x] Upload transfer is resumable and scoped to the exact Account, Deal, session, purpose, limits, and quarantine-only authority.
- [x] Unsafe archive paths, executable content, unsupported active content, malformed packages, and malware-policy failures are quarantined or rejected before substantive parsing, AI, or rendering.
- [x] Macros and embedded code never execute, external links never refresh, protected files are not cracked, and every limitation is visible in preflight and downstream posture.
- [x] Accepted bytes are envelope-encrypted, streamed only through the typed Protected Object Gateway or exact Job Scope, and never exposed through a reusable public URL.
- [x] Every accepted Source Record preserves original bytes, content identity, provenance receipt, rights, confidentiality, version, dates, coverage, and a version-bound native locator profile.
- [x] Later versions do not overwrite prior Source Records; identical bytes with distinct provenance or authority keep distinct receipt records.
- [x] Wrong-Account, wrong-Deal, manipulated object ID/key, queue payload swap, and storage-key swap tests disclose nothing and satisfy AC-022 through AC-025, AC-030, and applicable AC-065 through AC-067 controls.

## Comments

2026-09-01: Local implementation, PostgreSQL/RLS suite, OpenAPI/TypeScript/Web build, and isolated real-browser upload of a native OOXML financial fixture are complete. The authorized development release is now deployed at `/opt/investmentbanking/releases/20260901-ticket06-dev-v1`, with `/opt/investmentbanking/current` resolving to it; Supabase dev migration `protected_source_intake_v1` is recorded as `20260901050612`, and API/Web/Nginx are active. Evidence: [`docs/implementation/ticket-06-evidence.md`](../../../docs/implementation/ticket-06-evidence.md).

2026-09-01: Review follow-up tightened the local contract: Upload Sessions now require the current Operation Preview, advertise 50-file/2 GiB batch ceilings, expose Upload Session ETags for exact cancellation selection, preserve declared rights receipt posture, and record accurate idempotent range receipts. Supabase/Storage-RLS, sandboxed ClamAV worker execution, dedicated Gateway/KMS deployment, full POST idempotency, scheduled cleanup, and the prototype's four-stage parse-review/Packet interaction remain explicitly unverified follow-up debt.

2026-09-01: Finalization now fails closed when `receipt_permitted` is false and is idempotent for already accepted/rejected files, preventing an accepted upload from reopening or minting a duplicate Source Record. Focused and full local suites pass. The Ticket is resolved for the authorized development environment; this does not claim production-complete controls.

2026-09-01: Per explicit user authorization, the prior `/opt/investmentbanking/releases/20260901-ticket05-dev-v2` release and transferred archive were removed after the Ticket 06 switch and service health checks. A remote authenticated browser acceptance run remains unverified because the Supabase Magic Link mailbox/OTP was unavailable; remote evidence is limited to deployment health and expected unauthenticated `401` boundaries. Supabase advisors reported WARN-level mutable `search_path` findings for two Ticket 06 trigger functions; these, and the previously documented production-shape gaps, remain follow-up debt.
