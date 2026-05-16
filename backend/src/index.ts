import "./types.js";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import { ZodError } from "zod";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import jobRoutes from "./routes/jobs.js";
import notificationRoutes from "./routes/notifications.js";
import userRoutes from "./routes/users.js";
import { HttpError } from "./utils/http.js";

const app = express();

app.use(cors({ origin: config.frontendUrl }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({ message: "Validation failed", issues: err.issues });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ message: "Unexpected server error" });
});

app.listen(config.port, () => {
  console.log(`FieldOps API listening on http://localhost:${config.port}`);
});
