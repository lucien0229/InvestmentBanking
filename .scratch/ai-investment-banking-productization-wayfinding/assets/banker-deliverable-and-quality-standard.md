# V1 Banker Deliverable Architecture and Quality Standard

**Decision date:** 2026-07-31

**Product scope:** United States-first, English, self-serve Individual Banker; V1 Sell-Side Auction

**Hero Outcome:** Controlled Sell-Side Auction Deal Book

**Official Capability Baseline inspected:** OpenAI-maintained Investment Banking plugin `v0.1.29` at `/Users/wxm/.codex/plugins/cache/openai-curated-remote/investment-banking/0.1.29`

**Ticket boundary:** deliverable product and quality contract only; no artifact generation, production design, system architecture, UI prototype, pricing, branding, or high-fidelity visual design

## 1. Reading rules and inherited constraints

This asset uses four statement classes:

1. **Verified fact** — directly established by the installed official plugin or a cited primary/authoritative source.
2. **Evidence-backed inference** — a product implication supported by verified facts but not itself an external industry rule.
3. **Product design decision** — the binding V1 choice made here for later prototype, pricing, specification, and acceptance work.
4. **Unresolved implementation/evaluation question** — a bounded question for later design or validation that does not reopen the product decision.

Unless a paragraph says otherwise, recommendations, definitions, scope classifications, readiness rules, and quality gates in this asset are **Product design decisions**. External sources do not prescribe this product's exact artifact set or thresholds.

The following inherited decisions remain binding:

- one persistent Deal Workspace is the authoritative business context;
- the Controlled Sell-Side Auction Deal Book is the governed current and historical execution view inside that workspace, not a separate file or workspace;
- V1 is upload/export-first and connector-independent;
- Ticket 6 controls Source Record authority, rights, confidentiality, freshness, version, conflict, withdrawal, and Missing-Source Consequence;
- Ticket 7 controls evidence-bounded AI, deterministic closure, native lineage, append-only correction propagation, version-bound Human Decisions, and External-Use Decisions;
- AI may execute and check work but may not replace material Banker judgment or authorize external use;
- V1 does not prioritize multi-user collaboration, complex permissions, approval routing, firm administration, or service-team remediation;
- the product does not issue legal, tax, fairness, solvency, accounting, or other regulated professional opinions.

## 2. Executive decision

### 2.1 The recommended Hero Deliverable

**The V1 Hero Deliverable is the Controlled Auction Execution Package: a stage-spanning, revision-controlled family of Banker-native Deliverables inside the Controlled Sell-Side Auction Deal Book. It is not one file, one Revision, one static PDF, or the Deal Book itself.**

At any Deal moment, the package presents the exact current controlled Revisions of:

1. an **Analysis & Valuation Workbook** — the quantitative spine;
2. an **Auction Control Workbook** — the buyer, process, diligence, issue, deadline, and bid spine;
3. the stage-required **Marketing Materials** — Teaser and CIM, with Management Presentation when triggered;
4. the stage-required **Decision Materials** — most importantly the Bid Evaluation & Recommendation Memo, plus a process/bid update deck only when the audience requires it;
5. the **Source, Evidence, Assumption, Issue, QC, Review, and Decision records** that make each result reviewable and refreshable;
6. exact **reader-facing PDFs** only for Revisions that require a frozen review or circulation representation; and
7. an on-demand **Deal Export / Archive Package** that preserves portable native artifacts, circulated copies, structured ledgers, manifests, hashes, and applicable decision history.

The Controlled Sell-Side Auction Deal Book is the control plane and authoritative execution view. The Controlled Auction Execution Package is the premium portable result family produced from that control plane. Each named file is a Deliverable or Native Artifact within the family; none alone is the product's Hero Outcome.

### 2.2 Why this is the premium recurring result

The package earns premium value because it remains useful across repeated source changes, buyer events, management updates, bids, and senior comments. The same controlled quantitative, process, evidence, and narrative spines are refreshed rather than recreated as isolated AI drafts.

It spans the full V1 workflow:

| Deal stage | Current package emphasis | Premium recurring value |
| --- | --- | --- |
| **Preparation** | controlled financials, valuation, buyer universe, Teaser, CIM, source/evidence completeness | converts an authorized source packet into editable launch materials and visible gaps |
| **In Market** | live Auction Control Workbook, process letters, diligence/issue state, CIM refreshes, Management Presentation if required | keeps outreach, access, deadlines, claims, materials, and next actions synchronized |
| **Bid Evaluation** | bid comparison, risk-adjusted economics, valuation/model linkage, Bid Evaluation & Recommendation Memo | turns non-comparable proposals into a sourced, reviewable Banker decision packet |
| **Exclusive Execution** | selected-bid terms, remaining diligence/issues, revision impacts, exact circulated copies, archive | preserves why the selected path was chosen and what remains unresolved without silently carrying forward approvals |

Ordinary chat answers, one-time summaries, an HTML dashboard, or a standalone frozen PDF may help review but cannot be the Hero Deliverable because they do not preserve the native edit, calculation, refresh, and round-trip work surface an Individual Banker needs.

### 2.3 Minimum complete V1 boundary

**Always required in an active Deal Workspace**

- Analysis & Valuation Workbook (`.xlsx`);
- Auction Control Workbook (`.xlsx`);
- controlled Source/Evidence Ledger and Assumption/Issue/QC/Review/Decision records, exportable as stable `.csv`/`.json`;
- in-app Review, Evidence, Diff, QC, Readiness, and External-Use control view;
- artifact manifest, version identity, native lineage, and refresh/impact state.

**Required when the stage makes the work necessary**

- Teaser (`.pptx`, plus exact `.pdf` candidate/circulation copy);
- CIM / Information Memorandum (`.pptx`, plus exact `.pdf` candidate/circulation copy);
- Bid Evaluation & Recommendation Memo (`.docx`, plus exact `.pdf` candidate/circulation copy);
- Deal Export / Archive Package after a circulation event, at archive, and on demand.

**Conditional companion artifacts**

- Management Presentation (`.pptx` + `.pdf`);
- buyer/process/bid update deck (`.pptx` + `.pdf`);
- process letters and draft communications (`.docx` + `.pdf` where frozen representation is needed);
- standalone supporting schedules (`.xlsx`) only when they cannot remain reviewable modules of the main workbooks;
- internal review PDF, clean circulation PDF, or recipient-specific copy when audience/content controls require separate representations.

**Deferred or excluded from V1**

- a live VDR, email, calendar, CRM, market-data, or document-management connector as a prerequisite;
- autonomous sending, outreach, access grants, deadline changes, bid selection, exclusivity, or circulation;
- drafting/negotiating NDAs, LOIs, merger agreements, disclosure schedules, fairness opinions, solvency opinions, or legal advice as owned Deliverables;
- macro-enabled artifacts (`.xlsm`, `.xlsb`, `.pptm`, `.docm`) and undocumented VBA/COM dependencies;
- opaque external workbook links as the authoritative calculation path;
- real-time multi-user coauthoring, firm-wide template administration, organization policy, or enterprise approval workflows;
- bespoke service-team production, manual template remediation, or human repair as a prerequisite for usable output;
- HTML-only, PDF-only, image-flattened, or screenshot-based substitutes for required Banker-native artifacts.

## 3. Deliverable architecture and controlled vocabulary

| Term | Binding V1 definition | Not equivalent to |
| --- | --- | --- |
| **Deal Workspace** | Persistent authoritative context containing the Deal, authorized Source Records, Evidence, Claims/Facts/Assumptions, calculations/models, process events/state, Deliverables, Reviews, QC Findings, Decisions, and history. | a folder, chat, one model, or one file |
| **Controlled Sell-Side Auction Deal Book** | Governed current-plus-history view of the Sell-Side Auction inside one Deal Workspace, including readiness, lineage, decisions, and impact propagation. | a static deal bible or exported binder |
| **Controlled Auction Execution Package** | Hero Deliverable family: the current stage-appropriate set of controlled Banker-native and frozen reader artifacts needed to execute and review the auction. | the Deal Book control plane or a single PDF |
| **Deliverable** | Stable business object with a purpose, owner, stage, intended audience class, native format contract, readiness ceiling, and ordered immutable Revisions. | a filename or chat response |
| **Deliverable Revision** | Immutable snapshot of one Deliverable's content, native artifact(s), reader-facing output(s), source/model dependencies, intended use, QC/review state, and decisions. | a mutable “latest” file |
| **Native Artifact** | Banker-owned portable editable representation: ordinarily XLSX, PPTX, or DOCX; CSV is native for flat structured exchange, not for a model or presentation. | an image, PDF, HTML view, or extracted text |
| **internal working artifact** | Editable calculation, tracker, schedule, draft, request list, or issue workpaper used to produce/review a Deliverable. It may be a Deliverable when it has durable business purpose. | automatically a circulation artifact |
| **review artifact** | Exact Revision surface prepared for controlled review: rendered slides/pages/sheets, PDF, diff, issue pack, or in-app review view. | External-Use authorization |
| **reader-facing output** | Readable representation optimized for a named reader and purpose. May be HTML/in-app for internal review or PDF for a fixed representation. | necessarily Banker-owned or editable |
| **circulation copy** | Frozen reader-facing output tied to an exact Revision, audience, purpose, time, conditions, hash, and External-Use Decision. | any exported PDF |
| **supporting schedule** | Reviewable quantitative or operating schedule feeding a workbook, deck, memo, or process decision. Defaults to a module/tab of a primary workbook unless standalone reuse requires separate XLSX. | an unlinked CSV dump |
| **source/evidence ledger** | Machine-trackable register joining Source Record/version/rights/confidentiality/native locator to Evidence and downstream claim/cell/table/chart/slide/paragraph/Deliverable use. | only the footnotes visible in a file |
| **process tracker** | Auction Control Workbook plus controlled process objects for buyers, outreach, NDA/access, diligence, milestones, bids, issues, next actions, and change history. | a generic task list |
| **export/archive package** | Portable, immutable package containing selected native artifacts, exact frozen copies, structured ledgers, manifest, schema versions, hashes, and applicable review/decision history. | a ZIP of unlabeled “final” files |

