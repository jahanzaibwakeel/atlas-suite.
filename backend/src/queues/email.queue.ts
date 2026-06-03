import { Queue, Worker, type JobsOptions } from "bullmq";
import { config } from "../config.js";
import { createRedisConnectionOptions } from "./redis.js";
import { sendEmailVerification, sendPasswordReset } from "../services/email.js";

export type EmailJob =
  | {
      type: "email.verification";
      to: string;
      token: string;
      outboxEventId?: string;
    }
  | {
      type: "password.reset";
      to: string;
      token: string;
      outboxEventId?: string;
    };

type EmailJobName = EmailJob["type"];

const emailQueueName = "email";

const defaultEmailJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5_000
  },
  removeOnComplete: {
    age: 60 * 60,
    count: 1_000
  },
  removeOnFail: {
    age: 24 * 60 * 60
  }
};

export const emailQueue = new Queue<EmailJob, void, EmailJobName>(emailQueueName, {
  connection: createRedisConnectionOptions(),
  prefix: config.queuePrefix,
  defaultJobOptions: defaultEmailJobOptions
});

export function enqueueEmailVerification(input: { to: string; token: string; outboxEventId?: string }) {
  return emailQueue.add(
    "email.verification",
    {
      type: "email.verification",
      to: input.to,
      token: input.token,
      outboxEventId: input.outboxEventId
    },
    input.outboxEventId ? { jobId: input.outboxEventId } : undefined
  );
}

export function enqueuePasswordReset(input: { to: string; token: string; outboxEventId?: string }) {
  return emailQueue.add(
    "password.reset",
    {
      type: "password.reset",
      to: input.to,
      token: input.token,
      outboxEventId: input.outboxEventId
    },
    input.outboxEventId ? { jobId: input.outboxEventId } : undefined
  );
}

export function createEmailWorker() {
  return new Worker<EmailJob, void, EmailJobName>(
    emailQueueName,
    async (job) => {
      if (job.data.type === "email.verification") {
        await sendEmailVerification(job.data);
        return;
      }

      await sendPasswordReset(job.data);
    },
    {
      connection: createRedisConnectionOptions(),
      prefix: config.queuePrefix,
      concurrency: 5
    }
  );
}
