# Premium Self-Serve Monetization and Unit Economics

Status: Product design decision for Ticket 10  
Decision date: 2026-08-01  
Launch market: United States, English, USD  
Evidence companion: [Ticket 10 Authoritative Source Notes](ticket-10-authoritative-source-notes.md)

## Decision in one page

The Individual-First Release will sell **complete Controlled Auction Execution Package capacity**, not AI access and not a crippled entry tier.

| Decision | Recommended design |
|---|---|
| Commercial object | One named Individual Banker subscription to the persistent Deal Execution Desk |
| Primary value metric | Concurrently **Active Deal Workspace capacity** |
| Billing unit | One monthly or annual subscription including two Active Deal slots; extra Active Deal capacity is co-termed |
| Individual list price | **$995/month**, or **$10,950/year paid upfront** |
| Annual discount | $990, or **8.3%** versus 12 monthly payments; annual monthly equivalent **$912.50** |
| Included Active Deals | Two concurrent Active Deal Workspaces |
| Additional Active Deal | **$500/month** or **$5,500/year**, co-termed and prorated at purchase |
| Core capability | Every core Controlled Auction Execution Package capability is included; no core outcome is reserved for Team |
| Operational allowance | Per Active Deal per billing month: 2,500 newly processed logical source pages and 20 defined full-workflow operations; targeted correction, QC, review and recovery are not counted |
| Exception pack | **$1,000 per affected Active Deal-month** for 5,000 additional newly processed pages and 20 additional full-workflow operations, shown before execution and purchased with explicit consent |
| Preview/risk reversal | Public interactive proof plus downloadable synthetic workspace; no free trial and no confidential upload before payment; conditional 14-day First-Deal Control-Loop Guarantee |
| Gross-margin target | Cash gross margin at least 80% at target and 85% at steady state; contribution margin including support at least 75% at steady state |
| Base monthly economics | $995 revenue; $217.62 estimated cash cost; 78.1% cash gross margin; $292.62 including support; 70.6% contribution margin |
| Future Team | Organizational-value layer at an indicative $2,995/month or $32,950/year for five seats and six pooled Active Deals; Individual core remains complete |

The price is a **Product Design Decision**, not a verified willingness-to-pay fact. Public evidence proves that professional users can self-purchase AI subscriptions, financial workflow software and live transaction rooms across materially different price bands. It does not prove conversion at $995. The value and unit-cost models below make the hypothesis falsifiable without turning future evidence into a product go/no-go threshold.

## Epistemic labels and inherited contract

- **Verified fact** means a current first-party source or an approved prior Ticket directly supports the claim.
- **Evidence-backed inference** means the conclusion follows from verified facts but was not itself measured.
- **Product design decision** means this document fixes the product or commercial behavior.
- **Assumption** means a numeric or behavioral input still requires production or purchase evidence.
- **Unresolved validation question** means a post-launch measurement question, not a reason to stop product development.

This decision inherits without reopening the approved contracts from Tickets 2–9: a solo founder does not sell, implement or operate banker services; the buyer is an execution-oriented Individual Banker with separate purchase and data-use authority; the first workflow is a Sell-Side Auction; the persistent Deal Workspace produces a Controlled Auction Execution Package; upload/export-first and Ticket 6 rights, confidentiality, retention, export and deletion controls apply; AI remains evidence-bounded and deterministic work closes calculations and checks; human decisions and exact-version external-use authorization remain distinct; native artifacts, reader copies, control records and archive packages are part of the result; and the validated self-serve form is **outcome-first discovery → guided first correct use → persistent Deal Execution Desk**, with Package Readiness as a core workspace view.

## 1. Commercial object and value metric

### Alternatives considered

| Structure | Buyer predictability | Alignment with repeated Deal work | Safety and economic consequence | Verdict |
|---|---|---|---|---|
| Per user / seat | High | Weak by itself; one user may run materially different Deal volume | Simple, but it hides the principal workload and expansion event | Retain as account identity, not the primary value metric |
| Per Active Deal Workspace | High: a Deal is either Active or Archived | Strong: the same Deal persists through Sources, Revisions, artifacts, QC and return events | Does not punish inspection or correction; capacity can expand when concurrent work expands | **Selected primary value metric** |
| Per Deal activation | Medium | Aligns with new Deal starts, but can punish reactivation or encourage keeping stale Deals open | Creates argument over what counts as “new” | Reject as the main unit |
| Per active Deal month or quarter | High monthly; lower quarterly | Strong | A month is predictable and supports pause/archive/reactivate behavior | **Selected billing implementation for Active Deal capacity** |
| Per Controlled Auction Execution Package | Medium | Captures the hero outcome once, not its continuing Revision lifecycle | Encourages defining packages too narrowly and discourages refresh | Reject as main unit |
| Per Deliverable or export | Low during iterative work | Poor | Directly rewards fewer checks and fewer usable representations | Reject |
| Subscription plus included Deals | High | Strong | Keeps purchase simple and gives the first two Deals complete capability | **Selected packaging** |
| Subscription plus Deal activation/usage | Medium | Strong for high-volume exceptions | Safe only if the usage unit is visible before work and excludes controls | Use only for extra concurrent capacity and exceptional processing |
| Annual commitment | High | Aligns with recurring Deal flow, not a value metric itself | Improves retention but can magnify first-purchase risk | Offer as a term choice with the same product |
| Token, prompt, citation, correction, AI run or reviewer-action billing | Low | No | Makes safe evidence work feel expensive and exposes an implementation primitive | Deliberately prohibited |

### Selected metric

