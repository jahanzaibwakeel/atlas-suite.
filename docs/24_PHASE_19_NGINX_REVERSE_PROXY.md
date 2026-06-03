# Phase 19: NGINX Reverse Proxy

This phase adds a production-style reverse proxy for AtlasSuite.

## Reuse Check

Before developing this phase, we checked:

- frontend service port: `5173`
- backend service port: `4000`
- existing production Compose override
- existing Docker network service names
- existing deployment documentation

There was no NGINX config yet, so we added an optional Compose override:

```txt
docker-compose.nginx.yml
```

This keeps local development simple while making production routing explicit.

## What A Reverse Proxy Is

A reverse proxy is a server that receives public traffic and forwards it to internal services.

Users do not directly talk to every container. They talk to one public entrypoint:

```txt
Browser
  -> NGINX
  -> frontend or backend
```

## Why NGINX Exists

NGINX solves several production problems:

- one public port for multiple services
- route `/` to frontend
- route `/api` to backend
- route `/socket.io` to WebSocket gateway
- attach forwarding headers
- enforce upload size limits
- add basic security headers
- terminate TLS in a later HTTPS setup

Without a reverse proxy, you expose multiple ports and push routing complexity onto users or deployment platforms.

## Routing Added

File:

```txt
nginx/conf.d/atlas-suite.conf
```

Routes:

```txt
/          -> frontend:5173
/api/      -> backend:4000
/socket.io -> backend:4000
/health    -> backend:4000
```

## NGINX Syntax

Upstreams define internal service targets:

```nginx
upstream atlas_frontend {
  server frontend:5173;
}

upstream atlas_backend {
  server backend:4000;
}
```

These names work in Docker because Compose creates DNS names for services.

Locations define routing rules:

```nginx
location /api/ {
  proxy_pass http://atlas_backend;
}
```

That means requests beginning with `/api/` go to the backend service.

## WebSocket Proxying

WebSockets start as HTTP, then upgrade the connection.

NGINX must forward:

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection $connection_upgrade;
```

Without these headers, Socket.IO may work with polling but fail to upgrade to WebSocket.

## Forwarded Headers

NGINX sends:

```nginx
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

These tell Express:

- original client IP
- proxy chain
- original protocol

This matters for logs, cookies, redirects, rate limits, and security decisions.

## Express `TRUST_PROXY`

When Express runs behind NGINX:

```env
TRUST_PROXY=true
```

This tells Express to trust proxy-provided headers. Do not enable it blindly if the app is directly exposed to the public internet without a trusted proxy.

## Upload Limits

NGINX has:

```nginx
client_max_body_size 5m;
```

The backend has:

```env
MAX_UPLOAD_BYTES=5242880
```

These should match. If NGINX allows less than the backend, uploads fail before reaching Express. If NGINX allows far more than the backend, unnecessary traffic reaches the API.

## Security Headers

The config adds:

```nginx
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

These are basic hardening headers. Later security phases can add CSP, HSTS, and more careful cookie/domain rules after HTTPS is configured.

## How To Run With NGINX

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  -f docker-compose.nginx.yml \
  up --build
```

Then open:

```txt
http://localhost
```

NGINX listens on port `80` and routes internally to frontend and backend.

## HTTPS

This phase uses HTTP so the routing is easy to inspect locally.

Production HTTPS usually happens through:

- NGINX with Certbot
- managed load balancer TLS
- platform-managed certificates
- Cloudflare or similar edge TLS

After HTTPS exists, add HSTS and make cookies `secure`.

## Common Mistakes

- forgetting WebSocket upgrade headers
- exposing backend and database publicly
- using `localhost` inside NGINX instead of Docker service names
- forgetting `TRUST_PROXY=true`
- setting upload limits inconsistently
- terminating HTTPS but sending wrong forwarded protocol
- putting `/api` after `/` and accidentally routing API requests to frontend

## Enterprise Usage

Companies use reverse proxies or load balancers to separate public traffic from internal services. NGINX is one option. Managed load balancers, Envoy, Traefik, and cloud ingress controllers can fill the same architectural role.
