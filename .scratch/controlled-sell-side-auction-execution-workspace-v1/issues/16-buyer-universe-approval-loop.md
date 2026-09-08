# 16 — Build an evidence-backed Buyer universe and approve Buyers

**What to build:** Build the first Auction Execution slice from exact strategy criteria and eligible public/source observations to Buyer Candidate proposals, Banker inspection, typed Buyer approval, and a governed Buyer universe. Candidate, approval, rationale, Evidence, confidentiality, and current process state remain separate authoritative objects.

**Blocked by:** 08 — Build an exact Source Packet with an enforceable output ceiling; 10 — Convert Evidence proposals into controlled Facts and Decisions.

**Status:** resolved

Implementation is scoped to the candidate-to-approved Buyer loop: Deal-local organization identity, evidence-backed candidate proposal, authenticated typed approval, governed collection/detail views, and cross-scope fail-closed behavior. Outreach, NDA, access, bids, and later auction tickets remain out of scope.

- [x] `buyer_candidate_proposal` has an exact task contract, eligible source perimeter, evidence-backed rationale, abstention behavior, synthetic evaluation, and prompt-injection protections.
- [x] Buyer Candidate and Approved Buyer are distinct states and objects; AI output, list membership, ranking, score, or file presence cannot approve a Buyer.
- [x] Buyer approval requires an authenticated typed Human Decision bound to the exact candidate/version, Deal, purpose, Evidence, conditions, and actor.
- [x] Buyer collection and object views expose exact provenance, current state, restrictions, conflicting evidence, related Decisions, and the next controlled action.
- [x] Added, withdrawn, merged, or materially changed Buyer information creates history and candidate impact on the Auction Control Workbook and applicable process package.
- [x] Cross-Deal/Account Buyer search, manipulated IDs, unauthorized projection, and model-context contamination disclose nothing.
- [x] The complete candidate-to-approved loop satisfies the applicable AC-031, AC-040, AC-047, and AC-065 boundaries.

Evidence: `docs/implementation/ticket-16-evidence.md`. Authenticated browser acceptance remains unavailable while the Mac is locked; the anonymous public route and authorization boundary are recorded there.
