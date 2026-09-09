# 15 — Reimport Banker edits through a protected three-way comparison

**What to build:** Let the Banker export an exact controlled Native Artifact, edit it externally, and reimport it against both the exported baseline and the current controlled Revision. Classify Banker edits, generated changes, source/formula changes, style/layout changes, comments/review changes, unsupported features, and conflicts, then require an explicit resolution before creating a new Revision.

**Blocked by:** 12 — Generate the Analysis and Valuation Workbook as a circulation candidate; 14 — Turn a material source change into Impact and a new Revision.

**Status:** resolved

- [x] Only product-exported files with verified controlled metadata and exact prior Revision identity enter automatic three-way comparison.
- [x] Generated-owned, Banker-owned, protected-formula, shared-merge, and unmanaged regions retain stable identity through the declared supported edit/save/reopen path.
- [x] A region changed by both Banker and generator creates a Merge Conflict; resolution requires an exact Human Decision to keep Banker, take generated, or accept a manually reconciled import.
- [x] Metadata loss, unverified baseline, unsupported structures, ambiguous region identity, or incompatible edits disable automatic merge and disclose the limitation before acceptance.
- [x] Last-write-wins is prohibited; accepted edits form a new immutable Revision with import/author provenance, lineage, Impact, regenerated Reader Copy, QC, and readiness.
- [x] Formula, comment, note, native object, protected Banker content, unsupported feature, and silent-normalization mutation fixtures cannot pass unnoticed.
- [x] Authorized development Office alternative demonstrates the supported save/reopen and three-way round-trip contract with the pinned LibreOffice observer; Microsoft 365/Windows remains separate production compatibility evidence.
