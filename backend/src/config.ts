import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? "change-me-in-local-development",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173"
};
