import { prisma } from "../../prisma.js";
import type { Prisma } from "@prisma/client";

type DbClient = typeof prisma | Prisma.TransactionClient;

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true
} as const;

export class AuthRepository {
  transaction<T>(handler: (tx: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction(handler);
  }

  findByEmail(email: string, db: DbClient = prisma) {
    return db.user.findUnique({ where: { email } });
  }

  findPublicUserById(id: string, db: DbClient = prisma) {
    return db.user.findUniqueOrThrow({
      where: { id },
      select: publicUserSelect
    });
  }

  markEmailVerified(userId: string, db: DbClient = prisma) {
    return db.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
      select: publicUserSelect
    });
  }

  updatePasswordAndRevokeSessions(input: { userId: string; passwordHash: string; resetTokenId: string }) {
    return prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: input.userId },
        data: { passwordHash: input.passwordHash }
      });

      await tx.passwordResetToken.update({
        where: { id: input.resetTokenId },
        data: { usedAt: new Date() }
      });

      await tx.refreshSession.updateMany({
        where: {
          userId: input.userId,
          revokedAt: null
        },
        data: { revokedAt: new Date() }
      });
    });
  }

  createRefreshSession(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }) {
    return prisma.refreshSession.create({
      data: input
    });
  }

  findRefreshSessionByTokenHash(tokenHash: string) {
    return prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: publicUserSelect
        }
      }
    });
  }

  async rotateRefreshSession(input: {
    currentSessionId: string;
    userId: string;
    newTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const nextSession = await tx.refreshSession.create({
        data: {
          userId: input.userId,
          tokenHash: input.newTokenHash,
          expiresAt: input.expiresAt,
          userAgent: input.userAgent,
          ipAddress: input.ipAddress
        }
      });

      await tx.refreshSession.update({
        where: { id: input.currentSessionId },
        data: {
          revokedAt: new Date(),
          replacedByTokenId: nextSession.id
        }
      });

      return nextSession;
    });
  }

  revokeRefreshSession(sessionId: string) {
    return prisma.refreshSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() }
    });
  }

  revokeAllRefreshSessionsForUser(userId: string) {
    return prisma.refreshSession.updateMany({
      where: {
        userId,
        revokedAt: null
      },
      data: { revokedAt: new Date() }
    });
  }

  createEmailVerificationToken(input: { userId: string; tokenHash: string; expiresAt: Date }, db: DbClient = prisma) {
    return db.emailVerificationToken.create({ data: input });
  }

  findEmailVerificationToken(tokenHash: string) {
    return prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: publicUserSelect
        }
      }
    });
  }

  markEmailVerificationTokenUsed(tokenId: string, db: DbClient = prisma) {
    return db.emailVerificationToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() }
    });
  }

  createPasswordResetToken(input: { userId: string; tokenHash: string; expiresAt: Date }, db: DbClient = prisma) {
    return db.passwordResetToken.create({ data: input });
  }

  findPasswordResetToken(tokenHash: string) {
    return prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: publicUserSelect
        }
      }
    });
  }
}

export const authRepository = new AuthRepository();
