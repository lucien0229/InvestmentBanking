# Domain Context

## Independent Product

A standalone, monetizable product through which overseas users can access Investment Banking workflows without needing to use the official OpenAI Investment Banking plugin directly.

## Official Capability Baseline

The core user-facing workflows and value demonstrated by the official OpenAI Investment Banking plugin. It is the minimum product reference, not a competitor, a market-size proof, or a boundary that the Independent Product must avoid.

## Productization

Turning the Official Capability Baseline into an Independent Product. The open decisions are what product to make and how to make it valuable and monetizable; whether to make a product is not an open decision.

## Productization Gain

Value added beyond the Official Capability Baseline through a better product experience, persistent workflow, automation, collaboration, controls, integrations, or other product-level improvements. A Productization Gain does not need to be absent from competing products.

## Founder Operating Envelope

The confirmed founder resources, non-delegated responsibilities, operating constraints, and deliberately unconstrained variables that the Productization Blueprint must respect. It guides product design and sequencing but is not a go/no-go test.

## Self-Serve Purchase

A purchase path through which an individual banker or an institutional team can discover, evaluate, buy, onboard, and use the Independent Product without mandatory offline sales or implementation assistance.

## Actor

The durable product identity of an Account-side human whose authenticated actions can be attributed inside the Independent Product; in V1 the Account's named Individual Banker is its Actor. An Actor is not an authentication-provider identity, Account, permission, External Recipient, Deployment Operator, or Runtime Principal. A temporary identity-recovery posture restricts the Actor without ending this durable identity; permanent disablement or termination of its Account-owner relationship denies future Account authority and revokes Recipient Access for which no accountable Account-side Actor remains.

## Account Security Restriction

A temporary product-owned security posture applied while an Account, its Actor, authentication linkage, or ownership continuity is under recovery or verification. It suspends every active Recipient Access in the Account and invalidates affected human sessions and grants without rewriting durable Actor, Decision, Access, or Audit history. While restricted, Account-side authority is available only through a Security Recovery Session. Clearing the restriction never restores prior human sessions, grants, or external read access automatically.

## Security Recovery Session

A purpose-bound human session with an absolute lifetime no longer than 15 minutes that exists only to resolve an Account Security Restriction. It may expose privacy-safe restriction status, prove authentication and ownership continuity, recover credentials, invalidate the same Actor's other sessions or unused grants, show identifiers and counts of suspended Recipient Access without Deliverable content, and submit the exact command that clears the restriction. It grants no Account or Deal content read, search, export, billing, capacity purchase, deletion, lifecycle mutation, Job, Source, Evidence, Revision, Decision, delivery, or Recipient Access creation, modification, or resumption authority. Clearing the restriction requires a new ordinary login and any suspended Recipient Access still requires explicit Recipient Access Resumption.

## Account

The durable tenant, commercial, and data-ownership boundary through which one Individual Banker holds Product Entitlements and Deal Workspaces in V1. An Account is not an authentication-provider identity and does not imply Team membership or organization governance.

## AI Provider Route

The deployment-managed route through which product AI work reaches the fixed HelloX base URL using an environment-specific platform credential. An AI Provider Route is not configurable by an Account or Individual Banker and does not by itself establish model compatibility or permit a particular class of Deal Material to be processed; both require the applicable AI Provider Capability Profile and Paid Preflight scope.

## Sensitive Action Grant

A short-lived, single-use product authorization issued after fresh strong authentication and bound to one authenticated session, Actor, action, exact resource, reviewed command identity, current preconditions, and expiry. It permits only the exact sensitive mutation for which it was issued, is consumed only with that accepted mutation, and is not a reusable role, session, or general elevation of Account authority.

## Deployment Operator

An authenticated technical principal permitted to deploy, observe privacy-safe runtime metadata, restart or isolate processing, rotate platform credentials, and execute tested infrastructure recovery procedures. A Deployment Operator is not support personnel, an Account member, an Individual Banker, or an External Recipient and has no product path to inspect or act upon Deal Material.

## Recovery Replay

A content-blind re-execution of the product-owned processing contract for one existing immutable Inbox Event, Outbox row, or Job identity that still has an exact replayable persisted input, under current authorization, version, and idempotency checks. Where that input is unavailable, the exact identity may permit Provider Reconciliation from a current provider object but not Recovery Replay. Neither path can alter persisted evidence, select a business result, create provider evidence, or grant human, commercial, external-use, or deletion authority merely because a Deployment Operator triggered it.

## Runtime Principal

A non-human, separately credentialed product component permitted to perform only its declared control-plane, dispatch, processing, signing, retention, or backup responsibilities. A Runtime Principal is not an Account member or Deployment Operator, does not inherit another component's authority, and must bind Deal work to a database-issued Job Scope rather than use an unrestricted shared service credential.

## Product Entitlement

An Account's commercial permission to use a purchased product capability, capacity, or paid term. Product Entitlement does not establish rights to use Source Material, Professional Usability, or external-use authorization.

## Entitlement Mutation

An append-only product-authoritative change to one exact Product Entitlement's paid term, capability, or capacity under a stated Commercial Receipt, Refund Effect, expiry, or reconciliation reason. An Entitlement Mutation cannot be created directly by a provider event, redirect, operator replay, analytics event, or mutable subscription projection.

## Commercial Receipt

An immutable product record that one exact payment, invoice, refund, credit, tax adjustment, or other monetary effect was verified and reconciled against a Checkout Order or prior receipt. A Commercial Receipt records commercial evidence but does not create or revoke Product Entitlement unless a matching product-owned Entitlement Mutation or Refund Effect authorizes that exact consequence.

## Provider Reconciliation

The idempotent product process that evaluates a verified provider event and, where required, an authenticated current-provider-object lookup against existing product state before recording an exact domain effect. Provider Reconciliation treats provider data as evidence, detects repeated delivery, preserves immutable out-of-order evidence, and never makes a callback, redirect, provider status, queue message, or operator action product authority by itself.

## Billing Recovery

The temporary commercial posture after a scheduled renewal payment is not confirmed while an already-paid term remains current or Provider Reconciliation is pending. Billing Recovery never extends the paid-through boundary or grants new capacity; successful reconciliation restores the applicable remaining entitlement, while an unresolved failure at the paid-through boundary begins Post-Term Access.

## Payment Dispute

The durable product record of a chargeback or other provider-reported challenge to an exact payment, including its current reconciled posture and resulting Product Entitlement restrictions. An open Payment Dispute preserves Account-owner inspection, Internal Controlled Export, billing recovery, and deletion while suspending new substantive processing, capacity purchases, External-Use Decisions, Externally Authorized Deliveries, and new Recipient Access; it also places every already-active Recipient Access under Recipient Access Suspension and does not claim to prevent product-external use. A won or reversed dispute restores only the applicable remaining Product Entitlement and never external read access automatically; each otherwise-still-valid Access requires an explicit Recipient Access Resumption. A lost dispute or Refund Effect that ends the paid term enters Post-Term Access, where all Recipient Access is revoked under the existing contract.

## Recipient Access Suspension