An **Active Deal Workspace** is a Deal whose current state can ingest new Source Records, run material analysis or package work, create a Revision, or advance Package Readiness. An **Archived Deal Workspace** is read-only except for search, evidence inspection, download, export and deletion. Reactivation consumes an available Active Deal slot; it is not a new activation fee.

This metric is predictable because the Banker knows how many Deals are simultaneously in active execution. It aligns with repeat work because a slot covers the entire continuing lifecycle, not one upload or one file. It avoids unsafe shortcutting because source inspection, citations, corrections, deterministic recalculation, targeted regeneration, QC, review, typed Human Decisions, blocked-state recovery, External-Use Decisions, downloads and exports are not separately charged.

### Deliberately not metered to the user

- tokens, reasoning tokens, cached tokens, prompts, model calls or model selection;
- Source Record inspection, evidence navigation, citations or lineage traversal;
- correction versions, conflict review, Assumptions, Fact decisions or Claim disposition;
- deterministic recalculation, validation, tie-outs and normal targeted regeneration caused by a correction;
- QC, Package Readiness review, reader-copy inspection or professional-suitability review;
- Human Decisions, External-Use Decisions, reviewer actions or the number of users who read an exported artifact;
- successful native-artifact, reader-copy, control-record or archive-package exports;
- retries caused by product failure, or work required to recover from a product-created blocked state.

Internally these operations still have costs and must be measured. They are not user-visible prices.

## 2. Complete Individual-First offer

### Individual Deal Desk

| Element | Included contract |
|---|---|
| Price and term | $995 monthly, cancel for the next renewal; or $10,950 annually, paid upfront |
| Identity | One named Individual Banker; account sharing prohibited |
| Active Deals | Two concurrent Active Deal Workspaces |
| Archived Deals | No count limit while the subscription is paid, within 250 GB account archive storage; read/search/inspect/export/delete remain available |
| Active storage | Up to 25 GB per Active Deal |
| Sources | Up to 250 newly processed files and 2,500 newly processed logical pages per Active Deal per billing month; two included slots therefore carry an account total of 500 files and 5,000 pages before exception packs |
| Logical page | PDF page; presentation slide; spreadsheet worksheet/tab; image; or each 3,000 characters of DOCX/HTML/text, matching the external parser's economically relevant counting concept |
| Full-workflow operations | 20 per Active Deal per billing month: a complete Source Packet ingest/re-ingest, full Controlled Auction Execution Package build, or material cross-artifact Revision/refresh; two included slots carry 40 in aggregate |
| Targeted work | Included and not counted: scoped extraction correction, deterministic recalculation, cited evidence inspection, targeted artifact regeneration, QC, review, blocker recovery and exact-version Human Decisions |
| Deliverables | Both workbook spines; stage-triggered native PPTX/DOCX; exact reader PDFs; structured control records; in-product Package Readiness; archive package |
| Exports and downloads | Included without count pricing; abuse and bandwidth safety controls may rate-limit automation but do not sell export credits |
| Revisions | Normal targeted Revisions and refreshes included; material whole-package operations use the transparent full-workflow allowance |
| Evidence and controls | All Ticket 6–8 evidence, rights, sufficiency, AI/deterministic, QC, readiness, Human-Control and exact-version external-use controls included |
| Support | Asynchronous in-product/email product, billing and defect support; no Deal advice, source cleanup service, financial judgment, implementation, live training, SLA or founder-operated workflow |
| Cancellation/export | Access through the paid term; then 30-day read-only export window, followed by Ticket 6 active-system deletion within 30 days and backup expiry within 90 days |

No secondary functional tier launches with V1. A cheaper tier would either remove the premium outcome or create a lead-generation shell whose buyer cannot independently finish controlled Deal work. The only secondary purchase is more capacity: an additional Active Deal slot or a disclosed exceptional-processing pack.

### Capacity and exception purchases

- **Additional Active Deal:** $500/month or $5,500/year. It has the same complete product and allowances, is co-termed with the base plan, and is prorated at purchase.
- **Large Source Packet & Intensive Processing Pack:** $1,000 for one affected Active Deal in one billing month. It adds 5,000 newly processed logical pages and 20 full-workflow operations. The product shows exact packet size, current allowance, price and consequence before work; checkout requires explicit consent.
- **Archive Capacity Pack:** $50/month for an additional 250 GB, if the account exceeds the included 250 GB. It changes storage only, not Deal capability. The first response at the threshold is export/delete guidance, not automatic billing.

The exception pack is not a disguised AI-credit system: its user-visible object is an identified unusually large Deal processing window. It cannot be consumed by citations, corrections, QC, review, decisions, product retries or downloads.

### Checkout eligibility

- U.S. English self-serve card checkout; company or personal card accepted.
- Company email and firm approval are **not product purchase prerequisites**.
- The buyer must attest purchase authority and, independently, authority to upload/process each Deal source under Ticket 6. Purchase never creates data rights.
- No sales call, quote, offline implementation, Banker advisor or founder onboarding is required.
- Tax, invoice/receipt and card verification behavior must be visible before payment. Applicable tax is additional.
- All core Controlled Auction Execution Package capabilities are included immediately after successful checkout and required security/readiness gates.

## 3. High-ticket price hypothesis

### Recommended price

- **Checkout list price:** $995/month.
- **Annual price:** $10,950 upfront; $912.50 monthly equivalent; $990 or 8.3% below twelve monthly payments.
- **Additional Active Deal:** $500/month or $5,500/year.
- **Launch price:** none. Do not contaminate willingness-to-pay evidence with a permanent “early adopter” discount. If launch proof is incomplete, use the risk reversal defined below.

### Sensitivity, not simultaneous public tiers

