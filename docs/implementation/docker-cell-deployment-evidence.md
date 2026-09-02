# Docker Cell deployment evidence

Status: `dev` Cell active on the development host. This is deployment evidence
for the development environment only; it is not production proof.

Date: 2026-09-02 (Asia/Shanghai)

## Deployment model

InvestmentBanking now has one long-lived product/environment Cell:

```text
InvestmentBanking × dev
  ├─ api container  -> 127.0.0.1:3101 -> container :3001
  └─ web container  -> 127.0.0.1:3102 -> container :3000
```

Host Nginx remains the shared TLS edge. The InvestmentBanking virtual host and
webhook snippet proxy to `3101`/`3102`; no other product's Nginx configuration
was changed. The containers share only the Cell bridge network and the API is
not exposed on a public interface.

A ticket does not create a new service. It publishes a new immutable
application release and the same Cell is recreated against that release. The
Cell configuration release used for this cutover is `af57d3b`; the application
release is the existing `20260902-ticket08-dev-v1`. The Web standalone output
is held at `/opt/cells/investmentbanking/dev/web-releases/20260902-ticket08-dev-v1`
with its upstream rewritten to the Cell API service (`api:3001`).

## Checks performed

- Docker image: `node:22-bookworm-slim`, digest
  `sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5`.
- Docker storage: `overlay2`, data root `/mnt/nvme/var/lib/docker`.
- Cell network: `investmentbanking-dev-private`, bridge driver, two containers.
- `investmentbanking-dev-api-1`: `Up (healthy)`; local
  `GET /api/v1/session` returns `401` as expected for an unauthenticated
  request.
- `investmentbanking-dev-web-1`: `Up (healthy)`; local `GET /` returns `200`.
- Web-to-API rewrite: local `GET /api/v1/session` through port `3102` returns
  `401`.
- Public HTTPS after the cutover:
  `https://dev-banking.aptoren.com/` returns `200` and
  `/api/v1/session` returns `401`.
- Nginx configuration test passed with `nginx -t`; Nginx was reloaded.
- Legacy `investmentbanking-api.service` and `investmentbanking-web.service`
  are both stopped and disabled. Their unit files and release directories were
  preserved for rollback.

## Storage placement

The host is currently booted into a Live system whose root overlay is only
3.9GB. The server's persistent NVMe Ubuntu LVM root was mounted at
`/mnt/nvme` (98GB filesystem, about 84GB free). Docker data, Cell files, and
application releases were copied there; the Live `/opt/investmentbanking` and
`/opt/cells` paths now point to the NVMe copies. The duplicated Live copies were
removed only after byte-size verification; no release content was removed from
the NVMe copies.

The installed Ubuntu filesystem does not currently contain the Docker/Nginx
packages or this Live-session service configuration. Therefore, a reboot
persistence check has not been claimed. Before rebooting the host, provision
the installed Ubuntu system (Docker, Nginx, mount/configuration, and service
enablement) and repeat the same health checks.

## Rollback

The cutover backups are stored outside Nginx's loaded directory:

```text
/etc/nginx/backups/investmentbanking-dev.conf.pre-docker-af57d3b
/etc/nginx/backups/investmentbanking-webhooks.conf.pre-docker-af57d3b
```

To roll back this development Cell, restore those two files, run `nginx -t`
and `systemctl reload nginx`, start the preserved legacy units with
`systemctl enable --now investmentbanking-api.service investmentbanking-web.service`,
then stop the Cell with `docker compose ... down`. The old release tree and
the `/opt/investmentbanking/current` symlink were not deleted.

## Database boundary

No Supabase dashboard operation, migration command, schema change, or database
write was performed as part of this deployment. The Compose Cell has no
migration entrypoint; database migration automation remains a separate task.
