import { OutboxStatus, type Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

type OutboxDb = Pick<typeof prisma, "outboxEvent"> | Prisma.TransactionClient;

export const OutboxEventType = {
  EmailVerificationRequested: "email.verification.requested",
  PasswordResetRequested: "password.reset.requested"
} as const;

export type OutboxEventType = (typeof OutboxEventType)[keyof typeof OutboxEventType];

export type EmailOutboxPayload =
  | {
      type: typeof OutboxEventType.EmailVerificationRequested;
      to: string;
      token: string;
    }
  | {
      type: typeof OutboxEventType.PasswordResetRequested;
      to: string;
      token: string;
    };

export function recordOutboxEvent(input: EmailOutboxPayload, db: OutboxDb = prisma) {
  return db.outboxEvent.create({
    data: {
      type: input.type,
      payload: input
    }
  });
}

export async function claimOutboxBatch(limit: number) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const events = await tx.outboxEvent.findMany({
      where: {
        status: { in: [OutboxStatus.PENDING, OutboxStatus.FAILED] },
        availableAt: { lte: now },
        attempts: { lt: 10 }
      },
      orderBy: { createdAt: "asc" },
      take: limit
    });

    if (events.length === 0) {
      return [];
    }

    await tx.outboxEvent.updateMany({
      where: {
        id: { in: events.map((event) => event.id) },
        status: { in: [OutboxStatus.PENDING, OutboxStatus.FAILED] }
      },
      data: {
        status: OutboxStatus.PROCESSING,
        lockedAt: now
      }
    });

    return events;
  });
}

export function markOutboxPublished(id: string) {
  return prisma.outboxEvent.update({
    where: { id },
    data: {
      status: OutboxStatus.PUBLISHED,
      publishedAt: new Date(),
      lastError: null
    }
  });
}

export function markOutboxFailed(input: { id: string; attempts: number; error: unknown }) {
  const nextAttempt = input.attempts + 1;
  const delayMs = Math.min(60_000, 2 ** nextAttempt * 1_000);

  return prisma.outboxEvent.update({
    where: { id: input.id },
    data: {
      status: OutboxStatus.FAILED,
      attempts: { increment: 1 },
      availableAt: new Date(Date.now() + delayMs),
      lastError: input.error instanceof Error ? input.error.message : String(input.error)
    }
  });
}
