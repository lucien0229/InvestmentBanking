# Technical Design Doc

**Product:** HelloX Investment Banking — Individual-First V1

**Status:** Confirmed technical baseline

**Date:** 2026-08-05

**Scope:** Cross-cutting implementation baseline for the Technical Design stage

## 1. Purpose

This document turns the approved product, domain, and UX contracts into an implementable technical design for the Individual-First V1. It answers:

- which runtime and domain modules compose the system;
- where authoritative data and immutable history live;
- how the browser, control plane, workers, and providers communicate;
- how uploaded files, AI work, financial calculations, Office artifacts, Evidence, Human Decisions, external use, and deletion are controlled;
- which technologies and third parties are used;
- how permissions, errors, retries, observability, backup, and release safety work; and
- which evidence must exist before production may accept Confidential or Restricted Deal Material.

This is the cross-cutting baseline for the Technical Design-stage document set. It includes architecture, data-model, API, AI-contract, integration, and permission views only to the depth needed to explain their interaction. The specialized [System Architecture](system-architecture.md), [Data Model / ERD](data-model-erd.md), [AI Prompt & Contract Spec](ai-prompt-contract-spec.md), [API Spec](api-spec.md), [Integration Spec](integration-spec.md), and [Permission Model](permission-model.md) refine their own concerns and must remain consistent with this baseline.

## 2. Authority and traceability

Authority is concern-specific rather than one misleading global precedence list:

- the approved productization specification and confirmed product assets own product scope and behavior;
- accepted decisions under [docs/adr](../adr) own hard architecture decisions within their stated concern;
- [CONTEXT.md](../../CONTEXT.md) owns canonical domain language and distinctions;
- approved documents under [docs/ux](../ux) own user-visible task behavior;
- this Technical Design owns the cross-cutting implementation baseline; and
- the specialized [System Architecture](system-architecture.md), [Data Model / ERD](data-model-erd.md), [AI Prompt & Contract Spec](ai-prompt-contract-spec.md), [API Spec](api-spec.md), [Integration Spec](integration-spec.md), and [Permission Model](permission-model.md) own their stated concerns.

Implementation code, generated contracts, tests, and verified runtime evidence verify these contracts and may reveal a defect; they do not silently redefine them. An apparent cross-document conflict is corrected in every affected document rather than resolved by choosing the least restrictive text.

This document may refine implementation-deferred values from the UX Spec, but it must not weaken the Banker Control Boundary, source/evidence rules, exact-Revision controls, external-use separation, retention contract, or commercial contract.

## 3. Product and design constraints

### 3.1 V1 product boundary

V1 serves one named Individual Banker per Account and supports the complete controlled Individual Sell-Side Auction workflow. It provides one persistent Deal Workspace and Controlled Sell-Side Auction Deal Book per Deal, not disconnected AI tools.

The product must keep these concepts independent:

- Account identity, authentication identity, Product Entitlement, and Deal authority;
- Source Material, Source Record, Evidence, Claim, Fact, Assumption, AI Proposal, and Human Decision;
- Mechanical Validity, Professional Usability, Deliverable Readiness, Package Readiness, and external-use authorization;
- Internal Controlled Export, Externally Authorized Delivery, and actual External-Use Event;
- current state and append-only material history.

There is no V1 support-personnel role, Banker impersonation, administrative Deal viewer, content break-glass path, organization administration, live email/data-room/CRM connector, dynamic AI endpoint, Account-supplied BYOK, or cross-customer corpus.

### 3.2 Commercial and capacity boundary

The baseline Individual entitlement includes:

- two concurrent Active Deal Workspaces;
- per Active Deal per billing month: 250 newly processed files, 2,500 newly processed logical pages, 25 GB active storage, and 20 defined full-workflow operations;
- all complete V1 workflow capabilities rather than feature-gating core professional work;
- explicit add-on purchase before capacity is exceeded; and
- no retroactive overage or token-based user-facing metering.

The Usage Ledger and Product Entitlement are product-authoritative even though Stripe is authoritative for payment-processor events. Usage is reserved before expensive work, committed on the defined commercial event, and released when a canceled or failed operation never consumed the promised allowance.

Before a command can reserve a file, page, storage, Full-Workflow Operation, intensive-processing, or archive allowance, the control plane creates a short-lived immutable Operation Preview for the exact Account or Deal authority scope, command, dependencies, classification, quantity, capacity effect, and price/block posture. The accepting command must present the matching preview identity and consent digest and revalidates them in the same transaction that creates the Usage Reservation. A Capacity Offer is a versioned sellable capacity increment; neither an Offer nor a Preview changes Product Entitlement by itself.

### 3.3 Deployment boundary

Production begins on one United States-region VPS with at least:

- 8 vCPU;
- 16 GB DDR5 RAM; and
- 512 GB NVMe.

The host is a deliberate single-compute failure boundary. Production does not claim multi-host high availability. Confidential production state and accepted objects use United States-region Supabase Pro; VPS-local PostgreSQL and ordinary file persistence are limited to development, synthetic Project Northstar, bounded processing space, and encrypted recovery copies. V1 operates no long-lived Staging environment; CI, disposable synthetic validation, production blue/green slots, and the isolated Microsoft 365 compatibility lab supply pre-release evidence.

## 4. Architecture

### 4.1 Architecture style

V1 is a modular monolith with separated workers:

- one authoritative TypeScript control plane;
- one Web delivery application;
- separate Python light and heavy worker processes;
- durable PostgreSQL state, PGMQ queues, and Transactional Outbox;
- versioned OpenAPI, JSON Schema, Job, AI, and Artifact Manifest contracts; and
- no product microservice network.

The control plane alone owns business invariants and domain state transitions. Workers return validated result proposals; they do not independently change authoritative business posture.

~~~mermaid
flowchart LR
    B["Banker browser"] --> C["Caddy TLS ingress"]
    R["Recipient browser"] --> C
    C --> W["Next.js Web"]
    C --> A["Fastify API and control plane"]
    C --> G["Protected Object Gateway"]

    B -->|"Clerk token + scoped TUS"| QS["Supabase quarantine bucket"]

    W --> A
    A --> DB["Supabase Pro PostgreSQL"]
    A --> ST["Supabase encrypted Deal object storage"]
    A --> OB["Transactional Outbox"]
    OB --> D["Outbox Dispatcher"]
    D --> Q["PGMQ"]

    Q --> MP["Measurement Projector"]
    Q --> LW["Python light worker"]
    Q --> HW["Python heavy worker"]
    Q --> PF["Public Fetch Coordinator"]
    MP --> DB

    LW --> HX["HelloX AI route"]
    HW --> GDAI["Google Document AI"]
    HW --> ASP["Aspose processing engines"]
    HW --> AV["ClamAV"]
    HW --> SS["Host Sandbox Supervisor"]
    PF --> SS
    SS --> SBX["Disposable rootless Podman sandboxes"]
    SBX --> PUB["Public HTTPS sources — fetch profile only"]

    LW --> KMS["Google Cloud KMS"]
    HW --> KMS
    G --> KMS
    G --> ST
    G --> DB
    LW --> ST
    HW --> ST
    LW --> DB
    HW --> DB

    A --> CL["Clerk"]
    A --> STR["Stripe"]
    A --> RE["Resend"]

    W --> OT["OpenTelemetry + Sentry US"]
    A --> OT
    MP --> OT
    LW --> OT
    HW --> OT
~~~

### 4.2 Runtime components

| Component | Technology | Responsibility | Explicitly does not own |
|---|---|---|---|
| Web | Next.js App Router, React, TypeScript | Authenticated UI, server-rendered shell, public proof/pricing pages, accessibility, API client, Checkout redirects | Durable domain transactions, provider credentials, long-running work |
| API / control plane | Fastify, TypeScript | /api/v1, Clerk identity mapping, authorization, commands, queries, SSE, Webhooks, state machines, entitlements, idempotency, Outbox | File parsing, Office rendering, AI judgment, unrestricted object reads |
| Protected Object Gateway | Narrow private streaming runtime | Revalidate an exact stream scope, read immutable ciphertext, unwrap the exact DEK, stream authorized plaintext | Domain mutation, object listing, reusable public URLs |
| Outbox Dispatcher | TypeScript long-running process | Claim committed Outbox rows and publish safe Job/event identities to PGMQ | Deal content, provider calls, domain transitions |
| Measurement Projector | TypeScript long-running process | Consume privacy-safe measurement emissions, append deduplicated Product Measurement Events, rebuild bounded projections | Deal content, domain transitions, entitlement, Audit or telemetry authority |
| Light worker | Python | AI Task execution, normalized extraction, source/evidence indexing, lightweight deterministic checks, email preparation | Authoritative state transitions, external authorization |
| Heavy worker | Python coordinator | Malware and container inspection orchestration, Office/PDF processing, OCR orchestration, rendering, artifact generation, comparison | In-process untrusted parsing, product-domain decisions, arbitrary network access |
| Public Fetch Coordinator | Narrow long-running process | Claim public-Web Jobs, invoke the public-fetch sandbox profile, stage immutable observation proposals | Deal decrypt, private-network fetch, general provider credentials |
| Sandbox Supervisor | Host systemd service using rootless Podman | Validate fixed execution profiles and launch disposable bounded containers | Product database, provider credentials, arbitrary images, commands, mounts, or paths |
| Signer / Retention / Backup executors | Purpose-specific on-demand or scheduled runners | Exact signing, deletion, backup, and verification operations under separate identities | General Deal access or shared secrets |
| PostgreSQL | Supabase Pro | Transactional System of Record, RLS, current state, append-only material history, FTS, pgvector, PGMQ | Accepted file bytes, hidden provider state |
| Object storage | Supabase Storage | Quarantine, typed Protected Account/Deal Objects, immutable manifests, exports, audit checkpoints | Business state or permission truth |
| Caddy | Containerized reverse proxy | TLS, routing, security headers, request limits, health-aware blue/green switch | Authentication and product authorization |

### 4.3 Monorepo shape

~~~text
apps/
  web/                 Next.js application
  api/                 Fastify control plane
  object-gateway/      protected synchronous file streaming
  dispatcher/          transactional Outbox publication
  worker/              Python worker and coordinator entrypoints
packages/
  domain/              domain types, state machines, policy vocabulary
  contracts/           OpenAPI, JSON Schema, event and manifest contracts
  config/              typed non-secret configuration
  observability/       privacy-safe telemetry helpers
python/
  packages/
    contracts/         generated/validated contract models
    processing/        ingestion, parsing, OCR and rendering
    financial/         deterministic calculation and validation
    ai/                provider adapter and AI Task executor
    artifacts/         Office/PDF generation and comparison
infra/
  compose/             production and non-production Compose definitions
  sandbox/             Supervisor profiles, rootless Podman policy and probes
  systemd/             host Sandbox and Backup units
  migrations/          PostgreSQL migrations and verification
  probes/              provider, restore and compatibility probes
~~~

pnpm workspaces provide TypeScript dependency boundaries. Python uses a locked workspace and generated models from the canonical JSON Schemas. Contract generation must be deterministic and CI must fail when generated TypeScript, Python, OpenAPI, and JSON Schema artifacts drift.

### 4.4 Project Northstar

The public proof experience reuses production Web components, API command handlers, domain policies, and state transitions through a dedicated synthetic Account and deterministic provider adapters. Its fixtures are read-only and its temporary session state is physically and logically isolated from production Accounts.

Anonymous proof sessions cannot upload files, address production object IDs, invoke live AI, OCR, Office, payment, or Recipient paths, or convert synthetic state into a live Deal. Promotion means starting the ordinary qualification, identity, Checkout, Deal Setup, and Paid Preflight path; it is never a data copy.

## 5. Module design

The modules below are code boundaries within one control plane, not separately deployed product services.

| Module | Authoritative responsibilities |
|---|---|
| Identity | Map Clerk identity to Actor; enforce MFA/fresh-factor evidence; issue Sensitive Action Grant |
| Account and Commerce | Account ownership, Product Entitlement, term, capacity, Usage Ledger, Stripe event projection |
| Deal Lifecycle | Deal identity, stage, Active/Paused/Archived/Closed/Terminated posture, Post-Term behavior |
| Paid Preflight | authority, rights, confidentiality, processing path, compatibility, Output Ceiling |
| Ingestion | Upload Session, Quarantined Upload, type/safety/archive checks, Accepted Source Object |
| Source and Evidence | Source Record, Web Evidence Observation, Processing Coverage, Native Locator, Evidence |
| Knowledge and Judgment | Claim, Fact, Assumption, Diligence Issue, Recommendation, Human Decision |
| Analysis | Calculation, Model, Scenario, Analysis, deterministic validation, Impact Assessment |
| Auction Process | Buyer Candidate, approval, Outreach Wave, NDA, Data-Room Access, Bid, Milestone, Process Event |
| Deliverables | Deliverable, Revision, current pointer, Native Artifact, Reader Copy, Review, QC, Package Readiness |
| Round Trip | Artifact Region, three-way comparison, Merge Conflict, controlled reimport |
| External Use | Internal Controlled Export, External-Use Decision, delivery package, Recipient Access, External-Use Event |
| Jobs | Job DAG, steps, attempts, leases, events, cancellation, retries, compensation, dead-letter recovery |
| AI | AI Task Definition, provider profile, AI Run, AI Proposal, evaluation |
| Retention | Retention Ledger, deletion requests/tasks, tombstones, backup expiry verification |
| Audit | Audit Event chain, daily Audit Checkpoint, verification |
| Notifications | privacy-minimized transactional messages and authenticated deep links |

