# Integration Spec

**Product:** HelloX Investment Banking — Individual-First V1

**Status:** Confirmed integration baseline with explicit deferred launch decisions

**Date:** 2026-08-08

**Scope:** Third-party and internal-system integration contracts for the first sellable release

## 1. Purpose

This document defines how the V1 product integrates with third-party providers and with its separated internal runtimes. It owns:

- integration direction, transport, authentication, authorization, and data perimeter;
- provider adapter, Webhook Inbox, Transactional Outbox, queue, Worker, database-procedure, Protected Object Gateway, and Sandbox Supervisor protocols;
- idempotency, ordering, retries, timeouts, reconciliation, degraded behavior, and recovery;
- provider credentials, egress, versioning, capability evidence, observability, retention handoff, and deletion obligations;
- integration test doubles, contract probes, release evidence, and launch gates; and
- explicit V1 non-integrations.

It does not redefine product behavior, database ownership, public API resources, AI task semantics, or human permissions. Those remain with their owning documents.

## 2. Authority and related documents

Authority is concern-specific:

- the approved [productization specification](../../.scratch/controlled-sell-side-auction-execution-workspace-v1/spec.md) owns product scope and acceptance criteria;
- [CONTEXT.md](../../CONTEXT.md) owns canonical domain terms;
- accepted [ADRs](../adr) own hard-to-reverse architecture decisions;
- [Technical Design](technical-design.md) owns the cross-cutting implementation baseline;
- [System Architecture](system-architecture.md) owns module, runtime, trust-zone, network, and deployment boundaries;
- [Data Model / ERD](data-model-erd.md) owns persistence, constraints, transactions, and authoritative state;
- [AI Prompt & Contract Spec](ai-prompt-contract-spec.md) owns AI Task, Prompt, input, output, Evidence, validation, and evaluation contracts;
- [API Spec](api-spec.md) owns browser/API, Recipient, upload-session, Protected Object, SSE, and public Webhook HTTP contracts;
- [ADR 0035](../adr/0035-reconcile-provider-billing-evidence-into-product-entitlement.md) governs provider billing evidence and Product Entitlement;
- [ADR 0036](../adr/0036-limit-operator-recovery-to-content-blind-immutable-replay.md) governs content-blind operator recovery;
- [ADR 0037](../adr/0037-suspend-reversible-recipient-access-restrictions.md) governs reversible Recipient Access suspension/resumption;
- [ADR 0038](../adr/0038-retain-a-minimal-deletion-status-claimant.md) governs authentication-only deletion-status claimant retention;
- [ADR 0039](../adr/0039-fence-job-commits-at-workspace-posture-boundaries.md) governs Workspace posture fences for Job commitment;
- [ADR 0040](../adr/0040-enforce-runtime-authorization-with-forced-rls.md) governs online database-role and forced-RLS enforcement;
- this document owns provider-native and internal runtime protocols; and
- the [Permission Model](permission-model.md) owns the consolidated principal/action/resource/posture matrix and enforcement proof without weakening the restrictions here.

When provider documentation, SDK behavior, or a dashboard setting conflicts with this document, the capability remains disabled until the contract and every affected document are deliberately updated. Provider behavior never silently redefines product authority.

## 3. Scope

### 3.1 Included integrations

Third-party and managed dependencies:

- Supabase Auth;
- Supabase Pro PostgreSQL, Storage, Queues/PGMQ, FTS, pgvector, backups, and PITR;
- Stripe Checkout, Billing, Tax, Invoices, Customer Portal, Radar, refunds, disputes, and Webhooks;
- the fixed HelloX AI Provider Route;
- Google Document AI;
- Google Cloud KMS;
- Aspose processing engines;
- ClamAV;
- Resend;
- Sentry US;
- bounded Public HTTPS sources; and
- the isolated Microsoft 365 compatibility lab.

Internal integration boundaries:

- Next.js Web to Fastify control plane;
- browser to Supabase quarantine Storage through a scoped Upload Session and TUS;
- control plane to PostgreSQL procedures, Transactional Outbox, Dispatcher, and PGMQ;
- PGMQ and claim procedures to Light, Heavy, and Public Fetch coordinators;
- coordinators to the host Sandbox Supervisor;
- Workers and the Protected Object Gateway to protected Storage and KMS;
- Signers, Retention Executor, and Backup Executor to their purpose-specific resources; and
- product-domain changes to the first-party Product Measurement Event ledger.

### 3.2 Explicitly excluded

V1 has no live:

- email inbox or calendar connector;
- CRM connector;
- virtual data-room connector;
- market-data or licensed-research connector;
- drive or document-repository connector;
- accounting, general-ledger, revenue-recognition, or ERP connector;
- Account-configured AI endpoint, API key, BYOK, or cross-provider AI fallback;
- generic outbound Deal-action adapter;
- browser-held provider secret or browser-direct business-provider call; Supabase's public authentication flow and the scoped quarantine TUS path remain the two explicit browser/provider exceptions;
- product microservice network, Kafka, Redis, or general event bus; or
- support, founder, or Deployment Operator content-access integration.

EML, CSV, JSON, ZIP, licensed-data exports, and Public Web Evidence enter only through the bounded source-intake contracts. They are not delegated connectors.

## 4. Normative integration principles

1. **The control plane owns business authority.** Providers, queues, Workers, browser redirects, signed URLs, callbacks, and operator actions provide evidence or mechanical execution only.
2. **Persist before acknowledgment.** A valid inbound provider event is acknowledged only after its immutable Inbox identity and same-transaction Outbox work are durable.
3. **At-least-once transport, exactly-once material effect.** Duplicates and reordering are expected. Transactions, unique constraints, immutable identities, and current-state revalidation prevent duplicate business effects.
4. **Authorization follows exact scope.** Every call carries or resolves the Account, optional Deal, Job, object, purpose, operation, version, classification, Rights Posture, and expiry required for that integration.
5. **No content in routing.** Queues, Outbox rows, logs, alerts, Webhook acknowledgments, and operator surfaces contain safe identity and reason codes, not Deal content.
6. **Provider eligibility is version-bound.** Reachability, authentication, or an SDK label does not establish compatible region, retention, training, format, limit, or error behavior.
7. **Fail closed without authority expansion.** Failure never switches provider, broadens source rights, changes material classification, clears readiness, creates a Human Decision, or authorizes external use.
8. **Immutable input, staged output.** Workers and provider adapters read an exact claimed scope and stage results; the control plane validates and commits the resulting domain transition.
9. **Credentials are component- and purpose-specific.** No browser, sandbox, or general runtime receives a universal service credential.
10. **Deletion crosses provider boundaries.** A provider-held object or state is part of the Deletion Scope when the applicable provider contract created it.

## 5. Integration landscape

~~~mermaid
flowchart LR
    B["Banker browser"] -->|"Supabase session; /api/v1"| API["Fastify control plane"]
    R["Recipient browser"] -->|"Recipient Session"| API
    B -->|"Supabase token + scoped TUS Upload Session"| QS["Supabase quarantine Storage"]
    B -->|"public authentication flow"| SA["Supabase Auth"]
    B -->|"Object Grant + bound session"| GW["Protected Object Gateway"]
    R -->|"Object Grant + Recipient Session"| GW

    API --> DB["Supabase PostgreSQL"]
    API -->|"same transaction"| OB["Transactional Outbox"]
    OB --> DISP["Outbox Dispatcher"]
    DISP --> Q["Supabase Queues / PGMQ"]
    Q --> MP["Measurement Projector"]
    Q --> LW["Light Worker"]
    Q --> HW["Heavy Worker"]
    Q --> PF["Public Fetch Coordinator"]

    LW --> HX["HelloX AI route"]
    HW --> DOC["Google Document AI"]
    HW --> AV["ClamAV"]
    HW --> SS["Sandbox Supervisor"]
    PF --> SS
    SS --> ASP["Aspose sandbox"]
    SS --> PUB["Public HTTPS sandbox"]

    LW --> OS["Protected Storage"]
    HW --> OS
    LW --> KMS["Google Cloud KMS"]
    HW --> KMS
    GW --> OS
    GW --> KMS
    GW --> DB

    API --> SA
    API --> STR["Stripe"]
    API --> RS["Resend"]
    MP --> PM["First-party measurement ledger"]

    STR -->|"signed Webhook"| API
    RS -->|"signed Webhook"| API

    OT["Allowlisted OpenTelemetry"] --> SN["Sentry US"]
    LAB["Microsoft 365 lab"] -->|"fixture evidence only"| CM["Capability Manifest"]
~~~

The arrows indicate permitted protocol direction, not blanket network access. Each runtime remains subject to the System Architecture egress allowlist and its own credential.

## 6. Integration register

