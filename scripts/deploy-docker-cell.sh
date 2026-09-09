#!/usr/bin/env bash
set -euo pipefail

: "${CELL_ROOT:?CELL_ROOT must point to the product/environment Cell}"
: "${RELEASE_ID:?RELEASE_ID must identify the immutable release directory}"
: "${APP_RELEASE_PATH:?APP_RELEASE_PATH must point to the immutable application release}"
: "${WEB_RELEASE_PATH:?WEB_RELEASE_PATH must point to the web runtime release}"

release_dir="${CELL_ROOT}/releases/${RELEASE_ID}"
compose_file="${release_dir}/deploy/investmentbanking/dev/compose.yaml"
runtime_env="${CELL_ROOT}/shared/api.env"
protected_volume="${CELL_ROOT}/volumes/protected"
ca_file="${CELL_ROOT}/shared/supabase-chain.pem"

test -f "${compose_file}"
test -f "${runtime_env}"
test -f "${ca_file}"
test -f "${APP_RELEASE_PATH}/package.json"
test -f "${APP_RELEASE_PATH}/apps/api/src/server.ts"
test -f "${APP_RELEASE_PATH}/apps/web/.next/standalone/apps/web/server.cjs"
test -f "${WEB_RELEASE_PATH}/apps/web/server.cjs"
test -d "${WEB_RELEASE_PATH}/apps/web/.next/static"
test -n "$(find "${WEB_RELEASE_PATH}/apps/web/.next/static" -type f -print -quit)"
mkdir -p "${protected_volume}"

export RUNTIME_ENV_FILE="${runtime_env}"
export DISPATCHER_ENV_FILE="${CELL_ROOT}/shared/dispatcher.env"
export REFERENCE_WORKER_ENV_FILE="${CELL_ROOT}/shared/reference-worker.env"
export SOURCE_WORKER_ENV_FILE="${CELL_ROOT}/shared/source-worker.env"
export WORKBOOK_WORKER_ENV_FILE="${CELL_ROOT}/shared/workbook-worker.env"
export PUBLIC_FETCH_SOCKET_DIRECTORY="${CELL_ROOT}/public-fetch/socket"
export PUBLIC_FETCH_GID="$(id -g ib-fetch)"
for role_file in "$DISPATCHER_ENV_FILE" "$REFERENCE_WORKER_ENV_FILE" "$SOURCE_WORKER_ENV_FILE" "$WORKBOOK_WORKER_ENV_FILE"; do test -f "$role_file"; done
export PROTECTED_VOLUME_PATH="${protected_volume}"
export DATABASE_SSL_CA_HOST_PATH="${ca_file}"
export OFFICE_SOCKET_DIRECTORY="${CELL_ROOT}/office/socket"
export ARTIFACT_SIGNER_SOCKET_DIRECTORY="${CELL_ROOT}/artifact-signer/socket"
export ARTIFACT_SIGNER_GID="$(id -g ib-artifact-sign)"
export ARTIFACT_IDENTITY_DIRECTORY="${CELL_ROOT}/shared/artifact-identity"
mkdir -p "${ARTIFACT_IDENTITY_DIRECTORY}"
test -S "${PUBLIC_FETCH_SOCKET_DIRECTORY}/fetch.sock"
test -S "${OFFICE_SOCKET_DIRECTORY}/renderer.sock"
test -S "${OFFICE_SOCKET_DIRECTORY}/source-repair.sock"

docker image inspect "${NODE_RUNTIME_IMAGE:-node:22-bookworm-slim}" >/dev/null 2>&1 \
  || docker pull "${NODE_RUNTIME_IMAGE:-node:22-bookworm-slim}"
docker compose --project-name investmentbanking-dev --file "${compose_file}" up -d
docker compose --project-name investmentbanking-dev --file "${compose_file}" ps