| Case | Monthly hypothesis | Annual hypothesis | Annual equivalent | Extra Active Deal/month | Interpretation |
|---|---:|---:|---:|---:|---|
| Conservative | $695 | $7,645 | $637.08 | $350 | Tests whether checkout friction is primarily price; below the recommended floor and therefore not the launch list price |
| **Base / selected** | **$995** | **$10,950** | **$912.50** | **$500** | Premium individual Deal-work outcome with two concurrent Deals |
| Premium | $1,495 | $16,450 | $1,370.83 | $750 | Tests stronger proof, mature reliability and higher realized Deal cadence |

**Price floor: $795/month.** Below it, the product is positioned like an AI/add-in utility even though it owns persistent Deal state, controlled multi-artifact production and repeated Revision work. It also leaves too little room for early support, high-model and retry tails. This is a Product Design Decision, not a market fact.

**Likely pure-self-serve friction ceiling: about $1,500/month for the initial Individual ICP.** Above that point, a personally authorized card purchase is more likely to require reimbursement, procurement or institutional security review. This is an Assumption to validate, not a claim that value ends at $1,500.

### Rationale and evidence boundary

Verified first-party evidence in the companion notes shows individual AI power-user products at $100–$200/month; self-serve financial-professional products up to the low hundreds per month; and publicly priced live transaction rooms from hundreds to thousands of dollars per room-month. Ansarada and FirmRoom are especially useful structural anchors for an active transaction object, while DealRoom publicly uses Deal volume but does not publish a numeric price.

The inference is that $995 is a plausible **checkout test**, not that those products prove this product's willingness to pay. Low-priced Macabacus, think-cell, BamSEC, TIKR and Adobe products automate bounded primitives; they do not cap a persistent source-to-evidence-to-model-to-native-package-to-review system. Conversely, AlphaSense, FactSet, S&P Capital IQ and DealRoom are sales-led or do not disclose numeric prices; their existence establishes product/package patterns but cannot be converted into a numeric willingness-to-pay claim.

Pricing is value-based, not cost-plus. The direct-cost model verifies survivability and guardrails after the value hypothesis is set; it does not produce the $995 price.

## 4. Auditable value model

### Formula

```text
Value per Active Deal-month =
  non-overlapping hours saved per Active Deal-month
  × loaded hourly value of relevant Banker time

Monthly account value =
  Active Deal-equivalents in the month
  × value per Active Deal-month

Price-to-value = subscription price / modeled economic value
```

An Active Deal-equivalent is one Deal active for a full month; partial activity is fractional. “Risk-control value” below is deliberately expressed as equivalent review/reconciliation time, not guaranteed loss avoidance. The product does not promise a transaction close, valuation increase, error elimination, legal-liability avoidance or professional correctness.

### Non-overlapping hour assumptions per Active Deal-month

| Work displaced or avoided | Low | Base | High | Boundary |
|---|---:|---:|---:|---|
| Source/evidence intake, normalization and traceable extraction | 8 h | 18 h | 30 h | Excludes time separately counted below |
| Avoided rework from preserving sources, corrections and prior decisions | 3 h | 7 h | 15 h | Does not claim all rework disappears |
| Cross-artifact reconciliation across the two workbook spines and native/reader artifacts | 3 h | 7 h | 15 h | Only repeated reconciliation work |
| Document-format repair and native/reader-copy repair | 2 h | 4 h | 8 h | Excludes subjective polishing |
| Major Revision events | 1 × 2 h = 2 h | 2 × 3.5 h = 7 h | 4 × 5 h = 20 h | Incremental refresh/impact work per event |
| Conservative control-review equivalent | 1 h | 3 h | 7 h | Review labor only, never avoided-loss value |
| **Total** | **19 h** | **46 h** | **95 h** | Assumption requiring observed workflow timing |

The official U.S. BLS May 2024 page for the broad “Securities, Commodities, and Financial Services Sales Agents” occupation explicitly includes investment bankers and reports a $37.57 median hourly wage / $78,140 annual median; the relevant securities/investments industry median is $103,370. BLS also notes that corporate-finance and M&A bankers may receive substantial bonuses. Those are verified broad labor anchors, not a loaded hourly cost for this buyer. The model uses **$125 / $175 / $275 per hour** as explicit Assumptions to incorporate seniority, employer burden and the opportunity cost of time; these values require later validation.

### Sensitivity output

| Case | Active Deal-equivalents/month | Hours/Active Deal-month | Loaded hourly value | Value/Active Deal-month | Monthly account value | Annual account value | Monthly $995 price/value | Annual $10,950 price/value |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Low | 0.50 | 19 | $125 | $2,375 | $1,187.50 | $14,250 | 83.8% | 76.8% |
| Base | 1.25 | 46 | $175 | $8,050 | $10,062.50 | $120,750 | 9.9% | 9.1% |
| High | 2.00 | 95 | $275 | $26,125 | $52,250 | $627,000 | 1.9% | 1.7% |

The low case is intentionally uncomfortable: a Banker with only half a low-complexity Deal-month of activity obtains weak annual economics and should buy monthly only when active. The base case supports a premium purchase if the time hypothesis is real. None of the hour, cadence, loaded-value or conversion inputs has yet been verified through purchase or production telemetry.

## 5. Current professional-software pricing evidence

The [authoritative source notes](ticket-10-authoritative-source-notes.md) contain exact URLs, access date, currency, term, unit, included usage, limitation and buying mode. The table below records how the evidence affects the decision; it is not a comparable-company valuation.

