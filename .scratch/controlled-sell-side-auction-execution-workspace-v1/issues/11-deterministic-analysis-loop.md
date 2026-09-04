# 11 — Produce replayable financial Analysis from controlled inputs

**What to build:** Turn accepted financial Evidence, Facts, Assumptions, and Decisions into normalized inputs, deterministic Calculations, Models, Scenarios, Analysis State, and inspectable draft Analysis. Enable the concrete financial extraction/mapping, sell-side analysis, and valuation commentary tasks while keeping all authoritative numbers and gates deterministic.

**Blocked by:** 10 — Convert Evidence proposals into controlled Facts and Decisions.

**Status:** resolved

- [x] `financial_semantic_extraction`, `financial_normalization_mapping`, `sell_side_analysis_draft`, and `valuation_commentary_draft` have strict task-specific contracts, validators, fixtures, and evaluation gates.
- [x] Normalized values retain definition, period, unit, currency, sign, precision, actual/forecast posture, source locator, and decision/assumption identity.
- [x] Every Calculation records inputs, versions, rules, engine, coverage, result, exceptions, and downstream effect and replays to the same result with pinned inputs.
- [x] Formula presence or cached value alone cannot satisfy Calculation Integrity; circulation-candidate values come from supported recalculated state or remain explicitly source-limited.
- [x] Models and Scenarios isolate assumptions, time, currency, and dependencies and cannot leak values across scenarios, Deals, or artifact revisions.
- [x] Analysis drafts cite accepted controlled inputs and cannot auto-create Fact, Recommendation acceptance, Professional Usability, or Readiness.
- [x] Arithmetic, formula, tie-out, unit, period, currency, sign, schema, version, lineage, state-transition, and isolation fixtures pass deterministically, satisfying AC-036 through AC-038 and applicable AC-054.

## Comments

### 2026-09-05 development verification

Ticket 11 is resolved for the authorized development boundary on `develop`.
The implementation adds the deterministic Analysis data model and scoped
commands, exact-decimal normalization and EV-to-equity replay/tie-out,
proposal-only AI contracts for the four financial tasks, and the confirmed
Deal Control high-fidelity UI flow including Human Decision recording and
passed validation receipt. Targeted contract, arithmetic, RLS, and API tests
are green; the remote development Cell was exercised with authenticated API
and browser checks.

Local full-suite and exact latest-source remote redeployment remain limited by
the environment notes reported in the handoff: the local PostgreSQL data
directory is corrupt and Docker is unavailable; the remote v3 build session
did not return, so browser evidence is from the healthy v2 development Cell.
Production provider/Stripe/Supabase acceptance is intentionally outside this
ticket's development resolution and was not represented as complete.