A temporary product restriction that denies every prospective read through an otherwise retained Recipient Access and invalidates its Recipient Sessions and session-bound stream grants without rewriting the Access, its External-Use Decision, or prior External-Use Events as revoked. It applies during an open Payment Dispute or Account Security Restriction. Suspension creates no right to resume automatically; expiry, invalidation, revocation, deletion, paid-term termination, and permanent loss of an accountable Account-side Actor remain independent permanent or terminal access conditions.

## Recipient Access Resumption

An explicit Individual Banker command that re-enables one exact suspended Recipient Access only after the suspension cause has cleared and the product revalidates its unexpired Access, unchanged Recipient, exact Revision, matching External-Use Decision, purpose, conditions, confidentiality boundary, and current entitlement. It consumes a Sensitive Action Grant and appends an auditable result; it never extends expiry or revives a prior Recipient Session, so the External Recipient must verify mailbox control again. If any bound condition no longer holds, the old Access cannot resume and a new Recipient Access is required.

## Capacity Offer

A versioned commercial offer for one exact increment of Active Deal, processing, storage, or archive capacity, including price, term, effective-time rule, eligibility, and capacity effect. A Capacity Offer does not grant capacity until a matching Checkout Order is completed and reconciled into Product Entitlement.

## Checkout Order

The durable product record of one exact proposed purchase, including term, price, add-ons, amount due, renewal, tax posture, cancellation, refund, and Guarantee contract plus its current Order, Terms, Payment, or Confirmation step. A payment-provider session or redirect is not the Checkout Order and cannot by itself create Product Entitlement.

## Checkout Terms Acceptance

An immutable acknowledgement by the Account's Actor of the exact version and digest of the commercial terms displayed for one Checkout Order before payment. A material change to price, term, add-ons, renewal, cancellation, refund, Guarantee, or tax posture requires a new acceptance.

## Guarantee Refund Request

A durable self-serve request to evaluate one exact first-purchase payment and Deal control-loop history under the versioned First-Deal Control-Loop Guarantee. It becomes eligible or ineligible only through the deterministic Guarantee Assessment and does not itself prove refund eligibility or payment-provider completion.

## Refund Effect

The deterministic product record mapping one reconciled refund or credit Commercial Receipt to the exact prior receipt, Product Entitlement, or capacity mutation it reverses and to its closed entitlement consequence. A duplicate-charge correction, tax-only adjustment, provider refund status, or unmapped refund cannot terminate an otherwise valid paid term merely because money moved at the provider.

## Referral Link

A privacy-safe public referral capability issued only after the Account reaches the required product milestone and containing no Deal identity, Deal content, Recipient authority, or Account session authority. It can attribute a later qualifying purchase but cannot grant a referred-buyer discount or create Referral Credit before the confirmed eligibility events occur.

## Usage Ledger

The authoritative append-only commercial record of capacity granted, reserved, committed, released, expired, or adjusted for an Account, Active Deal, billing period, and defined allowance class. It reconciles to Product Entitlements and provider events but is not replaced by a Stripe balance, AI token count, Job count, or analytics event.

## Usage Reservation

A provisional hold against an exact available allowance for one authorized Job or command before expensive work begins. It becomes committed only on the defined commercial consumption event and is released when canceled or failed work did not consume the promised allowance; it cannot create capacity that the Product Entitlement does not grant.

## Full-Workflow Operation

The commercial unit consumed by a complete Source Packet ingest or re-ingest, a full Controlled Auction Execution Package build, or a material cross-artifact Revision or refresh. Targeted correction, ordinary QC, review, and failure recovery are not Full-Workflow Operations, and the product shows the applicable classification before reserving allowance.

## Operation Preview

A short-lived, immutable commercial-control record showing the allowance classification, exact quantity, available-capacity effect, price or blocker posture, and consent digest for one proposed Account- or Deal-scoped command and its exact dependencies. An Operation Preview authorizes no work and reserves no allowance; the accepting command must revalidate it before creating a Usage Reservation.

## Paid Preflight

The post-purchase control gate that determines whether an exact Deal, intended use, Source Packet, confidentiality posture, and processing path may enter substantive product work. Passing Paid Preflight establishes eligibility to proceed, not source truth, Professional Usability, or external-use authorization.

## Limited Proceed

A Paid Preflight outcome that permits an explicitly bounded scope of substantive Deal work while preserving the Output Ceiling and every excluded or blocked action. It becomes operative only after the Individual Banker accepts the permitted scope and does not convert an unresolved hard gate into a warning.

## Targeted Re-Preflight

A repeated Paid Preflight evaluation limited to the control dimensions affected by a changed Deal use, audience, Source Record, rights or confidentiality posture, processing path, compatibility condition, or expired basis. It blocks only affected prospective work where safe continuation is possible and preserves prior history without extending old authorization to the changed scope.

## Premium Product Value

Sufficient workflow and outcome value to justify a high price regardless of whether the buyer is an individual banker or an institutional team. Premium Product Value is determined by the importance and completeness of the work accomplished, not by requiring enterprise procurement or adding a large number of disconnected features.

## Individual Banker

A professional who can independently buy and use the Independent Product for their own transaction work, even when they work inside a larger institution. An Individual Banker may later bring a Deal or workspace into a team account.

## Banker Control Boundary

The boundary under which AI may execute and inspect Investment Banking work while the Individual Banker owns material assumptions, professional judgment, and external use. The Independent Product does not supply human banker review.

## Individual-First Release

The first sellable version of the Independent Product, optimized for an Individual Banker to complete the core Investment Banking work through Self-Serve Purchase. It preserves a future path to team accounts but does not require advanced collaboration, permissions, approval routing, or organization administration.

## First Deal Guide

The recoverable mode within a Deal Workspace that sequences the controls required for an Individual Banker to reach First Unmistakable Value, create the first permitted Internal Controlled Export, and explicitly graduate from guided first use. It remains available after graduation and is not a separate onboarding product or source of Deal state.

## Deal Setup

The recoverable control flow through which an Individual Banker establishes a Deal's identity, Paid Preflight posture, authority boundary, initial Source Packet, and Work Objective. Every Deal completes Deal Setup; the First Deal Guide provides expanded guidance for the initial Deal without changing these controls.

## First Unmistakable Value

The first completed control loop in which an Individual Banker inspects exact Evidence, records the required typed Human Decision or correction, completes applicable deterministic validation, and sees the affected Deliverable, Revision, QC, Package Readiness, or authorization consequence. File upload, AI generation, or artifact preview alone does not qualify.

## Synthetic Proof Session

A short-lived, bounded anonymous session for Project Northstar that exercises the production command schemas, domain handlers, state transitions, deterministic controls, and recovery behavior against a fixed synthetic Account and rights-cleared fixture. It cannot accept real Deal Material, invoke live Deal providers, create payment or Recipient authority, or establish production capability merely because the synthetic loop succeeds.

## Deal Execution Desk

The persistent operating mode of a Deal Workspace after the Individual Banker completes the First Deal Guide graduation conditions, where the Banker continues Sell-Side Auction work, responds to Deal events, controls the Execution Package, and preserves immutable Revisions and Decisions. First Unmistakable Value alone does not complete graduation; the first permitted Internal Controlled Export and explicit entry are separate required milestones.

## Core Business Workflow

