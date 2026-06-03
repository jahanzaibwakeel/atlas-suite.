# Phase 14: Next.js App Router and Frontend Auth

This phase migrates the frontend from Vite + React Router to Next.js App Router while reusing the existing product screens and auth flow.

## Reuse Check

Before developing, we reused:

- `LoginPage`
- `Workspace`
- `AdminDashboard`
- `JobsBoard`
- `AuthContext`
- `api()` client
- TanStack Query
- realtime invalidation hook
- global CSS

We did not rebuild the UI or auth logic from scratch.

## What Changed

Added:

- `next`
- `frontend/src/app/layout.tsx`
- `frontend/src/app/providers.tsx`
- `frontend/src/app/page.tsx`
- `frontend/src/app/login/page.tsx`
- `frontend/next.config.mjs`
- `frontend/next-env.d.ts`

Removed obsolete Vite files:

- `frontend/index.html`
- `frontend/vite.config.ts`
- `frontend/tsconfig.node.json`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/vite-env.d.ts`

Moved reusable views:

- from `src/pages/*`
- to `src/views/*`

## Why Move Away From `src/pages`

Next treats `src/pages` as the legacy Pages Router. Our old files were reusable components, not Next route files.

Moving them to `src/views` prevents Next from interpreting them as routes.

## App Router Structure

```txt
src/app/layout.tsx
  -> root HTML shell
  -> global CSS
  -> providers

src/app/page.tsx
  -> protected workspace route

src/app/login/page.tsx
  -> login route
```

## Client Providers

TanStack Query and AuthContext are client-side state providers, so they live in:

```txt
src/app/providers.tsx
```

with:

```ts
"use client";
```

## Protected Routes

The homepage checks auth state:

```txt
if no user -> router.replace("/login")
if user -> render Workspace
```

The login page does the inverse:

```txt
if user -> router.replace("/")
if no user -> render LoginPage
```

This preserves the old React Router behavior in App Router form.

## Browser-Only APIs

Next can prerender client components. Browser APIs must be guarded:

```ts
if (typeof window === "undefined") return null;
```

This fixed `localStorage is not defined` during build.

## Environment Variables

Vite used:

```txt
VITE_API_URL
```

Next browser variables use:

```txt
NEXT_PUBLIC_API_URL
```

The API and realtime clients now read `NEXT_PUBLIC_API_URL`.

## Verification

- `next build` passed.
- Backend TypeScript no-emit passed.
- Prisma schema validation passed.
- Docker Compose config passed.
