# Product-wide database migration automation

Status: the repository-side migration gate is implemented and the development
baseline was reconciled on 2026-09-02. The GitHub `development` Environment and
its `SUPABASE_DB_URL` secret were configured on the same date. No pending Ticket
08 migration was applied during the baseline operation.

## Scope

Every product release runs one migration gate for its target environment. The
gate is independent from the long-lived API and Web containers and uses a
migration-only database credential. The API runtime role must remain unable to
create schemas or apply offline migrations.

```text
Git merge or release tag
  -> validate canonical migrations
  -> run Supabase CLI dry run
  -> apply pending migrations
  -> deploy the immutable Docker release
  -> health and contract probes
  -> switch traffic
```

The gate is a no-op when the target database is already current. It never runs
the development seed against production and it never performs an automatic
down migration.

## Canonical files

- `supabase/migrations/`: timestamped, forward-only SQL migrations.
- `supabase/seed.sql`: local and disposable development fixtures only.
- `scripts/validate-migrations.mjs`: filename, uniqueness, and ordering checks.
- `scripts/migrate.ts`: local PostgreSQL test runner only; it records checksums in
  `public.app_local_migration_history` and refuses remote/production variables.
- `scripts/run-supabase-migrations.sh`: CI-only Supabase CLI gate.
- `scripts/release-migration-gate.sh`: runs the migration gate before an app
  release command supplied by the caller.
- `.github/workflows/database-migrations.yml`: development and production jobs
  with per-environment serialization.

The current legacy migrations were renamed to the Supabase CLI timestamp format
while preserving their dependency order. The hosted history has now been
reconciled against the canonical files before enabling remote automation.

## One-time remote baseline (completed 2026-09-02)

当前只推进 development。production job 保留在工作流中但保持 dormant；生产基线、
生产 secret 和审批策略等到产品开发完成后再配置。

对 development 已完成以下一次性步骤：

1. Direct Dashboard SQL/Table Editor changes are frozen for the migration
   baseline.
2. `supabase migration list --db-url "$SUPABASE_DB_URL"` was reviewed before
   and after repair. The final list has the seven canonical migrations through
   Ticket 07 marked as both local and remote.
3. A targeted catalog comparison against the canonical migrations found the
   same 63 business tables, 731 columns, forced-RLS flags on all 63 tables, 54
   policies, 15 triggers, and 72 function signatures/definitions for the
   already-applied scope. A full `pg_dump` through the Supavisor pooler was
   abnormally slow, so the comparison used bounded `pg_catalog` and
   `information_schema` queries instead of waiting indefinitely.
4. The old remote-only history versions
   `20260826063452`, `20260826151357`, `20260826152433`, `20260831071415`,
   `20260831085848`, `20260831090300`, and `20260901050612` were repaired as
   `reverted`, and the seven matching repository versions
   `20260830000000` through `20260830060000` were repaired as `applied`.
   Supabase CLI `migration repair` changed only
   `supabase_migrations.schema_migrations`; it did not execute DDL, delete
   data, or roll back the already-present schema.
5. `supabase db push --dry-run` now succeeds and reports exactly the nine
   Ticket 08+ migrations (`20260830070000` through `20260830150000`) as
   pending. No remote migration push was executed.

The final migration list and the reviewed history repair are recorded above;
future releases can therefore use `db push` without replaying the existing
Ticket 01–07 schema.

## Live inventory before enabling the gate

The read-only Supabase inventory on 2026-09-02 found:

- Main project `bwwtzxfatsnqffbjndck`: only the provider `remote_schema` migration
  is recorded and no InvestmentBanking application tables are present.
- Persistent `dev` branch `xuysyaxzcpntvvzsgkdy`: the schema contains the
  canonical Ticket 01–07 objects, and the repaired history now records the
  seven matching repository versions. Ticket 08 tables are not present in the
  inspected application schemas; the dry-run lists its nine migrations as
  pending.

The main/production project is intentionally out of the current scope. The
baseline operation changed migration history only; it did not execute a remote
schema migration.

## Release policy

- Local validation uses `npm run db:validate`, `npm run db:migrate`, and
  `npm run db:seed` against the disposable local PostgreSQL container.
- Development runs automatically after every `develop` release push once
  `SUPABASE_MIGRATIONS_ENABLED_DEV=true` and
  `SUPABASE_MIGRATION_BASELINE_CONFIRMED_DEV=true` are set.
- Production automation is intentionally not enabled in this phase. Its job and
  variables remain dormant until a later production-release decision.
- Each environment has its own `SUPABASE_DB_URL` secret. The URL must identify
  the correct project and must never be printed or committed.
- The production job uses a GitHub Environment approval as the human release
  gate. Once approved, the migration itself is automatic and does not require
  a Dashboard operation.
- CI concurrency groups ensure only one migration job runs per environment.
- `--include-seed` is intentionally never used by the production job.

## Schema evolution

Persistence-affecting releases use Expand -> Backfill -> Contract:

1. Add compatible columns, tables, indexes, or procedures.
2. Deploy readers/writers that can operate with both old and new shapes.
3. Run long backfills as checkpointed, idempotent jobs.
4. Remove old columns or tighten constraints only after the old application
   compatibility window has ended.

DDL migrations must stay short and reviewable. A failed migration blocks the
   application release. Migration history is repaired manually only after an
   operator inspects the actual schema; the pipeline never retries a failed DDL
   blindly.

## Required CI configuration

Repository/environment configuration still needed before remote execution:

- `SUPABASE_DB_URL` secret in the `development` GitHub Environment.
- `SUPABASE_MIGRATIONS_ENABLED_DEV=true` repository/environment variable after
  the development baseline is reconciled.
- `SUPABASE_MIGRATION_BASELINE_CONFIRMED_DEV=true` after the completed
  development schema and `supabase_migrations.schema_migrations` reconciliation
  recorded above.
- Production `SUPABASE_DB_URL`, enable/baseline variables, and required reviewer
  protection are deferred and must not be added in this phase.
- The chosen Supabase CLI version policy (`2.116.0` is pinned in the workflow;
  upgrade it deliberately and re-run the migration gate when changing it).

No migration credential belongs on the development VPS or inside the API/Web
runtime environment.
