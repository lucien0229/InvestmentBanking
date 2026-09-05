# Tickets 01–11 repair acceptance — 2026-09-05

**The authorized Tickets 01–11 audit findings and their bounded follow-up defects are repaired and development verified.** Physical Passkey, automatic Stripe sandbox delivery, authenticated browser commands, responsive UI and logout acceptance are complete. Ticket 12 remains `needs-info` for the three user-deferred configurations below.

Scope is the [original audit](tickets-01-11-development-audit-2026-09-05.md), its six independent review findings, and defects reproduced while completing those same acceptance paths. No Ticket 13+ implementation or renewal-lifecycle expansion was undertaken. This report supersedes earlier pending/Mac-lock statements in the chronological progress log.

## Accepted deployment

- URL: `https://dev-banking.aptoren.com`.
- Release: **`20260905-predecessor-repairs-v12`**; application source **`46cb49a`**, on `develop`. No push. The following documentation commit does not alter deployed application assets.
- API and Web containers are healthy and their Compose configuration points to this exact release. Final API and Guide source SHA-256 values match the local checkout. Independent dispatcher, Reference, Source and Workbook workers run in the Docker Cell; Source and public fetch retain separate rootless supervisors. Existing releases and protected evidence are retained.
- Hosted Supabase has **82 canonical migrations**, through `20260905134031_account_capacity_usage_projection`. Forward migrations reconcile earlier deployed Analysis function definitions, preserve exact native Source identities and validation inputs, and gate limited-preflight acceptance against current Setup. Provider-assigned timestamps were reconciled only after exact SQL MD5 checks. Previously applied migration files were not rewritten for these fixes.
- Final readback confirms `app_commerce_owner`, `app_source_owner`, `app_ai_owner`, `app_knowledge_owner` and `app_analysis_owner` are NOBYPASSRLS. The new capacity projection returns an Account-scoped aggregate without widening runtime access to raw Deal reservations.

## Repair disposition

| Ticket | Repair and development evidence | Disposition |
| --- | --- | --- |
| 01 | Narrow membership grant fixes Deal listing. Prototype-based Account shell/access and actual server revocation replace protocol controls/navigation-only logout. Real mailbox return, user-operated physical Passkey and authenticated Deal creation passed. Real logout recorded `session.revoked`; a fresh protected Deal-list visit then required authentication and exposed no Deal data. Existing HTTP cookie replay returns 401. | Closed |
| 02 | Shared shell retains synthetic boundaries. Browser completed all **9/9** Project Northstar checkpoints, including conflict treatment, cash correction, recovery, Revision and exact artifact links. | Closed; synthetic proof only |
| 03 | Real order identity survives hosted checkout/return; confirmation polls product reconciliation and shows real tax/receipt. Wrong signing-secret configuration was repaired in the development webhook endpoint. A real Stripe **test-mode** purchase delivered automatically and produced one receipt, one entitlement mutation and one checkout-completed measurement. Account usage now reads actual reserved/active slots and excludes released slots; live UI shows **2 used / 2 included**. Purchase capacity is not mislabeled as remaining capacity. | Closed; actual renewal lifecycle remains outside scope |
| 04 | Separate dispatcher/workers, durable PGMQ, independent SIGKILL/90-second watchdog, explicit recovery, duplicate delivery, exact Source/Assumption dependency resume and continuous authorized SSE verified. Twenty samples: command p95 **16.18 ms**, completion visibility p95 **1099.51 ms**. Duplicate delivery retained one initial checkpoint attempt and one allowance commit. | Closed |
| 05 | Deal creation records complete identity/perimeter/mandate and requires explicit final confirmation; advancing the previous step does not auto-submit. Required-field errors are focusable and associated with inputs. Real pass and limited Preflight paths ran against paid capacity. Limited acceptance survives refresh; replay after Setup changes explicitly remains stale and cannot authorize continuation. A new current-Setup preflight/acceptance recovered correctly. Guide uses actual object receipts, showing **4/5 recorded**, with the controlled-artifact checkpoint still pending. | Closed |
| 06 | Real browser TUS upload passed accepted-byte ClamAV and isolated native CSV processing to **25 precise cell fragments**. Seven native-format/unsafe-input probes passed, including XLSX/DOCX/PPTX/PDF coverage and archive/macro/entity denials. Original bytes, native locators, bounded transport recovery and current rights gates verified. | Closed |
| 07 | Browser Web/template forms now invoke durable commands. Own development public URL returned a real snapshot SourceRecord. Separately supplied clean synthetic XLSX returned a quarantined Account template version with eligible compatibility, then exact immutable history/digest/limitations readback. Public fetch supervisor passed real HTTPS plus five unsafe/private URL denials, with exact cleanup. | Closed; format eligibility is separate from production readiness |
| 08 | Purpose-bound rights, conditions, reliance, freshness, coverage and Output Ceiling map actual assessments. Browser created an exact Packet/version and Work Objective, then refreshed its permanent link. Native Source showed allowed/current/complete and 25 fragments. The one-Source Packet correctly stayed `anchor_inventory_only`; excluded uses remained visible. Expiry and version-conflict regressions passed. | Closed |
| 09 | Wrong-Deal AI reads return 404. Full encrypted request envelope/wire bytes commit before provider transport. Real HelloX extraction, evidence-linking and conflict task families passed strict validation; failed transport retained reconstructable request evidence. Proposals remain non-authoritative. | Closed |
| 10 | Actual native Source → selected Claim → accepted Evidence relationship → scoped Human Decision → Fact and approved Assumptions completed in the authenticated browser, with immutable receipts and exact IDs. Same-wording Claim binding, contrary Evidence and negative authority contracts passed focused tests. Keyboard tab associations/roving focus passed. | Closed |
| 11 | Browser normalized cash **4.7** with exact CSV row 3/column 3, selected Source/Representation/Evidence and Decision. It pinned Calculation, Model and Scenario versions, ran exact decimal EV + cash − debt, and persisted an Analysis draft with seven dependencies. New validation receipt contains all four inputs and returns equity **94.7**, delta **0.0**. Forward migrations fixed hosted projection/command drift; all 13 relevant hosted function bodies matched fresh canonical definitions. | Closed; professional review and external use remain separate |

