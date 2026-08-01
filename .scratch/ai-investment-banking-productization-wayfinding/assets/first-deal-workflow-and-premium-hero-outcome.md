# First End-to-End Deal Workflow and Premium Hero Outcome

**Decision date:** 2026-07-31  
**Launch context:** United States-first, English-only, premium Self-Serve Purchase for the Initial Design ICP  
**Official reference:** OpenAI-maintained Investment Banking plugin `v0.1.29`  
**Decision scope:** launch sequencing and coherent product organization; not go/no-go, competitor avoidance, detailed UI, production architecture, exact data implementation, final feature list, pricing, or the complete V1 specification

## 1. Decision

### Selected first workflow

Select the official **Sell-side auction** workflow as the end-to-end anchor for the Individual-First Release.

Its official lead is `cim-teardown`, composed as needed with `financials-normalizer`, `buyer-investor-list`, `deal-process-tracker`, `cim-builder`, `pitch-deck-builder`, `memo-builder`, and `ib-deck-qc`. The official route begins with a controlled seller/source packet, keeps seller claims distinct from verified evidence, produces banker-facing analysis and materials, converts an approved buyer universe into a live process tracker, and gates buyer-facing circulation through QC. (`references/plugin-routing-playbook.md:41-62`; `references/plugin-routing-map.json`, `sell_side_auction`)

### Premium Hero Outcome

Name the complete outcome:

> **Controlled Sell-Side Auction Deal Book** — one persistent Deal Workspace that turns an authorized source packet and the Individual Banker's approved judgments into a senior-review-ready, continuously refreshable sell-side execution package; keeps the evidence, financial definitions, claims, assumptions, buyer strategy, process state, banker-native materials, and QC record consistent through launch, outreach, bids, diligence, signing, and close/pause/archive; and can become a circulation candidate only after explicit human approval and all applicable gates.

This is one outcome, not a menu of tools. The banker should not have to reconstruct the deal context, re-upload the same evidence, manually trace every revised number across artifacts, or recreate the rationale for each process decision when the Deal state changes.

The product does **not** promise a successful sale, source buyer interest, operate the auction on the user's behalf, or replace banker, legal, accounting, tax, compliance, or other specialist judgment.

## 2. Reading rules

The sections below distinguish:

1. **Verified fact** — established by the installed official plugin, the three resolved Wayfinder decisions, or cited primary sources.
2. **Evidence-backed inference** — a bounded conclusion from those facts, used to compare launch sequence.
3. **Explicit design decision** — the product direction selected by this ticket.
4. **Unresolved downstream question** — intentionally owned by an existing later ticket.

The product will be built. The official plugin is the minimum capability baseline, not a competitor. Existing products neither veto this workflow nor determine which capabilities may exist.

## 3. Verified facts

### 3.1 Official workflow facts

