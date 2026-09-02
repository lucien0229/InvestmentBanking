#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -eq 0 ]]; then
  echo "usage: MIGRATION_ENVIRONMENT=... SUPABASE_DB_URL=... $0 <release-command> [args...]" >&2
  exit 2
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
"${SCRIPT_DIR}/run-supabase-migrations.sh"
exec "$@"
