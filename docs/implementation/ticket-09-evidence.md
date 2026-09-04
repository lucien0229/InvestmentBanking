# Ticket 09 implementation evidence

Status: `resolved` for the authorized development boundary. Production,
automatic provider delivery, and production recovery evidence remain outside
this acceptance.

## Implementation surface

- Versioned task manifests, prompt packages, JSON Schema contracts, generated
  TypeScript/Python models, and synthetic evaluation fixtures for
  `source_claim_extraction`, `claim_evidence_linking`,
  `material_source_conflict_analysis`, and `contract_repair`.
- Deal-scoped AI Run, input-fragment, validation, typed-proposal, protected
  provider-payload, retry/repair, task-control, release, and digest guards in
  the `ai` schema.
- `apps/api/src/ai-source-proposals.ts` and the nested/flat OpenAPI routes.
  AI output remains proposal-only and cannot write Facts, Human Decisions,
  Readiness, or external actions.
- Confirmed high-fidelity Sources and Analysis surfaces retain the Output
  Ceiling, Source Packet, proposal-only, deterministic-result, and review
  required states.

## Development verification

- Ticket 09 migrations were applied through
  `20260903170000_ai_governed_completion_hardening.sql` by the development
  migration gate. Forced-RLS and ownership-transfer grants were checked from
  the API container.
- Immutable Cell release
  `/opt/cells/investmentbanking/dev/releases/20260904-ticket09-ai-v10` is
  active. API/Web containers and Nginx are healthy; HTTPS root returns `200`
  and unauthenticated session/AI routes return the expected `401` boundary.
- Real authenticated development run:
  `source_claim_extraction`, `gpt-5.6-sol`, `xhigh`, run
  `e89ebbdd-4dc9-43f7-88ae-2ba87b233b91`, HTTP `201`, four typed proposal
  rows, two exact source fragments, three validations, and
  `completed/succeeded` state. The run used exact Source Packet v2 and Work
  Objective IDs recorded in the tracker issue.
- Replaying the same Idempotency-Key returned HTTP `200` with
  `Idempotent-Replayed: true`, the same run ID and proposals, and preserved
  the completed state after restart.
- Provider request/response bytes are protected ciphertext only; the
  projection contained no plaintext provider payload. The live HelloX probe
  returned the requested `gpt-5.6-sol` model with `xhigh` reasoning.
- Real browser acceptance completed Magic Link, Passkey, Deal setup, native
  CSV intake, rights assessment, Paid Preflight, exact Source Packet and Work
  Objective creation, AI Run, replay, and proposal inspection. The browser
  recorded zero console errors/warnings. The synthetic Project Northstar flow
  also completed 9/9 checkpoints and downloaded its controlled artifact.

## Checks

- Ticket 09 AI contract/RLS checks: `7/7` passed on the development candidate.
- Server-side PostgreSQL HTTP integration checks: `17/17` passed in an
  isolated disposable database.
- `npm run contracts:check`, `npm run db:validate`, `npm run test:unit`
  (`18/18`), TypeScript, and Next standalone build passed for the candidate.

## Explicit boundaries

- The parser/fragment fixture and short-lived development worker-scope harness
  are controlled development evidence, not production parser or worker-issuer
  evidence.
- Stripe evidence is Test Mode signed-event replay/reconciliation; automatic
  delivery was not observed.
- No production provider, production database, production storage, or
  production recovery claim is made.
