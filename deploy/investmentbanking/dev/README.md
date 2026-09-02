# InvestmentBanking development Cell

This Compose project is the isolated `investmentbanking-dev` runtime. It owns
its containers, private network, loopback ports, and protected-object volume.
The host Nginx remains the shared TLS/domain edge and should proxy the product
domain to the Web port only; `/api/` and `/webhooks/` should proxy to the API
port.

The Compose file deliberately does not run database migrations. Migrations are
an explicit, separately credentialed deployment step and must not run with the
API runtime environment.

## Run a release

Set `CELL_ROOT` and `RELEASE_ID` for this Cell, then use the release helper:

```bash
CELL_ROOT=/opt/cells/investmentbanking/dev \
RELEASE_ID=20260902-ticket08-dev-v1 \
  bash scripts/deploy-docker-cell.sh
```

The published ports default to `127.0.0.1:3101` (API) and
`127.0.0.1:3102` (Web), avoiding the legacy bare-metal ports 3001/3000 during
the parallel cutover.
