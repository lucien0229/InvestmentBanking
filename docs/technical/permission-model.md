# Permission Model

**Product:** HelloX Investment Banking — Individual-First V1  
**Status:** Confirmed design contract  
**Confirmed:** 2026-08-05  
**Scope:** Human, recipient, runtime, resource, posture, database, storage, and recovery authorization boundaries for V1

## 1. Purpose

This document is the normative V1 principal-to-action-to-resource authorization contract. It defines:

- which human, recipient, runtime, provider-ingress, and operator principals exist;
- which sessions and narrow grants may represent them;
- how Account, Deal, exact object, immutable version, Revision, Job, protected bytes, Audit, and deletion-status scopes compose;
- which operations each principal may perform under every applicable lifecycle, commercial, security, and deletion posture;
- where fresh authentication, Sensitive Action Grant, Deletion Status Grant, Job Scope, or Protected Object Stream Grant is required;
- how API policy, domain invariants, PostgreSQL RLS, typed procedures, Storage RLS, Worker result commitment, and the Protected Object Gateway enforce the same decision;
- how denial, non-enumeration, revocation, suspension, streaming interruption, and recovery behave; and
- which negative and adversarial evidence blocks production release.

It is not a configurable role-management system. V1 has fixed principal kinds and closed, versioned permission policies. Adding a new human role, Account relationship, Deal membership model, delegated approver, support-content path, impersonation path, or generic service credential is a product and architecture change, not a database row or dashboard toggle.

## 2. Authority and related documents

Authority is concern-specific:

1. the approved [Product Specification](../../.scratch/ai-investment-banking-productization-wayfinding/spec.md) owns product scope and behavior;
2. [CONTEXT.md](../../CONTEXT.md) owns canonical domain terms and distinctions;
3. accepted [ADRs](../adr) own hard-to-reverse architecture decisions;
4. approved documents under [docs/ux](../ux) own user-visible tasks and control reviews;
5. [Technical Design](technical-design.md) and [System Architecture](system-architecture.md) own the shared implementation and runtime topology;
6. [Data Model / ERD](data-model-erd.md) owns relational identity, tenancy, lifecycle, and transaction invariants;
7. [API Spec](api-spec.md) owns HTTP paths, request/response contracts, authentication transport, and stable Problems;
8. [Integration Spec](integration-spec.md) owns provider, queue, Worker, procedure, credential, and replay protocols; and
9. this Permission Model owns the complete principal, action, resource, posture, and enforcement-proof matrix.

The specialized documents must implement this matrix without creating a broader alternate permission path. A conflict is a documentation defect to correct in every affected document; implementation code, generated policies, tests, and runtime evidence do not silently redefine authority.

The following ADRs directly govern this model:

- [ADR 0006](../adr/0006-use-account-and-deal-as-authorization-boundaries.md): Account and Deal authorization boundaries;
- [ADR 0010](../adr/0010-use-clerk-for-v1-authentication.md): Clerk authentication and product-owned authorization;
- [ADR 0013](../adr/0013-do-not-implement-content-support-access-in-v1.md): no support-content access;
- [ADR 0025](../adr/0025-authorize-workers-through-job-scoped-runtime-principals.md): Job-scoped Worker authority;
- [ADR 0027](../adr/0027-stream-protected-deal-objects-through-a-dedicated-gateway.md) and [ADR 0034](../adr/0034-stream-typed-account-and-deal-protected-objects-through-one-gateway.md): protected-object streaming;
- [ADR 0036](../adr/0036-limit-operator-recovery-to-content-blind-immutable-replay.md): content-blind recovery;
- [ADR 0037](../adr/0037-suspend-reversible-recipient-access-restrictions.md): reversible Recipient Access suspension;
- [ADR 0038](../adr/0038-retain-a-minimal-deletion-status-claimant.md): deletion-status identity boundary;
- [ADR 0039](../adr/0039-fence-job-commits-at-workspace-posture-boundaries.md): Job commit fences; and
- [ADR 0040](../adr/0040-enforce-runtime-authorization-with-forced-rls.md): forced database authorization boundary.

## 3. Normative language and decisions

`MUST`, `MUST NOT`, `SHOULD`, and `MAY` are normative implementation requirements. `Allow` always means “allow only after every listed condition succeeds”; no table cell is a permission by resource possession alone.

The policy engine returns only `allow` or `deny`. HTTP response shaping may convert denial or absence to the same non-enumerating `404`, but it does not change the policy result. Missing policy registration, unknown principal, unknown action, unknown resource class, missing scope, stale version, unresolved posture, or policy-evaluation failure denies by default.

V1 authorization is a conjunction:

~~~text
allow = authenticated_principal
     AND permitted_session_mode
     AND action_in_fixed_allowlist
     AND exact_resource_visible
     AND account_scope_matches
     AND deal_scope_matches_when_required
     AND immutable_version_or_current_etag_matches
     AND every_active_posture_permits_action
     AND entitlement_and_capacity_permit_action
     AND rights_confidentiality_preflight_and_output_ceiling_permit_action
     AND required_narrow_grant_is_current_and_exact
     AND domain_invariant_accepts
~~~

There is no positive-authorization cache across requests. Within one transaction, the evaluated context is valid only for its declared action and exact resource set. A long query or stream must recheck at the boundaries defined below.

## 4. Fixed principal catalog

### 4.1 Human and recipient principals

| Principal | Authentication representation | Positive boundary | Explicit negative boundary |
|---|---|---|---|
| Prospective Banker | public request, bounded Project Northstar proof session, or authenticated onboarding identity before Deal authority | public offer, synthetic proof, qualification, Account access/onboarding, Checkout | no real Deal Material, production object ID, live AI/provider work, external delivery, or production Account/Deal query |
| Individual Banker Actor | valid Clerk Session resolved to the one active V1 Account-owner relationship | own Account and its Deals under exact policy and posture | no Team role delegation, cross-Account access, generic Deal membership, control bypass, provider-admin call, or direct database/storage access |
| Security Recovery Session | separate short-lived product session after Clerk recovery evidence and ownership-continuity verification | only the recovery allowlist in Section 10 | not an ordinary Banker Session; no Account/Deal content, billing, deletion, Deal work, export, or external-use authority |
| External Recipient | independent Recipient Session after exact link and mailbox-code verification | read one frozen Reader Copy for one exact valid Recipient Access | no Account/Deal membership, discovery, edit, comment, download, onward share authority, Native Artifact, other Revision, or Banker route |
| Deployment Operator | separately authenticated technical identity, mechanism intentionally deferred in V1 design | deployment and privacy-safe infrastructure recovery boundary only | no product human session, Account role, Deal row/content/decrypt path, impersonation, break-glass, or domain mutation |

Senior bankers, specialists, management, represented parties, Buyers, bidders, counterparties, counsel, and other transaction participants are Deal-domain parties. In V1 they are not product principals. Their information and decisions enter through the Individual Banker with provenance; Deal-domain status never grants application permission.

