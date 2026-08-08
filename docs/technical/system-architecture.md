# System Architecture

**Product:** HelloX Investment Banking — Individual-First V1

**Status:** Confirmed architecture baseline

**Date:** 2026-08-08

**Scope:** System modules, runtime and trust boundaries, dependencies, communication paths, deployment topology, failure boundaries, and evolution constraints

## 1. Purpose

This document defines the stable system shape that implements the approved Product Specification, domain language, UX contracts, Technical Design, and accepted architecture decisions. It answers:

- which logical modules compose the product and which runtime owns each responsibility;
- which boundaries are code boundaries, process boundaries, trust boundaries, or third-party boundaries;
- how browsers, the control plane, Workers, isolated execution, storage, queues, and providers communicate;
- where authoritative state, file bytes, current pointers, immutable history, and derived indexes live;
- how the system is deployed, released, recovered, observed, and constrained on the V1 infrastructure; and
- which couplings, credential paths, and hidden alternate systems are prohibited.

This is the normative architecture view for topology and ownership. It does not replace the detailed data contracts, [API contracts](api-spec.md), AI Task Definitions, integration contracts, or permission rules specified in their dedicated Technical Design-stage documents.

## 2. Authority and document relationship

Authority is concern-specific:

- the approved Product Specification and confirmed product assets own product scope and behavior;
- accepted decisions under [docs/adr](../adr) own hard architecture decisions within their stated concern;
- [CONTEXT.md](../../CONTEXT.md) owns canonical domain language and distinctions;
- approved documents under [docs/ux](../ux) own user-visible task behavior;
- the cross-cutting [Technical Design](technical-design.md) owns the shared implementation baseline;
- this System Architecture owns module, runtime, trust, dependency, and deployment topology; and
- the specialized [Data Model / ERD](data-model-erd.md), [AI Prompt & Contract Spec](ai-prompt-contract-spec.md), [API Spec](api-spec.md), [Integration Spec](integration-spec.md), and [Permission Model](permission-model.md) own their stated concerns.

Implementation code, generated contracts, tests, and verified runtime evidence verify these contracts and may reveal a defect; they do not silently redefine them.

The Technical Design and this document must agree. This document may make an architectural boundary more explicit, but a contradiction is a documentation defect that must be corrected in both documents; it is not resolved by silently choosing whichever file is convenient.

## 3. Architecture drivers

### 3.1 Product drivers

- One named Individual Banker owns one Account and operates complete Sell-Side Auction work in Deal-scoped Workspaces.
- One Deal has one authoritative Deal Workspace and one controlled object history.
- The system must preserve Evidence, judgment, calculation, process, Deliverable, Revision, authorization, delivery, and actual-use distinctions.
- First Deal Guide and Deal Execution Desk are modes over the same canonical objects, not separate applications or data models.
- Project Northstar reuses production behavior with synthetic state and deterministic adapters, without accepting real materials or invoking live production providers.
- V1 supports no Team membership, content support role, impersonation, administrative Deal viewer, or Deal-content break-glass path.
- V1 performs no autonomous Buyer communication, email sending on behalf of a Deal, Data-Room mutation, Bid acceptance, or other external Deal action.

### 3.2 Data and security drivers

- Account is the tenant, commercial, and ownership boundary; Deal is the mandatory subordinate work boundary.
- Real Confidential and Restricted Deal Material is disabled until every applicable provider, encryption, isolation, retention, recovery, and disclosure gate has current evidence.
- Every upload is quarantined before preview, parsing, OCR, AI, Office handling, or Source acceptance.
- Typed Protected Account Object and Protected Deal Object bytes are immutable, application-encrypted, bound to an immutable domain attachment, and never exposed through reusable public URLs.
- AI receives minimum task-specific content and can propose but cannot authoritatively decide or act.
- Product operators receive privacy-safe operational metadata and no product path to inspect or decrypt Deal content.
- Customer Deal content is not a shared training, evaluation, template, embedding, prompt, or support corpus.

### 3.3 Operational drivers

- V1 deliberately accepts one United States-region compute-host failure boundary and makes no multi-host high-availability claim.
- Authoritative production state and accepted object storage remain outside that host in United States-region Supabase Pro.
- Long-running work is durable, asynchronous, resumable, leased, idempotent, and visible to the user.
- Application, contract, parser, model, provider, engine, font, template, policy, and claims versions must be traceable to an affected result.
- No long-lived Staging environment is operated in V1; CI, disposable synthetic validation, production green slots, and the separate Microsoft 365 compatibility lab provide the release evidence.

## 4. Architecture principles

1. **One control plane owns business truth.** Only the TypeScript control plane commits authoritative domain transitions.
2. **Modules are not services.** Domain ownership is expressed through code and data-access boundaries inside a modular monolith unless isolation or privilege requires a process boundary.
3. **Workers propose; the control plane commits.** A Worker may stage immutable results and validation evidence but cannot independently promote business posture.
4. **Current state and history are different concerns.** Mutable current pointers coexist with append-only material versions; the system is not fully event-sourced.
5. **Authorization follows the object.** Browser routes, Job messages, object keys, indexes, provider calls, exports, and audit records carry Account and Deal scope.
6. **Queue delivery is not business exactly-once.** Transactions, uniqueness, idempotency, and result-attachment rules create exactly-once business effects.
7. **Untrusted content crosses an execution boundary.** A parser, renderer, public page, or file container never runs with general application or host authority.
8. **Business authority and byte decryption are separated.** The control plane decides; the Protected Object Gateway performs synchronous authorized reads.
9. **Provider reachability is not provider eligibility.** A provider path remains disabled for a material-classification scope until its versioned capability and processing evidence passes.
10. **Degradation is explicit.** A failed dependency blocks only the capability whose contract depends on it and exposes a truthful recovery posture.

## 5. System context

~~~mermaid
flowchart LR
    PB["Prospective Banker"] --> HX["HelloX Investment Banking"]
    IB["Individual Banker"] --> HX
    ER["External Recipient"] --> HX
    OP["Deployment Operator"] -->|"privacy-safe operations only"| HX

    HX --> SA["Supabase Auth"]
    HX --> SB["Supabase Pro"]
    HX --> ST["Stripe"]
    HX --> AI["HelloX AI route"]
    HX --> GD["Google Document AI"]
    HX --> GK["Google Cloud KMS"]
    HX --> RS["Resend"]
    HX --> SE["Sentry US"]
    HX --> PW["Public HTTPS sources"]
    HX --> M3["Microsoft 365 compatibility lab"]

    SA -. "Magic Link, Passkey, session identity" .-> HX
    SB -. "PostgreSQL, Storage, PGMQ, PITR" .-> HX
    ST -. "payment events" .-> HX
    AI -. "proposal-only model output" .-> HX
    GD -. "selected OCR/Layout result" .-> HX
    GK -. "DEK wrapping and signatures" .-> HX
    RS -. "Auth SMTP and transactional delivery" .-> HX
    SE -. "allowlisted operational telemetry" .-> HX
