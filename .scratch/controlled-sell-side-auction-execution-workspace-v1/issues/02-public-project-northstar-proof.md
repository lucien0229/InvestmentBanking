# 02 — Complete the resumable public Project Northstar proof

**What to build:** Deliver the unauthenticated C → A → B Project Northstar proof as a resumable synthetic controlled loop. A visitor observes exact source lineage, the Cash correction, EBITDA conflict disposition, deterministic recovery, affected artifact and Reader Copy, Package Readiness, Revision boundary, and the fact that prior external-use authorization does not carry to the returned Revision.

**Blocked by:** 01 — Establish the Supabase-authenticated Reference Deal acceptance seam.

**Status:** resolved

- [x] A new unauthenticated browser can complete the proof without email, card, Account authority, or access to any real upload or confidential-processing endpoint.
- [x] Proof completion is emitted only after the same resumable synthetic session observes source lineage, correction/conflict treatment, deterministic recovery, affected artifact/Reader Copy, readiness, and Revision/export boundaries.
- [x] The fixture preserves both $6.2 million and $4.7 million Cash values and changes the deterministic result by exactly $1.5 million with actor and reason evidence.
- [x] The fixture preserves both $18.4 million and $17.8 million EBITDA Claims and requires a scoped simulated disposition rather than overwrite or averaging.
- [x] Appending SR-006 creates Revision 0.4, preserves Revision 0.3, and does not inherit Revision 0.3 external-use authority.
- [x] Rights-cleared synthetic XLSX/PPTX/DOCX/PDF, control records, and archive manifest downloads resolve to the exact synthetic Revision and hashes shown.
- [x] An accessible recorded route exposes the same facts and continuation actions without claiming an interaction occurred when it did not.
- [x] Proof events remain explicitly synthetic and cannot count as paid activation, production provider evidence, or production security evidence, satisfying AC-001 through AC-008 and AC-074.

## Comments

### Implementation evidence — 2026-08-27

Implemented only Ticket 02. Detailed commands, results, acceptance mapping, synthetic-versus-production boundary, and Git/worktree evidence are in [docs/implementation/ticket-02-evidence.md](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/implementation/ticket-02-evidence.md).

The short-lived in-memory session and fixture-grade native containers are intentionally development synthetic evidence. They are not production persistence, Office/PDF fidelity, provider, security, payment, Recipient, or paid-activation evidence. Production control-plane reuse, durable persistence, live providers, and production deployment/security evidence remain release evidence debt.

## Answer

Ticket 02 was verified on the development server at [https://dev-banking.aptoren.com/project-northstar](https://dev-banking.aptoren.com/project-northstar) and resolved for the stated synthetic proof scope. The deployed release `/opt/investmentbanking/releases/20260827-ticket02-dev` is live behind the existing HTTPS route; both API and web services are active and the previous Ticket 01 release remains available for rollback.

The live browser run completed all nine checkpoints in one cookie-bound resumable session, including the exact Revision 0.4 XLSX/PDF/archive inspection receipts. A reload after checkpoint 1 resumed at checkpoint 2. A separate keyboard run activated Start, every enabled proof action, and the exact-download links with keyboard events and reached the same completed state. The accessible recorded route exposes matching facts and continuation links and explicitly reports that it emitted no interactive completion.

Development-server HTTP checks returned `404` for real upload and confidential-processing candidates, and `403 origin_rejected` for a foreign-Origin session start. The six exact Revision 0.4 synthetic downloads matched their rendered SHA-256 values and valid container types. Cash `6.2` → `4.7` with exact delta `1.5`, both EBITDA Claims `18.4` and `17.8`, SR-006, Revision 0.3 preservation, and Revision 0.4 `not_authorized`/`carry_forward: false` were observed. Completion remains explicitly synthetic and is not paid activation, production provider evidence, or production security evidence. Full evidence and AC mapping are in [docs/implementation/ticket-02-evidence.md](/Users/wxm/Desktop/workspace/InvestmentBanking/docs/implementation/ticket-02-evidence.md).

Follow-up hardening was verified on the same development release: missing and foreign Origins are rejected (`403`), artifact-inspection receipts reject a mismatched client SHA-256 (`422`), and valid receipts are required for completion. After SR-006, Package Readiness and circulation remain blocked until the affected-scope work is actually regenerated and re-reviewed; refresh preserves this posture. Unauthenticated Revision 0.4 deep links show the revision boundary without exposing download links before the session appends SR-006.
