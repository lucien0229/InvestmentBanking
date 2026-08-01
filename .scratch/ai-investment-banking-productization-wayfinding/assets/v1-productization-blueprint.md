# V1 Productization Blueprint

Status: Confirmed product authority for `/to-spec`  
Confirmation date: 2026-08-01  
Confirmed by: Product owner, through the live Ticket 12 HITL response `确认`  
Product: Independent, self-serve Investment Banking Web App  
First sellable workflow: Complete Sell-Side Auction for an execution-oriented Individual Banker  

## How to read this Blueprint

This Blueprint closes product discovery for the first sellable release. It defines the product that may enter `/to-spec`; it is not an implementation specification, production architecture, visual-design system, or claim that any Wayfinder prototype is production-ready.

The following labels are authoritative throughout this document:

- **Confirmed Decision** — directly fixed by the product owner or a resolved Ticket 1–11 contract.
- **Derived Synthesis** — the narrowest coherent integration of confirmed contracts; `/to-spec` may express it as requirements but may not replace it with a different product direction.
- **Product Design Decision** — a deliberately selected product or commercial behavior that remains subject to measured performance after launch.
- **Implementation-Deferred Choice** — an implementation decision that `/to-spec` or technical design may make without reopening product discovery.
- **Post-Launch Validation Hypothesis** — a proposition requiring this product's own purchase, usage, cost, support, retention, or channel evidence.
- **Out of Scope** — deliberately excluded from V1 or from the product promise.

When this Blueprint summarizes a resolved Ticket, the linked Ticket and asset retain authority over their exact detailed contract. If a summary appears ambiguous, read it in the way that preserves the linked contract rather than weakening it.

## Authority register

| Authority | Binding subject |
|---|---|
| [Domain Context](../../../CONTEXT.md) | Canonical domain language and invariants |
| [Wayfinder map](../map.md) | Destination, decisions, scope, and Ticket graph |
| [Ticket 1](../issues/01-establish-official-capability-product-requirements.md) and [Official Capability Baseline](official-investment-banking-capability-baseline.md) | Official plugin capability perimeter and productization requirements |
| [Ticket 2](../issues/02-define-founder-operating-envelope.md) | Founder operating envelope and non-service boundary |
| [Ticket 3](../issues/03-establish-initial-icp-workflow-and-purchase-context.md) and [ICP context](initial-icp-workflow-and-self-serve-purchase-context.md) | Initial Design ICP and self-serve purchase context |
| [Ticket 4](../issues/04-select-first-deal-workflow-and-hero-outcome.md) and [first Deal outcome](first-deal-workflow-and-premium-hero-outcome.md) | Sell-Side Auction and Controlled Deal Book selection |
| [Ticket 5](../issues/05-define-deal-workspace-model-and-lifecycle.md) | Deal Workspace domain and lifecycle state contracts |
| [Ticket 6](../issues/06-establish-data-source-confidentiality-boundary.md) and [source/confidentiality boundary](data-source-access-confidentiality-boundary.md) | Source, rights, confidentiality, retention, export, and deletion |
| [Ticket 7](../issues/07-define-ai-evidence-human-control-contract.md), [control contract](ai-deterministic-work-evidence-human-control-contract.md), and [source notes](ticket-7-authoritative-source-notes.md) | AI, deterministic, Evidence, Human-Control, and evaluation boundaries |
| [Ticket 8](../issues/08-define-banker-deliverable-quality-standard.md), [quality standard](banker-deliverable-and-quality-standard.md), and [source notes](ticket-8-authoritative-source-notes.md) | Controlled Auction Execution Package and artifact quality |
| [Ticket 9](../issues/09-prototype-self-serve-first-value-journey.md), [prototype verdict](self-serve-first-value-journey-verdict.md), and [throwaway prototype](self-serve-first-value-journey-prototype/README.md) | Validated C → A → B product form and first-value interaction |
| [Ticket 10](../issues/10-design-premium-monetization-and-unit-economics.md), [monetization contract](premium-self-serve-monetization-and-unit-economics.md), and [source notes](ticket-10-authoritative-source-notes.md) | Exact Individual package, price, capacity, guarantee, and unit economics |
| [Ticket 11](../issues/11-design-self-serve-acquisition-and-conversion-system.md), [acquisition contract](self-serve-acquisition-and-conversion-system.md), and [source notes](ticket-11-self-serve-acquisition-authoritative-source-notes.md) | Positioning, acquisition loops, conversion, activation, retention, and measurement |

## Contract closure audit

**Derived Synthesis.** The audit found no independent contradiction or research/prototype blocker that prevents `/to-spec`.

| Audit question | Closure result |
|---|---|
| Tickets 1–11 contradictions, omissions, term drift, or missing authority | No product contradiction. Three terminology drifts are normalized below. Every binding product behavior has a Ticket or owner confirmation. |
| Complete Official Capability Baseline versus V1 | Clearly separated: the baseline is the long-term minimum product vision; the first sellable release is one complete Sell-Side Auction. |
| Workspace, Deal Book, Package, Deliverable, Revision, artifact, reader consistency | Closed through the hierarchy defined in §4 and §7. |
| Source/confidentiality versus value, checkout, price, and acquisition | Closed: public proof is synthetic; real confidential work begins only after payment and passed preflight/security gates. |
| AI/deterministic/Human contract versus readiness/QC/external use | Closed: mechanical validity, professional usability, readiness, authorization, and actual use remain separate. |
| Prototype versus checkout, activation, guarantee, and retention | Closed: the prototype validates form and interaction only; Tickets 10–11 own commercial and lifecycle behavior. |
| Usage envelope versus Evidence/QC/correction/refresh | Closed: professional-control actions and product-failure recovery are unmetered. |
| Team expansion versus complete Individual value | Closed: Team adds organizational value and does not unlock the core package. |
| Product decisions blocking `/to-spec` | None after the owner's confirmation of this Blueprint. |
| Map `Not yet specified` | Fully closed by this Blueprint. |
| Unsupported new commitments | None. Every commitment below traces to a resolved Ticket or is explicitly labeled Derived Synthesis. |
| External promise ahead of security/correctness/file/evaluation capability | Prohibited. Relevant claims and real confidential use remain disabled until acceptance evidence exists. |

Terminology normalization:

1. `circulated` is not Deliverable Readiness. Readiness ends at `circulation-candidate`; an exact-Revision External-Use Decision and an actual Process Event are separate.
2. Any local `Senior-Review Candidate` wording maps to the canonical `analysis-ready`; it does not create an additional readiness state.
3. `reader copy` and `reader representation` mean the same exact-Revision **Reader Copy**, ordinarily PDF. It is not a separate Deliverable.

No ADR is required for this closure. This Blueprint integrates already confirmed product contracts and introduces no new surprising, hard-to-reverse architectural trade-off.

## 1. Executive Product Definition

### One-sentence definition

**Confirmed Decision.** For execution-oriented Individual Bankers running Sell-Side Auctions, the product is an independent, self-serve Web App that turns an authorized Source Packet into a persistent Controlled Sell-Side Auction Deal Book and a continuously refreshable Controlled Auction Execution Package: editable banker-native workbooks and materials with exact Evidence lineage, deterministic checks, QC/readiness, and Banker-controlled external use.

### Category

**Product Design Decision.** The primary category is **controlled sell-side auction execution workspace**. “AI for investment banking” may describe a mechanism but is not the category or the primary promise.

### Target user and buyer

**Confirmed Decision.** The Initial Design ICP is an execution-oriented Individual Banker at an overseas, initially United States, boutique investment bank, small or midsize M&A advisory firm, or independent transaction advisory practice who:

