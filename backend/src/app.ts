import "./types.js";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import { config } from "./config.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import jobRoutes from "./routes/jobs.js";
import notificationRoutes from "./routes/notifications.js";
import userRoutes from "./routes/users.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { parseCookies } from "./middleware/cookies.js";
import { requestId } from "./middleware/request-id.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);
  app.use(requestId);
  app.use(cors({ origin: config.frontendUrl, credentials: true }));
  app.use(parseCookies);
  app.use(express.json({ limit: "1mb" }));
  app.use(
    morgan(":method :url :status :response-time ms - :res[content-length]", {
      skip: (req) => req.path === "/health"
    })
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/ready", (_req, res) => {
    res.json({ status: "ready" });
  });

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/admin", adminRoutes);
  app.use("/api/v1/jobs", jobRoutes);
  app.use("/api/v1/notifications", notificationRoutes);
  app.use("/api/v1/users", userRoutes);

  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/jobs", jobRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/users", userRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