| Integration | Direction | Initiator / receiver | Transport | Product authority | Degraded posture |
|---|---|---|---|---|---|
| Web → API | outbound internal | Web / API | HTTPS JSON, SSE | control plane | user-visible first-party error or durable Job state |
| Browser → quarantine | outbound managed | browser / Supabase Storage | HTTPS TUS | Upload Session plus later control-plane acceptance | resumable until session expiry; no accepted Source state |
| Outbox → PGMQ | outbound internal | Dispatcher / queue | PostgreSQL procedures | committed Outbox row | delayed, replayable delivery |
| PGMQ → Worker | outbound internal | Worker / claim procedure | queue identity plus PostgreSQL | claimed Job Scope | lease expiry and safe requeue |
| Coordinator → Supervisor | outbound host-local | approved coordinator / Supervisor | versioned JSON over Unix socket | fixed execution profile only | affected Job Step fails or retries |
| Gateway → DB/Storage/KMS | outbound managed | Gateway | TLS provider APIs | current Object Grant and domain state | protected stream blocks |
| Supabase Auth | bidirectional | Web, API, narrow administration path | HTTPS/SSR Cookie/JWT/JWKS/Admin API | authentication evidence only | authentication blocks; sensitive action additionally requires fresh Passkey evidence |
| Supabase Pro | bidirectional | scoped runtimes | TLS PostgreSQL/HTTPS Storage | authoritative product rows and encrypted objects | no split-brain fallback |
| Stripe | bidirectional | commerce adapter and Webhook endpoint | HTTPS/signed Webhook | verified evidence reconciled into Product Entitlement | last confirmed entitlement; no speculative grant |
| HelloX | outbound | Light Worker | fixed HTTPS API profile | AI Proposal only | same-route eligible fallback or block |
| Document AI | outbound | Heavy Worker | authenticated HTTPS API | processing result proposal only | affected pages wait or block |
| KMS | outbound | scoped Workers, Gateway, Signers, recovery path | authenticated TLS API | exact cryptographic operation | acceptance/read/signing blocks |
| Aspose | host-local | Heavy Worker through Supervisor | no-egress process contract | staged artifact proposal only | artifact Job fails |
| ClamAV | host-local | Heavy safety path | local socket/process | safety result only | acceptance fails closed |
| Resend | bidirectional | notification adapter and Webhook endpoint | HTTPS/signed Webhook | notification evidence only | state remains committed; same-key retries stop at the 24-hour provider boundary, after which unresolved possibly accepted delivery is terminally ambiguous |
| Sentry US | outbound | allowlisted telemetry exporter | HTTPS OTLP/SDK transport | none | local diagnostics continue |
| Public HTTPS | outbound sandbox only | Public Fetch Coordinator through Supervisor | HTTPS GET under fetch profile | immutable Observation proposal only | observation blocks or remains live-only |
| Microsoft 365 lab | offline/isolated | compatibility workflow | fixture/result exchange | Capability Manifest evidence only | affected compatibility claim blocks |
| Product measurement | internal | trusted emitters / PostgreSQL ledger | same-transaction Outbox identity or validated client candidate | measurement evidence, never domain authority | metric projection lags; product behavior continues |

## 7. Common integration contract

### 7.1 Adapter boundary

Each provider has one product-owned adapter per runtime language. Domain code calls a stable product interface and does not depend on provider SDK objects, status strings, exceptions, or mutable dashboard configuration.

Every adapter invocation records an immutable `integration.outbound_call_attempt` unless the same fields are already owned by an exact Job Attempt, Webhook Processing Attempt, Notification Delivery Attempt, protected-stream Access Receipt, Retention/Deletion Task attempt, or signing record. The owning record contains:

- provider and adapter code/version;
- environment and exact endpoint or route identity;
- capability/profile version where applicable;
- immutable command, Job Attempt, Inbox Event, or notification identity;
- safe input and output digests;
- start/end time and bounded duration;
- success, retryable failure, terminal failure, ambiguity, or cancellation;
- provider request/object/event identity where safe;
- retry count and privacy-safe usage/cost metadata; and
- trace ID and stable reason code.

The mapping to an owning durable record is explicit in the adapter registry; an adapter cannot rely only on logs or Sentry for invocation history. Where a Job Attempt already owns the call, `integration.outbound_call_attempt` links to it instead of duplicating protected details.

Provider SDK upgrades, API-version changes, endpoint changes, material dashboard changes, model or processor changes, and changed error semantics require contract probes and an affected Capability Manifest update before production enablement.

### 7.2 Canonical internal message envelope

Queue and host-local control messages use UTF-8 JSON validated by JSON Schema Draft 2020-12. A representative envelope is:

~~~json
{
  "contract_name": "job.step.dispatch",
  "contract_version": "1.0.0",
  "message_id": "uuidv7",
  "trace_id": "opaque-trace-id",
  "occurred_at": "2026-08-04T00:00:00Z",
  "producer_principal": "outbox_dispatcher",
  "subject": {
    "outbox_id": "uuidv7",
    "job_id": "uuidv7",
    "job_step_id": "uuidv7"
  },
  "payload_digest": "sha256:..."
}
~~~

Rules:

- unknown required versions are rejected, not guessed;
- unknown fields are rejected unless the schema declares an extension point;
- the envelope contains no Source text, filenames, prompts, model responses, recipient lists, financial values, or Deal names;
- a queue message is a wake-up identity, not a Job Scope or permission;
- the consumer reloads authoritative state and claims work through a database procedure; and
- incompatible changes create a new major contract version and a bounded dual-read migration where required.

### 7.3 Inbound Webhook protocol

Public endpoints are fixed by the API Spec:

~~~text
POST /webhooks/stripe
POST /webhooks/resend
~~~

The ingress transaction is:

1. Caddy applies TLS, method, body-size, header-size, and abuse limits without transforming the signed body.
2. The API reads the bounded raw bytes exactly once.
3. The provider adapter validates required signature headers, key/secret identity, timestamp or provider replay rule, and body authenticity using the provider-supported verifier.
4. The adapter parses the verified input into the minimum versioned canonical provider-evidence contract required by the allowlisted event type, including its schema/version, complete typed fields required for asynchronous handling, and any current-provider-object lookup keys. Unknown but valid event types retain only the verified envelope needed to classify them as ignored.
5. The API inserts `integration.webhook_inbox_event` under unique provider/event identity. Every event that requires asynchronous processing persists its complete canonical provider-evidence contract and digest before acknowledgment; raw signed bytes remain independently optional.
6. The same database transaction writes the exact typed Transactional Outbox work.
7. The endpoint returns `200` for a newly durable event or a verified duplicate/ignored event, `400` for invalid input, or `503` when durability cannot be established.
8. A separate consumer translates the immutable Inbox Event through the versioned provider adapter into a typed product reconciliation transaction.

Webhook delivery order is never trusted. A handler that needs missing or current provider state performs a separately authenticated current-object reconciliation and records that lookup. The Inbox Event, provider object, and lookup remain evidence; the resulting product transaction remains authority.

The exact raw-payload retention policy is explicitly deferred in Section 18. The confirmed contract requires a raw-payload digest and permits, but does not yet require, a protected raw-payload reference. This deferral never makes the canonical provider-evidence contract optional for a processable event.

Each Inbox Event records a closed replay posture: `exact_replay_available`, `current_object_reconciliation_only`, or `not_recoverable`. A supported processable event normally uses its persisted canonical provider-evidence contract for exact semantic replay without requiring the raw signed bytes. When the adapter cannot define a sufficient canonical contract, it must use `current_object_reconciliation_only` or remain disabled; an authenticated current-object lookup is not historical event replay. One-time Resend events may be enabled only when their canonical contracts contain every typed field required by the handler.

#### 7.3.1 Provider signature profiles

Both endpoints accept HTTPS `POST` with `Content-Type: application/json`, a maximum raw body of 1 MiB, no redirect, and a maximum absolute signed-at clock skew of 300 seconds. Production hosts use synchronized time. A provider SDK may enforce a stricter verified window but cannot widen it.

| Provider / route | Required signature headers | Verifier | Durable deduplication identity |
|---|---|---|---|
| Stripe `/webhooks/stripe` | `Stripe-Signature` including signed timestamp and one supported signature version | pinned official Stripe SDK against the endpoint-specific test/live secret and unchanged raw body | verified Stripe `event.id` |
| Resend `/webhooks/resend` | `svix-id`, `svix-timestamp`, `svix-signature` | pinned Resend/Svix verifier and endpoint-specific secret | verified `svix-id` |

Missing, duplicated where singular, malformed, unsupported-version, invalid-signature, or stale headers return `400` and create no business event. Secret rotation may accept old and new signatures only during a documented bounded overlap supported by the provider; the accepted key identity is recorded. Provider retries receive a newly verified delivery signature but resolve to the same durable event identity.

### 7.4 Outbound provider-call protocol

Before an outbound call, the caller must prove:

- current Runtime Principal and, for Deal work, unexpired Job Scope;
- exact permitted operation and provider adapter version;
- current Capability Manifest and provider profile enablement;
- applicable Material Provenance, Confidentiality, De-identification, Rights Posture, and intended use;
- exact input object/version and content digest;
- bounded resource, time, cost, and retry budget; and
- an idempotency identity when the provider operation can create a side effect.

After the call, the adapter:

1. validates protocol framing and response size;
2. maps provider errors into the stable integration error taxonomy;
3. validates provider-specific structure before any domain parser runs;
4. stages immutable output or a protected response record;
5. records provider identity, version, usage, cost, and result digest;
6. commits no domain state itself; and
7. hands the staged result to the control-plane validation and commitment procedure.

### 7.5 Idempotency and ordering

