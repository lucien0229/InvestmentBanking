# Ticket 22 UI remediation

> 历史技术参考：旧实现已废弃。保留原设计和技术合同供用户评估；文中旧状态、配置、运行命令和验收结论不代表当前环境，不授权执行。

## Current acceptance status

The five core object lifecycles, persisted drafts, independent parent/child state, exact Evidence links, material creation/not-required branch, all four generated material Reader paths (15 pages), material QC and exact export entry, 1440/1024/390 prototype behavior, keyboard/error recovery, and Source Impact/reopened history have been exercised on the actual development domain. Both pre-Impact and regenerated Management Presentation professional Reviews were recorded through the UI against independently inspected exact files. The detailed checkpoints below preserve initial failures and their subsequent corrections; earlier “pending” statements describe those historical checkpoints.

The final r12 web has passed actual-domain read-only acceptance at 1440 and 390 px: the long Request heading is 116 characters, its entire 2,101-character body and all seven criteria remain visible in the DOM, document widths match the viewports, and a tail-of-body search still finds the exact Request. The genuine 2.0.2 AI Issue, Information Request and both material proposal reception paths were completed through the UI; both material generation entry points preserve exact AI origin. The root/material Agents separately completed Native/Reader, QC, Review and Controlled Export acceptance. Earlier failures and corrections remain recorded below. Ticket resolution and full-system acceptance belong to the root Agent.

Latest reproducible evidence: `output/playwright/ticket-22-remediation-ui/final-visual/`; latest deployed build: `output/ticket-22-web-build/r12-manifest.json` and `production-build-r12.log`.

## Scope consumed

This implementation follows the Ticket 22 issue and audit, `CONTEXT.md`, the diligence API contracts and migrations, the UX specification, wireframes, information architecture, user flows, `docs/agents/design-inputs.md`, and the confirmed `prototypes/deal-control-high-fidelity/` Auction/detail screens and design tokens. The UI is implemented under the Auction Process Diligence workspace and restores the prototype's nine work areas.

## Delivered UI

- Durable collection and object URLs for Issue, Information Request, Open Item, Meeting, Milestone, Conditional Material and AI proposal records.
- Five detail regions: overview, lineage and impact, controls and decisions, versions and history, and related objects.
- Typed create forms with exact assessed purpose, structured criteria, target dates, Evidence perimeter and explicit gap statements.
- Draft persistence through the authenticated Deal draft API, with restore on a durable `draft` URL, serialized versioned saves and no browser storage of business content.
- Control Review forms with `expected_version`, `If-Match`, explicit confirmation, rationale, alternatives, conditions, revisit triggers, structured criterion dispositions, completion Evidence and occurrence time.
- Legal transition options are filtered by current posture. Meeting and Milestone corrections select a canonical `process_event_id` and preserve superseded history.
- AI run list/detail and independent Banker preparation links retain the proposal provenance; Issue and Request create forms submit `origin_ai_proposal_id` as lineage only.
- Conditional material typed content, disclosure Evidence, Work Objective/Meeting matching, immutable revision route, artifact hashes, readiness/QC/Review presentation, controlled artifact preview and export links.
- Exact Evidence links include purpose/locator context and open the Evidence workspace with the requested UUID; missing exact records are reported instead of silently selecting another row.
- Responsive layout, keyboard tabs, focusable headings, form error summaries, native constraints and reduced interaction at narrow viewports.

## Local browser verification

Authenticated local development UI ran at `http://127.0.0.1:3250` against the API on port `3271`, backed by the isolated PostgreSQL database on port `52927` using a private fixture. The following real API journeys completed:

1. Issue create with eligible Evidence, structured criterion, draft save and durable detail.
2. Information Request create, `response_received` with Source Record, then closed with criterion Evidence; parent Issue remained independent.
3. Open Item create and closed with criterion Evidence.
4. Meeting create, occurred event with actual time and Evidence, then correction selecting the canonical superseded Process Event.
5. Milestone create and achieved event with actual time, Evidence and criterion disposition.
6. Control Review screenshot captured at `output/playwright/ticket-22-remediation-ui/issue-control-review-1440.png`.

The development UI/API fixture is acceptance evidence for local integration only. Root will perform the required remote development server acceptance and provider/database validation.

## Narrow viewport contract

The confirmed prototype README (line 85) and design-system recommendation (line 105) define mobile as restricted inspection / read-only navigation. Screens narrower than 1024px therefore retain `readOnly` and the desktop handoff. The 390px screenshot records this intended inspection mode; it does not demonstrate mobile execution.

## Production web build and standalone package

The repeated `_document.js` missing `../shared/lib/constants` failure was caused by an incomplete old standalone dependency tree at `apps/web/node_modules/next`. Its partial `dist/pages`, `dist/server` and `dist/compiled` tree shadowed the valid root installation. The whole shadow directory was moved reversibly to `/tmp/ib-t22-web-shadow-node_modules-20260910210345`; no product source workaround was introduced.

A successful production build used Linux AMD64 `node:22-bookworm-slim`, the exact lockfile dependencies in `/tmp/ib-t22-linux-deps/node_modules`, `API_ORIGIN=http://api:3001` and the approved Supabase public build configuration from a private env file. `NEXT_PUBLIC_AUTH_MODE=supabase` plus the exact URL/publishable key were confirmed present in the compiled chunks without printing their values. The account-access client chunks retain provider Passkey calls and omit `test_verification_token` handling. There are no environment files in the release.

Outputs:

- Application standalone: `apps/web/.next/standalone/`, including `apps/web/server.cjs` and copied `.next/static`.
- Independent web runtime release: `/tmp/ib-t22-web-release-20260910/`.
- Transfer archive: `/tmp/ib-t22-web-release-20260910.tar.gz`.
- SHA-256: `73eabd22983a3766fa83b8bc021822249a4e4d834dd1dda00a9c6953358042aa`.
- Build log: `output/ticket-22-web-build/production-build.log`.
- Standalone smoke results: `output/ticket-22-web-build/standalone-smoke.json`.

The independent release started successfully in a read-only Linux AMD64 / Node 22 container using `node /opt/web/apps/web/server.cjs`. `/`, `/account-access` and the T22 Diligence route returned 200; all referenced static assets returned 200. API rewrite points to `http://api:3001`, so this package check does not claim remote authenticated API acceptance. Deployment remains with the root Agent.

Build-generated `next-env.d.ts` and `tsconfig.json` changes were restored; the preexisting `tsconfig.tsbuildinfo` was preserved. Existing unrelated CSS autoprefixer warnings remain in the successful build log.

## Final prototype and production-bundle visual review

