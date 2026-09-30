# Harbor Components — frozen synthetic reference packet

Fixture version `harbor-v1.0`, 2026-09-30. All companies, people, terms and figures below are invented for product acceptance. Nothing describes a real transaction, market multiple or operational result. This packet supplies complete **semantic** examples for the [five content contracts](../../contracts/deliverable-content.md); it contains no generated XLSX/PPTX/DOCX/PDF or evidence of Office compatibility.

## Work objective and authority

Deal `D-HARBOR`: proposed sale of 100% of a U.S. industrial components business, cash-free/debt-free, normalized working capital. Internal Banker review as of 2026-09-15. No External-Use Decision exists. The selected first outcome is `financial_review`; bid and marketing examples are later outputs in the same Deal, not prerequisites for this first outcome. Synthetic decisions below are fixture facts, never user Decisions on a live Deal.

All financial values are USD millions, calendar years ending December 31. COGS and SG&A exclude D&A. Historical values are management-provided and unaudited. EBITDA = revenue − COGS − SG&A; EBIT = EBITDA − D&A. No fees, taxes, debt-like liabilities or transaction deductions beyond those explicitly provided are modeled. Equity proceeds are illustrative before those unprovided items, not a promised seller distribution.

## Immutable source inventory

| Source ID/version and exact locator | Frozen content | Authority / disclosure |
|---|---|---|
| `FIN-v1`, `Summary!B2:D5` | Columns FY2024 actual / FY2025 actual / FY2026 management forecast; revenue 48 / 54 / 60; COGS 30 / 33 / 36; SG&A 12 / 13 / 14; D&A 2 / 2 / 2.2; cash not included in these operating lines | Accepted internal historical Facts; FY2026 values are management forecast assumptions |
| `ADJ-v1`, `Adjustments!A2:E3` | FY2025 legal expense 0.6 included in SG&A, described as one-time settlement; proposed owner-comp adjustment 0.4 included in SG&A, replacement-cost evidence missing | Legal adjustment accepted by `HD-LEGAL`; owner-comp remains pending, excluded |
| `BAL-v1`, `Bridge!B2:B5` | Debt 12; cash 3; actual NWC 7.2; target NWC 6.5; identical definitions for bid comparison at this snapshot | Accepted comparison assumptions under `HD-BRIDGE`; closing values not yet verified |
| `CUSTOMER-v1`, `Customers!A2:C3` | Customer C1 FY2024 revenue 9.6, FY2025 revenue 12.96; largest customer in both years; current contract expires 2027-06-30 | Accepted internal; identity not approved for teaser |
| `BUSINESS-v1`, `p1:company` | Two leased U.S. manufacturing sites; 120 employees; precision industrial components; serves equipment manufacturers; CEO and CFO in role; no independent market-share evidence | Accepted management-source claims with citation; no “market leader” claim |
| `BUSINESS-v1`, `p2:growth` | Management proposes second-shift utilization and cross-selling; no customer commitments or funded capex plan supplied | Opportunity assumptions, not contracted growth |
| `PROCESS-v1`, `events/1-4` | A and B approved for round 2; NDAs recorded signed 2026-08-20; LOIs received 2026-09-12 and 2026-09-13; revised-bid deadline 2026-09-22 17:00 America/New_York | Recorded process events; no product delivery/read event |
| `BID-A-v1`, `p1:price`, `p2:conditions` | Atlas Industrial: EV 64 entirely upfront; same NWC peg 6.5; no earnout/rollover; financing condition; indicative closing 60 days after signing; seeks 45-day exclusivity; confirmatory diligence and definitive agreements required | Exact proposed nonbinding terms; no committed financing evidence |
| `BID-B-v1`, `p1:price`, `p2:conditions` | Boreal Partners: headline EV up to 70 = upfront EV 62 + earnout up to 8; same NWC peg; no rollover; no financing condition; indicative closing 45 days; seeks 60-day exclusivity; confirmatory diligence and definitive agreements required | Exact proposed nonbinding terms; earnout metric/payment timing not supplied |
| `MANDATE-v1`, `p1:scope` | Sale of 100%; internal comparison objective prioritizes upfront proceeds with acceptable execution certainty; no automatic bidder selection | Accepted purpose; only anonymous business/aggregate revenue/EBITDA may appear in teaser |

Every source is synthetic, upload-first and available to this Deal only. Source IDs above are human-readable fixture aliases, mapped to exact generated IDs by a future test harness. Source locators are acceptance inputs, not claims that the native source files already exist.

## Frozen controls and open items

| ID | Exact decision / state |
|---|---|
| `HD-LEGAL` | Accept 0.6 FY2025 legal addback as nonrecurring for this internal analysis; verify accounting treatment before circulation |
| `HD-OWNER` | Defer 0.4 owner-comp addback pending replacement-cost evidence; exclude it from adjusted EBITDA |
| `HD-BRIDGE` | Use 12 debt, 3 cash and 0.7 positive NWC adjustment consistently for illustrative bids; not closing-date verified |
| `HD-MULTIPLE` | Use 6x/7x/8x illustrative EV/adjusted EBITDA sensitivity; no external comparable evidence, no market valuation claim |
| `HD-CRITERION` | Prioritize upfront economics subject to financing/execution clarification; AI may recommend next action, not select a Buyer |
| `OI-1` | Request owner-comp evidence; assigned Banker; due 2026-09-18; blocks that adjustment only |
| `OI-2` | Request A's committed financing / waiver; due 2026-09-19; blocks unconditional execution-certainty conclusion |
| `OI-3` | Request B's earnout metric, payment timing and security; due 2026-09-19; blocks probability-weighted earnout value |
| `OI-4` | Confirm closing debt/cash/NWC, debt-like items, fees and taxes; before definitive price/proceeds conclusion |
| `OI-5` | Obtain market/competitive evidence and organization detail before complete circulation CIM; internal draft visibly qualified |

See [fully populated expected outputs](expected-outputs.md) and [acceptance cases](acceptance-cases.json). Narrative wording may vary only if every required meaning, qualification and exact reference survives. Numeric expectations and materiality are fixed. Do not revise this fixture silently to make a generated result pass; create a new fixture version and explain the change.
