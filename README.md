# FieldOps

FieldOps is a simplified field service management platform for a small company that schedules service jobs, assigns technicians, tracks progress, and gives clients visibility into their own work.

## Stack

- Backend: Node.js, Express, TypeScript, Prisma
- Database: SQLite
- Frontend: React, Vite, TypeScript, TanStack Query
- Auth: email/password login, bcrypt password hashing, JWT access tokens

SQLite is used through Prisma, so no separate database app is required. The local database is created as `backend/prisma/dev.db`.

## Local Setup

1. Copy the environment file:

```bash
copy .env.example backend\.env
copy .env.example frontend\.env
```

2. Install dependencies:

```bash
npm.cmd install
npm.cmd run install:all
```

3. Create the database and run migrations:

```bash
npm.cmd --prefix backend run migrate
```

4. Seed demo data:

```bash
npm.cmd run seed
```

5. Start the app:

```bash
npm.cmd run dev
```

The API runs on `http://localhost:4000`.
The frontend runs on `http://localhost:5173`.

## Docker Setup

Docker is optional, but supported.

1. Build and start the full local stack:

```bash
docker compose up --build
```

2. Open the frontend:

```txt
http://localhost:5173
```

The backend is available at:

```txt
http://localhost:4000/health
```

The Docker setup runs the backend migration and seed commands automatically before starting the API. SQLite data is stored in a named Docker volume called `fieldops_sqlite`.

To stop the stack:

```bash
docker compose down
```

To reset the Docker database:

```bash
docker compose down -v
docker compose up --build
```

## Demo Accounts

All seeded accounts use the password `password123`.

| Role | Email |
| --- | --- |
| Admin | `admin@fieldops.test` |
| Technician | `tech@fieldops.test` |
| Client | `client@fieldops.test` |

## Environment Variables

See `.env.example`.

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma SQLite database URL |
| `JWT_SECRET` | Secret used to sign JWT access tokens |
| `PORT` | Backend API port |
| `FRONTEND_URL` | Allowed CORS origin |
| `VITE_API_URL` | Frontend API base URL |

## Assumptions

- Registration is invite/admin-created rather than open. This is an internal business platform, so uncontrolled registration would be unsafe.
- Admins create jobs, assign technicians, and schedule work.
- Technicians can view only assigned jobs, add internal notes, and update assigned job status to `IN_PROGRESS`, `BLOCKED`, or `COMPLETED`.
- Clients can view only their own jobs and public notes. They cannot update job status.
- Technician availability is handled by the admin in v1. The system does not automatically prevent overlapping assignments.
- Notifications are stored in-app instead of sent by email or SMS so the project runs locally without paid services.
- Jobs are preserved. Important changes are recorded in `AuditLog`.

## Trade-offs

- SQLite keeps setup very simple. For production growth, PostgreSQL would be a better fit because of stronger concurrency, richer indexing, and operational tooling.
- JWT access tokens are implemented without refresh tokens to keep the assessment focused. A production version should add refresh token rotation or secure server-side sessions.
- Role-based access is enforced at the route level. Fine-grained permissions could be moved into a centralized policy layer as the system grows.
- Notifications are synchronous database writes. A production version could use a queue for email, SMS, webhooks, and retries.
- The frontend is functional and readable rather than heavily polished.

## What Is Missing

- Docker Compose
- Automated tests
- Real email/SMS notifications
- Technician availability calendar
- Pagination and advanced filtering
- Soft deletes and restore flow
- Refresh token handling

## Main Flows

- Admin logs in, views overview metrics, creates a job, assigns a technician, and sees recent activity.
- Technician logs in, views assigned jobs, updates status, and adds notes.
- Client logs in and views their own job list.

## Documentation

Architecture details are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
