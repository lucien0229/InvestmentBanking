# API Spec

**Product:** Controlled Sell-Side Auction Execution Workspace V1  
**Status:** Approved design contract  
**Confirmed:** 2026-08-08\
**Protocol:** First-party JSON HTTP API, SSE, TUS coordination, protected-object streaming, and provider Webhooks

## 1. Purpose

This document is the normative design-time contract for the V1 Product API. It converts the approved product, domain, UX, architecture, data, AI, and security decisions into an implementation-ready HTTP surface with exact path families, methods, authentication modes, request and response contracts, error semantics, concurrency, idempotency, asynchronous work, upload, streaming, Webhook, and evolution rules.

The API is complete for the first-party V1 Web product. It is not a public developer platform and does not create customer API keys, OAuth clients, partner SDK commitments, generic integrations, or a second source of business authority.

Implementation will define canonical TypeScript contracts and generate OpenAPI 3.1, JSON Schema Draft 2020-12, and first-party clients from them. Until that code exists, this document is the approved API design contract. Generated contracts must conform to this document and cannot silently override an approved product decision, domain term, or ADR.

## 2. Authority and document relationship

Authority is concern-specific rather than one misleading global list:

1. the approved [Product Specification](../../.scratch/controlled-sell-side-auction-execution-workspace-v1/spec.md) and resolved product issues own product scope and behavior;
2. [CONTEXT.md](../../CONTEXT.md) owns canonical domain language and distinctions;
3. accepted [ADRs](../adr) own hard architecture decisions within their stated concern;
4. approved [User Flow](../ux/user-flow.md), [Information Architecture](../ux/information-architecture.md), [UX Spec](../ux/ux-spec.md), and [Wireframes](../ux/wireframes.md) own user-visible task behavior;
5. [Technical Design](technical-design.md) and [System Architecture](system-architecture.md) own the shared implementation and runtime boundaries;
6. [Data Model / ERD](data-model-erd.md) owns relational identity, lifecycle, tenancy, and transaction invariants;
7. [AI Prompt & Contract Spec](ai-prompt-contract-spec.md) owns AI input, output, evaluation, and enablement contracts;
8. this API Spec owns the first-party and ingress HTTP wire contract;
9. the [Integration Spec](integration-spec.md) owns provider-native, queue, Worker, database-procedure, and sandbox protocols;
10. the [Permission Model](permission-model.md) owns the complete principal-to-action/resource/posture matrix and enforcement proof.

When two documents appear to conflict, each governs its concern and the conflict must be resolved explicitly. Code, generated contracts, tests, and runtime evidence verify the design and may reveal a defect; they do not silently redefine the approved product or domain model.

## 3. Scope

### 3.1 Included

- first-party Banker `/api/v1` commands and queries;
- isolated Recipient verification, session, and exact-Revision viewing;
- Sensitive Action Grant issuance and consumption;
- Checkout, billing projection, entitlement, usage, cancellation, and receipt access;
- Deal Setup, Paid Preflight, First Deal Guide, Deal lifecycle, and Deal Execution Desk resources;
- Source Material, immutable Source Records, Source Packets, rights, classification, reliance, and compatibility;
- Evidence, Claims, Facts, Assumptions, Human Decisions, Analysis, and Impact Assessments;
- Sell-Side Auction process objects and immutable Process Events;
- Deliverables, Revisions, artifacts, Reviews, QC, readiness, reimport, and round trip;
- Internal Controlled Export, External-Use Decision, Externally Authorized Delivery, Recipient Access, and External-Use Event;
- durable Job query, SSE, cancellation, retry, and rerun linkage;
- Upload Session creation, direct TUS coordination, incremental finalization, and cancellation;
- Protected Object Stream Grant and browser-facing Protected Object Gateway contract;
- Stripe and Resend Webhook ingress;
- retention, deletion, History, Audit, and public integrity-key discovery;
- common schemas, errors, pagination, consistency, idempotency, concurrency, caching, tracing, rate limiting, and evolution.

### 3.2 Excluded

- a public customer or partner API;
- API keys, personal access tokens, OAuth client registration, or delegated Team access;
- GraphQL, general WebSocket, generic command endpoints, or arbitrary resource mutation;
- browser-direct database, AI, payment, email, KMS, OCR, or Office-engine calls;
- internal PGMQ messages, Worker Job Scope procedures, Outbox payloads, sandbox socket contracts, provider-native payloads, or database migration SQL;
- Deployment Operator content access, support impersonation, content break-glass, or operator domain mutation;
- live CRM, email, data-room, drive, market-data, or document-repository connectors;
- static Public Site HTML and copy that Next.js can serve without an authoritative API transaction;
- a production Swagger UI or anonymous OpenAPI endpoint.

## 4. Normative language and representation conventions

`MUST`, `MUST NOT`, `SHOULD`, and `MAY` describe normative implementation requirements.

### 4.1 Names and identifiers

- JSON fields, query parameters, error codes, recovery actions, event names, and machine enums use `snake_case`.
- URL collection segments use lowercase kebab-case nouns.
- Application-generated IDs are canonical lowercase UUIDv7 strings.
- IDs are opaque to clients and never establish permission.
- Account IDs are derived from the authenticated Banker session and are not accepted as normal Banker path or body authority.
- Deal-scoped business routes contain `{deal_id}` even when another child ID is globally unique.
- After a nested command creates a Job or Upload Session, the top-level `/api/v1/jobs/{job_id}` and `/api/v1/upload-sessions/{upload_session_id}` handle routes are the only Deal-path exceptions. Their opaque IDs are reauthorized against stored Account and, when present, Deal scope on every request and provide no collection or discovery route.
- Commands accept endpoint-specific typed identifiers. A generic authoritative `{type, id}` target is prohibited.
- Read-only projections MAY use a server-generated `ResourceLink`.

### 4.2 Time and quantitative values

- timestamps are RFC 3339 UTC with `Z`;
- business dates are ISO `YYYY-MM-DD`;
- a recorded timestamp is not silently reused as business-effective time;
- exact decimal and monetary values are JSON strings, never binary floating point;
- material quantitative values carry the applicable status, unit, scale, precision, currency, period or as-of date, sign convention, and rounding identity;
- `known`, `unknown`, `not_applicable`, `withheld`, and `not_provided` remain distinct;
- JSON `null` is permitted only where the schema explicitly declares it.

### 4.3 Request strictness and response evolution

- request JSON uses UTF-8 and closed schemas with `additionalProperties: false`;
- unknown request fields return `400 unknown_request_field`;
- optional request fields are omitted when absent; an empty string or `null` does not silently clear a value;
- clients MUST ignore unknown optional response fields;
- closed security and domain enums cannot gain a new value within `/api/v1` without a breaking-contract review;
- schema-governed payloads return their contract version and digest;
- server-owned Actor, Account, Origin, lifecycle, permission, audit, and authority fields are never accepted from client input.

## 5. Ingress and base paths

| Surface | Base path | Consumer | Authentication |
|---|---|---|---|
| Banker Product API | `/api/v1` | first-party Web and Next.js | Supabase Session |
| Security Recovery API | `/api/v1/security-recovery-sessions` and exact restriction routes | first-party recovery surface | Supabase Magic Link identity plus Security Recovery Session where issued |
| Deletion Status API | `/api/v1/deletion-status-grants` and exact Deletion Request status route | former Account/Deal owner | same Supabase issuer/subject plus Deletion Status Grant |
| Recipient API | `/api/v1/recipient` | isolated Recipient Web surface | Recipient challenge or Recipient Session |
| Job SSE | `/api/v1/jobs/{job_id}/events` | Banker EventSource | Supabase Session |
| Protected Object Gateway | `/objects/{protected_object_id}` | controlled first-party viewer/download client | Object Grant plus bound human session |
| Provider Webhooks | `/webhooks/{provider}` | Stripe, Resend | provider signature |
| Public integrity registry | `/.well-known/integrity-keys.json` | offline verifiers and product clients | public |
| Direct quarantine upload | provider TUS endpoint returned by Upload Session | first-party browser | fresh Supabase Bearer token plus Storage RLS |

Caddy is the only persistent application ingress. Web and `/api/v1` share the same public scheme, host, and port. Production `/api/v1` emits no CORS permission. The exact Upload-Session-bound Supabase TUS hostname is the only intentional browser cross-origin object-store path and is governed by [ADR 0033](../adr/0033-allow-purpose-scoped-account-template-quarantine-uploads.md).

## 6. Authentication contract

### 6.1 Banker Session

Next.js stores and refreshes the Supabase Session through the Supabase SSR Cookie contract. The API validates:

- token type, pinned signature algorithm/key, issuer, authenticated audience/role, expiry, issued-at, optional not-before, subject, session ID, non-anonymous posture, and required authentication-method entry where fresh Passkey evidence is required;
- current session posture, session ID and fresh-Passkey age where required;
- Supabase issuer-and-subject-to-product Actor mapping;
- active Account relationship and applicable Product Entitlement;
- Deal, object, version, and command authority.

Supabase subject, session, email, `user_metadata`, `app_metadata`, or project identifiers are not Actor, Account, Deal, role, or permission IDs. The Product API alone idempotently creates or links `external_identity → Actor → Account` after verified authentication and required Passkey registration; no Auth Hook, Database Webhook, or `auth.users` Trigger creates product authority.

Next.js server-to-API calls use the current Supabase Access Token in `Authorization: Bearer`; the Web process does not forward the browser's entire Cookie header. Fastify verifies the JWT against pinned algorithm, issuer, audience, expiry and JWKS expectations and trusts forwarded host/scheme metadata only from the exact Caddy proxy hop. JWT lifetime is one hour; inactivity timeout is 12 hours, absolute Session lifetime seven days, and only one Session may be active per user.

First access uses Supabase's default Magic Link delivered through Resend Custom SMTP. A confirmed user MUST register at least one Passkey before an ordinary Banker Session or Account/Deal route is allowed. V1 enables no password, numeric Email OTP customization, TOTP, MFA enrollment, Send Email Auth Hook, or second ordinary product Session.

### 6.1.1 Security Recovery Session

When an Account Security Restriction is open, the API rejects the ordinary Banker authorization sequence even if the Supabase JWT remains cryptographically valid. An existing user's Magic Link authenticates only recovery; after verified mailbox control and product-owned Actor/ownership-continuity verification, `POST /api/v1/security-recovery-sessions` may create a separate opaque `__Host-security_recovery_session` Cookie with `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/v1`, and no `Domain`. Its absolute lifetime is no more than 15 minutes. The database stores only the session hash and binds the exact restriction, Actor, Account security epoch, purpose, issue/expiry, and revocation posture. Although the Cookie accompanies other `/api/v1` requests, the session-mode allowlist rejects every route except the named recovery operations and recovery-scoped Sensitive Action Grant issuance.

The Recovery Session may call only the operations declared in Section 22.2 and the [Permission Model](permission-model.md). Clearing the restriction invalidates it. It never becomes a Banker Session, and no ordinary Session, Grant, Job Scope, or Recipient Access is restored by clearance.

### 6.1.2 Deletion Status Grant

Deletion acceptance returns an initial short-lived Deletion Status Grant. Later `POST /api/v1/deletion-status-grants` authenticates the same Supabase issuer/subject against the minimal surviving claimant and issues another Grant without restoring Account/Deal authority. Exact status reads present `Deletion-Status-Grant: {opaque-token}`. The token is hash-stored, read-only, exact-request-bound, expires no later than 15 minutes, and is never placed in a URL, Cookie, referrer, log, or durable browser application state.

### 6.2 CSRF and origin policy

- `GET` and `HEAD` never mutate state.
- Every unsafe first-party browser request MUST carry an exact allowed `Origin`.
- JSON commands MUST use an allowed JSON media type.
- Production does not permit cross-origin Cookie-authenticated `/api/v1` calls.
- A separate anti-CSRF token is not required for this same-origin V1 topology.
- Adding cross-origin Cookie authentication or HTML form mutation is a security-design change and requires a new CSRF decision.

### 6.3 Recipient Session

Recipient identity is product-managed and separate from Supabase Auth. Recipient routes accept only the exact challenge context or Recipient Session defined in Section 16. A Supabase Session cannot become Recipient authority, and a Recipient Session cannot become Account authority.

### 6.4 Runtime and provider identities

Runtime Principals, Job Scopes, provider credentials, Webhook signatures, and Object Grants never become human sessions. They prove only their exact component or event purpose.

## 7. Authorization contract

Every protected request reauthorizes the complete scope. No route trusts the UI entry point, query parameters, signed URL, queue payload, provider callback, or object ID by itself.

### 7.1 Banker authorization sequence

1. authenticate Supabase Session;
2. resolve durable Actor;
3. resolve the Actor's active Account relationship;
4. verify session mode, Account security epoch, Product Entitlement, commercial/security/deletion posture and the exact permission allowlist;
5. verify exact Deal ownership and Deal activity/record/processing posture version;
6. verify exact object and version belongs to the same Account and Deal;
7. verify action-specific rights, confidentiality, Paid Preflight, current state, and Output Ceiling;
8. verify `If-Match`, idempotency, and Sensitive Action, Deletion Status, Object, or Job Grant where applicable;
9. apply domain invariant, typed procedure and forced-RLS transaction;
10. record applicable Audit Event and Outbox result.

Cross-Account, cross-Deal, absent, deleted, and non-visible object access returns the same non-enumerating `404 resource_not_found` unless an authenticated owner is following an explicit deletion-status route that is designed to remain visible.

### 7.2 Device posture

Viewport and User-Agent are not permission inputs. Small-screen restrictions are first-party UX support rules. The API continues to require exact action, resource, version, session, Grant, and domain authority regardless of device claims.

### 7.3 Read-only Resource Links

Read projections MAY return:

~~~json
{
  "kind": "deliverable_revision",
  "id": "019...",
  "version_id": "019...",
  "href": "/api/v1/deals/019.../deliverables/019.../revisions/019..."
}
~~~

A Resource Link supports navigation only. Commands use endpoint-specific typed IDs and reauthorize the target independently.

## 8. Content types, envelopes, and status codes

### 8.1 Media types

| Contract | Media type |
|---|---|
| JSON request/success | `application/json` |
| API error | `application/problem+json` |
| Job events | `text/event-stream` |
| TUS | provider-supported TUS media and headers |
| protected bytes | exact artifact media type |
| integrity registry | `application/json` |

### 8.2 Single-resource success

~~~json
{
  "data": {},
  "meta": {
    "outcome": "accepted",
    "idempotent_replayed": false,
    "consistency_cursor": "opaque"
  },
  "links": {
    "self": "/api/v1/..."
  }
}
~~~

### 8.3 Collection success

~~~json
{
  "data": [],
  "meta": {
    "page": {
      "returned_count": 50,
      "has_more": true,
      "next_cursor": "opaque",
      "total_count": null
    },
    "projection": {
      "status": "current",
      "updated_at": "2026-08-04T00:00:00Z",
      "consistency_cursor": "opaque",
      "satisfies_requested_consistency": true
    }
  },
  "links": {
    "self": "/api/v1/...",
    "next": "/api/v1/..."
  }
}
~~~

### 8.4 Success status mapping

| Status | Use |
|---:|---|
| `200` | query, synchronous command result, replayed prior result, or item-outcome batch |
| `201` | a durable resource, immutable record, Grant, Session, or request was created and is immediately addressable |
| `202` | a command was durably accepted and exposes a Job or pending durable process |
| `206` | an authorized Protected Object byte range |

Domain commands do not return `204`; the user must receive the durable resource, transition, Decision, request, or Job that represents the accepted result. Creation responses include `Location` for the created resource or Job.

## 9. Mutation model

V1 mutations use `POST` to create a business resource, immutable version or record, lifecycle transition, request, or explicit command-result resource.

Examples:

~~~text
POST /api/v1/deals
POST /api/v1/deals/{deal_id}/source-packets/{source_packet_id}/versions
POST /api/v1/deals/{deal_id}/human-decisions
POST /api/v1/deals/{deal_id}/lifecycle-transitions
POST /api/v1/jobs/{job_id}/cancellations
POST /api/v1/account/deletion-requests
~~~

The API does not expose a generic PATCH, PUT, DELETE, `/commands/{verb}`, `:action`, arbitrary status assignment, or authoritative generic `{type, id}` command. Deletion is an asynchronous Deletion Request. Draft autosave uses endpoint-specific `draft-saves` and remains non-authoritative.

## 10. Idempotency

Every externally retryable side-effecting first-party Banker POST command requires:

~~~http
Idempotency-Key: {16-128 character client-generated key}
~~~

The key uses the visible ASCII set permitted by the generated schema and MUST contain at least 128 bits of client-generated entropy. It is scoped to Account, Actor, command type, and route.

Public proof and qualification POSTs do not use this Account-and-Actor idempotency contract: they are non-chargeable, rate-limited, synthetic commands, and a repeated creation request may create a distinct bounded synthetic resource. Recipient POSTs use their exact one-time link/challenge continuation token, Recipient Session, current ETag where declared, and first-byte receipt identity; they do not accept `Idempotency-Key`. Provider Webhooks use provider event identity. These exceptions cannot be used from a Banker route to bypass the 30-day replay contract.

### 10.1 Canonical request identity

The stored digest binds:

- HTTP method and route template;
- API major version and command code;
- exact Actor, Account, Deal, and primary resource scope;
- RFC 8785 canonical request JSON digest;
- `If-Match`;
- Sensitive Action Grant command identity where applicable;
- semantic headers declared by the operation.

