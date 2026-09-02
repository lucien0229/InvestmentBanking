#!/usr/bin/env bash
set -euo pipefail

: "${CELL_ROOT:?CELL_ROOT must point to the product/environment Cell}"
: "${RELEASE_ID:?RELEASE_ID must identify the immutable release directory}"

release_dir="${CELL_ROOT}/releases/${RELEASE_ID}"
compose_file="${release_dir}/deploy/investmentbanking/dev/compose.yaml"
runtime_env="${CELL_ROOT}/shared/runtime.env"
protected_volume="${CELL_ROOT}/volumes/protected"
ca_file="${CELL_ROOT}/shared/supabase-chain.pem"

test -f "${compose_file}"
test -f "${runtime_env}"
test -f "${ca_file}"
mkdir -p "${protected_volume}"

export RUNTIME_ENV_FILE="${runtime_env}"
export PROTECTED_VOLUME_PATH="${protected_volume}"
export DATABASE_SSL_CA_HOST_PATH="${ca_file}"

docker compose --project-name investmentbanking-dev --file "${compose_file}" build
docker compose --project-name investmentbanking-dev --file "${compose_file}" up -d
docker compose --project-name investmentbanking-dev --file "${compose_file}" ps