| Category and examples | Current first-party price evidence | Meaningful use | Limitation |
|---|---|---|---|
| AI/business productivity: ChatGPT, Claude, Microsoft 365 Copilot | Individual power-user plans reach $100–$200/month; Copilot remains low tens per seat | Proves self-serve individual AI subscriptions and seat + usage patterns exist | General productivity, not a controlled Deal outcome |
| Financial research/data: Koyfin, BamSEC, TIKR | Public self-serve plans span roughly $18–$349/month depending on product/term | Shows individual financial professionals purchase evidence/research workflows | Licensed research and reporting primitives, not Deal execution |
| Modeling/deck productivity: Macabacus, think-cell, Power-user | Roughly $200–$360/year or about $28.60/month-equivalent for disclosed plans | Highly relevant native Office workflow expectations | Narrow add-ins; their low prices do not cap a complete package |
| M&A/VDR/transaction: Ansarada, FirmRoom, SecureDocs | Public transaction-room prices range from $250/month annual-equivalent to $3,069/month on selected monthly tiers; FirmRoom publicly lists $395/$695/$995 monthly | Strongest public structural anchor for active transaction capacity and premium self-serve checkout | VDR storage/security, not controlled package creation; still no proof of this product's conversion |
| Evidence-heavy SaaS: Docusign, Adobe Acrobat, Box | Low tens per user with explicit envelope, AI, file or bandwidth limits; Docusign official pages conflict, so checkout price must be reverified | Shows complete subscription plus visible operational limits and refund windows | Horizontal primitives, not the premium JTBD |
| Usage-based infrastructure: OpenAI, Google Document AI, Cloudflare R2, Stripe | Public per-token, per-page, GB/operation and percentage/transaction pricing | Supplies direct-cost formulas | Infrastructure costs do not define customer value |
| Sales-led premium: AlphaSense, FactSet, S&P Capital IQ Pro, DealRoom | **Not publicly disclosed / sales-led**; DealRoom identifies Deal volume but not price | Supports packaging and boundary patterns | No numeric WTP fact; no third-party estimate may fill the gap |

## 6. Direct-cost model

### Cost architecture and formulas

Costs are modeled at four levels rather than collapsed into a false “cost per user” constant:

```text
Cash direct cost/account-month =
  fixed account allocation
+ Active Deal cost
+ page/document cost
+ model run/token cost
+ artifact/Revision cost
+ payment cost
+ failure/retry cost
+ archive/export/deletion cost

Contribution cost/account-month =
  cash direct cost + support minutes / 60 × loaded support hourly cost
```

| Cost driver | Calculation-ready treatment | Classification |
|---|---|---|
| OpenAI model | `uncached input × input rate + cached read × cached rate + cache write × write rate + (visible output + reasoning) × output rate`, all per 1M tokens | Per model/token; reasoning is output-billed |
| OCR/layout/form parsing | Gross per-page rate by processor; do not pretend provider-account free pages exist per customer | Per logical source page/document |
| Spreadsheet calculation/validation | compute seconds + memory + sandbox allocation + deterministic validation jobs | Per Active Deal and Revision; Assumption |
| PPTX/DOCX/PDF generation/rendering | render jobs × compute rate + artifact storage/write | Per artifact/Revision; Assumption |
| Storage/archive/backups | GB-month × class rate + object operations + backup orchestration allocation | Per account/Deal/GB-month |
| Bandwidth/download/export | provider egress + read operations + export compute | Per export/GB; normal export remains user-unmetered |
| Observability/logging | safe log GB ingested/retained + query cost + redaction compute | Fixed allocation plus usage |
| Security/compliance | monthly tooling and security operations spend / paying accounts | Fixed account allocation; Assumption until procurement |
| Payment | Monthly domestic recurring card baseline: `price × 3.6% + $0.30`, combining public Stripe Payments and Billing PAYG prices | Per successful charge |
| Email/notification | provider plan allocation + overage recipients | Fixed allocation plus messages |
| Third-party public data | public retrieval/proxy cost only | Per request; **no product-owned licensed dataset in V1** |
| Support | support minutes/account × $100/hour assumed founder-replacement cost | Support/time cost |
| Failed/retried jobs | repeated billable parse/model/render work; restored to the customer's allowance | Per failed job; internal |
| Evaluation/QC | evaluation-model tokens + deterministic fixtures + human-review minutes | Per Revision/cohort; internal |
| Deletion/export operations | worker compute + object operations + exceptional support | Per request; Ticket 6 timing governs |
| Future licensed data | separate future contract-specific line | Optional future cost, excluded from V1 baseline |

OpenAI's official 2026-08-01 standard short-context prices used here are: GPT-5.6 Luna $0.20 input / $0.02 cached read / $0.25 cache write / $1.20 output; Terra $2.00 / $0.20 / $2.50 / $12.00; Sol $5.00 / $0.50 / $6.25 / $30.00 per 1M tokens. Reasoning tokens are included in output-token volume. A request over 272K input uses higher long-context rates; regional processing can add 10%. These are internal cost drivers, never the buyer's unit.

### Model-token sensitivity inputs per paying account-month

| Case | Route | Uncached input | Cached read | Cache write | Output + reasoning | Calculated | Budgeted |
|---|---|---:|---:|---:|---:|---:|---:|
| Low | Luna | 25M | 10M | 1M | 2M | $7.85 | $8 |
| Base | Terra | 20M | 10M | 2M | 2M | $71.00 | $72 |
| High | Sol | 25M | 20M | 4M | 3.3M | $259.00 | $260 |

This is a sensitivity, not a production routing decision. Long-context, regional, batch/interactive and failure behavior must be measured separately.

### Monthly usage inputs