### 10.2 Behavior

| Condition | Result |
|---|---|
| same key, same digest, current authorization valid | prior status/body, `Idempotent-Replayed: true` |
| same key, different digest | `409 idempotency_key_reused` |
| same key, original request in progress | `409 idempotency_request_in_progress` plus `Retry-After` |
| current authentication/authorization no longer valid | current auth error; prior body is not disclosed |
| request failed before command transaction | key not reserved |
| accepted or stable domain result after transaction began | status and result retained |

Job commands retain the record for at least 30 days after terminal Job state. Non-Job commands retain it for 30 days after the durable result. Provider Webhooks use provider event identity, and Recipient verification challenges use their own single-use nonce rather than `Idempotency-Key`.

For a Grant-issuance response that contains a one-time secret, the Idempotency Record retains an application-encrypted replay body for the ordinary idempotency-retention period, in addition to the Grant's normal token hash. The same key and digest therefore replay the exact response without storing the token in plaintext. Replaying after Grant expiry returns the same expired response, not a fresh capability; obtaining a usable Grant requires a new key and current authorization.

## 11. Optimistic concurrency and caching

Mutable aggregates and current pointers return an opaque strong `ETag`. Every command that changes that primary aggregate requires `If-Match`.

| Condition | Result |
|---|---|
| required `If-Match` absent | `428 precondition_required` |
| ETag stale | `412 version_conflict` |
| ETag valid | transaction may proceed and increments row version |

A version-conflict Problem returns the current authorized ETag and a link to reload/compare; it never performs last-write-wins. Secondary dependencies are referenced by exact immutable IDs and revalidated in the transaction. Append-only creation does not require `If-Match` unless it relies on a mutable current selection.

Each generated OpenAPI operation declares one concurrency profile: `none`, `if_match`, `immutable_dependencies`, or `if_match_and_immutable_dependencies`. An operation marked `If-Match <Resource>` in the catalog uses a required header parameter bound to that Resource's ETag; implementation may not infer or omit the header from a vague notion of mutability. Operations that create only a new immutable record use exact dependency IDs and the immutable-dependency profile instead.

Authenticated Deal JSON uses:

~~~http
Cache-Control: private, no-store
~~~

Collection/search projections do not use ETag. Protected byte identity uses the exact artifact digest and manifest rather than aggregate row version.

## 12. Query, pagination, and read consistency

### 12.1 Query parameters

Collection operations declare an endpoint-specific allowlist drawn from:

- `page_size` — default `50`, maximum `100`;
- `page_after` — opaque cursor;
- `sort` — allowlisted field, `-` prefix for descending;
- `q` — bounded search text where supported;
- `include_history` — default `false`;
- explicit independent-state, type, date, actor, or domain filters.

There is no generic query DSL, arbitrary sparse fieldset, relationship expansion, or cross-Deal search. Stable sorting adds an ID tie-breaker. A cursor binds the endpoint, Account/Deal scope, filters, search, sort, and position. A malformed or mismatched cursor returns `400 invalid_page_cursor`.

`total_count` is returned only when exact and cost-bounded; otherwise it is `null`.

### 12.2 Authoritative and projected reads

Exact object, version, Decision, transition, Job current state, entitlement, usage, and command-result reads use authoritative relations or current pointers. Collections, search, Action Center, Deal Book, dependency graph, notification index, and aggregate readiness MAY use rebuildable projections.

Every projected response declares `current`, `catching_up`, or `rebuilding`, its update time, an opaque consistency cursor, and whether it satisfies the requested consistency.

Commands return a consistency cursor. A client MAY request:

~~~http
Consistency-After: {opaque_cursor}
~~~

The API waits at most two seconds for the applicable projection. If it remains behind, the API returns the current authorized projection with `satisfies_requested_consistency: false` and `Retry-After`; it does not fabricate absence, completion, or readiness. The client retains the command's durable result until the projection catches up.

## 13. Drafts and bulk operations

### 13.1 Draft saves

A Draft is recoverable interface state, not a Fact, Decision, Process Event, authorization, or submitted command.

One active Draft is permitted per Actor, draft type, and exact target. Endpoint-specific `draft-saves` bind the base resource ETag and prior Draft ETag. Multiple tabs cannot last-write-win. A changed base resource marks the Draft `stale` and requires compare/reconfirmation.

Drafts:

- create no Job, Usage Reservation, Decision, authorization, or business Event;
- never store passwords, payment credentials, MFA secrets, Recipient codes, or Grant tokens;
- expire 30 days after the last save;
- are removed with Deal or Account deletion;
- are excluded from Internal Controlled Export, Audit packages, and external delivery;
- become `submitted` only when linked to the accepted durable resource.

### 13.2 Bulk policy

| Class | Policy |
|---|---|
| Upload finalization, New Event viewed state, read-only inspection selection | item outcomes in `200`; partial results permitted |
| Internal Controlled Export, Account/Deal data export, material reimport acceptance | all-or-nothing exact scope; blocker returns `422` |
| Human Decision, External-Use Decision, stage/lifecycle change, deletion, Recipient Access mutation, material QC disposition, Bid selection | bulk prohibited |

Bulk requests contain at most 100 exact IDs and versions. A dynamic selection such as “all current filter matches” is prohibited for mutation. The API does not use WebDAV `207 Multi-Status`.

## 14. Error and recovery contract

All API errors use RFC 9457 `application/problem+json`. Provider-facing Webhook acknowledgments are the only exception because providers consume minimal HTTP status rather than the Product Problem contract.

### 14.1 Problem shape

~~~json
{
  "type": "https://{public_origin}/problems/version-conflict",
  "title": "Resource version conflict",
  "status": 412,
  "code": "version_conflict",
  "detail": "The resource changed after it was loaded.",
  "instance": "/api/v1/deals/019...",
  "trace_id": "019...",
  "outcome": "conflict",
  "retryable": false,
  "recovery_action": "reload_and_compare",
  "errors": [
    {
      "code": "version_conflict",
      "pointer": "/revision_id",
      "detail": "The referenced Revision is no longer current."
    }
  ],
  "context": {
    "resource": null,
    "affected_scope": [],
    "safe_continuation": [],
    "return_to": null,
    "allowance_consequence": "none",
    "guarantee_consequence": "none"
  }
}
~~~

Rules:

- `type` is a stable product documentation URI derived from the configured public origin; it does not use the HelloX provider identity;
- `code`, `recovery_action`, and field-error codes are stable `snake_case` values;
- client logic uses codes, not localized `title` or `detail`;
- field locations use JSON Pointer;
- rejected Source content, filenames, secrets, SQL, paths, provider messages, and other-tenant existence are never echoed;
- `context` appears only when applicable and contains privacy-safe structured recovery data;
- `Retry-After` accompanies time-bounded retry guidance;
- common codes are fixed by this registry and principal operation families list their additional expected codes in Section 25.

### 14.2 HTTP status mapping

| Status | Contract |
|---:|---|
| `400` | malformed syntax, unknown field, invalid query/cursor, invalid provider Webhook |
| `401` | Banker or Recipient authentication missing, expired, or invalid |
| `403` | authenticated but prohibited, reauthentication/Grant required, origin rejected |
| `404` | absent or not visible in the current authorized scope |
| `409` | business-state, idempotency, Job-state, or immutable-identity conflict |
| `410` | authenticated owner follows an explicitly expired Upload Session or retired temporary challenge |
| `412` | optimistic-concurrency conflict |
| `413` | file, batch, packet, event, or request too large |
| `415` | unsupported media type |
| `416` | requested protected-object byte range cannot be satisfied |
| `422` | domain, rights, confidentiality, compatibility, deterministic, or semantic-contract failure |
| `428` | required concurrency precondition missing |
| `429` | edge rate or commercial-capacity limit |
| `503` | temporary dependency, projection, or capacity failure before durable acceptance |
| `504` | bounded synchronous operation timed out before durable acceptance |

Once a command is durably accepted, provider throttling, Worker failure, or long-running timeout is represented through Job state and Job Problems rather than replacing the accepted response with a provider HTTP error.

### 14.3 Stable error registry

#### Request and query

| Code | Status | Retryable | Recovery action |
|---|---:|---:|---|
| `invalid_json` | 400 | no | `correct_request` |
| `invalid_request` | 400 | no | `correct_request` |
| `unknown_request_field` | 400 | no | `remove_unknown_field` |
| `invalid_query_parameter` | 400 | no | `correct_query` |
| `invalid_page_cursor` | 400 | no | `restart_pagination` |
| `unsupported_media_type` | 415 | no | `use_supported_media_type` |
| `request_too_large` | 413 | no | `reduce_request_scope` |

#### Authentication and authorization

| Code | Status | Retryable | Recovery action |
|---|---:|---:|---|
| `authentication_required` | 401 | yes | `authenticate` |
| `session_expired` | 401 | yes | `reauthenticate` |
| `security_recovery_session_required` | 401 | yes | `continue_security_recovery` |
| `recipient_session_expired` | 401 | yes | `verify_recipient_again` |
| `origin_not_allowed` | 403 | no | `return_to_first_party_origin` |
| `forbidden` | 403 | no | `return_to_authorized_scope` |
| `resource_not_found` | 404 | no | `return_to_safe_parent` |
| `reauthentication_required` | 403 | yes | `complete_strong_reauthentication` |
| `sensitive_action_grant_required` | 403 | yes | `request_sensitive_action_grant` |
| `sensitive_action_grant_expired` | 403 | yes | `repeat_control_review` |
| `sensitive_action_grant_consumed` | 403 | no | `inspect_prior_result` |
| `sensitive_action_grant_scope_mismatch` | 403 | no | `repeat_control_review` |
| `sensitive_action_grant_command_mismatch` | 403 | no | `repeat_control_review` |
| `deletion_status_grant_required` | 403 | yes | `request_deletion_status_grant` |
| `deletion_status_grant_expired` | 403 | yes | `request_deletion_status_grant` |
| `deletion_status_grant_scope_mismatch` | 403 | no | `return_to_deletion_status_entry` |
| `account_security_restricted` | 403 | yes | `continue_security_recovery` |
| `object_grant_required` | 403 | yes | `request_object_grant` |
| `object_grant_expired` | 403 | yes | `request_object_grant` |
| `object_grant_scope_mismatch` | 403 | no | `return_to_authorized_object` |

#### Idempotency and concurrency

| Code | Status | Retryable | Recovery action |
|---|---:|---:|---|
| `idempotency_key_required` | 400 | no | `supply_idempotency_key` |
| `invalid_idempotency_key` | 400 | no | `replace_idempotency_key` |
| `idempotency_key_reused` | 409 | no | `use_new_idempotency_key` |
| `idempotency_request_in_progress` | 409 | yes | `retry_after_delay` |
| `precondition_required` | 428 | no | `reload_resource` |
| `version_conflict` | 412 | no | `reload_and_compare` |
| `draft_conflict` | 412 | no | `reload_draft_and_compare` |

#### Domain and control gates

| Code | Status | Retryable | Recovery action |
|---|---:|---:|---|
| `business_state_conflict` | 409 | no | `inspect_current_state` |
| `domain_validation_failed` | 422 | no | `correct_domain_input` |
| `entitlement_required` | 403 | no | `purchase_or_restore_entitlement` |
| `commercial_capacity_exhausted` | 429 | no | `release_wait_or_purchase_capacity` |
| `operation_preview_required` | 422 | no | `review_commercial_effect` |
| `operation_preview_changed` | 409 | no | `review_commercial_effect_again` |
| `paid_preflight_required` | 422 | no | `complete_paid_preflight` |
| `limited_proceed_acceptance_required` | 422 | no | `review_limited_scope` |
| `rights_blocked` | 422 | no | `resolve_rights_posture` |
| `confidentiality_blocked` | 422 | no | `use_compatible_processing_path` |
| `provider_profile_ineligible` | 422 | no | `use_permitted_non_ai_path` |
| `source_not_reliance_eligible` | 422 | no | `resolve_source_reliance` |
| `source_conflicted` | 422 | no | `resolve_source_conflict` |
| `source_missing` | 422 | no | `provide_exact_source` |
| `output_ceiling_exceeded` | 422 | no | `reduce_scope_or_raise_output_ceiling` |
| `human_decision_required` | 422 | no | `record_human_decision` |
| `deterministic_validation_failed` | 422 | no | `correct_inputs_or_method` |
| `compatibility_blocked` | 422 | no | `supply_compatible_input` |
| `revision_not_current` | 409 | no | `open_current_revision` |
| `external_use_not_authorized` | 422 | no | `create_matching_external_use_decision` |
| `external_use_scope_mismatch` | 422 | no | `repeat_external_use_review` |
| `recipient_access_invalid` | 404 | no | `request_new_access_from_sender` |
| `recipient_access_expired` | 404 | no | `request_new_access_from_sender` |
| `recipient_access_revoked` | 404 | no | `request_new_access_from_sender` |
| `recipient_access_suspended` | 404 | no | `request_access_review_from_sender` |
| `bulk_material_action_prohibited` | 422 | no | `review_each_item` |
| `bulk_scope_blocked` | 422 | no | `review_exact_scope` |
| `bulk_limit_exceeded` | 413 | no | `reduce_batch` |
| `atomic_operation_failed` | 422 | no | `review_item_problems` |
| `classification_required` | 422 | no | `classify_material` |
| `rights_not_permitted` | 422 | no | `resolve_rights_posture` |
| `source_condition_blocked` | 422 | no | `resolve_source_condition` |
| `source_reliance_blocked` | 422 | no | `resolve_source_reliance` |
| `dependency_blocked` | 422 | no | `resolve_dependency` |
| `dependency_changed` | 409 | no | `reload_dependency_scope` |
| `invalid_state_transition` | 409 | no | `inspect_permitted_transitions` |
| `deal_lifecycle_blocked` | 409 | no | `inspect_deal_lifecycle` |
| `workspace_posture_changed` | 409 | no | `inspect_workspace_posture` |
| `post_term_restricted` | 403 | no | `use_post_term_capability` |
| `ai_contract_failed` | 422 | no | `inspect_ai_recovery_action` |

#### Jobs and projections

| Code | Status | Retryable | Recovery action |
|---|---:|---:|---|
| `job_not_cancelable` | 409 | no | `inspect_job` |
| `job_not_retryable` | 409 | no | `inspect_recovery_action` |
| `job_waiting_for_source` | 409 | no | `provide_exact_source` |
| `job_waiting_for_user` | 409 | no | `record_required_input` |
| `event_cursor_expired` | 409 | yes | `reload_job_snapshot` |
| `dependency_temporarily_unavailable` | 503 | yes | `retry_after_delay` |
| `operation_timed_out` | 504 | yes | `retry_or_inspect_job` |

#### Upload and object streaming

| Code | Status | Retryable | Recovery action |
|---|---:|---:|---|
| `upload_session_expired` | 410 | no | `create_upload_session` |
| `upload_session_closed` | 409 | no | `inspect_upload_results` |
| `upload_incomplete` | 409 | yes | `resume_upload` |
| `upload_length_mismatch` | 422 | no | `restart_file_upload` |
| `upload_digest_mismatch` | 422 | no | `restart_file_upload` |
| `upload_path_mismatch` | 403 | no | `restart_upload_session` |
| `file_too_large` | 413 | no | `reduce_or_split_file` |
| `batch_too_large` | 413 | no | `reduce_batch` |
| `upload_limit_exceeded` | 413 | no | `reduce_batch` |
| `upload_offset_mismatch` | 409 | yes | `resume_from_server_offset` |
| `file_digest_mismatch` | 422 | no | `restart_file_upload` |
| `malware_detected` | 422 | no | `provide_safe_replacement` |
| `scan_incomplete` | 422 | no | `retry_safety_processing` |
| `unsafe_content_detected` | 422 | no | `provide_safe_replacement` |
| `encrypted_file_unsupported` | 422 | no | `provide_authorized_unlocked_copy` |
| `unsupported_active_content` | 422 | no | `provide_dependency_free_copy` |
| `range_not_satisfiable` | 416 | no | `reload_object_identity` |
| `stream_interrupted` | 503 | yes | `retry_authorized_range` |
| `object_grant_invalid` | 403 | no | `request_object_grant` |

#### Recipient verification

| Code | Status | Retryable | Recovery action |
|---|---:|---:|---|
| `recipient_link_invalid` | 404 | no | `request_new_access_from_sender` |
| `recipient_link_expired` | 404 | no | `request_new_access_from_sender` |
| `recipient_code_invalid` | 401 | yes | `retry_recipient_code` |
| `recipient_code_expired` | 401 | yes | `request_recipient_code` |
| `recipient_attempts_exhausted` | 429 | no | `request_new_access_from_sender` |
| `recipient_send_limit_exceeded` | 429 | yes | `retry_after_delay` |
| `recipient_resend_cooldown` | 429 | yes | `retry_after_delay` |

#### Rate, integration, and retention

| Code | Status | Retryable | Recovery action |
|---|---:|---:|---|
| `rate_limited` | 429 | yes | `retry_after_delay` |
| `provider_event_invalid` | 400 | no | `none` |
| `provider_event_persistence_failed` | 503 | yes | `provider_retry` |
| `checkout_state_ambiguous` | 409 | yes | `refresh_checkout_state` |
| `payment_not_confirmed` | 409 | yes | `refresh_checkout_state` |
| `deletion_already_requested` | 409 | no | `inspect_deletion_request` |
| `deletion_scope_conflict` | 409 | no | `inspect_deletion_scope` |
| `deletion_in_progress` | 409 | yes | `inspect_deletion_status` |
| `preservation_exception_applies` | 422 | no | `inspect_preservation_scope` |