The confirmed prototype was run directly at `http://127.0.0.1:4177/app/deals/project-northstar/auction-process`. The implementation was inspected from the Linux AMD64 production standalone at `http://127.0.0.1:3252`, backed by the real local API and isolated test database. Both were viewed at 1440, 1024 and 390 pixels. Screenshots and computed CSS measurements are in `output/playwright/ticket-22-remediation-ui/final-visual/`.

- Core background/surface/text/muted/border tokens, system font, spacing and corner radii match the running prototype. Primary action computed background is `oklch(0.664 0.128 116)` in both; height 44px, font 12px, radius 6px and padding 9px 14px match. The apparent olive color is the actual running prototype result and was preserved.
- At 1440px, the page has no document-level horizontal overflow. The global header exists once and remains at viewport top 0 at scroll positions 0 and 800. The earlier full-page screenshot's mid-page sticky header is a capture artifact; `implementation-r2-review-scroll-1440.png` records the real scrolled viewport.
- A full-column historical Issue row revealed its status splitting across lines. The scoped `dc-status-badge` rule now keeps status text together. The production r2 runtime reports `white-space: nowrap`, `word-break: normal` and 24px height for `closed`; see `r2-badge-1440.txt` and `implementation-r2-1440.png`.
- At 1024px, both navigation panels use overlays and full workspace actions remain available. Keyboard Enter opens each panel; Escape closes it and restores focus to its trigger. The Issue create form has nine enabled inputs and an available submit action. The collection tabs support ArrowRight/Home/End with focus, selected panel and durable URL changes.
- At 390px, navigation remains available while controlled inputs and submit are disabled. Enter/Escape and focus return work for both panels. There are zero enabled business inputs; the desktop handoff is visible. Both 1024px and 390px have document scroll width equal to viewport width. See `r2-keyboard-1024.txt`, `r2-keyboard-readonly-390.txt` and the corresponding r2 screenshots.

The first comparison identified three shared-shell differences visible on Ticket 22 pages. These were subsequently remediated for the Diligence route family: desktop Inspector width/padding and responsive widths now follow the running prototype; the handoff is the first child of the workspace main-content region; context, Sidebar and Inspector use sticky placement. At 1440px, the Inspector is 316px wide with 24px padding and Sidebar is 224px. Both remain at top 116px while the global bar remains at 0 and context at 56px, including after a scroll to 800px. The prototype uses top 150px because it additionally renders a 34px synthetic-demo banner; a real Deal does not display that banner. Panel offsets track the actual context height so wrapped controls at 390px do not overlap the navigation panels. These changes are selected by the Diligence route family, preserving other workspace layouts.

## Production r2 package

The final badge change was built with the same Linux AMD64 Node 22 dependencies and approved Supabase public compile configuration. All 23 static pages, type checking and build traces completed successfully.

- Independent runtime: `/tmp/ib-t22-web-release-20260910-r2/`.
- Archive: `/tmp/ib-t22-web-release-20260910-r2.tar.gz`.
- SHA-256: `0fc3fbbf0796ea673f858752ddf895ad0259fcc6fae16d5ee2b5a7edf612bfb6`.
- Complete log: `output/ticket-22-web-build/production-build-r2.log`.
- Source, archive and build-log hashes: `output/ticket-22-web-build/r2-manifest.json`.

The r2 standalone was run read-only in Linux and its actual served CSS, responsive behavior and sticky header were checked above. Build-generated Next config changes were restored again. Root owns remote deployment.

## Remote authenticated UI checkpoint

The real Supabase/Passkey browser session was restored privately into a separate browser session. At `https://dev-banking.aptoren.com/app/deals`, the authenticated account navigation, zero-workspace count and first-Deal empty state rendered successfully. Evidence: `final-visual/dev-real-auth-empty-deals-1440.png`. This checkpoint proves remote authentication and the empty-state navigation only; the required remote T22 object and control acceptance is recorded separately once its scoped Deal data is available.


The shell comparison used the actual `WorkspaceShell.tsx`, `ContextInspector.tsx`, `styles/tokens.css`, `styles/components.css`, `styles/responsive.css` and runtime DOM of the confirmed prototype. The mobile boundary is inside its `main-content` region, after the Deal context and synthetic banner. The implementation now follows that DOM placement. `DeviceBoundary` still enforces the same command boundary and renders only one `desktop-handoff` element per route.


## Final production r3 and real development Issue acceptance

The final scoped shell changes were built successfully for Linux AMD64 / Node 22 with the approved Supabase public configuration. The final deployable archive is `/tmp/ib-t22-web-release-20260910-r3.tar.gz`, SHA-256 `4c54c04d9401845aca8c683597d6a41285a6c49a177a761cb909560ca1d620d4`. Source and bundle hashes are in `output/ticket-22-web-build/r3-manifest.json`; complete successful build output is in `production-build-r3.log` in the same directory. Generated Next config edits were restored and the preexisting tsbuildinfo retained.

The exact r3 standalone was started read-only in Linux and verified at 1440/1024/390px. `r3-sticky-1440.txt` records the final sticky geometry while scrolled to 800px. `r3-keyboard-responsive.txt` records overlay widths, keyboard/focus return, enabled desktop inputs and zero enabled mobile inputs. Final local runtime screenshots use the `implementation-r3-` prefix.

On the real development domain, Deal `0b58b708-f06b-41fe-bf51-a1786eeb4377` displayed active In Market scope. The real authenticated browser completed an independent explicit-gap Issue journey:

1. The collection empty state rendered and its create action opened the exact scoped form.
2. A draft with statement, purpose `diligence`, resolution criterion and explicit gap was saved by POST 201 (`5ff0877d-f02c-43f1-b867-9ab813d193c5`). Reload used GET 200 and restored all recorded fields.
3. Submitting through the form produced POST `/diligence/issues` 201 and Issue `39f25ba7-9ff5-4542-a7c5-3b80ebaae991`, open v1.
4. Exact detail displayed scope, criterion and gap. Versions & History displayed its creation event. Reload preserved `view=history` and the same record.

Evidence is in `final-visual/dev-draft-issue-acceptance.json`, `dev-draft-create-network.txt`, `dev-draft-restore.txt`, `dev-history-refresh.txt` and the matching `dev-*.png` screenshots. This journey used real server persistence with no eligible Evidence at the time, so it establishes gap recording and draft/history behavior, not Issue closure or material-generation acceptance.


## Actual development domain r3 final UI acceptance

The deployed r3 page was verified at `https://dev-banking.aptoren.com` using the real Supabase / Passkey-backed authenticated browser and the paid Deal `0b58b708-f06b-41fe-bf51-a1786eeb4377`. This is remote development evidence, separate from the earlier local fixture. The real Source was uploaded through TUS, scanned and parsed before eligible Evidence became available. The primary inspected Evidence is `539a5eea-dbfa-49ae-97d1-5f2143851d4f`, claim “The synthetic FY2025 revenue schedule records USD 125 million.”, Source `cfe9d2a6-2662-42c1-8311-3ce5b3a72509`, CSV row 2 / column 6.

