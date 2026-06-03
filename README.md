# AtlasSuite

AtlasSuite is a production-grade SaaS collaboration platform built as a full-stack engineering masterclass. The application is evolving from an earlier FieldOps codebase into an enterprise-style system with authentication, RBAC, PostgreSQL, Redis, REST APIs, background jobs, file uploads, realtime updates, Docker, and CI/CD-ready structure.

The project is intentionally built in phases so every architectural choice can be studied, implemented, tested, and improved like a real product codebase.

## Tech Stack

Frontend:

- Next.js App Router
- React
- TypeScript
- TanStack Query
- Socket.IO client
- CSS system in `frontend/src/styles.css`

Backend:

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- JWT access tokens
- Refresh-token session rotation
- HttpOnly cookie authentication
- RBAC policy layer
- Socket.IO realtime gateway
- BullMQ background jobs

Data and infrastructure:

- PostgreSQL as the durable system of record
- Redis for queues, rate limits, and realtime scaling support
- Docker and Docker Compose
- Production Dockerfiles for backend and frontend

## Project Structure

```txt
.
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       ├── middleware/
│       ├── modules/
│       │   ├── auth/
│       │   ├── authorization/
│       │   └── jobs/
│       ├── queues/
│       ├── realtime/
│       ├── services/
│       └── workers/
├── frontend/
│   └── src/
│       ├── app/
│       ├── auth/
│       ├── api/
│       ├── components/
│       ├── realtime/
│       └── views/
├── docs/
├── docker-compose.yml
├── docker-compose.prod.yml
└── ARCHITECTURE.md
```

## Prerequisites

Install:

- Node.js 24 or compatible modern Node version
- npm
- Docker Desktop
- Git

For the Docker workflow, Docker Desktop must be running with the Linux engine enabled.

## Environment Setup

Copy the shared example environment into backend and frontend environment files:

```powershell
Copy-Item .env.example backend\.env
Copy-Item .env.example frontend\.env
```

Important variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret used to sign access tokens |
| `JWT_ACCESS_TOKEN_TTL` | Short-lived access token duration |
| `JWT_REFRESH_TOKEN_TTL_DAYS` | Refresh session lifetime |
| `FRONTEND_URL` | Trusted browser origin for CORS and CSRF-style origin checks |
| `NEXT_PUBLIC_API_URL` | Browser-visible API base URL |
| `UPLOAD_DIR` | Backend upload storage directory |

Do not use the example secrets in production.

## Run With Docker

Docker is the recommended local workflow because it starts PostgreSQL, Redis, the backend API, the backend worker, and the Next.js frontend together.

Start the stack:

```powershell
docker compose up --build
```

Open:

```txt
Frontend: http://localhost:5173
Backend health: http://localhost:4000/health
```

Stop the stack:

```powershell
docker compose down
```

Reset local Docker data:

```powershell
docker compose down -v
docker compose up --build
```

The development Compose setup automatically runs backend migrations and seed data before starting the API.

## Run Manually

Use this path when you want to run Node processes directly on your machine. You still need PostgreSQL and Redis available.

Install dependencies:

```powershell
npm install
npm run install:all
```

Generate Prisma client and apply migrations:

```powershell
npm.cmd --prefix backend run migrate
```

Seed demo data:

```powershell
npm run seed
```

Start backend and frontend:

```powershell
npm run dev
```

The backend runs on `http://localhost:4000`.
The frontend runs on `http://localhost:5173`.

## Demo Accounts

Seeded users share this password:

```txt
password123
```

| Role | Email |
| --- | --- |
| Admin | `admin@fieldops.test` |
| Technician | `tech@fieldops.test` |
| Client | `client@fieldops.test` |

## Testing And Verification

Backend tests:

```powershell
npm.cmd --prefix backend run test
```

Backend TypeScript build:

```powershell
npm.cmd --prefix backend run build
```

Frontend production build:

```powershell
npm.cmd --prefix frontend run build
```

Prisma schema validation:

```powershell
npm.cmd --prefix backend run prisma -- validate
```

Production Compose config validation:

```powershell
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
```

## Production Docker

Build and run using production Docker overrides:

```powershell
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

Production Dockerfiles use:

- multi-stage builds
- compiled TypeScript output
- pruned dependency trees
- non-root runtime users
- no development watchers

The backend production container runs:

```bash
npm run migrate && node dist/src/server.js
```

Because migrations run at container startup in this setup, Prisma CLI is kept as a production dependency. In a larger deployment, migrations can be moved into a separate release job.

## API Overview

Main backend responsibilities:

- `/health` for service health
- `/api/auth/*` for login, refresh, logout, verification, and password reset flows
- `/api/jobs/*` for job/task collaboration workflows
- `/api/users/*` and admin routes for user and role management
- Socket.IO for realtime invalidation and collaboration events

The core request flow is:

```txt
Frontend component
  -> TanStack Query
  -> API client
  -> Express route
  -> middleware
  -> controller
  -> service
  -> policy/repository
  -> Prisma
  -> PostgreSQL
  -> response DTO
```

## Documentation

Start here:

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [docs/00_MASTERCLASS_ROADMAP.md](docs/00_MASTERCLASS_ROADMAP.md)
- [docs/01_TARGET_ARCHITECTURE.md](docs/01_TARGET_ARCHITECTURE.md)

Phase notes:

- `docs/02_*` through `docs/21_*` explain the project phase by phase.

## Current Status

Implemented so far:

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

Remaining roadmap includes CI/CD, deployment, NGINX reverse proxy, monitoring, and final production hardening.