- can independently purchase the product;
- owns day-to-day Sell-Side Auction execution;
- can determine or confirm the permitted use of the relevant Deal materials; and
- does not require mandatory sales, implementation, live training, or a human Banker service from the founder.

Purchase authority and source/data-use authority are separate facts.

### Trigger

The product is triggered by a live or imminent Sell-Side Auction and, repeatedly, by any event that makes current Deal work uncertain or stale: a new mandate, incoming Source Packet, changed actuals or forecast, model/CIM mismatch, new Buyer or process event, approaching review, incoming Bid, exclusivity, signing, closing, or a return/reactivation event.

### Premium Job to Be Done

Keep the authorized source → Evidence → analysis/model → Native Artifact → Reader Copy → QC/readiness → external-use-control chain current, inspectable, editable, and recoverable through every material Sell-Side Auction event.

### Promise

**Confirmed Decision.** The product completes one controlled, continuing Sell-Side Auction business workflow. It preserves history, identifies the scope affected by change, regenerates only affected work, exposes blockers, and gives the Banker exact control over judgment and external use.

### Mechanism

- persistent Deal state;
- immutable Source Records and exact Evidence locators;
- typed Claim, Fact, Assumption, Decision, and process objects;
- reproducible Calculations and deterministic checks;
- Impact Assessment and targeted dependency propagation;
- immutable Deliverable Revisions;
- native/reader consistency, QC, and Package Readiness;
- exact-Revision External-Use Decision.

### Explicit non-promise

**Out of Scope.** The product does not replace the Banker, issue a fairness, valuation, solvency, legal, tax, accounting, credit, or other regulated professional opinion, guarantee a close or valuation, guarantee zero errors, create source rights, approve professional judgment, contact counterparties, grant data-room access, or execute an external action automatically.

### Long-term product vision

**Confirmed Decision.** The Official Capability Baseline is the complete long-term minimum vision for the Independent Product. It is not a competitor, PMF proof, WTP proof, or requirement to ship all 21 focused workflows in V1. The same controlled Deal Workspace foundation may later support the additional official workflows without breaking their source, Evidence, deterministic, artifact, or Human-Control contracts.

## 2. Product Form

**Confirmed Decision.** The product form is:

`C outcome-first public discovery → A guided first correct use → B persistent Deal Execution Desk`

### Independent Web App

The buyer discovers, evaluates, buys, onboards, uses, returns to, exports from, and closes the product through a standalone Web App. The official OpenAI plugin is a capability baseline, not a required runtime, acquisition channel, or user-facing dependency.

### Outcome-first discovery

The public surface starts with the complete controlled outcome and an inspectable synthetic Deal, not a blank prompt, feature menu, sales form, or confidential upload.

### Guided first correct use

The paid first-Deal path orders identity, authority, Source Packet, responsibility, Evidence inspection, Human Decision, deterministic closure, affected output, readiness, and export. It preserves necessary professional friction while removing prompt design and tool hunting.

### Persistent Deal Execution Desk

After first value, the Deal Workspace becomes the durable operating surface for Source intake, work queues, Evidence and Decisions, Analysis, package objects, QC/readiness, event history, Revision, export, archive, and reactivation.

### Role of AI in the interface

AI is a contextual execution capability inside governed work lanes. It may extract, classify, compare, draft, explain, propose, and flag. Its outputs retain Origin and never become Facts, professional judgments, or external-use authorizations merely because they appear fluent or complete.

### Why it is not a chatbot or one-shot generator

The authoritative objects are Deal, Source Record, Evidence, Decision, Model, Process Event, Deliverable, and Revision, not a conversation transcript. New sources and events return the user to the same Deal identity and produce Impact Assessment and new immutable Revisions rather than disconnected files or regenerated history.

## 3. Complete Sell-Side Auction Lifecycle

**Confirmed Decision.** The first sellable release supports the following lifecycle end to end.

| Stage or posture | Required product behavior |
|---|---|
| Initiated | Create exact Deal identity, sell-side role, perimeter, stage, intended use, currency/units, authority posture, initial source perimeter, and first work target. |
| Preparation | Inventory and normalize sources; build Evidence and Claim maps; perform applicable valuation/model work; prepare buyer universe, teaser, CIM, management materials, workbooks, QC, and Package Readiness. |
| In Market | Preserve Approved Buyers, Outreach Waves, NDA, Data-Room Access, diligence, meetings, milestones, and other Process Events without executing external actions. Keep package and sources current through revisions. |
| Bid Evaluation | Preserve exact IOI/Bid/LOI versions; compare economics, structure, conditions, financing, and timing; generate the controlled Bid Evaluation & Recommendation Memo; require a Human Decision for selection. |
| Exclusive Execution | Continue diligence, source/model/package refresh, issues, conditions, milestones, review, and exact external-use control through signing and closing preparation. |
| Signed | Record the supporting Process Event and preserve the exact signed posture; signing does not imply closing. |
| Closed | Record completion, final current package, history, exports, and archive options. |
| Terminated | Preserve a distinct end state and reason; do not present termination as closing. |
| Paused | Suspend active progression while retaining the last business stage and complete history; resumption explicitly returns to a stated stage. |
| Archived | Retain the Deal Workspace as a read-only record for search, Evidence inspection, download, export, and deletion; reactivation consumes Active Deal capacity. |

Deals may move backward when the real business process does. The prior state and supporting events remain historical.

Every material continuing event follows:

`new Source Record or Process Event → Impact Assessment → affected objects → recalculate / regenerate / re-review / block circulation → new immutable Revision`

## 4. Core Domain and State Model

### Product hierarchy

**Derived Synthesis.** The canonical hierarchy is:

`Deal → Deal Workspace → Controlled Sell-Side Auction Deal Book → Controlled Auction Execution Package → Deliverable → immutable Revision → Native Artifact + Reader Copy`

- **Deal** is the durable transaction mandate.
- **Deal Workspace** is the authoritative current and historical context for one Deal.
- **Controlled Sell-Side Auction Deal Book** is the governed current execution view of that Deal.
- **Controlled Auction Execution Package** is the versioned family of applicable Deliverables and control records within that Deal Book.
- **Deliverable** is a banker work-product business object.
- **Revision** is an immutable version of a Deliverable.
- **Native Artifact** is the editable or operational banker-format representation.
- **Reader Copy** is a fixed-format representation of the same Revision, ordinarily PDF.

### Source and proposition objects

- Source Material;
- Source Record;
- Source Packet;
- Evidence;
- Claim;
- Fact;
- Assumption.

A Source Packet defines a source perimeter; it does not make its content true, current, unconflicted, or authorized for external use. Evidence supports or challenges a proposition; it is not itself a Fact. A Human Decision approving an Assumption does not turn it into a Fact.

### Quantitative and analytical objects

- Calculation;
- Model;
- Scenario;
- Analysis.

Mechanical Validity and Professional Usability remain separate. A workbook is a Native Artifact of a Model or Analysis; it is not the domain object itself.

### Process objects

- Diligence Issue;
- Information Request;
- Open Item;
- Buyer Candidate;
- Approved Buyer;
- Outreach Wave;
- Process Event;
- NDA;
- Data-Room Access;
- Bid;
- Milestone.

Candidate, approval, contactability, outreach, NDA, access, bid receipt, selection, signing, and closing are distinct states or events. No inference or planned action may masquerade as an occurred external event.

### Control objects

- Review;
- QC Finding;
- Human Decision;
- External-Use Decision;
- Impact Assessment.

An External-Use Decision binds an exact object or Revision, audience, purpose, conditions, actor, and time. It never carries silently to a new Revision or different audience.

### Independent state families

