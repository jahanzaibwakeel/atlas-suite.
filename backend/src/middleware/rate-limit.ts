import type { Request, RequestHandler } from "express";
import { config } from "../config.js";
import { getRateLimitRedis } from "../queues/rate-limit.redis.js";
import { logger } from "../utils/logger.js";

type RateLimitOptions = {
  keyPrefix: string;
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
};

function defaultKeyGenerator(req: Request) {
  return req.ip || "unknown";
}

function normalizeKeyPart(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_.:@-]/g, "_").slice(0, 120);
}

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  return async (req, res, next) => {
    const keyPart = normalizeKeyPart((options.keyGenerator ?? defaultKeyGenerator)(req));
    const key = `${config.queuePrefix}:rate-limit:${options.keyPrefix}:${keyPart}`;

    try {
      const redis = getRateLimitRedis();
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.pexpire(key, options.windowMs);
      }

      const ttl = await redis.pttl(key);
      const resetSeconds = Math.max(1, Math.ceil(ttl / 1000));
      const remaining = Math.max(0, options.max - count);

      res.setHeader("X-RateLimit-Limit", String(options.max));
      res.setHeader("X-RateLimit-Remaining", String(remaining));
      res.setHeader("X-RateLimit-Reset", String(resetSeconds));

      if (count > options.max) {
        res.setHeader("Retry-After", String(resetSeconds));
        res.status(429).json({
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
            requestId: req.requestId
          }
        });
        return;
      }

      next();
    } catch (error) {
      logger.error("rate_limiter_failed", { requestId: req.requestId, error });

      if (config.rateLimitFailOpen) {
        next();
        return;
      }

      res.status(503).json({
        error: {
          code: "RATE_LIMIT_UNAVAILABLE",
          message: "Rate limit service unavailable",
          requestId: req.requestId
        }
      });
    }
  };
}

export function emailAndIpKey(req: Request) {
  const email = typeof req.body?.email === "string" ? req.body.email : "unknown-email";
  return `${req.ip || "unknown-ip"}:${email}`;
}