| Boundary | Idempotency identity | Exactly-once material effect |
|---|---|---|
| Browser command | Account + Actor + command + `Idempotency-Key` + request digest | `jobs.idempotency_record` and command transaction |
| Webhook | provider + verified provider event ID | Inbox unique constraint plus typed reconciliation constraint |
| Checkout/payment | Checkout Order + provider payment/session/object identity | one Commercial Receipt and Entitlement Mutation per business event |
| Outbox dispatch | Outbox ID + event version | publication marker; duplicate queue messages allowed |
| Job execution | Job Step + Attempt + effect natural key | lease check, staged object, typed commit uniqueness |
| Notification | Notification ID + template/version + recipient identity | notification delivery-attempt uniqueness; provider key where supported |
| KMS signature | canonical object digest + key version + purpose | one signature attachment per exact manifest/checkpoint version |
| Retention/deletion | Retention or Deletion Task ID + exact provider locator | task outcome and verification digest |
| Product measurement | Product Measurement Definition + source domain event identity | append-only event uniqueness; projections rebuildable |

### 7.6 Versioning

- Product HTTP APIs use `/api/v1`.
- Internal JSON contracts and product-owned provider mappings use semantic versions.
- Provider API versions, SDK versions, Webhook endpoint versions, model IDs, processor versions, engine images, virus definitions, signing key versions, and compatibility-lab builds are explicit release inputs.
- A provider event is parsed with the adapter/API version applicable when it was received; a later adapter never silently reinterprets accepted history.
- A version change that can alter authority, data egress, output meaning, or destructive behavior requires Impact Assessment and every affected contract/evaluation suite.

## 8. Internal integration protocols

### 8.1 Web to control plane

- Web calls only same-origin `/api/v1` and receives JSON, Problem Details, or SSE.
- Next.js refreshes the Supabase SSR Session, forwards only the current Access Token, and the API maps provider issuer and subject to Actor and Account before applying product authorization.
- Web has no Supabase database, queue, KMS, Stripe, HelloX, Document AI, Resend, or Sentry secret.
- A state-changing route either commits synchronously or returns a durable Job. Web does not infer success from route navigation or optimistic UI state.
- SSE replays immutable `jobs.job_event` rows using `Last-Event-ID`; it is not a command channel.

### 8.2 Browser to quarantine Storage through TUS

The only browser-direct managed-data path is a resumable upload to the quarantine bucket:

1. The API authenticates the Banker, validates Account/Deal or Account-template purpose, file-count/size posture, and entitlement, then creates an immutable two-hour Upload Session.
2. The session binds one exact non-overwritable quarantine object path, declared media type/size, purpose, Account, optional Deal, and expiry.
3. The browser uses a fresh Access Token from the same Supabase Session against the TUS resumable endpoint.
4. Storage RLS permits only the bound quarantine path and creation lifecycle. Browser upsert and overwrite are prohibited.
5. Upload completion is not Source acceptance. The API finalization command verifies the stored object identity, byte count, digest, Upload Session, and current scope before scheduling safety processing.
6. Incomplete or rejected quarantine objects follow the confirmed 24-hour deletion rule.

Supabase's provider upload URL may be valid longer than the product Upload Session; product authorization expires at the earlier product deadline. A provider URL or successful byte transfer cannot extend the session.

### 8.3 Transactional Outbox, Dispatcher, and PGMQ

- Every domain transaction that requires asynchronous work writes an Outbox row in the same PostgreSQL transaction.
- The Dispatcher reads only safe routing data and publishes the canonical message envelope to the queue mapped for the exact Job Step class.
- A consumer must call the typed claim procedure. The procedure locks the current step, verifies dependencies, entitlement, Account security epoch, Workspace activity/record posture and version, cancellation, classification, Rights Posture, capability, concurrency, and lease posture, then issues a short-lived Job Scope bound to those versions.
- A successfully claimed or already-terminal message may be acknowledged. If a claimed Worker dies, lease recovery creates new durable scheduling work; queue visibility alone is not recovery authority.
- A queue message may repeat. The claim procedure and result-commit transaction decide whether any work or effect remains.
- Dead-letter posture becomes a visible terminal or recoverable Job condition with a user-visible recovery action; it never remains only in queue administration.

### 8.4 Worker data and result contract

- Light and Heavy Workers use distinct database, Storage, KMS, and provider identities.
- A Worker may read only exact objects named by its active Job Scope.
- Protected bytes are streamed and decrypted only for the active bounded operation. Plaintext staging uses bounded tmpfs or an approved ephemeral workspace and is destroyed on completion, cancellation, or timeout.
- The Worker writes output first to a temporary content-addressed protected object or schema-validated staging row.
- The result-commit procedure revalidates Job Scope, Runtime Principal, lease, current input versions, entitlement, Account security epoch, Workspace posture version, cancellation, permission, Rights Posture, output contract, and unique effect key before attaching the result once. Pause fences stale commits immediately; Archive becomes effective only after domain-mutating Jobs are terminal or safely canceled.
- Workers do not update authoritative aggregate state, current pointers, Product Entitlement, readiness, Human Decisions, or external-use state directly.

### 8.5 Sandbox Supervisor over Unix socket

Approved coordinators call a versioned HTTP/1.1 JSON contract over a host Unix-domain socket. The minimum operations are:

~~~text
POST /v1/executions
GET  /v1/executions/{execution_id}
POST /v1/executions/{execution_id}/cancellations
~~~

`POST /v1/executions` accepts only:

- exact Job Attempt identity and safe trace identity;
- approved execution profile code/version;
- staged input-slot identities;
- declared output slots;
- a versioned resource-limit set; and
- the operation deadline.

The request cannot contain an image name, command, arbitrary argument, host path, mount, user, network mode, device, capability, or secret. The Supervisor resolves the approved profile to an immutable image digest, fixed command, mounts, UID/GID, seccomp/capability posture, resource limits, network profile, and output path. It returns only execution identity, state, safe reason code, resource totals, and staged-output digests.

The socket is mounted only into approved coordinator runtimes and is owned by the dedicated non-login Supervisor user. Neither an application container nor a sandbox receives the Docker or Podman API socket.

### 8.6 Protected Object Gateway

The Gateway accepts only `GET /objects/{protected_object_id}` with an opaque Object Grant, the bound current human session proof, and at most one supported Range.

For an Individual Banker stream, the API authenticates the current Supabase Session and issues the five-minute Object Grant bound to that session identity. The Gateway verifies the accompanying bound Supabase JWT networklessly using the configured JWKS snapshot, without an Auth administration secret or Auth network call, then revalidates the hashed Object Grant and current Account, entitlement, security epoch, object, and product revocation posture in PostgreSQL. Product-controlled recovery, logout, or restriction advances the security epoch and revokes matching Grants; out-of-band provider revocation remains bounded by the shorter remaining one-hour JWT and five-minute Grant lifetime. For an External Recipient stream, the Gateway validates the isolated Recipient Session and Recipient Access instead of Supabase Auth.

The Gateway then resolves exactly one typed Protected Account Object or Protected Deal Object, unwraps only its DEK through the purpose-specific KMS permission, validates byte identity/integrity, and streams without buffering the whole object. It cannot list objects, create URLs, mutate domain state, execute Jobs, inspect unrelated metadata, or retain plaintext.

### 8.7 Signers

- Artifact Signer accepts only canonical Artifact Manifest bytes plus the exact Artifact key version and purpose.
- Audit Signer accepts only canonical Audit Checkpoint bytes plus the exact Audit key version and purpose.
- The identities and KMS keys are separate.
- A signing response is verified for key version, algorithm, request/response integrity, and signature validity before attachment.
- Failure blocks signed completion; no unsigned success or software-key fallback is permitted.

### 8.8 Retention and deletion executors

- The control plane creates exact Retention Tasks and Deletion Tasks with a closed surface class and provider/resource locator.
- Executors may delete or verify only those exact resources. They cannot broaden Deletion Scope, inspect content, or choose a preservation exception.
- Provider deletion is retried idempotently and records a safe outcome and verification digest.
- A missing provider object is successful only when the adapter can prove the exact target is absent; ambiguous authorization or lookup failure remains incomplete.
- Completion waits for all required primary, provider, recovery-copy, and scheduled backup-expiry tasks.

### 8.9 Backup integration

The Backup Executor is a host `systemd` one-shot independent of Web/API release health. It uses separate read/copy credentials for:

- daily encrypted logical PostgreSQL backup;
- immutable encrypted protected-object recovery copies;
- completeness and digest manifests; and
- restore verification.

It cannot decrypt Deal content for operator inspection. Restore verifies KMS references, object and database identity, RLS, current pointers, manifests, Audit Checkpoints, retention schedules, and Deletion Tombstones before restored data becomes accessible.

### 8.10 First-party product measurement

V1 uses an append-only PostgreSQL Product Measurement Event ledger and no third-party product-analytics SaaS. Sentry remains Operational Telemetry only.

- Every event binds a versioned Product Measurement Definition with exact satisfaction, emitter, inclusion/exclusion, property, and deduplication rules.
- Server-known commercial, lifecycle, value, cost, Job, Revision, export, refund, cancellation, referral, and capability conditions write a privacy-safe measurement emission to the Transactional Outbox in the same domain transaction. A measurement consumer appends the Product Measurement Event under that immutable source identity.
- Browser observations are untrusted candidates. The API validates route/event allowlists, schema, consent posture where applicable, rate, and deduplication before persistence.
- Events use privacy-safe pseudonymous session, Account, Deal, Revision, object, provider, cohort, and reason identities where applicable and contain none of the prohibited Deal-content fields.
- Synthetic, test, bot, employee, fraud, duplicate, refunded, and instrumentation-failure posture remains explicit rather than deleted from history.
- Funnel, cohort, cost, and lifecycle aggregates are rebuildable projections, not the ledger and not product authority.
- Failure before the domain transaction, including its Outbox row, commits means no product transition occurred. Failure after that commit delays only the measurement append; the Outbox identity permits deterministic recovery without duplicating the domain effect.

