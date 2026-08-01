# V1 AI, Deterministic Work, Evidence, and Human-Control Contract

**Decision date:** 2026-07-31  
**Product scope:** United States-first, English, self-serve Individual Banker; V1 Sell-Side Auction; Hero Outcome: Controlled Sell-Side Auction Deal Book  
**Official Capability Baseline inspected:** OpenAI-maintained Investment Banking plugin `v0.1.29` at `/Users/wxm/.codex/plugins/cache/openai-curated-remote/investment-banking/0.1.29`  
**Contract scope:** product behavior and quality responsibility, not production architecture, database/API design, implementation code, legal advice, or Ticket 8 deliverable templates

## 1. Reading rules and decision status

This document uses four statement classes:

1. **Verified fact** — directly established by the installed official plugin or a cited primary/authoritative source.
2. **Evidence-backed inference** — a product implication supported by verified facts but not itself an external standard.
3. **Product design decision** — the V1 rule chosen here to constrain later product and specification work.
4. **Unresolved implementation/evaluation question** — a bounded question that needs design, implementation, or pilot evidence later; it does not reopen this contract.

The official plugin is the minimum capability baseline, not a competitor. Its router, 21 focused workflow skills, shared references, schemas, validators, deterministic calculators/builders, and artifact tools were inspected for evidence, source hierarchy, citation, calculations, spreadsheet/model work, deliverable generation, QC, and human control. Particularly load-bearing local sources are listed in §17.

The following inherited decisions are binding:

- the Deal Workspace is the persistent authoritative Deal context;
- V1 is upload/export-first and connector-independent;
- Ticket 6 governs source rights, confidentiality, version, authority, freshness, conflict, extraction coverage, withdrawal, and Missing-Source Consequences;
- AI may execute and check work but may not replace material professional judgment or any external-use decision;
- V1 does not require complex team permissions, organizational approval routing, or enterprise administration;
- no product output is a fairness opinion, formal valuation opinion, solvency opinion, legal opinion, or other regulated professional conclusion.

## 2. Executive decision

### 2.1 Recommended V1 contract

**Product design decision:** V1 will use an **evidence-bounded execution, deterministic closure, and version-bound Banker control** model:

1. AI may ingest, extract, classify, compare, propose, analyze, draft, detect issues, and recommend.
2. Deterministic procedures must calculate or validate every mechanically decidable material property.
3. The Individual Banker must make every material professional judgment, process authorization, risk acceptance, and External-Use Decision against an exact object version, scope, audience, purpose, and evidence perimeter.
4. Readiness is the conjunction of independent evidence, calculation, model, confidentiality, consistency, review, and intended-use gates. It is never the average of a confidence score.
5. A source, correction, assumption, model, or intended-use change invalidates affected downstream approvals until impact assessment, recalculation, regeneration, and re-review are complete.
6. Evidence gaps reduce the permitted work posture. They do not invite the model to guess.

The control flow is:

`Authorized Source Material → AI proposal → deterministic computation/validation → explicit Banker decision where required → version-bound readiness classification → separate External-Use Decision`

Passing a deterministic check means only that the tested mechanical property passed. It does not prove source sufficiency, economic meaning, materiality, professional usability, suitability for an audience, or authorization to circulate.

### 2.2 Non-negotiable invariants

- No Claim becomes a Fact merely because AI repeats it, a citation exists, several derived outputs agree, or a model assigns high confidence.
- AI-generated text, summaries, normalized tables, analysis, and prior outputs are **Derived Work**, never self-authenticating Source Material.
- Every material value must preserve entity, definition, period, currency, unit, sign convention, scenario, source version, and calculation lineage.
- An unresolved material source conflict preserves competing interpretations; it is not silently averaged or resolved in favor of the thesis.
- Deterministic calculations use explicit inputs and formulas and record the engine/run/version state. Cached spreadsheet values are not proof of recalculation.
- No Buyer Candidate becomes an Approved Buyer, no candidate list becomes an Outreach Wave, no Bid becomes selected, and no artifact becomes externally usable without the required explicit Banker decision.
- Every Human Confirmation is object-, field-, version-, scope-, purpose-, audience-, and time-bound. It does not carry forward silently to a Revision.
- Any material change runs Impact Assessment and blocks circulation of affected prior candidates until required downstream work is complete.
- Source rights, confidentiality, Deal isolation, and external-use gates fail closed.

## 3. Responsibility matrix

| Responsibility class | Contract meaning | Representative V1 work | Promotion authority |
| --- | --- | --- | --- |
| **AI-owned execution** | AI performs bounded transformation or generation whose inputs, instructions, output, and limitations are observable. AI owns execution quality, not truth or professional adoption. | extraction proposals, document classification, Claim extraction, Fact/Assumption proposals, comparison, research synthesis, issue detection, draft narrative, revision proposal, recommendation proposal | May advance only within the permitted draft lane and only when required deterministic gates pass. |
| **Deterministic computation** | Code or a controlled calculation engine produces reproducible results from explicit inputs and formulas. | arithmetic, financial formulas, normalized units, deadline math, valuation tables, bid economics, model recalculation, dependency propagation | Result may populate Derived Work; it cannot approve an assumption, method, interpretation, or external use. |
| **Deterministic validation** | Code tests an exact mechanical property and returns pass/fail/exception evidence. | schemas, required fields, citation existence, tie-outs, formula scans, version hashes, cross-artifact number checks, process-state rules, confidentiality/Deal-scope checks | A pass removes only the tested mechanical blocker. A failure blocks the dependent stage or readiness posture. |
| **AI-assisted judgment** | AI proposes an interpretation, prioritization, materiality assessment, scenario, or recommendation with evidence, alternatives, uncertainty, and falsifiers. | conflict explanation, buyer rationale, diligence severity, process health, bid comparison, valuation read-through, recommendation | Cannot become controlling without a named Banker decision when material. |
| **Banker-reserved judgment** | Professional judgment whose meaning and suitability cannot be reduced to a mechanical test. | materiality, source sufficiency for intended use, valuation method/interpretation, buyer quality, process strategy, bid trade-off, recommendation suitability | Individual Banker only; must be recorded when it changes state or readiness. |
| **Explicit Human Decision** | A durable, typed decision on an exact object/version, not a vague review acknowledgment. | accept Claim as Fact, approve Assumption, resolve conflict, accept risk, approve buyer/wave, select recommendation, approve a readiness exception if allowed | Individual Banker; creates a Decision record with scope, rationale, conditions, time, and invalidation triggers. |
| **External-Use Decision** | Separate authorization to use an exact Deliverable Revision for an exact audience and purpose. It is not implied by QC or readiness. | authorize a named Revision for client, buyer, lender, committee, board, counsel, or other external recipient/use | Individual Banker with required firm/client/counsel controls satisfied; any changed Revision requires a new decision. |
| **Prohibited autonomous action** | The product may neither perform nor infer authorization for the action. | contact a Buyer, send email, disclose material, open/grant VDR access, accept/select a Bid, grant exclusivity, alter a deadline, make a filing, represent client approval, or circulate externally | No autonomous promotion. The product can prepare a proposed action packet only. |

**Product design decision:** “AI generated it and the user can look at it” is not human control. Human control exists only where the controlled object, decision, decision-maker, evidence, scope, version, time, conditions, and downstream effect are explicit.

## 4. End-to-End Work Contract

### 4.1 Stage advancement notation

- **Yes — draft lane:** may automatically enter the next internal draft stage when all deterministic preconditions pass.
- **Conditional:** may advance only into a named degraded/draft posture; it may not cross the specified readiness or decision gate.
- **No — Human Decision:** the next state requires an explicit Banker decision on the current version.
- **No — blocked:** evidence, rights, confidentiality, calculation, model, or integrity failure must be corrected first.

### 4.2 Full stage contract

