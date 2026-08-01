# Official Investment Banking Capability Baseline as Product Requirements

**Installed reference inspected:** OpenAI-maintained Investment Banking plugin `v0.1.29`
**Inspection date:** 2026-07-31
**Plugin root:** `/Users/wxm/.codex/plugins/cache/openai-curated-remote/investment-banking/0.1.29`
**Purpose:** establish the official plugin as the minimum functional and quality baseline for a standalone Investment Banking product built around a persistent Deal Workspace.

## 1. Reading rules

This baseline deliberately separates three kinds of statements:

1. **Verified plugin fact** — directly established by the installed package, its schemas, scripts, or executed tests. Citations below are relative to the plugin root.
2. **Productization requirement** — an evidence-backed implication of those facts for a persistent, self-serve product. It is a requirement derived from the official capability baseline, not a claim that the plugin already implements the product surface.
3. **Not established** — a claim that cannot be made from the installed plugin and must not be smuggled into later product decisions.

The product's existence is a confirmed premise. This document does not perform competitor analysis, market-gap analysis, blue-ocean analysis, opportunity elimination, go/no-go analysis, or first-workflow selection.

## 2. Executive conclusion

### Verified plugin fact

The official plugin is not a generic finance chatbot. It is a routed system of:

- **21 user-facing focused workflow owners**, with the narrowest matching skill expected to lead;
- **10 transaction-level routing patterns** that compose one lead workflow with necessary support lanes;
- **5 semantic source categories** with run-specific source resolution;
- **6 internal support capabilities** that are not selectable workflow owners;
- **17 schema-backed cross-workflow handoff contracts**;
- a shared evidence taxonomy, source/conflict/freshness rules, artifact hierarchy, banker-runtime readiness model, and final-circulation QC boundary;
- deterministic builders, calculators, materializers, validators, and audit screens that support — but do not replace — banker judgment.

The router explicitly says the focused skill owns the user-facing deliverable, the router alone does not execute it, broad workflows must choose a lead, and support capabilities are loaded only when needed. (`skills/investment-banking/SKILL.md:10-14`, `skills/investment-banking/SKILL.md:173-191`)

### Productization requirement

The standalone product must preserve that operating model while replacing ephemeral file-to-file orchestration with a persistent **Deal Workspace**:

> one deal context, a controlled source universe, reusable evidence and assumptions, composable workflow runs, deterministic calculation records, banker-readable deliverables, explicit readiness gates, and human-controlled decisions.

The minimum product baseline is therefore not “chat plus file upload.” It is a governed deal execution system in which every material conclusion can be traced from source, through evidence and calculation, into a reviewable deliverable and a named human decision.

### Not established

The plugin does not establish product-market fit, willingness to pay, the first workflow to launch, production architecture, live provider entitlement, data rights, security controls, collaboration semantics, or that its installed runtime is defect-free.

## 3. Verified package perimeter

### 3.1 Entry points, dependencies, and visibility

- The package metadata identifies the plugin as `investment-banking`, version `0.1.29`, maintained by OpenAI, with Interactive, Read, and Write capabilities. (`.codex-plugin/plugin.json:2-10`, `.codex-plugin/plugin.json:40-52`)
- The router enumerates exactly 21 focused workflow skills; `user-context` and the test helper are outside that set. (`skills/investment-banking/SKILL.md:27-119`)
- Six additional capabilities are intentionally internal: `dashboard-builder`, `financial-source-of-truth`, `excel-data-cleaner`, `style-guide-adapter`, `daloopa-provider-guide`, and `quartr-provider-guide`. They are not selectable workflow owners; the root router may coordinate an explicitly requested support-only task. (`skills/investment-banking/internal-support/policy.md:3-32`)
- `.app.json` declares 12 possible app dependencies: Slack, FactSet, LSEG, S&P, PitchBook, Moody's, Third Bridge, Daloopa, Quartr, Datasite, Google Drive, and Gmail. Declaration is not proof that any route is callable in the current run. (`.app.json:2-38`, `references/workflow-source-resolution.md:3-7`)
- The package declares 23 visible `SKILL.md` entrypoints in total and keeps the six internal supports out of the visible entrypoint set; this boundary is test-enforced. (`tests/test_plugin_routing_playbook.py:159-170`)

### 3.2 Invocation and routing boundary

The router admits requests for core investment-banking execution — transaction analysis, valuation/modeling, materials, process work, credit/capital-markets work, and banker QA — and rejects casual finance conversation or tasks with no banker-workflow intent. (`references/invocation-policy.md:5-10`, `references/invocation-policy.md:20-22`)

For broad requests it chooses the lead that owns the first substantive judgment or first hero artifact, assigns only necessary support lanes, produces the hero first, and validates required handoffs before downstream reliance. (`references/plugin-routing-playbook.md:13-37`, `references/plugin-routing-playbook.md:263-285`)

The ten transaction-level routes are:

| Transaction route | Lead owner | Typical composed support | Default hero shape |
|---|---|---|---|
| Sell-side auction | `cim-teardown` | normalizer, buyer list, tracker, CIM/deck/memo/QC | Diligence/readiness HTML; XLSX when execution tracking leads |
| Sponsor buy-side | `cim-teardown` | normalizer, LBO, comps, DCF, scenarios, memo, audit | Diligence HTML or banker-readable model |
| LevFin financing | `capital-markets-issuance` | private credit, covenant, scenarios, memo, audit | Financing workbook or recommendation report |
| ECM | `capital-markets-issuance` | tearsheet, comps, scenarios, memo, pitch, QC | Issuance report or dilution/proceeds workbook |
| DCM | `capital-markets-issuance` | private credit, covenant, scenarios, memo, audit | Alternatives workbook or issuer/lender report |
| Board package | `memo-builder` | pitch, model audit, QC, style | Board memo/report or native document/deck |
| Fairness committee support | `memo-builder` | comps, DCF, merger model, audit, pitch, QC | Committee report with valuation and model status |
| Restructuring pitch | `distressed-recovery-waterfall` | covenant, issuance, credit, pitch, memo, QC | Waterfall workbook or restructuring memo |
| Model update | `financials-normalizer` | cleaner, model builders, audit, scenarios, dashboard | Updated/model-ready workbook |
| Deal committee | `memo-builder` | teardown, tearsheet, meeting, models, scenarios, credit, QC | Decision-led committee report |