AI systems and deterministic engines are responsibility planes, not roles. Their executable access belongs to a purpose-specific Runtime Principal and exact Job Scope.

### 4.2 Non-human and ingress identities

| Identity class | Meaning | Never means |
|---|---|---|
| Runtime Principal | one separately credentialed deployed component with a closed purpose | Account membership, a human decision-maker, another runtime's authority, or unrestricted tenant access |
| Job Scope | short-lived database-issued authority for one claimed Job and typed resource set | a reusable Worker role, Deal membership, a queue-message capability, or permission after posture/version change |
| Provider Webhook sender | a verified provider event origin accepted into the durable Inbox | Product Entitlement, Actor authority, domain truth, permission to read, or permission to call another command |
| Project Northstar proof principal | a fixture-bound synthetic session | production Account, real Deal, conversion of fixture state into production state, or proof of live-provider readiness |

### 4.3 Principals that do not exist in V1

V1 has no Account Admin, Owner/Member hierarchy, Team Member, Deal Member, delegated approver, read-only colleague, support-content agent, customer-success viewer, compliance reviewer, operator Deal viewer, service Account member, customer API key, OAuth client, or external-recipient download role. A future role requires a new product decision, Data Model change, Permission Model version, migration, API review, RLS policy set, negative test corpus, and normally an ADR when the boundary is hard to reverse.

## 5. Session and narrow-capability taxonomy

| Representation | Bound identity and scope | Lifetime / consumption | What it authorizes |
|---|---|---|---|
| Clerk Banker Session | provider issuer/subject → Actor → active Account-owner relationship; current Account security epoch | provider/session controlled; rechecked every request | ordinary Banker operations permitted by current policy; not a sensitive mutation by itself |
| Security Recovery Session | same authentication identity, Actor, exact Account Security Restriction, purpose, security epoch | absolute lifetime ≤15 minutes; invalid after clearance or posture/version change | Section 10 recovery allowlist only |
| Sensitive Action Grant | Banker or eligible Recovery Session, Actor, action, exact typed resource, command digest, ETag/dependency digest, Idempotency-Key, nonce | fresh factor age ≤5 minutes; Grant expires in 5 minutes; single successful mutation | one exact named sensitive mutation |
| Recipient Session | exact mailbox proof, Recipient, Recipient Access, Decision, Revision, session hash | idle 15 minutes; absolute 8 hours; invalidated by suspension/revocation/invalidity | isolated read of one exact Reader Copy and its protected stream |
| Protected Object Stream Grant | exact human/session or runtime principal, object, typed attachment, Revision where applicable, purpose, operation/range | short-lived, hash stored, actively revocable | exact protected-byte stream only |
| Job Scope | Runtime Principal, Job/Step/lease, Account, Deal, posture version, typed inputs/outputs/operations | short-lived; revalidated at every accepted result commit | exact Job work only |
| Deletion Status Grant | same authenticated deletion claimant, exact Deletion Request and privacy-safe fields | no more than 15 minutes; read-only; reissued only after identity match | exact deletion status/receipt query after normal access removal |
| Synthetic Proof Session | exact Project Northstar fixture/version and bounded proof state | short-lived and isolated | synthetic proof operations only |

No representation may be converted into another by copying IDs or tokens. A Banker Session cannot substitute for Recipient Session; a Recipient Session cannot call Banker APIs; a Sensitive Action Grant cannot authorize a read or another mutation; a Job Scope cannot create human authority; an Object Grant cannot call JSON APIs; and a Deletion Status Grant cannot restore Account access.

## 6. Resource and scope model

### 6.1 Scope lattice

~~~mermaid
flowchart TD
    P["Public or synthetic fixture"]
    A["Account"]
    D["Deal"]
    R["Typed domain root"]
    V["Immutable version or exact current ETag"]
    O["Typed Protected Account or Deal Object attachment"]
    B["Exact byte range or stream purpose"]

    A --> D
    A --> R
    D --> R
    R --> V
    V --> O
    O --> B
    P -. "never promotes" .-> A
~~~

The diagram shows containment needed for validation, not inherited permission. Account authority does not grant every Deal action; Deal authority does not grant every object/version action; Revision permission does not grant protected bytes; and byte access does not grant JSON metadata or mutation.

### 6.2 Authoritative resource classes

| Resource class | Required scope | Important version/purpose boundary |
|---|---|---|
| Public offer, qualification, Project Northstar | public or exact synthetic session | no production identifiers or real material |
| Actor, Account, security, notification, commerce | exact Account and active Actor relationship unless an explicit surviving grant applies | Account ETag/security epoch, commercial aggregate ETag, action purpose |
| Deal Workspace and Deal-domain object | matching Account and Deal | Workspace posture/version plus exact root/current version where mutable |
| Source, Evidence, knowledge, analysis, process object | matching Account and Deal through typed tenant-bearing FKs | exact Source Record, locator, Evidence relation, model/version, or current ETag |
| Deliverable and Artifact | matching Account and Deal | exact immutable Revision, manifest member, hash, readiness purpose |
| External-Use Decision, Delivery, Recipient Access | matching Account and Deal | frozen Revision, recipient/audience, purpose, conditions, validity, exact artifacts |
| Protected Account Object | exact Account and typed Account attachment | immutable attachment and operation; never implied Deal/template conversion |
| Protected Deal Object | exact Account, Deal, typed attachment and applicable Revision | immutable object, purpose, range, current authorization posture |
| Job, Step, Attempt, Scope | stored Account and optional Deal plus exact Job identity | lease, operation class, typed membership, Workspace posture version |
| Audit Event and Checkpoint | exact Account; Deal link where applicable | event risk class, detail level, current access posture, fresh factor where required |
| Deletion Request and Tombstone projection | exact surviving Deletion Status Claimant/Grant after normal authority removal | privacy-safe field allowlist only |
| Provider/measurement/operational record | purpose-specific Runtime Principal | no human browse path unless projected into an authorized product resource |

Account identity is derived from the authenticated relationship and is not accepted from a normal Banker request as authority. Every Deal-scoped row and command carries and validates both `account_id` and `deal_id`. Child IDs that are globally unique still require the stored parent chain to match. Generic `{resource_type, resource_id}` authority, untyped attachment, cross-tenant join, and scope inferred from UI location are prohibited.

### 6.3 Current, historical, and deleted resources

- Immutable history remains readable only when the principal can read the owning scope and that history class under the current posture.
- Permission to mutate a current root never permits mutation of an immutable historical version.
- A corrected, superseded, reversed, or invalidated object remains historical; it does not silently inherit current authorization.
- Deletion-locked or physically removed resources are non-visible through normal routes even if an old ID, URL, ETag, Grant, queue message, or browser cache exists.
- Projections, search indexes, deep links, notifications, and Resource Links never widen authority; their targets are reauthorized against authoritative state.

## 7. Authorization decision sequence

Every protected API, procedure, Worker commit, and Gateway stream performs the applicable sequence below:

1. classify the ingress and authenticate the claimed human, recipient, runtime, proof, or provider origin;
2. resolve the durable product principal and reject disabled, unlinked, expired, revoked, or wrong-purpose identity;
3. validate session mode, security epoch, and current Account relationship or surviving claimant;
4. map the operation to a closed `permission_code`, allowed principal modes, resource resolver, posture policy, required Grant kind, and Audit class;
5. resolve the resource through its typed parent chain without disclosing a cross-scope existence result;
6. validate exact Account, Deal, root, version/Revision, attachment, recipient/audience, purpose, and operation;
7. intersect every active commercial, activity, record, security, retention, deletion, and resource-specific posture;
8. validate Product Entitlement, capacity, Paid Preflight, Output Ceiling, rights, confidentiality, processing compatibility, dependency state, and current Decision where applicable;
9. validate ETag or immutable dependency digest, Idempotency-Key, and the exact Sensitive Action, Deletion Status, Object, or Job Grant when required;
10. execute the typed domain invariant and database policy in one transaction;
11. for asynchronous work, issue only the exact Job Scope and repeat authorization at accepted result commitment; and
12. append the required domain history, Audit Event, access receipt, and safe Outbox identity in the same accepted transaction.

If steps depend on an external provider, verified provider data is evidence supplied to a product-owned transition; it never replaces steps 2–10.

## 8. Individual Banker base permission matrix

The matrix assumes a valid ordinary Banker Session, active Account-owner relationship, entitled and unrestricted Account, open/active Deal posture where a Deal is required, and all resource-specific gates satisfied. Section 9 applies additional restrictions conjunctively.

| Operation family | Base authority | Required exact scope / control | Explicit denial |
|---|---|---|---|
| View own Account, entitlement, usage, invoices, receipts, notifications | allow | Actor's one Account; invoice objects need exact Object Grant | another Account, provider-native hidden state, unrestricted payment metadata |
| Change notification preferences or ordinary subscription cancellation | allow | exact mutable aggregate and `If-Match` where required | security-critical notification suppression; provider redirect as authority |
| Create Checkout/capacity order or billing-portal session | allow | verified Offer/Order/current entitlement and displayed contract | price ID as permission, capacity before reconciled payment |
| Create Deal | allow | active entitlement, capacity, accepted identity/perimeter and Paid Preflight entry | Account transfer, cross-Account Deal, purchase as Source authority |
| Inspect/search own Deal, history, source, Evidence, analysis, process and Deliverable metadata | allow | matching Account/Deal and typed resource chain | hidden provider detail, unrelated object, generic search before tenant predicate |
| Upload/finalize/accept Source | allow | exact Upload Session, Deal or allowed Account-template purpose, rights/classification/preflight | arbitrary storage path, unsupported purpose, Source acceptance by upload success alone |
| Create ordinary professional work, Revision, Review, QC, Process Event or Human Decision | allow | exact current dependencies, ETag, applicable Evidence and domain gate | AI proposal as authority, immutable overwrite, stale dependency, autonomous external action |
| Change Deal Business Stage | allow | typed Human Decision/Process Event/Evidence and current ETag | stage as readiness, authorization, archive, or permission shortcut |
| Pause/resume/close/terminate | allow | exact lifecycle transition and current Workspace ETag | generic status assignment; pause/resume does not silently change business stage history |
| Archive/reactivate | allow | lifecycle contract, active-capacity check for reactivation; Archive waits for mutating Jobs | archive as outcome, silent Recipient revocation, grandfathered Job commit |
| Query Job/events; cancel/retry eligible work | allow | stored Account/Deal, exact Job ETag, declared recovery state | another Job by opaque ID, retry of permission/domain failure, cancellation rollback of accepted history |
| Account/Deal data export | allow with Sensitive Action Grant | exact frozen scope, current ETag/digest, all-or-nothing export contract | partial silent omission, reusable object URL, external-use implication |
| Internal Controlled Export | allow with Sensitive Action Grant | exact Deal, Revision/artifacts, purpose, manifest, limitations | circulation authorization or External-Use Event implication |
| Create/revoke External-Use Decision | allow with Sensitive Action Grant | exact Revision, artifacts, recipient/audience, purpose, conditions, validity | readiness as authorization; scope carry-forward to another Revision |
| Create Externally Authorized Delivery or Recipient Access | allow with Sensitive Action Grant | exact active Decision/Scope and frozen recipient/member set | autonomous send/share, changed artifact, delivery as proof of use |
| Revoke Recipient Access | allow with Sensitive Action Grant | exact Access and current ETag | rewriting prior use or released bytes |
| Resume Recipient Access | allow with Sensitive Action Grant | every suspension cause cleared; unchanged unexpired Access/Decision/Revision/Recipient/purpose/conditions | automatic resumption, expiry extension, old Session revival, resume after invalidity |
| Record product-external use | allow | exact artifact scope, recipient, purpose, channel and occurred time | claim that product observed an event it did not observe |
| View ordinary Deal history and Account Audit summary | allow | owning scope and permitted detail class | unrestricted provider/security details |
| View high-risk Audit detail | allow after fresh factor ≤5 minutes | Account scope and high-risk field projection | Sensitive Action Grant as a read elevation; deletion-locked ordinary Audit |
| Delete Account or Deal | allow with Sensitive Action Grant | exact typed identity, current ETag, frozen deletion perimeter | generic DELETE, self-service reversal, content read after acceptance |

Possession of a Sensitive Action Grant never waives a posture, entitlement, rights, confidentiality, current-version, exact-recipient, Decision, deletion, or domain constraint.

## 9. Posture and lifecycle policy

### 9.1 Composition and precedence

Postures compose by intersection. The product does not select the “most convenient” row. If an Archived Deal is also under an open Payment Dispute, only actions allowed by both rows survive. The effective order for safe evaluation is:

1. deletion lock and tombstone visibility;
2. Account Security Restriction and session mode;
3. paid-term, entitlement, Billing Recovery, Payment Dispute, and capacity;
4. Deal record posture (`open` or `archived`);
5. Deal activity posture (`active` or `paused`);
6. processing/preflight/rights/confidentiality/resource-specific gates; and
7. Deal Business Stage applicability.

Later evaluation cannot restore an action denied earlier.

### 9.2 Incremental posture matrix

