# Phase 5: Pagination, Filtering, and Search

This phase upgrades the Jobs list endpoint from "return every visible job" to a real list API contract.

## What It Adds

The Jobs API now accepts:

- `status`
- `q`
- `page`
- `pageSize`

The response now includes:

- `jobs`
- `pagination.page`
- `pagination.pageSize`
- `pagination.total`
- `pagination.totalPages`
- `pagination.hasNextPage`
- `pagination.hasPreviousPage`

## Why It Exists

Returning all records is acceptable only for tiny data sets. In production, unbounded list endpoints cause:

- slow API responses
- high database load
- large JSON payloads
- slow frontend rendering
- unstable user experience

Pagination makes list reads bounded and predictable.

## Request Flow

```txt
GET /api/v1/jobs?page=1&pageSize=10&q=sensor&status=ASSIGNED
  -> requireAuth
  -> JobsController.list
  -> listJobsQuerySchema.parse(req.query)
  -> JobsService.listJobs
  -> build Prisma where filter
  -> calculate skip/take
  -> JobsRepository.listJobs
  -> prisma.$transaction([findMany, count])
  -> presenter filters client-visible fields
  -> JSON response with pagination metadata
```

## Offset Pagination

Offset pagination uses:

```txt
skip = (page - 1) * pageSize
take = pageSize
```

It is easy to understand and works well for admin dashboards and moderate datasets.

## Cursor Pagination Alternative

Cursor pagination uses a stable pointer such as:

```txt
createdAt + id
```

It is better for very large or frequently changing datasets because deep offsets become expensive.

## Search

The current search uses case-insensitive contains filters on title and description.

This is simple but not the final production search strategy. At larger scale, use:

- PostgreSQL full-text search
- trigram indexes
- dedicated search systems such as OpenSearch or Meilisearch

## Frontend

The frontend now includes search, status filtering, and previous/next pagination controls. TanStack Query uses the filter state in the query key so each result set is cached separately.

## Verification

- backend TypeScript no-emit passed
- frontend TypeScript no-emit passed
- Prisma schema validation passed