The detailed route cards and their source, quality, stop, and escalation gates are defined in the routing playbook. (`references/plugin-routing-playbook.md:41-261`) The routing-map schema requires every route to declare a lead, supporting skills, handoffs, artifact mode, hero and companion deliverables, source and quality gates, triggers, do-not-route conditions, escalation paths, and clarifying questions. (`schemas/plugin_routing_map.schema.json:6-45`, `schemas/plugin_routing_map.schema.json:49-102`)

### Productization requirement

Routing must be a persisted, inspectable **Route Decision**, not hidden prompt behavior. Every Deal Workspace run must record:

- detected transaction/workflow intent;
- chosen lead and support lanes;
- why the route was selected;
- source and quality gates;
- clarification or escalation events;
- expected hero artifact and required handoffs;
- route version and any human override.

## 4. Capability inventory: all 21 focused workflows

The table below records what each focused workflow owns, what it requires, what it calculates or validates deterministically, what it produces or hands off, and what remains judgment.

| Focused workflow | Verified owner and explicit boundary | Required context and evidence | Deterministic or mechanical support | Hero output and handoff | Human judgment that remains |
|---|---|---|---|---|---|
| `buyer-investor-list` | Owns ranked buyer/sponsor/lender/investor universes; does not claim live interest, relationship, contactability, or process status. (`skills/buyer-investor-list/SKILL.md:38-53`) | Mandate, target, objective, constraints, confidentiality, client preferences, DNC/hold status, dated evidence. | Scores and appends fields while preserving source rows; scoring is judgment support. (`skills/buyer-investor-list/SKILL.md:91-113`) | HTML prioritization report or XLSX scoring universe; strict handoff to tracker. (`skills/buyer-investor-list/SKILL.md:60-73`, `skills/buyer-investor-list/SKILL.md:97-108`) | Tiering, strategic fit, ability to transact, objections, relationship path, sequencing, and approval of holds. |
| `capital-markets-issuance` | Owns issuer-side instrument, size, timing, pricing, market window, investor strategy, and fallback; does not make lender decisions or legal conclusions. (`skills/capital-markets-issuance/SKILL.md:39-74`) | Issuer/public-private status, amount, use of proceeds, instrument scope, timing, timestamped market inputs. | Equity/debt/convertible issuance math; explicitly not issuance judgment. (`skills/capital-markets-issuance/SKILL.md:101-147`) | Issuance recommendation report/workbook; structured handoffs to private credit and covenant analysis. (`skills/capital-markets-issuance/SKILL.md:120-131`, `skills/capital-markets-issuance/SKILL.md:154-185`) | Market clearing, timing, instrument selection, investor strategy, fallback, and whether evidence supports circulation posture. |
| `cim-builder` | Owns creation/refresh of CIM, teaser, management presentation, and source pack; independent diligence teardown belongs elsewhere. (`skills/cim-builder/SKILL.md:38-71`) | Controlling source packet, evidence posture, audience, artifact mode, page/story requirements; no invented facts. | Builds standalone HTML plus page-plan workbook, or PPTX when presentation mode is selected. (`skills/cim-builder/SKILL.md:73-100`, `skills/cim-builder/SKILL.md:217-219`) | Polished CIM/storyboard or native deck plus source pack; mandatory QC handoff before circulation. (`skills/cim-builder/SKILL.md:55-64`, `skills/cim-builder/SKILL.md:160-199`) | Storyline, emphasis, audience framing, disclosure choices, unresolved-claim treatment, and approval for circulation. |
| `cim-teardown` | Owns seller-material claims ledger, gaps, questions, red flags, underwriting readout; not CIM writing, full modeling, generic summary, or legal advice. (`skills/cim-teardown/SKILL.md:39-70`) | At least one identifiable seller artifact and deal/company; seller claims remain claims until corroborated. | Scaffolds and validates plan, HTML, ledgers, manifest, links/citations/math; does not parse the CIM on behalf of the analyst. (`skills/cim-teardown/SKILL.md:125-169`) | Standalone diligence/IC HTML with stable claim/question/red-flag/task IDs; handoffs to memo and model builders. (`skills/cim-teardown/SKILL.md:89-117`, `skills/cim-teardown/SKILL.md:149-161`) | Recommendation, kill tests, red-flag materiality, ranked diligence questions, and underwriting implications. |
| `company-tearsheet` | Owns factual issuer/borrower/target/counterparty baseline; not a full memo, model, deck, diligence report, or recommendation. (`skills/company-tearsheet/SKILL.md:50-56`) | Entity identity, mandate context, dated public/deal/relationship evidence, stale/conflict flags. | Validates structured JSON and can create support Markdown/handoff. (`skills/company-tearsheet/SKILL.md:99-124`) | HTML tearsheet or structured support package to memo builder. (`skills/company-tearsheet/SKILL.md:58-90`) | Which 4–5 metrics and recent developments matter, what gaps block use, and the next route. |
| `comps-valuation` | Focused contract owns trading comps, peers, multiples, EV bridge, implied value, refresh, and QA; it excludes DCF/LBO/merger/three-statement work. (`skills/comps-valuation/SKILL.md:37-50`) | Pricing date, diluted shares, EV bridge, denominator basis, estimates/vintage, FX, peer rationale, source and period. (`skills/comps-valuation/references/workflow-and-qa.md:24-48`) | Builds report/template and performs a mechanical audit. (`skills/comps-valuation/SKILL.md:61-73`, `skills/comps-valuation/SKILL.md:100-111`) | HTML valuation report or XLSX comps workbook; semantic downstream use by valuation/model/memo/QC. | Peer inclusion/exclusion, comparability, multiple interpretation, outliers, valuation range, and readiness. The router's broader “precedent transactions” wording is not independently established by this focused runtime. |
| `covenant-package-analyzer` | Owns finance-side document definitions, baskets/leakage, EBITDA, headroom, and negotiation issues; not final legal interpretation. (`skills/covenant-package-analyzer/SKILL.md:39-62`) | Operative document universe and versions, defined terms, latest financials, amendments, basket usage, and counsel flags. | Document scanner and headroom calculator are triage aids only. (`skills/covenant-package-analyzer/SKILL.md:76-86`, `skills/covenant-package-analyzer/SKILL.md:150-155`) | HTML covenant memo or XLSX headroom/basket workbook; imports issuance/credit handoffs. (`skills/covenant-package-analyzer/SKILL.md:64-74`, `skills/covenant-package-analyzer/SKILL.md:93-149`) | Operative-document selection, definition interpretation, negotiation priority, legal escalation, and whether “headroom” may be presented as factual. |
| `dcf-model-builder` | Owns DCF/FCFF/FCFE, WACC, terminal value, EV-to-equity, per-share valuation; not comps-only, LBO, merger, audit, memo, or QC. (`skills/dcf-model-builder/SKILL.md:29-42`) | Source timeline, historicals, forecast drivers, WACC/terminal basis, bridge, scenarios, sensitivities. | Produces deterministic or bounded formula workbook, run log, manifest, and exact-cell model citations. (`skills/dcf-model-builder/SKILL.md:49-70`, `skills/dcf-model-builder/SKILL.md:105-107`) | `model.xlsx`; support-only plan/log/manifest/citations; can consume teardown-to-model handoff. | Forecast design, WACC and terminal support, scenario selection, valuation range, caveats, and readiness. |
| `deal-process-tracker` | Owns outreach/NDA/access/diligence/bid/deadline/status tracking; not initial universe creation, sending outreach, granting access, or legal advice. (`skills/deal-process-tracker/SKILL.md:38-60`) | Existing tracker, process artifacts, meetings, dated status evidence, buyer and meeting handoffs. | Builds and validates the operating workbook without silently overwriting prior sourced values. (`skills/deal-process-tracker/SKILL.md:77-108`, `skills/deal-process-tracker/SKILL.md:140-142`) | XLSX with Dashboard first tab and process modules; imports buyer-list and meeting deltas. (`skills/deal-process-tracker/SKILL.md:61-101`) | Status interpretation, qualitative signals, ownership, priorities, deadline consequences, and permission to take external action. |
| `distressed-recovery-waterfall` | Owns cap structure, claims/lien priority, value break, fulcrum, recoveries, and restructuring alternatives; not definitive legal advice. (`skills/distressed-recovery-waterfall/SKILL.md:38-69`) | Claims, liens, guarantors, collateral, valuation cases, legal/process stage, stakeholder perspective, dated sources. | Computes mechanical waterfalls; calculator is not legal, collateral, intercreditor, or plan analysis. (`skills/distressed-recovery-waterfall/SKILL.md:109-155`) | Recovery workbook or restructuring memo; handoffs to memo, pitch, and QC. (`skills/distressed-recovery-waterfall/SKILL.md:200-250`) | Claim priority, entitlement, negotiated plan economics, collateral treatment, fulcrum interpretation, stakeholder leverage, and recommendation. |
| `financials-normalizer` | Owns spreading, reconciliation, normalization, source mapping, and model-ready financial inputs; not generic cleanup. (`skills/financials-normalizer/SKILL.md:34-57`) | CIM/VDR/QoE/models, filings/statements/KPIs, native labels, period/unit/currency, source location, conflicts. | Normalizes extracted CSV/JSON and validates the package without modifying raw sources. (`skills/financials-normalizer/SKILL.md:77-143`) | XLSX with first-read summary, source index, normalized statements/KPIs, adjustments, conflicts, assumptions, mapping, and checks. (`skills/financials-normalizer/SKILL.md:120-182`) | Definition mapping, normalization treatment, recurrence, conflict resolution, and downstream-use readiness. |
| `ib-deck-qc` | Owns final-circulation QC for numbers, units, dates, sources, charts, footnotes, consistency, and page takeaways; it does not build/rewrite unless remediation is authorized. (`skills/ib-deck-qc/SKILL.md:31-56`) | Controlling artifact plus source/model/support package; extraction is first pass, not proof of visual or model tie-out. | Extracts content, performs repeated-number/source/chart/style checks, and structures the issue log. (`skills/ib-deck-qc/SKILL.md:60-149`) | HTML QC report or annotated/native review with verdict, posture, issues, and remediation; imports CIM, pitch, distressed, and style packages. (`skills/ib-deck-qc/SKILL.md:206-238`) | Materiality, visual review, model tie-out, remediation sufficiency, and final circulation decision. |
| `lbo-model-build` | Owns sponsor acquisition model, sources and uses, debt/sweep/liquidity/covenants, IRR/MOIC/downside; not independent audit or legal covenant interpretation. (`skills/lbo-model-build/SKILL.md:30-45`) | Timeline, entry, cash, operating/tax/debt/exit assumptions, distinct EBITDA bases, financing support. | Builds deterministic model, run log, manifest, and exact-cell citations. (`skills/lbo-model-build/SKILL.md:51-60`) | `model.xlsx`; screening or underwriting posture; consumes teardown-to-model handoff. (`skills/lbo-model-build/SKILL.md:61-81`) | Financing case, operating plan, debt capacity, downside, exit, return interpretation, and underwriting readiness. |
| `meeting-prep` | Owns coverage/transaction/diligence meeting brief, live call sheet, debrief, and follow-up; not full memo/model/deck/tracker/QC. (`skills/meeting-prep/SKILL.md:51-83`) | Meeting objective/type/audience, attendees if known, deal/process/relationship/market/model evidence needed for that meeting only. | Builds HTML and DOCX companion; structures factual deltas and follow-ups. (`skills/meeting-prep/SKILL.md:121-145`, `skills/meeting-prep/SKILL.md:176-178`) | Meeting brief with objective, facts/assumptions, questions, pushbacks, guardrails, actions; handoffs to memo and tracker. | Question hierarchy, likely pushback, what not to say, qualitative signal, and whether a statement changes deal status. |
| `memo-builder` | Owns synthesis of existing owner analysis into banker/client/committee/board/lender/sponsor decision memo; not modeling, CIM, pitch, list, tracker, tearsheet, or final QC. (`skills/memo-builder/SKILL.md:40-73`) | Decision, audience, circulation posture, validated owner outputs, sources, models, assumptions, conflicts, open items. | Builds DOCX or HTML and validates imported structured packages. (`skills/memo-builder/SKILL.md:131-156`, `skills/memo-builder/SKILL.md:187-189`) | Formal DOCX, source-heavy HTML, or narrow inline note; imports tearsheet, meeting, CIM, distressed, and style contracts. | Recommendation, decision framing, risk prioritization, caveat prominence, and circulation approval. |
| `merger-model-builder` | Owns consideration, ownership, synergies, PPA, financing mix, and EPS accretion/dilution; not standalone DCF or LBO. (`skills/merger-model-builder/SKILL.md:32-52`) | Acquirer/target data, periods, transaction terms, consideration, financing, PPA, synergies, scenarios, sensitivities. | Builds deterministic or bounded formula workbook with exact-cell citations. (`skills/merger-model-builder/SKILL.md:68-86`, `skills/merger-model-builder/SKILL.md:127-129`) | `model.xlsx`; support plan/log/manifest/citations; consumes teardown-to-model handoff. | GAAP/PPA treatment, synergy provenance, financing assumptions, breakeven, scenario interpretation, and posture. |
| `model-audit-tieout` | Owns independent review of existing formulas, links, sources, assumptions, scenarios, and readiness; no new model and no remediation without authorization. (`skills/model-audit-tieout/SKILL.md:34-62`) | Source workbook, expected outputs, supporting sources, scope, materiality, and version. | Static script performs a mechanical screen only; the separate audit pack must not be confused with model readiness. (`skills/model-audit-tieout/SKILL.md:69-105`) | Separate XLSX audit pack with summary, output bridge, issue log, source tie-out, formula controls, model map, scope/evidence/limitations. | Whether issues are errors, material, decision-relevant, remediated, and sufficient for banker reliance. |
| `pitch-deck-builder` | Owns sell-side/financing/strategic/board-client storyline and page architecture; not full modeling/diligence or final circulation. (`skills/pitch-deck-builder/SKILL.md:39-47`) | Audience, objective, storyline, source register, key metrics/claims, model outputs, visual/style requirements. | Creates and validates source checklist, page plan/blueprint, storyboard, HTML fallback, and index. (`skills/pitch-deck-builder/SKILL.md:72-114`) | Editable PPTX when available, otherwise standalone HTML storyboard; structured QC handoff. (`skills/pitch-deck-builder/SKILL.md:49-70`, `skills/pitch-deck-builder/SKILL.md:116-154`) | Story arc, page-level message, visual choice, disclosure, claim prominence, and final circulation. |
| `private-credit-underwriting` | Owns lender proceed/decline/conditions, sizing, downside, liquidity, collateral/recovery, and committee synthesis; not issuer advice, legal interpretation, or sponsor-return modeling. (`skills/private-credit-underwriting/SKILL.md:39-64`) | Borrower/deal/decision/audience, period/currency/units, earnings and cash, structure, collateral, downside, source readiness. | Computes first-pass credit metrics; calculator is not credit judgment. (`skills/private-credit-underwriting/SKILL.md:168-181`) | HTML lender memo or XLSX capacity/liquidity/covenant/downside workbook; handoffs to covenant/distressed. (`skills/private-credit-underwriting/SKILL.md:79-136`, `skills/private-credit-underwriting/SKILL.md:152-167`) | EBITDA basis/haircuts, structure, rating, conditions, downside severity, collateral/recovery view, and credit recommendation. |
| `scenario-sensitivity-generator` | Owns cases, stresses, breakevens, and backsolves on an existing transaction model; does not build the base model and is not FP&A. (`skills/scenario-sensitivity-generator/SKILL.md:35-47`) | Supplied model, baseline classification, driver/output mapping, cases, constraints, materiality, source/assumption provenance. | Materializes workbook plus CSV/JSON support with placeholders rather than invented outputs. (`skills/scenario-sensitivity-generator/SKILL.md:49-100`) | XLSX pack with conclusion, basis/readiness, cases, overlays, matrices, breakpoints, actions, and target backsolve. (`skills/scenario-sensitivity-generator/SKILL.md:102-147`) | Which stresses matter, plausibility, breakpoint meaning, decision action, and whether the base model is suitable. |
| `three-statement-model-builder` | Owns integrated IS/BS/CF forecast, WC, PP&E/D&A, debt/sweep/liquidity/covenants/scenarios/checks; not audit, LBO, DCF, comps, merger, memo, or deck. (`skills/three-statement-model-builder/SKILL.md:29-42`) | Timeline, historicals, revenue/cost drivers, WC, PP&E, debt, tax, equity, scenarios, sensitivities. | Builds deterministic or formula workbook, log, manifest, and exact-cell citations. (`skills/three-statement-model-builder/SKILL.md:49-70`, `skills/three-statement-model-builder/SKILL.md:105-107`) | `model.xlsx`; support plan/log/manifest/citations; consumes teardown-to-model handoff. | Forecast architecture, assumptions, debt/liquidity treatment, covenant implications, scenario design, and readiness. |

