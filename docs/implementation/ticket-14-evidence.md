# Ticket 14 development evidence

Status: partial implementation evidence for the authorized development boundary on `develop`.

## Implementation

- `analysis.material_change`, `impact_assessment`, typed candidate edges, impact items, dispositions, and revision links are append-only and forced RLS.
- Material Claim, Source Record, Assumption, Decision, and revision changes build a deterministic typed closure before any semantic proposal can affect state.
- Exact dispositions are validated against each item's required action. `deliverable.create_revision` requires every Impact item to have a disposition and requires a material reason before creating a new immutable Revision.
- Analysis exposes the prototype-aligned Impact & Revision surface with affected-state groups, typed dependency details, circulation boundary, and recovery links.

## Verification

- `npm run contracts:check` passed.
- `npm run domain:naming` passed.
- `npm run db:validate` passed: 93 ordered migrations.
- `npx tsc --noEmit` passed.
- `npx tsx --test tests/http/public-proof.http.test.ts` passed: 3/3.
- Development database inspection through the running API container confirmed `analysis.material_change` and `analysis.impact_assessment` exist and migration history reaches `20260908100000`.
- Development release `20260908-ticket14-v2` was switched on `root@152.53.90.227`; API, Web, dispatcher, source worker, workbook worker, and reference worker are running, API/Web health checks pass.
- HTTPS checks: protected Impact API route returns the expected `401 application/problem+json` without a session; Impact route UI returns `200 text/html` and the responsive application shell loads in the real browser.

## Evidence limits

The ticket is not marked resolved. Code review found unresolved acceptance gaps: no governed `semantic_change_impact_proposal` task/schema, incomplete cells/ranges and Reader Copy coverage, no bound External-Use Decision invalidation, mutable completed assessment status, and no authenticated fixture proof for AC-003/004/005/039/042/062. The local UI now records one exact disposition at a time and typechecks; the remote browser evidence is limited to the deployed protected shell because the authenticated Banker session was unavailable. Revision creation still requires the existing deliverable command surface.

The local full HTTP suite could not run because the local Docker PostgreSQL image could not be pulled (`ECONNREFUSED`/Docker registry access). Remote authenticated Banker interaction requires the configured Supabase Magic Link/Passkey session and was not fabricated. Existing remote Cell Office/signing/worker services remain on the authorized development profile; production, external-use, and Ticket 15 native reimport are outside this ticket.
