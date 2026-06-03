# AtlasSuite Deployment Guide

This guide explains how to deploy AtlasSuite and why each production component exists.

## Deployment Mental Model

AtlasSuite is a system, not a single app:

```txt
User browser
  -> frontend service
  -> backend API service
  -> PostgreSQL
  -> Redis
  -> worker service
```

Production deployment means placing each service somewhere reliable, connecting them with environment variables, and exposing only the correct public entrypoints.

## What Runs In Production

| Component | Runs What | Public? |
| --- | --- | --- |
| Frontend | Next.js app | Yes |
| Backend API | Express HTTP and Socket.IO server | Yes, usually behind proxy |
| Worker | BullMQ/outbox jobs | No |
| PostgreSQL | Durable database | No |
| Redis | queues, rate limits, realtime adapter | No |
| Reverse proxy | HTTPS and routing | Yes |

PostgreSQL and Redis should not be publicly exposed.

## Deployment Options

### Option 1: Single VPS With Docker Compose

Use when you want to learn deployment deeply, control the server, and keep the setup simple.

```txt
VPS
  -> Docker Compose
     -> frontend
     -> backend
     -> worker
     -> postgres
     -> redis
     -> nginx
```

Pros:

- teaches real server operations
- keeps every service visible
- simple mental model

Cons:

- you manage backups, firewall, TLS, updates, and monitoring
- one server can become a single point of failure

### Option 2: Managed App Platform

Use when you want faster deployment and less server administration.

```txt
Frontend service
Backend service
Worker service
Managed PostgreSQL
Managed Redis
```

Pros:

- faster setup
- managed logs and rollbacks
- easier scaling knobs

Cons:

- provider-specific configuration
- less control
- costs can grow

### Option 3: Cloud-Native Production

Use when traffic, uptime, and team size justify more infrastructure.

```txt
Load balancer
  -> frontend replicas
  -> backend replicas
  -> worker replicas
Managed PostgreSQL
Managed Redis
Object storage
Observability stack
```

Pros:

- scalable
- reliable
- professional separation of responsibilities

Cons:

- much more operational complexity
- requires deeper cloud knowledge

## Recommended Learning Path

1. Docker Compose locally
2. Docker Compose on a VPS
3. Add NGINX and HTTPS
4. Move PostgreSQL to managed database
5. Move Redis to managed Redis
6. Add CI/CD deployment
7. Add monitoring and alerting

This order teaches the internal working before outsourcing pieces to managed platforms.

## Production Environment Variables

Start from:

```txt
.env.production.example
```

Create a real `.env.production` on the server. Never commit it.

Rules:

- `NODE_ENV=production`
- `TRUST_PROXY=true` when behind NGINX or a load balancer
- `RATE_LIMIT_FAIL_OPEN=false` in production
- `JWT_SECRET` must be long and random
- `DATABASE_URL` must point to production PostgreSQL
- `REDIS_URL` must point to production Redis
- `FRONTEND_URL` must be the real frontend origin
- `NEXT_PUBLIC_API_URL` must be browser-reachable

## Manual VPS Deployment Flow

On the server:

```bash
git clone https://github.com/jahanzaibwakeel/atlas-suite..git
cd atlas-suite..
cp .env.production.example .env.production
```

Edit `.env.production` with real values.

Build and start:

```bash
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

Check services:

```bash
docker compose ps
docker compose logs backend
docker compose logs backend-worker
docker compose logs frontend
```

Health check:

```bash
curl http://localhost:4000/health
```

## When To Deploy

Deploy when:

- CI passes
- migrations are reviewed
- environment variables are ready
- rollback plan exists
- database backup exists before risky schema changes

Do not deploy when:

- CI is failing
- migrations are destructive and unreviewed
- secrets are missing
- production database has not been backed up
- monitoring is unavailable for a risky release

## Migration Strategy

Current production Docker command:

```bash
npm run migrate && node dist/src/server.js
```

This works for one backend instance. At scale, prefer:

```txt
release job runs migrations once
  -> backend replicas start after migration succeeds
```

Why:

- avoids multiple app instances racing migrations
- makes release failures easier to reason about
- separates schema deployment from app boot

## Rollback Strategy

A rollback is not just going back to old code. You must think about:

- code version
- database schema version
- data written by the new version
- background jobs already queued
- frontend cached assets

Safer migration rule:

```txt
expand -> deploy -> migrate data -> contract
```

1. Add backward-compatible schema.
2. Deploy code that can use old and new shape.
3. Migrate data safely.
4. Remove old schema later.

## Production Checklist

- CI passes on `main`
- `.env.production` exists only on server/provider
- PostgreSQL is not public
- Redis is not public
- API health check works
- frontend can reach backend API
- login works
- refresh-token flow works
- file uploads write to expected storage
- worker process is running
- logs are visible
- backups exist
- domain and HTTPS are configured

## Next Step

The next phase adds NGINX/reverse proxy architecture so one domain can route:

```txt
/          -> frontend
/api       -> backend
/socket.io -> backend websocket gateway
```

Run the stack with NGINX:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml up --build -d
```

Open:

```txt
http://localhost
```