The anonymous-attribution and retention/de-identification lifecycle is deferred in Section 18 and blocks final production enablement of the affected event classes.

## 9. External provider contracts

### 9.1 Supabase Auth

**Purpose:** Account-side Magic Link onboarding/recovery, required Passkey registration, Passkey login/reauthentication, Session identity, JWT/JWKS validation, and narrow identity administration. Supabase Auth is not Actor, Account, Deal, Product Entitlement, role, Recipient Access, or permission authority.

**Caller and credentials:**

- Web uses the public Supabase project configuration and Supabase SSR Cookie contract; it forwards only the current Access Token to the API.
- API and Gateway validate Session JWTs networklessly against pinned algorithm, issuer, audience, expiry, and JWKS expectations. Gateway holds no Auth administration secret and has no Auth network egress.
- Only the Identity adapter/Retention Executor holds the narrow administration credential required for product-controlled logout, recovery invalidation, and final identity deletion.
- A fresh Access Token from the same Session authorizes only the scoped quarantine TUS path under Storage RLS; it is not general database or business authority.
- Supabase Auth generates and verifies the default Magic Link and uses Resend only as production Custom SMTP. There is no Send Email Auth Hook.

**Identity and Session contract:** The Product API idempotently creates or links `identity.external_identity → Actor → Account` only after verified authentication and required Passkey registration. V1 adds no general Supabase Auth Hook, Database Webhook, or `auth.users` Trigger for product identity or authority. JWT lifetime remains one hour; inactivity is 12 hours, absolute Session lifetime seven days, and only one Session may be active per user. Password, numeric Email OTP customization, TOTP, and MFA enrollment are disabled. Fresh-Passkey evidence exists only when the verified current Session JWT contains an `amr` entry whose method is `passkey` and whose timestamp is no older than five minutes; JWT issue time, client state, or a `magiclink` entry alone is insufficient.

**Recovery and deletion-status contract:** Magic Link for an existing user authenticates only the product-owned Account Security Restriction and Security Recovery Session; it never grants ordinary Account/Deal access. Account deletion removes every ordinary product relationship and Session immediately but retains the same Supabase issuer-and-subject identity solely for the minimal Deletion Status Claimant until `status_available_until`, then requests and verifies final Supabase Auth identity deletion when no other separately lawful product relationship exists.

**Failure posture:** New authentication and identity administration block. Sensitive mutations and high-risk Audit reads fail closed without a fresh Passkey login no older than five minutes. There is no fallback identity provider and no Magic Link downgrade for sensitive actions.

**Required probes:** pinned SDK/configuration; experimental Passkey registration, login, removal, recovery, and reauthentication; `amr.method=passkey` timestamp issuance and preservation across refresh; default Magic Link through Resend Custom SMTP; SSR Cookie refresh; JWT algorithm/issuer/audience/expiry and JWKS rotation/staleness; Session inactivity/absolute/single-session behavior; product security-epoch denial; administration credential isolation; user unlinking/final deletion; TUS RLS; and cross-Account denial. Failed Passkey evidence blocks the Confidential production pilot.

### 9.2 Supabase Pro

**Purpose:** authoritative PostgreSQL state, RLS, Queues/PGMQ, FTS, pgvector, encrypted object Storage, and PITR in the approved United States region.

**Database contract:**

- Runtimes connect through TLS with separate least-privilege, non-owner `NOBYPASSRLS` roles; every authoritative tenant-bearing table uses `FORCE ROW LEVEL SECURITY`, and the offline migration owner never serves runtime traffic.
- Public PostgREST mutation of core tables is disabled.
- Authorization context is transaction-local and established only through allowlisted validating entry functions; pooled connections prove reset before reuse.
- Security-definer procedures have dedicated `NOLOGIN` owners, fixed search paths, typed parameters, revoked public execution, explicit authorization, bounded results, and adversarial tests; no generic bypass accepts arbitrary SQL/table/operation/object identifiers.
- The product transaction, not Storage metadata or a queue row, owns business state.

**Storage contract:**

- quarantine and protected buckets are separate;
- the browser can create only the exact quarantine path bound by an Upload Session;
- protected objects are immutable, application-envelope-encrypted, and never served by reusable public URL;
- Workers and Gateway use purpose-specific credentials and typed attachment checks; and
- database backup does not count as object backup.

**Queue contract:** PGMQ carries only safe wake-up identity. Job state, leases, cancellation, retries, and accepted effects remain in product tables.

**Failure posture:** Mutations, Job claims, authorization, and protected reads block. Production never writes to a VPS-local fallback database or object store.

**Required probes:** region and project identity, non-owner/`NOBYPASSRLS`/forced-RLS posture for every online role, migration-owner runtime denial, definer/public grants, pooled-context leakage, Supabase Auth-to-Storage RLS, TUS resumption/conflict/expiry, non-overwrite behavior, queue duplicate/visibility/recovery behavior, PITR window, logical restore, object restore, FTS/vector deletion, and Deletion Tombstone reapplication.

### 9.3 Stripe

**Purpose:** hosted Checkout, recurring Billing, Tax, Invoices, restricted Customer Portal, Radar, refunds, disputes, and provider payment evidence.

**Authority boundary:**

- Checkout Order, Commercial Receipt, Product Entitlement, Entitlement Mutation, Usage Ledger, Guarantee Assessment, Payment Dispute, and Billing Recovery are product records.
- Stripe Product/Price IDs map to a versioned product catalog and have no standalone permission meaning.
- A browser return, Checkout Session, Subscription status, Invoice status, PaymentIntent status, raw Webhook, or Dashboard action never directly grants product capability.
- A verified Stripe event plus any required current-object lookup is reconciled idempotently in one product transaction.

**Outbound operations:**

- create Checkout Session for an exact accepted Checkout Order;
- create a restricted Customer Portal Session for the exact Account/provider customer;
- perform only policy-authorized subscription, cancellation, refund, invoice, and dispute-reconciliation operations;
- use the Checkout Order or product command identity as the provider idempotency basis where supported; and
- store no Deal ID, client/Buyer name, Deal name, filename, source, or artifact content in provider metadata.

**Inbound signal classes:**

- Checkout completion or asynchronous payment result;
- invoice finalization, payment success, payment failure, or action required;
- subscription creation/update/cancellation;
- refund and credit-note lifecycle; and
- Payment Dispute creation/update/closure.

The exact provider event allowlist and Stripe API version are versioned deployment artifacts. Unsupported events are durably classified and acknowledged without changing business state.

**Confirmed reconciliation behavior:**

| Reconciled condition | Product effect |
|---|---|
| Initial payment confirmed | create one Commercial Receipt and applicable Product Entitlement mutation |
| Duplicate or older event | record/acknowledge; no duplicate receipt, capacity, refund, or mutation |
| Out-of-order/ambiguous event | retrieve exact current provider objects when permitted; grant nothing until consistent |
| Renewal payment unresolved before `paid_through` | enter Billing Recovery; continue only the already-paid term; grant no new period, add-on, or capacity |
| Failure unresolved at `paid_through` | begin confirmed 30-day Post-Term Access |
| Open Payment Dispute | preserve Account-owner inspection, Internal Controlled Export, billing correction/reconciliation, and deletion; block new substantive processing, capacity purchase, External-Use Decision, Externally Authorized Delivery, and new Recipient Access; suspend every otherwise-active Recipient Access and invalidate its Sessions/stream grants; retain Deal/history and make no claim about product-external use |
| Dispute won or reversed | idempotently restore only the applicable remaining Product Entitlement and clear that suspension cause; do not reactivate Access automatically; permit only an explicit Banker resumption of one still-valid unchanged Access with a Sensitive Action Grant and new Recipient verification |
| Dispute lost | end the challenged paid-term entitlement as mapped by the reconciled charge and revoke all Recipient Access before entering Post-Term Access |

The product-owned reconciliation transaction creates or clears the exact Payment Dispute suspension cause under [ADR 0037](../adr/0037-suspend-reversible-recipient-access-restrictions.md). Clearing the provider dispute never resumes external access, and another active suspension cause still denies it. A lost dispute is terminal for the mapped paid term: all affected Recipient Access is revoked before Post-Term Access. No implementation may infer any of these effects from Stripe state alone.

**Refund Effect mapping:**

| Closed refund reason type | Product-owned effect |
|---|---|
| `first_deal_guarantee_full_refund` | attach the refund Commercial Receipt to the deterministic Guarantee Assessment, reverse the refunded base-term Entitlement Mutation once, revoke all Recipient Access, and enter Post-Term Access |
| `duplicate_charge_correction` | reverse only the duplicate Commercial Receipt/payment; preserve the original paid term, capacity, and Product Entitlement |
| `tax_or_invoice_adjustment` | reconcile amount/tax records only; no Product Entitlement or capacity change |
| `unused_capacity_add_on_refund` | reverse only the exact unconsumed add-on Entitlement Mutation; never the base paid term |
| `dispute_loss_charge_reversal` | reverse the exact challenged paid-term receipt/effect and enter Post-Term Access when no other paid term remains |
| `unmapped_or_ambiguous_refund` | create no Entitlement Mutation; hold the refund reconciliation in an explicit blocked state until a product-owned reason and exact prior effect are established |