| State family | Canonical behavior |
|---|---|
| Source | Authority, rights, confidentiality, freshness, conflict, disposition, parse/coverage, and Source Reliance remain explicit. |
| Analysis | Working, mechanically validated, professionally usable, senior-review-ready, or blocked, as applicable. |
| Deliverable | `working-draft → analysis-ready → senior-review-ready → circulation-candidate`, with `blocked` available at any gate. |
| Process | Event-supported outreach, NDA, access, diligence, Bid, selection, milestone, and business-stage postures. |

Package Readiness is an in-product aggregation and action surface over these independent states. It is not a scalar confidence score, new source of truth, professional approval, external-use authorization, or evidence that external use occurred.

## 5. V1 Source and Confidentiality Boundary

**Confirmed Decision.** V1 is upload/export-first, customer-controlled, connector-independent, and licensed-data-optional.

### Minimum viable source perimeter

1. Banker-entered Deal identity, role/side, stage, intended purpose/audience, currency/units, and authority context.
2. At least one authorized anchor source: CIM, management presentation, teaser, financial pack/model, diligence document, or bounded VDR export.
3. User-controlled or client/firm-authorized Deal Materials in supported formats.
4. User-exported Models, Workbooks, Templates, buyer/process trackers, Bids, and Process Updates when those workstreams are in scope.
5. Optional primary public/government/issuer sources retrieved for an exact purpose with URL, access/as-of date, version, and locator.
6. Optional customer-provided licensed-data exports only after source-specific storage, processing, AI, derivative-output, retention, attribution, and disclosure rights are confirmed.

An anchor source is sufficient to establish a Deal Workspace, Source Registry, Claim map, and gap plan. It is not sufficient by itself for the complete hero outcome.

### Supported file families

| Family | V1 posture | Material boundary |
|---|---|---|
| PDF | Required | Preserve original, render all pages, distinguish digital text and OCR, expose table/visual coverage and confidence. |
| PPTX | Required | Parse and render slides/notes/tables/charts where available; preserve objects and disclose missing fonts/media/links. |
| XLSX | Required | Preserve workbook, sheets, cells, formulas, cached values, labels, units, periods, hidden state, and link/macro indicators. |
| DOCX | Required | Preserve body, tables, headers/footers, notes, comments, and tracked-change posture; do not silently accept revisions. |
| CSV | Required | Preserve raw rows and native columns; expose encoding, delimiter, key, type, unit, and schema ambiguity. |
| ZIP/VDR export | Required convenience for supported members | Preserve container and member paths; block encrypted, malformed, executable, traversal, or unsupported members. |
| Individual email/process export | Bounded support | Accept `.eml` and PDF/CSV/XLSX exports; preserve exact headers, message identity, attachments, and point-in-time export context. |

V1 does not execute macros, refresh external workbook links, run embedded code, accept shared passwords, crack protection, or silently repair source values.

### Rights and connector boundary

- Purchase never creates source rights.
- Public access does not imply reuse, AI-processing, or redistribution authority.
- Customer-provided licensed data remains customer- and Deal-isolated and never becomes a pooled entitlement.
- No product-owned FactSet, LSEG, S&P Capital IQ, PitchBook, Moody's, Third Bridge, Daloopa, Quartr, Datasite, or equivalent licensed-data pool is required or included in V1.
- Live drive, email, chat, CRM, market-data, or VDR connectors are deferred.
- V1 never logs into, crawls, modifies, reorganizes, sends to, grants access within, or deletes from an external system.

### Confidentiality classes

- Public;
- Internal;
- Confidential Deal Material;
- Restricted Deal Material.

Classification attaches to Source Records and propagates restrictions to derived Evidence, Analysis, Deliverables, exports, and processing paths. A summary or extraction does not automatically become less confidential.

### Launch preconditions for real Deal Materials

Real Confidential or Restricted Deal Materials may enter the product only after all of the following are implemented and verified:

1. authenticated account access;
2. tenant/account isolation and Deal-level isolation;
3. encryption in transit and at rest;
4. secure credential and secret separation;
5. self-serve export and deletion;
6. audit events and exact Source Record provenance;
7. verified model/provider configuration that does not use customer Deal Materials to train shared models by default; and
8. accurate disclosure of subprocessors, processing paths, training, retention, deletion, support access, and exceptions.

Until then, only public, synthetic, or genuinely de-identified materials are allowed. These controls are launch blockers, not roadmap promises or marketing footnotes.

### Retention, export, deletion, and closure

- An active account may keep a Deal Active, Archived, exported, or deleted.
- Archival is not deletion.
- Deal export contains original permitted uploads, Source Registry, derived work, Deliverable Revisions, Decisions, and audit/provenance records, subject to licensed-data export restrictions.
- Deal deletion removes normal access immediately and begins active-system deletion within 30 days; ordinary encrypted backup copies expire within 90 days unless a disclosed preservation obligation applies.
- Account closure provides a default 30-day read-only export window and an immediate-delete option; the same deletion clocks then apply.
- Minimal non-content billing, security, or legal records may be retained only for a stated purpose and period and may not contain reusable Deal Materials.

### Missing-source consequences

Missing, stale, conflicted, withdrawn, superseded, rights-blocked, unsupported, or unparsed material must:

- remain visible;
- constrain Source Reliance, Analysis State, Deliverable Readiness, or external use;
- state the highest honest output ceiling;
- identify the next smallest source or Banker confirmation that can raise that ceiling; and
- never be replaced with invented Facts or hidden Assumptions.

## 6. AI, Deterministic, and Human-Control Contract

### AI-owned work

AI may:

- extract and classify supported content;
- map sources, Evidence, definitions, periods, units, and dependencies;
- compare sources and identify gaps, conflicts, and stale conditions;
- synthesize and draft bounded analysis, narrative, questions, cases, and artifact content;
- propose Claim, Fact, Assumption, issue, buyer, scenario, materiality, and next-action candidates;
- explain calculations, checks, impacts, blockers, and abstentions.

AI must preserve Origin, exact scope, source lineage, uncertainty dimensions, and all unresolved material conditions.

### AI prohibitions and abstention

AI must not silently:

- upgrade Evidence or a Claim to a Fact;
- invent a source, value, term, interest, event, relationship, contact, Bid, or professional conclusion;
- resolve a material conflict, definition, comparability, assumption, or materiality question;
- select a Buyer, Bid, recommendation, circulation posture, or external action;
- claim legal meaning, regulated professional opinion, transaction completion, or guaranteed correctness;
- fill a missing-source gap merely to complete a workflow.

When evidence, rights, definitions, coverage, deterministic validity, or scope is insufficient, the correct behavior is explicit abstention, gap, downgraded output, or blocker.

### Deterministic-owned work

The deterministic plane owns reproducible work where a stated rule exists:

- arithmetic, formula, period, unit, currency, sign, and EV-to-equity checks;
- financial statement, model, scenario, valuation, and Bid calculation materialization;
- spreadsheet recalculation and formula/link/structure validation;
- schema, handoff, manifest, object identity, version, and dependency validation;
- source/model/artifact tie-outs;
- cross-artifact consistency and native/reader parity checks;
- affected-scope identification where dependency rules are mechanical.

Every check exposes applicability, inputs, rule/version, coverage, result, and unresolved nonmechanical questions. Mechanical completion never establishes professional suitability.

### Banker-reserved decisions

The Individual Banker owns:

- source perimeter and intended reliance;
- Fact acceptance and Assumption approval;
- definition, conflict, comparability, materiality, and professional-suitability decisions;
- Buyer approval, restrictions, outreach, disclosure, NDA/access, Bid selection, and recommendation;
- remediation acceptance and circulation candidacy judgment;
- exact-Revision External-Use Decision.

Each material Human Decision records actor, timestamp, scope, old state/value, new state/value, reason, Evidence, affected objects, and required revalidation. Human Confirmation never rewrites Origin.

### Confidence and sufficiency dimensions

