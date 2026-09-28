# Ticket 23 — exact Banker Selection contract

> 历史技术参考：旧实现已废弃。保留原设计和技术合同供用户评估；文中旧状态、配置、运行命令和验收结论不代表当前环境，不授权执行。

Status: strict Selection command, inspection, downstream current-authority checks and persistent candidate Impact implemented locally through migration 191124; full ticket and development acceptance remain open. This document consumes original T23 AC 4–7 and audit F5/F6/F8; it does not replace or narrow them. The development server has not received these migrations.

The governing sources are the full T23 ticket and audit, ERD §8.3 and §10.4, API §22.8 and §23.7, UX Control Review and Human Decision Control Review, and the confirmed Bid comparison prototype. Bid selection, exclusivity and Process Events remain separate authority. A selected Bid may retain explicitly reviewed conditions; the command cannot infer that financing, diligence, approval, signing or closing has occurred.

## Exact review and concurrency

The selection request identifies the exact Comparison ID, its reviewed row version and comparison digest, and one member's immutable Bid Version. A scoped review projection must show current original terms, unit results, chosen valuation Scenarios, assumptions, Evidence, gaps, candidate downstream consequences and existing selection history before the command.

Maintain one current primary Bid Selection per Deal. The review projection returns a stable selection-state ETag, including version `0` when there is no prior selection. The command requires that ETag and the exact previous Selection ID, or explicit null for the first selection. A replacement appends a new Selection and Human Decision, links the superseded Selection/Decision, and advances the pointer atomically. It never edits the historical Decision. Prior selections from the legacy unverified contract are inspectable but cannot silently become the verified current choice.

The existing Account/Workspace/Deal command fence serializes selection with formal Bid work. A new private comparison assertion must lock and recheck all Bid/Source/member/Calculation/Scenario/Assumption bases, including dynamic applicability from the valuation path. The current comparison projection alone is not a write authorization. A changed comparison digest, current pointer, Evidence basis, Assumption or reviewed selection version rejects the transaction without a partial Decision. Exact replay returns the old immutable receipt, separately from current applicability.

## Complete decision basis

The strict request must preserve the following inputs in the common immutable Human Decision and typed Selection relations:

- Explicit Actor confirmation, decision question, `bid_evaluation` purpose, stated scope, effective time, optional expiry, rationale, and revisit triggers.
- All considered alternative Bid Versions in the comparison, with reasons and trade-offs. An explicit defer/no-selection alternative may be included. Numeric ranking alone is insufficient.
- Supporting and challenging exact Evidence IDs, their role and explanation, native locators, Source/Representation and reviewed purpose-specific assessment identities. Additional contrary Evidence may come from another eligible Source in the same Deal; it need not be a fragment of the selected Bid. An explicit “no contrary Evidence identified” statement is distinct from an omitted review.
- Relevant Information Conflict references with reviewed version, stated treatment and rationale. A selection cannot silently claim that recording it resolves a Knowledge Conflict.
- Explicit disposition of every material or unassessed condition on the selected Bid. Satisfied-by-Evidence dispositions bind reviewed Evidence; accepted limitations remain decision conditions with revisit triggers. Missing conditions/financing/timing require explicit limitation review and may not be treated as zero, absent or satisfied.
- A conditions posture with either explicit additional conditions or an explicit reason that there are no additional conditions. Do not make a nonempty arbitrary string array a substitute for this choice.
- The exact governed Recommendation when it informed the choice, including its current comparison/basis and AI Run lineage. Human selection may be made without an AI recommendation; a legacy hand-authored JSON row must not masquerade as governed AI.

Use typed same-Account/Deal foreign keys. Keep immutable Selection content separate from current applicability. The existing `human_decision_evidence` links Claim Evidence Relationships; do not fabricate Claims solely to fit that table. A dedicated typed Selection–Evidence relation may reference already accepted Evidence directly, as other purpose-specific Decisions do, while preserving the Human Decision linkage.

## Current use and impact

Current Selection eligibility must recheck the exact comparison, chosen Bid, Source, Scenario/Calculation and approved Assumption set, relevant Evidence/conflict reviews, effective/expiry times and supersession/reversal. Full F6 must persist exact affected dependencies and candidate Impact for recommendation, memo and package, while preserving unaffected work and history. Lifecycle/Exclusive entry must consume this current typed authority and reject a historical selection whose comparison or basis is invalidated. The existing lifecycle check for the mere existence of any Selection is not sufficient.

## Required evidence

Local API and actual app_runtime tests must prove complete round-trip of supporting/contrary Evidence, conditions, alternatives and triggers; wrong member/scope/version/digest; missing or unhandled material terms; unverifiable or unrelated Evidence/conflicts; replacement history; both orders of competing Bid/Scenario/selection writes; replay and rollback; and immutable/forced-RLS boundaries. The completed development browser workflow must then exercise the dedicated Control Review, immutable receipt/history and invalidation, against the confirmed prototype. These requirements remain open until implemented and observed on the real development server.

## Observed local implementation

`POST /bid-selections` and the canonical `POST /bids/{bid_id}/decisions` require the strict `2.0.0` contract and Selection-state `If-Match`. The immutable common Human Decision, typed Bid Decision, exact supporting/challenging Evidence, alternatives, condition reviews, conflict snapshots and primary pointer commit together. New bid-selection Human Decisions without their typed extension are rejected by deferred validation. Legacy rows remain explicitly unverified; legacy recommendation JSON cannot provide the optional governed recommendation basis.

`GET /bid-selection-state`, `/bid-selections`, `/bid-selections/{selection_id}` and `/bid-comparisons/{comparison_id}/selection-review` expose version-zero state, complete Decision history, comparison terms/calculations/Scenarios, candidate Evidence locators and related conflicts. Current use is derived from the comparison, exact Evidence assessments/locators, conflict review set/version/status, Decision effective time and replacement, optional recommendation, and primary pointer. Comparison inspection now shares the command's current predicate, including newer unit Calculation Versions.

The latest clean local regression passes 106/106, including the ten Selection cases, downstream authority and exact PostgreSQL revision/Exclusive races, eight Bid Impact cases, and existing Bid/Evidence/diligence/lifecycle coverage. Exclusive entry consumes a specific current Selection/state version and records its immutable basis. Persistent typed changes reach affected comparison/Selection/Revision/package dependencies and block future use; unrelated work remains available and later pointer restoration cannot revive old authority. Memo file regeneration/recovery, complete governed AI, frontend and real development acceptance remain open. See [remediation evidence](../archived-materials.md) for the exact logs, migration rebuild and remaining boundary.