### Prototype, responsive and keyboard acceptance

- At 1440px the document width is 1440px, global bar is sticky at top 0 / height 56px, context is at top 56 / height 60px, Sidebar is 224px and Inspector 316px. Both panels start at 116px and remain there while the Review page is scrolled to 800px. The focused H1 outline is intentional keyboard focus, not an overlapping header.
- At 1024px document width remains 1024px. Navigation and Inspector are initially hidden overlays. Keyboard Enter opens the exact panel and Escape closes it with focus restored to the invoking button. The navigation width is 260px and Inspector 360px; their top follows the actual context bottom. Business forms remain executable at this width.
- At 390px document width remains 390px. The long actual Deal name wraps the context to 128.5px; both overlays start at its actual bottom, 184.5px, avoiding overlap. Navigation width is 300px and Inspector width 390px. The desktop handoff appears once, first in main-content. All controlled inputs and submit are disabled, matching the confirmed restricted mobile inspection mode. Enter / Escape / focus return passed for both panels.
- Collection ArrowRight / Home / End change selected family, focus and durable URL consistently. Search `customer concentration` filters the original Issue; reload retains the query. The loaded collection produced no console errors or warnings. The deliberate AI rejection below produces the expected failed-request console entry.

Evidence: `final-visual/dev-r3-layout.json.txt`, `dev-r3-control-keyboard.txt`, `dev-collection-keyboard-search.txt`, `dev-r3-issue-{1440,1024,390}.png`, `dev-r3-control-review-{1440,1024,390}.png`.

### Five object UI commands and independent lifecycles

Every create and disposition below was submitted through the actual rendered form, with the real API response recorded. All returned 201. Control Review requests included current `If-Match`, `expected_version`, explicit confirmation, rationale, alternatives, conditions, revisit triggers and a met structured criterion supported by the exact primary Evidence. Meeting / Milestone completion recorded the actual internal development inspection time `2026-09-10T14:35:00.000Z`; no buyer meeting or transaction milestone is asserted.

| Object | Actual ID | UI result and exact acceptance scope |
| --- | --- | --- |
| Revenue Issue | `8318c682-8e37-4f61-814c-ca4571437754` | Created open v1, closed v2. Confirm the synthetic FY2025 USD 125 million claim and its selected CSV locator for diligence. |
| Information Request | `f9bf0839-e8fd-49a4-88d4-5526f7c56958` | Created, response_received with the exact Source, closed v3. Its original criterion requires the accepted synthetic FY2025 revenue schedule for diligence. |
| Open Item | `6019e159-d59d-48cf-82e5-0013317d1e15` | Created and closed v2. Its original criterion requires inspection of the exact revenue Evidence and Source locator. |
| Meeting | `565064a0-93a6-44cc-b342-b296da3e8d24` | Internal review created and occurred v2; canonical Process Event `c7596614-844d-441f-8667-e2a2068ba835`. |
| Milestone | `0dd30172-2eee-48c4-bac9-d0738cb0cc9f` | Internal development evidence-inspection milestone created and achieved v2; canonical Process Event `5718529a-4e5c-46af-88de-21e0b463e357`. |

The original customer-concentration Issue `39f25ba7-9ff5-4542-a7c5-3b80ebaae991` remains **open v1**. The actual Related Objects page simultaneously shows its revenue Request and Open Item closed. The revenue Evidence does not substantiate concentration, so no concentration closure was recorded. This demonstrates independent lifecycles while preserving the unanswered original scope.

Overview, Lineage & Impact, Controls & Decisions, Versions & History and Related Objects loaded through the rendered detail tabs; URL changes preserve the selected region. Completed histories display the recorded rationale, criterion disposition, Evidence reference and canonical Human Decision / Process Event links. The exact Evidence URL was opened and showed the selected UUID, claim and row / column locator.

Evidence: `final-visual/dev-object-detail-regions.txt`, `dev-core-ui-completions.txt`, `dev-request-response.txt`, `dev-request-closed.txt`, `dev-revenue-issue-created.txt`, `dev-revenue-issue-closed.txt`, `dev-parent-issue-independent.txt`, `dev-exact-evidence.png`, and corresponding completed-history screenshots.

### Material creation, dynamic draft and not-required scope

The actual UI created internal update-deck record `b8c4a84d-0211-4058-a575-837ca517b18e` with `applicability=not_required` using the completed internal Meeting above and the complete two-period Work Objective `056323c8-1384-44e5-b232-6aedc727d47f` / Packet `36102558-0f52-4834-9cfc-686fae8a06b2`. The professional reason is that the completed inspection is recorded in its Meeting / Issue history and an additional update deck is not required.

Its two typed items retain (1) the supported exact revenue claim and qualification, and (2) a subsequent-events question with an explicit unsupported gap. Draft `9cce9117-b955-452a-ba0b-f46a39d7292c` restored after reload, including the dynamically added second item, question kind, gap text and selected exact Evidence. Submission returned 201; detail displays `not stage required`, no Revision, no generation Job, and an explicit statement that no missing-artifact blocker is created. The generation action is absent.

Evidence: `final-visual/dev-material-form-filled.txt`, `dev-material-draft-restored.{txt,png}`, `dev-material-not-required.{txt,png}`. Actual generated Native / Reader, QC and Review acceptance is tracked separately below once the real renderer completes.

### AI request error recovery checkpoint

The actual UI submitted `diligence_issue_proposal` with the complete Work Objective / Packet above, exact FY2025 Evidence and an explicit subsequent-events gap. The server returned 409 `diligence_context_invalid`; the form retained all inputs and focused the accessible error summary. API investigation located an r3 bundle resource-path failure, so this result is **not** evidence of the intended `diligence_evaluation_required` gate. It is only error-display / recovery evidence. The AI Agent is correcting the runtime resource resolution and owns genuine provider evaluation / task enablement; no successful AI Job, Run or proposal is claimed at this checkpoint.

Evidence: `final-visual/dev-ai-evaluation-gate.{txt,png}`. A fresh post-fix check must record the specific evaluation gate or a real successful Job separately.


The first real management-presentation generation (`747a0afb-97b4-4260-aa8b-b38188d03215`, Revision `8b220453-5c60-4e27-88b0-d66691ba0450`, Job `3339cb48-cd3c-4de5-8e90-501073f0b721`) failed before publishing artifacts. Its rendered detail correctly shows `failed terminal`, no Reader preview action, no Review action and the specific missing readiness requirements. The original failed Job is preserved as history. The default `production_v1` acceptance profile on this incomplete Revision does not assert successful production validation; development scope is applied only to exact synthetic Revisions by the root Agent. Evidence: `final-visual/dev-material-failed-generation.{txt,png}`.


