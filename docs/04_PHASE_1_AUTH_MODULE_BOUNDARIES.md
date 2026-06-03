# Phase 1: Authentication Module Boundaries

This step refactors authentication into a production-style module without changing the external login behavior yet.

## What It Is

Authentication answers: who is making this request?

The current behavior is still simple:

- User submits email and password.
- API validates the payload.
- API loads the user by email.
- API compares the password with bcrypt.
- API returns a JWT access token and public user object.
- Protected routes read the token and attach `req.user`.

The important change is structure. Authentication now has module boundaries:

```txt
auth.routes.ts
  -> auth.controller.ts
      -> auth.schemas.ts
      -> auth.service.ts
          -> auth.repository.ts
          -> auth.tokens.ts
```

## Why It Exists

Authentication becomes complicated quickly. A real system eventually needs:

- Login
- Logout
- Refresh token rotation
- Email verification
- Password reset
- OAuth
- Session revocation
- Device/session lists
- Audit logging
- Rate limiting
- Suspicious-login detection

If all of that lives inside one route file, the code becomes risky to change. Separating responsibilities keeps each layer understandable.

## Real-World Problem It Solves

In production, auth bugs are expensive. A small mistake can lock out users, leak sessions, allow account takeover, or break every client.

A layered auth module lets engineers answer precise questions:

- Did HTTP parsing fail? Check controller/schema.
- Did password comparison fail? Check service.
- Did the database query fail? Check repository.
- Did token expiry or signing fail? Check token utility.
- Did route protection fail? Check middleware.

This makes debugging and security review much easier.

## Internal Working

### Routes

Routes define the HTTP contract:

```txt
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

Routes should not contain business logic. They connect URLs and middleware to controllers.

### Controllers

Controllers translate HTTP into application calls:

- Read `req.body`.
- Validate DTOs.
- Call services.
- Return response DTOs.

Controllers should not know how passwords are hashed or how Prisma queries are written.

### Schemas / DTOs

Schemas define runtime input validation. TypeScript types disappear at runtime, so external input must be validated when it crosses the API boundary.

The login schema ensures:

- `email` is a valid email string.
- `password` is present.

Later, registration and password reset schemas will enforce stronger rules.

### Services

Services own use-case logic:

- Find the user.
- Compare password.
- Decide whether credentials are invalid.
- Create the access token.
- Return a safe public user object.

Services are where business rules belong.

### Repositories

Repositories own persistence access. The auth service does not need to know whether users are loaded by Prisma, raw SQL, or another data source.

This boundary becomes valuable when queries grow more complex or when tests need to isolate business logic.

### Token Utilities

Token utilities centralize JWT signing. Token behavior should not be scattered across controllers.

Later, this file can grow to include:

- Refresh token generation
- Token hashing
- Rotation checks
- Token family invalidation
- Cookie options

## Request/Response Lifecycle

```txt
POST /api/v1/auth/login
  -> route
  -> controller
  -> loginSchema.parse(req.body)
  -> authService.login(input)
  -> authRepository.findByEmail(email)
  -> bcrypt.compare(password, user.passwordHash)
  -> signAccessToken({ id, email, role })
  -> JSON response
```

## Architectural Purpose

This module demonstrates a key enterprise pattern:

```txt
HTTP details stay near controllers.
Business rules stay in services.
Database details stay in repositories.
Security primitives stay in focused utilities.
```

That separation keeps code easier to test, review, and evolve.

## Security Concerns

### Credential Errors

The login service returns the same error for missing user and wrong password:

```txt
Invalid email or password
```

This avoids user enumeration. If the API said "email not found", attackers could discover registered accounts.

### Password Hashing

Passwords are compared with bcrypt, not decrypted. The database stores a hash, not the original password.

Bcrypt is intentionally slow. That is good for password storage because it makes brute-force cracking more expensive.

### Token Claims

The access token includes:

- User ID
- Email
- Role

Do not put secrets or frequently changing permissions directly into long-lived tokens. Tokens can outlive current database state. This is one reason short access token expiry and refresh rotation matter.

## Performance Considerations

Login is intentionally more expensive than a normal read because bcrypt is CPU-bound. That means login endpoints need rate limiting before production.

Common performance concerns:

- Bcrypt cost too high can exhaust CPU.
- Bcrypt cost too low weakens password protection.
- Missing email unique index slows login.
- Excessive auth database joins slow every session check.

The current `User.email` unique index is essential because login always starts with email lookup.

## Scaling Considerations

Access-token verification is stateless when using JWTs. Multiple API instances can verify tokens with the same signing secret.

Refresh tokens are different. In the next auth phase, refresh sessions should be stored server-side so the system can revoke, rotate, and detect reuse. That state can live in PostgreSQL with Redis assisting for fast session checks.

## Best Practices

- Keep auth errors intentionally vague.
- Validate input before service logic.
- Keep password hashes out of response objects.
- Centralize token creation.
- Keep token TTL configurable.
- Use short-lived access tokens.
- Add refresh token rotation before production.
- Rate-limit login and password reset endpoints.
- Audit sensitive auth events.

## Common Mistakes

- Returning the full user row, including `passwordHash`.
- Creating JWTs directly in multiple controllers.
- Trusting TypeScript types instead of runtime validation.
- Putting database queries directly in controllers.
- Using long-lived access tokens without revocation strategy.
- Returning different errors for nonexistent email and wrong password.
- Forgetting that JWT claims can become stale.

## Enterprise Usage

Companies usually treat auth as its own bounded module because it is cross-cutting and high-risk. Even when using an external identity provider, the product still needs local session handling, role mapping, tenant membership checks, audit logs, and authorization policies.

## Implementation Completed

Added:

- `backend/src/modules/auth/auth.routes.ts`
- `backend/src/modules/auth/auth.controller.ts`
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/modules/auth/auth.repository.ts`
- `backend/src/modules/auth/auth.schemas.ts`
- `backend/src/modules/auth/auth.tokens.ts`

Kept compatibility:

- `backend/src/routes/auth.ts` now re-exports the module route so existing imports continue working.

## Next Auth Step

The next authentication implementation should add:

- Refresh token database model
- Secure HttpOnly refresh cookie
- Refresh token rotation
- Logout/session invalidation
- CSRF strategy for cookie-authenticated mutations

That will turn the current login flow from demo-grade JWT auth into a production-style session architecture.
