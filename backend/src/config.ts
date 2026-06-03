import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_ACCESS_TOKEN_TTL: z.string().default("15m"),
  JWT_REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  EMAIL_VERIFICATION_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(60),
  PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  QUEUE_PREFIX: z.string().min(1).default("atlas"),
  TRUST_PROXY: z.coerce.boolean().default(false),
  RATE_LIMIT_FAIL_OPEN: z.coerce.boolean().default(true),
  UPLOAD_DIR: z.string().min(1).default("uploads"),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  COOKIE_DOMAIN: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  )
});

const env = envSchema.parse(process.env);

export const config = {
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
  jwtSecret: env.JWT_SECRET,
  jwtAccessTokenTtl: env.JWT_ACCESS_TOKEN_TTL,
  jwtRefreshTokenTtlDays: env.JWT_REFRESH_TOKEN_TTL_DAYS,
  frontendUrl: env.FRONTEND_URL,
  emailVerificationTokenTtlMinutes: env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES,
  passwordResetTokenTtlMinutes: env.PASSWORD_RESET_TOKEN_TTL_MINUTES,
  queuePrefix: env.QUEUE_PREFIX,
  trustProxy: env.TRUST_PROXY,
  rateLimitFailOpen: env.RATE_LIMIT_FAIL_OPEN,
  uploadDir: env.UPLOAD_DIR,
  maxUploadBytes: env.MAX_UPLOAD_BYTES,
  logLevel: env.LOG_LEVEL,
  cookieDomain: env.COOKIE_DOMAIN
};
