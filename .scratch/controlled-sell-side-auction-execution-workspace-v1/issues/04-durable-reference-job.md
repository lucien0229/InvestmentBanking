# 04 — Run one Banker-visible Reference Deal operation as a durable Job

**What to build:** Let the Banker start a useful synthetic Project Northstar workspace build and observe it through accepted, running, recoverable, completed, and failed states. The result must travel through the authoritative command, Outbox/queue, dispatcher, Job-scoped Runtime Principal, worker, checkpoint, event stream, and Job Detail contract as one vertical operation rather than a horizontal job-framework exercise.

**Blocked by:** 01 — Establish the Supabase-authenticated Reference Deal acceptance seam.

**Status:** ready-for-agent

- [ ] Starting the operation returns a durable Job identity and exposes authoritative state through the Banker UI and versioned API within the specified asynchronous visibility bound.
- [ ] The Job binds exact Account, Deal, purpose, inputs, versions, release, allowance posture, and an expiring Job Scope; the worker has no unrestricted tenant or protected-object authority.
- [ ] Duplicate commands, queue deliveries, callbacks, retries, and worker claims create one material result and one allowance effect.
- [ ] Killing the worker at every material stage preserves accepted inputs and either resumes from a checkpoint, safely retries, or reaches a precise terminal blocker without indefinite `running` state.
- [ ] Cancel, user retry, dependency resume, lease loss, heartbeat, and failure states appear through the durable Job Detail and SSE contracts without fabricated percentages or unbounded polling.
- [ ] State-changing command latency, durable async visibility, and heartbeat meet AC-071 in the production-shaped release environment.
- [ ] Black-box and failure-injection evidence satisfies AC-069 through AC-071 and the ADR 0025/0039 scope and commit-fence boundaries.