### Exact material export entry correction

Final integration inspection found that the T22 material link supplied `?revision=…`, while the existing export workspace consumes `revision_id` and otherwise falls back to the Guide Revision. The current sample happened to match that fallback, but the link did not preserve the selected material by contract. The fix changes only this T22 link to `?revision_id=…`; the shared export workspace is unchanged. The next web r4 package includes this correction.

The real incomplete Revision export review displayed its exact missing Native / Reader, Manifest, control-record and integrity blockers and disabled creation. No export was submitted. Saved review `0eab2472-6d2d-4bbc-9673-c900304a56dd` is an inspection record only. Evidence: `final-visual/dev-material-export-blocked.{txt,png}`. Final post-r4 entry validation must demonstrate `revision_id` and the selected exact Revision even when the Guide points elsewhere.

The material detail itself was also checked at 1024px and 390px: no document-level horizontal overflow, one generation input enabled at 1024px and zero at 390px. Evidence: `final-visual/dev-material-responsive-boundary.txt` and `dev-material-boundary-{1024,390}.png`.


## Final production web r4

The single exact-Revision link correction built successfully with the same Linux AMD64 / Node 22 dependencies and approved Supabase public configuration. All 23 pages and type validation passed. The independent read-only runtime started in 523ms and returned 200 for `/`, `/account-access` and the T22 Diligence route. Compiled chunks contain the exact `revision_id` link. Generated Next config edits were restored and the preexisting tsbuildinfo was preserved.

- Archive: `/tmp/ib-t22-web-release-20260910-r4.tar.gz`.
- SHA-256: `0682a4e44b2a17705e0fae59cfd0c5cd890a47cd9b81b5a3ad75ef108a137bee`.
- Independent release directory: `/tmp/ib-t22-web-release-20260910-r4/`.
- Build log: `output/ticket-22-web-build/production-build-r4.log`.
- Source / bundle / log manifest: `output/ticket-22-web-build/r4-manifest.json`; it verifies only `diligence-material-ai.tsx` changed from r3.
- Runtime checks: `output/ticket-22-web-build/r4-standalone-smoke.json`.


## Reader completeness and error-focus corrections for web r5

The actual r4 material exposed four Reader page images, but the original single-image control selected the first unsorted artifact (`reader-page-4.png`) and offered no route to the other three pages. The T22 preview now sorts page images numerically, labels the current page and total, offers an accessible page selector and Previous / Next Reader page buttons, and shares the same component between detail and Review. Each selection reads that exact page through its own preview grant. The old image is unmounted by artifact ID so a new page cannot display the previous image under a new label.

The first rendered inspection also revealed that the old fixed iframe height remained after switching to image previews: an actual 1105×621 image was stretched to 802×600. The T22 image now uses its natural aspect ratio. Another actual full-QC test revealed 390px document overflow to 870px: generic global two-column `dl` styling was inherited at every nested semantic record. The T22 semantic `dl` now defines its intended single-column record layout; the main shell and shared export page are unchanged.

A restored AI draft's first rejected request once left focus on BODY despite a visible error summary, while a later attempt focused correctly. The T22 `CommandError` now focuses after the error is committed through `useEffect`, removing dependence on the parent's animation-frame timing. The initial observed failure is retained in `final-visual/dev-r4-first-ai-focus-failure.json`.

The new frontend was exercised locally at `http://127.0.0.1:3253` against the **actual development HTTPS API**, using the already authorized session copied privately for this temporary local frontend. These checks are not a claim that the new UI was already deployed. The frontend proxy forwarded actual API requests; no API responses, artifact bytes or business objects were fabricated.

- All four actual Reader pages returned separate preview-grant 201 responses. They were opened and visually inspected in both the preliminary and corrected view. The corrected current Revision's images rendered at 800×450 from 1105×621, retaining the original ratio. Page content, qualification, explicit unanswered question, exact Source locator and Revision footers are visible.
- The Previous / Next controls were focused and operated with Enter. Current-page labels and the selected image changed correctly, with one rendered image at a time.
- At 390px, the Reader selector and navigation remain enabled for inspection outside the disabled business fieldset. All Review business inputs are disabled and the submit button is disabled. A page change returned 201 and the Reader rendered at 322×181.
- After the nested semantic correction, the complete QC / Review page has document width 390px with no overflowing descendants. At 1440px it remains 1440px wide and the Inspector remains 316px. The record values have full-width columns instead of zero-width nested values.
- A freshly reloaded and restored AI draft's first 409 `diligence_evaluation_required` response focused DIV `role=alert` and preserved its Work Objective. The clearer API explanation is provided separately in the r5 API release.

Evidence: `final-visual/dev-r4-material-reader-first.{txt,png}`, `local-r5-live-reader-pages.txt`, `local-r5-final-reader-keyboard.txt`, `local-r5-final-reader-page-{1,2,3,4}.png`, `local-r5-final-reader-review-390.png`, `local-r5-final-qc-layout.txt`, `local-r5-final-qc-{1440,390}.png`, and `local-r5-first-error-focus.{txt,png}`. The earlier keyboard journal retains the observed 870px pre-fix width; the later QC layout journal records the 390px corrected width.


## Production web r5 package

The final Reader / error-focus / semantic-layout changes passed the Linux AMD64 / Node 22 production build, including types and all 23 static pages. The production public Supabase configuration was verified in compiled chunks without printing values. The release contains no env files. Generated Next configuration and the preexisting tsbuildinfo were restored.

- Archive: `/tmp/ib-t22-web-release-20260910-r5.tar.gz`.
- SHA-256: `8f02f301d7558175996248e021c26c2aacb2fed0b0663b518c5671b0508f8520`.
- Independent release: `/tmp/ib-t22-web-release-20260910-r5/`.
- Full build log: `output/ticket-22-web-build/production-build-r5.log`.
- Source / bundle / log manifest: `output/ticket-22-web-build/r5-manifest.json`; only the scoped diligence CSS, forms and material/AI component changed from r4.
- Read-only Linux runtime smoke: `output/ticket-22-web-build/r5-standalone-smoke.json`.

The temporary local frontend process, its private copied browser state and its development log were removed after verification. Real server session files maintained by the root / material Agent were preserved.


## Canonical QC field correction

Inspection of the actual QC record and canonical `deliverable.qc_run` contract found that it stores `ruleset`, `checks` and `report`, with no `result` or `status` field. The T22 display incorrectly requested the absent overall field and rendered “not evaluated”, then selected the renderer report before the actual check outcomes. This was a frontend contract error; it did not change any QC result.

The scoped correction displays the recorded Ruleset and all deterministic `checks` directly. The renderer `report` remains available in an explicit inspection disclosure. No overall pass status is invented or inferred. This correction is the only planned web r6 change; all other UI is frozen pending the remaining remote acceptance checklist.

