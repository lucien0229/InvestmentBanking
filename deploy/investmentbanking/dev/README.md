# InvestmentBanking development Cell

This Compose project is the isolated `investmentbanking-dev` runtime. It owns
its containers, private network, loopback ports, and protected-object volume.
The host Nginx remains the shared TLS/domain edge and should proxy the product
domain to the Web port only; `/api/` and `/webhooks/` should proxy to the API
port.

The Cell runs a pinned Node runtime image and bind-mounts an immutable
application release read-only. This keeps the product process isolated without
requiring a full `npm ci` on the 4 GB development host. The release path is
independent from the Cell configuration release, so a ticket updates the
release contents while the product/environment Cell remains the same.

The Compose file deliberately does not run database migrations. Migrations are
an explicit, separately credentialed deployment step and must not run with the
API runtime environment.

## Run a release

Set `CELL_ROOT` and `RELEASE_ID` for this Cell, then use the release helper:

```bash
CELL_ROOT=/opt/cells/investmentbanking/dev \
RELEASE_ID=74436b5 \
APP_RELEASE_PATH=/opt/investmentbanking/releases/20260902-ticket08-dev-v1 \
  bash scripts/deploy-docker-cell.sh
```

`APP_RELEASE_PATH` must contain the built `.next/standalone` output and the
runtime `node_modules`; it is never writable by the containers. Set
`NODE_RUNTIME_IMAGE` when CI publishes a digest-pinned runtime image.

The published ports default to `127.0.0.1:3101` (API) and
`127.0.0.1:3102` (Web), avoiding the legacy bare-metal ports 3001/3000 during
the parallel cutover.

After health checks pass, change only this product's Nginx upstreams from
`127.0.0.1:3001`/`3000` to `127.0.0.1:3101`/`3102`, test and reload Nginx, then
stop the legacy systemd API/Web units. Rollback is the reverse: restore the
Nginx file, start those units, and run `docker compose ... down` for this Cell.
