# Tickets 01–11 — development audit, 2026-09-05

The existing `resolved` labels do not establish that every user-facing flow is
complete. This bounded audit found working server contracts and material UI
integration gaps. It does not reopen product discovery or implement later
Tickets. Only predecessor defects directly needed by Ticket 12 were repaired.

## Evidence boundary

- Host: `https://dev-banking.aptoren.com`, Docker development Cell and hosted
  Supabase development branch `xuysyaxzcpntvvzsgkdy`.
- Runtime: Ticket 12 release v4, application commit `f693bdf`; schema fixes
  through `e33243a`. Production was not tested or changed.
- This run used a disclosed synthetic Account/Deal and a temporary
  passkey-verified session fixture. It did not repeat real Supabase mailbox
  login, passkey enrolment, a Stripe purchase or the production parser chain.
- 71 fresh HTTPS observations: 34 returned 200, 31 returned 401, five returned
  404 and one returned 503. See
  [sanitized observations](ticket-12-acceptance/predecessor-http-observations.json).
  Wrong-Deal AI-run enumeration returned an empty 200; the other five sampled
  wrong-Deal collections returned 404.
- Server tests: all 79 passed with real PostgreSQL and the rootless Office
  service. Provider doubles in those tests are not provider proof; Ticket 12's
  separate HelloX calls are real provider observations.
- Browser inspection covered public proof, pricing, qualification, setup,
  guide, sources/intake, evidence/decisions, analysis and workbook integration.
  Original implementation reports are historical evidence, not recertified
  end-to-end results from this audit.

## Per-ticket findings

| Ticket | Newly observed behavior | Gaps / acceptance limit |
| --- | --- | --- |
| 01 Account/reference skeleton | Authenticated session and deal-scoped audit projection returned 200; all sampled protected collections rejected no-cookie access. Real UUID scope is visible in the shell. | `GET /api/v1/deals` returns 503: direct runtime-role reproduction yields `permission denied for table account_actor` inside `app.list_account_deals`. Account-access still exposes protocol/token-oriented controls. The “Sign out securely” link only navigates to account access in the current source; it is not a logout command. Real login/passkey and revocation were not recertified. |
| 02 Public Project Northstar | Browser completed all nine synthetic checkpoints, retained both EBITDA Claims, corrected Cash 6.2→4.7, observed 1.5→0.0 recovery, Revision 0.4 without inherited authorization and exact XLSX/PDF/manifest download links. Public proof endpoints returned 200. | Correctly synthetic. This establishes no paid, provider, parser or production security result. |
| 03 Checkout/entitlement | Public offer and five authenticated commerce projections returned 200; missing session returned 401. Pricing renders monthly 995 and annual 10,950 with the stated included contract. Qualification submits and returns a bounded “Potential constraint” result. | Current browser read paths passed; no new payment was charged. Prior Ticket 03 evidence used Stripe test mode and a signed event replay; automatic webhook delivery and actual renewal lifecycle are not newly certified. |
| 04 Durable Job | Server regressions cover durable state/idempotency/leases/cancellation. Ticket 12 additionally canceled a real running provider Job; late completion did not restore authority. | Worker/dispatcher remain in-process runtime seams. Existing report explicitly defers independent PGMQ/process-kill/watchdog, continuous SSE, dependency resume and AC-071 percentile measurements. Do not treat the development `resolved` label as proof of those paths. |
| 05 Setup/preflight/guide | Setup, preflights, guide and overview returned authenticated 200. Browser renders the actual fixture Deal identity and navigation. | Setup still says “Project Northstar” and “Paid Preflight pending” for this different Deal whose preflight fixture is pass. Capacity/guide fields appear blank instead of an explicit unavailable state. Guide contains fixed synthetic steps; links into Decision/Analysis lead to the UI gaps below. The fixture bypassed actual paid capacity purchase/setup, so blank capacity itself is not proof that the purchase path is broken. |
| 06 Protected source intake | Source collections and encrypted source-object observation are real; wrong Deal returns 404. HTTP suite covers admission, object grants and isolation. | Actual product intake still records `original_bytes_only` with `substantive_parsing:false`; no production parser execution was proved. Ticket 12's parsed CSV metadata is an explicit controlled predecessor fixture. |
| 07 Web evidence/templates | Authenticated web-observation projection returned 200. | Browser entered a public URL and clicked capture: UI reported “Quarantined” / captured candidate, while the server observation collection stayed empty. `sources/add/page.tsx` web/template branches only set local state and return. This is a missing product integration, not missing provider configuration. Account template paths require equivalent command integration. |
| 08 Packet/output ceiling | This run created rights assessments, a Source Packet/version and Work Objective through real HTTPS. Exact Packet/Revision worker isolation passed. Output Ceiling remains a server generation gate. | Sources UI can show generic unknown rights/coverage alongside richer API assessments; status fields need mapping and acceptance against the current projection. Older complete preflight/expiry tests remain historical beyond this run's sampled path. |
| 09 Governed AI proposals | AI-run listing is authenticated. Ticket 12 exercised the same governed runtime with real HelloX streams, rejected invalid contracts and successful strictly validated proposals. | Wrong-Deal run list returns empty 200 rather than the 404 used elsewhere. Production parsing is still a predecessor gap. Protected request evidence is a digest receipt rather than full raw request replay; do not claim full request reconstruction. Source-proposal task families were not all rerun against the provider in this audit. |
| 10 Evidence/Fact/Decision | Real HTTPS created a Cash Claim, exact accepted Evidence, Fact and typed acceptance Decision. Existing negative tests cover missing evidence, stale scope and conflict retention. | The main Evidence & Decisions / Control Review surfaces remain tied to fixture IDs and `localStorage` state. A visible “recorded” UI state is not a durable Decision receipt. Ticket 12's inline Decision inspector now reads real records, but does not repair these earlier screens. |
| 11 Deterministic analysis | Real HTTPS created normalized Cash 4.7, pinned calculation/model/scenario and exact 94.7 equity result. Decimal normalization defect was repaired because it blocked Ticket 12; regression first failed then passed. | Main Analysis UI still uses fixed ANL-014 / VAL-009 / JOB-0098 content and a 450 ms timer for validation. Server implementation exists, but this UI does not demonstrate the live calculation/Job/Decision chain. |

