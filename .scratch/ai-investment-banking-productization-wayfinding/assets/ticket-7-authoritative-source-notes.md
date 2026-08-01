# Ticket 7 Authoritative External Source Notes

## Scope

This asset supports the Wayfinder ticket **Define the AI, Deterministic Work, Evidence, and Human-Control Contract**. It is deliberately limited to external primary or authoritative sources that can constrain the Ticket 7 decision. It does not define the Ticket 8 deliverable set or visual standards, and it does not design production architecture.

All web sources were accessed on **2026-07-31**.

## Evidence-status vocabulary

- **Verified fact** — a direct, narrowly paraphrased statement from the cited authority.
- **Evidence-backed inference** — a product implication reasonably supported by one or more verified facts, but not stated by the authority as a requirement for this product.
- **Product design decision** — a recommended rule for the Controlled Sell-Side Auction Deal Book. It is not represented as an external legal, audit, or industry requirement.
- **Unresolved implementation/evaluation question** — a question that requires later design, validation, or implementation evidence.

## Applicability guardrails

1. PCAOB auditing standards apply to PCAOB audit engagements and auditors. They do **not** directly regulate an Individual Banker using this product. Their evidence, documentation, and estimate-testing concepts are used only as authoritative analogies for a high-consequence financial workflow.
2. SEC Rule 2-06 applies to accountants performing specified issuer and registered investment-company audits or reviews. Its seven-year retention period is **not** adopted here as a product retention requirement. The source is used only for the narrower point that electronic work records can include analyses, financial data, and significant information inconsistent with final conclusions.
3. The April 2026 U.S. interagency model-risk guidance is supervisory guidance for banking organizations and expressly excludes simple spreadsheet arithmetic, deterministic rule-based processes, and generative or agentic AI from its defined scope. Its model-purpose, limitation, validation, and effective-challenge principles are relevant only by analogy to quantitative financial Models and their professional use.
4. NIST AI RMF 1.0 and NIST AI 600-1 are voluntary risk-management resources, not certifications or sector-specific pass thresholds. The GAO AI Accountability Framework is an accountability framework for federal agencies and other entities, not a mandatory private-product standard.
5. ECMA-376, ISO/IEC 29500 excerpts in Microsoft documentation, W3C Recommendations, and RFC 7111 describe file or annotation semantics. They do not establish professional usability, evidence sufficiency, or banker approval.
6. RFC 7111 is an Informational RFC from the Independent Stream, not an Internet Standards Track specification. It remains useful as a precise, published CSV locator grammar.
7. The cited NIST OCR study is an older, small evaluation of machine-printed Federal Register pages. It supports evaluation-unit and ground-truth design, not a modern banking-document accuracy threshold.
8. SEC Inline XBRL requirements govern specified EDGAR submissions. An Inline XBRL fact is a filer assertion with structured context; the tag does not make the asserted value independently verified, current for another purpose, or professionally suitable for this product's Analysis.

## Executive conclusions for Ticket 7

### EC-1 — Evidence quality is multidimensional

**Evidence-backed inference.** The product should not reduce trust to one model confidence score. At minimum, it must keep extraction confidence, evidence coverage, source authority/reliability, freshness, conflict state, calculation validity, model integrity, professional-judgment requirement, and intended-use suitability separate.

Why: PCAOB AS 1105 separates evidence quantity from relevance and reliability, notes that more low-quality evidence does not cure poor quality, and requires conflicting or doubtful evidence to be resolved. NIST separately addresses confabulation, provenance, ground-truth evaluation, human oversight, and privacy.

### EC-2 — A citation is a locator, not proof of truth or permission

**Evidence-backed inference.** Citation existence and locator validity can be mechanically checked. Source sufficiency, authority, currency, conflict resolution, reliance posture, confidentiality, rights, and intended-use suitability remain separate determinations. A product-generated extraction, summary, normalization, or AI answer remains derived work even when it has citations.

### EC-3 — GenAI output cannot authenticate itself

**Product design decision.** AI-generated content must never serve as evidence for its own Claim. A Claim can advance only through an independently retrievable Source Record and precise Evidence locator. Model confidence is an extraction signal, not a truth signal. Unsupported or unlocatable content must remain a Claim, Unknown, or explicit Assumption proposal.

### EC-4 — Formula presence and cached value do not prove recalculation

**Verified fact plus product design decision.** SpreadsheetML stores formula text in `<f>` and may store the value from the last calculation in `<v>`. The product must therefore inspect formulas and dependencies, run an approved deterministic calculation path, and compare resulting values; it must not treat a cached value as proof that the workbook was recalculated after the latest change.

### EC-5 — Human control must be object-, scope-, version-, purpose-, and time-specific

**Evidence-backed inference and product design decision.** NIST calls for defined human-AI roles and oversight; PCAOB documentation identifies performer, reviewer, and review date; model-risk guidance distinguishes technical correctness from intended use and limitations. Ticket 7 should require a traceable Human Decision naming the object, exact version, decision scope, intended purpose/audience, conditions, decision maker, and timestamp. A prior confirmation cannot automatically cover a later Revision.

### EC-6 — Mechanical validity is necessary but not professional usability

**Evidence-backed inference.** Deterministic tests can establish formula execution, arithmetic, tie-outs, unit/period normalization, citation existence, dependency recalculation, state-transition validity, and cross-artifact numeric consistency. They cannot decide materiality, select a professionally appropriate valuation method, resolve a substantive source conflict, determine whether a recommendation is suitable, or authorize external use.

### EC-7 — Corrections and contrary evidence must remain visible

**Evidence-backed inference and product design decision.** PCAOB and SEC sources preserve significant information that contradicts final conclusions and identify subsequent additions rather than permitting silent erasure. W3C PROV models revision as a new derived entity. Ticket 7 should require append-only provenance for overturned AI outputs, Facts, Assumptions, Calculations, Recommendations, Reviews, and Decisions; corrections produce a new state or Revision and an Impact Assessment.

### EC-8 — Evaluation must be reproducible, stratified, and use-case bound

**Evidence-backed inference.** NIST calls for objective, repeatable or scalable TEVV, documented metrics and methods, pre-deployment and ongoing testing, ground truth, source/citation verification, and recording risks that cannot be measured quantitatively. GAO calls for documented methods, results, limitations, corrective actions, monitoring, drift ranges, and version/change logs. Ticket 7 should use per-object and per-failure-class evaluation, not only an aggregate score.