## 5. Cross-cutting capability contracts

### 5.1 Source categories and provider boundary

#### Verified plugin fact

The five canonical source categories are:

1. Deal Materials
2. Process Updates
3. Relationship & Counterparty Context
4. Market Data & Public Sources
5. Models, Workbooks & Templates

The router requires only the categories needed for the active workflow, respects a user-named source first, treats app registration as non-evidence of availability, and uses the smallest native read as the readiness probe. (`skills/investment-banking/SKILL.md:121-145`, `references/workflow-source-resolution.md:3-22`)

Daloopa and Quartr provider guides load only after the category has been attempted, that provider has been selected, and a callable route is present. Their sequence requires explicit company/document/period selection, small bounded calls, and retained citations. (`skills/investment-banking/SKILL.md:147-154`, `skills/investment-banking/internal-support/daloopa-provider-guide/INTERNAL.md:3-41`, `skills/investment-banking/internal-support/quartr-provider-guide/INTERNAL.md:3-41`)

The optional `user-context` skill is explicit-only. Ordinary workflow runs must not silently inspect, initialize, or mutate saved context. (`skills/investment-banking/SKILL.md:156-160`, `skills/user-context/SKILL.md:61-71`) Its runtime contract also says setup-state is not proof of live readiness and the actual read belongs to the active workflow. (`skills/user-context/references/source-category-runtime.md:3-15`, `skills/user-context/references/source-category-runtime.md:39-41`)

