# Phase 4: Jobs API Module Refactor

This phase refactors the Jobs REST API from one large route file into an enterprise module.

## What It Is

The Jobs module now has dedicated files:

```txt
jobs.routes.ts
jobs.controller.ts
jobs.service.ts
jobs.repository.ts
jobs.schemas.ts
jobs.presenter.ts
```

Each file has a specific responsibility.

## Why It Exists

Large route files are easy to start and hard to maintain. They mix HTTP concerns, validation, database queries, business rules, authorization, response shaping, notifications, and audit logging.

Splitting the module gives us:

- clearer ownership
- easier testing
- safer refactoring
- reusable business logic
- consistent validation
- better separation between HTTP and domain behavior

## Layer Responsibilities

### Routes

Routes bind HTTP methods and paths to middleware and controllers.

### Controller

Controllers translate HTTP into service calls:

- parse params, query, body
- call service
- choose status code
- return response

### Schemas

Schemas define runtime validation for:

- route params
- query strings
- request bodies

### Service

Services own business workflows:

- validate related domain records
- enforce policies
- compute job status
- write audit events
- create notifications

### Repository

Repositories own database access through Prisma.

### Presenter

Presenters shape response data for the current user.

## Request Flow

```txt
POST /api/v1/jobs
  -> requireAuth
  -> requirePermission(job:create)
  -> JobsController.create
  -> createJobSchema.parse(req.body)
  -> JobsService.createJob
  -> JobsRepository.findClientById
  -> JobsRepository.findTechnicianById
  -> JobsRepository.createJob
  -> recordAudit
  -> notifyMany
  -> presentJob
  -> 201 response
```

## Why Presenters Matter

The same job can be represented differently to different users.

Example:

```txt
Admin sees internal notes.
Technician sees internal notes for assigned work.
Client sees only public notes.
```

That is response shaping and field-level authorization.

## Alternatives

Small apps can keep route handlers inline. Larger apps usually move to one of these patterns:

- MVC
- controller/service/repository
- clean architecture
- vertical slice modules
- NestJS modules/providers

This project uses vertical feature modules with controller/service/repository boundaries.

## Verification

After the refactor:

- backend TypeScript no-emit passed
- frontend TypeScript no-emit passed
- Prisma schema validation passed
