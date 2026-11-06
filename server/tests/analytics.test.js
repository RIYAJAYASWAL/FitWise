import request from "supertest";
import crypto from "crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

import { app } from "../src/app.js";
import { Store } from "../src/models/Store.js";
import { Experiment } from "../src/models/Experiment.js";
import { Event } from "../src/models/Event.js";
import { Recommendation } from "../src/models/Recommendation.js";
import { Purchase } from "../src/models/Purchase.js";
import {
  analyticsService,
  summary,
  experimentResults,
  twoPropZTest,
  normalCdf,
  erf,
} from "../src/services/analyticsService.js";
import { closeRedis } from "../src/config/redis.js";

describe("Analytics Service and Endpoints", () => {
  let mongoServer;
  const DEMO_STORE_ID = "store_analytics_demo";
  const DEMO_PUB_KEY = "fw_pub_analytics_test";
  const DEMO_SEC_KEY = "fw_sec_analytics_test";

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Seed Store with public and secret keys
    const pubHash = crypto.createHash("sha256").update(DEMO_PUB_KEY).digest("hex");
    const secHash = crypto.createHash("sha256").update(DEMO_SEC_KEY).digest("hex");

    await Store.create({
      storeId: DEMO_STORE_ID,
      name: "Analytics Test Store",
      publicKeyHash: pubHash,
      secretKeyHash: secHash,
    });
  }, 60000);

  afterAll(async () => {
    await closeRedis();
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Event.deleteMany({});
    await Recommendation.deleteMany({});
    await Purchase.deleteMany({});
    await Experiment.deleteMany({});
  });

  describe("Statistical Functions: twoPropZTest, normalCdf, and erf", () => {
    it("computes normalCdf accurately with known standard normal quantiles", () => {
      // Mean = 0 -> CDF = 0.5
      expect(normalCdf(0)).toBeCloseTo(0.5, 4);

      // z = 1.96 -> ~0.9750 (upper 2.5% tail)
      expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);

      // z = -1.96 -> ~0.0250 (lower 2.5% tail)
      expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3);

      // Symmetry of erf
      expect(erf(0)).toBe(0);
      expect(erf(1)).toBeCloseTo(-erf(-1), 6);
    });

    it("two-proportion z-test matches known numbers for significant difference", () => {
      // Known example:
      // Control: 100 successes / 1000 visitors (p1 = 0.10)
      // Treatment: 150 successes / 1000 visitors (p2 = 0.15)
      const res = twoPropZTest(100, 1000, 150, 1000);

      expect(res.controlRate).toBe(0.1);
      expect(res.treatmentRate).toBe(0.15);
      expect(res.diff).toBe(0.05);

      // 95% Confidence Interval for diff (0.05):
      // SE_CI = sqrt(0.1*0.9/1000 + 0.15*0.85/1000) = sqrt(0.00009 + 0.0001275) = 0.014748
      // ME = 1.96 * 0.014748 = 0.0289
      // CI: [0.05 - 0.0289, 0.05 + 0.0289] = [0.0211, 0.0789]
      expect(res.ci95[0]).toBeCloseTo(0.0211, 3);
      expect(res.ci95[1]).toBeCloseTo(0.0789, 3);

      // Pooled SE: sqrt(0.125 * 0.875 * 0.002) = 0.014790
      // z = 0.05 / 0.014790 = 3.3806 -> pValue ~ 0.0007
      expect(res.pValue).toBeLessThan(0.001);
      expect(res.pValue).toBeCloseTo(0.0007, 3);
      expect(res.significant).toBe(true);
    });

    it("two-proportion z-test matches known numbers under identical rates (null hypothesis)", () => {
      // Control: 100 / 1000 (p1 = 0.10)
      // Treatment: 100 / 1000 (p2 = 0.10)
      const res = twoPropZTest(100, 1000, 100, 1000);

      expect(res.controlRate).toBe(0.1);
      expect(res.treatmentRate).toBe(0.1);
      expect(res.diff).toBe(0);
      expect(res.pValue).toBe(1.0);
      expect(res.significant).toBe(false);
      // CI centered at 0
      expect(res.ci95[0]).toBeLessThan(0);
      expect(res.ci95[1]).toBeGreaterThan(0);
    });

    it("two-proportion z-test handles zero trials safely without throwing", () => {
      const res = twoPropZTest(0, 0, 10, 100);
      expect(res.diff).toBe(0);
      expect(res.ci95).toEqual([0, 0]);
      expect(res.pValue).toBe(1.0);
      expect(res.significant).toBe(false);
    });
  });

  describe("analyticsService.experimentResults and small-sample warning", () => {
    it("sets warning 'Sample too small to conclude' when any variant has fewer than 100 visitors", async () => {
      await Experiment.create({
        experimentId: "exp_small_sample",
        storeId: DEMO_STORE_ID,
        split: 0.5,
        status: "running",
      });

      // Control has 80 visitors (< 100), Treatment has 120 visitors (>= 100)
      const events = [];
      for (let i = 0; i < 80; i++) {
        events.push({
          storeId: DEMO_STORE_ID,
          visitorId: `c_vis_${i}`,
          variant: "control",
          type: "widget_shown",
        });
      }
      for (let i = 0; i < 120; i++) {
        events.push({
          storeId: DEMO_STORE_ID,
          visitorId: `t_vis_${i}`,
          variant: "treatment",
          type: "widget_shown",
        });
      }
      await Event.insertMany(events);

      const result = await experimentResults(DEMO_STORE_ID, "exp_small_sample");
      expect(result).not.toBeNull();
      expect(result.control.visitors).toBe(80);
      expect(result.treatment.visitors).toBe(120);
      expect(result.warning).toBe("Sample too small to conclude");
    });

    it("sets warning to null when both variants have >= 100 visitors and computes all 3 metrics", async () => {
      await Experiment.create({
        experimentId: "exp_large_sample",
        storeId: DEMO_STORE_ID,
        split: 0.5,
        status: "running",
      });

      const events = [];
      // Control: 200 visitors, 40 add_to_cart, 20 purchases, 4 returns
      for (let i = 0; i < 200; i++) {
        events.push({
          storeId: DEMO_STORE_ID,
          visitorId: `ctrl_${i}`,
          variant: "control",
          type: "widget_shown",
        });
        if (i < 40) {
          events.push({
            storeId: DEMO_STORE_ID,
            visitorId: `ctrl_${i}`,
            variant: "control",
            type: "add_to_cart",
          });
        }
        if (i < 20) {
          events.push({
            storeId: DEMO_STORE_ID,
            visitorId: `ctrl_${i}`,
            variant: "control",
            type: "purchase",
          });
        }
        if (i < 4) {
          events.push({
            storeId: DEMO_STORE_ID,
            visitorId: `ctrl_${i}`,
            variant: "control",
            type: "return",
          });
        }
      }

      // Treatment: 200 visitors, 60 add_to_cart, 35 purchases, 3 returns
      for (let i = 0; i < 200; i++) {
        events.push({
          storeId: DEMO_STORE_ID,
          visitorId: `treat_${i}`,
          variant: "treatment",
          type: "widget_shown",
        });
        if (i < 60) {
          events.push({
            storeId: DEMO_STORE_ID,
            visitorId: `treat_${i}`,
            variant: "treatment",
            type: "add_to_cart",
          });
        }
        if (i < 35) {
          events.push({
            storeId: DEMO_STORE_ID,
            visitorId: `treat_${i}`,
            variant: "treatment",
            type: "purchase",
          });
        }
        if (i < 3) {
          events.push({
            storeId: DEMO_STORE_ID,
            visitorId: `treat_${i}`,
            variant: "treatment",
            type: "return",
          });
        }
      }

      await Event.insertMany(events);

      const result = await experimentResults(DEMO_STORE_ID, "exp_large_sample");
      expect(result).not.toBeNull();
      expect(result.warning).toBeNull();
      expect(result.control.visitors).toBe(200);
      expect(result.treatment.visitors).toBe(200);
      expect(result.control.addToCart).toBe(40);
      expect(result.treatment.addToCart).toBe(60);

      // Verify metrics array
      expect(result.metrics).toHaveLength(3);
      const [atc, conv, ret] = result.metrics;

      expect(atc.name).toBe("add_to_cart_rate");
      expect(atc.controlRate).toBe(0.2);
      expect(atc.treatmentRate).toBe(0.3);
      expect(atc.diff).toBe(0.1);

      expect(conv.name).toBe("conversion_rate");
      expect(conv.controlRate).toBe(0.1);
      expect(conv.treatmentRate).toBe(0.175);

      expect(ret.name).toBe("return_rate");
      // control return rate: 4 / 20 = 0.20
      expect(ret.controlRate).toBe(0.2);
      // treatment return rate: 3 / 35 = 0.0857
      expect(ret.treatmentRate).toBeCloseTo(0.0857, 3);
    });

    it("returns null if experiment does not exist", async () => {
      const result = await experimentResults(DEMO_STORE_ID, "non_existent_exp");
      expect(result).toBeNull();
    });
  });

  describe("analyticsService.summary", () => {
    it("computes recommendations, avgConfidence, sizeDistribution, returnRate, and lowConfidenceShare", async () => {
      // Create Recommendations
      await Recommendation.create([
        {
          storeId: DEMO_STORE_ID,
          sku: "SKU-TEST-1",
          predictedSize: "M",
          confidence: 0.9,
          createdAt: new Date("2026-10-05T10:00:00Z"),
        },
        {
          storeId: DEMO_STORE_ID,
          sku: "SKU-TEST-1",
          predictedSize: "M",
          confidence: 0.8,
          createdAt: new Date("2026-10-06T10:00:00Z"),
        },
        {
          storeId: DEMO_STORE_ID,
          sku: "SKU-TEST-2",
          predictedSize: "L",
          confidence: 0.4, // low confidence (< 0.5)
          createdAt: new Date("2026-10-07T10:00:00Z"),
        },
        {
          storeId: DEMO_STORE_ID,
          sku: "SKU-TEST-3",
          predictedSize: "S",
          confidence: 0.7,
          createdAt: new Date("2026-10-08T10:00:00Z"),
        },
      ]);

      // Create Purchases: 10 purchases, 2 returned
      const purchases = [];
      for (let i = 0; i < 10; i++) {
        purchases.push({
          storeId: DEMO_STORE_ID,
          sku: "SKU-TEST-1",
          sizeBought: "M",
          kept: i >= 2, // 2 returned
          returnReason: i < 2 ? "too_small" : null,
          createdAt: new Date("2026-10-06T12:00:00Z"),
        });
      }
      await Purchase.insertMany(purchases);

      const res = await summary(
        DEMO_STORE_ID,
        new Date("2026-10-01T00:00:00Z"),
        new Date("2026-10-31T23:59:59Z"),
      );

      expect(res.recommendations).toBe(4);
      // avgConfidence: (0.9 + 0.8 + 0.4 + 0.7) / 4 = 2.8 / 4 = 0.70
      expect(res.avgConfidence).toBe(0.7);
      expect(res.sizeDistribution).toEqual({
        XS: 0,
        S: 1,
        M: 2,
        L: 1,
        XL: 0,
        XXL: 0,
      });
      // lowConfidenceShare: 1 / 4 = 0.25
      expect(res.lowConfidenceShare).toBe(0.25);
      // returnRate: 2 / 10 = 0.20
      expect(res.returnRate).toBe(0.2);
    });

    it("filters analytics by date range (from & to)", async () => {
      await Recommendation.create([
        {
          storeId: DEMO_STORE_ID,
          sku: "SKU-TEST-1",
          predictedSize: "S",
          confidence: 0.85,
          createdAt: new Date("2026-10-01T00:00:00Z"),
        },
        {
          storeId: DEMO_STORE_ID,
          sku: "SKU-TEST-1",
          predictedSize: "M",
          confidence: 0.9,
          createdAt: new Date("2026-10-05T00:00:00Z"),
        },
        {
          storeId: DEMO_STORE_ID,
          sku: "SKU-TEST-1",
          predictedSize: "L",
          confidence: 0.95,
          createdAt: new Date("2026-10-10T00:00:00Z"),
        },
      ]);

      const filtered = await summary(
        DEMO_STORE_ID,
        "2026-10-04T00:00:00Z",
        "2026-10-06T00:00:00Z"
      );

      expect(filtered.recommendations).toBe(1);
      expect(filtered.sizeDistribution.M).toBe(1);
      expect(filtered.sizeDistribution.S).toBe(0);
      expect(filtered.sizeDistribution.L).toBe(0);
    });
  });

  describe("GET /api/analytics/summary (Secret Key Protected)", () => {
    beforeEach(async () => {
      await Recommendation.create({
        storeId: DEMO_STORE_ID,
        sku: "SKU-TSHIRT-CLASSIC",
        predictedSize: "M",
        confidence: 0.88,
        createdAt: new Date(),
      });
      await Purchase.create({
        storeId: DEMO_STORE_ID,
        sku: "SKU-TSHIRT-CLASSIC",
        sizeBought: "M",
        kept: true,
        createdAt: new Date(),
      });
    });

    it("returns 200 with summary shape when authenticated with secret key", async () => {
      const res = await request(app)
        .get("/api/analytics/summary")
        .set("x-api-key", DEMO_SEC_KEY);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("recommendations", 1);
      expect(res.body).toHaveProperty("avgConfidence", 0.88);
      expect(res.body).toHaveProperty("sizeDistribution");
      expect(res.body.sizeDistribution).toHaveProperty("M", 1);
      expect(res.body).toHaveProperty("returnRate", 0);
      expect(res.body).toHaveProperty("lowConfidenceShare", 0);
    });

    it("rejects publishable key on secret route with 403 FORBIDDEN", async () => {
      const res = await request(app)
        .get("/api/analytics/summary")
        .set("x-api-key", DEMO_PUB_KEY);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rejects missing API key with 401 UNAUTHORIZED", async () => {
      const res = await request(app).get("/api/analytics/summary");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("validates from/to query parameters format and returns 400 on invalid date", async () => {
      const res = await request(app)
        .get("/api/analytics/summary?from=invalid-date")
        .set("x-api-key", DEMO_SEC_KEY);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });
  });

  describe("GET /api/experiments/:id/results (Secret Key Protected)", () => {
    beforeEach(async () => {
      await Experiment.create({
        experimentId: "exp_test_route_01",
        storeId: DEMO_STORE_ID,
        split: 0.5,
        status: "running",
      });

      // Insert minimal events for testing route output
      await Event.create([
        {
          storeId: DEMO_STORE_ID,
          visitorId: "v_1",
          variant: "control",
          type: "widget_shown",
        },
        {
          storeId: DEMO_STORE_ID,
          visitorId: "v_2",
          variant: "treatment",
          type: "widget_shown",
        },
      ]);
    });

    it("returns 200 with experiment comparison matching contract shape", async () => {
      const res = await request(app)
        .get("/api/experiments/exp_test_route_01/results")
        .set("x-api-key", DEMO_SEC_KEY);

      expect(res.status).toBe(200);
      expect(res.body.experimentId).toBe("exp_test_route_01");
      expect(res.body).toHaveProperty("control");
      expect(res.body).toHaveProperty("treatment");
      expect(res.body).toHaveProperty("metrics");
      expect(Array.isArray(res.body.metrics)).toBe(true);
      expect(res.body.metrics).toHaveLength(3);
      expect(res.body).toHaveProperty("warning");
    });

    it("returns 404 NOT_FOUND for non-existent experiment", async () => {
      const res = await request(app)
        .get("/api/experiments/exp_does_not_exist/results")
        .set("x-api-key", DEMO_SEC_KEY);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("rejects publishable key with 403 FORBIDDEN", async () => {
      const res = await request(app)
        .get("/api/experiments/exp_test_route_01/results")
        .set("x-api-key", DEMO_PUB_KEY);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rejects missing API key with 401 UNAUTHORIZED", async () => {
      const res = await request(app).get(
        "/api/experiments/exp_test_route_01/results"
      );

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });
});
