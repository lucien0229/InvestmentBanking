# Tickets 01–11 repair acceptance — 2026-09-05

**Code repairs are implemented and deployed. Final interactive acceptance is
pending; this report does not certify every flow as development resolved.**

Scope: all findings in the authorized [Tickets 01–11 audit](tickets-01-11-development-audit-2026-09-05.md), followed by its six bounded review findings.
Tickets 13+ were not implemented. The three deferred Ticket 12 configurations
were not treated as prerequisites for these repairs.

## Current deployment and evidence

- Development: `https://dev-banking.aptoren.com`.
- Release: `20260905-predecessor-repairs-v4`; application commit `808979f` on
  `develop`, following repair commits `1e21cf1`, `c76a3f7` and `095627f`. No push.
- API/Web healthy; independent dispatcher, Reference, Source and Workbook workers
  running in the Docker Cell. Source and public fetch use dedicated rootless
  host supervisors. No worker/dispatcher credentials in the API environment.
- Hosted development Supabase: 78 canonical migrations, through
  `20260905113000_financial_source_basis_identity`. Exact SQL identities checked
  before reconciling provider-assigned history timestamps. Earlier SQL unchanged.
- One fresh full server suite: **85 tests, 84 passed, 0 failed, 1 opt-in provider
  test skipped**. That provider coverage was separately exercised with three
  real HelloX Source task families. After review corrections: **14/14 focused
  tests plus 1/1 Workbook integration test passed**. These overlap; they must
  not be added together as a unique-test count.
- Root/Web TypeScript, generated contracts, migration validation and final Web
  build passed. The build retains existing CSS compatibility warnings.

## Repair disposition

| Ticket | Implemented repair | Development verification / remaining acceptance |
| --- | --- | --- |
| 01 | Narrow Deal-list membership grant; usable prototype-based Account UI; actual server revocation and Supabase sign-out; actual Account/Deal shell. | HTTP list/isolation/logout replay passed. Real mailbox delivery and verification-link return passed. Physical Passkey and final Account visual pass pending. |
| 02 | Shared shell preserves the synthetic proof boundary. | Browser completed all 9 proof checkpoints with zero errors before the Mac locked. Final shared-UI visual regression pending. |
| 03 | Commerce owner privileges now use scoped NOBYPASSRLS; existing typed Checkout and reconciliation contracts retained. | Real Stripe test Checkout created, HTTP idempotency/outbox regressions passed. Hosted payment and automatic webhook still pending browser completion. Actual renewal lifecycle remains outside this ticket scope. |
| 04 | Separate dispatcher/workers, durable PGMQ, watchdog recovery, continuous authorized SSE and exact Source/Decision dependency graph. | Independent SIGKILL and 90-second lease expiry, explicit recovery, duplicate delivery and dependency resume passed. Twenty samples: command p95 16.18 ms; completion visibility p95 1099.51 ms. |
| 05 | Setup/Guide read actual Deal identity, preflight, capacity and checkpoints, with explicit unavailable states and canonical links. | Development authenticated projections and contract tests passed; final browser loop pending. |
| 06 | Real accepted-byte ClamAV and isolated native XLSX/DOCX/PPTX/PDF/CSV processing, native fragments, durable task and truthful coverage; one bounded transport recovery. | Native and unsafe-input probes 7/7; real CSV original-byte equality and precise cell fragments passed. Recovery preserves prior attempts, rejects unsafe/currently unauthorized requests and prevents repeated recovery. |
| 07 | Web and Account-template forms invoke real admission/capture/compatibility/history APIs and retain real receipts. Public fetch uses disposable rootless containers. | Real HTTPS observation and separately supplied XLSX template admission/preflight/history passed. Final fetch supervisor passed real HTTPS plus 5 unsafe/private URL denials, with no residual containers. Final browser submission pass pending. |
| 08 | Current purpose-bound rights, conditions, reliance, coverage, Output Ceiling and Packet version projections; permanent Source/Packet routes. | Packet/preflight/expiry/version-conflict regressions passed. Canonical route refresh implemented; final browser interaction pending. |
| 09 | Wrong-Deal AI reads return 404; full encrypted request envelope and wire bytes commit before transport; scoped owner policies. | Real extraction, linking and conflict task-family calls passed strict validation. Failed transport preserved reconstructable request evidence. Provider IDs are in the progress report. |
| 10 | Evidence/Claim/Fact/Assumption/conflict/correction screens use real typed commands, collections and immutable Human Decision receipts. Exact Claim ID binding eliminates same-wording ambiguity. | HTTP negative contracts and hosted HTTPS Claim→Evidence→Fact/Decision loop passed. Same-wording selected-Claim regression passed. Final UI/keyboard acceptance pending. |
| 11 | Actual normalization, Calculation/Model/Scenario versions, deterministic runs, validation history and Analysis drafts; native locator and exact selected file identity retained. | Two-file/same-locator readback and mismatched identity denial passed. Hosted HTTPS loop produced equity **94.7**, difference **0.0**, passed validation and persisted Model/Scenario/Analysis versions. Final UI/keyboard acceptance pending. |

## Standards

The two original findings are closed in code: proper tablist/tab/tabpanel
associations, roving focus and Arrow/Home/End behavior; and ADR 0028 disposable
rootless public fetch with fixed image, command, mounts, resource/deadline limits
and exact cleanup. The bounded independent follow-up confirmed both. Browser
keyboard acceptance is still pending.

## Spec

The four original findings are closed in code: exact selected Claim binding;
native locator plus persisted Evidence/Representation/Source identity; canonical
Source/Packet deep links; and bounded Source transport recovery. An initial
follow-up caught the identical-locator ambiguity, which was then fixed and
rechecked at `095627f`. The reviewer confirmed all four closed in code.

Review totals: Standards 2/2 addressed; Spec 4/4 addressed. This does not replace
runtime or visual acceptance.

## Evidence files

- [Fresh full suite](predecessor-repair-acceptance/full-suite.log)
- [Final affected regressions](predecessor-repair-acceptance/focused-tests.log)
- [Workbook integration regression](predecessor-repair-acceptance/workbook-regression.log)
- [Hosted HTTPS control loop and immutable IDs](predecessor-repair-acceptance/live-control-loop.json)
- [Real Web/template receipts](predecessor-repair-acceptance/live-alternative-intake.json)
- [Detailed progress and provider/process measurements](tickets-01-11-repair-progress.md)

The hosted control loop uses an explicitly synthetic development Account and
Source assertions with an expiring authenticated session fixture. It proves real
HTTPS commands, hosted persistence, exact identities and deterministic results;
it does not prove physical Passkey enrolment, real client truth, professional
usability or external authorization. Source-byte processing and provider calls
have their separate evidence boundaries above.

## Remaining acceptance and deferred configurations

The computer-use tool reports the Mac locked and automatic unlock unsuccessful.
The already-requested manual unlock is pending. Remaining interactive work is
final authenticated desktop/mobile visual and keyboard acceptance, the physical
Passkey operation, and the Stripe test Checkout/automatic webhook loop. These
are acceptance constraints, not missing Supabase or Stripe configuration.

The user's three deferred Ticket 12 items remain:

1. Aspose.Cells Python.NET license.
2. Independent Google KMS Ed25519 SOFTWARE key version and short-lived identity broker.
3. Licensed Windows Microsoft 365 Excel Current Channel acceptance host.
