import type { RequestHandler } from "express";
import { config } from "../config.js";
import { HttpError } from "../utils/http.js";

function originFromReferer(referer: string | undefined) {
  if (!referer) {
    return undefined;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}

export const requireTrustedOrigin: RequestHandler = (req, _res, next) => {
  const origin = req.header("origin") ?? originFromReferer(req.header("referer"));

  if (!origin && !config.isProduction) {
    next();
    return;
  }

  if (origin !== config.frontendUrl) {
    throw new HttpError(403, "Untrusted request origin", "UNTRUSTED_ORIGIN");
  }

  next();
};
