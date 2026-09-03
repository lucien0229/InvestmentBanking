# Domain-oriented refactor inventory

**Status:** implementation refactor and development reset complete
**Scope:** all implemented delivery Tickets in the InvestmentBanking repository; no production database or deployment changes.

## Baseline

- Repository: `InvestmentBanking`, branch `develop`.
- The working branch is `develop` at `2e59276319f6f7c631b679ce3c55105ddcd5106f`; `origin/develop` remains at an older remote ref and was not modified by this task.
- Pre-existing untracked directories `.local-protected-storage/` and `output/` are preserved and are not part of this refactor.
- Development Supabase ref: `xuysyaxzcpntvvzsgkdy`; parent project ref: `bwwtzxfatsnqffbjndck`.
- Development database: PostgreSQL 17.6, 16 applied migrations, 80 product tables across the product schemas, all observed product tables RLS-enabled.
- After rebuild, policy counts are 25 (`app`), 30 (`source`), 7 (`jobs`), 3 (`object_store`), 2 (`commerce`), 1 (`identity`), and 1 (`analysis`); no policy name contains a delivery-ticket identifier.
- The development database now contains the domain-named packet command table/functions and no Ticket-named table, function, or policy.
- All product schemas observed in the development database are owned by `postgres`, consistent with the migration-owner boundary; application runtime roles must not own or create schema objects.
- The local Supabase CLI and Docker daemon are unavailable in this workspace; local migration execution is therefore a later verification gate, not evidence of the current baseline.

## Implemented Ticket to domain mapping

| Delivery slice | Current implementation evidence | Canonical target domains |
|---|---|---|
| Ticket 01 | `apps/api/src/app.ts`, `auth.ts`, `database.ts`, initial Web routes, `reference_deal` and `supabase_identity` migrations | Identity, Account, Deal Lifecycle, Audit |
| Ticket 02 | `apps/api/src/synthetic-proof.ts`, public proof routes in `app.ts`, Project Northstar Web routes and HTTP tests | Synthetic Proof / Public Experience, shared domain policies |
| Ticket 03 | `apps/api/src/commerce.ts`, commerce routes in `app.ts`, checkout Web routes, `commerce_entitlement` migration | Account and Commerce |
| Ticket 04 | `apps/api/src/jobs.ts`, job route in `app.ts`, durable job Web route, `durable_reference_job` migration | Jobs and Runtime Execution |
| Ticket 05 | Deal creation/setup/preflight routes in `app.ts`, setup/preflight/guide Web routes, `deal_setup_paid_preflight` migration | Deal Lifecycle, Paid Preflight, First Deal Guide |
| Ticket 06 | `apps/api/src/sources.ts`, Source intake Web routes, `protected_source_intake` migration | Ingestion, Source and Evidence, Object Store |
| Ticket 07 | `apps/api/src/account-template-web-evidence.ts`, Source Web integration, `web_evidence_account_templates` migration | Web Evidence, Account Templates, Object Store |
| Ticket 08 | `apps/api/src/source-packet-routes.ts`, Source Packet Web integration, migrations `source_packet_*`, `source_condition_*`, and `source_reliance_assessment` | Source Packets, Source Governance, Output Ceiling, Command Infrastructure |

## Current Ticket coupling

### Application and tests (resolved)

- Ticket-shaped route files were renamed to `account-template-web-evidence.ts` and `source-packet-routes.ts`; their exports and SQL calls are domain-named.
- `app.ts`, `sources.ts`, Web command keys, test fixtures, and test descriptions now use product/domain identifiers.
- RLS contract and HTTP test filenames were renamed to their domain capabilities.
- The domain identifier check is a CI gate and currently passes.

### Database and migrations (repository baseline and remote reset resolved)

- The pre-reset database contained the legacy packet command functions and 16 Ticket-labelled policies; the rebuilt database contains none of them.
- Migration SQL now uses domain comments, policy names, advisory-lock namespaces, parser identities, and display/version strings.
- Deal, Source Intake, Web Evidence, Account Template, and Source Packet runtime values are domain-named.
- The command idempotency table/functions are now `source.packet_command_idempotency`, `source.packet_command_replay`, and `source.packet_command_record`.
- The development branch has the canonical 16 migration versions `20260830000000` through `20260830150000`, and the rebuilt database ledger matches them exactly.
- The current repository has one active migration directory, `supabase/migrations/`; the older `db/migrations/` path exists only in Git history and must not be recreated.

### Evidence and history

- `docs/implementation/ticket-*-evidence.md` and the combined UI audit are release/evidence records, not runtime modules.
- Git commits and historical paths retain Ticket provenance. They are not rewritten by this refactor.

## Target implementation boundaries

The current monolithic/composite seams will be reorganized under the existing technical-design vocabulary:

```text
apps/api/src/
  app.ts                    # composition root and dependency wiring only
  identity-routes.ts
  account-commerce-routes.ts
  deal-lifecycle-routes.ts
  paid-preflight-routes.ts
  public-proof-routes.ts
  job-routes.ts
  source-intake-routes.ts
  web-evidence-routes.ts
  account-template-routes.ts
  source-packet-routes.ts
  source-governance-routes.ts
  command-idempotency.ts
```

The implemented route modules are domain-named; the remaining `app.ts` code is the composition root plus the Identity, Account/Commerce, Deal Lifecycle, Job, Audit, and Public Proof registrations that still share its dependency closures. No Ticket-shaped runtime module remains.

The database baseline will group definitions by domain and dependency order, with Ticket identifiers removed from all runtime names. Existing HTTP paths and business semantics are preserved unless the inventory finds a public contract that itself contains a Ticket identifier.

## Destructive migration boundary

The development database was cleared only after the exact schema/object/data-count baseline was displayed and explicitly confirmed. No production project was touched. The Supabase project itself was not deleted.

## Acceptance evidence for this inventory

- Every implemented Ticket has a target domain mapping.
- Every Ticket reference is classified as implementation coupling, historical evidence, or Git history.
- Every Ticket-named runtime database object is listed.
- The target module and migration boundaries are traceable to `CONTEXT.md`, the technical design, the confirmed prototype, and accepted ADRs.
