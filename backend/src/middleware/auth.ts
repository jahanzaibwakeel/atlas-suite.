import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { config } from "../config.js";
import { HttpError } from "../utils/http.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    throw new HttpError(401, "Authentication required");
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret) as any;
    next();
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new HttpError(403, "You do not have permission to perform this action");
    }

    next();
  };
}
