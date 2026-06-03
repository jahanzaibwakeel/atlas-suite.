import type { Request, Response } from "express";
import { emailSchema, loginSchema, resetPasswordSchema, tokenSchema } from "./auth.schemas.js";
import { clearRefreshCookie, setRefreshCookie } from "./auth.cookies.js";
import { authService } from "./auth.service.js";
import { refreshCookieName } from "./auth.tokens.js";

export class AuthController {
  async login(req: Request, res: Response) {
    const body = loginSchema.parse(req.body);
    const result = await authService.login(body, {
      userAgent: req.header("user-agent"),
      ipAddress: req.ip,
      requestId: req.requestId
    });
    setRefreshCookie(res, result.refreshToken);
    res.json({ accessToken: result.accessToken, token: result.accessToken, user: result.user });
  }

  async refresh(req: Request, res: Response) {
    const result = await authService.refresh(req.cookies?.[refreshCookieName], {
      userAgent: req.header("user-agent"),
      ipAddress: req.ip,
      requestId: req.requestId
    });
    setRefreshCookie(res, result.refreshToken);
    res.json({ accessToken: result.accessToken, token: result.accessToken, user: result.user });
  }

  async logout(req: Request, res: Response) {
    await authService.logout(req.cookies?.[refreshCookieName], {
      userAgent: req.header("user-agent"),
      ipAddress: req.ip,
      requestId: req.requestId
    });
    clearRefreshCookie(res);
    res.status(204).send();
  }

  async me(req: Request, res: Response) {
    const user = await authService.getCurrentUser(req.user!.id);
    res.json({ user });
  }

  async requestEmailVerification(req: Request, res: Response) {
    await authService.requestEmailVerification(req.user!.id, {
      userAgent: req.header("user-agent"),
      ipAddress: req.ip,
      requestId: req.requestId
    });
    res.status(202).json({ message: "Verification email queued" });
  }

  async verifyEmail(req: Request, res: Response) {
    const body = tokenSchema.parse(req.body);
    const user = await authService.verifyEmail(body, {
      userAgent: req.header("user-agent"),
      ipAddress: req.ip,
      requestId: req.requestId
    });
    res.json({ user });
  }

  async forgotPassword(req: Request, res: Response) {
    const body = emailSchema.parse(req.body);
    await authService.forgotPassword(body, {
      userAgent: req.header("user-agent"),
      ipAddress: req.ip,
      requestId: req.requestId
    });
    res.status(202).json({
      message: "If the email exists, a password reset message will be sent"
    });
  }

  async resetPassword(req: Request, res: Response) {
    const body = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(body, {
      userAgent: req.header("user-agent"),
      ipAddress: req.ip,
      requestId: req.requestId
    });
    clearRefreshCookie(res);
    res.status(204).send();
  }
}

export const authController = new AuthController();