| Posture | Banker may | Banker may not | Existing Recipient Access |
|---|---|---|---|
| Entitled, open, active | base matrix | actions denied by exact resource/control gates | remains independently subject to Decision, Revision, expiry and access posture |
| Paused Deal | inspect, search, permitted Internal Controlled Export, view/cancel Jobs, revoke Decisions/Access, resume, archive, delete | accept new Source, start substantive processing, commit new domain results, create Revision, advance readiness, authorize external use, deliver, create or resume Recipient Access, progress business stage | not automatically suspended or revoked; valid external reads may continue |
| Archived Deal | inspect, search, view history/artifacts, permitted Internal Controlled Export/data export, delete, reactivate if capacity permits | mutate Deal work, accept Source, start/retry substantive Job, create Revision/Decision/delivery/Access, revoke or resume Recipient Access, change business stage while archived | not automatically suspended or revoked; the pre-Archive review is the last opportunity to revoke without reactivation |
| Closed or Terminated Business Stage | no incremental permission reduction | only actions inapplicable under ordinary domain rules | no automatic effect |
| Post-Term Access | inspect existing Account/Deals, search, retrieve billing/retention status, create permitted Account/Deal portability and Internal Controlled Exports, delete | new Deal/work, Source acceptance, Job retry/rerun, capacity purchase, external Decision, delivery, sharing, new or resumed Recipient Access | all Access revoked before entry; resubscription never restores it |
| Open Payment Dispute | Account-owner inspection, existing history, permitted Internal Controlled Export, billing correction/reconciliation, deletion | new substantive work, capacity purchase, Account data export, External-Use Decision, delivery, new or resumed Recipient Access, ordinary lifecycle mutation not needed for the allowlist | every otherwise-active Access is suspended and all Sessions/stream grants invalidated |
| Account Security Restriction | only Security Recovery Session actions in Section 10 | every normal Banker operation, including content read/search/export, billing, capacity, deletion, Deal lifecycle/work, external-use action | every otherwise-active Access is suspended and all Sessions/stream grants invalidated |
| Deletion locked | obtain/read exact privacy-safe deletion status and completion receipt through Deletion Status Grant | every normal Account/Deal read, Audit read, export, mutation, Job, billing, external-use, recovery, or object-stream action | affected Access revoked; Sessions and grants invalidated |

Billing Recovery before the already-paid `paid_through` boundary preserves only the entitlement already purchased; it creates no new term, add-on, or capacity. If unresolved at the boundary it becomes Post-Term Access.

### 9.3 Pause and Archive concurrency boundaries

Pause commits immediately with a new Workspace posture version. The transaction stops new Job claims and invalidates Deal-scoped Job Scopes bound to the prior version. Running attempts may reach the next safe cancellation checkpoint, but every result-commit procedure observes the new version and rejects a new domain attachment. Public Job state becomes `canceled` when cancellation completes or `blocked` with the stable `workspace_posture_changed` reason when preserved work requires explicit recovery after resume. Already-committed immutable results remain history; an irreversible external effect completed before the boundary is recorded rather than hidden.

Archive is different: the request remains pending while the Banker-selected eligible Jobs finish or safely cancel. The record posture changes to `archived` only when every domain-mutating Job is terminal or canceled. Once archived, no stale Job Scope can commit. Read/export/deletion Jobs explicitly permitted by the archived posture use a newly issued Scope bound to that posture and cannot attach ordinary Deal work.

### 9.4 Payment Dispute resolution

Opening a Payment Dispute atomically creates or activates a suspension cause for every currently active Recipient Access in the Account and blocks concurrent new Access. A second cause may coexist with the dispute. Won or reversed provider evidence restores only the applicable remaining Product Entitlement and marks the dispute cause cleared; it does not change Access to active.

Recipient Access Resumption is permitted only when no active suspension cause remains and all original bindings still pass current policy. It appends an immutable resumption result, consumes its Sensitive Action Grant atomically, never extends Access expiry, and requires a new Recipient verification flow. A lost dispute ends the mapped paid term and revokes all affected Access before Post-Term entry.

## 10. Account Security Restriction and recovery

### 10.1 Entering the restriction

An Account Security Restriction is product-owned state created from an authenticated security action or reconciled security evidence, not directly from an untrusted redirect, email, Webhook field, or browser flag. Entry MUST atomically:

- advance the Account security epoch;
- deny ordinary Banker Sessions even when the underlying Clerk token remains cryptographically valid;
- revoke or invalidate every unconsumed Sensitive Action Grant and protected-object grant bound to the prior epoch;
- suspend every otherwise-active Recipient Access and invalidate its Sessions/stream grants;
- block new Job claims and invalidate Job Scopes whose operation could read or mutate Account/Deal content; and
- append a privacy-safe security Audit Event and notification intent.

It does not delete or rewrite the Actor, Account-owner relationship, Decision, Access, prior External-Use Event, or immutable history.

### 10.2 Security Recovery Session allowlist

| Operation | Allowed projection or effect | Additional control |
|---|---|---|
| Read restriction status | reason class, opened time, required proof classes, safe next action, current recovery version | no Deal/client/file/recipient content |
| Prove authentication/ownership continuity | attach verified Clerk recovery evidence and product-owned continuity result | exact challenge, bounded attempts, no provider result as automatic clearance |
| Recover or relink credential | bind a verified provider identity to the same durable Actor | cannot create a new Actor, Account transfer, Team relationship, or owner substitution |
| Invalidate own sessions or unused grants | revoke identities bound to the same Actor/Account | cannot target another Account or grant new authority |
| Inspect suspended-access inventory | count plus opaque Access identifier, suspension cause, expiry and posture | no Recipient email, Reader Copy, Deal title, Revision content, or Deliverable bytes |
| Clear restriction | close the exact restriction and advance security epoch | new fresh factor and exact Sensitive Action Grant; current restriction ETag/version |

Every other action denies. A Recovery Session cannot obtain an export, deletion, billing, Deal, ordinary Audit, Object, Job, external-use, or Recipient Access permission. Historical Banker Grants are unusable. Clearing the restriction invalidates the Recovery Session and does not revive any prior ordinary session, Sensitive Action Grant, Object Grant, Job Scope, Recipient Session, or Recipient Access. The Banker must authenticate again; each Access requires its own later Recipient Access Resumption.

Permanent Actor disablement or termination of the only Account-owner relationship does not become a recovery session. It denies future Account authority and revokes Recipient Access for which no accountable Account-side Actor remains. V1 supports no Account transfer fallback.

## 11. Sensitive Action Grant policy

### 11.1 Required action perimeter

The following mutation classes require a Sensitive Action Grant:

- Account Data Export, Deal Data Export, Archive Package object retrieval, and export-object retrieval where the API contract names the Grant;
- Internal Controlled Export;
- create or revoke External-Use Decision;
- create Externally Authorized Delivery;
- create, revoke, or resume Recipient Access;
- Account or Deal Deletion Request;
- Account Security Restriction clearance, credential/ownership recovery mutation, and another product-controlled Account security mutation; and
- any later action added to this perimeter through an approved Permission Model and API contract change.

Ordinary Human Decisions, Revisions, Deal Business Stage changes, pause/resume, close/terminate, archive/reactivate, ordinary Job controls, ordinary subscription cancellation, and read-only high-risk Audit access do not require this Grant. A Human Decision that specializes as an External-Use Decision follows the external-use rule, not the ordinary-Decision rule.

### 11.2 Issuance and atomic consumption

Issuance requires fresh Clerk factor evidence no older than five minutes and binds:

- exact authenticated session mode and session hash;
- Actor and Account;
- closed action code;
- one typed resource extension;
- canonical command body digest;
- current mutable ETag or immutable dependency digest;
- exact Idempotency-Key hash;
- issued time, five-minute expiry, and nonce hash; and
- current security, Account, Deal, Access, and resource posture versions needed by that action.

The database stores only the opaque token hash. Grant and mutation are consumed in one successful transaction. Failure before acceptance leaves it unconsumed but does not extend expiry. Idempotent replay after commit returns the prior result; it does not consume again or issue a new capability. A changed body, resource, action, ETag, dependency, Idempotency-Key, session, security epoch, or posture requires a new Control Review and Grant.

### 11.3 No elevation by possession

The Grant is a command capability, not a role. It cannot:

- make a hidden/cross-tenant resource visible;
- waive entitlement, Post-Term, dispute, security, pause, archive, deletion, rights, confidentiality, readiness, or Decision gates;
- authorize another resource or a broader collection;
- authorize a read merely because the read is sensitive;
- survive session invalidation, Account Security Restriction, deletion lock, or bound posture/version change; or
- be delegated to a Recipient, Worker, Operator, provider, or browser storage path.

## 12. External Recipient policy

### 12.1 Access creation and verification

Only the Individual Banker may create Recipient Access, under an active matching External-Use Decision and Sensitive Action Grant. Creation freezes the exact Recipient mailbox identity, Delivery, Decision/Scope, Revision, Reader Copy, artifacts, purpose, conditions, and expiry. It does not establish Account membership or prove external use.

The public verification sequence remains:

1. exchange the fragment-carried one-time link secret within 15 minutes;
2. send and verify the email code within 10 minutes, with at most five attempts, a 60-second resend cooldown, and three sends per challenge; and
3. create a Recipient Session with 15-minute idle and eight-hour absolute limits.

Link scanners, GET requests, viewer-shell loads, and failed challenges create no Session or External-Use Event. Proof establishes control of the exact mailbox only.

### 12.2 Recipient request matrix

| Recipient operation | Result | Required current checks |
|---|---|---|
| Exchange exact link / verify code | allow when challenge valid | token/code hash, exact Access, attempts, expiry, suspension/revocation/invalidity |
| Read Recipient Session metadata | allow | session hash, idle/absolute expiry, Access and Decision current posture |
| Read frozen Reader Copy metadata | allow | exact Recipient, Access, Revision, Decision, purpose, conditions, expiry and no active suspension |
| Obtain Reader Copy Object Grant | allow | same checks plus current Reader Copy ETag and exact protected attachment |
| Stream Reader Copy | allow | same checks at start, range request, and bounded stream checkpoints |
| Logout | allow | exact Recipient Session; clears Cookie and revokes session hash |
| List/search Account, Deal, Revision, Recipient, Delivery, history, Audit, or object collections | deny | never part of Recipient authority |
| Download, edit, comment, upload, create/share link, view Native Artifact, or invoke a command | deny | no V1 permission exists |

Suspended, expired, revoked, invalidated, cross-scope, and nonexistent Access are externally non-enumerating. The Recipient receives the same safe unavailable posture. A Banker may see the exact internal reason only through the authorized Account/Deal surface.

### 12.3 Suspension, revocation, and released bytes

Suspension denies prospective reads without rewriting prior authorization or use. It invalidates all current Recipient Sessions and their Object Grants. Clearing a suspension cause does not restore access or sessions. Explicit resumption must satisfy Section 9.4.

Revocation, expiry, Decision invalidation/revocation, Revision invalidation, deletion, paid-term end, and permanent loss of an accountable Actor are terminal for the affected Access. Past External-Use Events and stream receipts remain immutable historical facts. The product makes no claim to recall, delete, or prevent use of bytes already displayed or captured outside the product.

## 13. Runtime Principal permission matrix

Runtime credentials are separate by purpose and environment. Reusing code or images does not permit credential reuse. No runtime receives a universal Supabase service-role credential.

| Runtime Principal | May access | Must not access |
|---|---|---|
| Web | public/authorized API responses and user-bound HTTP session transport | PostgreSQL, Storage service credential, provider secret, KMS, queue, arbitrary object bytes |
| API / control plane | typed domain queries/commands, identity mapping, policy context, Outbox, exact object metadata, provider adapter entrypoints | unrestricted protected-object plaintext, arbitrary KMS unwrap, generic RLS bypass, Worker-only scope |
| Protected Object Gateway | exact authorized stream procedure, one typed protected object, applicable KMS unwrap and byte range, access receipt append | object listing, unrelated attachment, domain mutation, general query, reusable URL, another KMS purpose |
| Outbox Dispatcher | committed Outbox identity, claim/publish state, PGMQ routing | Deal content, protected bytes, domain decision, provider call |
| Measurement Projector | private measurement definitions/events and rebuildable projections | Deal content, domain/Audit authority, entitlement mutation, arbitrary telemetry source |
| Light Worker | claimed Job's typed structured inputs, approved AI/provider path, result staging and commit procedure | unscoped Deal query, human Decision, direct authoritative transition, arbitrary network/storage listing |
| Heavy Worker | claimed Job's typed protected inputs, bounded decrypt/workspace, approved OCR/Office/sandbox path, result staging and commit procedure | persistent plaintext, unscoped object read, in-process untrusted execution, authoritative business mutation |
| Public Fetch Coordinator | claimed public-Web Job, fixed public-fetch sandbox profile, staged Observation proposal | Deal decrypt, private network, arbitrary URL scheme, product/provider secret beyond its fixed purpose |
| Sandbox Supervisor / sandbox | validated execution profile, exact mounts/limits/command; public network only for fetch profile | product database, long-lived credential, arbitrary image/command/mount, host API, extra network |
| Artifact Signer | exact canonical Artifact Manifest digest and Artifact KMS signing operation | Deal browse, Audit key, arbitrary input/key operation |
| Audit Signer | exact canonical Audit Checkpoint digest and Audit KMS signing operation | Deal browse, Artifact key, arbitrary input/key operation |
| Retention Executor | claimed deletion task, exact typed resource/provider locator, deletion/verification procedure | search, policy choice, scope expansion, preservation override, arbitrary delete |
| Backup Executor | fixed backup/copy/verification surfaces and no-resurrection check | interactive Deal browse, business mutation, product user session |
| Migration owner | offline migration and ownership operations in controlled release window | online product traffic, pooled runtime connection, Web/API/Worker/Operator credential reuse |

Provider credentials are not Runtime Principals. They are secret material assigned to exactly one runtime purpose and may call only the allowlisted provider operation. A provider response cannot confer a broader product permission.

## 14. Job Scope and result-commit authorization

### 14.1 Scope issuance

A Worker claims an eligible Job Step through its role-specific procedure. The database issues a Job Scope binding:

- Runtime Principal and credential version;
- Account, Deal when present, Job, Step, Attempt, and active lease;
- closed operation codes;
- typed Source Record, Source Representation, protected object, analysis version, Deliverable Revision, or AI Task memberships;
- permitted read, stage, and proposed-result classes;
- Workspace posture version, security epoch, cancellation posture, issued time, and expiry; and
- canonical scope digest.