## Real browser and provider identities

The browser used a real Passkey-backed session for Account `485be1b0-a703-47d4-80a7-51568929c0ad`. Its explicitly synthetic paid Deals are:

- Main: `e3d4606c-0092-4b97-9cfd-fbda5f0747d3`.
- Limited-scope/stale-Setup regression: `1a366f94-8235-4d03-9304-ec4a852575f4`.

Stripe test order `ce4c1837-a8a0-4619-b355-d2842b096df9`, automatically received event `evt_1UCIPE2SUlTvcsKtMaaM8HCt`, receipt `13fcdb99-42fb-4301-b48c-7361914d40d0`, entitlement `bc1590a6-9cfc-46a4-acdc-c4bcdd501acb`. Signature verified; received **12:09:13.127668 UTC**, acknowledged **12:09:13.151459 UTC**. Receipt/mutation/checkout-completed counts each **1**. This event was automatic delivery, not a signed manual replay. Earlier failed test-order evidence remains historical. No live-money payment was made.

Native Source `d05d1401-318e-4344-b65c-ae358b4bb157`, Representation `6ab33657-9524-430b-af4f-398576104f6e`, Claim `dc2d926d-2120-4367-90dd-d9eb0844d05b`, Evidence `143613e0-3028-4279-a96a-f66f6d3544cd`, Fact `d89a0fda-580b-40ef-b383-daaeb26cc4af`, Decision `f816d4e0-75f8-4b01-840b-365d119fdf4e`.

Latest Calculation Run `85af4df6-35ba-4bd7-baf8-06ee1810a6d3`, validation `086cd20f-5dc0-4de0-b115-c54854ea102c`, Analysis version `46e78432-98c6-46e1-a4ea-80e0ed05627c`. Earlier validation evidence remains immutable; the latest receipt has the corrected full input map.

Web snapshot Source `57368311-7eb9-45d8-840e-43ec43d41f38`; Account template `e78970f1-cda2-492b-847d-96dbbc9cfe6a`, version `25083b6e-d1d7-4269-a58a-de2f1b79914c`. Logout audit `c1f15f87-4555-43fb-974b-afe14077106d` completed at **14:08:09.857676 UTC**.

## UI acceptance

