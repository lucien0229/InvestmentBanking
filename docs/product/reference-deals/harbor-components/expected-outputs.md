# Harbor v1.0 — expected semantic outputs

This is the content baseline for artifact generation and review, not rendered artifacts. All five outputs are internal, synthetic and not externally authorized. Every output carries `D-HARBOR`, `2026-09-15`, `harbor-v1.0`, its contract ID and the exact source/decision aliases in the [input packet](README.md). Values below are USD millions unless stated otherwise. The sample addresses are stable required generated-region keys; native template coordinates may change only through an explicit region mapping.

## 1. Analysis & Valuation Workbook (`av-v1.1`)

`Readme`: Internal financial review and illustrative valuation sensitivity. Management-supplied unaudited history; FY2026 is management forecast. Two accepted historical periods; legal addback accepted, owner-comp excluded. Illustrative valuation only. Debt/cash/NWC are comparison assumptions; seller proceeds before unknown fees/taxes/debt-like items. Financial-review output is complete; circulation and closing-proceeds conclusions remain unavailable.

`Source_Map`: rows `FIN-v1:Summary!B2:D5` → `Historicals!B2:D5`; `ADJ-v1:Adjustments!A2:E3` → `Adjustments!A2:E3`; `BAL-v1:Bridge!B2:B5` → `EV_Equity_Bridge!B2:B5`; `HD-MULTIPLE` → `Valuation!B2:D2`; `CUSTOMER-v1:Customers!A2:C3` → `Checks!concentration`. Values, source versions, locators, units, years and historical/forecast states are retained in the build mapping. `HD-LEGAL`, `HD-OWNER` and `HD-BRIDGE` are separate authority bindings, not values extracted from workbook bytes.

`Historicals`:

| Row / measure | B: FY2024 actual | C: FY2025 actual | D: FY2026 forecast |
|---|---:|---:|---:|
| 2 Revenue | 48 | 54 | 60 |
| 3 COGS excluding D&A | 30 | 33 | 36 |
| 4 SG&A excluding D&A | 12 | 13 | 14 |
| 5 D&A | 2 | 2 | 2.2 |
| 6 Reported EBITDA (`col2-col3-col4`) | 6 | 8 | 10 |
| 7 EBIT (`col6-col5`) | 4 | 6 | 7.8 |
| 8 EBITDA margin (`col6/col2`) | 12.5% | 14.8% | 16.7% |
| 9 Revenue growth (`current2/prior2-1`) | N/A, no prior period | 12.5% | 11.1%, forecast |

Formulas in B6:D9 use each column's corresponding cells, with B9 explicitly unavailable; no hidden zero. Forecast never participates in “two actual years” assertions.

`Adjustments`:

| Row | A: item | B: proposed amount | C: accepted amount | D: status | E: basis |
|---|---|---:|---:|---|---|
| 2 | FY2025 nonrecurring legal expense | 0.6 | 0.6 | accepted for internal analysis | `ADJ-v1`, `HD-LEGAL` |
| 3 | FY2025 owner compensation | 0.4 | 0 | pending evidence, excluded | `ADJ-v1`, `HD-OWNER`, `OI-1` |
| 4 | Accepted total | 1.0 proposed | 0.6 | `SUM(C2:C3)` | no double count |
| 5 | Adjusted EBITDA | — | 8.6 | `Historicals!C6+C4` | reported 8 + accepted 0.6 |

Adjusted EBITDA margin = 8.6/54 = 15.9% displayed. Do not describe proposed total 1.0 as accepted. Addback is not applied to FY2026 without a separate basis.

`Operating_Case`: FY2026 revenue 60; COGS 36 (60.0% revenue); SG&A 14 (23.3%); EBITDA 10; D&A 2.2; EBIT 7.8. Revenue growth 11.1%. The forecast is supplied by management and assumes higher utilization; no contract-backed growth or capex-funded expansion conclusion. A forecast-unavailable variant leaves this module explicitly unavailable rather than extrapolating 60.

`Valuation`:

| Row | B: low | C: central | D: high |
|---|---:|---:|---:|
| 2 Illustrative multiple | 6x | 7x | 8x |
| 3 FY2025 adjusted EBITDA | 8.6 | 8.6 | 8.6 |
| 4 EV (`row2*row3`) | 51.6 | 60.2 | 68.8 |

