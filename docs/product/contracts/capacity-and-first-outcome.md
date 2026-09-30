# Capacity and first useful outcome

Design contract version: `commercial-v1.1`, 2026-09-30. This document owns the revised allowance, first-outcome and guarantee predicates. Existing prices, Individual scope and 14-day guarantee window are retained. Checkout must display and record this exact terms version; this design revision does not retroactively change an existing purchase.

## Capacity with a recovery path

| Offer / allowance | V1.1 contract |
|---|---|
| Individual Deal Desk | $995 monthly / $10,950 annually; two stable Active Deal Slots |
| Included processing per active slot and Deal, per monthly allowance period | 250 new processed files, 2,500 logical pages, 20 full-workflow operations |
| Included retained storage | 25 GB dedicated to each occupied Active Deal Slot, plus 250 GB shared Account retained-storage pool |
| Additional Active Deal Slot | $500 monthly / $5,500 annually; same allowances, co-termed/prorated under existing terms |
| Intensive-processing pack | $1,000; +250 new processed files, +5,000 logical pages and +20 full-workflow operations for one exact Deal and current monthly period |
| Retained Storage Capacity Pack | $50 monthly; +250 GB shared Account retained-storage pool; may hold archived material or active-Deal overflow |

The previous “Archive Capacity Pack” name becomes Retained Storage Capacity Pack. The 25 GB allocation and retained-storage pool measure bytes retained at a point in time; neither resets monthly. A storage pack changes no processing count, source-format limit or worker resource limit. A processing pack changes no file size, packet, page-per-file, parser or concurrency technical limit. Additional slots do not change the base two-slot price.

Active overflow draws from the shared pool only after the exact Operation Preview identifies that allocation. Archived Deals draw their entire retained size from that pool. Reclassification within the pool does not copy bytes or create a second billable copy. Archive preview shows resulting occupancy; if insufficient, offer explicit storage purchase or permitted export/deletion before archiving. Do not promise that archiving alone frees total retained storage. Expiring/canceling storage capacity cannot erase data or create retroactive charges: retain existing data within the disclosed lifecycle, block capacity-increasing writes while over allowance, and continue read, revoke, export and delete. An Account's overall subscription ending still follows Post-Term Access/deletion policy.

Storage measures logical accepted payload bytes retained in the Deal: source originals, retained source representations, native artifacts, Reader Copies and retained export archives. Identical bytes referenced multiple times within that Deal count once; no cross-Deal/account deduplication or information leakage. Rejected uploads, temporary processing, failed build staging, operational backups and system diagnostics do not consume customer retained-storage allowance. Before generation, reserve a displayed maximum byte budget; the worker may commit smaller actual use and release the remainder, but must stop before committing beyond that budget. It preserves accepted steps and offers an updated preview. No silent capacity purchase or credit-card charge.

Monthly periods follow the subscription billing anchor in UTC, with the anchor day clamped to the last day of a shorter month; annual subscriptions still receive monthly allowances. Persist explicit start/end for each period, never infer from local time. Slot IDs survive archive, deletion, replacement and subscription term changes. Base processing capacity requires availability in **both** the current slot-period bucket and Deal-period bucket; each reservation/commit debits both. Moving a Deal to another slot or filling a freed slot cannot reset either ledger. Choose the occupied slot explicitly or deterministically from available slots and show it in preview. Additional slot purchase grants only its stated current-period capacity.

For each allowance class, allocate base usage up to the minimum remaining slot and Deal budget; allocate any remainder to that exact Deal's processing packs, earliest-expiring first. Store the allocation per reservation. Archiving, reactivation and slot reassignment never refund consumed processing units or transfer a pack to another Deal. A pack expires at its recorded period end. It can cover a Deal even when a reused slot's base bucket is exhausted. Product-failure compensation restores the original allocation once; it cannot mint units in a later period. File/page semantics and no-charge targeted-work rules remain as defined in the monetization contract.