The confirmed `deal-control-high-fidelity` design remains the basis. Background, surface, foreground, muted text, border and accent OKLCH tokens; system/Inter and mono font stacks; 4–48 px spacing scale; 6 px controls and 8 px panels match its token definitions. Actual commands and durable IDs replace prototype fixtures while retaining its navigation, control boundaries and visual hierarchy.

Desktop inspection covered Account, checkout, complete Deal creation, Setup/limited Preflight, Guide, Sources/Packet, Web/template receipts, Evidence/Human Decision, normalization, Calculation/validation and Analysis draft. Fixes include real-Deal side panels, closed drawers at 1100 px, one main container on permanent Source/Packet routes, proper tab-panel spacing and non-duplicated USD units.

At **1440 px**, checked pages have no page-level horizontal overflow. At **1100 px**, closed workspace drawers leave the page usable; Escape and focus return were verified. At **390 px**, Sources and Analysis retain inspection, no horizontal overflow (`scrollWidth = innerWidth = 390`), and hide material command buttons behind the desktop-resume boundary. Tab End/Home/ArrowLeft/ArrowRight changed selected panel and focus correctly, with only one visible panel. Final responsive Analysis error log was empty. Temporary viewport overrides were reset.

[Screenshots](predecessor-repair-acceptance/screenshots/) retain full-page evidence, including [actual usage](predecessor-repair-acceptance/screenshots/account-usage-desktop.png), [validation](predecessor-repair-acceptance/screenshots/analysis-validation-desktop.png), [mobile validation](predecessor-repair-acceptance/screenshots/analysis-validation-mobile.png), [Guide](predecessor-repair-acceptance/screenshots/guide-checkpoints-desktop.png) and [logout denial](predecessor-repair-acceptance/screenshots/logout-protected-deals.png).

## Verification and review

- One fresh full server suite: **85 tests; 84 passed, 0 failed, 1 opt-in external-provider test skipped**. Its provider scenarios were separately exercised with real HelloX calls.
- Earlier affected fixes: **14/14**, plus Workbook integration **1/1**. Later reproduced defects: commerce **6/6**, Preflight replay **5/5**, Analysis/Evidence **8/8**, account capacity **5/5**. These overlapping selections must not be summed into a unique-test count.
- Capacity regression first failed on `0 != 1`; the same server/PG seam then passed for reserved and released slots and both Account projections.
- Root/Web TypeScript, generated contracts, migration validation (**82 files**) and the final development-host Next build passed. Existing CSS compatibility warnings remain build warnings.
- Independent Standards **2/2** and Spec **4/4** original review findings closed. Bounded follow-ups on exact Source identity, hosted Analysis forward functions, capacity/security and final display changes returned no new findings.

Evidence: [full suite](predecessor-repair-acceptance/full-suite.log), [initial affected tests](predecessor-repair-acceptance/focused-tests.log), [Workbook](predecessor-repair-acceptance/workbook-regression.log), [commerce](predecessor-repair-acceptance/checkout-regression.log), [Preflight replay](predecessor-repair-acceptance/preflight-replay-regression.log), [Analysis/Evidence](predecessor-repair-acceptance/analysis-evidence-regression.log), [capacity](predecessor-repair-acceptance/capacity-regression.log), [final hosted browser persistence](predecessor-repair-acceptance/final-browser-persistence.json), [browser/provider acceptance manifest](predecessor-repair-acceptance/browser-acceptance.json), and [chronological progress](tickets-01-11-repair-progress.md).

The earlier `live-control-loop.json` uses an authenticated development session fixture; the later browser evidence above uses the actual Passkey session. All financial Sources and judgments are disclosed synthetic development inputs. Public proof is synthetic; template eligibility is a format check; mechanical validity does not confer professional or external-use authority. This is development acceptance, not production certification.

## Deferred Ticket 12 configurations

No additional Tickets 01–11 configuration blocker remains. The user-deferred Ticket 12 requirements are unchanged:

1. **Aspose.Cells Python.NET license** for clean native/reader output and parity acceptance.
2. **Independent Google KMS Ed25519 SOFTWARE key version and short-lived identity broker** for exact manifest signing.
3. **Licensed Windows Microsoft 365 Excel Current Channel acceptance host** for open/edit/save/reopen/reimport proof.

Configuration and exact rerun steps are in the [Office runbook](ticket-12-office-runbook.md). Ticket 12 stays `needs-info`; supplying these dependencies and passing the remaining exact-artifact gates is required before `resolved`.
