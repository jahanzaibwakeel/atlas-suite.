import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestId: RequestHandler = (req, res, next) => {
  const incomingRequestId = req.header("x-request-id");
  req.requestId = incomingRequestId?.trim() || randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
};