| Input | Low | Base | High |
|---|---:|---:|---:|
| Active Deal-equivalents | 0.50 | 1.25 | 2.00 |
| Newly processed logical pages | 500 | 2,500 | 10,000 |
| Full-workflow operations | 5 | 18 | 60 |
| Material package Revisions | 2 | 8 | 30 |
| Support minutes | 15 | 45 | 180 |
| Implied support cost at $100/hour | $25 | $75 | $300 |

### Monthly direct-cost envelope at $995 monthly price

All unlabeled infrastructure rows are **Assumptions**. Verified provider prices define formulas, not these actual volumes or allocations.

| Cash cost line | Low | Base | High |
|---|---:|---:|---:|
| OpenAI model input/cached/output/reasoning | $8.00 | $72.00 | $260.00 |
| OCR/document parsing | $4.00 | $18.00 | $60.00 |
| Spreadsheet calculation/validation | $4.00 | $12.00 | $35.00 |
| PPTX/DOCX/PDF generation/rendering | $3.00 | $10.00 | $30.00 |
| Active storage | $0.50 | $2.00 | $8.00 |
| Bandwidth/download/export | $0.50 | $2.00 | $12.00 |
| Backups/restore allocation | $0.50 | $2.00 | $8.00 |
| Observability/logging | $3.00 | $8.00 | $20.00 |
| Security/compliance tooling allocation | $8.00 | $20.00 | $50.00 |
| Payment + subscription billing | $36.12 | $36.12 | $36.12 |
| Email/notification allocation | $0.50 | $1.50 | $5.00 |
| Third-party public-data retrieval | $0.00 | $5.00 | $20.00 |
| Failed/retried jobs | $2.00 | $12.00 | $65.00 |
| Evaluation/QC overhead | $4.00 | $12.00 | $35.00 |
| Archived Deal retention | $0.50 | $2.00 | $8.00 |
| Deletion/export operations | $1.00 | $3.00 | $10.00 |
| **Cash direct cost** | **$75.62** | **$217.62** | **$662.12** |
| Support/time cost | $25.00 | $75.00 | $300.00 |
| **Contribution cost** | **$100.62** | **$292.62** | **$962.12** |

The $36.12 payment row is reproducible as `$995 × 3.6% + $0.30`. An annual $10,950 charge costs $394.50 under the same domestic-card assumption, or $32.88 per recognized month. International cards, currency conversion, refunds and disputes cost more and remain cohort sensitivities.

Product-owned FactSet, LSEG, S&P Capital IQ, PitchBook, Moody's, Third Bridge, Daloopa, Quartr, Datasite or equivalent licensed data is **$0 in the V1 baseline because it is excluded**, not because it is free. Customer-provided licensed data never becomes a pooled plan entitlement and remains rights-gated under Ticket 6.

## 7. Gross margin and guardrails

### Targets

- **Cash gross margin:** acceptable launch range 70%–80%; recommended target at least 80%; steady-state objective at least 85%.
- **Contribution margin including support:** acceptable launch range 65%–75%; steady-state objective at least 75%.
- Support is shown separately so an apparently healthy software margin cannot conceal a founder-operated service business.

### Sensitivity

| Case | Revenue | Cash cost | Cash gross margin | Contribution cost | Contribution margin | Interpretation |
|---|---:|---:|---:|---:|---:|---|
| Low included usage | $995 | $75.62 | 92.4% | $100.62 | 89.9% | Healthy |
| Base monthly | $995 | $217.62 | 78.1% | $292.62 | 70.6% | Acceptable launch; model routing and support must improve to target |
| High, no guardrail | $995 | $662.12 | 33.5% | $962.12 | 3.3% | Economically broken and operationally service-like |
| High with two $1,000 exception packs | $2,995 | $662.12 | 77.9% | $962.12 | 67.9% | Back in launch range; still requires support/root-cause review |
| Base annual, monthly recognized | $912.50 | $214.38 | 76.5% | $289.38 | 68.3% | Acceptable launch; annual discount must not grow without lower base cost |

High usage breaks unit economics when a two-slot account processes roughly 10,000 new pages, runs 60 full-workflow operations, creates about 30 material Revisions or consumes three support hours in a month. The response is not to charge for corrections or suppress QC. The response is to preflight the identified Deal, sell its exceptional processing pack, restore failed capacity automatically, and internally review retry/support causes.

### Guardrail actions

| Signal | Product response |
|---|---|
| 70% of a Deal's page or full-workflow allowance | Visible forecast only; show the exact operations consuming the allowance |
| 90% | Show estimated remaining capacity and archive/sequence/add-pack choices |
| Operation would exceed the allowance | Pause **before** execution; require explicit pack purchase or wait for renewal |
| Product-side parse/model/render failure | Restore capacity automatically; no charge and no manual request |
| Correction, evidence inspection, QC, reviewer action or blocked-state recovery | Continue; never consume a sellable unit |
| Automation, scraping, account sharing or systematic non-interactive export abuse | Rate-limit and investigate under published acceptable-use terms; do not silently bill |
| Repeated high support or retry cost | Product defect/root-cause review; custom review only for abuse/security or genuinely unsupported processing, not ordinary Banker questions |

### Required internal metrics

- cash and contribution cost per activated Deal and per Active Deal-month;
- cost per newly processed logical source page/document;
- model input, cached read/write, output and reasoning cost by operation and model;
- cost per full Controlled Auction Execution Package build and material Revision;
- artifact-generation, render and deterministic-validation cost;
- support minutes and support cost per paying account;
- cash gross margin and contribution margin by price, term, activation-month and usage cohort;
- failed-job and retry rate/cost, with customer capacity restored;
- archive GB-month, backup cost, restore test cost and export/delete-operation cost;
- refund, dispute, international-card and payment-recovery cost.