## Authoritative source catalog

| ID | Authority and source | Relevant scope | Accessed |
|---|---|---|---|
| S1 | [NIST AI Risk Management Framework Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) | Roles, human oversight, intended context, TEVV, testing before deployment and during operation | 2026-07-31 |
| S2 | [NIST AI 600-1 — Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf) | Confabulation, provenance, citations, ground truth, human-AI configuration, privacy, monitoring, incident response | 2026-07-31 |
| S3 | [GAO-21-519SP — Artificial Intelligence: An Accountability Framework for Federal Agencies and Other Entities](https://www.gao.gov/assets/gao-21-519sp.pdf) | Governance, data, performance, monitoring, drift, change logs, reproducible assessment | 2026-07-31 |
| S4 | [PCAOB AS 1105 — Audit Evidence](https://pcaobus.org/oversight/standards/auditing-standards/details/AS1105) | Sufficiency, relevance, reliability, source hierarchy, electronic information, recalculation, conflicting evidence | 2026-07-31 |
| S5 | [PCAOB AS 1215 — Audit Documentation](https://pcaobus.org/oversight/standards/auditing-standards/details/AS1215) | Procedures/evidence/conclusions, reviewer identity and date, contradictory information, later additions | 2026-07-31 |
| S6 | [PCAOB AS 2501 — Auditing Accounting Estimates, Including Fair Value Measurements](https://pcaobus.org/oversight/standards/auditing-standards/details/AS2501) | Methods, data, assumptions, independent expectations, ranges, professional judgment | 2026-07-31 |
| S7 | [SEC Final Rule — Retention of Records Relevant to Audits and Reviews, Rule 2-06](https://www.sec.gov/rules-regulations/2003/01/retention-records-relevant-audits-reviews) | Electronic records, workpapers, analyses, financial data, inconsistent significant information | 2026-07-31 |
| S8 | [Federal Reserve/OCC/FDIC — Supervisory Guidance on Model Risk Management, SR 26-2](https://www.federalreserve.gov/frrs/guidance/supervisory-guidance-on-model-risk-management.htm) | Model purpose/use, materiality, limitations, effective challenge, testing, validation, monitoring; scope exclusions | 2026-07-31 |
| S9 | [ECMA-376 — Office Open XML File Formats](https://ecma-international.org/publications-and-standards/standards/ecma-376/) | Normative OOXML vocabulary and package basis | 2026-07-31 |
| S10 | [Microsoft Learn — Working with formulas](https://learn.microsoft.com/en-us/office/open-xml/spreadsheet/working-with-formulas) | SpreadsheetML formula element and cached formula value | 2026-07-31 |
| S11 | [Microsoft Learn — Retrieve the values of cells in a spreadsheet](https://learn.microsoft.com/en-us/office/open-xml/spreadsheet/how-to-retrieve-the-values-of-cells-in-a-spreadsheet) | Workbook/sheet relationship and cell address retrieval | 2026-07-31 |
| S12 | [Microsoft Learn — Structure of a PresentationML document](https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document) | Slide parts, slide IDs, relationship IDs, shape IDs/names | 2026-07-31 |
| S13 | [Microsoft Learn — The XML shape of WordprocessingML documents](https://learn.microsoft.com/en-us/dotnet/standard/linq/xml-shape-wordprocessingml-documents) | Word package main part, paragraphs, runs, and text | 2026-07-31 |
| S14 | [Microsoft Learn — BookmarkStart](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.bookmarkstart?view=openxml-3.0.1) | Paired WordprocessingML bookmark start/end identifiers | 2026-07-31 |
| S15 | [RFC 7111 — URI Fragment Identifiers for text/csv](https://www.rfc-editor.org/info/rfc7111/) | CSV row, column, and cell-range locators | 2026-07-31 |
| S16 | [W3C Web Annotation Data Model](https://www.w3.org/TR/annotation-model/) | TextQuote, TextPosition, DataPosition, and version/representation State selectors | 2026-07-31 |
| S17 | [W3C PROV-O](https://www.w3.org/TR/prov-o/) | Derivation, revision, generation, use, activity, and attribution lineage | 2026-07-31 |
| S18 | [NIST — Impact of Image Quality on Machine Print Optical Character Recognition](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=151348) | OCR ground truth, character/word/line units, reading order, layout decomposition | 2026-07-31 |
| S19 | [NIST AI 100-1 — Artificial Intelligence Risk Management Framework 1.0](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf) | Risk tolerance, human-selected metrics/thresholds, deployment-context testing, override and change management | 2026-07-31 |
| S20 | [NIST Privacy Framework 1.0](https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.01162020.pdf) | Data processing inventory, third-party assessment, correction/deletion propagation, reassessment after change | 2026-07-31 |
| S21 | [SEC Final Rule 33-10514 — Inline XBRL Filing of Tagged Data](https://www.sec.gov/files/rules/final/2018/33-10514.pdf) | Inline XBRL submission requirement and combined human-/machine-readable disclosure | 2026-07-31 |
| S22 | [SEC EDGAR XBRL Guide, June 2026](https://www.sec.gov/files/edgar/filer-information/specifications/xbrl-guide-2026-06-29.pdf) | Fact assertions, concept/context/unit/decimals, presentation correspondence, sign and validation semantics | 2026-07-31 |

## Claim-to-source mapping

### Evidence sufficiency, reliability, and conflict

| Claim | Status | Precise authority | Ticket 7 implication |
|---|---|---|---|
| C-EV-01. Evidence includes information that supports/corroborates and information that contradicts an assertion. | Verified fact | S4, AS 1105.02 | Preserve adverse and competing Evidence; retrieval cannot be confirmatory-only. |
| C-EV-02. Sufficiency is evidence quantity; appropriateness is relevance and reliability. More evidence of the same poor quality does not compensate for poor quality. | Verified fact | S4, AS 1105.05-.06 | Keep evidence coverage distinct from source authority/reliability. |
| C-EV-03. Evidence relevance depends on the tested assertion, timing, and required level of detail. | Verified fact | S4, AS 1105.07 | Evidence sufficiency must be Claim-, period-, definition-, and purpose-specific. |
| C-EV-04. Reliability depends on nature, source, and circumstances. Independent, direct, and original evidence is generally more reliable; digitized copies depend on conversion and maintenance controls. | Verified fact | S4, AS 1105.08 | Store source origin, independence, transmission path, original/copy state, and conversion history as separate attributes. Do not implement a universal source rank without context. |
| C-EV-05. Company-produced information used as audit evidence is tested for accuracy/completeness or related controls and assessed for adequate precision/detail. | Verified fact | S4, AS 1105.10 | Deterministically validate imported schedules and report completeness where possible; a management schedule is not self-validating. |
| C-EV-06. External electronic information provided through a company is evaluated by understanding its source, receipt/maintenance/processing path and modifications, then testing the information or relevant controls. | Verified fact | S4, AS 1105.10A | Preserve source chain and transformations; a downloaded or re-uploaded file is not equivalent to a direct original merely because its content looks plausible. |
| C-EV-07. When evidence sources conflict or reliability is doubtful, the matter requires additional procedures and consideration of wider effects. | Verified fact | S4, AS 1105.29 | Conflict is a blocking state, not a lower confidence score. Trigger Impact Assessment and prevent automatic Fact acceptance. |
| C-EV-08. Inquiry alone does not provide sufficient audit evidence for the referenced audit purposes. | Verified fact | S4, AS 1105.17 note | A meeting note or management assertion remains a Claim unless corroborated to the level required for the stated use. This is an analogy, not a universal legal rule for banking work. |
| C-EV-09. Recalculation checks mathematical accuracy; reperformance independently executes a procedure or control. | Verified fact | S4, AS 1105.19-.20 | Distinguish deterministic recalculation from AI consistency review and from Banker professional judgment. |
| C-EV-10. A citation's presence does not establish source reliability, sufficiency, currency, rights, or conflict resolution. | Evidence-backed inference | C-EV-02 through C-EV-07; S2 MS-2.5-003 | Citation existence is a deterministic validation result, never the whole evidence conclusion. |
| C-EV-11. AI-generated content cannot be its own evidence, and derived summaries/extractions remain derived entities. | Product design decision | S2 confabulation and provenance actions; S17 derivation model | Require lineage to an independent Source Record and preserve AI-generated Origin. |

### Documentation, review, correction, and history

| Claim | Status | Precise authority | Ticket 7 implication |
|---|---|---|---|
| C-CH-01. Audit documentation records procedures performed, evidence obtained, and conclusions reached. | Verified fact | S5, AS 1215.02 | The product's observable work record should include inputs, method, result, and conclusion rather than only final prose. |
| C-CH-02. Documentation identifies who performed and reviewed work and when; it should enable an experienced reviewer to understand nature, timing, extent, results, evidence, and conclusions. | Verified fact | S5, AS 1215.06-.06A | Human Confirmation must identify decision maker, exact object/version, scope, and time. Review records must be reconstructable. |
| C-CH-03. Documentation includes significant findings or issues inconsistent with final conclusions and records how professional-judgment differences were resolved. | Verified fact | S5, AS 1215.08 | Do not delete losing interpretations, rejected AI proposals, or superseded judgments when material. Preserve disposition and rationale. |
| C-CH-04. After documentation completion, AS 1215 prohibits deletion/discard and requires additions to identify date, preparer, and reason. | Verified fact | S5, AS 1215.16 | Use append-only correction provenance and new Revisions; do not silently overwrite history. The PCAOB retention period itself is not adopted. |
| C-CH-05. SEC Rule 2-06 covers relevant electronic records containing conclusions, opinions, analyses, or financial data and retains significant information inconsistent with final conclusions. | Verified fact | S7, final rule overview and Rule 2-06(a), (c) | Preserve material contrary evidence and decision history. This is an analogy; the rule's seven-year period is not a product requirement. |
| C-CH-06. W3C PROV models derivation as a new entity based on a prior entity and revision as a particular derivation; it separately models activity and agent attribution. | Verified fact | S17, `prov:wasDerivedFrom`, `prov:wasRevisionOf`, `prov:wasGeneratedBy`, `prov:wasAttributedTo` | Represent correction and regeneration as new, linked objects; retain origin and responsible actor. |
| C-CH-07. New Source Records and corrections should trigger dependency-based Impact Assessment rather than mutate prior results. | Product design decision | C-CH-01 through C-CH-06 | Determine Recalculation Required, Regeneration Required, Re-review Required, and Circulation Blocked with an observable rationale. |

### Estimates, financial methods, Models, and intended use

| Claim | Status | Precise authority | Ticket 7 implication |
|---|---|---|---|
| C-MD-01. PCAOB AS 2501 treats methods, data, and significant assumptions as distinct components of an accounting estimate. | Verified fact | S6, AS 2501.09-.20 | Model integrity cannot be collapsed to arithmetic correctness. Track method, data, and assumptions separately. |
| C-MD-02. Estimate data is assessed for accuracy/completeness, relevance/reliability, consistency with other uses, and source changes. | Verified fact | S6, AS 2501.12-.14 | Cross-document reconciliation and source/version change detection are deterministic controls; professional interpretation remains separate. |
| C-MD-03. Significant assumptions include those sensitive to variation, susceptible to bias, based on unobservable data, or dependent on intent and ability. | Verified fact | S6, AS 2501.15 | Require explicit Assumption identity, sensitivity, source/rationale, intended use, approval, and affected outputs. |
| C-MD-04. An independently derived assumption or method requires a reasonable basis; a range must contain only reasonable outcomes and be supported by sufficient appropriate evidence. | Verified fact | S6, AS 2501.22, .25 | Scenario analysis cannot turn unsupported point estimates into Facts. Missing-source cases may support explicit sensitivity ranges only when the assumptions and bounds are approved. |
| C-MD-05. Current interagency guidance says even a technically sound model can be high-risk if misapplied or misused. | Verified fact | S8, sections III-IV | Mechanical Validity does not establish Professional Usability or intended-use suitability. |
| C-MD-06. The guidance ties model risk to assumptions, input quality, complexity, purpose, exposure, use, and materiality and calls for effective challenge by qualified, objective people. | Verified fact | S8, sections III-IV | Reserve materiality, method selection, critical assumption acceptance, and use decisions to the Banker. AI can propose and test, not decide. |
| C-MD-07. Model validation assesses performance, reliability, limitations, conceptual soundness, outcomes, and continuing relevance; validation rigor varies with use and materiality. | Verified fact | S8, section V | Use deterministic and empirical model tests plus Banker review of limitations and purpose. Re-review on material method/input/use change. |
| C-MD-08. The April 2026 guidance excludes simple arithmetic, deterministic rules, and generative/agentic AI from its defined model scope. | Verified fact | S8, section II and footnote 3 | Do not claim the guidance directly governs spreadsheet arithmetic or Ticket 7's GenAI. Use NIST for GenAI and deterministic checks for arithmetic. |
| C-MD-09. The product must not autonomously choose a valuation method, material assumption, Bid, recommendation, or external use. | Product design decision | C-MD-01 through C-MD-08; S1 Govern 3.2 and Map 3.5 | These are Banker-reserved Human Decisions bound to an exact scope and version. |

### GenAI confabulation, provenance, human oversight, and privacy

| Claim | Status | Precise authority | Ticket 7 implication |
|---|---|---|---|
| C-AI-01. NIST defines confabulation as confidently presented erroneous or false content, including prompt divergence and internal contradiction. | Verified fact | S2, section 2.2, pp. 9-10 | Treat fluent output as unverified. Detect fabricated Facts/citations and contradictions as high-impact failures. |
| C-AI-02. NIST notes confabulation arises from generative systems' statistical generation and is especially relevant in contextual or domain-expert work. | Verified fact | S2, section 2.2, p. 9 | Model confidence cannot prove truth or professional suitability. |
| C-AI-03. NIST identifies data-privacy risk from leakage or unauthorized use/disclosure of personal or sensitive data. | Verified fact | S2, risk 4, p. 7 | Deal isolation, confidentiality, PII/sensitive-data detection, and authorized-use controls are release-blocking, not disclaimer text. |
| C-AI-04. NIST identifies human-AI risks including automation bias and over-reliance. | Verified fact | S2, risk 7, p. 7 | Human control cannot mean a generic final glance. The interface and workflow must expose the exact decision object and unresolved evidence. |
| C-AI-05. NIST's GenAI inventory action includes data provenance, source, signatures, versioning, known issues, human-oversight roles, special rights, sensitive data, and model versions/access modes. | Verified fact | S2, GV-1.6-003, p. 19 | Preserve provenance and versions for sources, derived outputs, model runs, rights, and human decisions. |
| C-AI-06. NIST recommends assessing output accuracy, reliability, and authenticity against known ground truth using multiple evaluation methods, including automated evaluation and human oversight. | Verified fact | S2, MP-2.3-001, pp. 27-28 | Evaluation needs gold-labeled corpora and both mechanical and qualified-human adjudication. |
| C-AI-07. NIST recommends documented fact-checking when generated information comes from multiple or unknown sources. | Verified fact | S2, MP-2.3-003, p. 28 | Preserve competing sources, verify each source-to-claim relation, and abstain when source identity or support cannot be established. |
| C-AI-08. NIST recommends reviewing and verifying sources and citations during pre-deployment measurement and ongoing monitoring. | Verified fact | S2, MS-2.5-003, p. 34 | Citation correctness and completeness require release and ongoing evaluation; citation existence alone is insufficient. |
| C-AI-09. NIST recommends verifying training and TEVV provenance and grounding of fine-tuning or retrieval-augmented data. | Verified fact | S2, MS-2.5-005, p. 34 | Preserve evaluation-corpus lineage and ensure the evaluation source set is not contaminated by product-generated outputs. |
| C-AI-10. NIST recommends documenting risks that cannot be measured quantitatively and involving independent/internal experts, domain experts, users, and affected actors as appropriate. | Verified fact | S2, MS-1.1-009 and Measure 1.3, p. 32 | Professional suitability, materiality, and intended-use decisions cannot be hidden behind an aggregate metric. |
| C-AI-11. NIST recommends recording human overrides and evaluating them, and re-evaluating risk when adapting GenAI to a new domain. | Verified fact | S2, MS-4.2-004, p. 42; MP-4.1-009, p. 29 | Overrides are evaluation evidence; material domain/use changes require re-review rather than status inheritance. |
| C-AI-12. NIST recommends detecting PII/sensitive data in generated outputs and relating provenance tracking to privacy and security. | Verified fact | S2, MP-4.1-009, p. 29; MS-2.2-002, p. 33 | Pre-export scanning and rights/confidentiality gates are deterministic or policy checks before any External-Use Decision. |
| C-AI-13. NIST AI RMF calls for clear human-AI roles, documented knowledge limits and oversight, defined human-oversight processes, and objective/repeatable/scalable TEVV. | Verified fact | S1, Govern 3.2; Map 2.2, 3.5; Measure introduction | Build explicit responsibility and gate matrices; do not use an undifferentiated HITL label. |
| C-AI-14. NIST's Privacy Framework calls for reassessing privacy risk when governance, risk tolerance, data processing, or systems change; it also calls for reviewable correction/deletion processes, audit logs, and propagation of corrections through the data ecosystem. | Verified fact | S20, GV.MT-P, CT.DM-P, and CM.AW-P, pp. 23-25 | Source correction and privacy/right changes must trigger Impact Assessment, downstream propagation, and re-review rather than silent mutation. |

### File-native citation and calculation semantics

| Claim | Status | Precise authority | Ticket 7 implication |
|---|---|---|---|
| C-FL-01. ECMA-376 defines OOXML vocabularies, document representation, packaging, and producer/consumer requirements. | Verified fact | S9, ECMA-376 overview | Cite the exact Source Record version and package part; visual filename alone is too weak for stable lineage. |
| C-FL-02. SpreadsheetML stores formula text in `<f>` and the cached result from the last calculation in `<v>`; `<v>` may be absent. | Verified fact | S10, “Formulas in SpreadsheetML” | Deterministic recalculation must not trust cached values as current. Preserve formula, recalculation engine/version, inputs, and result. |
| C-FL-03. A spreadsheet cell is located through workbook-to-sheet relationships and a cell reference such as `A1`; sheet name and cell address are distinct lookup steps. | Verified fact | S11, cell retrieval method | XLSX locator: Source Record/version + workbook + worksheet relationship/identity + sheet name + cell/range address + displayed/formula value + relevant row/column labels. |
| C-FL-04. PresentationML stores each slide as its own part; a slide is associated through a unique slide ID and relationship ID, and shapes expose non-visual IDs/names. | Verified fact | S12, structure overview and generated XML | PPTX locator: Source Record/version + slide part URI + slide ID/relationship + current ordinal for display + shape ID/name + paragraph/run or table-cell selector. Do not rely on slide number alone. |
| C-FL-05. WordprocessingML packages have a main document part containing paragraphs, runs, and text; bookmarks pair start/end by matching IDs. | Verified fact | S13; S14 | DOCX locator: Source Record/version + story/package part + bookmark when present, otherwise structural paragraph/run selector + exact quote and context. |
| C-FL-06. RFC 7111 defines one-based row, column, and cell/range fragments for CSV and says clients must not guess malformed fragment identifiers. | Verified fact | S15, sections 2-4 | CSV locator: Source Record/version + delimiter/encoding/header state + RFC 7111 row/column/cell selector + header identity. Invalid locators fail closed. |
| C-FL-07. W3C Web Annotation defines TextQuote exact/prefix/suffix, TextPosition start/end, DataPosition byte ranges, and State/TimeState for the intended representation of a changing resource. | Verified fact | S16, sections 4.2.4-.2.6 and 4.3 | Public-web locator: canonical URL + captured representation/digest + access/capture time + exact quote/context and position; citations to mutable web content must bind to a representation. |
| C-FL-08. W3C PROV distinguishes source/derived entities, generating/using activities, revisions, and responsible agents. | Verified fact | S17 | Maintain source-to-claim, source-to-cell, source-to-slide, and source-to-deliverable lineage as explicit edges, not prose-only footnotes. |
| C-FL-09. PDF citation precision should include Source Record/version digest, file page index, displayed page label where present, bounding box/region, exact quote or table region, and OCR/text-layer identity. | Product design decision | S16 selector/version principles; no cited authority mandates this exact product locator | Avoid page-number-only citations and distinguish original text layer from OCR-derived text. |
| C-FL-10. A locator that resolves does not prove the located content supports the Claim. | Product design decision | C-EV-02 through C-EV-07; C-AI-08 | Citation validation needs at least existence, exact-support correctness, completeness, source adequacy, and allowed-use checks as separate results. |
| C-FL-11. SEC Inline XBRL embeds XBRL data into the HTML filing, allowing one disclosure document to be human- and machine-readable. | Verified fact | S21, summary; SEC operating-company Inline XBRL compliance guide | Prefer the filed Inline XBRL representation when available, while preserving its exact filing/submission identity and human-visible context. |
| C-FL-12. The EDGAR XBRL Guide defines a fact as a filer assertion; each fact is characterized by a concept and core dimensions including period, entity, language, and, for numeric facts, unit and insignificant decimal places. | Verified fact | S22, Fundamentals, pp. 10-11 | A tagged filing value is still a Claim from the filer. Store concept, entity, period/context, dimensions, unit, decimals, and filing version; do not cite a bare displayed number. |
| C-FL-13. The EDGAR guide requires correspondence between browser-visible text and concepts/fact values, associates facts with presentation locations, and requires a face-statement fact for each line-item/period combination. | Verified fact | S22, sections 6.7.1 and 6.8.1.1, pp. 132 and 136 | Inline XBRL locators should bind the tagged fact to its visible filing location and not discard the line-item/period presentation context. |
| C-FL-14. EDGAR numeric facts carry their unscaled value; currency unit is distinct from display scale; `decimals` expresses reported accuracy rather than scale; sign may differ from the visual convention because of balance/negating labels. | Verified fact | S22, sections 6.5.4-.5 and 6.6.1-.4, pp. 128-131 | Deterministically normalize displayed scale, unit, precision, and sign from the structured fact and visible context. Wrong sign/scale/period remains a high-impact failure even if the tag resolves. |
| C-FL-15. EDGAR performs syntax, semantic-consistency, metadata, and submission-specific validations, but an accepted fact remains a filer assertion. | Verified fact plus evidence-backed inference | S22, Fundamentals, pp. 10-12 | EDGAR validation improves structured-data usability; it is not a product Fact-acceptance or intended-use decision. |

### OCR and extraction evaluation

| Claim | Status | Precise authority | Ticket 7 implication |
|---|---|---|---|
| C-OCR-01. The NIST study evaluated OCR against manually prepared and image-cross-checked truth data in reading order. | Verified fact | S18, sections 1.0 and 2.5, pp. 1, 7-8 | Build gold truth from the original artifact with adjudication; do not use AI output as evaluation truth. |
| C-OCR-02. The scoring tools reported character, word, and line accuracy, while page decomposition/read-order failures were considered separately. | Verified fact | S18, section 2.5 and 3.1, pp. 7-8 | Separate text recognition from layout/order, table structure, and field extraction. A high character score can coexist with a wrong table or reading order. |
| C-OCR-03. The study explicitly scored correctness independently of product confidence thresholds. | Verified fact | S18, section 2.5, p. 7 | Extraction confidence is a routing signal, not the accuracy ground truth and not evidence sufficiency. |
| C-OCR-04. No cited source establishes an acceptable OCR threshold for live investment-banking use. | Verified absence within this research scope | S18 limitations and dated/small sample | Numeric thresholds are a Product Design Decision to validate on representative deal artifacts. |

### Evaluation and continuous control

| Claim | Status | Precise authority | Ticket 7 implication |
|---|---|---|---|
| C-EQ-01. NIST AI RMF says AI systems should be tested before deployment and regularly in operation, with rigorous methods, uncertainty, benchmarks, and documented objective/repeatable/scalable TEVV. | Verified fact | S1, Measure introduction | Define release and ongoing suites with reproducible inputs, expected outcomes, model/tool versions, and adjudication records. |
| C-EQ-02. GAO's framework has governance, data, performance, and monitoring principles and asks assessors to document methods, metrics, outcomes, limitations, and corrective actions. | Verified fact | S3, framework overview and Performance 3.5 | Each core metric needs unit, ground truth, method, pass/fail rule, severity, and release-blocker status. |
| C-EQ-03. GAO recommends continuous/routine monitoring, use-case-appropriate drift ranges, monitoring results, corrective-action logs, and version/change logs. | Verified fact | S3, Monitoring 4.1-.4.3, pp. 65-67 | Monitor by failure class and context; corrections and overrides feed regression suites and change-impact evaluation. |
| C-EQ-04. GAO recommends reassessing ongoing utility/current context and conditions for expanded use. | Verified fact | S3, Monitoring 4.4-.4.5, p. 68 | Intended-use suitability is a separate decision; new audience/purpose/domain can require new validation and Banker confirmation. |
| C-EQ-05. There is no authoritative universal numeric threshold in the reviewed sources for citation accuracy, financial-model integrity, extraction accuracy, or readiness classification in this product. | Verified absence within this research scope | S1-S22 | Mark numerical thresholds as Product Design Decisions pending representative benchmark validation. |
| C-EQ-06. NIST AI RMF does not prescribe risk tolerance; where existing standards do not supply it, organizations define reasonable tolerance for their context, and human judgment selects trustworthiness metrics and thresholds. | Verified fact | S19, section 1.2.2 p. 7 and section 3 pp. 12-13 | Ticket 7 may define critical defect classes now, but performance percentages require product governance and representative Banker validation. |

## Recommended V1 citation contract derived from the sources

The following is a **Product Design Decision**, not a claim that the cited standards require this exact schema.

Every Evidence citation should contain:

1. **Source identity** — Deal ID, Source Record ID, immutable version/digest, source type, origin, received/observed time, and current rights/reliance/confidentiality posture.
2. **Representation identity** — native file part or captured public representation; conversion/OCR identity when the cited text is derived from an image or transformed copy.
3. **Precise locator** — format-native locator from the table below.
4. **Context payload** — exact quote or visible row/column/table context, period, unit, currency, definition, and any qualification necessary to interpret the Evidence.
5. **Lineage edges** — Evidence to Claim; Claim to proposed/accepted Fact or Assumption; inputs to Calculation/Model; outputs to Analysis/Recommendation; and all used objects to Deliverable Revision locations.
6. **Validation results** — locator exists, cited content matches, cited content supports/challenges the proposition, coverage is complete for the proposition, and source posture permits the stated intended use.

| Format | Minimum precise locator |
|---|---|
| PDF/image | Source version digest; zero-based file page index plus displayed page label; region/bounding box; exact text or image excerpt; original-text-layer versus OCR identity; table row/column context where applicable |
| XLSX | Source version digest; workbook and worksheet relationship/identity; sheet name; cell/range address; row/column labels; formula and evaluated value identity; table/name when present |
| PPTX | Source version digest; slide part URI; slide ID and relationship ID; current slide ordinal for display; shape ID/name; text paragraph/run or table/chart element |
| DOCX | Source version digest; package/story part; bookmark ID/name when present, otherwise paragraph/run structural path; exact quote with prefix/suffix; table cell coordinates where applicable |
| CSV | Source version digest; encoding, delimiter, and header state; RFC 7111 row/column/cell range; header names; exact record excerpt |
| SEC Inline XBRL | EDGAR accession/submission and filed document version; visible filing location; XBRL concept; entity and complete context/period/dimensions; unit; fact value; decimals/precision; sign/negating-label treatment; taxonomy/version; exact visible excerpt |
| Public web | Canonical URL; captured representation/digest; retrieval timestamp and relevant request/format state; TextQuote exact/prefix/suffix and position/fragment selector; publication/effective date where applicable |

### Multi-source, conflict, and missing-source behavior

**Product design decisions:**

- Multiple supporting sources remain separate lineage edges. The system may show corroboration but must not count duplicates, mirrors, or AI-derived restatements as independent authority.
- A conflict remains explicit with both interpretations and their Evidence. AI may identify and explain the conflict; deterministic code may detect numeric/definition/version mismatches; only the Banker can resolve a material professional conflict or accept it as an unresolved risk for a bounded internal use.
- A missing source yields Unknown, Source Request, or explicit Assumption proposal. The system must not interpolate a Fact from model knowledge.
- A source that is stale, superseded, reliance-blocked, outside permitted rights, cross-Deal, or insufficiently precise cannot support the affected readiness or external-use gate, even if its citation resolves.

## Recommended multidimensional confidence and sufficiency model

This section is a **Product Design Decision** supported by the separated concepts in S1-S8 and S18. No single composite score should control readiness.

| Dimension | Primary machine role | Banker role | Gate consequence |
|---|---|---|---|
| Extraction confidence | Compute model/parser confidence and calibration by field/document class; compare with gold truth in evaluation | Confirm or correct material extracted content when routed | Low confidence or unsupported material field becomes Unknown/working draft; confidence never makes a Fact |
| Evidence coverage | Deterministically enumerate Claim atoms with located supporting/challenging Evidence; AI proposes decomposition | Decide whether the scoped evidence set is sufficient for the intended professional use | Material uncovered atom blocks senior-review-ready/circulation-candidate as applicable |
| Source authority/reliability | Show origin, independence, controls, transformation, rights, and reliance posture; apply explicit policy rules | Decide contextual reliance where professional judgment is required | Reliability-blocked source cannot support Fact/readiness; limitations remain visible |
| Freshness | Detect source age, new versions/events, and supersession signals | Decide whether the evidence is current enough for the exact purpose | Stale/uncertain material source triggers Impact Assessment and blocks affected use |
| Conflict state | Detect numeric, period, unit, definition, source, and version conflicts; AI explains alternatives | Resolve material conflict, narrow scope, or accept bounded unresolved risk | Unresolved material conflict blocks Fact acceptance and affected circulation |
| Calculation validity | Recalculate formulas, dependencies, units, periods, currencies, signs, totals, and tie-outs | Confirm input meaning/method suitability | Failed deterministic invariant blocks analysis-ready and downstream readiness |
| Model integrity | Validate formula/dependency graph, change propagation, scenario reproducibility, and empirical tests where applicable | Approve significant Assumptions, method, limitations, and intended use | Failed integrity or unapproved material assumption blocks use |
| Professional judgment requirement | Flag decisions requiring materiality, method, recommendation, risk acceptance, or process authority | Make explicit, scoped Human Decision | No automatic stage advance past the relevant gate |
| Intended-use suitability | Validate declared audience/purpose/version and completed prerequisites | Decide professional suitability and exact External-Use Decision | No inference from prior review, readiness, or another Revision/audience |

## Recommended abstention and degraded-operation rules

These are **Product Design Decisions** grounded in NIST confabulation/fact-checking guidance, PCAOB conflict/reliability concepts, and the inherited Missing-Source boundary.

- **Refuse to infer / mark Unknown** when a material proposition lacks located Source Material, when company/deal identity is uncertain, or when a required period/unit/currency/definition cannot be resolved.
- **Preserve competing interpretations** when sources materially conflict. Do not average, majority-vote, or hide the conflict in a confidence score.
- **Request a source** when the missing item is in principle observable and necessary for the stated work.
- **Propose an explicit Assumption** only when the task can responsibly proceed without asserting truth; identify rationale, range, sensitivity, affected outputs, and approval scope.
- **Produce sensitivity/scenario analysis only** when a point estimate is not evidence-supported but bounded alternatives can be stated transparently and approved.
- **Limit to working draft** when citations, qualifications, material inputs, or judgment decisions remain incomplete.
- **Block senior-review-ready** when the work cannot be efficiently reviewed because material evidence, assumptions, conflicts, mechanical validation, or decision context is missing.
- **Block circulation-candidate** when professional review, QC, material consistency, rights/confidentiality, or intended-audience conditions are incomplete.
- **Require recalculation** after an applicable input, definition, unit, period, currency, sign, formula, dependency, or calculation-engine change.
- **Require regeneration** when source/analysis/process content used by a Deliverable Revision changes.
- **Require re-review** when content, Evidence, materiality, conflict, method, assumption, intended audience/use, or presentation changes enough to affect the prior review conclusion.
- **Block external use** unless the Banker makes a new External-Use Decision for the exact Revision, audience, purpose, time, and conditions.

## Evaluation contract implications

### Core metric design

The following acceptance shape is a **Product Design Decision**. Exact numeric thresholds remain unvalidated.

| Metric | Evaluation unit | Ground truth | Conservative pass/fail form | Severity / release posture |
|---|---|---|---|---|
| Extraction accuracy | Field/value plus period, unit, currency, sign, definition, and source locator | Dual-adjudicated native artifact truth | Exact match for material numeric/identity fields; stratified error reporting for text/layout/table classes; threshold TBD | Material-field error critical/high; validated threshold is release blocker |
| Citation correctness | Claim-citation edge | Human-adjudicated support/challenge relation and exact native locator | Locator resolves to exact representation and cited content entails/challenges the Claim with required context | Fabricated/wrong-Deal citation critical and release blocker |
| Citation completeness | Material Claim atom | Gold Claim decomposition and required Evidence set | Every material externally verifiable atom has adequate citation or explicit Unknown/Assumption state | Missing material citation high/critical and release blocker |
| Numeric accuracy | Input/output value with qualifiers | Approved source values and independent deterministic recomputation | Exact within explicit formula/rounding rule; no unexplained difference | Material numeric error critical and release blocker |
| Formula integrity | Formula cell/dependency edge | Approved formula/dependency specification or independently reviewed benchmark workbook | Formula, dependency, engine recalculation, and cached-result comparison all pass | Material formula failure critical and release blocker |
| Tie-out success | Defined subtotal/balance/reconciliation invariant | Explicit invariant set | All applicable material invariants pass; N/A has reason | Failure high/critical and release blocker for affected workflow |
| Cross-artifact consistency | Shared semantic metric across workbook/deck/document | Canonical qualified value plus approved rounding/display policy | All occurrences match or carry an explicit documented exception | Material mismatch high and blocks circulation-candidate |
| Source-conflict detection | Labeled conflicting/non-conflicting source pair or set | Human-adjudicated conflict corpus | Detect all material conflicts in release corpus; false-positive tolerance TBD by workflow evidence | Missed material conflict critical/high and release blocker |
| Abstention correctness | Prompt/source-state case requiring answer, Unknown, source request, or Assumption proposal | Banker/domain-expert adjudication | Correct state and no unsupported Fact; measure over- and under-abstention separately | Unsupported material inference critical/high and release blocker |
| Change-impact recall | Changed Source/Input/Decision to affected-object edge | Seeded dependency/impact graph with human adjudication | All material affected objects found; no stale object advances | Missed material dependency critical and release blocker |
| Unsupported-claim rate | Material generated Claim atom | Claim-to-source adjudication | No observed fabricated or unsupported material Claim in release-blocking sentinel corpus; broader rate threshold TBD | Critical sentinel is release blocker; corpus rate monitored |
| Confidentiality and Deal isolation | Cross-Deal retrieval/export/tool-use attack case | Explicit allowed/blocked matrix | Every prohibited case blocked with no content leakage | Any leakage critical and release blocker |
| Human-control gate compliance | Reserved-decision transition attempt | Explicit state-machine and authority fixture | No transition without the required exact Human Decision; no reuse across version/scope/audience | Any bypass critical and release blocker |
| Revision reproducibility | Revision plus complete source/method/model/config record | Archived inputs and expected artifact/semantic outputs | Re-run reproduces semantic content, formulas, lineage, and recorded differences under defined tolerances | Material non-reproducibility high and release blocker where relied upon |
| Readiness-classification correctness | Object/Revision state fixture | Banker/domain-expert adjudicated readiness and blockers | No over-promotion; under-promotion measured separately; numeric threshold TBD | Over-promotion to circulation-candidate critical/high and release blocker |
| Visual/artifact integrity | Rendered page/slide/sheet plus semantic checks | Approved structural rendering fixtures and human QC | No clipped/missing/misleading material content; automated checks plus human artifact review | Materially misleading artifact high/critical; blocks circulation-candidate |
| Professional recommendation suitability | Recommendation case with evidence, assumptions, alternatives, risks, and intended use | Qualified banker panel adjudication against explicit rubric | Evidence, alternatives, material risks, assumptions, and judgment requirements are explicit; no autonomous decision | Plausible but unsuitable recommendation high; threshold and adjudication TBD |

### Threshold policy

- **Verified fact:** none of S1-S22 supplies a universal numeric acceptance threshold for this product; NIST AI RMF explicitly leaves risk tolerance and metric/threshold selection to context-aware governance and human judgment where external standards do not decide them.
- **Product design decision:** use zero-tolerance release sentinels for observed fabricated citations, unsupported material numbers, wrong-company/Deal contamination, confidentiality leakage, rights-policy bypass, spreadsheet formula/tie-out failure on material outputs, and unauthorized Banker-reserved or External-Use decisions. “Zero observed in the defined corpus” is not a claim of zero real-world probability.
- **Product design decision:** require 100% pass of applicable deterministic invariants in the release candidate's defined test set. This is a product gate, not an industry benchmark.
- **Product design decision:** establish statistical thresholds only after a representative, versioned, rights-cleared deal-artifact corpus exists and qualified bankers adjudicate severity and intended-use consequences. Report stratified results and confidence intervals rather than only one aggregate rate.

## High-impact failure controls supported by the sources

| Failure | Detection and prevention implication | Required human control | Readiness/evaluation implication |
|---|---|---|---|
| Hallucinated Fact or citation | Source/citation existence and support verification; ground-truth tests; AI-origin label; no self-evidence | Banker accepts Claim as Fact only with adequate Evidence | Critical sentinel; blocks affected readiness/external use |
| Unsupported financial value | Source-to-cell lineage; deterministic qualifier and formula checks | Banker confirms Fact/Assumption and use | Critical if material; blocks analysis-ready |
| Wrong period/unit/currency/sign | Typed normalization and reconciliation; source-context display | Banker resolves ambiguous definitions/materiality | High/critical; blocks downstream work |
| Incorrect formula or cached value | Inspect `<f>` and `<v>`; approved engine recalculation; dependency/tie-out tests | Banker approves method/assumptions, not arithmetic | Critical if material; release blocker |
| Stale/superseded source | Version/freshness/change detection; State/representation binding | Banker decides current suitability | Triggers Impact Assessment and re-review |
| Unresolved source conflict | Multi-source conflict detection and competing interpretations | Banker resolves/narrows/accepts bounded risk | Blocks Fact and affected circulation |
| Wrong company/Deal/source contamination | Deal-scoped retrieval and negative isolation tests; entity and source identity validation | Banker confirms ambiguous identity | Critical; release blocker and external-use block |
| Confidentiality/rights leakage | Rights, reliance, confidentiality, PII/sensitive-data and export-policy checks | Banker External-Use Decision cannot override a hard legal/rights block | Critical; release blocker |
| Missing qualification | Claim atom/qualifier completeness check | Banker confirms professional context | High when material; blocks affected readiness |
| Cross-artifact inconsistency | Canonical qualified-value lineage and deterministic comparison | Banker approves explicit exception | High/critical; blocks circulation-candidate |
| AI treats Claim as Fact | Type/state transition rules and required Evidence/Human Decision | Banker makes scoped Fact acceptance | Critical gate bypass; release blocker |
| Unauthorized process/external decision | Explicit state machine and authority checks | Exact Human Decision required | Critical; release blocker |
| Visually broken/misleading artifact | Render and structural checks plus targeted human artifact review | Banker reviews exact Revision for intended use | High/critical; blocks circulation-candidate |
| Plausible but professionally unsuitable recommendation | Evidence/alternative/risk/assumption rubric; counter-analysis; benchmark cases | Banker owns recommendation, materiality, method, and risk acceptance | High; never auto-promote or externally use |

## What the sources do not establish

The research found no authoritative support for any of the following claims, so Ticket 7 should not make them:

- that a language model confidence score is a calibrated probability that a Claim is true;
- that presence of a citation makes the source sufficient, reliable, current, rights-cleared, or fit for external use;
- that an SEC Inline XBRL tag or EDGAR validation converts a filer's assertion into independently verified truth or makes it suitable for a different Deal purpose;
- that an AI-generated summary or normalization becomes Source Material;
- that formula presence or a cached spreadsheet value proves current calculation integrity;
- that a generic “human reviewed” flag constitutes effective human control;
- that mechanically correct analysis is professionally suitable;
- that a prior review or External-Use Decision carries automatically to a later Revision, audience, purpose, or source set;
- that any reviewed authority supplies a universal numeric accuracy threshold for OCR, extraction, citations, financial analysis, readiness, or recommendations;
- that the product can provide a fairness opinion, formal valuation opinion, solvency opinion, legal opinion, or another regulated professional conclusion.

## Unresolved implementation/evaluation questions for later tickets or spec work

These are not reasons to reopen Ticket 7's product contract. They are implementation or evaluation questions that can be carried into later specification work unless an existing Ticket 8-12 already owns them.

1. Which deterministic calculation engine and supported Excel function/version matrix will define recalculation truth for imported and generated workbooks?
2. What exact PDF coordinate convention, OCR/text-layer precedence, and table-cell locator schema will remain stable across renderers and rotations?
3. How will named ranges, dynamic arrays, external workbook links, macros, volatile functions, circular references, hidden rows/sheets, and manual calculation mode be classified or blocked in V1?
4. What representative, rights-cleared gold corpus covers banker documents, image quality, tables, financial statements, bids, public filings, and adversarial cross-Deal cases?
5. What adjudication protocol, banker qualifications, disagreement resolution, and inter-rater reporting will govern professional-suitability and readiness ground truth?
6. What numeric acceptance thresholds and confidence intervals are justified after pilot evidence? Until then, only deterministic invariants and critical sentinel failures have recommended binary gates.
7. Which materiality tiers map each failure to working-draft, senior-review-ready, circulation-candidate, or external-use consequences?
8. How will public-web representations be captured and retained where licensing, robots, or publisher terms restrict archival copies?
9. Which visual checks can be automated reliably and which require targeted Banker review of the exact rendered Revision?
10. How will override, correction, abstention, and production-incident data be sampled into ongoing regression suites without leaking confidential Deal data?

## Research-method note

The required `agent-reach` Exa command was attempted first, but the local `mcporter` installation reported `Unknown MCP server 'exa'`. The agent-reach search reference provides no further retry chain for that failure. Research therefore continued through direct access to official regulator, standards-body, and government publication pages. No secondary blog claim was used in this asset.