There is a verified configuration inconsistency: `.app.json` declares dependency IDs only, while the separate static source-category config maps preferred apps/providers; Datasite is declared but is absent from the Deal Materials preferred-source list, and an installed test expects that mapping. (`.app.json:2-38`, `skills/user-context/plugin-author-config/source-category-config.json:1-58`, `tests/test_app_dependencies.py:17-35`)

#### Productization requirement

The Deal Workspace must have a first-class **Source Registry** with:

- source category, provider, object/document identity, version, as-of/access dates, page/cell/pointer, permission and confidentiality scope;
- connection declaration, authentication, entitlement, and run-readiness as separate states;
- user-selected source precedence and a visible fallback route;
- smallest-read readiness probes recorded per workflow run;
- document conflicts, staleness, limitations, and extraction confidence;
- source setup preferences outside deal data, with no silent inspection or mutation.

### 5.2 Evidence, conflict, and citation contract

#### Verified plugin fact

The evidence taxonomy preserves each workflow's native label and adds — without upgrading — a conservative canonical category:

`verified_fact`, `reported_fact`, `seller_claim`, `management_statement`, `pro_forma_adjustment`, `assumption`, `inference`, `estimate`, `stale`, `contradicted`, `unknown`. (`references/evidence-label-taxonomy.md:3-40`)