No single scalar confidence may replace independent questions about:

- source authority and rights;
- freshness and version;
- parse/OCR/visual coverage;
- extraction confidence;
- definition, period, unit, and currency;
- conflict state;
- evidence sufficiency;
- deterministic coverage and validity;
- professional usability;
- Deliverable readiness;
- exact external-use authorization.

### Correction and versioning

- Preserve the original AI/imported extraction and its Origin.
- Append the correction with actor, time, reason, Evidence, and scope.
- Recalculate affected Calculations and Models.
- Regenerate affected Deliverable scope into a new Revision.
- Re-run applicable QC and readiness gates.
- Do not carry forward prior Review or External-Use Decision silently.

### Evaluation and release blockers

The evaluation system must combine deterministic fixtures, golden object/source packages, controlled AI evaluations, artifact open/save/reimport/render checks, visual comparison, lineage completeness, cross-Deal isolation tests, and sampled human review. AI-as-judge alone is insufficient.

Release or affected workflow use is blocked by, at minimum:

- unresolved material source/rights/confidentiality failure;
- a material output without resolvable lineage;
- unsupported material Claim represented as Fact;
- critical calculation, formula, tie-out, dependency, or version failure;
- material native/reader mismatch or corrupted native artifact;
- cross-customer or cross-Deal contamination;
- readiness or prior authorization being treated as current external-use permission.

## 7. Controlled Auction Execution Package

**Confirmed Decision.** The premium Deliverable family and hero sellable output is the Controlled Auction Execution Package inside the Controlled Sell-Side Auction Deal Book.

### Always-required objects

1. **Analysis & Valuation Workbook — XLSX**
   - source-mapped historicals, adjustments, definitions, KPIs, forecasts where applicable, valuation methods, scenarios, sensitivities, bridges, formulas, checks, assumptions, and outputs;
   - exact-cell lineage and visible calculation/validation state.
2. **Auction Control Workbook — XLSX**
   - buyer universe, restrictions, outreach, NDA/access, diligence, information requests, milestones, Bids, decisions, and current/history separation;
   - Dashboard or executive first tab.
3. **Evidence and control records**
   - Source Registry, Evidence/Claim/Fact/Assumption records, calculations, decisions, QC findings, open items, Impact Assessments, manifests, and audit history.
4. **In-app Package Readiness**
   - applicable objects, independent state families, blockers, next controlled actions, and stage-inapplicable objects.
5. **Archive/export package**
   - exact-Revision Native Artifacts, Reader Copies, permitted sources and records, manifest, hashes, lineage, Decisions, and history.

### Stage-triggered objects

- Blind Teaser — PPTX + exact PDF Reader Copy;
- CIM / Information Memorandum — PPTX + exact PDF Reader Copy;
- management presentation, update, or other process material — native PPTX/DOCX plus Reader Copy when stage and purpose require it;
- Bid Evaluation & Recommendation Memo — DOCX + exact PDF Reader Copy.

Stage-inapplicable artifacts are explicitly marked `not stage-required`; they are not manufactured early to create an appearance of completeness.

### Deliverable contract

Every Deliverable has:

- identity, owner, Deal, audience, purpose, stage, and current Revision;
- immutable Revision history;
- editable or operational Native Artifact;
- exact Reader Copy where a reader/circulation representation applies;
- source/Evidence/Calculation lineage;
- open issues, QC findings, Review, readiness, and Decisions;
- intended-use and confidentiality conditions;
- export/archive representation and integrity record.

### Native editability and round-trip

Supported native artifacts must survive:

1. generation or import;
2. open and structured inspection;
3. permitted edit/save;
4. reimport as a new Source Record or Revision input;
5. recalculation or affected regeneration;
6. reader rendering;
7. structural, formula, value, layout, and visual comparison;
8. lineage, QC, and readiness update.

A flattened PDF, screenshot, or image of a workbook/deck is not a Native Artifact.

### Quality and readiness gates

Quality is multi-dimensional:

- source authority and Evidence sufficiency;
- mechanical validity;
- model and cross-artifact consistency;
- professional usability;
- native structure and editability;
- Reader Copy completeness and fidelity;
- visual quality and point-of-use citation;
- QC remediation;
- senior-review readiness;
- circulation candidacy;
- exact-Revision external-use authorization.

No single pass result promotes every other dimension.

## 8. First-Value Journey

### Public synthetic proof

The no-signup Project Northstar proof exposes the complete outcome before upload and lets the visitor:

- inspect exact Source Record locators;
- preserve the `$18.4m` versus `$17.8m` EBITDA conflict;
- inspect the original `$6.2m` Cash extraction and correct it to `$4.7m` without erasing history;
- record a simulated scoped disposition;
- observe the `$1.5m` deterministic EV-to-equity tie-out recovery;
- inspect affected workbook cells, CIM slides, Reader Copy, QC, readiness, and authorization consequences;
- append SR-006, create Rev 0.4, retain Rev 0.3, and see that prior authorization does not carry forward;
- inspect or download rights-cleared native, reader, control, and archive samples.

Public proof contains no real Deal data and requires no email, card, founder demo, or sales call.

### Direct purchase and paid preflight

The visitor sees exact price, included capacity, exceptional processing, supported inputs, authority boundary, security/confidentiality facts, cancellation, export/deletion, and guarantee before payment. Successful direct card payment creates entitlement but not source rights.

Before real upload, the product records:

- purchase authority;
- exact Deal identity and intended use;
- source/use authority and rights;
- confidentiality class;
- provider/processing-path compatibility;
- supported file/template/packet posture;
- minimum security gate result;
- minimum Source Packet and guarantee eligibility.

### Guided first Deal

1. Create exact Deal identity.
2. Complete authority/confidentiality preflight.
3. Inventory and accept the minimum Source Packet with gaps and output ceiling.
4. Show AI, deterministic, and Banker responsibility.
5. Select one bounded first work target.
6. Extract or propose a material Fact/Assumption/Claim object from exact Evidence.
7. Require Evidence inspection.
8. Record an extraction correction or typed Human Decision when applicable.
9. Run applicable deterministic validation and recovery.
10. Show downstream Impact Assessment and exact affected scope.
11. Show at least one Native Artifact, Reader Copy, QC/readiness, and authorization consequence.
12. Export the exact Revision with manifest.
13. Graduate into the persistent Deal Execution Desk.

`first_unmistakable_value` requires the complete Evidence → typed decision → deterministic validation → affected native/reader/readiness consequence loop on one real supported Deal. If no real conflict or extraction error exists, a normal material Fact/Assumption/Claim review and valid deterministic check are used; the product never invents a conflict.

### Recovery, export, and return

- Missing sources expose exact missing objects and preserve resumable state.
- Unsupported files/templates provide compatibility limits or replacement/export instructions; no manual implementation service appears.
- Product failures preserve state, restore allowance, retry safely, and retain guarantee eligibility.
- Deterministic failures may be resolved through Evidence correction or approved scope/Assumption change, never silent waiver.
- The first export is not the end of the product. A new Source Record or Process Event produces a material return loop and new immutable Revision.

## 9. Exact Individual-First Release Boundary Across 21 Official Workflows

**Derived Synthesis.** The 21 focused workflows are partitioned below. “Direct” means an explicit V1 Sell-Side Auction route or owned output. “Bounded” means the capability is used inside a V1 workflow without exposing the full official workflow as an independent product. “Deferred” means it remains in the complete Official Capability Baseline vision but is not needed for the complete first Sell-Side Auction.

### Directly included in V1

