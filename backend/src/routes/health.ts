import { Router } from "express";
import { getRateLimitRedis } from "../queues/rate-limit.redis.js";
import { prisma } from "../prisma.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/ready", async (_req, res) => {
  const checks = {
    database: "unknown",
    redis: "unknown"
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  try {
    await getRateLimitRedis().ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "error";
  }

  const ready = Object.values(checks).every((status) => status === "ok");

  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "not_ready",
    checks
  });
});

router.get("/metrics", (_req, res) => {
  const memory = process.memoryUsage();

  res.json({
    status: "ok",
    uptimeSeconds: Math.round(process.uptime()),
    memory: {
      rssBytes: memory.rss,
      heapTotalBytes: memory.heapTotal,
      heapUsedBytes: memory.heapUsed,
      externalBytes: memory.external
    }
  });
});

export default router;
