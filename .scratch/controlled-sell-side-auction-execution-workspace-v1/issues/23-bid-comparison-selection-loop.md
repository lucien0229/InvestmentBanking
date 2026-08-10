# 23 — Compare exact Bid versions and record Banker selection

**What to build:** Accept exact Bid source versions, extract and normalize terms, compare current Bids with supported valuation/Scenario consequences, present a governed recommendation proposal, and require a typed Banker Decision for selection. Bid receipt, version, comparison, recommendation, selection, and exclusivity remain separate authority.

**Blocked by:** 11 — Produce replayable financial Analysis from controlled inputs; 21 — Record authorized outreach and enter In Market truthfully.

**Status:** ready-for-agent

- [ ] `bid_term_extraction` and `bid_comparison_recommendation` bind exact Bid source/version, fragments, normalized term schema, assumptions, Calculation/Scenario identities, comparison contract, and conflicting/unsupported terms.
- [ ] Every Bid revision creates a new immutable Bid version; no upload, extraction, or normalized row overwrites an earlier Bid.
- [ ] Comparison preserves definitions, units, currencies, timing, conditions, non-comparable items, assumptions, and exact source locators rather than forcing a misleading score.
- [ ] AI recommendation is a typed proposal with alternatives, rationale, conditions, contrary Evidence, and limitations and cannot select a Bid or enter exclusivity.
- [ ] Selection requires an authenticated Human Decision bound to exact Bid versions, comparison, Evidence, actor, conditions, and scope.
- [ ] A materially revised Bid invalidates affected comparison/recommendation state and creates candidate Impact for the memo and package.
- [ ] Missing exact Bid, wrong version, stale comparison, cross-Deal Bid, score-only selection, and duplicate intake fixtures satisfy AC-047, AC-049, and AC-050.