Provider refund type, amount, or status never selects the row by itself. The product records a Refund Effect binding one exact refund receipt, prior receipt/mutation, closed reason type, mapping-policy version, and resulting entitlement/capacity delta.

**No accounting integration:** V1 maintains its commercial ledger and Stripe reconciliation internally. Periodic privacy-safe close/reconciliation export is manual. No accounting or revenue-recognition system may write back into Product Entitlement or another product state.

**Failure posture:** Last confirmed Product Entitlement remains authoritative. Ambiguity grants no new term or capacity. Provider failure does not delete Deal history. A failed attempt is visible through the Checkout Order, billing state, or Job/reconciliation state rather than a generic success page.

**Required probes:** test/live key separation, API version, Product/Price catalog mapping, Tax and invoice behavior, Checkout redirect recovery, duplicate and out-of-order Webhooks, provider retry, current-object reconciliation, subscription renewal failure, Billing Recovery boundary, cancellation, refund, guarantee, dispute, Customer Portal restrictions, and exactly-once entitlement/capacity effects.

### 9.4 HelloX AI Provider Route

**Purpose:** all V1 AI execution through the fixed deployment route `https://www.hellox.cloud`.

**Caller and credential:** Light Worker only, with separate test and production credentials. The base URL and headers are deployment-owned; no Account or browser configuration is permitted.

**Request contract:** The Worker sends only the canonical provider messages compiled from an enabled AI Prompt Package and authoritative AI Input Envelope. The request binds exact Task Definition, Prompt, schema, Evidence Policy, provider profile, Job Scope, input digest, material classification, Rights Posture, limits, and request nonce. Models receive no product tool, browser, storage, database, or network authority.

**Response contract:** Protocol framing, response size, JSON, strict schema, semantic invariants, scope digest, Evidence references, locator resolution, deterministic rules, and current authorization are validated in the order fixed by the AI Prompt & Contract Spec. Raw model text or tokens never become a business object or user-visible streaming authority.

**Retries and fallback:** One AI task allows no more than three total provider invocations: the initial call and at most two opportunities shared by transient retries and contract repair. Transient backoffs are 5 seconds then 30 seconds; `Retry-After` may lengthen within the task deadline. Fallback is only to another HelloX model that passed the same task contract, material-classification gate, and release threshold.

**Failure posture:** Authentication, rights, provider-profile incompatibility, unsupported schema, exhausted repair, or policy failure is terminal/blocked as applicable. Transient connection, bounded timeout, 408, 429, or selected 5xx may retry. There is no cross-provider fallback.

**Required probes:** exact API profile and model list, Structured Output, vision where applicable, context/output limits, complete-response behavior, usage, error and `Retry-After`, region, retention, training, provider access, deletion posture, same-route fallback, and canary content-exclusion from telemetry.

### 9.5 Google Document AI

**Purpose:** OCR and Layout Parser for selected compatible pages or regions where native extraction coverage is insufficient.

**Caller and credential:** Heavy Worker coordinator only, using a dedicated service identity limited to the exact approved United States processor/version and processing operations.

**Input contract:** The coordinator sends only exact selected page batches from an accepted Source Representation after classification, rights, provider-profile, and Job Scope checks. Input and output retain page mapping, processor/version, digest, coverage, and failure identity.

V1 does not add Google Cloud Storage merely to use provider batch APIs. Calls are split into bounded requests within the verified online processor limits. A processor or document size requiring a separate provider storage/batch integration remains disabled until this document, the data boundary, deletion contract, and Capability Manifest are amended.

**Output contract:** Provider OCR/layout output is an untrusted processing result. Deterministic parsers validate structure and map it to Source Representation and Processing Coverage proposals. Native extraction coverage is preserved and conflicts remain explicit.

**Failure posture:** The affected page scope waits, retries within the 60-minute document deadline, or blocks with a compatible-source recovery action. Native coverage is not discarded. No other OCR provider is selected silently.

**Required probes:** processor and frozen version, region, IAM, online page/byte limits, language/layout coverage, timeout/error/throttle semantics, retention and provider access, page mapping, malformed response, partial-page failure, and deletion obligations.

### 9.6 Google Cloud KMS

**Purpose:** envelope-encryption DEK wrapping/unwrapping and separate Artifact/Audit asymmetric signing.

**Caller and permission:**

- Light and Heavy Workers: only the exact environment data-encryption key operations required by a valid Job Scope;
- Protected Object Gateway: unwrap only for an exact currently authorized stream;
- Artifact Signer: `useToSign` only on the Artifact signing key;
- Audit Signer: `useToSign` only on the Audit signing key;
- Backup/recovery identity: only the documented recovery key operations; and
- verification clients: public-key retrieval only where required.

KMS receives DEKs or the exact canonical Manifest/Checkpoint bytes required by the selected signing algorithm, not general Deal content. Key resource IDs, versions, algorithm, purpose, request/response integrity checks, and result digests are recorded. Private signing material is never exported.

**Failure posture:** New object acceptance, decryption, protected streaming, signing, or recovery blocks according to the failed purpose. Ciphertext and immutable history remain intact. No local master key or unsigned fallback is allowed.

**Required probes:** region, IAM denial per role, wrap/unwrap round trip, wrong-key denial, key rotation, old-version decrypt/verify, Ed25519 sign/verify, request/response integrity, unavailable/throttled behavior, and recovery after credential rotation.

### 9.7 Aspose

**Purpose:** server-side Office and PDF generation, parsing, comparison, and related production behavior fixed by the Capability Manifest.

Aspose is a pinned licensed runtime inside disposable no-egress processing sandboxes, not an outbound SaaS call. The approved execution profile fixes runtime, package/license version, image digest, fonts, locale, timezone, command, parser, limits, and output paths. The license is mounted read-only only to the relevant profile and never enters artifacts or logs.

Outputs are staged and then pass deterministic validation, manifest construction, Native/Reader consistency checks, and applicable QC. Aspose availability does not establish Microsoft 365 compatibility truth.

**Failure posture:** The exact artifact Job fails retryable or terminal by policy. There is no desktop-Office production fallback and no egress-enabled license workaround.

**Required probes:** license and package pin, no-egress execution, supported file corpus, formula/render behavior, fonts, deterministic metadata normalization, malformed/active-content rejection, memory/CPU/tmp limits, cancellation, and output cleanup.

### 9.8 ClamAV

**Purpose:** malware scanning of quarantined bytes before substantive processing.

Only the Heavy safety path may submit the exact quarantined object to the local pinned ClamAV runtime. The scan result records engine and signature versions, byte digest, completion, result code, and safe reason. Scan bytes and malware names do not enter general telemetry.

Definitions are updated through a host maintenance path separate from Deal processing. The maximum permitted signature age is a versioned safety policy and release input.

**Failure posture:** timeout, engine error, stale/ineligible definitions, incomplete coverage, or detected malware prevents Source acceptance. No clean result is inferred from provider unavailability.

**Required probes:** clean/malicious/oversized/archive-bomb corpus, signature age, engine failure, timeout, partial-read behavior, concurrent baseline load, quarantine isolation, and cleanup.

### 9.9 Resend

**Purpose:** production Custom SMTP transport for Supabase Auth Magic Links plus non-Account-authentication transactional email, including safe lifecycle notices and product-owned External Recipient link/code delivery. Supabase Auth owns Magic Link generation and verification; Resend supplies transport only.

**Caller and credential:** notification adapter only, with separate test/production API keys and sending subdomains.

**Outbound contract:** A durable Notification selects an allowlisted template/version and passes only recipient email, generic safe event class, expiry where applicable, and an opaque authenticated deep link or one-time code. Email contains no Deal, client, Buyer, filename, amount/value, Bid, Decision, recipient-list, prompt, source, or artifact content. Open and click tracking are disabled.

Provider-supported idempotency is used where the pinned API supports it; product uniqueness remains authoritative. For Resend, one Notification uses one stable `Idempotency-Key`, and the product records a conservative `provider_idempotency_expires_at` equal to the first send-attempt start plus 24 hours. Automatic retry is permitted only before that boundary. A provider message ID is delivery evidence, not proof that the user saw or acted on a Notification.

**Inbound events:** Signed delivery/bounce/complaint events enter the common Inbox and append a deduplicated Notification Delivery Event. A reducer may update current Notification delivery posture and suppression safety from those events; it never mutates a historical delivery attempt. These events cannot create Recipient Session, Recipient Access, External-Use Event, Product Entitlement, or domain state. Only a successfully authorized Reader Copy stream creates the observable External-Use Event for Recipient Access.

**Failure posture:** Product state remains committed. The adapter retries the same request with the same key only while `now < provider_idempotency_expires_at`. If the provider may have accepted the request, no provider message ID can be reconciled, and that boundary has passed, the Notification enters terminal `delivery_ambiguous`; the adapter does not automatically send it again under a new key. A later Account-authorized reissue, when the product permits one, creates a new Notification after current authorization and expiry checks. The authenticated product remains the recovery surface. Authentication or access state is never inferred from email delivery/open/click events.

**Required probes:** domain/SPF/DKIM/DMARC, test/live separation, template allowlist, tracking disabled, raw-body signature verification, duplicate/out-of-order delivery events, bounce/complaint suppression, same-key retry inside the 24-hour window, ambiguous outcome at and after the retry boundary, no automatic new-key resend, expired link/code, and canary content exclusion.

