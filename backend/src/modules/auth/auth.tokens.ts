import { createHash, randomBytes } from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { AuthUser } from "../../types.js";
import { config } from "../../config.js";

export const refreshCookieName = "atlas_refresh_token";

export function signAccessToken(user: AuthUser) {
  const options: SignOptions = {
    expiresIn: config.jwtAccessTokenTtl as SignOptions["expiresIn"]
  };

  return jwt.sign(user, config.jwtSecret, options);
}

export function generateRefreshToken() {
  return randomBytes(64).toString("base64url");
}

export function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getRefreshTokenExpiresAt() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.jwtRefreshTokenTtlDays);
  return expiresAt;
}

export function generateOneTimeToken() {
  return randomBytes(48).toString("base64url");
}

export function getEmailVerificationTokenExpiresAt() {
  return minutesFromNow(config.emailVerificationTokenTtlMinutes);
}

export function getPasswordResetTokenExpiresAt() {
  return minutesFromNow(config.passwordResetTokenTtlMinutes);
}

function minutesFromNow(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}
