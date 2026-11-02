import request from "supertest";
import { app } from "../src/app.js";

describe("FitWise Express Server Foundations", () => {
  describe("GET /health", () => {
    it("returns 200 OK with { status: 'ok' } without touching database", async () => {
      const start = Date.now();
      const res = await request(app).get("/health");
      const elapsed = Date.now() - start;

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "ok" });
      expect(elapsed).toBeLessThan(100); // Super fast health check
    });
  });

  describe("404 Route Handler", () => {
    it("returns 404 in universal contract error format for unknown routes", async () => {
      const res = await request(app).get("/api/unknown-endpoint");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toEqual({
        code: "NOT_FOUND",
        message: "Route not found: GET /api/unknown-endpoint",
      });
    });
  });

  describe("Application Settings", () => {
    it("configures trust proxy to 1", () => {
      expect(app.get("trust proxy")).toBe(1);
    });
  });

  describe("Graceful Shutdown", () => {
    it("closes Mongo and Redis during shutdown without throwing", async () => {
      const { shutdownResources } = await import("../src/config/shutdown.js");
      await expect(shutdownResources()).resolves.not.toThrow();
    });
  });
});
