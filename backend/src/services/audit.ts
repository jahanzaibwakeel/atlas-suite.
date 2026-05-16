import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

export async function recordAudit(input: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  jobId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      jobId: input.jobId,
      metadata: input.metadata
    }
  });
}
