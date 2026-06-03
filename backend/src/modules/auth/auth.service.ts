import bcrypt from "bcryptjs";
import type { EmailInput, LoginInput, ResetPasswordInput, TokenInput } from "./auth.schemas.js";
import { authRepository } from "./auth.repository.js";
import {
  generateRefreshToken,
  generateOneTimeToken,
  getEmailVerificationTokenExpiresAt,
  getPasswordResetTokenExpiresAt,
  getRefreshTokenExpiresAt,
  hashRefreshToken,
  signAccessToken
} from "./auth.tokens.js";
import { recordAudit } from "../../services/audit.js";
import { OutboxEventType, recordOutboxEvent } from "../../services/outbox.js";
import { HttpError } from "../../utils/http.js";

type SessionContext = {
  userAgent?: string;
  ipAddress?: string;
  requestId?: string;
};

export class AuthService {
  async login(input: LoginInput, context: SessionContext) {
    const user = await authRepository.findByEmail(input.email);

    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new HttpError(401, "Invalid email or password", "INVALID_CREDENTIALS");
    }

    const publicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const token = signAccessToken({
      id: user.id,
      role: user.role,
      email: user.email
    });

    const refreshToken = generateRefreshToken();
    const session = await authRepository.createRefreshSession({
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: getRefreshTokenExpiresAt(),
      userAgent: context.userAgent,
      ipAddress: context.ipAddress
    });

    await recordAudit({
      actorId: user.id,
      action: "AUTH_LOGIN_SUCCEEDED",
      entityType: "User",
      entityId: user.id,
      metadata: {
        refreshSessionId: session.id,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
        requestId: context.requestId ?? null
      }
    });