- The official router defines ten transaction-level routes and requires one lead skill to own the first substantive judgment or hero artifact while support skills retain their own lanes. Human-readable hero artifacts come before support JSON, CSV, logs, and handoff payloads. (`references/plugin-routing-playbook.md:13-37`)
- The Sell-side auction route explicitly spans evidence-backed materials, buyer targeting, process tracking, diligence gating, buyer-facing content, and final-circulation QC. Its typed handoffs include teardown-to-memo, CIM-to-QC, and buyer-list-to-process-tracker. (`references/plugin-routing-playbook.md:41-62`)
- `cim-teardown` treats a CIM or seller package as a claim source rather than proof; it creates claims, evidence gaps, questions, red flags, kill tests, and a first-wave data request with stable identifiers. (`skills/cim-teardown/SKILL.md`, “Role / Non-Role,” “Fast Workflow,” and “Artifact Contract”)
- `financials-normalizer` preserves raw sources and creates traceable normalized statements, KPI schedules, adjustment/conflict/assumption logs, source mappings, and QA flags. It does not invent missing financials or silently select among conflicts. (`skills/financials-normalizer/SKILL.md`, “Non-negotiables” and “Produce the normalized package”)
- `buyer-investor-list` owns the evidence-backed buyer universe, tiers, waves, holds, and rationale; it does not claim live interest, relationship strength, contactability, or outreach completion. (`skills/buyer-investor-list/SKILL.md`, “Trigger Boundary” and “Artifact Contract”)
- `deal-process-tracker` owns the source-backed operating spine for outreach, NDA, access, diligence, bids, deadlines, issues, decisions, and change history. It does not send outreach, grant access, give legal advice, or silently overwrite prior state. (`skills/deal-process-tracker/SKILL.md`, “Trigger Boundary,” “Artifact Contract,” and “Source, Safety, And Evidence Posture”)
- `cim-builder` owns a source-aware buyer narrative and refreshable CIM/teaser/management-material package; buyer-facing claims, financials, KPIs, units, dates, and charts remain tied to evidence and downstream QC. (`skills/cim-builder/SKILL.md`, “Core posture,” “Required workflow,” and “Export contract to ib-deck-qc”)
- `ib-deck-qc` owns the final banker/client circulation assessment but does not build or rewrite the artifact unless remediation is explicitly authorized. Its postures distinguish client-ready, senior-review-ready, needs-targeted-fixes, not-circulable, and blocked. (`skills/ib-deck-qc/SKILL.md`, “Purpose,” “Banker circulation ownership,” and “Decide the review posture”)
- Across the official baseline, AI reasoning, deterministic computation, and human judgment are separate control planes. External communication, data-room permissioning, legal interpretation, material judgment, and final circulation require explicit human action. [Official Investment Banking Capability Baseline](official-investment-banking-capability-baseline.md), §§5.5 and 6.

### 3.2 Confirmed Founder Operating Envelope

- A solo full-time founder supplies no human Investment Banking review, founder sales, interviews, warm-network access, banker advisors, manual pilots, implementation service, high-touch Customer Success, or bespoke deal fulfillment.
- AI may perform provider-side execution, checks, and boundary warnings. The Individual Banker retains material assumptions, professional judgment, and external-use approval.
- Discovery, evaluation, purchase, onboarding, first value, and routine support must be self-serve or asynchronous.
- The first release is United States-first and English-only.
- The release must complete one coherent Core Business Workflow in a persistent Deal Workspace; it cannot be a chatbot, prompt wrapper, preorder, demo, or disconnected tool menu.
- Confidential Deal Materials cannot be accepted until the minimum technical security boundary is in place; before then, use is limited to public, synthetic, or de-identified materials.
- Budget, cost, timing, and revenue targets are deliberately unconstrained and therefore do not justify shrinking the workflow into a point tool.

Source: [Define the Founder Operating Envelope for a Premium Self-Serve Product](../issues/02-define-founder-operating-envelope.md), answer.

### 3.3 Initial Design ICP and workflow facts

- The Initial Design ICP is the execution owner who personally produces or reviews models, marketing materials, diligence work, process trackers, or decision memoranda, works across multiple stages in a small team, and faces repeated revision pressure.
- The qualifying user must have both purchase authority and permission to use the intended materials. Ability to enter a card is not permission to upload confidential deal data.
- The work is an event-driven, multi-month sequence of source collection, analysis, native artifact production, review, circulation, and revision — not a daily chat habit or one linear document-generation job.
- The durable value chain is `source → evidence → assumption → calculation → artifact → review or decision` across repeated changes to the same Deal.
- FINRA's current Series 79 outline covers the broad sell-side spine: company and financial analysis, valuation, buyer analysis, teaser and confidential materials, confidentiality agreements, bidding instructions, management presentations, indications of interest, data rooms, diligence, final bids and LOIs, agreements, signing, closing conditions, and transaction communications. [FINRA Series 79 page](https://www.finra.org/registration-exams-ce/qualification-exams/series79); [FINRA Series 79 Content Outline, revised October 2025](https://www.finra.org/sites/default/files/2025-10/Series_79_Content_Outline.pdf).
- Public workflow evidence supports repeated Deal-state changes from kickoff and source receipt through drafts, buyer/process events, bids, diligence, agreements, closing, and archive. It does not establish time allocation, willingness to pay, or the best launch workflow by itself.
- Premium value is plausible when work affects price, terms, financing, client or committee advice; stays consistent across multiple banker-native artifacts; recurs through a deadline-driven process; and requires evidence, calculation, review, and version records. Public pricing evidence supports carrying the premium self-serve premise forward but does not set price or prove willingness to pay.