| Stage | AI may execute | Deterministic computation / validation must execute | Banker must confirm or decide | Required Evidence | Observable output | Failure / insufficient-evidence behavior | Auto-next? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **1. Ingestion** | inventory files; propose Deal association, type, version relationship, confidentiality and intended use | file integrity/type/size/hash; malware policy; supported-format check; exact Deal binding; duplicate/version comparison; required rights/confidentiality fields | confirm ambiguous Deal, authority, rights, intended use, confidentiality, and version relationship | authorized file/export plus Ticket 6 Source Record metadata | immutable receipt, hash, Source Record proposal, exceptions | quarantine or metadata-only; do not parse blocked/unassessed content; wrong-Deal ambiguity fails closed | Conditional; only authorized, Deal-bound material proceeds |
| **2. Extraction** | extract text, fields, numbers, headings, objects, notes, formulas, metadata | preserve byte/source hash and native locator; coverage accounting; required-field/type checks; round-trip spot fixtures | confirm material low-confidence or ambiguous fields before reliance | exact Source Version and extractor/run version | derived extraction with field spans, confidence, coverage, unresolved regions | mark unknown/partial; request native source; no unsupported value is emitted as Fact | Yes — draft lane for verified portions only |
| **3. OCR / table recognition** | propose OCR text, table structure, merged cells, headers, footnotes and chart labels | page/object coverage; cell grid consistency; totals/row-column checks where applicable; compare OCR to image/native text | confirm material image-only tables, footnotes, signs, decimal points, units and labels | rendered page/image plus exact page/object region and native file version | OCR/table object with bounding boxes, cell provenance and exception map | request native XLSX/CSV/PDF; preserve image and alternatives; affected material content blocks circulation | Conditional; low-risk draft only |
| **4. Normalization** | propose entity/metric mappings, definitions, periods, units, currency, sign and canonical labels | unit/scale/percentage/bps conversion; date/period mapping; sign rules; stable IDs; reversible mapping; totals and schema validation | confirm ambiguous definitions, mappings, fiscal periods, currency basis and material reclasses | extraction plus source definition/footnote and mapping basis | normalized record plus source value, normalized value, method, mapping confidence, exception | preserve raw; mark unknown or competing mappings; no silent conversion | Conditional; material ambiguity blocks quantitative handoff |
| **5. Classification** | classify source, Claim type, work object, confidentiality, process event and evidence category | taxonomy/enumeration validity; mandatory separation of Claim/Fact/Assumption/Calculation/Analysis/Recommendation | decide material disputed classifications and confidentiality overrides | source content and applicable taxonomy/policy | classification proposal, rationale, alternatives, review flag | use most conservative permitted state; do not upgrade source or evidence authority | Yes — draft lane; disputed material class is gated |
| **6. Source comparison** | align semantically comparable items; propose conflict type and likely explanation | verify same entity/metric/definition/period/unit/currency/scenario/version basis before numeric compare; compute variances | resolve material conflict or approve exact scenario/Assumption treatment | both or all Source Versions with locators and authority metadata | conflict set, competing values, variance, likely causes, downstream dependents | preserve all interpretations; no silent averaging; block current Fact and circulation when material | No — Human Decision for material conflict |
| **7. Claim extraction** | split compound statements into atomic, falsifiable Claims; capture qualifiers and implied assumptions | stable Claim ID; citation locator existence; required fields; source/Deal/version binding | identify missed/material claims and correct scope or wording | exact source passage/object and qualifiers | Claim Ledger entry with attribution, claim type, definition status and evidence ask | mark extraction uncertainty; retain source wording; never treat extracted Claim as Fact | Yes — draft lane |
| **8. Fact proposal** | propose that a Claim is sufficiently supported for a stated purpose; present support and conflicts | evidence-link existence; coverage, date, rights, version, conflict and required-field gates; ensure no derived-self-citation | **accept the exact Claim as Fact** for stated scope/purpose/version, or reject/defer | appropriate Source Material, complete material lineage, no unresolved material conflict | Fact proposal with supporting Evidence Items, limitations, validity scope and decision slot | remain Claim/unknown; request source; output ceiling inherited from Ticket 6 | No — Human Decision when material |
| **9. Assumption proposal** | propose explicit assumption, rationale, range, alternatives, replacement evidence and affected outputs | unique ID; owner/status/scope/version; bounds/unit/period validation; dependency registration | **approve, modify or reject** exact Assumption and permitted use | reason for gap, available evidence, alternatives and sensitivity impact | Assumption proposal/register entry and required scenario set | no tacit default; use unknown, source request, or sensitivity-only output | No — Human Decision when material |
| **10. Financial calculation** | select candidate formula from approved definitions; explain result and anomalies | perform arithmetic/formula; precision/rounding; unit/currency/period/sign checks; input completeness; tie-out; independent recomputation | confirm definition, accounting/transaction treatment and professional use of output | cited inputs, approved assumptions, formula/version, calculation run | Calculation record, inputs, formula, result, checks, exceptions and lineage | no LLM arithmetic as final result; failed/unsupported calculation is blocked or sensitivity-only | Yes only after deterministic pass; judgmental treatment stays gated |
| **11. Model construction / update** | propose drivers, mappings, forecast logic, cases and changes; populate approved inputs | formula/dependency build; recalculation; sources-and-uses, balance, roll-forward, directionality, error, external-link, cached-value and model-citation checks | approve model purpose, methods, key assumptions/treatments, scenarios, material exceptions and readiness use | controlled source packet, approved assumptions, model version, formulas and dependency lineage | versioned model, run log, model citations, checks, status, change set | `not-decision-ready` or `screen-grade`; do not claim decision readiness from clean formula checks | No — Human Decision for material method/readiness |
| **12. Scenario analysis** | propose coherent base/downside/upside and sensitivities; explain what must be true | recompute every case; verify scenario isolation, bounds, directionality, dependency integrity and output consistency | approve scenario definitions, ranges, weighting if any, and use | approved Fact/Assumption set, controlled model and scenario basis | scenario set, deltas, breakpoints, sensitivities, falsifiers | missing Fact becomes explicit Assumption/range; otherwise sensitivity-only; no false base case | Conditional; results can draft, recommendation cannot auto-promote |
| **13. Valuation / transaction analysis** | propose method set, comparable interpretation, bridge, risk read-through and caveats | compute multiples, ranges, EV/equity bridges, accretion/dilution, returns and sensitivities; validate pairing, dates, shares, signs and tie-outs | choose methods, peer treatment, selected range/interpretation, bridge judgments, materiality and stated use | current authorized market/deal sources, controlled model outputs, definitions and assumptions | analysis with method-specific evidence, calculations, alternatives and open judgments | screening/range only; `N/A`, `N/M`, unknown, or not supportable; never a formal opinion | No — Human Decision for conclusion/use |
| **14. Buyer research and prioritization** | research authorized/public sources; resolve entities; propose Candidate, fit, risk, tier and outreach rationale | entity/deal isolation; duplicate/parent mapping; hard-screen and do-not-contact gates; scoring arithmetic; source/freshness/rights checks | confirm Candidate vs Approved Buyer, fit, material risks, exclusions and outreach priority | authorized preferences/restrictions, current source support, conflicts/confidentiality posture | Candidate universe, evidence, rationale, confidence vector, holds and proposed waves | candidate/watchlist only; unknown relationship/capacity/interest; high score never authorizes contact | No — Human Decision for Approved Buyer/Wave |
| **15. Diligence issue detection** | detect anomaly, contradiction, missing proof, risk and likely resolution; propose severity/materiality | link issue to Claims/Evidence/source asks; verify duplicate/coverage; compute variances where numeric | decide materiality, owner, disposition, accepted risk and effect on process/readiness | source comparison, model checks, process evidence and applicable Deal context | issue/red-flag record with why it matters, evidence needed, falsifier and impact | label possible/blocked; request evidence; do not manufacture conclusion | Conditional; material disposition requires Human Decision |
| **16. Process-event extraction** | extract event, party, status, deadline, condition and proposed Process State transition | timestamps/timezones/deadline math; source hierarchy; event dedupe; allowed state transitions; Deal/party/access scope | confirm ambiguous or material events, access authority, exceptions and resulting strategy | exact process letter, NDA, Bid, tracker, email/calendar/export or Human Decision basis | immutable Process Event proposal, source, confidence and proposed state delta | silence is not a pass; scheduled is not completed; unknown stays unknown; prohibited transition blocked | No for material state/access change; otherwise conditional draft |
| **17. Bid comparison** | normalize terms; identify differences, conditions, trade-offs and proposed labels | exact bid/version binding; economic calculations; currency/structure/period normalization; comparable-field and missing-term checks | confirm interpretations; decide material weights, accepted limitations, bid advancement or selection | exact IOI/Bid/LOI versions, financing/approval/condition evidence and seller priorities | side-by-side comparison, risk-adjusted analysis, unknowns and decision packet | summary-only if original bid absent; not comparable if material terms unclear; no autonomous selection | No — Human Decision |
| **18. Recommendation** | propose action with evidence, alternatives, counterarguments, risks, confidence vector and triggers | verify every factual/numeric dependency, citation, unresolved blocker, decision precondition and consistency | make, reject or modify the recommendation; own materiality, trade-off and action | supported Facts, approved Assumptions, valid Calculations/Models, open issues and scenario results | versioned Recommendation proposal and Banker Decision | abstain or provisional recommendation; list evidence required; block action if authority/evidence missing | No — Human Decision |
| **19. Deliverable drafting** | draft narrative, tables, charts, footnotes, source notes and internal/external variants | populate from controlled objects; citation insertion/existence; required section/field checks; number/label consistency; confidentiality filters | confirm intended audience, purpose, content boundary, narrative and sensitive disclosures | exact approved source/analysis/model object versions plus intended-use instruction | new Deliverable Revision with content-to-source/model lineage and open items | Working Draft only; placeholders/unsupported material content visibly block higher readiness | Conditional; never external automatically |
| **20. Consistency checking** | find semantic contradictions, misleading framing and definition drift | exact cross-artifact number, period, unit, currency, sign, scenario, label and citation checks | resolve material narrative/interpretive inconsistencies and choose controlling treatment | all relevant Revision/model/source versions | issue log, affected locations, controlling source proposal and pass/fail results | material mismatch blocks senior-review-ready and circulation candidate | Yes only after mechanical pass; judgment issues remain gated |
| **21. Revision** | propose edits and explain changed claims, analysis, recommendation and visuals | create new immutable version; diff; lineage preservation; dependency and approval invalidation; required-field/citation checks | approve revised judgment/content and reconfirm affected prior decisions | prior Revision, exact change request/correction, current source/model versions | new Revision, diff, invalidated controls, impact assessment and review plan | never overwrite; incomplete impact assessment blocks promotion | Conditional; affected gates reset |
| **22. QC** | inspect substance, narrative, chart-message alignment, professional usability and visual defects | formula/tie-out/cross-artifact/citation/schema/required-field/render/extraction checks; page/slide/sheet render completion | review named material findings, intended audience suitability, limitations and accepted residual risk | exact candidate Revision plus controlling model/source and rendered artifact | QC result by test class, severity, location, owner and remediation state | critical/high material failure blocks; heuristic “no issue” never proves readiness | No for readiness promotion; remediation may loop automatically |
| **23. Readiness assessment** | assemble evidence and propose a readiness classification with reasons and blockers | evaluate rule-based gates and confirm all required Decisions/reviews apply to exact versions | decide professional suitability and any permitted residual-risk acceptance | complete readiness evidence bundle, latest Reviews/Decisions and intended-use context | independent status for source, calculation/model, consistency, confidentiality, professional review and intended use | most restrictive material gate controls; no averaging; false promotion is a critical defect | No — Human Decision for senior/circulation posture |
| **24. External-use preparation** | prepare clean candidate, disclosure/caveat set, recipient-specific redactions and action packet | exact Revision lock/hash; audience/confidentiality/rights/access checks; remove internal notes; final citations/numbers/render checks; prior decision validity | specify exact audience, purpose, channel, timing, restrictions and whether external use is authorized | circulation-candidate Revision, required approvals/authority, recipient/use context | External-Use Decision packet and locked candidate; no transmission | any uncertainty, changed version, expired condition, restriction or blocker fails closed | No — External-Use Decision; product does not transmit |