The substantive Investment Banking work that turns deal inputs into evidence-backed analysis, judgment, models, and banker-ready deliverables. Account administration and organization governance are not part of the Core Business Workflow.

## Initial Design ICP

An execution-oriented Individual Banker working at an overseas boutique investment bank, small or midsize M&A advisory firm, or independent transaction advisory practice who can independently purchase software and decide how it is used for live deal work. The Initial Design ICP guides the Individual-First Release without permanently limiting later customer segments.

## Deal

A durable Investment Banking transaction mandate defined by the client or represented party, transaction subject and perimeter, banker role or side, and mandate objective. It remains the same across stages, revisions, pauses, restarts, and execution-path changes unless one of those identity-defining elements materially changes.

## Sell-Side Auction

The primary business process within a Deal through which a seller and its banker prepare, market, and execute a competitive sale. Limited outreach, bilateral negotiation, or exclusivity remains within the same Deal when the Deal's identity-defining elements have not materially changed.

## Deal Workspace

The persistent authoritative working context for one Deal, including its current and historical source materials, evidence, judgments, analysis, process state, deliverables, decisions, and unresolved work. Official Capability Baseline workflows operate within the same Deal Workspace rather than creating disconnected tools or competing sources of truth.

## Active Deal Workspace

A Deal Workspace in an operational posture that permits new Source Records, material Analysis or package work, new Revisions, and Package Readiness advancement. An Archived Deal Workspace is not Active and must be reactivated before those activities resume.

## Preflight-Restricted Deal Workspace

An authoritative Deal Workspace that preserves Deal identity, the truthful current Deal Business Stage, and Paid Preflight progress but cannot receive or substantively process Confidential or Restricted Deal Materials. It does not consume Active Deal capacity until the permitted scope grants substantive processing capability.

## Controlled Sell-Side Auction Deal Book

The governed current execution view within a Deal Workspace that brings together the information, analysis, process state, deliverables, decisions, readiness, and blockers applicable to the Sell-Side Auction. It is a revisioned business outcome rather than a separate workspace, a single file, or an assertion that everything it contains is approved for external use.

## Controlled Auction Execution Package

The versioned family of applicable Sell-Side Auction Deliverables, Native Artifacts, Reader Copies, evidence and control records, readiness state, and archive/export records maintained within the Controlled Sell-Side Auction Deal Book. Completeness is evaluated against the Deal's current stage and stated scope and does not itself authorize external use.

## Package Snapshot

An immutable, identifiable freeze of the exact Deliverable Revisions, applicable control records, readiness basis, omissions, and manifest included in a Controlled Auction Execution Package at a stated time. A later Package Snapshot may become current but never rewrites an earlier Snapshot or extends an earlier External-Use Decision to changed content.

## Package Readiness

The governed current view of the applicable objects, independent states, blockers, and next controlled actions across a Controlled Auction Execution Package. It aggregates but does not collapse Source Reliance State, Analysis State, Deliverable Readiness, Process State, QC Findings, Human Decisions, or exact-Revision external-use posture, and it does not itself approve or authorize use.

## Output Ceiling

The scope-specific assessment of the highest honest work and use permitted by the current Source Packet, source rights, confidentiality, parsing coverage, Evidence, conflicts, deterministic results, and required Human Decisions. It identifies permitted and prohibited work, applicable blockers, and the smallest recovery action rather than reducing the Deal Workspace to one global readiness level.

## Source Material

The stable Deal-scoped identity of original business content received, obtained, or recorded for a Deal, such as a document, workbook, message, meeting record, data-room item, data export, public filing, or market-data observation. Its successive receipts, versions, or point-in-time observations are distinct Source Records; filename, digest similarity, or AI inference alone cannot establish that records share one Source Material identity. A product-generated extraction, normalization, summary, or inference is not Source Material.

## Deal Material

Any non-public content, record, artifact, or derived work associated with a Deal, including Source Material and content produced from it. Deal Material retains the applicable rights and confidentiality constraints as it is transformed or incorporated into later work.

## Material Provenance Class

The distinction between Synthetic Material created without live customer content and Real Material originating from an actual person, organization, transaction, or source. De-identifying Real Material does not make it Synthetic Material.

## Confidentiality Class

The independent sensitivity classification of material as Public, Internal, Confidential, or Restricted. Confidentiality Class does not establish whether the material is synthetic, de-identified, truthful, rights-cleared, or eligible for a particular processing path.

## De-identification Posture

The evidence-backed assessment of whether Real Material has been transformed and verified to reduce identification risk for a stated scope. De-identification does not make material synthetic, public, rights-cleared, or automatically eligible for reuse, AI processing, or disclosure.

## Material Classification Assessment

An immutable, scope-bound record of the evidence, policy, and applicable Human Decision supporting material's effective Material Provenance Class, Confidentiality Class, and De-identification Posture at a stated time. A later assessment may change prospective processing or use but never rewrites the classification basis used by an earlier Job, Decision, delivery, or External-Use Event.

## Protected Deal Object

An immutable, application-encrypted byte representation of Deal Material stored outside the transactional database, including an Accepted Source Object, derived representation, Native Artifact, Reader Copy, controlled export, or other retained file object. Its encryption envelope, tenant scope, lineage, and retention posture travel with the object, while encryption does not establish source truth, Professional Usability, approval, or external-use authorization.

## Protected Account Object

An immutable, application-encrypted byte representation attached through a typed Account-level relationship, such as a separately supplied Account Reusable Template, retained invoice copy, or Account Data Export. It uses the same protected-object encryption and streaming boundary as a Protected Deal Object but has no implied Deal scope, cannot be attached through a generic polymorphic relation, and cannot be used to move live Deal Material into a reusable template.

## Protected Object Stream Grant

A short-lived product authorization issued after the control plane verifies an exact human session, one exact Protected Deal Object or Protected Account Object, the applicable Revision or immutable Account attachment, purpose, and current access posture. It permits the Protected Object Gateway to stream only those exact bytes for that scope and is not a reusable object URL, Deal permission, download authorization, External-Use Decision, or proof of actual external use. Active revocation of its bound session or access posture invalidates every still-live Grant and stops prospective bytes at the next bounded authorization checkpoint; bytes already released cannot be recalled, while natural expiry alone does not retroactively invalidate a response already accepted for streaming.

## Protected Stream Access Receipt

An immutable, idempotent data-plane record that the Protected Object Gateway began, completed, or failed an authorized stream for one exact Stream Grant, principal, Protected Deal Object or Protected Account Object, applicable Revision or immutable Account attachment, purpose, and byte range at a stated time. The control plane uses the first qualifying Reader Copy first-byte receipt to create the observable External-Use Event; the receipt itself is not that Event, does not expand authorization, and cannot record another domain mutation.

## Confidential Deal Material

Non-public Deal Material that requires Deal isolation, encryption, controlled processing, and audited export and deletion. It is the default classification for a non-public Deal upload unless a stricter classification applies.

## Restricted Deal Material

Deal Material subject to the strongest recorded source, audience, processing, or retention constraints, such as customer-level data, sensitive commercial detail, employee data, unannounced transaction information, or clean-team material. It may use only a processing path compatible with those exact restrictions.

## Quarantined Upload