Queue messages contain safe routing identities only and never carry this authority. The Worker cannot add a membership, widen a scope, replace a version with current, or convert staged output into accepted state.

### 14.2 Commit-time reauthorization

Every accepted result procedure revalidates Runtime Principal, credential version, Job/Step/Attempt/lease, Job Scope, typed membership, current Account/Deal/security/posture version, cancellation, rights, classification, preflight, dependency versions, output contract, and unique prior effect. It attaches a result at most once and records Audit/Outbox state in the same transaction.

Pause invalidates the old posture version immediately. Archive issues no ordinary write Scope and waits for existing mutating work to finish/cancel. Account Security Restriction, deletion lock, rights withdrawal, Decision invalidation, dependency change, or explicit cancellation similarly blocks affected commitment. A stale Worker may upload only to bounded unattached staging; retention removes rejected/unattached objects under the confirmed clock.

### 14.3 Human and AI boundary

Runtime authority may produce deterministic results, AI Proposals, Evidence Candidates, artifacts, validation records, and other explicitly typed Job results. It cannot directly create a Fact, Human Decision, Process Event, Professional Usability judgment, External-Use Decision, Recipient Access, External-Use Event, or provider-external business action unless the exact non-AI automated effect is separately defined and authorized by the owning command contract. AI output never expands its Job Scope.

## 15. PostgreSQL authorization architecture

### 15.1 Role and ownership invariants

Under [ADR 0040](../adr/0040-enforce-runtime-authorization-with-forced-rls.md):

- every online product database login/group is `NOBYPASSRLS` and is not the owner of an authoritative table;
- every authoritative Account- or Deal-bearing table uses `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`;
- runtime roles receive only the schemas, tables, sequences, and functions required by their matrix row;
- schema/table ownership belongs to offline migration or dedicated `NOLOGIN` function-owner roles;
- `PUBLIC` receives no execute privilege on elevated functions and no core-schema table privilege;
- the Supabase/PostgREST Data API exposes no core business schema; and
- Deployment Operator, Web, browser, Recipient, and provider identities receive no direct PostgreSQL role.

Managed-platform administrative identities may exist for Supabase operation but are not application credentials, product fallbacks, or operator content paths. Their use is outside normal product traffic and must not be exposed to product containers.

### 15.2 Transaction-local authorization context

The API, Gateway, and Worker roles cannot set trusted authorization GUCs directly. An allowlisted validating entry function establishes transaction-local context only after resolving the current database records for the declared mode. The context contains only fields required by the operation, such as:

- principal mode and Actor or Runtime Principal ID;
- Account and optional Deal;
- authenticated/recovery/recipient session hash identity;
- Account security epoch and Workspace posture version;
- request and permission code;
- exact Sensitive Action, Deletion Status, Object, or Job Scope identity when applicable; and
- transaction-start authorization time.

The function rejects a missing/disabled identity, inactive Account relationship, wrong session mode, wrong tenant chain, expired/revoked Grant, stale epoch/version, or permission code not allowlisted for the caller role. Context is set with transaction-local semantics, never connection-global state. A request uses one explicit transaction; pooled connections run reset/discard verification before reuse, and tests prove no context leaks across tenants or modes.

### 15.3 RLS policy requirements

RLS policies MUST:

- define both visibility and `WITH CHECK` for insert/update paths;
- require matching Account, and matching Deal for Deal-scoped rows;
- use typed parent keys or composite FKs rather than client-supplied IDs;
- distinguish normal Banker, Security Recovery, Recipient, Runtime/Job, retention, audit-signing, and migration modes;
- apply the authoritative tenant predicate before full-text or vector ranking, pagination, or projection lookup;
- prevent historical/current or Account/Deal object confusion;
- deny mutation of append-only/immutable rows except through typed correction/reversal procedures; and
- return no cross-tenant existence signal through count, conflict, unique violation, timing-sensitive preflight, or error detail.

Global catalog/configuration tables with no tenant data still require explicit read/write grants and versioned loaders; `FORCE RLS` is mandatory for tenant authority, not a substitute for least privilege on global tables.

### 15.4 Elevated functions

Any `SECURITY DEFINER` function is a closed application interface. It MUST have a fixed `search_path`, fully qualified objects, typed resource parameters, explicit tenant validation, revoked `PUBLIC` execution, dedicated owner, narrow caller grants, bounded result shape, Audit classification, and adversarial identifier-substitution tests. A function that accepts arbitrary table, column, operation, SQL, object kind, or UUID as authority is prohibited.

Writes use purpose-specific procedures when cross-table invariants, Grant consumption, immutable history, result attachment, deletion, or posture transitions must be atomic. Ordinary RLS-protected reads may use prepared SQL through the owning runtime role; they do not receive a read-all helper.

## 16. Storage, protected objects, and streaming

### 16.1 Browser-direct storage exception

The only browser-direct production storage path is an exact, unexpired quarantine TUS Upload Session. Storage RLS binds Clerk identity, Actor, Account, required Deal or the single `account_reusable_template` purpose, exact path, Upload Session, lifecycle, size/count constraints, and fresh bearer token on each TUS request. It permits no list, preview, overwrite/upsert, path change, accepted-object write, protected-object read, or post-expiry transfer.

All accepted Protected Account and Deal Objects are private and application-encrypted. They are reachable only through a typed attachment and the Protected Object Gateway; storage keys, bucket paths, signed provider URLs, encryption metadata, and KMS identities are not product permission.

### 16.2 Stream authorization

Before streaming, the control plane/Gateway validates the principal session, exact Object Grant, protected object, typed immutable attachment, Account/Deal, Revision when applicable, purpose, operation, requested range, current posture, expiry, and revocation. The Gateway has no object-list or general domain-query operation.

Authorization is checked:

- when the Object Grant is issued;
- when each HTTP stream/range request begins;
- before a new range is accepted; and
- at bounded checkpoints during a long response using an implementation value verified by the launch stream-revocation test.

Active revocation of the bound session, Access, Decision, Account/Deal posture, or Grant invalidates every still-live Grant. A new range fails, and an in-flight response stops before releasing bytes beyond the next checkpoint. Already released bytes cannot be recalled. Natural Grant expiry alone does not retroactively terminate a response that was accepted while valid, but it prevents another request/range.

The stream response is private/no-store, single-range only where the API permits, and never a reusable URL. Gateway receipts contain exact privacy-safe scope and byte/range evidence; only the first qualifying Recipient Reader Copy first-byte receipt can drive the idempotent observable External-Use Event transaction.

## 17. Audit, history, and operational visibility

### 17.1 History is not Audit

Deal History is authorized user-facing business history. Audit is a restricted security/compliance record. Operational Telemetry is privacy-safe runtime evidence. Provider detail is protected integration evidence. A permission to one does not imply another, and no generic search endpoint spans them.

### 17.2 Human Audit access