The taxonomy specifies precedence, crosswalks, and permitted language. (`references/evidence-label-taxonomy.md:42-175`) The evidence hierarchy prefers the source closest to the claim, treats a CIM as a seller-claim source rather than independent verification, and defines separate public, private-diligence, credit, and distressed hierarchies. (`skills/investment-banking/internal-support/financial-source-of-truth/references/evidence-hierarchy.md:3-54`, `skills/investment-banking/internal-support/financial-source-of-truth/references/evidence-hierarchy.md:76-91`)

Freshness and conflict records carry dates, status, treatment, confidence, and resolution workflow; conflicts may not be silently blended. (`skills/investment-banking/internal-support/financial-source-of-truth/references/staleness-and-conflicts.md:5-37`, `skills/investment-banking/internal-support/financial-source-of-truth/references/staleness-and-conflicts.md:51-99`)

Model citations require workbook, sheet, exact cell/range, metric, value/formula, source IDs, an assumption flag, and tie-out status. (`schemas/model_citations.schema.json:5-80`) The shared source gate hard-fails required-source postures when the source register or source/as-of details are missing. (`shared/source_gate.py:5-52`)

#### Productization requirement

The Deal Workspace must implement an immutable, versioned **Evidence Graph**:

`SourceRecord → EvidenceItem → Claim/Metric/Assumption → Calculation/ModelCell → Conclusion → DeliverableLocation`.

No material conclusion may be promoted to reviewer-ready or circulation-ready unless the chain is resolvable. Native evidence labels, canonical categories, conflicts, stale status, confidence, open items, and human overrides must remain visible and auditable.

### 5.3 Artifact and readiness contract

#### Verified plugin fact

The default is a banker-readable hero artifact first:

- XLSX for model-heavy or tracker-heavy work;
- standalone HTML for narrative, diligence, decision, and review work;
- native PPTX/DOCX when the requested surface and tooling support them;
- CSV, JSON, Markdown, manifests, logs, and handoff payloads as support artifacts, not the default hero. (`references/artifact-manifest-standard.md:3-17`, `references/deliverable-format-policy.md:3-53`)

Every artifact manifest captures the package, mode, hero, companions, support artifacts, statuses, final display order, and optional routing/process metadata. (`references/artifact-manifest-standard.md:19-89`, `schemas/artifact_manifest.schema.json:6-170`)

Readiness is explicitly tiered from instruction-only and deterministic support through banker-operational, senior-review-ready, and externally presentable, with blockers recorded separately. (`references/banker-runtime-readiness-standard.md:3-51`) Workbooks require a first visible Cover, Executive Summary, or Dashboard tab and cell-level source notes; HTML must be standalone, visually inspected, and point-of-use cited. (`references/workbook-first-tab-standard.md:3-52`, `references/html-artifact-standard.md:3-33`)

#### Productization requirement

