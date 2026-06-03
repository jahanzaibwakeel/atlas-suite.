# AtlasSuite

AtlasSuite is a production-grade SaaS collaboration platform built as a full-stack engineering masterclass. The codebase demonstrates enterprise patterns across frontend, backend, database, Redis, realtime, queues, Docker, CI, and deployment architecture.

## Stack

Frontend:

- Next.js App Router
- React
- TypeScript
- TanStack Query
- Socket.IO client

Backend:

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- JWT access tokens
- Refresh-token session rotation
- HttpOnly cookie authentication
- RBAC policy layer
- BullMQ workers
- Socket.IO realtime gateway

Infrastructure:

- PostgreSQL
- Redis
- Docker and Docker Compose
- GitHub Actions CI

## Project Structure

```txt
.
|-- backend/
|   |-- prisma/
|   |-- src/
|   |   |-- middleware/
|   |   |-- modules/
|   |   |-- queues/
|   |   |-- realtime/
|   |   |-- services/
|   |   |-- workers/
|   |   |-- app.ts
|   |   `-- server.ts
|   `-- Dockerfile.prod
|-- deployment/
|-- frontend/
|   |-- src/
|   |   |-- app/
|   |   |-- api/
|   |   |-- auth/
|   |   |-- components/
|   |   |-- realtime/
|   |   `-- views/
|   `-- Dockerfile.prod
|-- docs/
|-- docker-compose.yml
|-- docker-compose.prod.yml
|-- ARCHITECTURE.md
`-- README.md
```

## Prerequisites

- Node.js 24 or compatible modern Node version
- npm
- Docker Desktop
- Git

Docker Desktop must be running for the Docker workflow.

## Environment Setup

Copy the local example environment:

```powershell
Copy-Item .env.example backend\.env
Copy-Item .env.example frontend\.env
```

For production, start from:

```txt
.env.production.example
```

Never commit real production secrets.

## Run With Docker

Docker is the easiest local workflow because it starts PostgreSQL, Redis, backend, worker, and frontend together.

```powershell
docker compose up --build
```

Open:

```txt
Frontend: http://localhost:5173
Backend health: http://localhost:4000/health
```

Stop:

```powershell
docker compose down
```

Reset local Docker data:

```powershell
docker compose down -v
docker compose up --build
```

## Run Manually

Use this path when PostgreSQL and Redis are already running on your machine.

Install:

```powershell
npm install
npm run install:all
```

Run migrations:

```powershell
npm.cmd --prefix backend run migrate
```

Seed demo data:

```powershell
npm run seed
```

Start:

```powershell
npm run dev
```

## Demo Accounts

Password:

```txt
password123
```

| Role | Email |
| --- | --- |
| Admin | `admin@fieldops.test` |
| Technician | `tech@fieldops.test` |
| Client | `client@fieldops.test` |

## Verification

Backend tests:

```powershell
npm.cmd --prefix backend run test
```

Backend build:

```powershell
npm.cmd --prefix backend run build
```

Frontend build:

```powershell
npm.cmd --prefix frontend run build
```

Prisma validation:

```powershell
npm.cmd run prisma:validate
```

Production Compose validation:

```powershell
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
```

NGINX Compose validation:

```powershell
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml config
```

## Production Docker

```powershell
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

The backend production container runs:

```bash
npm run migrate && node dist/src/server.js
```

Because migrations run during backend startup in this simple production Compose setup, Prisma CLI is kept as a production dependency. In larger systems, migrations usually move to a separate release job.

## Deployment

Start with:

- [deployment/README.md](deployment/README.md)
- [.env.production.example](.env.production.example)
- [docs/23_PHASE_18_DEPLOYMENT_ARCHITECTURE.md](docs/23_PHASE_18_DEPLOYMENT_ARCHITECTURE.md)

Recommended learning deployment order:

1. Docker Compose locally
2. Docker Compose on a VPS
3. Add NGINX and HTTPS
4. Move PostgreSQL to managed database
5. Move Redis to managed Redis
6. Add automated CI/CD deployment
7. Add monitoring and alerting

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [docs/00_MASTERCLASS_ROADMAP.md](docs/00_MASTERCLASS_ROADMAP.md)
- [docs/01_TARGET_ARCHITECTURE.md](docs/01_TARGET_ARCHITECTURE.md)
- [docs/22_PHASE_17_GITHUB_ACTIONS_CI_CD.md](docs/22_PHASE_17_GITHUB_ACTIONS_CI_CD.md)
- [docs/23_PHASE_18_DEPLOYMENT_ARCHITECTURE.md](docs/23_PHASE_18_DEPLOYMENT_ARCHITECTURE.md)
- [docs/24_PHASE_19_NGINX_REVERSE_PROXY.md](docs/24_PHASE_19_NGINX_REVERSE_PROXY.md)
- [docs/25_PHASE_20_MONITORING_LOGGING_OBSERVABILITY.md](docs/25_PHASE_20_MONITORING_LOGGING_OBSERVABILITY.md)

## Current Status

Implemented:

- PostgreSQL-backed Prisma schema
- Express modular backend
- JWT access tokens and refresh sessions
- Secure cookie flow
- Email verification and password reset foundations
- RBAC and job-level policy authorization
- Pagination, filtering, search, indexes, transactions
- Redis-backed rate limiting
- BullMQ queues and worker process
- Outbox pattern
- File uploads and attachments
- Socket.IO realtime gateway with Redis adapter support
- Next.js App Router frontend
- TanStack Query frontend data layer
- Backend tests with Vitest and Supertest
- Development and production Docker setup
- GitHub Actions CI
- Deployment architecture guide and production environment template
- NGINX reverse proxy configuration
- Structured logging, readiness checks, and basic runtime metrics

Remaining roadmap:

- final security hardening
- final scaling and system design review