Source: [Initial ICP Workflow and Self-Serve Purchase Context](initial-icp-workflow-and-self-serve-purchase-context.md), §§2–4 and 8.

## 4. Evidence-backed launch-sequencing inference

### 4.1 Comparison criteria

The launch comparison uses five product-organization questions:

1. Does the route complete a material source-to-decision chain rather than only one artifact or calculation?
2. Does the route naturally create repeated use from Deal-state changes inside one persistent workspace?
3. Does it match a cross-stage M&A execution owner at a boutique, small/midsize advisory firm, or independent transaction practice?
4. Can the product provide the outcome self-serve without provider-side banker service or mandatory enterprise procurement?
5. Can AI and deterministic engines do substantial execution while material judgment, legal boundaries, and external use remain visibly under banker control?

These criteria sequence the official routes. They do not decide whether the product or any capability will exist.

### 4.2 Assessment of all ten official routes

| Official workflow | Launch-sequence position | Evidence-backed assessment |
|---|---|---|
| **Sell-side auction** | **First-release anchor** | Strongest match to the Initial Design ICP's cross-stage responsibilities and the persistent Deal Workspace. It connects sources, diligence, financial normalization, buyer strategy, buyer-facing materials, process tracking, repeated Deal events, and circulation QC into one commercially meaningful result. |
| **Model update** | **Embedded in the first release; later exposed as a standalone route** | High-frequency and self-serve-friendly, and essential when new actuals, forecasts, or source versions arrive. It is a foundational capability inside Sell-side auction, but its standalone hero is a workbook update, not a complete source-to-external-decision workflow. It must not become the launch point tool. |
| **Sponsor buy-side** | **First major workflow expansion** | Reuses seller-material teardown, normalization, evidence, models, scenarios, audit, and memo primitives. It can support a premium diligence/model outcome, but its natural endpoint often becomes sponsor-owned IC work rather than bank-side M&A execution, and it requires heavier LBO/valuation/financing judgment. |
| **Deal committee** | **Early synthesis expansion after upstream analysis exists** | High-value decision output and strong reuse of source, model, scenario, memo, and QC controls. It is downstream by design: the memo owner must import analysis rather than invent it, so it is not the best first end-to-end anchor. |
| **Board package** | **Early synthesis expansion after upstream analysis exists** | Important banker-native outcome with strong evidence and QC requirements, but it packages analysis produced elsewhere. Board, fiduciary, fairness, privilege, and final-circulation boundaries also increase dependence on institutional review. |
| **LevFin financing** | **Capital-structure expansion** | Premium, calculation-heavy, and useful to acquisition and refinancing work, but it splits issuer advice, lender approval, covenant/legal analysis, and committee posture. The first user segment is broader M&A execution rather than a LevFin specialist, and terms/document inputs are more specialized. |
| **DCM** | **Capital-markets expansion after financing primitives** | Reuses issuance, credit, covenant, scenario, memo, and audit capabilities. Launch dependence on timestamped rates/spreads, ratings context, debt documents, and lender/issuer posture makes it a narrower and more connector-sensitive first anchor. |
| **ECM** | **Capital-markets expansion after public-market data controls** | Provides a premium issuer/board outcome but depends on current market data, dilution/proceeds support, disclosure posture, MNPI/wall-crossing boundaries, and syndicate/issuer context. It is less aligned with the initial boutique M&A execution ICP. |
| **Fairness committee support** | **Specialized controlled expansion** | High-stakes and valuable, but the official route is deliberately support-only: it must not provide a fairness opinion and requires valuation/model tie-out, committee controls, and final QC. Institutional process and regulated-professional boundaries make it unsuitable as the self-serve entry workflow. |
| **Restructuring pitch** | **Specialized controlled expansion** | Can create exceptional premium value, but requires distinct legal-entitlement, negotiated-plan, collateral/liquidation, and enterprise-value cases; lien, guaranty, collateral, intercreditor, and bankruptcy questions demand specialist/legal review. It is narrower and riskier as the first solo-founder, no-high-touch route. |

### 4.3 Why Sell-side auction wins the first position

**Evidence-backed inference.** Sell-side auction is the only official route that simultaneously:

- matches the documented cross-stage work of the Initial Design ICP;
- begins with sources the banker already receives in a live mandate;
- produces multiple banker-native artifacts from one controlled evidence spine;
- creates repeated use from both analytical changes and process events;
- exposes the value of persistence, impact propagation, version history, and review state;
- supports an outcome large enough to justify premium positioning without adding unrelated capabilities;
- allows self-serve qualification and product proof without founder-led service; and
- keeps transaction decisions and external action visibly with the banker.

This is a sequencing advantage, not a claim that Sell-side auction is uncontested, universally most frequent, or proven to have the highest willingness to pay. No current evidence establishes those claims.

## 5. Explicit design decision: the first Deal Workspace

### 5.1 Triggering situation

The primary trigger is:

> An authorized sell-side mandate enters preparation and the Individual Banker receives the first usable management/source packet, existing materials, or VDR/data-room index that must be turned into a launchable and then continuously operated auction.

A pre-mandate or public/sanitized sample may demonstrate the product, but it does not count as the complete live hero outcome. A live workspace requires the banker to confirm purchase authority, data-use authority, transaction side/perimeter, and intended circulation posture.

### 5.2 User and buyer qualification

The first user and self-serve buyer is the same operational person:

- an execution-oriented Individual Banker at a boutique investment bank, small or midsize M&A advisory firm, or independent transaction advisory practice;
- personally accountable for producing or reviewing substantial parts of the sale process;
- able to carry the Deal across source, analysis, materials, buyer, tracker, and revision work rather than owning only a narrow specialist lane;
- authorized to purchase the software and to use the selected materials, connectors, models, and AI service under employer, client, confidentiality, and regulatory rules; and
- willing and able to approve material definitions, assumptions, judgments, buyer/process decisions, and external use.

Job title is not the qualification. A junior employee with a card but no data-use authority is not qualified for a confidential live workspace. An owner, principal, independent adviser, or appropriately authorized employee may be.

### 5.3 Controlling inputs

The workflow is controlled by five input groups:

1. **Mandate and Deal context:** seller/client, transaction perimeter, role, process objective, stage, audience, confidentiality posture, currency/units, key dates, and expected artifact/circulation posture.
2. **Deal source packet:** management financials and KPI schedules, budgets/forecasts, existing model and valuation support, QoE or other diligence reports when available, CIM/teaser/management materials, VDR index and documents, and public/market sources where relevant.
3. **Firm and artifact controls:** permitted templates, style/precedent materials, source/citation rules, review posture, file compatibility constraints, and explicit unsupported content.
4. **Buyer and process context:** approved or proposed universe, client preferences, do-not-contact/conflict/hold information, relationship and capacity evidence, process timetable, NDA/access/diligence/bid/meeting/deadline events, and current tracker state.
5. **Human decisions:** source perimeter, evidence treatment, financial definitions and adjustments, material assumptions, buyer tiers/waves/holds, story and disclosure framing, process decisions, remediation, and external-use approvals.

Missing controlling inputs do not license invention. The workflow must continue at a visibly lower readiness posture when useful, or stop at the exact blocked decision when a required input cannot be supplied.

### 5.4 Continuous Core Business Workflow

The first Deal Workspace must support this continuous business chain at the decision level:

1. **Establish the mandate and source perimeter.** Record the transaction, role, stage, source versions, permissions, dates, units, confidentiality, intended audience, and route.
2. **Test the source packet before reliance.** Extract atomic claims, classify evidence, surface conflicts/staleness, normalize financials and KPIs, identify red flags, and generate the first-wave data request.
3. **Obtain banker control decisions.** Present material definitions, adjustments, assumptions, unresolved conflicts, story choices, buyer criteria, and readiness blockers for acceptance, revision, or rejection.
4. **Build the sale thesis and execution package.** Produce or refresh the evidence-backed equity story, CIM/teaser/management-material plan or native artifact, buyer universe, process plan, and decision memo required by the current stage.
5. **Tie out and gate the package.** Reconcile material numbers, definitions, units, dates, claims, model outputs, charts, sources, footnotes, and cross-artifact consistency; assign a readiness posture and remediation list.
6. **Require explicit external-use control.** The banker approves the relevant material, buyer wave, message, access, or process decision. The product does not send, grant, circulate, or represent approval by itself.
7. **Capture the next Deal-state event.** Import or record new evidence, comments, buyer/process changes, bids, diligence findings, agreement milestones, or closing conditions without overwriting prior state.
8. **Propagate impact and refresh.** Identify affected claims, metrics, assumptions, calculations, buyer logic, tracker rows, artifacts, decisions, and QC status; regenerate only after preserving the prior version and required approvals.
9. **Close the loop.** At launch, IOI/bid, LOI/exclusivity, confirmatory diligence, signing/closing, pause, or termination, produce the current decision package, unresolved-item record, and export/archive posture.

