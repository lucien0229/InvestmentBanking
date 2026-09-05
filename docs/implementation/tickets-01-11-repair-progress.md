# Tickets 01–11 development repairs

Status: in progress. Authorized on 2026-09-05 against
[the bounded audit](tickets-01-11-development-audit-2026-09-05.md).
Development branch: `develop`; starting commit: `6e02576`.

The three Ticket 12 configuration dependencies remain deferred by the user.
Tickets 13 and later are outside this repair. In particular, the audit's
renewal-lifecycle evidence limit does not authorize implementing Ticket 29.

## Acceptance checklist

- [ ] Account: Deal listing, usable prototype-based access, direct Passkey
  return, durable logout, and authenticated development/browser regression.
- [ ] Public proof: repeat the existing complete synthetic loop after shared
  UI changes; preserve its synthetic evidence boundary.
- [ ] Commerce: current checkout projections, automatic sandbox webhook
  delivery and idempotent durable reconciliation/recovery.
- [ ] Jobs: independent dispatcher/worker, durable queue, bounded heartbeat,
  process-kill/watchdog recovery, duplicate delivery, dependency resume,
  continuous authorized SSE and AC-071 measurements.
- [ ] Setup/Guide: current Deal identity, exact Preflight/capacity/checkpoints,
  explicit unavailable states and real canonical continuation links.
- [ ] Source intake: substantive isolated processing of accepted bytes,
  truthful coverage and native locators, safety/rights/scope fences.
- [ ] Web/templates: real commands and receipts, permitted public retrieval,
  account-only quarantine, compatibility and history.
- [ ] Source Packet: exact source rights/coverage/status mapping and targeted
  re-preflight, expiry and version-conflict regression.
- [ ] AI proposals: wrong-Deal denial, protected complete request evidence,
  real source task-family/provider acceptance and negative contracts.
- [ ] Evidence/Decisions: real typed collections, exact source inspection,
  durable Fact/Assumption/conflict/correction Decisions and immutable receipts.
- [ ] Analysis: controlled inputs, deterministic calculations, model/scenario
  versions, real validation/result/Job/lineage and draft integration.
- [ ] Permissions: remove reported owner BYPASSRLS through scoped policies;
  verify runtime/worker isolation without broad table access.
- [ ] Final: focused tests per fix, one complete suite, development deployment,
  browser/visual acceptance, two-axis review, commit and final evidence.

## Completed checks (not final acceptance)

Latest acceptance, 2026-09-05 10:48 UTC:

- Fresh development-host PostgreSQL 17 and PGMQ 1.5.1: **85 tests, 84 passed,
  zero failed, one skipped**. The skipped test is the opt-in external AI call;
  all three Source families were separately verified with the configured
  HelloX model `gpt-5.6-sol` / `xhigh`.
- Real provider receipts: extraction `ec90fbd9-0c88-4a0e-a06d-b55388dc6634`,
  evidence linking `1143f619-87b6-4fd8-a07e-4f49b4b8ca77`, conflict analysis
  `d03b8bb4-25a0-4eec-92da-8010c0129751`; all completed with structurally and
  semantically validated proposals. Full encrypted wire requests were
  reconstructable. Inputs were disclosed synthetic Source fixtures. Earlier
  gateway/contract failures remained failed and retained their evidence.
- The request prompt now derives its complete structural schema from the same
  canonical Zod contract as validation; the run-fragment meaning of linking's
  proposition key is explicit. Invalid output was never silently accepted.
- Native XLSX/DOCX/PPTX/PDF parsing and archive traversal, macro and external
  entity rejection passed **7/7** against the final live Source supervisor.
  Original bytes and truthful partial coverage were checked.
- The independent SIGKILL/90-second watchdog/duplicate-delivery probe passed
  again in the complete suite. Twenty samples: command p95 **16.18 ms**,
  completed visibility p95 **1099.51 ms**, one initial checkpoint attempt and
  one allowance commit after duplicate delivery.
- A persisted Reference dependency graph now waits for exact native Source
  processing, then the specified bounded Assumption approval. The real Source
  worker and HTTP Human Decision satisfied those dependencies. The dispatcher
  requeued the same Job, preserving checkpoint 1; no generic resume endpoint
  exists. The regression passed against real development PostgreSQL.
- The ninth repair migration, `20260905110000_reference_dependency_graph.sql`,
  is also hosted. Its exact SQL MD5 was checked before reconciling the provider
  ledger version. Hosted history contains 74 migrations.
- Real Supabase mailbox delivery and link return succeeded for the development
  acceptance account. Physical Passkey verification is awaiting the user's
  device operation. Mac lock currently prevents further browser interaction.
- A real Stripe **test-mode** hosted Checkout Session was created for the
  synthetic acceptance Account (`22cccb11-09b7-4a9e-ac84-4f8e0f2c10de`). Payment
  and automatic webhook acceptance remain pending browser completion. The
  `stripe_live_adapter` label means the real Stripe adapter, not live-money mode.
- Public Project Northstar completed 9/9 synthetic checkpoints with zero
  browser errors before the Mac lock. The later Account token/button correction
  and complete authenticated page loop still require the final browser pass.

The earlier entries below are chronological evidence; their pending migration
and parser statements were superseded by these later checks. Final review,
the refreshed release, browser acceptance and the checkout webhook remain open.

2026-09-05: the Account HTTP regression first failed on the development host's
isolated PostgreSQL instance with `503 != 200`. The forward migration's narrow
membership grant fixes the list. The same HTTP seam then passed 2/2, including
logout followed by replay of the old Cookie (session and protected Deal both
401), and cross-Account/cross-Deal non-enumeration. TypeScript and diff checks
passed. Hosted Supabase migration and live browser acceptance are still pending.

