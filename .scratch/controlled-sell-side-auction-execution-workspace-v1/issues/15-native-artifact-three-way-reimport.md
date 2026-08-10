# 15 — Reimport Banker edits through a protected three-way comparison

**What to build:** Let the Banker export an exact controlled Native Artifact, edit it externally, and reimport it against both the exported baseline and the current controlled Revision. Classify Banker edits, generated changes, source/formula changes, style/layout changes, comments/review changes, unsupported features, and conflicts, then require an explicit resolution before creating a new Revision.

**Blocked by:** 12 — Generate the Analysis and Valuation Workbook as a circulation candidate; 14 — Turn a material source change into Impact and a new Revision.

**Status:** ready-for-agent

- [ ] Only product-exported files with verified controlled metadata and exact prior Revision identity enter automatic three-way comparison.
- [ ] Generated-owned, Banker-owned, protected-formula, shared-merge, and unmanaged regions retain stable identity through the declared supported edit/save/reopen path.
- [ ] A region changed by both Banker and generator creates a Merge Conflict; resolution requires an exact Human Decision to keep Banker, take generated, or accept a manually reconciled import.
- [ ] Metadata loss, unverified baseline, unsupported structures, ambiguous region identity, or incompatible edits disable automatic merge and disclose the limitation before acceptance.
- [ ] Last-write-wins is prohibited; accepted edits form a new immutable Revision with import/author provenance, lineage, Impact, regenerated Reader Copy, QC, and readiness.
- [ ] Formula, comment, note, native object, protected Banker content, unsupported feature, and silent-normalization mutation fixtures cannot pass unnoticed.
- [ ] Independent Office/file observers demonstrate AC-052, AC-056, AC-064 and the confirmed three-way round-trip contract.
