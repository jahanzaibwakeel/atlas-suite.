# Phase 21: Final Security Hardening

This phase reviews and tightens the AtlasSuite security posture.

## Reuse Check

Before changing code, we checked the existing security layers:

- bcrypt password hashing
- JWT access tokens
- refresh-token rotation
- HttpOnly refresh cookies
- trusted-origin checks on cookie-authenticated sensitive routes
- Redis-backed login rate limiting
- RBAC and resource policies
- NGINX security headers
- upload limits
- request IDs and structured logs

We reused those layers and tightened the gaps instead of adding duplicate auth systems.

## What Was Hardened

Code changes:

```txt
backend/src/middleware/security-headers.ts
backend/src/modules/auth/auth.cookies.ts
frontend/src/api/client.ts
frontend/src/auth/AuthContext.tsx
frontend/src/realtime/useRealtimeInvalidation.ts
```

Config changes:

```env
COOKIE_DOMAIN=
LOG_LEVEL=info
```

## Access Token Storage

Earlier frontend code stored access tokens in `localStorage`.

That is convenient, but risky:

```txt
XSS -> malicious script -> read localStorage -> steal token
```

Now access tokens are stored in memory. The refresh token stays in an HttpOnly cookie. On page reload, the frontend calls:

```txt
POST /api/auth/refresh
```

If the refresh cookie is valid, the API returns a new short-lived access token.

This is a common production pattern:

```txt
access token -> memory
refresh token -> HttpOnly cookie
session record -> database
```

## Why Not Store Everything In Cookies

If access tokens are also stored in cookies, browsers attach them automatically. That increases CSRF concerns for every authenticated mutation.

AtlasSuite uses:

- explicit `Authorization: Bearer` for API access tokens
- HttpOnly cookie only for refresh session
- trusted-origin checks for refresh/logout

That keeps normal API calls explicit while preserving reload/session behavior.

## Security Headers

Added app-level headers:

```txt
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

NGINX also sets several of these. Keeping them at the app layer protects deployments that do not use NGINX.

## Cookie Domain

Production can set:

```env
COOKIE_DOMAIN=".example.com"
```

Use this only when frontend and API share a parent domain, such as:

```txt
app.example.com
api.example.com
```

For localhost, leave it blank.

## Threat Model

Important risks and controls:

| Threat | Control |
| --- | --- |
| Password database leak | bcrypt hashes |
| Refresh token database leak | hashed refresh tokens |
| Stolen refresh cookie | rotation and server-side session revocation |
| XSS token theft | access token in memory, refresh cookie HttpOnly |
| CSRF refresh/logout | trusted-origin checks and SameSite cookie |
| Brute force login | Redis rate limiting |
| Broken access control | RBAC and resource policies |
| Oversized uploads | NGINX and backend upload limits |
| Secret exposure | env templates, no committed real secrets |

## Common Mistakes

- storing long-lived tokens in localStorage
- trusting frontend route guards as authorization
- using development JWT secrets in production
- exposing PostgreSQL or Redis publicly
- enabling `TRUST_PROXY=true` without a trusted proxy
- logging passwords, tokens, or cookies
- skipping rate limits on login and refresh endpoints
- using one admin database user for every operational task

## Production Checklist

Before real users:

- rotate all example secrets
- use HTTPS
- set `TRUST_PROXY=true` behind NGINX/load balancer
- set `RATE_LIMIT_FAIL_OPEN=false`
- keep PostgreSQL private
- keep Redis private
- verify refresh/logout origin checks
- verify secure cookies over HTTPS
- confirm logs do not contain tokens
- back up database before risky migrations
- run CI before deploy

## Enterprise Usage

Security is not a single middleware. It is layered defense:

```txt
browser controls
  -> proxy controls
  -> API validation
  -> authentication
  -> authorization
  -> database constraints
  -> logging and audit
```

AtlasSuite now has a realistic baseline for a production SaaS application.