    return { accessToken: token, refreshToken, user: publicUser };
  }

  async refresh(refreshToken: string | undefined, context: SessionContext) {
    if (!refreshToken) {
      throw new HttpError(401, "Refresh token required", "REFRESH_TOKEN_REQUIRED");
    }

    const session = await authRepository.findRefreshSessionByTokenHash(hashRefreshToken(refreshToken));

    if (!session) {
      throw new HttpError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }

    if (session.revokedAt) {
      await recordAudit({
        actorId: session.userId,
        action: "AUTH_REFRESH_TOKEN_REUSE_DETECTED",
        entityType: "RefreshSession",
        entityId: session.id,
        metadata: {
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
          requestId: context.requestId ?? null
        }
      });
      await authRepository.revokeAllRefreshSessionsForUser(session.userId);
      throw new HttpError(401, "Refresh token reuse detected", "REFRESH_TOKEN_REUSE_DETECTED");
    }

    if (session.expiresAt <= new Date()) {
      await authRepository.revokeRefreshSession(session.id);
      throw new HttpError(401, "Refresh token expired", "REFRESH_TOKEN_EXPIRED");
    }

    const nextRefreshToken = generateRefreshToken();
    const nextSession = await authRepository.rotateRefreshSession({
      currentSessionId: session.id,
      userId: session.userId,
      newTokenHash: hashRefreshToken(nextRefreshToken),
      expiresAt: getRefreshTokenExpiresAt(),
      userAgent: context.userAgent,
      ipAddress: context.ipAddress
    });

    await recordAudit({
      actorId: session.userId,
      action: "AUTH_REFRESH_ROTATED",
      entityType: "RefreshSession",
      entityId: nextSession.id,
      metadata: {
        previousRefreshSessionId: session.id,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
        requestId: context.requestId ?? null
      }
    });

    const accessToken = signAccessToken({
      id: session.user.id,
      role: session.user.role,
      email: session.user.email
    });

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      user: session.user
    };
  }

  async logout(refreshToken: string | undefined, context: SessionContext) {
    if (!refreshToken) {
      return;
    }

    const session = await authRepository.findRefreshSessionByTokenHash(hashRefreshToken(refreshToken));
    if (session && !session.revokedAt) {
      await authRepository.revokeRefreshSession(session.id);
      await recordAudit({
        actorId: session.userId,
        action: "AUTH_LOGOUT",
        entityType: "RefreshSession",
        entityId: session.id,
        metadata: {
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
          requestId: context.requestId ?? null
        }
      });
    }
  }

  getCurrentUser(userId: string) {
    return authRepository.findPublicUserById(userId);
  }

  async requestEmailVerification(userId: string, context: SessionContext) {
    const user = await authRepository.findPublicUserById(userId);
    const token = generateOneTimeToken();

    await authRepository.transaction(async (tx) => {
      const verificationToken = await authRepository.createEmailVerificationToken(
        {
          userId,
          tokenHash: hashRefreshToken(token),
          expiresAt: getEmailVerificationTokenExpiresAt()
        },
        tx
      );

      await recordOutboxEvent(
        {
          type: OutboxEventType.EmailVerificationRequested,
          to: user.email,
          token
        },
        tx
      );

      await recordAudit(
        {
          actorId: userId,
          action: "AUTH_EMAIL_VERIFICATION_REQUESTED",
          entityType: "EmailVerificationToken",
          entityId: verificationToken.id,
          metadata: {
            requestId: context.requestId ?? null,
            ipAddress: context.ipAddress ?? null,
            userAgent: context.userAgent ?? null
          }
        },
        tx
      );
    });
  }

  async verifyEmail(input: TokenInput, context: SessionContext) {
    const verificationToken = await authRepository.findEmailVerificationToken(hashRefreshToken(input.token));

    if (!verificationToken || verificationToken.usedAt || verificationToken.expiresAt <= new Date()) {
      throw new HttpError(400, "Invalid or expired verification token", "INVALID_EMAIL_VERIFICATION_TOKEN");
    }

    const user = await authRepository.markEmailVerified(verificationToken.userId);
    await authRepository.markEmailVerificationTokenUsed(verificationToken.id);
    await recordAudit({
      actorId: verificationToken.userId,
      action: "AUTH_EMAIL_VERIFIED",
      entityType: "User",
      entityId: verificationToken.userId,
      metadata: {
        emailVerificationTokenId: verificationToken.id,
        requestId: context.requestId ?? null,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null
      }
    });

    return user;
  }

  async forgotPassword(input: EmailInput, context: SessionContext) {
    const user = await authRepository.findByEmail(input.email);

    if (!user) {
      return;
    }

    const token = generateOneTimeToken();

    await authRepository.transaction(async (tx) => {
      const resetToken = await authRepository.createPasswordResetToken(
        {
          userId: user.id,
          tokenHash: hashRefreshToken(token),
          expiresAt: getPasswordResetTokenExpiresAt()
        },
        tx
      );

      await recordOutboxEvent(
        {
          type: OutboxEventType.PasswordResetRequested,
          to: user.email,
          token
        },
        tx
      );

      await recordAudit(
        {
          actorId: user.id,
          action: "AUTH_PASSWORD_RESET_REQUESTED",
          entityType: "PasswordResetToken",
          entityId: resetToken.id,
          metadata: {
            requestId: context.requestId ?? null,
            ipAddress: context.ipAddress ?? null,
            userAgent: context.userAgent ?? null
          }
        },
        tx
      );
    });
  }

  async resetPassword(input: ResetPasswordInput, context: SessionContext) {
    const resetToken = await authRepository.findPasswordResetToken(hashRefreshToken(input.token));

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
      throw new HttpError(400, "Invalid or expired password reset token", "INVALID_PASSWORD_RESET_TOKEN");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    await authRepository.updatePasswordAndRevokeSessions({
      userId: resetToken.userId,
      resetTokenId: resetToken.id,
      passwordHash
    });

    await recordAudit({
      actorId: resetToken.userId,
      action: "AUTH_PASSWORD_RESET_COMPLETED",
      entityType: "User",
      entityId: resetToken.userId,
      metadata: {
        passwordResetTokenId: resetToken.id,
        requestId: context.requestId ?? null,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null
      }
    });
  }
}

export const authService = new AuthService();