These are scenario assumptions, not market-supported values. DCF and public-company/transaction comparables are omitted with `not_applicable: no accepted method inputs`. No fairness or solvency opinion.

`EV_Equity_Bridge`: B2 debt 12; B3 cash 3; B4 actual NWC 7.2; B5 NWC peg 6.5; B6 net debt `B2-B3` = 9; B7 NWC adjustment `B4-B5` = 0.7. Before NWC adjustment, equity range = 42.6 / 51.2 / 59.8. At the assumed peg adjustment, indicative equity = 43.3 / 51.9 / 60.5. State explicitly which bridge is used. No fee/tax/net-distribution claim.

`Sensitivity`: EV matrix from adjusted EBITDA rows 8.0 / 8.6 / 9.2 and multiple columns 6 / 7 / 8. Results are [48.0,56.0,64.0], [51.6,60.2,68.8], [55.2,64.4,73.6]. Low/high EBITDA rows are explicit ±0.6 sensitivity assumptions, not accepted historical EBITDA. Equity-at-peg for each cell subtracts 8.3.

`Checks`: revenue 48→54 = 12.5%; reported EBITDA ties 6/8; EBIT ties 4/6; accepted adjustments = 0.6; adjusted EBITDA = 8.6; forecast marked forecast; NWC sign = +0.7; base EV60.2 maps equity-at-peg51.9; largest customer = 20.0%→24.0% (increase 4.0 percentage points); all source/decision bindings present. Every check is a deterministic pass in this fixture. Open diligence items are shown alongside passes; mechanical success does not close them.

## 2. Auction Control Workbook (`auction-v1.1`)

`Readme`: Round 2 internal control snapshot, 2026-09-15; next revised-bid deadline 2026-09-22 17:00 America/New_York. Recorded LOIs are nonbinding proposals. Product access, actual distribution and data-room access are separate.

`Buyers`: A = Atlas Industrial, approved round 2 strategic candidate; B = Boreal Partners, approved round 2 sponsor candidate. Approval basis `PROCESS-v1`; no unsupported synergy or financing capability claim. Owner for both is the Individual Banker. A next action: obtain financing certainty; B next action: obtain earnout terms and upfront improvement. Neither selected.

`Process`: NDAs signed 2026-08-20; A LOI received 2026-09-12; B LOI received 2026-09-13; revised-bid deadline planned 2026-09-22 17:00 America/New_York. Current Business Stage remains round-2 bid evaluation; no closed transaction, actual delivery or read event is inferred.

`NDA_Access`: A and B NDA status signed per `PROCESS-v1`; data-room access unknown/not recorded; product Recipient Access none; externally authorized Delivery none; actual use not recorded. Signed NDA alone grants no product access.

`Diligence`: all `OI-1` through `OI-5` from the packet, with exact due/ceiling/owner/basis. `OI-2` and `OI-3` are material to bidder selection; `OI-1` excludes one adjustment; `OI-4` prevents final proceeds; `OI-5` prevents complete circulation CIM. There are no fabricated completion dates.

`Bids` and `Comparison`:

| Field | A — `BID-A-v1` | B — `BID-B-v1` |
|---|---:|---:|
| Headline EV | 64 | up to 70 |
| Upfront EV | 64 | 62 |
| Contingent EV | 0 | 0–8, mechanics missing |
| Rollover | 0 | 0 |
| Debt / cash / NWC adjustment | −12 / +3 / +0.7 | −12 / +3 / +0.7 |
| Illustrative equity cash at close, before unprovided deductions | 55.7 | 53.7 |
| Total illustrative equity including contingent maximum | 55.7 | 53.7–61.7 |
| Financing condition | yes; not resolved | no financing condition stated |
| Other conditions | confirmatory diligence, definitive agreements | confirmatory diligence, definitive agreements |
| Indicative close after signing | 60 days | 45 days |
| Requested exclusivity | 45 days | 60 days |
| Probability-adjusted proceeds | unavailable | unavailable; no accepted probabilities |

A offers 2.0 more upfront under the same assumptions. B offers up to 6.0 more total than A only if the full earnout pays. B's no-financing-condition term is not proof funds are available. Do not collapse conditional terms into a single unqualified price rank.

`Decisions`: criterion `HD-CRITERION`; bridge `HD-BRIDGE`; no winner Decision; proposed follow-up is to seek A's financing waiver/commitment and ask B to improve upfront value and clarify earnout. Explicit decision owner remains Banker.