~~~

### 5.1 Human boundaries

| Principal | Product boundary |
|---|---|
| Prospective Banker | Public proof, qualification, account access, and purchase; no real Deal Material |
| Individual Banker | Own Account and Deal Workspaces; every V1 professional-control action |
| External Recipient | One exact authorized Revision through an independent Recipient Session; no Deal membership or download |
| Deployment Operator | Deployment, health, isolation, restart, rotation, and tested recovery through privacy-safe metadata; no Banker/Recipient session or Deal-content path |

AI and deterministic procedures are responsibility planes, not human principals. Senior bankers, specialists, management, sellers, Buyers, and counterparties are Deal-domain participants whose inputs enter through the Individual Banker with provenance; they are not V1 product members.

## 6. Product surfaces and logical modules

### 6.1 Customer-facing surfaces

| Surface | Primary responsibility | Isolation rule |
|---|---|---|
| Public Site | Outcome, Project Northstar, trust, pricing, qualification, and public resources | Synthetic/public only; cannot address production object identities |
| Account Access Gateway | Registration, authentication, recovery, reauthentication, Recipient verification, and safe dispatch | Establishes identity but never grants business authority by itself |
| Banker Account | Deal selection plus plan, billing, notifications, security, and account lifecycle | No cross-Deal business-content dashboard |
| Deal Workspace | The complete current and historical working context for one Deal | Every request reauthorizes Account, Deal, object, and version |
| Recipient Access | Navigation-free inspection of one exact authorized Revision | Independent session; no Deal membership, editing, download, or Revision discovery |

The nine Deal Workspace domains—Overview, Action Center, Sources, Evidence & Decisions, Analysis, Auction Process, Execution Package, Review & Readiness, and History & Portability—are stable information-ownership and navigation boundaries. They are not nine deployed services.

### 6.2 Control-plane modules

| Module | Owns | Must not own |
|---|---|---|
| Identity | Actor mapping, Supabase Session/recovery posture, Passkey reauthentication, Sensitive Action Grants | Account ownership or Deal authority inferred from Supabase IDs or metadata |
| Account and Commerce | Account, Product Entitlement, Usage Ledger, Stripe projection | Source rights or professional readiness |
| Deal Lifecycle | Deal identity, Business Stage, posture, current Deal state | Source or Deliverable truth hidden in a global status |
| Paid Preflight | authority, rights, confidentiality, processing path, compatibility, Output Ceiling | Payment or file upload treated as authority |
| Ingestion | Upload Session, Quarantined Upload, safety result, Accepted Source Object proposal | Parser or scanner success treated as Evidence |
| Source and Evidence | Source Record, representation, coverage, locator, Evidence | AI proposal promoted to Fact |
| Knowledge and Judgment | Claim, Fact, Assumption, issue, recommendation, Human Decision | Generic content or confidence object that collapses epistemic classes |
| Analysis | Calculation, Model, Scenario, Analysis, Impact Assessment | Floating-point material finance or unsupported inference |
| Auction Process | Buyer Candidate, Approved Buyer, Outreach Wave, NDA, Data-Room Access, Bid/Bid Version, Milestone, Process Event | Planned or recommended action treated as occurred |
| Deliverables | Deliverable, immutable Revision, Artifact, Review, QC, readiness | File representation treated as the Deliverable itself |
| Round Trip | Artifact Region, comparison, Merge Conflict, reimport | Last-write-wins material merge |
| External Use | Internal Controlled Export, decision, delivery, Recipient Access, actual use | Export, authorization, delivery, and use collapsed into one event |
| Jobs | DAG, steps, attempts, leases, events, retries, cancellation | Hidden user-visible posture or provider-specific business truth |
| AI | AI Task Definition, provider profile, AI Run, AI Proposal, evaluation | Autonomous Deal-wide planning or business side effects |
| Retention | rules, ledger, deletion tasks, tombstones, backup expiry | Archive treated as deletion |
| Audit | append-only events, digest chain, daily checkpoint | Mutable operational log used as audit truth |
| Notifications | privacy-minimized messages and authenticated deep links | Deal payload in email or notification text |
| Product Measurement | versioned definitions, append-only privacy-safe events, rebuildable funnel/cohort/cost projections | Product behavior, Audit truth, Operational Telemetry, or Deal content |

Modules expose application commands, queries, and policy interfaces. Direct cross-module table mutation is prohibited. Cross-module effects are recorded transactionally and published through the Outbox.

## 7. Runtime architecture

### 7.1 Runtime topology

~~~mermaid
flowchart TB
    subgraph Internet["Internet"]
        BB["Banker browser"]
        RB["Recipient browser"]
        WH["Provider Webhooks"]
        PUB["Public HTTPS sources"]
    end

    subgraph VPS["Single US-region VPS"]
        C["Caddy — only persistent ingress"]

        subgraph App["Private application network"]
            W["Next.js Web — blue/green"]
            A["Fastify control plane — blue/green"]
            G["Protected Object Gateway — blue/green"]
            D["Outbox Dispatcher"]
            MP["Measurement Projector"]
            LW["Light Worker"]
            HW["Heavy Worker coordinator"]
            PF["Public Fetch Coordinator"]
            AS["Artifact Signer"]
            US["Audit Signer"]
            RE["Retention Executor"]
            AV["ClamAV"]
            OT["Telemetry and host agents"]
        end

        subgraph Host["Host-owned execution and recovery"]
            SS["Sandbox Supervisor — systemd/rootless Podman"]
            SBX["Disposable sandbox containers"]
            BE["Backup Executor — systemd one-shot"]
            RC["Encrypted recovery area"]
        end
    end

    subgraph Managed["Managed US-region data services"]
        DB["Supabase PostgreSQL + RLS + PGMQ"]
        OS["Supabase Storage"]
        KMS["Google Cloud KMS"]
    end

    subgraph Providers["Approved provider boundaries"]
        SA["Supabase Auth"]
        ST["Stripe"]
        HX["HelloX AI route"]
        GD["Google Document AI"]
        RS["Resend"]
        SN["Sentry US"]
    end

    BB --> C
    RB --> C
    WH --> C
    C --> W
    C --> A
    C --> G
    W --> A
    A --> DB
    A --> OS
    A --> CL
    A --> ST
    A --> RS
    D --> DB
    DB --> MP
    MP --> DB
    DB --> LW
    DB --> HW
    DB --> PF
    LW --> HX
    HW --> GD
    HW --> AV
    HW --> SS
    PF --> SS
    SS --> SBX
    SBX -->|"public-fetch profile only"| PUB
    LW --> DB
    HW --> DB
    PF --> DB
    LW --> OS
    HW --> OS
    G --> DB
    G --> OS
    G --> KMS
    LW --> KMS
    HW --> KMS
    AS --> KMS
    US --> KMS
    RE --> DB
    RE --> OS
    BE --> DB
    BE --> OS
    BE --> RC
    W --> OT
    A --> OT
    MP --> OT
    LW --> OT
    HW --> OT
    PF --> OT
    OT --> SN
