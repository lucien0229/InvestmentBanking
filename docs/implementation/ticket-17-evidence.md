# Ticket 17 — Auction Control Workbook evidence

## Resolution

Ticket 17 is implemented on `develop` as a governed process-state projection. The Auction Control Workbook has its own deliverable type and template version (`auction-control-1.0.0`), immutable revision identity, point-in-time build input, manifest/QC/readiness path, and process-to-cell lineage table. The source process objects remain authoritative.

The first visible Native tab is `Executive Control`; it presents Buyer, outreach, NDA/access, diligence, Bid, milestone, decision and history families independently. Later-ticket process families are explicitly `not_applicable` until their authority objects exist. No global Ready/OK score is shown, and external use remains blocked.

The Office renderer accepts the auction operation and emits `auction-control.xlsx`, `auction-control.pdf`, render report and Reader previews. Independent inspection checks the first-tab structure, protected Banker Notes comment, shared Revision identity, lineage rows, process-state separation and absence of active content. The API exposes Deal-scoped create/revision/process-lineage routes.

## Verification

- `npm run contracts:check` — passed.
- `npm run db:validate` — passed, 101 ordered migrations.
- `npm run domain:naming` — passed.
- `npx tsc --noEmit --pretty false --incremental false` — passed.
- `npm run web:build` — passed.
- `python3 -m py_compile services/office/auction_control_workbook.py services/office/inspect_auction_workbook.py services/office/run_workbook.py services/office/supervisor.py` — passed.
- `npx tsx --test tests/unit/auction-control-workbook.contract.test.ts` — passed, 3/3.
- Local render/inspect fixture with a Buyer Candidate and explicit not-applicable process families — passed all six independent checks.
- Public UI probe: `https://dev-banking.aptoren.com/app/deals/project-northstar/auction-control-workbook` returned HTTP 200 and rendered `Auction Control Workbook`, `Executive Control`, `Native Artifact`, and `No aggregate ready / OK score is calculated`.
- Anonymous API probe: `/api/v1/session` returned HTTP 401 with `application/problem+json`.
- Playwright screenshot: [ticket-17-auction-control.png](/Users/wxm/Desktop/workspace/InvestmentBanking/output/playwright/ticket-17-auction-control.png).
- Authenticated development UI acceptance screenshot: `output/playwright/ticket17-authenticated-correct.png`; the route loaded the real Deal header and the Executive Control surface with Native/Reader status, process families, and external-use block.

## Development-server evidence

The remote development release `20260909-ticket17` applied and recorded migration `20260909130000_auction_control_workbook`. The rootless Office service uses the pinned image `sha256:3688e1b7e16a729e96f06f8492969648467f269e42f947643821ff65ea09029e`; its renderer produced and independently inspected the exact Native/Reader pair after LibreOffice save/reopen.

A real development job completed end-to-end with:

- Deliverable `ced7ddba-8931-4794-8694-7d8ef138ec72`.
- Current Revision `f1ec690a-3d07-4ea0-b448-d9f3e7aac3fa`, template `auction-control-1.0.0`, synthetic development provenance.
- Job `61751a39-dc8a-4753-8d6f-d582feb67e4a` completed; QC run `9c73c34e-dc1b-4ac4-b63b-660ecbebd510` completed.
- Native `auction-control.xlsx` and Reader `auction-control.pdf` share the Revision identity; five Reader preview pages were stored.
- QC passed `native_structure`, `banker_protection`, `native_reader_parity`, `lineage`, `process_state_separation`, and `unsupported_active_content`.
- Stable Buyer Candidate `b8298953-72b4-4053-8319-beec8754f4d3` maps to Native `Buyer Universe!A10:H10` and Reader page 2 through `deliverable.auction_control_lineage`.

The first remote attempts exposed a development deployment mapping error: the worker was mounted at `/run/office` while the supervisor socket was nested at `/run/office/socket/renderer.sock`. The development host now exposes the expected `/run/office/renderer.sock` symlink to that supervisor socket; the successful job above verifies the corrected worker-to-Office path.

## Runtime boundary

The development signer is now compose-managed and healthy. A fresh auction-control revision completed on the development host with an Ed25519 manifest (`key_version=development/artifact/20260906/versions/1`, manifest endpoint HTTP 200); the prior revision's missing manifest is historical. The declared Office path is exercised with LibreOffice in the pinned development container, including save/reopen and Reader generation, under the authorized development alternative. Microsoft 365/Windows remains separate production evidence.
