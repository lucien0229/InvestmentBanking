# 11 — Produce replayable financial Analysis from controlled inputs

**What to build:** Turn accepted financial Evidence, Facts, Assumptions, and Decisions into normalized inputs, deterministic Calculations, Models, Scenarios, Analysis State, and inspectable draft Analysis. Enable the concrete financial extraction/mapping, sell-side analysis, and valuation commentary tasks while keeping all authoritative numbers and gates deterministic.

**Blocked by:** 10 — Convert Evidence proposals into controlled Facts and Decisions.

**Status:** ready-for-agent

- [ ] `financial_semantic_extraction`, `financial_normalization_mapping`, `sell_side_analysis_draft`, and `valuation_commentary_draft` have strict task-specific contracts, validators, fixtures, and evaluation gates.
- [ ] Normalized values retain definition, period, unit, currency, sign, precision, actual/forecast posture, source locator, and decision/assumption identity.
- [ ] Every Calculation records inputs, versions, rules, engine, coverage, result, exceptions, and downstream effect and replays to the same result with pinned inputs.
- [ ] Formula presence or cached value alone cannot satisfy Calculation Integrity; circulation-candidate values come from supported recalculated state or remain explicitly source-limited.
- [ ] Models and Scenarios isolate assumptions, time, currency, and dependencies and cannot leak values across scenarios, Deals, or artifact revisions.
- [ ] Analysis drafts cite accepted controlled inputs and cannot auto-create Fact, Recommendation acceptance, Professional Usability, or Readiness.
- [ ] Arithmetic, formula, tie-out, unit, period, currency, sign, schema, version, lineage, state-transition, and isolation fixtures pass deterministically, satisfying AC-036 through AC-038 and applicable AC-054.