The exact management presentation `777c7b94-0545-4cd5-a02c-7d07f0f8af64` was independently inspected after actual Controlled Export download: Native PPTX SHA-256 `b60e4e800d07ab7520ccae6ef89edf46fcb371bb354d83986614f7b48e48e53d`; Reader PDF SHA-256 `a3c58631cee4924bb2892d4c32faa5faa67f1b0bd94fb7833ea9b2a59d164a81`. The four Native slide text sets match the same PDF pages after normalizing PDF line-wrap whitespace. All four rendered Reader pages were inspected for the supported claim, explicit question/gap, qualification, Source locator and exact Revision footer. This establishes a factual inspection basis for a bounded internal professional-suitability Review; it does not establish Microsoft PowerPoint / production Office compatibility. Detailed evidence is `final-visual/management-professional-inspection.json`.


## Production web r6 package

The canonical QC rendering correction passed the Linux AMD64 / Node 22 build and type validation with all 23 static pages. The production Supabase public compile settings are present, no env files are packaged, and the prior Next config / tsbuildinfo files were restored. A read-only standalone runtime returned 200 for home, account access and T22 Diligence, and the new canonical QC labels are present in served chunks.

- Archive: `/tmp/ib-t22-web-release-20260910-r6.tar.gz`.
- SHA-256: `d2f3176ae6b71bcf549f8faa698db32c6ddb52ae09691a32e147929abb31177b`.
- Complete tree: `/tmp/ib-t22-web-release-20260910-r6/` (2175 files).
- Full build log: `output/ticket-22-web-build/production-build-r6.log`.
- Source / bundle / log manifest: `output/ticket-22-web-build/r6-manifest.json`; only the QC render component changed from r5.
- Every release-file SHA-256: `output/ticket-22-web-build/r6-tree-sha256.json`.
- Runtime smoke: `output/ticket-22-web-build/r6-standalone-smoke.json`.

The full tree and archive remain available while the root Agent transfers only the changed files over the constrained server link and verifies the final remote tree. Source editing is complete; remaining work is actual final-domain acceptance.


## Final development-domain Reader and Review acceptance

The root Agent activated web r6 on the real development domain, `https://dev-banking.aptoren.com`, and confirmed the healthy API start at `2026-09-10T15:42:12Z`. The existing authorized Supabase / Passkey browser session was used; the following are actual HTTPS UI checks, not local fixtures.

All four current material Revisions were opened from their own durable detail URLs. The page order was inspected through the labelled Reader selector and keyboard Enter on Next Reader page. All **15 pages** returned their own preview-grant 201 response, selected the expected artifact, and rendered one exact image at a time. The 12 presentation pages retained their 1105×621 natural ratio at 800×450 display. The schedule's two 969×1370 pages displayed at 800×1131 and its 704×911 appendix at 800×1035. Every desktop document width stayed 1440px.

| Material | Current exact Revision | Reader pages | T22 export entry |
| --- | --- | ---: | --- |
| Management Presentation | `777c7b94-0545-4cd5-a02c-7d07f0f8af64` | 4 | `revision_id` matches |
| Update deck | `71964b26-ec7a-4a7c-9f7d-4101163ce219` | 4 | `revision_id` matches |
| Meeting questions | `a663d271-b1d2-4153-8470-3c791d8b9aa6` | 4 | `revision_id` matches |
| Supporting schedule | `50ec0a7e-e06d-4ee2-9eb6-80dee743c02e` | 3 | `revision_id` matches |

Each actual QC section displays `diligence-material-qc-1.0.0` and its stored deterministic check codes, explanations and outcomes. All nine checks in each of these exact successful records are `passed`; the UI does not manufacture an overall result field. The renderer report remains available separately. Earlier failed Jobs and historical Revisions remain visible.

The reserved Management Presentation `professional_suitability` Review was submitted through the actual r5 rendered Review form and returned **201**, Review ID `034667d9-6c10-4cf3-94eb-607f81e49960`. It binds the exact current Revision above, purpose `diligence`, audience `internal_banker`, and the inspected Native PPTX, Reader PDF and all four Reader page artifact IDs. The rationale is limited to the synthetic supported revenue claim, explicitly unanswered question, qualifications and Source locator. It retains internal-development limitations and does not assert external authority or Microsoft 365 / production Office compatibility. The other five standards are independent records created by the material Agent. The subsequent r6 material UI displays `circulation_candidate`.

Evidence: `final-visual/dev-r6-materials-1-2.txt`, `dev-r6-materials-3-4.txt`, all `dev-r6-<material>-page-<n>.png` files, and `dev-r5-management-professional-review.{txt,png}`. The first schedule element screenshots include the sticky context bar because Playwright resized the viewport for a taller-than-viewport element; final normal-viewport screenshots below are used to verify the actual layout.

The r5 first-submission AI recovery check also passed on the actual domain: 409 `diligence_evaluation_required`, clear user-facing explanation that evaluation must complete, focus on the DIV `role=alert`, and retained exact Work Objective / gap input. Evidence: `final-visual/dev-r5-ai-first-error-focus.{txt,png}`. Positive AI Job / Run / proposal acceptance remains separate and is not claimed by this negative gate check.


### Final responsive, QC, exact-export and evaluation-gate checks

After the root Agent activated the r7 backend at `2026-09-10T15:51:42Z` with the identical r6 web tree, the final rendered material Review was checked at 1440, 1024 and 390px. Full QC checks and the expanded renderer report were included. Each document width exactly matched its viewport, with no overflowing main-content descendants. The 1440px Inspector remains 316px; global/context bars remain at 0/56px. Both overlay panels at 1024 and 390px open with Enter, close with Escape, and restore focus to the invoking button. Their actual tops follow the wrapped context bottom.

At 390px, all 13 business Review inputs are effectively disabled and the business submit button is disabled. The Reader selector remains enabled. All four management Reader pages were opened with independent 201 grants and keyboard Next actions, one image at a time, at 322×181. This preserves the confirmed restricted mobile inspection contract. At 1024 and 1440px the business controls are enabled; no duplicate Review was submitted. Evidence: `final-visual/dev-r6-final-responsive-qc.txt`, `dev-r6-final-review-{1440,1024,390}.png`, `dev-r6-final-qc-{1440,1024,390}.png`, and `dev-r6-mobile-reader-page-{1,2,3,4}.png`.

All four material export links were **clicked** in the actual browser. Each created its own immutable inspection Review with 201, and the requested `revision_id`, returned `review.revision_id`, returned `scope.revision.id` and rendered Revision perimeter all match that material's exact current Revision. All four frozen scopes have `hard_blockers=[]` and `readiness=circulation_candidate`. This confirms the entry contract without relying on a Guide fallback. No duplicate Controlled Export was created by these inspection clicks.