### 3.1 Object relationships

`Deal Workspace → Controlled Sell-Side Auction Deal Book → Controlled Auction Execution Package → Deliverable → immutable Deliverable Revision → Native Artifact + optional reader-facing output + lineage + Review/QC/Decision state`

One Deliverable can have many Revisions. One Revision can contain one primary Native Artifact and multiple audience-specific frozen outputs. A new PDF created from a changed native file belongs to a new Revision; it cannot be attached to an older Revision merely because the filename is similar.

## 4. V1 required Deliverable set

### 4.1 Portfolio decision matrix

| Deliverable / artifact | Primary user; intended audience | Stage and business purpose | Native editable and reader-facing formats | Required source support | Deterministic checks | Required Banker decisions | Readiness ceiling and refresh behavior | V1 class |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Analysis & Valuation Workbook** | Individual Banker; internal deal team/senior reviewers, with selected outputs feeding client/buyer materials | Preparation through Exclusive Execution; historical/projected financials, KPIs, adjustments, valuation/transaction analysis, bid economics, scenarios, and supporting schedules | `.xlsx` is authoritative; selected tables/charts may feed PPTX/DOCX/PDF but never replace the workbook | exact financial/source versions; definitions, periods, currency/units/signs; approved assumptions; market inputs with as-of dates; source-to-cell lineage | recalculation; formula/error/external-link/circularity scan; balance/subtotal/tie-outs; scenario and sensitivity controls; chart-data and cross-artifact consistency | methods, normalization treatments, assumptions/scenarios, peer/range interpretation, material exceptions, intended use | cannot exceed analysis-ready with material source/definition gaps; source/model change triggers impact, recalc, changed-output diff, re-review; no silent overwrite | **Required** |
| **Auction Control Workbook** | Individual Banker; internal deal team, senior/process reviewers; selected views may support client updates | Preparation through Exclusive Execution; buyer universe, outreach, NDA/access, diligence, milestones, deadlines, bids, issues, next actions, and history | `.xlsx` authoritative; `.csv` module exports; selected `.pptx`/`.pdf` updates conditional | exact process letters, NDAs/access evidence, bids, source exports/user decisions; every material date/value/status tied to source or Decision | required fields; IDs; timezone/deadline math; allowed state transitions; dedupe; bid normalization; process and source completeness; change-log integrity | Approved Buyer/wave, access, process changes, bid interpretation/advance/selection, exclusivity, exceptions | scheduled is not completed; silence is not pass; uncertain/high-impact fields cap readiness; each event creates append-only update and impact assessment | **Required** |
| **Blind Teaser** | Individual Banker; potential buyers before identity disclosure/NDA as permitted | Preparation / launch; create interest without unauthorized identity or sensitive disclosure | `.pptx` authoritative; exact `.pdf` review/circulation copy | public-safe or specifically approved facts; identity-blinding basis; rights/confidentiality clearance; supported material claims | identity leak/metadata scan; claim/citation/number/unit/date checks; cross-artifact tie; render/overflow/parity checks | audience, disclosure boundary, claims, recipient class, exact external-use | cannot become circulation-candidate with identity leak, unsupported material claim, or missing confidentiality legend; refresh on affected fact/narrative change | **Stage-required** before blind outreach |
| **CIM / Information Memorandum** | Individual Banker; NDA-qualified prospective buyers and their advisors | Preparation and In Market; present company, industry, operations, financials, growth, risks, and process framing | `.pptx` authoritative in V1; exact `.pdf` review/circulation copy | controlled source packet; financial/model tie-outs; management/seller claims labeled; page-level citations; disclosure/rights/access rules | completeness; claims/footnotes; numeric/cross-artifact consistency; chart-table tie; page order; template/render/parity; confidentiality checks | equity story, materiality, forecast/adjustment treatment, risk framing, disclosure staging, audience and exact external-use | material source/model/confidentiality gaps block circulation; updated financials/claims/issues trigger impact, regeneration/diff, re-review | **Stage-required** before CIM distribution |
| **Bid Evaluation & Recommendation Memo** | Individual Banker; senior Banker, client decision-makers, board/committee observers where applicable | Bid Evaluation and Exclusive Execution; compare economics, conditions, financing, approvals, timing, diligence burden, and backup leverage; record recommendation conditions | `.docx` authoritative; exact `.pdf` review/circulation copy | exact bid/IOI/LOI versions; controlled bid comparison; model ranges; seller priorities; open issues and conflicts | bid-field completeness/comparability; calculations; source-to-paragraph/table; narrative-model tie; required sections; render/parity | term interpretation, weighting/materiality, recommendation, selected/backup posture, conditions, audience/external-use | cannot exceed analysis-ready when material terms are ambiguous or original bids missing; any new/revised bid invalidates affected recommendation review | **Stage-required** at formal bid evaluation |
| **Management Presentation** | Individual Banker and management; selected bidders under applicable access controls | In Market; structured management story and buyer diligence interaction | `.pptx`; exact `.pdf` when a frozen copy is reviewed/circulated | CIM/current model plus approved management content, speaker responsibility, staged disclosure, Q&A/open-item state | CIM/model consistency; source/claim checks; notes/draft-mark scan; chart-data tie; render/parity | management narrative, presenter notes, disclosure/access, responses, audience/external-use | limited to working-draft until management-owned statements and sensitive content are reviewed | **Conditional** |
| **Buyer / Process / Bid Update Deck** | Individual Banker; client or internal senior audience | In Market/Bid Evaluation; concise decision update when a deck is the audience-native form | `.pptx`; exact `.pdf` | Auction Control Workbook and Analysis Workbook exact ranges; process evidence; approved recommendation | source-to-slide/model range; funnel/bid counts; numbers; status/date; confidentiality; render/parity | message, materiality, recommendation, audience/external-use | never authoritative over the underlying workbooks; refresh when linked controlled outputs change | **Conditional** |
| **Process letters and draft communications** | Individual Banker; buyer/bidder recipients after counsel/firm review as applicable | Preparation/In Market; articulate deadlines, submission requirements, process mechanics, and requests | `.docx`; exact `.pdf` when fixed copy is needed | approved process decisions; exact dates/timezones; recipient/access state; approved boilerplate; counsel-controlled language when applicable | required fields; recipient/version; date/timezone; internal-note/comment scan; content/parity; confidentiality | process terms, recipients, timing, legal/counsel review status, external-use | draft only unless all human/counsel/firm conditions recorded; product does not send | **Conditional** |
| **Internal Review & Readiness View** | Individual Banker; internal self-review/senior review | All stages; inspect evidence, diffs, QC, unresolved decisions, readiness, impact, and exact-version external-use controls | HTML/in-app only; optional review PDF, never the portable source of truth | all controlled objects and applicable ledgers | object/version integrity; filters; diff completeness; lineage resolution; gate computation | issue disposition, professional suitability, residual risk, External-Use Decision | reflects but does not replace artifact status; no external-use authorization from UI state alone | **Required product interface** |
| **Source/Evidence and Control Records** | Individual Banker; internal review, audit, portability, future import | All stages; preserve sources, evidence, assumptions, issues, QC, reviews, decisions, correction propagation | controlled objects; `.csv` for flat tables; schema-versioned `.json` for relationships/manifest; optional XLSX ledger view | every authorized Source Record and derived dependency | schema/ID/version/hash/link/coverage/rights/confidentiality validations | fact/assumption/conflict/issue decisions and any exceptions | machine lineage is mandatory even if file footnotes exist; withdrawn/rights-limited sources propagate restrictions | **Required supporting control layer** |
| **Deal Export / Archive Package** | Individual Banker; Banker-controlled storage/handoff | after circulation, on demand, and Deal archive; preserve exact portable work and provenance | `.zip` or equivalent package containing native artifacts, PDFs, CSV/JSON ledgers, manifest and hashes | exact selected Revisions, lineage, reviews, Decisions and circulated copies | manifest/schema/hash/completeness; file-open/integrity; reference resolution | scope, included confidential content, recipient/use if handed off | immutable package; later import creates records/history rather than rewriting prior state | **Required trigger-based package** |