The product must treat every output as a versioned **Deliverable Package**, not a loose download. The package must contain:

- hero artifact, companion artifacts, support artifacts, manifest, source/evidence register, calculation record, QC state, open items, and circulation caveats;
- explicit audience, purpose, artifact mode, version, owner, and readiness posture;
- an inspectable lifecycle: `working draft → analysis-ready → senior-review-ready → circulation-candidate → circulated`, with `blocked` available at every gate;
- separate states for mechanical validity, evidence sufficiency, banker judgment, visual review, and external-circulation approval.

### 5.4 Handoff and composability contract

#### Verified plugin fact

The plugin registers 17 structured handoff contracts covering:

- buyer and meeting events into the process tracker;
- tearsheet, meeting, CIM teardown, and distressed analysis into memo building;
- CIM and pitch packages into final deck QC;
- CIM teardown into model builders;
- style profile and style change log;
- issuance into private credit and covenant analysis;
- private credit into covenant and distressed analysis;
- distressed analysis into memo, pitch, and QC.

The contracts require exact canonical fields, preserve local fields and native labels, keep gaps explicit, and use strict validation before model, deck, committee, or client reliance. (`references/handoff-contracts.md:3-76`, `scripts/validate_handoff_payload.py:20-105`) Common components include source, evidence, key-number tie-out, claim, visual, and open-item records. (`references/handoff-contracts.md:31-45`) The test suite verifies that documented contracts have registered schemas and that valid fixtures pass while high-priority invalid fixtures fail. (`tests/test_handoff_contract_schema_coverage.py:98-112`, `tests/test_handoff_payload_validation.py:46-63`)

The distressed contracts additionally forbid collapsing legal-entitlement economics, negotiated-plan economics, collateral/liquidation waterfalls, and enterprise-value waterfalls. (`references/handoff-contracts.md:198-216`)

#### Productization requirement

Handoffs must become typed, versioned **Workflow Outputs** inside the Deal Workspace:

- producers and consumers reference stable deal object IDs rather than copying narrative blobs;
- schema version, producer run, source/evidence lineage, validation result, unresolved fields, and consuming runs are recorded;
- strict validation gates downstream model/deck/committee/client use;
- workflows may enrich a shared object but may not silently overwrite prior sourced values, native labels, or human decisions.

### 5.5 Deterministic computation and human-control boundary

#### Verified plugin fact

The package contains deterministic model builders, workbook builders, calculators, validators, and mechanical audit screens. Examples include DCF, LBO, merger, three-statement, issuance math, credit metrics, covenant headroom, recovery waterfalls, scenario materialization, financial normalization, process-tracker construction, artifact/handoff/model-citation validation, and model audit.

The focused skills repeatedly state that these scripts are not substitutes for banker judgment: buyer scoring does not determine targeting; issuance math does not determine market strategy; covenant scanners do not determine legal meaning; credit metrics do not make a credit decision; waterfalls do not determine legal entitlement; model audit scripts do not complete a judgmental tie-out. (`skills/buyer-investor-list/SKILL.md:109-113`, `skills/capital-markets-issuance/SKILL.md:144-147`, `skills/covenant-package-analyzer/SKILL.md:150-155`, `skills/private-credit-underwriting/SKILL.md:168-181`, `skills/distressed-recovery-waterfall/SKILL.md:150-155`, `skills/model-audit-tieout/SKILL.md:94-105`)

#### Productization requirement

The product must make three control planes explicit:

| Control plane | May do | Must not silently do |
|---|---|---|
| AI reasoning | extract, classify, map, synthesize, draft, propose routes/questions/cases, explain conflicts | upgrade evidence, invent facts/terms/interest, resolve material ambiguity, claim legal meaning, approve circulation |
| Deterministic engine | calculate, materialize, reconcile, validate schemas/formulas/tie-outs, reproduce outputs | choose assumptions, define comparability/materiality, make credit/investment/issuance recommendations |
| Human banker/reviewer | approve source perimeter, assumptions, definitions, overrides, recommendation, remediation, external use | lose lineage or overwrite prior decisions without an audit event |

Any human override must include actor, timestamp, old value/state, new value/state, reason, affected outputs, and whether revalidation is required.

### 5.6 Document-ingestion and visual-review boundary

#### Verified plugin fact

Shared ingestion directly supports plain text, CSV, Markdown, and DOCX. PDF extraction is heuristic and low-confidence; PDF files are marked as requiring OCR rather than being treated as fully parsed evidence. (`shared/document_ingestion.py:9-79`)

Deck QC's bundled extraction is first pass only. Visual review and model tie-out remain required before a circulation conclusion. (`skills/ib-deck-qc/SKILL.md:60-94`)

#### Productization requirement

The product must not treat “file uploaded” as “evidence available.” Ingestion requires per-page/per-sheet status:

`received → parsed → OCR/table extraction needed → normalized → human-verified → eligible for reliance`.

Visual review must be a first-class review event with rendered-page evidence, not a text-only proxy.

## 6. Deal Workspace reusable primitives

The following primitives are evidence-backed product abstractions. They are not a V1 sequence.

