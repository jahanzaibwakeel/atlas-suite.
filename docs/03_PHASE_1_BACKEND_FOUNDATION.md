# Phase 1: Backend Foundation

This phase turns the API from a simple Express entry file into a production-shaped backend foundation.

## What This Phase Is

Backend foundation means the structural pieces that every feature will pass through:

- Application creation
- Process startup
- Middleware chain
- Route versioning
- Request IDs
- Centralized error handling
- Environment validation
- Health and readiness endpoints
- Graceful shutdown

These pieces are not domain features, but every domain feature depends on them.

## Why It Exists

Small projects often put everything in `index.ts`: middleware, routes, error handling, and `app.listen`. That works until you need tests, workers, WebSockets, graceful shutdown, multiple environments, or consistent error responses.

A production backend separates two concerns:

- `app.ts` builds the Express application.
- `server.ts` starts the HTTP process and owns process-level behavior.

That separation lets tests import the app without opening a port, lets WebSockets attach to the HTTP server, and lets shutdown logic close database connections cleanly.

## Internal Working

Express is a middleware pipeline. A request enters the app and passes through handlers in registration order.

Current request path:

```txt
HTTP request
  -> requestId middleware
  -> CORS middleware
  -> JSON body parser
  -> HTTP logger
  -> health/readiness or API routes
  -> route handlers
  -> not found handler if no route matched
  -> error handler if any handler failed
```

The order matters. For example, the request ID must run before the error handler so failures can include a correlation ID.

## Request/Response Lifecycle

Example login request:

```txt
POST /api/v1/auth/login
  -> request ID attached
  -> CORS checked
  -> JSON body parsed
  -> auth route selected
  -> request body validated with Zod
  -> user loaded through Prisma
  -> bcrypt compares password
  -> JWT signed
  -> JSON response returned
```

If validation fails, the route throws a `ZodError`. The centralized error handler converts it into one consistent API error shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "requestId": "..."
  }
}
```

## Architectural Purpose

This foundation gives us stable boundaries:

- Middleware handles cross-cutting concerns.
- Routes define HTTP surface area.
- Controllers will translate HTTP into use cases.
- Services will own business logic.
- Repositories will own persistence details.
- Error handling stays consistent and centralized.
- Configuration fails fast at startup.

The current app still has route files doing controller/service/repository work together. That is acceptable temporarily; the next backend phases will split those responsibilities.

## Security Concerns

### Environment Validation

The API now validates environment variables at startup. This matters because missing secrets or malformed URLs should fail the deployment immediately, not after a user hits a broken endpoint.

The `JWT_SECRET` now requires at least 32 characters. Short secrets are dangerous because JWT signing security depends on secret strength.

### `x-powered-by`

Express's `x-powered-by` header is disabled. This does not make the app secure by itself, but it avoids advertising unnecessary implementation details.

### JSON Body Limit

The JSON parser uses a `1mb` limit. Body limits reduce accidental memory pressure and make some abuse harder. File uploads will use a separate upload path later instead of allowing huge JSON payloads.

### CORS

CORS is restricted to the configured frontend origin. CORS is not authentication, but it reduces which browser origins can read API responses.

## Performance Considerations

Middleware should be cheap. Every request pays for every middleware before it.

Good choices in this phase:

- Skip logging for `/health` to reduce noisy operational logs.
- Use one request ID generation operation per request.
- Parse JSON only once.
- Keep error serialization simple.

Later, performance work will include compression, caching, database query plans, pagination, and avoiding N+1 queries.

## Scaling Considerations

The API process is moving toward statelessness. Stateless API instances can be scaled horizontally behind a load balancer.

Graceful shutdown matters during scaling and deployment. When a container receives `SIGTERM`, it should stop accepting new connections, finish current work where possible, close database connections, and exit. That prevents broken requests during rolling deploys.

## Best Practices

- Keep `createApp()` separate from `server.listen()`.
- Validate configuration once at startup.
- Use versioned API routes such as `/api/v1`.
- Return consistent error shapes.
- Include request IDs in responses and logs.
- Disable unnecessary framework headers.
- Keep health checks lightweight.
- Keep readiness checks available for deeper dependency checks later.

## Common Mistakes

- Starting the server directly inside the app module, making tests awkward.
- Returning different error formats from every route.
- Logging errors without a request ID.
- Trusting environment variables without validation.
- Putting business logic into middleware.
- Adding unversioned APIs and then struggling to evolve contracts.
- Treating health checks as full integration tests.

## Enterprise Usage

Enterprise teams rely on these patterns because production systems need diagnosis and safe change:

- SREs use request IDs to correlate frontend errors, API logs, and traces.
- CI imports the app without binding to a port.
- Load balancers and orchestrators call health/readiness endpoints.
- API versioning protects clients while new contracts are introduced.
- Graceful shutdown makes rolling deployments less disruptive.

## Implementation Completed

Files added:

- `backend/src/app.ts`
- `backend/src/server.ts`
- `backend/src/middleware/request-id.ts`
- `backend/src/middleware/error-handler.ts`
- `backend/src/middleware/not-found.ts`

Files changed:

- `backend/src/index.ts`
- `backend/src/config.ts`
- `backend/src/types.ts`
- `backend/src/utils/http.ts`
- `backend/package.json`

## Current Flow Diagram

```txt
server.ts
  -> create HTTP server
  -> createApp()
      -> install middleware
      -> register routes
      -> install not-found handler
      -> install error handler
  -> listen on configured port
  -> handle SIGINT/SIGTERM
```

## Next Refactor

The next backend step is to split one feature, authentication, into a professional module:

```txt
auth.routes.ts
auth.controller.ts
auth.service.ts
auth.repository.ts
auth.schemas.ts
auth.tokens.ts
```

That will teach controller/service/repository boundaries using real authentication code rather than abstract examples.
