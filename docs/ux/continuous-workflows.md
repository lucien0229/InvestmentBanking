# Continuous work: intake, review, recovery and delivery correction

Design revision: 2026-09-30. These flows refine the existing Guide, Action Center, Source, Impact and sharing surfaces. They reuse canonical objects and typed commands. The [capacity/outcome contract](../product/contracts/capacity-and-first-outcome.md) owns commercial predicates; [control consistency](../technical/control-consistency.md) owns transactions and permission checks.

## CW-01 — Select a result and reach it

In Guide setup, choose Financial review (default), Marketing draft or Bid review. Show required deliverables, required content, permitted partials, intended internal audience, supplied/missing inputs and the smallest executable next step. `Save selected outcome` creates a versioned Outcome Selection, not a guide-only checklist. A later change requires a reason and displays lost/retained progress; no silent downgrade to achieve a milestone.

The Guide shows separate milestones: `Control loop completed`, `Selected result complete`, `Export retrieved`, `First useful outcome completed`, `Enter Deal Execution Desk`. A correct blocker can complete the first milestone while the result remains incomplete. Export creation alone is not retrieval. Completed server-side retrieval updates the milestone on refresh without relying on client analytics. Explicit graduation remains distinct. A returning user may choose `Continue in workspace` before graduation while the Guide remains reopenable.

## CW-02 — Mixed Source batch and work consent

1. Choose local files. Only local filename/type/size are inspected; no bytes or filenames reach a server, provider or telemetry before declaration. Show the intended Deal and Work Objective prominently.
2. Set a shared declaration for source authority, confidentiality, rights/purpose and provenance. Display per-file rows inheriting that declaration; `Change for this file` supplies exceptions. Applying a declaration requires explicit selection; inferred file type/name never implies rights. Undeclared rows remain local and can be removed/deferred. All rows that will transfer must have a valid declaration.
3. Request Operation Preview for the declared selected subset. The review shows file count, size, logical-page estimate/reservation ceiling, work classification, exact paid-operation count, storage allocation, available/after capacity, failed-work restoration, technical blockers and exclusions. For encrypted/unknown page counts, reserve a disclosed maximum within technical bounds, then confirm actual count before substantive work exceeding that bound. No under-limit bypass of review.
4. `Start this work` accepts the preview ID/digest and declarations. Only now create Upload Session and transfer declared items. A409 preserves local selection/declarations and opens the changed preview; no background auto-consent. Checkout for a required pack is an explicit separate step, returning to a fresh preview.
5. Each row reports queued/transferring/received/safety-check/accepted/rejected/needs-declaration/paused, its exact recovery and allowance effect. Resume at the durable offset; rejected items do not erase accepted Source Records. `Retry failed items` selects rows but retains each row's required declaration/preview; it is not a fresh full-batch charge. New file versions remain distinct records.

```text
Add Source · Deal Harbor · Financial review
Selected locally: 12 files / 18 MB       [Shared declaration…]
[x] Financials.xlsx   Confidential / authorized internal analysis [Change]
[x] Buyer A LOI.pdf   Restricted / comparison only               [Change]
[ ] Unclassified.zip Declaration required                       [Declare]
11 declared files selected • 1 remains local
[Review work and capacity]

Review work: initial packet ingest       Full-workflow operations: 1
Files: 11 / 250 available → 239          Pages reserved: 400 → 2100
Storage: 18 MB + displayed processing reserve; shared overflow: 0
No charge now. Product-failure restoration: exact reserved allocation.
[Back to files] [Start this work]
```

## CW-03 — Continuous individual review

Action Center keeps its five existing queues. Add a projection grouping them by exact upstream cause and affected work objective, with counts for Decisions, Sources, Jobs and blocked outputs. A group is a navigation aid and has no approval authority. Show the user the business question, source context and consequence before the first item; pin this context across sequential items to avoid repeated navigation.

