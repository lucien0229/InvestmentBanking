# 28 — Pause, archive and reactivate a Deal without losing authority

**What to build:** Provide Banker-controlled pause/resume and archive/reactivate loops that change Workspace posture and Active Deal capacity without deleting Deal authority. Running work must be fenced at commit time, read-only/export behavior must remain explicit, and reactivation must preserve prior history and exact authorization boundaries.

**Blocked by:** 05 — Create an exact Deal and complete Paid Preflight; 13 — Complete First Unmistakable Value through a Sensitive-Action-protected Internal Export.

**Status:** ready-for-agent

- [ ] Pause, resume, archive, and reactivate use separate authenticated commands, expected-current-state checks, exact reason/actor/time, Audit evidence, and visible consequence review.
- [ ] Paused or archived posture blocks new substantive work and prevents any stale Job from attaching a result after its allowed commit boundary.
- [ ] Archive releases the Active Deal slot atomically, makes the Workspace read-only under the confirmed contract, and preserves permitted history and Internal Controlled Export.
- [ ] Archive is not deletion and does not rewrite Source, Evidence, Analysis, Process, Deliverable, Decision, external-use, or Job history.
- [ ] Reactivation reserves valid capacity, rechecks entitlement/current restrictions, and never carries forward invalid readiness or external-use authority automatically.
- [ ] Concurrent lifecycle commands, capacity races, late worker commits, and wrong-Deal attempts fail safely and idempotently.
- [ ] Success and backward lifecycle paths satisfy AC-044, AC-070, ADR 0039, and the Lifecycle Control UX contract.