`Checks`: upfront+contingent maximum ties headline (A64; B62+8=70); both bridges use identical values; due time has timezone; version locators resolve; NDA status does not imply delivered/read; unresolved terms visible. All deterministic checks pass; unconditional selection blocked by missing certainty inputs.

## 3. Teaser (`teaser-v1.1`)

`overview` — **Industrial components platform — confidential opportunity.** Proposed sale of 100% of a U.S. precision industrial components business serving equipment manufacturers. Internal anonymous draft; no external circulation authorized. [Internal basis: `MANDATE-v1`, `BUSINESS-v1`]

`business` — The business operates two leased U.S. manufacturing sites and supplies industrial components. Do not include company, customer or facility identity, logos, source filenames or identifying metadata. [External reference code T1; internal mapping `BUSINESS-v1:p1`]

`highlights` — (1) FY2025 revenue increased 12.5% to $54.0m. (2) FY2025 reported EBITDA was $8.0m; adjusted EBITDA was $8.6m after the accepted $0.6m legal addback. (3) Management has identified utilization and cross-selling opportunities; customer commitments and expansion funding are unverified. No market-leadership claim. [T2/T3 map to `FIN-v1`, `ADJ-v1`, `HD-LEGAL`, `BUSINESS-v1:p2`]

`financial_summary` — FY2024 revenue $48.0m and reported EBITDA $6.0m; FY2025 revenue $54.0m and reported EBITDA $8.0m. Adjusted FY2025 EBITDA $8.6m / 15.9% margin. Management-provided unaudited figures. Owner-comp proposal excluded; forecasts not used as historical proof. [T2/T3]

`growth` — Management proposes greater utilization and cross-selling. These are opportunities requiring diligence, not contracted or probability-weighted outcomes. [T3]

`transaction_next_step` — Proposed full sale; an interested party would contact the authorized Banker and complete the approved process. No real address/contact or link is invented in this synthetic artifact. [T1]

`qualifications` — Internal draft only; no authorization to distribute. Historical financials unaudited. Largest-customer concentration and contract renewal require further review before broader marketing. Exact supporting identities and detailed locators remain in internal controls. Anonymous disclosure QC includes notes, hidden slides, metadata and imagery.

Default layout: slide 1 overview/business/highlights; slide 2 financials/growth/transaction/qualifications. All regions must survive a combined one-page template.

## 4. CIM (`cim-v1.1`)

1. `executive_summary` — Harbor Components: proposed 100% sale of a U.S. precision components manufacturer. FY2025 revenue 54.0, reported EBITDA 8.0, adjusted EBITDA 8.6. Internal qualified draft; transaction perimeter per `MANDATE-v1`. No market valuation or sale-probability assertion.
2. `company_products` — Precision industrial components for equipment manufacturers; two leased U.S. sites and 120 employees. Product-level revenue split and detailed history not supplied, explicitly open. [`BUSINESS-v1:p1`]
3. `customers` — Largest customer C1 contributed9.6/48=20.0% in FY2024 and 12.96/54=24.0% in FY2025; concentration rose4.0 percentage points. Current contract expires2027-06-30. Other customer-level data not supplied. Avoid inferring customer retention, recurrence or contract renewal. [`CUSTOMER-v1`]
4. `markets_competition` — Business serves equipment manufacturers. Market size, market share and relative competitive position remain unavailable. `OI-5` requests source-supported research; no “leading supplier” substitution. [`BUSINESS-v1`]
5. `operations` — Two leased U.S. manufacturing sites. Management proposes second-shift utilization; current utilization, lease expiry, maintenance capex and capacity data are open. No funded expansion or spare-capacity quantification. [`BUSINESS-v1`]
6. `management` — CEO and CFO in role; 120 employees. Names, tenure, incentives, succession and organization detail not supplied. Internal draft clearly marks gaps. [`BUSINESS-v1:p1`, `OI-5`]
7. `historical_financials` — Table: FY2024 revenue 48/COGS30/SG&A12/EBITDA 6/D&A2/EBIT4; FY2025 revenue 54/COGS33/SG&A13/EBITDA 8/D&A2/EBIT6. Costs exclude D&A. Revenue growth12.5%; reported EBITDA margin 12.5%→14.8%. Unaudited management information. [`FIN-v1`]
8. `normalization` — Reported EBITDA 8.0 + accepted one-time legal0.6 = adjusted8.6. Owner-comp0.4 excluded pending replacement-cost evidence. Do not describe accepted adjusted EBITDA as audited or recurring cash flow. [`ADJ-v1`, `HD-LEGAL`, `HD-OWNER`]
9. `forecast` — FY2026 management forecast revenue 60/COGS36/SG&A14/EBITDA 10/D&A2.2/EBIT7.8. Revenue growth11.1%, EBITDA margin 16.7%. Utilization/cross-selling assumptions unverified; no commitment or external forecast assurance. [`FIN-v1`, `BUSINESS-v1:p2`]
10. `growth_opportunities` — Evaluate utilization and cross-selling through capacity, customer demand, funding and staffing diligence. No quantified benefit until supported. [`BUSINESS-v1:p2`]
11. `risks_open_items` — Rising customer concentration and 2027 contract expiry; unaudited financials; pending owner-comp evidence; missing market/operations/organization detail; unverified forecast. Carry `OI-1`, `OI-4`, `OI-5`. This draft is not a complete circulation CIM.
12. `process_basis` — Round-2 revised bids due2026-09-22 17:00 America/New_York. Internal source list includes all relevant immutable sources and Decisions. No recipient, delivery or external-use authority is implied. [`PROCESS-v1`, `MANDATE-v1`]

