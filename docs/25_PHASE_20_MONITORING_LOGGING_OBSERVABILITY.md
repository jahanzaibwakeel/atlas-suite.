# Phase 20: Monitoring, Logging, And Observability

This phase adds the first observability layer for AtlasSuite.

## Reuse Check

Before developing this phase, we checked:

- existing request ID middleware
- existing `/health` and `/ready` routes
- existing Docker health checks
- existing Morgan request logging
- raw `console.log` and `console.error` usage
- worker and realtime startup behavior

We reused request IDs and health endpoints. We replaced Morgan with structured JSON logs because production systems need machine-readable events.

## What Observability Is

Monitoring tells you whether the system is healthy.

Logging tells you what happened.

Observability helps you answer why something happened.

The three classic signals are:

```txt
logs    -> events and context
metrics -> numeric trends
traces  -> request path across services
```

AtlasSuite now has logs and basic metrics. Distributed tracing can be added later with OpenTelemetry.

## What Was Added

Files:

```txt
backend/src/utils/logger.ts
backend/src/middleware/request-logger.ts
backend/src/routes/health.ts
```

Updated:

```txt
backend/src/app.ts
backend/src/server.ts
backend/src/workers.ts
backend/src/realtime/socket.ts
backend/src/middleware/error-handler.ts
backend/src/middleware/rate-limit.ts
backend/src/services/email.ts
```

Environment variable:

```env
LOG_LEVEL="info"
```

## Structured Logs

Old style:

```txt
GET /api/jobs 200 30ms
```

New style:

```json
{
  "timestamp": "2026-06-03T12:00:00.000Z",
  "level": "info",
  "service": "atlas-suite-backend",
  "environment": "production",
  "message": "http_request",
  "requestId": "abc",
  "method": "GET",
  "path": "/api/jobs",
  "statusCode": 200,
  "durationMs": 30.4
}
```

Why JSON?

- log platforms can parse it
- request IDs can be searched
- latency can be graphed
- errors preserve stack traces
- filtering is easier

## Logger Syntax

```ts
logger.info("api_server_started", { port: config.port });
logger.error("worker_job_failed", { jobId: job.id, error });
```

The first argument is a stable event name. The second argument is context.

Stable event names matter because dashboards and alerts should not depend on changing prose.

## Request Logging

The request logger records:

- request ID
- HTTP method
- path
- status code
- duration
- content length
- user agent
- IP address

It skips `/health` because health checks can be noisy.

## Request IDs

Every request receives:

```txt
x-request-id
```

This ID appears in:

- response headers
- error responses
- request logs
- service-layer audit context

When debugging production, a request ID lets you connect user reports to backend logs.

## Health, Readiness, Metrics

Health:

```txt
GET /health
```

Answers:

```txt
Is the process alive?
```

Readiness:

```txt
GET /ready
```

Answers:

```txt
Can the app currently serve real traffic?
```

It checks:

- PostgreSQL
- Redis

Metrics:

```txt
GET /metrics
```

Returns:

- uptime
- memory usage

This is intentionally basic. Production metrics usually move to Prometheus, Datadog, Grafana, CloudWatch, or another telemetry system.

## Backend Internal Flow

```txt
request
  -> requestId middleware
  -> requestLogger starts timer
  -> route/controller/service
  -> response finishes
  -> requestLogger writes structured event
```

Errors flow through:

```txt
error
  -> errorHandler
  -> logger.error
  -> structured error response with requestId
```

## Worker Observability

Workers now log:

- worker start
- job completion
- job failure
- shutdown start
- shutdown completion

Worker logs are critical because background job failures do not show up as failed HTTP responses.

## Realtime Observability

Socket.IO now logs connection events with:

- user ID
- role
- Redis host

This helps debug realtime connection and scaling issues.

## Security Considerations

Do not log:

- passwords
- refresh tokens
- access tokens
- reset tokens
- full cookies
- private secrets

Logs often go to third-party systems. Treat logs as sensitive production data.

## Performance Considerations

Logging has cost. Rules:

- keep logs structured and concise
- avoid logging huge payloads
- use `LOG_LEVEL` to reduce noise
- skip noisy health checks
- sample extremely high-volume events later if needed

## Common Mistakes

- logging only human text
- not including request IDs
- logging secrets
- ignoring worker logs
- treating `/health` and `/ready` as the same thing
- adding metrics without knowing what question they answer
- debugging production without correlation IDs

## Enterprise Usage

In a mature production environment:

```txt
app logs
  -> collector
  -> log platform
  -> dashboards and alerts
```

Metrics flow to a time-series platform. Traces show cross-service latency. Alerts notify engineers when user-impacting symptoms appear.

AtlasSuite now has the foundation needed to plug into those systems.
