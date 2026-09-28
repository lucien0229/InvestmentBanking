# Ticket 23 — controlled Bid valuation Scenario contract

> 历史技术参考：旧实现已废弃。保留原设计和技术合同供用户评估；文中旧状态、配置、运行命令和验收结论不代表当前环境，不授权执行。

Status: implementation in progress; not development acceptance. This is a bounded implementation contract under the original T23 AC and audit F3/F4/F6/F8, not a replacement acceptance scope.

The existing generic Scenario `overrides` JSON is not authoritative Bid normalization. The Bid path must create and consume exact typed inputs and immutable Model / Scenario / Calculation identities, with current Source and Banker-approved Assumption controls. Original terms, unresolved conditions and non-comparable items remain visible alongside each Scenario result.

## Supported calculation and interpretation

`bid_ev_equity_bridge_fx_v1` implements the existing enterprise/equity cash-debt bridge, explicitly adopted value adjustments, and an explicitly approved currency conversion. It does not infer missing cash, debt, FX, contingent consideration or discount rates.

- EV → equity: headline EV + cash − debt − debt-like amounts.
- Equity → EV: headline equity − cash + debt + debt-like amounts.
- Same value basis: preserve the headline basis without a cash/debt bridge.
- An explicitly approved signed target-value adjustment is added in the original currency after the bridge.
- FX, when currencies differ: multiply by the exact approved rate in target currency units per source currency unit. The approval names both currencies and the exact Bid Version. The same currency cannot hide an FX adjustment.
- A required bridge needs explicit known cash and debt inputs; zero must be stated by a Source term or approved Assumption. Unknown inputs never become zero.
- Unmodeled economic terms, contingent consideration, qualifications and other execution conditions remain limitations. Discounting or cash-equivalent valuation outside the declared method remains unsupported/non-comparable; it cannot be silently folded into EV.

Amounts use PostgreSQL numeric and JSON decimal strings without intermediate rounding. Evaluation Time is pinned separately from the current authorization time. An old Evaluation Time cannot revive an expired approval. A successful calculation remains `scenario_only` and cannot establish a Fact, professional usability, Bid selection, exclusivity, or a process event.

## Exact inputs and authority

The headline is derived from the exact current Bid Version. Cash, debt and debt-like inputs reference its typed economic terms or an exact approved Assumption. FX and discretionary value adjustments require an approved Assumption. No caller-provided calculated value is accepted.

An adopted Assumption binds its exact immutable ID, approval Decision ID, `bid_evaluation` purpose and allowed `bid_valuation` use. Its bounds use `BidValuationAssumptionBounds`, including the exact Bid Version, role, source and target currencies, target value basis and quantitative metadata. The value matches `knowledge.assumption.value_text`, and approved bounds must match the immutable Assumption bounds. Superseded Assumptions, replaced/reversed or expired approvals and mismatched scope are ineligible.

The acceptance transaction locks the Source and exact Assumption/Decision bases. Inserts that supersede these knowledge objects must acquire the same predecessor row locks, so a concurrent replacement cannot bypass the current-basis check. These are concurrency fences; they do not grant new business authority.

## Identity, history and comparison use

One stable Bid valuation Model is reused across alternative Scenarios; a new formal Bid Version supplies a new exact Model Version. A Scenario is not implemented by creating a separate Model. A named Scenario revision requires its current ETag and appends an immutable Scenario Version. Each calculation execution and result is immutable, and a Scenario revision never rewrites an earlier Run.

Typed valuation input rows link each Calculation/Scenario to the exact Bid economic term or Assumption approval. Quantitative outputs and validation are persisted with method/version, input digest, Evaluation Time, scope, coverage and limitations. Current applicability is separate from history.

An immutable Bid Comparison may explicitly include exact valuation Scenario records for its members. Their Bid Version, Model Version, Scenario Version, Calculation Run, Source, Assumption and approval scope must remain current when the comparison is accepted. The comparison digest includes the exact valuation membership. A later Scenario or Bid revision invalidates future use of the affected comparison and its downstream proposal/Decision/Impact chain; historical original terms and calculated values remain inspectable.

## Acceptance required before this slice is complete

Real API and app_runtime SQL must prove the supported bridge and FX arithmetic, same-Model alternative Scenarios, exact immutable revisions, replay and version conflict, decimal precision, source/approval denial, missing inputs, wrong role/currency/period, cross-Deal basis, expired/superseded approvals, and observed concurrent supersession. Comparison use must reject fake, unrelated and old Scenario/Calculation identities. These local checks must then be repeated through the completed development UI and server flow required by the original ticket.