### 4.2 Supporting schedules policy

Historical/projected statements, KPI reconciliations, adjusted EBITDA bridges, valuation analyses, transaction/bid calculations, sensitivities, and tie-out/check schedules should remain modules in the Analysis & Valuation Workbook when they share one calculation graph. Buyer, NDA/access, diligence, timeline, bid, issue, and change schedules should remain modules in the Auction Control Workbook when they share one process graph.

A separate XLSX supporting schedule is justified only when it has an independent owner/update cadence, must be handed off independently, or cannot be reviewably contained in the primary workbook. Separate schedules still require explicit inbound/outbound lineage; copying values creates a new controlled snapshot, not a live tie.

### 4.3 Word boundary

DOCX is not mandatory merely to claim Office-format coverage. Its V1 role is durable narrative or communication work that Bankers reasonably continue editing as a document: Bid Evaluation & Recommendation Memo, process letters, draft communications, and selected issue/diligence notes. The Teaser, CIM, Management Presentation, and update materials remain PPTX-native; workbooks remain XLSX-native.

## 5. Native Editability Contract

### 5.1 Cross-format rules

A required Native Artifact is professionally usable only when all of the following are true:

1. its business structure is represented by native objects, not flattened pictures or one large text box;
2. a Banker can continue normal work in the intended desktop application without recreating formulas, tables, layouts, charts, footnotes, or styles;
3. artifact-level and significant object-level lineage survive export;
4. generated, formula-controlled, source-linked, and Banker-protected content are distinguishable;
5. deterministic validation and visual rendering both pass for the exact file;
6. refresh creates a visible proposal/diff and never silently overwrites Banker-protected content;
7. an externally edited file can be re-imported as a new Source Record and candidate Revision without rewriting history;
8. compatibility limitations, unsupported native features, external links, macros, and font substitutions are disclosed before reliance.

“The file opens” proves only minimum container readability. It does not prove native editability, model integrity, template compatibility, rendering parity, or Professional Usability.

### 5.2 Content ownership states

Every refreshable native object must carry one of four control states in the Deal Workspace, whether or not that state is visibly encoded in the Office file:

| State | Meaning | Refresh behavior |
| --- | --- | --- |
| **source-linked controlled** | extracted or normalized fact tied to exact Evidence and intended to update from authorized sources | new source proposes a changed value and affected-object diff; no automatic promotion |
| **formula-controlled** | deterministic formula/output owned by the controlled calculation graph | recalculate from approved inputs; overwritten/mutated formula becomes an explicit conflict |
| **AI-proposed regenerable** | narrative, classification, layout, or recommendation proposal that may be regenerated | regenerate only into a proposed Revision and preserve the prior text/layout |
| **Banker-protected** | accepted or externally authored content, manual model treatment, narrative, formatting, note, comment, or lock designated for preservation | never silently replace; require explicit accept/merge/retain decision if a refresh conflicts |

### 5.3 Format-specific native structure

| Format | Native structures that must survive | Minimum Banker continuation behavior | Not acceptable as a substitute |
| --- | --- | --- | --- |
| **XLSX** | formulas and cached values; cell types; tables; sheets/order/visibility; rows/columns/grouping; named ranges; data validation; comments/notes; styles/theme; conditional formats; charts and embedded chart data; print settings; freeze panes; protection metadata; source tabs and checks | edit labeled inputs/assumptions, trace formulas, insert/extend rows where supported, update source data, recalculate, use filters/tables, inspect checks, edit native charts | pasted-value model, chart screenshots, formula text without formulas, image/PDF/HTML workbook |
| **PPTX** | theme, slide masters, layouts, placeholders, slide IDs/order/sections, editable text, tables, shapes, native charts/embedded data, image crop, notes, comments, hidden slides, footers/page numbers, source lines, alt text and metadata | edit titles/bullets/tables/chart data, move/resize objects, reuse layouts, insert compatible slides, retain speaker notes/comments and template behavior | slide images in PPTX, one full-slide background image, PDF, HTML storyboard |
| **DOCX** | named styles, heading hierarchy, numbering, sections, page/column breaks, headers/footers/page numbers, tables, captions, bookmarks, fields, TOC/cross-references, comments, tracked changes, footnotes/endnotes, hyperlinks, document properties | edit and reflow paragraphs/tables, apply styles, update fields/TOC/cross-references, preserve comments/revisions, print/export without manual reconstruction | plain paragraphs in a minimally valid container, PDF, image, HTML pasted into Word |
| **CSV** | stable header names/order contract, UTF-8 encoding, row IDs, normalized types, date/time/timezone conventions, null semantics, quoting/escaping, schema version | filter/import/reconcile flat ledgers and trackers without parsing display formatting | model formulas, multi-table relationships, formatting, authoritative narrative or presentation |
| **JSON** | schema/version, stable IDs, explicit types, object relationships, source/version references, hashes, timestamps/timezones, null/unknown semantics | machine-portable manifest/lineage/history import with deterministic validation | default human Deliverable |
| **PDF** | fixed paginated rendering, searchable/selectable text where supported, embedded fonts or recorded substitution, metadata, page count, link/tag behavior where applicable | read, annotate, compare, and prove exact reader-facing Revision | the only editable source, a model, or proof of native lineage by itself |
| **HTML/in-app** | controlled object identity, evidence expansion, diff, QC findings, readiness and decision controls | review and navigate the authoritative Deal state | Banker-owned portable native artifact |

### 5.4 Export, external edit, and re-import

1. Export records the Deliverable/Revision ID, native artifact hash, template/profile version, generated regions, protected regions, and dependency snapshot.
2. A Banker may edit the native file externally without the product claiming continuous control of those edits.
3. Re-import registers the file as a new Source Record/version associated with the prior export receipt and performs a structure-aware three-way comparison: prior exported Revision, externally edited artifact, and current controlled Revision.
4. The product classifies changes as Banker edit, formula/source change, style/layout change, comment/review change, unsupported feature, or conflict. It must not infer that every external edit is approved or source-backed.
5. Accepted changes form a **new Deliverable Revision** and retain author/import provenance. Rejected or unmerged changes remain visible in history.
6. Any content that cannot be safely round-tripped is reported before merge; V1 does not silently flatten, delete, or normalize it.

## 6. Excel and model quality standard

Deterministic correctness is necessary but not sufficient. A workbook that computes the intended arithmetic may still be professionally unusable because its sources are weak, assumptions are opaque, architecture is unreviewable, native behavior is broken, Banker edits are unsafe, or presentation is poor.

### 6.1 Calculation and structure contract

