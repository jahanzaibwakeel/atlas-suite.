# Phase 2: CSRF Defense and Auth Audit Logging

This phase hardens the refresh-token system with trusted-origin checks and audit records for sensitive authentication events.

## What It Is

CSRF defense protects cookie-authenticated endpoints from being triggered by a malicious website.

Auth audit logging records important authentication events so operators can investigate account activity and suspicious behavior.

## Why It Exists

Refresh tokens are stored in HttpOnly cookies. That protects them from JavaScript theft, but cookies are automatically attached by browsers. Automatic cookies create CSRF risk.

Audit logging exists because security is not only prevention. Production systems also need detection, investigation, and accountability.

## Implementation Completed

Added:

- `backend/src/middleware/trusted-origin.ts`

Changed:

- `POST /auth/refresh` now requires a trusted origin.
- `POST /auth/logout` now requires a trusted origin.
- Login writes `AUTH_LOGIN_SUCCEEDED`.
- Refresh rotation writes `AUTH_REFRESH_ROTATED`.
- Refresh-token reuse writes `AUTH_REFRESH_TOKEN_REUSE_DETECTED`.
- Logout writes `AUTH_LOGOUT`.

## Request Flow

```txt
POST /api/v1/auth/refresh
  -> requireTrustedOrigin
  -> AuthController.refresh
  -> AuthService.refresh
  -> RefreshSession lookup
  -> RefreshSession rotation
  -> AuditLog insert
  -> Set-Cookie replacement
  -> JSON response
```

## Security Notes

Trusted-origin checks are useful but not the only CSRF defense. A stronger final design can add a double-submit CSRF token or server-generated CSRF token bound to the session.

Audit records must never store secrets such as raw tokens or passwords. The implementation stores session IDs, request IDs, IP addresses, and user agents, but not token values.