### 9.10 Sentry US

**Purpose:** privacy-safe exception, performance, and release-health Operational Telemetry.

OpenTelemetry instrumentation emits through an application-side allowlist before Sentry. Session Replay, attachments, request/response bodies, Cookie and Authorization headers, Query Strings, form values, user IP where configurable, raw IDs, names, filenames, Source Material, AI content, financial values, Bids, Decisions, recipients, and artifact excerpts are disabled or removed before transmission. Environment-salted non-reversible monitoring identifiers are permitted.

Sentry issues, dashboards, and alerts are not Audit Events, Product Measurement Events, domain history, or product authority. Sentry Data Scrubbing is defense in depth after application filtering.

**Failure posture:** Product operations continue with local privacy-safe structured diagnostics. No content-bearing emergency telemetry path is allowed.

**Required probes:** US project/region posture, release/environment tags, sampling, source maps without secrets, SDK before-send filtering, canary secret/content rejection, disabled Session Replay/attachments, outage behavior, and retention configuration.

### 9.11 Public HTTPS sources

**Purpose:** bounded unauthenticated retrieval for Public Web Evidence.

The Public Fetch Coordinator sends only a validated URL contract to the public-fetch Supervisor profile. The sandbox has no product database, Storage, KMS, AI, Stripe, Supabase Auth administration, or Deal credential. It may use HTTPS GET only under fixed DNS, redirect, IP-range, port, method, content-type, byte, time, and resource rules. Every redirect and resolved address is revalidated; loopback, private, reserved, link-local, metadata, and credential-bearing URLs are denied.

The sandbox returns staged bytes plus requested/final URL, retrieval time, status, bounded headers, content digest, and safe failure code. The control plane records a versioned immutable Observation and Source Representation only after rights, locator, and content checks. Live page content is Evidence only for the exact Observation and does not become a universal Fact.

**Failure posture:** The observation blocks, records live-only posture, or asks the Banker for another source. The system does not broaden egress, use browser credentials, bypass robots/access controls, or retry indefinitely.

**Required probes:** DNS rebinding, redirects, IPv4/IPv6 private ranges, metadata endpoints, userinfo URLs, non-HTTPS schemes, oversized/decompression-bomb content, timeout, malformed TLS, content-type mismatch, active content, and observation immutability.

### 9.12 Microsoft 365 compatibility lab

**Purpose:** compatibility truth for exact Native Artifacts and supported Microsoft 365 builds.

The lab is isolated from production Accounts, credentials, databases, and protected objects. It accepts only synthetic or separately rights-cleared Reference Deal fixtures and exact build manifests. Results return as signed/digested compatibility evidence containing fixture identity, Office channel/build, operating system, fonts, calculation settings, observed outputs, visual/formula findings, and time.

Lab success updates no production artifact or Banker state directly. A reviewed release process uses the evidence to create or extend a Capability Manifest. Aspose output without matching lab evidence cannot claim Microsoft 365 compatibility.

**Failure posture:** The affected artifact/application capability remains disabled or explicitly limited. Production does not route a customer's artifact to the lab.

## 10. Data-egress and authority matrix

| Destination | Maximum permitted data | Prohibited examples | Result authority |
|---|---|---|---|
| Supabase Auth | identity, Passkey, Session and security metadata | Deal content, entitlement rules, recipient artifacts | authentication evidence |
| Supabase PostgreSQL | authoritative product state | direct browser mutation | product tables/procedures by owner |
| Supabase quarantine | unaccepted uploaded bytes and lifecycle metadata | accepted-source claim before safety gate | bytes only |
| Supabase protected Storage | application-encrypted objects and manifests | plaintext public URL | typed attachment plus database state |
| Stripe | Account/order/price/tax/invoice/payment identity | Deal/client/Buyer/source/artifact payload | payment evidence only |
| HelloX | minimum task-specific eligible content and contract | extra Deal scope, credentials, tools | AI Proposal only |
| Document AI | selected eligible pages/regions | entire unrelated source set | processing proposal only |
| KMS | DEK or exact canonical signing input and key metadata | general Deal content | cryptographic result only |
| Aspose sandbox | exact Job-scoped local bytes | network credential or arbitrary mount | staged artifact proposal |
| ClamAV | exact quarantined bytes | accepted domain state | scan evidence only |
| Resend | email, safe template/event identity, opaque link/code | Deal content or recipient list | notification evidence only |
| Sentry | allowlisted Operational Telemetry | content, secrets, raw identifiers | none |
| Public source | unauthenticated validated request | cookies, private network, Deal credentials | immutable Observation proposal |
| Microsoft 365 lab | synthetic/rights-cleared fixture | production customer artifact | compatibility evidence only |
| Product measurement ledger | privacy-safe event contract and pseudonymous identities | Deal content or mutable business truth | measurement evidence only |

## 11. Credentials and configuration

### 11.1 Credential partition

| Credential | Holder | Must not be held by |
|---|---|---|
| Supabase public project/Auth configuration | Web | treated as a secret or business authority |
| Supabase Auth administration credential | Identity adapter and Retention Executor only | Web, Gateway, Workers, sandboxes |
| Supabase Auth JWT issuer/audience/JWKS configuration | API and Gateway | used as business authority without product relationship checks |
| Supabase migration owner | migration runner only | application runtime |
| Supabase API/domain role | control plane | Web, sandboxes, operator shell by default |
| Supabase Dispatcher role | Dispatcher | Workers and Web |
| Supabase Worker roles | matching Worker only | other Worker classes |
| Supabase Gateway role | Gateway | Web and Workers |
| Stripe secret/Webhook secret | commerce adapter / ingress verifier | Web, Workers, Gateway |
| HelloX key | Light Worker | Web, API UI, Heavy Worker, sandbox |
| Document AI identity | Heavy Worker coordinator | Web, Light Worker, sandbox |
| KMS unwrap identity | exact Worker/Gateway/recovery purpose | Web, Dispatcher, sandbox |
| Artifact signing identity | Artifact Signer | Gateway, Audit Signer, operator |
| Audit signing identity | Audit Signer | Gateway, Artifact Signer, operator |
| Resend key/Webhook secret | notification adapter / ingress verifier | Web, Workers, sandbox |
| Sentry DSN/auth | telemetry/release pipeline as applicable | used for Product Measurement or Audit |
| Aspose license | approved sandbox profile | artifacts, logs, general container image layer |

### 11.2 Configuration classes

- **Public non-secret:** supported public capability and current verified Capability Manifest identity.
- **Deployment non-secret:** provider URLs, regions, API versions, model/processor aliases, queue names, concurrency, deadlines, circuit-breaker policy, and public key identities.
- **Secret:** provider keys, Webhook secrets, database role credentials, KMS identities, signing permissions, and recovery encryption.
- **Versioned policy:** provider allowlists, material-classification eligibility, retry/error mapping, file/operation limits, templates, Product Measurement Definitions, and retention rules.

Typed configuration is validated at startup. Missing, extra, malformed, default/test, cross-environment, or incompatible production configuration fails before traffic is accepted. Secrets remain outside Git, build arguments, OCI layers, documentation, logs, database business rows, and frontend environment variables.

### 11.3 Rotation

- Provider and database credentials rotate independently by environment and purpose.
- Webhook verification supports a bounded planned overlap for old/new secrets only when the provider protocol supports it.
- JWT/JWKS and KMS public verification keys retain enough version identity to validate historical records.
- Rotation never rewrites historical provider events, signatures, manifests, or Audit Checkpoints.
- A failed rotation rolls back to the last valid credential version without broadening permissions.

## 12. Reliability, retry, and degraded behavior

### 12.1 Stable integration failure classes

| Failure class | Retry | Product posture |
|---|---|---|
| `integration_authentication_failed` | no silent retry beyond credential refresh contract | integration disabled/blocked; alert |
| `integration_authorization_denied` | no | blocked; do not broaden scope |
| `integration_capability_disabled` | no | explicit unsupported/blocked recovery |
| `integration_contract_mismatch` | no automatic semantic retry | quarantine result; disable affected version |
| `integration_invalid_response` | bounded only where contract permits repair | failed/blocked; no partial authority |
| `integration_rate_limited` | yes within deadline and `Retry-After` | queued/running with visible status |
| `integration_timeout` | bounded, idempotent only | retryable or terminal by operation policy |
| `integration_unavailable` | bounded, circuit opens | durable wait/failure; no provider switch |
| `integration_ambiguous_result` | reconcile exact current provider object | grant/change nothing until resolved |
| `integration_duplicate` | acknowledge | no duplicate material effect |
| `integration_out_of_order` | reconcile/reload authority | no backward or speculative transition |
| `integration_persistence_failed` | provider retries inbound; internal recovery outbound | no acknowledgment/success until durable |
| `sandbox_policy_denied` | no | terminal policy failure |
| `integration_deletion_incomplete` | idempotent retry | deletion remains incomplete |

These classes map to the API Spec's public Problem Details or durable Job state without exposing provider payloads or credentials.

### 12.2 Retry rules

