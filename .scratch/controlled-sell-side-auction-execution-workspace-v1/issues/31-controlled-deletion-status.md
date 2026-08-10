# 31 — Delete Account and Deal data through a verifiable lifecycle

**What to build:** Execute Account/Deal deletion as a controlled lifecycle: remove normal authority immediately, freeze exact deletion scopes, run idempotent active/provider/index/cache/recovery tasks, schedule backup expiry, retain only permitted minimal evidence, and expose a content-free Deletion Status Claimant until terminal proof expires.

**Blocked by:** 27 — Recover Account security and explicitly resume Recipient Access; 29 — Close the billing, allowance, guarantee and Post-Term lifecycle; 30 — Produce a complete index-first Archive Package.

**Status:** ready-for-agent

- [ ] A deletion request requires a fresh Passkey ceremony and an exact, single-use Sensitive Action Grant bound to the deletion command, resource, etag, idempotency identity, and immutable scope/consequences; acceptance immediately removes ordinary Account, Deal, Recipient, stream, search, and Job authority.
- [ ] Exact Deletion Tasks cover authoritative rows, protected objects, search/vector/cache projections, provider state, recovery copies, measurement identity links, and scheduled backup expiry without broadening scope.
- [ ] Active-system contract deletion completes within 30 days and ordinary encrypted backup expiry within 90 days, with safe retry, outcome, verification digest, and terminal Tombstone evidence.
- [ ] Preservation exceptions are narrow, authorized, reviewable, content-minimized, and never restore product access or become a generic self-service Legal Hold.
- [ ] The minimal Deletion Status Claimant and short-lived grant expose only privacy-safe stage/status evidence and no Account/Deal content, billing action, export, or lifecycle authority.
- [ ] The deletion lifecycle exposes a verifiable hook for any later-approved measurement identity link; while INT-DEF-001 remains unresolved, affected anonymous or identity-linked production event classes stay disabled or synthetic-only and restore cannot invent or reintroduce a link.
- [ ] Provider failure, already-absent object, retry, partial completion, restore, claimant expiry, and cross-Account status attempts preserve truthful state and no content leakage.
- [ ] Controlled lifecycle evidence satisfies AC-073 and ADR 0038.