## 8. Usage controls

1. **Active capacity:** two Active Deals. Archive is immediate and preserves read/search/export/delete. Reactivation consumes a slot; if both are occupied, the Banker archives another or buys a slot. Cycling Deal identities through a slot does not reset that slot's monthly page or full-workflow allowance.
2. **Source allowance:** each Active Deal receives 250 new files, 2,500 new logical pages and 25 GB active storage per billing month; the two-slot account total is 500 files and 5,000 pages. Existing sources can be inspected repeatedly without reprocessing charges. If necessary sources exceed capacity, readiness stays blocked until the Banker approves the visible exception pack or the allowance renews—the product never recommends omitting evidence to save money.
3. **Unusually large packets:** preflight estimates logical pages, file types, parse risk and full-workflow operations before processing. A pack adds 5,000 pages and 20 full-workflow operations to that Deal-month for $1,000.
4. **Model-intensive work:** the visible unit is a defined complete ingest/full-package/material cross-artifact refresh, not a model call. Internal routing, prompts, tokens, reasoning and evaluation remain hidden cost instrumentation.
5. **Artifacts and Revisions:** targeted generation and normal correction-driven refresh are included. Only a declared complete rebuild/material global refresh consumes a full-workflow operation.
6. **Exports:** normal native, reader and archive exports are included. Automated bulk abuse can be rate-limited; a user is never charged to obtain their own normal Deal package.
7. **Retries:** product failure returns the consumed operation immediately. A user-requested new scope is new work; recovery of the prior scope is not.
8. **Overage:** no surprise invoice and no retroactive overage. Price and exact effect appear before work; explicit consent is required.
9. **Archive:** Deal count is not priced. 250 GB is included; extra archive capacity is a transparent storage pack, with export/delete offered first.
10. **Rights and security:** no allowance permits unauthorized data, pooled licensed content or bypass of confidentiality controls.

## 9. Preview, trial, refund and first-value risk reversal

### Selected mechanism

Use **public outcome proof + synthetic sample + paid first month/annual term + conditional 14-day First-Deal Control-Loop Guarantee**.

- Public proof follows Ticket 9's outcome-first C surface: an interactive synthetic Deal Workspace plus downloadable native/reader/control/archive sample.
- The synthetic proof exposes the `$18.4m` versus `$17.8m` EBITDA conflict and the `$6.2m` to `$4.7m` Cash correction with the resulting $1.5m tie-out recovery, exact source lineage and affected artifacts.
- No card is needed to inspect synthetic proof.
- There is **no free product trial** and **no real Confidential Deal Material upload before payment**. This avoids a deletion/security shadow product and keeps evaluation independent of founder support.
- Payment unlocks the guided first correct-use path inside the real persistent workspace.

### First-Deal Control-Loop Guarantee

The first subscription payment is refundable when all of the following are true:

1. the request is submitted within 14 calendar days of the first successful payment;
2. the first real Deal's files are authorized and pass the published file/security/rights preflight;
3. the minimum Source Packet required by the selected first-value route is present;
4. the product nevertheless fails, for a product-side reason, to complete the defined first-value control loop: exact-source evidence, one material Fact/Assumption/Claim review, deterministic validation, and at least one editable native artifact with its exact reader preview; if a real correction or conflict exists, its decision and deterministic recovery are also required, but the product must never invent one merely to satisfy the milestone;
5. the account has not already reached and recorded that milestone; and
6. the account/payment instrument has not previously used the guarantee.

Refund is not available merely because the user lacks source rights, purchase/data authority, minimum sources, supported file quality, or an in-scope Sell-Side Auction objective; nor for abuse, account sharing or a completed first-value milestone. Preflight must identify unsupported inputs before expensive work. If preflight incorrectly accepts an input and the product cannot process it, that is a product-side failure and qualifies.

The refund is self-serve, does not require a sales call or founder judgment, and refunds the first plan charge rather than promising a future service. Product-side failed jobs restore allowance automatically even when no refund is requested. After refund, the user receives a bounded export opportunity and deletion follows Ticket 6; no derived Deal data is retained as training or a shared data pool.

## 10. Billing, cancellation and refund boundary

| Boundary | Decision |
|---|---|
| Checkout | Card-based self-serve in USD; monthly or annual; no manual quote |
| Renewal | Automatic monthly/annual renewal with price, term and next charge shown before purchase and in account settings |
| Annual discount | $990 / 8.3%; no additional hidden annual feature |
| Invoice/receipt | Automatic receipt and downloadable invoice record; legal invoice sufficiency requires implementation review |
| Taxes | Calculated as applicable and shown before charge; nexus, tax classification and filing require legal/finance review |
| Cancellation | Effective at end of paid period; processing continues until then; canceling does not delete data immediately |
| Post-term access | 30-day read-only export/delete window; no new processing or Revision work |
| Refund | Conditional 14-day First-Deal Control-Loop Guarantee on the first payment; otherwise no prorated unused-term refund except where law requires |
| Failed jobs | Allowance restored automatically; service credit only when a paid exception pack cannot complete supported scope |
| Duplicate billing | Full duplicate charge refund after deterministic charge match; no consumption exclusion |
| Chargeback/abuse | Preserve logs and dispute evidence within confidentiality limits; suspend clearly abusive automation/account sharing; do not hold legitimate user exports hostage |
| Closure/deletion | User-triggered export and closure; active-system deletion within 30 days and backup expiry within 90 days, as Ticket 6 requires |

Terms of service, refund disclosures, privacy language, sales-tax nexus, invoice requirements, card-network rules, sanctions/export controls and revenue recognition require future legal/finance review. This decision does not invent their final wording or accounting treatment.

