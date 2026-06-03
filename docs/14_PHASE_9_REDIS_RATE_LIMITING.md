# Phase 9: Redis Rate Limiting

This phase adds Redis-backed rate limiting to sensitive authentication endpoints.

## What We Added

Files:

- `backend/src/middleware/rate-limit.ts`
- `backend/src/queues/rate-limit.redis.ts`

Protected endpoints:

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/email-verification/request`
- `POST /auth/password/forgot`
- `POST /auth/password/reset`

## Why Rate Limiting Exists

Rate limiting controls how often a client can perform an action.

It protects against:

- brute force login attempts
- credential stuffing
- password reset abuse
- refresh endpoint abuse
- accidental client loops
- basic denial-of-service pressure

## Why Redis

In-memory rate limiting only works inside one API process.

If we run four API instances:

```txt
api-1
api-2
api-3
api-4
```

each instance would have its own memory. Attackers could bypass limits by hitting different instances.

Redis gives all API instances a shared counter store.

## How It Works

For each request, the middleware builds a key:

```txt
atlas:rate-limit:auth-login:ip@email
```

Then it uses Redis:

```txt
INCR key
PEXPIRE key windowMs
PTTL key
```

If the count is above the allowed maximum, the API returns:

```txt
429 Too Many Requests
```

## Endpoint Limits

Login:

```txt
10 attempts per 15 minutes per IP+email
```

Password reset:

```txt
5 attempts per 15 minutes per IP+email
```

Refresh:

```txt
30 attempts per minute per IP
```

Email verification request:

```txt
5 attempts per 15 minutes per IP
```

## Fail Open vs Fail Closed

If Redis is unavailable, we currently fail open by default:

```txt
RATE_LIMIT_FAIL_OPEN=true
```

That means the request continues if the rate limiter cannot check Redis.

Trade-off:

- fail open preserves availability
- fail closed improves abuse resistance

For login in high-risk production systems, teams may choose fail closed or use layered protections.

## Proxy Awareness

The app now supports:

```txt
TRUST_PROXY
```

If the API runs behind NGINX, a load balancer, or a platform proxy, Express needs trust proxy configured to read client IP addresses correctly.

## Common Mistakes

- Using only in-memory limits in a horizontally scaled API.
- Rate limiting by IP only and blocking shared offices/NATs too aggressively.
- Rate limiting by email only and allowing distributed brute force.
- Forgetting password reset and email verification abuse.
- Failing closed in a way that takes down login during Redis outages.
- Trusting `X-Forwarded-For` without configuring trusted proxies carefully.

## Verification

- Backend TypeScript no-emit passed.
- Frontend TypeScript no-emit passed.
- Docker Compose config passed.