The continuous loop is:

`Deal event → source/evidence delta → affected assumptions/calculations → affected native artifacts/process state → AI/deterministic checks → banker decision → authorized external action → next Deal event`.

### 5.5 Intermediate artifacts

These are workflow artifacts, not a detailed UI or final feature list:

| Stage | Intermediate artifact or controlled state | Why it exists |
|---|---|---|
| Intake | Mandate/route record, source register, version and permission record | Defines what may control the work and at what readiness posture |
| Source testing | Claims/evidence ledger, red-flag and diligence report, first-wave data request | Prevents seller claims or extracted text from becoming unsupported fact |
| Financial control | Normalized financials/KPI package, mapping, adjustment/conflict/assumption logs, checks | Makes downstream numbers reproducible and reviewable |
| Story and materials | Equity-story spine, CIM/teaser/management-material plan or native draft, source log | Converts controlled analysis into banker-usable buyer material |
| Buyer strategy | Ranked buyer universe, rationale, tiers/waves, holds/exclusions, validation needs | Supports banker judgment without fabricating interest or permission |
| Process operation | Buyer/process tracker covering outreach, NDA, access, diligence, meetings, bids, deadlines, issues, and change history | Preserves the live operating state and creates repeat-use triggers |
| Decision gates | Launch/wave/bid/LOI/diligence/signing/closing memo or decision record as needed | Makes the requested decision, evidence, caveats, and next action explicit |
| Quality and use | QC report, key-number tie-outs, open-items/remediation log, artifact manifest, version/change record, external-use decision | Separates “generated” from “reviewed,” “circulation candidate,” and “authorized for use” |

### 5.6 Deal-state events that cause repeat use

Repeat use is driven by events, including:

- first source packet, a new VDR folder, or a corrected source version;
- monthly actuals, a new forecast, QoE findings, working-capital/debt-like-item changes, or a market-data refresh;
- management, client, senior-banker, legal, accounting, tax, or compliance comments;
- buyer universe approval, hold/conflict changes, or new relationship/capacity evidence;
- outreach-wave authorization, NDA execution, access change, management meeting, diligence request/response, or process-letter change;
- IOI, bid, bid revision, LOI, exclusivity decision, or financing update;
- diligence findings or agreement drafts that change economics, risks, terms, or disclosure;
- a missed deadline, stalled buyer, process re-cut, pause, restart, signing, closing, or termination; and
- any accepted/rejected assumption or remediation that changes a downstream artifact's readiness.

The retention hypothesis is not “the banker chats every day.” It is that the second and third meaningful Deal-state changes are materially cheaper and safer because the controlled history already exists.

### 5.7 Human-control and external-use boundary

**AI and deterministic engines may:**

- ingest and classify permitted sources;
- extract claims and metrics;
- normalize, reconcile, calculate, validate, and tie out;
- propose questions, red flags, assumptions, buyer rationale, waves, storylines, and process actions;
- draft and refresh native artifacts;
- detect cross-artifact impact and inconsistencies;
- assign a provisional readiness posture and recommend remediation.

**They may not silently:**

- upgrade seller or management claims into verified facts;
- choose material definitions, adjustments, assumptions, comparability, materiality, or transaction recommendations;
- claim buyer interest, relationship, contactability, capacity, commitment, or process status without evidence;
- resolve legal, tax, accounting, regulatory, fairness, fiduciary, confidentiality, covenant, or agreement questions;
- send outreach, grant/revoke VDR access, change a live process, accept a bid, select exclusivity, or circulate materials; or
- represent that a provider-side human banker reviewed or approved the work.

