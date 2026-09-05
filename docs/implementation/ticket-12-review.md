# Ticket 12 review — 2026-09-05

Review scope: `faf72a8` → implementation checkpoint `877a753`, on `develop`.
The implement/code-review workflow ran two independent read-only reviews. The
following axes retain their original findings and priorities. Fixes were
verified through `f693bdf`; source-backed acceptance added `e33243a` afterward.

## Standards review

| Priority | Finding | Resolution and evidence |
| --- | --- | --- |
| P1 | Job Worker could read other same-Deal Packets/Revisions through broad projections, contrary to ADR 0025/0040. | Migration `20260905045000`: exact lease-bound Revision/Packet helpers, narrower RLS and dedicated input projection. A real PostgreSQL/HTTP regression first read one unrelated source, then read zero; unrelated Revision rejected. Worker remains NOBYPASSRLS. |
| P2 | Killing the Podman client could leave its renderer container alive. | Server-side `--timeout=175`, unique per-render name and unconditional exact-name removal. A real rootless container sleeping 30 seconds exceeded a 2-second client deadline; finally cleanup completed in 12.228 seconds and `podman container exists` returned 1. Test ran inside a delegated systemd user service. |
| P2 | Unused TypeScript readiness implementation duplicated the SQL authority. | Removed the dead evaluator and mirror test. HTTP tests now assert the actual SQL readiness projection and its independent missing/failed prerequisites. |

## Spec review

| Priority | Finding | Resolution and evidence |
| --- | --- | --- |
| P1 | The generic word “evaluation” falsely rejected legitimate business content. | Detection now recognizes actual Aspose evaluation marks. A PDF containing “Evaluation time” passed the content check while genuine vendor warning output still failed. No watermark is removed. |
| P1 | A previously successful result retained input authority after a controlling Decision expired, was reversed or superseded. | Migration `20260905045100` reconstructs and revalidates the exact basis during readiness assessment. Superseding a Decision changes `controlled_inputs` to failed and keeps readiness blocked. |
| P1 | A set of numbers and any drawing could incorrectly accept swapped Cash/Debt or the wrong chart. | Positional scenario/column checks, exact native chart series and category formulas, and PDF plot/bar/axis checks. Negative observers reject swapped values, wrong native series, a missing bar and reversed pages. Three-scenario positive/zero/negative outputs pass with declared decimal rounding. |

## Final targeted acceptance corrections

The final hosted source-backed trace exposed two additional bounded defects:
normalization rejected decimal literals, and workbook source lookup compared a
Source Record to the Upload-only `accepted` status instead of `current`.
Migrations `20260905051500` and `20260905052300` correct those seams. HTTP
regressions first reproduced 503/409, then passed with an accepted Cash Fact,
exact source row, normalization, pinned model/scenario and generation request.
The complete server suite passed again: 79/79, no skips, 21.355 seconds.

No later-ticket work or recursive repository-wide review was undertaken.
Licensed clean output, real KMS signing and supported Office round-trip proof
remain acceptance dependencies, documented in the Ticket 12 evidence report.
