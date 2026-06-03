# Phase 10: Database Outbox Pattern

This phase adds a database outbox so side-effect intent is committed with business data.

## Problem

Queues improve HTTP performance, but direct enqueue still has a reliability gap:

```txt
create password reset token in PostgreSQL
enqueue email job in Redis
```

If PostgreSQL succeeds and Redis enqueue fails, the reset token exists but no email job exists.

## Solution

Write an outbox event inside the same PostgreSQL transaction:

```txt
transaction:
  create password reset token
  write audit log
  write outbox event
```

Then a worker dispatches outbox events into Redis:

```txt
worker:
  claim pending outbox events
  enqueue BullMQ job
  mark outbox event published
```

## What We Added

Database:

- `OutboxStatus` enum
- `OutboxEvent` model

Code:

- `backend/src/services/outbox.ts`
- `backend/src/workers/outbox.dispatcher.ts`

Changed:

- Email verification request writes an outbox event in a transaction.
- Password reset request writes an outbox event in a transaction.
- Worker process starts the outbox dispatcher.
- BullMQ email jobs use the outbox event ID as the job ID for idempotency.

## Request Flow

```txt
POST /auth/password/forgot
  -> find user
  -> generate one-time reset token
  -> transaction:
       create PasswordResetToken
       create AuditLog
       create OutboxEvent
  -> return 202

worker dispatcher:
  -> claim pending OutboxEvent
  -> enqueue BullMQ job
  -> mark OutboxEvent PUBLISHED

email worker:
  -> process BullMQ email job
  -> send dev email
```

## Why It Is More Reliable

The important promise is:

```txt
If the business transaction commits, the side-effect intent is stored durably.
```

Redis can be down temporarily. The outbox row remains in PostgreSQL and can be dispatched later.

## Idempotency

BullMQ jobs receive:

```ts
jobId: outboxEventId
```

This prevents repeated dispatcher attempts from creating many duplicate queue jobs for the same outbox event.

## Remaining Production Concerns

The current dispatcher is intentionally simple for teaching.

Production improvements:

- use row-level locking with `FOR UPDATE SKIP LOCKED`
- recover stale `PROCESSING` events
- add operational metrics
- add a dead-letter workflow
- encrypt sensitive payloads if needed
- avoid storing long-lived secrets in outbox payloads

## Common Mistakes

- Believing a queue alone guarantees business-event capture.
- Enqueuing outside the transaction and losing side effects.
- Putting external HTTP calls inside database transactions.
- Not making dispatch idempotent.
- Not monitoring stuck outbox rows.
- Storing sensitive raw tokens longer than needed.

## Verification

- Prisma client regenerated.
- Backend TypeScript no-emit passed.
- Frontend TypeScript no-emit passed.
- Prisma schema validation passed.
