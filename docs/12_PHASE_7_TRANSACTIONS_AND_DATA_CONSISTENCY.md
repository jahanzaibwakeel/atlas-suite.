# Phase 7: Transactions and Data Consistency

This phase makes important Jobs workflows atomic.

## What We Changed

The following workflows now use Prisma interactive transactions:

- Create job + audit log + in-app notifications
- Assign job + audit log + notification
- Update job status + audit log + notification
- Create job note + audit log

## Why Transactions Exist

A transaction groups multiple database operations into one unit.

Either all operations commit:

```txt
job created
audit log created
notifications created
```

Or all operations roll back:

```txt
no job
no audit log
no notifications
```

This prevents partial state.

## ACID

Transactions are described by ACID:

- Atomicity: all or nothing.
- Consistency: database moves from one valid state to another.
- Isolation: concurrent transactions do not observe each other in unsafe ways.
- Durability: committed data survives crashes.

## Prisma Syntax

```ts
return prisma.$transaction(async (tx) => {
  const job = await tx.job.create(...);
  await tx.auditLog.create(...);
  await tx.notification.create(...);
  return job;
});
```

The `tx` object is a transaction-scoped Prisma client. Every query inside the callback participates in the same transaction.

## Why Helpers Accept a Transaction Client

Audit and notification helpers now accept an optional database client:

```ts
recordAudit(input, tx)
notifyUser(input, tx)
```

This lets services reuse shared helpers inside transactions without those helpers opening independent database writes.

## What Should Not Go Inside Database Transactions

Do not put slow external side effects inside database transactions:

- sending email
- sending SMS
- calling webhooks
- uploading files
- charging payment cards

Those operations can be slow, fail unpredictably, or succeed even if the database rolls back.

For external side effects, use an outbox pattern:

```txt
transaction:
  write business data
  write outbox event

worker:
  read outbox event
  send email/webhook
  mark event processed
```

## Current Project Meaning

Our current notifications are database rows, so they can safely be part of the same transaction.

Later, when notifications become email/SMS/webhooks, the database transaction should write an outbox event instead of sending directly.

## Common Mistakes

- Writing main data and audit logs separately.
- Sending emails inside long database transactions.
- Assuming `Promise.all` makes operations atomic.
- Catching transaction errors and continuing as if the write succeeded.
- Holding transactions open while doing network calls.
- Forgetting that reads before the transaction can become stale under concurrency.

## Verification

- Backend TypeScript no-emit passed.
- Frontend TypeScript no-emit passed.
- Prisma schema validation passed.