An uploaded byte object held outside substantive parsing, rendering, AI, preview, and accepted Source Material paths while its integrity, type, malware, archive, active-content, rights, and processing eligibility are evaluated. A Quarantined Upload cannot become Evidence or support downstream work, and an incomplete safety assessment fails closed rather than being treated as clean.

## Accepted Source Object

An immutable, content-addressed Protected Deal Object that has passed the applicable upload safety, rights, classification, and compatibility gates and is attached to an exact Source Record. Acceptance permits only the recorded processing scope and does not establish source truth, Evidence, Professional Usability, or external-use authorization.

## Upload Session

A short-lived, Account-, Actor-, purpose-, batch-, and object-path-bound authorization created before bytes may be written to the quarantine boundary. Deal Material sessions are additionally bound to one Deal; the only V1 Account-only file purpose is a separately supplied Account Reusable Template outside live Deal history. An Upload Session limits the declared count, size, media posture, expiry, and immutable destination and does not accept an uploaded object as Source Material or template, or grant permission to overwrite, enumerate, parse, preview, or process other objects.

## Source Record

The immutable Deal Workspace provenance record for one specific receipt, version, or point-in-time observation of exactly one Source Material, including its origin, date, scope, location, authority, confidentiality, and reliance posture. A later version creates a new Source Record rather than replacing prior history, and work binds the exact applicable Source Record rather than a globally current record.

## Source Representation

An immutable byte, normalized, extracted, rendered, or OCR-derived representation bound to one exact Source Record, content digest, engine and parser identity, and Processing Coverage. A derived Source Representation assists inspection and processing but is not new Source Material, Evidence, or a replacement for the original representation.

## Web Evidence Observation

An immutable Source Record created by one permitted retrieval of a public, unauthenticated HTTPS resource, binding the canonical URL, retrieval time, response and content identity, Rights Posture, capture mode, parser identity, and applicable Native Locators. A later retrieval creates a new Web Evidence Observation and Impact Assessment rather than refreshing or overwriting the earlier observation; when rights prohibit a retained snapshot, the observation records only the permitted citation context and its live-only or snapshot-prohibited limitation.

## Rights Posture

The explicit permission status governing whether and how a Source Record may be received, processed, relied upon, retained, exported, or used for a stated purpose. Rights Posture is independent of source truth, freshness, conflict, and Source Reliance State.

## Source Packet

A banker-controlled collection of Source Records selected for a stated Deal purpose, stage, or decision scope. Inclusion defines the source perimeter but does not make the included content true, current, unconflicted, or authorized for external use.

## Work Objective

The Individual Banker's authorized question, Deliverable, Analysis, or process scope to be completed from a stated Source Packet for a stated Deal purpose. It defines the bounded work to perform and its Output Ceiling rather than selecting an AI tool or implying that the requested outcome is achievable.

## Job

A durable, recoverable execution of one authorized product command through dependency-ordered steps, attempts, leases, and idempotent side effects. A Job exposes the confirmed user-facing lifecycle states and preserves accepted immutable results, failures, cancellation, and recovery history without implying that queue delivery itself occurred exactly once.

## Job Step

A dependency-ordered, bounded unit of work within a Job with declared inputs, permitted operation class, resource and timeout limits, completion contract, and retry posture. Completion of a Job Step records its exact accepted result but does not itself authorize a product-domain transition outside the Job's current scope.

## Job Attempt

One immutable execution record for a Job Step under an exact Runtime Principal, Job Scope, lease, engine or provider identity, configuration, start and end time, outcome, usage, and failure classification. A retry creates a new Job Attempt rather than overwriting the earlier failure.

## Job Event

An immutable, monotonically sequenced, privacy-safe notification of a user-visible Job transition, progress change, failure, or recovery action. Job Events support authorized replay and live notification but do not replace the current Job state, the more detailed Job Attempt history, or the underlying domain objects produced by the Job.

## Job Scope

A short-lived database-issued authorization binding one Runtime Principal and claimed Job to the exact Account, Deal, permitted object set, operation classes, Workspace posture version, and expiry required for that execution. A Job Scope does not grant Deal membership, general tenant access, or authority beyond the Job and must be revalidated when a worker commits a result. Pausing or archiving the Deal fences new claims and invalidates any Scope whose posture version is no longer current, so already-running work cannot commit a new domain result across that boundary.

## Idempotency Key

A client-supplied identifier bound to one Account, Actor, command type, and canonical request identity so that safe repetition returns the original result rather than creating a duplicate business effect. Reusing the key for a different request is a conflict, and idempotency does not imply exactly-once queue delivery or permission to bypass current authorization checks.

## Capability Manifest

The versioned product record that states the input, artifact, application, processing, rendering, export, and round-trip capabilities verified for a specific product version, together with their applicable limits and known constraints. It defines the published support boundary but does not establish that a particular Source Record or Source Packet is safe, authorized, or compatible.

## AI Provider Capability Profile

The versioned result of synthetic contract probes and reviewed provider disclosures for an AI Provider Route, including supported API profile, models, structured-output behavior, limits, error semantics, usage reporting, processing region, retention, training, and access posture. It records verified and provider-asserted properties separately and cannot be inferred from an OpenAI-compatible label or a successful authentication request.

## AI Evidence Policy

An immutable, versioned rule set that defines when each material proposition in an AI Proposal requires an Evidence Candidate, how support, challenge, conflict, omission, and insufficient coverage must be represented, when an AI Run must abstain, and which results may enter deterministic validation. An AI Evidence Policy cannot make a Claim true, waive source rights, or replace a Human Decision.

## AI Task Definition

An immutable, versioned contract for one bounded class of AI work, including its product and domain instructions, permitted Material Provenance Classes, Confidentiality Classes and De-identification Postures, input and output contracts, Evidence requirements, provider capability dependency, resource limits, prohibited behavior, and applicable evaluation suite. An AI Task Definition does not grant Deal-wide autonomy or permit the model to select its own tools, data scope, or business side effects.

## AI Task Family

A non-executable classification that groups AI Task Definitions with the same bounded proposal responsibility for design, evaluation, and reporting. An AI Task Family does not own an open output union, authorize a workflow, or permit one AI Run to perform multiple concrete Task Definitions.

## AI Prompt Package

An immutable, English, compilable bundle for one exact AI Task Definition version that binds the non-overridable product authority policy, bounded task and domain instructions, AI Evidence Policy, input and output contracts, AI Context Plan, rights-cleared examples, evaluation manifest, and reviewed official-workflow references. An AI Prompt Package is selected by version and digest and is not mutable runtime text, a plugin include, or a user-authored system instruction.

## AI Input Envelope

The control-plane-owned, versioned input contract for one AI Run, binding the exact Task, Account, Deal, Job Scope, Work Objective, intended use, audience, material-classification assessments, Rights Posture, source and domain object versions, Processing Coverage, resource limits, request nonce, and canonical input digest. The model receives only the task-defined projection and cannot expand, replace, or authoritatively redefine the envelope.

## AI Context Plan

The deterministic, versioned selection and assembly rule that turns an authorized AI Input Envelope into the minimum ordered task context, records included, excluded, failed, and unprocessed scope, and defines any safe child-run and aggregation boundary. An AI Context Plan never silently truncates required content or grants retrieval, tool, or Deal-wide authority to the model.

