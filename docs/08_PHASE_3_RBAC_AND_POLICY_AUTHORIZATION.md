# Phase 3: RBAC and Policy-Based Authorization

This phase separates authentication from authorization.

Authentication answers:

```txt
Who is the user?
```

Authorization answers:

```txt
What is this user allowed to do?
```

## What We Added

Added:

- `backend/src/modules/authorization/permissions.ts`
- `backend/src/modules/authorization/job.policy.ts`
- `backend/src/middleware/authorize.ts`

Changed:

- Admin overview now uses `requirePermission`.
- User directory endpoints now use `requirePermission`.
- Job create and assignment use permission middleware.
- Job visibility, status updates, note creation, and client-safe serialization now use policy functions.

## Why It Exists

Route-level role checks are simple:

```ts
requireRole(Role.ADMIN)
```

But real systems need more precise decisions:

```txt
Can this technician update this assigned job to this specific status?
Can this client view this job but not internal notes?
Can this user create this note type on this resource?
```

Those are policy decisions, not just role checks.

## RBAC

RBAC means Role-Based Access Control.

Users have roles:

- Admin
- Technician
- Client

Roles receive permissions:

- `job:create`
- `job:assign`
- `job-status:update:assigned`
- `job-note:create:visible`

The middleware checks whether the authenticated user's role has a required permission.

## Resource Policies

Some authorization depends on the specific resource.

Example:

```txt
A technician can update a job only if that job is assigned to them.
```

That cannot be answered from role alone. It needs the job record too.

## Request Flow

```txt
PATCH /api/v1/jobs/:id/status
  -> requireAuth
  -> validate status
  -> load visible job
  -> canUpdateJobStatus(user, job, nextStatus)
  -> update database
  -> audit event
  -> notification
```

## Security Notes

Authorization must happen on the backend. Frontend protected routes improve UX, but they do not secure data.

Client-safe serialization matters. Clients may be allowed to view a job while still being forbidden from seeing internal notes.

## Alternatives

RBAC is simple and common. ABAC is more flexible because it uses attributes such as department, tenant, ownership, risk, region, or billing plan. Many enterprise systems use a hybrid:

```txt
RBAC for broad capabilities
ABAC/policies for resource-level decisions
```

This project now uses that hybrid shape.