Each item shows exact object/version, material change, relevant evidence/locator, existing rationale (when reusable), consequence, and `Confirm this item and next`, `Edit`, `Defer` or `Skip unchanged`. Confirm calls the existing exact typed Decision endpoint once for that item. `Use this rationale as a draft for the following items` is an explicit prefill; the user still inspects and submits each item. Never reuse a Decision, grant or signature across versions. “Skip unchanged” is offered only with exact unchanged basis/decision proof and creates no new approval; changed items remain queued.

After each command, persist progress against immutable item IDs/versions. If the next item's basis changes, reload its diff and require review; preserve the previous successful submissions. Exiting/refreshing resumes at the first unresolved item. Defer records reason/next action and cannot satisfy the underlying control. Keyboard focus returns to the next item heading, not a preselected approve button.

```text
Review: FY2025 legal adjustment • 2 of 4 • 1 saved
Pinned source / exact locator | Current item / version / consequence
Original 0.6 → accepted 0.6   | Fact disposition pending
Rationale draft: one-time settlement; internal purpose only
[Inspect evidence] [Edit rationale] [Defer] [Confirm this item and next]
```

Root-cause recovery recommends the first **executable** unmet dependency: supply source → resolve fact/assumption/conflict → recalculate → regenerate → QC/review → reconsider external authorization. Group sibling objects only for display; typed commands remain scoped. Show downstream actions as waiting on their named prerequisite, instead of offering an action that must fail. Existing unaffected decisions/results are retained only under exact dependency validity proof.

For paused work, `Resume Deal` changes workspace posture; it does not restart Jobs automatically. Each preserved blocked Job shows `Continue this work` using `create_job_posture_recovery`; changed input shows `Review changed scope` and a new Operation Preview. Rights/security/business blockers display their specific next action; generic retry is absent.

## CW-04 — Find work across one Deal

Persistent shell includes `Search this Deal` with Ctrl/Cmd+K when focus is outside editable fields. On narrow screens it is a labeled navigation action. Search covers permitted current Sources/Evidence, Claims/Facts, Analyses, Deliverables/Revisions, Bids, Process Events and Open Items; History is an explicit filter. It never searches another Deal or Account and is not a chat surface.

Results show object type, title/short allowed excerpt, matched location, exact version/date, current/historical posture and affected work context. Opening a hit navigates to the canonical object and exact locator; if it became superseded, preserve the requested historical location with a link to current. Reauthorize at query and open; deleted/restricted content is removed without leaking existence. Clear the input when switching Deals; browser history, URLs, analytics and logs must not retain the raw query.

Show coverage watermark, `Indexing N updated objects` and exclusions such as unsupported OCR or deliberately unindexed content. Zero hits during incomplete indexing reads `No matches in currently indexed content`; offer permitted collections and refresh. No claim of exhaustive search until coverage is complete. A direct known-object route remains usable regardless of search lag. Search results cannot supply authority for a Decision or Impact closure.

```text
Search this Deal [legal adjustment             ] [Current ▾] [Types ▾]
Coverage: complete through change 128 • 2 later objects indexing
Fact · FY2025 legal expense · v2 · current · Evidence ADJ row 2
Workbook · Adjustment bridge · r3 · current · Adjustments/C2
CIM · Normalization · r2 · historical · slide 8  [View exact version]
```

## CW-05 — Correct materials already used externally

An Impact requiring external correction opens a recipient-specific worklist for exact superseded Revision(s). Combine existing authorized deliveries, observed product access and Banker-recorded actual-use events. Distinguish `authorized, no use recorded`, `first byte served`, `download completed`, `Banker recorded sent` and `unknown off-platform use`; none proves that a person read or understood the material. Include known off-platform recipients only from explicit records; state coverage limits.

Each row is an existing Open Item with typed links to Impact, old/new Revision, External Recipient/explicit external party and relevant Delivery/Access/use events. The Banker chooses `Stop future access`, `Prepare corrected material`, `Record correction sent`, `Record withdrawal requested`, or `No action — reason required`. Do not auto-send email, mark external correction completed when merely authorized, or promise recall of downloaded bytes. Existing Access may be revoked before corrected content is available, including on Archived Deals.

