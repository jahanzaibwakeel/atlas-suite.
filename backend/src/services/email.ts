import { logger } from "../utils/logger.js";

export async function sendEmailVerification(input: { to: string; token: string }) {
  const url = `http://localhost:5173/verify-email?token=${encodeURIComponent(input.token)}`;
  logger.info("dev_email_verification", { to: input.to, url });
}

export async function sendPasswordReset(input: { to: string; token: string }) {
  const url = `http://localhost:5173/reset-password?token=${encodeURIComponent(input.token)}`;
  logger.info("dev_password_reset_email", { to: input.to, url });
}
