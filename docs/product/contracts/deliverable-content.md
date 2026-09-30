# Core deliverable content contract

Design revision: 2026-09-30. This contract owns substantive content for the five core V1 outputs. The [product spec](../spec.md) owns scope; [AI contracts](../../technical/ai-prompt-contract-spec.md) own proposal boundaries and evaluation execution. These are product design choices, not assertions of industry certification or existing implementation.

## Common content and quality rules

Every output states its Deal, purpose, intended audience, as-of time, immutable basis versions, content-contract version, units, period definitions, readiness and known limitations. A native artifact and its Reader Copy represent the same Revision. A rendered file is never the source of business authority.

Each material statement has an exact Evidence/Fact/Assumption/Calculation/Analysis/Bid/Process binding or an explicit unresolved qualification. Citation proximity must let a reader distinguish a sourced assertion from a Banker assumption. Unknown is distinct from zero, false, not applicable and not yet received. A missing required input produces an explicit gap and output ceiling; it cannot disappear through prose smoothing.

Historical, estimated and forecast periods remain separate. Financial lines identify currency, scale, fiscal period, sign convention and whether D&A is included in operating expenses. Revenue, EBITDA, enterprise value, equity proceeds and cash at close are different measures. Do not add an adjustment twice, mix incompatible periods or treat contingent proceeds as cash. Calculation authority uses decimal inputs and deterministic formulas; display rounding never changes decisions or tie-outs. Round half away from zero at display only; USD million displays one decimal in narrative, two in detailed comparisons, percentage one decimal, multiple one decimal. Totals reconcile on unrounded values.

Every numerical presentation binds its exact authoritative result and display rule. Tables must identify denominator and scenario. Repeated values and labels must agree across the five outputs. Narrative statements cannot silently convert a conditional or disputed input into a Fact.

Customization permits section order, approved branding, prose tone and optional modules through a versioned Artifact Template. Required business content may be relocated but not removed. Required qualifications, basis, citations and uncertainty cannot be hidden by a template. Every omitted optional module records `not_applicable` and a reason. A smaller selected work objective is supported without implying completion of the whole Execution Package.

## Analysis & Valuation Workbook — `av-v1.1`

| Required sheet / module | Minimum input and expected result |
|---|---|
| `Readme` | Purpose, audience, as-of date, units, scenario, included/omitted methods, status and limitations |
| `Source_Map` | Every imported financial line, exact source version/locator, normalization and authority state; no unsourced plug |
| `Historicals` | At least two comparable periods for trend analysis; a single period permits a one-period snapshot with growth unavailable; revenue, operating cost definition, reported EBITDA and D&A/EBIT bridge |
| `Adjustments` | Reported-to-adjusted EBITDA bridge; each amount has category, period, evidence, recurrence rationale and Banker disposition; pending/rejected items excluded from accepted total |
| `Operating_Case` | Management forecast separate from history; drivers, assumptions and scenarios explicit; absent forecast means module marked unavailable, never an invented projection |
| `Valuation` | Method-specific inputs and ranges; multiples labeled illustrative unless a supplied, rights-permitted comparable set supports market-derived claims; DCF only when cash-flow, discount-rate and terminal assumptions are supplied and accepted |
| `EV_Equity_Bridge` | Debt, cash, debt-like/cash-like items, working-capital convention and transaction adjustments; missing bridge items block an equity-proceeds conclusion but not a qualified EV analysis |
| `Sensitivity` | At least a three-point material assumption sensitivity for a selected valuation method; no unsourced probability weighting |
| `Checks` | Historical ties, EBITDA bridge, units/period consistency, scenario ties and cross-output values; failed material checks prevent readiness advancement |

The first financial-review outcome needs history, one exact accepted adjustment or explicit reviewed no-adjustment conclusion, an accepted purpose and a reconciled bridge. A valuation conclusion additionally needs accepted method inputs. Missing valuation inputs may leave a useful financial-review draft; it cannot be labeled a completed valuation.

## Auction Control Workbook — `auction-v1.1`

| Required sheet / module | Minimum input and expected result |
|---|---|
| `Readme` | Exact process snapshot, round, dates/timezone, audience and scope |
| `Buyers` | Stable party identity, candidate versus approved state, rationale/source, restriction, owner and next action; empty list is shown explicitly |
| `Process` | Append-only dated events, round, deadline and typed next action; planned activity distinct from recorded actual use |
| `NDA_Access` | NDA status and exact evidence; data-room and product Recipient Access remain different grants |
| `Diligence` | Issue, request, source gap, accountable actor, due time, severity, affected output and completion evidence |
| `Bids` | Each exact immutable Bid Version, currency, EV/equity basis, upfront/contingent/rollover, financing, approvals, conditionality, timing, exclusivity and source locators |
| `Comparison` | Normalized like-for-like cash-at-close and contingent ranges plus non-price conditions; missing data stays unknown; no automatic winner |
| `Decisions` | Exact Human Decision, basis, rationale, conditions and supersession status |
| `Checks` | Every material deadline/term has a source or explicit assumption; no delivered/read status inferred from authorization alone |

No bids yet is a valid process-control workbook. A bid comparison requires at least two comparable exact Bid Versions; a single bid permits a single-offer review. Missing consideration basis blocks ranking by value while preserving process tracking.

## Teaser — `teaser-v1.1`

