import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("app health and errors", () => {
  const app = createApp();

  it("returns health status", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body).toEqual({ status: "ok" });
    expect(response.headers["x-request-id"]).toBeTruthy();
  });

  it("returns structured not-found errors", async () => {
    const response = await request(app).get("/missing-route").expect(404);

    expect(response.body.error.code).toBe("NOT_FOUND");
    expect(response.body.error.requestId).toBeTruthy();
  });
});