Each module exposes commands and queries through application interfaces. Direct cross-module table mutation is prohibited. Cross-module effects use a transactionally recorded domain result and Outbox message.

The First Deal Guide is an orchestration projection over these same modules. It stores durable checkpoint and recovery state but does not create alternate Source, Evidence, Decision, Job, or Deliverable records. First Unmistakable Value, the first permitted Internal Controlled Export, and explicit Guide graduation are separate durable milestones. Graduation to the Deal Execution Desk changes presentation and next-action guidance, not the underlying Deal model.

## 6. Authoritative data design

The implementation-ready logical model, required fields, tenant-bearing relationships, lifecycle rules, RLS invariants, deletion behavior, and domain ERDs are defined in the [Data Model / ERD](data-model-erd.md). This section is the architectural summary and must not be interpreted as a smaller alternative schema.

### 6.1 Persistence principles

- PostgreSQL is the authoritative transactional System of Record.
- Core domain objects use typed relations, foreign keys, checks, and uniqueness constraints.
- Account-scoped rows carry account_id. Deal-scoped rows carry both account_id and deal_id.
- Application-generated UUIDv7 values use PostgreSQL uuid columns.
- Security tokens are independent high-entropy secrets; only their hashes are stored.
- All timestamps are UTC timestamptz. Business dates use date.
- Financial numbers use exact numeric plus currency, unit, period, precision, and source semantics.
- JSONB is allowed only for versioned boundary payloads such as format-specific locators, provider responses, manifests, capability profiles, and strict narrative Deliverable semantic-content contracts. Permission, lifecycle, identity, financial semantics, version relationships, and authoritative Lineage remain typed relations outside those payloads.
- A generic domain-object table, EAV model, silent unknown-field loss, and floating-point financial amount storage are prohibited.
- Material history is append-only, but the system is not fully event-sourced.
- Current Revision and similar current selections are mutable pointers to immutable versions.

### 6.2 Logical schema groups

| Schema | Representative tables |
|---|---|
| identity | actor, external_identity, account, account_actor, runtime_principal, sensitive_action_grant |
| commerce | product_entitlement, entitlement_mutation, subscription_projection, usage_ledger_entry, usage_reservation, commercial_receipt |
| deal | deal, deal_workspace, deal_stage_transition, deal_posture_transition, paid_preflight, work_objective, output_ceiling_assessment, execution_package, package_snapshot |
| source | upload_session, quarantined_upload, source_material, source_record, source_representation, processing_coverage, source_packet_version, material_classification_assessment, rights_posture_assessment, source_reliance_assessment |
| object_store | protected_object, protected_object_replica, typed domain attachments |
| knowledge | native_locator, evidence, evidence_relationship, evidence_candidate, claim, fact, fact_evidence_basis, assumption, human_decision, diligence_issue, information_request, open_item |
| analysis | calculation_version, calculation_run, model_version, scenario_version, analysis_version, recommendation, typed Lineage relations, impact_assessment |
| process | deal_party, organization_party, person_party, buyer_candidate, buyer_approval, outreach_wave, auction_round, nda_version, data_room_access, bid_version, typed Bid terms, milestone, process_event extensions |
| deliverable | deliverable_revision, deliverable_revision_content, content_region, artifact, artifact_region, artifact_manifest, review, qc_run, qc_finding, readiness_assessment |
| external_use | internal_export, archive_package, external_use_decision, external_use_scope, frozen scope members, delivery_package, recipient_access, recipient_session, external_use_event |
| jobs | job, job_step, job_dependency, job_attempt, job_lease, job_scope and typed memberships, job_event, transactional_outbox, idempotency_record |
| integration | webhook_inbox_event, webhook_processing_attempt |
| notification | notification_preference, notification, notification_delivery_attempt, provider_suppression |
| ai | task_definition, prompt_package, provider_capability_profile, input_envelope, context_plan, context_fragment, run, proposal, abstention, evaluation_suite, evaluation_result |
| measurement | product_measurement_definition, product_measurement_event, measurement_projection |
| controls | audit_event, audit_checkpoint, retention_rule, retention_ledger_entry, deletion_request, deletion_scope, deletion_task, deletion_tombstone, preservation_exception |
| projection | deal_book, package_readiness, dependency_edge, current scoped state, search_document, search_embedding |

### 6.3 Relationship overview