- Retry only transient, bounded, idempotent operations.
- Honor valid provider `Retry-After` within the owning operation deadline.
- Add bounded jitter for concurrent provider calls; exact values are versioned configuration tested on the minimum VPS.
- Authentication, permission, rights, unsupported format, invalid business contract, disabled capability, and sandbox-policy failures do not silently retry.
- A timeout after a possibly committed provider mutation becomes `integration_ambiguous_result` and reconciles by idempotency key or current object before another mutation.
- AI retry/repair remains capped at three total provider invocations.
- Job cancellation stops new attempts, preserves committed immutable results, and cleans unattached outputs within retention limits.

### 12.3 Deadlines and concurrency

Owning product limits remain:

| Operation | Total deadline / concurrency |
|---|---:|
| Upload Session | 2 hours |
| Safety processing | 10 minutes per file |
| Native parse | 20 minutes |
| OCR | 60 minutes per document |
| AI attempt | 10 minutes |
| Artifact generation | 30 minutes |
| Full workflow | 4 hours |
| Full workflows | 1 per Deal; 2 per Account |
| Heavy Workers on baseline VPS | 2 |
| Light Workers on baseline VPS | 8 |

Provider connect/read/retry budgets must fit inside these totals and are set only from contract probes and baseline load tests. An adapter cannot extend a Product Entitlement, grant, Upload Session, Job Scope, Recipient Session, or operation deadline because a provider is slow.

### 12.4 First-party rate and concurrency policy

The initial `rate-policy-v1.0.0` uses token buckets with the listed sustained window and burst. Every applicable scope must have capacity; limits are not pooled across Accounts. Successful idempotent replay of the same command still counts as a request but cannot duplicate its effect.

| Surface / operation class | Exact initial quota | Scope |
|---|---:|---|
| Anonymous/public API reads and proof state | 120 requests/minute; burst 30 | source IP |
| Authenticated ordinary reads/queries | 600 requests/minute; burst 100 | Actor and Account independently |
| Authenticated non-Job mutations | 120 requests/minute; burst 20 | Actor and Account independently |
| Sensitive Action Grant issuance | 10 per 10 minutes; burst 2 | Actor and Account independently |
| Expensive Job creation, including AI/OCR/artifact/full-workflow commands | 12/minute per Account and 6/minute per Actor; burst 2 | both scopes, plus entitlement and scheduler concurrency |
| Checkout, Portal, cancellation, guarantee/refund, and billing-control session creation | 20/hour; burst 3 | Account; anonymous pre-Account abuse also scoped by IP |
| Upload Session create/finalize | 30/hour; burst 5 | Account |
| Active TUS transfers | 1 writer per exact upload URL/file; 4 concurrent | exact file and Account |
| SSE connections | 6 concurrent per Actor; 10 per Account | Actor and Account |
| Banker protected-object streams | 4 concurrent per bound session; 8 per Account | session and Account |
| Recipient protected-object streams | 2 concurrent per Recipient Session and Recipient Access | both scopes |
| Recipient challenge issuance | 3 per 15 minutes per Access/email hash; 10 per 15 minutes per IP | all scopes; no Account-existence signal |
| Recipient code attempts | 5 total per issued challenge | challenge; no counter detail exposed |
| Product measurement client candidates | 120/minute; burst 30 | anonymous session or Actor plus IP abuse scope |
| Invalid/unsigned Webhook requests | 60/minute; burst 20 | source IP and route |
| Valid signed Webhooks | no customer request quota; 32 concurrent per provider endpoint | verified provider/event identity; durable backpressure returns `503` |

Ordinary limited requests return `429` and `Retry-After`; Recipient/authentication paths remain non-enumerating. A signed provider event that passes body and concurrency limits is not dropped because a customer-facing bucket is full. Exact provider quotas and internal scheduler/provider concurrency remain separate from these ingress limits.

The policy may change only as a versioned deployment configuration after minimum-VPS load, abuse, accessibility, and critical-flow tests. A change cannot exceed Product Entitlement, Job concurrency, provider capability, or the fixed Recipient attempt limits without updating the owning contract.

### 12.5 Circuit breaking

Each outbound network provider has an adapter-local circuit keyed by environment, provider, endpoint/profile, and operation class. The circuit:

- opens only from privacy-safe failure counts;
- never causes cross-provider fallback;
- leaves already-committed state intact;
- permits bounded synthetic or safe health probes;
- reports an explicit capability/degradation state; and
- closes only after the configured recovery evidence succeeds.

Thresholds are deployment configuration verified under baseline load, not invented in this document.

### 12.6 Deployment Operator recovery

A Deployment Operator may trigger mechanical replay or reconciliation only for an existing immutable Inbox Event, Outbox row, or Job identity through a purpose-built recovery command/procedure. Recovery Replay is available only when that identity's closed replay posture and exact persisted input permit it; otherwise the procedure may perform only a supported current-provider-object reconciliation or report `not_recoverable`.

The procedure requires authenticated operator identity, exact target identity, current release identity, replay posture, reason code, and dry-run visibility. It cannot:

- create or edit a provider event, Outbox payload, Job input, domain object, or provider response;
- select or modify a business result;
- bypass current authorization, entitlement, classification, Rights Posture, Job Scope, version, or idempotency checks;
- enter a Banker or Recipient session;
- decrypt or inspect Deal content; or
- create a Human Decision, External-Use Event, Product Entitlement, Recipient Access, deletion authority, or another business posture.

Every attempt and outcome creates a privacy-minimized Audit Event. Exact replay re-runs the persisted versioned input contract; current-object reconciliation uses the adapter's separately authenticated lookup and is recorded as a different recovery mode. Both re-run the product-owned transaction against current authority. There is no direct queue-dashboard or SQL update path for business recovery.

The required operator identity/session mechanism is intentionally deferred in Section 18. Therefore this interactive procedure is a disabled contract, not an enabled fallback, until an approved mechanism supplies the authenticated identity, command-bound session and immutable Audit evidence required above. Automated replay by a purpose-specific Runtime Principal remains separately constrained and cannot be triggered through a shared human credential.

## 13. Security and privacy controls

### 13.1 Network and egress

- Caddy is the only public application ingress.
- Component networks and host firewall rules deny outbound traffic by default.
- Fixed-provider runtimes may reach only configured provider hosts plus necessary DNS/certificate infrastructure.
- Gateway may reach Supabase PostgreSQL/Storage and KMS; Supabase Session validation is networkless and the Gateway holds no Auth administration credential.
- Sandboxes have either no network or the separate public-fetch HTTPS profile. No sandbox joins an application network.
- Provider redirects are rejected unless the exact adapter contract permits and revalidates them.
- DNS rebinding, private/reserved IPs, link-local, metadata services, non-HTTPS schemes, unexpected ports, and credential-bearing URLs are denied on public fetch.

### 13.2 Data minimization

Adapters construct explicit allowlisted payloads. They do not serialize domain objects wholesale. Provider metadata, idempotency keys, logs, traces, error reports, notification fields, and queue messages use opaque safe identities and reason codes.

Source text, names, filenames, values, formulas, Bids, Human Decision text, artifact excerpts, recipient lists, raw prompts/responses, credentials, Cookies, Authorization headers, Query Strings, and form values are prohibited from Operational Telemetry and ordinary integration diagnostics.

### 13.3 Provider outputs are untrusted

Every provider response, document parse, AI result, Web page, email event, object metadata record, and sandbox output is untrusted until product validation succeeds. A provider-controlled filename, object ID, locator, redirect, status, MIME type, formula, URL, or identifier cannot replace a product-issued identity or typed relationship.

### 13.4 Deletion and provider state

Every integration declares whether it creates provider-held persistent state. The Retention Ledger records the purpose, provider locator, active deadline, backup/provider deadline, deletion operation, and verification method. A provider with no verified deletion or compatible retention posture cannot receive the affected Confidential or Restricted data class.

## 14. Observability and audit

### 14.1 Operational signals

Allowlisted metrics include:

- calls, latency, timeout, error class, throttle, and circuit state by adapter/version;
- Webhook receipt, signature failure, duplicate, age, processing lag, and reconciliation outcome;
- Outbox age, publish attempts, queue age, claim denial, lease expiry, retry, and dead-letter posture;
- provider capability disabled/suspended state;
- safe token/page/request/cost totals by pseudonymous scope;
- KMS operation latency and purpose, without key material;
- sandbox profile, resource exhaustion, policy denial, and cleanup;
- notification delivery/bounce/complaint class;
- deletion/provider task backlog; and
- backup/restore evidence.

Cardinality is bounded. Raw provider object IDs are stored in protected product records where needed, not used as unbounded metrics labels.

### 14.2 Audit events

Audit covers:

- provider credential/profile enablement, rotation, suspension, and recovery;
- material outbound provider eligibility decisions;
- verified provider event reconciliation into commercial/security state;
- entitlement, Billing Recovery, Payment Dispute, and refund transitions;
- operator replay/reconciliation attempts and outcomes;
- protected-object streams and KMS/signing control points;
- retention/deletion provider work; and
- Capability Manifest approval or withdrawal.

Audit stores authority and outcome, not provider or Deal content. Operational Telemetry and Product Measurement Events cannot substitute for Audit Events.

## 15. Test and verification strategy

### 15.1 Test layers

