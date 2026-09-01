# 05 — Create an exact Deal and complete Paid Preflight

**What to build:** Allow an entitled Individual Banker to create an identity-complete Deal, reserve one Active Deal slot, complete Deal Setup, and receive a precise Paid Preflight result before substantive work. The same loop creates the First Deal Guide instance while keeping real Confidential or Restricted material disabled until entitlement, preflight, and minimum security gates all pass.

**Blocked by:** 03 — Turn a qualified buyer into a reconciled Individual entitlement; 04 — Run one Banker-visible Reference Deal operation as a durable Job.

**Status:** resolved

- [x] Deal creation records every identity-defining element, role/side, stage, purpose, currency/units, authority context, actor, and time before Deal-specific processing begins.
- [x] Changing an identity-defining element creates a linked new Deal and preserves the original; source versions, Bids, Process Events, pause/restart, backward stage movement, and failed exclusivity remain within the same Deal when identity is unchanged.
- [x] Capacity reservation is atomic with Deal creation, respects the two-Active-Deal entitlement, and cannot be bypassed by concurrent requests or manipulated identifiers.
- [x] Paid Preflight returns exactly `pass`, `limited-proceed`, `blocked`, or `waiting-for-user` with privacy-safe reason and recovery action for purchase authority, intended use, source rights, confidentiality, route, compatibility, and minimum packet.
- [x] The Banker can replace/remove a blocked source reference, narrow intended use, save progress, and resume without sales or implementation handoff.
- [x] No real Confidential or Restricted file can enter substantive parsing, AI, rendering, or provider egress before every applicable gate passes.
- [x] Deal Setup, Paid Preflight, capacity, First Deal Guide, Audit, and negative cross-Deal tests satisfy AC-012 through AC-014 and AC-019 through AC-021.

## Answer

Ticket 05 is resolved for the authorized development environment. The implementation adds the identity-complete paid Deal command, two-slot atomic reservation, versioned Setup drafts, privacy-safe Paid Preflight controls/results, limited-proceed acceptance, linked identity-change Deals, First Deal Guide checkpoint, Audit events, forced-RLS tables, account/deal-scoped API routes, and minimal Web routes. Local HTTP tests cover source replacement/removal, intended-use narrowing, save/resume, all four result states, concurrent capacity, sensitive-content denial, and cross-Deal non-enumeration; the recorded full run is 39/39. Supabase `InvestmentBanking (dev)` was migrated through the authenticated SQL Editor without dropping or resetting existing data. The VPS now runs `/opt/investmentbanking/releases/20260901-ticket05-dev-v2`; API/Web services are active, Nginx validates, and public HTTPS/browser checks show the Create Deal page (`200`) plus the unauthenticated API boundary (`401 application/problem+json`). Per explicit authorization, all prior application release directories and the temporary upload archive were removed; no application rollback release remains.

Local/test evidence is not production proof. No real Confidential or Restricted bytes, paid production account, provider egress, or production secrets were used. Production queue/provider/recovery evidence remains outside Ticket 05.