## Recommended repair order

1. **P1 — Connect the existing Evidence/Decision/Analysis UI to real commands and
   projections.** Remove success states based on local storage/timers; require
   immutable command receipts, real loading/error states and correct current
   Deal IDs. Re-run the complete source→Fact→Decision→calculation loop in UI.
2. **P1 — Implement the advertised web/template intake commands and real source
   processing chain.** Do not display captured/processed success before a
   durable receipt exists. Preserve the existing rights and output gates.
3. **P1 — Repair Deal-list owner privileges and test it as the actual runtime
   role.** Grant the narrow intended membership read to the existing owner or
   use the established scoped membership helper; do not grant broad runtime
   table access. Also connect sign-out to the real revocation command.
4. **P1 security contract gap — Remove predecessor owner BYPASSRLS deliberately.**
   Live role inspection shows `app_source_owner`, `app_ai_owner`,
   `app_knowledge_owner` and `app_analysis_owner` are NOLOGIN but BYPASSRLS.
   API/Worker/Dispatcher and new `app_deliverable_owner` are NOBYPASSRLS.
   Audit each definer function's policy/privileges before a scoped migration;
   do not blindly flip the roles and break the existing control loop.
5. **P2 — Correct setup/guide/source status mapping and close stated runtime
   evidence debt.** Reconcile UI projections, then verify the queued-job and
   source-processing production-shaped requirements already recorded in the
   earlier tickets. Keep this distinct from buying/configuring services.

## Source pointers

The current findings are supported by `apps/web/components/deal-control/surfaces.tsx`,
`apps/web/app/app/deals/[deal_id]/sources/add/page.tsx`, the Account shell,
`apps/api/src/app.ts`'s Deal list, the `20260830040000` owner grants, and the
server observations above. Historical context is in `ticket-01-evidence.md`
through `ticket-10-evidence.md`, `ticket-01-07-ui-audit.md`, and the original
Ticket 03/04/09/11 comments.

The audit does not change the earlier ticket statuses or hide these gaps under
Ticket 12. No Ticket 13 or later implementation was started.