| Workflow | V1 responsibility | Reason and dependency |
|---|---|---|
| `buyer-investor-list` | Build candidate rationale, restrictions, scoring support, and Banker-approved buyer universe; hand off to Auction Control. | Essential to preparation and market launch. Requires target/mandate context, dated authorized evidence, restrictions, and Human approval; it does not claim interest or contactability. |
| `cim-builder` | Create and refresh teaser, CIM, management presentation, and source pack. | Essential Preparation output. Depends on controlling sources, accepted Facts/Assumptions, model outputs, native generation, QC, and exact audience/purpose. |
| `comps-valuation` | Provide the explicit trading-comps valuation route within the Analysis & Valuation Workbook. | A core sell-side valuation capability. Requires pricing date, diluted shares, EV bridge, denominator basis, FX, dated estimates, peer rationale, and Banker judgment. |
| `deal-process-tracker` | Own internal outreach, NDA, access, diligence, Bid, deadline, milestone, and status tracking. | Essential from In Market through closing. Requires exact Process Events and Human authorization; it never sends outreach or grants access. |
| `financials-normalizer` | Normalize and reconcile historicals, KPIs, adjustments, conflicts, assumptions, and model-ready inputs. | Foundation for analysis, valuation, materials, and refresh. Requires authorized source files, definitions, periods, units, currency, and reconciliation. |
| `ib-deck-qc` | Own final-circulation QC for stage-required decks and reader copies. | Required for the native/reader package and readiness contract. Depends on exact controlling source/model/native versions, render coverage, and visual review. |
| `memo-builder` | Produce the Bid Evaluation & Recommendation Memo and other applicable controlled decision memos. | Essential to Bid Evaluation. Consumes validated owner outputs and Evidence; recommendation and circulation remain Human decisions. |

### Included as bounded capabilities inside V1 workflows

| Workflow | Bounded V1 use | Reason and dependency |
|---|---|---|
| `cim-teardown` | Create a seller/management Claims, gaps, questions, red-flags, and information-request ledger during Preparation. | Strengthens source control but does not launch a separate buy-side underwriting product. Requires an identifiable seller artifact and exact Evidence. |
| `company-tearsheet` | Provide target, Buyer, or counterparty factual baseline objects. | Supports analysis, buyer work, meetings, and memos. It remains a bounded factual object rather than a standalone full recommendation. |
| `dcf-model-builder` | Provide a DCF valuation method inside the Analysis & Valuation Workbook where supported. | Conditional on historicals, forecast, Banker-approved WACC/terminal assumptions, bridge, scenarios, and sufficient source support; not mandatory for every Deal. |
| `meeting-prep` | Produce scoped management, diligence, Buyer/process meeting briefs and structured debrief deltas. | Supports continuing process events. It does not own external communication or replace process judgment. |
| `model-audit-tieout` | Provide embedded mechanical model/source/artifact audit and tie-out evidence. | Required for control closure but does not automatically determine error materiality, remediation sufficiency, or professional readiness. |
| `pitch-deck-builder` | Provide storyline and page architecture for teaser, CIM, management, and update materials. | Used inside stage-required Sell-Side Auction outputs; it does not launch a disconnected generic pitch-deck product. |
| `scenario-sensitivity-generator` | Materialize approved cases, sensitivities, breakevens, and backsolves on a current model. | Supports valuation, Bid comparison, and downside analysis. Requires an existing suitable model and Banker-approved drivers/cases. |
| `three-statement-model-builder` | Provide integrated supporting forecast schedules where the Deal's requested valuation/materials scope requires them. | Conditional capability, not a universal mandatory model. Requires sufficient historicals and Banker-approved forecast architecture and assumptions. |

### Deferred to post-V1 expansion

| Workflow | Reason for deferral | Required later dependency |
|---|---|---|
| `capital-markets-issuance` | Issuer financing/market-window workflow is not necessary to complete a Sell-Side Auction. | Issuance-specific sources, instruments, market evidence, calculations, judgments, and artifact contract. |
| `covenant-package-analyzer` | Credit-document definitions, baskets, EBITDA, and headroom require a distinct operative-document and legal-escalation perimeter. | Credit/financing workflow, versioned legal documents, definitions, amendments, and counsel boundary. |
| `distressed-recovery-waterfall` | Claims, liens, collateral, priority, value break, and restructuring economics form a distinct distressed domain. | Distressed workflow, exact claims/collateral/legal/process objects, and separate human/legal judgment. |
| `lbo-model-build` | Sponsor acquisition underwriting is principally a buyer/sponsor workflow. | Buy-side/sponsor product expansion, financing evidence, operating case, debt and returns contract. |
| `merger-model-builder` | Consideration, ownership, PPA, synergies, financing, and accretion/dilution are principally acquirer/strategic-buyer work. | Strategic/buy-side expansion and transaction-accounting contract. |
| `private-credit-underwriting` | Lender proceed/decline, sizing, downside, liquidity, and collateral/recovery are a separate credit decision workflow. | Credit product expansion, lender evidence, Human credit decision, covenant and distressed handoffs. |

### Out of scope for the product promise

No focused workflow is permanently removed from the complete Official Capability Baseline vision. Across all workflows, the following remain out of the product promise:

- regulated professional opinions;
- source-rights or employer-policy substitution;
- autonomous material professional judgment;
- automatic external communication, disclosure, access grant, Bid acceptance, transaction execution, or other external action;
- a guarantee of accuracy, valuation, close, legal protection, or elimination of professional review.

## 10. Release Sequence

**Derived Synthesis.** This is a product-capability order, not an implementation ticket plan.

1. **Security, Evidence, and file-control foundation**
   - account/Deal isolation, confidentiality controls, Source Registry, Evidence graph, immutable history, object identity, Revision, export/deletion, native/reader file pipeline, deterministic/evaluation foundation.
2. **First correct-use control loop**
   - public Project Northstar proof, paid preflight, first Deal identity, minimum Source Packet, Evidence inspection, Human Decision, deterministic recovery, affected artifact/readiness consequence, first export.
3. **Complete Preparation outputs**
   - financial normalization, Analysis & Valuation Workbook, buyer universe, Auction Control Workbook, teaser, CIM, applicable management materials, QC and Package Readiness.
4. **In-Market process control**
   - buyer/process events, NDA/access, diligence, information requests, meetings, milestones, material source updates, and package refresh.
5. **Bid Evaluation and recommendation**
   - exact Bid versions, normalized comparison, scenarios, recommendation memo, selection decision, affected package/process state.
6. **Exclusive Execution continuity**
   - continuing diligence, conditions, signing/closing milestones, final package, external-use control, termination, pause, archive, reactivation, and return revisions.
7. **Post-V1 Official Capability Baseline expansion**
   - add the deferred workflows on the same controlled foundation without weakening their native contracts.

### First sellable release boundary

The stages above may be implemented internally in sequence, but stages 1–6 together define the first sellable release. A public proof, source-control foundation, CIM generator, model, QC tool, or Preparation-only package is not the first sellable release. Real confidential use cannot launch before the security gates, and the product cannot claim end-to-end Sell-Side Auction value before the lifecycle and package acceptance criteria pass.

## 11. Monetization

### Individual Deal Desk

**Confirmed Product Design Decision.**

| Element | Contract |
|---|---|
| Buyer | One named Individual Banker; no account sharing |
| Monthly price | **$995/month** |
| Annual price | **$10,950/year paid upfront**, equivalent to $912.50/month and 8.3% below twelve monthly payments |
| Included Active Deals | Two concurrent Active Deal Workspaces |
| Per Active Deal per billing month | 250 newly processed files, 2,500 newly processed logical pages, 25 GB active storage, and 20 defined full-workflow operations |
| Additional Active Deal | **$500/month** or **$5,500/year**, same complete capability/allowances, co-termed and prorated |
| Large Source Packet & Intensive Processing Pack | **$1,000 per affected Active Deal-month**, adding 5,000 newly processed pages and 20 full-workflow operations after explicit preview and consent |
| Archived Deals | No count limit while paid, within 250 GB account archive storage |
| Archive Capacity Pack | **$50/month** per additional 250 GB; offer export/delete first |
| Risk reversal | Public synthetic proof, no real confidential free trial, and conditional 14-day First-Deal Control-Loop Guarantee |

