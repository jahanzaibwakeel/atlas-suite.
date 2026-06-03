import { createServer } from "node:http";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./prisma.js";
import { closeRateLimitRedis } from "./queues/rate-limit.redis.js";
import { closeRealtime, initRealtime } from "./realtime/socket.js";
import { logger } from "./utils/logger.js";

const app = createApp();
const server = createServer(app);
initRealtime(server);

server.listen(config.port, () => {
  logger.info("api_server_started", { port: config.port });
});

async function shutdown(signal: string) {
  logger.info("api_server_shutdown_started", { signal });

  server.close(async (error) => {
    await closeRealtime();
    await closeRateLimitRedis();
    await prisma.$disconnect();

    if (error) {
      logger.error("api_server_shutdown_failed", { error });
      process.exit(1);
    }

    logger.info("api_server_shutdown_completed", { signal });
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
