# Ticket 16 — Buyer Candidate to Approved Buyer evidence

## Resolution

Ticket 16 is implemented on `develop` for the authorized development boundary. The slice preserves Deal-local identity and separate authority objects:

- `process.deal_party` / `process.organization_party` hold the Deal-local organization identity.
- `process.buyer_candidate_proposal` stores strategy criteria, eligible source observations, rationale, restrictions, origin, and prompt-injection withholding posture.
- `process.buyer_candidate` is a separate candidate state with explicit unknown interest, capacity, contactability, and conflict postures.
- `process.buyer_approval` is a separate typed extension linked to `knowledge.human_decision`; the Decision binds candidate ID/version, purpose, scope, Evidence, alternatives, rationale, conditions, and actor. Approval records that outreach, disclosure, NDA treatment, and Data-Room Access remain unauthorized.
- Candidate history and candidate-impact rows preserve material changes and flag Auction Control Workbook / package review.
- Candidate and approval commands use durable idempotency records and transaction advisory locks. Source observations must resolve to the current Account and Deal; instruction-like source text is rejected before it can become model context.
- Forced RLS and Deal-scoped projections return no cross-Deal/Account Buyer object. API routes are `GET/POST /api/v1/deals/:deal_id/buyer-candidates` and `POST /api/v1/deals/:deal_id/buyer-candidates/:candidate_id/approvals`.

## Verification

- `npm run db:validate` — passed, 100 ordered migrations.
- `npx tsx --test tests/unit/buyer-candidate-approval.contract.test.ts` — passed, 4/4.
- `npm run contracts:check` — passed.
- `npm run domain:naming` — passed.
- `npx tsc --noEmit --pretty false --incremental false` — passed.
- `npm run web:build` — passed.
- `git diff --check` — passed.
- Remote development migration `20260909120000_buyer_candidate_approval_loop.sql` applied to the configured Supabase development database and recorded in `supabase_migrations.schema_migrations` by `codex-ticket16`.
- Remote release `/opt/cells/investmentbanking/dev/releases/20260909-ticket16` and web release `/opt/cells/investmentbanking/dev/web-releases/20260909-ticket16` are running healthy. Public probes: web `200`, anonymous `/api/v1/session` `401 application/problem+json`.
- Playwright public acceptance screenshot: `output/playwright/ticket16-buyer-universe-public.png`. The rendered page shows Buyer universe, candidate/provenance/posture columns, typed approval boundary, and external action blocked state in the confirmed Deal Control visual language.
- Authenticated development acceptance screenshot: `output/playwright/ticket16-authenticated-correct.png`. The same surface loaded the real Deal header and rendered the candidate table, typed approval boundary, and external action blocked state under the scoped session.

## Boundary and remaining observer gap

The authenticated run used a temporary Deal-scoped passkey-backed development session for acceptance only; it is not production Supabase identity evidence. No independent second Banker, Windows/Microsoft 365 observer, or external outreach system is required for this candidate-to-approval ticket; outreach and later process objects remain outside this ticket.
