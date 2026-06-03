# Phase 0: Local Infrastructure Foundation

This phase establishes the services the application depends on before we build higher-level features.

## What We Added

The local system now has:

- PostgreSQL for durable relational data.
- Redis for fast ephemeral infrastructure.
- Express API service.
- Frontend service.
- Environment variables that describe connection boundaries.

```txt
frontend
  -> backend
      -> postgres
      -> redis
```

## Why Infrastructure Comes First

Large applications fail when developers treat infrastructure as an afterthought. Authentication, sessions, queues, caching, rate limiting, real-time presence, and audit logs all depend on correct service boundaries.

Starting with Docker Compose gives us a repeatable local topology. It does not make local development identical to production, but it forces the application to connect through URLs, credentials, ports, and health checks instead of hidden machine state.

## PostgreSQL: Durable Source of Truth

PostgreSQL stores facts the business cannot afford to lose:

- Users
- Organizations
- Memberships
- Projects
- Tasks
- Comments
- Permissions
- Audit logs
- Refresh token records

Its architectural purpose is correctness. PostgreSQL gives us constraints, transactions, indexes, relational joins, and query planning.

### Internal Working

When the API calls Prisma, Prisma converts a typed method call into SQL. PostgreSQL parses the SQL, plans how to execute it, uses indexes where useful, reads or writes table pages, enforces constraints, and returns rows. Prisma maps those rows back into JavaScript objects.

The key point: Prisma is not a database. It is a query builder/client over the database. The database remains the authority.

## Redis: Ephemeral Coordination Layer

Redis is fast because it is memory-oriented and simple. We use it for data that can be recreated or expired:

- Rate limit counters
- Cache entries
- Session metadata
- Queue state
- WebSocket presence

Redis should not own permanent business records. If a value must survive as legal, financial, security, or product truth, it belongs in PostgreSQL.

## Request/Response Lifecycle at This Stage

```txt
Browser request
  -> frontend application
  -> backend REST endpoint
  -> Express middleware
  -> controller/service
  -> Prisma client
  -> PostgreSQL
  -> JSON response
  -> frontend render
```

Redis will enter request flows later for rate limiting, refresh sessions, caching, and queues.

## Security Concerns

Local secrets are intentionally weak, but the pattern matters:

- Secrets live in environment variables.
- Database credentials are not hardcoded in source modules.
- Different services communicate through internal Docker DNS names.
- The API receives only the connection URLs it needs.
- Health checks make service readiness explicit.

Production changes:

- Use strong generated secrets.
- Do not commit real `.env` files.
- Restrict database network access.
- Use TLS where infrastructure requires it.
- Rotate credentials.
- Separate application and migration database users when the environment justifies it.

## Performance Considerations

PostgreSQL and Redis solve different performance problems:

- PostgreSQL performance comes from schema design, indexes, query plans, and transaction discipline.
- Redis performance comes from low-latency memory access, but cache invalidation becomes the hard part.

The common mistake is caching too early. Cache only after the data access pattern is clear.

## Scaling Considerations

This topology allows future scaling:

- Multiple API instances can share the same PostgreSQL database.
- Multiple API instances can coordinate rate limits and Socket.IO events through Redis.
- Background workers can use the same Redis queue while the API remains focused on HTTP traffic.

The database usually becomes the most important scaling boundary. Good indexes and query shape matter more than adding servers too early.

## Best Practices

- Treat PostgreSQL as the source of truth.
- Treat Redis as disposable unless explicitly configured for durable queue semantics.
- Validate environment variables at startup.
- Keep service names stable.
- Use health checks before dependent services boot.
- Keep local Compose useful but not overloaded with production-only complexity.

## Common Mistakes

- Putting permanent business data only in Redis.
- Using SQLite locally while PostgreSQL runs in production, then discovering SQL behavior differences late.
- Letting the frontend talk directly to the database.
- Treating Prisma as a replacement for SQL knowledge.
- Running migrations without understanding what SQL will execute.
- Sharing one overpowered database credential across every production process.

## Enterprise Usage

Most real SaaS teams use this same separation:

- App servers are stateless or mostly stateless.
- PostgreSQL or another durable database stores business truth.
- Redis handles fast coordination and short-lived state.
- Background workers process slow or retryable work.
- CI/CD verifies schema and application compatibility before deployment.

This phase gives us the ground where the rest of the system can be built without constantly revisiting local setup.
