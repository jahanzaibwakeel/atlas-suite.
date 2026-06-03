import type { Response } from "express";
import { config } from "../../config.js";
import { refreshCookieName } from "./auth.tokens.js";

const refreshCookiePath = "/api";

export function setRefreshCookie(res: Response, token: string) {
  res.cookie(refreshCookieName, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax",
    domain: config.cookieDomain,
    path: refreshCookiePath,
    maxAge: config.jwtRefreshTokenTtlDays * 24 * 60 * 60 * 1000
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(refreshCookieName, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax",
    domain: config.cookieDomain,
    path: refreshCookiePath
  });
}