**The Individual Banker must control:**

- source and transaction perimeter;
- material definitions, adjustments, assumptions, overrides, and judgment;
- story/disclosure framing and sensitive-information staging;
- buyer inclusion, tier, wave, holds, conflicts, and process actions;
- whether blockers have been resolved sufficiently for the intended posture;
- every external-use decision.

Qualified legal, tax, accounting, regulatory, compliance, or other specialists retain their own professional conclusions. The product records their inputs or flags but does not impersonate them.

### 5.8 Why the complete result can justify premium Self-Serve Purchase

**Evidence-backed inference.** The Controlled Sell-Side Auction Deal Book can support premium value because it:

- covers work that affects transaction value, terms, buyer competition, process certainty, client advice, and professional credibility;
- compresses a multi-month, cross-artifact workflow rather than one isolated drafting task;
- reduces repeated source collection, re-entry, re-tie, version hunting, and manual impact tracing;
- preserves the audit trail needed to review why a number, claim, buyer, process status, or recommendation changed;
- produces editable banker-native work instead of an answer that must be rebuilt elsewhere;
- protects senior review time by surfacing exact blockers, changes, and unresolved decisions;
- creates value again whenever the Deal state changes; and
- can be demonstrated and purchased without founder sales through an inspectable sanitized Deal Workspace, transparent file preflight, visible evidence/calculation lineage, native exports, explicit control gates, and clear product/data/support terms.

This decision does not set price, billing unit, trial, limits, overages, refund policy, or prove willingness to pay. It establishes that the **complete work accomplished** is substantial enough for the dedicated monetization ticket to design premium packaging without falling back to feature-count pricing or mandatory enterprise procurement.

## 6. Expansion path to the full Official Capability Baseline

This is a product-organization sequence, not the final release plan.

### Stage A — First-release anchor

Productize **Sell-side auction** around the Deal Workspace and the shared primitives it requires: source/evidence control, financial normalization, assumptions and calculations, banker-native artifact versions, buyer/process state, typed handoffs, QC, review decisions, and external-use control.

Embed **Model update** behavior wherever new financials, forecasts, model versions, or scenarios affect the sale process. Do not present it as a disconnected launch tool.

### Stage B — Reuse the M&A evidence and decision spine

- Add **Sponsor buy-side** by reusing teardown, normalization, evidence, valuation/model, scenario, audit, and memo primitives while changing the role, objective, decision gates, and model posture.
- Add **Deal committee** and **Board package** as controlled synthesis routes that consume validated upstream work rather than inventing analysis.
- Expose **Model update** as a standalone official route once workbook preservation, source-to-cell lineage, refresh impact, scenario updates, and model audit are reliable across deal types.

### Stage C — Add financing and public-market source primitives

- Add **LevFin financing** and **DCM** on shared financial/model foundations, then introduce instrument/facility, lender/issuer posture, private-credit, covenant, collateral, ratings, and timestamped market-data controls.
- Add **ECM** with issuer, dilution/proceeds, market-window, investor, disclosure, and public-market evidence controls.

### Stage D — Add specialized committee and distressed control planes

- Add **Fairness committee support** with strict “support, not opinion” posture, model/source tie-outs, committee records, and specialist-review gates.
- Add **Restructuring pitch** with distinct claim classes, lien/guarantor/collateral facts, covenant state, legal-entitlement versus negotiated-plan economics, recovery cases, and mandatory specialist/legal flags.

This sequence reaches all ten official routes and progressively activates the 21 focused official workflows. It does not remove any official capability, make competition a veto, or declare later workflows less valuable.

## 7. Explicitly rejected launch framings

The first release is **not**:

- a generic “ask your deal” chatbot;
- a menu exposing 21 official skills as separate tools;
- a CIM generator detached from evidence, process, and updates;
- a buyer-list generator that implies interest or relationship;
- a tracker with no source, analysis, or artifact chain;
- a model updater presented as the entire premium outcome;
- a founder-operated sell-side service or provider-side banker review;
- an autonomous outreach, VDR, circulation, bid, or closing agent;
- a fairness opinion, legal opinion, solvency opinion, or other regulated professional conclusion; or
- a competitor-whitespace bet whose scope changes when another product adds a feature.