| Control area | Binding standard | Blocking consequence |
| --- | --- | --- |
| **Formulas vs hardcodes** | Derived values use formulas. Direct hardcodes are limited to labeled inputs, sourced observations, or explicit approved assumptions. Material constants embedded inside formulas must be named/documented; a formula replaced by a value is an exception, not a convenience. | unexplained hardcode in a material calculation blocks senior-review-ready; material output impact blocks analysis-ready |
| **Formula preservation** | Existing valid formulas, references, names, calculation settings, data tables, and intended copy patterns are preserved unless an explicit new Revision changes them. Formula families are compared across periods/rows to detect accidental breaks. | unexplained formula mutation or broken dependency blocks affected analysis |
| **Recalculation** | The exact delivered workbook must be recalculated in a compatible native calculation engine for any circulation-candidate. The engine/application/version, calculation mode, time, and outcome are retained. A static library scan does not count as native recalculation. | no successful native recalc caps at senior-review-ready only if cached outputs are clearly labeled and a Banker accepts the limitation; otherwise analysis-ready |
| **Cached values** | Formula and last-calculated cached value are preserved and inspected separately. Cached values are never treated as proof that the current formulas were recalculated. Missing/stale caches are visible; downstream artifacts bind to a calculation run, not merely the cache. | stale or indeterminate cache blocks reliance on affected output until recalculation |
| **Units/currency/signs** | Entity, metric definition, currency, unit/scale, sign convention, accounting basis, actual/estimate status, and scenario are explicit at input and output. Conversions are formula-driven and traceable. | material ambiguity/mismatch blocks analysis-ready |
| **Dates/periods** | Fiscal/calendar basis, period start/end, LTM/NTM construction, as-of date, actual/forecast boundary, and estimate vintage are explicit. Columns use real date/period semantics where practical rather than ambiguous strings. | material period mismatch or stale market input blocks affected result |
| **Balance/subtotal/tie-outs** | Statements, schedules, subtotals, bridges, debt/cash, enterprise-to-equity, bid economics, and relevant sensitivity base cells have visible checks. Totals and components reconcile within an explicitly defined rounding policy. | unexplained material failure blocks analysis-ready; any visible false PASS is Critical |
| **Source-to-cell lineage** | Every material sourced input and material derived output reused elsewhere maps to exact workbook, sheet, cell/range, Source/Evidence IDs, definition, period, unit, and tie status. An outline citation such as `Sheet!A1` without the real value path is not sufficient. | missing headline input/output lineage blocks senior-review-ready and downstream reuse |
| **Inputs/assumptions** | Inputs, user assumptions, management/seller claims, estimates, and formulas are visually and structurally distinguishable; each material assumption has owner/status/rationale/range/replacement evidence/affected outputs. Color alone is insufficient. | unlabeled material assumption caps at working-draft or analysis-ready depending impact |
| **Scenarios** | Base/downside/upside or other cases alter a small controlled set of named drivers, show absolute outputs, tie the base cell to the main model, and do not hide formula changes. Each scenario records approved basis and source/assumption status. | inconsistent or non-reproducible scenario blocks its use in recommendation |
| **Errors/broken links** | Scan all used cells and material outputs for Excel error values, malformed formulas, missing defined names, broken internal/external references, and data-table failures. Resolve or visibly quarantine every material exception. | any material error blocks analysis-ready; corruption blocks all readiness |
| **Circular references** | No accidental circularity. Intentional circularity requires a named purpose, disclosed iteration settings, convergence/reproducibility checks, and non-circular review path or diagnostic. | undocumented/non-convergent circularity blocks analysis-ready |
| **Macros** | V1 does not generate, require, execute, or silently preserve macro-enabled automation. Uploaded macro-enabled files are quarantined/read-only or processed through a disclosed safe path; macro behavior is never assumed. | macro dependency caps at working-draft until a later supported policy exists |
| **Hidden content** | Hidden/very hidden sheets, rows, and columns are inventoried. Material assumptions, checks, or outputs must be exposed in the model map and first-read/control view even if the underlying schedule stays hidden. | undisclosed hidden material dependency blocks senior-review-ready |
| **External links/connections** | External links and connections are inventoried with target, availability, last update, and affected outputs. V1 authoritative artifacts must be self-contained or include a controlled imported snapshot; personal/local paths cannot be load-bearing. | unavailable/undocumented material external link blocks analysis-ready |
| **Chart-data consistency** | Native chart series/categories/units/periods tie to exact cells/ranges and match any displayed table and narrative. Axis/truncation and negative-value treatment cannot mislead. | material chart/data mismatch blocks senior-review-ready and circulation-candidate |
| **Number formatting** | Currency, percentages, multiples, dates, decimals, zeros, negatives, N/M/N/A, estimates, and signs follow a consistent workbook convention without changing underlying values. Precision reflects decision use, not false accuracy. | misleading formatting blocks affected readiness; cosmetic drift is Minor |
| **Architecture/usability** | First visible tab is a Cover, Executive Summary, or Dashboard that separately states Calculation Integrity and Decision Readiness. Source, assumptions, calculations, outputs, sensitivities, and checks are reviewable without relying on hidden mechanics. | missing first-read status or unreviewable flow blocks senior-review-ready |
| **Integrity/reproducibility** | Re-running the same approved source/assumption/template/engine versions reproduces formulas and controlled outputs within explicit non-semantic metadata differences. The run manifest records hashes and deviations. | unexplained material non-reproducibility blocks circulation-candidate |
| **Banker edit safety** | Refresh updates source-linked/formula-controlled areas through a proposed Revision. It never silently overwrites Banker-protected formulas, manual treatments, labels, comments, schedules, or formatting. Conflicts require explicit merge choice. | silent overwrite or lost edit is Critical and blocks release of the behavior |

### 6.2 Workbook visual and operational inspection

Before senior-review-ready, render and inspect the first visible tab, every material output/sensitivity, source/assumption view, and checks view. Inspect clipping, unreadable columns, frozen panes, filters, print areas, chart labels, legends, source notes, formula/status labels, and screen/print legibility. A successful file integrity scan is not a visual inspection.

The first-read view must not say an unqualified “OK” when calculation integrity passes but source, assumption, model, review, or intended-use readiness remains open.

## 7. PowerPoint and presentation quality standard

### 7.1 Native presentation contract

| Area | Binding professional quality gate |
| --- | --- |
| **Template/theme compatibility** | Use the selected default or user-provided template's theme, slide size, master, layouts, placeholders, fonts, colors, footers, page numbers, legends, and source conventions. Do not imitate a template by drawing every element manually when native layout behavior is available. |
| **Masters/layouts** | Each slide uses a valid compatible layout or a recorded controlled custom layout. Master/layout changes are versioned; importing slides cannot silently proliferate broken masters or reset placeholders. |
| **Editable content** | Titles, body text, tables, callouts, and ordinary exhibits remain editable native objects. Images are appropriate for photographs/logos or source excerpts, not for flattening text/tables/charts that Bankers must update. |
| **Charts/model linkage** | Charts are native editable charts with embedded data or a safe controlled mechanism. Every material chart records exact Analysis/Auction Workbook Revision and cell/range lineage. V1 does not require fragile live external links; a controlled data snapshot plus lineage is preferred. |
| **Sources/citations** | Each material claim, number, table, and chart has readable point-of-use support on the slide/page. The Deal Workspace additionally retains machine-resolvable source-to-slide and, where material, source-to-shape/table/chart lineage. |
| **Units/dates/qualifications** | Every exhibit states units, currency, period/as-of date, actual/estimate status, relevant definitions, and qualifications. Forecasts, adjusted metrics, seller/management claims, and assumptions are identified. |
| **Internal consistency** | Repeated values, definitions, periods, page labels, section order, confidentiality posture, and conclusions agree within the deck and with controlling workbooks/memos. Intended rounding is recorded rather than treated as a mismatch. |
| **Storyline/hierarchy** | One primary message per slide; conclusion/action titles where a conclusion is supported; exhibits advance the reader's decision. Dense backup belongs in appendix. This is a professional structure standard, not a brand or visual-design exercise. |
| **Layout mechanics** | No overflow, clipping, object collision, off-slide content, orphaned labels, unreadable notes, or inconsistent margins. Alignment, spacing, grids, hierarchy, and page density are coherent across the deck. |
| **Legibility** | Titles, tables, chart labels, footnotes, legends, and confidentiality markings remain readable at normal review and PDF-view scale. Exact numeric thresholds remain a later Product Design Decision validated through templates/benchmarks. |
| **Rendered-slide inspection** | Render the exact exported PPTX and inspect every slide, with targeted pixel/semantic checks for dense/material slides. Source XML or pre-export layout inspection alone is insufficient. |
| **PDF parity** | Generate the PDF from the exact PPTX Revision using a recorded renderer. Page count/order, visible text/numbers, charts/tables, footnotes, legends, colors, fonts, clipping, and intended hidden-slide behavior must match the approved render. |
| **Comments/notes/draft markings** | Preserve internal comments/notes in working Revisions; scan them before a clean reader copy. Draft watermarks, placeholders, speaker notes, internal labels, hidden slides, and unresolved comments cannot leak into a circulation copy unless explicitly intended. |
| **Confidentiality/disclosures** | Apply Deal/audience-specific legends, identity-blinding, NDA/access conditions, forecast/non-GAAP/source qualifications, and required disclosures consistently. Metadata, alt text, notes, chart data, and filenames are part of the leak surface. |
| **Protected edits/regeneration** | Banker-protected narrative, slides, layout, chart treatment, notes, and formatting survive refresh. Regeneration creates a proposed Revision and object-level diff; it never rebuilds the whole deck and discards protected work silently. |

### 7.2 Audience-specific presentation rules

- **Blind Teaser:** identity and sensitive data control is a Critical gate across visible content and hidden metadata/native objects.
- **CIM:** source sufficiency, financial/model consistency, management/seller-claim labeling, and disclosure staging are load-bearing gates; polish cannot compensate for unsupported claims.
- **Management Presentation:** management-owned narrative, presenter notes, staged disclosures, and Q&A/open-issue boundaries must be explicit.
- **Buyer/process/bid update:** the deck is a reader view of controlled workbooks. It never becomes the authoritative source for buyer state or bid economics.

## 8. Word, PDF, HTML, and structured-output standards

### 8.1 DOCX

A V1 DOCX must use named paragraph/character/table styles; a coherent heading and numbering hierarchy; real tables; section, page, and column breaks; headers/footers/page numbers; footnotes/endnotes where applicable; bookmarks and fields for durable references; captions/TOC/cross-references when the document length needs them; and preserved comments/tracked changes.

Pagination is validated on the exact renderer used for the candidate: no orphaned headings, split critical tables without repeated headers, clipped content, blank unintended pages, broken fields/cross-references, or hidden internal comments/changes in a clean circulation copy. Accepting/rejecting changes is a Banker action, not a side effect of regeneration.

