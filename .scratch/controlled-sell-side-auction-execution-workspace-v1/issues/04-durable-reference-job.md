# 04 — Run one Banker-visible Reference Deal operation as a durable Job

**What to build:** Let the Banker start a useful synthetic Project Northstar workspace build and observe it through accepted, running, recoverable, completed, and failed states. The result must travel through the authoritative command, Outbox/queue, dispatcher, Job-scoped Runtime Principal, worker, checkpoint, event stream, and Job Detail contract as one vertical operation rather than a horizontal job-framework exercise.

**Blocked by:** 01 — Establish the Supabase-authenticated Reference Deal acceptance seam.

**Status:** resolved

- [x] Starting the operation returns a durable Job identity and exposes authoritative state through the Banker UI and versioned API within the specified asynchronous visibility bound.
- [x] The Job binds exact Account, Deal, purpose, inputs, versions, release, allowance posture, and an expiring Job Scope; the worker has no unrestricted tenant or protected-object authority.
- [x] Duplicate commands, queue deliveries, callbacks, retries, and worker claims create one material result and one allowance effect.
- [x] Killing the worker at every material stage preserves accepted inputs and either resumes from a checkpoint, safely retries, or reaches a precise terminal blocker without indefinite `running` state.
- [x] Cancel, user retry, dependency resume, lease loss, heartbeat, and failure states appear through the durable Job Detail and SSE contracts without fabricated percentages or unbounded polling.
- [x] State-changing command latency, durable async visibility, and heartbeat meet AC-071 in the authorized development release environment.
- [x] Black-box and failure-injection evidence satisfies AC-069 through AC-071 and the ADR 0025/0039 scope and commit-fence boundaries within the authorized development boundary.

## Comments

Implemented the Ticket 04 local/test vertical slice on 2026-08-27 and stopped at its evidence boundary. The slice adds durable Job/Step/Attempt/Lease/Scope/Event/Outbox and allowance tables with forced RLS, separate dispatcher/worker procedures and credentials, exact Account/Deal/input/version/release/allowance/security/posture bindings, idempotent command/effect handling, checkpoint failure injection, lease recovery, cancellation/retry, posture-fenced commit, versioned Job Detail/SSE contracts, and the Banker Job Detail UI. `npm test` passes 21 tests; TypeScript, OpenAPI, Next build, and the extended local browser flow pass. Detailed evidence is in [`docs/implementation/ticket-04-evidence.md`](../../../docs/implementation/ticket-04-evidence.md).

At the earlier local/test checkpoint, the checkboxes remained open for human acceptance because that run did not claim production completion: the local coordinator is a deterministic worker/dispatcher seam rather than live PGMQ and independent production processes; SSE is a bounded notification projection rather than a continuously live production stream; dependency-directed waiting/resume, real process-kill/watchdog evidence, operation-preview/consent, and AC-071 production percentile measurements remain explicit follow-up debt. The development re-acceptance below resolves the ticket for that environment only; no downstream ticket scope is advanced by this entry.

Development re-acceptance was rerun on 2026-08-31 against the configured Supabase `dev` branch (`xuysyaxzcpntvvzsgkdy`). Migrations `20260831085848 durable_reference_job_v1` and `20260831090300 durable_reference_job_v1_hosted_fix` are recorded. The hosted fix uses `extensions.digest`, creates least-privileged worker/dispatcher login roles without managed-Postgres-forbidden `ALTER ROLE`, and the role probes confirmed `rolsuper=false`, `rolbypassrls=false`, `rolinherit=false`, and `rolcanlogin=true`; direct `SELECT` on `jobs.job` is denied and elevated procedures are not executable by `PUBLIC`. Job `08c315d7-5c1c-4897-948b-106b6d06c2cb` completed all four material stages in the dev database after duplicate command replay, dispatcher publish, worker claim/heartbeat/commit, and the authoritative query showed one reservation, one allowance ledger commit, four revoked scopes, nine durable events, and one published outbox row. A duplicate final commit was rejected as `lease_invalid` with `accepted=false`.

The public development host is now serving `/opt/investmentbanking/releases/20260831-ticket04-dev-v1` through the atomic `/opt/investmentbanking/current` symlink. Both systemd services are active. A temporary passkey-verified synthetic session drove the real HTTPS browser flow: the Banker clicked **Start reference operation**, opened Job Detail for `e1dcb8a5-ac66-4613-8fb3-b75aaf60e4e1`, observed `completed`, exact scope/accepted-input/result metadata, heartbeat, and SSE `job_snapshot`/`stream_closed`; cross-Account and absent-Deal reads returned `404`. The same dev database recorded one Job, four steps, four scopes, one reservation, one allowance commit, nine events, and one published outbox row. API duplicate replay (`abe12e83-6a9f-4f09-87d3-6fc06c767cef`), cancellation/release (`129dc12b-52ff-4f4b-94e0-273670570d55`), and worker-failure/retry/resume (`49221fc3-7f43-4607-b6a6-59b8937b8909`) were also verified. The worker/dispatcher pools load the configured Supabase CA; direct tenant-table reads remain denied for both roles. The development-environment acceptance is resolved. Production PGMQ/independent-process, OS-kill/watchdog, continuous-SSE, dependency-resume, and AC-071 percentile evidence remain explicitly deferred and are not represented as production proof. No downstream ticket scope is advanced by this entry.

## Answer

Development acceptance is resolved for Ticket 04. The real dev Web/API/Supabase path now proves durable Job identity, exact Job Scope, least-privilege worker/dispatcher procedure seams, idempotent material/effect handling, bounded completion, Job Detail/SSE visibility, cancellation, retry, and failure recovery. The detailed command and evidence matrix is recorded in [`docs/implementation/ticket-04-evidence.md`](../../../docs/implementation/ticket-04-evidence.md).

Remaining blockers for a production-complete acceptance are intentionally not hidden: deploy a real PGMQ/dispatcher plus independent worker processes; capture OS process-kill/watchdog and duplicate-delivery evidence; add continuous live SSE and dependency-directed resume; and measure AC-071 command/visibility/heartbeat p95 in the production-shaped release environment. No additional user configuration is blocking the authorized development resolution at this time.

### Integration update — 2026-08-31

The Ticket 04 implementation commit was integrated into the current `main` after preserving the already-integrated Ticket 02 and Ticket 03 API, contract, database, and UI surfaces. Ticket 04 remains limited to the durable Reference Job scope; no later-ticket scope was advanced.
