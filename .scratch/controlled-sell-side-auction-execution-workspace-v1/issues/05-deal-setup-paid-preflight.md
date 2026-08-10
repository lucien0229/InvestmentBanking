# 05 — Create an exact Deal and complete Paid Preflight

**What to build:** Allow an entitled Individual Banker to create an identity-complete Deal, reserve one Active Deal slot, complete Deal Setup, and receive a precise Paid Preflight result before substantive work. The same loop creates the First Deal Guide instance while keeping real Confidential or Restricted material disabled until entitlement, preflight, and minimum security gates all pass.

**Blocked by:** 03 — Turn a qualified buyer into a reconciled Individual entitlement; 04 — Run one Banker-visible Reference Deal operation as a durable Job.

**Status:** ready-for-agent

- [ ] Deal creation records every identity-defining element, role/side, stage, purpose, currency/units, authority context, actor, and time before Deal-specific processing begins.
- [ ] Changing an identity-defining element creates a linked new Deal and preserves the original; source versions, Bids, Process Events, pause/restart, backward stage movement, and failed exclusivity remain within the same Deal when identity is unchanged.
- [ ] Capacity reservation is atomic with Deal creation, respects the two-Active-Deal entitlement, and cannot be bypassed by concurrent requests or manipulated identifiers.
- [ ] Paid Preflight returns exactly `pass`, `limited-proceed`, `blocked`, or `waiting-for-user` with privacy-safe reason and recovery action for purchase authority, intended use, source rights, confidentiality, route, compatibility, and minimum packet.
- [ ] The Banker can replace/remove a blocked source reference, narrow intended use, save progress, and resume without sales or implementation handoff.
- [ ] No real Confidential or Restricted file can enter substantive parsing, AI, rendering, or provider egress before every applicable gate passes.
- [ ] Deal Setup, Paid Preflight, capacity, First Deal Guide, Audit, and negative cross-Deal tests satisfy AC-012 through AC-014 and AC-019 through AC-021.
