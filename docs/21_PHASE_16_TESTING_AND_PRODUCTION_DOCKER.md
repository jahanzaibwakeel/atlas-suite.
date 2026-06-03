# Phase 16: Testing Strategy and Production Docker

This phase adds the first automated tests and production-focused Dockerfiles.

## Reuse Check

Before developing, we reused:

- existing `createApp()` export for API tests
- existing authorization policy functions for unit tests
- existing dev Dockerfiles and Compose instead of replacing them
- existing Next build as the frontend verification gate

No duplicate app server or frontend build system was created.

## Testing Added

Tools:

- Vitest
- Supertest

Tests:

- `backend/src/app.test.ts`
- `backend/src/modules/authorization/job.policy.test.ts`

## Test Types

The project now has:

- API smoke tests
- authorization policy unit tests
- frontend production build verification
- TypeScript checks
- Prisma schema validation

Future testing phases can add:

- test database integration tests
- auth flow tests
- file upload tests
- Playwright UI tests

## Production Docker Added

Added:

- `backend/Dockerfile.prod`
- `frontend/Dockerfile.prod`
- `docker-compose.prod.yml`

Production Docker improvements:

- multi-stage builds
- production runtime stage
- non-root user
- no watch mode
- pruned dev dependencies
- separate dev and prod Dockerfiles
- backend production start path uses compiled `dist/src/server.js`
- Prisma CLI is kept as a production dependency because the container runs migrations before boot

## Why Separate Dev and Prod Dockerfiles

Development containers optimize for fast iteration.

Production containers optimize for:

- smaller runtime surface
- no watchers
- non-root execution
- deterministic startup
- fewer unnecessary files

## Migration Runtime Rule

If production startup runs:

```bash
npm run migrate
```

then the runtime image must include the migration tool. In this project, `npm run migrate` uses Prisma CLI:

```bash
prisma generate && prisma migrate deploy
```

That means `prisma` cannot be pruned away as a dev-only dependency unless migrations move into a separate release job/image. Larger companies often prefer a separate migration job so app containers only start the server, but this Compose setup keeps startup simple while preserving correctness.

## Verification

Verified commands:

```bash
npm.cmd --prefix backend run test
npm.cmd --prefix backend run build
npm.cmd --prefix backend run prisma -- validate
npm.cmd --prefix frontend run build
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
```

Results:

- backend tests: 2 files, 5 tests passed
- backend TypeScript build: passed
- Prisma schema validation: passed
- frontend production build: passed
- production Compose config: valid
