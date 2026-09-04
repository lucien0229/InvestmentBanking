# Ticket 10 implementation evidence

Status: `resolved` for the authorized local development boundary. The Ticket
10 implementation and local browser acceptance are complete. Remote release
switching, provider-backed acceptance, and production recovery evidence are
not claimed from this checkout.

## Implementation surface

- `knowledge` schema tables for native Source locators, Evidence, typed Claims,
  Facts, Assumptions, Information Conflicts, typed Human Decisions,
  append-only correction dependencies, and command idempotency.
- Forced RLS on every Ticket 10 table. `app_runtime` has read-only projection
  access; state changes run through scoped `SECURITY DEFINER` command
  functions owned by `app_knowledge_owner`.
- Evidence acceptance requires the current Deal's Source Record,
  Representation, processing coverage, rights posture, exact native locator,
  and an integrity-checked Source fragment. Projections expose independent
  extraction, coverage, authority, freshness, conflict, calculation, model,
  professional-judgment, and intended-use dimensions without a scalar truth
  score.
- Fact acceptance requires matching Claim purpose/scope, adequate supporting
  Evidence, no unresolved material conflict, an authenticated typed Banker
  Decision, and exact current-version preconditions. Assumption approval
  records bounded use while retaining `Assumption` type. Conflict resolution
  rejects hard-block waivers and records the decision envelope plus evidence.
- Corrections append a new Claim and typed correction decision, preserve the
  original value and Origin, and create candidate dependencies for every
  existing Fact and acceptance decision.
- `apps/api/src/evidence-fact-decision.ts`, `apps/api/src/app.ts`, the OpenAPI
  contract and generated client types expose the Deal-scoped read/command
  seams. The high-fidelity Evidence Inspector and Human Decision surfaces are
  rendered under `/app/deals/project-northstar/evidence-decisions` and
  `/app/deals/project-northstar/evidence-decisions/control-review`.

## Verification

- `npm run contracts:check` — passed.
- `npm run db:validate` — passed (35 ordered migration files).
- `npx tsc --noEmit` — passed.
- `npm run test:unit` — 19/19 passed, including forced-RLS and runtime write
  denial checks for Ticket 10.
- `npx tsx --test tests/http/evidence-fact-decision.http.test.ts` — 6/6
  passed. The suite covers exact Evidence dimensions, unsupported locators,
  Evidence-gated Fact promotion, typed Assumption approval, unresolved
  conflicts, hard-block denial, stale `If-Match`, cross-Deal non-enumeration,
  and append-only correction dependencies.
- `npm run web:build` — passed with the repository's Next.js build.
- `git diff --check` — passed.
- A real browser session against the local Web server rendered both Ticket 10
  surfaces and verified the Evidence Inspector, independent dimensions,
  no-truth-score notice, Evidence basis, Decision record, effective time,
  alternatives, contrary Evidence, and downstream effect markers.

## Environment boundary

- The local PostgreSQL 18 instance accepted the Ticket 10 migration by direct
  SQL application. The repository migration runner remains blocked by a
  pre-existing checksum drift for migration `20260903010000`; no historical
  migration was rewritten.
- The complete HTTP suite remains limited by four pre-existing
  `reference-job.http.test.ts` failures (worker termination/lease and
  cancellation expectations). No Ticket 10 test or source file is involved.
- The local Web/API candidate is synthetic/development evidence only. No
  Stripe, Supabase Auth, HelloX provider, remote host, production database,
  storage, deployment, or restore claim is made here.
