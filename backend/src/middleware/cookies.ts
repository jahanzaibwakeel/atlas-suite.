import type { RequestHandler } from "express";

export const parseCookies: RequestHandler = (req, _res, next) => {
  const header = req.header("cookie");
  req.cookies = {};

  if (!header) {
    next();
    return;
  }

  for (const cookie of header.split(";")) {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (!rawName || rawValue.length === 0) {
      continue;
    }

    req.cookies[rawName] = decodeURIComponent(rawValue.join("="));
  }

  next();
};