### 8.2 PDF

PDF is the **exact-revision fixed reader or circulation representation** of a native artifact, not the only source and not proof of native editability. Each PDF records:

- originating Deliverable/Revision and Native Artifact hash;
- renderer/application/version and generation time;
- page/slide/sheet selection and print settings;
- audience/purpose/confidentiality posture;
- content/render parity result;
- its own hash and, if circulated, the exact External-Use Decision and circulation record.

If a PDF is externally marked up and returned, it becomes a new Source Record/review input. It does not overwrite the Native Artifact and is not treated as an editable round-trip source.

### 8.3 HTML/in-app

The HTML/in-app surface is the product's controlled review interface. It should expose:

- exact Deliverable/Revision, intended audience/use, readiness, and External-Use state;
- source/evidence expansion from claim, number, cell, table, chart, slide, or paragraph;
- current-vs-prior and generated-vs-Banker edit diffs;
- impact assessment, invalidated reviews/decisions, and refresh proposals;
- QC findings by severity/location/owner/status and rendered previews;
- unresolved assumptions, conflicts, rights/confidentiality limitations, and Missing-Source Consequences;
- explicit Banker Decisions on exact objects and a separate External-Use Decision.

HTML can be an excellent review artifact but is not the default Banker-owned portable artifact. Exporting HTML does not satisfy XLSX/PPTX/DOCX obligations.

### 8.4 CSV/JSON and portability

CSV is appropriate for flat, tabular, high-portability exports such as buyer lists, bid grids, diligence/issues, source registers, claims/evidence tables, QC findings, and change logs. JSON is appropriate for manifests, relationships, object history, lineage graphs, decisions, and round-trip metadata.

Both require stable IDs, schema name/version, UTF-8, explicit type/date/timezone/null/unknown rules, deterministic validation, and backward/forward migration policy. CSV rows cannot preserve a relational graph by implication; IDs must join them. Display-formatted strings are not substitutes for typed values. Schema compatibility thresholds and support windows remain a later Product Design Decision.

### 8.5 Export/archive package

The package must contain an index-first manifest with Deal/Package identity, creation time, included Deliverable Revisions, file roles, audience/use, hashes, schema/template/renderer versions, and missing/excluded items. It includes only the selected rights/confidentiality scope. For circulated Revisions it retains the exact Native Artifact, exact circulated PDF, relevant structured lineage, QC/review evidence, and External-Use Decision. Package encryption, retention, and handoff transport belong to later security/implementation design; omission of a required file or hash fails package validation.

A digest establishes exact byte identity and change detection only. It does not prove semantic equivalence, correctness, authorship, approval, audience suitability, or External-Use authorization.

## 9. Source and evidence standard

### 9.1 Evidence binding rule

Every material text claim, number, table, chart, calculation, recommendation, and Deliverable conclusion requires a machine-trackable Evidence Binding. The binding must resolve through:

`Source Record → exact Source Version → native citation locator → Evidence Item → controlled Claim/Fact/Assumption or calculation input → artifact location → Deliverable Revision`

The minimum binding fields are Source/Evidence IDs; Deal; source version/hash; source authority/evidence label; rights/confidentiality; as-of/period; native locator; extracted value/text and context; transformation/calculation; downstream artifact and exact location; tie/conflict/freshness status; and affected intended use/readiness.

### 9.2 Locator contract by use

| Downstream use | Required exact locator and lineage |
| --- | --- |
| **source-to-cell** | source file/version plus page/table/cell/object locator → workbook Revision, sheet, cell/range, raw and normalized value, formula/input role |
| **source-to-table** | source locator(s) and transformation → artifact Revision, table ID, row/column/cell or native range; totals and definitions included |
| **source-to-chart** | source/model locator(s) → chart ID, series/category/data range, transformations, units/periods and display qualifications |
| **source-to-slide** | each material slide Claim/number/exhibit → slide ID/number and preferably shape/table/chart ID; workbook-derived values also retain exact workbook range |
| **source-to-paragraph** | source/model locator(s) → DOCX Revision, paragraph/bookmark/table/footnote ID and claim span; document page number alone is insufficient because pagination can change |
| **source-to-deliverable** | full Revision dependency set, source/model snapshots, template/renderer versions, artifact hashes, unresolved gaps, Reviews/QC/Decisions and intended use |

File-visible footnotes/citations serve the reader. The machine lineage in the Deal Workspace serves reproducibility, refresh, impact, and audit. Neither can replace the other for senior-review-ready or circulation-candidate material.

### 9.3 Multi-source, conflict, staleness, withdrawal, and rights

- Multiple sources retain individual identity, authority, date, rights, and locators; they are not collapsed into an anonymous “source pack.”
- Material conflicts show competing values/claims, likely definitional differences, affected outputs, and the exact Human Decision if a treatment is chosen. No silent averaging or thesis-favorable selection.
- Stale evidence stays visible with its as-of date and readiness consequence. A new source does not erase the prior support or prior circulated Revision.
- A withdrawn or superseded source remains in immutable history but is no longer eligible for new reliance. Impact Assessment identifies every affected cell/table/chart/slide/paragraph/Deliverable.
- Rights-limited or confidentiality-limited evidence propagates its restriction to Derived Work, reader copies, exports, and archive scope. A footnote does not cure a prohibited use.
- AI-generated text, normalized tables, prior summaries, and prior Deliverables are Derived Work and cannot serve as independent evidence for themselves. They may point to their underlying Evidence Bindings only.

### 9.4 Citation presentation

XLSX should expose source/assumption IDs and readable source notes at input/output or in linked source registers; PPTX and DOCX should show compact point-of-use sources/footnotes appropriate to the audience; PDF preserves those visible citations exactly; HTML/in-app expands the full binding. Internal machine IDs need not clutter every reader surface, but the visible citation must resolve deterministically to the machine record.

## 10. Revision, refresh, and round-trip contract

### 10.1 Impact triggers

| Trigger | Mandatory action before affected work may regain prior posture |
| --- | --- |
| new/superseding/corrected/withdrawn Source Record or changed rights/confidentiality | dependency Impact Assessment; re-extraction/normalization if relevant; recalculation; regeneration proposal; citation and restriction update; affected Review/QC/Decision invalidation |
| changed approved Fact, Assumption, definition, period, unit, scenario, valuation treatment, or process Decision | recompute dependency graph; produce changed-output and narrative impact diff; re-review every material downstream Deliverable |
| new/revised bid, process letter, deadline, NDA/access state, diligence response, or buyer Decision | update Auction Control Workbook; recalculate bid/process outputs; refresh decision materials; block stale recommendations/circulation candidates |
| external Banker edit to XLSX/PPTX/DOCX or markup/comment return | register as Source Record; three-way structural diff; identify protected/generated/formula/source changes; require merge decisions; create new Revision |
| changed template/style/renderer | template preflight; regenerate only a proposed Revision; content/number/lineage diff; full visual and PDF-parity review |
| changed intended audience, purpose, circulation time, or conditions | re-evaluate confidentiality, rights, qualifications, clean-copy rules, and reader representation; create new External-Use Decision even if content is unchanged where the authorization scope differs |

### 10.2 Immutable revision rules

1. Any accepted content, formula, structure, source, template, or material render change creates a new immutable Deliverable Revision.
2. Old Revisions retain their Native Artifacts, reader copies, Evidence Bindings, Reviews, QC Findings, readiness history, Human Decisions, External-Use Decisions, hashes, and circulation records.
3. “Current” is an explicit pointer after gates pass; it never destroys prior state.
4. Review/QC evidence binds to the exact bytes and semantic object version tested. A visually identical but re-exported file is separately hashed and parity-checked.
5. Prior External-Use Decisions never carry automatically to a new Revision. The new Revision requires its own audience/purpose/time/conditions authorization.
6. The exact circulated copy is archived with the native artifact, PDF, manifest, applicable lineage, Decision, recipient/use record, and hash. Later corrections append an Impact/Correction record; they do not alter what was sent.
7. Refresh may create a working-draft automatically after deterministic prerequisites, but it may not auto-promote professional readiness or external use.

## 11. Readiness and quality gates

Readiness belongs to an exact Deliverable Revision for a stated internal purpose or candidate audience. It is not a Deal-wide percentage, visual-polish label, or External-Use authorization.

