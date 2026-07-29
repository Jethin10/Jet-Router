# Production deployment

This guide deploys Jet Router as a single-host service with persistent storage and TLS termination.

## 1. Prepare the host

Use a maintained Linux host with Docker Engine 25+ and Docker Compose v2. Keep Docker, the kernel, and the reverse proxy patched.

Clone a tagged release rather than an arbitrary development commit:

```bash
git clone https://github.com/Jethin10/Jet-Router.git
cd Jet-Router
git checkout <release-tag>
cp .env.example .env
```

Generate separate random values for `JWT_SECRET`, `API_KEY_SECRET`, and `MACHINE_ID_SALT`. Set a unique dashboard password of at least 12 characters.

Do not store `.env` in source control, images, tickets, screenshots, or CI logs.

## 2. Bind and expose the service

The Compose file binds to `127.0.0.1` by default. This is the safe setting when a reverse proxy runs on the same host.

To bind directly to another interface, set:

```dotenv
JET_ROUTER_BIND_ADDRESS=0.0.0.0
```

Direct public binding is not recommended. Prefer a TLS reverse proxy and firewall rules that allow only ports 80/443.

## 3. Start Jet Router

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 jet-router
```

The container becomes healthy only after `GET /api/health` succeeds.

Start the optional Headroom token-saving sidecar with:

```bash
docker compose --profile token-saver up -d
```

Headroom is exposed only to the Compose network.

## 4. TLS reverse proxy

Example Nginx server block:

```nginx
server {
    listen 443 ssl http2;
    server_name router.example.com;

    ssl_certificate /etc/letsencrypt/live/router.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/router.example.com/privkey.pem;

    client_max_body_size 128m;

    location / {
        proxy_pass http://127.0.0.1:20128;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 900s;
        proxy_send_timeout 900s;
    }
}
```

Set these values in `.env`:

```dotenv
BASE_URL=https://router.example.com
NEXT_PUBLIC_BASE_URL=https://router.example.com
AUTH_COOKIE_SECURE=true
```

Restart after changing the environment:

```bash
docker compose up -d --force-recreate
```

## 5. Backups

Provider credentials, endpoint keys, settings, usage data, and generated runtime secrets live in the `jet-router-data` volume. Treat backups as secrets.

Create a stopped, consistent backup:

```bash
docker compose stop jet-router
docker run --rm \
  -v jet-router-data:/source:ro \
  -v "$PWD/backups:/backup" \
  alpine:3.23 \
  tar -czf /backup/jet-router-$(date +%Y%m%d-%H%M%S).tar.gz -C /source .
docker compose start jet-router
```

Encrypt backups at rest and test restoration on a separate host.

## 6. Upgrade and rollback

Before upgrading:

1. Read the release notes.
2. Back up the data volume.
3. Record the current Git tag or commit and image digest.

Upgrade:

```bash
git fetch --tags
git checkout <new-release-tag>
docker compose build --pull
docker compose up -d
docker compose ps
```

Rollback application code:

```bash
git checkout <previous-release-tag>
docker compose build
docker compose up -d
```

If a release includes an incompatible database migration, stop the service and restore the matching backup before starting the previous version.

## 7. Monitoring

Monitor:

- Container health and restart count.
- HTTP status and latency for `/api/health`.
- Disk usage for Docker volumes.
- Provider error and quota rates.
- Authentication failures and unexpected tunnel/MITM activity.

Keep detailed request logging disabled unless actively diagnosing an issue because prompts and model responses may contain sensitive data.

## 8. Production checklist

- [ ] Unique `JWT_SECRET`, `API_KEY_SECRET`, and `MACHINE_ID_SALT`.
- [ ] Strong unique `INITIAL_PASSWORD`.
- [ ] HTTPS enabled and `AUTH_COOKIE_SECURE=true`.
- [ ] Port `20128` reachable only from the reverse proxy or trusted network.
- [ ] Separate endpoint keys created for each client.
- [ ] `.env` and data volume excluded from source control.
- [ ] Encrypted backup and tested restore procedure.
- [ ] Provider terms and account limits reviewed.
- [ ] Container health, logs, disk, and uptime monitored.
- [ ] A documented upgrade and rollback owner.