Required sections: anonymous investment overview; business/products and end-market description; three or fewer supported investment highlights; compact historical financial summary; growth opportunities with assumptions distinguished; transaction scope and contact/next step; visible material qualifications.

Minimum inputs are approved disclosure scope/audience, business description, transaction perimeter and at least one usable financial period or explicit financial-data-unavailable limitation. Default layout is two slides; a one-page template may combine regions without dropping content. An anonymous audience cannot receive the company/client name, identifying customer names, unique facility/address, unapproved logos or identifiable source filenames. Review both text and images/notes/metadata. Source citations use permitted reference codes in the external copy; the internal control records retain exact lineage.

An internal qualified draft may retain unavailable financial sections; a circulation candidate must meet the selected disclosure set, source authority, QC and explicit External-Use Decision. The word “leading,” a market share, recurring revenue claim or quantified growth claim needs evidence for that exact assertion.

## CIM — `cim-v1.1`

Required modules: executive summary and transaction perimeter; company/products; customers and concentration; end markets and competition (or explicit gap); operations/capacity; management/organization; historical financials and normalization; forecast/drivers if supplied; growth opportunities; risks/open diligence; process/next steps; basis and qualifications.

Minimum input for a complete internal CIM draft includes a supported business description, two comparable historical periods or qualified shorter operating history, customer concentration, operating footprint, management roles, proposed perimeter and a source/assumption basis for each included highlight. No forecast is allowed when unavailable. Missing noncritical material becomes a visible open item, with the relevant module labeled partial; missing core financials or transaction perimeter prevents “complete CIM” status.

A template may split or combine modules. The default semantic outline contains 12 slides; actual pagination may expand. No arbitrary page-count target justifies filler or removal of risk. Required chart/table content must survive native/reader rendering, including labels, notes and source references.

## Bid Evaluation & Recommendation Memo — `bid-memo-v1.1`

Required sections: decision requested and as-of scope; executive recommendation with conditions; source and comparability basis; normalized economics; execution certainty and conditions; timetable/exclusivity/control implications; alternatives and tradeoffs; unresolved diligence and sensitivity; exact proposed next action; citations and limitations.

Minimum inputs for comparative recommendation are two exact Bid Versions, consideration definitions, assumed net-debt/working-capital bridge, transaction perimeter, timing/conditions and a Banker-confirmed decision criterion. Missing terms can support a conditional recommendation to clarify terms; they cannot support an unconditional winner. No probability-adjusted earnout without an accepted probability assumption. The memo distinguishes recommendation from selection Decision and selection from External-Use Decision.

If “highest guaranteed cash at close” and “highest possible headline proceeds” favor different bidders, show both outcomes and their basis. A change to one Bid Version invalidates the affected comparison/recommendation; unchanged history remains inspectable.

## Readiness and quality acceptance

| Gate | Pass condition | Failure consequence |
|---|---|---|
| Content completeness | All required modules for the selected outcome are populated or explicitly allowed partials with reason | Output stays qualified draft; first useful outcome fails if a required selected module is missing |
| Numeric truth | Every frozen expected number/formula, period, unit and comparison matches exactly before display rounding | Material mismatch is Critical; affected output blocked |
| Evidence and qualification | Every material assertion resolves to an allowed exact basis; no invention, hidden uncertainty or unsupported superlative | Material unsupported statement is Critical |
| Professional usefulness | Clear decision/question, coherent explanation, readable structure, explicit next action and material tradeoffs; each must pass | Revise relevant content; no aggregate score can offset failure |
| Disclosure and boundary | Exact audience/purpose, no prohibited identifying details, no implied authorization or performed action | Critical; circulation blocked |
| Artifact parity | Native and Reader Copy show the same required regions, numbers, qualifiers and citations with no clipping/loss | Affected Revision cannot be ready |

The [Harbor Components reference packet](../reference-deals/harbor-components/README.md) supplies fixed inputs, five fully populated semantic outputs and negative cases. Its exact calculations are deterministic ground truth. Its authored narrative requirements are a frozen product rubric, not independent Banker adjudication. Existing three blinded AI judges may review usefulness and narrative fidelity; agreement is not a claim of independent professional validation, especially when all use the same model. Apply the existing tie/disagreement policy and fail closed on Criticals. Do not hire advisors, solicit interviews or pool customer content for this baseline.

All must-pass fields and cases must pass, zero Criticals are allowed, and each qualitative dimension must pass individually under the AI evaluation protocol. Freeze input, expected output, rubric, prompt/model and judge versions before evaluation. Never regenerate expected answers from the evaluated run. The seed packet establishes design acceptance examples; broader source/native/render/adversarial suites and provider probes remain release evidence to produce during implementation. Unsupported public accuracy or professional-certification claims remain disabled.

## Schema mapping for implementation

`content_contract` uses the five IDs above. Narrative sections use the stable keys shown in the reference output headings, ordered explicitly. Every narrative region declares `region_key`, `kind` (`text`, `table`, `chart`, `qualification`), payload, and typed basis references; tables declare column measure/unit/period and rows; charts bind table results rather than copied unsourced numbers. Required section keys, optional modules and permitted partial reasons are closed per type. Unknown section/type/basis fields fail validation. Semantic acceptance validates all required keys, exact references, audience and partial-output ceiling before an Accepted Content Version exists. Workbook contracts bind sheet/region keys to typed relations and deterministic formulas, without a second JSON financial authority.
