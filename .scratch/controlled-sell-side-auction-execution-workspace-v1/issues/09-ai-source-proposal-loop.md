# 09 — Produce governed AI source proposals without promoting truth

**What to build:** Run the first governed AI source loop from an exact Source Packet to inspectable Claim, Evidence-link, and conflict proposals. Implement the shared versioned AI input/output/prompt/provider boundary through the concrete `source_claim_extraction`, `claim_evidence_linking`, `material_source_conflict_analysis`, and constrained `contract_repair` tasks, without giving AI truth, judgment, readiness, or action authority.

**Blocked by:** 04 — Run one Banker-visible Reference Deal operation as a durable Job; 08 — Build an exact Source Packet with an enforceable output ceiling.

**Status:** ready-for-agent

- [ ] Each enabled task has one immutable manifest, prompt package/digest, strict generated TypeScript/JSON Schema/Python contract, deterministic validators, and versioned synthetic evaluation manifest.
- [ ] Every AI Run binds the exact Account, Deal, Task Definition, Prompt Package, provider capability profile, Source Packet/input perimeter, Context Plan, fragments/locators, release, cost, and outcome.
- [ ] Confidential or Restricted routing stays disabled unless the exact HelloX capability and processing evidence passes; no cross-provider fallback exists.
- [ ] Prompt-injection content, missing/foreign locator, insufficient coverage, invalid schema, provider ambiguity, and semantic change during repair produce abstention or a precise blocker rather than accepted content.
- [ ] AI results are typed proposals with explicit Origin, Evidence candidates, limitations, and unsupported states and cannot create Fact, Assumption approval, Human Decision, Professional Usability, Readiness, or external action.
- [ ] Raw provider request/response content remains protected Deal-scoped data and never enters Banker export, Recipient view, logs, email, Sentry, or measurement.
- [ ] Idempotency, retry, one constrained repair attempt, task enable/suspend/rollback, adversarial corpus, and cross-Deal isolation tests satisfy AC-031, AC-034, AC-035, and AC-066.

## Comments

### 2026-09-04 development verification

- The Ticket 09 migrations were applied through `20260903160000` by the development migration gate (GitHub Actions run `33744184734`). A read-only query from the API container confirmed one `ai` schema, 12 AI tables, the `ai.start_run` function, forced RLS on all 12 AI tables, and temporary ownership-transfer `CREATE` privileges revoked for both `app_ai_owner` and `app_source_owner`.
- The immutable Docker Cell release `/opt/cells/investmentbanking/dev/releases/20260903-ticket09-ai-v3` is active under Compose project `investmentbanking-dev`; API and Web are healthy on loopback ports `3101` and `3102`, Nginx is active, HTTPS root is `200`, and unauthenticated session plus flat/nested AI routes return the expected `401 authentication_required` boundary.
- Local and release checks passed: `npm run contracts:check`, `npm run db:validate` (33 files), `npm run test:unit` (18/18), `npm run build`, remote TypeScript check, and remote Next standalone build. The full local `npm test` gate remains blocked by the existing local migration-history checksum for `20260903010000` differing from the corrected ownership-grant migration; Docker is unavailable in the local environment for a fresh disposable replay.
- Real browser verification completed the public Project Northstar synthetic flow through all 9 checkpoints, downloaded the Revision 0.4 XLSX, inspected the Sources Output Ceiling and Analysis Proposal surfaces, and recorded zero browser console errors/warnings. This is synthetic UI/control-model evidence only.
- Authenticated Banker Account/Deal/Source Packet to AI Run acceptance remains blocked: the development runtime has no usable test-account/session credential for browser login, the database has no seeded Deal/Work Objective/Source Packet, and `hellox-source-proposals-v1` has no verified processing capability. No live HelloX request was made and no provider or production claim is asserted.

Status remains `ready-for-agent` until the authenticated development chain and provider capability evidence are supplied and verified.

### 2026-09-04 real HelloX/Docker verification update

- The forward-only hardening migration `20260903170000_ai_governed_completion_hardening.sql` was replayed against the development Supabase database after fixing two real database compatibility issues (immutable-trigger backfill and function ownership/grant signature). The migration ledger now reads `20260903170000`; the check was performed with a disposable `postgres:17` client and no migration credential was placed in the API container.
- Development Cell release `/opt/cells/investmentbanking/dev/releases/20260904-ticket09-ai-v4` is active with API/Web containers healthy. HTTPS root is `200`; `GET /api/v1/session` and an unauthenticated nested AI `POST` return the expected `401 application/problem+json` authentication boundary. The API source hash on the server matches the local release.
- The development runtime now contains redacted-at-rest HelloX settings: `HELLOX_BASE_URL=https://www.hellox.cloud`, `HELLOX_MODEL=gpt-5.6-sol`, `HELLOX_REASONING_EFFORT=xhigh`, and a generated protected-payload key. The supplied key was verified against `/v1/models` and a real `/v1/chat/completions` request; the provider returned `gpt-5.6-sol` with reasoning tokens. A container-equivalent provider call also normalizes the model response and passes `validateAiOutput` for `source_claim_extraction`.
- The ignored project file `.env.development.local` carries the development HelloX settings for future local conversations; the key is not committed. Templates document the same non-secret names in `.env.example` and `deploy/investmentbanking/dev/runtime.env.example`.
- Browser automation sent the Supabase Magic Link to `wxm0229@gmail.com`. The current browser has no Gmail login state, so the authenticated Banker/Passkey/Deal/Source Packet/AI Run path cannot proceed until the mailbox link is opened in this browser session (or its redirect URL is supplied). No authenticated or production acceptance is claimed yet.
