# Phase 18: Deployment Architecture

This phase teaches how AtlasSuite moves from local development to production deployment.

## Reuse Check

Before developing this phase, we checked for:

- existing production Dockerfiles
- existing `docker-compose.prod.yml`
- existing CI workflow
- existing environment examples
- existing architecture docs

We reused Docker and CI instead of creating a separate deployment system. The new artifacts are:

- `.env.production.example`
- `deployment/README.md`
- this phase document

## What Deployment Is

Deployment is the process of taking tested code and running it in an environment where real users can reach it.

For AtlasSuite, deployment means running:

- Next.js frontend
- Express API
- Socket.IO gateway
- backend worker
- PostgreSQL
- Redis

The mistake many developers make is thinking deployment means only "upload code." Real deployment coordinates code, configuration, secrets, database schema, runtime processes, networking, monitoring, and rollback.

## Why Deployment Architecture Exists

Local development optimizes for fast iteration.

Production optimizes for:

- reliability
- security
- repeatability
- observability
- rollback
- performance
- controlled access

That is why production has different environment variables, Dockerfiles, secrets, ports, domains, and process management.

## When To Deploy

Deploy when:

- CI passes
- the change is reviewed
- database migrations are understood
- environment variables are prepared
- rollback plan is clear
- logs and health checks are available

Do not deploy because code "works on my machine." That phrase means the system has not yet proven it can run elsewhere.

## Deployment Topology

```mermaid
flowchart TD
  Browser["User Browser"]
  Proxy["Reverse Proxy / Load Balancer"]
  Frontend["Next.js Frontend"]
  Backend["Express API + Socket.IO"]
  Worker["Worker Process"]
  Postgres["PostgreSQL"]
  Redis["Redis"]

  Browser --> Proxy
  Proxy --> Frontend
  Proxy --> Backend
  Backend --> Postgres
  Backend --> Redis
  Worker --> Redis
  Worker --> Postgres
```

In a simple VPS deployment, the proxy, frontend, backend, worker, Postgres, and Redis can all run on one server with Docker Compose.

In a more mature deployment, Postgres and Redis move to managed services, and frontend/backend/worker scale independently.

## How Environment Variables Work

Environment variables are configuration injected into a process at runtime.

Example:

```env
DATABASE_URL="postgresql://user:password@host:5432/atlas_suite?schema=public"
```

The backend needs this because PostgreSQL being installed is not enough. The app must know:

- host
- port
- database name
- username
- password
- schema

Frontend public variables are different. Next.js exposes variables prefixed with:

```txt
NEXT_PUBLIC_
```

That means:

```env
NEXT_PUBLIC_API_URL="https://api.example.com/api"
```

is visible in browser JavaScript. Never put secrets in `NEXT_PUBLIC_*`.

## Local vs Docker vs Production URLs

Local backend to local database:

```env
DATABASE_URL="postgresql://atlas:atlas_dev_password@localhost:5432/atlas_suite?schema=public"
```

Docker backend to Docker database:

```env
DATABASE_URL="postgresql://atlas:atlas_dev_password@postgres:5432/atlas_suite?schema=public"
```

Production backend to managed database:

```env
DATABASE_URL="postgresql://atlas_prod_user:strong-password@postgres.example.com:5432/atlas_suite?schema=public"
```

The host changes because the network changes.

## Backend Deployment

The backend production image:

```txt
backend/Dockerfile.prod
```

compiles TypeScript and runs:

```bash
node dist/src/server.js
```

The production Compose override runs migrations first:

```bash
npm run migrate && node dist/src/server.js
```

This is acceptable for simple deployment. For multiple backend replicas, migrations should move to a one-time release job.

## Frontend Deployment

The frontend production image:

```txt
frontend/Dockerfile.prod
```

runs:

```bash
npm run build
npm run start
```

`NEXT_PUBLIC_API_URL` is passed at build time because browser bundles need to know where the API lives.

## Worker Deployment

The worker is a separate process:

```bash
node dist/src/workers.js
```

Why separate?

Request handlers should be fast. Long-running work belongs in queues and workers.

The worker should not be public. It only needs network access to Redis and PostgreSQL.

## Database Deployment

PostgreSQL is the source of truth.

Production rules:

- do not expose PostgreSQL publicly
- use strong passwords
- run migrations deliberately
- back up before risky changes
- monitor disk usage
- monitor slow queries
- keep connection limits in mind

## Redis Deployment

Redis is used for ephemeral coordination:

- rate limits
- queues
- realtime adapter support

Production rules:

- do not expose Redis publicly
- use private networking
- persist queue data if using Redis as a queue backend
- monitor memory usage
- understand eviction policy

## Request Flow In Production

```txt
Browser
  -> HTTPS
  -> reverse proxy
  -> frontend or backend
  -> API middleware
  -> controller
  -> service
  -> Prisma
  -> PostgreSQL
```

For realtime:

```txt
Browser
  -> HTTPS websocket upgrade
  -> reverse proxy
  -> Socket.IO gateway
  -> Redis adapter if multiple API instances exist
```

## Common Deployment Mistakes

- using development secrets in production
- exposing database ports publicly
- forgetting `TRUST_PROXY=true` behind a proxy
- using `localhost` inside Docker when the service name is needed
- putting secrets in frontend environment variables
- running migrations from multiple replicas
- ignoring logs until production breaks
- not backing up before schema changes
- deploying without CI passing

## Enterprise Pattern

A mature company deployment usually has:

```txt
developer branch
  -> pull request
  -> CI
  -> merge to main
  -> build images
  -> push images to registry
  -> deploy to staging
  -> run smoke tests
  -> approve production
  -> deploy production
  -> monitor
```

AtlasSuite now has CI and deployment documentation. The next phase adds NGINX/reverse proxy config so traffic can be routed professionally.