~~~

The diagram shows permitted dependency direction, not a universal network allowlist. Each edge still requires the exact identity, material-classification assessments, Rights Posture, Job Scope, object scope, and provider gate defined by the permission and integration contracts.

### 7.2 Runtime responsibility matrix

| Runtime | Technology and lifecycle | Minimum authority | Explicitly prohibited |
|---|---|---|---|
| Caddy | Containerized, persistent | TLS, same-origin routing, headers, limits, health-aware blue/green switch | Authentication or product authorization |
| Web | Next.js/React/TypeScript, blue/green | Render public/authenticated UI and call API with the current session | Database, KMS, queue, provider, or file credentials |
| Control plane | Fastify/TypeScript, blue/green | Commands, queries, authorization, state machines, Webhooks, SSE, Outbox | File parsing, arbitrary decrypt, Office rendering, AI judgment |
| Protected Object Gateway | Narrow private streaming runtime, blue/green | Revalidate exact typed Account/Deal stream scope, immutable read, KMS unwrap, authenticated streaming | Domain mutation, object listing, general Worker execution, reusable public URLs |
| Outbox Dispatcher | Long-running TypeScript process | Claim committed Outbox rows and publish safe Job/event identities to PGMQ | Deal content, business transitions, provider calls |
| Measurement Projector | Long-running TypeScript process | Consume privacy-safe measurement emissions, append deduplicated Product Measurement Events, rebuild bounded projections | Deal content, domain mutation, Audit or entitlement authority |
| Light Worker | Python, long-running coordinator | Claimed structured/AI inputs, AI execution, lightweight deterministic work, result staging | External authorization, arbitrary public fetch, authoritative commit |
| Heavy Worker | Python, long-running coordinator | Claimed file inputs, OCR orchestration, artifact work, bounded decrypt, sandbox requests | In-process untrusted parsing, arbitrary network, domain transition |
| Public Fetch Coordinator | Narrow long-running process | Claim public-Web Jobs, validate request perimeter, invoke public-fetch sandbox, stage proposal | Deal decrypt, KMS, AI/OCR/commerce/identity secrets, private-network fetch |
| Sandbox Supervisor | Host systemd service under dedicated non-login user | Validate fixed execution profile and launch disposable rootless Podman container | Product database, Deal objects, provider credentials, arbitrary image/command/path |
| Disposable sandbox | Rootless Podman, one execution | Exact read-only input, tmpfs/work limit, fixed command, exact output | Host access, long-lived state, extra mounts, application network; no network except public-fetch profile |
| Artifact Signer | On-demand restricted runner | Canonical Artifact Manifest bytes and Artifact KMS signing operation | Deal content, Audit key, arbitrary KMS operation |
| Audit Signer | Scheduled restricted runner | Canonical Audit Checkpoint bytes and Audit KMS signing operation | Deal content, Artifact key, arbitrary KMS operation |
| Retention Executor | Scheduled and queued restricted runner | Exact deletion task, object/index key, verification receipt | Search, arbitrary deletion, policy choice, preservation override |
| Backup Executor | Host systemd one-shot | Defined backup/copy paths, checksums, restore verification | Business mutation, general object browsing, interactive Deal access |
| Deployment Operator | Human host/infrastructure boundary | Deploy, inspect privacy-safe health, restart, isolate, rotate, recover | Product session, Deal decrypt, content diagnosis, domain mutation |

Separate runtimes may reuse code or immutable images. They never reuse credentials merely because they share code.

## 8. Trust zones and network policy

### 8.1 Zones

| Zone | Members | Inbound | Outbound |
|---|---|---|---|
| Public ingress | Caddy | Internet 80/443 only | Exact Web, API, and Gateway upstreams |
| Web delivery | Web blue/green | Caddy only | API and allowlisted telemetry endpoint |
| Control plane | API blue/green, Dispatcher | Caddy for API/Webhooks; private runtime calls | Supabase Auth/data services, Stripe, Resend, exact internal runtimes |
| Product measurement | Measurement Projector | PGMQ and exact replay/rebuild invocation | PostgreSQL and allowlisted telemetry only |
| Job coordination | Light/Heavy/Public Fetch coordinators | PGMQ/claim procedures and private control messages | Exact provider or Supervisor boundary per role |
| Privileged file data plane | Protected Object Gateway | Caddy/API-authorized stream route only | Supabase Storage, narrow authorization procedure, KMS unwrap |
| Privileged control executors | Signers, Retention, Backup | Exact scheduled/Job invocation | Purpose-specific KMS, database, storage, or recovery target |
| Sandbox control | Sandbox Supervisor | Narrow host Unix socket mounted only to approved coordinators | Rootless Podman and sandbox lifecycle only |
| No-egress sandbox | File/Office/parser execution | Supervisor-provided exact input | No network |
| Public-fetch sandbox | Public HTML fetch/render | Supervisor-provided validated URL contract | Public HTTPS only; private/reserved/link-local/metadata ranges denied |
| Managed data | Supabase PostgreSQL and Storage | Component-specific TLS identities | Provider-managed internal paths only |
| Provider egress | HelloX, Document AI, KMS, Supabase Auth administration, Stripe, Resend, Sentry | Component-specific calls | Provider responses/Webhooks under contract |

### 8.2 Egress enforcement

