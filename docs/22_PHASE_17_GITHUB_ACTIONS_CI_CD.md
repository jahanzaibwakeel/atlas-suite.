# Phase 17: GitHub Actions CI/CD

This phase adds the first GitHub Actions workflow for AtlasSuite.

## Reuse Check

Before developing, we checked for:

- existing `.github` workflows
- root `package.json` scripts
- backend `test`, `build`, and Prisma scripts
- frontend `build` script
- Dockerfiles and Docker Compose production override
- existing `.dockerignore` files

There was no existing workflow, so we added one. We reused the local package scripts instead of creating a separate CI-only command vocabulary.

## What CI/CD Is

CI/CD means Continuous Integration and Continuous Delivery or Deployment.

Continuous Integration answers:

```txt
Can this code safely merge?
```

Continuous Delivery answers:

```txt
Can this code be packaged and prepared for release?
```

Continuous Deployment answers:

```txt
Can this code be automatically released after passing gates?
```

This phase implements CI and release-readiness checks. Actual deployment comes in the next deployment phase.

## Why CI Exists

A developer's laptop is not a reliable source of truth. It may have:

- hidden environment variables
- cached packages
- running local services
- generated files
- permission differences
- uncommitted changes

CI gives the team a clean machine that repeats the same validation steps for every push or pull request.

## Workflow Added

File:

```txt
.github/workflows/ci.yml
```

Triggers:

```yaml
on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main
```

This means CI runs when code is pushed to `main` and when a pull request targets `main`.

## Jobs

The workflow has three jobs:

```txt
backend
frontend
docker
```

The Docker job depends on backend and frontend:

```yaml
needs:
  - backend
  - frontend
```

That dependency order matters. There is no reason to spend time building Docker images if TypeScript or tests already failed.

## Backend Job

The backend job runs:

```bash
npm ci
npm run prisma -- validate
npm run test
npm run build
```

### Why `npm ci`

`npm install` can update dependency resolution.

`npm ci` installs exactly from `package-lock.json`. CI should be deterministic, so `npm ci` is the professional default.

### Why Prisma Validation Runs Before Tests

Prisma validation catches schema problems early:

```bash
prisma validate
```

If the schema is invalid, tests and builds are not meaningful.

### Why Tests Run Before Build

Tests catch behavior regressions. Build catches TypeScript and compile-time failures. Both matter:

- tests protect runtime behavior
- builds protect type and output correctness

## Frontend Job

The frontend job runs:

```bash
npm ci
npm run build
```

In Next.js, `next build` is more than bundling. It also validates route compilation, server/client component boundaries, page generation, and TypeScript integration.

## Docker Job

The Docker job runs:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
docker build -f backend/Dockerfile.prod -t atlas-backend:ci backend
docker build -f frontend/Dockerfile.prod --build-arg NEXT_PUBLIC_API_URL=http://localhost:4000/api -t atlas-frontend:ci frontend
```

This validates that production Dockerfiles still build after code changes.

## Internal Working

GitHub Actions starts a clean runner for each job.

```txt
GitHub event
  -> workflow trigger
  -> runner VM
  -> checkout code
  -> setup Node
  -> install locked dependencies
  -> run validation commands
  -> report pass/fail status
```

Each job is isolated. The backend job does not reuse the frontend job's filesystem. This is why each job checks out code and installs dependencies independently.

## Environment Variables

The workflow provides safe CI values:

```yaml
DATABASE_URL: postgresql://atlas:atlas_dev_password@localhost:5432/atlas_suite?schema=public
JWT_SECRET: ci-jwt-secret-at-least-32-characters
NEXT_PUBLIC_API_URL: http://localhost:4000/api
```

The tests currently do not need a live PostgreSQL service because they test API smoke behavior and pure authorization policies. When integration tests are added, CI should add Postgres and Redis service containers.

## Security Concerns

CI should not leak secrets.

Rules:

- never commit production secrets
- use GitHub Actions secrets for real deploy credentials
- keep workflow permissions minimal
- avoid printing tokens
- do not run deployment steps on untrusted pull requests

This workflow uses:

```yaml
permissions:
  contents: read
```

That gives the workflow only read access to repository contents.

## Performance Considerations

The workflow uses npm cache:

```yaml
cache: npm
cache-dependency-path: backend/package-lock.json
```

This speeds up dependency installation while keeping installs deterministic through `npm ci`.

Jobs are split so backend and frontend can run in parallel. Docker waits until both pass.

## Common Mistakes

Common CI mistakes:

- using `npm install` instead of `npm ci`
- skipping lockfiles
- only testing locally
- allowing Docker builds to drift from source builds
- putting production secrets into workflow YAML
- making one giant job that hides which layer failed
- deploying from pull requests without trust boundaries

## Enterprise Usage

In a company, this workflow would usually expand into:

- linting
- unit tests
- integration tests with Postgres and Redis services
- Playwright end-to-end tests
- Docker image push to a registry
- deployment to staging
- manual approval for production
- release tagging
- vulnerability scanning

AtlasSuite now has the foundation needed for those later gates.