## 11. Future Team expansion without Individual degradation

### Indicative Team Deal Desk hypothesis

- **$2,995/month or $32,950/year**, paid by card for the self-serve Team offer.
- Includes five named seats and six pooled Active Deal Workspaces.
- Additional seat: $250/month or $2,750/year.
- Additional pooled Active Deal: $400/month or $4,400/year.
- Same per-Deal source/full-workflow allowance and explicit exception pack logic.
- This is a future **Product Design Hypothesis**, not validated packaging or price.

### Organizational value that Team adds

- shared Deal Workspaces and explicit multi-actor collaboration;
- centralized billing and usage pooling;
- firm templates and controlled shared source/relationship context;
- role/permission boundaries and approval routing;
- organization-level audit, policy controls and administration;
- safe migration and revocation of access when staff change;
- later SSO, security review artifacts, support/SLA and enterprise policy options.

### Core value that remains in Individual

The persistent Deal Workspace, both workbook spines, native artifacts, reader copies, evidence/control records, source rights, AI/deterministic/human-control contract, correction and Revision lifecycle, QC, Package Readiness, archive/export and exact-version External-Use Decision remain complete in Individual. Team never becomes the key to obtaining the Controlled Auction Execution Package.

Migration moves the Individual's exact Deal identities, Source Records, Evidence, Revisions, Decisions, hashes, exports and archive history into the organization without flattening actor identity or rewriting history. The Individual can export before migration and sees the new owner/access contract before consent.

## 12. Expansion and retention model

| Event | Commercial/product meaning |
|---|---|
| First purchase trigger | A live or imminent Sell-Side Auction requires a controlled, refreshable multi-artifact execution package; public proof makes the exact outcome inspectable |
| Activation event | Paid account creates an authorized Deal, passes preflight and starts the guided first correct-use route |
| First unmistakable value | Ticket 9's evidence-to-decision-to-deterministic-validation loop reaches one native artifact and exact reader preview; a real correction/conflict must recover, but absence of a conflict is never replaced with fabricated evidence |
| Repeat event | New Source Record, buyer/process event, updated actuals or other material Deal event creates an Impact Assessment |
| Active continuation | Same Deal remains Active while repeated Sources, analysis, artifacts, QC and decisions advance |
| New Deal activation | User activates another Deal within included capacity or buys an additional Active slot |
| Major Revision | New immutable Revision recalculates/regenerates only affected scope; it is a return event, not a one-off file purchase |
| Archive/reactivation | Completed/dormant Deal becomes read-only; reactivation consumes a slot and preserves full lineage |
| Additional-Deal purchase | Concurrent Deal pressure is the clean expansion event |
| Annual renewal | Evidence is continued active/return value, successful exports and retained Deal history—not unused AI capacity |
| Team expansion | Multiple actors, shared approvals/templates/billing/policy and pooled active capacity create organizational value |
| Churn/downgrade | Monthly user cancels before next renewal; annual user cancels future renewal; post-term export/deletion applies. V1 has no crippled downgrade tier |

This loop intentionally prices a persistent execution system. It does not convert the product into a one-time CIM, workbook or document generator.

## 13. Assumption and sensitivity register

| Assumption / unresolved validation question | Evidence | Base | Low / high | Unit | Revenue effect | Cost/margin effect | Validation method | Owner / later Ticket | Confidence |
|---|---|---:|---:|---|---|---|---|---|---|
| Willingness to pay | Adjacent public checkout bands only | $995 | $695 / $1,495 | monthly plan price | Direct | Higher price improves margin if conversion holds | Actual paid checkout cohorts | Ticket 11 inputs; post-launch | Low |
| Conversion at recommended price | None yet | Unverified | By price/proof cohort | paid / eligible checkout | Direct | CAC/payback later; not a direct unit-cost input | Completed payments, not intent | Ticket 11 | Low |
| Annual-plan take rate | No product data | 35% | 15% / 60% | share of new accounts | Affects cash timing and recognized ARPU | Annual discount lowers monthly margin; fewer payment failures | Term cohort purchases | Ticket 11 / operations | Low |
| Active Deal frequency | Prior product contract supports repeated events, not cadence | 1.25 | 0.50 / 2.00 | Deal-equivalents/account-month | Drives slot/add-on expansion | Drives processing and support | Production active-state telemetry | Ticket 12 instrumentation | Low |
| New source-page volume | No observed product data | 2,500 | 500 / 10,000 | logical pages/account-month | High tail can sell explicit pack | OCR/model/render cost | Preflight and completed ingestion telemetry | Ticket 12 | Low |
| Model usage | Current official rates; no production volume | $72 | $8 / $260 | model cost/account-month | No user-visible meter | Major margin driver in high tail | Tokens/cost by operation/model/retry | Ticket 12 | Low |
| Support load | Founder envelope requires low touch | 45 | 15 / 180 | minutes/account-month | Excess support cannot become a paid service | $25 / $75 / $300 at $100/hour | Support tickets and time tracking | Operations | Low |
| Loaded support cost | No vendor/staff decision | $100 | $75 / $150 | USD/hour | None | Linear contribution-margin effect | Actual contractor/founder replacement cost | Operations | Low |
| Refund rate | Adjacent products show 14–30-day mechanisms, not this product's rate | 5% | 2% / 12% | first-payment cohort | Reduces net revenue | Processing fee is not returned; deletion/support cost | Guarantee and reason-code cohorts | Ticket 11 / finance | Low |
| Payment cost | Stripe public domestic-card + Billing PAYG | 3.6% + $0.30 | 3.6% / 6.1% + dispute tail | successful charge | Reduces net revenue | Direct cost | Processor reports by card/FX/dispute | Finance | Medium |
| Hours saved | Workflow decomposition only | 46 | 19 / 95 | hours/Active Deal-month | Supports value perception/renewal | No direct cost | In-product before/after timing and artifact event logs | Post-launch research | Low |
| Loaded Banker hourly value | BLS wage is an anchor, not loaded cost | $175 | $125 / $275 | USD/hour | Changes modeled price/value | None | Buyer-reported ranges plus role/market data | Post-launch research | Low |
| Major Revision frequency | Ticket 5/9 prove the loop, not frequency | 2 | 1 / 4 | events/Active Deal-month | Supports retention and expansion | Model/render/QC cost | Revision event telemetry | Ticket 12 | Low |
| Full-workflow operations | No production data | 18 | 5 / 60 | account-month | High tail may buy pack | Model/parse/render driver | Operation ledger | Ticket 12 | Low |
| Failed/retry cost | Supplier billing rules known; product reliability unknown | $12 | $2 / $65 | account-month | None; customer allowance restored | Direct margin loss | Failure class and retry-cost ledger | Ticket 12 | Low |
| Security/compliance allocation | Narrow public price facts only | $20 | $8 / $50 | account-month | Enables eligible confidential use, not a separately sold feature | Fixed allocation concentration at low scale | Actual tooling/procurement spend / paying accounts | Ticket 12 / operations | Low |
| Team expansion rate | No behavior yet | Unverified | By eligible multi-user accounts | conversion/eligible account | New ARR | Pooling changes cost distribution | Multi-actor demand and paid upgrades | Future Team ticket | Low |