| Material | Saved export inspection Review |
| --- | --- |
| Management Presentation | `3b6e99ac-b8ff-481d-a6c3-e0131fbcd967` |
| Update deck | `fa33c714-0d40-43d6-88a8-9abba5a5622b` |
| Meeting questions | `d0bbf6fa-ee6b-48fa-ada9-c0089a444c05` |
| Supporting schedule | `b31ee339-c874-4dff-8cbb-da27bf926937` |

Evidence: `final-visual/dev-r6-exact-export-clicks.txt`, `dev-r6-export-<material>.png`. The schedule's three pages were additionally checked using an unchanged normal 1440×1600 viewport, with the image top below the sticky context. All title/content/qualification/gap/Evidence/locator regions are visible; this resolves the earlier element-screenshot overlay ambiguity without a product change. Evidence: `dev-r6-schedule-normal-viewport.txt` and `dev-r6-supporting_schedule-viewport-page-{1,2,3}.png`.

The final r7 freshly restored AI draft's first submit again returned 409 `diligence_evaluation_required` with the clear evaluation explanation, `continue_manual_diligence`, focus on the alert and retained exact Work Objective / gap. Evidence: `dev-r7-ai-first-error-focus.{txt,png}`. This proves the unassessed-task boundary and recovery, not a successful AI run. The root Agent was notified that all pre-Impact UI reading was complete and authorized the shared Source Impact sequence.

### Exact Native format label correction

Actual export inspection revealed one further display error: the shared export file icon labelled all Native artifacts `XLSX`, including the correctly named and hashed PPTX. With explicit root authorization, the change is limited to deriving the Native label from the actual `.pptx`, `.xlsx` or `.docx` filename extension, case-insensitively, with `Native` for an unknown format. Reader PDF and all export scope / authorization / download behavior are unchanged. The pre-fix screenshot is preserved above; r8 will carry this single display correction and the actual PPTX / XLSX entries will be rechecked.


## Production web r8 package

The single exact Native format-label correction passed the Linux AMD64 / Node 22 production build, types and all 23 static pages. Compiled public Supabase settings were checked without printing them. No env files are included; generated Next config and the prior tsbuildinfo were restored. The read-only standalone returned 200 for home, account access and T22 Diligence. No test was added merely to repeat this label implementation; actual PPTX and XLSX page checks follow deployment.

- Archive: `/tmp/ib-t22-web-release-20260910-r8.tar.gz`.
- SHA-256: `0551f76eeebecb2927c44c75ffec0839687a0d2ed8069ef0123015468e69f76d`.
- Complete tree: `/tmp/ib-t22-web-release-20260910-r8/` (2174 files; canonical `server.cjs` is retained and the unused duplicate `server.js` is absent).
- Full build log: `output/ticket-22-web-build/production-build-r8.log`.
- Source / bundle / log manifest: `output/ticket-22-web-build/r8-manifest.json`; only `export-workspace.tsx` changed from r6.
- Every release-file SHA-256: `output/ticket-22-web-build/r8-tree-sha256.json`.
- Runtime smoke: `output/ticket-22-web-build/r8-standalone-smoke.json`.

The root Agent owns remote activation. All prior r6 UI behavior remains unchanged by this label-only package.


## Source Impact and regenerated management Revision UI acceptance

After shared Source Impact Assessment `d2505599-47e0-4ffe-b9ab-e88310e42b4b` was recorded by the material Agent, each of the five actual UI-created objects was freshly opened on its durable Versions & History URL. The Issue, Open Item, Meeting and Milestone show reopened v3; the Information Request shows reopened v4. The preceding closed / occurred / achieved dispositions remain visible with their original reasons and times, and the Meeting / Milestone retain their exact canonical Process Event references. Evidence: `final-visual/dev-impact-five-object-history.txt` and `dev-impact-<family>.png`. These records were not silently closed again.

The regenerated management Revision `24f7e3fc-e0a2-4515-8fd1-34ce27c7c5d1` was independently inspected in the actual browser. Its four new Reader artifacts each returned 201, use the new Revision footer, preserve the supported USD 125 million claim and explicit unanswered subsequent-events question, and retain the exact qualification / Source locator. All pages remain 800×450 at desktop without clipping or aspect distortion. Its exact export entry now carries the new Revision ID; its canonical material QC records all nine checks as passed. Evidence: `dev-post-impact-management-reader.txt` and `dev-post-impact-management_presentation-page-{1,2,3,4}.png`.

The newly downloaded exact Native PPTX hash is `ad92fada834cb50bcbbf6a09357494ce24016cee4e3ae2d75f327af0436360ac`; the Reader PDF hash is `69646131ea0cbb333ac40a83a26836ed7f5e6f1d226c84c1010e9c6fdb6748bc`. Independent Native XML / PDF extraction confirms four slides / pages and every Native text item on the matching Reader page after whitespace normalization. Inspection report: `final-visual/post-impact-management-professional-inspection.json`.

A **new**, exact-Revision `professional_suitability` Review was then submitted through the real UI, returning 201 at `2026-09-10T16:04:36.097Z`, Review `71355377-2e4b-4c6b-b77e-84a445a7bad0`. It covers the six newly inspected Native / PDF / page artifacts, exact purpose `diligence` and audience `internal_banker`. Its rationale explicitly records reinspection after Impact and no inheritance of the preceding Revision's Review. Its limitations keep reopened diligence objects subject to their own reassessment and retain the internal synthetic development / unanswered-gap / no external authority / no Microsoft 365 production claim boundaries. Evidence: `final-visual/dev-post-impact-management-professional-review.{txt,png}`.


## Final r8 actual-domain format verification and handoff

The root Agent activated r8 (API start `2026-09-10T16:05:04Z`, web start `2026-09-10T16:05:10Z`) and confirmed actual HTTPS health. Fresh browser navigation to the two already saved exact export inspection Reviews now displays **PPTX** for `diligence-material.pptx` and **XLSX** for `diligence-material.xlsx`, while both Reader copies retain **PDF**. Filename, exact hash and Revision perimeter remain correct. These checks reuse frozen inspection records and create no new export or Review. Evidence: `final-visual/dev-r8-native-labels.txt` and `dev-r8-native-label-{management_presentation,supporting_schedule}.png`.

Historical checkpoint: all then-current T22 UI implementation and actual-domain acceptance assigned to this module was complete. The successfully exercised boundaries include the five object lifecycles and Impact reopening, exact criteria/Evidence/history, typed material and persisted dynamic draft, four generated material Reader/QC/export paths, old-versus-new Revision Review separation, confirmed prototype tokens/layout and 1440/1024/390 behavior, keyboard/focus recovery, and the genuine unassessed-AI rejection. A positive AI run/proposal/Banker reception remains explicitly unclaimed until an individual task passes its complete required evaluation and produces actual development IDs; the root Agent controls that remaining full-ticket acceptance. No additional frontend design or shared-workspace behavior is being expanded.