## AI Context Fragment

A run-scoped, unguessable reference issued by the control plane for one exact part of an AI Run's permitted input, binding its Source Record, Source Representation, Native Locator, content digest, Processing Coverage, and Rights Posture. It is not a durable Evidence identity and cannot be referenced as authority outside the AI Run that issued it.

## AI Task Enablement

The environment-, material-classification-scope-, and provider-profile-scoped permission to begin new AI Runs using one exact AI Task Definition version. Enablement requires current contract, capability, and evaluation evidence; suspension or retirement prevents new runs without changing the identity, history, or interpretability of prior AI Runs.

## AI Run

A traceable execution of an exact AI Task Definition against version-bound Deal inputs through an exact AI Provider Capability Profile. It records the visible request and response identities, model and parameter identity, validation, usage, retry, acceptance, rejection, correction, and Human Decision history without requesting or retaining hidden model reasoning.

## Processing Coverage

The version-bound record of which pages, regions, objects, text layers, tables, charts, formulas, or other native structures were successfully parsed, rendered, OCR-processed, or visually inspected, together with gaps and applicable engine versions. Processing Coverage proves only the stated processing result and cannot establish source truth, Evidence sufficiency, or Professional Usability.

## Native Locator

A version-bound composite selector that resolves an Evidence item or controlled object within an exact source representation through source identity plus applicable structural, content-context, and geometric selectors. A Native Locator retains its selector profile and parser identity, and becomes ambiguous or unresolved rather than guessing when the referenced structure can no longer be resolved uniquely.

## Formula Compatibility Profile

The versioned allowlist and tested behavior for workbook functions, calculation modes, dynamic arrays, volatility, precision, hidden content, circularity, external dependencies, and target Microsoft 365 build under a specific product release. A formula outside the profile is unsupported for material Calculation even when an engine returns a value.

## Evaluation Time

The explicit, immutable reference timestamp used by a stated Calculation, Model, Scenario, or artifact-generation run when a permitted time-dependent function such as NOW or TODAY must be evaluated reproducibly. It is an input with origin and scope, not the worker's incidental wall-clock time or evidence that the resulting value is professionally suitable.

## Compatibility Report

The version-bound evaluation of a specific proposed or received Source Record, Source Packet, template, or Native Artifact against the applicable Capability Manifest and Deal control conditions. It records whether the item is supported, supported with limitations, requires replacement or a default template, is quarantined, or is unsupported, together with the resulting Output Ceiling and recovery path.

## Evidence

A durable, precisely located, context-preserving part of an exact Source Record and Source Representation that may support or challenge propositions about a Deal. Evidence retains its source, digest, date, scope, definition, Native Locator, and applicable context but is neither the support relationship nor a Fact.

## Evidence Relationship

An immutable, scope-qualified relationship stating that one exact Evidence item supports or challenges one exact Claim, including the supported proposition scope, qualifications, and limitations. The same Evidence may participate in different relationships, while a Fact binds the exact accepted relationships that form its Evidence basis.

## Evidence Candidate

An AI- or mechanically proposed association between a proposition and a version-bound part of a Source Record. After its Native Locator, content identity, rights, coverage, and support or challenge semantics pass the applicable checks, the product may create or reuse the durable Evidence and record a new Evidence Relationship; a model's citation or confidence statement alone is insufficient.

## AI Proposal

A structured candidate produced by an AI Run, such as a proposed Claim, Assumption, Analysis, Recommendation, Diligence Issue, missing-information item, or Artifact content. An AI Proposal cannot directly create a Fact, Human Decision, Process Event, external-use authorization, or accepted business side effect and remains distinguishable from any later accepted domain object.

## AI Proposal Disposition

An immutable record that the Individual Banker rejected, set aside, or routed an exact AI Proposal into a typed correction or Decision path for a stated reason and scope. A disposition does not edit or delete the Proposal, does not itself accept a domain object, and cannot substitute for the purpose-specific Human Decision or typed promotion required by the affected work.

## AI Abstention

A structured result in which an AI Run declines all or part of a Work Objective because the applicable Evidence, rights, definition, period, unit, Processing Coverage, conflict posture, or Mechanical Validity is insufficient. It identifies the affected scope, current Output Ceiling, safely permitted partial scope, and smallest recovery action; it is neither a provider failure nor a Human Decision.

## Claim

A proposition asserted about a Deal by a seller, management team, third party, AI, or banker and subject to evaluation against Evidence. Repetition, inclusion in a Model or Deliverable, or AI generation does not turn a Claim into a Fact.

## Fact

An immutable, scope-bound acceptance of a Claim supported by appropriate Evidence, free of unresolved material conflict, and explicitly accepted by the Individual Banker for a stated purpose. A Claim may support different Facts across purposes or times, while each Fact remains bounded by its Evidence, period, definition, unit, qualifications, and Human Decision.

## Assumption

An explicitly adopted input or premise used when Evidence does not directly determine what an Analysis, Model, Scenario, or process decision requires. Approval makes an Assumption authorized for its stated use but never converts it into a Fact.

## Calculation

A reproducible quantitative transformation performed from stated inputs using a stated formula or method. Mechanical validity establishes that the Calculation operates as defined, not that its inputs, interpretation, or intended use are professionally suitable.

## Calculation Run

An immutable execution of an exact Calculation version against exact inputs, rules, Evaluation Time, engine or runtime identity, and Processing Coverage, preserving its results and validation outcome. Repeating a Calculation creates another Calculation Run rather than rewriting an earlier result.

## Quantitative Measure

An exact numerical input, result, or term whose meaning is inseparable from its applicable currency or unit, scale and precision, sign convention, period or as-of time, rounding rule, definition, qualifications, and explicit missing-value posture. A bare number is not a professionally usable Quantitative Measure.

## Model

A coherent set of interdependent Calculations, definitions, Assumptions, and output relationships organized to answer a Deal question. A workbook may be a Native Artifact of a Model but is not the Model itself.

## Scenario

A named alternative set of inputs, Assumptions, or conditions applied to a Model or Analysis to compare outcomes, identify breakpoints, or test risk. A Scenario is neither a separate Model nor a prediction asserted as Fact.

## Analysis

Interpretive or comparative work that uses Evidence, Facts, Claims, Assumptions, Calculations, Models, or Scenarios to answer a stated Deal question. An Analysis may be mechanically valid while remaining professionally unusable because its source, definitions, assumptions, scope, or judgment are unsuitable.

## Deterministic Validation Record

An immutable record that one exact set of versioned inputs was evaluated by a stated non-AI rule set and engine version for a declared applicability and coverage, producing a result, exceptions, unresolved-judgment posture, and exact gates cleared or created at a stated time. A passing Deterministic Validation Record clears only its declared mechanical gate and does not establish source truth, Professional Usability, Deliverable Readiness, or a Human Decision.

## Recommendation

A reasoned, immutable proposed course of action or choice based on stated Evidence, Facts, Assumptions, Calculations, Analyses, and alternatives. A changed proposal creates a new Recommendation that may supersede the earlier one; it does not become a Human Decision or authorize an external action merely because it was generated, reviewed, or ranked.

## Diligence Issue

