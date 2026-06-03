# Phase 2: Refresh Tokens and Session Rotation

This phase upgrades authentication from simple bearer-token login to a production-style session model.

## What It Is

The system now uses two token types:

- Access token: short-lived JWT used to call protected APIs.
- Refresh token: long-lived opaque random token stored in an HttpOnly cookie and backed by a database session record.

The refresh token is rotated. Every successful refresh creates a new refresh token and revokes the old one.

## Why It Exists

A single long-lived JWT is risky. If stolen, it remains valid until expiry and is hard to revoke because the server does not store JWT state by default.

The access/refresh split solves this:

- Access tokens are short-lived, limiting damage if exposed.
- Refresh sessions are stored server-side, allowing revocation.
- Rotation detects token reuse, a strong signal that a token was stolen.
- Logout can revoke the current session.

## Real-World Problem It Solves

Users expect to stay logged in for days or weeks. Security teams expect stolen credentials to be containable.

Refresh sessions bridge those goals:

- Good UX: users do not log in every 15 minutes.
- Better security: the long-lived credential can be revoked and rotated.
- Operational control: admins can later view sessions and revoke devices.

## Internal Working

### Login

```txt
POST /api/v1/auth/login
  -> validate email/password
  -> find user
  -> bcrypt password comparison
  -> sign short-lived access JWT
  -> generate random refresh token
  -> hash refresh token with SHA-256
  -> store hash in RefreshSession
  -> set plain refresh token in HttpOnly cookie
  -> return access token and user
```

The database stores only the hash. The browser receives the plain token in a cookie.

### Refresh

```txt
POST /api/v1/auth/refresh
  -> read refresh cookie
  -> hash provided token
  -> find RefreshSession by hash
  -> reject if missing, revoked, or expired
  -> generate next refresh token
  -> create next RefreshSession
  -> revoke current RefreshSession
  -> return new access token
  -> replace refresh cookie
```

### Logout

```txt
POST /api/v1/auth/logout
  -> read refresh cookie
  -> revoke matching RefreshSession if present
  -> clear refresh cookie
  -> return 204
```

## Database Logic

`RefreshSession` records:

- `tokenHash`: unique hash of the refresh token.
- `userId`: owner of the session.
- `expiresAt`: absolute expiry.
- `revokedAt`: set when session is no longer usable.
- `replacedByTokenId`: links an old token to the rotated replacement.
- `userAgent` and `ipAddress`: useful for session display and investigation.

Important indexes:

- `tokenHash` unique index for refresh lookup.
- `userId` index for listing/revoking a user's sessions.
- `expiresAt` index for cleanup jobs.
- `revokedAt` index for maintenance and investigations.

## Security Concerns

### Why Hash Refresh Tokens?

Refresh tokens are bearer credentials. Anyone with the token can refresh a session.

If the database stored plain tokens, a database leak would expose active sessions. Hashing means the server can compare a presented token without storing the original.

### Why HttpOnly Cookies?

HttpOnly cookies are not readable by normal browser JavaScript. This reduces damage from XSS because malicious scripts cannot simply read the refresh token.

Access tokens are still currently stored in local storage for compatibility with the existing frontend. The target Next.js frontend should move toward an in-memory access token or server-mediated session pattern.

### CSRF

Cookie authentication introduces CSRF risk because browsers attach cookies automatically.

Current mitigations:

- Refresh cookie is `SameSite=Lax`.
- Refresh/logout are POST endpoints.
- CORS allows only the configured frontend origin with credentials.

Future stronger mitigation:

- Add CSRF tokens for cookie-authenticated mutation requests.
- Validate origin/referer for sensitive endpoints.
- Keep access-token API calls explicit through an Authorization header.

### Refresh Token Reuse Detection

If a revoked refresh token is presented again, the system treats it as possible theft and revokes all active sessions for that user.

This is intentionally aggressive. In real systems you may tune this behavior, but reuse is a serious signal because a properly behaving client should use only the newest refresh token.

## Performance Considerations

Refresh is a database-backed operation. That is acceptable because refresh happens much less often than normal API calls.

Performance points:

- `tokenHash` lookup must be indexed and unique.
- Cleanup of expired sessions should run as a background job later.
- Bcrypt remains only on login, not refresh.
- Access token verification remains stateless and fast.

## Scaling Considerations

This design works across multiple API instances:

- Any API instance can verify access JWTs with the shared signing secret.
- Any API instance can refresh sessions by reading PostgreSQL.
- Redis can later cache session metadata, but PostgreSQL remains authoritative.

For very high traffic, refresh endpoints should be rate-limited and monitored separately from normal API reads.

## Best Practices

- Use random opaque refresh tokens, not refresh JWTs, when you need revocation and reuse detection.
- Store only refresh token hashes.
- Rotate refresh tokens on every refresh.
- Revoke the old token inside the same transaction that creates the new token.
- Keep access tokens short-lived.
- Set refresh cookies as HttpOnly.
- Use `Secure` cookies in production.
- Add session cleanup jobs.
- Audit login, refresh reuse, logout, and password-reset events.

## Common Mistakes

- Storing refresh tokens in local storage.
- Storing plain refresh tokens in the database.
- Never rotating refresh tokens.
- Returning refresh tokens in JSON responses.
- Using long-lived access tokens as a substitute for sessions.
- Forgetting to clear cookies on logout.
- Not handling token reuse.
- Treating CORS as CSRF protection.

## Enterprise Usage

Enterprise SaaS products often expose session management to users and admins:

- View active sessions.
- Revoke a specific device.
- Revoke all sessions after password change.
- Flag suspicious IP or impossible travel.
- Audit session creation and invalidation.

The `RefreshSession` model is the foundation for those features.

## Implementation Completed

Added:

- `RefreshSession` Prisma model.
- PostgreSQL migration SQL for refresh sessions.
- Refresh token generation and hashing.
- HttpOnly refresh cookie helpers.
- Cookie parser middleware.
- `POST /api/v1/auth/refresh`.
- `POST /api/v1/auth/logout`.
- Refresh token rotation.
- Token reuse detection.
- Frontend credential support for cookies.

Changed:

- Login now sets a refresh cookie and returns `accessToken`.
- Login temporarily also returns `token` for backward compatibility with the existing frontend.
- CORS now allows credentials for the configured frontend origin.

## Current Limitation

The existing Vite frontend still stores the access token in local storage. This keeps compatibility with the current app, but the target Next.js authentication design should reduce reliance on local storage because XSS can read it.

The next auth-hardening steps are:

- Add CSRF token strategy.
- Add auth event audit logs.
- Add password reset and email verification models.
- Move frontend access-token handling toward the target Next.js architecture.
