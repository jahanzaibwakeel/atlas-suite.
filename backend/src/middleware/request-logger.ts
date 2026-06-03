import type { RequestHandler } from "express";
import { logger } from "../utils/logger.js";

export const requestLogger: RequestHandler = (req, res, next) => {
  if (req.path === "/health") {
    next();
    return;
  }

  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

    logger[level]("http_request", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      contentLength: res.getHeader("content-length") ?? null,
      userAgent: req.get("user-agent") ?? null,
      ip: req.ip
    });
  });

  next();
};