- Default application and sandbox networks have no unrestricted Internet path.
- Fixed-provider runtimes use an allowlisted egress path for the configured provider hosts and required certificate/DNS infrastructure.
- Public Fetch Coordinator itself does not fetch arbitrary URLs. Only the disposable public-fetch profile has dynamic public HTTPS egress.
- Public fetch rejects authentication, cookies, form submission, non-HTTPS schemes, user-supplied proxy settings, DNS rebinding, private/reserved/link-local/metadata destinations, unsafe redirects, unsupported content, and exceeded byte/time limits.
- A provider redirect outside its approved endpoint contract fails; it does not inherit the public-fetch policy.
- No sandbox joins the Docker Compose application networks.
- SSH is key-only, restricted by operator source policy, and is not an application ingress.

## 9. Authoritative data ownership

### 9.1 Ownership by store

| Store | Authoritative for | Not authoritative for |
|---|---|---|
| Supabase PostgreSQL | Domain state, current pointers, append-only material history, entitlements, permissions, Job state, Outbox, audit/retention metadata, and the Product Measurement Event ledger | Accepted file bytes, provider-private state; measurement events are not domain authority |
| Supabase Storage quarantine | Exact unaccepted upload bytes and quarantine lifecycle | Safe/accepted Source status, Evidence, rights, business authority |
| Supabase Storage protected buckets | Immutable application-encrypted Source/Artifact/export bytes, manifests, checkpoints | Business state, permissions, current Revision truth |
| PostgreSQL FTS/pgvector | Rebuildable Deal-scoped derived retrieval indexes | Source Material, Evidence, truth, confidence, readiness |
| VPS bounded job space | Active plaintext work required by an exact claimed Job | Durable accepted state or ordinary production storage |
| VPS encrypted recovery area | Independent encrypted recovery copy and verification evidence | Live authoritative state or user-facing history |
| Provider systems | Provider-specific processing and delivery events | Product entitlement, Deal authority, Evidence, readiness, external-use truth |

### 9.2 Data invariants

- Core domain objects use typed relations, foreign keys, checks, uniqueness constraints, and RLS.
- Account-scoped rows carry `account_id`; Deal-scoped rows carry both `account_id` and `deal_id`.
- Material file objects use new content-addressed keys with upsert disabled.
- Immutable accepted objects and material versions are corrected through new objects and explicit supersession/reversal relations.
- Current Revision and other current selections are mutable pointers to immutable versions.
- JSONB is limited to schema-governed boundary payloads, including strict narrative Deliverable semantic-content contracts; permission, identity, lifecycle, money semantics, version relations, and authoritative Lineage cannot exist only in JSONB.
- Search and vector rows preserve Account, Deal, source/version, derivation, and retention identity and are deleted or rebuilt with their source.
- No cross-Account or cross-Deal retrieval, cache, vector search, prompt corpus, template promotion, or evaluation corpus exists.

## 10. Communication contracts

### 10.1 Synchronous paths

| Path | Contract | Authority |
|---|---|---|
| Browser → Caddy → Web | HTTPS document/navigation requests | UI projection only |
| Browser → Caddy → API | `/api/v1` JSON HTTP | API validates session, policy, idempotency, and concurrency |
| Web → API | Same-origin server/client API calls | Web holds no durable business authority |
| Browser → Supabase quarantine | Fresh Supabase Bearer + exact purpose-scoped TUS Upload Session | Storage RLS permits one Account-template or Deal path and lifecycle only; the sole browser-direct object-store exception under ADR 0033 |
| Browser → Caddy → Protected Object Gateway | API-authorized exact stream scope | Gateway rechecks current object/session posture before decrypting |
| Provider → Caddy → API | Signed Webhook | Signature and idempotency establish provider event identity, not user authority |

No GraphQL, general WebSocket, browser-to-AI call, browser provider credential, browser database mutation, or reusable object URL is permitted.

### 10.2 Asynchronous paths

1. API validates a command, reserves commercial capacity where applicable, and commits domain intent plus Outbox in one PostgreSQL transaction.
2. Dispatcher claims committed Outbox rows and publishes a PGMQ message containing only Job identity and safe scope.
3. The appropriate coordinator atomically claims the Job and receives a short-lived Job Scope.
4. The coordinator calls a fixed provider adapter or Sandbox Supervisor profile and stages immutable result material.
5. The result passes schema, domain, permission, locator, deterministic, and current-scope validation.
6. The control plane atomically accepts the result proposal, records Job Events and material history, and publishes downstream effects through a new Outbox record.

SSE is a notification projection over persisted Job Events. `GET /api/v1/jobs/{job_id}` remains the authoritative current snapshot; reconnect uses `Last-Event-ID` and authorized replay.

## 11. Critical interaction flows

### 11.1 Upload, quarantine, and acceptance

~~~mermaid
sequenceDiagram
    participant B as Banker browser
    participant A as Control plane
    participant Q as Quarantine Storage
    participant H as Heavy Worker
    participant S as Sandbox Supervisor
    participant X as Disposable safety sandbox
    participant K as Cloud KMS
    participant O as Protected Storage
    participant D as PostgreSQL

    B->>A: Create exact Upload Session
    A->>D: Check Actor, Deal, Preflight, entitlement, limits
    A-->>B: Exact TUS path and expiry
    B->>Q: Resumable upload with Supabase Session
    B->>A: Finalize Upload Session
    A->>D: Freeze session; create quarantine Job + Outbox
    H->>D: Claim Job Scope
    H->>Q: Read exact quarantined bytes
    H->>S: Request fixed safety profile and stream input
    S->>X: Launch disposable no-egress container
    X-->>S: Digest, type, malware, archive, structure result
    S-->>H: Bounded result and output handle
    H->>K: Wrap fresh per-object DEK
    H->>O: Write new immutable encrypted object
    H->>D: Stage acceptance proposal
    A->>D: Revalidate and atomically accept Source Record or blocker
~~~

The Sandbox Supervisor chooses the image, command, mounts, limits, network profile, and output paths. A Worker cannot supply arbitrary host paths or container arguments.

### 11.2 Protected object streaming

