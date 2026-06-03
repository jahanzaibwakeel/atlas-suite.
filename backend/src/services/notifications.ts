import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

type NotificationDb = Pick<typeof prisma, "notification"> | Prisma.TransactionClient;

export async function notifyUser(input: {
  userId: string;
  title: string;
  body: string;
  jobId?: string;
}, db: NotificationDb = prisma) {
  return db.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      body: input.body,
      jobId: input.jobId
    }
  });
}

export async function notifyMany(inputs: Array<Parameters<typeof notifyUser>[0]>, db: NotificationDb = prisma) {
  await Promise.all(inputs.map((input) => notifyUser(input, db)));
}
