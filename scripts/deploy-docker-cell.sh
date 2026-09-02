#!/usr/bin/env bash
set -euo pipefail

: "${CELL_ROOT:?CELL_ROOT must point to the product/environment Cell}"
: "${RELEASE_ID:?RELEASE_ID must identify the immutable release directory}"
: "${APP_RELEASE_PATH:?APP_RELEASE_PATH must point to the immutable application release}"
: "${WEB_RELEASE_PATH:?WEB_RELEASE_PATH must point to the web runtime release}"

release_dir="${CELL_ROOT}/releases/${RELEASE_ID}"
compose_file="${release_dir}/deploy/investmentbanking/dev/compose.yaml"
runtime_env="${CELL_ROOT}/shared/runtime.env"
protected_volume="${CELL_ROOT}/volumes/protected"
ca_file="${CELL_ROOT}/shared/supabase-chain.pem"

test -f "${compose_file}"
test -f "${runtime_env}"
test -f "${ca_file}"
test -f "${APP_RELEASE_PATH}/package.json"
test -f "${APP_RELEASE_PATH}/apps/api/src/server.ts"
test -f "${APP_RELEASE_PATH}/apps/web/.next/standalone/apps/web/server.cjs"
test -f "${WEB_RELEASE_PATH}/apps/web/.next/standalone/apps/web/server.cjs"
mkdir -p "${protected_volume}"

export RUNTIME_ENV_FILE="${runtime_env}"
export PROTECTED_VOLUME_PATH="${protected_volume}"
export DATABASE_SSL_CA_HOST_PATH="${ca_file}"

docker image inspect "${NODE_RUNTIME_IMAGE:-node:22-bookworm-slim}" >/dev/null 2>&1 \
  || docker pull "${NODE_RUNTIME_IMAGE:-node:22-bookworm-slim}"
docker compose --project-name investmentbanking-dev --file "${compose_file}" up -d
docker compose --project-name investmentbanking-dev --file "${compose_file}" ps
