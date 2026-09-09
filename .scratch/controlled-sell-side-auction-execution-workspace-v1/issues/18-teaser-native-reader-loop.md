# 18 — Produce an editable Teaser and exact Reader Copy

**What to build:** Generate the stage-required Teaser from an approved disclosure set through governed content drafting, editable PPTX production, exact PDF Reader Copy, citations, machine lineage, signed manifest, semantic/visual QC, Review, and Revision readiness. Stage applicability, audience, purpose, and confidentiality control the output.

**Blocked by:** 10 — Convert Evidence proposals into controlled Facts and Decisions; 12 — Generate the Analysis and Valuation Workbook as a circulation candidate.

**Status:** resolved

Development review addendum (2026-09-09): the development artifact signer is now compose-managed and the Teaser Impress profile is accepted under the authorized `development_foss_v1` boundary. Revision `4aa4f954-e628-455c-bc9a-ac786ae56791` completed with `signed_manifest=passed`; the exact manifest and member hashes are recorded in `docs/implementation/ticket-18-evidence.md`. The authenticated development UI review is captured at `output/playwright/ticket18-authenticated-final.png`.

- [x] `teaser_content_draft` accepts only the exact Teaser section contract, purpose, audience, approved disclosure set, Evidence, Facts/Assumptions, and Output Ceiling and produces a strict proposal-only payload.
- [x] PPTX retains editable native text, tables, charts, masters, layouts, themes, placeholders, notes, footers, page numbers, source zones, and confidentiality zones where supported rather than flattened substitutes.
- [x] Every material Claim/value/table/chart resolves to point-of-use citation and machine lineage through exact controlling sources, Facts/Assumptions, Calculations, and Revision.
- [x] The Reader Copy is rendered from the exact Native Revision and binds renderer, version, time, slide selection, fonts/substitutions, audience, purpose, confidentiality, and hash.
- [x] Semantic and native/reader QC attach exact location, severity, Evidence, impact, owner, disposition, and intended-use consequence; material mismatch blocks circulation.
- [x] When not stage-required, Teaser is explicitly `not stage-required` and creates no false completeness or missing-artifact blocker.
- [x] Supported open/edit/save/reopen/render and seeded citation/parity/confidentiality defects satisfy applicable AC-045 and AC-051 through AC-059.
