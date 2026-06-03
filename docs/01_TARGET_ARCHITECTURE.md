# AtlasSuite Target Architecture

AtlasSuite is a multi-tenant collaboration SaaS. The architecture separates rendering, API behavior, durable data, ephemeral data, and background work.

## High-Level System

```txt
Browser
  |
  | HTTPS
  v
Next.js Frontend
  |
  | REST API + Cookie/JWT auth
  v
Express API
  |
  | Prisma
  v
PostgreSQL

Express API
  |
  | cache, rate limits, refresh/session metadata, queues
  v
Redis

Browser
  |
  | WebSocket
  v
Socket.IO Gateway inside API service
```

## Why These Pieces Exist

### Next.js

Next.js gives us routing, layouts, server rendering, static rendering, metadata, and a clean split between server and client components. A SaaS dashboard benefits from SSR for authenticated shell loading, SEO for public pages, and client components for interactive boards and real-time behavior.

We are not using Vite as the target because Vite is primarily a client-side application build tool. It is excellent, but it does not provide the same integrated routing, server rendering, and deployment model that Next.js provides.

### Express

Express keeps the backend explicit. For teaching architecture deeply, this is useful because middleware, routing, validation, controllers, services, repositories, and error handling are visible instead of hidden behind framework conventions.

We are not starting with NestJS because Nest adds a strong opinionated framework, decorators, dependency injection, and module structure. Those are valuable, but Express makes the underlying web architecture easier to inspect before adding framework abstractions.

### PostgreSQL

PostgreSQL is the system of record. It owns durable state, relational integrity, constraints, indexes, transactions, and query execution. Multi-tenant SaaS data is strongly relational: organizations, memberships, permissions, projects, tasks, comments, labels, watchers, and audit logs all depend on correctness.

We are not using MongoDB as the primary store because the core domain is relationship-heavy and transaction-heavy. Document databases can work in some collaboration products, but this project is designed to teach relational design and SQL deeply.

### Redis

Redis is for fast ephemeral state:

- Rate limit counters
- Session/refresh token metadata
- Cache entries
- Queue backing data
- WebSocket presence

Redis is not the source of truth. Anything that must survive cache eviction, restart, or replay belongs in PostgreSQL.

### Prisma

Prisma gives a typed query client and migration workflow. It does not remove the need to understand SQL. We will use Prisma for most application queries, and raw SQL when query shape, performance, or database-specific behavior matters.

## Backend Target Structure

```txt
backend/
  prisma/
    schema.prisma
    migrations/
    seed.ts
  src/
    app.ts
    server.ts
    config/
    modules/
      auth/
        auth.controller.ts
        auth.routes.ts
        auth.service.ts
        auth.repository.ts
        auth.schemas.ts
        auth.tokens.ts
      organizations/
      workspaces/
      projects/
      boards/
      tasks/
      comments/
      notifications/
    middleware/
      authenticate.ts
      authorize.ts
      error-handler.ts
      request-id.ts
      rate-limit.ts
    shared/
      db/
      errors/
      logger/
      validation/
      http/
    realtime/
      socket.ts
      events.ts
    jobs/
      queues.ts
      workers/
```

## Frontend Target Structure

```txt
frontend/
  src/
    app/
      (auth)/
      (dashboard)/
      api/
      layout.tsx
      error.tsx
      not-found.tsx
    components/
      ui/
      layout/
      forms/
    features/
      auth/
      boards/
      tasks/
      notifications/
    lib/
      api/
      auth/
      query/
      realtime/
      validation/
    stores/
    styles/
```

## Request Lifecycle

```txt
User action
  -> React component
  -> TanStack Query mutation/query
  -> API client
  -> Express route
  -> Middleware chain
  -> Controller
  -> DTO validation
  -> Service
  -> Authorization policy
  -> Repository
  -> Prisma
  -> PostgreSQL
  -> Response DTO
  -> Query cache update
  -> UI render
```

For WebSockets, the initial HTTP authentication still matters. Socket connections must be authenticated, associated with a user and tenant, and authorized before joining rooms.

## Security Posture

The security model is layered:

- Bcrypt protects stored passwords.
- Short-lived access tokens reduce damage from theft.
- Refresh token rotation limits long-lived session abuse.
- HttpOnly cookies reduce JavaScript token exposure.
- CSRF protection is required for cookie-authenticated mutation requests.
- Runtime validation protects API boundaries.
- RBAC and tenant policies protect data access.
- Database constraints protect data integrity even if application code has a bug.
- Rate limits reduce brute force and abuse.
- Audit logs make sensitive mutations traceable.

## Performance Posture

Performance work should follow evidence:

- Use indexes for known access patterns.
- Prefer cursor pagination for large ordered collections.
- Avoid N+1 query patterns.
- Cache only expensive or frequently repeated reads.
- Invalidate caches deliberately.
- Keep API responses shaped for screens, not raw tables.
- Measure with logs, query plans, and traces before optimizing blindly.

## Scaling Posture

The API should be stateless enough to run multiple instances. PostgreSQL remains the durable coordinator. Redis supports cross-instance coordination for rate limits, queues, and Socket.IO adapters. Background workers can scale separately from request handling.

The major scaling boundaries are:

- Web traffic: scale Next.js and API horizontally.
- Database: indexes, pooling, replicas, partitioning later if justified.
- Realtime: Socket.IO Redis adapter and room discipline.
- Background jobs: queue concurrency and idempotent workers.
- Files: object storage instead of local disk.