### Active Deal metric

An Active Deal Workspace may ingest new sources, run material analysis/package work, create Revisions, or advance Package Readiness. An Archived Deal Workspace is read-only for search, Evidence inspection, download, export, and deletion. Reactivation consumes an available slot; it is not a new activation fee.

### Defined usage envelope

A full-workflow operation is a complete Source Packet ingest/re-ingest, full Controlled Auction Execution Package build, or material cross-artifact Revision/refresh. Targeted correction-driven work is not a full-workflow operation.

The product deliberately does not meter:

- Source/Evidence inspection, citations, or lineage navigation;
- extraction correction, conflict review, Fact/Assumption/Claim disposition;
- deterministic recalculation, validation, tie-outs, and normal targeted regeneration;
- QC, Package Readiness review, reviewer actions, Human Decisions, and External-Use Decisions;
- normal native, reader, control, and archive exports;
- retries and recovery caused by product failure.

Tokens, prompts, model calls, model selection, and reasoning are never buyer-visible units.

### Guarantee

The first plan charge is refundable when all exact conditions hold:

1. request within 14 calendar days of first payment;
2. authorized supported files passed published rights/security/file preflight;
3. the selected route's minimum Source Packet is present;
4. a product-side failure prevents exact-source Evidence, one material proposition review, deterministic validation, and at least one Native Artifact plus exact Reader Copy; a real conflict/correction also requires decision and recovery, but no exception is invented;
5. the milestone has not already been reached; and
6. the account/payment instrument has not used the guarantee before.

Incorrect product preflight acceptance followed by processing failure is a product-side failure. Missing authority, insufficient sources, unsupported quality, out-of-scope use, abuse, account sharing, or a completed milestone are not guarantee grounds. Product failures restore allowance regardless of refund.

### Unit economics

**Post-Launch Validation Hypothesis.** The base model is:

- $995 recognized monthly revenue;
- $217.62 estimated cash direct cost;
- 78.1% cash gross margin;
- $292.62 contribution cost including 45 minutes of assumed support;
- 70.6% contribution margin.

Launch cash/contribution ranges are 70%–80% / 65%–75%; steady-state objectives are at least 85% / 75%. High usage without guardrails is economically broken. Cost, retries, support, packet size, operation volume, and margins must be measured by account, Active Deal, source page, full-workflow operation, material Revision, artifact, failure class, and cohort.

The price is not verified WTP. Conversion, Deal cadence, usage distribution, annual take rate, refunds, support, realized time savings, and Team expansion remain unvalidated.

### Future Team organizational value

Future Team may add shared workspaces, actor identity, collaboration, pooled capacity, centralized billing, firm templates, role/permission boundaries, approval routing, organization audit/policy, staff migration/revocation, SSO, support/SLA, and enterprise review. The persistent workspace, both workbook spines, native/reader artifacts, Evidence/control, correction/Revision, QC/readiness, archive/export, and exact external-use control remain complete in Individual.

An indicative `$2,995/month` or `$32,950/year` five-seat/six-pooled-Deal Team package is only a future Product Design Hypothesis and is not a V1 offer or validated price.

## 12. Acquisition and Conversion

### Positioning

**Product Design Decision.**

> For execution bankers running sell-side auctions, the product turns authorized source packets into a continuously refreshable Controlled Auction Execution Package—editable workbooks and materials with exact Evidence lineage, deterministic tie-outs, and Banker-controlled readiness—without a sales call or implementation project.

Permitted market verbs include trace, inspect, flag, calculate, tie out, preserve, refresh, regenerate affected scope, record a decision, block, and export. Quantified time saving, “10x,” “zero error,” “fully autonomous,” “guaranteed accurate,” “guaranteed close,” and “replace the Banker” are prohibited until a narrower claim is supported by real evidence, or permanently where inconsistent with the product contract.

### First three acquisition loops

1. **Trigger Search-to-Control Proof**
   - high-intent workflow/problem pages for source, model/CIM tie-out, revision, readiness, or auction-control triggers;
   - deep-link into the matching Project Northstar state.
2. **Artifact Utility-to-Workspace**
   - rights-cleared Source Packet, native/reader samples, source inventory, readiness checklist, and bounded tie-out utility;
   - every utility maps to exact workspace lineage and pricing.
3. **Recorded Control-Loop Proof Distribution**
   - one canonical recorded walkthrough segmented into search pages, owned professional education, bounded LinkedIn/newsletter/creator/community experiments;
   - every distribution object returns to the canonical interactive proof.

The loops share the same proof, qualification, checkout, activation, measurement, and confidentiality contracts; they are not unrelated campaigns.

### Proof and trust stack

- outcome/category and trigger pages;
- no-signup Project Northstar workspace;
- synthetic Source Packet and exact locators;
- downloadable editable native samples, Reader Copies, control records, and archive manifest;
- canonical recorded walkthrough with captions/transcript/deep-linked chapters;
- Evidence/deterministic/Banker-control methodology;
- implemented-fact-only security, confidentiality, data-use, training, retention, deletion, and support-access surfaces;
- exact source/template/authority qualification preview;
- exact pricing, capacity, guarantee, billing, cancellation, export, and deletion.

An optional account may save synthetic progress, but essential proof is not email-gated. An unimplemented control cannot be presented as a launch promise.

### Funnel

`trigger-specific discovery → synthetic controlled-outcome proof → exact pricing and qualification → direct card checkout → paid authority/confidentiality preflight → guided first control loop → persistent Deal Execution Desk → material Revision and Package Readiness → confidentiality-safe referral and future Team signal`

No normal step uses “book a call,” direct outreach, manual implementation, source cleanup service, or founder-completed Deal work.

### Activation

- commercial activation begins at `checkout_completed`;
- product activation begins at `minimum_source_packet_accepted`;
- first unmistakable value requires the complete real control loop in §8;
- first export proves portability, not retention;
- a second material Revision or later qualifying lifecycle return is the primary repeated-value evidence.

### Retention

Meaningful retention requires a changed or continuing Deal business object:

- accepted Source Record or Process Event;
- material Impact Assessment;
- recalculation, regeneration, re-review, or blocker closure;
- new immutable Revision;
- Package Readiness change;
- milestone, Bid, archive/reactivation, export, or new Deal.

Login, prompt count, generated text, passive view, and notification click do not count as retained Deal activity. Notifications contain no Deal/client/Buyer names, filenames, values, bids, source text, findings, or artifact excerpts outside authenticated surfaces.

### Referral and Team signal

The initial V1 referral Product Design Decision is a `$250` account credit after a referred buyer pays the full displayed price, reaches first value, and passes the guarantee window without refund; there is no referred-buyer discount and the referrer is capped at three credits per year. Referral uses the public synthetic proof, not customer Deal data.

A private exact-Revision share may be recipient-specific, authenticated, expiring/revocable, read-only, audience/purpose/condition-bound, and subject to the applicable External-Use Decision. It is a work object and possible Team signal, not a public acquisition advertisement or Team workspace membership.

### First-10 and first-50 evidence

- The first 10 clean purchases diagnose traffic, message, proof, trust, price, checkout, preflight, product reliability, activation, and retention separately; they do not validate PMF, WTP, or repeatable acquisition.
- A clean purchase pays the displayed full price without discount, demo, outreach, founder negotiation, manual implementation, or founder-completed work, and is not test, fraud, duplicate, chargeback, or refund.
- Before changing list price, seek at least 50 clean paid Individual purchases, 25 first-value completions, and three mature monthly usage cohorts. This is a practical learning floor, not statistical proof or a no-go threshold.

