#!/usr/bin/env bash
set -euo pipefail

: "${MIGRATION_ENVIRONMENT:?MIGRATION_ENVIRONMENT must be development or production}"
: "${SUPABASE_DB_URL:?SUPABASE_DB_URL must be supplied as a CI secret}"

if [[ "${MIGRATION_BASELINE_CONFIRMED:-false}" != "true" ]]; then
  echo "remote migration baseline is not confirmed; complete the one-time reconciliation first" >&2
  exit 2
fi

case "${MIGRATION_ENVIRONMENT}" in
  development) ;;
  production)
    if [[ "${MIGRATION_APPROVED:-false}" != "true" ]]; then
      echo "production migration requires the protected release approval" >&2
      exit 2
    fi
    ;;
  *)
    echo "unsupported MIGRATION_ENVIRONMENT: ${MIGRATION_ENVIRONMENT}" >&2
    exit 2
    ;;
esac

command -v supabase >/dev/null 2>&1 || {
  echo "supabase CLI is required; install it in the CI runner" >&2
  exit 127
}

npm run db:validate
supabase --version
supabase migration list --db-url "${SUPABASE_DB_URL}"
supabase db push --db-url "${SUPABASE_DB_URL}" --dry-run

if [[ "${MIGRATION_DRY_RUN:-false}" == "true" ]]; then
  echo "database migration dry run complete (${MIGRATION_ENVIRONMENT})"
  exit 0
fi

supabase db push --db-url "${SUPABASE_DB_URL}"
echo "database migrations applied (${MIGRATION_ENVIRONMENT})"