The revenue model is:

```text
MRR =
  monthly Individual accounts × $995
+ annual Individual accounts × $10,950 / 12
+ monthly extra Active Deals × $500
+ annual extra Active Deals × $5,500 / 12
+ exception packs × $1,000
+ archive packs × $50
```

The margin model is:

```text
Cash gross margin = (recognized revenue - cash direct cost) / recognized revenue
Contribution margin = (recognized revenue - cash direct cost - support/time cost) / recognized revenue
```

## 14. Decision and repricing rules

### Cohorts and minimum evidence

Observe cohorts by displayed price, monthly/annual term, proof version, Source Packet size, Active Deal count, first-value completion, second material Revision, support burden, refund reason and contribution margin. Do not mix discounted, refunded or founder-assisted accounts into the clean base-price cohort.

Before changing list price, seek at least **50 clean paid Individual purchases, 25 first-value completions and three mature monthly usage cohorts**. This is a practical learning floor, not statistical proof and not a no-go threshold. Urgent cost/abuse guardrails can change earlier when direct evidence requires it.

### Rules

- **Raise price** when clean cohorts continue to purchase at the shown price, reach first value, renew or choose annual, buy extra capacity, refund rarely for value reasons, and base contribution margin is sustainably above target.
- **Adjust included Deals** when concurrent Active Deal distribution—not model noise—shows two slots systematically over- or under-package the ICP. Prefer changing slot count or extra-slot price over charging for revisions.
- **Adjust page/full-workflow limits** when actual cost concentration predicts margin failure. Keep corrections, evidence, QC, review and recovery outside those limits.
- **Change the billing unit** only if production evidence shows Active Deal status is not legible, creates gaming/stale-state behavior, or materially diverges from repeated economic value. A candidate replacement must still preserve the continuing Deal lifecycle.
- **Do not lower price** when prospects fail to understand the outcome, cannot see trustworthy proof, fail preflight/onboarding, or do not reach Ticket 9 first value. Fix proof, compatibility disclosure, guided first correct use, reliability or packaging first.
- **Do not infer WTP** from competitor funding, marketing claims, the official plugin, or undisclosed enterprise pricing.
- **Protect existing users:** honor the paid term; give at least 60 days' notice; preserve the original price for the current annual term and for 12 months for active monthly founding cohorts unless a user chooses a materially different package; provide explicit migration and export choices.

## Constraints passed forward

### Inputs for Ticket 11 only

Ticket 11 receives—not resolves here—the exact price/proof/checkout inputs: `$995 monthly / $10,950 annual`, two Active Deals, the $500 extra slot, the public synthetic Package proof, the no-confidential-upload-before-payment rule, the conditional 14-day First-Deal Control-Loop Guarantee, and the first-value definition. Ticket 10 does not design SEO, content, ads or the complete conversion funnel.

### Inputs for Ticket 12 and `/to-spec`

Ticket 12 must carry forward the plan entitlements, Active/Archived state semantics, operation definitions, preflight/consent, entitlement restoration for failures, billing/refund/deletion events, cost ledger, cohort metrics and repricing instrumentation. It must not choose production vendors merely because this cost model used their public prices.

## Final answer

Charge **$995/month or $10,950/year** for one complete Individual Deal Desk with two concurrent Active Deal Workspaces. Price repeated controlled Deal execution, not model activity. Include all core Controlled Auction Execution Package capability, unlimited safe inspection/correction/QC/export behavior, and predictable operational capacity. Sell additional concurrency at **$500/month per Active Deal** and exceptional disclosed processing at **$1,000 per affected Deal-month**. Prove the outcome publicly with synthetic evidence, require payment before confidential uploads, and reverse product-side first-value risk through the conditional 14-day guarantee.

The base model yields 78.1% cash gross margin and 70.6% contribution margin at launch; the steady-state job is to improve model routing, reliability and support until cash gross margin exceeds 85% and contribution margin exceeds 75%. The high-usage tail cannot remain unguarded. Future Team packaging monetizes organizational collaboration, permissions, billing and control without removing any core business capability from Individual.