| Primitive | Minimum fields and behavior | Plugin basis |
|---|---|---|
| `Deal` / `MandateContext` | stable ID, transaction type, role/perspective, company perimeter, stage, objective, audience, confidentiality, currency/units, key dates | Routing and every focused workflow require explicit transaction/mandate context. |
| `RouteDecision` / `WorkflowRun` | lead, support lanes, route version, triggers, questions, source/quality gates, artifact plan, overrides, status | Router and routing schema. |
| `SourceRecord` / `SourceVersion` | provider, category, object/document identity, version, dates, pointer, permissions, confidentiality, readiness, extraction state | Five source categories, provider boundaries, source logs. |
| `EvidenceItem` / `Claim` | native label, canonical category, source, pointer, freshness, conflict, confidence, treatment, limitations | Evidence taxonomy and common handoff records. |
| `Assumption` / `Estimate` / `OpenItem` | owner, rationale, scope, status, due date, affected outputs, blocker state | Evidence taxonomy, artifact manifests, handoff contracts. |
| `MetricDefinition` / `MetricValue` | definition, period, segment, unit, scale, currency, reported/adjusted/normalized bases, source and calculation | Normalizer, model handoffs, key-number tie-outs. |
| `FinancialModel` / `CalculationRun` | model type/version, input set, formulas, cases, checks, workbook/sheet/cell citations, run log, deterministic engine version | Model builders, scenario generator, model-citation schema. |
| `Scenario` / `Sensitivity` / `Breakpoint` | baseline, change/overlay, output, breakeven, first failure, action, provenance | Scenario and model workflows. |
| `Party` / `Relationship` / `UniverseCandidate` | party identity, parent/platform, type, rationale, capacity evidence, relationship owner, confidentiality/DNC/conflict holds, wave/status | Buyer-list and tracker contracts. |
| `ProcessStage` / `Milestone` / `Task` / `Meeting` | stage, event, decision/signal, owner, due date, dependency, source note, qualitative-vs-factual distinction | Process tracker and meeting handoffs. |
| `Instrument` / `Facility` / `Tranche` | amount, terms, maturity, pricing, collateral, guarantees, ranking, evidence posture | Issuance, private-credit, covenant, distressed workflows. |
| `Covenant` / `Basket` / `ClaimClass` / `RecoveryCase` | operative definition/source, capacity/usage, legal-review flag, priority, collateral/guarantor, valuation case, recovery | Covenant and distressed contracts. |
| `DeliverablePackage` / `ArtifactRevision` | hero/companion/support roles, audience, posture, manifest, source/evidence register, citations, QC, open items, final order | Artifact and readiness standards. |
| `QCFinding` / `ReviewDecision` | category, location, severity/materiality, evidence, remediation, owner, status, circulation impact, approval | Model audit and deck QC. |
| `HandoffPayload` | contract/schema version, producer/consumer, stable IDs, validation mode/result, lineage, gaps, downstream uses | Seventeen handoff contracts. |
| `StyleProfile` / `StyleChangeLog` | style sources, provenance, scope, visual system, preserved elements, change impact, visual review | Internal style adapter contracts. |
| `UserPreference` / `SourceRouteConfirmation` | explicit-only, non-deal preference state; approval and current-run verification kept separate | User-context boundary. |

### Required object invariants

1. A material metric cannot exist without definition, period, unit/scale, value basis, and evidence or explicit assumption status.
2. A claim cannot become `verified_fact` merely because multiple secondary sources repeat it.
3. A model output cannot become reviewer-ready without exact delivered-workbook citations and visible checks.
4. A handoff cannot silently rename, drop, or collapse evidence bases.
5. A generated artifact cannot be circulation-ready solely because it rendered successfully.
6. A connector cannot be treated as ready solely because it appears in the app manifest.
7. External communication, data-room permissioning, legal interpretation, and final circulation always require an explicit human action.

## 7. Product requirements traceability baseline

The requirements below are minimum product requirements derived from the official plugin. They intentionally do not rank or sequence workflows.

| ID | Product requirement | Acceptance evidence |
|---|---|---|
| PR-01 | Persist one Deal Workspace as the authoritative context for all workflow runs and artifacts. | Stable deal ID connects sources, claims, metrics, models, process events, deliverables, and reviews without re-upload/re-entry. |
| PR-02 | Route every request to one visible lead workflow and only necessary support lanes. | Route Decision shows rationale, gates, expected hero, handoffs, and human override history. |
| PR-03 | Implement the five source categories with provider-independent source records. | Each source is categorized, versioned, permissioned, date-stamped, pointer-addressable, and run-readiness-tested. |
| PR-04 | Separate declaration, authentication, entitlement, and successful native read. | UI/API cannot label a provider “ready” from manifest presence alone. |
| PR-05 | Preserve evidence labels, freshness, conflicts, confidence, limitations, and source pointers end to end. | Any material claim can be traversed back to a precise source location or is visibly blocked/assumed. |
| PR-06 | Preserve metric bases and definitions rather than collapsing them. | Reported, adjusted, normalized, lender, covenant, and transaction EBITDA remain distinct with mappings. |
| PR-07 | Provide deterministic calculation and validation services alongside AI reasoning. | Re-running the same versioned inputs and engine reproduces calculations, checks, manifests, and citations. |
| PR-08 | Record exact workbook cell/range provenance for material model outputs. | Model citation validator passes against the delivered workbook, not an intermediate workbook. |
| PR-09 | Support all official hero shapes and keep support formats subordinate. | XLSX/HTML/PPTX/DOCX is selected by task surface; raw JSON/CSV/Markdown cannot accidentally become the default client artifact. |
| PR-10 | Package every output with manifest, source/evidence register, calculation record, open items, and readiness status. | A Deliverable Package is complete and its final display order is deterministic. |
| PR-11 | Enforce separate mechanical, evidence, judgment, visual, and circulation gates. | A successful build cannot bypass source, tie-out, visual, or senior-review blockers. |
| PR-12 | Implement the 17 official handoff contracts as typed, versioned workflow boundaries. | Strict schema validation passes before model/deck/committee/client use; lineage survives import. |
| PR-13 | Keep legal, market, relationship, and external-action boundaries explicit. | The system never fabricates interest/terms/contacts, interprets law as final, sends outreach, grants access, or circulates without human authorization. |
| PR-14 | Treat document ingestion as a quality-controlled pipeline. | PDF/OCR/table/page states and extraction confidence are visible; unsupported extraction cannot silently become evidence. |
| PR-15 | Make visual inspection first-class for client materials. | Rendered pages/slides, reviewer decision, findings, and remediation are attached to the artifact revision. |
| PR-16 | Preserve raw sources and prior sourced values. | Normalization, tracker imports, workflow enrichment, and overrides are non-destructive and auditable. |
| PR-17 | Make saved user context explicit-only and distinct from deal data. | No ordinary workflow silently reads/writes preference state; approval and current-run readiness are separate. |
| PR-18 | Expose installed-package/runtime integrity rather than masking it. | Build/version, test status, known incompatibilities, provider/config drift, and degraded modes are visible to operators. |

