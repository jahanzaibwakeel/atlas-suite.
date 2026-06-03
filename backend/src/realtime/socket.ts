import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { Redis } from "ioredis";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { config } from "../config.js";
import type { AuthUser } from "../types.js";
import { parseRedisUrl } from "../queues/redis.js";
import { logger } from "../utils/logger.js";

let io: Server | undefined;
let pubClient: Redis | undefined;
let subClient: Redis | undefined;

export function initRealtime(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: config.frontendUrl,
      credentials: true
    }
  });

  const redisUrl = parseRedisUrl();
  pubClient = new Redis(config.redisUrl);
  subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (typeof token !== "string") {
      next(new Error("Authentication required"));
      return;
    }

    try {
      socket.data.user = jwt.verify(token, config.jwtSecret) as AuthUser;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as AuthUser;
    socket.join(userRoom(user.id));
    socket.join(roleRoom(user.role));
    logger.info("realtime_client_connected", {
      userId: user.id,
      role: user.role,
      redisHost: redisUrl.hostname
    });
  });

  return io;
}

export async function closeRealtime() {
  io?.close();
  await subClient?.quit();
  await pubClient?.quit();
  io = undefined;
  pubClient = undefined;
  subClient = undefined;
}

export function emitUserNotificationsChanged(userId: string) {
  io?.to(userRoom(userId)).emit("notifications:changed", { userId });
}

export function emitJobChanged(input: { jobId: string; userIds?: string[] }) {
  io?.to(roleRoom("ADMIN")).emit("jobs:changed", { jobId: input.jobId });

  for (const userId of input.userIds ?? []) {
    io?.to(userRoom(userId)).emit("jobs:changed", { jobId: input.jobId });
  }
}

function userRoom(userId: string) {
  return `user:${userId}`;
}

function roleRoom(role: string) {
  return `role:${role}`;
}
