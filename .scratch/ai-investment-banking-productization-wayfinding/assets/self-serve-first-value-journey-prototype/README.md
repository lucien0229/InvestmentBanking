# PROTOTYPE / THROWAWAY — Self-Serve First-Value Journey

This disposable Ticket 9 UI prototype asks one question:

> What product form and interaction sequence let an Individual Banker discover, purchase, create a Deal, provide minimum sources, supervise controlled work, inspect and correct Evidence, obtain the Controlled Auction Execution Package, authorize an exact Revision, export it, and return after a new Deal event without offline assistance?

It is a decision artifact, not a production application or a future code foundation. It uses public-safe synthetic data only and keeps state in browser memory. It performs no real payment, authentication, upload, parsing, OCR, AI/model call, Office generation, email, VDR action, cloud-drive action, persistence, or external transmission. Every such action is visibly marked simulated.

## Run

From this directory:

```bash
python3 server.py --port 4173
```

Open:

- A — Guided First-Deal Journey: <http://127.0.0.1:4173/?variant=A>
- B — Deal Execution Desk: <http://127.0.0.1:4173/?variant=B>
- C — Package Readiness Workbench: <http://127.0.0.1:4173/?variant=C>
- H — Validated Hybrid, C → A → B: <http://127.0.0.1:4173/?variant=H>

The fixed bottom switcher changes the `variant` query parameter. Left and right arrow keys also switch variants unless focus is in an input, textarea, select, or contenteditable element. The query parameter survives refresh; workflow state intentionally does not.

## Design It Twice comparison

Variant A makes a recoverable first-deal control journey the primary object. A twelve-stage rail optimizes correct first use, puts AI/deterministic/Banker handoffs in sequence, handles exceptions in context, and ends in a controlled package plus an event-triggered return loop. Its strength is guided completion; its tension is that experienced users may find a sequential journey constraining.

Variant B makes the Deal Workspace the primary object. Persistent work-domain navigation, a supervised work queue, an Evidence inspector, a parallel package/readiness lane, and an event inbox support a multi-month execution cadence. Its strength is return and parallel work; its tension is higher initial cognitive load.

Variant C makes the live Package Readiness Contract the primary object. The user selects the outcome first, then works backward through artifact dependencies; Evidence is inspected from output to source, and new events fork the Revision graph. Its strength is immediate visibility of premium value and output ceilings; its tension is the risk of being mistaken for a file factory unless controls remain first-class.

The three variants deliberately share the same Deal, Source Packet, failures, Human Decisions, package, and repeat event. They do not share one layout.

## Validated synthesis

The user confirmed the hybrid product form on 2026-08-01:

1. **C owns public discovery and outcome comprehension.** The Individual Banker sees the Controlled Auction Execution Package, its editable artifact family, and its source-to-output contract before supplying Deal material.
2. **A owns first correct use inside the product.** After simulated checkout, an embedded First Deal Guide inside the Deal Workspace sequences Deal identity, authority, Source Packet, work authorization, Evidence inspection, correction, typed Human Decisions, QC, readiness, and exact-version external-use control.
3. **B is the durable product shell.** Once first value is reached, the Deal graduates into the persistent execution desk for ongoing work domains, events, Revisions, package state, export, and return.
4. **C remains a core B workspace view.** Execution Package / Readiness presents the artifact spine, evidence dependencies, output ceilings, reader copy, QC and archive contract rather than becoming a separate file-generation product.

The first unmistakable value moment is reached when the product exposes the `$18.4m` / `$17.8m` EBITDA conflict and the erroneous `$6.2m` Cash extraction with exact lineage; the Banker records the scoped conflict treatment, corrects Cash to `$4.7m`, accepts the bounded Fact, and sees the `$1.5m` EV-to-equity tie-out recover together with affected workbook, CIM, reader-copy and Impact Assessment state.

## Synthetic fixture