## 8. Executed validation and installed-package caveats

### Verified plugin fact

The package's full root test suite was executed on 2026-07-31 with:

```bash
PYTHONDONTWRITEBYTECODE=1 /opt/anaconda3/bin/python3 -m pytest -q
```

Environment: Python 3.13.5, pytest 8.4.1.

**Exact result: 161 passed, 36 failed, 1 skipped.**

The failures are not evidence that the plugin lacks all tested capabilities; they show that the installed package is internally inconsistent and cannot be described as a clean, production-validated runtime:

- the dominant failure cluster is stale `user-context` tests that expect an older state namespace and ordinary-workflow preflight behavior, while the current skill contract makes context explicit-only and forbids ordinary preflight;
- the app dependency test expects Datasite in the Deal Materials category mapping, while the static mapping omits it;
- several router, artifact-manifest, and output-depth tests assert wording or documentation contracts that have drifted;
- one optional XlsxWriter-dependent test is skipped.

The current model pipelines do emit workbook artifacts, manifests, run logs, and model citations; package tests exercise DCF, three-statement, LBO, and merger outputs and exact workbook citation paths. (`tests/test_model_builder_manifests.py:131-180`, `tests/test_model_builder_manifests.py:242-281`) An older runtime-gap fixture still says some of those citations are “planned,” so that fixture must not be treated as current authority. (`tests/fixtures/remaining_banker_runtime_gap_inventory.json:84-161`)

There is also a compatibility caveat outside the Python 3.13 full-suite result: `model-audit-tieout/scripts/audit_workbook.py` imports `datetime.UTC`, so its runtime test fails under the local Python 3.9 interpreter before executing the audit. (`skills/model-audit-tieout/scripts/audit_workbook.py:1-22`, `tests/test_runtime_light_builders.py:66-92`)

### Productization requirement

The product must carry an explicit capability/readiness matrix per release:

- supported workflow and artifact modes;
- deterministic engine and schema versions;
- tested Python/runtime/tooling versions;
- connector/config readiness;
- known degraded paths and incompatibilities;
- evidence of rendered-artifact and model-citation validation.

No feature should be marketed as production-ready merely because a skill instruction describes it.

## 9. Claims the official plugin does not establish

The installed plugin does **not** establish:

1. **Market or commercial truth:** demand, ICP, buying trigger, willingness to pay, price, retention, conversion, unit economics, channel, or competitive differentiation.
2. **V1 selection:** which workflow should launch first, which persona should be served first, or how the 21 workflows should be sequenced.
3. **Production SaaS architecture:** tenancy, database model, API design, job orchestration, observability, backups, disaster recovery, latency/SLA, or scaling limits.
4. **Security and governance completeness:** RBAC, deal-team sharing, information barriers, encryption/key management, retention/deletion, DLP, audit-log durability, residency, or compliance certification.
5. **Provider availability or data rights:** a declared app dependency is not authentication, entitlement, contractual reuse permission, coverage, freshness, or a successful live read.
6. **Autonomous external action:** the plugin does not authorize sending emails/outreach, granting data-room access, changing live process status, executing trades/financing, or circulating client materials.
7. **Legal, tax, accounting, regulatory, ratings, or fairness opinions:** it preserves specialist-review flags and escalation boundaries; it does not replace those decision makers. (`references/plugin-routing-playbook.md:287-295`)
8. **Factual live market demand, investor interest, lender approval, relationship strength, or contactability:** these remain sourced, timestamped, and human-verified judgments.
9. **Complete document understanding:** heuristic PDF extraction is not OCR/table reconstruction or human verification.
10. **Complete visual quality:** text extraction and deterministic checks are not page/slide-level visual review.
11. **Universal workflow coverage:** the 21 focused skills and 10 routes are a minimum official reference, not proof that every bank, product, jurisdiction, mandate, or edge case is covered.
12. **Uniform runtime maturity:** instruction completeness, deterministic helper availability, banker-operational readiness, and external-presentability are distinct states.
13. **A persistent Deal Workspace:** the plugin defines portable artifacts and handoffs, but does not itself provide durable deal objects, collaborative state, access control, workflow history, or a product UI.
14. **Quality superiority from generation alone:** correctness still depends on source perimeter, evidence posture, assumptions, calculation validity, banker review, visual inspection, and final approval.

## 10. Baseline acceptance statement

The official plugin establishes the minimum **capability vocabulary, workflow ownership, evidence discipline, artifact quality bar, calculation boundaries, handoff contracts, and human-control model** for the product.

A product is not equivalent to this baseline merely because it can answer the same prompts. It meets the baseline only when it can:

1. preserve one auditable deal context across the official workflow families;
2. resolve and version the relevant source universe;
3. keep facts, claims, assumptions, estimates, conflicts, and judgments distinct;
4. reproduce deterministic calculations and exact citations;
5. compose workflows through validated typed handoffs;
6. produce banker-native hero deliverables with explicit readiness and QC;
7. keep legal, external-action, provider, and circulation decisions under visible human control.

That is the capability-to-product-requirements baseline. Later tickets may decide operating envelope, ICP, first workflow, Deal Workspace lifecycle, data/confidentiality policy, AI-human control detail, quality standard, prototype, monetization, acquisition, and the final productization blueprint without re-litigating what the official plugin minimally demonstrates.
