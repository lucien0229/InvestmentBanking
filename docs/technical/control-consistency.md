# Control consistency and recovery contracts

Design revision: 2026-09-30. This document defines the transaction and recovery details referenced by the API, ERD, permission and integration specifications. It does not establish that any deployment, vendor configuration or release test already passes.

## 1. Accepted content before the first narrative Revision

An empty Deliverable is valid with `current_revision_id = null`. Semantic acceptance creates an immutable `AcceptedContentVersion` under that Deliverable, without a Revision FK. Fields: tenant keys, Deliverable ID, content-contract ID/version, ordinal, canonical digest, closed payload, purpose/audience, source/authority snapshot, accepted-by/time, proposal disposition or human origin, and predecessor content version where present. `content_region` and its typed Evidence/Claim/Fact/Assumption/Calculation/Analysis bindings belong to this version.

Acceptance verifies the [content contract](../product/contracts/deliverable-content.md), exact basis references, rights, scope and output ceiling. It is an atomic content-version/region/binding/disposition transaction; it neither creates artifacts nor confers Review, readiness or external permission. Narrative editing creates another accepted content version, never mutates one. Workbooks retain their relational financial/process authority.

`create_ai_deliverable_content_acceptance` returns `201 AcceptedContentVersion`. Human-authored content uses `POST /api/v1/deals/{deal_id}/deliverables/{deliverable_id}/content-versions`, with the closed content contract, basis and `If-Match` Deliverable; origin cannot be labeled AI without proposal linkage. `GET .../content-versions` and `GET .../content-versions/{content_version_id}` expose permitted versions. AI acceptance also requires the exact base Deliverable ETag. Both paths update the Deliverable's content-acceptance version under CAS without inventing a current Revision.

`create_revision` consumes exactly one `accepted_content_version_id` for narrative or exact workbook authority bindings, plus base Deliverable ETag, requested artifact set and Operation Preview. First build explicitly permits null predecessor/current Revision. The Job stages and verifies native/reader bytes, then one transaction rechecks posture, rights, content/dependency versions and current Deliverable CAS; creates Revision with the next ordinal; binds that exact content version via `deliverable_revision_content`; attaches verified artifacts/manifests; advances current pointer; commits usage and history. No partially built Revision or blank placeholder becomes current.

`deliverable_revision_content` is an immutable binding (`Revision ID` unique, `Accepted Content Version ID` FK, content digest); it no longer stores a second payload. The same accepted content may be built again with a different approved template into a new Revision, without inheriting QC/Review. Failed builds retain accepted content and committed steps, clean unattached staging, and create no Revision. Concurrent first builds may stage bytes, but only one CAS commits; the other returns `409 revision_basis_changed` with preserved content and explicit rebuild choice. Idempotent replay returns the same acceptance/Job/result.

## 2. Complete Impact closure

Typed domain relations remain dependency authority. Add a transactional `deal_lineage_head` with monotonic `commit_seq`. Every transaction that inserts, changes selection of, withdraws or supersedes an authority relation relevant to downstream use advances this head and writes a typed lineage-change Outbox record in the same transaction. A sequence is allocated while locking the Deal head so committed order has no invisible gap. No worker can bypass this write invariant.

The projection reports `consumed_through_seq` only after every committed change through that sequence is incorporated, including deletions/invalidation. Impact starts at an authoritative snapshot head S, records S and graph/validator versions, and may use the projection only when its complete consumed watermark is at least S and its snapshot represents S exactly (or a new transaction captures a later coherent S). Merely seeing the changed root or revalidating returned edges is insufficient.

Wait for catch-up at most 2 seconds. If not caught up, traverse indexed authoritative typed relations in a consistent database snapshot with bounded execution; if the configured traversal bound/time is exceeded, return `impact_dependencies_incomplete`, preserve work and block affected readiness/circulation gates. Never treat an empty/partial candidate set as a completed Impact. A full typed traversal may complete without the projection.

Before publishing a complete assessment or committing a dependent readiness/external-use/revision action, lock/check the current Deal lineage head in the same transaction. If it changed from the assessment basis, extend/recompute the closure or return `409 impact_basis_changed`; do not certify the old closure as current. The old completed snapshot remains historical. Unrelated head changes may conservatively require revalidation; optimization must prove exact exclusion rather than assume it. New dependents created after S cannot evade invalidation.

Store `basis_commit_seq`, `closure_complete`, `closure_digest`, authority/projection path, evaluated typed edges and derivation version on the assessment. UI may display an incomplete preview, clearly labeled; permissions require complete/current proof. Rebuild test: insert a new downstream content binding while the projection is paused, change its source and attempt export/circulation. The new object must appear or the gate must remain blocked.

## 3. Exact source and representation bytes

