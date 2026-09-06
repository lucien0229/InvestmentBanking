# Ticket 12 — development implementation and acceptance

2026-09-06 update: the user explicitly authorized alternative development
acceptance under ADR 0043. [Current evidence](ticket-12-development-alternatives-2026-09-06.md)
records the exact LibreOffice / development signer / Linux lab profile.
Ticket 12 is now **resolved for that authorized development profile** after
all 12 scoped readiness requirements passed on exact synthetic Revision 05.
The evidence and original configuration failures below remain historical;
they are not relabeled as Windows Excel or cloud KMS success.


Date: 2026-09-05. Branch: `develop`. Ticket status: **needs-info**.

The workbook implementation is deployed and its executable development paths
have been exercised. **Ticket 12 is not resolved:** the required clean-copy,
real signature and supported Office round-trip gates have not passed. The
remaining inputs are listed below; existing Supabase, Stripe and Docker
configuration was reused.

## Scope and authority

Implementation consumed the complete Ticket 12 scope, root `CONTEXT.md`, the
confirmed prototype and design-input rules, product/UX/API/financial-Office
contracts, AC-051–059 and applicable ADRs including 0007/0008/0016/0017,
0024/0025/0028/0029 and 0039/0040/0042. Prototype files were not modified.

The slice covers editable XLSX generation, exact PDF/preview copies, immutable
Revisions, controlled financial input authority, source/cell lineage,
recalculation, manifest signing integration, professional Review, QC Findings,
exact retests, readiness and three governed AI tasks. Ticket 13 export and
Ticket 15 full reimport were not implemented; the Office compatibility smoke
contract is the part required by Ticket 12 itself.

## Deployment and test results

- Public development host: `https://dev-banking.aptoren.com`.
- API/Web release: `/opt/cells/investmentbanking/dev/releases/20260905-ticket12-workbook-v4`
  and matching `web-releases` directory. Runtime application code is `f693bdf`;
  final SQL/test corrections are `e33243a`. The Node 22 production build is
  unchanged by those SQL/test-only corrections.
- Office: dedicated rootless Podman service, Aspose.Cells 26.8.0, exact image
  `sha256:3ee44d3e668af1543831cc3773c878ff04cfc8ca5d761fe4a697d22d8e808256`.
- Hosted Supabase development project `xuysyaxzcpntvvzsgkdy`: **65 canonical
  migrations** applied. Migration admin authority stayed outside runtime
  containers. All 22 scoped Deliverable tables have RLS/FORCE RLS; the 23rd
  table is the non-tenant public integrity-key registry. API/Worker/Dispatcher
  and the new offline Deliverable owner are NOBYPASSRLS; the owner has no
  schema CREATE privilege.
- Complete server suite: **79 passed, zero failed/skipped**, 21.355 seconds on
  the final source-backed revision of the tests. It used PostgreSQL and the
  actual rootless Office service. Production build, TypeScript, contract and
  migration checks passed. Two independent Python artifact tests passed,
  including positive/zero/negative scenarios and adversarial file mutations.
- A real rootless hung-container test exceeded a two-second Podman-client
  deadline; exact-name cleanup removed the container in 12.228 seconds.
- Evidence: [server validation](ticket-12-acceptance/server-validation.json),
  [separate Standards/Spec reviews](ticket-12-review.md),
  [Office and signing runbook](ticket-12-office-runbook.md).

## Real hosted tracer bullet

The exercise used a disclosed synthetic Account/Deal and temporary authenticated
session. Synthetic CSV source bytes were encrypted in the real protected
volume, but their parsed representation was deliberately a controlled
predecessor fixture. This is not proof of mailbox login, a payment or production
source parsing.

Real HTTPS commands established rights, Packet/version, Work Objective,
Evidence, a Claim, accepted Cash Fact/Decision, normalized 4.7, approved EV and
Debt Assumptions, a pinned Calculation Run, Model and Scenario. The independent
expected equity is **100.0 + 4.7 − 10.0 = 94.7 USD million**; tie-out is zero.

The browser created and generated:

| Identity | Value |
| --- | --- |
| Deal | `290c3734-3b1a-442d-beab-89ce0f8b5e99` |
| Workbook | `b266b056-8173-4d85-b367-4f3220b7fc44` |
| Final Revision 03 | `d1377418-fa68-4354-9545-f0d4172b3972` |
| Build Job | `a8678bc2-cd63-4a5b-9e49-fec448e095d3` — completed |
| Cash Fact | `24f92e29-3e46-475e-b91e-800890b8cdc4` |
| Cash source / locator | `48f0c306-3015-42b5-a6a0-41f7ef4c272d` / CSV row 4 |
| Calculation Run | `41dce42c-a128-4e40-a890-5ed27b199542` |
| Native XLSX SHA-256 | `72d895b53c139c70794ae4d04dbba49ea2c39fc7ac9229c9cb3270d7c39515d9` |
| Reader PDF SHA-256 | `24aba2eec5fd3e3de77b0c92c434519e30600a61d5a2a6c4bff1ca20c506f48b` |

An independent administrative observer decrypted **those stored objects**,
verified ciphertext and plaintext hashes, reopened/recalculated the XLSX and
compared the PDF. This did not introduce a user download/export API.
[Exact identities and basis](ticket-12-acceptance/final-artifact-identities.json).

The XLSX retains Overview, Inputs, Assumptions, Valuation, Scenarios, Lineage
and Banker Notes, native formulas/defined names/chart, input separation,
units/periods/currency/signs and Banker-owned notes. The final equity formula
is `=ROUND(EV_1+Cash_1-Debt_1,1)`, preserving declared decimal precision.

[Independent file results](ticket-12-acceptance/independent-file-inspection.json):
structure, recalculation, lineage and controlled inputs passed. Page order,
material values, Decision/source citations, chart and safe PDF 1.7 passed.
**Clean copy and overall parity failed:** Aspose evaluation marks remain, and
vendor-warning fonts are not embedded. The genuine marks were not stripped.

## Governed AI and Job controls

All three final HelloX / `gpt-5.6-sol` stream calls completed successfully on
Revision 02 and passed the strict schema, preissued-locator and proposal-only
checks:

| Task | Run | Provider latency |
| --- | --- | --- |
| `deliverable_semantic_qc` | `af639474-94cb-42f3-b64d-1f55cc86c5b3` | 253,980 ms |
| `native_reader_semantic_parity_review` | `976706c2-3935-4106-8b16-97206fa6e4ec` | 230,766 ms |
| `workbook_commentary_draft` | `a30199ad-2482-4299-9d64-2e4c6a4f9c4a` | 200,273 ms |

[Provider outcomes](ticket-12-acceptance/live-ai-outcomes.json). These are
proposals, not authoritative Review/readiness. Earlier invalid outputs were
rejected for schema/evidence/locator failures before a single targeted rerun;
validation was not weakened to accept them. No success is carried into
Revision 03 automatically.

A real running provider Job was canceled through HTTPS; a second was canceled
through the final UI (`5358ffb5-6ea8-462e-a533-179009aeebfa`, Run
`2603e004-b8ed-4c58-99aa-0c38ae4b8eeb`). The UI showed Canceled and the Run
became `policy_block`. Late results cannot commit. A browser-triggered exact
file QC Job (`facaf359-ab07-4929-980f-e451021ea65b`) completed. A targeted
clean-copy retest (`d8cb5dcc-5a22-490e-ad7c-25dc568faf84`) also completed; its
result remained failed and did not clear the Critical Finding.
[Review, cancellation and retest receipts](ticket-12-acceptance/reviews-and-retest.json).

## UI acceptance

The execution-package/workbook surfaces use the confirmed prototype's muted
OKLCH surfaces, typography stacks, monospaced identifiers, borders, 4/8/12/16/
24/32/48 spacing and 6/8 px control/panel radii. The actual browser returned
`--dc-bg: oklch(98% 0.005 250)`, `--dc-fg: oklch(22% 0.02 240)` and
`--dc-accent: oklch(58% 0.16 145)`, matching the prototype token source.

Browser checks covered list/create, controlled dependency selection, new
Revision, errors, job progress/cancel, Overview, Native/Reader worksheet/page/
zoom controls, stored formulas/caches, Lineage, Review/QC, Revisions and
Manifest. Cash-source reverse tracing filters both Native and Reader regions;
the expanded Decision shows the real question, rationale, exact scope,
purpose, actor and recorded time. Manifest explicitly shows **Signature
pending**, with no claim of approval.

