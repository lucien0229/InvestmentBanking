# Product-wide database migration automation

Status: the repository-side migration gate is implemented. The GitHub
`development` Environment and its `SUPABASE_DB_URL` secret were configured on
2026-09-02. The one-time remote schema/history baseline is still pending until
the live development schema and migration history are reconciled.

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
while preserving their dependency order. The first remote automation run must
still reconcile the existing hosted history before any of these files are
allowed to be pushed.

## One-time remote baseline

当前只推进 development。production job 保留在工作流中但保持 dormant；生产基线、
生产 secret 和审批策略等到产品开发完成后再配置。

对 development 必须完成以下一次性步骤：

1. Freeze direct schema changes in the Dashboard SQL/Table Editor.
2. Run `supabase migration list --db-url "$SUPABASE_DB_URL"` and save the
   reviewed output as release evidence.
3. Pull or dump the remote schema and compare it with the canonical migrations.
4. If the schema is already present but the history table is incomplete, create
   a reviewed baseline and use `supabase migration repair --status applied` only
   after the schema comparison passes. `repair` changes history only; it does
   not execute SQL.
5. If the schema has drift, write an explicit reconciliation migration and stop
   the release until it is reviewed. Never make the first `db push` guess at
   which manually executed statements were applied.
6. Run `supabase db push --dry-run` and then a controlled development push before
   enabling the development workflow.

The current repository evidence records hosted migrations that were applied
through the SQL Editor with timestamps different from the old `000x` filenames,
so this baseline step is mandatory rather than optional.

## Live inventory before enabling the gate

The read-only Supabase inventory on 2026-09-02 found:

- Main project `bwwtzxfatsnqffbjndck`: only the provider `remote_schema` migration
  is recorded and no InvestmentBanking application tables are present.
- Persistent `dev` branch `xuysyaxzcpntvvzsgkdy`: migrations are recorded through
  `20260901050612 protected_source_intake_v1`, while Ticket 07 tables are already
  present without a corresponding recorded migration. Ticket 08 tables are not
  present in the inspected application schemas.

This is a schema/history mismatch, not a safe `db push` starting point. The first
remote rollout must therefore produce and review a baseline/reconciliation for
the dev branch. The main/production project is intentionally out of the current
scope. No remote migration was executed by this inventory.

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
- `SUPABASE_MIGRATION_BASELINE_CONFIRMED_DEV=true` only after the development
  schema and `supabase_migrations.schema_migrations` reconciliation has been
  reviewed.
- Production `SUPABASE_DB_URL`, enable/baseline variables, and required reviewer
  protection are deferred and must not be added in this phase.
- The chosen Supabase CLI version policy if `2.84.2` in the workflow is changed.

No migration credential belongs on the development VPS or inside the API/Web
runtime environment.