Add two Banker-only operations returning `201 ProtectedObjectStreamGrant`:

| Operation | Path | Request scope |
|---|---|---|
| `create_source_record_object_grant` | `POST /api/v1/deals/{deal_id}/source-records/{source_record_id}/object-grants` | exact accepted source object/digest; operation `download_original` or safe supported `inspect_original`; purpose |
| `create_source_representation_object_grant` | `POST /api/v1/deals/{deal_id}/source-records/{source_record_id}/representations/{representation_id}/object-grants` | exact safe representation object/digest, operation `inspect_representation`, optional exact locator/allowed page range; purpose |

Attachment variants are closed typed Source Record original and Source Representation; neither requires a Deliverable Revision. Grant identity binds Account, Deal, exact typed attachment/object/digest, session, operation, expiry and current rights/classification/restriction versions. Issuance and gateway opening reauthorize the same scope; later revocation/posture/rights change invalidates it. No storage path or raw provider URL reaches the browser. Unsafe originals cannot use inline inspection; a safe representation does not grant raw-original download. Download requires the existing sensitive export gate; ordinary permitted Evidence inspection does not require fresh Passkey per page. Recipient sessions cannot request either route.

The existing `/objects/{protected_object_id}` gateway handles range bounds, media type, disposition, no-sniff and safe rendering. Source access never fabricates `revision_id`; validators use the appropriate attachment variant. Missing/revoked/cross-Deal IDs return the existing non-enumerating denial. Each stream receipt identifies exact attachment and operation; a preview first-byte receipt cannot be relabeled an export-completed receipt.

## 4. Append-only assessments and current selection

Appending classification, rights, reliance or condition assessment creates immutable history only. It does not silently replace the current selection. For each kind, the API has a **separate** typed query and selection-change command under `/api/v1/deals/{deal_id}/source-records/{source_record_id}`:

| Kind | GET query suffix | POST command suffix |
|---|---|---|
| classification | `/classification-current-selection` | `/classification-selection-changes` |
| rights | `/rights-current-selection?purpose={purpose_key}` | `/rights-selection-changes` |
| reliance | `/reliance-current-selection?purpose={purpose_key}` | `/reliance-selection-changes` |
| condition | `/condition-current-selection?purpose={purpose_key}` | `/condition-selection-changes` |

Query returns selected assessment ID, purpose (where applicable), selection ID/version and strong ETag; absent selection returns `404 selection_not_initialized` only after Source authorization. POST body identifies exact assessment, purpose, reason and any required Human Decision. Existing selection requires `If-Match`; first creation requires `If-None-Match: *`; missing precondition returns428, stale/competing creation returns412. Idempotency applies. Tenant/Source/purpose mismatch returns422; rights expansion or reliance promotion still requires its existing gates. A generic selection endpoint is not introduced.

The transaction checks exact assessment validity, CAS-updates the selection, appends selection-change history, increments authority/posture versions, fences affected Jobs/grants, starts or invalidates affected Impact and writes Outbox/Audit. Creating an assessment then losing selection CAS leaves a visible unselected historical assessment; the UI reloads the newer selection and preserves the proposed choice for explicit review. Condition selection remains a display/query convenience and cannot override independent rights/reliance/conflict predicates. Classification for other typed materials retains its own typed selection scope and the same CAS invariant.

Initial Source acceptance creates required initial classification/rights selections atomically from its explicit accepted declarations; it cannot expose an unclassified permissive interval. Later assessment creation and current-selection changes use the separate commands above. Condition/reliance may begin explicitly unassessed; absence never means permission. Selection-change history is an append-only row per kind, with old/new assessment, actor/reason, ETag versions and authority sequence.

## 5. Sharing and deletion scope

An Archived Deal permits ordinary permitted inspection/export and **exact Human/External-Use Decision or Recipient Access revocation**. Revocation may create only revocation history, derived gate invalidation and safe receipts; it cannot create new work, a Revision, a grant, delivery or resumed access. The transaction is bound to current archived posture, requires the normal exact target/ETag and sensitive revocation gate, invalidates affected Sessions/streams immediately and consumes no Active Slot or paid operation. Revoking a common External-Use Decision can stop all Access based on it; individual Access revocations remain individually attributable. Bytes already retrieved cannot be recalled.

Deal deletion and Account deletion have distinct perimeters:

| Acceptance | Removed / fenced immediately | Preserved |
|---|---|---|
| Delete Deal A | A's normal object authority, uploads, Jobs/Scopes, source/artifact grants, recipient sessions/access and in-flight effects; Account session authorization cache for A invalidated | Account, Actor, subscription/billing and Deal B/C relationships; ordinary session continues with A denied |
| Delete Account | Every relationship and ordinary session within that Account and its Deals; all affected authority | Minimal non-content retention records and request-scoped deletion claimant |