## 8. Unresolved downstream questions

No new ticket is necessary. The selection makes existing downstream questions more precise:

- [Define the Deal Workspace Information Model and Lifecycle](../issues/05-define-deal-workspace-model-and-lifecycle.md) owns exact Deal objects, states, version/impact semantics, lifecycle, and single-user-to-team continuity.
- [Establish the Data Source, Access, and Confidentiality Boundary](../issues/06-establish-data-source-confidentiality-boundary.md) owns exact accepted files, connectors, licensed/public data, permissions, retention/deletion, and the confidential-material activation threshold.
- [Define the AI, Evidence, Deterministic Calculation, and Human-Control Contract](../issues/07-define-ai-evidence-human-control-contract.md) owns precise AI/deterministic/human responsibilities, lineage, abstention, overrides, evaluation, and control gates.
- [Define the Banker Deliverable and Quality Standard](../issues/08-define-banker-deliverable-quality-standard.md) owns exact native artifact fidelity, editability, tie-outs, readiness tiers, rendering, and circulation-quality acceptance.
- [Prototype the Self-Serve First-Value Journey](../issues/09-prototype-self-serve-first-value-journey.md) owns the concrete first-value interaction and structural product form; this ticket does not design UI.
- [Design Premium Monetization and Unit Economics](../issues/10-design-premium-monetization-and-unit-economics.md) owns price, value metric, billing unit, package, trial, limits, direct costs, margin, cancellation, and refund logic.
- [Design the Self-Serve Acquisition and Conversion System](../issues/11-design-self-serve-acquisition-and-conversion-system.md) owns discovery, trust proof, checkout, onboarding, activation, retention, expansion, and asynchronous feedback.
- [Confirm the V1 Productization Blueprint and `/to-spec` Boundary](../issues/12-confirm-v1-productization-blueprint.md) owns the final feature boundary, release sequence, acceptance criteria, risks, and handoff into specification.

This ticket does not decide detailed UI, production architecture, exact database or connector implementation, final feature list, final V1 scope, or implementation sequencing.

## 9. Source register and evidence limits

### Local authoritative sources

- [Official Investment Banking Capability Baseline](official-investment-banking-capability-baseline.md)
- [Define the Founder Operating Envelope for a Premium Self-Serve Product](../issues/02-define-founder-operating-envelope.md)
- [Initial ICP Workflow and Self-Serve Purchase Context](initial-icp-workflow-and-self-serve-purchase-context.md)
- Installed plugin router: `/Users/wxm/.codex/plugins/cache/openai-curated-remote/investment-banking/0.1.29/skills/investment-banking/SKILL.md`
- Installed workflow playbook and map: `/Users/wxm/.codex/plugins/cache/openai-curated-remote/investment-banking/0.1.29/references/plugin-routing-playbook.md` and `plugin-routing-map.json`
- Installed relevant focused skills: `cim-teardown`, `financials-normalizer`, `buyer-investor-list`, `deal-process-tracker`, `cim-builder`, `pitch-deck-builder`, `memo-builder`, and `ib-deck-qc`

### Current external primary sources reused or checked

- [FINRA Series 79 – Investment Banking Representative Exam](https://www.finra.org/registration-exams-ce/qualification-exams/series79)
- [FINRA Series 79 Content Outline, revised October 2025](https://www.finra.org/sites/default/files/2025-10/Series_79_Content_Outline.pdf)
- The primary and first-party workflow, regulatory, firm-role, product-mechanics, and pricing sources catalogued in [Initial ICP Workflow and Self-Serve Purchase Context](initial-icp-workflow-and-self-serve-purchase-context.md), §12

All external sources were accessed or rechecked on 2026-07-31.

### Evidence limits

- No representative task-time study establishes the exact workflow time saved.
- No evidence proves title-level purchase authority, confidential-data authority, willingness to pay, conversion, activation, retention, support load, or refund rate.
- The official plugin establishes workflow capability and boundaries, not production readiness, provider entitlement, data rights, product-market fit, or V1 scope.
- The Sell-side auction selection is therefore an explicit evidence-backed design decision. It must be tested through the allowed self-serve product behavior and telemetry, not interviews, founder sales, manual pilots, or provider-side banker service.

