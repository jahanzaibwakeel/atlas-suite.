# FieldOps Architecture

## System Design

FieldOps is split into three local components:

```txt
React Frontend
    |
    | REST over HTTP with JWT bearer token
    v
Express API
    |
    | Prisma ORM
    v
SQLite Database
```

The frontend owns presentation, role-specific screens, form state, and API caching. The backend owns authentication, authorization, validation, business rules, persistence, audit logging, and notification creation. The database preserves users, jobs, notes, notifications, and audit history.

## Tech Stack Choices

### Backend: Node.js, Express, TypeScript

Express is intentionally simple and fits a small assessment API well. TypeScript gives safer route handlers, request validation boundaries, and clearer domain types. The project does not need a larger framework because the domain is small and the required behavior is straightforward.

### Database Layer: Prisma and SQLite

Prisma provides a readable schema, generated client, and migration workflow. SQLite keeps local setup friction low and satisfies the assessment requirement for a local database. The schema can move to PostgreSQL later with limited application changes because Prisma abstracts most query access.

### Frontend: React, Vite, TypeScript, TanStack Query

React is a good fit for role-based dashboards and job management screens. Vite keeps local development fast. TanStack Query handles server state, refetching, loading states, and mutation invalidation without building custom caching logic.

### API Style: REST

REST was chosen over GraphQL because the resource model is simple: auth, jobs, users, notifications, and admin overview. REST endpoints are easy to test, document, and reason about for this scope.

## Domain Model

### User

Users have one role: `ADMIN`, `TECHNICIAN`, or `CLIENT`.

Admins operate the platform. Technicians perform work. Clients receive visibility into their own jobs.

### Job

A job belongs to one client and may be assigned to one technician. It has a status, optional schedule, notes, notifications, and audit logs.

Statuses:

- `NEW`
- `SCHEDULED`
- `ASSIGNED`
- `IN_PROGRESS`
- `BLOCKED`
- `COMPLETED`
- `CANCELLED`

### JobNote

Notes are append-only records attached to a job. Internal notes are visible to admins and technicians. Public notes can be shown to clients.

### Notification

Notifications are database-backed in-app messages. They are created when jobs are assigned or statuses change.

### AuditLog

Audit logs preserve important changes such as job creation, assignment, status changes, and note creation. This supports data integrity and operational traceability.

## Database Design Rationale

Key relationships:

- `User` to `Job` as client: one client can have many jobs.
- `User` to `Job` as technician: one technician can have many assigned jobs.
- `Job` to `JobNote`: one job can have many notes.
- `User` to `Notification`: one user can receive many notifications.
- `Job` to `AuditLog`: job-related changes can be reviewed chronologically.

Indexing thoughts:

- `User.role` supports admin dropdowns and role filtering.
- `Job.status` supports dashboard metrics and status filtering.
- `Job.clientId` supports client portal queries.
- `Job.technicianId` supports technician work queues.
- `Job.scheduledAt` supports upcoming jobs.
- `Notification.userId, readAt` supports unread notification lookups.
- `AuditLog.entityType, entityId` supports future entity history screens.

SQLite is acceptable for the local assessment. For production, PostgreSQL would be preferred for concurrency, stronger constraints, JSON querying, and operational reliability.

## Auth Strategy

All users use the same login flow: email and password.

Passwords are hashed with bcrypt. On successful login, the API returns a JWT access token containing user id, role, and email. Protected routes require an `Authorization: Bearer <token>` header.

Role checks are enforced by backend middleware:

- Admin-only routes use `requireRole(Role.ADMIN)`.
- Job list queries are automatically scoped by role.
- Technician status updates require assignment to the job.
- Client reads are limited to jobs where `clientId` matches the logged-in user.

Registration is not open. The current version uses seeded accounts and assumes future users are invited or created by an admin.

## Authorization Rules

| Action | Admin | Technician | Client |
| --- | --- | --- | --- |
| Create job | Yes | No | No |
| View all jobs | Yes | No | No |
| View assigned jobs | Yes | Yes | No |
| View own client jobs | Yes | No | Yes |
| Assign technician | Yes | No | No |
| Update status | Yes | Assigned jobs only | No |
| Add internal note | Yes | Assigned jobs only | No |
| View client-safe notes | Yes | Yes | Own jobs only |

## Data Integrity

The system preserves core data by avoiding destructive job deletion. Job notes and audit logs create a timeline of what happened. Foreign keys keep jobs connected to valid users. Technician references use `SetNull` if a technician account is removed, preserving the job record.

In this local context, "something goes wrong" means accidental user action, failed assignment, invalid role access, or unexpected API error. The API uses validation, role checks, and audit records to reduce damage and improve traceability.

## Deliberately Not Built

Real email/SMS notifications were not built. They require third-party services and would make local setup harder. In-app notifications prove the workflow and can later be extended to email, SMS, or webhooks through a queue.

Automatic technician availability was also not built. The v1 assumption is that admins know technician capacity and make assignments manually. A future version could add calendars, work windows, and conflict detection.

## Future Improvements

- PostgreSQL for production
- Docker Compose for one-command setup
- Refresh token rotation or server-side sessions
- Unit and integration tests
- Queue-backed notifications
- Pagination and filtering
- Soft deletes and restore
- Detailed job timeline UI
- Fine-grained permission policies