## R9 genuine AI submission and r10 correction checkpoint

The Issue preparation task was submitted once through the actual development UI only after the AI Agent confirmed that `diligence_issue_proposal` 2.0.2 had passed all three required cases, each with three valid passing judges, and had been enabled in the development environment. The restored draft retained Work Objective `056323c8-1384-44e5-b232-6aedc727d47f`, Packet `36102558-0f52-4834-9cfc-686fae8a06b2`, Evidence `539a5eea-dbfa-49ae-97d1-5f2143851d4f`, and the explicit unanswered subsequent-events gap. No other task was submitted by this UI session.

The UI navigated to actual Job `f73f0365-c520-40bd-a050-14d4a03040db`, created at `2026-09-10T17:16:55.896Z`; its accepted inputs and immutable 2.0.2 identity were read back. It completed at `17:19:23.973Z` with Run `6c85319f-62ee-4fcb-b821-3ef401b7747e`, status `completed`, outcome `succeeded`. The one POST response body could not be retained after navigation because the browser released its CDP response resource; this collection error is preserved and the request was **not** repeated. The accepted Job and Run provide the durable receipt and exact input evidence.

The Run returned two proposals, both read in full: `1a1e55fa-dc08-4310-98fa-310c1682da83` asks for the FY2025 revenue definition, period/perimeter and reconciliation; `f0de1d04-e54a-46b4-9aa4-6bffbcbfa6dc` asks for an answer to the explicit subsequent-events gap. The revenue proposal qualifies the USD 125 million as a statement in the located Source, not an established Fact; neither proposal resolves an Issue or asserts that any subsequent event occurred. Both preserve their limitations and `insufficient_support` state.

The actual Diligence collection initially returned `ai_proposals: []` despite those persisted canonical proposals. The collection therefore showed zero records, preventing visible inspection and Banker reception. This failure is preserved in `final-visual/dev-r9-ai-missing-proposals.png` and `dev-r9-ai-issue-run.txt`; the root/AI Agent own the canonical projection correction. No business record was fabricated to bypass it.

The related minimum UI correction retains an exact AI origin in **both** material generation entry points. First generation inherits the material's origin; subsequent generation inherits only the current revision content's origin, with a null origin remaining null. An explicitly supplied new proposal takes precedence. Accepted Banker edits remain distinct from the immutable proposal while keeping their provenance. The same release renders the returned proposal's full support/limitations, canonical validations, and Run-fragment-to-Source mapping, and exposes existing abstention missing inputs/recovery conditions in a read-only expandable section. The actual abstention Run `4caa0234-386e-4bf4-b4c0-e13d2fdf682d` is reused for that display check; no new provider request is needed.

Evidence at this checkpoint: `dev-r9-ai-prepared-not-submitted.{txt,png}`, `dev-r9-ai-issue-submit.txt`, `dev-r9-ai-issue-job-current.{txt,png}`, `dev-r9-ai-issue-run.txt`, and `dev-r9-existing-ai-abstention-readback.txt`. Final r10 browser reception and material generation results will be recorded after the root Agent activates that release.

The final r10 web package is `/tmp/ib-t22-web-release-20260910-r10.tar.gz`, SHA-256 `2e1a87a43cf2697946a56c36df6e87d939da294ef6e29be4fe55b2b315a54be1`. Linux amd64 Node 22 production compilation, type validation and all 23 static pages completed successfully. The compiled public Supabase configuration and expected UI changes were checked without logging configuration values; the standalone runtime returned HTTP 200 for the public page, account access and exact Diligence route. `next-env.d.ts`, `tsconfig.json` and the pre-existing `tsconfig.tsbuildinfo` were restored byte-for-byte, and the temporary smoke container was removed. The complete standalone tree, source/bundle hashes and build log remain in `output/ticket-22-web-build/r10-{manifest,tree-sha256,standalone-smoke}.json` and `production-build-r10.log`.

## R10 actual AI reception

After the root Agent activated r10 and verified actual HTTPS health, the canonical AI collection displayed the persisted proposals. The Issue proposal's detail showed `completed / succeeded`, version 2.0.2, all three passed validations, its support limitations and the exact Run-fragment mapping to Source `cfe9d2a6-2662-42c1-8311-3ce5b3a72509`, CSV row 2 / column 6. Clicking the Source link opened that exact Source record. The initial pre-load view is retained separately from the fully loaded view; source/run metadata was confirmed after the Run GET completed.

The Banker then used **Prepare Banker record**, selected medium internal-review priority and confirmed the exact Evidence. The first acceptance criterion was edited to allow an evidenced correction or explained difference from the source-reported USD 125 million instead of forcing reconciliation to an assumed true amount. The source-statement limitation and exact missing-definition/perimeter/reconciliation gap were retained explicitly. The real UI create returned 201: Issue `3bd8d73f-94ff-4bb3-9ede-aed1196e0b09`, open v1, origin Proposal `1a1e55fa-dc08-4310-98fa-310c1682da83`, Banker creation history `53693939-2614-4369-abba-13611035ffce`. `current_decision_id` is null and the exact Issue has no Human Decision; this is a creation/provenance chain, not a closure decision. Evidence: `dev-r10-ai-issue-{detail-loaded,prepare,banker-create,banker-history}.txt` and the corresponding screenshots.

The independently generated genuine Information Request Run `aa73ccfd-7427-4ed5-8d6f-e6b408c40ee6` and Proposal `a1e5ccac-4453-4eeb-aa8a-eadd2a64d5f2` were reused without another model request. Full proposal limitations, seven acceptance conditions and five requested-source categories were inspected. Through **Prepare Banker record**, the Banker explicitly incorporated all five requested-source categories in the request body, retained all seven criteria, and changed the proposal wording to an internal request that has not been issued or answered. The actual UI returned 201: Request `d751e158-c63d-4c3f-8702-17e3e0ec890c`, open v1, correct Proposal origin and drafted event `8486a65c-ec11-4b59-9ed2-48627e2f02ed`. Parent Issue `0ac4df22-3d12-49fe-82f5-c6c11ee854a5` remains open v1; no received Source, Human Decision or external sending was recorded. Evidence: `dev-r10-ai-information-request-{prepare,create,history}.txt` and screenshots.

The existing business-abstention Run `4caa0234-386e-4bf4-b4c0-e13d2fdf682d` was expanded with Enter in the real collection. Its actual missing inputs, unsupported propositions, smallest recovery action and resume condition are visible. The same read-only inspection works at 390 px with document `scrollWidth=390`. Evidence: `dev-r10-ai-abstention.txt`, desktop/mobile element captures, and `dev-r10-ai-abstention-mobile-viewport.png`; the latter preserves a normal viewport around the keyboard-focused disclosure without treating an element screenshot's sticky-header overlap as a layout defect.