~~~mermaid
sequenceDiagram
    participant B as Banker or Recipient browser
    participant C as Caddy
    participant A as Control plane
    participant G as Protected Object Gateway
    participant D as PostgreSQL
    participant O as Supabase Storage
    participant K as Cloud KMS

    B->>C: Request exact authorized representation/action
    C->>A: Authenticate and authorize request
    A->>D: Check Account/Deal or Recipient Session, typed attachment, immutable version, purpose, posture
    A-->>C: Short-lived exact stream scope
    C->>G: Route scoped stream request
    G->>D: Revalidate scope, revocation, current object identity
    G->>O: Read exact immutable ciphertext
    G->>K: Unwrap exact object DEK
    G->>A: Submit idempotent first-byte/access receipt
    A->>D: For Recipient Reader Copy, first use Event; otherwise authorized access Audit Event
    G-->>B: Backpressured authenticated plaintext stream
    G->>A: Submit completion/failure receipt as applicable
~~~

The Gateway is read/decrypt/stream plus narrow idempotent access-receipt emission only; it cannot perform an arbitrary domain mutation. The control plane owns External-Use Event and Audit Event commitment. Only the first qualifying Recipient Reader Copy receipt creates an External-Use Event; Account-object and ordinary Banker reads create access history only. Workers remain responsible for Job-scoped processing reads and encrypted writes. Recipient Access receives only the permitted exact render/view representation and never a Native Artifact download path.

### 11.3 Public Web Evidence

~~~mermaid
sequenceDiagram
    participant A as Control plane
    participant D as PostgreSQL/PGMQ
    participant P as Public Fetch Coordinator
    participant S as Sandbox Supervisor
    participant X as Public-fetch sandbox
    participant W as Public HTTPS source

    A->>D: Commit observation intent and Outbox
    P->>D: Claim public-Web Job Scope
    P->>P: Validate scheme, purpose, rights posture, limits
    P->>S: Request pinned public-fetch profile
    S->>X: Launch credential-free disposable browser/fetch container
    X->>W: Public unauthenticated HTTPS GET
    X->>X: Validate DNS/IP/redirect/content/time/size and render
    X-->>S: Exact capture and bounded derived outputs
    S-->>P: Result handles and validation record
    P->>D: Stage Web Evidence Observation proposal
    A->>D: Revalidate and commit immutable observation or blocker
~~~

Every later retrieval creates a new observation and Impact Assessment. The system never overwrites an earlier public observation or authenticates to bypass source controls.

### 11.4 AI execution

~~~mermaid
sequenceDiagram
    participant A as Control plane
    participant L as Light Worker
    participant D as PostgreSQL
    participant O as Protected Storage
    participant H as HelloX route

    A->>D: Commit immutable AI Task Definition scope and Job
    L->>D: Claim compatible Job Scope and provider profile
    L->>O: Read only approved exact inputs
    L->>H: Versioned strict request with untrusted-content delimiters
    H-->>L: Visible structured response
    L->>L: Schema, semantic, Evidence, locator, deterministic validation
    L->>D: Stage AI Proposal or complete rejection record
    A->>D: Revalidate current scope; commit candidate only
~~~

No AI runtime has browser, storage listing, general network, code execution, autonomous tool, or business-action authority.

## 12. Permission and credential architecture

### 12.1 Human authorization layers

Every protected action is enforced at:

1. route and command policy;
2. domain invariant;
3. PostgreSQL typed relation, procedure, and RLS;
4. object identity and Storage RLS;
5. Job Scope or protected stream scope;
6. provider material-classification and Rights Posture gate; and
7. final result commitment.

Cross-tenant invisible resources return `404`. IDs, queue messages, signed URLs, UI state, and Webhook payloads are never sufficient permission by themselves.

The complete principal/action/resource/posture matrix is defined in the [Permission Model](permission-model.md). Every online database role is a non-owner `NOBYPASSRLS` role, tenant-authoritative tables use `FORCE ROW LEVEL SECURITY`, and migration/table ownership is offline only. Trusted transaction context is established through allowlisted validating entry functions, never caller-set connection state; elevated procedures are typed and fixed-`search_path` rather than a generic bypass.

### 12.2 Runtime identities

- Web has no database or provider secret.
- API roles are split by command/query/procedure need and cannot arbitrarily decrypt file bytes.
- Dispatcher has only Outbox/PGMQ coordination authority.
- Each Worker role claims through a role-specific procedure and receives an exact expiring Job Scope.
- Protected Object Gateway has exact typed Account/Deal object-read metadata, unwrap, and stream authority but no business mutation.
- Sandbox Supervisor and sandboxes have no product database or provider credentials.
- Public Fetch Coordinator has only public-Web Job and staging authority.
- Artifact Signer and Audit Signer use different service identities and KMS keys.
- Retention and Backup Executors use distinct deletion and recovery identities.
- No universal Supabase service-role credential is shared across runtimes.

The Deployment Operator negative boundary is fixed, but its concrete human identity and interactive session mechanism is intentionally deferred. No shared shell credential, application impersonation, direct database role, or content path may fill that gap; operator-triggered production recovery commands remain disabled until a separate approved design supplies identity, command binding, and immutable audit evidence.

### 12.3 Key hierarchy

| Purpose | Key boundary |
|---|---|
| Protected Account/Deal Object DEKs | Fresh random 256-bit DEK per object; versioned chunked AES-256-GCM envelope |
| DEK wrapping | Environment-specific US-region Google Cloud KMS encryption key |
| Artifact signing | Separate KMS `EC_SIGN_ED25519` key and Artifact Signer identity |
| Audit signing | Separate KMS `EC_SIGN_ED25519` key and Audit Signer identity |
| Backup/recovery encryption | Separate recovery credential and key purpose |
| Provider credentials | Separate by environment, provider, and runtime purpose |

KMS signing keys use the software protection level for V1. Private signing material is never exported to the VPS. Signatures bind exact KMS key versions, and historical public keys remain available after rotation.

## 13. Deployment architecture

### 13.1 Production compute

Production uses one United States-region VPS with at least 8 vCPU, 16 GB DDR5 RAM, and 512 GB NVMe. It is a declared single-compute failure boundary.

Docker Compose operates the persistent application topology:

- Caddy;
- Web blue and green slots;
- API blue and green slots;
- Protected Object Gateway blue and green slots;
- Outbox Dispatcher;
- Light Worker;
- Heavy Worker coordinator;
- Public Fetch Coordinator;
- ClamAV;
- Artifact and Audit Signer runners;
- Retention Executor; and
- bounded telemetry and host agents.

Host `systemd` operates:

- Sandbox Supervisor under a dedicated non-login rootless Podman user;
- the narrow Supervisor Unix socket;
- rootless sandbox lifecycle support;
- Backup Executor one-shot schedules; and
- host health, disk, time, and recovery-area controls.