- Deal: `Project Northstar`
- Entity: `Northstar Industrial Systems, Inc.` (fictional)
- Side / stage: Sell-Side / Preparation
- `SR-001 Draft_CIM_v3.pdf`: page 18, Table 4, Adjusted EBITDA Claim `$18.4m`
- `SR-002 Management_Model_v7.xlsx`: `Operating Case!F42`, Adjusted EBITDA `$17.8m`; `Balance Sheet!F28`, Cash extraction corrected from `$6.2m` to `$4.7m`
- `SR-003 Customer_Cohorts_Q2.csv`: `C-104.retention_rate`, unsupported/undefined `96%` Claim
- `SR-004 Process_Tracker.xlsx`: current process snapshot, with a triggerable stale state
- `SR-005 Synthetic_QoE_Summary.pdf`: initially missing, then added in recovery
- `SR-006 July_Actuals.xlsx`: return event that creates Revision 0.4 and invalidates Revision 0.3 authorization for future use

## Paths exercised by the prototype

- Public product proof and pricing-placeholder simulated checkout
- Deal identity, intended use, upload/use authority, confidentiality, and Source Packet selection
- Visible AI, deterministic, and Banker responsibilities
- Separate ingestion, extraction, analysis, deterministic-validation, and deliverable-generation state
- Triggerable and recoverable missing-source, stale-source, OCR, conflict, tie-out, unsupported-Claim, confidentiality, and circulation-hold states
- Exact Source Record and native locator inspection
- Extraction correction with preserved original value and Impact Assessment
- Fact acceptance/rejection, Assumption approval, material-conflict resolution, and unsupported-Claim exclusion
- Two editable workbook spines, stage-triggered artifacts, reader-copy previews, control records, QC/readiness, and archive manifest
- Exact-Revision simulated External-Use Decision distinct from circulation candidacy and actual transmission
- Simulated native/reader/archive export and a new Source Record that creates a new Revision rather than overwriting the old one

## Browser verification

Verified in Chromium at a 1440 × 1000 viewport on 2026-08-01:

- Opened and refreshed `?variant=A`, `?variant=B`, and `?variant=C`; each URL retained its selected structural variant.
- Switched A → B → C with the fixed controls and the right-arrow key. With a Deal-name input focused, the right-arrow key did not switch variants.
- Completed each variant's main path from public discovery and simulated checkout through Deal creation, authority preflight, Source Packet, authorized work, controlled package, reader preview, QC, circulation candidate, exact-Revision simulated External-Use Decision, simulated export, SR-006 return event, and Revision 0.4 refresh.
- Recovered the initial missing SR-005 state, `$18.4m` / `$17.8m` EBITDA conflict, `$6.2m` → `$4.7m` Cash correction and `$1.5m` deterministic tie-out failure, OCR limitation, unsupported Claim, reader-rights restriction, and explicit circulation hold.
- Confirmed the Cash correction preserved the original extraction and created an Impact Assessment. Confirmed a material correction invalidated the prior QC posture until the Impact Assessment was reviewed and QC rerun.
- Confirmed SR-006 created Rev 0.4 without overwriting Rev 0.3 and did not carry forward Rev 0.3 external-use authorization.
- Checked the browser console after all three flows: `0` errors and `0` warnings.
- Captured low-fidelity desktop views under `output/playwright/` for structural inspection.
- After user confirmation, completed the synthesized H path from outcome-first discovery through the embedded guide's first-value milestone, explicit graduation into the execution desk, package/readiness review, Rev 0.3 authorization/export, and Rev 0.4 return loop. H also completed with `0` console errors and `0` warnings.

## Known limitations

- State resets on full refresh because persistence is not under test.
- Native Office artifacts and PDFs are low-fidelity previews; simulated exports do not create files.
- All pipeline transitions, OCR, AI work, calculations, QC, hashes, and timestamps are fixture-driven simulations.
- The price and package are explicit placeholders. Ticket 10 owns monetization.
- Visual styling is intentionally low fidelity and is not a brand or Design System decision.
