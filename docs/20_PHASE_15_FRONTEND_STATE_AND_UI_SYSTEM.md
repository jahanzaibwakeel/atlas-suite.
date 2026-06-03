# Phase 15: Frontend State Architecture and UI Primitives

This phase polishes the frontend after the Next.js migration.

## Reuse Check

Before developing, we checked existing code and reused:

- `AuthContext`
- TanStack Query provider
- route guards in App Router pages
- existing CSS classes
- existing job/status UI

No duplicate auth store, query store, or component system was created.

## State Architecture Changes

`AuthContext` now exposes:

```ts
user
ready
login()
logout()
```

`ready` tells route guards when browser-side auth hydration has finished.

This prevents redirect flicker in Next.js because `localStorage` is unavailable during prerender.

## Query Defaults

TanStack Query now has shared defaults:

```ts
staleTime: 30000
gcTime: 300000
refetchOnWindowFocus: false
retry: 1
```

This avoids every query manually defining basic cache behavior.

## UI Primitives Added

Added:

- `Button`
- `Panel`
- `StatusBadge`

These wrap existing styles instead of redesigning the interface.

## Why This Matters

Frontend systems become hard to maintain when every screen invents its own buttons, badges, panels, loading behavior, and state rules.

A small component layer gives:

- consistency
- easier future redesigns
- fewer repeated class names
- safer incremental UI changes

## Verification

- Next build passed.
- Backend TypeScript no-emit passed.
- Prisma schema validation passed.
- Docker Compose config passed.
