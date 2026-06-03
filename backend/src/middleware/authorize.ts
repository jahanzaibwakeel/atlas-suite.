import type { RequestHandler } from "express";
import { hasPermission, type Permission } from "../modules/authorization/permissions.js";
import { HttpError } from "../utils/http.js";

export function requirePermission(permission: Permission): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !hasPermission(req.user.role, permission)) {
      throw new HttpError(403, "You do not have permission to perform this action", "FORBIDDEN");
    }

    next();
  };
}
