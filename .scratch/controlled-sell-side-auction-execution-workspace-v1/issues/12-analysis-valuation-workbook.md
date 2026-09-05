# 12 — Generate the Analysis and Valuation Workbook as a circulation candidate

**What to build:** Produce the always-required Analysis and Valuation Workbook as an editable XLSX Native Artifact with an exact PDF Reader Copy, immutable Revision, signed canonical manifest, bidirectional source-to-cell lineage, recalculation evidence, scoped Review/QC, and blocker-first readiness. This is the first complete Office/artifact tracer bullet, not an engine-only ticket.

**Blocked by:** 04 — Run one Banker-visible Reference Deal operation as a durable Job; 11 — Produce replayable financial Analysis from controlled inputs.

**Status:** needs-info

- [x] The workbook preserves native formulas, defined names, input/Assumption separation, periods, units, currency, signs, actual/forecast posture, scenarios, charts, calculation mode, and exact source-to-cell/range lineage.
- [x] `workbook_commentary_draft`, `deliverable_semantic_qc`, and `native_reader_semantic_parity_review` run through governed proposal-only contracts and cannot create authoritative readiness.
- [x] The exact delivered workbook recalculates in the declared engine; stored calculation state matches rendered and downstream values.
- [ ] Native XLSX and Reader PDF share one exact Revision identity and pass material order, text, number, chart, table, citation, font, legend, confidentiality, and qualification comparisons.
- [ ] The signed manifest binds exact native/reader bytes, hashes, source/model dependencies, template/renderer/engine versions, lineage, QC, purpose, audience, and limitations without claiming correctness or approval.
- [ ] Declared supported Office paths complete open, inspect, edit, save, reopen, and reimport smoke tasks without corruption, flattening, formula loss, or protected Banker-content loss.
- [x] Material formula failure, corrupt/flattened artifact, wrong locator, or native/reader mismatch creates a Critical Finding and blocks circulation; a passing check clears only its exact blocker.
- [ ] Black-box artifact observers and independent file checks satisfy AC-051 through AC-059.

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
