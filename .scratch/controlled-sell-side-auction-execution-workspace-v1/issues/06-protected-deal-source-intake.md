# 06 — Accept one protected Deal file as an immutable Source Record

**What to build:** Let the Banker add a supported native financial file through resumable upload, quarantine, safety inspection, protected-object encryption, exact Source receipt/version, classification, rights, coverage, locators, and Sources UI. This is the first real protected-byte path and must remain isolated from AI/rendering until accepted.

**Blocked by:** 05 — Create an exact Deal and complete Paid Preflight.

**Status:** claimed

- [ ] Upload transfer is resumable and scoped to the exact Account, Deal, session, purpose, limits, and quarantine-only authority.
- [ ] Unsafe archive paths, executable content, unsupported active content, malformed packages, and malware-policy failures are quarantined or rejected before substantive parsing, AI, or rendering.
- [ ] Macros and embedded code never execute, external links never refresh, protected files are not cracked, and every limitation is visible in preflight and downstream posture.
- [ ] Accepted bytes are envelope-encrypted, streamed only through the typed Protected Object Gateway or exact Job Scope, and never exposed through a reusable public URL.
- [ ] Every accepted Source Record preserves original bytes, content identity, provenance receipt, rights, confidentiality, version, dates, coverage, and a version-bound native locator profile.
- [ ] Later versions do not overwrite prior Source Records; identical bytes with distinct provenance or authority keep distinct receipt records.
- [ ] Wrong-Account, wrong-Deal, manipulated object ID/key, queue payload swap, and storage-key swap tests disclose nothing and satisfy AC-022 through AC-025, AC-030, and applicable AC-065 through AC-067 controls.

## Comments

2026-09-01: Local implementation, PostgreSQL/RLS suite, OpenAPI/TypeScript/Web build, and isolated real-browser upload of a native OOXML financial fixture are complete. Development VPS/Supabase verification is still pending: `root@152.53.90.227` rejected BatchMode authentication with both existing local keys, and no remote mutation was attempted. Evidence: [`docs/implementation/ticket-06-evidence.md`](../../../docs/implementation/ticket-06-evidence.md).

2026-09-01: Review follow-up tightened the local contract: Upload Sessions now require the current Operation Preview, advertise 50-file/2 GiB batch ceilings, expose Upload Session ETags for exact cancellation selection, preserve declared rights receipt posture, and record accurate idempotent range receipts. Supabase/Storage-RLS, sandboxed ClamAV worker execution, dedicated Gateway/KMS deployment, full POST idempotency, scheduled cleanup, and the prototype's four-stage parse-review/Packet interaction remain explicitly unverified follow-up debt.

2026-09-01: Finalization now fails closed when `receipt_permitted` is false and is idempotent for already accepted/rejected files, preventing an accepted upload from reopening or minting a duplicate Source Record. Focused and full local suites pass; the Ticket remains `claimed` because the authorized development VPS/Supabase proof is unavailable.