A material uncertainty, conflict, gap, or anomaly that may affect a Deal judgment, value, risk, process, or Deliverable's reliability. It remains unresolved until its stated resolution criteria are met or the Individual Banker explicitly accepts, reclassifies, or withdraws it.

## Information Request

A specific request to a management team, seller, buyer, adviser, or other source for Source Material or clarification. Receipt or response may advance the request but does not by itself resolve the Diligence Issue it serves.

## Open Item

An unresolved action with a next step or owner, such as obtaining a source, completing a tie-out, confirming a definition, remediating a Deliverable, or obtaining a decision. An Open Item tracks work to be done rather than representing Evidence, risk, or judgment.

## Deal Party

The stable identity of one organization or person participating in a stated Deal as a represented party, Buyer, management contact, adviser, financing source, or another recorded role. A Deal Party is local to that Deal; matching names, domains, addresses, or AI similarity across Deals do not establish a shared identity or permit cross-Deal data reuse.

## Deal Party Role

A source-traceable, time-bounded relationship stating how one Deal Party participates in a Deal. A Party may hold multiple roles, but a role does not by itself establish Buyer approval, contactability, authority, permission, interest, Process Event, or External Recipient access.

## Buyer Candidate

A Deal-scoped candidacy of an organization Deal Party under consideration because of strategic fit, transaction capacity, relationship context, or another stated rationale. Candidacy does not imply banker approval, contactability, interest, capacity, or process participation.

## Approved Buyer

A Buyer Candidate explicitly accepted by the Individual Banker into the Deal's controlled buyer universe. Approval permits continued consideration but does not authorize outreach, disclosure, materials delivery, NDA treatment, data-room access, or another external action.

## Outreach Wave

A sequenced group of Approved Buyers organized around a stated outreach purpose, timing, disclosure posture, and materials conditions. AI may propose an Outreach Wave, but external execution requires explicit authorization by the Individual Banker.

## Auction Round

A Deal-scoped process interval and submission contract used to organize comparable Buyer participation and Bid Versions around stated timing, requirements, and evaluation purpose. Planning, opening, extending, closing, or including a Buyer in an Auction Round does not by itself prove outreach, Bid receipt, selection, or another Process Event.

## Process Event

A source-traceable occurrence that actually happened at a stated business time and affects or evidences the Sell-Side Auction's process state. Process Events accumulate as typed history rather than replacing prior events; a plan, recommendation, task, AI-generated draft, or unsupported inference is not a Process Event.

## NDA

The confidentiality arrangement between a Deal party and a specific counterparty, including its applicable version and current legal or process posture. Execution of an NDA does not itself authorize disclosure or Data-Room Access.

## Data-Room Access

A time-bounded authorization for a specific counterparty or person to access a stated scope of Deal Materials. Its grant, suspension, expiry, and revocation are distinct Process Events and require explicit human control.

## Bid

The stable identity of a transaction proposal lineage submitted by a Buyer for a stated process round. Its successive formal submissions, revisions, or clarifications are immutable Bid Versions; receipt of a Bid does not constitute its acceptance or selection.

## Bid Version

An immutable received, revised, or formally clarified form of one Bid, binding its exact Source Record, submission and receipt times, process round, economics, consideration, financing, structure, conditions, timing, and completeness posture. Withdrawal, selection, rejection, or exclusivity remains a separate Process Event or Human Decision and does not rewrite a Bid Version.

## Milestone

A Deal process control point with a target date and stated completion criteria, such as launch, an IOI deadline, final bids, exclusivity, signing, or closing. A planned Milestone becomes achieved only when supported by the applicable Process Event and Evidence.

## Deliverable

A banker work product created for a stated Deal purpose, audience, or decision and maintained through successive Revisions. A Deliverable is a business object rather than a particular file.

## Deliverable Semantic Content

The immutable, contract-versioned structure expressing a narrative Deliverable Revision's sections, regions, reader-facing content, citations, qualifications, and refresh dependencies before native-file generation. Its closed schema-governed payload may vary by Deliverable type, while Facts, Evidence Relationships, Analyses, Quantitative Measures, Decisions, permissions, states, versions, and Lineage remain authoritative typed relationships outside that payload. For a workbook, the applicable Models, Calculations, Scenarios, Buyer, Bid, and Process records remain semantic authority rather than the workbook bytes or a duplicated content payload.

## Artifact Template

A versioned, rights-controlled layout and structural specification bound at Deal or artifact-class scope for producing a Native Artifact and its Reader Copy. An Artifact Template may be product-provided or user-supplied, but its selection does not establish compatibility, fidelity, readiness, or external-use authorization.

## Account Reusable Template

An Artifact Template available across Deals in one Account only because it was separately supplied or created as a new sanitized template outside any live Deal history, passed the applicable safety and compatibility controls, and carries an Individual Banker rights attestation. Deal Material and artifacts derived from a live Deal remain Deal-scoped in V1 and cannot be promoted into an Account Reusable Template, a cross-customer template pool, or AI training or evaluation material.

## Artifact Region

A stable, manifest-bound part of a product-exported Native Artifact classified as generated-owned, banker-owned, protected-formula, shared-merge, or unmanaged for external edit and regeneration behavior. Its metadata assists round-trip comparison but does not establish permission or allow the product to overwrite a Banker edit.

## Merge Conflict

A three-way difference in which both the Banker-edited artifact and the newly generated candidate materially change the same Artifact Region relative to the prior generated baseline, or in which region identity can no longer be verified. It requires an explicit Human Decision or a manually reconciled reimport and cannot be resolved by last-write-wins.

## Revision

An immutable, identifiable version of a Deliverable that preserves its applicable Deliverable Semantic Content or workbook authority bindings and the exact source, analysis, process, artifact, and use context at a stated time. A later Revision may become current or supersede an earlier one but does not inherit the earlier Revision's Review, QC, or external-use status automatically.

## Current Revision

The Revision designated as the present working representation of a Deliverable. The designation is a mutable pointer only; it does not rewrite prior Revisions or carry forward their Review, QC, readiness, or external-use authorization.

## Native Artifact

An editable or operational representation of a Deliverable Revision in the form expected for the relevant banker work. A Native Artifact's successful creation does not establish that the Deliverable is mechanically valid, professionally usable, ready for senior review, or authorized for external use.

## Reader Copy

A fixed-format, reader-facing representation of the same Deliverable Revision as its Native Artifact, ordinarily a PDF. A Reader Copy is not a separate Deliverable and must retain exact Revision identity, lineage, and consistency with the Native Artifact.

## Artifact Manifest

The versioned canonical record binding an exact Deliverable Revision to the byte identities, paths, media types, generator and policy versions, lineage, audience, purpose, and applicable External-Use Decision of its source, Native Artifact, Reader Copy, control-record, and archive members. Its signature proves deployment origin and manifest integrity only; it does not prove correctness, Professional Usability, or external-use authorization.

## Retention Ledger

The authoritative record of each retained object class's purpose, retention rule, active and backup deletion deadlines, legal-preservation exception, deletion tasks, tombstones, and verification evidence across primary storage, derived indexes, caches, processing providers, recovery copies, and backups. A Retention Ledger proves the recorded control history and completion checks; it does not make data inaccessible before the applicable deletion work succeeds.