Management Proposal `50efe2ef-1782-4eb2-bc7c-a377e8efd7f1` from real Run `d6b4a428-14d3-4d44-9f39-85ec9372c9b1` was fully inspected through the UI. The two proposed content items were retained, with keys mapped from `fy2025_revenue_amount` / `subsequent_events_gap` to `item-1` / `item-2`. The Banker strengthened the claim qualification to state that it is a Source statement, not independent verification of accuracy, completeness or comparability. Exact Meeting/WO/Packet, internal Banker audience, required applicability and internal disclosure restrictions were explicitly confirmed. Create returned 201 for material `6bcd9726-6eaa-4285-b6a9-5c371a27959e`; the detail's **Generate Native Artifact and Reader Copy** returned 202 with explicit origin `50efe2ef-1782-4eb2-bc7c-a377e8efd7f1`, If-Match `1`, Job `77b94ead-a8e8-40b0-9f34-71ef2c7807e7`, Revision `826d9657-c642-4e91-8548-24dc876403df` and material v2. Complete accepted content, Banker differences and receipts are in `output/ticket-22-remediation/ai-materials/management-ui-handoff.json`; the material Agent owns subsequent actual artifact/QC/Review/export inspection. The original planned Meeting was not marked occurred.

The second AI-derived material used the independently successful Meeting-question Proposal `876f431c-3724-425e-a918-647c73c65c6c` and Run `dd8e3c48-b757-4108-ad17-f07527275426`. Its single question, exact Evidence, explicit gap and qualification were reviewed through the UI. The Banker confirmed the same planned Meeting, Work Objective, Packet, internal audience and disclosure boundary, then created material `1d3591a8-55d1-4ddc-9637-e91d63394c13` (201) and used **Revise exact content and Evidence** to generate its accepted immutable Revision. The 202 response carried Proposal origin `876f431c-3724-425e-a918-647c73c65c6c`, If-Match `1`, Job `13f84638-b70c-4e81-adc0-4c6a76216206`, Revision `4659f3b6-1a66-4d69-8516-71b281c78c35` and Deliverable `0ac13c51-63bc-49f0-a227-63029b99ecad`. A GET after completion confirmed the Revision content's origin, accepted Banker actor and canonical digest. Evidence: `dev-r10-ai-meeting-{proposal,prepare,review,create,revise-prepare,generate,generated-readback}.txt` and screenshots. The material Agent owns its artifact/QC/Review/export follow-through; no meeting occurrence is asserted.

## R11 bounded long-title correction

The real AI-derived Information Request contains all five requested-source categories, making its `requested_information` 2,101 characters. R10 used this full description as the page heading. The bounded fix changes only `titleOf` in the T22 shared component: description-derived headings normalize whitespace and use an approximately 120-character excerpt with an ellipsis and a word boundary where possible. Explicit titles and stored descriptions remain intact; complete request content and criteria continue to render in the detail body. No API, database or AI output changes accompany this correction.

Final Linux amd64 Node 22 package: `/tmp/ib-t22-web-release-20260910-r11.tar.gz`, SHA-256 `1d8a4b4a3b37321116af471d73306211489e9201861f410ce2d6588284fcff9c`. Compared with the r10 source manifest, only `diligence-shared.tsx` changed. TypeScript exited 0, production compilation generated all 23 static pages, and the standalone public page, account-access page and exact Diligence route returned HTTP 200. The compiled artifact contains the title excerpt and official public Supabase configuration. Logs, source/bundle hashes, the 2,174-file tree and smoke results are retained in `output/ticket-22-web-build/r11-manifest.json`, `r11-tree-sha256.json`, `r11-tsc.log`, `r11-standalone-smoke.json` and `production-build-r11.log`. Build-generated configuration and pre-existing tsbuildinfo were restored exactly; the smoke container was removed. Actual-domain 1440/390 verification of the existing long Request follows root deployment.

### R11 actual-domain failure retained

The actual 1440 px DOM check on Request `d751e158-c63d-4c3f-8702-17e3e0ec890c` found the shortened H1 at 116 characters and all seven criteria present with no horizontal overflow, but the complete 2,101-character request was absent. `ObjectOverview` reused `titleOf` for its body paragraph, so the title-only change also shortened that paragraph. The failure is recorded in `dev-r11-title-acceptance.txt` and `dev-r11-title-body-failure.{txt,png}`; r11 is **not** a passing final acceptance. The same helper was also the only descriptive search input, so the bounded correction makes both body rendering and collection search read the complete description fields directly. Heading and list label summaries remain unchanged. R12 contains only these two call-site corrections and requires a fresh actual-domain title/body/search check after deployment.

R12 correction package: `/tmp/ib-t22-web-release-20260910-r12.tar.gz`, SHA-256 `9ecdf52fbf787758a6e963b39d04b656c09267b1ab5b43adb5de5cc659edb800`. Only `diligence-workspace.tsx` changed relative to r11, at the body and search call sites. Linux amd64 Node 22 production build completed all 23 pages, TypeScript exited 0, and standalone checks returned HTTP 200 on all three paths. Complete bundle/source hashes, the 2,174-file tree, type/build logs and smoke results are in `output/ticket-22-web-build/r12-*` and `production-build-r12.log`. The original failure remains visible in the preceding checkpoint; final remote assertions were subsequently completed after root deployment; see the passing R12 section below.


### R12 final actual-domain acceptance — passed

After the root Agent reported the r12 web deployment healthy, the existing Request `d751e158-c63d-4c3f-8702-17e3e0ec890c` was opened through its exact development URL at both 1440×1000 and 390×1000. In each viewport the H1 is a 116-character excerpt ending with an ellipsis. The complete 2,101-character `requested_information` matches the original successful create payload in the DOM after whitespace normalization, and every description in the seven original acceptance criteria is present. Document and body `scrollWidth` are exactly 1440 and 390 respectively, with no horizontal overflow. Normal viewport screenshots were independently inspected.

The Information Request collection was then searched through its visible search field for `claims or legal updates`, a phrase near the end of the full request body that is absent from the shortened heading. The exact Request remains in the results, and the query is retained in the URL. All checks were read-only; no business object, Review, material or provider request was created.

Passing assertions and exact URLs: `final-visual/dev-r12-title-acceptance.{txt,json}`. Screenshots: `dev-r12-title-acceptance.png`, `dev-r12-title-{1440,390}-{viewport,full}.png`, and `dev-r12-title-tail-search.png`. The r11 failing assertions and screenshots remain unchanged as the initial failure evidence. This completes the assigned UI remediation and final actual-domain verification.
