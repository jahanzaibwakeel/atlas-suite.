import { createEmailWorker, emailQueue } from "./queues/email.queue.js";
import { prisma } from "./prisma.js";
import { logger } from "./utils/logger.js";
import { startOutboxDispatcher, stopOutboxDispatcher } from "./workers/outbox.dispatcher.js";

const emailWorker = createEmailWorker();
startOutboxDispatcher();

emailWorker.on("completed", (job) => {
  logger.info("worker_job_completed", { jobName: job.name, jobId: job.id });
});

emailWorker.on("failed", (job, error) => {
  logger.error("worker_job_failed", {
    jobName: job?.name ?? "unknown",
    jobId: job?.id ?? "unknown",
    error
  });
});

logger.info("email_worker_started");

async function shutdown(signal: string) {
  logger.info("worker_shutdown_started", { signal });
  stopOutboxDispatcher();
  await emailWorker.close();
  await emailQueue.close();
  await prisma.$disconnect();
  logger.info("worker_shutdown_completed", { signal });
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
