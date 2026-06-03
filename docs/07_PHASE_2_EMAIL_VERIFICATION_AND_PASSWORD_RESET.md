# Phase 2: Email Verification and Password Reset

This phase adds one-time token workflows for verifying email ownership and resetting forgotten passwords.

## What It Is

Email verification proves that the user controls the email address attached to the account.

Password reset lets a user regain access without knowing the current password.

Both workflows use random opaque tokens:

- The plain token is sent to the user.
- The database stores only a SHA-256 hash of the token.
- Tokens expire.
- Tokens are single-use.

## Why It Exists

Email verification protects downstream workflows that depend on email, such as password reset, notifications, invites, billing, and security alerts.

Password reset is unavoidable in real products, but it is also one of the most attacked auth flows. It must avoid account enumeration, token leakage, token reuse, and stale sessions after password change.

## Database Design

Added to `User`:

- `emailVerifiedAt`

Added token tables:

- `EmailVerificationToken`
- `PasswordResetToken`

Each token table stores:

- `tokenHash`
- `expiresAt`
- `usedAt`
- `userId`

## Request Flows

```txt
POST /auth/email-verification/request
  -> requireAuth
  -> create token
  -> hash token
  -> store token hash
  -> send verification email
  -> audit event
```

```txt
POST /auth/email-verification/verify
  -> hash submitted token
  -> find token
  -> reject if missing, used, or expired
  -> set User.emailVerifiedAt
  -> mark token used
  -> audit event
```

```txt
POST /auth/password/forgot
  -> validate email
  -> if user exists, create reset token and email it
  -> always return the same 202 response
```

```txt
POST /auth/password/reset
  -> validate token and new password
  -> hash submitted token
  -> find token
  -> reject if missing, used, or expired
  -> bcrypt-hash new password
  -> update password
  -> mark reset token used
  -> revoke active refresh sessions
  -> audit event
```

## Security Notes

The API never stores raw verification or reset tokens.

The forgot-password endpoint does not reveal whether an email exists.

Password reset revokes active refresh sessions so stolen or old sessions cannot continue after a credential change.

The current email service logs development links. A production implementation should use a provider such as SES, SendGrid, Mailgun, or Postmark through the same service boundary.
