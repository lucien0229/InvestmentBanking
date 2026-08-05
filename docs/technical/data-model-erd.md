# Data Model / ERD

Status: Technical Design baseline for the first sellable release

Last updated: 2026-08-05

Primary store: United States-region Supabase Pro PostgreSQL

## 1. Purpose

This document defines the authoritative logical and physical-relational model for the Individual Banker Sell-Side Auction product. It translates the approved product, UX, architecture, AI-contract, security, commercial, and lifecycle decisions into implementation-ready PostgreSQL objects.

It specifies:

- authoritative schemas and ownership boundaries;
- stable identities, immutable versions, current pointers, and correction rules;
- core tables and required fields;
- tenant-bearing relationships and cardinalities;
- exact financial, source, Evidence, Decision, process, Deliverable, AI, audit, retention, and deletion semantics;
- derived projections and what they may never own;
- lifecycle transitions and deletion behavior;
- database constraints, RLS invariants, indexes, and migration verification.

This is not literal migration SQL. Forward-only SQL migrations are authoritative when implemented, but they must preserve every invariant in this document. A migration may add physical helper columns, indexes, partitions, or normalized sub-tables without a new product decision when it does not change identity, authority, lifecycle, cardinality, retention, or permission semantics.

## 2. Authority and related documents

Authority is concern-specific:

- the approved product specification and resolved issues own product scope and behavior;
- accepted ADRs own hard architecture decisions within their stated concern;
- root [CONTEXT.md](../../CONTEXT.md) owns canonical domain language and distinctions;
- approved UX specifications own user-visible task behavior;
- [Technical Design](technical-design.md) and [System Architecture](system-architecture.md) own cross-cutting implementation and runtime boundaries;
- this Data Model / ERD owns relational identity, lifecycle, tenancy, cardinality, transaction, and persistence invariants;
- the [AI Prompt & Contract Spec](ai-prompt-contract-spec.md) owns AI contracts, the [API Spec](api-spec.md) owns the HTTP wire contract, the [Integration Spec](integration-spec.md) owns provider-native and internal runtime protocols, and the [Permission Model](permission-model.md) owns the principal/action/resource/posture matrix and enforcement proof; and
- prototype code and fixtures are non-authoritative examples only.

Forward-only migrations and verified runtime evidence verify this model and may reveal a defect; they do not silently redefine an approved product, domain, or architecture contract.

This document must be read with:

- [Technical Design](technical-design.md);
- [System Architecture](system-architecture.md);
- [AI Prompt & Contract Spec](ai-prompt-contract-spec.md);
- [API Spec](api-spec.md);
- [Integration Spec](integration-spec.md);
- [Permission Model](permission-model.md);
- [ADR 0003: current state with append-only material history](../adr/0003-store-current-state-with-append-only-material-history.md);
- [ADR 0022: typed relational domain objects](../adr/0022-model-core-domain-objects-as-typed-relations.md);
- [ADR 0030: independent material-classification dimensions](../adr/0030-separate-material-provenance-confidentiality-and-de-identification.md);
- [ADR 0031: selective business-effective time](../adr/0031-use-selective-business-effective-time.md);
- [ADR 0032: schema-governed narrative Deliverable content](../adr/0032-persist-narrative-deliverable-content-as-schema-governed-payloads.md);
- [ADR 0033: purpose-scoped Account template quarantine uploads](../adr/0033-allow-purpose-scoped-account-template-quarantine-uploads.md);
- [ADR 0034: one typed Account/Deal protected-object Gateway](../adr/0034-stream-typed-account-and-deal-protected-objects-through-one-gateway.md);
- [ADR 0035: provider billing evidence into product entitlement](../adr/0035-reconcile-provider-billing-evidence-into-product-entitlement.md);
- [ADR 0036: content-blind immutable operator replay](../adr/0036-limit-operator-recovery-to-content-blind-immutable-replay.md);
- [ADR 0037: reversible Recipient Access suspension](../adr/0037-suspend-reversible-recipient-access-restrictions.md);
- [ADR 0038: minimal deletion-status claimant](../adr/0038-retain-a-minimal-deletion-status-claimant.md);
- [ADR 0039: Workspace posture Job-commit fence](../adr/0039-fence-job-commits-at-workspace-posture-boundaries.md); and
- [ADR 0040: forced-RLS runtime authorization](../adr/0040-enforce-runtime-authorization-with-forced-rls.md).

The browser-memory synthetic prototype is not a schema source. Its global revision, bounded event history, mutable source replacement, or simplified export behavior must not be reproduced in production.

## 3. Model principles

### 3.1 Authority

1. PostgreSQL owns transactional business identity, permissions, current selections, immutable material history, commercial state, Jobs, audit metadata, and retention state.
2. Supabase Storage owns quarantine bytes and immutable encrypted Protected Account Object and Protected Deal Object bytes; it does not own business status or authorization.
3. Typed relational rows own core domain semantics. JSONB is permitted only where an exact versioned contract legitimately varies by format, provider, manifest, locator, capability profile, or narrative Deliverable type.
4. Search, vector, Deal Book, Package Readiness, current classification, and dependency graph rows are rebuildable projections. They cannot authorize, approve, establish truth, or become the only record of Lineage.
5. No filename, object-store key, digest, provider identifier, email address, external identity, or display number is a domain primary key.

### 3.2 Identity and tenancy

- Application-generated domain identifiers are UUIDv7 stored as PostgreSQL `uuid`.
- `identity.account.id` is the V1 tenant key.
- Every Account-scoped row carries `account_id`.
- Every Deal-scoped row carries both `account_id` and `deal_id`.
- Each Account-scoped table exposes `UNIQUE (account_id, id)`.
- Each Deal-scoped table exposes `UNIQUE (account_id, deal_id, id)`.
- Every foreign key to a tenant-bearing row repeats the tenant columns. A Deal-scoped relation never joins another Deal through a bare UUID.
- Uniqueness that contains an optional scope component uses `UNIQUE NULLS NOT DISTINCT` where supported or an explicit non-null normalized scope key; ordinary SQL `NULL` uniqueness must not permit duplicate current selections.
- No production query, index, cache key, vector search, or object key may omit its Account and, when applicable, Deal scope.

Representative Deal-scoped foreign key:

~~~sql
FOREIGN KEY (account_id, deal_id, source_record_id)
  REFERENCES source.source_record (account_id, deal_id, id)
~~~

RLS is defense in depth, not a replacement for composite foreign keys.

### 3.3 Versioning and correction

Use one of three explicit patterns:

| Pattern | Use | Required shape |
|---|---|---|
| Stable root plus immutable versions | A continuing business object such as Model, Bid, Deliverable, Source Packet, or NDA | Root row, immutable version row, root-local ordinal, optional current-version pointer constrained to the same root |
| Immutable one-off record | A Fact, Human Decision, Process Event, Calculation Run, Review, Job Attempt, or External-Use Event | Append-only row; correction, reversal, supersession, invalidation, or disposition is another row |
| Mutable current control row plus append-only transitions | Deal stage, activity posture, Job current state, entitlement balance projection, or another operational aggregate | `row_version`, current value, and complete immutable transition/ledger history |

Rules:

- No accepted material version is updated in place.
- Current pointers target an immutable version owned by the same tenant and root.
- Root-local ordinals have a unique constraint such as `UNIQUE (account_id, deal_id, root_id, version_ordinal)`.
- History is never reconstructed solely by sorting `created_at`; explicit version, predecessor, supersedes, corrects, or reverses relationships are stored.
- A changed current pointer does not carry Review, QC, readiness, Decision, or external-use status to the new version.
- Mutable aggregates use `row_version bigint NOT NULL` and API `If-Match`; append-only objects do not use last-write-wins.

### 3.4 Time

- System timestamps use UTC `timestamptz`.
- Business calendar dates use `date`.
- `created_at` or `recorded_at` means when the product committed the record; it is never silently reused as business-effective time.
- Source observations, Process Events, stage transitions, Human Decisions, Bid Versions, rights, retention, and access grants store their applicable `occurred_at`, `effective_at`, `submitted_at`, `received_at`, `valid_from`, `valid_until`, or deadline in addition to `recorded_at`.
- The model does not impose universal bitemporal valid/system ranges.
- Time-dependent Calculations and artifact generation bind an immutable `evaluation_time` input.

### 3.5 Closed values and catalogs

- Security-, authority-, state-, type-, and outcome-critical closed sets use `text NOT NULL` with named `CHECK` constraints generated from a canonical contract source.
- PostgreSQL native enums are not used for product-domain values because rollback and staged evolution are too restrictive.
- Evolvable banker classifications use versioned catalog tables with stable codes, display labels, effective dates, retirement state, and policy version.
- Unknown, not provided, withheld, not applicable, not assessed, failed, and unsupported are distinct values where the domain distinguishes them. SQL `NULL` means only that the field is contractually inapplicable or not yet recorded.

### 3.6 Quantitative values

A bare number is never sufficient for a material financial input or result. A typed table that owns a Quantitative Measure carries the applicable subset of:

| Column | Type | Meaning |
|---|---|---|
| `value_decimal` | `numeric(p,s)` | Exact value; never floating point |
| `value_status` | checked text | `known`, `unknown`, `not_applicable`, `withheld`, or `not_provided` |
| `currency_code` | `char(3)` | ISO 4217 code where monetary |
| `unit_code` | checked text or catalog FK | Currency, percentage, multiple, count, days, shares, or domain unit |
| `scale_code` | checked text | Units, thousands, millions, billions, basis points, or another declared scale |
| `precision_scale` | `smallint` | Preserved or contract-authorized precision |
| `sign_convention_code` | checked text | Economic or presentation sign convention |
| `period_start`, `period_end` | `date` | Applicable interval |
| `as_of_date` | `date` | Point-in-time value |
| `actual_forecast_code` | checked text | Actual, forecast, pro forma, scenario, or not applicable |
| `rounding_rule_code` | checked text/catalog FK | Reproducible rounding rule |
| `definition_text` | bounded text | Exact business definition and qualifications |

At least one of period or as-of semantics must satisfy the owning contract. APIs serialize exact decimal values as strings.

### 3.7 Text, bytes, and JSONB

- Original Deal bytes, retained derived representations, Native Artifacts, Reader Copies, Deal exports, deliveries, and archives are immutable Protected Deal Objects; separately supplied Account Template versions, retained invoice copies, and Account Data Export objects are immutable Protected Account Objects.
- Searchable relational Deal data, including bounded Claim, Analysis, and content text, relies on Supabase encryption, RLS, and minimization; it is not falsely described as application-encrypted.
- Raw AI request and response payloads are encrypted Protected Deal Objects and are not exposed through Banker, Recipient, support, or telemetry surfaces.
- JSONB columns always carry a schema or contract identity and digest when their meaning can evolve.
- No permission, lifecycle, identity, financial amount semantics, version relation, or authoritative Lineage may exist only inside JSONB.

### 3.8 Origin, actor, and immutability fields

Material rows include the applicable fields:

- `origin_code`: `human_authored`, `ai_generated`, `deterministic`, or `imported`;
- `created_by_actor_id` for authenticated human creation;
- `created_by_runtime_principal_id` for product execution;
- `origin_ai_run_id`, `origin_job_id`, or `origin_source_record_id` through typed relationships where applicable;
- `recorded_at` and applicable business-effective time;
- `supersedes_id`, `corrects_id`, or typed reversal link where the object permits it.

Origin never changes when a human later confirms an AI-generated or imported object.

## 4. PostgreSQL schema map

All schemas are private to the Product API and purpose-specific Runtime Principals. No core table is directly exposed through the public PostgREST surface.

| Schema | Authority |
|---|---|
| `identity` | Actor, Account ownership, external identity mapping, Runtime Principals, sensitive-action grants |
| `commerce` | Capacity Offers, Operation Previews, Product Entitlements, subscription projection, usage reservations and ledger, receipts, guarantees, and Account portability objects |
| `deal` | Deal identity, one Workspace, stage/posture, preflight, objectives, Output Ceilings, package snapshots |
| `source` | Intake, quarantine, Source Material/Record, representations, coverage, classification, rights, packets |
| `object_store` | Immutable protected-byte identities, encryption envelopes, typed attachment support |
| `knowledge` | Native Locators, Evidence, Claims, Facts, Assumptions, Human Decisions, diligence and open work |
| `analysis` | Calculations, Models, Scenarios, Analyses, Recommendations, typed Lineage, Impact Assessments |
| `process` | Deal Parties, Buyers, outreach, NDA/access evidence, Bids, Milestones, Process Events |
| `deliverable` | Deliverables, semantic content, Revisions, artifacts, templates, Reviews, QC, readiness |
| `external_use` | External-Use Decisions/scopes, exports, deliveries, Recipients, access, actual-use events |
| `jobs` | Idempotent commands, Jobs, steps, attempts, leases, scopes, events, Outbox |
| `integration` | Durable provider Webhook Inbox identity, verification, replay, and processing attempts |
| `notification` | Notification Preferences, durable privacy-safe Notifications, delivery attempts, append-only delivery events, and provider suppression posture |
| `ai` | Task/Prompt contracts, provider profiles, input/context, Runs, Proposals, Abstentions, evaluation |
| `measurement` | Versioned Product Measurement Definitions, append-only Product Measurement Events, and rebuildable metric/cohort projections |
| `controls` | Audit, retention, deletion, preservation, capability and compatibility control records |
| `projection` | Rebuildable Deal Book, current-state, dependency, search, vector, and notification projections |

## 5. Identity and commerce

### 5.1 Core identity tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `identity.actor` | `id`, `actor_kind`, `display_name`, `status_code`, `security_epoch`, `created_at`, `disabled_at` | Durable product identity; V1 `actor_kind=individual_banker`; temporary recovery does not replace Actor; disabling does not delete history |
| `identity.external_identity` | `id`, `actor_id`, `provider_code`, `issuer`, `subject`, verified-email fields, `linked_at`, `unlinked_at` | `UNIQUE(provider_code, issuer, subject)`; provider subject is not the Actor or Account ID |
| `identity.account` | `id`, `status_code`, `security_epoch`, `created_at`, `row_version` | Tenant root; security epoch invalidates prior sessions/grants/scopes; no Deal content in display/log fields |
| `identity.account_actor` | `id`, `account_id`, `actor_id`, `relationship_code`, `effective_at`, `ended_at` | V1 exactly one active owner/Individual Banker; future Team membership does not require shared credentials |
| `identity.runtime_principal` | `id`, `principal_code`, `purpose_code`, `credential_version`, `status_code`, `created_at`, `retired_at` | Non-human; no Account membership; purpose-scoped credentials |
| `identity.account_security_restriction` | `id`, `account_id`, restriction code, source evidence through typed extension, current posture, opened/cleared times, opened/cleared security epochs, row version | One active restriction per Account; entry advances epoch, invalidates ordinary authority, suspends active Recipient Access, and appends history; provider evidence alone cannot clear it |
| `identity.security_recovery_session` | `id`, restriction ID, account/actor/external identity, session hash, purpose code, issued/expires/revoked/cleared times, bound security epoch, current posture | Recovery-only session with absolute lifetime no more than 15 minutes; no normal Account/Deal authority; clearance invalidates it |
| `identity.sensitive_action_grant` | `id`, `account_id`, `actor_id`, session kind/hash, bound security epoch, action code, canonical command digest, exact current ETag or immutable dependency digest, bound command Idempotency-Key hash, typed resource FK, nonce hash, `issued_at`, `expires_at`, `consumed_at`, `revoked_at` | Five-minute, single-use; one typed extension row identifies the exact resource; consumption occurs atomically with the matching mutation; security/posture change denies stale Grant |
| `identity.protected_object_stream_grant` | `id`, `account_id`, optional `deal_id`, principal kind/identity, bound human-session hash, exact Protected Object, typed immutable attachment, applicable Revision, purpose/operation/range posture, security/workspace/access versions, token hash, issued/expires/revoked times | Short-lived exact stream capability; no reusable URL, object discovery, general Account/Deal read, or domain-write authority; active posture change invalidates every still-live Grant |

Sensitive Action Grant target extensions are explicit, for example `sensitive_grant_deal`, `sensitive_grant_revision`, `sensitive_grant_external_use`, `sensitive_grant_recipient_access`, `sensitive_grant_security_restriction`, and `sensitive_grant_deletion`. A generic authoritative `resource_type/resource_id` pair is prohibited.

