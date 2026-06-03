import { createServer } from "node:http";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./prisma.js";
import { closeRateLimitRedis } from "./queues/rate-limit.redis.js";
import { closeRealtime, initRealtime } from "./realtime/socket.js";

const app = createApp();
const server = createServer(app);
initRealtime(server);

server.listen(config.port, () => {
  console.log(`AtlasSuite API listening on http://localhost:${config.port}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down API server.`);

  server.close(async (error) => {
    await closeRealtime();
    await closeRateLimitRedis();
    await prisma.$disconnect();

    if (error) {
      console.error(error);
      process.exit(1);
    }

    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