## Deletion Request

An immutable request to remove an exact Account or Deal scope that immediately removes normal access, blocks new work, revokes affected grants, and starts recoverable deletion work across every applicable storage and provider surface. Acceptance is not proof that physical deletion or backup expiry has completed.

## Deletion Status Grant

A short-lived, read-only, request-scoped authorization first issued with fresh authentication when a Deletion Request is accepted and bound to the former Actor, the same authentication identity, and that exact request. After normal Account or Deal access is removed, a Deletion Status Claimant permits the same identity to obtain another short-lived Grant through ordinary authentication. The Grant exposes only the privacy-safe deletion stage, applicable control times, preservation category, and completion receipt; it grants no access to deleted content, ordinary Audit history, or another command and is never a long-lived bearer credential.

## Deletion Status Claimant

A minimal identity-to-Deletion-Request binding retained after normal Account or Deal access is removed so the same authentication identity can continue proving its right to inspect privacy-safe deletion status. It retains only the provider issuer and subject binding plus the exact request identity needed for that purpose, not Deal content, display name, or an unnecessary email copy. The corresponding provider identity remains authentication-only with no Account authority while the Claimant is active. It remains while deletion or a preservation exception is unresolved and for 30 days after terminal completion, then the Claimant and, absent another lawful product relationship, the provider identity are removed and no longer support self-service status access.

## Deletion Scope

The immutable perimeter of domain rows, applicable Protected Account Objects and Protected Deal Objects, derived indexes, provider-held state, recovery copies, and backup-expiry obligations captured for one Deletion Request before those resources are removed. It exists to drive and verify deletion and cannot be silently expanded, narrowed, or used to reopen content access.

## Deletion Tombstone

A privacy-minimized, non-content record proving that an exact deletion perimeter was processed and preventing a later restore from resurrecting it. It retains only irreversible subject identity, scope class, permitted control times, outcome, verification identity, and applicable preservation basis and has no live foreign key back to deleted content.

## Audit Event

An append-only, privacy-minimized record that an authenticated human or Runtime Principal attempted or completed a security-, authority-, source-, judgment-, artifact-, external-use-, commercial-, retention-, or recovery-relevant action against an exact scope. An Audit Event records identities, versions, outcome, reason code, trace, and prior-chain identity without storing Deal content or replacing the underlying domain event.

## Audit Checkpoint

A signed daily commitment to an Account's ordered Audit Event chain and the applicable production audit-key identity. It detects later omission or mutation of committed audit history but is not external notarization, proof that the recorded action was correct, or permission to inspect Deal Material.

## Operational Telemetry

Privacy-safe logs, metrics, traces, health signals, and release observations used to operate the product without carrying Source Material, Deal content, AI prompts or outputs, customer names, file names, secrets, or raw business identifiers. Operational Telemetry is neither Audit Evidence nor authoritative product state.

## Notification

A durable, privacy-minimized product intent to present or deliver one exact safe event class through an in-product or transactional-email channel under the current Notification Preference. A Notification contains no Deal content, and provider acceptance, delivery, open, click, bounce, or complaint evidence does not prove that a product action or External-Use Event occurred.

## Notification Delivery Event

An append-only, privacy-minimized record of verified asynchronous provider evidence about one Notification, such as delivery, bounce, or complaint. It may update a delivery-status projection or suppression posture but never mutates a historical send attempt, proves user action, or creates Account, Recipient, entitlement, or external-use authority.

## Product Measurement Definition

An immutable versioned contract stating when one Product Measurement Event is satisfied, which trusted or candidate emitter may produce it, its allowed privacy-safe fields, deduplication identity, inclusion and exclusion rules, and projection meaning. Changing a denominator, success condition, exclusion, or semantic field creates a new definition rather than reinterpreting prior events.

## Product Measurement Event

An append-only, privacy-safe record that an exact funnel, commercial, product-value, cost, or lifecycle condition was satisfied under a versioned event definition. Product Measurement Events contain no Deal content and remain distinct from Operational Telemetry, Audit Events, and rebuildable metric or cohort projections.

## Reference Deal

A product-owned, synthetic, or explicitly evaluation-authorized Deal fixture with versioned expected outcomes, critical failure conditions, and task-specific scoring criteria used to test product and AI behavior. A live customer Deal is not a Reference Deal by default and cannot enter an evaluation, training, template, or cross-Deal corpus through silent sampling.

## Review

An immutable, scoped examination of a specific Deal object or Deliverable Revision against stated purposes and standards by an identified human, AI, or mechanical reviewer. A Review preserves its exact target version, reviewer type, applicable standard, conclusion, limitations, and time and does not itself authorize external use.

## QC Run

An immutable execution of an exact mechanical, AI-assisted, or tool-based quality-control ruleset against an exact Review target and input perimeter, preserving tool or model identity, coverage, result, and execution outcome. A human Review need not contain a QC Run, and a successful QC Run proves only the checks it actually performed.

## QC Finding

An immutable specific defect, gap, or judgment item identified by a Review and tied to an exact object, Revision, and applicable location. It records its Evidence, severity, impact, owner, and effect on the intended use without being rewritten when a later Revision remediates it or replacing a broader Diligence Issue.

## QC Finding Disposition

An append-only determination that assigns, confirms, rejects, accepts a stated limitation, requires remediation, or records successful re-test of a QC Finding for an exact scope. Remediation ordinarily points to a new Revision and applicable re-test; it never changes whether the Finding existed on its original Revision.

## Human Decision

An explicit, traceable choice made by the Individual Banker about a stated question and scope, such as confirming a Fact, approving an Assumption or Buyer, resolving a conflict, accepting a risk, or selecting a Bid. AI or mechanical completion cannot stand in for a Human Decision.

## External-Use Decision

A Human Decision authorizing a specific external use of an exact object or Revision for a stated audience, purpose, time, and set of conditions. Readiness, QC completion, or a prior authorization for another Revision or audience does not constitute an External-Use Decision.

## External-Use Scope

The immutable exact Revision, artifact identities, purpose, channel, validity window, rights, confidentiality conditions, limitations, and frozen recipient or audience membership authorized by one External-Use Decision. Later membership, Revision, purpose, channel, or condition changes require a new Decision rather than inheriting the earlier scope.

## Internal Controlled Export

A portable copy of an exact Revision, artifact, or control record produced for the Individual Banker's inspection, native editing, backup, or reimport. It preserves identity, current posture, limitations, and applicable manifest data but does not authorize external circulation or prove external use.

## Externally Authorized Delivery

A recipient-specific access path or external-purpose delivery package created only for an eligible exact Revision under a matching External-Use Decision. Its creation does not by itself prove that the recipient accessed it or that another external-use event occurred.

## External-Use Event

A Process Event recording that an exact Revision was actually used outside the Deal Workspace for a stated recipient, audience, purpose, channel, and time. For Recipient Access, the first successfully authorized Reader Copy stream is the observable boundary; later views remain access history rather than new first-use Events, while product-external use is recorded explicitly by the Individual Banker.

## External Recipient