The application containers do not mount the Docker or Podman API socket. The Supervisor's own narrow socket is the only sandbox-launch interface mounted into the approved coordinator containers.

### 13.2 Managed production state

United States-region Supabase Pro provides PostgreSQL, RLS, PGMQ, FTS, pgvector, Storage, and PITR. No production PostgreSQL, Redis, Kafka, Elasticsearch, standalone vector database, or local object store runs on the VPS.

The VPS keeps only:

- bounded active Job plaintext and temporary output;
- rootless sandbox layers and ephemeral workspaces;
- immutable OCI images required for current/rollback releases;
- privacy-safe application/host diagnostics; and
- encrypted database and object recovery copies.

### 13.3 Physical deployment view

~~~mermaid
flowchart LR
    DNS["Product DNS"] --> VPS["Single US VPS"]
    VPS -->|"TLS"| C["Caddy"]
    C --> WG["Web/API/Gateway active green or blue"]
    VPS --> WK["Dispatcher and coordinators"]
    VPS --> HS["systemd Sandbox/Backup services"]

    WG --> SP["US Supabase Pro"]
    WK --> SP
    HS --> SP
    WG --> GP["Approved providers"]
    WK --> GP
    HS --> RC["Encrypted VPS recovery area"]

    LAB["Isolated Windows Microsoft 365 lab"] -->|"Reference Deal evidence only"| REL["Release evidence"]
    CI["CI/disposable synthetic validation"] --> REL
    REL --> VPS
~~~

## 14. Environment strategy

### 14.1 Local development and CI

- Local development may use local PostgreSQL, local file persistence, provider doubles, and synthetic Project Northstar fixtures.
- CI uses local or compatible ephemeral data services, immutable provider doubles, file and adversarial corpora, generated contract checks, RLS tests, and Reference Deals.
- Exact provider test credentials may run bounded contract probes from CI or a disposable synthetic runner.
- No Confidential or Restricted customer material, production database copy, production object copy, production session, or production secret enters Local or CI.

### 14.2 No long-lived Staging

V1 does not operate a persistent Staging application or database environment. This reduces environment and secret-management overhead but imposes the release rules in Section 15. A disposable synthetic validation runner is evidence infrastructure, not a persistent customer-like environment and never stores customer state.

### 14.3 Production

- Production keys, providers, Supabase project, object buckets, signing identities, DNS, and recovery copies are independent from Local and CI.
- Project Northstar runs through a dedicated synthetic Account and deterministic adapters inside production code paths but cannot invoke live Deal providers or address real objects.
- Production is the only environment permitted to accept real Deal Material after every applicable launch gate closes.

### 14.4 Microsoft 365 compatibility lab

The Windows compatibility lab is isolated from production and receives only product-owned synthetic or explicitly rights-cleared Reference Deal fixtures. It is the version-bound truth environment for Office compatibility claims, not a production artifact engine or customer-content diagnostic path.

## 15. Release and migration architecture

1. Build locked, scanned, immutable OCI images and pin all sandbox image digests.
2. Generate and diff OpenAPI, JSON Schema, TypeScript, and Python contracts.
3. Run domain, database/RLS, contract, provider, file corpus, sandbox, artifact, AI, UX, accessibility, performance, security, and recovery suites in CI or disposable synthetic validation.
4. Obtain and verify a fresh production recovery point for any persistence, encryption, or storage-affecting release.
5. Run only backward-compatible expand migration before traffic switch.
6. Start green Web, API, and Protected Object Gateway slots without customer routing.
7. Run health, contract, Project Northstar synthetic, permission-denial, provider, and protected-stream probes against green.
8. Switch Caddy to green only after all required evidence passes.
9. Stop coordinators from claiming new Jobs, drain or safely release Leases, and replace Dispatcher/Workers/Coordinators/Executors with compatible images.
10. Run bounded backfill after compatible readers/writers are live.
11. Observe privacy-safe release health and critical sentinel signals.
12. Contract old columns or payloads only in a later release after rollback compatibility expires.

Application rollback switches Caddy and restores compatible process images. It never blindly runs a down migration, deletes newly committed immutable history, or treats a restored binary as restored data.

## 16. Capacity and scaling boundary

### 16.1 V1 concurrency

| Workload | Baseline limit |
|---|---:|
| Active Deal Workspaces per Account | 2 |
| Full workflows per Deal | 1 |
| Full workflows per Account | 2 |
| Heavy Worker concurrent Jobs | 2 |
| Light Worker concurrent Jobs | 8 |
| Public fetch/render concurrent Jobs | 1 initially; increase only through measured evidence |
| Protected object streams | Bounded by host memory, bandwidth, KMS, and per-Account policy; no unbounded buffering |

### 16.2 Scaling rules

- The API, Web, Gateway, Dispatcher, and coordinators remain stateless or lease-based outside PostgreSQL and Storage.
- Multiple Dispatcher or Worker instances may be added only through database-safe claiming; there is no singleton correctness dependency.
- Scaling a module does not create a new service ownership model or alternate database.
- Heavy and public-fetch concurrency is limited separately from queue depth.
- Every scheduler decision reserves CPU, RAM, temporary disk, provider capacity, commercial allowance, and applicable KMS/Storage capacity.
- An increase in file, page, concurrency, timeout, or formula/render support requires measured minimum-VPS and Capability Manifest evidence.
- Multi-host compute, Kubernetes, service mesh, regional failover, and horizontal production sharding are outside V1.

## 17. Failure and degradation model

