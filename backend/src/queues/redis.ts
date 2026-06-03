import { config } from "../config.js";

export function createRedisConnectionOptions() {
  const url = new URL(config.redisUrl);

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    maxRetriesPerRequest: null
  };
}

export function parseRedisUrl() {
  return new URL(config.redisUrl);
}