### 5.2 Commercial tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `commerce.capacity_offer` | `id`, offer code/version, capacity class/increment, eligibility, term/effective-time rule, exact amount/currency/tax posture, contract version, valid interval | Immutable sellable offer; completion through Checkout and provider reconciliation is required before entitlement changes |
| `commerce.operation_preview` | `id`, `account_id`, optional `deal_id`, actor, operation code, exact dependency digest, allowance class/quantity, capacity before/after, price/block posture, consent digest, created/expires times | Immutable short-lived control record; creates no reservation; accepting command must match authority, dependencies, consent, and unexpired posture |
| `commerce.checkout_order` | `id`, `account_id`, price/term/add-on identities, exact amount/currency/tax posture, renewal/cancellation/refund/Guarantee contract versions, current checkout step, provider checkout ID, status, `row_version`, `created_at`, `completed_at` | Durable Order → Terms → Payment → Confirmation state; one provider completion creates at most one commercial receipt and entitlement mutation |
| `commerce.checkout_terms_acceptance` | `id`, `account_id`, Checkout Order ID, displayed contract digest, item acknowledgements, actor, accepted_at | Immutable exact consent; required before a payment Session; changed commercial terms require a new acceptance |
| `commerce.provider_event` | `id`, provider event ID/type, payload digest, received/verified/processed times, outcome, protected-detail reference | Provider event ID unique; signed input is evidence, not product authority |
| `commerce.subscription_projection` | `account_id`, provider customer/subscription IDs, current provider posture, period boundaries, cancel posture, `row_version`, `updated_at` | Reconciled projection; cannot itself authorize Deal Material use |
| `commerce.billing_recovery` | `id`, `account_id`, Subscription Projection, exact renewal invoice/payment identity, `paid_through`, opened/resolved times, current state, `row_version` | One unresolved recovery per exact renewal obligation; cannot extend `paid_through` or create capacity |
| `commerce.billing_recovery_event` | `id`, Billing Recovery, optional Provider Event/current-object reconciliation identity, from/to state, effective/recorded times, reason code | Append-only state evidence; duplicate or reordered provider evidence cannot duplicate a transition |
| `commerce.payment_dispute` | `id`, `account_id`, provider dispute/payment identity, amount/currency, opened/resolved times, current posture, affected entitlement and `paid_through`, `row_version` | Provider dispute identity unique; open dispute creates an Access suspension cause, won/reversed clears only that cause and restores applicable remaining entitlement without automatic Access resumption, and lost dispute revokes Access before Post-Term |
| `commerce.payment_dispute_event` | `id`, Payment Dispute, optional Provider Event/current-object reconciliation identity, from/to posture, effective/recorded times, reason code | Append-only reconciliation history; provider status is evidence rather than direct Product Entitlement authority |
| `commerce.product_entitlement` | `id`, `account_id`, product code, term start/end, capability set version, active-deal capacity, status, `row_version` | Product-authoritative current grant; one active Individual entitlement per product/term scope |
| `commerce.entitlement_mutation` | `id`, `account_id`, `entitlement_id`, mutation type, before/after capacity and term, commercial receipt, effective/recorded times, reason | Append-only; duplicate callbacks cannot create duplicate capacity |
| `commerce.usage_reservation` | `id`, `account_id`, optional `deal_id`, allowance class, quantity, command/job ID, status, reserved/expires/committed/released times | Unique per chargeable command; cannot exceed confirmed entitlement |
| `commerce.usage_ledger_entry` | `id`, `account_id`, optional `deal_id`, entitlement ID, reservation ID, allowance class, entry type, exact quantity, period, effective/recorded times, predecessor balance digest | Append-only grant/reserve/commit/release/expire/adjust entries; provider tokens and Job counts are not buyer-visible units |
| `commerce.commercial_receipt` | `id`, `account_id`, order/provider event, receipt type, amount/currency, tax, provider object ID, occurred/recorded times | Immutable, idempotent provider reconciliation evidence |
| `commerce.refund_effect` | `id`, `account_id`, refund Commercial Receipt, exact prior receipt/Entitlement Mutation, closed refund reason type, mapping-policy version, entitlement/capacity delta, outcome, effective/recorded times | One product-owned effect per refund receipt; duplicate-charge/tax corrections preserve entitlement; unmapped refund creates no mutation |
| `commerce.invoice_projection` | `id`, `account_id`, provider invoice identity, billing period, exact amount/currency/tax/status, issued/due/paid times, updated_at | Product-visible projection; provider event remains payment evidence |
| `commerce.invoice_object` | `id`, `account_id`, Invoice Projection ID, protected object ID, role, digest | Typed Protected Account Object attachment; no provider or storage URL is exposed |
| `commerce.account_data_export` | `id`, `account_id`, actor, exact frozen scope/manifest, status, Job ID, created/completed/expires times | Durable all-or-nothing Account portability result; may include typed members from multiple Deals without becoming an Account Reusable Template |
| `commerce.account_data_export_member` | `id`, `account_id`, Account Data Export ID, exact Account/Deal resource through one closed typed extension, role, included/excluded posture, digest/reason | Frozen index-first membership; no generic `{type,id}` authority or implicit current-object expansion |
| `commerce.account_data_export_object` | `id`, `account_id`, Account Data Export ID, protected object ID, role, staging expiry | Typed Protected Account Object attachment; no generic cross-scope attachment |
| `commerce.guarantee_refund_request` | `id`, `account_id`, Checkout Order/payment identity, exact Deal/preflight/source/work/failure/milestone facts, requested_at, current state, resulting assessment/refund receipt, `row_version` | Durable self-serve request; provider refund is an effect only after deterministic eligible assessment |
| `commerce.guarantee_assessment` | `id`, `account_id`, optional Guarantee Refund Request, applicable Deal/preflight/source/work/failure facts, eligibility outcome, policy version, reason codes, assessed_at | Deterministic product record; no unstructured support override |
| `commerce.referral_link` | `id`, `account_id`, eligibility milestone, opaque public code hash, issued/expires/revoked times | Contains no Deal payload and cannot authorize Account or Deal access |
| `commerce.referral_credit` | `id`, referrer Account, referred commercial receipt, eligibility milestones, amount/currency, status, effective_at | Enforces annual cap and self-referral prohibition without storing Deal content |

### 5.3 Identity and commerce ERD