### 4.3 Permitted readiness ladder

**Product design decision:** stages do not collapse into one progress percentage. A Revision may occupy only the highest posture whose independent gates pass:

1. **Working Draft** — incomplete and explicitly not suitable for senior reliance or circulation.
2. **Senior-Review Candidate** — mechanically reviewable, with material gaps and decision requests visible; not yet senior-review-ready.
3. **Senior-Review-Ready** — source, calculation/model, consistency, confidentiality, and named professional-review gates pass for a defined internal purpose.
4. **Circulation Candidate** — exact Revision is prepared for a defined audience/purpose and has no unresolved material circulation blocker.
5. **External Use Authorized** — a separate External-Use Decision exists for that exact Revision, audience, purpose, conditions, and time.

No state automatically promotes to the next. In particular, Senior-Review-Ready does not imply Circulation Candidate, and Circulation Candidate does not imply External Use Authorized.

## 5. Evidence and Citation Contract

### 5.1 Evidence burden by object

| Object | Required evidence and control | What the object may establish | What it cannot establish by itself |
| --- | --- | --- | --- |
| **Claim** | exact attributed source passage/object; source/version/Deal identity; qualifiers, period, scope and native locator | that the named source made or displayed the statement | that the statement is true, sufficient, current, reliable, rights-cleared for every use, or accepted as Fact |
| **Fact** | one or more reliance-eligible Source Materials appropriate to the claim; complete material locator; source authority/freshness/rights/conflict assessment; explicit Banker acceptance for stated scope when material | a controlled proposition may be used as factual for its stated purpose, period, perimeter and version | universal truth, future truth, suitability outside the approved scope, or carry-forward after material change |
| **Assumption** | explicit owner, rationale, unit/period/scope, bounds or alternatives, approval, affected outputs, replacement-source need and expiry/review trigger | a chosen input or premise may be used for a bounded scenario/purpose | that the premise is evidenced Fact or externally accepted |
| **Calculation** | cited Fact/approved-Assumption inputs; formula and definitions; calculation engine/run version; precision/rounding; units/currency/period/sign; deterministic checks and tie-outs | reproducible mechanical result under the stated inputs and formula | that inputs are true, chosen treatment is professionally correct, result is material or suitable, or output is externally usable |
| **Analysis** | lineage to all material Facts, Assumptions and Calculations; method, alternatives, exclusions, conflicts, sensitivities and intended question | a reasoned interpretation under an explicit evidence and method perimeter | that the Banker adopts the interpretation or that it is a formal professional opinion |
| **Recommendation** | supported Analysis; decision criteria; alternatives; counterarguments; risks; unresolved issues; falsifiers; intended action and required authority | what the system proposes and why | client/Banker approval, process authorization, Bid selection, or permission to act |

An Evidence Item records how a Source Material object supports or challenges one atomic proposition. A citation is the locator carried by that Evidence Item. A citation is necessary for material sourced work but never sufficient evidence on its own.

### 5.2 Locator precision by source type

**Product design decision:** “file name,” “company filings,” “the model,” or a generic URL is not a sufficient locator for a material claim when a more precise native pointer is available.

| Source type | Minimum material locator |
| --- | --- |
| **File / archive** | stable Source ID; exact filename/path inside supplied package; source version digest/hash; received/access date; applicable archive member path and archive digest |
| **PDF / image** | source version digest; zero-based file-page index plus displayed page label; section/table/figure/footnote; exact quote or table-cell context; bounding box/region; original text-layer vs OCR/image-read identity |
| **PPTX** | source version digest; slide part URI; slide ID and relationship ID; current ordinal for display; shape ID/name; text paragraph/run, table cell, chart element, notes or footnote selector |
| **XLSX / XLSM** | source version digest; workbook-to-worksheet relationship/identity; sheet name; cell/range or structured table/name and stable row/column labels; displayed and formula values; calculation/cached-value state; source/input dependencies |
| **DOCX** | source version digest; package/story part; bookmark ID/name when present, otherwise heading plus paragraph/run structural path and exact quote/prefix/suffix; table cell, footnote, comment or track-change identifier; relevant revision/author metadata |
| **CSV / TSV** | source version digest; encoding, delimiter and header state; stable row key plus column/header identity, or RFC 7111 row/column/cell range; exact record excerpt; export metadata, filters/scope and units/period definition |
| **SEC Inline XBRL** | EDGAR accession/submission and filed document version; visible filing location; concept; entity and full context/period/dimensions; unit; unscaled fact value; decimals/precision; sign/negating-label treatment; taxonomy/version; exact visible excerpt |
| **Other public web** | issuer/publisher; canonical authoritative URL; captured representation/digest and retrieval time; document/form/title; publication/effective date; TextQuote exact/prefix/suffix plus page/section/table/position/fragment selector where available |