### Verified mechanism versus channel hypothesis

Current first-party evidence verifies that professional products use workflow pages, public samples, interactive proof, recorded education, direct checkout, trust surfaces, lifecycle alerts, artifact sharing, and referral mechanisms. It does not verify query volume, ranking, traffic quality, conversion, CAC, WTP, activation, retention, referral, or Team expansion for this product. Those remain this product's own instrumented hypotheses.

## 13. Risks and Product Responses

| Risk | Failure | Design response | Classification | Owner |
|---|---|---|---|---|
| Confidentiality/security | Unauthorized access, processing, disclosure, retention, or support access | Verified authentication, isolation, encryption, secrets, provider path, audit, export/deletion, accurate disclosure; block real material until complete | Launch blocker | `/to-spec` acceptance + security/technical design |
| Hallucination/unsupported claims | AI-created or seller-created Claim appears as Fact or external-ready content | Typed proposition states, exact Evidence, abstention, sufficiency limits, Human promotion, readiness block | Acceptance gate | AI/evaluation and product state |
| Numeric/model error | Incorrect formulas, units, periods, signs, bridges, scenarios, or stale outputs | Reproducible calculation plane, source mapping, coverage manifest, fixtures, tie-outs, Impact Assessment | Acceptance gate | Calculation/evaluation |
| File corruption/native editability | Workbook/deck/document cannot open, edit, save, or reimport without damage | Native structural checks, reopen/save/reimport fixtures, formula/value/layout comparison, safe unsupported-feature disclosure | Acceptance gate | Artifact pipeline |
| Visual/read-copy inconsistency | Reader Copy differs materially from Native Artifact or omits content | Exact Revision binding, full render, visual diff, cross-artifact checks, circulation block | Acceptance gate | Artifact/QC |
| Source rights/licensing | Unauthorized, access-controlled, or restricted source is processed or redistributed | Source-specific authority/rights fields, preflight, isolated licensed exports, prohibited shared pool | Launch/use blocker | Source/preflight + legal/commercial review |
| Missing/stale/conflicted source | Product presents an unsupported current conclusion | Explicit state, output ceiling, typed disposition, abstention, new Revision and re-review | Acceptance gate and expected controlled state | Product behavior |
| Cross-Deal contamination | One Deal's source, embedding, prompt, output, or decision enters another Deal | Deal-bound object identity, retrieval/index/job isolation, negative tests, no shared content/eval pool | Launch blocker | Security/data |
| Unauthorized external use | Readiness, old authorization, or export is mistaken for permission | Exact object/Revision/audience/purpose External-Use Decision and event audit | Acceptance gate | State/control |
| High processing cost | High-volume packet, retries, model use, rendering, or support destroys margin | Visible Deal envelope, packet preflight, exception pack, failure restoration, internal cost ledger and routing optimization | Monitored operational risk | Product analytics/operations |
| Support burden | Product becomes a disguised founder service | Resumable guidance, exact blockers, automated recovery, bounded async defect/billing support, no Deal completion service | Acceptance + monitored hypothesis | Product/operations |
| Self-serve trust friction | Qualified buyer cannot validate confidentiality, quality, continuity, or boundaries | Public proof, exact qualification, implemented trust evidence, sample exports, safe exit contract | Acceptance + monitored funnel | Product/acquisition/security |
| Unverified WTP/conversion | Price or channel does not create clean buyers | Preserve clean cohorts and failure reasons; adjust only under Ticket 10 rules; never infer from competitors | Post-launch validation | Product analytics |
| Employer policy/procurement | Buyer lacks permission or cannot use real materials | Public/synthetic path remains available; explicit prohibition blocks checkout/use; uncertainty blocks real upload until confirmed | Monitored qualification risk | Checkout/preflight |

Product responses may narrow a claim, source, workflow, or launch use. They may not quietly remove the complete Sell-Side Auction outcome or convert a build commitment into a no-go decision.

## 14. V1 Acceptance Boundary

**Derived Synthesis.** `/to-spec` must turn the following into explicit, testable acceptance criteria.

### Product behavior

- exact Deal creation, stage/posture changes, pause, archive, reactivation, termination, signing, and closing behavior;
- complete Preparation, In Market, Bid Evaluation, Exclusive Execution, and return-Revision workflows;
- no automatic external actions or implicit professional decisions.

### Source and state contracts

- immutable original sources and Source Records;
- source/version/rights/confidentiality/locator coverage;
- typed Evidence, Claim, Fact, Assumption, and Human Decision behavior;
- independent Source, Analysis, Deliverable, and Process states;
- Impact Assessment and targeted change propagation;
- immutable Revision and no silent status/authorization carry-forward.

### Security preconditions

- authenticated and isolated account/Deal access;
- encryption and secret handling;
- provider/training/retention/support-access verification;
- safe logs/analytics with no confidential payloads;
- self-serve export, deletion, closure, and deletion evidence;
- cross-Deal and cross-customer negative tests.

### End-to-end workflow

- one complete synthetic reference Deal and one supported real-data acceptance path;
- both workbook spines;
- stage-required teaser/CIM/memo outputs;
- buyer/process/Bid continuity;
- new source/event → Impact Assessment → affected Revision loop;
- export, archive, reactivation, and history.

### AI, deterministic, and Human gates

- AI provenance, source grounding, typed outputs, abstention, and blocked behavior;
- deterministic applicability, coverage, reproducibility, and failure behavior;
- exact Human Decision and External-Use Decision contracts;
- critical release-blocker fixtures and regression evaluation.

### Artifact quality

- supported XLSX/PPTX/DOCX creation/import, open/save/reimport, and structural validation;
- exact PDF Reader Copies;
- source/cell/slide/text lineage;
- native/reader and cross-artifact consistency;
- visual inspection/diff and QC remediation;
- archive/export manifest, hashes, and exact Revision identity.

### First-value journey

- public no-signup synthetic proof completion;
- pricing/qualification continuation;
- paid preflight;
- minimum Source Packet;
- Evidence inspection and typed decision;
- deterministic validation/recovery;
- affected native/reader/readiness consequence;
- first export and graduation into Deal Execution Desk;
- product failure recovery without manual onboarding.

### Pricing and entitlement behavior

- monthly/annual purchase and exact two-Active-Deal entitlement;
- Active/Archived/reactivation behavior;
- per-Deal allowance ledger and pre-execution warnings;
- additional Deal, exception pack, and archive capacity behavior;
- unmetered professional-control actions;
- automatic restoration after product failure;
- cancellation, renewal, guarantee, refund, read-only window, export, and deletion.

### Checkout and preflight

- exact amount, term, renewal, capacity, tax-as-applicable, receipt/invoice, cancellation, and guarantee disclosure;
- purchase authority, intended use, source authority/rights, confidentiality, security, compatibility, and minimum packet;
- block, limited-proceed, replace/remove, save/resume, and self-serve payment recovery behavior;
- no real confidential upload endpoint before entitlement and passed preflight.

### Lifecycle retention

- new Source Record, conflict/stale condition, material impact, re-review, Revision, readiness, milestone, Bid/process, archive/reactivation, export, and new Deal return paths;
- confidentiality-safe in-app/email communication and user frequency controls;
- no engagement metric substituted for meaningful Deal activity.

### Observability and evaluation

- pseudonymous events and exact object IDs without source text, names, filenames, values, formulas, Bids, Human Decision text, or artifact excerpts;
- funnel, preflight, first value, failure/retry, export, Revision, active Deal, refund/cancel, referral, Team signal, cost, margin, and support events;
- cohort dimensions for product/proof/price/source/template/route/version while preserving confidentiality;
- deterministic event replay and exclusion of test, bot, employee, synthetic, fraud, duplicate, and instrumentation-failure traffic where applicable;
- claim registry that disables claims whose implementation prerequisite is false or unknown.