| Layer | Required coverage |
|---|---|
| Schema/contract | JSON Schema/OpenAPI/TypeScript/Python parity; unknown/missing/oversized fields |
| Adapter unit | exact payload allowlist, error mapping, idempotency, version mapping, content canaries |
| Webhook | valid/invalid/stale signature, duplicate, reordering, unsupported event, persistence failure, replay |
| Database integration | Inbox + Outbox transaction, unique effects, RLS, Job claim, lease, result commit, deletion task |
| Provider double | deterministic success, throttle, timeout, partial/malformed result, ambiguous mutation, outage |
| Bounded live probe | test credentials, exact endpoint/version/profile, no customer data, recorded evidence |
| Sandbox | fixed profile, arbitrary command/path denial, egress denial, resource limits, cleanup |
| Cross-tenant adversarial | ID swapping at API, queue, Job Scope, Storage, Gateway, provider metadata, logs |
| Recovery | lease expiry, Outbox replay, Inbox replay, operator denial, provider reconciliation, restore |
| Privacy | seeded prohibited-content canaries across provider request, logs, Sentry, email, measurement, alerts |
| Performance | provider latency/failure, webhook burst, queue load, minimum-VPS concurrency/deadline evidence |

### 15.2 Test environments

- Local and CI use deterministic provider doubles and synthetic Project Northstar/Reference Deal fixtures.
- Exact test-provider credentials may run bounded probes from CI or a disposable synthetic runner.
- Production Project Northstar uses a dedicated synthetic Account and deterministic adapters; it cannot invoke production Deal providers or access real objects.
- There is no long-lived Staging environment.
- Live provider probes never use Confidential customer material as test data.

### 15.3 Mandatory invariant cases

- Duplicate command, queue message, Webhook, callback, provider retry, and operator replay produce one material effect and one allowance/entitlement mutation.
- Out-of-order Stripe events never move Product Entitlement backward or create capacity without reconciled evidence.
- A browser redirect, provider callback, object URL, queue message, Worker output, or operator command never grants human/business authority.
- Every provider and Worker is denied another Account, Deal, Job Scope, object, key purpose, and runtime credential.
- A disabled Capability Manifest entry prevents the call before data egress.
- Integration logs, Sentry, email, and Product Measurement Events contain no seeded prohibited field.
- Provider outage preserves correct durable state and exposes a precise recovery posture.
- Deletion remains incomplete until exact provider and recovery-copy obligations are verified.

## 16. Provisioning and release gates

### 16.1 Per-provider readiness record

Every enabled production integration has a versioned readiness record containing:

- business purpose and owner;
- environment, account/project/region, endpoint, API/SDK version, and credential version;
- data classes, material classifications, purpose, retention, training, provider access, and deletion posture;
- exact allowlisted operations/events and payload schema versions;
- timeout, retry, circuit, quota, cost, and concurrency evidence;
- test, contract probe, privacy canary, failure, recovery, and rotation evidence;
- applicable Data Processing and subprocessor evidence;
- Capability Manifest and release identities; and
- approval, suspension, review, and expiry times.

### 16.2 Launch gates

Before the first Confidential production pilot:

1. Rotate the HelloX credential exposed during design and prove separate test/production credentials.
2. Provision United States-region Supabase Pro, private schemas/roles, Storage buckets, PGMQ, RLS, PITR, logical backup, object recovery copies, and restore evidence.
3. Verify the complete Supabase Auth contract in Section 9.1, including experimental Passkey gates, Magic Link through Resend Custom SMTP, SSR/JWT/JWKS, Session limits, recovery, administration isolation, deletion-status identity, and direct TUS/RLS configuration.
4. Verify Stripe catalog, Tax, invoice, Portal, refund, renewal, Billing Recovery, duplicate/reordered Webhook, Payment Dispute, and entitlement reconciliation behavior.
5. Approve HelloX and Google Document AI provider capability/data-processing records for every enabled material classification.
6. Pin and verify Aspose, fonts, ClamAV engine/definitions, rootless Podman profiles, and minimum-VPS limits.
7. Provision and exercise separate KMS data, Artifact signing, Audit signing, and recovery identities/keys, including rotation.
8. Verify Resend domain/authentication, template allowlist, tracking-off posture, Webhooks, and content canaries.
9. Verify Sentry US, sampling, release identity, and application-side telemetry allowlist.
10. Complete public-fetch SSRF/adversarial coverage and Microsoft 365 Reference Deal compatibility evidence.
11. Complete provider deletion, backup/restore, operator-replay denial, and credential-rotation drills.
12. Resolve every item in Section 18 that is marked launch-blocking for an enabled flow.

## 17. Change control

An integration change requires an Impact Assessment over:

- data egress, confidentiality, retention, training, support access, and deletion;
- authentication, permission, Runtime Principal, Job Scope, and credential partitions;
- provider/API/SDK/event/model/processor/engine/key version;
- schema, error, retry, idempotency, ordering, timeout, and cost behavior;
- AI Task, Evidence, Output Ceiling, artifact, compatibility, readiness, and claims;
- migrations, replay, historical interpretation, backup, and rollback; and
- affected Reference Deals and Capability Manifest entries.

A new provider, live connector, cross-provider fallback, provider-held persistent Deal workspace, external mutation adapter, or provider-based business authority reopens the applicable hard decision and ordinarily requires an ADR. A patch-level SDK update that preserves the verified contract does not require an ADR but still requires automated and bounded live probes.

## 18. Explicit deferred decisions

The following questions were intentionally deferred by the Product Founder on 2026-08-04. They are not defaults, implementation freedom, or implied approvals.

| ID | Deferred decision | What is already fixed | Consequence until resolved |
|---|---|---|---|
| INT-DEF-001 | Product Measurement Event retention, anonymous attribution window, identity-link lifecycle, and Account-deletion behavior | first-party append-only PostgreSQL ledger; no third-party analytics SaaS; privacy-safe contract; no Deal content; replayable metrics | affected anonymous or identity-linked production event classes remain disabled or synthetic-only; no implementation may invent a retention/linking policy |
| INT-DEF-003 | Whether verified raw Webhook bytes are retained, for how long, and which replay path may depend on them | bounded raw bytes are used for signature verification; every processable event persists complete versioned canonical provider evidence before acknowledgment; raw protected payload reference remains optional; business effects are idempotent | no nonzero raw-byte retention or raw-byte-dependent recovery promise may be configured for production until the retention/deletion contract is approved |
| INT-DEF-004 | Concrete Deployment Operator human identity, interactive session, command-binding, and audit mechanism | content-blind immutable replay only; no product session, impersonation, direct Deal/database/content path, shared application credential, or domain mutation | interactive operator-triggered production recovery commands remain disabled; automated/purpose-specific Runtime Principal paths continue only under their existing contracts |

These items do not weaken the confirmed Inbox durability, signature validation, Product Entitlement authority, content-minimization, or operator-authority boundaries.

## 19. Normative and provider references

Implementation uses current primary documentation and records the exact observed provider version in the readiness record:

- [Stripe Webhooks](https://docs.stripe.com/webhooks)
- [Stripe subscription Webhooks](https://docs.stripe.com/billing/subscriptions/webhooks)
- [Supabase Passkey authentication](https://supabase.com/docs/guides/auth/passkeys)
- [Supabase passwordless email logins](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Supabase server-side Auth](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase Auth sessions](https://supabase.com/docs/guides/auth/sessions)
- [Supabase Auth JWT claims](https://supabase.com/docs/guides/auth/jwt-fields)
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase Queues](https://supabase.com/docs/guides/queues)
- [Supabase resumable TUS uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)
- [Google Document AI processors](https://docs.cloud.google.com/document-ai/docs/processors-list)
- [Google Document AI IAM](https://docs.cloud.google.com/document-ai/docs/access-control/iam-permissions)
- [Google Cloud KMS envelope encryption](https://cloud.google.com/kms/docs/envelope-encryption)
- [Google Cloud KMS signatures](https://docs.cloud.google.com/kms/docs/create-validate-signatures)
- [Resend Webhook verification](https://resend.com/docs/webhooks/verify-webhooks-requests)
- [Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [ClamAV scanning](https://docs.clamav.net/manual/Usage/Scanning.html)
- [Sentry data scrubbing](https://docs.sentry.io/security-legal-pii/scrubbing/)
- [OpenTelemetry specification](https://opentelemetry.io/docs/specs/otel/overview/)
- [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12)

Provider documentation is evidence about provider behavior, not permission to enable a capability.

## 20. Completion criteria

This Integration Spec is implementation-complete only when:

- every enabled integration has one adapter owner, exact protocol/schema/version, credential, egress, data, retention, deletion, error, retry, and recovery contract;
- generated schemas and TypeScript/Python models have no drift;
- Inbox, Outbox, queue, Worker, Supervisor, Gateway, Signer, Retention, Backup, and Product Measurement contracts pass their integration suites;
- duplicate, reordered, ambiguous, timeout, outage, cancellation, lease-loss, persistence-failure, and operator-replay cases preserve exactly-once material effects;
- cross-tenant and cross-purpose adversarial tests deny every invalid provider, runtime, object, and key path;
- privacy canaries prove no prohibited content in telemetry, email, measurement, queue, Webhook diagnostics, or alerts;
- every Confidential/Restricted provider path has current capability and processing evidence;
- the exact minimum-VPS deadlines and concurrency pass with provider degradation;
- provider-held state participates in deletion and verified restore behavior;
- all enabled-flow launch blockers, including applicable deferred decisions, are resolved; and
- the complete Reference Deal and first-sellable-release acceptance seam pass without a hidden connector, fallback, operator authority, or provider-as-authority shortcut.