~~~mermaid
erDiagram
    ACTOR ||--o{ EXTERNAL_IDENTITY : maps
    ACCOUNT ||--o{ ACCOUNT_ACTOR : owns
    ACTOR ||--o{ ACCOUNT_ACTOR : participates
    ACCOUNT ||--o{ ACCOUNT_SECURITY_RESTRICTION : restricts
    ACCOUNT_SECURITY_RESTRICTION ||--o{ SECURITY_RECOVERY_SESSION : permits
    ACCOUNT ||--o{ PRODUCT_ENTITLEMENT : holds
    PRODUCT_ENTITLEMENT ||--o{ ENTITLEMENT_MUTATION : changes
    ACCOUNT ||--o{ BILLING_RECOVERY : enters
    BILLING_RECOVERY ||--o{ BILLING_RECOVERY_EVENT : records
    ACCOUNT ||--o{ PAYMENT_DISPUTE : records
    PAYMENT_DISPUTE ||--o{ PAYMENT_DISPUTE_EVENT : reconciles
    ACCOUNT ||--o{ CHECKOUT_ORDER : places
    CHECKOUT_ORDER ||--o| COMMERCIAL_RECEIPT : completes_as
    PROVIDER_EVENT ||--o| COMMERCIAL_RECEIPT : evidences
    COMMERCIAL_RECEIPT ||--o| REFUND_EFFECT : may_reverse
    REFUND_EFFECT ||--o| ENTITLEMENT_MUTATION : authorizes
    PRODUCT_ENTITLEMENT ||--o{ USAGE_LEDGER_ENTRY : governs
    USAGE_RESERVATION ||--o{ USAGE_LEDGER_ENTRY : settles
    ACCOUNT ||--o{ USAGE_RESERVATION : reserves
~~~

## 6. Deal control and package model

### 6.1 Core Deal tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `deal.deal` | `id`, `account_id`, represented-party identity text/reference, transaction subject/perimeter, banker side/role, mandate objective, base currency/unit defaults, `created_at`, linked predecessor Deal | Identity-defining fields become immutable when accepted; material identity change creates a new linked Deal |
| `deal.deal_workspace` | `account_id`, `deal_id`, current business stage, activity posture, record posture, processing posture, Guide mode, `posture_version`, `row_version`, created/updated times | PK and FK are `(account_id, deal_id)`; exactly one Workspace per Deal; no Workspace UUID; pause/archive fences advance posture version used by Job Scope/result commit |
| `deal.deal_stage_transition` | `id`, tenant keys, from/to stage, effective/recorded times, Human Decision, supporting Process Event/Evidence, reason | Append-only; backward transitions allowed; Signed, Closed, and Terminated remain distinct |
| `deal.deal_posture_transition` | `id`, tenant keys, posture dimension, from/to value, effective/recorded times, Decision/event/reason | Activity, record, and processing postures are independent; archive is not deletion |
| `deal.related_deal` | tenant keys, from Deal, to Deal, relationship code, Decision, `recorded_at` | Typed link for identity replacement or another explicit Deal relationship; no implicit merge |
| `deal.paid_preflight` | `id`, tenant keys, preflight version, requested use/audience, result, policy version, started/completed times, `supersedes_id` | Immutable assessment; payment does not imply pass |
| `deal.preflight_control_result` | `id`, preflight ID, control dimension, outcome, evidence/decision/policy basis, blocker/recovery code | One row per required dimension; hard gates cannot be waived by an Assumption |
| `deal.targeted_repreflight` | `id`, tenant keys, triggering object/change, affected dimensions, result, started/completed times | Rechecks only affected prospective scope; never extends old authorization |
| `deal.work_objective` | `id`, tenant keys, objective type, purpose, intended use/audience, exact Source Packet Version, requested/accepted scope, status, actor, times | Durable authorized work perimeter; not an AI Prompt |
| `deal.output_ceiling_assessment` | `id`, tenant keys, Work Objective or exact scoped target, evidence/policy basis, assessed_at | Immutable scope-specific assessment; no Deal-wide ceiling enum |
| `deal.output_ceiling_operation` | `id`, tenant keys, Output Ceiling Assessment, operation code, posture, conditions | `posture` is permitted or prohibited; closed operation codes |
| `deal.output_ceiling_blocker` | `id`, tenant keys, Output Ceiling Assessment, blocker code, affected scope, smallest recovery action, Evidence/Decision basis | Exact actionable blocker rather than a global level |
| `deal.first_deal_guide_checkpoint` | `id`, tenant keys, checkpoint code, status, canonical object reference through typed extension, completed_at | Orchestration state only; never duplicates domain objects |
| `deal.guide_graduation` | `id`, tenant keys, FUV evidence, first Internal Controlled Export, actor Decision, occurred_at | First value, export, and explicit graduation are separate required facts |

### 6.2 Execution Package tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `deal.execution_package` | `id`, tenant keys, package type/purpose, current snapshot ID, `row_version`, created_at | Persistent aggregate inside the one Deal Workspace |
| `deal.package_snapshot` | `id`, tenant keys, execution package ID, snapshot ordinal, purpose/audience/stage, readiness-basis digest, manifest ID, omissions/limitations, created_by, `created_at` | Immutable; unique package-local ordinal; current pointer constrained to same package |
| `deal.package_snapshot_revision` | tenant keys, snapshot ID, Deliverable Revision ID, package role, inclusion reason | Exact typed membership; unique revision/role within snapshot |
| `deal.package_snapshot_control` | tenant keys, snapshot ID, typed control record through per-control extension, control role | Snapshot freezes applicable control identity rather than a mutable current state |
| `deal.package_snapshot_dependency` | tenant keys, snapshot ID, exact dependency/version ID through typed extension, dependency role | Used for reproducibility; no generic authoritative object reference |

The Controlled Sell-Side Auction Deal Book and Package Readiness are projections over these authoritative objects. They do not receive independent domain identity.

### 6.3 Deal ERD

~~~mermaid
erDiagram
    ACCOUNT ||--o{ DEAL : owns
    DEAL ||--|| DEAL_WORKSPACE : has
    DEAL ||--o{ DEAL_STAGE_TRANSITION : changes_stage
    DEAL ||--o{ DEAL_POSTURE_TRANSITION : changes_posture
    DEAL ||--o{ PAID_PREFLIGHT : evaluates
    PAID_PREFLIGHT ||--o{ PREFLIGHT_CONTROL_RESULT : contains
    DEAL ||--o{ WORK_OBJECTIVE : authorizes
    WORK_OBJECTIVE ||--o{ OUTPUT_CEILING_ASSESSMENT : limits
    DEAL ||--o{ EXECUTION_PACKAGE : contains
    EXECUTION_PACKAGE ||--o{ PACKAGE_SNAPSHOT : versions
    EXECUTION_PACKAGE ||--o| PACKAGE_SNAPSHOT : current_pointer
    PACKAGE_SNAPSHOT ||--o{ PACKAGE_SNAPSHOT_REVISION : freezes
~~~

## 7. Source, protected objects, and classification

### 7.1 Intake and protected-byte tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `source.upload_session` | `id`, `account_id`, optional `deal_id`, actor, closed purpose code, batch identity, allowed object path hash, declared media/count/size posture, nonce hash, `issued_at`, `expires_at`, status | Deal Material requires Deal scope; only `account_reusable_template` may omit Deal; short-lived, single-scope, and cannot enumerate, overwrite, preview, parse, or accept bytes |
| `source.quarantined_upload` | `id`, `account_id`, optional `deal_id`, upload session, purpose code, quarantine storage key, transport digest, declared/observed media type, byte length, status, received/expires times | Scope matches its Session; separate bucket/lifecycle; never Evidence or substantive input |
| `source.quarantine_assessment` | `id`, quarantined upload, scanner/profile versions, integrity/type/archive/active-content/malware results, rights/compatibility prerequisites, outcome, assessed_at | Append-only attempts; incomplete assessment fails closed |
| `object_store.protected_object` | `id`, `account_id`, optional `deal_id`, scope code, immutable storage key, ciphertext/plaintext digests, byte length, media type, chunk/envelope version, KMS key version, wrapped DEK, lifecycle status, created_at | New content-addressed key; upsert prohibited; Deal attachments require Deal scope; typed Account attachments use Account scope; common physical byte identity only, not a generic domain object |
| `object_store.protected_object_replica` | `id`, protected object, replica purpose/location, ciphertext digest, copied/verified/deletion times, status | Recovery-copy control; no live authority |
| `object_store.protected_stream_access_receipt` | `id`, `account_id`, optional `deal_id`, Stream Grant hash identity, principal, exact Protected Object, typed immutable attachment, applicable Revision, purpose/range, receipt kind, occurred_at, idempotency identity | Immutable narrow Gateway receipt for Account or Deal streams; only a first qualifying Recipient Reader Copy first-byte receipt may create an External-Use Event through control-plane commitment |

`protected_object` is attached only through typed domain tables. Representative typed attachments are `commerce.invoice_object`, `commerce.account_data_export_object`, `deliverable.artifact_template_version_object`, `source.accepted_source_object`, `source.source_representation_object`, `deliverable.artifact`, `external_use.internal_export_object`, `external_use.delivery_object`, and `external_use.archive_object`. A generic `attachment_type/attachment_id` authority table is prohibited.

### 7.2 Source identity and representation tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `source.source_material` | `id`, tenant keys, material kind, stable title/description, origin party/source, created_by, `created_at` | Stable logical identity; no byte data and no universal current-record pointer |
| `source.source_record` | `id`, tenant keys, source material ID, record kind, source-issued version/date, observed/received/recorded times, origin/authority descriptors, supersedes/corrects record ID | Immutable; exactly one Source Material; automatic grouping by filename/digest/AI similarity prohibited |
| `source.accepted_source_object` | `id`, tenant keys, source record ID, protected object ID, object role, acceptance assessment, accepted_at | Exact original/accepted byte attachment; protected object unique for its attachment role |
| `source.source_representation` | `id`, tenant keys, source record ID, representation kind, parser/renderer/OCR identity and version, input digest, representation digest, produced_at | Immutable derived representation; not new Source Material or independent Evidence |
| `source.source_representation_object` | `id`, tenant keys, representation ID, protected object ID, representation role | Typed byte attachment; unique representation/role |
| `source.processing_coverage` | `id`, tenant keys, representation ID, coverage profile/schema version, covered and omitted structure payloads, gap codes, engine version, outcome, assessed_at | Version-bound; schema-governed JSONB allowed for format-specific structure inventory |
| `source.web_evidence_observation` | `source_record_id`, tenant keys, canonical URL, retrieval time, HTTP/TLS profile, response/content digest, capture mode, snapshot prohibition reason | One-to-one Source Record extension; each retrieval is another Source Record |
| `source.compatibility_report` | `id`, tenant keys, exact target through typed target extension, Capability Manifest/formula profile, outcome, limitations, Output Ceiling ID, recovery path, assessed_at | Immutable, version-bound; successful opening is not Professional Usability |

There is no `source_material.current_record_id`. Current or purpose-applicable selection occurs through an exact Source Packet Version or another explicit typed work relationship.

### 7.3 Source Packet tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `source.source_packet` | `id`, tenant keys, purpose, stage scope, owner actor, current version ID, `row_version`, created_at | Stable banker-controlled collection identity |
| `source.source_packet_version` | `id`, tenant keys, source packet ID, version ordinal, scope statement, change reason, created_by, created_at | Immutable; unique packet-local ordinal |
| `source.source_packet_member` | tenant keys, packet version ID, Source Record ID, member role, inclusion reason, sort key | Exact membership; unique Source Record/role within a version |

Adding, removing, or withdrawing a Source Record creates a new Source Packet Version and triggers Impact Assessment. Earlier packet versions remain reproducible.

### 7.4 Classification and rights tables

Classification dimensions are stored independently. No `data_class` column may combine them.

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `source.material_classification_assessment` | `id`, tenant keys, exact material/record/object scope through typed extension, provenance class, confidentiality class, de-identification posture, evidence/policy/Decision basis, effective/recorded times, invalidation/expiry trigger | Immutable; upgrades affect prospective access immediately; downgrade requires typed Decision and applicable de-identification evidence |
| `source.rights_posture_assessment` | `id`, tenant keys, Source Record ID, purpose/use scope, rights code, retention/disclosure conditions, evidence/Decision basis, effective/recorded/expiry times | Immutable and purpose-bound; independent of source truth and confidentiality |
| `source.rights_posture_operation` | `id`, tenant keys, Rights Posture Assessment, operation code, posture, conditions | Typed permitted/prohibited operations; no free JSON authority |
| `source.source_reliance_assessment` | `id`, tenant keys, Source Record ID, purpose/use scope, reliance state, evidence/conflict/Decision basis, limitations, effective/recorded/expiry times, supersedes ID | Immutable; state is `unassessed`, `reliance_limited`, `reliance_eligible`, or `blocked` for the exact purpose |
| `source.source_condition_assessment` | `id`, tenant keys, Source Record ID, purpose/use scope, freshness code, conflict code, disposition code, basis, effective/recorded times, supersedes ID | Keeps current/stale, conflicted, and active/superseded/withdrawn/historical dimensions independent |
| `source.classification_current_selection` | tenant keys, typed material scope extension, current classification assessment ID, `row_version`, updated_at | Authoritative current pointer selected by controlled command; earlier Jobs and Decisions bind exact assessment ID |
| `source.rights_current_selection` | tenant keys, Source Record ID, purpose code, current rights assessment ID, `row_version` | One current selection per exact Source Record/purpose; historical use never retargets |
| `source.reliance_current_selection` | tenant keys, Source Record ID, purpose code, current reliance assessment ID, row version | One current Source Reliance State per exact purpose |
| `source.condition_current_selection` | tenant keys, Source Record ID, purpose code, current condition assessment ID, row version | Current display/query pointer only; does not rewrite source history |

The application evaluates provenance, confidentiality, de-identification, rights, provider capability, processing path, and intended use together. De-identification posture values are:

- `not_assessed`;
- `transformed_unverified`;
- `verified_for_scope`;
- `failed`;
- `expired_or_invalidated`;
- `not_applicable`.

### 7.5 Source ERD

~~~mermaid
erDiagram
    DEAL ||--o{ SOURCE_MATERIAL : contains
    SOURCE_MATERIAL ||--o{ SOURCE_RECORD : observed_as
    SOURCE_RECORD ||--o{ ACCEPTED_SOURCE_OBJECT : attaches
    PROTECTED_OBJECT ||--o| ACCEPTED_SOURCE_OBJECT : stores
    SOURCE_RECORD ||--o{ SOURCE_REPRESENTATION : derives
    SOURCE_REPRESENTATION ||--o{ SOURCE_REPRESENTATION_OBJECT : attaches
    PROTECTED_OBJECT ||--o{ SOURCE_REPRESENTATION_OBJECT : stores
    SOURCE_REPRESENTATION ||--o{ PROCESSING_COVERAGE : assesses
    SOURCE_RECORD ||--o{ RIGHTS_POSTURE_ASSESSMENT : constrains
    SOURCE_RECORD ||--o{ MATERIAL_CLASSIFICATION_ASSESSMENT : classifies
    SOURCE_RECORD ||--o{ SOURCE_RELIANCE_ASSESSMENT : assesses
    SOURCE_PACKET ||--o{ SOURCE_PACKET_VERSION : versions
    SOURCE_PACKET ||--o| SOURCE_PACKET_VERSION : current_pointer
    SOURCE_PACKET_VERSION ||--o{ SOURCE_PACKET_MEMBER : contains
    SOURCE_RECORD ||--o{ SOURCE_PACKET_MEMBER : selected_as
~~~

## 8. Evidence, Claims, Facts, Decisions, and diligence

### 8.1 Locator and Evidence tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `knowledge.native_locator` | `id`, tenant keys, Source Record ID, Source Representation ID, locator profile code/version, selector payload JSONB, parser identity, context/content digest, resolution status, created_at | Immutable; schema-governed by format; ambiguous/unresolved rather than guessed |
| `knowledge.evidence` | `id`, tenant keys, Source Record ID, representation ID, Native Locator ID, context/content digest, source date/scope/definition, accepted origin, created_at | Durable exact source part; unique exact representation/locator/context identity within Deal where safe |
| `knowledge.claim` | `id`, tenant keys, atomic proposition text, attribution party/source, definition, period/unit/currency/sign fields, origin, created_at, supersedes/corrects Claim ID | Immutable proposition; repetition or inclusion does not make it Fact |
| `knowledge.evidence_relationship` | `id`, tenant keys, Claim ID, Evidence ID, relationship code, supported proposition scope, qualification, limitation, origin, accepted_at | Only `supports` or `challenges`; immutable; same Evidence may relate differently to different Claims |
| `knowledge.evidence_candidate` | `id`, tenant keys, AI Proposal or deterministic Job, Claim/candidate key, AI Context Fragment, proposed relation/scope/qualification, validation outcome, created_at | Proposal only; cannot be cited as accepted Evidence Relationship |

`ai.ai_context_fragment` is run-scoped. It maps the model-visible fragment key to exact Source/Representation/Locator identity. Once validation succeeds, the control plane creates or reuses `knowledge.evidence` and creates a new `knowledge.evidence_relationship`; durable objects never retain the model-visible fragment key as authority.

### 8.2 Fact and Assumption tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `knowledge.fact` | `id`, tenant keys, Claim ID, purpose code, optional Work Objective, period/definition/unit/qualification snapshot, acceptance Decision ID, accepted_at, invalidated/superseded Fact ID | Immutable scope-bound acceptance; one Claim may have multiple Facts for different exact scopes |
| `knowledge.fact_evidence_basis` | tenant keys, Fact ID, Evidence Relationship ID, basis role | Closed accepted relationship set; every Fact requires at least one supporting relationship and preserves applicable challenges/conflicts |
| `knowledge.fact_current_selection` | tenant keys, Claim ID, purpose code, optional Work Objective ID, current Fact ID, `row_version` | One current Fact per exact scope; pointer only, not history |
| `knowledge.assumption` | `id`, tenant keys, exact analysis/work scope, proposition/value fields, rationale, invalidation triggers, approval Decision ID, effective/recorded times, supersedes Assumption ID | Immutable adopted premise; never becomes Fact |
| `knowledge.information_conflict` | `id`, tenant keys, conflict dimension, exact competing Claims/Evidence through typed memberships, affected uses, status projection, created_at | Alternatives preserved; no averaging or silent winner |
| `knowledge.conflict_disposition` | `id`, tenant keys, conflict ID, Human Decision ID, disposition code, scope, rationale, effective/recorded times | Append-only; a later source can reopen or supersede the disposition prospectively |

### 8.3 Human Decision envelope and typed extensions

`knowledge.human_decision` is a common immutable envelope, not a polymorphic authority shortcut.

| Common field | Meaning |
|---|---|
| `id`, `account_id`, `deal_id` | Tenant-bearing identity |
| `decision_type_code` | Closed routing code; must match exactly one typed extension |
| `question_text`, `selected_option_code`, `rationale_text` | Exact choice and basis |
| `purpose_code`, `audience_code` | Scope where applicable |
| `decided_by_actor_id` | Individual Banker |
| `effective_at`, `recorded_at`, `expires_at` | Business and system time |
| `policy_version`, `authority_basis_code` | Applicable control basis |
| `supersedes_decision_id`, `reverses_decision_id` | Explicit immutable history |

Each Decision has exactly one typed extension row, enforced by the command path and deferred validation trigger:

| Typed extension | Exact subject |
|---|---|
| `knowledge.fact_acceptance_decision` | Claim, resulting Fact, Evidence Relationship set |
| `knowledge.assumption_decision` | Exact Assumption and intended analysis/use |
| `knowledge.conflict_decision` | Information Conflict and selected disposition |
| `process.buyer_approval` | Buyer Candidate |
| `process.bid_decision` | Exact Bid Version and decision kind |
| `deal.stage_transition_decision` | Exact from/to stage transition |
| `source.classification_decision` | Exact classification assessment/scope |
| `deliverable.qc_disposition_decision` | Exact QC Finding and purpose |
| `external_use.external_use_decision` | Exact External-Use Scope |

`knowledge.human_decision_evidence` links a Decision to accepted Evidence Relationships. Deterministic check references use typed tables such as `decision_calculation_run` and `decision_qc_run`. There is no `subject_type/subject_id` field.

### 8.4 Diligence and open-work tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `knowledge.diligence_issue` | `id`, tenant keys, issue category, exact problem statement, material scope/impact, resolution criteria, owner, current posture, `row_version`, created_at | Stable work identity; not replaced by a QC Finding |
| `knowledge.diligence_issue_transition` | `id`, issue ID, from/to posture, Evidence/Decision basis, effective/recorded times, reason | Append-only; receipt of information does not itself resolve issue |
| `knowledge.information_request` | `id`, tenant keys, Diligence Issue ID, requested party, exact requested Evidence/material/clarification, acceptance criteria, target date, current posture, `row_version` | Stable request identity; no autonomous sending in V1 |
| `knowledge.information_request_event` | `id`, request ID, Process Event/Source Record, event kind, effective/recorded times | Tracks draft, issued-outside-product, response received, clarified, closed without conflation |
| `knowledge.open_item` | `id`, tenant keys, item type, exact next action, owner, due date, current posture, linked typed domain object, `row_version` | Tracks work, not Evidence, risk, Decision, or Process Event |
| `knowledge.open_item_transition` | `id`, open item ID, from/to posture, actor/event/Decision basis, effective/recorded times | Append-only status history |

### 8.5 Evidence and judgment ERD

~~~mermaid
erDiagram
    SOURCE_RECORD ||--o{ NATIVE_LOCATOR : locates
    SOURCE_REPRESENTATION ||--o{ NATIVE_LOCATOR : resolves_in
    NATIVE_LOCATOR ||--o{ EVIDENCE : anchors
    CLAIM ||--o{ EVIDENCE_RELATIONSHIP : evaluated_by
    EVIDENCE ||--o{ EVIDENCE_RELATIONSHIP : participates
    CLAIM ||--o{ FACT : accepted_for_scope
    FACT ||--o{ FACT_EVIDENCE_BASIS : binds
    EVIDENCE_RELATIONSHIP ||--o{ FACT_EVIDENCE_BASIS : supports
    HUMAN_DECISION ||--o| FACT_ACCEPTANCE_DECISION : specializes
    HUMAN_DECISION ||--o| ASSUMPTION_DECISION : specializes
    DILIGENCE_ISSUE ||--o{ INFORMATION_REQUEST : drives
    DILIGENCE_ISSUE ||--o{ DILIGENCE_ISSUE_TRANSITION : changes
~~~

## 9. Calculation, Model, Scenario, Analysis, and impact

### 9.1 Calculation tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `analysis.calculation` | `id`, tenant keys, calculation kind, stable name/purpose, current version ID, owner, `row_version`, created_at | Stable business identity; not a single execution result |
| `analysis.calculation_version` | `id`, tenant keys, Calculation ID, version ordinal, method/formula contract, method version/digest, output contract, Evaluation Time requirement, created_by, created_at | Immutable; exact formula/method definition; unique root-local ordinal |
| `analysis.calculation_input_fact` | tenant keys, Calculation Version ID, Fact ID, input role | Exact Fact dependency |
| `analysis.calculation_input_assumption` | tenant keys, Calculation Version ID, Assumption ID, input role | Exact Assumption dependency |
| `analysis.calculation_input_measure` | `id`, tenant keys, Calculation Version ID, input role plus Quantitative Measure columns, source Fact/Assumption where applicable | Typed repeated values, not generic EAV |
| `analysis.calculation_run` | `id`, tenant keys, Calculation Version ID, Job Attempt, engine/profile identity, exact Evaluation Time, canonical input digest, started/completed times, outcome, validation status, coverage | Immutable execution; retry creates another Run |
| `analysis.calculation_result` | `id`, tenant keys, Calculation Run ID, result role plus Quantitative Measure columns, definition/qualification, result digest | Immutable typed outputs; unique declared result role per Run |
| `analysis.calculation_check` | `id`, Deterministic Validation Record ID, Calculation Run ID, rule/version, check type, outcome, observed/expected exact values, limitation, checked_at | Typed rule detail within one validation envelope; pass does not prove Professional Usability |
| `analysis.deterministic_validation_record` | `id`, tenant keys, applicability, ruleset/rule/engine identities, declared/achieved coverage, result, structured exceptions, unresolved-judgment posture, evaluated_at, Job Attempt ID | Immutable validation envelope; exactly one closed typed target row and exact input membership are required; pass clears only declared mechanical gates |
| `analysis.validation_calculation_target` | Validation Record ID, exact Calculation Version or Calculation Run ID | Exactly one applicable target; database check prohibits both or neither |
| `analysis.validation_model_target` | Validation Record ID, exact Model Version ID | Typed Model target |
| `analysis.validation_scenario_target` | Validation Record ID, exact Scenario Version ID | Typed Scenario target |
| `analysis.validation_analysis_target` | Validation Record ID, exact Analysis Version ID | Typed Analysis target |
| `analysis.validation_revision_target` | Validation Record ID, exact Deliverable Revision ID | Typed Deliverable target |
| `analysis.validation_package_target` | Validation Record ID, exact Package Snapshot ID | Typed package target |
| `analysis.validation_input` | `id`, Validation Record ID, exact typed input through one closed extension, role, version/digest | Exact tested dependency set; no generic authoritative `{type,id}` pair |
| `analysis.validation_affected_gate` | `id`, Validation Record ID, gate code, effect code, exact affected scope | Records only gates cleared or created by the declared validation contract |

### 9.2 Model, Scenario, Analysis, and Recommendation tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `analysis.model` | `id`, tenant keys, model kind, stable name/purpose, current version ID, owner, `row_version`, created_at | Stable work identity; workbook is only an Artifact representation |
| `analysis.model_version` | `id`, tenant keys, Model ID, version ordinal, method/structure definition, Evaluation Time, created_by, created_at | Immutable; unique root-local ordinal |
| `analysis.model_version_calculation` | tenant keys, Model Version ID, Calculation Version ID, role/order | Exact typed dependency |
| `analysis.model_version_fact` | tenant keys, Model Version ID, Fact ID, role | Exact accepted Fact input |
| `analysis.model_version_assumption` | tenant keys, Model Version ID, Assumption ID, role | Exact adopted Assumption input |
| `analysis.scenario` | `id`, tenant keys, optional Model ID, stable name/purpose, current version ID, owner, `row_version`, created_at | Stable alternative-set identity; not a separate Model |
| `analysis.scenario_version` | `id`, tenant keys, Scenario ID, version ordinal, exact Model Version ID or Analysis Version scope, rationale, created_at | Immutable; binds one exact base |
| `analysis.scenario_override` | `id`, tenant keys, Scenario Version ID, exact typed input target, override role plus Quantitative Measure/Assumption reference, rationale | No free key/value map; target uses typed extension table |
| `analysis.analysis` | `id`, tenant keys, analysis kind, stable question/purpose, current version ID, owner, `row_version`, created_at | Stable interpretive-work identity |
| `analysis.analysis_version` | `id`, tenant keys, Analysis ID, version ordinal, exact scope, method, conclusion text, limitations, professional-usability posture, created_by, created_at | Immutable; conclusion remains bound to its exact inputs |
| `analysis.analysis_evidence` | tenant keys, Analysis Version ID, Evidence Relationship ID, role | Exact source relationship |
| `analysis.analysis_fact` | tenant keys, Analysis Version ID, Fact ID, role | Exact Fact dependency |
| `analysis.analysis_assumption` | tenant keys, Analysis Version ID, Assumption ID, role | Exact Assumption dependency |
| `analysis.analysis_calculation_run` | tenant keys, Analysis Version ID, Calculation Run ID, role | Exact reproduced result, not merely Calculation root |
| `analysis.analysis_model_version` | tenant keys, Analysis Version ID, Model Version ID, role | Exact Model dependency |
| `analysis.analysis_scenario_version` | tenant keys, Analysis Version ID, Scenario Version ID, role | Exact Scenario dependency |
| `analysis.recommendation` | `id`, tenant keys, purpose/audience, proposal text, alternatives/trade-offs, conditions, invalidation triggers, origin, created_at, supersedes Recommendation ID | Immutable one-off proposal; never a Human Decision |
| `analysis.recommendation_analysis` | tenant keys, Recommendation ID, Analysis Version ID, role | Exact rationale dependency |
| `analysis.recommendation_evidence` | tenant keys, Recommendation ID, Evidence Relationship ID, role | Exact support/challenge basis |
| `analysis.recommendation_assumption` | tenant keys, Recommendation ID, Assumption ID, role | Makes premise use explicit |

### 9.3 Analysis State

`analysis.analysis_state_assessment` is an immutable common envelope with `state_code`, purpose, basis, assessed time, limitations, and supersession. It has exactly one typed target extension:

- `calculation_state_target` for an exact Calculation Version or Run;
- `model_state_target` for an exact Model Version;
- `scenario_state_target` for an exact Scenario Version;
- `analysis_state_target` for an exact Analysis Version.

Current state selection tables are separate per target class. State values describe working, mechanical-validation, professional-usability, senior-review, or blocked posture. They never determine Deliverable Readiness or Process State.

### 9.4 Authoritative Lineage and derived dependency graph

The typed relationship tables above are authoritative Lineage. Additional cross-domain Lineage uses named relations such as:

- `analysis.calculation_run_source_record`;
- `analysis.model_version_bid_version`;
- `analysis.analysis_process_event`;
- `deliverable.content_region_evidence`;
- `deliverable.content_region_analysis`;
- `deliverable.revision_model_version`;
- `deliverable.artifact_region_lineage`;
- `deal.package_snapshot_revision`.

Each relation binds exact immutable upstream and downstream versions, a dependency role, materiality posture where known, and `recorded_at`. A universal authoritative object registry or polymorphic dependency table is prohibited.

`projection.dependency_edge` contains normalized traversal rows:

- `account_id`, `deal_id`;
- closed `upstream_kind` and `downstream_kind`;
- upstream/downstream UUID and version UUID where applicable;
- dependency role and materiality hint;
- authoritative source relation name/key digest;
- projection build version and built time.

It is fully rebuildable and may be stale. An Impact Assessment uses it only to create the deterministic candidate closure, then resolves every candidate back to a typed authoritative relationship.

### 9.5 Impact Assessment tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `analysis.impact_assessment` | `id`, tenant keys, trigger kind, triggering exact typed object/change, candidate-closure build version, overall status, created_by/origin, started/completed times | Immutable completed assessment; rerun creates another assessment |
| `analysis.impact_candidate_edge` | `id`, assessment ID, projection edge identity/digest, resolution status, authoritative relation reference through typed extension | Preserves why an object entered the candidate closure |
| `analysis.impact_calculation_item` | assessment ID, exact Calculation Version/Run, impact code, recalculation required, basis, Human Decision where material | Typed affected item |
| `analysis.impact_model_item` | assessment ID, exact Model Version, impact code, recalculation required, basis | Typed affected item |
| `analysis.impact_scenario_item` | assessment ID, exact Scenario Version, impact code, recalculation required, basis | Typed affected item |
| `analysis.impact_analysis_item` | assessment ID, exact Analysis Version, impact code, re-review required, basis | Typed affected item |
| `analysis.impact_deliverable_item` | assessment ID, exact Deliverable Revision, impact code, regeneration/re-review/circulation flags, basis | Typed affected item |
| `analysis.impact_review_item` | assessment ID, exact Review, impact code, re-review required, basis | Typed affected item |
| `analysis.impact_external_use_item` | assessment ID, exact External-Use Decision, impact code, circulation blocked, invalidation record where applicable | Prior actual-use history remains unchanged |

Impact codes are independently `unaffected`, `potentially_affected`, `materially_affected`, or `unable_to_assess`. Recalculation, regeneration, re-review, and circulation blocking are independent booleans/outcomes, not one combined severity.

### 9.6 Analysis ERD

~~~mermaid
erDiagram
    CALCULATION ||--o{ CALCULATION_VERSION : versions
    CALCULATION ||--o| CALCULATION_VERSION : current_pointer
    CALCULATION_VERSION ||--o{ CALCULATION_RUN : executes
    CALCULATION_RUN ||--o{ CALCULATION_RESULT : produces
    MODEL ||--o{ MODEL_VERSION : versions
    MODEL_VERSION ||--o{ MODEL_VERSION_CALCULATION : includes
    CALCULATION_VERSION ||--o{ MODEL_VERSION_CALCULATION : used_by
    SCENARIO ||--o{ SCENARIO_VERSION : versions
    MODEL_VERSION ||--o{ SCENARIO_VERSION : base
    SCENARIO_VERSION ||--o{ SCENARIO_OVERRIDE : overrides
    ANALYSIS ||--o{ ANALYSIS_VERSION : versions
    ANALYSIS_VERSION ||--o{ ANALYSIS_CALCULATION_RUN : relies_on
    CALCULATION_RUN ||--o{ ANALYSIS_CALCULATION_RUN : supports
    ANALYSIS_VERSION ||--o{ RECOMMENDATION_ANALYSIS : informs
    RECOMMENDATION ||--o{ RECOMMENDATION_ANALYSIS : based_on
    IMPACT_ASSESSMENT ||--o{ IMPACT_DELIVERABLE_ITEM : evaluates
~~~

## 10. Deal Parties, auction process, and Bids

### 10.1 Deal Party tables

V1 identities are Deal-local. No Account-wide or cross-customer Party Master is created.

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `process.deal_party` | `id`, tenant keys, party kind, stable Deal-local display identity, origin/source, created_at, row version | Exactly one organization or person extension; cross-Deal similarity never merges identity |
| `process.organization_party` | `deal_party_id`, tenant keys, legal/display name, jurisdiction, domain only when source-supported, identifiers and qualifications | One-to-one extension; no inferred capacity or interest |
| `process.person_party` | `deal_party_id`, tenant keys, name, title, bounded contact fields, source/verification posture | One-to-one extension; contact details remain Deal-scoped |
| `process.organization_contact` | `id`, tenant keys, organization Party, person Party, relationship/title, effective/recorded times, Evidence | Both Parties belong to same Deal; no Account directory promotion |
| `process.deal_party_role` | `id`, tenant keys, Party ID, role catalog/version, effective interval, source/Evidence, recorded_at | Multiple roles allowed; role never grants product permission or Buyer approval |
| `process.external_party_identifier` | `id`, tenant keys, Party ID, identifier type/value digest, source, verified posture | Used only for Deal-local matching; raw identifier minimized |

### 10.2 Buyer and outreach tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `process.buyer_candidate` | `id`, tenant keys, organization Party ID, rationale, fit factors, restrictions, interest/capacity/contactability/conflict postures, origin, created_at | Candidate posture explicitly unknown unless exact evidence exists |
| `process.buyer_approval` | `id`, tenant keys, Buyer Candidate ID, Human Decision ID, approved scope, effective/recorded times, invalidated_at | Approval is separate from outreach, disclosure, NDA, access, Bid, or selection |
| `process.outreach_wave` | `id`, tenant keys, purpose, planned timing, disclosure posture, material conditions, status projection, owner, row version | Planned grouping; not actual outreach |
| `process.outreach_wave_member` | tenant keys, Outreach Wave ID, approved Buyer ID, planned order/conditions | Requires eligible Buyer Approval for the exact scope |
| `process.outreach_event` | `process_event_id`, tenant keys, Buyer Party, wave, channel, occurred time, supporting Source/Evidence | Typed extension proving outreach actually occurred |
| `process.auction_round` | `id`, tenant keys, round code/name, sequence, purpose, opening/target/closing times, submission requirements, evaluation basis, current posture, row version | Stable Deal-local process interval; scheduling or closing a round does not prove Bid receipt or selection |

### 10.3 NDA and Data-Room Access tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `process.nda` | `id`, tenant keys, counterparty organization, purpose/scope, current version ID, current legal/process posture, row version, created_at | Stable arrangement identity; execution alone does not authorize disclosure |
| `process.nda_version` | `id`, tenant keys, NDA ID, version ordinal, exact Source Record, parties/scope/conditions, submitted/executed/effective/expiry times, created_at | Immutable; current pointer same NDA |
| `process.nda_party` | tenant keys, NDA Version ID, Deal Party ID, party role | Exact signatory/covered party set |
| `process.data_room_access` | `id`, tenant keys, counterparty/person Party, authorized material scope, grant basis Decision, valid interval, current posture, row version | Product records external authorization evidence; V1 does not mutate a live VDR |
| `process.data_room_access_event` | `process_event_id`, tenant keys, Data-Room Access ID, event kind, effective time, Evidence/Decision | Grant, suspend, revoke, expire are distinct events |

### 10.4 Bid tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `process.bid` | `id`, tenant keys, Buyer Candidate ID, Auction Round ID, stable proposal identity, current version ID, row version, created_at | One continuing proposal lineage; selection/acceptance not a root status shortcut |
| `process.bid_version` | `id`, tenant keys, Bid ID, version ordinal, exact Source Record, submitted/received/recorded times, completeness posture, qualification text, supersedes Version ID | Immutable; unique Bid-local ordinal |
| `process.bid_economic_term` | `id`, tenant keys, Bid Version ID, term role plus Quantitative Measure columns, definition/qualification | Typed economics; no generic key/value payload |
| `process.bid_consideration_term` | `id`, tenant keys, Bid Version ID, consideration kind, amount/percentage Quantitative Measure, conditions | Cash, stock, rollover, earnout, or declared supported types |
| `process.bid_financing_term` | `id`, tenant keys, Bid Version ID, financing kind, commitment/status, amount Quantitative Measure, conditions/source | Financing evidence distinct from Buyer capacity inference |
| `process.bid_structure_term` | `id`, tenant keys, Bid Version ID, structure code, exact description/conditions | Closed supported structure codes with explicit other/unsupported handling |
| `process.bid_condition` | `id`, tenant keys, Bid Version ID, condition category, text, deadline, waiver posture | Conditions remain separately inspectable |
| `process.bid_timing_term` | `id`, tenant keys, Bid Version ID, timing kind, date/range, conditions | No date alone implies milestone completion |
| `process.bid_decision` | `id`, tenant keys, Bid Version ID, Human Decision ID, decision kind, scope, effective/recorded times | Selection, next-round inclusion, rejection, exclusivity, or acceptance is immutable Decision history |
| `process.bid_event` | `process_event_id`, tenant keys, Bid/Version ID, event kind, occurred time, supporting Source/Evidence | Receipt, revision, clarification, withdrawal are Process Events |

### 10.5 Milestones and Process Events

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `process.milestone` | `id`, tenant keys, milestone type/catalog version, target date/time, completion criteria, current posture, owner, row version | Planned control point; target date never proves completion |
| `process.milestone_event` | `process_event_id`, tenant keys, Milestone ID, event kind, criteria result, Evidence/Decision | Achieved, moved, canceled, or reopened history |
| `process.process_event` | `id`, tenant keys, event type code, actor/party, occurred_at, recorded_at, origin, exact source/evidence basis, optional corrected/superseded Process Event ID, correction reason, idempotency identity | Immutable common envelope; must have exactly one typed extension; correction appends another Event and never edits the original |
| `process.deal_stage_event` | `process_event_id`, tenant keys, exact stage transition | Event evidence for a stage change; stage Decision remains separate |
| `process.signing_event` | `process_event_id`, tenant keys, signing scope/parties, supporting Source/Evidence | Signing is not Closing |
| `process.closing_event` | `process_event_id`, tenant keys, closing scope/parties, supporting Source/Evidence | Closing is not inferred from signing or schedule |
| `process.termination_event` | `process_event_id`, tenant keys, termination scope/reason/evidence | Distinct terminal business event |

Typed extensions may be added for a new supported process event through a migration and closed event-type contract. A plan, task, recommendation, silence, schedule, AI output, or mutable tracker label cannot create `process_event`.

### 10.6 Process ERD

~~~mermaid
erDiagram
    DEAL ||--o{ DEAL_PARTY : contains
    DEAL_PARTY ||--o| ORGANIZATION_PARTY : organization
    DEAL_PARTY ||--o| PERSON_PARTY : person
    DEAL_PARTY ||--o{ DEAL_PARTY_ROLE : serves_as
    ORGANIZATION_PARTY ||--o{ BUYER_CANDIDATE : considered_as
    BUYER_CANDIDATE ||--o{ BUYER_APPROVAL : approved_by
    OUTREACH_WAVE ||--o{ OUTREACH_WAVE_MEMBER : groups
    BUYER_APPROVAL ||--o{ OUTREACH_WAVE_MEMBER : eligible_member
    BUYER_CANDIDATE ||--o{ BID : submits
    AUCTION_ROUND ||--o{ BID : receives
    BID ||--o{ BID_VERSION : versions
    BID ||--o| BID_VERSION : current_pointer
    BID_VERSION ||--o{ BID_ECONOMIC_TERM : includes
    NDA ||--o{ NDA_VERSION : versions
    PROCESS_EVENT ||--o| BID_EVENT : specializes
    PROCESS_EVENT ||--o| DATA_ROOM_ACCESS_EVENT : specializes
    PROCESS_EVENT ||--o| MILESTONE_EVENT : specializes
~~~

## 11. Deliverables, artifacts, Review, and QC

### 11.1 Deliverable and Revision tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `deliverable.deliverable` | `id`, tenant keys, deliverable type, stable title, purpose, stage applicability, audience class, confidentiality class, owner, current Revision ID, row version, created_at | Stable business object; filename is not identity |
| `deliverable.deliverable_revision` | `id`, tenant keys, Deliverable ID, revision ordinal, revision kind/origin, purpose/audience snapshot, confidentiality assessment, source/model/process basis digest, predecessor/supersedes Revision ID, created_by, created_at | Immutable; unique Deliverable-local ordinal; no Review/QC/readiness/authorization inheritance |
| `deliverable.content_contract` | `id`, deliverable type, semantic schema version/digest, generator compatibility version, lifecycle status, enabled/retired times | Immutable contract version; closed JSON Schema and validators are release-owned |
| `deliverable.deliverable_revision_content` | `id`, tenant keys, Revision ID, Content Contract ID, semantic payload JSONB, canonical payload digest, validation outcome/version, origin AI Proposal/import, created_at | At most one canonical narrative payload per Revision; strict closed schema; not used as workbook financial authority |
| `deliverable.content_region` | `id`, tenant keys, Revision Content ID, stable region key, section/region type, sequence, reader-facing purpose, payload pointer, content digest | Stable within Revision; region key declared by Content Contract |

Narrative semantic payloads may contain section hierarchy, reader-facing text, tables, chart instructions, citations, qualifications, and refresh instructions. The following authority is normalized outside the payload:

| Typed relation | Authority preserved |
|---|---|
| `deliverable.content_region_evidence` | Exact Evidence Relationship and citation role |
| `deliverable.content_region_claim` | Exact Claim represented or qualified |
| `deliverable.content_region_fact` | Exact accepted Fact used |
| `deliverable.content_region_assumption` | Exact Assumption and disclosure role |
| `deliverable.content_region_analysis` | Exact Analysis Version |
| `deliverable.content_region_recommendation` | Exact Recommendation |
| `deliverable.content_region_calculation_result` | Exact Calculation Result and display role |
| `deliverable.revision_model_version` | Exact Model Version supporting workbook or narrative content |
| `deliverable.revision_scenario_version` | Exact Scenario Version |
| `deliverable.revision_process_event` | Exact Process Event represented |
| `deliverable.revision_bid_version` | Exact Bid Version compared or described |

Each relationship carries tenant keys, exact Revision/region identity, role, and recorded time. Financial values repeated for presentation remain tied to their authoritative Calculation Result, Fact, Bid Term, or a typed region-owned Quantitative Measure.

For workbooks, relational Models, Calculations, Scenarios, Buyers, Bids, Process Events, and Decisions are authority. Workbook build mappings can use a schema-governed layout/build contract, but workbook bytes or cached values never replace those relations.

### 11.2 Template and artifact tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `deliverable.artifact_template` | `id`, optional `account_id`, optional `deal_id`, closed scope code, template class, rights posture, current version ID, status, row version, created_at | Scope is exactly product-default (no tenant), Account-reusable (Account only), or Deal-local (Account and Deal); live Deal artifacts can create only Deal-local identity and cannot be promoted to Account-reusable |
| `deliverable.artifact_template_version` | `id`, inherited optional tenant scope, template ID, version ordinal, compatibility report, structural inventory schema/payload, created_at | Immutable; unique template-local ordinal; exactly one scope-matching asset extension is required |
| `deliverable.artifact_template_version_object` | Template Version ID, `account_id`, optional `deal_id`, protected object ID, role | Required only for Account-reusable or Deal-local Template Versions; protected-object Account/Deal scope must exactly match Template scope |
| `deliverable.product_template_asset` | `id`, Product-default Template Version ID, immutable release asset key, media type, byte length, digest, build/signature identity, released_at | Required only for product-default versions; release-owned typed asset outside tenant object storage, with no Account/Deal attachment or promotion path |
| `deliverable.deal_template_selection` | `id`, tenant keys, Deliverable/artifact class, exact Template Version, selection Decision, effective/recorded times | A changed template triggers Impact Assessment and new Revision where material |
| `deliverable.artifact` | `id`, tenant keys, Revision ID, artifact role, protected object ID, media type, plaintext digest, generator/renderer/template versions, created_at | Immutable typed byte attachment; one primary Native Artifact and zero or more Reader Copies per Revision |
| `deliverable.artifact_region` | `id`, tenant keys, Artifact ID, manifest region key, ownership class, native structural locator, content digest, created_at | Region identity for regeneration and three-way comparison |
| `deliverable.artifact_region_lineage` | `id`, tenant keys, Artifact Region ID, exact typed upstream relation, role, recorded_at | Authoritative region-level Lineage; no generic polymorphic target |
| `deliverable.artifact_manifest` | `id`, tenant keys, Revision ID, manifest schema/version, canonical digest, signature/key identity, signed_at, protected object ID | Signature proves deployment origin/integrity, not correctness or authorization |
| `deliverable.artifact_manifest_member` | `id`, tenant keys, Manifest ID, Artifact/protected object/control record through typed extension, member role, path label, exact digest | Relational exact membership; signed schema payload may mirror but not replace it |

Artifact-role constraints:

- one and only one primary Native Artifact is required for a generated material Revision before the applicable readiness gate;
- Reader Copies are zero-to-many and each binds the same Revision;
- a Reader Copy never receives an independent Deliverable identity;
- any materially changed Native Artifact creates a new Revision;
- object hashes prove byte identity only.

### 11.3 External edit and reimport tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `deliverable.external_edit_import` | `id`, tenant keys, prior exported Revision, externally edited protected object, current controlled Revision, import actor, compatibility result, status, started/completed times | Three-way comparison input; cannot silently replace current Revision |
| `deliverable.artifact_region_comparison` | `id`, import ID, prior Region, edited Region candidate, current Region, change classification, comparison digest/result | Classifies Banker edit, source/formula, style/layout, comment/review, unsupported feature, or conflict |
| `deliverable.merge_conflict` | `id`, tenant keys, import/comparison ID, exact conflicting regions, conflict kind, current posture, created_at | Preserves all three inputs; no last-write-wins |
| `deliverable.merge_conflict_disposition` | `id`, conflict ID, Human Decision, disposition, accepted source/region, rationale, recorded_at | Append-only; accepted changes produce a new immutable Revision |

### 11.4 Review and QC tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `deliverable.review` | `id`, tenant keys, exact target through typed extension, purpose/audience/scope, reviewer type, actor/AI Run/ruleset identity, standard version, conclusion, limitations, started/completed times | Immutable completed Review; exactly one typed target |
| `deliverable.review_revision_target` | Review ID, exact Deliverable Revision ID | Primary Deliverable review target |
| `deliverable.review_analysis_target` | Review ID, exact Analysis Version ID | Typed non-Deliverable target |
| `deliverable.qc_run` | `id`, tenant keys, Review ID, Job Attempt or AI Run, ruleset/tool/model versions, exact input/coverage digest, outcome, started/completed times | Immutable execution; human Review may have none; retries are separate Runs |
| `deliverable.qc_finding` | `id`, tenant keys, Review ID, optional QC Run, exact target through typed extension, applicable Native Locator/Artifact Region, finding type, severity, Evidence, impact, owner, intended-use consequence, created_at | Immutable defect on exact object/version/location; no mutable resolved flag |
| `deliverable.qc_finding_disposition` | `id`, tenant keys, Finding ID, disposition type, actor/Decision, rationale, applicable purpose, recorded_at | Append-only assignment, confirmation, rejection, accepted limitation, or remediation requirement |
| `deliverable.qc_retest` | `id`, tenant keys, Finding ID, exact remediated target through typed extension, Review/QC Run, result, limitations, completed_at | Tests a new exact object/version; cannot rewrite original Finding |
| `deliverable.qc_finding_resolution` | `id`, tenant keys, Finding ID, disposition ID, exact remediated target, successful Retest, Human Decision where required, recorded_at | Resolution relation; original target remains historically defective |

Severity rules:

- `critical` blocks the affected use and, where defined, release;
- `major` blocks the stated Review or circulation posture;
- `minor` may remain only when visible, owned, non-material for the exact use, and explicitly accepted where required.

### 11.5 Deliverable Readiness and Package Readiness

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `deliverable.readiness_assessment` | `id`, tenant keys, exact Revision, purpose/audience, requested gate, achieved posture, blockers, Evidence/Review/QC/Decision basis, assessed_at, supersedes ID | Immutable and exact-use-bound; no global ready flag |
| `deliverable.readiness_requirement_result` | `id`, assessment ID, requirement code/version, outcome, exact control basis, blocker/recovery action | One row per applicable gate requirement |
| `deliverable.current_readiness_selection` | tenant keys, Revision, purpose/audience scope, current assessment ID, row version | Current pointer only; prior assessment remains historical |

Allowed achieved postures are `working_draft`, `analysis_ready`, `senior_review_ready`, `circulation_candidate`, and `blocked`. `circulated` is not a readiness state.

`projection.package_readiness` combines exact current package snapshot, Deliverable assessments, Source Reliance, Analysis State, Process State, QC Findings, Decisions, and blockers. It is rebuildable and cannot authorize external use.

### 11.6 Deliverable ERD

~~~mermaid
erDiagram
    DELIVERABLE ||--o{ DELIVERABLE_REVISION : versions
    DELIVERABLE ||--o| DELIVERABLE_REVISION : current_pointer
    DELIVERABLE_REVISION ||--o| DELIVERABLE_REVISION_CONTENT : expresses
    CONTENT_CONTRACT ||--o{ DELIVERABLE_REVISION_CONTENT : validates
    DELIVERABLE_REVISION_CONTENT ||--o{ CONTENT_REGION : divides
    DELIVERABLE_REVISION ||--o{ ARTIFACT : represents
    PROTECTED_OBJECT ||--o| ARTIFACT : stores
    ARTIFACT ||--o{ ARTIFACT_REGION : divides
    DELIVERABLE_REVISION ||--o{ REVIEW : reviewed
    REVIEW ||--o{ QC_RUN : executes
    REVIEW ||--o{ QC_FINDING : finds
    QC_FINDING ||--o{ QC_FINDING_DISPOSITION : disposes
    QC_FINDING ||--o{ QC_RETEST : retests
    DELIVERABLE_REVISION ||--o{ READINESS_ASSESSMENT : assesses
~~~

## 12. Internal export, external authorization, and Recipient Access

### 12.1 External-Use Decision and frozen scope

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `external_use.external_use_decision` | `id`, tenant keys, Human Decision ID, exact Revision ID, External-Use Scope ID, authority basis, decided/effective/expiry times | One-to-one typed Human Decision extension; immutable |
| `external_use.external_use_scope` | `id`, tenant keys, exact Revision, purpose, channel, valid interval, rights/classification assessments, disclosure/specialist/firm conditions, limitations, membership mode, scope digest, created_at | Immutable; artifact hash set and audience membership frozen |
| `external_use.scope_artifact` | tenant keys, Scope ID, exact Artifact ID, role, plaintext digest | Exact Native/Reader identities authorized |
| `external_use.scope_recipient_member` | tenant keys, Scope ID, External Recipient ID, optional Person Party ID, audience role | Frozen named membership; future Party state does not expand it |
| `external_use.scope_audience_member` | tenant keys, Scope ID, exact Deal Party ID, audience class/code | Freezes members of a controlled audience class at Decision time |
| `external_use.external_use_invalidation` | `id`, tenant keys, Decision ID, trigger kind, exact changed object through typed extension, Impact Assessment, effective/recorded times, reason | Append-only; prior actual-use history unchanged |
| `external_use.external_use_revocation` | `id`, tenant keys, Decision ID, Human Decision, effective/recorded times, reason | Append-only withdrawal; does not edit original authorization |

An active authorization is a query/projection result: within the valid interval, not revoked or invalidated, exact Revision/artifacts unchanged, frozen member matched, and all required current controls still eligible. It is not a mutable `active=true` assertion.

### 12.2 Internal Controlled Export

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `external_use.internal_export` | `id`, tenant keys, actor, exact Revision/package snapshot/control scope, intended internal purpose, current readiness/limitations snapshot, manifest, created_at | Does not require or create External-Use Decision; still enforces rights, confidentiality, isolation, integrity, and Revision binding |
| `external_use.internal_export_member` | `id`, tenant keys, Internal Export ID, exact Artifact/control/source member through typed extension, included/excluded posture, reason, digest | Exact index-first membership |
| `external_use.internal_export_object` | `id`, tenant keys, Internal Export ID, protected object ID, role, staging expiry | Typed encrypted archive/file attachment |

#### Archive Package

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `external_use.archive_package` | `id`, tenant keys, actor, exact Package Snapshot and permitted source/control scope, archive purpose/audience, manifest ID, declared exclusions, created_at | Index-first immutable archive; external-purpose archive additionally requires matching External-Use Scope |
| `external_use.archive_member` | `id`, tenant keys, Archive Package, exact Revision/Artifact/Source/control member through typed extension, role, included/excluded posture, digest, reason | Exact permitted membership; no implicit current-object expansion |
| `external_use.archive_object` | `id`, tenant keys, Archive Package, protected object ID, role | Typed encrypted package/index attachment |

### 12.3 External Recipient, delivery, and actual-use tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `external_use.external_recipient` | `id`, tenant keys, optional Person Party ID, mailbox identity/digest, display identity, verification posture, created_at | Separate access identity; never Account/Workspace membership |
| `external_use.recipient_verification` | `id`, tenant keys, Recipient ID, challenge/token hashes, method, issued/expires/verified times, attempt outcome | Proves mailbox control only; tokens never stored plaintext |
| `external_use.delivery_package` | `id`, tenant keys, External-Use Decision/Scope, exact Recipient, purpose/channel, manifest, status, created_at | Creation is not actual use; one named Recipient per Recipient Access path; may be created alone or atomically with Recipient Access |
| `external_use.delivery_member` | `id`, tenant keys, Delivery ID, exact authorized Artifact, role, digest | Must be subset/equal match of frozen Scope artifacts |
| `external_use.delivery_object` | `id`, tenant keys, Delivery ID, protected object ID, role | No reusable public URL |
| `external_use.recipient_access` | `id`, tenant keys, Recipient, Delivery/Decision/Scope, exact Revision, granted/expires/revoked/invalidated times, current posture, posture version, row version | Recipient-specific, authenticated, read-only, non-downloadable, expiring/revocable/suspendable; creation atomically creates its recipient-specific Delivery when one was not independently requested |
| `external_use.recipient_access_suspension` | `id`, tenant keys, Recipient Access, closed cause code, Payment Dispute or Account Security Restriction through one typed extension, opened/cleared times, posture version, current state | Multiple causes may overlap; an active or cleared-pending-resumption cause denies reads without rewriting Access/Decision/use history; no generic source UUID |
| `external_use.recipient_access_resumption` | `id`, tenant keys, Recipient Access, cleared suspension set digest, Actor, Sensitive Action Grant, exact Access/Decision/Revision/Recipient/purpose/condition dependency digest, recorded_at, outcome | Immutable explicit reauthorization result; allowed only with zero active cause and unchanged valid bindings; never extends expiry or revives a Session |
| `external_use.recipient_session` | `id`, tenant keys, Recipient Access, access posture version, session/token hashes, issued/expires/revoked times, last authorization check | Short-lived isolated viewer session; rechecks every content read; suspension/resumption never revives an old Session |
| `external_use.external_use_event` | `process_event_id`, tenant keys, Decision/Scope, exact Revision, actual Recipient/member, purpose, channel, occurred time, supporting receipt | Typed Process Event extension; product share access or Banker-recorded external use |
| `external_use.external_use_receipt` | `id`, tenant keys, External-Use Event, optional protected receipt object, receipt kind/digest, recorded_at | Supporting evidence only; absence does not turn authorization into occurrence |

Exact-match constraints enforced in the command transaction:

1. Decision Scope Revision equals Delivery and Recipient Access Revision.
2. Delivery artifacts and digests are a subset of the frozen Scope artifact set.
3. Recipient is a frozen Scope member.
4. Purpose, channel, conditions, validity, rights, and confidentiality match.
5. No active invalidation or revocation exists.
6. Recipient Access never redirects to a newer Revision.

### 12.4 External-use ERD

~~~mermaid
erDiagram
    HUMAN_DECISION ||--o| EXTERNAL_USE_DECISION : specializes
    DELIVERABLE_REVISION ||--o{ EXTERNAL_USE_SCOPE : exact_revision
    EXTERNAL_USE_SCOPE ||--|| EXTERNAL_USE_DECISION : authorized_by
    EXTERNAL_USE_SCOPE ||--o{ SCOPE_ARTIFACT : freezes
    ARTIFACT ||--o{ SCOPE_ARTIFACT : authorized
    EXTERNAL_USE_SCOPE ||--o{ SCOPE_RECIPIENT_MEMBER : freezes
    EXTERNAL_RECIPIENT ||--o{ SCOPE_RECIPIENT_MEMBER : included
    EXTERNAL_USE_DECISION ||--o{ DELIVERY_PACKAGE : permits
    DELIVERY_PACKAGE ||--o{ DELIVERY_MEMBER : contains
    EXTERNAL_RECIPIENT ||--o{ RECIPIENT_ACCESS : receives
    DELIVERY_PACKAGE ||--o{ RECIPIENT_ACCESS : exposes
    RECIPIENT_ACCESS ||--o{ RECIPIENT_ACCESS_SUSPENSION : restricts
    PAYMENT_DISPUTE ||--o{ RECIPIENT_ACCESS_SUSPENSION : causes
    ACCOUNT_SECURITY_RESTRICTION ||--o{ RECIPIENT_ACCESS_SUSPENSION : causes
    RECIPIENT_ACCESS ||--o{ RECIPIENT_ACCESS_RESUMPTION : reauthorizes
    RECIPIENT_ACCESS ||--o{ RECIPIENT_SESSION : creates
    PROCESS_EVENT ||--o| EXTERNAL_USE_EVENT : specializes
~~~

## 13. Jobs, idempotency, leases, Outbox, and integration delivery

### 13.1 Command and Job tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `jobs.idempotency_record` | `id`, `account_id`, Actor, command type, key hash, canonical request digest, response status/body digest, resulting typed resource/Job link, optional application-encrypted one-time-secret replay body, created/expires times | Unique `(account_id, actor_id, command_type, key_hash)`; same key/different digest is conflict; replay never renews an expired Grant; record remains at least 30 days after terminal Job or non-Job durable result |
| `jobs.job` | `id`, tenant keys where Deal-scoped, command/idempotency record, job type, current public/internal state, progress contract, requested/cancel times, terminal outcome, row version, created/updated times | Durable user-visible aggregate; accepted command exposes a Job within confirmed latency |
| `jobs.job_step` | `id`, tenant keys, Job ID, step code, operation class, input contract/digest, timeout/resource limits, retry policy, current state, row version | Stable DAG node; unique step code per Job |
| `jobs.job_dependency` | tenant keys, Job ID, predecessor Step ID, successor Step ID, dependency condition | Unique edge; DAG validated before execution |
| `jobs.job_attempt` | `id`, tenant keys, Step ID, attempt ordinal, Runtime Principal, exact configuration/engine/provider, start/end times, outcome/failure class/code, usage/cost, protected details | Immutable; unique Step-local ordinal |
| `jobs.job_lease` | `id`, tenant keys, Step ID, Runtime Principal, lease token hash, claimed/heartbeat/expires/released times, outcome | One active lease per Step; 90-second duration and heartbeat at least every 30 seconds |
| `jobs.job_event` | `id`, tenant keys, Job ID, monotonically increasing sequence, public event type, public state/progress, safe message/recovery code, occurred_at | Immutable authorized replay stream; unique Job-local sequence; no Deal content |
| `jobs.transactional_outbox` | `id`, account/deal/job identity, event type/version, safe routing payload, aggregate sequence, created/claimed/published times, attempts, status | Written in same transaction as domain result; queue delivery may repeat |

Public Job states are exactly:

- `queued`;
- `running`;
- `waiting_for_user`;
- `waiting_for_source`;
- `blocked`;
- `failed_retryable`;
- `failed_terminal`;
- `canceled`;
- `completed`.

Internal cancellation, compensation, lease, or dead-letter mechanics map to these states and cannot create hidden business posture. Waiting states release execution leases. Cancellation preserves already accepted immutable results and releases only unused commercial reservations.

### 13.2 Job Scope tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `jobs.job_scope` | `id`, tenant keys, Job ID, Runtime Principal, Workspace posture version when Deal-scoped, Account security epoch, issued/expires/revoked times, canonical scope digest | Short-lived database-issued authorization; result commitment revalidates identity, lease, cancellation, security epoch, posture version and typed scope; pause/archive/security/deletion fences stale authority |
| `jobs.job_scope_operation` | Scope ID, closed operation code, constraints | Exact permitted operation set; no JSON-only permission |
| `jobs.job_scope_source_record` | Scope ID, exact Source Record | Permitted source input |
| `jobs.job_scope_source_representation` | Scope ID, exact Source Representation | Permitted derived input |
| `jobs.job_scope_protected_object` | Scope ID, exact Protected Object, permitted read/write operation | Exact byte authority |
| `jobs.job_scope_analysis` | Scope ID, exact Calculation/Model/Scenario/Analysis version through one typed extension | Exact analysis authority |
| `jobs.job_scope_deliverable_revision` | Scope ID, exact Revision, permitted operation | Exact generation/review target |
| `jobs.job_scope_ai_task` | Scope ID, exact AI Task Definition/Prompt version | Exact invocation authority |

Permission authority is never stored as a generic object-kind/UUID list. Adding a newly supported resource class requires a migration, policy test, and new typed scope membership table.

A Pause transaction advances `deal_workspace.posture_version`, stops new claims, and makes every prior Deal-scoped Job Scope fail commit-time validation. An Archive transition remains pending until every domain-mutating Job is terminal or safely canceled, then advances posture version and admits only new read/export/deletion Scopes permitted for Archived posture. Public Job state uses `canceled` or `blocked` with stable `workspace_posture_changed`; it does not add a hidden posture-specific public state.

### 13.3 Exactly-once effect rules

- Queue delivery is at-least-once.
- An accepted business result is attached in one database transaction using unique natural business constraints and the originating Job Step/Attempt.
- File side effects first create a temporary content-addressed object; one typed attachment row commits it exactly once.
- A reclaimed expired lease checks committed step effects before retrying.
- Provider retries follow the fixed retry contract; authentication, rights, permission, unsupported format, invalid business contract, and user blockers are not silently retried.
- The Outbox contains only safe routing identity and never Deal content.

### 13.4 Job ERD

~~~mermaid
erDiagram
    IDEMPOTENCY_RECORD ||--o| JOB : creates
    JOB ||--o{ JOB_STEP : decomposes
    JOB_STEP ||--o{ JOB_DEPENDENCY : predecessor
    JOB_STEP ||--o{ JOB_DEPENDENCY : successor
    JOB_STEP ||--o{ JOB_ATTEMPT : attempts
    JOB_STEP ||--o{ JOB_LEASE : leases
    JOB ||--o{ JOB_EVENT : reports
    JOB ||--o{ JOB_SCOPE : authorizes
    JOB ||--o{ TRANSACTIONAL_OUTBOX : publishes
    RUNTIME_PRINCIPAL ||--o{ JOB_ATTEMPT : executes
~~~

### 13.5 Provider Webhook Inbox

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `integration.webhook_inbox_event` | `id`, provider code, provider event ID/type, signature/key identity, bounded raw-payload digest, canonical provider-evidence contract/version/digest and schema-governed payload or protected canonical reference, optional protected raw-payload reference, received/verified times, replay posture, processing state, result link | Unique provider/event identity; persisted before `200`; a processable event requires a complete canonical contract, while an ignored event may retain only its verified envelope; replay posture is exactly `exact_replay_available`, `current_object_reconciliation_only`, or `not_recoverable`; invalid signatures are not business events and cannot directly grant entitlement or human authority |
| `integration.webhook_processing_attempt` | `id`, Inbox Event ID, attempt ordinal, exact adapter/version, started/completed times, outcome, stable failure code, retry time | Immutable attempts; at-least-once processing with idempotent domain effects |

Stripe's `commerce.provider_event` is the product-semantic payment-event record linked from a verified Inbox Event; the Inbox is not a second entitlement authority. Clerk and Resend events likewise enter typed product handlers only after verification and durable persistence.

### 13.6 Outbound provider attempts

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `integration.outbound_call_attempt` | `id`, optional Account/Deal, Runtime Principal, provider/operation, adapter/API/profile versions, environment/endpoint identity, command/Job/notification/retention/stream/signing identity through one closed typed extension, idempotency identity, request/response digests, safe provider request/object ID, started/completed times, outcome/failure/retry posture, privacy-safe usage/cost, protected-detail reference | Immutable; used when an owning Job Attempt, Notification Delivery Attempt, Access Receipt, Retention/Deletion Task, or signing record does not already contain the required adapter evidence; never stores Deal content or becomes provider/domain authority |

Every enabled adapter maps to exactly one owning attempt record. A generic untyped business-object UUID is prohibited; authority-bearing links use closed typed extensions.

### 13.7 Notification delivery

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `notification.notification_preference` | `id`, `account_id`, Actor, event class, in-product/email channel posture, digest/snooze configuration, `row_version`, effective/updated times | One current preference per Account/Actor/event/channel; security, billing, and access-required notices follow their exact non-optional product rule |
| `notification.notification` | `id`, `account_id`, optional Actor/External Recipient, source event identity, safe event class, template/version, channel, privacy-safe destination hash and protected address reference, opaque deep-link/challenge reference where applicable, current delivery posture, created/expires times | Durable product intent; no Deal content; unique source event/recipient/channel/template purpose; provider delivery does not prove product action |
| `notification.notification_delivery_attempt` | `id`, Notification, attempt ordinal, exact Resend adapter/version, stable product/provider idempotency identity, conservative `provider_idempotency_expires_at`, optional provider message identity, started/completed times, immediate request outcome and safe failure code, retry time | Immutable request attempt; retries keep the same key and stop before the 24-hour provider boundary; an unresolved possibly-accepted result after the boundary becomes terminal `delivery_ambiguous`, never an automatic new-key resend |
| `notification.notification_delivery_event` | `id`, Notification, optional Delivery Attempt, Webhook Inbox Event, provider message identity, event type, provider occurred time, received time, safe delivery/bounce/complaint code | Append-only and unique by provider/Inbox event identity; late, duplicate, and reordered provider evidence never mutates a Delivery Attempt or creates product authority; current delivery posture and suppression are projections/reductions from this history |
| `notification.provider_suppression` | `id`, provider, privacy-safe destination hash, suppression class/source event, effective/reviewed/released times, current posture | Prevents unsafe repeated delivery; does not disable required in-product state or create Account/Recipient authority |

## 14. AI contracts, Runs, Proposals, and evaluation

### 14.1 Provider, Task, and Prompt tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `ai.provider_route` | `id`, route code, environment, base URL identity, credential reference/version, status, created/retired times | Fixed deployment-owned route; no Account endpoint or credential |
| `ai.provider_capability_profile` | `id`, route/model/API profile, model identity, region/retention/training/access assertions, verified probe results, limits/error semantics, evidence times, status | Immutable versioned evidence; verified and provider-asserted properties separated |
| `ai.task_family` | `id`, stable family code, description, status | Classification only; not executable and owns no open union schema |
| `ai.task_definition` | `id`, Task Family, stable task code, version, responsibility, permitted classification dimensions, resource limits, provider profile, input/output contract identities, lifecycle state, created_at | Immutable executable contract; one concrete output type |
| `ai.evidence_policy` | `id`, version/digest, required relationship/coverage/conflict/abstention rules, lifecycle state | Immutable release-owned policy |
| `ai.prompt_package` | `id`, Task Definition, semantic version, compiled digest, instruction/evidence/input/output/context/evaluation contract identities, lifecycle state, created_at | Immutable compiled package; no mutable runtime Prompt text |
| `ai.task_enablement` | `id`, environment, Task Definition/Prompt/Profile, provenance/confidentiality/de-identification eligibility, evaluation evidence, state, enabled/suspended/retired times | At most one default enabled version per exact environment/task/data/profile scope |

Task/Prompt lifecycle is `draft` → `candidate` → `enabled` → `suspended` → `retired`. Rollback selects a previously passing immutable version; it never edits history.

### 14.2 Input, context, and Run tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `ai.input_envelope` | `id`, tenant keys, Job Scope, Work Objective, Task/Prompt/policy/schema versions, intended use/audience, exact classification assessments, source/domain input digest, resource limits, request nonce, canonical envelope digest, created_at | Control-plane-owned immutable envelope; model cannot author identities |
| `ai.context_plan` | `id`, tenant keys, Input Envelope, plan contract/version, included/excluded/failed/unprocessed coverage, decomposition/aggregation contract, canonical digest, created_at | Immutable deterministic context plan; required scope never silently truncated |
| `ai.context_fragment` | `id`, tenant keys, Context Plan, run-scoped fragment key, exact Source Record/Representation/Native Locator, content/context digest, Processing Coverage, Rights assessment, ordinal | Key unique within Run/Plan; not durable Evidence identity |
| `ai.run` | `id`, tenant keys, Job/Attempt, Task Definition, Prompt, Evidence Policy, Provider Profile, Input Envelope, Context Plan, model/parameter identity, request/response Protected Object refs, request/response digests, status/outcome class, usage/cost/latency, validation summary, started/completed times | Immutable traceable execution envelope; no hidden chain-of-thought field |
| `ai.run_validation` | `id`, tenant keys, AI Run, validation stage/code, JSON Pointer where applicable, outcome, normalized/repaired digests, checked_at | Deterministic ordered validation history |
| `ai.run_retry` | `id`, parent AI Run/Attempt, retry ordinal/reason/backoff/provider request identity, outcome | Bounded by exact retry contract |

Raw visible provider requests/responses remain encrypted protected technical records under Deal retention. Banker surfaces expose only the task and contract versions, input perimeter, typed validated results, Evidence, limitations, Abstention, and Decision path.

### 14.3 Proposal and promotion tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `ai.proposal` | `id`, tenant keys, AI Run, task-specific proposal kind, response-local candidate key, strict schema/version, validated payload JSONB, payload digest, support status, acceptance posture, created_at | Schema-governed boundary; never authoritative business state |
| `ai.proposal_disposition` | `id`, tenant keys, Proposal, Actor, disposition kind, reason, exact affected scope, optional resulting typed correction/Decision link, recorded_at | Immutable; does not edit/delete Proposal or create a generic promotion path |
| `ai.proposal_evidence_link` | `id`, tenant keys, Proposal, Context Fragment, proposed supports/challenges relation, scope, qualification, limitation, validation result | Fragment must belong to same Run input perimeter |
| `ai.abstention` | `id`, tenant keys, AI Run/Proposal scope, reason code, affected/safe partial scope, Output Ceiling, recovery action, created_at | Successful structured business outcome, not provider failure |
| `ai.proposal_omission` | `id`, Proposal/Run, omitted scope, reason, materiality posture | Required material omission prevents `complete` outcome |

Accepted AI output becomes a typed domain object through a purpose-specific origin relation, for example:

- `ai.claim_origin` → `knowledge.claim`;
- `ai.evidence_candidate_origin` → `knowledge.evidence_candidate`;
- `ai.analysis_version_origin` → `analysis.analysis_version`;
- `ai.recommendation_origin` → `analysis.recommendation`;
- `ai.buyer_candidate_origin` → `process.buyer_candidate`;
- `ai.deliverable_content_origin` → `deliverable.deliverable_revision_content`;
- `ai.qc_finding_origin` → `deliverable.qc_finding`;
- `ai.impact_proposal_origin` → `analysis.impact_assessment` proposal/basis.

Each table has tenant-bearing foreign keys and `UNIQUE(ai_proposal_id, domain_object_id)`. There is no generic proposal-target polymorphic link. Promotion records Origin but does not change the AI Proposal into a Fact, Decision, Process Event, or authorization.

### 14.4 Evaluation tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `ai.evaluation_suite` | `id`, exact Task/Prompt/Profile scope, suite version/digest, Reference Deal set, rubric version, lifecycle state | Immutable release evidence contract |
| `ai.evaluation_case` | `id`, Suite, case code, fixture/input digest, expected invariant/critical flags, scoring contract | No live Deal enters without explicit evaluation authorization |
| `ai.evaluation_run` | `id`, Suite, environment/build/provider/model, started/completed times, outcome | Exact candidate evidence |
| `ai.evaluation_case_result` | `id`, Evaluation Run/Case, deterministic outcomes, median criterion scores, critical result, protected details, completed_at | Contract failure is no result, not a pass |
| `ai.evaluation_adjudication` | `id`, Case Result, judge Prompt/Profile, randomized order identity, criterion results/evidence, critical flags, completed_at | Three isolated adjudications where required; no hidden reasoning retained |

### 14.5 AI ERD

~~~mermaid
erDiagram
    TASK_FAMILY ||--o{ TASK_DEFINITION : classifies
    TASK_DEFINITION ||--o{ PROMPT_PACKAGE : implements
    PROVIDER_CAPABILITY_PROFILE ||--o{ TASK_ENABLEMENT : qualifies
    PROMPT_PACKAGE ||--o{ TASK_ENABLEMENT : enables
    INPUT_ENVELOPE ||--|| CONTEXT_PLAN : plans
    CONTEXT_PLAN ||--o{ CONTEXT_FRAGMENT : selects
    TASK_DEFINITION ||--o{ AI_RUN : executes
    INPUT_ENVELOPE ||--o{ AI_RUN : binds
    AI_RUN ||--o{ AI_PROPOSAL : proposes
    AI_PROPOSAL ||--o{ PROPOSAL_EVIDENCE_LINK : cites
    CONTEXT_FRAGMENT ||--o{ PROPOSAL_EVIDENCE_LINK : referenced_by
    AI_RUN ||--o{ AI_ABSTENTION : abstains
    EVALUATION_SUITE ||--o{ EVALUATION_CASE : contains
    EVALUATION_SUITE ||--o{ EVALUATION_RUN : executes
~~~

## 15. Audit, retention, deletion, capability, and measurement controls

### 15.1 Audit tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `controls.audit_event` | `id`, `account_id`, Account-local sequence, actor/runtime principal, event type/version, typed scope digest/opaque minimized identities, outcome/reason, trace ID, occurred/recorded times, previous-event hash, event hash | Append-only; `UNIQUE(account_id, sequence)`; no Deal content, names, filenames, prompts, values, or recipient lists |
| `controls.audit_checkpoint` | `id`, `account_id`, UTC date, first/last sequence, last event hash, event count, signing key/version, signature, protected checkpoint object, signed_at | At most one finalized daily checkpoint per Account/date; corrections append later Audit Events |
| `controls.audit_verification` | `id`, Checkpoint, verifier/runtime version, expected/observed digest, outcome, verified_at | Verification evidence; does not prove business correctness |

Audit Events supplement rather than replace Human Decisions, Process Events, entitlement mutations, external-use events, or deletion records.

### 15.2 Retention tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `controls.retention_rule` | `id`, stable rule code, version, data/object class, purpose, active/backup durations, trigger, legal basis, effective/retired times | Immutable versioned policy catalog |
| `controls.retention_ledger_entry` | `id`, optional tenant keys, exact typed retained resource, Retention Rule, retention trigger/time, active/backup deadlines, current lifecycle, row version, created_at | Authoritative control record; typed target extension required |
| `controls.retention_task` | `id`, Ledger Entry, storage/provider surface, task kind, due/attempt/completed times, outcome, verification digest, protected detail reference | Idempotent, recoverable execution |
| `controls.preservation_exception` | `id`, exact retention/deletion scope, category, legal basis, approved/reviewed identity, effective/review/expiry times, disclosure posture, status | Narrowly scoped; no V1 self-service Legal Hold |

Representative retention rules:

| Retained data/object class | Rule |
|---|---|
| Rejected/unaccepted quarantine object | Delete within 24 hours |
| Worker staging/unattached failed object | Delete within 24 hours after terminal state |
| Export download staging | Delete within 24 hours |
| In-process plaintext/cache | No more than 1 hour unless exact active Job requires less |
| Search/embedding projection | Delete or rebuild with Source Record |
| Operational Telemetry | 30 days |
| Job Event | At least 30 days after terminal Job state |
| Idempotency replay record | At least 30 days after terminal Job state or non-Job durable result, as applicable |
| Job-attempt/non-content cost metadata | 1 year |
| Security Audit Events/deletion proof | 2 years |
| Billing/tax/invoice/refund without Deal content | 7 years |
| Post-Term Access | 30 days |
| Deletion Status Claimant | while deletion/preservation remains unresolved, then 30 days after terminal completion |
| Active primary-system deletion | Within 30 days after normal access removal |
| Ordinary encrypted backup expiry | Within 90 days |

### 15.3 Deletion tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `controls.deletion_request` | `id`, Account, optional Deal, requester Actor, requested scope/type, submitted/accepted times, current stage, access-removed time, target deadlines, preservation posture, row version | Immutable request identity plus controlled stage projection; immediately blocks normal access and new work |
| `controls.deletion_scope` | `id`, Deletion Request, scope version/digest, captured_at, resource counts by class, active/backup/provider perimeter, status | Immutable frozen perimeter captured before resources disappear |
| `controls.deletion_scope_domain` | Scope ID plus exact typed domain root/version relation | Typed authoritative domain membership while resource exists |
| `controls.deletion_scope_object` | Scope ID, Protected/Quarantine object identity, provider locator digest, deletion class | Exact byte/resource membership |
| `controls.deletion_task` | `id`, Scope, closed resource/surface class, provider locator or schema-governed technical payload, idempotency key, due/attempt/completed times, outcome, verification digest | Operational boundary may use provider-specific payload; cannot reopen content or expand scope |
| `controls.deletion_tombstone` | `id`, Deletion Request, irreversible subject/scope digest, scope class, accepted/active-deleted/backup-expired/completed times, outcome/verification digest, preservation basis | Privacy-minimized; no FK to deleted Account/Deal/content and no identifying content |
| `controls.deletion_stage_event` | `id`, Deletion Request, from/to stage, reason/outcome, occurred_at | Append-only recovery history |
| `controls.deletion_status_claimant` | `id`, Deletion Request identity without deletable FK, provider code/issuer binding, keyed subject digest, scope class, projection version, created/terminal/status-available-until times, current posture | Survives normal authority/content removal only for same-identity status proof; no name, email copy, Deal content, ordinary Account permission, or request enumeration; removed 30 days after terminal completion or resolved preservation exception |
| `controls.deletion_status_grant` | `id`, Claimant, bound authenticated-session hash, projection version, token/nonce hashes, issued/expires/revoked times | Read-only and exact-request-bound; expiry no more than 15 minutes; exposes only privacy-safe stage/clocks/preservation category/receipt and grants no other read or command |

Deletion stages are:

1. `request_accepted`;
2. `normal_access_removed`;
3. `active_deletion_in_progress`;
4. `scheduled_backup_expiry`;
5. `completed`;
6. `preservation_exception` where applicable.

Partial or failed deletion remains in durable recovery and cannot report `completed`. Account/Deal top-level deletion is orchestrated; unconditional cascade is prohibited across retained/audited boundaries. Controlled `ON DELETE CASCADE` is allowed only for exclusively owned leaf rows that require no independent proof after the deletion perimeter is frozen.

Deletion acceptance creates the Claimant and initial Grant in the same transaction that removes normal access and freezes the Deletion Scope. The Claimant uses no FK that can re-create or retain deleted Account/Deal/content; its irreversible request binding joins only to the privacy-minimized surviving deletion projection/tombstone. Later Grant issuance first authenticates the same provider issuer/subject, compares the keyed digest, and reveals no request existence on mismatch. The Clerk identity remains authentication-only without an Account relationship until `status_available_until`; a final Retention Task removes the product binding and requests/verifies provider identity deletion when no other separately lawful product relationship exists.

A restore process checks every Deletion Tombstone and reapplies the deletion perimeter before restored data can become accessible. A restore that resurrects a tombstoned scope fails verification.

### 15.4 Capability and compatibility control tables

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `controls.capability_manifest` | `id`, product/build/environment version, input/artifact/application/processing/render/export/round-trip capabilities and limits, evidence digest, status, created_at | Immutable verified support boundary; no inference from tool availability |
| `controls.formula_compatibility_profile` | `id`, product/build/Excel target, function/calculation/dynamic-array/volatility/precision/hidden/circular/external dependency support contract, evidence, status | Immutable versioned allowlist and tested behavior |
| `controls.control_catalog` | `id`, catalog kind/code/version, display label, policy meaning, effective/retired times | Evolvable controlled banker classifications; not used for security-critical open values |

### 15.5 Control ERD

~~~mermaid
erDiagram
    ACCOUNT ||--o{ AUDIT_EVENT : chains
    ACCOUNT ||--o{ AUDIT_CHECKPOINT : commits
    AUDIT_CHECKPOINT ||--o{ AUDIT_VERIFICATION : verifies
    RETENTION_RULE ||--o{ RETENTION_LEDGER_ENTRY : governs
    RETENTION_LEDGER_ENTRY ||--o{ RETENTION_TASK : schedules
    ACCOUNT ||--o{ DELETION_REQUEST : requests
    DELETION_REQUEST ||--o{ DELETION_SCOPE : freezes
    DELETION_SCOPE ||--o{ DELETION_TASK : executes
    DELETION_REQUEST ||--o| DELETION_TOMBSTONE : proves
    DELETION_REQUEST ||--o{ DELETION_STAGE_EVENT : transitions
    DELETION_TOMBSTONE ||--o| DELETION_STATUS_CLAIMANT : binds_without_content
    DELETION_STATUS_CLAIMANT ||--o{ DELETION_STATUS_GRANT : issues
~~~

### 15.6 Product measurement ledger

| Table | Core fields | Constraints and lifecycle |
|---|---|---|
| `measurement.product_measurement_definition` | `id`, stable event code, version, event class, satisfaction rule identity, permitted emitter classes, JSON Schema identity/digest, inclusion/exclusion and deduplication rules, projection meaning, status, effective/retired times | Immutable versioned contract; a changed denominator, satisfaction condition, exclusion, or semantic field creates a new version |
| `measurement.product_measurement_event` | `id`, Product Measurement Definition, source domain/Outbox/candidate identity, occurred/recorded times, environment/release, privacy-safe pseudonymous session/Account/Deal/Revision/object identities where applicable, synthetic/test/bot/employee/fraud/refunded/instrumentation posture, safe reason/count/duration/amount-category/cost fields, canonical payload digest | Append-only and unique under the definition's deduplication key; no Deal content; client observations are candidates until validated; exact retention and identity-link lifecycle remain launch-deferred |
| `measurement.measurement_projection` | `id`, projection code/version, source watermark/digest, computed interval, result object or bounded aggregate payload, rebuilt_at | Rebuildable only; cannot authorize product behavior or reinterpret an earlier event definition |

Server-known material events use a privacy-safe measurement emission written to the Transactional Outbox in the same domain transaction; the measurement consumer appends the Product Measurement Event under that immutable source identity. Failure before the domain transaction and Outbox commit means no product transition occurred, while later measurement-persistence failure delays only measurement and is recovered without duplicating the business effect. Sentry Operational Telemetry, Audit Events, and Product Measurement Events remain separate stores and meanings.

## 16. Rebuildable projections

Projection tables are physically separate so their convenience cannot become accidental authority.

| Table | Inputs | Use and prohibition |
|---|---|---|
| `projection.deal_book` | Deal, source, Evidence, analysis, process, Deliverable, Decision, open-item current selections | Governed current execution view; never a second Workspace or mutable truth container |
| `projection.package_readiness` | Current Package Snapshot, readiness assessments, QC, Decisions, blockers | Blocker-first current view; cannot authorize external use |
| `projection.dependency_edge` | All typed Lineage relations | Cross-module traversal and candidate impact closure only |
| `projection.current_material_classification` | Classification current selections and assessments | Fast gating/read display; historical Job/Decision binds exact assessment |
| `projection.current_process_state` | Process Events, Decisions, stage/access/Bid current selections | Deal/counterparty current view; never infers occurrence from plans |
| `projection.current_fact` | Fact current selections | Exact scoped read model; no global current Fact |
| `projection.search_document` | Eligible Source/Knowledge/Deliverable text and exact locators | PostgreSQL FTS; derived state, not Evidence or truth |
| `projection.search_embedding` | Task-approved exact source/version fragments and embedding profile | Deal-scoped pgvector; no cross-Deal nearest-neighbor search |
| `projection.job_summary` | Job current row and Job Events | UI index and notifications; Job remains authority |
| `projection.action_center_item` | Open Items, blockers, waiting Jobs, required Decisions | Navigation/task projection; cannot complete domain work |

Every projection row carries:

- `account_id` and, when applicable, `deal_id`;
- exact upstream root/version identity;
- derivation/build version;
- `built_at` and source watermark;
- invalidation/deletion identity where applicable.

RLS and query predicates require exact Account/Deal scope before FTS or vector ranking. Projection loss must degrade search/read convenience, not corrupt authoritative state. Rebuild and delete behavior is included in retention and restore drills.

## 17. Lifecycle model

### 17.1 Account and entitlement

| Aggregate | Lifecycle rule |
|---|---|
| Actor | Active → disabled; identity remains for allowed audit/commercial history until applicable deletion |
| Account | Provisioning → active → post-term read-only → deletion locked → deleted/tombstoned |
| Account Security Restriction | Open advances security epoch and invalidates ordinary authority → cleared advances epoch again; only a Security Recovery Session may act while open |
| Product Entitlement | Pending → active → past-due/restricted where policy requires → expired/canceled; mutations append |
| Billing Recovery | Open while the already-paid term remains current → resolved-paid or unresolved-at-`paid_through`; it never extends the term or adds capacity |
| Payment Dispute | Open/restricted suspends active Recipient Access → won/reversed clears only that cause and restores applicable remaining entitlement without automatic Access resumption → lost/refunded revokes affected Access before Post-Term |
| Usage Reservation | Reserved → committed, released, or expired; never both committed and released |

Payment-provider state is reconciled into product state. An ambiguous, duplicated, or out-of-order provider event cannot grant new entitlement or capacity.

### 17.2 Deal and Workspace

Deal Business Stage is independent from activity, record, processing, commercial, security, deletion, and readiness posture. Closed or Terminated does not itself make the Workspace read-only.

~~~mermaid
stateDiagram-v2
    [*] --> Initiated
    Initiated --> Preparation
    Preparation --> InMarket
    InMarket --> BidEvaluation
    BidEvaluation --> ExclusiveExecution
    ExclusiveExecution --> Signed
    Signed --> Closed
    Initiated --> Terminated
    Preparation --> Terminated
    InMarket --> Terminated
    BidEvaluation --> Terminated
    ExclusiveExecution --> Terminated
    BidEvaluation --> InMarket
    ExclusiveExecution --> BidEvaluation
~~~

Backward transitions are allowed where the real process requires them. Every transition binds a Human Decision, applicable Process Event/Evidence, business-effective time, and recorded time.

Independent Workspace postures:

| Dimension | Values and rule |
|---|---|
| Activity | Active or Paused; Paused preserves business stage, advances posture version, fences new claims/stale Job commits, and permits only inspect/search/export/cancel/revoke/resume/archive/delete operations |
| Record | Open or Archive-pending or Archived; Archive-pending waits for domain-mutating Jobs to finish/cancel; Archived advances posture version and is read-only for inspect/search/export/delete until explicit reactivation |
| Processing | Preflight-restricted, limited, or permitted for exact scope; not a global rights grant |
| Commercial | Entitled, post-term read-only, or locked; does not rewrite Deal history |

Reactivation keeps the same Deal when represented party, transaction subject/perimeter, banker side/role, and mandate objective are unchanged. A material change to any identity element creates a new linked Deal.

### 17.3 Source and Evidence

~~~mermaid
stateDiagram-v2
    [*] --> UploadAuthorized
    UploadAuthorized --> Quarantined
    Quarantined --> Rejected
    Quarantined --> AcceptedSourceRecord
    AcceptedSourceRecord --> Represented
    Represented --> CoverageAssessed
    CoverageAssessed --> EligibleForExactPurpose
    CoverageAssessed --> RelianceLimited
    CoverageAssessed --> Blocked
~~~

- Quarantine acceptance creates immutable Accepted Source Object and Source Record attachments; it does not establish truth or Evidence.
- Derived Source Representations and Processing Coverage append by version/attempt.
- Rights and classification assessments can change prospective eligibility without changing earlier Job or Decision basis.
- Evidence exists only after exact locator/content/rights/coverage validation.
- Claim–Evidence Relationship acceptance does not make the Claim a Fact.
- Fact acceptance requires the exact Evidence Relationship set, absence or explicit disposition of material conflict, and a Human Decision.
- Source withdrawal, supersession, staleness, or conflict triggers Impact Assessment; prior use remains historical.

### 17.4 Analysis

For Calculation, Model, Scenario, and Analysis:

1. create or reuse stable root;
2. create immutable version with exact inputs and method;
3. execute Calculation Runs where required;
4. record deterministic checks and exact results;
5. record Analysis State assessment for stated purpose;
6. promote current pointer only through optimistic concurrency;
7. on material input change, create Impact Assessment and new version/run as required.

No recalculation overwrites a prior result. A mechanically valid result may remain professionally unusable.

### 17.5 Process

- Buyer Candidate → Banker Approval → planned Outreach Wave → actual Outreach Event are distinct.
- Interest, NDA, disclosure, Data-Room Access, Bid receipt, Bid selection, exclusivity, signing, and closing remain distinct records.
- NDA execution does not grant Data-Room Access or disclosure permission.
- Data-Room Access grant, suspension, revocation, and expiry are distinct Process Events.
- Each Bid Version remains bound to the exact Source Record and submission/receipt times used by Analysis or Recommendation.
- Selection, rejection, exclusivity, or acceptance is a Human Decision over an exact Bid Version, not a mutable Bid status.

### 17.6 Deliverable and QC

~~~mermaid
stateDiagram-v2
    [*] --> WorkingDraft
    WorkingDraft --> AnalysisReady
    AnalysisReady --> SeniorReviewReady
    SeniorReviewReady --> CirculationCandidate
    WorkingDraft --> Blocked
    AnalysisReady --> Blocked
    SeniorReviewReady --> Blocked
    CirculationCandidate --> Blocked
~~~

The diagram represents possible exact-purpose readiness assessments, not a single mutable Deliverable state machine. A later assessment can move backward or become blocked while prior assessments remain historical.

Revision lifecycle:

1. validated semantic content or exact workbook authority bindings are frozen;
2. Native Artifact is generated or an external edit is accepted through three-way comparison;
3. Reader Copies and manifest are generated where applicable;
4. deterministic and AI-assisted QC Runs execute;
5. Findings are reviewed and disposed;
6. new Revision is created for material remediation;
7. retest links original Finding to the new Revision;
8. readiness is assessed for exact purpose/audience;
9. current pointer may advance, but prior Revision status never transfers.

### 17.7 External use

~~~mermaid
stateDiagram-v2
    [*] --> CirculationCandidate
    CirculationCandidate --> DecisionRecorded
    DecisionRecorded --> DeliveryCreated
    DeliveryCreated --> RecipientAccessGranted
    RecipientAccessGranted --> ExternalUseObserved
    DecisionRecorded --> RevokedOrInvalidated
    DeliveryCreated --> RevokedOrInvalidated
    RecipientAccessGranted --> RevokedOrInvalidated
~~~

These are related records, not one status column. An External-Use Decision does not transmit content. Delivery creation does not prove access. Recipient Access does not redirect to later Revisions. Actual external use is a separate Process Event.

Internal Controlled Export follows a separate branch and does not require or create an External-Use Decision.

### 17.8 Jobs and AI

~~~mermaid
stateDiagram-v2
    [*] --> queued
    queued --> running
    running --> waiting_for_user
    running --> waiting_for_source
    running --> blocked
    running --> failed_retryable
    failed_retryable --> queued
    running --> failed_terminal
    running --> canceled
    running --> completed
    waiting_for_user --> queued
    waiting_for_source --> queued
    blocked --> queued
~~~

Accepted immutable step results survive retry, cancellation, browser refresh, worker restart, queue redelivery, and provider timeout. An AI Run ends in a validated complete/partial/abstained business outcome or a classified provider/contract/permission failure. Partial streamed tokens never become AI Proposals or domain state.

### 17.9 Deletion

Deletion immediately removes normal access, then executes recoverable physical work across primary rows, protected/quarantine objects, derived indexes, providers, recovery copies, and backup expiry. `completed` requires every required task and verification to pass. Preservation exception is an explicit alternative posture, not silent completion.

Archive and Post-Term Access are not deletion. Neither permits new substantive work or preserves Recipient Access beyond its own authorization.

## 18. Cross-domain invariants

| ID | Invariant | Database enforcement |
|---|---|---|
| DM-001 | A Deal belongs to exactly one Account and has exactly one Workspace | Tenant-bearing FK; Workspace PK `(account_id, deal_id)` |
| DM-002 | No Deal-scoped relation crosses Account or Deal | Composite FK on every Deal relationship; negative tests |
| DM-003 | A current version belongs to the same stable root and tenant | Composite root/version FK plus deferred constraint trigger |
| DM-004 | Immutable accepted material history cannot update in place | Restricted grants plus immutable-row trigger; controlled deletion procedure only |
| DM-005 | Source Material has no global current Source Record | No such column/table; exact Source Packet membership |
| DM-006 | Provenance, confidentiality, de-identification, and rights are independent | Separate checked columns/assessment tables; policy evaluator |
| DM-007 | Evidence is exact source/representation/locator identity | Composite FKs and digest/locator requirements |
| DM-008 | Evidence support/challenge is Claim-specific | Unique immutable Evidence Relationship row |
| DM-009 | Fact requires exact Claim, Evidence basis, and Human Decision | Deferred acceptance constraint/procedure |
| DM-010 | Assumption never becomes Fact | Separate tables and Decision extensions; no type mutation |
| DM-011 | Financial values are exact and semantically qualified | `numeric`, checked status/unit/period rules; no float |
| DM-012 | Process Event represents occurrence, not plan | Closed event type plus mandatory typed extension and occurred time |
| DM-013 | Bid selection/acceptance is not Bid Version mutation | Typed Human Decision extension; immutable Bid Version |
| DM-014 | Authoritative Lineage uses typed relations | No universal authoritative dependency/object table |
| DM-015 | Narrative JSONB cannot own control or financial authority | Schema validation plus mandatory typed authority links |
| DM-016 | One material Revision has one primary Native Artifact | Partial unique constraint by artifact role/readiness applicability |
| DM-017 | QC remediation cannot rewrite the original Finding | Immutable Finding; separate disposition/retest/resolution |
| DM-018 | Readiness cannot authorize external use | Separate schema/tables; exact-match command procedure |
| DM-019 | External authorization freezes Revision, artifacts, purpose, conditions, and audience membership | Immutable Scope and membership rows |
| DM-020 | Delivery/access/use are separate | Separate rows and monotonic prerequisite FKs |
| DM-021 | Recipient Access cannot become Account access | Separate Recipient identity/session and API/Gateway policy |
| DM-022 | Job authorization is exact and typed | Job Scope plus typed membership tables; expiry/revalidation |
| DM-023 | AI output cannot directly create authoritative transitions | Proposal boundary plus purpose-specific promotion transaction |
| DM-024 | Audit history is ordered per Account and daily committed | Unique sequence, previous hash, signed Checkpoint |
| DM-025 | Deletion cannot report completion with unfinished tasks | Deferred completion constraint/procedure and verification rows |
| DM-026 | Restore cannot resurrect tombstoned data | Restore verification against Deletion Tombstones |
| DM-027 | Provider evidence cannot directly create commercial authority | Inbox/Provider Event uniqueness plus purpose-specific reconciliation transaction and Entitlement Mutation constraints |
| DM-028 | Product Measurement Events cannot become domain, Audit, or telemetry authority | Separate private schema, append-only grants, versioned definition FK, and projection-only read roles |
| DM-029 | Reversible Account restrictions cannot silently preserve, revoke, or restore external reads | Typed Recipient Access Suspension causes, explicit resumption row, Access posture version and Session invalidation |
| DM-030 | Deletion status survives normal access without recreating Account authority | Minimal no-content Claimant plus short-lived exact-request Status Grant outside deletable relationship graph |
| DM-031 | Paused or Archived posture cannot receive a stale Job commit | Workspace posture version on Job Scope plus commit-time check and Archive-pending state |
| DM-032 | Online runtime code cannot bypass tenant RLS through ownership or broad credentials | Non-owner `NOBYPASSRLS` roles, forced RLS, offline migration owner and allowlisted typed procedures |

## 19. RLS and permission enforcement

### 19.1 Roles

| Principal | Database posture |
|---|---|
| Individual Banker | Product API maps Clerk session to Actor and Account; business procedures apply exact ownership, entitlement, Deal, preflight, and sensitive-action checks |
| Security Recovery Session | No database login; API recovery role establishes only exact restriction/Actor/Account context and the closed recovery procedure allowlist |
| External Recipient | No Account database role and no direct table access; Recipient API/Gateway uses exact Recipient Session and Access scope |
| Deletion Status Claimant | No database login or Account relationship; API status role uses same-identity proof and one exact short-lived Deletion Status Grant |
| Runtime Principal | Separate least-privilege database identity; Deal work additionally requires unexpired Job Scope and typed membership |
| Deployment Operator | No product content role, impersonation path, or direct Deal-row inspection authority |
| Retention/backup/audit executors | Purpose-specific identities limited to exact control tables/functions and storage operations |
| Migration owner | Deployment-only schema owner; never used by Web/API/Workers at runtime |

Every online product role is a non-owner `NOBYPASSRLS` role. Every authoritative Account- or Deal-bearing table enables and forces RLS. Table/schema ownership belongs only to offline migration or dedicated `NOLOGIN` function-owner roles; neither serves pooled product traffic. Deployment Operator, browser, human, Recipient, and provider identities receive no direct database login. Managed Supabase administrative identities are not application credentials or a product fallback.

### 19.2 Policy rules

1. Core schemas are not exposed publicly through PostgREST.
2. Browser business operations use the Product API. The only direct browser storage path is the exact quarantine Upload Session.
3. API/Gateway/Worker transactions establish verified principal mode, Actor or Runtime Principal, Account, optional Deal, session/security/posture versions, request/permission identity, and required narrow Grant through an allowlisted validating entry function and transaction-local trusted context; caller-set GUCs are not trusted.
4. Account policies require the verified Account–Actor relationship, active V1 owner posture, current security epoch, and permitted ordinary or recovery session mode.
5. Deal policies require both matching Account and Deal, eligible Workspace posture/version, and operation-specific authority.
6. Worker policies require matching Runtime Principal, unexpired Job/lease/Scope, exact operation class, current security/posture versions, and typed resource membership.
7. Result-commit procedures re-evaluate current rights, classification, preflight, cancellation, security epoch, Workspace posture version, and Job Scope before attaching accepted output.
8. Recipient content reads recheck exact Recipient, Access, suspension set/posture version, Revision, Decision, Scope, artifact, expiry, revocation, and invalidation on every request.
9. Deletion-status policies require the exact same-identity Claimant and unexpired request-scoped Grant and expose only the privacy-safe projection; they never recreate Account/Deal authority.
10. Projection policies reproduce the same tenant predicate before ranking or pagination.
11. Absence, denial, and cross-tenant mismatch return non-enumerating responses.

Security-definer functions are narrowly owned by dedicated `NOLOGIN` owners, fixed-`search_path`, fully qualify objects, revoke public execution, validate all tenant keys and caller-purpose grants explicitly, return bounded types, and receive tests for identifier substitution and cross-Deal confusion. No generic bypass function accepts arbitrary table, operation, SQL, column, object kind, or object identifier. Authorization context is transaction-local; pooled connections prove reset/discard before reuse and cross-tenant leakage tests are release-blocking.

## 20. Index and constraint strategy

### 20.1 Required indexes

- Index every foreign-key column set in its declared order.
- Deal tables begin common operational indexes with `(account_id, deal_id)`.
- Root/version tables index `(account_id, deal_id, root_id, version_ordinal DESC)` and enforce unique ordinal.
- Current pointer lookup indexes live on roots; immutable version tables do not carry mutable `is_current` flags.
- Process, source, Decision, Bid, access, retention, and audit history index applicable business time plus recorded time.
- `process.process_event` uses `(account_id, deal_id, occurred_at DESC, id)`.
- `controls.audit_event` uses unique `(account_id, sequence)` and `(account_id, recorded_at)`.
- `jobs.job_event` uses unique `(account_id, job_id, sequence)`.
- Job claiming uses a partial index over runnable internal state, due time, and priority compatible with `FOR UPDATE SKIP LOCKED`.
- One active lease per Step uses a partial unique constraint where `released_at IS NULL` and lease has not been superseded by the claim transaction.
- Idempotency and provider-event identities use unique digest/key constraints.
- Active Recipient Access, current entitlement, and current scope selection indexes are partial only where their current-row representation is authoritative and history remains in separate rows.

### 20.2 JSONB and search indexes

- GIN indexes are added only for demonstrated query paths on schema-governed JSONB.
- Deliverable semantic payload search is not a substitute for typed content-region/Lineage indexes.
- Native Locator selectors are ordinarily queried through typed source/representation/profile columns before JSON path lookup.
- FTS and pgvector live only in `projection`; both require Account/Deal equality before full-text or distance ranking.
- Embedding uniqueness includes exact source/version, fragment/locator, embedding profile/model, and derivation digest.

### 20.3 Check and exclusion constraints

- Business time intervals require `valid_until > valid_from` when both exist.
- Quantitative Measure checks enforce status/value compatibility and period/as-of contract.
- Exactly-one-extension envelopes use deferred constraint triggers or a sealed insert procedure plus verification trigger.
- Source/target rows of supersedes, corrects, reverses, current-pointer, and version relations must share tenant and root.
- Typed audience membership and exact artifact hashes cannot change after External-Use Decision commitment.
- A deletion tombstone has no FK to deletable content and rejects content-bearing columns by design.

## 21. Transaction boundaries

The following operations are single PostgreSQL transactions, excluding staged external byte/provider work that is attached afterward:

| Command | Atomic database effects |
|---|---|
| Create Deal | Deal, one Workspace, initial stage/posture history, Audit Event, Outbox |
| Open Account Security Restriction | Restriction, Account/Actor security-epoch advance, ordinary Session/Grant invalidations, Recipient Access Suspension rows/session revocations, Job-scope fences, Audit Event, Outbox |
| Clear Account Security Restriction | Exact recovery proof, Restriction closure, security-epoch advance, Recovery Session/Grant invalidation, Audit Event, Outbox; no ordinary Session or Recipient Access restoration |
| Pause Deal | Workspace activity/posture-version advance, new-claim fence, stale Job Scope invalidation, cancellation/block intent, Audit Event, Outbox |
| Archive Deal | Archive-pending record while mutating Jobs finish/cancel, then record/posture-version advance, capacity release, Audit Event, Outbox; no stale commit or automatic Recipient revocation |
| Accept uploaded source | Source Material/Record where applicable, Accepted Source Object attachment, classification/rights basis, retention entry, Audit Event, Outbox |
| Accept Fact | Human Decision, Fact, exact Evidence basis, scoped current selection, Impact Assessment intent, Audit Event, Outbox |
| Adopt Assumption | Human Decision, Assumption, exact intended scope, Impact Assessment intent, Audit Event |
| Commit calculation result | Calculation Run/results/checks, typed Lineage, state assessment, Usage settlement, Audit Event, Outbox |
| Promote new current version | Immutable version already present; current pointer and row version update; Impact Assessment/outbox intent |
| Record Process Event | Event envelope, exactly one typed extension, affected current projection intent, Audit Event, Outbox |
| Record Human Decision | Decision envelope, exactly one typed extension, scoped current selection/transition, Audit Event, Outbox |
| Create Revision | Revision, semantic/authority bindings, Artifact attachments already staged, manifest/members, Lineage, Audit Event, Outbox |
| Record QC disposition | Finding disposition, Decision where required, readiness invalidation/assessment intent, Audit Event |
| Authorize external use | Human Decision, External-Use Decision/Scope, frozen artifacts/members, Audit Event, Outbox |
| Create Recipient Access | Exact eligibility recheck, recipient-specific Delivery/package membership and object links, Access, token/challenge hashes, Audit Event; one atomic transaction and no content transmission claim |
| Suspend Recipient Access | One typed cause per affected active Access, Access posture-version advance, Recipient Session/Object Grant invalidation, Audit Event, Outbox; no revocation or prior-use rewrite |
| Resume Recipient Access | Zero-active-cause and unchanged exact binding checks, Sensitive Action Grant consumption, immutable Resumption, Access posture-version advance, Audit Event, Outbox; no expiry extension or Session revival |
| Accept Job result | Lease/Scope/current-control recheck, typed result attachment once, Step/Job state, Usage settlement, Audit Event, Outbox |
| Accept deletion | Deletion Request/Scope, immediate access lock/revocations/cancellations, retention/deletion tasks, minimal Deletion Status Claimant and initial short-lived Grant, Audit Event, Outbox |

Provider or object-store operations use a prepare/attach pattern. External side effects never become authoritative until the database attaches their immutable identity under the current command contract.

## 22. Deletion and foreign-key policy

Deletion proceeds in dependency order defined by an implementation-owned deletion plan generated from this model. The plan must:

1. freeze exact domain, object, projection, provider, recovery, and backup scope;
2. revoke access and stop new work before content removal;
3. preserve required control identities until each task can be located and verified;
4. remove or cryptographically render inaccessible accepted content and derivatives;
5. delete search/vector/cache/provider copies;
6. schedule and verify recovery/backup expiry;
7. remove remaining identifying relational content;
8. retain only authorized minimal billing/security/legal records and Deletion Tombstone;
9. prove that restore does not reintroduce the scope.

Foreign-key defaults:

- `ON DELETE RESTRICT` for material history, cross-aggregate relationships, Decisions, Lineage, authorization, audit, retention, and version roots;
- controlled cascade only inside exclusively owned technical leaf structures after scope capture, such as proposal omissions or a not-yet-accepted staging batch;
- `SET NULL` only where the remaining record is intentionally meaningful and non-identifying without the optional origin link;
- no cascade from Account or Deal that can outrun object/provider deletion and tombstone creation.

## 23. Migration and rollout order

1. Create private schemas, migration owner, runtime roles, fixed helper functions, and canonical check-contract generation.
2. Create `identity`, Account/Actor mappings, Runtime Principals, and tenant key conventions.
3. Create `commerce`, `deal`, and one-Workspace constraint.
4. Create `object_store` and `source`, including quarantine, protected-object attachment, classification, rights, and packets.
5. Create `knowledge`, including locator/Evidence/Claim/Fact/Decision exact-extension constraints.
6. Create `analysis` and its typed Lineage tables.
7. Create `process`, Deal-local Party extensions, Bid versions/terms, and typed Process Events.
8. Create `deliverable`, semantic-contract payload validation, artifacts, Review/QC, and readiness.
9. Create `external_use` and exact-scope matching procedures.
10. Create `jobs`, `integration`, `notification`, and `ai`, including typed Job Scope, durable Webhook Inbox/call attempts, Notification delivery, and proposal promotion paths.
11. Create `controls` and `measurement`, including audit chain, retention, deletion, restore tombstone checks, versioned Product Measurement Definitions, and append-only event grants.
12. Create `projection` and measurement-projection tables and rebuild workers only after authoritative relations exist.
13. Apply RLS, revoke default/public privileges, grant least privilege, and verify every security-definer function.
14. Add indexes after representative Reference Deal query plans are measured; required uniqueness and FK-supporting indexes are part of the originating migration.
15. Run the complete schema verification and destructive restore/deletion drill before the Confidential pilot gate.

Forward migrations never rewrite accepted historical rows merely to adopt a new contract. Backfills write explicit derived/versioned records with origin and migration identity. A field whose old meaning is ambiguous remains explicitly unknown or requires a controlled remediation; it is not guessed.

## 24. Verification matrix

| Area | Required verification |
|---|---|
| Tenant isolation | Cross-Account and cross-Deal inserts, updates, joins, FTS, vector queries, object reads, Job claims, and Recipient reads all fail without revealing existence |
| Composite FKs | Bare UUID substitution cannot create a relationship to another tenant or Deal |
| One Workspace | A second Workspace row for one Deal fails |
| Immutability | Update/delete of accepted Source Record, Evidence, Fact, Decision, Process Event, Version, Review, Finding, Run, Audit Event, and External-Use Event fails outside controlled deletion |
| Versions | Duplicate ordinal, cross-root current pointer, cross-tenant supersedes, and implicit authorization carry-forward fail |
| Time | Business-effective and recorded times remain distinct in source, event, Decision, Bid, rights, retention, and access fixtures |
| Quantitative values | Float input is rejected/normalized at API boundary; missing currency/unit/period/sign/definition fails applicable contracts |
| Classification | Provenance, confidentiality, de-identification, and rights combinations gate independently; downgrade without evidence/Decision fails |
| Evidence | Run-scoped fragment cannot be used outside its AI Run; unresolved locator or wrong digest cannot create accepted relationship |
| Fact | Fact without accepted Claim, supporting relationship basis, conflict posture, exact scope, or Human Decision fails |
| AI authority | AI Proposal cannot write Fact, Decision, Process Event, readiness, authorization, or side effect directly |
| Process | Planned outreach/milestone/recommendation cannot create occurrence; each Process Event has exactly one typed extension |
| Bid | New submission creates Bid Version; selection/withdrawal cannot mutate an earlier Version |
| Lineage | Projection loss/rebuild preserves identical typed dependency closure; projection-only edge cannot satisfy an authority check |
| Deliverable | Narrative payload validates exact closed schema; unknown fields fail; workbook cached value cannot replace Calculation Result |
| Artifact | Materially changed Native Artifact requires new Revision; Native/Reader hashes and manifest membership remain exact |
| QC | Fix creates new Revision/retest; original Finding remains on original Revision; improper Critical dismissal fails |
| Readiness | QC pass cannot imply Professional Usability or circulation; current assessment is exact-purpose bound |
| External use | Changed Revision/hash/member/purpose/channel/time/condition or invalidated Decision blocks delivery/access; prior use remains historical |
| Recipient | Recipient session cannot enumerate Deal, other Recipients, Revisions, artifacts, or Account routes; suspension blocks every read/session/range, explicit resumption requires unchanged scope, and download remains unavailable |
| Security recovery | Restriction entry invalidates ordinary authority; Recovery Session can call only its content-free allowlist; clearance restores no prior Session, Grant, Job Scope, or Recipient Access |
| Job recovery | Queue redelivery, worker crash, expired lease, browser retry, cancellation, provider timeout, Pause fence, and Archive-pending transition create no duplicate or post-boundary accepted effect |
| Usage | Reservation commit/release is mutually exclusive and reconciles to append-only ledger/entitlement |
| Provider reconciliation | Duplicate, reordered, stale, ambiguous, and replayed provider evidence creates at most one exact commercial/security effect; browser return and operator replay grant nothing |
| Notification | Preferences, Notification uniqueness, same-key retry before the 24-hour provider boundary, terminal ambiguity after that boundary, append-only provider delivery events, suppression, and reordered delivery events produce no duplicate message intent or product action and contain no Deal content |
| Product measurement | Definition/version/deduplication constraints hold; replay reproduces projections; client candidates and privacy canaries cannot create authority or prohibited content |
| Audit | Account sequence and hash chain verify; deletion/correction cannot mutate committed events; Checkpoint signature verifies |
| Deletion | Immediate access loss, exact Claimant identity, short-lived status-only Grant, partial-task recovery, primary deletion, provider/index cleanup, backup expiry, 30-day receipt closure, claimant removal, minimal tombstone, and no-resurrection restore all pass |
| Projection | Projection removal affects convenience only; full rebuild from authority succeeds and obeys retention/RLS |
| Database roles | Every online role is non-owner/`NOBYPASSRLS`, tenant tables force RLS, pooled context does not leak, public/definer grants are narrow, and migration-owner credentials cannot serve runtime traffic |

## 25. Required Reference Deal fixtures

The complete synthetic Sell-Side Auction fixture must cover:

- one Account and named Individual Banker;
- two Active Deal-capacity behavior and one archived/reactivated Deal;
- exact Deal identity and backward stage transition;
- Source Material with multiple Source Records and one Web Evidence Observation;
- independent classification/rights changes and Targeted Re-Preflight;
- Source Packet versions with add/remove/withdraw history;
- resolved and unresolved Native Locators, supporting/challenging Evidence Relationships, conflict, Fact, and Assumption;
- Calculation versions/Runs, Model, Scenarios, Analyses, Recommendation, and material Impact Assessment;
- Deal Parties, Buyer Candidates/Approvals, Outreach, NDA, Data-Room Access evidence, multiple Bid Versions, selection/exclusivity, signing or termination;
- narrative Deliverable Semantic Content and both required workbook spines;
- immutable Revisions, Native Artifacts, Reader Copies, manifests, external edit/reimport conflict, Reviews, QC Findings, remediation, and retest;
- Package Snapshots and independent readiness;
- Internal Controlled Export;
- External-Use Decision with frozen recipients, Delivery, Recipient Access, actual use, invalidation, and attempted cross-Revision reuse;
- Job retry/cancel/recovery, AI complete/partial/abstained/failure paths, and exact Proposal promotion;
- entitlement/usage reservation reconciliation;
- audit verification, archive, Post-Term restriction, deletion tasks, tombstone, backup expiry, and no-resurrection restore.

## 26. Explicit non-models

The first sellable release deliberately does not introduce:

- Team organizations, shared Deal memberships, granular banker roles, approval routing, or shared credentials;
- an Account-wide or global Party/CRM master;
- cross-Deal template promotion from live Deal history;
- generic domain-object, EAV, universal value, universal analytical object, or authoritative polymorphic dependency tables;
- full Event Sourcing or universal bitemporal tables;
- mutable accepted Source Records, Human Decisions, Process Events, Deliverable Revisions, Findings, or external-use history;
- a global `ready`, `approved`, `current source`, `AI enabled`, or `externally usable` flag;
- live email, CRM, VDR, market-data, or document-repository synchronization authority;
- autonomous external sending, Buyer contact, Bid acceptance, access grant, filing, or transaction execution;
- cross-customer search, vector, prompt, template, training, or evaluation corpora;
- opaque file bytes as the only semantic authority for a Model, auction process, or narrative Deliverable Revision.

## 27. Completion criteria for implementation

The Data Model is implemented only when:

1. forward SQL migrations create every required authority boundary and invariant;
2. generated schema documentation and ERDs match the migrations;
3. all tenant-bearing foreign keys and RLS negative tests pass;
4. immutable/history/current-pointer tests pass;
5. exact AI Proposal promotion and External-Use matching tests pass;
6. the complete Reference Deal persists, reloads, compares, exports, archives, restores, and deletes without semantic loss;
7. projection rebuilds produce correct current views without becoming authority;
8. audit-chain, retention, deletion, and restore tombstone verification pass;
9. query plans meet the confirmed release envelope on the minimum production profile;
10. no production table or payload contradicts `CONTEXT.md` or an accepted ADR.
