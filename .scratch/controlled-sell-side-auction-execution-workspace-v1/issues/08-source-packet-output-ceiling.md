# 08 — Build an exact Source Packet with an enforceable output ceiling

**What to build:** Let the Banker select exact Source Record versions for a purpose-bound Source Packet and Work Objective, then expose coverage, freshness, rights, conflicts, missing material, Output Ceiling, and the smallest Targeted Re-Preflight action. Packet membership references authority; it does not improve source truth.

**Blocked by:** 06 — Accept one protected Deal file as an immutable Source Record; 07 — Capture public Web Evidence and a scoped Account template safely.

**Status:** claimed

- [ ] A Source Packet binds exact Source Record versions, purpose, Work Objective, actor, time, and inclusion/exclusion reason without mutating source rights, freshness, conflicts, or Fact state.
- [ ] Missing, stale, conflicted, withdrawn, rights-blocked, or insufficiently parsed material produces an explicit Output Ceiling and never an invented current Fact.
- [ ] The UI explains the precise source gap, affected intended use, permitted limited proceed, and smallest replace/remove/narrow/re-preflight action.
- [ ] Withdrawal or rights blocking removes prospective reliance, preserves permitted history, creates an Impact Assessment candidate, and blocks affected circulation candidates.
- [ ] Packet versions and later source changes are immutable and replayable; concurrent changes require the expected current version rather than last-write-wins.
- [ ] Cross-Deal packet membership, wrong source version, stale current pointers, and rights-bypass mutations fail at API, database, projection, and worker boundaries.
- [ ] The black-box packet/preflight loop satisfies AC-026 through AC-028.

## Implementation note

The Ticket 08 implementation is complete and verified locally; detailed evidence is recorded in [ticket-08-evidence.md](../../../docs/implementation/ticket-08-evidence.md). The authorized development web/API release is switched on `root@152.53.90.227`, but applying the SQL migrations is blocked by PostgreSQL `42501 permission denied for database postgres` because the host exposes only the `app_runtime` database credential. The ticket remains `claimed` and is intentionally not marked `resolved` until the schema migration and authenticated API path are verified; no production/provider/recovery claim is made.