| State | Minimum source/evidence | Deterministic/model/QC | Banker judgment and format | Permitted use | Prohibited use |
| --- | --- | --- | --- | --- | --- |
| **working-draft** | source scope and material gaps identified; partial/unsupported content visibly labeled | container may be incomplete; calculations may be pending; no unresolved corruption is tolerated if the file is returned | no professional suitability decision required; native structure may still be in progress | internal construction, source requests, issue resolution, limited analyst self-review | senior reliance, client/board/committee/buyer use, circulation, any “ready” representation |
| **analysis-ready** | material inputs for the stated internal analysis are present or explicit approved assumptions/ranges; rights/confidentiality permit internal use; conflicts/gaps visible | formulas/calculations for relied-on outputs pass; required tie-outs/checks pass; no Critical calculation/source issue; native file opens and core editability works | Banker has approved material definitions/methods/assumptions for the stated analysis; full narrative/visual review may remain | internal analysis, sensitivity, comparison, draft narrative and controlled internal discussion | senior-review-ready claim, circulation candidate, external use |
| **senior-review-ready** | all material claims/inputs/outputs for the defined internal review are supported with complete native lineage; no unresolved material source conflict/rights/confidentiality blocker | native recalc where applicable; cross-artifact tie; deterministic controls; no unresolved Critical/Major issue that prevents senior review; full relevant render inspection | Banker accepts method, narrative posture and disclosed gaps; native editability and template/format quality pass for senior review | named senior/internal review and revision | circulation or representation that external use is approved |
| **circulation-candidate** | source/evidence/rights/confidentiality complete for exact audience/purpose; required qualifications and source notes present; no material source gap | all applicable formula/tie-out/cross-artifact/native/render/PDF-parity/clean-copy/template/confidentiality gates pass; no unresolved Critical or circulation-blocking Major issue | named Banker confirms professional suitability and audience fit; exact native Revision and fixed copy are locked | prepare an External-Use Decision packet; controlled final internal review | external transmission or use without a separate exact-version External-Use Decision |
| **blocked** | material source missing/conflicting/withdrawn/rights-limited, wrong Deal, unauthorized confidentiality scope, or lineage failure prevents intended use | corruption, material model/formula/tie-out/version/parity failure, silent overwrite, confidentiality leak, or invalidated review/decision | required Human Decision absent or cannot cure the underlying failure | remediation, source request, impact analysis, isolated non-reliance inspection | any affected analysis/review/circulation use above the stated safe subset |

### 11.1 External-Use Decision

`circulation-candidate` is still not permission to circulate. External use requires a separate Decision bound to:

- exact Deliverable and Revision, Native Artifact and reader-copy hashes;
- exact audience/recipient class and permitted recipients where required;
- purpose and channel;
- decision time and expiry/review time where applicable;
- confidentiality, rights, access, disclosure, counsel/firm, and other conditions;
- decision-maker and authority basis;
- unresolved accepted limitations, if any; and
- invalidation triggers.

A material source gap, model error, cross-version mismatch, wrong-audience content, confidentiality leak, or rights violation blocks circulation-candidate and External-Use preparation. A changed Revision, audience, purpose, or material condition invalidates reuse of the prior authorization.

## 12. Quality-Control Matrix

Severity meanings in this matrix are V1 product decisions:

- **Critical** — wrong Deal/audience, material unsupported or wrong result, corruption/non-editability, confidentiality/rights breach, silent edit loss, version/parity failure, or control bypass that makes reliance/circulation unsafe. Blocks the affected readiness; if discovered after circulation, triggers immediate impact/correction workflow.
- **Major** — could materially mislead, impair review, change a recommendation, or require non-trivial Banker repair. Blocks senior-review-ready or circulation-candidate as stated.
- **Minor** — localized issue without material semantic impact; can remain only when visible, owned, and accepted for the exact purpose. It never excuses a required structural/editability control.

| QC area | Automated / deterministic check | AI-assisted review | Required Banker review | Default severity | Readiness consequence | Evidence retained |
| --- | --- | --- | --- | --- | --- | --- |
| **source completeness** | required-source/dependency/coverage/rights/freshness fields; unresolved gaps by intended use | identify missing proof and likely affected claims/outputs | judge materiality and whether an assumption/range is permitted | Critical/Major | material gap blocks circulation-candidate and may cap below analysis-ready | source inventory, coverage report, gap/impact record, Decision |
| **citation correctness/completeness** | citation ID resolves to exact source/version/native locator and artifact location; all material objects covered | detect citation that does not substantively support the claim or omits qualification | confirm support is sufficient and appropriately presented | Critical/Major | unsupported material claim blocks senior-review-ready/circulation | citation ledger, resolution result, reviewed source excerpt/location |
| **arithmetic/formula integrity** | formula parse/copy-pattern/error/external-link/circularity/recalc checks; independent recomputation | detect anomalous logic or inconsistent treatment | approve methods/treatments and investigate material exceptions | Critical/Major | material failure blocks analysis-ready | formula inventory/diff, recalculation log, exception evidence |
| **tie-outs** | balance/subtotal/bridge/source/sensitivity-base checks with explicit rounding | explain discrepancies and likely definition/scope causes | resolve material discrepancy or approve stated treatment | Critical/Major | unresolved material tie blocks analysis-ready | check result, variance, source/model locations, disposition |
| **cross-artifact numeric consistency** | compare canonical metric keys including entity/definition/period/unit/currency/scenario/rounding across XLSX/PPTX/DOCX/PDF | detect semantic mismatches beyond identical strings | choose controlling treatment and validate narrative use | Critical/Major | material mismatch blocks senior-review-ready/circulation | comparison ledger, locations, dependency versions, disposition |
| **narrative-to-model consistency** | verify cited workbook range/value/scenario/version and required qualifications | review whether prose overstates or reverses model implications | own interpretation, materiality and recommendation | Critical/Major | material contradiction blocks senior-review-ready | paragraph/slide-to-model bindings, finding, Banker disposition |
| **unit/period/currency consistency** | typed metadata and display-label comparison; conversion/formula check | flag misleading mix or missing definition | approve basis and audience disclosure | Critical/Major | material ambiguity blocks analysis-ready or circulation | field comparison, conversion trace, corrected locations |
| **file corruption/integrity** | package/OOXML/PDF parsing, required parts, relationships, hashes, virus/safe-file policy | none beyond exception explanation | confirm replacement/source handling when needed | Critical | blocked | integrity log, hash, parser result, replacement lineage |
| **native editability** | presence/validity of formulas, native objects, masters/layouts/styles, editable tables/charts, comments/notes, named structures; round-trip fixture | assess whether artifact requires unreasonable manual reconstruction | perform task-based native edit review on benchmark/material artifacts | Critical/Major | failure blocks senior-review-ready; flattened required artifact is Critical | structural inventory, edit-task result, screenshots/diff |
| **render parity** | compare native render to PDF for page/order/text/number/object presence; visual-diff support | inspect non-deterministic visual change and font/layout substitution | accept exact candidate render | Critical/Major | material mismatch blocks circulation-candidate | renderer/version, renders, diff, PDF/native hashes |
| **overflow/clipping/legibility** | bounding-box/overflow/object-collision/page-bound checks where available | visual inspection of density, hierarchy, reading order and clipped content | inspect material/dense pages/slides/sheets | Major/Minor | material/unreadable issue blocks senior-review-ready/circulation | page/slide/sheet renders, annotated finding |
| **chart/table accuracy** | chart series/range/categories/labels and table total/source ties | check misleading axes, selection, ordering, visual implication | approve interpretation and reader suitability | Critical/Major | material error blocks senior-review-ready | chart/table IDs, source/model ranges, render, disposition |
| **template compliance** | theme/master/layout/style/placeholder/font/footer/legend profile comparison | assess inappropriate layout choice or style drift | accept controlled deviations | Major/Minor | material break blocks circulation-candidate; local drift may be accepted | template version/profile, preflight, deviations/change log |
| **stale/superseded source impact** | dependency graph and freshness/supersession rules identify affected objects | propose likely changed conclusions and required refresh | decide materiality and whether temporary internal use is allowed | Critical/Major | affected candidates blocked pending impact/review | change event, impact graph, recalculation/regeneration/review results |
| **required qualifications** | required disclosure/label rules by evidence/audience/artifact; clean-copy scan | judge whether caveat is clear, placed at point of use, and non-misleading | approve audience wording and residual limitation | Critical/Major | missing material qualification blocks circulation-candidate | rule result, exact text/location, Decision |
| **unresolved assumptions/issues** | register completeness, severity/status/owner/dependency and gate logic | identify hidden assumptions and recommendation impact | approve/disposition/accept residual risk where permitted | Critical/Major/Minor | material unresolved item caps readiness or blocks | registers, dependency impact, Decision/review note |
| **comments/notes/draft markings** | detect comments, notes, tracked changes, hidden slides, draft labels, placeholders, internal file paths and metadata | classify intentional vs leak-prone content | approve clean/annotated representation | Critical/Major | leak-prone content blocks circulation-candidate | scan, exact locations, clean-copy diff |
| **confidentiality markings/scope** | Deal/audience/classification/access/legend/metadata rule validation | detect identity or sensitive-content leakage and inconsistent staging | approve disclosure boundary and recipient scope | Critical | blocked for affected audience/use | classification, recipient/use context, leak scan, Decision |
| **external-use gate compliance** | exact hashes/Revision/audience/purpose/time/conditions match valid Decision; transmission disabled absent match | summarize blockers only | make External-Use Decision; product never infers it | Critical | no external use | locked packet, Decision, copy hash, circulation record |

