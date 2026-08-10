# 03 — Turn a qualified buyer into a reconciled Individual entitlement

**What to build:** Connect Outcome, Pricing, Qualification, Account Access, Terms, Stripe Checkout, durable canonical provider evidence, Product Entitlement, Account plan, capacity, and receipt into one buyer-visible purchase loop. Payment remains evidence; only product-owned reconciliation grants the named Individual Banker exactly two Active Deal slots and the complete V1 core capability.

**Blocked by:** 01 — Establish the Supabase-authenticated Reference Deal acceptance seam.

**Status:** ready-for-agent

- [ ] Pricing and confirmation surfaces show $995 monthly, $10,950 annual, two Active Deals, allowances, add-ons, unmetered actions, renewal, cancellation, guarantee, and applicable tax before payment confirmation.
- [ ] Qualification and Account Access can be resumed safely and do not create entitlement before product-owned provider reconciliation succeeds.
- [ ] Browser returns, duplicate/reordered Webhooks, provider retries, and repeated product commands produce one charge record, one entitlement mutation, one checkout-completed event, and one capacity allocation.
- [ ] Every processable provider event durably records its versioned canonical evidence and digest before acknowledgment; raw Webhook bytes are used only ephemerally for signature verification, are not persisted, and are not required for recovery while INT-DEF-003 remains unresolved.
- [ ] Successful purchase creates one named Individual entitlement with exactly two available Active Deal slots and complete core capability; provider status alone cannot grant Account, Deal, Recipient, or Human Decision authority.
- [ ] Receipt, plan, entitlement, and capacity reads agree across Account UI, API, authoritative state, Audit, and privacy-safe measurement candidates.
- [ ] Black-box fixtures cover monthly/annual, duplicate, out-of-order, ambiguous, invalid-signature, and persistence-failure paths and satisfy AC-009 through AC-011 and AC-069.