Both create a Deletion Status Claimant for the exact request. “Claimant only” applies when no other ordinary product relationship remains. Deleting A must not demote the entire provider identity or cancel unrelated billing. Shared cache entries must be invalidated precisely or rebuilt without broad loss of unrelated authority. Delete the Supabase Auth identity only after claimant retention ends **and** no other ordinary relationship or active claimant exists; failure to delete the provider identity remains visible/retryable, not fabricated success. Source deletion and retained copies still obey the retention/tombstone contract.

## 6. Recovery-session cookie and scoped rate budgets

`__Host-security_recovery_session` uses `Secure; HttpOnly; SameSite=Strict; Path=/`, no Domain, with server-recorded expiry and session binding. Clear it using the same name/path and secure attributes. The prefix cannot use `/api/v1` as Path. Restrict its API authority server-side to the existing security recovery allowlist; a root-path cookie grants no ordinary API permission. Test both cookie acceptance in supported browsers and rejection on ordinary Banker routes. This follows the [IETF cookie prefix rules](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-4.1.3.2).

Replace the shared grant-issuance bucket with versioned `rate-policy-v1.1.0` classes, each scoped independently to Actor and Account, while retaining ordinary request caps:

| Grant class | Sustained quota / burst | Actions |
|---|---|---|
| `export` | 20/minute / 5 | sensitive artifact/source/control/data export |
| `expansion` | 30/minute / 10 | External-Use Decision, new delivery/access, exact Access resumption, other non-revocation sensitive mutations |
| `revocation` | 60/minute / 20 | revoke Decision or Access; no permissions added |
| `security_recovery` | 5/10 minutes / 2 | recovery-sensitive grants; not ordinary post-recovery Access resumptions |

Deletion remains a sensitive `expansion`-class destructive action for bucket purposes, with its typed confirmation; the bucket label is not a permission. Fresh Passkey and one-action exact-scope grants retain their existing five-minute limits. No generic reusable grant or bulk approval is created. Ordinary typed Decisions remain exempt from sensitive grants as already specified. Authentication/Recipient challenge limits do not change. Batch-looking UI sends separate exact commands and reports each result, honoring Retry-After without discarding progress. Under an otherwise idle account with fresh authentication, issuance for 20 separate Access resumptions fits within 20 seconds at sustained rate, subject to command latency; test the whole workflow rather than assert a service SLA from arithmetic.

## 7. Resume preserved work after Pause

Add `POST /api/v1/jobs/{job_id}/posture-recoveries`, operation `create_job_posture_recovery`, requiring Idempotency-Key and Job `If-Match`; body includes exact blocked reason, current Deal posture/version and accepted dependency digest. Only `blocked + workspace_posture_changed`, now-active/open/entitled Deal and still-valid original work qualify. This is not `retry` and cannot bypass rights, capacity, security, source or business blockers.

The transaction revalidates dependency versions and all gates, issues a new scoped authorization epoch, records a Job recovery event, reuses still-valid committed step results and queues the first unsatisfied step on the same Job. Old attempts remain fenced; they cannot commit under the new epoch. Reconcile the original reservation/compensation once; unchanged recovery consumes no extra paid operation. If capacity must be re-reserved, use the original allowed compensation before requesting any user-visible capacity action. No arbitrary edit to the Job DAG is allowed.

If inputs, content, purpose or outputs changed, return `409 job_basis_changed` with typed differences and the new scoped-work/Operation Preview route; explicit rerun creates a new Job linked to the original. Still-paused/archived/restricted scope returns409 with its concrete blocker; stale Job ETag returns412. Waiting-for-source/user states retain their existing exact-input continuation, and only `failed_retryable` uses `/retries`.

Posture recovery also checks the original operation deadline. If expired, it cannot extend the same Job; show an explicit replacement command/preview using currently valid scope and reusable immutable steps. Record predecessor linkage and product-failure compensation separately; do not charge twice merely for preservation/recovery.

## 8. Fair scheduling and visible waiting

Keep global heavy concurrency 2, light concurrency 8, and at most 2 full workflows per Account. Divide ready heavy steps into `interactive` (bounded single-object recovery/preview/export) and `bulk` (full ingest/package). Use per-Account round robin within class, oldest eligible first, with one heavy slot preferentially serving interactive work; bulk may borrow it only until its next bounded checkpoint. Continuous interactive traffic cannot starve bulk: a bulk step waiting 5 minutes takes the next eligible heavy slot; preserve the other for interactive when both classes exist. Light work reserves 2 of 8 slots for status/control/small reads, with the other 6 borrowable for light worker tasks. No content query bypasses permission gates.

