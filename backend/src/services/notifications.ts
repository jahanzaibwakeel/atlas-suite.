import { prisma } from "../prisma.js";

export async function notifyUser(input: {
  userId: string;
  title: string;
  body: string;
  jobId?: string;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      body: input.body,
      jobId: input.jobId
    }
  });
}

export async function notifyMany(inputs: Array<Parameters<typeof notifyUser>[0]>) {
  await Promise.all(inputs.map((input) => notifyUser(input)));
}
