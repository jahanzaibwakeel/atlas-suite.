# Phase 12: WebSockets and Socket.IO Realtime

This phase adds realtime updates for jobs and notifications.

## What We Reused

Before adding code, we reused existing architecture:

- `server.ts` already creates a raw HTTP server.
- JWT access tokens already contain user identity and role.
- Job workflows already centralize mutations in `JobsService`.
- Notifications already use centralized helper functions.
- Frontend already uses TanStack Query.

This meant realtime could be added without rewriting core API behavior.

## What We Added

Backend:

- `socket.io`
- `backend/src/realtime/socket.ts`
- Socket.IO attached to the existing HTTP server.
- JWT authentication during socket handshake.
- User rooms and role rooms.
- `jobs:changed` events.
- `notifications:changed` events.

Frontend:

- `socket.io-client`
- `frontend/src/realtime/client.ts`
- `frontend/src/realtime/useRealtimeInvalidation.ts`
- Workspace-level realtime connection.
- TanStack Query invalidation when events arrive.

## Why WebSockets Exist

HTTP is request/response:

```txt
client asks
server answers
```

WebSockets are bidirectional:

```txt
client connects once
server can push events anytime
```

This is useful for:

- notifications
- job updates
- comments
- presence
- collaborative editing
- dashboards

## Socket Authentication

The frontend sends the access token during the socket handshake:

```ts
io(SOCKET_URL, {
  auth: { token }
});
```

The backend verifies it:

```ts
socket.data.user = jwt.verify(token, config.jwtSecret);
```

If invalid, the socket connection is rejected.

## Rooms

Rooms let the server send events to selected clients.

Current rooms:

```txt
user:{userId}
role:{role}
```

Users join their own room and their role room after authentication.

## Event Strategy

The backend does not send full job data through WebSockets.

It sends invalidation events:

```txt
jobs:changed
notifications:changed
```

The frontend then invalidates TanStack Query caches and refetches through REST.

This keeps REST as the source of API truth and avoids duplicating authorization logic in event payloads.

## Why Emit After Commit

Job events are emitted after database transactions complete.

Bad:

```txt
emit event before commit
client refetches
data not committed yet
```

Good:

```txt
commit transaction
emit event
client refetches committed state
```

## Scaling Note

This phase supports one API process.

For multiple API instances, Socket.IO needs a Redis adapter:

```txt
api-1 sockets
api-2 sockets
Redis adapter coordinates rooms/events
```

That is the next realtime hardening step.

## Common Mistakes

- Trusting unauthenticated socket connections.
- Sending private data to broad rooms.
- Emitting before database commit.
- Using WebSockets as the source of truth instead of REST/database.
- Forgetting reconnection behavior.
- Not using a Socket.IO adapter when horizontally scaling.
- Duplicating authorization logic in frontend-only event handling.

## Verification

- Backend TypeScript no-emit passed.
- Frontend TypeScript no-emit passed.
- Docker Compose config passed.
