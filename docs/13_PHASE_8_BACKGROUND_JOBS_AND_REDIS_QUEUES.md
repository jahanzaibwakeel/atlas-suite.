# Phase 8: Background Jobs and Redis Queues

This phase moves email side effects out of the HTTP request path and into a Redis-backed queue.

## What We Added

Dependencies:

- `bullmq`
- `ioredis`

Backend files:

- `backend/src/queues/redis.ts`
- `backend/src/queues/email.queue.ts`
- `backend/src/workers.ts`

Runtime:

- `npm run worker`
- `backend-worker` service in Docker Compose

## Why Background Jobs Exist

HTTP requests should be fast and bounded. Slow or failure-prone work should not block the user request when it can be processed asynchronously.

Good background job candidates:

- sending email
- sending SMS
- webhooks
- file processing
- reports
- image/video processing
- scheduled cleanup
- retryable third-party API calls

## Request Flow

Forgot password now works like this:

```txt
POST /auth/password/forgot
  -> validate email
  -> create password reset token
  -> enqueue password reset email job
  -> return 202 Accepted

worker
  -> pulls job from Redis
  -> sends dev email
  -> marks job complete
```

The user does not wait for email delivery during the API request.

## BullMQ

BullMQ stores job state in Redis:

- waiting
- active
- completed
- failed
- delayed
- retried

The API process adds jobs. Worker processes consume jobs.

## Retry and Backoff

Email jobs use:

```ts
attempts: 3
backoff: {
  type: "exponential",
  delay: 5000
}
```

If a job fails, BullMQ retries it. Exponential backoff avoids hammering a failing provider.

## Worker Separation

The API and worker are separate processes:

```txt
backend         -> handles HTTP
backend-worker  -> handles queue jobs
```

This lets us scale them independently.

## Idempotency

Workers should be idempotent when possible. A job may run more than once after crashes or retries.

For email, duplicate delivery is possible unless we add provider-level or database-level idempotency. Later, an outbox table can track processing state more strictly.

## Queue vs Outbox

Redis queues are good for execution.

Database outbox is good for guaranteed event capture with business writes.

The strongest production pattern combines both:

```txt
transaction:
  write business data
  write outbox event

dispatcher:
  reads outbox event
  enqueues job

worker:
  processes job
```

This phase uses BullMQ directly for email jobs. A later phase can add a full database outbox.

## Common Mistakes

- Doing slow external work inside HTTP requests.
- Sending external requests inside database transactions.
- Retrying non-idempotent jobs without safeguards.
- Running workers without graceful shutdown.
- Forgetting dead-letter/failed job monitoring.
- Treating Redis as permanent business truth.
- Scaling API instances but forgetting workers.

## Verification

- Backend TypeScript no-emit passed.
- Frontend TypeScript no-emit passed.
- Docker Compose config passed.
