import { Redis } from "ioredis";
import { config } from "../config.js";

let client: Redis | undefined;

export function getRateLimitRedis() {
  if (!client) {
    client = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true
    });
  }

  return client;
}

export async function closeRateLimitRedis() {
  if (!client) {
    return;
  }

  await client.quit();
  client = undefined;
}