The registry is extended only through a reviewed contract change. An endpoint cannot invent an unregistered machine code.

Recipient-facing routes never distinguish `recipient_access_invalid`, `recipient_access_expired`, `recipient_access_revoked`, or `recipient_access_suspended` in a way that proves an Access exists. They return the same safe unavailable/verification response defined by the Recipient operation. The more precise codes and postures are available only on an already-authorized Banker resource or Audit projection.

## 15. Sensitive Action Grant

### 15.1 Issuance

~~~text
POST /api/v1/sensitive-action-grants
~~~

The request binds action, typed exact resource, canonical command digest, the current ETag when the target is mutable or exact immutable dependency digest otherwise, and Idempotency-Key. A fresh Supabase Passkey login MUST be no older than five minutes. The product accepts that evidence only from the verified current Session JWT's `amr` entry whose method is `passkey` and whose timestamp is no older than five minutes; the verified `session_id` is part of the Grant binding. JWT issue time, client state, or a `magiclink` entry alone does not qualify. The Grant expires five minutes after issuance.

The response returns the opaque token once. The database stores only its hash and typed scope. The command presents:

~~~http
Sensitive-Action-Grant: {opaque-token}
~~~

During an Account Security Restriction, this endpoint accepts only a valid Security Recovery Session and only the closed recovery mutation actions in the [Permission Model](permission-model.md). It cannot issue an ordinary Account/Deal/export/external-use Grant. A security-epoch or restriction-version change invalidates the response even when its five-minute time limit has not elapsed.

### 15.2 Required actions

- Account or Deal data export;
- Internal Controlled Export;
- External-Use Decision;
- creation of an Externally Authorized Delivery or Recipient Access, revocation of an External-Use Decision or Recipient Access, and explicit Recipient Access Resumption;
- Deal Deletion Request;
- Account Deletion Request;
- product-controlled Account security/recovery mutations.

Ordinary Human Decisions, Revisions, Deal stage transitions, pause/resume, archive/reactivate, Job controls, and ordinary subscription cancellation do not require fresh authentication. The [Permission Model](permission-model.md) closes the V1 sensitive-action perimeter rather than leaving these operations open to later narrowing.

### 15.3 Consumption

The Grant and exact sensitive mutation are consumed in the same successful transaction. Failure before accepted mutation does not consume it. A lost response after commit is recovered through the same Idempotency-Key. Changed body, action, resource, ETag, or Idempotency-Key requires a new Control Review and Grant.

## 16. Recipient verification and session

### 16.1 Challenge flow

1. a Banker creates exact Recipient Access under a matching External-Use Decision and Sensitive Action Grant;
2. the product sends a Deal-content-free email whose 15-minute opaque token is stored only as a hash;
3. the link uses a URL fragment, and initial GET only renders a non-enumerating landing page;
4. browser JavaScript removes the fragment and POSTs the token to `/api/v1/recipient/link-exchanges`;
5. successful link exchange creates a challenge; `/api/v1/recipient/challenges/{challenge_id}/code-sends` issues an email code with a ten-minute life;
6. code verification allows at most five attempts, a 60-second resend cooldown, and three sends per challenge;
7. successful dual verification creates an opaque Recipient Session.

Email scanners, GET requests, link previews, failed verifications, and viewer-shell loads do not consume the link, create a Session, or record external use.

### 16.2 Recipient Cookie

