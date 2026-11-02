import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import crypto from "crypto";
import app from "../src/app.js";
import { Store } from "../src/models/Store.js";
import { Product } from "../src/models/Product.js";
import { Recommendation } from "../src/models/Recommendation.js";
import { Purchase } from "../src/models/Purchase.js";
import { Event } from "../src/models/Event.js";

const hashKey = (key) => crypto.createHash("sha256").update(key).digest("hex");

describe("Analytics Extended Endpoints: Summary & Trend", () => {
  let mongoServer;
  const storeId = "store_analytics_ext";
  const pubKey = "fw_pub_analytics_ext_123";
  const secKey = "fw_sec_analytics_ext_456";

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Store.deleteMany({});
    await Product.deleteMany({});
    await Recommendation.deleteMany({});
    await Purchase.deleteMany({});
    await Event.deleteMany({});

    await Store.create({
      storeId,
      name: "Analytics Extended Store",
      publicKeyHash: hashKey(pubKey),
      secretKeyHash: hashKey(secKey),
    });

    await Product.create({
      sku: "SKU-TSHIRT-01",
      name: "Classic Tee",
      brand: "UrbanClassic",
      category: "tshirt",
      region: "US",
      sizeChart: [{ size: "M", chest: [94, 99], waist: [80, 85] }],
    });

    await Product.create({
      sku: "SKU-JEANS-01",
      name: "Slim Jeans",
      brand: "DenimCraft",
      category: "jeans",
      region: "US",
      sizeChart: [{ size: "M", waist: [78, 84], hip: [98, 104] }],
    });
  });

  describe("GET /api/analytics/summary (Extended)", () => {
    it("returns totalOrders, conversionRate, activeBrands, topCategories, and previous period metrics", async () => {
      const now = Date.now();
      const currentPeriodStart = new Date(now - 10 * 86400000);
      const prevPeriodStart = new Date(now - 20 * 86400000);

      // 1. Current Period Data (last 10 days)
      // 20 widget_shown events
      for (let i = 0; i < 20; i++) {
        await Event.create({
          storeId,
          visitorId: `vis_${i}`,
          variant: "treatment",
          type: "widget_shown",
          timestamp: new Date(now - 5 * 86400000),
        });
      }

      // 4 purchases (so conversionRate = 4 / 20 = 0.2000)
      for (let i = 0; i < 4; i++) {
        await Purchase.create({
          storeId,
          sku: i % 2 === 0 ? "SKU-TSHIRT-01" : "SKU-JEANS-01",
          sizeBought: "M",
          kept: true,
          createdAt: new Date(now - 4 * 86400000),
        });
      }

      // 6 recommendations (4 tshirt, 2 jeans)
      for (let i = 0; i < 6; i++) {
        await Recommendation.create({
          storeId,
          sku: i < 4 ? "SKU-TSHIRT-01" : "SKU-JEANS-01",
          predictedSize: "M",
          confidence: 0.85,
          createdAt: new Date(now - 3 * 86400000),
        });
      }

      // 2. Previous Period Data (between 20 and 10 days ago)
      for (let i = 0; i < 10; i++) {
        await Event.create({
          storeId,
          visitorId: `vis_prev_${i}`,
          variant: "treatment",
          type: "widget_shown",
          timestamp: new Date(now - 15 * 86400000),
        });
      }

      for (let i = 0; i < 2; i++) {
        await Purchase.create({
          storeId,
          sku: "SKU-TSHIRT-01",
          sizeBought: "M",
          kept: true,
          createdAt: new Date(now - 14 * 86400000),
        });
      }

      const res = await request(app)
        .get(
          `/api/analytics/summary?from=${currentPeriodStart.toISOString()}&to=${new Date(
            now
          ).toISOString()}`
        )
        .set("x-api-key", secKey);

      expect(res.status).toBe(200);

      // Validate core summary
      expect(res.body.recommendations).toBe(6);
      expect(res.body.totalOrders).toBe(4);
      expect(res.body.conversionRate).toBe(0.2); // 4 purchases / 20 events
      expect(res.body.activeBrands).toBe(2); // UrbanClassic & DenimCraft
      expect(res.body.topCategories).toBeDefined();
      expect(Array.isArray(res.body.topCategories)).toBe(true);

      const tshirtCat = res.body.topCategories.find((c) => c.category === "tshirt");
      expect(tshirtCat).toBeDefined();
      expect(tshirtCat.share).toBeCloseTo(4 / 6, 2);

      // Validate previous period numbers
      expect(res.body.previous).toBeDefined();
      expect(res.body.previous.totalOrders).toBe(2);
      expect(res.body.previous.conversionRate).toBe(0.2); // 2 purchases / 10 events
    });
  });

  describe("GET /api/analytics/trend?from=&to=", () => {
    it("requires secret key authentication", async () => {
      const pubRes = await request(app)
        .get("/api/analytics/trend")
        .set("x-api-key", pubKey);
      expect(pubRes.status).toBe(403);
    });

    it("returns null for widget and standard when a bucket has fewer than 20 purchases", async () => {
      const now = Date.now();
      const from = new Date(now - 7 * 86400000).toISOString();
      const to = new Date(now).toISOString();

      // Seed 5 treatment purchases and 5 control purchases (both < 20)
      for (let i = 0; i < 5; i++) {
        await Purchase.create({
          storeId,
          sku: "SKU-TSHIRT-01",
          sizeBought: "M",
          kept: true,
          variant: "treatment",
          createdAt: new Date(now - 3 * 86400000),
        });
        await Purchase.create({
          storeId,
          sku: "SKU-TSHIRT-01",
          sizeBought: "M",
          kept: true,
          variant: "control",
          createdAt: new Date(now - 3 * 86400000),
        });
      }

      const res = await request(app)
        .get(`/api/analytics/trend?from=${from}&to=${to}`)
        .set("x-api-key", secKey);

      expect(res.status).toBe(200);
      expect(res.body.points).toBeDefined();
      expect(res.body.points.length).toBeGreaterThanOrEqual(1);

      const point = res.body.points[0];
      expect(point.widget).toBeNull();
      expect(point.standard).toBeNull();
    });

    it("calculates 1 - size-related return rate when a bucket has >= 20 purchases", async () => {
      const now = Date.now();
      const from = new Date(now - 7 * 86400000).toISOString();
      const to = new Date(now).toISOString();

      // Seed 25 treatment purchases: 5 returned as too_small (size-related), 20 kept
      // Size return rate = 5 / 25 = 0.20 -> widget = 1 - 0.20 = 0.80
      for (let i = 0; i < 25; i++) {
        const returned = i < 5;
        await Purchase.create({
          storeId,
          sku: "SKU-TSHIRT-01",
          sizeBought: "M",
          kept: !returned,
          returnReason: returned ? "too_small" : null,
          variant: "treatment",
          createdAt: new Date(now - 3 * 86400000),
        });
      }

      // Seed 20 control purchases: 8 returned as too_large (size-related), 12 kept
      // Size return rate = 8 / 20 = 0.40 -> standard = 1 - 0.40 = 0.60
      for (let i = 0; i < 20; i++) {
        const returned = i < 8;
        await Purchase.create({
          storeId,
          sku: "SKU-TSHIRT-01",
          sizeBought: "M",
          kept: !returned,
          returnReason: returned ? "too_large" : null,
          variant: "control",
          createdAt: new Date(now - 3 * 86400000),
        });
      }

      const res = await request(app)
        .get(`/api/analytics/trend?from=${from}&to=${to}`)
        .set("x-api-key", secKey);

      expect(res.status).toBe(200);
      const point = res.body.points[0];
      expect(point.widget).toBe(0.8);
      expect(point.standard).toBe(0.6);
    });
  });
});