2026-09-05: real Source processing regression passed 1/1 on the development
host's isolated PostgreSQL and a dedicated rootless supervisor socket. Actual
CSV bytes passed ClamAV, were encrypted, queued and parsed to six native cell
fragments, including literal `4.7` at row 2 / column 2. Original-byte Object
Grant retrieval was byte-equal; another Account's fragment/task reads were 404.
The test invokes the worker entry method; independent process-kill acceptance
is still pending. ClamAV databases were downloaded and verified on the host
(daily 28114, main 63, bytecode 339). Source image:
`sha256:118fee89a47b09c23c778707860b82b97da7529c675451fe20df81e08c4da9cd`.

The source-processing migration was applied transactionally to the disposable
DB only. No repair migration has been applied to hosted Supabase yet. Current
web changes typecheck, but UI/provider/current-account acceptance is pending.

The current Source inventory endpoint was added to the same remote regression
and passed again (1/1): it returns the new `complete` CSV coverage and the current
purpose assessment, rather than the immutable original-byte receipt's status.
Later local additions (Source task posture-row locks and private-context RLS)
have not yet been reapplied to the disposable database or reverified.

2026-09-05: all canonical migrations through the independent-job migration were
applied from scratch to a new development-host PostgreSQL 17 instance with
PGMQ 1.5.1. Job regressions passed 11/11. A real independent process was then
killed with SIGKILL after committing checkpoint 1 and claiming checkpoint 2.
The actual 90-second lease expired; the dispatcher exposed failed_retryable,
explicit retry resumed to completion, checkpoint 1 retained one attempt, and
allowance commit count remained one. Twenty sequential development samples:
command p95 10.87 ms; completed visibility p95 2033.80 ms. Dispatcher schema
USAGE was repaired during that probe; the exact grant is in the canonical
migration. These measurements use the disclosed synthetic Reference fixture.

A real TCP SSE connection received events created after subscription, preserved
monotonic unique event IDs, and closed with authorization_changed after logout.
This HTTP test passed. RLS regressions now assert NOBYPASSRLS. The removal also
exposed a missing protected-object-grant bootstrap policy; a narrow exact-token
scope transition repaired it. The complete real CSV scan/parse/original-byte
retrieval regression passed again (1/1) on the new DB, with the final RLS and
posture fences in place. No hosted repair migration or live release yet.

2026-09-05 09:58 UTC: all eight repair migrations are now applied to hosted
Supabase, through `20260905094600_ai_operator_control_owner.sql`. The migration
provider initially exposed a missing migration-time CREATE grant for transfer
to app_source_owner; that failed transaction was rolled back, the canonical
migration was corrected, and retry succeeded. Exact SQL MD5 values were checked
before mapping the eight provider-generated ledger timestamps to canonical
repository versions. Hosted migration count is 73. No earlier history was changed.

The candidate Web build passed under Node 22 on the development host. Release
`20260905-predecessor-repairs-v1` now runs API, Web, independent dispatcher,
Reference worker, Source worker, Workbook worker and credential-free public
fetch containers. The source supervisor runs as ib-office with a pinned image.
API no longer receives worker/dispatcher credentials. A Compose resource-limit
normalization error was corrected before the release started. The release is
on the host's persistent volume; this does not certify the rescue host's reboot
provisioning. Browser/complete workflow/provider acceptance remains in progress.

The AI deployment-control regression passed 3/3, including suspend, enable and
rollback through typed controls while the runtime cannot execute those controls
or write global task configuration. Four real native file families (XLSX, DOCX,
PPTX and PDF) yielded the expected text, unchanged original digests and truthful
partial coverage. The remaining negative safety probes are being repeated after
the Source supervisor's release switch interrupted one in-flight test.

2026-09-05 11:14 UTC — bounded review corrections:

- Standards axis reported 2 findings: missing native keyboard tab semantics,
  and a persistent Docker public-fetch process inconsistent with ADR 0028.
  Shared tabs now provide tab/tablist/tabpanel associations, roving focus and
  Arrow/Home/End navigation. Public retrieval now uses an unprivileged host
  coordinator and one disposable, digest-pinned rootless Podman container per
  URL. Real public HTTPS and five rejected private/unsafe URL probes passed;
  no containers remained after the six requests.
- Spec axis reported 4 findings: ambiguous same-wording Claim binding, lost
  native Analysis provenance, placeholder Source/Packet deep links, and
  exhausted Source transport tasks without recovery. Each is corrected. The
  financial input preserves the exact selected native selector; Fact and
  Decision identities retain its relationship/Evidence/Representation/Source
  chain. Multiple supporting locations require an explicit selection. The
  native selector stays compatible with downstream workbook lineage checks.
- The Claim regression first failed (400 for the missing exact-ID contract),
  then passed with the older selected Claim linked despite identical wording.
  Cross-Account/unknown Claim and changed-proposition attempts are rejected.
- **14/14 affected regressions passed on the development host**, including real
  ClamAV/CSV parsing after an injected transport-exhaustion state. Safety failure
  and revoked processing permission both reject recovery; idempotent recovery
  preserves three previous attempts and completes on attempt four. A second
  recovery is rejected. This is an explicit failure fixture plus real parser,
  not a claim that three production outages happened.
- Hosted Supabase now contains **77 canonical migrations**. The three newest
  SQL identities were matched by exact MD5 before reconciling provider-assigned
  timestamps to repository versions. No previously applied SQL was edited.
- Root and Web TypeScript checks and generated contract checks pass. The first
  new Web build exposed a generic inference difference in its stricter project
  configuration; explicit tab union types corrected it. Refreshed build,
  release switch and final browser checks are pending.