Each non-preemptible heavy step must checkpoint or time out within 120 seconds; interactive-class steps have a stricter 30-second step budget. Larger work splits only at semantically valid boundaries or enters the bulk class with its waiting posture shown. Scheduler class never changes commercial classification: a targeted correction remains free of paid-operation units even if its computation needs bulk scheduling. Unsupported monolithic engine work cannot exceed timeout silently. Admission permits at most 4 queued interactive heavy steps globally and 2 per Account; excess returns `429 scheduler_busy` before usage reservation, with retry guidance. Under baseline load (both heavy workers occupied by bounded steps, no provider throttling and within admission), target P95 interactive start within 240 seconds; measure queue delay separately from run time. The test must include all 4 admitted waiting steps, not just an idle-queue request. This is an initial release target, not measured evidence or public SLA.

Bulk queue budget is 30 minutes; after expiry release reservation and show `blocked / scheduler_capacity_wait`, with explicit resubmission through the original typed work command after a fresh preview, linking `rerun_of_job_id` to the expired Job; no automatic repeated charges. Keep the existing full-workflow end-to-end hard deadline 4 hours from acceptance: queue time consumes that budget. Pause or human/source wait does not silently extend it; after expiry, an explicit replacement Job may reuse valid accepted steps under fresh scope and compensation rules. Show `queued since`, work ahead by class (counts only), last progress, remaining deadline, cancel and exact continuation action. Forecasts are estimates; do not display invented completion time.

Validation must cover two Accounts, continuous bulk load, short targeted correction/export, starvation,120-second engine timeout, pause/cancel and queue-budget release. Record queue/run time, accepted-step reuse and allowance effects; do not pass merely because a priority index exists.

## 9. Recoverable data, not unrelated RPO numbers

A preserved `scheduler_capacity_wait` Job does not use posture recovery or failed-job retry. Its explicit replacement command keeps the accepted input digest, reuses still-valid immutable step results through normal reuse checks and records the canceled/replaced predecessor; it cannot leave two chargeable live Jobs for the same resubmission.

Database and object backups are independent. Supabase documents that database backups do not restore Storage objects; see [official backup documentation](https://supabase.com/docs/guides/platform/backups). The5-minute database RPO is a configured-and-drilled PITR target, not the daily logical-copy recovery point and not current-instance evidence.

| Failure scope | Recovery basis / target | Limitation |
|---|---|---|
| Logical DB error; Supabase PITR, keys and required objects available | DB point ≤5 minutes; select a verified common DB/object point, up to 15 minutes when object mirror is required; current Active Deals≤8h, full history≤24h | Recover only through the manifest-proven common point |
| VPS loss; primary Supabase DB/objects and keys intact | Rebuild host, restore configuration, validate current primary; service RTO≤8h | Local mirror is lost; rebuild it before counting redundancy restored |
| Supabase service/recovery unavailable; VPS and its copies intact | Daily encrypted logical DB copy: DB loss up to 24h; object mirror≤15m; choose latest complete pair anchored to that DB snapshot; RTO≤24h after replacement services/keys available | Cannot claim5-minute RPO; older referenced objects must still exist in mirror |
| Primary object loss; DB and mirror intact | Select verified objects through mirror watermark≤15m, reconcile DB to complete safe point; RTO≤8h current /≤24h history | Newer DB references without bytes cannot be marked usable |
| KMS/key version unavailable but recoverable | Restore same authorized keys before decrypting; time depends on key service recovery | No plaintext or new-key substitution; no RTO claim while prerequisite unavailable |
| All required keys irretrievably lost, or primary and sole VPS recovery copies lost | Unrecoverable under this V1 topology | No fictitious RPO/RTO; record failure scope and keep content unavailable |

Each backup checkpoint records DB recovery point/snapshot ID, all referenced object digests and versions, contiguous object-copy watermark, manifests/signatures, required wrapped-key versions, Audit checkpoint and deletion/tombstone watermark. Restore chooses the latest point for which **all** referenced required objects and keys are verified, not independent “latest” timestamps. Incomplete members lower the point or leave the affected scope unavailable with explicit loss classification. Do not silently revive a newer pointer without its bytes.

Reapply all available deletion tombstones and current retention restrictions before exposing content, including those after the selected DB restore point from the separate recovery ledger. If their completeness cannot be established, keep affected access disabled pending reconciliation. Disaster restore does not restart deletion clocks or restore revoked grants/sessions. Rebuild derived indexes and revalidate exact permissions, current pointers, manifests and content parity.

Keep daily encrypted logical backups, 15-minute object mirror, weekly completeness checks and monthly synthetic restore drills. A drill report must state the failure scenario, unavailable dependencies, selected common point, observed data loss, missing objects, tombstone reconciliation and actual restore duration. RPO/RTO goals become release evidence only after the relevant configuration and drill pass; no new operator content-access role is authorized.