A replacement Revision needs its own QC/readiness and exact External-Use Decision. Record a correction Process Event only on explicit Banker submission with occurred time, method, recipient, exact new/old Revision and evidence or declaration. `recorded` means the Banker's reported action, not verified recipient receipt. If acknowledgment is required by the selected correction plan, leave the item waiting until recorded acknowledgment evidence; otherwise show completion at recorded action with acknowledgment unknown. Recipient refusal/unreachable becomes unresolved with next action. `No action` is an explicit reasoned disposition, not hidden deletion from the list.

Per-recipient states: `needs_decision`, `awaiting_material`, `awaiting_action`, `awaiting_acknowledgment`, `completed_recorded`, `no_action_recorded`. Each state transition is appended as a typed resolution/event; current Open Item selection uses ETag. A group closes only when every known recipient row has a valid terminal disposition; adding a later-discovered recipient reopens the group without altering previous history.

```text
Correct external use · CIM r2 → r3 · 2 known recipients / coverage incomplete
A: first byte served; current access revoked  [Record correction sent]
B: authorized only; no use recorded           [Choose disposition]
Off-platform use: unknown                    [Add known actual use]
1 unresolved • no message has been sent by the product
```

## CW-06 — Sharing at realistic volume

Show suspended Access rows with exact Revision/recipient/reason and preserved context. After causes clear, `Review next access` follows CW-03; each resumption obtains its own exact grant under the expansion bucket. A common fresh Passkey check can support these separately issued short-lived grants only within its freshness window. Reauthentication preserves current row and already-completed results.

Revocation uses the separate revocation budget; `Revoke selected` is a queue of individual exact revocations with individual outcomes, or offers revoking their shared External-Use Decision when that is the user's intended scope. A429 pauses only unsent rows, shows Retry-After and preserves all completed rows. No grant grants authority over an arbitrary group. Archived Deals show `Stop access` directly, without reactivation/capacity purchase.

## CW-07 — Layout changes, permissions do not

Full (≥1280px), compact (1024–1279px) and narrow (<1024px) layouts expose the same permitted Web tasks. At narrow width and 200% zoom, Source intake, Evidence review, material Decision, stage change, new internal export and external-use/access review remain possible through stacked steps. Entitlement, posture and content gates determine permission; CSS width never determines business authority.

Dense comparisons provide a column selector and labeled horizontal scrolling inside the table, plus a stacked row-detail view. Evidence and Decision can use `Evidence` / `Decision` panels sharing a pinned exact version and return position; no decision submission is enabled until required context has been available for inspection under the ordinary flow. Sticky actions cannot cover content or error text. Native Office editing still uses the external supported native application; optional secure handoff is available on every layout when requested, not a mandatory escape from a Web action.

```text
390px / zoomed workspace
Deal Harbor • Review adjustment 2/4 [Search]
Exact version v2 • 1 saved
[Evidence] [Decision] [Impact]
Scrollable content / preserved position
[Back] [Defer]
[Confirm this item and next]
```

Acceptance traverses the same completed intake → Evidence/Decision → new export and access-revocation tasks at 1280px and at 200% zoom producing <1024 CSS px, using keyboard and supported assistive technology. No `desktop_required` viewport error is permitted. Device API absence (for example a file picker limitation) offers an honest optional handoff while preserving progress; it does not claim desktop-only business permission.

## Acceptance scenarios

Require: mixed batch with shared declaration and one exception/one excluded undeclared row; under-limit preview plus stale digest;20 separate Decisions with partial completion and concurrent source change; source-gap-first root recovery; new Source not yet indexed; current/historical search hit; recipient correction with unknown usage and later-discovered recipient;20 Access resumptions and partial429; archived revocation without active capacity; narrow/zoomed completion with no action lost. Measure task completion, repeated navigation, abandoned drafts and queue/run waiting separately. These are design acceptance inputs; no usability study or browser implementation test is claimed.