| Failure | System posture | Recovery boundary |
|---|---|---|
| Caddy or VPS unavailable | Product unavailable; no HA claim | Host restart or replacement; restore current compatible images and recovery procedures |
| Supabase unavailable | Mutations, Job claims, authorization, and protected reads block | No local production split-brain fallback; resume from durable state |
| PGMQ/Dispatcher failure | Commands remain committed with Outbox; Jobs wait | Idempotent dispatcher replay after recovery |
| Worker crash or lease loss | Job becomes recoverable after lease validation | Reclaim only after checking committed step effects |
| Sandbox crash/timeout | Exact step fails retryable or terminal by policy | Destroy workspace; retain safe diagnostic and staged-object cleanup task |
| Public fetch validation failure | Observation is blocked or rejected | Correct URL/rights/input or create later new observation; never bypass validation |
| HelloX unavailable/ineligible | Affected AI capability waits or blocks | Same-route validated model fallback only; no cross-provider fallback |
| Document AI unavailable | Native coverage remains; affected pages wait/block | Retry within deadline or request a compatible source |
| KMS wrap/unwrap unavailable | Source acceptance, decrypt, and protected stream block | Ciphertext remains intact; retry after KMS recovery |
| Artifact/Audit signing unavailable | Export/checkpoint completion blocks | Retry exact canonical bytes and key version; never emit unsigned success |
| Stripe ambiguity | No new capacity is granted | Reconcile signed events and product projection idempotently |
| Resend failure | Product state commits independently | Retry the same privacy-safe request/key only inside the 24-hour provider window; after an unresolved possibly accepted result expires, stop automatic send and keep the authenticated product as recovery surface |
| Sentry unavailable | Product operation continues | Local privacy-safe structured diagnostics remain; no content fallback telemetry |
| Backup lag or failed restore | Recovery launch gate/alert fails | Repair backup path and complete successful restore before counting evidence |

A component failure never silently broadens data access, switches provider, relaxes source rights, converts a proposal into Fact, clears unrelated readiness, or authorizes external use.

## 18. Backup and recovery topology

- Supabase PITR protects PostgreSQL according to the confirmed seven-day production window.
- The Backup Executor creates a daily encrypted logical database backup in the VPS recovery area.
- Immutable encrypted object copies arrive in the VPS recovery area within the confirmed 15-minute objective.
- Database and object recovery are verified together; database backup alone does not cover Storage.
- Backup execution is a host `systemd` one-shot so it does not depend on Web/API process health or application release scheduling.
- Restore verification checks object identity, ciphertext and plaintext digests where authorized, wrapped DEKs, KMS versions, manifests, signatures, audit checkpoints, RLS, current pointers, history, tombstones, and deletion schedules.
- Monthly Project Northstar restore and release-triggered Reference Deal restore use synthetic or rights-cleared data.
- A backup that has not been restored successfully is not recovery evidence.

Objectives remain:

| Scope | Objective |
|---|---:|
| Transactional data RPO | 5 minutes or less |
| Object recovery-copy RPO | 15 minutes or less |
| Current Active Deal RTO | 8 hours or less |
| Full historical restoration RTO | 24 hours or less |

## 19. Observability architecture

OpenTelemetry instruments Web, API, Gateway, Dispatcher, Workers, Coordinators, Executors, provider adapters, Job transitions, and release identity. Sentry US receives only application-filtered allowlisted Operational Telemetry.

Product Measurement Events use a separate first-party append-only PostgreSQL ledger and rebuildable projections. They are neither Sentry telemetry nor Audit or domain authority; affected production event classes remain disabled until the Integration Spec's explicit retention and anonymous-identity decisions are resolved.

Monitored categories include:

- ingress/API latency, error, rate, auth denial, and version;
- queue age, Job state, lease, heartbeat, retry, cancellation, and dead-letter posture;
- sandbox launch, profile, timeout, resource exhaustion, cleanup, and denied request;
- protected stream authorization denial, KMS latency, integrity failure, and completion without content identity;
- provider latency, contract error, throttle, incompatibility, and disabled capability;
- file safety, OCR, locator, AI contract, deterministic, artifact, and compatibility failure categories;
- backup lag, restore evidence, retention deadline, deletion backlog, and audit-checkpoint verification;
- CPU, RAM, disk, file descriptor, tmpfs, recovery-area capacity, and TLS health; and
- accessibility and critical-flow release evidence.

Telemetry excludes Source Material, AI content, provider raw responses, filenames, client/Buyer/Deal names, artifact excerpts, formulas, values, Bids, Decision content, recipient lists, raw identifiers, credentials, Cookies, Authorization headers, Query Strings, form values, and Session Replay.

## 20. Third-party dependency map

| Dependency | Calling runtime | Data boundary | Failure posture |
|---|---|---|---|
| Supabase Auth | Next.js, API, narrow identity-administration path; Gateway performs networkless JWKS validation only | Identity and security metadata; no Deal content; no Gateway administration secret or Auth network egress | Auth blocks; sensitive mutation additionally blocks without current Passkey evidence |
| Supabase Pro | API, scoped runtimes, Executors, Gateway | Authoritative rows and encrypted objects in US region | No local production split-brain fallback |
| Stripe | API Webhook/commerce adapter | Account, order, price, tax, invoice identity; no Deal payload | Last confirmed entitlement; ambiguity grants nothing |
| HelloX AI route | Light Worker only | Minimum task-specific content after profile, material-classification, and rights gate | Same-route validated fallback or block |
| Google Document AI | Heavy Worker coordinator only | Selected compatible pages/regions | Preserve native coverage; affected scope waits/blocks |
| Google Cloud KMS | Light Worker, Heavy Worker, Gateway, Signers, recovery path by exact purpose | DEK wrapping/unwrapping and signature bytes; no general Deal content | Acceptance/read/signing blocks; ciphertext/history remains |
| Aspose | Disposable no-egress processing sandbox | Exact claimed file/job scope | Affected artifact Job fails; no desktop production fallback |
| ClamAV | Heavy safety path | Quarantined bytes only | Incomplete scan fails closed |
| Resend | Supabase Custom SMTP and notification adapter | Email, auth or product template/event ID, authenticated safe link | Authentication mail failure blocks onboarding/recovery; non-auth state follows the existing delivery-ambiguity contract |
| Sentry US | Telemetry pipeline | Allowlisted privacy-safe operational metadata only | Local diagnostics continue |
| Microsoft 365 lab | Isolated lab workflow | Synthetic/rights-cleared Reference Deal fixtures only | Capability Manifest expansion blocks |
| Public HTTPS source | Public-fetch sandbox only | Unauthenticated bounded retrieval under rights posture | Observation blocks or remains live-only; no bypass |

V1 has no live email, CRM, data-room, market-data, drive, or document-repository connector and no external mutation adapter.

## 21. Contract and version boundaries

