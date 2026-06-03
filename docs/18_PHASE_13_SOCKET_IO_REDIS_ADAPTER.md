# Phase 13: Socket.IO Redis Adapter

This phase hardens realtime events for horizontal backend scaling.

## Reuse Check

Before developing, we checked and reused:

- existing Socket.IO server setup
- existing JWT access-token auth
- existing Redis URL/config
- existing job and notification events
- existing frontend TanStack Query invalidation

No duplicate realtime system was created.

## Problem

Without an adapter, Socket.IO rooms exist only inside one API process.

Example:

```txt
api-1 has socket A
api-2 emits jobs:changed
```

If socket A is connected to `api-1`, an event emitted only in `api-2` will not reach it.

## Solution

Use the Socket.IO Redis adapter.

```txt
api-1 -> Redis pub/sub <- api-2
```

When one API instance emits an event to a room, Redis pub/sub lets the other API instances know.

## What We Added

Dependency:

- `@socket.io/redis-adapter`

Changed:

- `backend/src/realtime/socket.ts`
- `backend/src/server.ts`
- `backend/src/queues/redis.ts`

## Backend Flow

```ts
pubClient = new Redis(config.redisUrl);
subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

The publisher client sends adapter messages. The subscriber client listens for adapter messages.

## Why Redis Pub/Sub

Redis pub/sub is fast and fits cross-instance realtime coordination.

This is different from Redis queues:

- queues persist work for workers
- pub/sub broadcasts messages to subscribers

Socket.IO adapter uses pub/sub coordination, not durable job processing.

## Shutdown

The server now awaits realtime shutdown:

```ts
await closeRealtime();
```

This closes:

- Socket.IO server
- Redis subscriber client
- Redis publisher client

## Remaining Scaling Piece

The adapter solves cross-instance event propagation.

It does not solve load balancing by itself.

To run multiple backend containers behind one URL, we still need a reverse proxy/load balancer such as NGINX or a platform load balancer. That will come in the deployment/NGINX phase.

## Verification

- Backend TypeScript no-emit passed.
- Frontend TypeScript no-emit passed.
- Prisma schema validation passed.
- Docker Compose config passed.