The product sets an opaque `__Host-recipient_session` Cookie with `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, and no `Domain`. The database stores only the session hash. Idle timeout is 15 minutes and absolute lifetime is eight hours. Banker routes do not treat this Cookie as authority; the root path is required so the bound session accompanies protected Reader Copy stream requests.

Every Recipient request rechecks exact mailbox identity, Recipient Access, every active suspension cause and Access posture version, External-Use Decision, Revision, purpose, conditions, expiry, revocation, and invalidation. Suspension invalidates every prior Recipient Session and Object Grant; a later explicit resumption never revives them. Denials are non-enumerating.

### 16.3 No-download contract and observable use

V1 provides no Recipient download endpoint, Native Artifact, attachment response, reusable object URL, or other-Revision discovery. It does not claim DRM or technical prevention of screenshots, copying, or capture of bytes already rendered by a client.

The first successfully authorized Reader Copy stream for one Recipient Access and exact Revision emits the Gateway's idempotent first-byte receipt; the control plane records the observable External-Use Event from that receipt. Link activity and failures do not. Later views and Range requests append access Audit Events without creating another first-use Event.

## 17. Durable Jobs and SSE

### 17.1 Public Job states

Machine values are exactly:

- `queued`;
- `running`;
- `waiting_for_user`;
- `waiting_for_source`;
- `blocked`;
- `failed_retryable`;
- `failed_terminal`;
- `canceled`;
- `completed`.

UI labels may use hyphenated prose, but the wire contract uses `snake_case`.

### 17.2 Job query and events

`GET /api/v1/jobs/{job_id}` is authoritative. `GET /api/v1/jobs/{job_id}/events` is notification only.

The SSE stream:

- authenticates through the same-origin Supabase Session;
- uses the durable Job-local sequence as SSE `id`;
- without `Last-Event-ID`, sends current `job_snapshot` before later live events;
- with `Last-Event-ID`, replays later authorized durable events in sequence and then sends a non-regressing current `job_snapshot` before switching to live delivery;
- uses stable events `job_snapshot`, `job_state_changed`, `job_progressed`, `job_problem`, `job_terminal`, and `stream_closed`;
- sends `retry: 3000`;
- sends a non-persisted SSE comment heartbeat every 15 seconds;
- exposes the durable Worker heartbeat time without necessarily persisting every Worker heartbeat as a public event;
- closes after a terminal event;
- retains replayable Job Events at least 30 days after terminal state;
- excludes Deal content, Source bytes, filenames, raw provider output, and provider errors.

An expired replay cursor returns `409 event_cursor_expired` before the stream begins. A session invalidated during the stream receives privacy-safe `stream_closed` and the connection ends.

### 17.3 Cancel, retry, dependency resume, and rerun

- cancellation is cooperative, stops new steps, preserves accepted results, removes unattached partials, and releases unused reservation;
- retry is permitted only from `failed_retryable`, creates a new Job Attempt inside the same Job, and reuses accepted child effects;
- `waiting_for_source` and `waiting_for_user` resume only when the exact Source or Human input command satisfies the dependency; there is no generic resume endpoint;
- rerun is a new business command, Job, AI/Calculation Run or proposal, Idempotency-Key, authorization evaluation, and possible Usage Reservation, linked by `rerun_of_job_id`;
- `failed_terminal` is not retryable.

AI transient retries and contract repair share one total provider-invocation budget: one initial invocation and at most two additional opportunities. Repair and transient retry each consume one opportunity. An explicit Banker rerun is a new command and budget.

## 18. Upload Session and TUS

One Upload Session represents one user-confirmed batch. It contains multiple independently authorized file entries. The session lifetime is two hours, maximum file count is 50, and maximum declared batch total is 2 GB.

### 18.1 Creation

The request declares batch purpose and, per file, a client temporary ID, filename, media type, byte length, optional client SHA-256, Source declaration, Rights Posture inputs, and confidentiality posture. The response returns a server file ID, immutable quarantine path identity, TUS endpoint/configuration, allowed length/media posture, expiry, and state.

### 18.2 Direct transfer

The browser obtains a fresh Supabase Access Token for every TUS `POST`, `HEAD`, and `PATCH`. It does not send the SSR Cookie to Storage, does not use `x-upsert`, and cannot list, replace, change path, or write after expiry. Storage RLS binds Supabase Auth identity, Actor, Account, the required Deal for Deal Material or the explicit Account-template purpose, Upload Session, exact path, and open lifecycle.

### 18.3 Incremental finalization

`POST /api/v1/upload-sessions/{upload_session_id}/finalizations` accepts one or more completed server file IDs. The API verifies exact path, length, provider completion, and server-computed digest. Successful files independently become Quarantined Uploads and enter a safety Job. Missing, incomplete, mismatched, rejected, or expired files return per-item outcomes without undoing safely finalized siblings.

An open session may finalize remaining entries until expiry. Expired resume/finalize returns `410 upload_session_expired`; orphaned quarantine bytes enter scheduled cleanup. Finalization never establishes Source Record acceptance, Evidence, compatibility, or safety.

## 19. Protected Object Gateway

### 19.1 Object Grant

The Product API verifies the exact human session, Account, one typed Protected Account Object or Protected Deal Object attachment, the applicable immutable Account attachment or Revision, purpose, operation, and current access posture. Deal objects additionally recheck Deal, Rights Posture, and confidentiality. It then issues a Protected Object Stream Grant. The unused Grant expires after five minutes, is stored only as a hash, is not IP-bound, and permits multiple authorized Range requests for only that object and scope. The shared typed boundary is governed by [ADR 0034](../adr/0034-stream-typed-account-and-deal-protected-objects-through-one-gateway.md).

The client calls:

~~~http
GET /objects/{protected_object_id}
Authorization: ObjectGrant {opaque-token}
Range: bytes=...
~~~

The token never appears in a URL, query string, Cookie, referrer, or log.

### 19.2 Stream behavior

- Gateway revalidates Grant and current posture before every request;
- authorized ranges use `206`, `Accept-Ranges`, `Content-Range`, and `If-Range` semantics;
- object byte digest is the content ETag and manifest identity;
- Recipient purpose uses `Content-Disposition: inline`;
- authorized Banker download/export uses `Content-Disposition: attachment`;
- all protected responses use `Cache-Control: private, no-store`;
- a response accepted before Grant expiry may finish after expiry;
- a new Range after expiry requires a fresh Grant;
- active revocation of the bound human/Recipient session, Access, Decision, or Account/Deal posture invalidates every still-live Grant; a new Range fails and an in-flight response stops before the next bounded authorization checkpoint, while already released bytes cannot be recalled;
- a failure after headers/bytes begin terminates the stream and records an Audit Event; it cannot become a JSON Problem body.

For Recipient purpose, the Gateway uses one narrow idempotent control-plane method to persist an exact first-byte access receipt immediately before it releases the first non-empty authorized byte range. The control plane alone promotes the first qualifying receipt into the External-Use Event; repeat receipts become access Audit Events. The Gateway cannot perform another domain mutation, choose a different object, or obtain general Deal-decryption authority.

## 20. Webhooks

Webhook paths are outside `/api/v1`:

~~~text
POST /webhooks/stripe
POST /webhooks/resend
~~~

The handler:

1. reads a bounded raw body;
2. verifies provider-specific signature, secret, headers, and timestamp;
3. enforces the verified provider replay window;
4. deduplicates the provider event ID;
5. persists an immutable Inbox receipt and payload digest;
6. writes Outbox work in the same transaction;
7. returns a minimal acknowledgment;
8. performs product projection asynchronously.

| Condition | Response |
|---|---:|
| valid event durably persisted | `200` |
| verified duplicate, out-of-order, or currently ignored event | `200` |
| invalid signature, timestamp, or body | `400` |
| event cannot be durably persisted | `503` |

Webhook events do not require `Idempotency-Key`, prove no user authority, and cannot directly grant Product Entitlement, Recipient authority, Deal access, or another business state. Exact signature headers, one-MiB raw-body limit, 300-second replay tolerance, and deduplication identities are fixed by the [Integration Spec provider signature profiles](integration-spec.md#731-provider-signature-profiles).

## 21. Rate limiting

Rate policy is scoped independently by anonymous IP, Actor and Account, command class, expensive Job creation, Upload Session, SSE concurrency, Recipient Access/challenge/IP, protected stream concurrency, and Webhook edge abuse.

Authenticated non-sensitive endpoints MAY return `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset`. A limited request returns `429 rate_limited` and `Retry-After`.

Authentication, email-code, and non-enumerating Recipient responses expose only generic `429` and `Retry-After`, not remaining attempts or Account existence. Webhooks prioritize signature, payload limit, durable Inbox, and edge abuse control; a normal signed provider burst cannot be discarded merely because it resembles customer traffic.

Exact quotas are the versioned `rate-policy-v1.0.0` values in the [Integration Spec](integration-spec.md#124-first-party-rate-and-concurrency-policy), verified against the minimum VPS, abuse cases, Product Entitlement, and commercial capacity before production. Internal provider throttling after Job acceptance is represented in Job state rather than passed through as a first-party HTTP 429.

### 21.1 Commercial preview precondition

Every command that may reserve a file, logical-page, storage, Full-Workflow Operation, intensive-processing, or archive allowance requires the exact `operation_preview_id` and `consent_digest` previously returned for the same Account or Deal authority scope, command scope, dependency IDs, and operation code. Account-scoped commands use the Account preview endpoint; Deal-scoped commands use the matching Deal preview endpoint. In the accepting transaction the server revalidates entitlement, price/block posture, preview expiry, dependency identity, and available capacity before creating the Usage Reservation. An absent or changed preview returns `422 operation_preview_required` or `409 operation_preview_changed`; no command silently changes its commercial classification after consent.

## 22. Operation catalog

Unless an operation states otherwise:

- Banker operations require a valid Supabase Session and current endpoint-specific authorization;
- side-effecting Banker POST operations require `Idempotency-Key`;
- mutable-primary commands require `If-Match`;
- sensitive operations require `Sensitive-Action-Grant`;
- collection GETs use the query contract in Section 12;
- errors use Section 14 and the endpoint's domain-specific gates;
- `200`, `201`, and `202` have the meanings in Section 8;
- exact request and resource shapes are summarized in Section 23.

### 22.1 Public proof and qualification

Static public page copy remains owned by Next.js and is not mirrored into the Product API.

| Operation ID | Method and path | Auth | Request | Success |
|---|---|---|---|---|
| `get_public_offer` | `GET /api/v1/public/offer` | public | — | `200 PublicOffer` |
| `get_public_capability_manifest` | `GET /api/v1/public/capability-manifest` | public | — | `200 PublicCapabilityManifest` containing only verified public claims |
| `get_project_northstar` | `GET /api/v1/public/project-northstar` | public | — | `200 SyntheticProof` |
| `get_project_northstar_state` | `GET /api/v1/public/project-northstar/states/{proof_state}` | public | bounded proof state | `200 SyntheticProofState` |
| `get_project_northstar_artifact` | `GET /api/v1/public/project-northstar/artifacts/{artifact_id}` | public | rights-cleared synthetic artifact ID | `200 SyntheticArtifactMetadata` with static download link and digest |
| `create_synthetic_proof_session` | `POST /api/v1/public/project-northstar/sessions` | public, rate-limited | exact proof fixture/version | `201 SyntheticProofSession` and narrow proof cookie |
| `get_synthetic_proof_session` | `GET /api/v1/public/project-northstar/sessions/{session_id}` | proof session | — | `200 SyntheticProofSession` with current controlled loop state |
| `create_synthetic_claim_correction` | `POST /api/v1/public/project-northstar/sessions/{session_id}/claim-corrections` | proof session | exact synthetic Claim, Evidence, correction, rationale | `201 SyntheticClaimCorrection` |
| `create_synthetic_conflict_resolution` | `POST /api/v1/public/project-northstar/sessions/{session_id}/conflict-resolutions` | proof session | exact synthetic Conflict, alternatives, Evidence, rationale | `201 SyntheticHumanDecision` |
| `create_synthetic_deterministic_run` | `POST /api/v1/public/project-northstar/sessions/{session_id}/deterministic-runs` | proof session | exact corrected synthetic inputs and rule set | `202 Job` using deterministic synthetic adapter |
| `create_synthetic_impact_acceptance` | `POST /api/v1/public/project-northstar/sessions/{session_id}/impact-acceptances` | proof session | exact synthetic Impact Assessment and affected scope | `201 SyntheticHumanDecision` |
| `create_synthetic_revision` | `POST /api/v1/public/project-northstar/sessions/{session_id}/revisions` | proof session | exact accepted synthetic inputs and dependencies | `202 Job`; result links new synthetic Revision |
| `get_synthetic_job` | `GET /api/v1/public/project-northstar/sessions/{session_id}/jobs/{job_id}` | proof session | — | `200 Job` limited to that synthetic session |
| `get_synthetic_job_events` | `GET /api/v1/public/project-northstar/sessions/{session_id}/jobs/{job_id}/events` | proof session | SSE; `Last-Event-ID` optional | `200 text/event-stream` |
| `list_public_capacity_offers` | `GET /api/v1/public/capacity-offers` | public | verified offer filters | `200 CapacityOffer[]` with exact term, price, tax posture, effect, and eligibility |
| `create_qualification_assessment` | `POST /api/v1/public/qualification-assessments` | public, rate-limited | `QualificationAssessmentCreate` containing no Deal Material | `201 QualificationAssessment` |

Project Northstar commands reuse the same production command schemas, validators, domain handlers, state transitions, deterministic engines, and error contracts behind a bounded synthetic Account/permission adapter. The proof accepts no real upload, live provider, payment, external recipient, or production object ID. Public proof responses contain synthetic identifiers only and never expose production capability merely because an interactive state succeeds.

### 22.2 Account, commerce, billing, and notifications

| Operation ID | Method and path | Request | Success |
|---|---|---|---|
| `get_current_account` | `GET /api/v1/account` | — | `200 Account` |
| `get_authenticated_resume` | `GET /api/v1/resume` | optional privacy-safe return intent | `200 ResumeProjection` with one reauthorized canonical destination |
| `create_security_recovery_session` | `POST /api/v1/security-recovery-sessions` | current Supabase Magic Link mailbox-control evidence and exact product recovery continuation; ordinary Account content authority not required | `201 SecurityRecoverySessionProjection`; sets recovery Cookie |
| `get_account_security_restriction` | `GET /api/v1/account/security-restriction` | Security Recovery Session | `200 AccountSecurityRestriction` privacy-safe projection |
| `create_account_security_authority_invalidation` | `POST /api/v1/account/security-restriction/authority-invalidations` | exact same-Actor session/unused-Grant classes; Security Recovery Session; Sensitive Grant | `201 SecurityAuthorityInvalidation` |
| `create_account_security_restriction_clearance` | `POST /api/v1/account/security-restriction/clearances` | exact completed identity/ownership proof, restriction ETag; Security Recovery Session; Sensitive Grant | `201 AccountSecurityRestrictionClearance`; clears recovery Cookie but restores no prior authority |
| `get_account_entitlements` | `GET /api/v1/account/entitlements` | — | `200 ProductEntitlement[]` |
| `get_account_usage` | `GET /api/v1/account/usage` | period/filter query | `200 UsageSummary` plus ledger links |
| `list_usage_ledger_entries` | `GET /api/v1/account/usage-ledger-entries` | collection query | `200 UsageLedgerEntry[]` |
| `create_account_operation_preview` | `POST /api/v1/account/operation-previews` | exact proposed Account-scoped operation and immutable dependencies; read-only | `200 OperationPreview` with allowance classification, capacity effect, price/block posture, expiry, and consent digest |
| `get_subscription` | `GET /api/v1/account/subscription` | — | `200 SubscriptionProjection` |
| `list_commercial_receipts` | `GET /api/v1/account/commercial-receipts` | collection query | `200 CommercialReceipt[]` |
| `list_invoices` | `GET /api/v1/account/invoices` | collection query | `200 InvoiceProjection[]` |
| `list_guarantee_assessments` | `GET /api/v1/account/guarantee-assessments` | collection query | `200 GuaranteeAssessment[]` |
| `get_invoice` | `GET /api/v1/account/invoices/{invoice_id}` | — | `200 InvoiceProjection` |
| `create_invoice_object_grant` | `POST /api/v1/account/invoices/{invoice_id}/object-grants` | exact invoice object and current Account posture | `201 ProtectedObjectStreamGrant` |
| `create_guarantee_refund_request` | `POST /api/v1/account/guarantee-refund-requests` | exact payment, Deal, Preflight, Source Packet, work, failure, and milestone facts | `202 Job`; result links Guarantee Assessment and refund outcome |
| `get_guarantee_refund_request` | `GET /api/v1/account/guarantee-refund-requests/{request_id}` | — | `200 GuaranteeRefundRequest` |
| `create_referral_link` | `POST /api/v1/account/referral-links` | exact eligible first-value milestone; no Deal payload | `201 ReferralLink` |
| `list_referral_credits` | `GET /api/v1/account/referral-credits` | state/date filters | `200 ReferralCredit[]` |
| `create_account_template_upload_session` | `POST /api/v1/account/upload-sessions` | one separately supplied candidate, purpose fixed to `account_reusable_template`, exact Account Operation Preview and consent digest | `201 UploadSession` scoped to Account quarantine only |
| `list_account_artifact_templates` | `GET /api/v1/account/artifact-templates` | class/status/current/history filters | `200 AccountReusableTemplateSummary[]` |
| `create_account_artifact_template` | `POST /api/v1/account/artifact-templates` | exact finalized safe upload, rights attestation, sanitized/new-outside-live-Deal basis | `202 Job` |
| `get_account_artifact_template` | `GET /api/v1/account/artifact-templates/{template_id}` | — | `200 AccountReusableTemplate` |
| `list_account_artifact_template_versions` | `GET /api/v1/account/artifact-templates/{template_id}/versions` | collection query | `200 ArtifactTemplateVersion[]` |
| `create_account_artifact_template_version` | `POST /api/v1/account/artifact-templates/{template_id}/versions` | exact finalized safe upload, rights/compatibility basis, change reason; `If-Match` Template | `202 Job` |
| `get_account_artifact_template_version` | `GET /api/v1/account/artifact-templates/{template_id}/versions/{version_id}` | — | `200 ArtifactTemplateVersion` |
| `create_account_artifact_template_preflight` | `POST /api/v1/account/artifact-templates/{template_id}/preflights` | exact Template Version and compatibility profile | `202 Job` |
| `create_checkout_order` | `POST /api/v1/checkout-orders` | exact term, price, add-ons, amount due, renewal, tax posture, cancellation/refund/Guarantee version | `201 CheckoutOrder` |
| `get_checkout_order` | `GET /api/v1/checkout-orders/{checkout_order_id}` | — | `200 CheckoutOrder` with durable `order`, `terms`, `payment`, or `confirmation` step |
| `create_checkout_terms_acceptance` | `POST /api/v1/checkout-orders/{checkout_order_id}/terms-acceptances` | exact displayed commercial-contract digest and item acknowledgements; `If-Match` Checkout Order | `201 CheckoutTermsAcceptance` |
| `create_checkout_session` | `POST /api/v1/checkout-sessions` | exact Checkout Order and Terms Acceptance | `201 CheckoutSession` with Stripe-hosted URL |
| `get_checkout_session` | `GET /api/v1/checkout-sessions/{checkout_session_id}` | — | `200 CheckoutSession` using product-authoritative projected status |
| `create_account_capacity_checkout_order` | `POST /api/v1/account/capacity-checkout-orders` | exact additional-Active-Deal Capacity Offer, current entitlement, effective term, and displayed consent | `201 CheckoutOrder` |
| `create_billing_portal_session` | `POST /api/v1/billing-portal-sessions` | `BillingPortalSessionCreate` | `201 BillingPortalSession` with restricted portal URL |
| `create_subscription_cancellation` | `POST /api/v1/account/subscription-cancellations` | `SubscriptionCancellationCreate`; `If-Match` Subscription | `201 SubscriptionCancellation` |
| `list_notifications` | `GET /api/v1/account/notifications` | `state`, `event_class`, collection query | `200 Notification[]` |
| `create_notification_view_updates` | `POST /api/v1/account/notification-view-updates` | up to 100 exact Notification IDs | `200 ItemOutcome[]` |
| `get_notification_preferences` | `GET /api/v1/account/notification-preferences` | — | `200 NotificationPreferences` |
| `create_notification_preference_update` | `POST /api/v1/account/notification-preference-updates` | `NotificationPreferenceUpdate`; `If-Match` Notification Preferences | `200 NotificationPreferences` |
| `create_sensitive_action_grant` | `POST /api/v1/sensitive-action-grants` | `SensitiveActionGrantCreate` | `201 SensitiveActionGrant` with one-time token |
| `create_deletion_status_grant` | `POST /api/v1/deletion-status-grants` | `DeletionStatusGrantCreate` with exact request identity; same current Supabase issuer/subject as surviving claimant | `201 DeletionStatusGrant` with one-time token |
| `create_account_data_export` | `POST /api/v1/account/data-exports` | `AccountDataExportCreate`; Sensitive Grant | `202 Job` |
| `get_account_data_export` | `GET /api/v1/account/data-exports/{export_id}` | — | `200 AccountDataExport` |
| `create_account_data_export_object_grant` | `POST /api/v1/account/data-exports/{export_id}/object-grants` | exact completed export object; Sensitive Grant | `201 ProtectedObjectStreamGrant` |
| `create_account_deletion_request` | `POST /api/v1/account/deletion-requests` | `AccountDeletionRequestCreate`; `If-Match` Account; Sensitive Grant | `202 DeletionRequest` with Job link and initial one-time Deletion Status Grant |
| `get_account_deletion_request` | `GET /api/v1/account/deletion-requests/{deletion_request_id}` | exact Deletion Status Grant after normal authority removal | `200 DeletionRequest` privacy-safe status projection |

Stripe redirect parameters and browser return URLs do not grant entitlement. Only verified Webhook reconciliation and product transaction state do.

### 22.3 Deals, Setup, Preflight, Guide, and lifecycle

| Operation ID | Method and path | Request | Success |
|---|---|---|---|
| `list_deals` | `GET /api/v1/deals` | Deal posture filters, `q` over privacy-safe Deal identity only | `200 DealSummary[]` |
| `create_deal` | `POST /api/v1/deals` | `DealCreate` with identity, context, authority, and intended-use perimeter | `201 Deal` in Preflight-Restricted posture |
| `get_deal` | `GET /api/v1/deals/{deal_id}` | — | `200 Deal` |
| `get_deal_overview` | `GET /api/v1/deals/{deal_id}/overview` | optional `Consistency-After` | `200 DealOverviewProjection` |
| `get_deal_action_center` | `GET /api/v1/deals/{deal_id}/action-center` | owner/deadline/type filters | `200 ActionCenterProjection` preserving Needs Decision, Needs Source, Blocked, Jobs, and New Events as independent queues |
| `create_deal_event_attention_updates` | `POST /api/v1/deals/{deal_id}/event-attention-updates` | up to 100 exact Event IDs and viewed posture | `200 ItemOutcome[]` |
| `create_deal_operation_preview` | `POST /api/v1/deals/{deal_id}/operation-previews` | exact proposed operation scope and dependencies; read-only | `200 OperationPreview` with allowance classification, capacity effect, price/block posture, and consent digest |
| `create_deal_capacity_checkout_order` | `POST /api/v1/deals/{deal_id}/capacity-checkout-orders` | exact intensive-processing or archive Capacity Offer, Deal scope, current entitlement, effective term, and displayed consent | `201 CheckoutOrder` |
| `create_deal_setup_draft_save` | `POST /api/v1/deals/{deal_id}/setup/draft-saves` | `DealSetupDraftSave`; `If-Match` Draft when one exists; exact base Deal ETag | `200 Draft` |
| `get_deal_setup` | `GET /api/v1/deals/{deal_id}/setup` | — | `200 DealSetupProjection` |
| `create_deal_correction` | `POST /api/v1/deals/{deal_id}/corrections` | `DealCorrectionCreate`; `If-Match` Deal; identity-defining change prohibited | `201 DealCorrection` or linked-new-Deal requirement |
| `list_deal_lifecycle_transitions` | `GET /api/v1/deals/{deal_id}/lifecycle-transitions` | collection query | `200 DealLifecycleTransition[]` |
| `create_deal_lifecycle_transition` | `POST /api/v1/deals/{deal_id}/lifecycle-transitions` | `DealLifecycleTransitionCreate`; `If-Match` Deal | `201 DealLifecycleTransition` |
| `list_deal_business_stage_transitions` | `GET /api/v1/deals/{deal_id}/business-stage-transitions` | from/to stage, date, current/history filters | `200 DealBusinessStageTransition[]` |
| `create_deal_business_stage_transition` | `POST /api/v1/deals/{deal_id}/business-stage-transitions` | exact from/to stage, effective time, Evidence, Human Decision rationale, affected work; `If-Match` Deal | `201 DealBusinessStageTransition` with Process Event link |
| `list_preflights` | `GET /api/v1/deals/{deal_id}/preflights` | collection query | `200 Preflight[]` |
| `create_preflight` | `POST /api/v1/deals/{deal_id}/preflights` | `PreflightCreate` | `202 Job` |
| `get_preflight` | `GET /api/v1/deals/{deal_id}/preflights/{preflight_id}` | — | `200 Preflight` |
| `create_limited_proceed_acceptance` | `POST /api/v1/deals/{deal_id}/preflights/{preflight_id}/limited-proceed-acceptances` | exact scope, exclusions, Output Ceiling, rationale | `201 HumanDecision` |
| `create_targeted_repreflight` | `POST /api/v1/deals/{deal_id}/targeted-repreflights` | changed dimension IDs and current scope | `202 Job` |
| `list_output_ceilings` | `GET /api/v1/deals/{deal_id}/output-ceilings` | purpose/scope filters | `200 OutputCeilingAssessment[]` |
| `get_output_ceiling` | `GET /api/v1/deals/{deal_id}/output-ceilings/{output_ceiling_id}` | — | `200 OutputCeilingAssessment` |
| `get_first_deal_guide` | `GET /api/v1/deals/{deal_id}/guide` | — | `200 FirstDealGuideProjection` |
| `create_guide_graduation` | `POST /api/v1/deals/{deal_id}/guide/graduations` | explicit `enter_deal_execution_desk` intent; `If-Match` Deal | `201 GuideGraduation` after server-derived prerequisite verification |
| `create_desktop_handoff` | `POST /api/v1/deals/{deal_id}/desktop-handoffs` | exact successfully saved Draft and canonical return target; no Deal payload | `201 DesktopHandoff` with short-lived same-Account token |
| `create_desktop_handoff_email_send` | `POST /api/v1/deals/{deal_id}/desktop-handoffs/{handoff_id}/email-sends` | exact Handoff; no Deal content | `201 EmailSendReceipt` |
| `create_deal_data_export` | `POST /api/v1/deals/{deal_id}/data-exports` | all-or-nothing exact scope; Sensitive Grant | `202 Job` |
| `get_deal_data_export` | `GET /api/v1/deals/{deal_id}/data-exports/{export_id}` | — | `200 DealDataExport` |
| `create_deal_data_export_object_grant` | `POST /api/v1/deals/{deal_id}/data-exports/{export_id}/object-grants` | exact completed export object; Sensitive Grant | `201 ProtectedObjectStreamGrant` |
| `create_deal_deletion_request` | `POST /api/v1/deals/{deal_id}/deletion-requests` | exact typed Deal identity; `If-Match` Deal; Sensitive Grant | `202 DeletionRequest` with Job link and initial one-time Deletion Status Grant |
| `get_deal_deletion_request` | `GET /api/v1/deals/{deal_id}/deletion-requests/{deletion_request_id}` | exact Deletion Status Grant after normal authority removal | `200 DeletionRequest` privacy-safe status projection |

Pause, resume, archive, reactivate, close, and terminate are closed `transition_code` values in `DealLifecycleTransitionCreate`. A material identity-defining change cannot be a correction; the API returns the requirement to create a new linked Deal.

### 22.4 Upload, Source Material, Source Records, and Web Evidence

The canonical hierarchy is `Source Material → immutable Source Record → immutable Source Representation`. There is no `SourceRecordVersion` resource.

| Operation ID | Method and path | Request | Success |
|---|---|---|---|
| `create_upload_session` | `POST /api/v1/deals/{deal_id}/upload-sessions` | `UploadSessionCreate` with batch/file declarations, exact Deal Operation Preview, and consent digest | `201 UploadSession` |
| `get_upload_session` | `GET /api/v1/upload-sessions/{upload_session_id}` | — | `200 UploadSession` |
| `create_upload_finalization` | `POST /api/v1/upload-sessions/{upload_session_id}/finalizations` | exact completed server file IDs | `200 UploadFinalization` item outcomes and safety Jobs |
| `create_upload_cancellation` | `POST /api/v1/upload-sessions/{upload_session_id}/cancellations` | exact unfinished file IDs or whole remaining session; `If-Match` Upload Session | `201 UploadCancellation` |
| `list_source_materials` | `GET /api/v1/deals/{deal_id}/source-materials` | source kind/current/history/search filters | `200 SourceMaterialSummary[]` |
| `create_source_material` | `POST /api/v1/deals/{deal_id}/source-materials` | `SourceMaterialCreate` stable identity declaration | `201 SourceMaterial` |
| `get_source_material` | `GET /api/v1/deals/{deal_id}/source-materials/{source_material_id}` | — | `200 SourceMaterial` |
| `list_source_records` | `GET /api/v1/deals/{deal_id}/source-materials/{source_material_id}/records` | condition/reliance/date/history filters | `200 SourceRecord[]` |
| `create_source_record_acceptance` | `POST /api/v1/deals/{deal_id}/source-materials/{source_material_id}/record-acceptances` | exact Quarantined Upload, authority, classification, rights, record dates | `202 Job`; accepted result links new Source Record |
| `get_source_record` | `GET /api/v1/deals/{deal_id}/source-materials/{source_material_id}/records/{source_record_id}` | — | `200 SourceRecord` |
| `list_source_representations` | `GET /api/v1/deals/{deal_id}/source-records/{source_record_id}/representations` | representation/coverage filters | `200 SourceRepresentation[]` |
| `get_source_representation` | `GET /api/v1/deals/{deal_id}/source-records/{source_record_id}/representations/{representation_id}` | — | `200 SourceRepresentation` |
| `get_processing_coverage` | `GET /api/v1/deals/{deal_id}/source-representations/{representation_id}/processing-coverage` | — | `200 ProcessingCoverage` |
| `list_compatibility_reports` | `GET /api/v1/deals/{deal_id}/compatibility-reports` | typed target/outcome filters | `200 CompatibilityReport[]` |
| `get_compatibility_report` | `GET /api/v1/deals/{deal_id}/compatibility-reports/{report_id}` | — | `200 CompatibilityReport` |
| `create_web_evidence_observation` | `POST /api/v1/deals/{deal_id}/web-evidence-observations` | public HTTPS URL, purpose, rights basis, capture posture | `202 Job` |
| `get_web_evidence_observation` | `GET /api/v1/deals/{deal_id}/web-evidence-observations/{source_record_id}` | — | `200 WebEvidenceObservation` |

### 22.5 Classification, rights, reliance, Source Packets, and objectives

| Operation ID | Method and path | Request | Success |
|---|---|---|---|
| `list_classification_assessments` | `GET /api/v1/deals/{deal_id}/classification-assessments` | typed target/current/history filters | `200 MaterialClassificationAssessment[]` |
| `create_classification_assessment` | `POST /api/v1/deals/{deal_id}/classification-assessments` | independent provenance, confidentiality, de-identification, basis | `201 MaterialClassificationAssessment` |
| `get_classification_assessment` | `GET /api/v1/deals/{deal_id}/classification-assessments/{assessment_id}` | — | `200 MaterialClassificationAssessment` |
| `list_rights_assessments` | `GET /api/v1/deals/{deal_id}/rights-assessments` | Source Record/purpose/current/history | `200 RightsPostureAssessment[]` |
| `create_rights_assessment` | `POST /api/v1/deals/{deal_id}/rights-assessments` | exact Source Record, purpose, operations, conditions, basis | `201 RightsPostureAssessment` |
| `get_rights_assessment` | `GET /api/v1/deals/{deal_id}/rights-assessments/{assessment_id}` | — | `200 RightsPostureAssessment` |
| `list_reliance_assessments` | `GET /api/v1/deals/{deal_id}/reliance-assessments` | Source Record/purpose/current/history | `200 SourceRelianceAssessment[]` |
| `create_reliance_assessment` | `POST /api/v1/deals/{deal_id}/reliance-assessments` | exact Source Record, purpose, state, evidence/conflict/Decision basis | `201 SourceRelianceAssessment` |
| `get_reliance_assessment` | `GET /api/v1/deals/{deal_id}/reliance-assessments/{assessment_id}` | — | `200 SourceRelianceAssessment` |
| `list_condition_assessments` | `GET /api/v1/deals/{deal_id}/condition-assessments` | Source Record/purpose/current/history | `200 SourceConditionAssessment[]` |
| `create_condition_assessment` | `POST /api/v1/deals/{deal_id}/condition-assessments` | exact Source Record, purpose/use scope, freshness, conflict, disposition, basis, effective time, and optional superseded assessment | `201 SourceConditionAssessment` |
| `get_condition_assessment` | `GET /api/v1/deals/{deal_id}/condition-assessments/{assessment_id}` | — | `200 SourceConditionAssessment` |
| `list_source_packets` | `GET /api/v1/deals/{deal_id}/source-packets` | purpose/stage/current/history | `200 SourcePacketSummary[]` |
| `create_source_packet` | `POST /api/v1/deals/{deal_id}/source-packets` | stable name, purpose, owner | `201 SourcePacket` |
| `get_source_packet` | `GET /api/v1/deals/{deal_id}/source-packets/{source_packet_id}` | — | `200 SourcePacket` |
| `list_source_packet_versions` | `GET /api/v1/deals/{deal_id}/source-packets/{source_packet_id}/versions` | collection query | `200 SourcePacketVersion[]` |
| `create_source_packet_version` | `POST /api/v1/deals/{deal_id}/source-packets/{source_packet_id}/versions` | exact Source Record membership, roles, exclusions, change reason; `If-Match` Source Packet | `201 SourcePacketVersion` plus Impact Assessment when material |
| `get_source_packet_version` | `GET /api/v1/deals/{deal_id}/source-packets/{source_packet_id}/versions/{version_id}` | — | `200 SourcePacketVersion` |
| `list_work_objectives` | `GET /api/v1/deals/{deal_id}/work-objectives` | purpose/type/state filters | `200 WorkObjective[]` |
| `create_work_objective` | `POST /api/v1/deals/{deal_id}/work-objectives` | exact Source Packet Version, purpose, work scope, intended use | `201 WorkObjective` |
| `get_work_objective` | `GET /api/v1/deals/{deal_id}/work-objectives/{work_objective_id}` | — | `200 WorkObjective` |

### 22.6 Evidence, knowledge, Decisions, and controlled open work

| Operation ID | Method and path | Request | Success |
|---|---|---|---|
| `list_evidence` | `GET /api/v1/deals/{deal_id}/evidence` | proposition/source/relationship/current/history/search | `200 Evidence[]` |
| `get_evidence` | `GET /api/v1/deals/{deal_id}/evidence/{evidence_id}` | — | `200 Evidence` |
| `create_evidence_acceptance` | `POST /api/v1/deals/{deal_id}/evidence-acceptances` | exact Evidence Candidate, Source Record, Representation, Native Locator, relationship, scope | `201 Evidence` |
| `list_claims` | `GET /api/v1/deals/{deal_id}/claims` | state/origin/source/current/history/search | `200 Claim[]` |
| `create_claim` | `POST /api/v1/deals/{deal_id}/claims` | human-authored atomic proposition, scope, exact source/evidence basis where applicable | `201 Claim`; Origin is assigned by the server |
| `get_claim` | `GET /api/v1/deals/{deal_id}/claims/{claim_id}` | — | `200 Claim` |
| `list_facts` | `GET /api/v1/deals/{deal_id}/facts` | purpose/period/current/history/search | `200 Fact[]` |
| `get_fact` | `GET /api/v1/deals/{deal_id}/facts/{fact_id}` | — | `200 Fact` |
| `list_assumptions` | `GET /api/v1/deals/{deal_id}/assumptions` | purpose/status/current/history/search | `200 Assumption[]` |
| `create_assumption` | `POST /api/v1/deals/{deal_id}/assumptions` | explicit assumption, rationale, bounds, purpose, triggers | `201 Assumption` |
| `get_assumption` | `GET /api/v1/deals/{deal_id}/assumptions/{assumption_id}` | — | `200 Assumption` |
| `list_conflicts` | `GET /api/v1/deals/{deal_id}/conflicts` | dimension/state/affected-scope filters | `200 Conflict[]` |
| `get_conflict` | `GET /api/v1/deals/{deal_id}/conflicts/{conflict_id}` | — | `200 Conflict` |
| `list_human_decisions` | `GET /api/v1/deals/{deal_id}/human-decisions` | decision type/object/time/current/history | `200 HumanDecision[]` |
| `get_human_decision` | `GET /api/v1/deals/{deal_id}/human-decisions/{decision_id}` | — | `200 HumanDecision` |
| `create_claim_fact_acceptance` | `POST /api/v1/deals/{deal_id}/claims/{claim_id}/fact-acceptances` | exact Claim, Evidence Relationships, purpose, qualifications, conflicts, rationale | `201 Fact` with Human Decision link |
| `create_assumption_approval` | `POST /api/v1/deals/{deal_id}/assumptions/{assumption_id}/approvals` | exact Assumption, use, bounds, alternatives, Evidence, rationale, triggers | `201 HumanDecision` |
| `create_conflict_resolution` | `POST /api/v1/deals/{deal_id}/conflicts/{conflict_id}/resolutions` | exact competing sources/propositions, selected disposition, scope, Evidence, rationale | `201 HumanDecision` |
| `list_diligence_issues` | `GET /api/v1/deals/{deal_id}/diligence-issues` | state/materiality/owner/current/history | `200 DiligenceIssue[]` |
| `create_diligence_issue` | `POST /api/v1/deals/{deal_id}/diligence-issues` | issue, evidence, materiality, affected scope | `201 DiligenceIssue` |
| `get_diligence_issue` | `GET /api/v1/deals/{deal_id}/diligence-issues/{issue_id}` | — | `200 DiligenceIssue` |
| `create_diligence_issue_transition` | `POST /api/v1/deals/{deal_id}/diligence-issues/{issue_id}/transitions` | closed transition, resolution criteria/evidence, rationale; `If-Match` Diligence Issue | `201 DiligenceIssueTransition` |
| `list_information_requests` | `GET /api/v1/deals/{deal_id}/information-requests` | state/party/deadline/current/history | `200 InformationRequest[]` |
| `create_information_request` | `POST /api/v1/deals/{deal_id}/information-requests` | exact requested Evidence/source, party, purpose, deadline | `201 InformationRequest` |
| `get_information_request` | `GET /api/v1/deals/{deal_id}/information-requests/{request_id}` | — | `200 InformationRequest` |
| `create_information_request_transition` | `POST /api/v1/deals/{deal_id}/information-requests/{request_id}/transitions` | closed transition, response Source Record where applicable, rationale; `If-Match` Information Request | `201 InformationRequestTransition` |
| `list_open_items` | `GET /api/v1/deals/{deal_id}/open-items` | state/type/owner/deadline filters | `200 OpenItem[]` |
| `create_open_item` | `POST /api/v1/deals/{deal_id}/open-items` | exact controlled work item and basis | `201 OpenItem` |
| `get_open_item` | `GET /api/v1/deals/{deal_id}/open-items/{item_id}` | — | `200 OpenItem` |
| `create_open_item_transition` | `POST /api/v1/deals/{deal_id}/open-items/{item_id}/transitions` | closed transition, exact completion/reopen basis; `If-Match` Open Item | `201 OpenItemTransition` |
| `list_ai_runs` | `GET /api/v1/deals/{deal_id}/ai-runs` | task/outcome/date/object filters | `200 AIRunSummary[]` without raw prompt/request/response |
| `create_ai_run` | `POST /api/v1/deals/{deal_id}/work-objectives/{work_objective_id}/ai-runs` | exact enabled AI Task Definition, Source Packet Version, Context Plan inputs, intended use, and typed target | `202 Job`; result may link only AI Proposal, Evidence Candidate, or AI Abstention |
| `get_ai_run` | `GET /api/v1/deals/{deal_id}/ai-runs/{ai_run_id}` | — | `200 AIRun` with versions, input perimeter, validation, usage, limitations, and result links |
| `list_ai_proposals` | `GET /api/v1/deals/{deal_id}/ai-proposals` | run/kind/support/disposition filters | `200 AIProposalSummary[]` |
| `get_ai_proposal` | `GET /api/v1/deals/{deal_id}/ai-proposals/{proposal_id}` | — | `200 AIProposal` with typed validated payload, Evidence links, uncertainty, omissions, and disposition |
| `create_ai_proposal_rejection` | `POST /api/v1/deals/{deal_id}/ai-proposals/{proposal_id}/rejections` | exact proposal, reason, affected scope | `201 AIProposalDisposition` |
| `create_ai_claim_acceptance` | `POST /api/v1/deals/{deal_id}/ai-proposals/{proposal_id}/claim-acceptances` | exact claim proposal, Evidence perimeter, correction fields, intended scope | `201 Claim` with AI Origin and Proposal Disposition |
| `create_ai_assumption_acceptance` | `POST /api/v1/deals/{deal_id}/ai-proposals/{proposal_id}/assumption-acceptances` | exact proposal, bounds, purpose, rationale, expiry/triggers | `201 Assumption` with AI Origin and Proposal Disposition |
| `create_ai_analysis_acceptance` | `POST /api/v1/deals/{deal_id}/ai-proposals/{proposal_id}/analysis-acceptances` | exact Analysis root, Proposal, dependencies, purpose, deterministic validation, corrections; `If-Match` Analysis | `201 AnalysisVersion` with AI Origin and Proposal Disposition |
| `create_ai_recommendation_acceptance` | `POST /api/v1/deals/{deal_id}/ai-proposals/{proposal_id}/recommendation-acceptances` | exact proposal, alternatives, conditions, invalidation triggers, corrections | `201 Recommendation` with AI Origin and Proposal Disposition |
| `create_ai_diligence_issue_acceptance` | `POST /api/v1/deals/{deal_id}/ai-proposals/{proposal_id}/diligence-issue-acceptances` | exact proposal, Evidence, materiality, resolution criteria, corrections | `201 DiligenceIssue` with AI Origin and Proposal Disposition |
| `create_ai_deliverable_content_acceptance` | `POST /api/v1/deals/{deal_id}/ai-proposals/{proposal_id}/deliverable-content-acceptances` | exact Deliverable, content contract, citations, corrections, purpose/audience | `201 DeliverableRevisionContent` with AI Origin and Proposal Disposition |
| `create_ai_qc_finding_acceptance` | `POST /api/v1/deals/{deal_id}/ai-proposals/{proposal_id}/qc-finding-acceptances` | exact Review/QC Run target, location, Evidence, severity, corrections | `201 QCFinding` with AI Origin and Proposal Disposition |
| `list_ai_abstentions` | `GET /api/v1/deals/{deal_id}/ai-abstentions` | run/reason/affected-scope filters | `200 AIAbstention[]` |
| `get_ai_abstention` | `GET /api/v1/deals/{deal_id}/ai-abstentions/{abstention_id}` | — | `200 AIAbstention` |

Accepting a Claim as a Fact, resolving a material conflict, and making another controlled judgment occur through typed Human Decisions. A generic “approve AI” endpoint does not exist.

Correcting extraction creates the applicable human-authored Claim, Evidence acceptance, Calculation input, or other typed domain record with `corrects_ai_proposal_id`; it never edits the AI Proposal. Preparing a Decision saves or creates the typed Human Decision flow. A Job that uses AI ends with AI Proposal, Evidence Candidate, or AI Abstention links; it cannot directly commit a Fact, Human Decision, Process Event, external authorization, or accepted Deliverable content. Purely deterministic or explicitly human-authored Jobs may create their declared domain results without an AI-promotion command. Raw Prompt text, provider request/response, hidden reasoning, and provider credentials are never returned.

### 22.7 Calculations, Models, Scenarios, Analysis, and impact

| Operation ID | Method and path | Request | Success |
|---|---|---|---|
| `list_calculations` | `GET /api/v1/deals/{deal_id}/calculations` | kind/state/current/history filters | `200 CalculationSummary[]` |
| `create_calculation` | `POST /api/v1/deals/{deal_id}/calculations` | stable name, purpose, kind, owner, exact Work Objective | `201 Calculation` |
| `get_calculation` | `GET /api/v1/deals/{deal_id}/calculations/{calculation_id}` | — | `200 Calculation` |
| `list_calculation_versions` | `GET /api/v1/deals/{deal_id}/calculations/{calculation_id}/versions` | collection query | `200 CalculationVersion[]` |
| `create_calculation_version` | `POST /api/v1/deals/{deal_id}/calculations/{calculation_id}/versions` | exact Facts, Assumptions, measures, formula/method contract, units, periods, and change reason; `If-Match` Calculation | `201 CalculationVersion` |
| `get_calculation_version` | `GET /api/v1/deals/{deal_id}/calculations/{calculation_id}/versions/{version_id}` | — | `200 CalculationVersion` |
| `list_calculation_runs` | `GET /api/v1/deals/{deal_id}/calculations/{calculation_id}/runs` | version/outcome/date filters | `200 CalculationRun[]` |
| `create_calculation_run` | `POST /api/v1/deals/{deal_id}/calculations/{calculation_id}/runs` | exact Calculation Version, inputs, Evaluation Time, and engine profile | `202 Job` |
| `get_calculation_run` | `GET /api/v1/deals/{deal_id}/calculations/{calculation_id}/runs/{run_id}` | — | `200 CalculationRun` |
| `list_deterministic_validation_records` | `GET /api/v1/deals/{deal_id}/deterministic-validation-records` | closed typed target, applicability, result, affected-gate, date, current/history filters | `200 DeterministicValidationRecord[]` |
| `create_deterministic_validation_run` | `POST /api/v1/deals/{deal_id}/deterministic-validation-runs` | one closed typed target variant, exact input/version set, applicability, rule set, engine profile, coverage contract, and declared affected gates | `202 Job`; successful result links one or more immutable Deterministic Validation Records |
| `get_deterministic_validation_record` | `GET /api/v1/deals/{deal_id}/deterministic-validation-records/{record_id}` | — | `200 DeterministicValidationRecord` |
| `list_models` | `GET /api/v1/deals/{deal_id}/models` | kind/state/current/history filters | `200 ModelSummary[]` |
| `create_model` | `POST /api/v1/deals/{deal_id}/models` | stable name, purpose, kind, owner, exact Work Objective | `201 Model` |
| `get_model` | `GET /api/v1/deals/{deal_id}/models/{model_id}` | — | `200 Model` |
| `list_model_versions` | `GET /api/v1/deals/{deal_id}/models/{model_id}/versions` | collection query | `200 ModelVersion[]` |
| `create_model_version` | `POST /api/v1/deals/{deal_id}/models/{model_id}/versions` | exact Calculation Versions, Facts, Assumptions, method/structure, Evaluation Time, and change reason; `If-Match` Model | `201 ModelVersion` |
| `get_model_version` | `GET /api/v1/deals/{deal_id}/models/{model_id}/versions/{version_id}` | — | `200 ModelVersion` |
| `list_scenarios` | `GET /api/v1/deals/{deal_id}/scenarios` | model/state/current/history filters | `200 ScenarioSummary[]` |
| `create_scenario` | `POST /api/v1/deals/{deal_id}/scenarios` | stable name, purpose, owner | `201 Scenario` |
| `get_scenario` | `GET /api/v1/deals/{deal_id}/scenarios/{scenario_id}` | — | `200 Scenario` |
| `list_scenario_versions` | `GET /api/v1/deals/{deal_id}/scenarios/{scenario_id}/versions` | collection query | `200 ScenarioVersion[]` |
| `create_scenario_version` | `POST /api/v1/deals/{deal_id}/scenarios/{scenario_id}/versions` | exact Model or Analysis Version, typed overrides, and rationale; `If-Match` Scenario | `201 ScenarioVersion` |
| `get_scenario_version` | `GET /api/v1/deals/{deal_id}/scenarios/{scenario_id}/versions/{version_id}` | — | `200 ScenarioVersion` |
| `list_analyses` | `GET /api/v1/deals/{deal_id}/analyses` | kind/state/current/history/search filters | `200 AnalysisSummary[]` |
| `create_analysis` | `POST /api/v1/deals/{deal_id}/analyses` | stable question, purpose, kind, owner, exact Work Objective | `201 Analysis` |
| `get_analysis` | `GET /api/v1/deals/{deal_id}/analyses/{analysis_id}` | — | `200 Analysis` |
| `list_analysis_versions` | `GET /api/v1/deals/{deal_id}/analyses/{analysis_id}/versions` | collection query | `200 AnalysisVersion[]` |
| `create_analysis_version` | `POST /api/v1/deals/{deal_id}/analyses/{analysis_id}/versions` | exact human-authored or deterministic inputs: Source Packet, Evidence, Facts, Assumptions, Calculation Runs, Model/Scenario Versions, method, intended use; `If-Match` Analysis; AI-proposed content uses `create_ai_analysis_acceptance` instead | `202 Job`; successful result links immutable Analysis Version |
| `get_analysis_version` | `GET /api/v1/deals/{deal_id}/analyses/{analysis_id}/versions/{version_id}` | — | `200 AnalysisVersion` |
| `create_analysis_rerun` | `POST /api/v1/deals/{deal_id}/analyses/{analysis_id}/reruns` | new exact dependency set and rationale; `If-Match` Analysis | `202 Job`; creates a new immutable Analysis Version |
| `list_recommendations` | `GET /api/v1/deals/{deal_id}/recommendations` | analysis/current/history filters | `200 Recommendation[]` |
| `create_recommendation` | `POST /api/v1/deals/{deal_id}/recommendations` | exact Evidence, Facts, Assumptions, Calculation Runs, Analysis Versions, alternatives, trade-offs, conditions, invalidation triggers, purpose, and audience; human-authored only | `201 Recommendation` with Human Origin |
| `get_recommendation` | `GET /api/v1/deals/{deal_id}/recommendations/{recommendation_id}` | — | `200 Recommendation` |
| `list_impact_assessments` | `GET /api/v1/deals/{deal_id}/impact-assessments` | trigger/type/state/affected-object filters | `200 ImpactAssessment[]` |
| `get_impact_assessment` | `GET /api/v1/deals/{deal_id}/impact-assessments/{assessment_id}` | — | `200 ImpactAssessment` |
| `create_impact_disposition` | `POST /api/v1/deals/{deal_id}/impact-assessments/{assessment_id}/dispositions` | exact affected objects, disposition, rationale, and required follow-up | `201 HumanDecision` |

Calculation, Model, Scenario, and Analysis versions are immutable; Calculation Runs are separate immutable executions. “Update” means creating a new version against exact immutable dependency IDs. A stale dependency produces `dependency_changed`; the server never silently rebases.

### 22.8 Deal Parties and auction process

| Operation ID | Method and path | Request | Success |
|---|---|---|---|
| `list_deal_parties` | `GET /api/v1/deals/{deal_id}/parties` | party type/state/current/history/search | `200 DealParty[]` |
| `create_deal_party` | `POST /api/v1/deals/{deal_id}/parties` | canonical party identity, aliases, role, source basis | `201 DealParty` |
| `get_deal_party` | `GET /api/v1/deals/{deal_id}/parties/{party_id}` | — | `200 DealParty` |
| `create_deal_party_correction` | `POST /api/v1/deals/{deal_id}/parties/{party_id}/corrections` | exact correction and reason; `If-Match` Deal Party | `201 DealPartyCorrection` |
| `list_buyer_candidates` | `GET /api/v1/deals/{deal_id}/buyer-candidates` | approval/interest/capacity/contactability/conflict filters | `200 BuyerCandidate[]` |
| `create_buyer_candidate` | `POST /api/v1/deals/{deal_id}/buyer-candidates` | exact organization Deal Party, rationale, factors, restrictions, and explicit unknown postures | `201 BuyerCandidate` |
| `get_buyer_candidate` | `GET /api/v1/deals/{deal_id}/buyer-candidates/{candidate_id}` | — | `200 BuyerCandidate` |
| `create_buyer_approval` | `POST /api/v1/deals/{deal_id}/buyer-candidates/{candidate_id}/approvals` | exact candidate, bounded scope, Evidence, alternatives, and rationale | `201 BuyerApproval` with Human Decision link |
| `list_outreach_waves` | `GET /api/v1/deals/{deal_id}/outreach-waves` | posture/owner/timing filters | `200 OutreachWave[]` |
| `create_outreach_wave` | `POST /api/v1/deals/{deal_id}/outreach-waves` | purpose, planned timing, disclosure posture, material conditions, exact Approved Buyer membership | `201 OutreachWave` |
| `get_outreach_wave` | `GET /api/v1/deals/{deal_id}/outreach-waves/{wave_id}` | — | `200 OutreachWave` |
| `list_outreach_events` | `GET /api/v1/deals/{deal_id}/outreach-events` | buyer/channel/outcome/date filters | `200 OutreachEvent[]` |
| `create_outreach_event` | `POST /api/v1/deals/{deal_id}/outreach-events` | buyer, channel, occurred time, outcome, evidence basis | `201 OutreachEvent` |
| `get_outreach_event` | `GET /api/v1/deals/{deal_id}/outreach-events/{event_id}` | — | `200 OutreachEvent` |
| `list_auction_rounds` | `GET /api/v1/deals/{deal_id}/auction-rounds` | posture/date filters | `200 AuctionRound[]` |
| `create_auction_round` | `POST /api/v1/deals/{deal_id}/auction-rounds` | round identity, timing, requirements, evaluation basis | `201 AuctionRound` |
| `get_auction_round` | `GET /api/v1/deals/{deal_id}/auction-rounds/{round_id}` | — | `200 AuctionRound` |
| `create_auction_round_transition` | `POST /api/v1/deals/{deal_id}/auction-rounds/{round_id}/transitions` | closed transition, effective time, Evidence, rationale; `If-Match` Auction Round | `201 ProcessEvent` |
| `list_ndas` | `GET /api/v1/deals/{deal_id}/ndas` | counterparty/posture/current/history filters | `200 NDASummary[]` |
| `create_nda` | `POST /api/v1/deals/{deal_id}/ndas` | counterparty, purpose, scope | `201 NDA` |
| `get_nda` | `GET /api/v1/deals/{deal_id}/ndas/{nda_id}` | — | `200 NDA` |
| `list_nda_versions` | `GET /api/v1/deals/{deal_id}/ndas/{nda_id}/versions` | collection query | `200 NDAVersion[]` |
| `create_nda_version` | `POST /api/v1/deals/{deal_id}/ndas/{nda_id}/versions` | exact Source Record, parties, conditions, and legal/process dates; `If-Match` NDA | `201 NDAVersion` |
| `get_nda_version` | `GET /api/v1/deals/{deal_id}/ndas/{nda_id}/versions/{version_id}` | — | `200 NDAVersion` |
| `list_data_room_accesses` | `GET /api/v1/deals/{deal_id}/data-room-accesses` | counterparty/person/posture/scope filters | `200 DataRoomAccess[]` |
| `create_data_room_access` | `POST /api/v1/deals/{deal_id}/data-room-accesses` | counterparty/person, authorized material scope, Decision basis, valid interval | `201 DataRoomAccess` |
| `get_data_room_access` | `GET /api/v1/deals/{deal_id}/data-room-accesses/{access_id}` | — | `200 DataRoomAccess` |
| `create_data_room_access_event` | `POST /api/v1/deals/{deal_id}/data-room-accesses/{access_id}/events` | exact typed grant/suspend/revoke/expire event, effective time, Evidence/Decision; `If-Match` Data-Room Access | `201 ProcessEvent` |
| `list_bids` | `GET /api/v1/deals/{deal_id}/bids` | buyer/type/round/state/current/history filters | `200 BidSummary[]` |
| `create_bid` | `POST /api/v1/deals/{deal_id}/bids` | exact Buyer Candidate and Auction Round plus first immutable Bid Version and Source Record | `201 Bid` |
| `get_bid` | `GET /api/v1/deals/{deal_id}/bids/{bid_id}` | — | `200 Bid` |
| `list_bid_versions` | `GET /api/v1/deals/{deal_id}/bids/{bid_id}/versions` | collection query | `200 BidVersion[]` |
| `create_bid_version` | `POST /api/v1/deals/{deal_id}/bids/{bid_id}/versions` | exact Source Record, submission/receipt times, economics, structure, conditions, financing, timing, and superseded version; `If-Match` Bid | `201 BidVersion` |
| `get_bid_version` | `GET /api/v1/deals/{deal_id}/bids/{bid_id}/versions/{version_id}` | — | `200 BidVersion` |
| `create_bid_event` | `POST /api/v1/deals/{deal_id}/bids/{bid_id}/events` | exact Bid and applicable Bid Version, closed receipt/revision/clarification/withdrawal event kind, occurred time, Source/Evidence, and rationale | `201 ProcessEvent` with typed Bid Event extension |
| `create_bid_decision` | `POST /api/v1/deals/{deal_id}/bids/{bid_id}/decisions` | exact Bid Version, closed selection/next-round/rejection/exclusivity/acceptance variant, alternatives, Evidence, scope, rationale, and exact Recommendation when one informed the choice | `201 BidDecision` with Human Decision link |
| `list_milestones` | `GET /api/v1/deals/{deal_id}/milestones` | stage/state/owner/date filters | `200 Milestone[]` |
| `create_milestone` | `POST /api/v1/deals/{deal_id}/milestones` | milestone type, owner, target date, completion criteria, dependencies | `201 Milestone` |
| `get_milestone` | `GET /api/v1/deals/{deal_id}/milestones/{milestone_id}` | — | `200 Milestone` |
| `create_milestone_transition` | `POST /api/v1/deals/{deal_id}/milestones/{milestone_id}/transitions` | state, occurred time, Evidence, rationale; `If-Match` Milestone | `201 ProcessEvent` |
| `list_process_events` | `GET /api/v1/deals/{deal_id}/process-events` | event type/party/date filters | `200 ProcessEvent[]` |
| `get_process_event` | `GET /api/v1/deals/{deal_id}/process-events/{event_id}` | — | `200 ProcessEvent` |
| `create_signing_event` | `POST /api/v1/deals/{deal_id}/signing-events` | exact parties/scope, occurred time, Source Records/Evidence, Decision basis | `201 ProcessEvent` |
| `create_closing_event` | `POST /api/v1/deals/{deal_id}/closing-events` | exact parties/scope, occurred time, Source Records/Evidence, Decision basis | `201 ProcessEvent` |
| `create_termination_event` | `POST /api/v1/deals/{deal_id}/termination-events` | exact termination scope/reason, occurred time, Evidence, Decision basis | `201 ProcessEvent` |
| `create_process_event_correction` | `POST /api/v1/deals/{deal_id}/process-events/{event_id}/corrections` | closed typed correction variant matching the original event extension, corrected business-effective fields, reason, Evidence, and exact superseded Process Event | `201 ProcessEvent` linked as correction; original remains immutable |

These APIs record the sell-side process; they do not send banker email, connect to a data room, negotiate an NDA, or communicate with buyers in V1.

### 22.9 Deliverables, Revisions, artifacts, Review, and readiness

| Operation ID | Method and path | Request | Success |
|---|---|---|---|
| `list_deliverables` | `GET /api/v1/deals/{deal_id}/deliverables` | type/state/readiness/current/history filters | `200 DeliverableSummary[]` |
| `create_deliverable` | `POST /api/v1/deals/{deal_id}/deliverables` | type, purpose, intended use, owner, exact Work Objective | `201 Deliverable` |
| `get_deliverable` | `GET /api/v1/deals/{deal_id}/deliverables/{deliverable_id}` | — | `200 Deliverable` |
| `list_revisions` | `GET /api/v1/deals/{deal_id}/deliverables/{deliverable_id}/revisions` | state/current/history filters | `200 RevisionSummary[]` |
| `create_revision` | `POST /api/v1/deals/{deal_id}/deliverables/{deliverable_id}/revisions` | exact accepted semantic content or workbook authority, dependency graph, rationale, requested outputs; `If-Match` Deliverable; no unaccepted AI payload | `202 Job`; successful result links immutable Revision |
| `get_revision` | `GET /api/v1/deals/{deal_id}/deliverables/{deliverable_id}/revisions/{revision_id}` | — | `200 Revision` |
| `create_revision_rerun` | `POST /api/v1/deals/{deal_id}/deliverables/{deliverable_id}/revisions/{revision_id}/reruns` | new dependency set and reason; `If-Match` Deliverable | `202 Job`; creates a new Revision |
| `list_artifacts` | `GET /api/v1/deals/{deal_id}/artifacts` | deliverable/revision/format/state filters | `200 ArtifactSummary[]` |
| `get_artifact` | `GET /api/v1/deals/{deal_id}/artifacts/{artifact_id}` | metadata only | `200 Artifact` |
| `get_artifact_manifest` | `GET /api/v1/deals/{deal_id}/artifacts/{artifact_id}/manifest` | — | `200 ArtifactManifest` with canonical digest, signature, key ID, exact membership, and no member bytes |
| `list_artifact_templates` | `GET /api/v1/deals/{deal_id}/artifact-templates` | class/scope/status/current/history filters | `200 ArtifactTemplateSummary[]` |
| `create_artifact_template` | `POST /api/v1/deals/{deal_id}/artifact-templates` | template class, rights posture, exact safe uploaded object | `202 Job` |
| `get_artifact_template` | `GET /api/v1/deals/{deal_id}/artifact-templates/{template_id}` | — | `200 ArtifactTemplate` |
| `list_artifact_template_versions` | `GET /api/v1/deals/{deal_id}/artifact-templates/{template_id}/versions` | collection query | `200 ArtifactTemplateVersion[]` |
| `create_artifact_template_version` | `POST /api/v1/deals/{deal_id}/artifact-templates/{template_id}/versions` | exact safe object, compatibility profile, rights basis, and change reason; `If-Match` Template | `202 Job` |
| `get_artifact_template_version` | `GET /api/v1/deals/{deal_id}/artifact-templates/{template_id}/versions/{version_id}` | — | `200 ArtifactTemplateVersion` |
| `create_deal_template_selection` | `POST /api/v1/deals/{deal_id}/template-selections` | exact eligible Deal, product-default, or Account Template Version, Deliverable/artifact class, Evidence, Human Decision; `If-Match` current selection or Deal | `201 DealTemplateSelection` |
| `list_reviews` | `GET /api/v1/deals/{deal_id}/reviews` | exact target/reviewer/conclusion/date filters | `200 Review[]` |
| `create_review` | `POST /api/v1/deals/{deal_id}/reviews` | exact target/version, purpose, audience, scope, reviewer identity, standard, conclusion, and limitations | `201 Review` |
| `get_review` | `GET /api/v1/deals/{deal_id}/reviews/{review_id}` | — | `200 Review` |
| `list_qc_runs` | `GET /api/v1/deals/{deal_id}/qc-runs` | review/outcome/profile/date filters | `200 QCRun[]` |
| `create_qc_run` | `POST /api/v1/deals/{deal_id}/qc-runs` | exact Review/target, ruleset, tool/model profile, and input perimeter | `202 Job` |
| `get_qc_run` | `GET /api/v1/deals/{deal_id}/qc-runs/{qc_run_id}` | — | `200 QCRun` |
| `list_qc_findings` | `GET /api/v1/deals/{deal_id}/qc-findings` | review/run/severity/owner/current-history filters | `200 QCFinding[]` |
| `get_qc_finding` | `GET /api/v1/deals/{deal_id}/qc-findings/{finding_id}` | — | `200 QCFinding` |
| `create_qc_finding_disposition` | `POST /api/v1/deals/{deal_id}/qc-findings/{finding_id}/dispositions` | disposition, exact target, actor/Decision, rationale, purpose | `201 QCFindingDisposition` |
| `create_qc_retest` | `POST /api/v1/deals/{deal_id}/qc-findings/{finding_id}/retests` | exact remediated target and ruleset | `202 Job` |
| `get_deliverable_readiness` | `GET /api/v1/deals/{deal_id}/deliverables/{deliverable_id}/revisions/{revision_id}/readiness` | required `purpose` and `audience` | `200 DeliverableReadiness` for that exact use only |
| `list_execution_packages` | `GET /api/v1/deals/{deal_id}/execution-packages` | state/current/history filters | `200 ExecutionPackageSummary[]` |
| `create_execution_package` | `POST /api/v1/deals/{deal_id}/execution-packages` | package purpose, exact Deliverables/Revisions, owner | `201 ExecutionPackage` |
| `get_execution_package` | `GET /api/v1/deals/{deal_id}/execution-packages/{package_id}` | — | `200 ExecutionPackage` |
| `list_package_snapshots` | `GET /api/v1/deals/{deal_id}/execution-packages/{package_id}/snapshots` | collection query | `200 PackageSnapshot[]` |
| `create_package_snapshot` | `POST /api/v1/deals/{deal_id}/execution-packages/{package_id}/snapshots` | exact Revisions, controls, dependencies, omissions, limitations, reason; `If-Match` Execution Package | `201 PackageSnapshot` |
| `get_package_snapshot` | `GET /api/v1/deals/{deal_id}/execution-packages/{package_id}/snapshots/{snapshot_id}` | — | `200 PackageSnapshot` |
| `get_package_readiness` | `GET /api/v1/deals/{deal_id}/execution-packages/{package_id}/snapshots/{snapshot_id}/readiness` | required `purpose` and `audience` | `200 PackageReadiness` for that exact Snapshot and use only |

Artifact metadata is ordinary JSON; artifact bytes are never embedded in JSON and never exposed as a storage-provider URL.

### 22.10 Internal Controlled Export and external reimport

| Operation ID | Method and path | Request | Success |
|---|---|---|---|
| `list_internal_controlled_exports` | `GET /api/v1/deals/{deal_id}/internal-controlled-exports` | purpose/date/current/history filters | `200 InternalControlledExport[]` |
| `create_internal_controlled_export` | `POST /api/v1/deals/{deal_id}/internal-controlled-exports` | exact artifact/revision set, purpose, confidentiality posture; all-or-nothing | `202 Job` |
| `get_internal_controlled_export` | `GET /api/v1/deals/{deal_id}/internal-controlled-exports/{export_id}` | — | `200 InternalControlledExport` |
| `create_export_object_grant` | `POST /api/v1/deals/{deal_id}/internal-controlled-exports/{export_id}/object-grants` | exact archive object and range intent; Sensitive Grant | `201 ProtectedObjectStreamGrant` |
| `create_reimport_session` | `POST /api/v1/deals/{deal_id}/reimport-sessions` | exact Internal Controlled Export, manifest digest, and edited file declarations | `201 UploadSession` specialized for reimport |
| `create_reimport_finalization` | `POST /api/v1/deals/{deal_id}/reimport-sessions/{session_id}/finalizations` | exact uploaded object IDs and expected manifest; all-or-nothing | `202 Job` |
| `list_reimports` | `GET /api/v1/deals/{deal_id}/reimports` | source export/state/date/current/history filters | `200 Reimport[]` |
| `get_reimport` | `GET /api/v1/deals/{deal_id}/reimports/{reimport_id}` | — | `200 Reimport` with structural diff and blockers |
| `list_reimport_merge_conflicts` | `GET /api/v1/deals/{deal_id}/reimports/{reimport_id}/merge-conflicts` | region/kind/posture filters | `200 MergeConflict[]` |
| `get_reimport_merge_conflict` | `GET /api/v1/deals/{deal_id}/reimports/{reimport_id}/merge-conflicts/{conflict_id}` | — | `200 MergeConflict` with all three exact region identities |
| `create_merge_conflict_disposition` | `POST /api/v1/deals/{deal_id}/reimports/{reimport_id}/merge-conflicts/{conflict_id}/dispositions` | exact accepted source/region, rationale, Human Decision; `If-Match` Merge Conflict | `201 MergeConflictDisposition` |
| `create_reimport_acceptance` | `POST /api/v1/deals/{deal_id}/reimports/{reimport_id}/acceptances` | exact three-way diff, disposition, new dependency set; `If-Match` Reimport | `202 Job`; creates a new Revision |
| `list_archive_packages` | `GET /api/v1/deals/{deal_id}/archive-packages` | purpose/current/history filters | `200 ArchivePackageSummary[]` |
| `create_archive_package` | `POST /api/v1/deals/{deal_id}/archive-packages` | exact Package Snapshot, permitted source/control scope, purpose, audience, exclusions; Sensitive Grant | `202 Job` |
| `get_archive_package` | `GET /api/v1/deals/{deal_id}/archive-packages/{archive_id}` | — | `200 ArchivePackage` |
| `create_archive_package_object_grant` | `POST /api/v1/deals/{deal_id}/archive-packages/{archive_id}/object-grants` | exact completed archive object; Sensitive Grant | `201 ProtectedObjectStreamGrant` |

Reimport never overwrites an existing Revision. Missing or invalid manifests, cross-Deal IDs, failed compatibility checks, and ambiguous edits fail the whole finalization.

### 22.11 External authorization, delivery, and actual use

| Operation ID | Method and path | Request | Success |
|---|---|---|---|
| `list_external_use_decisions` | `GET /api/v1/deals/{deal_id}/external-use-decisions` | target/recipient/purpose/current/history filters | `200 ExternalUseDecision[]` |
| `create_external_use_decision` | `POST /api/v1/deals/{deal_id}/external-use-decisions` | frozen exact scope, recipient class, purpose, channel, conditions, expiry, rationale; Sensitive Grant | `201 ExternalUseDecision` |
| `get_external_use_decision` | `GET /api/v1/deals/{deal_id}/external-use-decisions/{decision_id}` | — | `200 ExternalUseDecision` |
| `create_external_use_decision_revocation` | `POST /api/v1/deals/{deal_id}/external-use-decisions/{decision_id}/revocations` | exact Decision/Scope, reason, effective time, affected Access review; Sensitive Grant | `201 ExternalUseRevocation`; prospective matching delivery and access are denied |
| `list_externally_authorized_deliveries` | `GET /api/v1/deals/{deal_id}/externally-authorized-deliveries` | decision/recipient/channel/date/current/history filters | `200 ExternallyAuthorizedDelivery[]` |
| `create_externally_authorized_delivery` | `POST /api/v1/deals/{deal_id}/externally-authorized-deliveries` | exact External-Use Decision, recipient, channel, artifact set; Sensitive Grant | `202 Job` |
| `get_externally_authorized_delivery` | `GET /api/v1/deals/{deal_id}/externally-authorized-deliveries/{delivery_id}` | — | `200 ExternallyAuthorizedDelivery` |
| `create_externally_authorized_delivery_object_grant` | `POST /api/v1/deals/{deal_id}/externally-authorized-deliveries/{delivery_id}/object-grants` | exact frozen delivery member, active External-Use Decision, recipient/channel purpose; Sensitive Grant | `201 ProtectedObjectStreamGrant` |
| `list_recipient_accesses` | `GET /api/v1/deals/{deal_id}/recipient-accesses` | decision/delivery/recipient/posture/date/current/history filters | `200 RecipientAccess[]` |
| `create_recipient_access` | `POST /api/v1/deals/{deal_id}/recipient-accesses` | exact active External-Use Decision/Scope, frozen recipient email, Reader Copy, expiry, and access permissions; Sensitive Grant | `201 RecipientAccess` plus linked recipient-specific Externally Authorized Delivery created atomically |
| `get_recipient_access` | `GET /api/v1/deals/{deal_id}/recipient-accesses/{recipient_access_id}` | — | `200 RecipientAccess` |
| `create_recipient_access_revocation` | `POST /api/v1/deals/{deal_id}/recipient-accesses/{recipient_access_id}/revocations` | reason; `If-Match` Recipient Access; Sensitive Grant | `201 RecipientAccessRevocation` |
| `create_recipient_access_resumption` | `POST /api/v1/deals/{deal_id}/recipient-accesses/{recipient_access_id}/resumptions` | exact cleared suspension set, unchanged Access/Decision/Revision/Recipient/purpose/conditions digest; `If-Match` Recipient Access; Sensitive Grant | `201 RecipientAccessResumption`; prior Sessions remain invalid and a new verification challenge is issued |
| `create_external_use_event` | `POST /api/v1/deals/{deal_id}/external-use-events` | user-attested product-external use, exact artifact scope, occurred time, channel, recipient, basis | `201 ExternalUseEvent` |
| `list_external_use_events` | `GET /api/v1/deals/{deal_id}/external-use-events` | artifact/recipient/channel/date filters | `200 ExternalUseEvent[]` |

The server freezes the exact authorized artifact scope at Decision creation. Later mutable-current changes do not expand an existing Decision, delivery, or Recipient Access. The Recipient Access command is the UX-level atomic alternative to standalone delivery creation: it creates the required recipient-specific delivery package and Access in one transaction, so the client never has to issue a hidden prerequisite delivery command. Decision revocation blocks all prospective matching delivery and access without claiming to retract bytes already used outside the product.

### 22.12 Public Recipient operations

Recipient operations use the separate Recipient Session and never accept a Banker Session as an implicit substitute.

| Operation ID | Method and path | Request | Success |
|---|---|---|---|
| `exchange_recipient_link` | `POST /api/v1/recipient/link-exchanges` | fragment-derived one-time `link_secret` | `201 RecipientChallenge` |
| `create_recipient_code_send` | `POST /api/v1/recipient/challenges/{challenge_id}/code-sends` | challenge continuation token | `201 RecipientCodeSend` with masked email and resend timers |
| `create_recipient_code_verification` | `POST /api/v1/recipient/challenges/{challenge_id}/code-verifications` | six-digit code and challenge continuation token | `201 RecipientSessionProjection`; sets Recipient Cookie |
| `get_recipient_session` | `GET /api/v1/recipient/session` | Recipient Cookie | `200 RecipientSessionProjection` |
| `create_recipient_session_logout` | `POST /api/v1/recipient/session/logouts` | Recipient Cookie | `201 RecipientLogout`; clears cookie |
| `get_recipient_reader_copy` | `GET /api/v1/recipient/reader-copy` | Recipient Cookie; metadata only | `200 ReaderCopy` |
| `create_recipient_reader_copy_object_grant` | `POST /api/v1/recipient/reader-copy/object-grants` | Recipient Cookie, current Reader Copy ETag | `201 ProtectedObjectStreamGrant` |

The first successful protected stream for the frozen Reader Copy emits the exact idempotent first-byte receipt from which the control plane records the observable External-Use Event. Repeated views add access-history events and do not create additional first-use events.

### 22.13 Jobs, history, audit, and portability status

| Operation ID | Method and path | Request | Success |
|---|---|---|---|
| `get_job` | `GET /api/v1/jobs/{job_id}` | — | `200 Job` |
| `get_job_events` | `GET /api/v1/jobs/{job_id}/events` | SSE; `Last-Event-ID` optional | `200 text/event-stream` |
| `create_job_cancellation` | `POST /api/v1/jobs/{job_id}/cancellations` | cancellation reason; `If-Match` Job | `201 JobCancellation` |
| `create_job_retry` | `POST /api/v1/jobs/{job_id}/retries` | failed-retryable Job and exact same logical inputs; `If-Match` Job | `200 Job` with a new Attempt in the same Job |
| `get_deal_history` | `GET /api/v1/deals/{deal_id}/history` | event/object type, Actor/Principal, Origin, result, date, and current/history posture filters | `200 DealHistoryEvent[]` |
| `get_account_audit_log` | `GET /api/v1/account/audit-events` | actor/action/object/date filters; current Supabase Passkey reauthentication gate for high-risk detail | `200 AuditEvent[]` |
| `list_account_audit_checkpoints` | `GET /api/v1/account/audit-checkpoints` | date/key filters | `200 AuditCheckpoint[]` |
| `get_account_audit_checkpoint` | `GET /api/v1/account/audit-checkpoints/{checkpoint_id}` | — | `200 AuditCheckpoint` with signed commitment and integrity-key link |
| `get_retention_posture` | `GET /api/v1/account/retention-posture` | — | `200 RetentionPosture` |

`DealHistoryEvent` is user-facing domain history. `AuditEvent` is the security/compliance record and may contain restricted metadata. They are not aliases and do not share an unconstrained search endpoint.

### 22.14 Protected streams, integrity keys, and Webhooks

| Operation ID | Method and path | Request | Success |
|---|---|---|---|
| `create_artifact_object_grant` | `POST /api/v1/deals/{deal_id}/artifacts/{artifact_id}/object-grants` | exact artifact and intended operation | `201 ProtectedObjectStreamGrant` |
| `stream_protected_object` | `GET /objects/{protected_object_id}` | `Authorization: ObjectGrant …`; optional single `Range` | `200` or `206` bytes |
| `list_integrity_keys` | `GET /.well-known/integrity-keys.json` | optional `purpose`, `kid` | `200` purpose-separated JWK registry |
| `receive_stripe_webhook` | `POST /webhooks/stripe` | raw signed Stripe payload | `200` after durable Inbox persist; otherwise `503` |
| `receive_resend_webhook` | `POST /webhooks/resend` | raw signed Resend payload | `200` after durable Inbox persist; otherwise `503` |

Object grants are short-lived, purpose-bound, principal-bound, object-bound, and operation-bound. They are not share links and cannot authorize JSON API calls.

## 23. Schema catalog

The canonical implementation schemas are generated from TypeScript validators into OpenAPI. This section fixes the cross-boundary fields and invariants; the Data Model / ERD remains authoritative for storage layout.

### 23.1 Common resource fields

Unless a resource definition says otherwise, first-party JSON resources contain:

| Field | Type | Contract |
|---|---|---|
| `id` | UUIDv7 string | stable object identity |
| `account_id` | UUIDv7 string | present for Account-scoped internal responses only; omitted from Recipient responses |
| `deal_id` | UUIDv7 string or `null` | explicit Deal scope where applicable |
| `created_at` | RFC 3339 UTC string | server time |
| `created_by` | Principal Reference | authenticated Actor, External Recipient, Runtime Principal, or system identity |
| `updated_at` | RFC 3339 UTC string | mutable resources only |
| `state` | closed string | resource-specific state catalog |
| `links` | Link object | same-authority application links only; never raw storage URLs |

Principal Reference is `{ "principal_type": "actor|external_recipient|runtime_principal|system", "principal_id": "…" }`. Only the `actor` branch refers to the Account-side Actor defined in `CONTEXT.md`. Recipient-facing payloads never reveal internal user, Account, Deal, source, or audit identifiers not required by the frozen access scope.

### 23.2 Commerce and Checkout schemas

`CheckoutOrder` is product-authoritative and contains exact offer/price/add-on identities, billing term, amount due now, currency, tax posture, renewal date/amount, annual equivalent/discount, included Active Deal capacity, allowance schedule, unmetered-action disclosure, Guarantee/cancellation/refund/Post-Term/export/retention/deletion contract versions, `current_step`, `payment_state`, entitlement result, and ETag.

`current_step` is exactly `order`, `terms`, `payment`, or `confirmation`; recovery is a posture that returns to one of those steps, not a fifth step. `payment_state` is exactly `not_started`, `failed`, `pending`, `requires_action`, `duplicate_charge`, or `succeeded`. A Stripe session ID, redirect result, or client callback never sets `succeeded` or creates entitlement.

`CheckoutTermsAcceptance` binds the exact Checkout Order ID/ETag, displayed contract digest, and explicit acknowledgements for purchase authority, Source-authority separation, Guarantee, cancellation/refund, Post-Term Access, export/retention/deletion, and provider/processing disclosure. Payment method credentials and strong-auth secrets never enter product JSON or Draft storage.

`CapacityOffer` is an immutable versioned commercial offer containing its exact capacity class and increment, eligibility, term/effective-time rule, amount/currency/tax posture, expiry, and product-contract version. `OperationPreview` contains its Account authority, optional Deal authority, operation code, exact dependency digest, allowance class and quantity, current capacity before/after, price or block posture, expiry, and `consent_digest`. It creates no Usage Reservation; the accepting command revalidates and consumes the preview identity only as part of its own transaction.

`AccountSecurityRestriction` exposes only restriction ID/version, privacy-safe reason class, opened time, required proof classes, current recovery posture, safe next action, suspended Recipient Access count and opaque identifiers, and ETag. It contains no Account/Deal/client/file/recipient content. `SecurityRecoverySessionProjection` exposes only restriction identity, permitted recovery operation codes, security epoch, issue/expiry, and completed-proof posture.

`DeletionStatusGrantCreate` contains one exact `deletion_request_id`. `DeletionStatusGrant` returns the opaque `token` once plus that request ID, privacy-safe projection version, and `expires_at` no later than 15 minutes. A deletion-status `DeletionRequest` response contains only scope class, stage, accepted/access-removed/active-deletion-target/backup-expiry-target/preservation/terminal times as applicable, privacy-safe resource counts, preservation category, completion outcome, and receipt verification digest/public integrity link. It contains no Account/Deal content, ordinary Audit links, billing data, or another command link.

### 23.3 Deal and setup schemas

`DealCreate` is the identity-confirmation boundary and requires:

- `display_name`;
- `represented_party`;
- `transaction_subject` and explicit `transaction_perimeter` inclusions/exclusions;
- `banker_role_or_side` from the V1 supported sell-side catalog;
- `mandate_objective`;
- `transaction_type` from the controlled catalog;
- `business_stage`;
- `intended_purpose` and `intended_audience`;
- `base_currency` as an ISO 4217 code and exact `reporting_units`;
- exact `purchase_authority_acknowledgement_id`;
- `deal_authority_basis` and preliminary `expected_source_use_authority`;
- `confidentiality_class` and explicit `employer_or_client_restrictions`, including an explicit `none_known` posture;
- `intended_processing_path`, `expected_file_families`, `expected_template_posture`, `provider_restrictions`, and optional `special_structures`; and
- the Actor's confirmation that the identity and initial perimeter are correct.

The client cannot choose `setup_mode`. The server derives expanded First Deal Guide versus compact Setup from authoritative Account Deal history, and every new Deal is created as a Preflight-Restricted Deal Workspace. `Deal` adds `guide_mode`, `processing_posture`, current Output Ceiling links, independent lifecycle postures, subscription capability, and an ETag. The API does not infer a new Deal identity from files. Material changes to identity-defining fields require a new linked Deal.

### 23.4 Upload schemas

`UploadSessionCreate` is:

```json
{
  "files": [
    {
      "client_file_id": "local-1",
      "display_name": "Management Accounts.xlsx",
      "byte_length": "8421371",
      "media_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "sha256": "hex-encoded-digest",
      "source_declaration": {
        "source_material_id": null,
        "new_source_material_name": "Management accounts",
        "origin": "client_supplied",
        "authority_basis": "provided_under_mandate",
        "intended_purpose": "financial_analysis"
      },
      "rights_posture_inputs": {
        "receipt_permitted": true,
        "processing_operations": ["quarantine", "parse", "analyze"],
        "conditions": []
      },
      "confidentiality_posture": {
        "confidentiality_class": "confidential",
        "de_identification_posture": "not_de_identified"
      },
      "processing_posture": {
        "expected_file_family": "xlsx",
        "special_structures": []
      }
    }
  ],
  "purpose": "source_intake",
  "operation_preview_id": "0197b…",
  "consent_digest": "sha256:…"
}
```

The Deal variant fixes `purpose` to its closed Deal intake/reimport catalog and uses the matching Deal Operation Preview. The Account variant fixes `purpose` to `account_reusable_template`, accepts exactly one file plus a rights/clean-template declaration and compatibility intent, uses an Account Operation Preview, and rejects Source Material, Source Record, live Deal, or promotion identifiers.

`UploadSession` contains its Account, optional Deal, closed purpose, `expires_at`, `max_files`, `max_total_bytes`, and per-file entries with `server_file_id`, `tus_url`, non-secret `tus_headers`, `offset`, `state`, and `problem`. `tus_headers` never contains `Authorization`, Cookie, a Supabase token, or another reusable credential; the browser obtains the fresh Supabase Bearer separately before every TUS request. The server may reject a file declaration before transfer. A finalization result is an `ItemOutcome` per requested file and may therefore be partially successful.

### 23.5 Source and Evidence schemas

`SourceRecord` includes stable `source_material_id`, immutable content digest, record dates, declared authority, classification/rights/condition/reliance references, and immutable representation IDs. `SourceRepresentation` includes representation type, coverage, protected object reference metadata, parser profile, and processing result; it does not expose object-store coordinates.

`NativeLocator` is a typed value such as workbook/sheet/cell-range, document/page/paragraph, presentation/slide/shape, or web-observation selector. `Evidence` requires one exact Source Record, one exact Representation, one Native Locator, one atomic proposition, one relationship type, and a bounded reliance scope.

### 23.6 Quantitative and analytical schemas

Quantitative values use exact decimal strings:

```json
{
  "value": "1234567.89",
  "unit": "currency",
  "currency": "USD",
  "scale": "1",
  "period_start": "2025-01-01",
  "period_end": "2025-12-31",
  "as_of_date": null
}
```

Floating-point JSON numbers are prohibited for money, percentages, ratios, multiples, and other decision-relevant quantities. Calculation and analysis outputs carry exact input/dependency IDs, formula or method version, unit/period semantics, and lineage references.

`DeterministicValidationRecord` contains declared applicability; one closed typed target; exact tested input and version IDs; rule-set, rule, and non-AI engine identities; declared and achieved coverage; result; structured exceptions; unresolved-judgment posture; evaluated time; originating Job/Attempt; and exact gates cleared or created. A passing result cannot imply Professional Usability or clear a gate not named in the record.

`RecommendationCreate` is a closed human-authored schema containing the proposed course, purpose/audience, exact Evidence/Facts/Assumptions/Calculation Runs/Analysis Versions, alternatives, trade-offs, conditions, invalidation triggers, and optional superseded Recommendation. It cannot assert a Human Decision. AI-origin Recommendations use only the typed AI Proposal acceptance operation.

### 23.7 Typed Human Decision command fields

There is no generic Human Decision write endpoint or authoritative `{type, id}` target. Each purpose-specific command uses a closed request schema and typed relational target. Every such request includes:

- one exact typed target with an immutable version ID or required current ETag;
- the exact decision question and permitted result variant for that command;
- considered alternatives;
- exact Evidence and conflict references;
- rationale;
- scope, conditions, and revisit triggers; and
- explicit Actor confirmation.

Fact acceptance, Assumption approval, conflict resolution, Buyer approval, Bid selection, stage transition, QC Finding disposition, impact disposition, and External-Use Decision each have a separate endpoint and schema. The resulting Human Decision is immutable and links its typed business result. A correction creates another typed Human Decision that supersedes the original; it does not mutate history.

### 23.8 Job schema

```json
{
  "id": "0197f…",
  "job_type": "analysis_run",
  "state": "queued",
  "progress": {
    "completed_units": "0",
    "total_units": "4",
    "message_code": "awaiting_capacity"
  },
  "scope": [{ "resource_type": "analysis", "resource_id": "0197e…" }],
  "blocked_by": [],
  "result": null,
  "problem": null,
  "created_at": "2026-08-04T06:00:00Z",
  "updated_at": "2026-08-04T06:00:00Z"
}
```

`progress.message_code` is safe, localized by the client, and not free-form source content. `total_units` is present only when the Job declared a stable, exact unit set before execution; otherwise it is omitted, and clients must not fabricate a percentage. No Job percentage establishes Deal, Package, readiness, or cross-lane completion. `result` contains Resource Links to real created resources. `problem` is the same stable Problem shape without an HTTP-only `instance` requirement.

### 23.9 External-use schemas

`ExternalUseDecisionCreate` requires the exact immutable artifact/Revision scope, recipient identity or recipient class, intended use, channel, allowed operations, confidentiality conditions, expiry, rationale, and confirmation. The server rejects `allowed_operations` containing `download` for Recipient Access.

`RecipientAccess` exposes its exact current posture as `active`, `suspended`, `expired`, `revoked`, or `invalidated`, plus current posture version and only the suspension causes/details authorized to the Banker. `RecipientAccessResumptionCreate` binds the current Access ETag, exact cleared-suspension-set digest, and server-recomputed immutable Access/Decision/Revision/Recipient/purpose/condition dependency digest. The client cannot request a new expiry, replace a dependency, or reuse an old Recipient Session.

`ReaderCopy` JSON contains only a safe title, safe display metadata, watermark posture, authorization expiry, and current protected-stream capability. Reader-facing Deal content is never embedded in JSON and is obtained only through the Protected Object Gateway. The response omits internal lineage, comments, work notes, hidden spreadsheet content, source bytes, and unrelated Deal data.

### 23.10 Deal history schema

`DealHistoryEvent` is a user-facing immutable history entry containing:

- `id`, `deal_id`, and a closed `event_type`;
- exact Actor or Principal Reference and `origin`;
- `occurred_at` when business-effective time applies and mandatory `recorded_at`;
- one canonical typed object link and the exact immutable version, Revision, or current-root ETag observed by the event;
- a closed `result` plus safe reason/recovery code where applicable;
- `history_posture` as `current`, `historical`, `corrected`, `superseded`, `reversed`, or `invalidated`; and
- canonical links to the current object, original event, correction/reversal, and related Decision or Job when authorized.

The endpoint filters only on the declared fields above and uses the standard cursor contract. It never edits current domain state, flattens an Audit Event into user-facing history, or exposes restricted provider/security metadata.

### 23.11 Protected Object Stream Grant schema

```json
{
  "token": "opaque-single-purpose-token",
  "protected_object_id": "0197d…",
  "attachment_scope": "deal",
  "attachment_id": "0197c…",
  "operation": "read",
  "expires_at": "2026-08-04T06:01:00Z",
  "stream_url": "/objects/0197d…"
}
```

`attachment_scope` is the closed value `account` or `deal`; the operation-specific response also carries the exact typed attachment link and the applicable immutable Revision or attachment digest. The token is returned only at creation time, excluded from logs, and never persisted by browser application state beyond the immediate stream request.

### 23.12 ItemOutcome schema

```json
{
  "item_id": "0197c…",
  "outcome": "succeeded",
  "resource": { "type": "notification", "id": "0197c…" },
  "problem": null
}
```

`outcome` is `succeeded` or `failed`. Failed entries contain a stable Problem. The server does not use HTTP `207`; the operation-level HTTP status is `200` after the complete item-outcome set is known.

## 24. Permission and control matrix

V1 has one named Individual Banker per Account. It does not predefine an Owner/Member hierarchy, Deal membership, delegated approver, or support-content role. External Recipient authority is separate and exact-Revision-bound. This table is the HTTP summary; the normative session, posture, Runtime Principal, database, storage and denial matrix is the [Permission Model](permission-model.md).

| Operation class | Individual Banker | External Recipient | Sensitive Grant | ETag / immutable precondition |
|---|---:|---:|---:|---:|
| read own Account and Deal resources | yes | no | no | no |
| create ordinary Deal work and drafts | yes | no | no | ETag for mutable target |
| record Human Decision | yes | no | only when the Decision itself is a named sensitive action | exact target required |
| change subscription / billing control | yes | no | required only for named destructive or entitlement-reducing mutation | target Subscription, Checkout Order, or other named mutable commercial aggregate ETag; Account ETag only for Account-root mutation |
| export Account or Deal data | yes | no | yes | exact scope and current ETag |
| delete Account or Deal | yes | no | yes | current Account/Deal ETag |
| create/revoke External-Use Decision or create delivery | yes | no | yes | exact immutable Decision/artifact scope |
| create Recipient Access | yes | no | yes | exact immutable Decision/Scope digest; recipient-specific Delivery is created atomically |
| revoke Recipient Access | yes | no | yes | current Recipient Access `If-Match` |
| resume suspended Recipient Access | yes, only after every cause clears and exact bindings remain unchanged | no | yes | current Access ETag plus exact suspension/dependency digest |
| Security Recovery Session operation | only through the recovery allowlist; no ordinary Account/Deal authority | no | required for a recovery mutation | restriction ETag/security epoch |
| inspect deletion status after normal access removal | only as the same Deletion Status Claimant | no | Deletion Status Grant, not Sensitive Action Grant | exact Deletion Request/projection version |
| issue protected Account or Deal object stream | yes | no | required for archive/export; ordinary authorized view follows the exact typed attachment policy | exact protected object and immutable Account attachment or Deal Revision |
| view frozen Reader Copy | no | yes | no | Recipient Session and current access state |
| inspect authorized security Audit Event detail | yes, subject to fresh-factor read gate | no | no; this Grant authorizes mutations only | no |

Every route also enforces subscription capability, Deal activity/record/business-stage posture, Payment Dispute, Account Security Restriction, Post-Term Access, Output Ceiling, source rights, classification, dependency, suspension, and retention/deletion state. Possession of a resource ID never bypasses these gates.

## 25. Operation-wide error expectations

| Operation family | Principal expected failures beyond common auth/query errors |
|---|---|
| upload/finalize | `upload_limit_exceeded`, `upload_session_expired`, `upload_offset_mismatch`, `file_digest_mismatch`, `malware_detected`, `scan_incomplete`, `unsupported_media_type` |
| source acceptance | `classification_required`, `rights_not_permitted`, `source_condition_blocked`, `source_reliance_blocked`, `compatibility_blocked` |
| analysis/artifact Jobs | `dependency_blocked`, `dependency_changed`, `output_ceiling_exceeded`, `commercial_capacity_exhausted`, `ai_contract_failed`, `compatibility_blocked` |
| mutable transition | `precondition_required`, `version_conflict`, `invalid_state_transition`, `deal_lifecycle_blocked`, `post_term_restricted` |
| bulk | `bulk_limit_exceeded`, item-level stable Problems, or whole-request `atomic_operation_failed` |
| external use | `sensitive_action_grant_required`, `sensitive_action_grant_scope_mismatch`, `sensitive_action_grant_command_mismatch`, `external_use_scope_mismatch`, `recipient_access_revoked`, `recipient_access_expired` |
| protected stream | `object_grant_invalid`, `object_grant_expired`, `object_grant_scope_mismatch`, `range_not_satisfiable` |
| Recipient verification | `recipient_link_invalid`, `recipient_link_expired`, `recipient_code_invalid`, `recipient_code_expired`, `recipient_attempts_exhausted`, `recipient_send_limit_exceeded` |
| Job control | `job_not_cancelable`, `job_not_retryable`, `event_cursor_expired` |

An endpoint may return another registry code when a cross-cutting gate fails. It may not substitute an unregistered string or leak a provider error.

## 26. OpenAPI, compatibility, and release rules

1. Canonical TypeScript request/response validators generate one OpenAPI 3.1 document during CI.
2. CI fails when routes and generated contracts diverge, operation IDs collide, a response lacks a registered schema, or an error code is absent from the registry.
3. The OpenAPI artifact is retained as an internal build artifact and used for contract tests and typed-client generation. Production exposes neither Swagger UI nor the raw internal OpenAPI document.
4. V1 evolution may add optional response fields, new endpoints, and new error codes. A new value for a closed security or domain enum requires a breaking-contract review and cannot be made non-breaking merely by labeling the field forward-tolerant.
5. Removing or renaming a field, changing meaning, tightening a previously valid request, changing an idempotency identity, or changing authorization semantics requires `/api/v2` or a proven non-breaking migration contract.
6. Request schemas reject unknown fields. Response consumers must ignore unknown fields while preserving known invariants.
7. Deprecation is declared in the generated schema and release notes before removal from a later major API version.
8. A production release must pass schema validation, authz negative tests, idempotency replay tests, ETag race tests, SSE replay tests, protected-stream tests, and generated-spec diff review.

## 27. Traceability to User Flows

| User Flow | Principal API coverage |
|---|---|
| UF-01–UF-04 | public proof, qualification, Account session, checkout, resume projection |
| UF-05–UF-09 | Deal, Preflight, upload, Source Material/Record, Source Packet, Work Objective |
| UF-10–UF-15 | Guide, Jobs, Evidence/Claim/Fact/Assumption, Human Decision, graduation |
| UF-16–UF-20 | Deal work, lifecycle, parties/buyers/NDA/access/Bids, Execution Package |
| UF-21–UF-22 | Internal Controlled Export, protected stream, reimport, new Revision |
| UF-23–UF-26 | Sensitive Action Grant, External-Use Decision, delivery, Recipient Access, actual-use event |
| UF-27–UF-28 | Impact Assessment, dependency change, new controlled Revision |
| UF-29–UF-34 | lifecycle transitions, cancellation, Post-Term Access, Deal/Account deletion |
| UF-35–UF-38 | Problems, Job recovery, empty collections, notifications, device projection |

## 28. Explicitly forbidden API patterns

The V1 API must not expose:

- browser-direct PostgreSQL, Supabase Data API, object-store paths other than the exact Upload-Session-bound quarantine TUS path, AI-provider, Stripe, Resend, or Supabase Auth administrative calls;
- generic `PATCH`, `PUT`, `DELETE`, `/commands`, `/execute`, or arbitrary field mutation;
- generic query DSLs, arbitrary `expand`, GraphQL, WebSocket, or browser-direct queue protocols;
- raw provider errors, secrets, signed storage URLs, encryption material, internal prompts, raw model reasoning, or hidden audit data;
- a Recipient download endpoint, permanent bearer URL, or Banker-cookie shortcut into Recipient scope;
- silent dependency rebasing, silent current-version substitution, cross-Deal object attachment, or mutation of immutable history;
- automatic promotion of AI output into Fact, Human Decision, external authorization, or released artifact; or
- a generic Command Receipt in place of the real resource or durable Job.

## 29. Verification obligations, not open product decisions

These items require implementation evidence before launch but do not reopen the confirmed API design:

- verify Supabase SSR Cookie and Bearer handling, JWT/JWKS validation, Session limits, Magic Link, required experimental Passkey registration/login/recovery/reauthentication, security-epoch revocation, and Admin API isolation against pinned SDK/configuration and production-shaped probes;
- verify exact Stripe and Resend signature algorithms and replay windows against pinned provider SDK versions;
- load-test the configured request, SSE, upload, Recipient, and expensive-operation rate limits and record the exact quotas in the Integration Spec;
- verify TUS header refresh, upload expiry, digest validation, and quarantine isolation against the selected Supabase runtime;
- verify SSE replay retention and proxy buffering behavior in the production topology;
- test Recipient link-scanner behavior, OTP abuse controls, cookie expiry, revocation, and first-stream External-Use Event atomicity;
- verify single-range streaming, `206`/`416`, cache headers, and grant revocation through the protected gateway;
- verify purpose-separated integrity keys and historical JWK retention against every retained signed manifest; and
- exercise cross-Account, cross-Deal, Post-Term Access, deletion-in-progress, and stale-ETag denial paths in contract tests.

## 30. Completion criteria

This API Spec is complete for implementation planning when:

- every V1 User Flow maps to an operation family;
- every operation has a stable operation ID, method, path, request shape, success shape, auth boundary, and stable failure family;
- all Deal mutations are explicitly scoped and pass through product authorization;
- idempotency, optimistic concurrency, asynchronous Jobs, SSE, uploads, protected streaming, Recipient access, Webhooks, and error recovery are normative;
- the schema catalog preserves immutable identity, exact dependencies, decimal precision, and no-download semantics;
- OpenAPI generation and compatibility gates are testable; and
- no endpoint contradicts `CONTEXT.md`, an accepted ADR, the Data Model / ERD, the AI Prompt & Contract Spec, or approved UX flows.