- `/api/v1` is the browser/API major-version boundary.
- Canonical TypeScript contracts deterministically generate OpenAPI, JSON Schema, and Python models; drift fails CI.
- JSON Schema uses Draft 2020-12 and schema versions use semantic versioning.
- Current and previous major structured-export schemas remain reimportable for at least 12 months.
- Job messages contain identity and safe scope, never unversioned provider payloads or Deal content.
- AI Task Definition, provider profile, Prompt layers, output schema, AI Evidence Policy, evaluation suite, evaluator, and model mapping are immutable/versioned.
- Official Investment Banking plugin rules enter production only through a reviewed design-time reference matrix and new product-owned contract versions; plugin text and package updates are never runtime Prompt includes.
- The control plane owns the AI Input Envelope, deterministic AI Context Plan, pre-issued source-fragment identities, and authoritative AI Run envelope; model-authored identifiers and locators are never authoritative.
- AI Prompt Packages and AI Task Enablement are immutable, environment- and provider-profile-scoped release records; production never reads mutable Prompt text from a plugin, database editor, or user request.
- AI execution has command-level idempotency but no cross-command or cross-Deal semantic result cache, and unvalidated provider token streams never reach business surfaces.
- Raw protected AI request/response content is retained only under the Deal-scoped AI Run contract and is not a V1 Banker, recipient, export, support, or operator inspection surface.
- Sandbox profile, image digest, command, parser, engine, font, template, and resource policy are version-bound to each attempt.
- Protected object envelopes, Native Locator profiles, Artifact Manifests, Audit Checkpoints, and signing key versions are explicit.
- Provider adapters translate provider responses into product-owned contracts; provider payloads are not domain models.

## 22. Forbidden architecture and coupling

The following are prohibited in V1:

- product microservices, service mesh, or Kubernetes;
- independent databases or object stores per UX domain;
- direct cross-module table mutation;
- browser-direct database mutation, AI call, KMS call, or service credential;
- application containers with Docker or Podman API socket access;
- untrusted parser, renderer, Office engine, or public browser running inside a privileged long-lived Worker process;
- general Worker public Internet access;
- API, Web, or operator unrestricted synchronous object decryption;
- reusable public object URLs or plaintext staging beyond the bounded Job/stream need;
- generic service-role credentials shared across runtimes;
- full event sourcing, generic EAV/domain-object storage, or JSON-only core authority;
- Redis, Kafka, Elasticsearch, standalone vector database, or VPS-local authoritative production storage;
- dynamic Account BYOK/provider endpoint, silent provider fallback, or Deal-wide autonomous agent;
- content support access, Banker impersonation, administrative Deal viewer, or content break-glass path;
- external Deal-action adapters;
- cross-Deal template promotion, content pooling, shared embeddings, or customer-content evaluation/training;
- persistent Staging containing customer-like or production-derived data; and
- claims of multi-host HA, universal Office compatibility, compliance certification, or formal SLA without separate current evidence.

## 23. Architecture decision traceability

| Concern | Governing decisions |
|---|---|
| Control plane, history, deployment, runtimes | ADR 0002, 0003, 0004, 0005, 0023 |
| Authorization, identity, data service, operator boundary | ADR 0006, 0011, 0013, 0025, 0037, 0038, 0040, 0041 |
| Office, compatibility, production engine | ADR 0007, 0008 |
| Project Northstar | ADR 0009 |
| AI route, authority, provider evidence | ADR 0012, 0020, 0021 |
| Upload, active content, locators, public Web | ADR 0014, 0015, 0016, 0018, 0033 |
| Artifacts, templates, integrity | ADR 0001, 0017, 0019 |
| Typed data, encryption, audit | ADR 0022, 0024, 0026, 0034 |
| Protected synchronous object access | ADR 0027, 0034 |
| Untrusted processing and public fetch isolation | ADR 0028 |
| Artifact and Audit signing-key custody | ADR 0029 |
| Provider billing evidence and Product Entitlement | ADR 0035 |
| Content-blind operator recovery | ADR 0036 |
| Workspace posture and Job commit fence | ADR 0039 |

## 24. Launch and evolution gates

The architecture is specified, but production remains blocked until the applicable evidence exists for:

- exact HelloX models, API profile, Structured Output, vision, limits, error behavior, usage, region, retention, training, and access posture;
- US Supabase Pro provisioning, non-owner/`NOBYPASSRLS` runtime roles, forced RLS, validating transaction context, pool reset, TUS, PGMQ, Storage, PITR, and restore;
- Google Document AI US processor/version and compatible data-processing posture;
- Google Cloud KMS DEK envelope, Ed25519 signing, IAM, corruption, rotation, and recovery fixtures;
- rootless Podman host prerequisites, Supervisor contract, socket denial, image pinning, no-egress, public-fetch SSRF, resource exhaustion, and cleanup tests;
- Protected Object Gateway cross-tenant denial, current authorization, revocation, Reader/Native action separation, range/stream integrity, and no-public-URL tests;
- Aspose licensing, pinned engines/fonts/templates, file corpus, Formula Compatibility Profile, and Microsoft 365 lab truth;
- minimum-VPS file, page, concurrency, timeout, stream, backup, and restore limits;
- Stripe tax/invoice/refund/dispute/Webhook reconciliation;
- Resend domain/signature/delivery behavior;
- Sentry allowlist and canary-content rejection;
- critical WCAG 2.2 AA browser/assistive-technology flows; and
- end-to-end deletion across rows, objects, indexes, caches, providers, recovery copies, and backup expiry.

Interactive operator-triggered production recovery is additionally blocked until the intentionally deferred Deployment Operator identity/session mechanism is approved and verified. This does not delay automated purpose-scoped Runtime Principal recovery that already satisfies its exact non-human contract.

Evolution beyond V1 must preserve stable product contracts. Team support, multi-host compute, another provider, a live connector, selectable data residency, or content support is a new architecture decision, not a configuration toggle.

## 25. Completion criteria

The System Architecture is implemented only when:

- every logical module has a single authoritative owner and a tested dependency direction;
- every deployed runtime uses only its documented principal, network path, and secret set;
- the Web, API, Gateway, Dispatcher, Workers, Coordinators, Signers, Retention, Backup, and Sandbox boundaries exist as specified;
- all browser, Job, provider, protected-stream, and sandbox contracts are generated or schema-validated where applicable;
- Account/Deal isolation, immutable bytes/history, exact Revision, AI proposal-only, and external-use separation survive adversarial tests;
- no application process can reach the container-runtime API or unrestricted public network;
- CI and production blue/green release evidence compensate for the deliberate absence of long-lived Staging;
- backup, restore, KMS rotation, artifact/audit verification, retention, and deletion have successful evidence;
- every enabled provider and supported capability is version-bound in the Capability Manifest; and
- the complete approved UX operates on real canonical domain objects rather than alternate demo, onboarding, support, or recipient data models.
