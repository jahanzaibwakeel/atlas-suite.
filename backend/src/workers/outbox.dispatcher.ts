import { OutboxEventType, claimOutboxBatch, markOutboxFailed, markOutboxPublished } from "../services/outbox.js";
import { enqueueEmailVerification, enqueuePasswordReset } from "../queues/email.queue.js";

const pollIntervalMs = 5_000;
let timer: NodeJS.Timeout | undefined;
let running = false;

export function startOutboxDispatcher() {
  async function tick() {
    if (running) {
      return;
    }

    running = true;
    try {
      const events = await claimOutboxBatch(25);

      for (const event of events) {
        try {
          const payload = event.payload as { type?: string; to?: string; token?: string };

          if (!payload.to || !payload.token) {
            throw new Error(`Invalid outbox payload for event ${event.id}`);
          }

          if (payload.type === OutboxEventType.EmailVerificationRequested) {
            await enqueueEmailVerification({ to: payload.to, token: payload.token, outboxEventId: event.id });
          } else if (payload.type === OutboxEventType.PasswordResetRequested) {
            await enqueuePasswordReset({ to: payload.to, token: payload.token, outboxEventId: event.id });
          } else {
            throw new Error(`Unsupported outbox event type ${event.type}`);
          }

          await markOutboxPublished(event.id);
        } catch (error) {
          await markOutboxFailed({ id: event.id, attempts: event.attempts, error });
        }
      }
    } finally {
      running = false;
    }
  }

  timer = setInterval(() => {
    void tick();
  }, pollIntervalMs);

  void tick();
}

export function stopOutboxDispatcher() {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }
}