An eligible Individual Banker may inspect ordinary Account Audit summaries and the subset of details needed to understand their own Account controls. High-risk detail requires Clerk fresh-factor evidence no older than five minutes but does not consume or require a Sensitive Action Grant because it is a read.

High-risk classes include:

- authentication, identity linking/unlinking, Account Security Restriction and recovery;
- permission denials, cross-scope attempts, session/Grant issuance, revocation, suspension, and invalidation;
- External-Use Decisions, deliveries, Recipient Access, resumptions, revocations, and Recipient verification/use receipts;
- Account/Deal/Internal Controlled Exports and protected-object Grant/stream evidence;
- deletion acceptance, task, preservation exception, backup-expiry, completion, and no-resurrection evidence;
- provider billing/reconciliation ambiguity, dispute/refund security effects, and manual reconciliation controls;
- Deployment Operator, Runtime Principal, signing, retention, backup, and Recovery Replay actions; and
- Audit-chain/checkpoint verification, key rotation, integrity failure, and privileged procedure denial.

High-risk projection omits secrets, token hashes, raw provider payloads, protected details, Deal content unnecessary to the event, and another tenant's existence. Post-Term Access and open Payment Dispute retain the authorized Account-owner Audit view because inspection remains allowed. Account Security Restriction exposes only the privacy-safe recovery projection in Section 10. Deletion lock exposes only deletion stage, clocks, preservation category, and completion receipt through Deletion Status Grant; it does not preserve the ordinary Audit browser.

### 17.3 Runtime and operator visibility

- Runtime Principals may append only the event/attempt/receipt classes declared for their purpose and may read only the exact prior control state needed to continue safely.
- Audit Signer reads canonical checkpoint input, not Deal content or arbitrary Audit queries.
- Retention and Backup Executors read exact tasks/tombstones/verification scope, not general history.
- Deployment Operators may observe privacy-safe health, release, queue counts, reason codes, immutable recovery identities, and verification receipts only. They have no product Audit browser or Deal-record query.
- Sentry and Operational Telemetry receive only allowlisted privacy-safe fields and are never an authorization or Audit authority.

## 18. Deletion authorization

### 18.1 Acceptance boundary

Account or Deal deletion requires an ordinary authorized Banker Session, fresh factor, Sensitive Action Grant, exact typed identity, current ETag, and explicit Control Review. Acceptance is atomic with:

- immutable Deletion Request and frozen Deletion Scope;
- immediate normal-access removal for the affected scope;
- revocation of affected Recipient Access, human/Object Grants, Sessions, Job Scopes, uploads, and new-work authority;
- cancellation/fencing of affected Jobs;
- deletion/retention tasks, Audit Event, safe notification, and Outbox state;
- a Deletion Status Claimant; and
- the initial short-lived Deletion Status Grant returned through the idempotent accepted response.

Acceptance is not physical completion and is not self-service reversible.

### 18.2 Deletion Status Claimant

The claimant is stored outside the normal deletable Account/Deal relationship graph and contains only:

- provider code and issuer binding;
- keyed digest of the provider subject;
- exact Deletion Request identity and scope class;
- allowed privacy-safe status projection version;
- created time, terminal completion time where present, and `status_available_until`; and
- revocation/expiry posture needed to prevent reuse.

It contains no display name, unnecessary email, Deal/client/file name, content, artifact, ordinary Actor permission, billing authority, or general Audit link. It cannot enumerate another request. While deletion or a preservation exception remains unresolved, the same authenticated provider identity may obtain another short-lived Grant. After terminal completion, the completion receipt remains available for 30 days; then the claimant is removed and self-service status ends.

The corresponding Clerk identity remains enabled solely as the authentication factor for this claimant until `status_available_until`; every product Account/Deal relationship and ordinary session remains removed. The product stores no duplicate credentials. When the claimant closes, the Retention Executor removes the remaining product identity binding and requests/verifies provider-side identity deletion when no other separately lawful product relationship exists. If the provider identity is independently deleted earlier, no fallback bearer or operator path is created and self-service status cannot be reissued.

### 18.3 Deletion Status Grant

The Grant binds the same authenticated provider identity digest, exact claimant/request, session, projection version, nonce, issued time, and expiry no later than 15 minutes. The database stores only its hash. It authorizes only:

- current deletion stage;
- accepted, normal-access-removed, active-deletion target, backup-expiry target, preservation, terminal, and receipt times as applicable;
- privacy-safe scope class and resource-count summary;
- preservation category without protected basis/details; and
- completion outcome and verification-receipt digest/public integrity reference.

It does not authorize the deleted resource, ordinary Account/Deal route, Audit history, billing, export, recovery, cancellation, another command, or another Deletion Request. A missing, expired, mismatched, revoked, or post-retention Grant denies without disclosing whether another request exists.

## 19. Denial, errors, and non-enumeration

### 19.1 Response policy

| Condition | External response posture | Internal safe classification |
|---|---|---|
| no/expired human authentication | `401 authentication_required` or `session_expired` | authentication failure |
| wrong normal session mode during security restriction | `403 account_security_restricted` | restriction identity and recovery route |
| fresh factor missing/old | `403 reauthentication_required` | required factor age |
| required Grant absent/expired/mismatched | specific `403` Grant code | Grant kind and safe mismatch class |
| visible resource but current lifecycle/posture denies | named `403` or `409` posture code | current posture and allowed recovery action |
| cross-Account, cross-Deal, hidden, deleted, or non-visible ID | `404 resource_not_found` | privacy-safe denial class only |
| Recipient Access absent/expired/revoked/suspended/invalid | same non-enumerating unavailable/`404` posture | exact reason visible only to authorized Banker |
| stale ETag, dependency, Workspace posture version, or Job Scope | `412 version_conflict` or `409 workspace_posture_changed` | exact current safe link/version |
| policy registry missing, context invalid, RLS denial, or procedure mismatch | deny; stable server/security Problem without SQL detail | high-risk Audit and alert |

Error bodies use the API's RFC 9457 Problem contract and never include SQL text, policy names, table names, secrets, token hashes, raw provider fields, hidden identifiers, or cross-tenant existence. UI copy may explain an authorized current posture but never broadens the API response.

### 19.2 Revocation propagation

The transaction that accepts a suspension, revocation, Account Security Restriction, deletion, paid-term end, Decision invalidation, or Workspace posture fence updates authoritative state before or with its invalidation event. API, Gateway, and Worker commitments query current authority rather than depending solely on eventually delivered cache invalidation. Event delivery accelerates local eviction but is not the security boundary.

SSE and long requests recheck at bounded points. When the human session or authorization becomes invalid, SSE sends only the privacy-safe `stream_closed` event and ends. A Worker/Gateway stops according to Sections 14 and 16. Previously committed history or released bytes are not rewritten.

## 20. Permission registry and implementation ownership

Every protected API operation, database procedure, queue claim, Worker commit, and Gateway operation is registered in a code-owned, versioned permission catalog containing:

- stable `permission_code` and operation ID;
- permitted principal/session modes;
- typed resource resolver and Account/Deal parent chain;
- current/historical/version requirement;
- posture policy and resource-specific gates;
- ETag/immutable dependency and Idempotency requirements;
- required narrow Grant kind;
- database role/procedure and storage/Gateway path;
- Audit risk class and safe denial mapping; and
- mandatory positive, negative, cross-tenant, stale-state, and revocation tests.

The catalog generates or verifies route declarations, procedure grants, policy test cases, and documentation tables; generated output cannot create permission absent from the canonical code review. Startup and CI fail when a protected operation lacks registration, names a missing policy, declares a wider principal than this document, or has no denial test.

Permission policy is not customer-editable and is not stored as arbitrary JSON, EAV grants, generic object UUID lists, expression strings, or an administrative role UI. Closed codes and typed relations may be configuration-backed only where this document already permits the choice, such as a verified provider capability; configuration cannot add a principal or widen resource scope.

## 21. Verification and release evidence

### 21.1 Required test suites

| Suite | Mandatory evidence |
|---|---|
| Principal/session matrix | every operation family allows only its declared principal/session mode; Banker/Recipient/Recovery/Runtime substitution fails |
| Account/Deal isolation | cross-Account, cross-Deal, child-ID, history, projection, search, vector, pagination, count, conflict, and timing probes reveal nothing |
| Posture matrix | every allowed/denied action under Paused, Archived, Closed, Terminated, Post-Term, dispute, security restriction, deletion, and combinations matches Section 9 |
| Sensitive Action Grant | five-minute fresh factor, exact binding, atomic consumption, idempotent lost-response replay, expiry, mismatch, security epoch and posture invalidation |
| Recipient | scanner-safe link exchange, OTP abuse limits, exact Revision, no discovery/download, suspension, explicit resumption, session invalidation, stream interruption and first-use idempotency |
| Security recovery | ordinary session denial, minimal recovery projection, forbidden operation corpus, new Grant requirement, clearance epoch change, no session/access auto-restoration |
| Job Scope | typed membership, lease/expiry, runtime substitution, pause fence, archive pending, cancellation, stale commit, duplicate effect, unattached-object cleanup |
| PostgreSQL | all runtime roles prove non-owner/`NOBYPASSRLS`; tenant tables prove `FORCE RLS`; `WITH CHECK`, pool leakage, definer, `search_path`, public grants and migration-owner denial tests pass |
| Storage/Gateway | quarantine-only direct write, no list/upsert/path confusion, exact typed attachment, Account/Deal confusion, range, no-store, active revocation checkpoint and KMS-purpose separation |
| Audit | ordinary/high-risk projections, fresh-factor read, secret/content redaction, Post-Term/dispute availability, restriction/deletion minimal views, hash chain/checkpoint |
| Deletion | immediate normal-access loss, claimant identity match, Grant expiry/scope, status-only projection, preservation duration, 30-day receipt close, claimant removal, no-resurrection restore |
| Operator negative boundary | no product session, DB role, RLS bypass, object/KMS path, Deal-content log, impersonation, break-glass, or domain mutation |

### 21.2 Release-blocking invariants

Production MUST NOT accept Confidential or Restricted Deal Material when any of the following is unproven or failing:

- every online role is not an owner and cannot bypass forced RLS;
- cross-Account/Deal and session-mode denial suites pass at API, SQL, Storage, Gateway, projection, and Worker commit layers;
- Recipient suspension/revocation stops prospective API/range/stream access within the tested checkpoint bound;
- Pause and Archive prevent stale Job result attachment;
- deletion removes normal authority immediately while preserving only the exact status boundary;
- Deployment Operator negative-boundary probes pass;
- grant secrets, auth context, pooled connections, logs, errors, Outbox and provider metadata contain no prohibited authority or content; and
- generated API/procedure/policy declarations match the permission catalog and this document.

Evidence records the build, schema migration, policy catalog version, database roles, provider/runtime versions, environment, Reference Deal fixtures, negative corpus, test results, and approver. A passing UI flow or application-level unit test alone is insufficient proof of RLS or storage isolation.

## 22. Explicitly deferred decision

The concrete Deployment Operator identity and interactive session mechanism is intentionally not selected in this Technical Design phase. This is not permission to use a shared shell account, password, broad SSH key, application login, Account impersonation, direct database inspection, Supabase service-role credential, content break-glass path, or unaudited command shell.

Until a separate approved design defines authenticated operator identity, session lifetime, command binding, authorization, and immutable audit evidence, interactive operator-triggered production recovery commands remain disabled. Automated deployment and purpose-specific Runtime Principals may operate only through their already-defined non-human contracts. The content-blind negative boundary in ADR 0036 remains mandatory and is not deferred.

## 23. Explicitly forbidden permission patterns

V1 MUST NOT implement:

- configurable RBAC or role templates for the single Individual Banker Account;
- Account or Deal access inferred from email domain, Deal party, Buyer, employer, subscription payer, invoice recipient, or transaction role;
- a generic `resource_type/resource_id` grant, untyped object attachment, EAV ACL, or JSON policy expression as authority;
- broad Supabase service-role, table-owner, `BYPASSRLS`, or shared Worker credentials in online product traffic;
- direct browser database business operations or protected-object reads;
- reusable signed object URLs or storage-path possession as permission;
- a support, operator, migration, provider, AI, queue, or sandbox identity reused as a product principal;
- a route/procedure that trusts UI visibility, client Account ID, opaque child ID, queue payload, Webhook status, or cached entitlement without authoritative recheck;
- automatic Recipient Access restoration after dispute/security recovery, Post-Term resubscription, Revision replacement, or session recovery;
- permission carry-forward from a prior Revision, Decision, Job Scope, Sensitive Action Grant, Object Grant, or deleted resource;
- generic security-definer SQL execution, arbitrary table/function selection, or connection-global authorization context; or
- logging, telemetry, email, error, or Audit projection that leaks Deal content or a hidden cross-tenant identifier.

## 24. Completion criteria

This Permission Model is implementation-ready when:

- every V1 principal, session, grant, Runtime Principal, resource class, operation family, posture, and negative boundary is represented in the versioned permission catalog;
- the API operation catalog, database schema/procedures/RLS, Storage policies, Gateway, Worker scopes, integration roles, and UX denial/recovery states agree with this document;
- Sensitive Action, Recipient, Security Recovery, Job, Object, and Deletion Status grants have generated schemas and atomic lifecycle tests;
- all online database roles, ownership, forced-RLS, function, schema, and pool-reset assertions are machine-verified;
- every posture combination has positive and negative contract tests, including dispute/security suspension and Pause/Archive Job fences;
- Audit and error responses preserve useful authorized recovery without enumeration or prohibited detail;
- all launch-blocking suites in Section 21 pass against the complete Reference Deal and production-shaped topology; and
- the deferred Deployment Operator mechanism remains disabled rather than receiving an implementation-default shortcut.
