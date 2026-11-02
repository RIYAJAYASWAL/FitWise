/**
 * End-to-End Integration Test Suite
 * Validates the complete FitWise lifecycle via HTTP endpoints:
 * 1. Assign: GET /api/experiments/assign
 * 2. Recommend: POST /api/recommend (ML Client Mocked)
 * 3. Events: POST /api/events
 * 4. Feedback: POST /api/feedback (with return reasons)
 * 5. Chart Doctor Run: POST /internal/chart-doctor/run
 * 6. Flags: GET /api/chart-doctor/flags
 * 7. Results: GET /api/experiments/:id/results
 *
 * Also validates contract error format consistency across all endpoints.
 */

import { jest } from "@jest/globals";
import request from "supertest";
import crypto from "crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

import { app } from "../src/app.js";
import { Store } from "../src/models/Store.js";
import { Product } from "../src/models/Product.js";
import { Experiment } from "../src/models/Experiment.js";
import { Purchase } from "../src/models/Purchase.js";
import { ChartFlag } from "../src/models/ChartFlag.js";
import { Event } from "../src/models/Event.js";
import { Recommendation } from "../src/models/Recommendation.js";
import mlClient from "../src/services/mlClient.js";
import { env } from "../src/config/env.js";
import { closeRedis } from "../src/config/redis.js";