All twelve semantic sections are populated; explicitly qualified gaps prevent complete-CIM/circulation status. Do not manufacture data to satisfy the completeness label.

## 5. Bid Evaluation & Recommendation Memo (`bid-memo-v1.1`)

`decision_requested` — As of2026-09-15, review A and B's exact round-2 LOIs and authorize a clarification/negotiation next step. This memo does not select a Buyer or authorize external circulation.

`recommendation` — Keep both bidders in process. Prioritize resolving A's financing condition while asking B to improve upfront economics and define the earnout. A currently offers2.0 more illustrative cash at close; B offers earlier indicative closing and no financing condition stated, with contingent upside. These tradeoffs do not justify an unconditional winner without the Banker's assessment of execution certainty. [`HD-CRITERION`, `BID-A-v1`, `BID-B-v1`]

`comparison_basis` — Same100% perimeter, USDm, debt12, cash3, actual NWC7.2 versus peg6.5. Both comparisons include+0.7 NWC. Values precede missing fees, taxes and debt-like items, and assume the stated bridge holds. Closing figures unverified. [`MANDATE-v1`, `HD-BRIDGE`, `BAL-v1`]

`economics` — A: upfront EV64−12+3+0.7=55.7 illustrative equity cash at close. B: upfront EV62−12+3+0.7=53.7; contingent0–8 yields total53.7–61.7. A's headline64 and B's headline up to 70 are not like-for-like guaranteed proceeds. No accepted earnout probability or payment timing exists; expected value and present value remain unavailable.

`execution` — A has a financing condition with no committed-financing proof. B states no financing condition, but funds availability remains unverified. Both require confirmatory diligence and definitive agreements. Do not equate fewer stated conditions with certain closing.

`timing_control` — A indicative closing60 days and requested exclusivity45 days; B45 and 60 days respectively. Longer exclusivity can constrain alternatives despite faster indicative closing. Dates are nonbinding terms, not actual Milestones completed. [`BID-A-v1:p2`, `BID-B-v1:p2`]

`alternatives` — Proceed with A only after acceptable financing resolution; improve B's upfront package and clarify contingent economics; retain both in a short clarification round; reject or defer if the Banker judges terms inadequate. Selecting the largest headline ignores at least2.0 of upfront disadvantage and uncertain earnout realization. No automatic score substitutes for this judgment.

`sensitivity_diligence` — Earnout realization0/4/8 produces B total53.7/57.7/61.7, without assigned probability. B exceeds A's55.7 only above2.0 realized earnout before discounting and other unmodeled differences. A financing certainty, B earnout definitions, and common closing bridge remain open (`OI-2/3/4`).

`next_action` — Banker reviews this recommendation and records an exact proposed-process Decision. Request A financing commitment/waiver and B earnout terms/upfront improvement by2026-09-19; preserve revised-bid deadline2026-09-22 17:00 America/New_York. A draft request or recorded authorization does not mean it was sent.

`limitations` — Nonbinding LOIs; no probability-weighted or market-supported valuation; no legal/tax/fairness opinion; before unprovided deductions; no winner Decision or External-Use Decision. Exact Bid Versions, criterion and bridge bindings must accompany the Revision.