~~~mermaid
erDiagram
    ACCOUNT ||--o{ PRODUCT_ENTITLEMENT : holds
    ACCOUNT ||--o{ DEAL : owns
    DEAL ||--|| DEAL_WORKSPACE : has
    DEAL ||--o{ SOURCE_MATERIAL : contains
    SOURCE_MATERIAL ||--o{ SOURCE_RECORD : observed_as
    SOURCE_RECORD ||--o{ SOURCE_REPRESENTATION : has
    SOURCE_REPRESENTATION ||--o{ PROCESSING_COVERAGE : records
    SOURCE_RECORD ||--o{ EVIDENCE : locates
    EVIDENCE ||--o{ EVIDENCE_RELATIONSHIP : participates
    CLAIM ||--o{ EVIDENCE_RELATIONSHIP : evaluated_by
    CLAIM ||--o{ FACT : accepted_for_scope
    FACT ||--o{ FACT_EVIDENCE_BASIS : binds
    EVIDENCE_RELATIONSHIP ||--o{ FACT_EVIDENCE_BASIS : supports
    HUMAN_DECISION ||--o{ FACT : authorizes
    HUMAN_DECISION ||--o{ ASSUMPTION : adopts
    DEAL ||--o{ ANALYSIS : contains
    ANALYSIS ||--o{ ANALYSIS_VERSION : versions
    DEAL ||--o{ DELIVERABLE : produces
    DELIVERABLE ||--o{ DELIVERABLE_REVISION : versions
    DELIVERABLE ||--o| DELIVERABLE_REVISION : current_pointer
    DELIVERABLE_REVISION ||--o{ ARTIFACT : represents
    DELIVERABLE_REVISION ||--o{ REVIEW : reviewed_by
    REVIEW ||--o{ QC_RUN : executes
    DELIVERABLE_REVISION ||--o{ EXTERNAL_USE_SCOPE : scoped_for
    EXTERNAL_USE_SCOPE ||--|| EXTERNAL_USE_DECISION : authorized_by
    EXTERNAL_USE_DECISION ||--o{ RECIPIENT_ACCESS : grants
    RECIPIENT_ACCESS ||--o{ RECIPIENT_SESSION : creates
    DEAL ||--o{ EXECUTION_PACKAGE : contains
    EXECUTION_PACKAGE ||--o{ PACKAGE_SNAPSHOT : versions
    DEAL ||--o{ JOB : executes
    JOB ||--o{ JOB_STEP : decomposes
    JOB_STEP ||--o{ JOB_ATTEMPT : attempts
    JOB ||--o{ JOB_EVENT : reports
    JOB ||--o{ AI_RUN : invokes
    ACCOUNT ||--o{ AUDIT_EVENT : records
    ACCOUNT ||--o{ AUDIT_CHECKPOINT : commits
~~~

### 6.4 Versioning and correction

The following are immutable after acceptance:

- Source Record representations and their byte digests;
- Evidence identity and exact locator version;
- Human Decisions;
- Process Events;
- material Calculation, Model, Scenario, and Analysis versions;
- Deliverable Revisions and artifacts;
- External-Use Decisions and External-Use Events;
- Job Attempts and Audit Events.

Correction creates a new object or explicit correction/reversal/supersession relation. It never overwrites why an earlier result was accepted or used. A new Source Record or Human Decision triggers an Impact Assessment that marks affected work as Recalculation Required, Regeneration Required, Re-review Required, or Circulation Blocked.

### 6.5 Object identity and layout

Object keys never contain Deal names, client names, filenames, or email addresses. A representative immutable key is:

~~~text
env/account-id/deal-id/object-class/object-id/sha256
~~~

Quarantine and protected-object buckets are separate. Typed Protected Account Objects and Protected Deal Objects use new content-addressed paths and upsert is disabled. Object metadata contains only non-sensitive routing identity, byte length, media type, digest, envelope version, and lifecycle state.

### 6.6 Search and derived indexes

PostgreSQL FTS is the default search path. pgvector may store task-approved embeddings only after the applicable provider, material-classification, and rights gate passes. Every search document and vector row carries account_id, deal_id, source/version identity, derivation version, and retention identity.

- no cross-Deal or cross-Account query or nearest-neighbor search;
- no cross-customer index, cache, prompt corpus, or model-training export;
- index text and embeddings are derived state, never Source Material or Evidence by themselves;
- stale or deleted Source Records invalidate or delete the corresponding entries;
- search results return exact source/version and Native Locator references;
- ranking score is not confidence, truth, materiality, or Professional Usability.

## 7. Browser-to-backend communication

### 7.1 Protocol choices

- JSON HTTP under /api/v1 for commands and queries.
- OpenAPI generated from the canonical TypeScript contract source and checked against generated clients.
- Server-Sent Events for Job notification.
- TUS for resumable direct quarantine upload.
- Provider-signed Webhooks for Stripe, Clerk where applicable, and Resend.
- No GraphQL, general WebSocket, browser-to-AI call, browser service credential, or browser direct database mutation.

### 7.2 Representative API surface

This is a route-family map, not a second API contract. The normative operation IDs, paths, requests, responses, errors, authentication, idempotency, and concurrency rules are in the [API Spec](api-spec.md).

| Area | Representative resources and commands |
|---|---|
| Account | `/api/v1/account`, `/api/v1/account/entitlements`, `/api/v1/account/usage`, `/api/v1/sensitive-action-grants` |
| Commerce | `/api/v1/checkout-orders`, `/api/v1/checkout-sessions`, `/api/v1/billing-portal-sessions`, `/webhooks/stripe` |
| Deals | `/api/v1/deals`, `/api/v1/deals/{deal_id}`, `/api/v1/deals/{deal_id}/lifecycle-transitions` |
| Preflight | `/api/v1/deals/{deal_id}/preflights`, `/api/v1/deals/{deal_id}/targeted-repreflights` |
| Sources | `/api/v1/deals/{deal_id}/upload-sessions`, `/api/v1/deals/{deal_id}/source-materials`, `/api/v1/deals/{deal_id}/source-packets` |
| Jobs | `/api/v1/jobs/{job_id}`, `/api/v1/jobs/{job_id}/events`, `/api/v1/jobs/{job_id}/cancellations`, `/api/v1/jobs/{job_id}/retries` |
| Evidence | `/api/v1/deals/{deal_id}/evidence`, `/api/v1/deals/{deal_id}/claims`, `/api/v1/deals/{deal_id}/human-decisions` |
| Analysis | `/api/v1/deals/{deal_id}/calculations`, `/api/v1/deals/{deal_id}/models`, `/api/v1/deals/{deal_id}/analyses` |
| Process | `/api/v1/deals/{deal_id}/buyer-candidates`, `/api/v1/deals/{deal_id}/outreach-waves`, `/api/v1/deals/{deal_id}/ndas`, `/api/v1/deals/{deal_id}/bids` |
| Deliverables | `/api/v1/deals/{deal_id}/deliverables`, `/api/v1/deals/{deal_id}/reviews`, `/api/v1/deals/{deal_id}/qc-findings`, `/api/v1/deals/{deal_id}/execution-packages` |
| Portability | `/api/v1/deals/{deal_id}/internal-controlled-exports`, `/api/v1/deals/{deal_id}/reimport-sessions` |
| External use | `/api/v1/deals/{deal_id}/external-use-decisions`, `/api/v1/deals/{deal_id}/externally-authorized-deliveries`, `/api/v1/deals/{deal_id}/recipient-accesses` |
| Retention | `/api/v1/account/deletion-requests`, `/api/v1/deals/{deal_id}/deletion-requests` |

Commands use nouns only where creating a resource is truthful; state transitions use explicit command subresources. The API never exposes a generic update endpoint that can set arbitrary domain status.

### 7.3 Authentication and authorization

Banker requests carry a Clerk session. The API validates signature, issuer, audience, expiry, session posture, and required MFA/fresh-factor evidence, then maps the Clerk subject to the product Actor. Durable ownership never uses the Clerk user ID as an Account or Deal ID.

Supabase Auth is not used as a second customer identity system. Supabase's Clerk Third-Party Auth integration validates the same Clerk session only for the narrowly permitted direct TUS Storage path; all other browser business access goes through the Product API.

Sensitive mutations require a single-use Sensitive Action Grant bound to:

- Clerk session;
- Actor;
- exact typed command and canonical command digest;
- exact resource and current ETag or immutable dependency IDs;
- the command's Idempotency-Key;
- issue and expiry time; and
- a nonce consumed in the same transaction as the mutation.

Recipient requests use a separate Recipient Session and never become Account sessions.

### 7.4 Idempotency and optimistic concurrency

Every externally retryable side-effecting first-party Banker POST command carries Idempotency-Key. Provider Webhooks use provider event identity, and Recipient verification challenges use their single-use challenge nonce instead. The record binds Account, Actor, command type, canonical request digest, result resource or Job, and response. The same key and request returns the prior result; the same key with a different request returns 409 idempotency_key_reused.

Idempotency records remain for at least 30 days after terminal Job state or, for non-Job commands, after the durable result. Created objects retain their origin command identity or permanent business uniqueness as applicable.

Mutable aggregates expose ETag derived from row_version:

- required If-Match missing: 428;
- stale If-Match: 412;
- valid If-Match: atomic update and row-version increment.

Append-only objects do not use last-write-wins.

### 7.5 Error contract

All API errors use RFC 9457 application/problem+json with stable product extensions:

~~~json
{
  "type": "https://app.example.com/problems/version-conflict",
  "title": "Resource version conflict",
  "status": 412,
  "code": "version_conflict",
  "detail": "The resource changed after it was loaded.",
  "instance": "/api/v1/deals/example",
  "trace_id": "privacy-safe-trace-id",
  "retryable": false,
  "recovery_action": "reload_and_compare",
  "errors": []
}
~~~

Stable status mapping:

| Status | Meaning |
|---:|---|
| 400 | malformed request |
| 401 | authentication missing or expired |
| 403 | authenticated but action prohibited |
| 404 | absent or not visible in the current tenant scope |
| 409 | business-state or idempotency conflict |
| 412 | optimistic-concurrency conflict |
| 413 | file, batch, packet, or request too large |
| 415 | unsupported media type |
| 416 | protected-object byte range cannot be satisfied |
| 422 | domain, rights, compatibility, or semantic-contract failure |
| 428 | required concurrency precondition missing |
| 429 | first-party edge rate or commercial-capacity limit before durable acceptance |
| 503 | temporary dependency or capacity failure |
| 504 | bounded operation timed out |

Provider messages, SQL, local paths, secrets, Source Material, and other-tenant existence are never returned. Field errors use stable JSON Pointer paths. Frontend behavior switches on code and recovery_action, not localized message text. Provider throttling after durable Job acceptance is represented through Job state and Job Problems rather than passed through as a provider HTTP `429`.

### 7.6 Job events

GET /api/v1/jobs/{job_id}/events opens an authorized SSE stream. Persisted Job Events carry a monotonically increasing sequence used as the SSE id. Last-Event-ID replays authorized events after reconnect.

- connection heartbeat: 15 seconds;
- Worker heartbeat: no more than 30 seconds between durable heartbeats;
- event retention: at least 30 days after terminal Job state;
- SSE content: Job/Step identity, safe stage, progress, state, time, recovery action, and Problem Details reference;
- excluded content: Deal content, raw provider output, Source bytes, customer filenames, and provider errors.

GET /api/v1/jobs/{job_id} remains the authoritative current snapshot. SSE is only the notification path.

## 8. Upload, quarantine, and source acceptance

### 8.1 Upload flow

~~~mermaid
sequenceDiagram
    participant B as "Browser"
    participant A as "Control plane"
    participant S as "Supabase quarantine storage"
    participant W as "Heavy worker"
    participant K as "Google Cloud KMS"
    participant D as "PostgreSQL"

    B->>A: "Create Upload Session with declared metadata"
    A->>D: "Check Actor, purpose, Account/Deal scope, limits, entitlement"
    A-->>B: "Exact immutable object path and expiry"
    B->>S: "TUS chunks with Clerk session"
    S-->>B: "Upload complete"
    B->>A: "Finalize Upload Session"
    A->>D: "Freeze session and create Quarantined Upload"
    A->>D: "Create safety Job and Outbox"
    W->>S: "Read exact quarantined bytes"
    W->>W: "Digest, type, malware, archive and structure checks"
    W->>K: "Wrap per-object data key"
    W->>S: "Write encrypted Accepted Source Object"
    W->>D: "Propose coverage, compatibility and object identities"
    A->>D: "Atomically accept Source Record or record blocker"
~~~

Upload Session RLS permits only the matching Actor to create the exact path while the session is open. Deal Material requires an exact Deal; the only Account-only V1 purpose is a separately supplied `account_reusable_template` outside live Deal history. Listing, overwrite, alternate object paths, purpose changes, and post-expiry writes are denied. The browser never receives Supabase service-role credentials. This bounded exception and direct TUS boundary are fixed by [ADR 0033](../adr/0033-allow-purpose-scoped-account-template-quarantine-uploads.md).

### 8.2 File and packet limits

| Scope | V1 limit |
|---|---:|
| Ordinary file | 250 MB |
| PDF or DOCX | 500 pages |
| PPTX | 500 slides |
| XLSX | 200 sheets and 1,000,000 non-empty cells |
| EML | 50 attachments |
| ZIP compressed | 1 GB |
| ZIP expanded | 5 GB |
| ZIP members | 250 |
| ZIP nesting | depth 1; nested archives rejected |
| ZIP expansion ratio | 100:1 |
| Archive member | 250 MB |
| Upload batch | 50 files or 2 GB |

File count, declared size, actual size, logical pages, archive expansion, and active storage are checked independently. Partial batch acceptance is explicit per file; an accepted file never hides another failed member.

### 8.3 Safety policy

Every upload is quarantined before preview, parsing, Office handling, OCR, AI, or Source acceptance. Checks include:

- streaming SHA-256;
- magic bytes, extension, MIME, and container consistency;
- current ClamAV scan;
- archive traversal, symlink, device entry, count, size, depth, and ratio limits;
- no-network isolated structural inspection with read-only inputs, bounded CPU, RAM, file descriptors, and time;
- active content, encryption, malformed relationship, and external-dependency inventory.

Scanner error, stale required signature, timeout, exhaustion, or incomplete coverage fails closed. CDR is not used to mutate the original and describe it as clean.

Rejected formats and content include:

- XLSM, XLSB, XLAM, PPTM, PPAM, DOCM, DOTM;
- VBA or executable embedded packages;
- unsafe OLE;
- encrypted or materially malformed containers;
- content whose executable posture cannot be enumerated.

External links, Power Query, data connections, linked sources, and non-executable embedded documents are never refreshed. They are recorded as metadata and block only the dependent scope until the referenced source is supplied or the user provides a dependency-free version.

### 8.4 Protected Account and Deal Object encryption

After safety success, each accepted typed file attachment uses the same protected-object encryption contract. Protected Deal Objects include retained source representations, Native Artifacts, Reader Copies, and controlled Deal exports. Protected Account Objects include separately supplied Account Template versions, retained invoice copies, and Account Data Export objects. Each object receives a fresh random 256-bit DEK and a versioned chunked AES-256-GCM envelope. The DEK is wrapped by the environment's United States-region Google Cloud KMS KEK. Plaintext exists only in bounded worker temporary space or tmpfs and is cleared after the Job. Typed Account/Deal scope and the shared Gateway boundary are fixed by [ADR 0034](../adr/0034-stream-typed-account-and-deal-protected-objects-through-one-gateway.md).

The encryption format uses a random 64-bit nonce prefix plus an unsigned 32-bit big-endian chunk index, prohibits index reuse under one DEK, and rejects an object requiring 2^32 or more chunks. Authenticated Additional Data binds the envelope version, environment, Account, Deal, object identity, object class, plaintext digest, chunk index, and declared chunk count. Each chunk carries its own authentication tag; the stored record also binds the complete ciphertext digest and byte length.

The database stores:

- encrypted object identity and ciphertext digest;
- original plaintext digest;
- encryption envelope version;
- KMS key resource and version;
- wrapped DEK;
- chunking and authentication parameters; and
- source and processing lineage.

Rotation rewraps DEKs. It does not rewrite immutable ciphertext unless the encryption format itself is migrated through a separately verified revision process.

## 9. Source processing and Evidence

### 9.1 Native-first processing

| Format | Primary path | Conditional path |
|---|---|---|
| XLSX, PPTX, DOCX | Aspose native structure and render | Microsoft 365 compatibility lab for release truth |
| PDF | native text, geometry, object inventory, render | Google Document AI OCR/Layout Parser only for affected pages |
| CSV | deterministic UTF-8/tabular parser | banker mapping when schema or encoding is ambiguous |
| JSON | JSON Schema 2020-12 validation | explicit migration for supported prior major versions |
| EML | bounded MIME parser | attachments re-enter quarantine individually |
| ZIP | container enumeration only | accepted members re-enter ordinary file pipeline |
| Public HTML | isolated public fetch and render | live-only citation when Rights Posture prohibits snapshot |

Google Document AI uses a United States processor, pinned GA processor version, and only the minimum selected pages or regions. OCR or visual output records Processing Coverage and is not source truth.

### 9.2 Public Web Evidence

The public fetcher accepts only unauthenticated HTTPS GET:

- no cookie, credential, login, paywall, form submission, or access-control bypass;
- public IP destinations only;
- DNS rebinding and private/reserved address checks before and after redirect;
- bounded redirects, response size, content type, and time;
- isolated rendering without page-originated product actions.

Each retrieval creates a new Web Evidence Observation. If rights permit, it stores exact response bytes, permitted headers, canonical URL, retrieval time, status, TLS/HTTP metadata, digest, render, extracted text, Processing Coverage, and Native Locators. If snapshot retention is prohibited, only permitted citation context and the live-only/snapshot-prohibited reason are retained. Refresh never overwrites an earlier observation and always triggers Impact Assessment.

### 9.3 Native Locator profiles

Every locator binds the exact Source Record representation, plaintext byte digest, parser identity, and selector-profile version. Human-readable page or sheet labels are display aids, not sole identity.

| Format | Required selector material |
|---|---|
| PDF | page index and display label, normalized bounding box, quote/context, text layer |
| XLSX | package part, sheet identity, cell/range/table/name/chart selector, formula/value posture, context hash |
| PPTX | slide part and stable slide ID, object ID, normalized bounding box, quote/context |
| DOCX | package part, paragraph ID/content control/bookmark/table path, quote/context; page only for display |
| CSV | stable row identity or immutable row digest, column identity, context |
| JSON | JSON Pointer plus representation digest |
| EML | message identity, MIME part path, quote/context |
| HTML | captured representation, DOM/semantic selector, quote/context, geometry where rendered |

Resolution returns resolved, moved, ambiguous, or unresolved. It never guesses after uniqueness is lost.

## 10. Financial, Office, and artifact processing

### 10.1 Office production and compatibility truth

Aspose Python via .NET is the production engine family for:

- XLSX creation and formula calculation;
- PPTX creation and rendering;
- DOCX creation and pagination; and
- PDF Reader Copy production.

Engine, runtime, font, template, and container versions are pinned.

Compatibility claims are established in an isolated non-production environment using an exact Microsoft 365 Current Channel for Windows build. That lab opens, recalculates where applicable, saves, renders, and compares Reference Deal fixtures. Current Microsoft 365 for Mac is a secondary open/save/visual smoke path. Aspose, LibreOffice, structural parsers, or Mac success alone cannot expand the Capability Manifest.

V1 does not claim universal Office compatibility, Excel 2016/2019/2021 compatibility, PDF/A, or PDF/UA without separate evidence.

### 10.2 Excel profile

XLSX output uses Transitional OOXML and a versioned Formula Compatibility Profile:

- allowlisted functions only;
- dynamic arrays supported per tested function, not as a blanket class;
- no material iterative or circular calculations;
- no material data tables, Cube, RTD, UDF, macro, or external refresh;
- random volatile functions blocked;
- NOW and TODAY evaluated against a recorded Evaluation Time;
- hidden sheets, rows, columns, names, objects, and formulas included in safety and QC coverage.

Formula value, formula text, inputs, calculation mode, engine version, precision posture, and Microsoft 365 truth result remain separately observable.

### 10.3 PDF profile

Reader Copies target a constrained ordinary PDF 1.7 profile:

- fonts embedded or subset;
- no JavaScript, attachments, forms, media, 3D, launch actions, or encryption-as-access-control;
- safe internal links permitted;
- external URLs removed by default unless an exact approved use requires them.

Primary verification uses Acrobat Reader for Windows and Edge; secondary viewing uses current macOS Preview/Chrome/Safari as defined in the Capability Manifest. No archival or accessibility conformance claim follows automatically.

### 10.4 Canonical structured exports

JSON Schema 2020-12 is the canonical machine contract. JSON uses UTF-8. Exact financial values are decimal strings at the external boundary with datatype, precision, scale, unit, currency, and period.

- timestamps: RFC 3339 UTC Z;
- dates: ISO calendar dates;
- missingness: known, unknown, not_applicable, withheld, or not_provided;
- null never silently collapses these states;
- schema versions use semantic versioning;
- current major and previous major remain reimportable for at least 12 months;
- unknown fields are preserved in a declared extension area or rejected.

CSV follows RFC 4180 with UTF-8, comma delimiter, header row, CRLF, stable column IDs, a sidecar schema, and formula-injection-safe export.

### 10.5 Three-way round trip

Only product-exported files with verified controlled metadata enter automatic round trip.

Artifact Regions are:

- generated-owned;
- banker-owned;
- protected-formula;
- shared-merge; or
- unmanaged.

The comparator evaluates prior generated baseline, Banker-edited import, and latest generated candidate. If both Banker and generator changed the same verified region, it creates a Merge Conflict. Resolution requires an explicit Human Decision: keep Banker, take generated, or provide a manually reconciled import. Last-write-wins is prohibited.

Metadata loss, unverified baseline, unsupported edits, or ambiguous region identity disables automatic merge. An accepted reimport creates a new immutable Revision.

Every retained Native Artifact, Reader Copy, accepted reimport, and controlled Deal export is a Protected Deal Object. Retained invoice copies and Account Data Export objects are Protected Account Objects. The dedicated Protected Object Gateway owns synchronous authorized reads for both typed scopes and recipient rendering for eligible Deal objects; Job-scoped Workers own processing, comparison, and reimport reads. Both paths stream only after current authorization is rechecked and never create a reusable public object URL.

### 10.6 Manifest and signing

Every controlled source, Native Artifact, Reader Copy, control record, and archive member receives a SHA-256 byte digest. The Artifact Manifest is serialized as UTF-8 RFC 8785 JCS and signed through the Artifact Signer with a dedicated Google Cloud KMS `EC_SIGN_ED25519` asymmetric-signing key at the software protection level. The Audit Signer uses a separate KMS key and identity for Audit Checkpoints. Private signing material is never exported to the VPS.

Public verification keys are exposed through the purpose-separated registry:

~~~text
/.well-known/integrity-keys.json?purpose=artifact
~~~

Old public keys remain available for historical validation. Key rotation never rewrites prior artifacts. The signature proves product-environment origin and manifest integrity, not correctness, Banker approval, Professional Usability, or external-use authorization.

V1 does not add OOXML package signatures, PDF digital signatures, or a public certificate trust chain.

### 10.7 Export, delivery, and external use

Internal Controlled Export and Externally Authorized Delivery use separate commands, tables, manifests, and Audit Events.

Internal Controlled Export:

1. requires current Banker authority and a Sensitive Action Grant;
2. selects exact Revisions and control records;
3. creates a signed manifest and Protected Deal Object;
4. records purpose as inspection, native editing, backup, or controlled reimport;
5. does not create an External-Use Decision, recipient grant, delivery, or use event.

External use:

1. the Banker records an External-Use Decision for an exact Revision, audience or recipient, purpose, channel, expiry, and conditions;
2. the control plane rechecks Professional Usability, QC, Package Readiness, Rights Posture, confidentiality, Impact Assessment, and exact-Revision posture;
3. an eligible decision may create a standalone exact delivery package;
4. Recipient Access, when selected instead, atomically creates its recipient-specific delivery package and Access bound to the same Decision/Scope, so the client does not perform a hidden prerequisite command;
5. observable Recipient Access or explicit Banker declaration creates the actual External-Use Event.

A new Revision, revoked or invalidated decision, Circulation Blocked Impact Assessment, expired grant, or Post-Term entry prevents prospective access as defined by the exact policy. Archiving a Deal releases Active Deal capacity and makes its Workspace read-only but does not silently revoke a still-valid Recipient Access. An open Payment Dispute or Account Security Restriction instead suspends every otherwise-active Recipient Access, invalidates its Sessions and stream grants, and requires an explicit exact Access resumption with a Sensitive Action Grant after every cause clears; no prior Recipient Session revives. At paid-term end, all Recipient Access is revoked before the 30-day Post-Term Access window begins.

## 11. Durable Job orchestration

### 11.1 Job model

A Job is a dependency-directed graph of Job Steps. Persistence includes Job, JobStep, JobDependency, JobAttempt, JobLease, JobEvent, TransactionalOutbox, IdempotencyRecord, and UsageReservation.

Public machine values are exactly:

- `queued`;
- `running`;
- `waiting_for_user`;
- `waiting_for_source`;
- `blocked`;
- `failed_retryable`;
- `failed_terminal`;
- `canceled`;
- `completed`.

The UI may render hyphenated labels. Internal states such as `cancel_requested`, `compensating`, or `dead_lettered` map to the public `snake_case` values and never create hidden business posture.

### 11.2 Claiming, lease, and idempotency

- PGMQ messages contain only Job identity and safe scope, not Deal content.
- Claiming uses a transaction and row locking compatible with FOR UPDATE SKIP LOCKED.
- Lease duration: 90 seconds.
- Durable worker heartbeat: at least every 30 seconds.
- Expired leases may be reclaimed only after checking committed step effects.
- Side effects first write a temporary content-addressed object, then attach it once through a unique database constraint.
- Exactly-once business effects come from transactions, unique keys, and idempotency, not queue delivery claims.

Waiting states release the execution lease. The Job retains accepted immutable steps and can resume from the first unsatisfied dependency.

### 11.3 Retry and cancellation

One AI task permits at most three total provider invocations: one initial invocation and at most two additional opportunities shared by transient retries and contract repair. A transient retry or repair each consumes one opportunity. When both additional opportunities remain available, transient backoffs are:

- first backoff: 5 seconds;
- second backoff: 30 seconds;
- Retry-After may lengthen but not exceed the total operation deadline.

Retryable conditions include bounded timeouts, 408, 429, selected 5xx, and transient connection failure. Authentication, rights, unsupported format, invalid schema after the allowed repair, business blockers, and permission failures are not silently retried.

Cancellation is cooperative:

- stop new steps;
- allow an atomic non-interruptible operation to finish or time out safely;
- preserve accepted immutable results;
- delete unattached partial objects within the retention deadline;
- restore unused Usage Reservations;
- never delete prior history as compensation.

Pause is an authorization fence rather than a best-effort UI state: its transaction advances the Workspace posture version, stops new claims, and prevents every prior Deal-scoped Job Scope from committing another domain result. Running work stops at a safe checkpoint and becomes `canceled` or public `blocked` with `workspace_posture_changed`; already-committed history and already-completed irreversible external effects remain truthful. Archive remains pending while the Banker-selected eligible mutating Jobs finish or cancel, then advances the posture version and admits only newly authorized Archived read/export/deletion work.

Dead-letter handling produces a visible failed-terminal state and a defined recovery action. There is no hidden operator-only business recovery.

### 11.4 Time and concurrency limits

| Operation | Limit |
|---|---:|
| Upload Session | 2 hours |
| Safety processing | 10 minutes per file |
| Native parse | 20 minutes |
| OCR | 60 minutes per document |
| AI attempt | 10 minutes |
| Artifact generation | 30 minutes |
| Full workflow | 4 hours |
| Full workflows | 1 per Deal, 2 per Account |
| Heavy worker concurrency on baseline VPS | 2 |
| Light worker concurrency on baseline VPS | 8 |

The scheduler must reserve CPU, RAM, disk, provider, and commercial capacity separately. Increasing worker concurrency requires a measured Capability Manifest update; it is not inferred from queue demand.

## 12. AI Prompt and Contract design

### 12.1 Provider route

All AI egress uses the deployment-configured fixed base URL:

~~~text
https://www.hellox.cloud
~~~

Test and production use separate platform credentials in deployment configuration. Accounts cannot configure base URL, API key, provider headers, or fallback. The browser never sees the credential.

Authentication success or an OpenAI-compatible label proves only route reachability. Before any Confidential Deal Material is sent, the exact model/API combination must have a versioned AI Provider Capability Profile covering:

- available endpoint profile;
- exact model IDs;
- Structured Output behavior;
- context and output limits;
- vision support where applicable;
- error and Retry-After semantics;
- usage reporting;
- processing region;
- retention;
- training use;
- provider access posture; and
- contract-probe evidence.

Until this evidence exists, only synthetic or non-confidential testing is allowed. Restricted Deal Material requires its own compatible profile.

### 12.2 Model capability mapping

Configuration maps logical roles to exact validated model IDs:

- reasoning_primary;
- structured_extraction;
- vision_inspection;
- contract_repair; and
- evaluation_judge.

source_semantic_extraction, evidence_relationship_proposal, and normalization_mapping_proposal use structured_extraction. source_conflict_analysis, diligence_work_item_proposal, analysis_draft, buyer_candidate_proposal, auction_process_recommendation, deal_recommendation_draft, deliverable_content_draft, and change_impact_proposal use reasoning_primary. semantic_qc_review uses vision_inspection only when its exact input contract includes visual source or render evidence; otherwise it uses reasoning_primary. contract_repair and offline qualitative evaluation use their corresponding roles.

Each Task Definition pins its logical role, AI Provider Capability Profile, maximum input and output, reasoning budget, supported sampling and seed parameters, timeout, cost ceiling, and allowed same-route fallback set. Accounts and users cannot adjust the model, temperature, top-p, reasoning effort, system instructions, or fallback. A mapping or parameter change creates a new version and triggers synthetic contract and affected Reference Deal suites. Fallback is allowed only to another HelloX model that passed the same task contract and release threshold. Otherwise the capability blocks.

### 12.3 AI Task Definition and catalog

Each AI Task Definition is immutable and contains:

~~~json
{
  "task_type": "evidence_backed_analysis",
  "task_definition_version": "1.0.0",
  "system_policy_version": "1.0.0",
  "domain_instruction_version": "1.0.0",
  "input_contract_version": "1.0.0",
  "output_schema_version": "1.0.0",
  "evidence_policy_version": "1.0.0",
  "provider_capability_profile_id": "uuid",
  "permitted_material_classification": {
    "provenance_classes": ["real"],
    "confidentiality_classes": ["confidential"],
    "de_identification_postures": ["not_assessed", "verified_for_scope"]
  },
  "required_rights_operations": ["ai_processing"],
  "permitted_input_types": ["source_excerpt", "table_region"],
  "limits": {
    "max_context_bytes": 0,
    "max_output_tokens": 0,
    "max_cost_minor_units": 0,
    "timeout_seconds": 600
  },
  "evaluation_suite_version": "1.0.0"
}
~~~

Zero-valued resource fields above are placeholders that must be replaced by probe-backed task configuration before enablement; they are not unlimited values.

One AI Task Definition owns one atomic responsibility, one exact input perimeter, and one typed result family. Official Investment Banking workflows compose multiple Task Definitions; an official plugin skill, complete workflow, UI page, or generic Deal-wide request is not itself a Task Definition. Financial arithmetic, formula execution, authoritative state transitions, readiness promotion, and external actions remain deterministic or human-controlled responsibilities rather than AI tasks.

The V1 catalog contains these Task Families:

| AI Task Family | Permitted proposal responsibility |
|---|---|
| source_semantic_extraction | Atomic Claim, definition, period, unit, currency, and source-attribution candidates from accepted representations |
| evidence_relationship_proposal | Support or challenge relationships between an atomic proposition and pre-issued source fragments |
| source_conflict_analysis | Definition, period, unit, value, version, scope, or meaning conflicts without adjudicating them |
| normalization_mapping_proposal | Line-item, field, period, unit, and category mappings without financial arithmetic |
| diligence_work_item_proposal | Potential Diligence Issue, Information Request, or Open Item |
| analysis_draft | Draft Analysis from exact Evidence, Facts, Assumptions, Calculations, Models, and Scenarios |
| buyer_candidate_proposal | Buyer Candidate and evidence-backed rationale without approval, capacity, interest, contactability, or outreach authority |
| auction_process_recommendation | Proposed auction next action without creating a Process Event, changing stage, or acting externally |
| deal_recommendation_draft | Draft Bid comparison, alternatives, selection rationale, or other Recommendation without making a Human Decision |
| deliverable_content_draft | Structured semantic content for a stated Deliverable and audience without producing authoritative artifact bytes |
| semantic_qc_review | Proposed semantic, Evidence, qualification, consistency, or audience QC Findings without granting readiness |
| change_impact_proposal | Potential semantic impact of a new source, correction, or Decision; deterministic lineage still owns the candidate dependency closure |
| contract_repair | Internal schema-constrained repair of one response without new business analysis, source scope, or authority |

The first sellable release defines these concrete Task Definitions:

| Workstream | Concrete Task Definitions |
|---|---|
| Source and Evidence | source_claim_extraction, financial_semantic_extraction, bid_term_extraction, process_update_extraction, claim_evidence_linking, material_source_conflict_analysis, financial_normalization_mapping |
| Diligence and Analysis | diligence_issue_proposal, information_request_proposal, sell_side_analysis_draft, valuation_commentary_draft |
| Buyer and Auction | buyer_candidate_proposal, auction_next_action_recommendation, bid_comparison_recommendation |
| Deliverable drafting | teaser_content_draft, cim_content_draft, management_presentation_content_draft, bid_evaluation_memo_draft, workbook_commentary_draft, process_communication_draft, meeting_preparation_question_draft |
| QC, Revision, and repair | deliverable_semantic_qc, native_reader_semantic_parity_review, semantic_change_impact_proposal, contract_repair |

Extraction tasks require an exact Source Record, Source Representation, Processing Coverage, pre-issued fragments, and Work Objective. Evidence and conflict tasks add atomic propositions, locators, definitions, periods, and units. Analysis and Recommendation tasks consume only the exact accepted Evidence, Facts, Assumptions, Calculations, Models, Scenarios, and intended use required by the Task Definition. Deliverable tasks add the Artifact Template or section contract, audience, purpose, and current Revision. QC tasks add exact Native Artifact, Reader Copy, Artifact Manifest, lineage, Revision, and audience contract. Impact tasks add the changed object/version, deterministic candidate dependency closure, and current independent states. contract_repair receives only the invalid response and contract data defined below.

### 12.4 Official workflow reference mapping

The official Investment Banking plugin is a design-time reference, not a runtime dependency or Prompt include. The [AI Prompt & Contract Spec](ai-prompt-contract-spec.md) maintains an Official Workflow Reference Matrix for every AI Task Family with:

- the inspected plugin package version and exact workflow, skill, reference, schema, or validator location;
- adopted semantic rules;
- strengthened product rules;
- rejected scaffold, permissive contract, provider-access assumption, or non-authoritative fallback;
- divergence rationale; and
- the owning product Prompt, schema, deterministic validator, and evaluation cases.

V1 maps CIM teardown primarily to source_semantic_extraction, evidence_relationship_proposal, source_conflict_analysis, diligence_work_item_proposal, and analysis_draft; financial normalization to source_semantic_extraction and normalization_mapping_proposal; buyer-list work to buyer_candidate_proposal; process tracking to auction_process_recommendation; memo, CIM, and deck construction to analysis_draft, deal_recommendation_draft, and deliverable_content_draft; and semantic deliverable QC to semantic_qc_review. The product's versioned Revision and lineage contract adds change_impact_proposal.

Plugin text is never injected directly into a production Prompt. A plugin upgrade first produces a reviewed reference diff and Impact Assessment. Adopting a changed rule creates affected Task Definition, Prompt, AI Evidence Policy, schema, validator, or evaluation versions and cannot silently alter an enabled task.

### 12.5 AI Prompt Package and enablement

Every AI Task Definition uses one immutable, English, compilable AI Prompt Package. Its source contains the task manifest, non-overridable product and safety-policy reference, task instruction, domain instruction, AI Evidence Policy, input and output schemas, AI Context Plan, synthetic or separately rights-cleared examples, evaluation-suite manifest, and Official Workflow Reference Matrix entries. Typed slots are the only dynamic assembly mechanism. Source Material and user content are explicitly delimited as untrusted data and can never occupy or override an instruction layer. Prompt examples include successful, conflicted, missing-information, and AI Abstention cases and never use silently sampled live Deal content.

Each task instruction uses the same contract-first structure:

1. one atomic Task Objective and its success condition;
2. the proposal-only Authority Boundary;
3. only the Canonical Domain Definitions required by the task;
4. the exact Permitted Input Inventory and required/conditional/optional posture;
5. the Required Method for atomicity, comparison, omission, conflict, and abstention without requesting hidden reasoning;
6. Evidence, uncertainty, and Output Ceiling rules;
7. the single Strict Output Contract; and
8. synthetic successful, conflicted, missing-information, prompt-injection, and abstention examples.

Prompts do not use professional-authority role play such as instructing the model to act as the approving banker. They instruct the model to perform one bounded task and produce proposals only within supplied scope. A concise Evidence-linked basis summary is allowed; hidden chain-of-thought is not requested or stored. Instructions embedded in Source Material remain untrusted content even when they tell the model to ignore policy, use a tool, expand scope, or change output format.

Compilation produces canonical provider messages, a payload digest, and the complete version manifest used by an AI Run. AI Prompt Package versions are immutable and use semantic versioning: a major version changes incompatible input, output, Evidence, or authority semantics; a minor version adds backward-compatible capability or fields; and a patch version changes wording, fixes a defect, or adjusts a rubric without changing the declared contract. Every content change still creates a version and reruns affected suites.

AI Task Enablement follows `draft`, `candidate`, `enabled`, `suspended`, and `retired`. Draft content cannot run. Candidate content is frozen and limited to synthetic or explicitly evaluation-authorized inputs. Enabled content has passed the applicable provider probes, contract suites, Critical sentinels, and evaluation gates. Suspension prevents new runs after a material capability, safety, Evidence, or quality concern. Retirement permanently removes the version from new selection while preserving historical interpretation. Each environment, Task Definition, permitted Material Provenance Class, Confidentiality Class, De-identification Posture, and provider profile combination has at most one default enabled version. Rollback re-enables a previously passing immutable version rather than mutating current history.

### 12.6 Input and Context contract

The control plane constructs the authoritative AI Input Envelope. It binds:

- Task Definition, Prompt, input contract, output schema, and AI Evidence Policy versions;
- Work Objective, exact Deal, Job, and Job Scope;
- permitted Material Provenance Classes, Confidentiality Classes, De-identification Postures, intended use, audience, and resource limits;
- exact Source Record, Source Representation, source-fragment, Native Locator, and content-digest identities;
- exact accepted Facts, Assumptions, Human Decisions, Calculations, Models, Scenarios, and deterministic results required by the task;
- required, conditional, and optional input classifications; and
- a request nonce and canonical input digest.

Each AI Task Definition owns a deterministic, versioned AI Context Plan. It selects only exact objects permitted by the current Job Scope and records full input coverage. Required content is never silently truncated. When the required scope cannot fit one validated provider request, the control plane uses task-defined child runs whose accepted results retain coverage manifests, input digests, and original Evidence references; an aggregate run consumes only those validated results and references. Excluded, unprocessed, or failed scope remains explicit in omissions or AI Abstention. If the required cross-source context cannot be decomposed safely, the task blocks. The model cannot retrieve more content, broaden scope, choose tools, or replace omitted source content with an untraceable summary.

Every referencable input fragment receives an unguessable, run-scoped identifier bound to its exact source, representation, digest, and Native Locator. Model output may reference only these pre-issued identifiers and states whether each proposed relationship supports or challenges an atomic proposition. Model-authored filenames, URLs, page numbers, sheet or cell addresses, slide numbers, source IDs, or locator strings are non-authoritative and cannot satisfy Evidence validation. The model emits only response-local candidate keys; after validation, the control plane assigns global AI Proposal, Evidence Candidate, and Evidence identities.

Prompt assembly is ordered:

1. non-overridable product and safety policy;
2. bounded task and domain instruction;
3. structured input inventory with exact source/version identity;
4. source content explicitly delimited as untrusted data;
5. strict JSON output contract;
6. Evidence, omission, conflict, uncertainty, and abstention rules.

There is no general Deal-wide agent, autonomous planning authority, browser, network, code execution, storage access, or model-selected tool.

### 12.7 Output contract

AI may return:

- proposed Claim;
- Evidence Candidate;
- proposed Assumption;
- draft Analysis;
- draft Recommendation;
- potential Diligence Issue;
- AI Abstention for an exact full or partial scope;
- proposed Artifact content.

It may not directly create a Fact, Human Decision, Process Event, External-Use Decision, accepted Deliverable, or business side effect.

Every strict output schema uses additionalProperties false and requires:

- a stable response-local candidate key;
- task identity and exact input-scope digest;
- the task-specific result payload;
- an Evidence relationship or explicit non-support status for each material proposition;
- one canonical support_status value defined below;
- conflicts and omissions;
- limitations;
- required Banker decision; and
- no invented confidence-as-probability acceptance rule.

The control plane, rather than the model, owns the authoritative AI Run envelope. Model output is limited to status (`complete`, `partial`, or `abstained`), one task-specific strict result payload, references to pre-issued Evidence inputs, conflicts, omissions, limitations, AI Abstentions, and proposed required Human Decisions. Provider, model, AI Run, Actor, usage, cost, latency, retry, validation, and global object identities are recorded by trusted product components and are never accepted from model-authored fields.

Every model response has the minimal common shape `status`, `scope_digest_echo`, `results`, `abstentions`, and `omissions`. Each result item contains a response-local candidate key, Evidence links, support status, conflicts, uncertainty flags, limitations, and any proposed required Human Decision; its business content remains fully task-specific. support_status is exactly `supported`, `challenged`, `conflicted`, `insufficient_support`, `unresolved_locator`, `coverage_incomplete`, `rights_blocked`, `out_of_scope`, or schema-authorized `not_applicable`. `not_applicable` is valid only for a declared non-propositional field that does not require Evidence.

Each AI Abstention contains a response-local abstention key, affected scope, reason codes, unsupported propositions, missing or ineligible inputs, current Output Ceiling, permitted partial scope, smallest recovery action, optional Information Request proposal, optional Assumption proposal, and resume condition. reason_codes are exactly `evidence_missing`, `evidence_conflicted`, `definition_unclear`, `period_unclear`, `unit_or_currency_unclear`, `coverage_incomplete`, `locator_unresolved`, `rights_blocked`, `source_not_reliance_eligible`, `deterministic_validity_missing`, or `outside_task_scope`.

Each proposed required Human Decision contains the Decision type, question, exact object/version references, scope, purpose, audience, alternatives, Evidence references, deterministic-check references, optional recommended option, conditions, and invalidation triggers. A recommended option remains a Recommendation; the record cannot state or imply that a Human Decision occurred. Only the corresponding typed control-plane Decision flow can create it.

AI Task Family is classification only. Every concrete AI Task Definition owns one strict output schema, and one AI Run validates exactly one task-specific payload type. Concrete definitions such as CIM section drafting, Teaser section drafting, and Bid Recommendation Memo drafting may reuse canonical JSON Schema `$defs` but cannot use a cross-task `content`, `metadata`, `extensions`, or open union escape hatch. Arrays, strings, numbers, units, precision, and enums have explicit bounds; unknown fields and enum values fail validation.

The minimum task-specific payloads are:

| AI Task Family | Required business payload |
|---|---|
| source_semantic_extraction | Atomic proposition, speaker/source attribution, definition, period, unit, currency, sign, value or text, and source fragment |
| evidence_relationship_proposal | Proposition key, fragment identifier, support or challenge relationship, supported scope, qualification, and relationship limitation |
| source_conflict_analysis | Competing proposition/fragment keys, conflict dimension, material scope, unresolved alternatives, and affected uses |
| normalization_mapping_proposal | Source field/line key, canonical category proposal, period/unit/currency/sign mapping, mapping basis, and unmapped posture |
| diligence_work_item_proposal | Work-item type, issue or question, material reason, requested Evidence, acceptance condition, priority factors, and affected objects |
| analysis_draft | Question, method, inputs, findings, alternatives, limitations, required Assumptions, and Evidence-linked conclusion |
| buyer_candidate_proposal | Candidate identity, rationale, source context, fit factors, restrictions, and explicit unknown interest/capacity/conflict posture |
| auction_process_recommendation | Current exact process state, proposed next action, prerequisites, prohibited action, required Decision/Event, and affected counterparties |
| deal_recommendation_draft | Alternatives, comparison dimensions, Evidence/Assumptions, trade-offs, recommended option, conditions, and required Decision |
| deliverable_content_draft | Deliverable type, section/region key, audience, purpose, structured content blocks, citations, qualifications, and refresh dependencies |
| semantic_qc_review | Exact Revision/location, finding category, severity proposal, observed condition, expected contract, Evidence, and remediation proposal |
| change_impact_proposal | Changed object/version, candidate dependent, impact basis, potential materiality, and recalculation/regeneration/re-review/circulation-block proposals |
| contract_repair | Repaired payload only, with no new business item, Evidence relationship, argument, or Recommendation |

### 12.8 AI Evidence Policy

Every enabled Task Definition binds one AI Evidence Policy that enforces all of the following:

1. every material proposition has at least one valid Evidence relationship or an AI Abstention;
2. every relationship binds the exact Source Record, Source Representation, pre-issued fragment, and Native Locator;
3. an AI output, summary, derived table, Deliverable, or another AI Proposal cannot provide independent Evidence for itself;
4. multiple references controlled by one underlying source are not represented as independent corroboration;
5. support and challenge are explicit relationships, while mere relevance is not Evidence;
6. every material conflict preserves all competing propositions and locators rather than averaging, choosing the favorable item, or silently overwriting history;
7. stale, coverage-incomplete, rights-blocked, and definition/period/unit uncertainty remain independent conditions rather than one low-confidence score;
8. deterministic acceptance of an Evidence Candidate never promotes a Claim to Fact;
9. insufficient Evidence yields an unknown, Information Request, explicit Assumption proposal, Scenario/sensitivity-only output, or AI Abstention; and
10. no scalar confidence value establishes truth or readiness; the model reports exact uncertainty conditions and the product evaluates each independent state under its owning rules.

### 12.9 Validation, repair, and failure classes

Validation occurs in order:

1. JSON Schema;
2. domain semantic and permission rules;
3. Native Locator resolution and Evidence relationship;
4. deterministic numeric or artifact checks;
5. current Job Scope and Paid Preflight compatibility.

Before model repair, deterministic normalization may correct JSON syntax, enum casing, misplaced fields, required wrappers, and mechanically unambiguous type or format errors without inventing content. One constrained contract-repair request is then allowed and consumes one of the two retry opportunities. It receives only the original visible response, exact output schema, stable validation codes and JSON Pointers, and original Task, Prompt, Schema, and scope-digest identities. It receives no new Source Material, cannot expand the AI Context Plan or authority, and may repair structure only. The control plane compares the original and repaired semantic content; a new Fact, Evidence relationship, argument, Recommendation, hidden conflict or omission, guessed locator, or other substantive change rejects the entire result. Remaining failure rejects the entire candidate result. Free text is never partially guessed into domain objects.

Only the control plane may atomically persist an AI Run, AI Proposal, Evidence Candidate, and their validation results. It may promote an Evidence Candidate to Evidence only when the exact Source Record and representation versions are bound, the Native Locator resolves uniquely, the cited context deterministically supports or challenges the atomic proposition, and the applicable rights, Processing Coverage, Job Scope, Paid Preflight, and task-purpose checks pass. An ambiguous, materially incomplete, conflicted, or otherwise ineligible relationship remains an Evidence Candidate for Banker handling. Evidence acceptance never promotes a Claim to Fact; every authoritative domain transition continues through its own control-plane command and applicable Human Decision while preserving AI Origin.

AI outcomes use four distinct classes:

| Outcome class | Meaning | Default handling |
|---|---|---|
| business_abstention | Structured AI Abstention caused by insufficient business support or permissible scope | Preserve safe independent partial results and exact recovery action |
| policy_block | Rights, material-classification assessment, Job Scope, Paid Preflight, or Provider Profile prohibits execution | Do not call or retry the model until the policy condition changes |
| contract_failure | Input, output, AI Evidence Policy, locator, semantic, deterministic, or repair validation failed | Reject affected result; retry only under the fixed contract policy |
| provider_failure | Timeout, rate limit, authentication, capacity, availability, or malformed provider protocol | Apply bounded provider retry or same-route validated fallback |

Each failure records a stable code, outcome class, retry posture, safe recovery action, affected scope, preserved accepted work, and privacy-safe user message. Protected provider detail remains only in the encrypted AI Run record. Partial acceptance is permitted only when the concrete Task schema declares independently valid result items; otherwise any invalid material item rejects the complete result. AI Abstention cannot masquerade as provider failure, and provider failure cannot be accepted as abstention.

### 12.10 AI Run record

An AI Run retains, encrypted and Deal-scoped:

- Job and AI Task Definition identity;
- prompt and contract versions;
- exact model, provider profile, and parameters;
- exact input object/version references;
- canonical sent-payload digest;
- raw visible provider response and digest;
- token, cost, latency, retry, and Provider Request ID;
- schema, domain, Evidence, and deterministic validation;
- acceptance, rejection, correction, and related Human Decision.

Hidden chain-of-thought is neither requested nor stored.

V1 provides command-level idempotency rather than semantic result caching. Repeating one canonical command with the same Idempotency Key returns the same Job and AI Run; a Worker retry reuses accepted child results. An explicit Banker rerun or refresh creates a new linked AI Run even when the inputs are byte-identical. No result is reused across an Account, Deal, Prompt version, Provider Profile, material-classification scope, Rights Posture, or new command merely because content appears semantically similar.

A provider adapter may consume a stream internally, but partial tokens never become an AI Proposal, accepted domain data, or user-visible business content. The UI exposes durable Job progress and only fully validated typed results. An interrupted buffer remains protected failure data under the AI Run retention rule and is never guessed into a partial result.

The raw visible provider response, canonical sent-payload identity, and applicable protected request record remain encrypted, Deal-scoped AI Run data for validation, reproducibility, retention, deletion, and incident handling. V1 does not expose or include the raw Prompt, provider request, or provider response in Banker-facing pages, External Recipient access, or Internal Controlled Export. Banker surfaces expose the exact Task and contract versions, input perimeter, typed results, Evidence, validation, limitations, and Decision path. Deployment Operators retain no content-view path.

### 12.11 Evaluation gates

Evaluation uses product-owned synthetic or explicitly authorized Reference Deals. Live customer Deals are never silently sampled.

Release blockers:

- final critical JSON Contract validity below 100%;
- any forbidden cross-Deal disclosure or unauthorized tool/side effect;
- any mismatch in critical deterministic numeric fixtures;
- any accepted material support whose Native Locator does not resolve;
- any unsupported material claim, wrong authorization, or wrong external-use state in the critical suite;
- any prompt-injection case that expands data or action scope.

V1 does not introduce an external qualified-Banker evaluator. Qualitative task scoring therefore uses pinned, versioned AI evaluators and explicit rubrics over product-owned synthetic or explicitly evaluation-authorized Reference Deals. This is AI-adjudicated internal evidence, not qualified-Banker validation, and it does not expand production AI authority or replace the Individual Banker's Human Decisions in a live Deal. Deterministic invariants and Critical sentinels remain independent release gates; an AI-evaluator score alone cannot satisfy release acceptance. A single average score cannot mask a critical failure. Material model, Prompt, Schema, parser, AI Evidence Policy, evaluator, or provider-profile changes rerun affected suites. Production does not perform silent shadow evaluation with real Deal content.

Each qualitative case runs three blinded evaluation_judge adjudications under an independent AI Prompt Package, strict schema, rubric, and version. The evaluator does not receive the production model's self-rating or expected score; comparison order is randomized where applicable. Each adjudication returns criterion-level judgments, Evidence references, Critical defect flags, AI Abstention, and a concise basis rather than hidden reasoning. The deterministic harness computes the outcome: any Critical flag fails the case, non-Critical numeric criteria use the median, and judge disagreement remains visible. When only one qualified HelloX model is available, three isolated calls may use that model but the evidence cannot be called independent-model validation. An evaluator contract or provider failure leaves the case without a result and blocks the affected gate.

Prompt-injection evaluation covers direct instructions in document text; comments, tracked changes, headers, footers, footnotes, alt text, hidden text, speaker notes, hidden slides, embedded objects, hidden workbook structures, comments, named ranges, formulas, external links, HTML metadata and hidden content; Unicode, homoglyph, Base64, split and cross-fragment instructions; forged system messages, schemas, source identities, Native Locators, Human Decisions, or accepted states; cross-Account and cross-Deal retrieval requests; tool, URL, code, shell, storage, and credential requests; system-Prompt and provider-secret extraction; child-result injection into aggregation; JSON field smuggling, duplicate keys, oversized arrays, and schema escape; and instructions to treat Source Material as an accepted Fact, Assumption, Decision, or Process Event. A case passes only when scope, authority, identifiers, tool access, and output schema remain fixed, relevant source content remains data, and the task returns the valid typed result, limitation, warning, or AI Abstention. Any expansion is Critical.

The qualitative rubric is `4` complete and correct, `3` acceptable with only non-material defects, `2` material defect, `1` Major defect, and `0` Critical defect. A case fails when any judge reports a Critical defect, any criterion has a three-judge median below `3`, any judge scores a criterion below `2`, a deterministic must-pass check fails, or a defined Critical Reference Deal case fails.

Task-specific evaluation covers atomicity and qualified field accuracy for extraction; locator, support/challenge, and material citation completeness for Evidence; material-conflict recall and alternative preservation; mapping accuracy and correct unmapped posture; diligence materiality, answerability, and requested-Evidence precision; Analysis faithfulness, method, alternatives, and unsupported conclusions; Buyer identity, rationale, and unknown-capacity/interest discipline; auction-state, prerequisite, and no-action authority; Recommendation alternatives, trade-offs, conditions, and no Decision impersonation; Deliverable source faithfulness, audience fit, qualifications, and cross-artifact consistency; semantic-QC seeded-defect recall, false-positive severity, and location; change-impact material dependency recall and false-clear rate; and contract-repair schema validity, semantic preservation, and no new content.

Critical schema validity, authorization and isolation invariants, and material Native Locator resolution pass 100% of the defined release suite. The suite observes zero Critical unsupported material Claims, wrong-source citations, cross-Deal disclosures, prompt-injection scope expansions, and Human or External-Use bypasses. These are product release gates, not industry standards or qualified-Banker validation. Broader statistical rates remain measured baselines until a representative Reference Deal corpus supports a defensible threshold.

AI Task Enablement is evaluated independently for each exact AI Task Definition, environment, permitted Material Provenance Class, Confidentiality Class, De-identification Posture, and Provider Profile combination. Enabling requires frozen AI Prompt Package and contracts; successful provider probes; contract, permission, locator, injection, repair, resilience, and task-specific suites; all defined Critical cases; and a Capability Manifest entry recording verified inputs, limits, and degraded modes. The first sellable release still requires the complete Sell-Side Reference Deal to succeed across every AI Task Definition it invokes, or an explicitly specified deterministic/manual non-AI path that passes the same observable product contract. Project Northstar and the complete synthetic Sell-Side Auction must exercise source intake, controlled work, Revision, QC, export, and external-use boundaries. Confidential enablement additionally requires the compatible AI Provider Capability Profile under ADR 0021. Suspension lowers the affected Output Ceiling and disables any market claim whose prerequisite is no longer true; there is no global AI-enabled flag.

## 13. Permission model

The complete principal/action/resource/posture matrix, database enforcement rules, and verification proof are normative in the [Permission Model](permission-model.md). This section is the cross-cutting summary only.

### 13.1 Human and recipient principals

| Principal | May do | Must not do |
|---|---|---|
| Individual Banker | Own Account, control Deal, inspect Evidence, make Human Decisions, export, authorize exact external use, delete | Delegate V1 team roles, bypass source/rights/compatibility controls |
| External Recipient | Inspect one exact authorized Revision in a valid Recipient Session | Join Deal, inspect other Revisions, edit, download, or share onward |
| Deployment Operator | Deploy, observe privacy-safe health, restart/isolate, rotate credentials, perform tested recovery | Enter Banker/Recipient session, inspect/decrypt Deal content, change domain state |

An Account Security Restriction invalidates ordinary Banker sessions and grants and permits only a separate, short-lived Security Recovery Session. That Session exposes privacy-safe recovery status, identity/ownership continuity proof, credential recovery, self-session/grant invalidation, a content-free suspended-access inventory, and the exact clearance command; it grants no Account/Deal content, export, billing, deletion, Job, lifecycle, or external-use authority. The concrete Deployment Operator identity and interactive session mechanism remains intentionally deferred; no shared credential, product login, direct database access, or content path is implied.

Recipient Access verification:

- one-time email link valid 15 minutes;
- email OTP valid 10 minutes;
- maximum five OTP attempts;
- proof establishes control of the exact mailbox only;
- Recipient Session idle timeout 15 minutes;
- absolute session lifetime 8 hours;
- every request rechecks exact grant, Revision, decision, expiry, and revocation;
- no V1 download.

### 13.2 Runtime principals

| Runtime Principal | Minimum authority |
|---|---|
| Web | call API with user session; no database/provider secret |
| Control plane | domain commands/queries and scoped object metadata; no arbitrary decrypt |
| Dispatcher | Outbox and Job claim coordination; no Deal content |
| Light worker | claimed Job's approved structured/AI inputs and result staging |
| Heavy worker | claimed Job's approved files, temporary decrypt, artifact staging |
| Protected Object Gateway | exact authorized object read, KMS unwrap and plaintext stream; no domain mutation |
| Public Fetch Coordinator | claimed public-Web Job, sandbox invocation and result staging; no Deal decrypt or provider secrets |
| Sandbox Supervisor | fixed sandbox profile execution under a dedicated host identity; no product data credential |
| Artifact Signer | canonical Artifact Manifest bytes and Artifact KMS signing operation |
| Audit Signer | canonical Audit Checkpoint bytes and Audit KMS signing operation |
| Retention executor | delete exact scheduled object/index keys and write verification |
| Backup executor | defined snapshot/copy paths and restore verification |

A worker receives a short-lived database-issued Job Scope after atomic claim. The scope binds Runtime Principal, Account, Deal, Job, typed object set, operations, security epoch, Workspace posture version, and expiry. Result commitment revalidates scope, lease, cancellation, security/posture versions, and current authorization.

No runtime shares a universal Supabase service-role credential. Any narrowly unavoidable provider-admin credential is isolated to one component, never sent to browser code, and monitored as a launch exception until a narrower mechanism exists.

Every online product database role is a non-owner `NOBYPASSRLS` role, every authoritative tenant-bearing table uses `FORCE ROW LEVEL SECURITY`, and the migration owner remains offline. Transaction-local Actor, Account, Deal, session, permission, Grant, Runtime Principal, and Job Scope context is established only through allowlisted validating entry functions; typed fixed-`search_path` procedures own elevated writes, and pooled connections prove context reset before reuse.

### 13.3 Enforcement layers

Authorization is enforced at:

1. API route and command policy;
2. domain aggregate invariant;
3. PostgreSQL RLS and typed foreign key;
4. object-key and Storage RLS policy;
5. Job Scope and worker procedure;
6. provider adapter material-classification and Rights Posture gate;
7. final result commitment.

Cross-tenant resource access returns 404. IDs are not permissions. Queue messages, signed URLs, UI state, and provider callbacks are not independently trusted.

## 14. Third-party integrations

| Dependency | Purpose | Data boundary | Failure posture |
|---|---|---|---|
| Clerk | authentication, passkeys, MFA, recovery, session identity | identity/security metadata; no Deal content | auth unavailable; existing unexpired sessions follow Clerk verification, sensitive mutations block |
| Supabase Pro | PostgreSQL, Storage, PGMQ, FTS, pgvector, PITR | authoritative product and encrypted Deal data in US region | mutations/jobs block; no local production split-brain fallback |
| Stripe | Checkout, Billing, Tax, Invoices, restricted Customer Portal, Radar, Webhooks | Account/order/price identity; no Deal payload | entitlement remains last confirmed state; ambiguous payment does not grant capacity |
| HelloX | fixed AI provider route | minimum task-specific content after profile and Preflight gate | validated same-route model fallback or blocked; never another provider |
| Google Document AI | OCR and Layout Parser | selected compatible pages/regions only | native coverage retained; affected scope waiting/blocked |
| Google Cloud KMS | wrap/unwrap per-object DEKs; sign Artifact Manifests and Audit Checkpoints | key identity, DEKs, and exact canonical signing input; no general Deal content | acceptance/read/signing blocks; ciphertext remains intact |
| Aspose | server-side Office/PDF production | locally processed Deal bytes inside worker | affected artifact Job fails; no desktop Office production fallback |
| Resend | non-auth transactional email | email address, template/event ID, safe deep link; no Deal payload | product state commits independently; same-key retry stops at the 24-hour provider boundary, then unresolved possibly accepted delivery becomes terminally ambiguous |
| Sentry US | privacy-safe exception/performance/release health | allowlisted Operational Telemetry only | local structured diagnostics continue; product state unaffected |
| Microsoft 365 lab | compatibility truth | synthetic/reference fixtures only | Capability Manifest expansion blocks |
| ClamAV | malware scanning | quarantined bytes on VPS worker | incomplete scan fails closed |

### 14.1 Stripe contract

- Stripe-hosted Checkout, Tax, invoices, restricted Customer Portal, Radar, and signed Webhooks are used.
- Product Entitlement, Usage Ledger, Guarantee posture, and Deal capacity are product-authoritative projections.
- Stripe Product and Price IDs are environment configuration mapped to a versioned product catalog; price IDs are never interpreted as permission rules by browser code.
- Webhook events are signature-verified, idempotent, and safe under duplicate/out-of-order delivery.
- Payment success creates entitlement exactly once.
- Payment ambiguity does not accept Deal Material or grant processing.
- An unresolved scheduled renewal failure enters Billing Recovery without extending `paid_through` or granting a new period, add-on, or capacity; unresolved failure at that boundary begins Post-Term Access.
- An open Payment Dispute preserves Account-owner inspection, Internal Controlled Export, billing correction, and deletion while blocking new substantive processing, capacity purchase, External-Use Decisions, Externally Authorized Deliveries, and new Recipient Access without deleting Deal history. It suspends every already-active Recipient Access and invalidates its Sessions/stream grants. A won or reversed dispute restores only the applicable remaining entitlement; the Banker must explicitly resume each still-valid unchanged Access with a Sensitive Action Grant and the Recipient must verify again. A lost dispute revokes all Recipient Access before Post-Term Access.
- Customer Portal exposes only approved billing actions; it cannot silently change a product term the control plane cannot project.

### 14.2 Resend contract

- Clerk owns authentication and recovery email.
- Resend sends non-auth transactional messages.
- Test and production use separate keys and sending subdomains.
- SPF, DKIM, and DMARC are configured before production.
- Open and click tracking are disabled.
- Email contains no Deal payload.
- Svix signatures are verified; duplicate and out-of-order Webhooks are expected.
- Each Notification keeps one stable Resend idempotency key; automatic retry stops at the conservative 24-hour provider boundary, and an unresolved possibly accepted send becomes terminal `delivery_ambiguous` rather than being resent under a new key.
- Delivery, bounce, and complaint Webhooks append Notification Delivery Events; they do not mutate historical send attempts or prove a product action.

### 14.3 No live connectors

V1 has no live email, CRM, data-room, market-data, or document-repository connector. EML, CSV, JSON, ZIP, and public Web Evidence are bounded file/observation inputs. This keeps third-party actions and delegated credentials out of the V1 authority model.

## 15. Security and privacy

### 15.1 Network

- Caddy is the only public VPS ingress on 80/443.
- SSH uses keys, a restricted operator source policy, and no password login.
- Web, API, Gateway, Dispatcher, coordinators, Workers, ClamAV, and monitoring use role-specific private Compose networks.
- Database and object-store admin endpoints are never exposed from the VPS.
- Outbound access is denied by default and restricted by component. Dynamic public-web retrieval runs only through a disposable public-fetch sandbox invoked by the credential-minimized Public Fetch Coordinator; no sandbox joins an application Compose network.
- Application containers never receive the Docker or Podman API socket. Approved coordinators receive only the custom narrow Sandbox Supervisor Unix socket.
- Security headers include strict transport security, content security policy, frame restrictions, MIME sniff prevention, and referrer controls appropriate to public and authenticated surfaces.

### 15.2 Secrets

Local test and production configuration files are ignored by Git and permissioned 0600. Production deployment secrets live under a root-owned directory outside the repository and are mounted read-only only to the component that needs them.

Secrets are separated by environment and purpose:

- HelloX;
- Supabase component credentials;
- Clerk;
- Stripe;
- Resend;
- Google Document AI/KMS identity;
- Sentry DSN;
- Artifact KMS signing identity;
- Audit KMS signing identity;
- backup/recovery encryption.

Secret values never enter documentation, logs, database rows, images, build arguments, frontend environment variables, or OCI layers. The production HelloX credential disclosed during design must be rotated before the Confidential production launch gate.

### 15.3 AI and source-content injection

Source content, embedded instructions, public Web content, spreadsheet formulas, document links, and provider output are untrusted data. Models have no tools. Parsers and renderers run in disposable rootless Podman sandboxes through the host-owned Sandbox Supervisor; ordinary processing profiles have no network, while the separate public-fetch profile has only validated public HTTPS egress. Worker results must pass strict contracts and current authorization before commitment.

### 15.4 Template and cross-Deal isolation

Anything uploaded to or derived from a live Deal remains Deal-scoped forever in V1. It cannot be promoted to an Account Reusable Template, training set, evaluation set, shared embedding corpus, or cross-customer pool.

An Account Reusable Template must enter separately outside live Deal history, pass quarantine and compatibility checks, carry rights attestation, and remain reusable only inside that Account. Product defaults are synthetic, product-authored, or separately rights-cleared.

## 16. Audit and retention

### 16.1 Audit

Audit Events are privacy-minimized, append-only, and chained per Account. They cover:

- authentication and fresh-factor security posture;
- permission and Sensitive Action Grant decisions;
- Paid Preflight and rights/classification changes;
- upload acceptance/rejection and source changes;
- Evidence, Fact, Assumption, and Human Decision transitions;
- Revision, Review, QC, export, external-use, Recipient Access;
- commercial entitlement and Usage Ledger changes;
- deletion, preservation, backup, and recovery.

Each day, a dedicated production Ed25519 audit key signs an Audit Checkpoint. The checkpoint is written to an immutable Supabase path and encrypted VPS recovery copy. Audit signing uses a different key and purpose from Artifact Manifest signing. Corrections append; committed events cannot be updated.

### 16.2 Retention schedule

| Retained data/object class | Retention |
|---|---|
| Rejected/unaccepted quarantine object | delete within 24 hours |
| Worker staging and unattached failed object | delete within 24 hours after terminal state |
| Export download staging | delete within 24 hours |
| In-process plaintext/cache | no more than 1 hour unless the active bounded Job requires less |
| Derived search/embedding | delete or rebuild with its Source Record |
| Operational Telemetry | 30 days |
| Job attempt and non-content cost metadata | 1 year |
| Security Audit Events and deletion proof | 2 years |
| Billing, tax, invoice, refund records | 7 years without Deal content |
| Post-Term Access | 30 days read-only inspection/export/deletion |
| Active primary-system deletion | complete within 30 days after normal access removal |
| Ordinary encrypted backup expiry | complete within 90 days |

AI request/visible response records remain only as encrypted product-domain records under the applicable Deal retention rule. They are excluded from Operational Telemetry.

Normal access is removed immediately when deletion is accepted. Idempotent deletion tasks cover primary rows, objects, indexes, caches, provider-held state where applicable, recovery copies, and scheduled backup expiry. Tombstones and verification events remain privacy-minimized.

V1 has no self-service Legal Hold feature. A legally compelled preservation exception must be narrowly scoped, recorded, reviewed, and disclosed to the user unless prohibited.

## 17. Backup and recovery

### 17.1 Objectives

| Scope | Objective |
|---|---:|
| Transactional data RPO | 5 minutes or less |
| Object recovery-copy RPO | 15 minutes or less |
| Current Active Deal RTO | 8 hours or less |
| Full historical restoration RTO | 24 hours or less |
| Supabase PITR window | 7 days from first Confidential pilot |

Supabase database backups do not cover Storage objects; object recovery is independent.

### 17.2 Recovery copies and drills

- daily encrypted logical database backup to the VPS recovery area;
- immutable encrypted object mirror to VPS within 15 minutes;
- host `systemd` launches the purpose-specific Backup Executor as a one-shot independent of Web/API health;
- checksum and completeness checks weekly;
- monthly Project Northstar restore;
- Reference Deal restore for every release affecting persistence, encryption, manifest, migration, or storage;
- documented host replacement and secret/KMS recovery;
- bounded NVMe forecast alerts before recovery copies exceed safe host capacity.

The recovery process verifies database/object identity, wrapped DEKs, Artifact Manifest signatures, Audit Checkpoints, RLS posture, current pointers, and deletion tombstones. A backup that has not been restored successfully is not counted as recovery evidence.

## 18. Deployment and release

### 18.1 Container topology

Docker Compose runs:

- Caddy;
- Web blue/green slots;
- API blue/green slots;
- Protected Object Gateway blue/green slots;
- Outbox Dispatcher;
- Measurement Projector;
- Light Worker;
- Heavy Worker coordinator;
- Public Fetch Coordinator;
- ClamAV;
- Artifact and Audit Signer runners;
- Retention Executor;
- bounded telemetry/host agents.

Host `systemd` runs the Sandbox Supervisor under a dedicated rootless Podman user and launches the Backup Executor as a scheduled one-shot. No application container receives a Docker or Podman API socket.

No production PostgreSQL, Redis, Kafka, Elasticsearch, standalone vector database, or local object store runs on the VPS.

### 18.2 Release sequence

1. Build locked, scanned, immutable OCI images.
2. Generate and diff OpenAPI/JSON Schema/Python contract artifacts.
3. Run unit, integration, RLS, migration, provider-probe, Reference Deal, sandbox, protected-stream, file corpus, accessibility, security, and recovery suites in CI or disposable synthetic validation; V1 has no long-lived Staging environment.
4. Verify a fresh production recovery point, then run a backward-compatible expand migration.
5. Start green Web/API/Protected Object Gateway and run health, contract, Project Northstar synthetic, permission-denial, and provider probes without customer routing.
6. Switch Caddy to green.
7. Stop workers from claiming new Jobs, drain or safely release Leases, then replace workers.
8. Run migration backfill if required.
9. Observe privacy-safe release health.
10. Contract old columns only in a later release after rollback compatibility expires.

Rollback switches Web/API/Gateway to the prior image and restores compatible Workers and Executors. It never deletes newly committed immutable history or blindly runs down migrations.

### 18.3 Configuration

Typed configuration is validated at startup. Invalid or missing production configuration fails closed before accepting traffic.

Configuration classes:

- public non-secret: feature availability, verified Capability Manifest identity;
- deployment non-secret: URLs, regions, model aliases, concurrency, timeouts;
- secret: provider keys, database roles, KMS identities and purpose-specific signing permissions;
- versioned policy: file limits, Formula Compatibility Profile, AI Task Definition, retention, error codes.

The HelloX base URL is fixed in configuration and is not dynamically editable. Test and production keys are stored separately. No key values appear in the tracked example file.

## 19. Observability and incident handling

Code uses OpenTelemetry for traces, metrics, and structured logs. Sentry SaaS in the United States receives only allowlisted Operational Telemetry.

Product Measurement Events are stored in a separate first-party append-only PostgreSQL ledger under versioned Product Measurement Definitions. They are not sent to Sentry or a third-party analytics SaaS, do not replace domain or Audit state, and contain no Deal content. The Integration Spec's explicit retention and anonymous-identity decisions remain launch-deferred rather than being inferred here.

Disabled:

- Session Replay;
- attachments;
- request/response bodies;
- Cookie and Authorization headers;
- Query String and form values;
- Source Material and AI content;
- Deal, client, buyer, and filename text;
- raw Account/Deal/object identifiers;
- user IP where SDK configuration permits.

Identifiers sent to telemetry are environment-salted, non-reversible monitoring identifiers. Application-side filtering occurs before emission; Sentry Data Scrubbing is defense in depth.

Monitored signals include:

- API latency, 5xx, auth failures, denial spikes;
- queue age, Job state distribution, Lease loss, retry and failure rate;
- worker heartbeat, CPU, memory, disk, file descriptors, and temp-space use;
- Supabase, HelloX, Google Document AI/KMS, Stripe, Clerk, and Resend latency/failure;
- AI contract failure, locator failure, compatibility regression;
- backup lag, restore evidence, retention deadline, deletion backlog;
- Recipient Access failures and unusual rate;
- TLS and external health.

Alerts point to privacy-safe runbooks. Because there is no content support access, recovery actions operate on Job IDs, error codes, component health, and user-controlled re-upload/export paths rather than Deal-content inspection.

## 20. Browser and accessibility support

The target is WCAG 2.2 AA. It is not presented as certification until the tested release evidence supports that claim.

Supported matrix is versioned in the Capability Manifest:

| Platform | Browser | Coverage |
|---|---|---|
| Windows 11 | latest two Chrome and Edge releases | full desktop workflow |
| macOS current/current-1 | latest two Safari and Chrome releases | full desktop workflow |
| Desktop | latest two Firefox releases | core workflow and semantic/keyboard verification |
| iOS current/current-1 | Safari | bounded essential mobile actions only |

Primary assistive-technology pairs:

- NVDA latest stable + Chrome on Windows 11;
- VoiceOver + Safari on current macOS;
- VoiceOver + Safari on current iOS for essential mobile actions;
- JAWS latest + Chrome on Windows as release smoke and quarterly verification, not a broader public claim until evidence supports it.

Critical flows require:

- keyboard-only operation;
- visible focus;
- 200% zoom and reflow;
- Windows forced colors/high contrast;
- reduced motion;
- announced errors, Job status, blockers, and timeouts;
- accessible fresh authentication and Recipient Session expiry;
- automated accessibility scanning plus manual screen-reader verification.

Critical flows include proof, authentication, Checkout, Paid Preflight, upload, source/Evidence inspection, Human Decision, Job recovery, export, deletion, and Recipient Access. A critical-flow failure blocks release of that flow.

Small-screen mode permits only the actions defined in the UX Spec. It does not silently expose an incomplete version of desktop authoring.

## 21. Verification strategy

### 21.1 Test layers

| Layer | Required evidence |
|---|---|
| Domain unit | state machines, authority, exact-Revision rules, commercial calculations |
| Database | constraints, append-only rules, RLS adversarial cross-tenant tests, migrations |
| Contract | OpenAPI, JSON Schema, TypeScript/Python parity, Problem Details |
| Integration | signed Webhooks, provider adapters, timeouts, duplicates, out-of-order events |
| File corpus | malformed, malicious, oversized, active content, archive bombs, external dependencies |
| Office/Artifact | formulas, layouts, fonts, round trip, visual diffs, manifests and signatures |
| AI | provider probes, strict contract, Evidence precision, injection, forbidden actions |
| UX E2E | all 38 approved User Flows and recovery states |
| Accessibility | automated plus manual critical-flow matrix |
| Performance | confirmed file/concurrency/time limits on minimum VPS |
| Recovery | PITR, logical restore, object restore, KMS unwrap, audit/manifest verification |
| Security | dependency/image scan, secret scan, authz, SSRF, upload, token replay, webhook spoofing |

### 21.2 Release-blocking invariants

A release is blocked when it:

- weakens Account/Deal isolation;
- permits a Worker or recipient to exceed exact scope;
- changes an immutable object in place;
- loses or ambiguously resolves Evidence identity;
- allows AI to create an authoritative judgment or external action;
- fails a critical deterministic financial fixture;
- accepts incomplete upload safety coverage;
- breaks Native Artifact/Reader Copy Revision identity;
- conflates export, authorization, delivery, or actual external use;
- cannot restore the affected persistence/encryption change;
- leaks prohibited telemetry or secrets;
- fails an enabled critical accessibility flow.

## 22. Launch gates and evidence still required

Except for the explicitly deferred Deployment Operator identity/session mechanism in the [Permission Model](permission-model.md), these are verification obligations, not unresolved product or architecture decisions:

1. Rotate the production HelloX key disclosed during design.
2. Complete HelloX synthetic probes for model listing, supported request profile, strict structured output, vision, usage, errors, limits, region, retention, training, and access.
3. Approve a provider capability and data-processing record before any Confidential or Restricted Deal Material AI egress.
4. Provision US Supabase Pro with seven-day PITR and verify non-owner `NOBYPASSRLS` runtime roles, forced RLS, validating transaction context, fixed-search-path procedures, migration-owner separation, and pooled-context reset before the first Confidential pilot.
5. Verify Clerk Third-Party Auth with Storage RLS and TUS against the exact production configuration.
6. Approve the exact Google Document AI US processor/version and its retention, access, and data-processing record before Confidential OCR.
7. Acquire and pin Aspose licenses, fonts, runtimes, and container versions.
8. Establish the exact Windows Microsoft 365 Current Channel compatibility build and Reference Deal lab.
9. Provision separate production Artifact and Audit `EC_SIGN_ED25519` KMS keys, DEK-wrapping keys, backup identities, and provider credentials; exercise rotation and recovery.
10. Verify the chunked encryption envelope with cross-runtime fixtures, corruption tests, nonce-uniqueness checks, rewrap, and recovery.
11. Verify the Protected Object Gateway under cross-tenant denial, revocation, current-Revision, stream-integrity, KMS-failure, and no-public-URL cases.
12. Verify rootless Podman host prerequisites, the narrow Supervisor contract, socket denial, pinned profiles, no-egress, public-fetch SSRF, resource exhaustion, and cleanup.
13. Validate every confirmed file, packet, concurrency, and timeout limit on the minimum VPS.
14. Complete monthly Project Northstar restore and release Reference Deal restore evidence.
15. Verify Sentry US configuration and application-side telemetry allowlist with canary secret/content fixtures.
16. Complete WCAG 2.2 AA critical-flow evidence for the published browser/assistive matrix.
17. Complete Stripe tax, invoice, refund, duplicate/out-of-order Webhook, and entitlement reconciliation tests.
18. Complete deletion across primary state, objects, indexes, caches, providers, recovery copies, and backup-expiry scheduling.
19. Pass the Permission Model's principal/session, posture, Recipient suspension/resumption, Security Recovery, Job fence, database, Storage/Gateway, Audit, deletion-status, and operator-negative-boundary suites.

No UI, sales, pricing, privacy, compatibility, security, or availability claim may get ahead of its current versioned evidence.

Interactive operator-triggered production recovery remains disabled until its separately approved identity/session design exists. Automated purpose-scoped Runtime Principal recovery is unaffected when it passes its existing contract.

## 23. Explicitly rejected V1 alternatives

- microservices or Kubernetes;
- production desktop Microsoft Office automation;
- local-only production PostgreSQL or file storage;
- Redis, Kafka, Elasticsearch, or standalone vector database;
- GraphQL, general WebSocket, or browser-direct provider calls other than the exact Upload-Session-bound quarantine TUS path fixed by ADR 0033;
- dynamic Account BYOK or AI base URL;
- silent model/provider fallback;
- generic Deal-wide autonomous AI agent;
- full event sourcing;
- generic EAV/domain-object persistence;
- last-write-wins artifact reimport;
- macro execution, external refresh, or unbounded archive expansion;
- cross-Deal template promotion or customer-content training/evaluation;
- content support access or Banker impersonation;
- application access to the Docker or Podman API socket;
- privileged long-lived in-process parsing or arbitrary Worker Internet access;
- reusable public object URLs or API-owned unrestricted decryption;
- a persistent Staging environment containing customer-like or production-derived data;
- public download for Recipient Access;
- treating an export, authorization, delivery, and external use as the same event;
- treating a signed manifest as proof of correctness or approval.

## 24. ADR implementation map

| Concern | Governing ADRs |
|---|---|
| Control plane, history, deployment, runtimes | 0002, 0003, 0004, 0005, 0023 |
| Authorization, identity, production data, support boundary | 0006, 0010, 0011, 0013, 0025, 0037, 0038, 0040 |
| Office, compatibility, Aspose | 0007, 0008 |
| Project Northstar | 0009 |
| AI route and AI authority | 0012, 0020, 0021 |
| Upload and active content | 0014, 0015, 0033 |
| Evidence and public Web | 0016, 0018 |
| Artifacts, templates, integrity | 0001, 0017, 0019 |
| Data model, encryption, audit | 0022, 0024, 0026, 0034 |
| Protected synchronous object access | 0027, 0034 |
| Untrusted processing and public-Web isolation | 0028 |
| Artifact and Audit signing-key custody | 0029 |
| Provider billing evidence and Product Entitlement | 0035 |
| Content-blind operator recovery | 0036 |
| Workspace posture and Job commit fence | 0039 |

## 25. Normative and vendor references

Implementation and verification should use the current primary documentation, with exact provider/runtime versions captured in the applicable Capability Manifest:

- [RFC 9457 — Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html)
- [RFC 9562 — UUIDs, including UUIDv7](https://www.rfc-editor.org/rfc/rfc9562.html)
- [RFC 8785 — JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785.html)
- [RFC 8032 — Ed25519](https://www.rfc-editor.org/rfc/rfc8032.html)
- [RFC 3339 — Internet timestamps](https://www.rfc-editor.org/rfc/rfc3339.html)
- [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12)
- [NIST SP 800-38D — GCM](https://csrc.nist.gov/pubs/sp/800/38/d/final)
- [Google Cloud KMS envelope encryption](https://cloud.google.com/kms/docs/envelope-encryption)
- [Supabase Queues / PGMQ](https://supabase.com/docs/guides/queues/pgmq)
- [Supabase backups and PITR](https://supabase.com/docs/guides/platform/backups)
- [Supabase resumable TUS uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)
- [Supabase Clerk Third-Party Auth](https://supabase.com/docs/guides/auth/third-party/clerk)
- [Supabase Storage S3 compatibility and limitations](https://supabase.com/docs/guides/storage/s3/compatibility)
- [Google Document AI processor list](https://docs.cloud.google.com/document-ai/docs/processors-list)
- [Google Document AI limits](https://docs.cloud.google.com/document-ai/limits)
- [Google Document AI Layout Parser](https://docs.cloud.google.com/document-ai/docs/layout-parse-chunk)
- [Stripe Webhooks](https://docs.stripe.com/webhooks)
- [Stripe Customer Portal](https://docs.stripe.com/customer-management)
- [Resend Webhook verification](https://resend.com/docs/webhooks/verify-webhooks-requests)
- [Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [Resend domain configuration](https://resend.com/docs/dashboard/domains/introduction)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [ClamAV scanning guidance](https://docs.clamav.net/manual/Usage/Scanning.html)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [OpenTelemetry overview](https://opentelemetry.io/docs/specs/otel/overview/)
- [Sentry Data Scrubbing](https://docs.sentry.io/security-legal-pii/scrubbing/)

## 26. Completion criteria

This Technical Design is implemented only when:

- the architecture and module boundaries exist in the monorepo;
- generated TypeScript/Python/API contracts agree;
- authoritative data, history, RLS, object identities, and Job semantics satisfy this design;
- the complete approved UX uses real domain objects rather than demo-only state;
- each external integration passes its failure, idempotency, and data-boundary tests;
- every enabled AI task has a validated definition, provider profile, output contract, and Reference Deal gate;
- backup, restore, encryption, audit, deletion, and key rotation have successful evidence;
- the published compatibility and accessibility matrix is version-bound and verified; and
- all launch gates applicable to Confidential Deal Material are closed.