Automated “no issue found” is retained as a test result, not proof of quality. AI-assisted review cannot waive a deterministic failure or create evidence. Banker review cannot turn a corrupted, wrong-Deal, rights-prohibited, or mechanically false artifact into a circulation-candidate.

## 13. Template and customization boundary

### 13.1 V1 recommendation

V1 provides conservative default professional templates for the two workbook families, Teaser/CIM/Presentation decks, and memo/process-letter documents. The templates establish structure, semantic styles, master/layout behavior, source/footnote zones, confidentiality legends, print/render settings, and protected/generated regions without imposing a product brand.

V1 also allows an Individual Banker to upload and save a Banker/firm template or precedent for a specific artifact class, subject to rights and confidentiality authority. This is self-serve customization, not firm-level administration.

### 13.2 Template preflight

Every uploaded template receives a preflight before use:

- file integrity, type, version, macros, external links/connections, fonts, embedded objects, and compatibility;
- PPTX slide size, themes, masters, layouts, placeholders, notes/comments, footers, page numbers, confidentiality/source zones;
- XLSX sheet structure, styles, named ranges, input/formula color semantics, charts, print settings, protected/hidden content;
- DOCX styles, numbering, sections, headers/footers, page setup, tables, fields, comments/revisions, and disclosure blocks;
- mapping of required product content roles to compatible template roles;
- unsupported features, expected fidelity, safe preservation behavior, and required fallback.

### 13.3 Incompatibility and fallback

The product must not silently “make it work” by flattening or discarding native structures. It returns a preflight report and recommends one explicit path:

1. use the template with a named limited-fidelity mapping;
2. use the default professional template while preserving the user's template as a source/reference; or
3. keep the Deliverable blocked until the user supplies a compatible template.

The recommended default is option 2 when native structure or reliable rendering would otherwise fail, but the user must see the expected differences before generation.

### 13.4 Included and deferred customization

**Included:** per-Deal/per-artifact template selection; logo and approved legend; theme/font/color/style mapping; reusable layout/style profile extracted from an authorized template; page/slide/sheet dimensions; standard units/precision/negative-value conventions; source/footnote and confidentiality treatments; controlled overrides with change log.

**Deferred:** organization-wide template libraries, roles/permissions, approval/publishing workflows, policy enforcement, multi-brand inheritance, global update propagation, template marketplace, custom Office add-ins, macro support, and service-team manual repair.

High-ticket value must survive on the default templates and automated preflight. It cannot depend on a founder, implementation consultant, or production team manually repairing each file.

## 14. Benchmark and evaluation approach

### 14.1 Benchmark corpus

Use four rights-safe artifact classes:

1. **Public authoritative transaction evidence:** SEC-filed merger proxies, tender/transaction materials, public process histories, filed presentations, and other public official records to establish real auction stages, disclosure patterns, financial-advisor analyses, and reader expectations. A public filing is workflow evidence, not a reusable confidential template or automatic ground truth for product language.
2. **Rights-cleared native exemplars/templates:** product-authored or licensed XLSX/PPTX/DOCX artifacts with known formulas, native objects, styles, comments, notes, lineage, and deliberate edge cases.
3. **Synthetic Deal packets:** internally constructed financials, management claims, buyer events, process letters, bids, diligence responses, conflicts, corrections, confidential/public splits, and exact expected outputs. Synthetic cases are the primary source of complete ground truth and safe failure injection.
4. **User-authorized templates/precedents:** used only for compatibility and self-serve template evaluation, with rights/confidentiality controls and no cross-customer reuse.

Do not use real Confidential Deal Materials in V1 benchmark development unless a later security/rights program explicitly authorizes it.

### 14.2 Expected output and ground truth

Each case includes:

- immutable input/source versions, rights/confidentiality, exact locators, and seeded gaps/conflicts;
- expected normalized fields, formulas, values, tie-outs, scenarios, process transitions, and source-to-artifact lineage;
- expected native artifact object inventory, template mapping, protected regions, and reader-render reference;
- expected readiness ceiling, blockers, QC severities, required Banker Decisions, and External-Use prohibition/permission state;
- mutation suites: revised source, changed bid, corrected formula, stale/withdrawn source, external native edit, changed template, changed audience, and attempted gate bypass;
- expected Revision/Impact/recalculation/regeneration/re-review history and reproducible archive package.

Ground truth should be authored and adjudicated by people qualified for the relevant finance/model/presentation review during product development. The exact reviewer count, adjudication protocol, materiality bands, visual tolerances, and pass-rate thresholds are **later Product Design Decisions**; no unsupported “industry standard” percentages are asserted here.

### 14.3 Evaluation dimensions

Evaluate separately; never average them into a single quality score:

| Dimension | What must be demonstrated |
| --- | --- |
| **structure** | correct Deliverable set, stages, required sections/modules, native object types, IDs, manifests and relationships |
| **numeric/model** | formula correctness, recalc, tie-outs, scenario behavior, units/periods/currency/signs, reproducibility and no stale-cache reliance |
| **evidence** | claim/value coverage, exact locator correctness, multi-hop lineage, conflict/staleness/rights propagation and no AI self-citation |
| **native editability** | task-based edit/extend/recalculate/re-layout/comment operations in intended native apps without reconstruction |
| **rendering** | no corruption/clipping/overflow; readable hierarchy; native/PDF parity; font/template behavior; clean-copy integrity |
| **cross-artifact consistency** | same controlled definitions/values/scenarios across workbook, deck, memo, PDF and in-app views, with explained rounding |
| **professional usability** | a qualified Banker can understand status, review mechanics, modify the artifact, identify gaps, and perform the intended stage task |
| **round-trip/refresh** | external edits survive merge rules; protected content is not lost; changed sources propagate only to dependents; approvals reset correctly |
| **revision reproducibility** | identical controlled inputs reproduce semantic outputs; old/circulated copies and Decisions remain immutable and verifiable |
| **control compliance** | readiness ceilings, confidentiality/rights, exact audience/use, and External-Use gate fail closed under adversarial mutation |

### 14.4 Release-blocker taxonomy

**Critical release blockers** include any observed wrong-Deal or unauthorized disclosure; material fabricated/unsupported claim or number promoted beyond its ceiling; material formula/tie-out/model error; corrupt or flattened required Native Artifact; loss/silent overwrite of Banker edits; native/PDF or cross-version material mismatch; incorrect source lineage that points to the wrong support; non-reproducible material output; or bypass/inheritance of an invalid External-Use Decision.

**Major defects** include material stale/citation/qualification gaps that are correctly contained but prevent intended readiness; material cross-artifact inconsistency; broken template/master behavior; chart/table/paragraph that materially misleads; unreadable/clipped material content; or round-trip requiring substantial Banker reconstruction.

**Minor defects** are local formatting, spacing, label, or non-material rounding issues that do not change meaning, editability, evidence, readability, or control state. Repeated Minor defects can become Major when they impair professional usability.

Release evaluation retains zero observed Critical failures as a sentinel invariant, consistent with Ticket 7. Exact corpus sizes, acceptable Major/Minor rates, task times, render tolerances, materiality thresholds, and benchmark coverage targets must be set and justified during Product Design; this Ticket does not invent them.

### 14.5 Required evaluation sequences

- golden generation and deterministic replay from the same controlled inputs;
- native-open, edit, save, recalc, and re-import tasks in supported application/version combinations;
- native-to-PDF render and content/parity comparison;
- changed-source selective impact and no-change stability test;
- external Banker edit three-way merge and protected-edit preservation test;
- stale/conflicting/withdrawn/rights-limited evidence propagation test;
- revised-bid/process event update and recommendation invalidation test;
- exact circulated-copy archive and later correction test;
- wrong audience/Deal, hidden metadata, draft-comment, and External-Use bypass adversarial tests;
- qualified Banker blind review of usability separately from visual resemblance.

“Looks like investment banking material” is never a passing criterion. A visually plausible deck with unsupported numbers, a workbook with pasted values, or a PDF without a controlled native source fails.

## 15. Official Capability Baseline assessment

### 15.1 Verified local baseline

The installed official plugin provides substantive starting mechanics:

- router composition for Sell-Side Auction work across CIM teardown/build, financial normalization, buyer universe, process tracker, model/valuation work, deck building, memo building, and deck/artifact QC;
- explicit hero-vs-support artifact hierarchy, artifact manifests, strict handoffs, evidence labels, source logs, claims ledgers, and model citation records;
- workbook-first standards, formula-driven model outputs, source-to-cell/range citations, calculation-vs-decision readiness separation, static workbook audits, and rendered workbook inspection;
- native deck generation paths, template/master/style preservation expectations, chart-to-model lineage, point-of-use citations, and final slide/PDF visual QC;
- DOCX/HTML memo paths, process/workbook trackers, CSV ledgers, and HTML reader/review outputs;
- non-destructive style adaptation rules covering masters/layouts/themes, notes/comments, formulas/names/source links, Word styles/bookmarks/cross-references/revisions, and template change logs;
- validators/builders for manifests, handoffs, model citations, financial normalization, buyer scoring, process workbooks, model workbooks, CIM packages, and heuristic cross-format QC.