At 70% forecast use; at 90% show remaining quantities and likely next operation. Every operation requiring commercial classification presents a preview **even when under allowance**. Show exact work, paid-unit classification (including “no paid operation”), estimated/reserved quantities, current/after balances, storage allocation, expiry, failure restoration and any purchase price. The user presses `Start this work` for the displayed digest. Preview creates no reservation. Final acceptance rechecks scope, entitlement and versions atomically; a stale preview returns `409 operation_preview_stale`, preserves the draft and requests fresh consent. A purchase is a separate explicit checkout.

| Boundary case | Required result |
|---|---|
| 251st small file, pages still available | Block before processing; offer exact Deal processing pack, next-period deferral or reduce new input |
| Active Deal reaches 25 GB | Preview overflow against available shared pool; if full, offer retained-storage pack or permitted export/delete |
| Slot used by A is reused by C | C sees the slot's remaining base budget; its own new Deal budget does not refresh the slot |
| A moves from exhausted slot 1 to unused slot 2 | A's exhausted Deal bucket prevents fresh base allowance; exact Deal pack remains usable |
| Product-side retry / successful replay | Restore original consumed allowance per compensation rule / no duplicate consumption |
| Targeted correction | Zero paid operation, but technical limits and actual storage capacity still apply |

Commercial storage units above use decimal GB (1,000,000,000 bytes). Only logical accepted payload is counted; encryption and infrastructure overhead is excluded.

## Two useful milestones

**First Control Loop** teaches the controls: inspect exact Evidence, record a material correction/Decision or explicit reviewed no-change result, run applicable deterministic checks, inspect downstream consequence. A correct blocker can complete this milestone. No user must invent a conflict to complete onboarding.

**First Useful Outcome** requires the concrete result selected in the First Deal Guide to be usable and portable. Its required objects and content are frozen before work in an Outcome Selection; changing the selection is explicit, preserves history and cannot retroactively count a lesser outcome. Default choices:

| Outcome | Minimum completed result |
|---|---|
| `financial_review` | Analysis & Valuation Workbook with historicals, adjustment disposition, reconciliation/checks and source map; valuation may be explicitly out of scope |
| `marketing_draft` | Teaser with all required modules and approved internal disclosure boundary; qualified internal draft is allowed if selected, anonymous circulation is a separate later gate |
| `bid_review` | Auction workbook comparison plus Bid Memo for two exact Bid Versions, normalized economics and material conditions; recommendation may be to clarify terms, not an invented winner |

The predicate requires: real supported Deal; paid preflight permitting the selected work; required content complete at its selected output ceiling; exact evidence inspection and required Banker decisions; deterministic checks passing; no unresolved material blocker for that selected result; matching immutable native/reader artifacts; permitted Internal Controlled Export created; and at least one verified full retrieval of the matching export archive or all required native/reader members. Partial/range-aborted downloads do not count. An immutable server-side Protected Stream Access Receipt records completed coverage and exact digest. This is separate from browser analytics and does not require proof the file was opened in Office.

Risk discovery, a correct blocker, an AI draft, a preview, an upload, an authorization or an export link alone does not satisfy First Useful Outcome. Show `Control loop complete — selected outcome still blocked` with the exact recovery action. The Guide order is selection → inputs → control loop → complete selected result → export/retrieve → outcome complete → explicit graduation. Returning users can leave Guide mode without falsifying milestone state.

`first_control_loop_completed` and `first_useful_outcome_completed` are versioned events projected from authoritative milestone records. `first_unmistakable_value` becomes a historical naming alias for the v2 useful-outcome predicate; store predicate version and never merge v1 control-loop cohorts with v2 outcomes or count both aliases. Time to first useful outcome starts at paid/preflight-ready state per the existing cohort definition and ends only at this predicate. Referral eligibility uses useful outcome. Measurement collection may remain disabled by the Integration Spec; this never disables the domain milestone or guarantee engine.

The First-Deal Control-Loop Guarantee retains its commercial name, window, eligible Source Packet, account/payment restrictions and product-side-failure conditions. Its success cutoff now uses **First Useful Outcome** under `commercial-v1.1`, not the teaching milestone or correct blocker. A correct business blocker does not itself prove refundable product failure, either: assess other disclosed conditions independently and explain the exact reason. No invented decision or unusable export can terminate the guarantee. Persist purchased terms/predicate versions so the engine evaluates the terms actually accepted.
