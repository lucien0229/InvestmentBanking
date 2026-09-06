# 12 — Generate the Analysis and Valuation Workbook as a circulation candidate

**What to build:** Produce the always-required Analysis and Valuation Workbook as an editable XLSX Native Artifact with an exact PDF Reader Copy, immutable Revision, signed canonical manifest, bidirectional source-to-cell lineage, recalculation evidence, scoped Review/QC, and blocker-first readiness. This is the first complete Office/artifact tracer bullet, not an engine-only ticket.

**Blocked by:** 04 — Run one Banker-visible Reference Deal operation as a durable Job; 11 — Produce replayable financial Analysis from controlled inputs.

**Status:** resolved

Resolution scope: authorized synthetic `development_foss_v1` under ADR 0043;
production Windows Excel and cloud KMS requirements are not satisfied by it.

- [x] The workbook preserves native formulas, defined names, input/Assumption separation, periods, units, currency, signs, actual/forecast posture, scenarios, charts, calculation mode, and exact source-to-cell/range lineage.
- [x] `workbook_commentary_draft`, `deliverable_semantic_qc`, and `native_reader_semantic_parity_review` run through governed proposal-only contracts and cannot create authoritative readiness.
- [x] The exact delivered workbook recalculates in the declared engine; stored calculation state matches rendered and downstream values.
- [x] Native XLSX and Reader PDF share one exact Revision identity and pass material order, text, number, chart, table, citation, font, legend, confidentiality, and qualification comparisons.
- [x] The signed manifest binds exact native/reader bytes, hashes, source/model dependencies, template/renderer/engine versions, lineage, QC, purpose, audience, and limitations without claiming correctness or approval.
- [x] Declared supported Office paths complete open, inspect, edit, save, reopen, and reimport smoke tasks without corruption, flattening, formula loss, or protected Banker-content loss.
- [x] Material formula failure, corrupt/flattened artifact, wrong locator, or native/reader mismatch creates a Critical Finding and blocks circulation; a passing check clears only its exact blocker.
- [x] Black-box artifact observers and independent file checks satisfy AC-051 through AC-059.

## Comments

### 2026-09-05 implementation claim

Claimed on `develop` from `faf72a8` for the user-authorized development scope.
Implement and verify this ticket, then audit Tickets 01–11 against their
development acceptance criteria. Later tickets are not included. Verification
uses authenticated HTTP/browser boundaries and independent artifact/file
observers, including recalculation, lineage, signature, parity, and supported
Office round-trip checks. Review compares the completed change with `faf72a8`.

### 2026-09-05 development implementation and acceptance

Implemented on `develop` (`877a753`, `f693bdf`, `e33243a`) and deployed to the
existing Docker/Supabase development environment. Server full suite: 79/79;
independent artifact tests: 2/2. All three governed AI tasks passed real HelloX
calls. The real hosted source-backed Revision 03 preserves exact lineage and
recalculates to 94.7; browser Review/QC/cancellation and scope isolation were
exercised. Separate Standards/Spec findings were fixed and verified.

Status is `needs-info`, not `resolved`: actual output still fails clean-copy /
font parity because the Aspose license is absent; the independent Google KMS
artifact key/runtime identity is absent; supported Windows Office edit/save/
reopen/reimport proof cannot run in the available unactivated Mac environment.
User delegated validation authority has been used; these are external
configuration/runtime dependencies, not an outstanding approval request.

See [complete evidence](../../../docs/implementation/ticket-12-evidence.md),
[configuration and rerun steps](../../../docs/implementation/ticket-12-office-runbook.md),
[separate review axes](../../../docs/implementation/ticket-12-review.md), and
[requested Tickets 01–11 development audit](../../../docs/implementation/tickets-01-11-development-audit-2026-09-05.md).
No Ticket 13 or later scope was started or unblocked.


### 2026-09-05 authorized predecessor repairs completed

The subsequent user-authorized Tickets 01–11 audit repairs are development
verified on release `20260905-predecessor-repairs-v12` / app `46cb49a`.
Real Passkey, automatic Stripe test delivery, native Source-to-Analysis browser
loop, alternative intake, responsive/keyboard UI and durable logout are recorded
in [final predecessor acceptance](../../../docs/implementation/tickets-01-11-repair-acceptance-2026-09-05.md).
This closes the predecessor audit findings, not the three deferred exact Office/
signer/Windows acceptance requirements above. Ticket 12 remains `needs-info`.


### 2026-09-06 authorized alternative development acceptance

Reclaimed the remaining validation on `develop` from `2311e31` after the user
confirmed they have none of the three external configurations and explicitly
requested alternatives. ADR 0043 declares an exact synthetic Revision-only
LibreOffice / isolated development Ed25519 / actual Calc round-trip profile.
It does not claim Windows Excel or cloud KMS evidence. All other AC gates remain.
Final status changes only after hosted exact-artifact and UI validation.

### 2026-09-06 development resolution

Resolved on `develop` for ADR 0043's exact synthetic development profile after
real server, native/Reader, independent signer, Calc round-trip and desktop/
mobile UI acceptance. Revision 05 has all 12 readiness requirements passed,
seven independent QC checks passed, and external use remains unauthorized.
Final runtime: `20260906-ticket12-final-beab2e8`. Full fresh server suite:
86 passed, zero failed, three environment-gated skips; final Office tests 3/3.
Real commentary and Semantic QC succeeded. AI Parity returned a contract-valid
abstention for the unmapped Banker Notes region; delegated exact-file visual
review independently passed. Three minor Semantic QC proposals were reviewed
and retained as non-blocking synthetic-metadata/comment-wording limitations.
Temporary acceptance session was revoked; replay returned 401.

See [final alternative acceptance and exact artifacts](../../../docs/implementation/ticket-12-development-alternatives-2026-09-06.md).
No additional license, Google identity or Windows machine is required for this
profile. No later ticket was implemented. Original failures and production
requirements remain explicit and are not relabeled as successful evidence.