Desktop 1440/1280 and compact 1100 layouts were inspected. At 1100 the navigation
and context controls open/close via Escape and restore focus. At 390 px the
layout remains within the viewport and displays the intentional read-only
handoff; mutation controls are hidden. Main-document width equaled scroll
width at 1280 and 390. Dense tables/zoomed previews scroll within their own
inspection containers. Final page console inspection returned no errors or
warnings. This is visual/interaction acceptance of the implemented slice,
not a claim that old-ticket placeholder pages are complete.

Browser-recorded Reviews on Revision 03: method, scope and synthetic internal
rights passed; professional suitability is limited; native/reader parity is
failed with the independent report hash. Missing licensed output, signing and
Office evidence remain independent. Changing purpose/audience makes the passed
method/scope Reviews unavailable; readiness stays blocked.
[HTTPS readiness observations](ticket-12-acceptance/readiness-http-observations.json).

## Acceptance criteria disposition

| Criterion | Result |
| --- | --- |
| AC-051 native structures / supported applications | Native structures and declared-engine reopen pass. Available Mac Excel opened an earlier exact copy for inspection. All supported Office paths are not yet proved. |
| AC-052 edit/save/reopen/reimport | **Blocked** by no licensed supported Office editing environment. No false round-trip receipt was created. |
| AC-053 exact recalculation | Passed on the exact stored Revision 03 native file, with independent decimal/cache/rendered comparisons. |
| AC-054 bidirectional lineage | Source-backed Cash and approved Assumptions map to exact native/reader regions, pinned calculation/model/scenario and Decisions; source reverse trace and Decision inspector were exercised. |
| AC-055 exact native/reader comparison | Material comparisons pass; **overall failed** because clean evaluation-free output / embedded fonts do not pass. |
| AC-056 Critical blockers | Invalid formula/flattened/corrupt/native-chart/locator/PDF mutations are rejected. Hosted clean-copy/parity Findings remain Critical and block circulation. |
| AC-057 stage applicability | The always-required workbook is represented; later-ticket artifacts are not manufactured as missing workbook blockers. |
| AC-058 promotion gates | Real readiness remains blocked for independent missing/failed prerequisites; changed scope and superseded Decision regressions reject authority. |
| AC-059 exact blocker retests | File/HTTP tests verify scoped retests and no cross-promotion. A Critical license failure cannot be waived by a disposition or unrelated passing Review. |
| Signed canonical manifest | Canonicalization/Ed25519/KMS protocol and mutation tests pass; **real KMS signing is unverified/unavailable**. No signed manifest is claimed. |

## Inputs required to reach development resolved

1. A valid **Aspose.Cells Python via .NET** license for clean generation.
2. The independent **Google Cloud KMS Ed25519 SOFTWARE key version** and
   authorized short-lived runtime identity/token broker, separate from Audit.
3. A licensed accessible **Windows Microsoft 365 Excel Current Channel**
   acceptance environment with exact build information. The available Mac
   Excel 16.108.1 / 16.108.26041915 is unactivated and cannot perform the
   required edit/save round trip.

These are concrete external dependencies. User authorization has already been
accepted for their eventual setup/testing; another generic approval is not
needed. Detailed installation and rerun steps are in the
[runbook](ticket-12-office-runbook.md). Ticket 12 remains `needs-info` until
these mandatory gates can be executed successfully.

## Earlier tickets

The requested bounded comprehensive audit of Tickets 01–11 is recorded in
[the separate development audit](tickets-01-11-development-audit-2026-09-05.md).
It identifies real integration/UI/security-contract gaps instead of assuming
old `resolved` labels imply full completion. Later tickets were not advanced.

## Closure hygiene

The temporary session was expired at `2026-09-05T05:48:08Z`; its real HTTPS
session request subsequently returned 401. Local/server credential fixture
files and the dedicated browser cookie were removed. Owned browser tabs were
closed. The three acceptance PostgreSQL containers were stopped (data retained
for reproduction); the deployed API/Web remain healthy and the rootless Office
service remains active. Existing user files, releases and audit/artifact
records were preserved. No production deployment or downstream ticket was made.
