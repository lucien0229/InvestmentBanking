# InvestmentBanking development Cell

This Compose project is the isolated `investmentbanking-dev` runtime. It owns
its containers, private network, loopback ports, and protected-object volume.
The host Nginx remains the shared TLS/domain edge and should proxy the product
domain to the Web port only; `/api/` and `/webhooks/` should proxy to the API
port.

The Cell runs a pinned Node runtime image and bind-mounts an immutable
application release read-only. This keeps the product process isolated without
requiring a full `npm ci` on the 4 GB development host. The release path is
independent from the Cell configuration release, so a domain release updates
the release contents while the product/environment Cell remains the same.

The Compose file deliberately does not run database migrations. Migrations are
an explicit, separately credentialed release step and must not run with the
API runtime environment. The release pipeline runs the Supabase CLI migration
job successfully before it deploys this Cell.

For a release pipeline, invoke `scripts/release-migration-gate.sh` with the
environment-specific `SUPABASE_DB_URL` secret and the final application release
command. The migration job must complete before this Cell is recreated. The
production gate additionally requires the protected release approval; the API
and Web containers never receive the migration credential.

## Run a release

Set `CELL_ROOT` and `RELEASE_ID` for this Cell, then use the release helper:

```bash
CELL_ROOT=/opt/cells/investmentbanking/dev \
RELEASE_ID=af57d3b \
APP_RELEASE_PATH=/opt/investmentbanking/releases/20260902-domain-baseline-dev-v1 \
WEB_RELEASE_PATH=/opt/cells/investmentbanking/dev/web-releases/20260902-domain-baseline-dev-v1 \
  bash scripts/deploy-docker-cell.sh
```

`APP_RELEASE_PATH` must contain the built `.next/standalone` output and the
runtime `node_modules`; `WEB_RELEASE_PATH` contains the standalone web runtime
with its API upstream set to the Cell's `api:3001` service. Both are never
writable by the containers. Set
`NODE_RUNTIME_IMAGE` when CI publishes a digest-pinned runtime image.

The published ports default to `127.0.0.1:3101` (API) and
`127.0.0.1:3102` (Web), avoiding the legacy bare-metal ports 3001/3000 during
the parallel cutover.

After health checks pass, change only this product's Nginx upstreams from
`127.0.0.1:3001`/`3000` to `127.0.0.1:3101`/`3102`, test and reload Nginx, then
stop the legacy systemd API/Web units. Rollback is the reverse: restore the
Nginx file, start those units, and run `docker compose ... down` for this Cell.

## WebMCP browser capability

The web app feature-detects `document.modelContext` and, when the browser
provides it, registers two page-scoped tools: `inspect_current_surface` and
`navigate_internal_surface`. Inspection only returns bounded visible metadata;
navigation is limited to the product's explicit internal route allowlist. No
tool submits forms, changes authorization state, sends payment data, or exposes
credentials. WebMCP is an optional browser-agent seam and is not a security
boundary; normal UI/API authorization remains authoritative.

## Public retrieval supervisor

`public-fetch.service` runs as the dedicated `ib-fetch` user's systemd service,
with a separate subordinate UID/GID allocation and rootless Podman image store.
The fixed profile uses Node image
`sha256:6e6261159fd399ebe5a3d556b7d89da9c85c873f3f270918aad6c8107da8b411`.
Install that image and this unit before invoking the release helper. Point
`$CELL_ROOT/public-fetch-runtime` at the immutable release, reload the user's
systemd manager, and start `investmentbanking-public-fetch.service`.

The API receives only `public-fetch/socket/fetch.sock`. The coordinator accepts
one HTTPS URL, then launches one disposable container with only the fixed worker
script mounted read-only. No application files, provider credentials, protected
objects or runtime API socket are mounted. Each request is limited to 128 MiB,
0.5 CPU, 32 processes, a 25-second container lifetime and 10 MiB of response data;
at most two requests run concurrently. A rootless slirp network disables host
loopback. The worker rejects every non-public resolved address, pins the chosen
address while preserving TLS hostname verification, and never follows redirects.
The supervisor force-removes the exact request container even after timeouts.