Success cannot be asserted from screenshots, a successful file download, an AI-judge score, or a happy-path demo alone.

## 15. Deferred Capabilities

**Out of Scope for V1.**

- advanced Team collaboration and shared workspace membership;
- granular role/permission administration;
- approval routing and organization administration;
- centralized firm policy, pooled usage, staff migration/revocation, and Team billing;
- SSO, SLA, enterprise support, security-review workflow, and custom deployment;
- live drive, file, email, chat, CRM, market-data, or relationship connectors;
- live VDR integration or mutation;
- product-owned licensed-data subscriptions or pooled licensed content;
- broader Official Capability Baseline workflows not required by the V1 Sell-Side Auction boundary;
- high-fidelity brand, visual design, logo, and production design system;
- mobile-primary workflow;
- human Banker review or founder-operated implementation;
- regulated professional opinions;
- autonomous outreach, email, messaging, VDR access/mutation, counterparty contact, Bid acceptance, or other external action;
- mandatory enterprise procurement or sales-assisted normal fallback.

Recipient-specific exact-Revision read-only sharing is not Team membership. Bounded async product, billing, defect, incident, and security support is not a Banker service.

## 16. `/to-spec` Handoff Contract

### Authoritative inputs

`/to-spec` must use, in authority order:

1. explicit later product-owner direction, if any;
2. [Domain Context](../../../CONTEXT.md);
3. this confirmed Blueprint and Ticket 12;
4. resolved Tickets 1–11 and their linked decision assets;
5. time-sensitive source notes as evidence with their access-date limitations;
6. the throwaway prototype only for its validated interaction decision.

### Exact product scope

An independent, US-first English Web App for an execution-oriented Individual Banker, sold self-serve at the confirmed Individual Deal Desk price, that completes a controlled Sell-Side Auction from Deal initiation and preparation through market execution, Bid evaluation, exclusivity, signing/closing or termination, plus pause/archive/reactivation and continuing Revisions, inside one persistent Deal Workspace.

### Non-goals

The deferred capabilities in §15, a disconnected tool menu, generic chatbot, one-shot artifact generator, enterprise lead-in shell, founder service, product-owned licensed-data terminal, autonomous professional decision-maker, or external-action agent.

### Acceptance objects

- Deal and lifecycle state machine;
- Source Registry and Source Packet;
- Evidence/proposition/decision graph;
- Calculation/model/scenario/analysis objects;
- buyer/process/Bid/milestone objects;
- Controlled Sell-Side Auction Deal Book;
- Controlled Auction Execution Package;
- Deliverables, immutable Revisions, Native Artifacts, and Reader Copies;
- Review, QC Finding, Impact Assessment, Package Readiness, and External-Use Decision;
- checkout, entitlement, preflight, guarantee, billing, export, archive, and deletion;
- proof, activation, lifecycle, evaluation, observability, and cost evidence.

### Implementation choices `/to-spec` may decide

**Implementation-Deferred Choice.**

- application stack, repository structure, runtime, deployment, regions, database, object storage, queues, and orchestration;
- authentication, payment, tax, invoice, email, analytics, observability, and security vendors;
- model/provider selection and routing, subject to quality, confidentiality, retention, cost, and evaluation contracts;
- parsing, OCR, spreadsheet calculation, OOXML generation, Office/native rendering, PDF generation, and visual-diff implementation;
- internal schema, API, event topology, dependency representation, caching, and job lifecycle;
- exact numeric evaluation thresholds and staged technical delivery, provided they prove rather than weaken the product acceptance gates;
- UI composition and production visual design, provided the validated C → A → B form and core control surfaces remain.

### Product decisions `/to-spec` may not reopen

Without explicit product-owner direction, `/to-spec` may not reopen or silently weaken:

- the decision to build;
- independent Web App and Initial Design ICP;
- complete Individual-First Sell-Side Auction;
- persistent Deal Workspace and hierarchy in §4;
- C outcome-first discovery, A guided first correct use, and B Deal Execution Desk;
- upload/export-first source and confidentiality contract;
- AI/deterministic/Banker boundaries;
- native editability, Reader Copy, lineage, QC, readiness, and exact external-use control;
- exact Individual price, capacity, unmetered professional controls, and guarantee;
- first three acquisition loops and no mandatory founder/sales/onboarding dependency;
- Team as organizational expansion without removing Individual core;
- V1 and Out-of-Scope boundaries.

### Time-sensitive facts requiring refresh

Before relying on a time-sensitive fact as a current implementation input or public claim, refresh:

- official Investment Banking plugin version, installed focused workflows, schemas, package behavior, and test results;
- API/model availability, context, pricing, retention, training, regional-processing, and ZDR/MAM conditions;
- parser/OCR, storage, payment, billing, email, observability, and security/compliance vendor prices and terms;
- competitor pricing, checkout, trust, security, retention, trial, refund, connector, and distribution surfaces;
- tax, card-network, invoice, legal, privacy, export-control, sanctions, and jurisdiction-specific commercial requirements.

The official baseline's existence, competitor products, public prices, curated stories, and vendor claims never become PMF, market size, WTP, conversion, accuracy, security, or production-readiness proof.

### Prototype status

The Ticket 9 prototype is synthetic, throwaway, local, and untracked. It validates:

- C for outcome-first discovery;
- A for guided first correct use;
- B for the persistent Deal Execution Desk;
- Package Readiness as a core persistent-workspace view;
- the Evidence → correction/decision → deterministic recovery → affected output/readiness → Revision interaction.

It does not validate production UI, visual design, accessibility, performance, security, data handling, billing, integration, artifact generation, architecture, or implementation quality. `/to-spec` retains the validated product decision and may discard all prototype code and styling. The prototype remains outside production by default and must not be silently staged, shipped, or treated as a reference implementation.

### Wayfinder asset treatment

Wayfinder assets are product-decision and evidence inputs, not production requirements verbatim. `/to-spec` must translate them into a coherent specification, remove research narration from acceptance language, preserve epistemic labels, refresh time-sensitive facts where needed, and avoid importing prototype implementation details or competitor analogies as requirements.

## `/to-spec` handoff checklist

- [ ] Treat this Blueprint and linked resolved Tickets as product authority.
- [ ] Preserve the canonical terms in `CONTEXT.md`.
- [ ] State the exact Individual-First Sell-Side Auction scope and non-goals.
- [ ] Cover every first-sellable-release capability in §10 stages 1–6.
- [ ] Turn §14 into measurable acceptance criteria and evaluation evidence.
- [ ] Keep Source, Analysis, Deliverable, Process, QC, and external-use states separate.
- [ ] Make real confidential use conditional on verified launch controls.
- [ ] Preserve complete Individual package capability and exact monetization behavior.
- [ ] Preserve the C → A → B journey and no-human-onboarding normal path.
- [ ] Include privacy-safe observability for product claims, cost, failure, activation, and retention.
- [ ] Label implementation choices, post-launch hypotheses, and time-sensitive facts explicitly.
- [ ] Do not treat the prototype, source notes, competitor mechanisms, or official baseline test snapshot as production-ready requirements.
- [ ] Do not invoke broader Team, connector, data-licensing, regulated-opinion, or external-action scope without explicit owner direction.

## Wayfinder Destination

**Confirmed Decision.** The Wayfinder Destination is reached. Product discovery has converged on a coherent, complete V1 Productization Blueprint with no unresolved product decision or blocker preventing `/to-spec`.

The next workflow may be `/to-spec`. This Ticket does not invoke it.
