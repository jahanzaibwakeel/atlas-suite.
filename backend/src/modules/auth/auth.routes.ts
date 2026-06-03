import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { createRateLimiter, emailAndIpKey } from "../../middleware/rate-limit.js";
import { requireTrustedOrigin } from "../../middleware/trusted-origin.js";
import { asyncHandler } from "../../utils/http.js";
import { authController } from "./auth.controller.js";

const router = Router();

const loginRateLimit = createRateLimiter({
  keyPrefix: "auth-login",
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: emailAndIpKey
});

const passwordResetRateLimit = createRateLimiter({
  keyPrefix: "password-reset",
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: emailAndIpKey
});

const refreshRateLimit = createRateLimiter({
  keyPrefix: "auth-refresh",
  windowMs: 60 * 1000,
  max: 30
});

const emailVerificationRateLimit = createRateLimiter({
  keyPrefix: "email-verification",
  windowMs: 15 * 60 * 1000,
  max: 5
});

router.post("/login", loginRateLimit, asyncHandler(authController.login));
router.post("/refresh", requireTrustedOrigin, refreshRateLimit, asyncHandler(authController.refresh));
router.post("/logout", requireTrustedOrigin, asyncHandler(authController.logout));
router.post(
  "/email-verification/request",
  requireAuth,
  emailVerificationRateLimit,
  asyncHandler(authController.requestEmailVerification)
);
router.post("/email-verification/verify", asyncHandler(authController.verifyEmail));
router.post("/password/forgot", passwordResetRateLimit, asyncHandler(authController.forgotPassword));
router.post("/password/reset", requireTrustedOrigin, passwordResetRateLimit, asyncHandler(authController.resetPassword));
router.get("/me", requireAuth, asyncHandler(authController.me));

export default router;
