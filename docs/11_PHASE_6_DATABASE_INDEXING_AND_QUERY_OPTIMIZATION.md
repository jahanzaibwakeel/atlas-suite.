# Phase 6: Database Indexing and Query Optimization

This phase tunes PostgreSQL around the Jobs list API access patterns.

## What We Added

Prisma-managed composite indexes:

```prisma
@@index([status, scheduledAt, createdAt, id])
@@index([clientId, status, scheduledAt, createdAt, id])
@@index([technicianId, status, scheduledAt, createdAt, id])
@@index([createdAt, id])
```

PostgreSQL-specific trigram search indexes in SQL:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Job_title_trgm_idx" ON "Job" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "Job_description_trgm_idx" ON "Job" USING GIN ("description" gin_trgm_ops);
```

Supporting indexes:

```prisma
@@index([jobId, createdAt])
@@index([userId, readAt, createdAt])
@@index([entityType, entityId, createdAt])
@@index([createdAt])
```

## Why Indexing Exists

An index is a data structure PostgreSQL can use to avoid scanning every row.

Without an index:

```txt
PostgreSQL reads many table rows
checks each row against the WHERE clause
sorts matching rows
returns the page
```

With a useful index:

```txt
PostgreSQL walks the index
finds matching rows faster
may read fewer table pages
may avoid or reduce sorting
```

## Access Patterns

The Jobs API commonly reads:

```txt
Admin:      jobs by status, ordered by scheduledAt/createdAt/id
Technician: jobs where technicianId = current user, optional status filter
Client:     jobs where clientId = current user, optional status filter
Search:     title/description contains search text
```

Indexes should follow these access patterns.

## B-Tree Indexes

PostgreSQL's default index type is B-tree. B-tree indexes are good for:

- equality filters
- range filters
- sorting
- prefix parts of composite indexes

Example:

```prisma
@@index([technicianId, status, scheduledAt, createdAt, id])
```

This helps queries like:

```ts
where: {
  technicianId: user.id,
  status: "ASSIGNED"
},
orderBy: [
  { scheduledAt: "asc" },
  { createdAt: "desc" },
  { id: "asc" }
]
```

## Composite Index Order

Column order matters.

Good:

```txt
technicianId -> status -> scheduledAt -> createdAt -> id
```

Because the query filters first by technician, then maybe status, then orders by dates.

Less useful:

```txt
scheduledAt -> technicianId -> status
```

Because the database cannot use the index as effectively when the most selective equality filters come later.

## Trigram GIN Indexes

The Jobs search uses contains queries:

```ts
{ title: { contains: query.q, mode: "insensitive" } }
```

In PostgreSQL this is similar to:

```sql
title ILIKE '%sensor%'
```

A normal B-tree index does not help much with `%term%` contains search. Trigram indexes break text into small chunks and allow PostgreSQL to accelerate fuzzy/contains matching.

That is why the migration adds:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Job_title_trgm_idx" ON "Job" USING GIN ("title" gin_trgm_ops);
```

## Why Some Indexes Are Raw SQL

Prisma schema supports many normal indexes, but not every PostgreSQL-specific index option is represented cleanly in Prisma schema.

For database-specific features, production teams often use raw SQL migrations.

This is normal. ORMs do not remove the need to understand the database.

## How to Verify With EXPLAIN

Use:

```sql
EXPLAIN ANALYZE
SELECT *
FROM "Job"
WHERE "technicianId" = 'user_id'
  AND "status" = 'ASSIGNED'
ORDER BY "scheduledAt" ASC, "createdAt" DESC, "id" ASC
LIMIT 10 OFFSET 0;
```

Look for:

- `Index Scan`
- `Bitmap Index Scan`
- rows scanned vs rows returned
- sort cost
- total execution time

If you see `Seq Scan` on a large table for a common query, that may indicate a missing or unusable index.

## Trade-Offs

Indexes improve reads, but they are not free.

Costs:

- slower inserts
- slower updates to indexed columns
- more disk usage
- more migration time
- more planning complexity

Index only for known access patterns, not every column.

## Common Mistakes

- Adding indexes before knowing query patterns.
- Indexing every column.
- Ignoring composite index column order.
- Forgetting that `%term%` search needs a different strategy than equality filters.
- Assuming Prisma automatically creates all performance indexes.
- Not checking execution plans.
- Keeping unused indexes forever.

## Enterprise Usage

Engineering teams usually monitor slow queries, inspect query plans, and add indexes based on production access patterns.

Typical workflow:

```txt
observe slow query
inspect SQL and EXPLAIN ANALYZE
add or adjust index
measure again
watch write overhead
```

Good database engineering is evidence-driven.