SEC Inline XBRL is useful because a human-readable filing can also expose tagged facts with reporting period and other contextual information; this supports precise public-source lineage but does not eliminate the need to check definitions, amendments, filing version, source sufficiency, or intended use ([SEC Inline XBRL](https://www.sec.gov/data-research/structured-data/inline-xbrl), accessed 2026-07-31). The tagged value remains a filer assertion from that filing context; the tag and EDGAR validation do not automatically convert it into a product Fact.

### 5.3 Required lineage chains

- **Source-to-Claim:** `Source Record → Source Version → native locator → Evidence Item → atomic Claim`.
- **Source-to-cell:** `Source Version(s) → extracted/raw value → normalized value → Fact or approved Assumption → Calculation input → formula/dependency → exact workbook/model cell and model version`.
- **Source-to-slide:** `supported Claim/Fact/Calculation/Analysis → chart/table/text object → exact slide/object → footnote/citation → Deliverable Revision`.
- **Source-to-deliverable:** every material statement, number, chart and recommendation maps through its constituent objects to Source Material; the Revision records complete upstream version IDs and current readiness state.

The lineage must be bidirectional enough to answer both questions: “What supports this output?” and “Which outputs are affected if this source or assumption changes?”

### 5.4 Multiple, conflicting and missing sources

- **Multiple support:** preserve each source's distinct proposition, authority, freshness, rights, scope and contribution. Corroboration may raise evidence coverage; it does not permit double-counting copied or dependent sources as independent proof.
- **Conflict:** preserve both values/interpretations and the conflict state. AI may propose whether the cause is period, definition, scale, currency, restatement, pro forma treatment, scope, mapping or version. A material conflict prevents Fact status until the Banker resolves the exact use or approves an explicit scenario/Assumption.
- **Missing source:** follow Ticket 6 exactly: omit or mark unknown; request the source; propose an explicit Assumption only when permitted; or produce bounded scenario/sensitivity work. A material missing source blocks the affected readiness gate and Circulation Candidate.
- **Rights blocked/unassessed:** no substantive processing or reliance; an Assumption cannot cure missing authority, confidentiality, license or withdrawal.
- **Stale or superseded:** preserve historical provenance, remove prospective reliance where required, run Impact Assessment, and block affected prior circulation candidates.

### 5.5 Derived Work is never self-evidence

- AI output cannot cite itself as proof of its factual content.
- A summary supports only that a summary was generated, not that the summarized proposition is true.
- An extraction is evidence of what the extractor proposed from the source; the Source Material remains the evidentiary origin.
- A normalized value is a transformation of a source value; it must preserve both the source locator and normalization method.
- A formula cell is a calculation location, not the source of its inputs.
- Agreement among a memo, model, deck and tracker can indicate consistency while all four remain wrong because they share the same unsupported input.

**Verified plugin fact:** the official plugin already distinguishes source logs, evidence labels, tie-outs, model cell citations and strict handoff validation, and warns that static/model/artifact scripts are aids rather than judgment. **Productization requirement:** V1 strengthens that baseline by disallowing generic `model-output` or generated-support placeholders as sufficient provenance for any material readiness promotion.

## 6. Confidence and Sufficiency Contract

### 6.1 No scalar truth score

NIST states that valid and reliable behavior is necessary but not sufficient for trustworthy AI, that thresholds depend on context and human judgment, and that testing should represent expected use ([NIST AI RMF 1.0](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf), §§3–3.1 and GOVERN/MAP/MEASURE/MANAGE, accessed 2026-07-31). NIST's Generative AI Profile identifies confidently false content and fabricated logic or citations as confabulation risks and calls for provenance, ground-truth evaluation, source/citation review, monitoring and incident tracking ([NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf), §§2.2 and MP/MS/MG, accessed 2026-07-31).

**Product design decision:** V1 will never expose one aggregate “confidence” number as a proxy for truth, readiness, or authority. It will maintain the following independent vector:

| Dimension | Meaning and states | Machine role | Banker role | Blocking effect |
| --- | --- | --- | --- | --- |
| **Extraction confidence** | likelihood that derived text/field/table matches the visible source region; `not_extracted / low / medium / high / verified_for_stated_fields` | estimate from extractor agreement, format signals and deterministic/fixture checks; identify unreviewed regions | confirm material low-confidence or visually ambiguous fields | material low/unknown coverage blocks reliance; high does not prove truth |
| **Evidence coverage** | whether required propositions/inputs have complete supporting Evidence Items; `none / partial / complete_for_scope` | compute required-vs-supported atoms and locator presence | decide whether the defined evidence set is sufficient for the intended professional use | incomplete material coverage blocks affected readiness |
| **Source authority** | source fitness relative to the exact proposition and purpose; `unassessed / low / medium / high / controlling_for_scope` | apply source-type and directness rules; surface contradictory hierarchy | determine task-specific sufficiency and any justified override | unassessed/low authority may cap or block depending on materiality |
| **Freshness** | temporal suitability; Ticket 6 states plus source volatility and requested period | compare dates/version expectations; detect likely supersession | decide suitability for intended use and whether historical evidence is acceptable | stale/unknown time-sensitive material blocks current Fact/circulation |
| **Conflict state** | `none_identified / possible / material_unresolved / resolved_with_rationale` | detect comparable-source differences and retain alternatives | resolve material conflict for exact use | material unresolved blocks Fact and circulation |
| **Calculation validity** | `not_run / failed / passed_with_exceptions / passed` for arithmetic, formula, units, precision and tie-outs | deterministic only; produce reproducible check evidence | confirm definitions/treatments and accept only permitted exceptions | failed blocks dependent result; pass says nothing about professional use |
| **Model integrity** | `not_assessed / failed / mechanically_valid / source_limited / review_ready_for_scope` | formulas, dependencies, recalculation, balance, roll-forward, sensitivity and error scans | judge model purpose, economic logic, material assumptions, methods and readiness | mechanical validity without source/professional support caps posture |
| **Professional judgment requirement** | `none / suggested / required / decision_recorded` | policy/materiality indicators flag likely need; never auto-waive | owns materiality and exact decision | required without Decision blocks promotion/action |
| **Intended-use suitability** | `unspecified / working_draft_only / internal_scope_eligible / circulation_candidate / external_use_authorized` | enforce prerequisite gates and exact version/audience/purpose match | decide professional suitability and External-Use Decision | most restrictive material condition controls |

### 6.2 Sufficiency rule

Readiness uses blocker precedence, not addition or averaging:

`Permitted posture = minimum posture allowed by rights/confidentiality, source reliance, extraction coverage, evidence coverage, freshness/conflict, calculation validity, model integrity, consistency/QC, professional decisions, and intended-use authorization.`

A green dimension cannot compensate for a red one. “High extraction confidence + missing source authority” remains unsupported. “Perfect formula integrity + unapproved assumption” remains model work, not a professionally adopted conclusion. “Complete citations + prohibited rights” remains blocked.

## 7. Abstention and Degraded Operation

### 7.1 Mandatory system behavior

| Trigger | Required system behavior | Maximum posture until resolved |
| --- | --- | --- |
| No evidence for a requested fact or event | **Refuse to infer**; mark unknown; request the precise source | Working Draft; affected Fact/readiness blocked |
| Source contains two plausible readings | **Preserve competing interpretations** with locators and downstream differences | Working Draft or Senior-Review Candidate; circulation blocked when material |
| Evidence gap can be bounded and analysis remains useful | propose an **explicit Assumption** with owner, range, alternatives and replacement source; do not apply before required approval | Scenario/sensitivity draft only until approval |
| Missing current actual/definition/unit/period/currency/reconciliation | request source/definition; show raw alternatives; no normalized quantitative conclusion | Affected quantitative work blocked or working draft only |
| Forecast/model source missing but a decision question can be bracketed | produce **sensitivity/scenario analysis only** on approved assumptions | No forecast-dependent recommendation or circulation |
| Extraction/OCR/table/visual coverage is incomplete | use only verified regions; request native file; make coverage gap visible | Working Draft; material affected circulation blocked |
| Material source is stale, superseded, withdrawn, rights-blocked or confidentially restricted | remove prospective reliance as Ticket 6 requires; assess dependents | Circulation blocked; regeneration/re-review as applicable |
| Material conflict unresolved | show both cases or stop at conflict; no chosen Fact | No Senior-Review-Ready or Circulation Candidate for affected conclusion |
| Deterministic calculation/model check fails | quarantine affected output; recalculate after correction; do not draft around the failure as if valid | Blocked for affected analysis/recommendation/deliverable |
| Mechanical checks pass but professional suitability is unresolved | label calculation/model status separately; request named Banker decision | Senior-Review Candidate at most |
| Material content lacks citation or lineage | remove/qualify content or request source; do not manufacture citation | Working Draft; circulation blocked |
| Any changed source/assumption/model/intended audience affects an approved object | require Impact Assessment, regeneration/recalculation and **re-review** | Prior candidate/authorization suspended for affected scope |
| Generated artifact has material visual or semantic defect | require repair and **regeneration** followed by targeted and regression QC | Circulation blocked |
| Exact audience/purpose/Revision has no External-Use Decision | prepare candidate only; do not transmit or imply authorization | Circulation Candidate at most |

### 7.2 Ticket 6 Missing-Source Consequences are controlling

This contract does not weaken Ticket 6. In particular:

- missing material current financials prevent current financial normalization, model-ready posture, material financial Facts and related circulation;
- missing budget/forecast/model permits historical work and approved-Assumption scenarios only, not an externally used forecast-dependent recommendation;
- missing definitions/units/periods/currency/reconciliation blocks professionally usable quantitative conclusions;
- a missing exact IOI/Bid/LOI blocks decision-grade Bid comparison and selection;
- missing buyer preferences/restrictions prevents Candidate-to-Approved Buyer and Outreach Wave decisions;
- missing NDA/disclosure authority blocks Buyer-facing disclosure and access;
- missing controlling source/model for a Deliverable Revision limits QC to inventory/visual/heuristic work and blocks source/model tie-out and circulation;
- no model guess may fill any of these gaps.

## 8. Deterministic Work Boundary

### 8.1 Work that must not rely on a language model alone

| Deterministic domain | Required control |
| --- | --- |
| Arithmetic and financial formulas | execute in controlled code/calculation engine; preserve formula, inputs, precision and run version; independently recompute material outputs |
| Spreadsheet formulas and cached values | inspect formulas/dependencies and recalculate in a capable engine where reliance requires it; record recalculation state; never equate the last cached value with a fresh calculation |
| Tie-outs, balances and subtotals | sources-and-uses, balance sheet, cash flow, debt roll-forward, shares/ownership, EV-to-equity, bid totals, segment totals and other applicable identities |
| Unit, scale, period, currency and sign normalization | explicit reversible conversion rules; preserve raw values; detect factor-of-1,000/1,000,000, percent/bps and actual/forecast errors |
| Cross-document numeric reconciliation | compare only matching entity/definition/period/unit/currency/scenario/version; compute variance and flag conflicts |
| Model construction/update mechanics | formula/dependency generation, full recalculation, error scans, circularity/iteration state, external links, formula-family breaks and scenario isolation |
| Version and change detection | hashes, stable IDs, immutable versions, field/object diffs, supersession/withdrawal status and dependent-object inventory |
| Citation and lineage existence | source/locator/object existence, exact version binding, broken link/range checks, material-claim coverage and no derived-self-citation rule |
| Required fields and schemas | typed-object validity, allowed states, IDs, ownership, decision scope, audience/purpose and gate prerequisites |
| Process state transitions | allowed transition/event/source/authority rules; no event inferred from silence; immutable event history |
| Deadline and date calculations | timezone, business/calendar-day basis, effective date, amendments, extensions, expiry and current timestamp |
| Deliverable consistency | exact recurring values, definitions, labels, periods, units, currency, scenarios, cited model cell/source version and internal/external content separation |
| Deal isolation and confidentiality controls | exact Deal/source/recipient scope, rights/classification and prohibited cross-Deal retrieval/disclosure tests |
| Artifact generation checks | file integrity, expected pages/slides/sheets, no placeholder/internal note leakage, render completion and required visual inspections |

Microsoft's Open XML documentation states that a spreadsheet cell's value element stores the **cached** value from the last calculation; it may be omitted and calculated by the spreadsheet reader on open. Therefore formula presence and cached output are distinct evidence states ([Microsoft Learn — Working with formulas](https://learn.microsoft.com/en-us/office/open-xml/spreadsheet/working-with-formulas), accessed 2026-07-31).

### 8.2 Mechanical correctness is not professional usability

Deterministic work can establish that a formula ran, a balance tied, a citation resolves, or two displayed numbers match. It cannot decide:

- whether the source or definition is the right one for the transaction question;
- whether an adjustment, add-back, net debt item, synergy, buyer, Bid condition or diligence issue is material;
- whether a valuation method, peer set, scenario, recommendation or narrative is professionally appropriate;
- whether a visually accurate artifact is misleading by selection, emphasis or omitted qualification;
- whether the exact Revision is suitable or authorized for an intended audience.

Those are AI-assisted and Banker-reserved judgments with the explicit controls in §9.

## 9. Banker Control Boundary

### 9.1 Decisions reserved to the Individual Banker

The product must require an explicit, recorded Human Decision for at least the following material decisions:

1. **Accept Claim as Fact** — name the atomic Claim, accepted proposition, scope, period, definition, Evidence set and exact version.
2. **Approve Assumption** — name the input/premise, bounds, rationale, allowed Models/Analyses, scenario and expiry/review trigger.
3. **Resolve source conflict** — preserve competing sources/values, select or constrain the working treatment, give rationale and identify remaining limitations.
4. **Judge materiality** — identify the object/failure, decision context, threshold or rationale and readiness consequence.
5. **Select valuation/transaction method and key interpretation** — specify method set, selected peers/range, adjustments, bridge treatments, sensitivities and intended question. The result remains Analysis, not a fairness/formal valuation/solvency opinion.
6. **Confirm Buyer Candidate or Approved Buyer** — approval is distinct from research ranking; identify restrictions and permitted disclosure posture.
7. **Approve Outreach Wave** — identify exact Approved Buyers, sequence, permitted materials/disclosure, conditions and timing. The product still does not contact anyone.
8. **Select or recommend a Bid** — decide material priorities and trade-offs among value, structure, financing, approvals, diligence, regulatory risk, timing, certainty and seller objectives.
9. **Accept risk or unresolved item** — state exact risk, evidence gap, scope, conditions, owner, expiration and effect on readiness; hard rights/confidentiality/Deal-isolation blocks cannot be waived by this decision.
10. **Confirm Deliverable Revision audience and purpose** — bind review and content suitability to the exact Revision and intended use.
11. **Make External-Use Decision** — authorize or reject the exact locked Revision for the exact audience, purpose, channel/timing, conditions and source/evidence perimeter.

### 9.2 Human Decision record

Every material Human Decision must expose:

| Field | Requirement |
| --- | --- |
| Decision type and outcome | exact controlled transition or accepted/rejected/modified decision |
| Decision-maker | authenticated Individual Banker identity; role/capacity relevant to the decision |
| Controlled object | object ID, exact version/Revision/hash and fields/Claims/Assumptions/conflicts covered |
| Scope and perimeter | Deal, company/entity, period, metric definition, scenario, source/evidence set and excluded scope |
| Intended audience and purpose | mandatory for readiness, Revision and external-use decisions |
| Alternatives and contrary evidence | material competing interpretations, recommendations, unresolved items and why they were not selected |
| Conditions and restrictions | confidentiality, rights, approvals, expiry, review triggers and actions that remain prohibited |
| Rationale | concise professional basis, not a generic `approved` flag |
| Time | decision timestamp, applicable as-of/effective time and any expiration |
| Downstream effect | objects promoted, blocked or invalidated; recalculation/regeneration/re-review requirements |

**Product design decision:** confirmation inheritance is fail-closed. A later Revision, changed source/assumption/model/method, different audience/purpose, expired condition, or material new issue invalidates the prior decision for the affected scope. An unchanged sub-object may retain approval only if deterministic Impact Assessment proves its inputs, meaning, presentation, audience and purpose are unchanged and the decision's own conditions allow reuse.

## 10. Correction and Change Propagation Contract

### 10.1 No silent overwrite

When a Banker corrects AI extraction, classification, Claim wording, Fact proposal, Assumption, calculation input, Process Event, recommendation or Deliverable content, the product must preserve:

- original object/version, value/text and AI origin;
- corrected object/version and exact changed fields;
- corrector, time, reason and supporting source/decision;
- prior and new confidence/sufficiency dimensions;
- all dependents assessed, affected and unaffected;
- required recalculation, regeneration, re-review and circulation consequences;
- prior Reviews/Decisions and why they remain valid, are narrowed, or are invalidated.

The corrected state is a new version or Revision linked to the prior state. Rejected, overturned or superseded AI outputs, Facts, Assumptions, Analyses and Recommendations remain available as historical provenance and cannot appear as current controlling state.

### 10.2 New Source Record or Source Version

Every new, amended, superseding, corrected, withdrawn, rights-changed or newly accessible Source Record triggers an observable Impact Assessment:

1. establish exact Deal, source identity, version, effective/as-of period and rights/confidentiality state;
2. compare with prior Source Versions and identify changed, added, removed or conflicting propositions;
3. traverse source-to-Claim/Fact/Assumption/Calculation/Model/Analysis/Recommendation/Deliverable/Review/Decision lineage;
4. classify each dependent as unaffected, potentially affected, materially affected or unable to assess;
5. set Recalculation, Regeneration, Re-review and Circulation Blocked flags with reasons;
6. execute deterministic tasks; generate proposed interpretive changes; obtain required Banker decisions;
7. create new object/Revision versions and preserve the pre-change state.

### 10.3 Propagation rules

| Change | Recalculation required | Regeneration required | Re-review required | Circulation consequence |
| --- | --- | --- | --- | --- |
| Extracted numeric value, formula input, unit, period, currency, sign, definition or approved Assumption changes | Yes, for all dependency paths | Yes where results/narrative/tables/charts change | Yes for material results or meaning | affected candidate/authorization suspended immediately |
| Source text changes but no material proposition changes | verify dependency equivalence and citations | only citations/representation if needed | only if locator/context or intended use changes materially | blocked until equivalence and citation validity established |
| Source becomes stale, superseded, withdrawn, rights-blocked or confidentially restricted | if alternative source/input changes | Yes for any output that relied on it | Yes | affected external use blocked; hard rights/withdrawal restriction cannot be waived |
| Material conflict appears or is resolved | both competing cases and selected case as applicable | Yes for affected Analysis/Recommendation/Deliverable | Yes; exact conflict decision required | blocked until allowed treatment and review complete |
| Model formula/dependency/engine changes | full dependent recalculation and regression checks | Yes for downstream artifacts | Yes for material model outputs/use | affected candidate/authorization suspended |
| Banker changes materiality, method, Buyer/Bid status, recommendation or intended audience/purpose | recalculate if decision changes inputs/weights | Yes | Yes | prior circulation decision does not carry forward |
| Cosmetic edit proven not to change content, citations, layout meaning or audience | No | new Revision may still be generated | targeted visual QC; no substantive re-review if proof passes | prior external-use decision still does not authorize the changed file unless its defined conditions explicitly cover byte-level rendering changes |
| Wrong-Deal, confidentiality, rights or leakage issue | quarantine; recompute only after clean source set established | regenerate from clean set | mandatory | immediate block across all possibly affected objects |

The system must not rely solely on AI to determine the impact set. Deterministic dependency and version lineage establish candidate dependents; AI may propose semantic impact; the Banker decides material professional impact where required.

## 11. High-Impact Failure Modes

### 11.1 Severity convention

- **Critical:** can cause wrong Deal/client use, unauthorized disclosure/action, materially false economics, corrupted professional decision, or loss of provenance. Any observed Critical sentinel in the defined release suite is a release blocker.
- **High:** can materially mislead senior review, valuation/process/recommendation or external artifact use. It blocks the affected readiness/circulation posture and is a release blocker when the core workflow cannot reliably prevent or detect it.
- **Medium/Low:** localized qualification, usability or polish failure that must be repaired according to intended use but does not automatically become an industry-wide blocker.

### 11.2 Failure-control matrix

| Failure | Detection mechanism | Preventive control | Required human control | Readiness consequence | Evaluation method |
| --- | --- | --- | --- | --- | --- |
| **Hallucinated Fact or citation** | source/locator resolution; Claim-support entailment/challenge review; unsupported-atom scan; wrong-source negative tests | no self-evidence; AI-origin label; exact source binding; Claim cannot auto-promote | Banker accepts material Fact only against shown Evidence and limitations | Critical; affected Fact, recommendation and external use blocked | gold Claim-citation edges; fabricated locator/support sentinel cases |
| **Unsupported financial value** | source-to-cell lineage completeness; material-value citation coverage; independent recomputation | required source/input IDs, qualifier fields and explicit unknown/Assumption states | confirm Fact or approve exact Assumption/treatment | Critical when material; calculation/model/deliverable blocked | seeded unsupported values across sheets/docs; zero observed Critical sentinel |
| **Wrong period, unit, currency or sign** | typed comparison; conversion replay; source/display reconciliation; factor/sign anomaly tests | preserve raw value/context; reversible deterministic normalization; definition gates | resolve ambiguous definition/materiality and approve conversions where judgmental | High/Critical; affected quantitative work and circulation blocked | adversarial scale/percent/bps/FX/fiscal/sign fixtures and exact expected values |
| **Incorrect spreadsheet formula or cached value** | formula/dependency scan; approved-engine recalculation; cached-vs-recalculated comparison; tie-outs/directionality | formula generation rules; recalculation state; no reliance on cached `<v>`; controlled engine/version | approve method/assumptions and review material exceptions | Critical for material output; model not decision-ready | benchmark workbooks with broken references, hardcodes, stale caches, circularity and external links |
| **Stale or superseded source** | version/freshness monitoring; source hash/date comparison; supersession/withdrawal events | intended-use freshness policy; immutable versions and active-reliance state | decide suitability or replacement for exact use | affected current Fact/candidate blocked; Impact Assessment and re-review | versioned source pairs and volatility/use-specific gold states |
| **Unresolved source conflict** | comparable-source alignment and variance/definition/version conflict detection | retain competing values and conflict links; no silent averaging | resolve, narrow scope, or approve bounded scenario/Assumption | material Fact and circulation blocked | labeled conflict/non-conflict sets; measure missed material conflicts separately |
| **Wrong company, Deal or source contamination** | exact Deal/source/entity keys; retrieval isolation; cross-Deal canary and negative queries | fail-closed Deal binding; no global confidential retrieval; ambiguous entity quarantine | confirm ambiguous identity; cannot waive proven cross-Deal contamination | Critical; quarantine and block all possibly affected work | cross-Deal adversarial retrieval/generation/export suite; any leak blocks release |
| **Confidentiality leakage** | sensitive-content and recipient-scope scan; source/audience policy check; output diff | Ticket 6 classification, least disclosure, internal/external variants and locked candidate | External-Use Decision on exact Revision; hard restriction cannot be waived | Critical; external use blocked and incident/impact review required | seeded confidential tokens and recipient matrices; zero-leak sentinel |
| **Licensed-data rights violation** | provider/source rights state, license/use/export flag and lineage scan | exclude unassessed/blocked sources; customer-provided export rules; no invented entitlement | confirm authority within permitted scope; cannot override a blocked license | Critical; processing/reliance/export blocked; regenerate without source | rights-state transition and restricted-output tests |
| **Missing qualification** | Claim atom/qualifier completeness; period/unit/as-of/actual-estimate/pro forma labels; contradiction scan | required qualifiers, definitions and disclosure categories | judge materiality and approve professional framing | High when material; senior/circulation posture blocked | gold qualified propositions with intentionally omitted caveats |
| **Inconsistent numbers across workbook/deck/document** | canonical semantic-key comparison across exact versions; rounding policy | single controlled lineage; deterministic population and regression QC | resolve true exception and approve exact displayed treatment | High/Critical; circulation candidate blocked | cross-artifact seeded mismatches by period/unit/scenario/definition |
| **AI treats Claim as Fact** | typed-state transition audit; missing Banker Fact Decision or Evidence gate | Claim/Fact separate object types; no implicit upgrade from confidence/citation | exact Claim-as-Fact Human Decision | Critical gate bypass; downstream states invalidated | state-machine attempts across new/revised Claims; any bypass blocks release |
| **AI makes unauthorized process or external-use decision** | event/decision transition audit; action/tool-call and message/output log | prohibited-action policy; no send/contact/access/write connector path in V1; exact Decision prerequisites | Banker makes process and External-Use Decisions; product prepares only | Critical; action/circulation blocked and incident review | adversarial attempts to contact, select, disclose, change deadline/access or reuse old approval |
| **Visually broken or misleading artifact** | render completion; clipping/overlap/contrast/page-slide-sheet checks; chart-title/data/axis review; visual inspection | structured generation, source-linked charts, required render/QC loop | review exact rendered Revision for intended use and resolve misleading emphasis | High/Critical; Circulation Candidate blocked | golden render fixtures, seeded defects and qualified human visual adjudication |
| **Plausible but professionally unsuitable recommendation** | rubric for evidence, alternatives, counterarguments, assumptions, material risks, decision criteria and intended use; counter-analysis | AI recommendation remains proposal; force evidence and opposing-case display | Banker owns recommendation, method, materiality, trade-off and risk acceptance | High; never automatically senior/circulation-ready | blinded banker panel on representative cases; false adoption/over-promotion analyzed |

## 12. Evaluation Contract

### 12.1 Test-program requirements

Evaluation must be observable, reproducible and tied to this workflow:

- version the input corpus, Source Records, rights, ground truth, prompts/policies, model/tool/calculation-engine versions and expected results;
- stratify by source format, native vs OCR, table/layout difficulty, metric type, Deal phase, materiality, confidentiality, conflict, revision/change and intended-use posture;
- keep generation and evaluation truth independent; AI output cannot become gold truth without human adjudication against Source Material;
- evaluate pre-release, on any material model/tool/policy/workflow change, and continuously using rights-safe production-derived error/override patterns;
- record false pass and false block separately; false promotion toward circulation/external use is more severe than conservative blocking;
- retain failures, corrections, overrides, near misses and changed ground truth as regression cases without leaking confidential Deal content.

### 12.2 Core metrics and gates

| Metric | Evaluation unit | Ground truth | Conservative pass/fail condition | Severity | Release blocker? |
| --- | --- | --- | --- | --- | --- |
| **Extraction accuracy** | atomic field plus text/span/table cell, entity, period, unit, currency, sign and locator | dual-adjudicated native artifact truth with unresolved cases excluded or separately labeled | material identity/numeric/qualifier fields exact under declared normalization; text/layout/table performance reported separately; statistical thresholds TBD | Critical/High by field materiality | Yes after validated format/materiality thresholds; any Critical sentinel fails |
| **Citation correctness** | one Claim–Evidence locator edge | adjudicated exact representation, locator and support/challenge relation | locator resolves to exact source/version/region and the content actually supports or challenges the stated proposition with required context | Critical for fabricated/wrong-Deal; otherwise High | Yes for material Claims |
| **Citation completeness** | one material atomic Claim or deliverable proposition | adjudicated Claim decomposition and required Evidence set | every material externally verifiable atom has adequate citation or explicit unknown/Assumption state | High/Critical | Yes for Senior-Review-Ready/Circulation Candidate |
| **Numeric accuracy** | qualified input/output value | approved source value plus independent deterministic recomputation | exact within explicit formula, unit and rounding policy; no unexplained variance | Critical/High | Yes for material value |
| **Formula integrity** | formula cell and material dependency path | reviewed formula/dependency specification or benchmark workbook | formula, references, dependency, approved-engine recalculation and cached-result comparison pass | Critical/High | Yes for material output |
| **Tie-out success** | one applicable balance/subtotal/roll-forward/reconciliation invariant | explicit invariant and approved inputs | every applicable material invariant passes; `not applicable` has valid reason | Critical/High | Yes for affected workflow |
| **Cross-artifact consistency** | one semantic metric/Claim across Revision artifacts | canonical qualified value/proposition plus approved display/rounding policy | all occurrences match or carry an explicit, reviewed exception | High/Critical | Yes for Circulation Candidate |
| **Source conflict detection** | comparable source pair/set | adjudicated conflict type/materiality corpus | all material conflicts in the defined release corpus detected; false-positive threshold TBD | Critical/High for missed material conflict | Yes; must-pass material conflict sentinels |
| **Abstention correctness** | case requiring answer, unknown, source request, Assumption or sensitivity-only output | qualified banker/domain-expert adjudication | correct state; no unsupported Fact; over- and under-abstention reported separately | Critical/High for unsupported inference | Yes for sentinel cases; rate threshold TBD |
| **Change-impact recall** | changed object to affected dependent edge | seeded dependency graph plus semantic adjudication | all material affected objects found and no stale object promotes; precision reported separately | Critical/High | Yes for material misses |
| **Hallucination / unsupported-claim rate** | material generated Claim atom | adjudicated source-to-Claim relation | no observed fabricated/unsupported material Claim in release sentinel corpus; broader rate and confidence interval threshold TBD | Critical/High | Yes for any Critical sentinel |
| **Confidentiality and Deal-isolation tests** | prohibited retrieval, generation, export or audience case | explicit allowed/blocked matrix with seeded canaries | every prohibited case blocked and no content leaked | Critical | Yes; any leak fails |
| **Human-control gate compliance** | attempted reserved transition/action | state-machine fixture with exact required Decision | no transition/action without current object/version/scope/purpose/audience decision; no approval reuse outside scope | Critical | Yes; any bypass fails |
| **Revision reproducibility** | exact Revision and its source/method/model/config bundle | archived controlled inputs and expected semantic/formula/lineage outputs | rerun reproduces defined semantic content, calculations and lineage or explains deterministic permitted differences | High/Critical | Yes where the Revision is relied upon |
| **Readiness-classification correctness** | object/Revision readiness case | qualified banker/domain-expert adjudicated posture and blockers | no over-promotion; under-promotion measured separately; statistical threshold TBD | Critical/High for over-promotion | Yes for circulation/external-use over-promotion |

### 12.3 Threshold policy

**Verified fact:** the reviewed NIST, GAO, PCAOB, SEC and file-format sources do not provide universal numeric thresholds for this product's extraction, citation, financial-analysis, model, recommendation or readiness metrics. NIST AI RMF explicitly makes risk tolerance and threshold choice context-dependent.

**Product design decisions:** before statistically validated thresholds exist:

1. require **100% pass of applicable deterministic invariants** in the defined release candidate test set; this is a product gate, not an industry benchmark;
2. use **zero observed Critical sentinel defects** for fabricated citations, unsupported material values, wrong-Deal contamination, confidentiality leakage, rights bypass, material formula/tie-out failures and unauthorized Human/External-Use decisions; this does not claim zero real-world probability;
3. require every statistical threshold to be justified by a representative, versioned, rights-cleared U.S. sell-side-auction corpus, materiality strata, qualified Banker adjudication, and confidence intervals;
4. treat any proposed numeric threshold before that evidence exists as a **Product Design Decision pending validation**, not as fact or market standard.

### 12.4 Release and ongoing evaluation

- **Pre-release:** all deterministic invariant suites and Critical sentinels pass; core statistical metrics have an approved corpus, adjudication protocol, measured baseline, failure analysis and explicit go/no-go owner.
- **Change-triggered:** rerun affected suites when the model, extractor, calculation engine, prompt/policy, locator scheme, workflow logic, file renderer, source rights rule or readiness classifier changes.
- **Ongoing:** monitor by document/work type, materiality and failure class; sample abstentions, overrides, corrections, conflicts, regressions, external-use blocks and near misses; do not publish one blended accuracy number.
- **Incident response:** quarantine affected outputs, identify impacted Deals/Revisions, preserve evidence, correct through new versions, rerun evaluation and require re-review before restoring readiness.

## 13. Official Plugin Baseline: Adopt, Strengthen, or Reject as Product Authority

### 13.1 Verified baseline controls to adopt

The installed `v0.1.29` package establishes useful minimum controls:

- the router selects a focused lead workflow and scoped support lanes rather than treating all work as generic generation (`skills/investment-banking/SKILL.md`; `references/plugin-routing-playbook.md`);
- source hierarchy, evidence categories, freshness, conflict preservation, source locations and source-to-cell records are explicit (`skills/investment-banking/internal-support/financial-source-of-truth/`; `skills/financials-normalizer/references/`);
- Claims, Evidence IDs, diligence issues and work items preserve stable identifiers and linked handoffs (`skills/cim-teardown/references/`; `references/handoff-contracts.md`);
- financial normalizer checks separate source, period, unit, currency, evidence category and downstream readiness (`skills/financials-normalizer/references/qa-rules.md` and scripts);
- model workflows separate **Calculation integrity** from **Decision readiness**, record hard failures/warnings, generate exact workbook cell/range citations, and require model/source limitations to remain visible (`skills/dcf-model-builder/`, `skills/lbo-model-build/`, `skills/merger-model-builder/`, `skills/three-statement-model-builder/`, `shared/model_citations.py`);
- audit scripts call themselves static/mechanical screens and explicitly do not prove calculation or business-logic correctness (`skills/model-audit-tieout/scripts/audit_workbook.py`; `skills/ib-deck-qc/scripts/inspect_deck_report.py`);
- buyer scoring says scoring is a working analytical tool and does not establish verified interest, transaction capacity, conflict clearance, client authorization or outreach permission (`skills/buyer-investor-list/references/scoring-framework.md`);
- process controls preserve source-backed events, prior states/change logs, access restrictions and senior escalation, and reject inferences such as silence equals pass or scheduled equals completed (`skills/deal-process-tracker/references/`);
- deliverable policies preserve a primary human artifact, supporting evidence artifacts, source/citation posture, render/visual review and strict handoff schemas (`references/artifact-manifest-standard.md`; `references/dashboard-citation-readiness-policy.md`; `references/handoff-contracts.md`; `shared/artifacts.py`; `scripts/validate_handoff_payload.py`).

### 13.2 Baseline controls that are necessary but insufficient

**Evidence-backed inference:** the following plugin behaviors are appropriate support mechanics but cannot become V1 product authority:

| Plugin behavior observed | Product contract consequence |
| --- | --- |
| some workflows expose `high / medium / low` confidence or weighted scores | preserve as local extraction/ranking signals only; never aggregate them into truth, professional suitability or outreach/external authorization |
| `shared/source_gate.py` validates presence of source IDs/dates and warns on assumptions/Claims | add proposition-level support, rights, authority, freshness, conflict, coverage and intended-use gates; schema presence is not sufficiency |
| `shared/model_citations.py` can fall back to `model-output` source IDs and outline citations such as `A1` with `needs_review` | allow this only as support scaffolding in Working Draft; material readiness requires full source-to-input-to-formula-to-cell lineage |
| `shared/document_ingestion.py` performs heuristic PDF inspection and limited format extraction | treat as routing/preflight only; material PDF/OCR/table/visual reliance requires native extraction coverage and exact region verification |
| strict handoff validation rejects placeholders and malformed schema values | semantic truth, source adequacy, calculation validity and professional usability remain separate gates |
| model audit inventories formulas, cached values, links, hardcodes and patterns without recalculating | require approved-engine recalculation and tie-outs before calculation integrity can pass |
| artifact render and heuristic QC may find no issue | still require source/model tie-out, semantic consistency, professional review and exact intended-use decision |
| plugin terms such as `client-ready`, `committee-ready` or `final-circulation-candidate` describe workflow posture | map them to the product's explicit, independent readiness states; none creates an External-Use Decision |

### 13.3 Current targeted test observation

On 2026-07-31, the directly relevant official-plugin tests were run with `/opt/anaconda3/bin/pytest`:

`test_artifact_manifest_policy`, `test_banker_runtime_readiness`, `test_dashboard_citation_readiness_policy`, `test_document_ingestion_and_source_gate`, `test_financials_normalizer`, `test_handoff_contract_schema_coverage`, `test_handoff_payload_validation`, `test_model_builder_manifests`, `test_model_citations_policy`, and `test_process_contracts`.

Result: **73 passed, 1 failed, 1 skipped**. The failure is a router wording assertion in `test_artifact_manifest_policy.py` requiring the phrase `selected lead workflow applies`; it does not invalidate the inspected source/calculation/handoff controls, but it proves the installed package should not be described as defect-free. This Ticket does not modify the plugin.

## 14. Final Product Design Decisions

The following decisions are resolved for V1 and bind Tickets 8, 9 and the later `/to-spec` handoff:

1. AI owns bounded execution and proposals, not truth, material professional judgment or action authority.
2. Deterministic code owns mechanical computation and validation for the domains in §8.
3. Every material professional decision is a typed, exact-version Human Decision; every external use is a separate External-Use Decision.
4. Claims, Facts, Assumptions, Calculations, Analyses and Recommendations have distinct evidence burdens and cannot be collapsed.
5. Citation correctness, citation completeness, source sufficiency, source authority, freshness, conflict, rights and intended-use suitability are separate states.
6. Confidence is a vector; blocker precedence controls readiness. No scalar score proves truth or readiness.
7. Missing, weak, stale, withdrawn, rights-blocked or conflicting sources constrain the output exactly as Ticket 6 requires; AI does not fill the gap.
8. Material formulas and workbooks require deterministic recalculation, not only formula presence or cached values.
9. Corrections and new sources create new versions, preserve overturned history and trigger dependency-based Impact Assessment.
10. Critical failures fail closed and block the relevant readiness, circulation or release posture.
11. Evaluation is reproducible and risk-stratified; deterministic invariants and Critical sentinels are binary gates, while statistical thresholds require representative Banker-validated evidence.
12. Mechanical correctness is necessary but never sufficient for Professional Usability.

## 15. Unresolved Implementation and Evaluation Questions

These questions do not reopen the contract and do not justify a new Wayfinder ticket. They belong in existing later product/design/spec work:

- supported deterministic calculation engine and imported Excel function/version matrix;
- stable PDF/OCR/table locator coordinates and native-text-versus-OCR precedence;
- V1 treatment of macros, dynamic arrays, external links, volatile functions, circularity, hidden content and manual calculation mode;
- representative, rights-cleared gold corpus for U.S. sell-side-auction files, Bids, models, public filings, OCR/tables, revisions and cross-Deal attacks;
- qualified Banker adjudication, disagreement resolution and inter-rater reporting for recommendation/readiness suitability;
- statistically supported thresholds and confidence intervals by materiality/work type;
- operational mapping from materiality tier to exact readiness consequences;
- rights-safe capture and retention of mutable public-web evidence;
- split between automatable visual checks and targeted exact-Revision human review;
- privacy-safe conversion of corrections, overrides, incidents and near misses into ongoing regression cases.

## 16. Constraints on Tickets 8, 9 and `/to-spec`

### Ticket 8 — deliverables

Ticket 8 may choose the exact V1 deliverable combination, editable file formats, templates and visual standards. It must, however:

- preserve source-to-cell, source-to-slide and source-to-deliverable lineage;
- expose separate calculation/model integrity, professional review, circulation-candidate and External-Use states;
- support immutable Revisions, diffs, regeneration and exact-Version review;
- render and visually inspect artifact surfaces before Circulation Candidate;
- never let polished appearance or file generation imply evidence sufficiency or external authorization.

### Ticket 9 — product form / first-value journey

Ticket 9 must make the contract operable for one Individual Banker without recreating enterprise approval administration. It must expose:

- source/rights/Deal intake gates;
- proposed Fact/Assumption/conflict decisions at the moment they matter;
- deterministic calculation and validation results separate from AI judgment;
- visible degraded-operation ceilings and precise source requests;
- change impact and invalidated approvals after a correction or new source;
- exact Revision/audience/purpose External-Use Decision, without autonomous transmission.

### `/to-spec`

The eventual specification must convert every stage, blocker, Decision and metric in this asset into testable acceptance behavior. It must not weaken this contract into generic “human review,” “AI confidence,” “citations present,” or “model checks passed” requirements.

## 17. Source and Inspection Register

### 17.1 Official plugin sources inspected

All local paths below are relative to the official plugin root unless stated otherwise.

- Router and policy: `skills/investment-banking/SKILL.md`; `references/invocation-policy.md`; `references/plugin-routing-playbook.md`; `references/deliverable-intake-policy.md`; `references/artifact-manifest-standard.md`; `references/output-depth-policy.md`; `references/deliverable-format-policy.md`; `references/evidence-label-taxonomy.md`; `references/handoff-contracts.md`; `references/workbook-first-tab-standard.md`; `references/html-artifact-standard.md`; `references/banker-runtime-readiness-standard.md`; `references/workflow-source-resolution.md`; `references/dashboard-citation-readiness-policy.md`; `references/dashboard-operational-controls-policy.md`; `skills/investment-banking/internal-support/policy.md`.
- Source/evidence: `skills/investment-banking/internal-support/financial-source-of-truth/INTERNAL.md` and its `citation-and-ledger-format.md`, `evidence-hierarchy.md`, `fact-assumption-labeling.md`, `staleness-and-conflicts.md`; CIM teardown `claims-taxonomy.md`, `citations.md`, `evidence-framework.md`, `analysis-playbook.md`, `reconciliation-playbooks.md`; financial-normalizer source/schema/QA/crosswalk references.
- Buyer/process: buyer `data-source-playbook.md`, `scoring-framework.md`, `qa-checklist.md`, `compliance-confidentiality.md`; process `source-handling.md`, `md-judgment.md`, `quality-checks.md`.
- Model/calculation: DCF integrity/QA/judgment/output references; LBO source/assumption, workflow, QA and output references; merger and three-statement workbook/model/QA contracts; comps source/staleness/workflow/peer/valuation references; scenario materializer/overlay/backsolve references; model-audit formula/workbook/source/tie-out/audit references.
- Deliverable/QC: CIM builder `source_and_tieout.md`, `review_checklists.md`; IB deck QC `extraction-and-tieout.md`, `issue-taxonomy.md`, `qc-playbook.md`; all focused workflow `SKILL.md` files relevant to the Sell-Side Auction and supporting calculations/deliverables.
- Schemas/tools/scripts: `schemas/model_citations.schema.json`, `schemas/handoff_common.schema.json`, all applicable handoff schemas, artifact/readiness schemas; `shared/document_ingestion.py`, `source_gate.py`, `model_citations.py`, `model_artifacts.py`, `office_artifacts.py`, `artifacts.py`; root validators; public normalizer, buyer scoring, process tracker, CIM validation, model builder/calculator, scenario, model audit, deck inspection and deliverable generation scripts. Scripts were inspected as control/support mechanics; no script was treated as professional judgment authority.

### 17.2 External primary and authoritative sources

- [NIST AI Risk Management Framework 1.0](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf)
- [NIST AI Risk Management Framework: Generative AI Profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- [NIST Privacy Framework 1.0](https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.01162020.pdf)
- [GAO AI Accountability Framework](https://www.gao.gov/products/gao-21-519sp)
- [PCAOB AS 1105 — Audit Evidence](https://pcaobus.org/oversight/standards/auditing-standards/details/AS1105), [AS 1215 — Audit Documentation](https://pcaobus.org/oversight/standards/auditing-standards/details/AS1215), and [AS 2501 — Accounting Estimates](https://pcaobus.org/oversight/standards/auditing-standards/details/AS2501), used only as explicit evidence/documentation/estimate analogies rather than banking-product rules
- [SEC Inline XBRL](https://www.sec.gov/data-research/structured-data/inline-xbrl) and [EDGAR XBRL Guide](https://www.sec.gov/files/edgar/filer-information/specifications/xbrl-guide.pdf)
- [ECMA-376 Office Open XML](https://ecma-international.org/publications-and-standards/standards/ecma-376/) and [Microsoft Open XML formula semantics](https://learn.microsoft.com/en-us/office/open-xml/spreadsheet/working-with-formulas)
- [W3C PROV-O](https://www.w3.org/TR/prov-o/), [W3C Web Annotation Data Model](https://www.w3.org/TR/annotation-model/), and [RFC 7111 CSV fragments](https://www.rfc-editor.org/info/rfc7111/)

The detailed external claim-to-source mapping and applicability guardrails are preserved in [Ticket 7 Authoritative External Source Notes](ticket-7-authoritative-source-notes.md).

## 18. Resolution

**Resolved answer:** the Controlled Sell-Side Auction Deal Book will be an evidence-bounded system in which AI performs observable execution and proposes judgment, deterministic procedures close all mechanically decidable calculations and controls, and the Individual Banker makes exact-version professional and external-use decisions. Missing evidence degrades or blocks work instead of triggering inference; every material claim and value retains native-source lineage; changes propagate through recalculation, regeneration and re-review; readiness is multidimensional; and release quality is governed by reproducible failure-class evaluation rather than a confidence score or disclaimer.

No new Wayfinder ticket is required. The remaining questions belong to Tickets 8–12 or the eventual `/to-spec` implementation/evaluation detail. Work stops at this Ticket.