A person outside the Deal Workspace who may inspect one exact Deliverable Revision through valid Recipient Access. An External Recipient may be linked to a verified person Deal Party but remains a separate access identity; V1 provides no Deal membership, other-Revision discovery, editing, download, or onward-sharing capability and does not claim DRM or technical prevention of client-side capture.

## Recipient Access

An authenticated, recipient-specific, read-only entitlement to inspect an exact Deliverable Revision under a matching External-Use Decision. It is not Deal Workspace membership, expires or may be revoked independently, may be temporarily denied by Recipient Access Suspension and explicitly re-enabled only through Recipient Access Resumption, and grants no product-level download capability in V1.

## Recipient Session

A short-lived, isolated viewing session created only after an External Recipient proves control of the exact mailbox bound to a valid Recipient Access through a one-time link and email code. It grants no identity claim beyond mailbox control and is invalidated by expiry, suspension, revocation, a mismatched or invalidated Revision, or loss of the matching External-Use Decision. A later Recipient Access Resumption never revives an invalidated Session; mailbox control must be proved again.

## Post-Term Access

The time-bounded, read-only account-owner access available after a paid subscription term ends for inspection, Internal Controlled Export, and deletion. It does not continue Recipient Access or permit new substantive Deal work, external delivery, or sharing.

## Current Information

Information designated as presently applicable for a stated Deal scope and purpose. Current status does not by itself establish truth, human confirmation, professional usability, or external-use authorization.

## Stale Information

Information whose freshness is insufficient or uncertain for its intended current use because of elapsed time, a new Deal event, or a likely update. It may remain suitable as Historical Information without being Superseded Information.

## Conflicted Information

Information subject to an unresolved material disagreement with another item about value, definition, period, scope, version, or meaning. Conflict is an independent condition and may apply even when the competing items are otherwise current.

## Superseded Information

Information explicitly replaced for a stated scope by a later version, Evidence set, or Human Decision. It remains part of the Deal's history and is not necessarily erroneous or stale.

## Withdrawn Information

Information explicitly removed from current reliance or use by its responsible party or the Individual Banker, whether or not a replacement exists. Its content, withdrawal, reason, and prior uses remain historical.

## Historical Information

Information retained to explain a prior source, judgment, process state, Revision, or Decision rather than represent the current working state. Later Evidence or judgment does not rewrite what was known or decided at the earlier time.

## Deal Business Stage

The current phase of a Deal's transaction progression: Initiated, Preparation, In Market, Bid Evaluation, Exclusive Execution, Signed, Closed, or Terminated. Stage changes are supported by applicable Process Events, Evidence, and Human Decisions and remain independent of Deliverable readiness and Workspace capability posture; Closed or Terminated alone does not make the Deal read-only.

## Paused Deal

A Deal whose active progression has been deliberately suspended while its last Deal Business Stage and history remain intact. It permits inspection, search, permitted Internal Controlled Export, safe Job cancellation, revocation, resume, archive, and deletion, but no new Source acceptance, substantive processing, Revision, readiness advancement, external-use authorization, delivery, or Recipient Access. Pause takes effect atomically: it advances the Workspace posture version, stops new Job claims, invalidates stale Job Scopes, and prevents any running Job from committing a new domain result after the boundary; already-committed history remains and any already-completed irreversible external effect is recorded truthfully. Resumption requires an explicit return to a stated stage; pause does not imply termination, archive, or automatic revocation of existing Recipient Access.

## Archived Deal

A Deal whose Deal Workspace is retained as a historical record rather than used for current active work. Archive becomes effective only after domain-mutating Jobs finish or safely cancel; it is then read-only for inspection, search, permitted export, deletion, and explicit reactivation, with no stale Job commit. Archival is a record posture, not a transaction outcome, does not revoke Recipient Access automatically, and may follow closure, termination, or an explicit decision to archive a paused Deal.

## Source Reliance State

The suitability of a specific Source Record for a stated purpose: unassessed, reliance-limited, reliance-eligible, or blocked. It remains independent of the Source Record's freshness, conflict, and disposition conditions.

## Analysis State

The current working, mechanical-validation, professional-usability, senior-review, or blocked posture of a Calculation, Analysis, Model, or Scenario. Analysis State does not determine Deliverable Readiness or Process State.

## Deliverable Readiness

The internal readiness of an exact Deliverable Revision: working-draft, analysis-ready, senior-review-ready, circulation-candidate, or blocked. Deliverable Readiness does not grant external-use authorization or prove that external use occurred.

## Process State

The current event-supported posture of a Sell-Side Auction at Deal and counterparty scope, with outreach, NDA, Data-Room Access, diligence, Bid, selection, and Milestone states kept distinct. Process State neither determines nor is determined by source, analysis, or Deliverable readiness.

## Mechanical Validity

The result of checking whether a Calculation, Model, Native Artifact, or other structured work operates and ties out according to its stated rules. Mechanical Validity does not establish Professional Usability.

## Professional Usability

The suitability of an object for a stated banker purpose given its sources, definitions, Assumptions, scope, conflicts, and required judgment. Professional Usability does not establish presentation readiness or external-use authorization.

## Senior-Review-Ready

A posture in which an object is sufficiently complete and explicit for effective review by the applicable senior banker, with known issues and unresolved judgments visible. It does not mean senior review is complete or external circulation is permitted.

## Circulation Candidate

A specific Deliverable Revision for which the applicable professional review, QC, remediation, and material judgments are complete for a stated audience and purpose. It remains internal until an External-Use Decision authorizes that exact use.

## Origin

The way an object entered the Deal Workspace, such as human-authored, AI-generated, deterministically generated, or imported. Later review or confirmation does not rewrite Origin.

## Human Confirmation

The Individual Banker's explicit confirmation, rejection, or override of an object for a stated scope. Human Confirmation remains independent of Origin; confirming an Assumption never makes it a Fact, and accepting a Claim as a Fact requires the applicable Evidence and conflict conditions.

## Lineage

The authoritative, version-bound set of typed relationships identifying the exact upstream objects, methods, Decisions, and representations on which a downstream object depends. A rebuildable dependency projection may accelerate traversal and Impact Assessment, but it is not Lineage authority and cannot replace the typed relationships from which it was derived.

## Impact Assessment

A traceable determination of which current Deal objects and prior conclusions are affected by a change and whether recalculation, regeneration, re-review, or a circulation block is required. AI or mechanical checks may identify dependencies and propose materiality, but the Individual Banker retains material professional judgment.

## Recalculation Required

An Impact Assessment result indicating that a dependent Calculation, Model, or Scenario must be run again because an applicable input, definition, formula, period, unit, source, or logic changed. Prior results remain historical rather than being overwritten.

## Regeneration Required

An Impact Assessment result indicating that affected Deliverable content must be produced as a new Revision. Prior Review, QC, and external-use status does not automatically carry to the new Revision.

## Re-review Required

An Impact Assessment result indicating that a prior Review conclusion may no longer support its stated purpose because relevant content, Evidence, professional judgment, materiality, consistency, or presentation changed. A conclusion that re-review is unnecessary retains its scope and rationale.

## Circulation Blocked

An Impact Assessment result preventing prospective external use because a circulation candidate or External-Use Decision no longer satisfies a material source, content, Revision, audience, confidentiality, QC, or authorization condition. Prior external-use history remains unchanged.