### 15.2 Productization gaps this Ticket closes

The baseline cannot be adopted unchanged as the V1 result contract:

- some plugin workflows default to standalone HTML even where V1 requires Banker-owned PPTX/DOCX/XLSX;
- its shared `office_artifacts.py` writes only minimal DOCX/PPTX package scaffolds, which is not Professional Usability or a template-faithful native artifact;
- static formula/citation extraction and heuristic QC do not prove native recalc, exact model lineage, visual quality, or semantic support;
- plugin route-level “client-ready” or similar labels do not replace the Deal Workspace's five readiness states or exact External-Use Decision;
- plugin artifacts and handoffs need immutable Revision, protected-edit, impact-propagation, round-trip, exact-circulated-copy, and audience-bound control across the whole Deal;
- a source footnote, manifest entry, or generic `model-output` citation is insufficient when the exact native source/cell/slide/paragraph path is available.

Therefore v0.1.29 remains the minimum capability baseline, while this asset supplies the binding product-level Deliverable, native editability, refresh, revision, readiness, and evaluation contract.

## 16. External primary and authoritative evidence

**Verified facts used to calibrate the design:**

- SEC-filed transaction histories show financial advisors and companies using confidential information memoranda, financial models, buyer outreach, confidentiality agreements/data rooms, management presentations/diligence, indications of interest/bids, final proposal requests, and agreement markups as a staged artifact family. Representative official filings include [Ryerson's 2007 transaction history](https://www.sec.gov/Archives/edgar/data/790528/000119312507205489/ddefm14a.htm) and [FNFV's 2017 merger proxy](https://www.sec.gov/Archives/edgar/data/1610793/000119312517281924/d419675ddefm14a.htm). These prove workflow reality, not native formats, quality thresholds, or a universal required file list.
- [ECMA-376](https://ecma-international.org/publications-and-standards/standards/ecma-376/) defines Office Open XML vocabularies, representation, packaging, and producer/consumer requirements. [Microsoft's Open XML SDK design considerations](https://learn.microsoft.com/en-us/office/open-xml/open-xml-sdk-design-considerations) explicitly separate package manipulation from Word layout, Excel recalculation/data refresh, and conversion. [Microsoft's formula documentation](https://learn.microsoft.com/en-us/office/open-xml/spreadsheet/working-with-formulas) states that formula text and last-calculated cached values are distinct SpreadsheetML elements; [Excel recalculation documentation](https://learn.microsoft.com/en-us/office/client-developer/excel/excel-recalculation) documents recalculation and dependency-tree rebuild behavior. These support layered validation and the formula/cache/recalc distinction.
- [Microsoft's PresentationML structure](https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document) identifies slide masters, layouts, themes, slides, notes, tables, and comment parts as native presentation structure. [Word paragraph styles](https://learn.microsoft.com/en-us/office/open-xml/word/how-to-apply-a-style-to-a-paragraph-in-a-word-processing-document), [Word comments](https://learn.microsoft.com/en-us/office/open-xml/word/how-to-retrieve-comments-from-a-word-processing-document), and Open XML revision semantics support preservation of structured authoring/review features.
- [ISO 32000-1](https://www.iso.org/standard/51502.html) defines PDF as an environment-independent electronic-document representation, and [Microsoft Office fixed-format export](https://learn.microsoft.com/en-us/office/pdf/extendingofficepdfexport) describes paginated application/platform-independent output. These support PDF's frozen reader-copy role, not a claim that PDF alone proves visual parity or editability.
- [RFC 4180](https://www.rfc-editor.org/rfc/rfc4180) documents the common CSV format and `text/csv` media type. CSV's inability to carry workbook/deck/document semantics is an evidence-backed inference from its flat exchange form and OOXML's richer structures.
- [NIST FIPS 180-4](https://csrc.nist.gov/pubs/fips/180-4/upd1/final) supports digest-based change detection; it does not make a file correct or approved. [FINRA Rule 2210](https://www.finra.org/rules-guidance/rulebooks/finra-rules/2210) and the [SEC's Rule 17a-4 recordkeeping amendments](https://www.sec.gov/investment/amendments-electronic-recordkeeping-requirements-broker-dealers) provide conditional record-copy/source/audit-trail constraints for covered entities and records only. They inform exact-copy rigor but do not define universal Banker quality or product compliance.

External sources were accessed on 2026-07-31. No external source was used to invent quality percentages, materiality thresholds, or a mandatory industry-wide artifact bundle.

## 17. Local inspection register

All plugin paths below are relative to `/Users/wxm/.codex/plugins/cache/openai-curated-remote/investment-banking/0.1.29`.

- **Router/policies:** `skills/investment-banking/SKILL.md`; `references/invocation-policy.md`; `plugin-routing-playbook.md`; `deliverable-intake-policy.md`; `artifact-manifest-standard.md`; `deliverable-format-policy.md`; `banker-runtime-readiness-standard.md`; `workbook-first-tab-standard.md`; `html-artifact-standard.md`; `dashboard-citation-readiness-policy.md`; `dashboard-operational-controls-policy.md`; `workflow-source-resolution.md`; `handoff-contracts.md`; `evidence-label-taxonomy.md`; internal-support policy.
- **Sell-Side Auction workflows:** `cim-teardown`, `cim-builder`, `financials-normalizer`, `buyer-investor-list`, `deal-process-tracker`, `pitch-deck-builder`, `memo-builder`, and `ib-deck-qc` skill instructions; their source/tie-out, output/template, tracker/schema, quality/review, deck/source, memo, and extraction/QC references; their public scripts and bundled intake/page-plan/source/change-ledger assets.
- **Workbook/model/valuation:** `comps-valuation`, `dcf-model-builder`, `three-statement-model-builder`, `scenario-sensitivity-generator`, `model-audit-tieout`, `merger-model-builder`, and `lbo-model-build` skill instructions; workbook/model/output/QA/source/formula contracts; banker-formula XLSX templates; plan templates; public materializers, workbook builders, model citation generators, and audit scripts. Merger/LBO materials were used as general model-quality evidence, not added as required Sell-Side Auction V1 Deliverables.
- **Native style/template mechanics:** `skills/investment-banking/internal-support/style-guide-adapter/INTERNAL.md`; style extraction, artifact application, source/safety references; Office style extraction/profile/diff scripts.
- **Shared tools/validators:** `shared/artifacts.py`, `model_artifacts.py`, `model_citations.py`, `office_artifacts.py`, `document_ingestion.py`, `source_gate.py`; artifact-manifest, handoff, and model-citation validators. Tools were treated as implemented baseline mechanics, never as proof of professional judgment or complete native fidelity.

The companion [Ticket 8 Authoritative Source Notes](ticket-8-authoritative-source-notes.md) preserve the detailed claim-to-source mapping and applicability limits for the external evidence.

## 18. Constraints on later work

### Ticket 9 — product form and first-value journey

The prototype must make the package legible as a controlled family, not a file dump. It must expose the two workbook spines, stage-triggered deliverables, evidence navigation, rendered review, protected/generated diffs, impact state, readiness blockers, and exact Revision/audience/purpose External-Use Decision without designing enterprise approval administration.

### Ticket 10 — premium value and pricing

Pricing must attach to sustained execution value: producing and safely refreshing the controlled package across source, process, bid, review, and circulation events. It must not count file exports or feature quantity as the primary value metric. This asset does not choose price or unit economics.

### `/to-spec`

The specification must convert the artifact matrix, native structures, evidence locators, refresh triggers, readiness gates, QC evidence, template preflight, evaluation mutations, and Critical release blockers into testable acceptance behavior. It must not weaken “Banker-native” to “opens in Office,” “cited” to “has a footnote,” “reviewed” to “AI found no issues,” or “circulation-candidate” to “authorized to send.”

## 19. Resolution

**Resolved answer:** V1 will deliver a Controlled Auction Execution Package inside the Controlled Sell-Side Auction Deal Book: two always-current XLSX spines for analysis/valuation and auction control; stage-required editable PPTX Teaser/CIM and DOCX Bid Evaluation & Recommendation Memo; conditional management/update/process artifacts; exact PDF representations only where review/circulation requires them; mandatory machine-trackable evidence/control records; an in-app review/control surface; and an immutable export/archive package. Every result is governed by native editability, exact source/model lineage, deterministic calculation and QC, protected Banker edits, impact-driven refresh, immutable Revisions, audience-bound readiness, and a separate exact-version External-Use Decision.

No new Wayfinder ticket is required. Remaining questions are implementation/evaluation details for Tickets 9–12 or `/to-spec`. Work stops at this Ticket.
