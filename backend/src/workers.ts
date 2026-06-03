import { createEmailWorker, emailQueue } from "./queues/email.queue.js";
import { prisma } from "./prisma.js";
import { startOutboxDispatcher, stopOutboxDispatcher } from "./workers/outbox.dispatcher.js";

const emailWorker = createEmailWorker();
startOutboxDispatcher();

emailWorker.on("completed", (job) => {
  console.log(`[worker] completed ${job.name} ${job.id}`);
});

emailWorker.on("failed", (job, error) => {
  console.error(`[worker] failed ${job?.name ?? "unknown"} ${job?.id ?? "unknown"}`, error);
});

console.log("[worker] Email worker started");

async function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down workers.`);
  stopOutboxDispatcher();
  await emailWorker.close();
  await emailQueue.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