describe("FitWise End-to-End Integration Pipeline", () => {
  let mongoServer;
  const STORE_ID = "store_e2e_fitwise";
  const PUB_KEY = "fw_pub_e2e_key_123";
  const SEC_KEY = "fw_sec_e2e_key_456";
  const EXP_ID = "exp_e2e_ab_pipeline";
  const PRODUCT_SKU = "SKU-E2E-DRESS";
  const INTERNAL_KEY = env.INTERNAL_KEY;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // 1. Seed Store with hashed API credentials
    const pubHash = crypto.createHash("sha256").update(PUB_KEY).digest("hex");
    const secHash = crypto.createHash("sha256").update(SEC_KEY).digest("hex");

    await Store.create({
      storeId: STORE_ID,
      name: "E2E Integration Store",
      publicKeyHash: pubHash,
      secretKeyHash: secHash,
    });

    // 2. Seed Running Experiment
    await Experiment.create({
      experimentId: EXP_ID,
      storeId: STORE_ID,
      split: 0.5,
      status: "running",
      startedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000),
    });

    // 3. Seed Catalog Product (Kurta / Dress)
    await Product.create({
      sku: PRODUCT_SKU,
      brand: "E2E Apparel",
      category: "kurta",
      region: "IN",
      sizeChart: [
        { size: "S", shoulder: [50, 52], bust: [88, 92], length: [100, 105] },
        { size: "M", shoulder: [52, 55], bust: [92, 98], length: [105, 110] },
        { size: "L", shoulder: [55, 58], bust: [98, 104], length: [110, 115] },
      ],
      flagCount: 0,
    });
  }, 60000);

  afterAll(async () => {
    await closeRedis();
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it("executes the full lifecycle: assign -> recommend -> events -> feedback -> chart doctor run -> flags -> results", async () => {
    const visitorId = "visitor_e2e_journey_1";

    // -------------------------------------------------------------------------
    // STEP 1: Assign Variant (GET /api/experiments/assign?visitorId=...)
    // -------------------------------------------------------------------------
    const assignRes = await request(app)
      .get(`/api/experiments/assign?visitorId=${visitorId}`)
      .set("x-api-key", PUB_KEY);

    expect(assignRes.status).toBe(200);
    expect(assignRes.body).toHaveProperty("experimentId", EXP_ID);
    expect(assignRes.body).toHaveProperty("variant");
    const assignedVariant = assignRes.body.variant;
    expect(["control", "treatment"]).toContain(assignedVariant);

    // -------------------------------------------------------------------------
    // STEP 2: Request Recommendation (POST /api/recommend) [ML Mocked]
    // -------------------------------------------------------------------------
    const predictSpy = jest.spyOn(mlClient, "predict").mockResolvedValue({
      recommendedSize: "M",
      confidence: 0.92,
      alternatives: ["L"],
      explanation: "Chest measurement (91cm) matches size M range (89-94cm).",
    });

    const recommendRes = await request(app)
      .post("/api/recommend")
      .set("x-api-key", PUB_KEY)
      .send({
        productId: PRODUCT_SKU,
        visitorId,
        region: "IN",
        measurements: {
          height_cm: 165,
          shoulder_cm: 54,
          bust_cm: 94,
          length_cm: 108,
        },
      });

    expect(recommendRes.status).toBe(200);
    expect(recommendRes.body).toHaveProperty("recommendedSize", "M");
    expect(recommendRes.body).toHaveProperty("regionSize", "40"); // IN kurta size M -> 40
    expect(recommendRes.body).toHaveProperty("confidence", 0.92);
    expect(recommendRes.body).toHaveProperty("alternatives");
    expect(recommendRes.body.lowConfidence).toBe(false);

    predictSpy.mockRestore();

    // Verify recommendation was persisted in DB
    const recDoc = await Recommendation.findOne({ sku: PRODUCT_SKU, predictedSize: "M" });
    expect(recDoc).toBeDefined();
    expect(recDoc.confidence).toBe(0.92);

    // -------------------------------------------------------------------------
    // STEP 3: Record Customer Events (POST /api/events)
    // -------------------------------------------------------------------------
    // Event: widget_shown
    const evtRes1 = await request(app)
      .post("/api/events")
      .set("x-api-key", PUB_KEY)
      .send({
        visitorId,
        variant: assignedVariant,
        type: "widget_shown",
        sku: PRODUCT_SKU,
      });
    expect(evtRes1.status).toBe(200);
    expect(evtRes1.body).toEqual({ saved: true });

    // Event: add_to_cart
    const evtRes2 = await request(app)
      .post("/api/events")
      .set("x-api-key", PUB_KEY)
      .send({
        visitorId,
        variant: assignedVariant,
        type: "add_to_cart",
        sku: PRODUCT_SKU,
      });
    expect(evtRes2.status).toBe(200);
    expect(evtRes2.body).toEqual({ saved: true });

    // Event: purchase
    const evtRes3 = await request(app)
      .post("/api/events")
      .set("x-api-key", PUB_KEY)
      .send({
        visitorId,
        variant: assignedVariant,
        type: "purchase",
        sku: PRODUCT_SKU,
      });
    expect(evtRes3.status).toBe(200);
    expect(evtRes3.body).toEqual({ saved: true });

    // Also populate baseline events so experiment metrics have multi-visitor volume
    const seedEvents = [];
    // Control: 150 visitors, 30 add_to_cart, 15 purchases, 3 returns
    for (let i = 0; i < 150; i++) {
      seedEvents.push({
        storeId: STORE_ID,
        visitorId: `c_vis_${i}`,
        variant: "control",
        type: "widget_shown",
      });
      if (i < 30) seedEvents.push({ storeId: STORE_ID, visitorId: `c_vis_${i}`, variant: "control", type: "add_to_cart" });
      if (i < 15) seedEvents.push({ storeId: STORE_ID, visitorId: `c_vis_${i}`, variant: "control", type: "purchase" });
      if (i < 3) seedEvents.push({ storeId: STORE_ID, visitorId: `c_vis_${i}`, variant: "control", type: "return" });
    }
    // Treatment: 150 visitors, 45 add_to_cart, 25 purchases, 2 returns
    for (let i = 0; i < 150; i++) {
      seedEvents.push({
        storeId: STORE_ID,
        visitorId: `t_vis_${i}`,
        variant: "treatment",
        type: "widget_shown",
      });
      if (i < 45) seedEvents.push({ storeId: STORE_ID, visitorId: `t_vis_${i}`, variant: "treatment", type: "add_to_cart" });
      if (i < 25) seedEvents.push({ storeId: STORE_ID, visitorId: `t_vis_${i}`, variant: "treatment", type: "purchase" });
      if (i < 2) seedEvents.push({ storeId: STORE_ID, visitorId: `t_vis_${i}`, variant: "treatment", type: "return" });
    }
    await Event.insertMany(seedEvents);

    // -------------------------------------------------------------------------
    // STEP 4: Feedback with Return Reasons (POST /api/feedback)
    // -------------------------------------------------------------------------
    // First: Single order feedback from our user journey returning size M as too small
    const fbRes = await request(app)
      .post("/api/feedback")
      .set("x-api-key", PUB_KEY)
      .send({
        productId: PRODUCT_SKU,
        sizeBought: "M",
        kept: false,
        returnReason: "too_small",
      });
    expect(fbRes.status).toBe(200);
    expect(fbRes.body).toEqual({ saved: true });

    // Seed enough return feedback for Chart Doctor to trigger (>= 30 orders, >= 25% returns as too_small)
    const seedPurchases = [];
    for (let i = 0; i < 35; i++) {
      const isReturned = i < 14; // 14 returns + 1 prior return = 15/36 = ~41.6% return rate
      seedPurchases.push({
        storeId: STORE_ID,
        userId: `user_fb_${i}`,
        sku: PRODUCT_SKU,
        sizeBought: "M",
        kept: !isReturned,
        returnReason: isReturned ? "too_small" : null,
        createdAt: new Date(),
      });
    }
    await Purchase.insertMany(seedPurchases);

    // -------------------------------------------------------------------------
    // STEP 5: Trigger Chart Doctor Aggregation (POST /internal/chart-doctor/run)
    // -------------------------------------------------------------------------
    const cdRunRes = await request(app)
      .post("/internal/chart-doctor/run")
      .set("x-internal-key", INTERNAL_KEY);

    expect(cdRunRes.status).toBe(200);
    expect(cdRunRes.body).toHaveProperty("flagged");
    expect(cdRunRes.body.flagged).toBeGreaterThanOrEqual(1);

    // -------------------------------------------------------------------------
    // STEP 6: Retrieve Chart Doctor Flags (GET /api/chart-doctor/flags)
    // -------------------------------------------------------------------------
    const flagsRes = await request(app)
      .get("/api/chart-doctor/flags")
      .set("x-api-key", SEC_KEY);

    expect(flagsRes.status).toBe(200);
    expect(flagsRes.body).toHaveProperty("flags");
    expect(Array.isArray(flagsRes.body.flags)).toBe(true);

    const flaggedProduct = flagsRes.body.flags.find((f) => f.sku === PRODUCT_SKU && f.size === "M");
    expect(flaggedProduct).toBeDefined();
    expect(flaggedProduct.direction).toBe("runs_small");
    expect(flaggedProduct.returnShare).toBeGreaterThanOrEqual(0.25);
    expect(flaggedProduct.suggestedFix).toContain("orders were returned as too small");

    // -------------------------------------------------------------------------
    // STEP 7: Retrieve Experiment Results (GET /api/experiments/:id/results)
    // -------------------------------------------------------------------------
    const resultsRes = await request(app)
      .get(`/api/experiments/${EXP_ID}/results`)
      .set("x-api-key", SEC_KEY);

    expect(resultsRes.status).toBe(200);
    expect(resultsRes.body).toHaveProperty("experimentId", EXP_ID);
    expect(resultsRes.body).toHaveProperty("control");
    expect(resultsRes.body).toHaveProperty("treatment");
    expect(resultsRes.body).toHaveProperty("metrics");
    expect(resultsRes.body.metrics).toHaveLength(3);

    const [atcMetric, convMetric, retMetric] = resultsRes.body.metrics;
    expect(atcMetric.name).toBe("add_to_cart_rate");
    expect(convMetric.name).toBe("conversion_rate");
    expect(retMetric.name).toBe("return_rate");

    // Sample size is >= 100 for each variant, so warning is null
    expect(resultsRes.body.warning).toBeNull();
  });

  describe("Universal Contract Error Format Verification Across Routes", () => {
    it("returns contract error format on missing API key across public routes", async () => {
      const res = await request(app).get("/api/experiments/assign?visitorId=test");
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toHaveProperty("code", "UNAUTHORIZED");
      expect(res.body.error).toHaveProperty("message");
    });

    it("returns contract error format on secret key access with publishable key", async () => {
      const res = await request(app)
        .get("/api/chart-doctor/flags")
        .set("x-api-key", PUB_KEY);

      expect(res.status).toBe(403);
      expect(res.body.error).toEqual({
        code: "FORBIDDEN",
        message: "Secret key required for this resource",
      });
    });

    it("returns contract error format on 404 unknown routes", async () => {
      const res = await request(app).get("/api/unknown-endpoint");
      expect(res.status).toBe(404);
      expect(res.body.error).toEqual({
        code: "NOT_FOUND",
        message: "Route not found: GET /api/unknown-endpoint",
      });
    });

    it("returns contract error format on invalid request body", async () => {
      const res = await request(app)
        .post("/api/events")
        .set("x-api-key", PUB_KEY)
        .send({
          visitorId: "v1",
          variant: "invalid_variant",
          type: "widget_shown",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
      expect(typeof res.body.error.message).toBe("string");
    });

    it("returns contract error format on invalid internal key", async () => {
      const res = await request(app)
        .post("/internal/chart-doctor/run")
        .set("x-internal-key", "wrong-internal-key");

      expect(res.status).toBe(401);
      expect(res.body.error).toEqual({
        code: "UNAUTHORIZED",
        message: "Invalid or missing internal key in x-internal-key header",
      });
    });
  });
});
