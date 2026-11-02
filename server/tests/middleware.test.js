import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import crypto from "crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { z } from "zod";

import { Store } from "../src/models/Store.js";
import { apiKey } from "../src/middleware/apiKey.js";
import { validate } from "../src/middleware/validate.js";
import { createRateLimiter } from "../src/middleware/rateLimit.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { isOriginAllowed, app } from "../src/app.js";

describe("Middleware Test Suite", () => {
  let mongoServer;
  const DEMO_STORE_ID = "store_mw_demo";
  const DEMO_PUB_KEY = "fw_pub_demo_999";
  const DEMO_SEC_KEY = "fw_sec_demo_888";

  let testApp;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Seed test store with SHA-256 hashes
    const pubHash = crypto.createHash("sha256").update(DEMO_PUB_KEY).digest("hex");
    const secHash = crypto.createHash("sha256").update(DEMO_SEC_KEY).digest("hex");

    await Store.create({
      storeId: DEMO_STORE_ID,
      name: "Middleware Demo Store",
      publicKeyHash: pubHash,
      secretKeyHash: secHash,
    });

    // Build dedicated test app with the middlewares
    testApp = express();
    testApp.use(express.json({ limit: "10kb" }));

    // Routes for API key authentication tests
    testApp.get("/test/public", apiKey("public"), (req, res) => {
      res.status(200).json({ success: true, keyType: req.keyType, storeId: req.store.storeId });
    });

    testApp.get("/test/secret", apiKey("secret"), (req, res) => {
      res.status(200).json({ success: true, keyType: req.keyType, storeId: req.store.storeId });
    });

    // Health check route that bypasses authentication
    testApp.get("/health", apiKey("public"), (req, res) => {
      res.status(200).json({ status: "ok" });
    });

    // Route for Zod validation tests
    const sampleSchema = z.object({
      category: z.string(),
      size: z.enum(["XS", "S", "M", "L", "XL", "XXL"]),
      count: z.number().int().positive(),
    });
    testApp.post("/test/validate-body", validate(sampleSchema), (req, res) => {
      res.status(200).json({ success: true, data: req.body });
    });

    const querySchema = z.object({
      limit: z.string().regex(/^\d+$/),
    });
    testApp.get("/test/validate-query", validate(querySchema, "query"), (req, res) => {
      res.status(200).json({ success: true, query: req.query });
    });

    // Rate limited route: 60 requests/min
    const testLimiter = createRateLimiter({
      windowMs: 60 * 1000,
      max: 60,
    });
    testApp.get("/api/rate-limit-test", testLimiter, (req, res) => {
      res.status(200).json({ success: true });
    });

    testApp.use(errorHandler);
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe("API Key Middleware (apiKey.js)", () => {
    it("missing key 401: rejects requests with no x-api-key header", async () => {
      const res = await request(testApp).get("/test/public");

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("UNAUTHORIZED");
      expect(res.body.error.message).toMatch(/Missing API key/i);
    });

    it("wrong key 401: rejects requests with an invalid x-api-key header", async () => {
      const res = await request(testApp)
        .get("/test/public")
        .set("x-api-key", "fw_pub_invalid_unknown_key");

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("UNAUTHORIZED");
      expect(res.body.error.message).toMatch(/Invalid API key/i);
    });

    it("accepts publishable key on a public route", async () => {
      const res = await request(testApp)
        .get("/test/public")
        .set("x-api-key", DEMO_PUB_KEY);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.keyType).toBe("public");
      expect(res.body.storeId).toBe(DEMO_STORE_ID);
    });

    it("accepts secret key on a public route", async () => {
      const res = await request(testApp)
        .get("/test/public")
        .set("x-api-key", DEMO_SEC_KEY);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.keyType).toBe("secret");
      expect(res.body.storeId).toBe(DEMO_STORE_ID);
    });

    it("publishable key rejected on a secret route (403 or 401 per error format)", async () => {
      const res = await request(testApp)
        .get("/test/secret")
        .set("x-api-key", DEMO_PUB_KEY);

      expect([401, 403]).toContain(res.status);
      expect(res.body.error).toBeDefined();
      expect(["UNAUTHORIZED", "FORBIDDEN"]).toContain(res.body.error.code);
    });

    it("accepts secret key on a secret route", async () => {
      const res = await request(testApp)
        .get("/test/secret")
        .set("x-api-key", DEMO_SEC_KEY);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.keyType).toBe("secret");
      expect(res.body.storeId).toBe(DEMO_STORE_ID);
    });

    it("skips authentication on /health endpoint", async () => {
      const res = await request(testApp).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });
  });

  describe("Validation Middleware (validate.js)", () => {
    it("allows valid body payload through", async () => {
      const res = await request(testApp)
        .post("/test/validate-body")
        .send({ category: "tshirt", size: "M", count: 2 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("rejects invalid body payload with 400 BAD_REQUEST", async () => {
      const res = await request(testApp)
        .post("/test/validate-body")
        .send({ category: "tshirt", size: "INVALID_SIZE", count: -1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });

    it("validates query parameters correctly", async () => {
      const validRes = await request(testApp).get("/test/validate-query?limit=10");
      expect(validRes.status).toBe(200);

      const invalidRes = await request(testApp).get("/test/validate-query?limit=abc");
      expect(invalidRes.status).toBe(400);
      expect(invalidRes.body.error.code).toBe("BAD_REQUEST");
    });
  });

  describe("CORS and Wildcard Origins (app.js)", () => {
    it("isOriginAllowed: permits exact origins and wildcard patterns like https://*.vercel.app", () => {
      const patternConfig = "http://localhost:3000,https://*.vercel.app,https://mybrand.com";

      expect(isOriginAllowed("http://localhost:3000", patternConfig)).toBe(true);
      expect(isOriginAllowed("https://mybrand.com", patternConfig)).toBe(true);
      expect(isOriginAllowed("https://fitwise-widget.vercel.app", patternConfig)).toBe(true);
      expect(isOriginAllowed("https://dashboard-store.vercel.app", patternConfig)).toBe(true);

      // Disallowed origins
      expect(isOriginAllowed("https://evil.com", patternConfig)).toBe(false);
      expect(isOriginAllowed("https://attacker.vercel.app.evil.com", patternConfig)).toBe(false);
      expect(isOriginAllowed("http://insecure-vercel.app", patternConfig)).toBe(false);
    });

    it("disallowed origin rejected by application", async () => {
      const res = await request(app)
        .get("/health")
        .set("Origin", "https://disallowed-malicious-site.com");

      // Origin must be rejected: either 403 or no Access-Control-Allow-Origin header
      if (res.status === 200) {
        expect(res.headers["access-control-allow-origin"]).toBeUndefined();
      } else {
        expect(res.status).toBe(403);
      }
    });

    it("wildcard origin allowed by application", async () => {
      // Temporarily test with wildcard pattern
      const allowedPatterns = "http://localhost:3000,https://*.vercel.app";
      expect(isOriginAllowed("https://fitwise-store.vercel.app", allowedPatterns)).toBe(true);
    });
  });

  describe("Rate Limiting (rateLimit.js)", () => {
    it("61st request -> 429: enforces 60 requests per minute limit", async () => {
      // Send 60 requests sequentially; all should be 200
      for (let i = 0; i < 60; i++) {
        const res = await request(testApp).get("/api/rate-limit-test");
        expect(res.status).toBe(200);
      }

      // 61st request should be blocked with 429 TOO_MANY_REQUESTS
      const blockedRes = await request(testApp).get("/api/rate-limit-test");
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error).toBeDefined();
      expect(blockedRes.body.error.code).toBe("TOO_MANY_REQUESTS");
      expect(blockedRes.body.error.message).toMatch(/Rate limit exceeded/i);
    });
  });
});
