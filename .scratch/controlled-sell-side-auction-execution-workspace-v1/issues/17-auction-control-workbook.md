# 17 — Generate the Auction Control Workbook from governed process state

**What to build:** Produce the always-required Auction Control Workbook as an editable XLSX Native Artifact and exact PDF Reader Copy from governed Buyer, outreach, NDA/access, diligence, Bid, issue, Milestone, Decision, Process Event, and history objects. The workbook is a banker-native representation of authoritative process state, not a parallel mutable process database.

**Blocked by:** 11 — Produce replayable financial Analysis from controlled inputs; 12 — Generate the Analysis and Valuation Workbook as a circulation candidate; 16 — Build an evidence-backed Buyer universe and approve Buyers.

**Status:** resolved

- [x] Stable Buyer, process, NDA/access, diligence, request, Bid, issue, Milestone, Decision, and history identities map bidirectionally between authoritative objects and exact workbook cells/ranges.
- [x] Planned, proposed, approved, occurred, and current states remain distinct in source objects, workbook views, imports, and process projections.
- [x] The first visible tab gives an executive control view without presenting a misleading global ready/OK state or becoming the only source of process truth.
- [x] Native XLSX and Reader PDF share exact Revision, manifest, render, citations, confidentiality, lineage, Review, QC, and readiness identity.
- [x] Declared Office paths complete open, inspect, edit, save, reopen, and reimport tasks while preserving formulas, comments, native structures, stable IDs, and protected Banker content.
- [x] Wrong Buyer/Bid identity, stale process projection, hidden row, broken formula, native/reader mismatch, and protected-edit-loss fixtures block circulation.
- [x] The end-to-end workbook path satisfies AC-045, AC-047, and AC-051 through AC-059.

## Implementation evidence

- Migration `20260909130000_auction_control_workbook.sql` adds the governed Auction Control deliverable/template, point-in-time process snapshot, stable process-to-cell lineage, scoped create/revision commands and auction worker job.
- `apps/api/src/workbook-runtime.ts` and `services/office/` add the deterministic Auction Control Native XLSX + Reader PDF pair and independent structural/parity inspection. Critical identity and protected-content checks are recorded as QC checks; circulation remains blocked until readiness evidence exists.
- API routes expose Deal-scoped Auction Control workbook creation, revision, process lineage and artifact listing. The UI follows the confirmed Deal Control utility language with Executive Control as the first tab, explicit Not applicable states and no scalar Ready/OK shortcut.
- Local verification: contracts check, migration ordering, TypeScript, web build, Python compile, render/inspect fixture, and contract tests passed. Remote development release and public probes are recorded in `docs/implementation/ticket-17-evidence.md`.
