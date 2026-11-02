import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import crypto from "crypto";
import app from "../src/app.js";
import { Store } from "../src/models/Store.js";
import { Product } from "../src/models/Product.js";
import { ChartFlag } from "../src/models/ChartFlag.js";
import { Recommendation } from "../src/models/Recommendation.js";

const hashKey = (key) => crypto.createHash("sha256").update(key).digest("hex");

describe("GET /api/suggestions API Endpoint", () => {
  let mongoServer;
  const storeId = "store_sugg_test";
  const pubKey = "fw_pub_sugg_test_123";
  const secKey = "fw_sec_sugg_test_456";

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
    await ChartFlag.deleteMany({});
    await Recommendation.deleteMany({});

    await Store.create({
      storeId,
      name: "Suggestions Test Store",
      publicKeyHash: hashKey(pubKey),
      secretKeyHash: hashKey(secKey),
    });

    await Product.create({
      sku: "SKU-TSHIRT-01",
      name: "Classic Crewneck Tee",
      brand: "UrbanClassic",
      category: "tshirt",
      region: "US",
      sizeChart: [{ size: "M", chest: [94, 99], waist: [80, 85] }],
    });

    await Product.create({
      sku: "SKU-TSHIRT-02",
      name: "Vintage Graphic Tee",
      brand: "UrbanClassic",
      category: "tshirt",
      region: "US",
      sizeChart: [{ size: "M", chest: [94, 99], waist: [80, 85] }],
    });

    await Product.create({
      sku: "SKU-KURTA-01",
      name: "Silk Anarkali Kurta",
      brand: "Rivaaz",
      category: "kurta",
      region: "IN",
      sizeChart: [{ size: "M", bust: [90, 96], waist: [72, 78] }],
    });
  });

  it("requires secret key authentication", async () => {
    const pubRes = await request(app)
      .get("/api/suggestions")
      .set("x-api-key", pubKey);
    expect(pubRes.status).toBe(403);
  });

  it("returns null topInsight and empty items when no rules are triggered", async () => {
    const res = await request(app)
      .get("/api/suggestions")
      .set("x-api-key", secKey);

    expect(res.status).toBe(200);
    expect(res.body.topInsight).toBeNull();
    expect(res.body.items).toHaveLength(0);
  });

  it("applies Rule 1 (ChartFlag -> High impact) with product name", async () => {
    await ChartFlag.create({
      sku: "SKU-TSHIRT-01",
      size: "M",
      direction: "runs_small",
      sampleSize: 40,
      returnShare: 0.35,
      suggestedFix: "35% of size M orders were returned as too small.",
    });

    const res = await request(app)
      .get("/api/suggestions")
      .set("x-api-key", secKey);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);

    const item = res.body.items[0];
    expect(item.impact).toBe("High");
    expect(item.title).toBe("Review the size chart for Classic Crewneck Tee");
    expect(item.detail).toContain("35%");
    expect(item.target).toEqual({
      route: "/chart-doctor",
      sku: "SKU-TSHIRT-01",
    });
    expect(res.body.topInsight).toContain("Review the size chart for Classic Crewneck Tee");
  });

  it("applies Rule 2 (Category with lowConfidenceShare >= 30% -> Medium impact)", async () => {
    // Seed 10 recommendations for kurta, 4 with low confidence (< 0.50) -> 40% >= 30%
    for (let i = 0; i < 10; i++) {
      await Recommendation.create({
        storeId,
        sku: "SKU-KURTA-01",
        predictedSize: "M",
        confidence: i < 4 ? 0.42 : 0.85,
      });
    }

    const res = await request(app)
      .get("/api/suggestions")
      .set("x-api-key", secKey);

    expect(res.status).toBe(200);
    const guideItem = res.body.items.find((i) => i.id === "guide_kurta");
    expect(guideItem).toBeDefined();
    expect(guideItem.impact).toBe("Medium");
    expect(guideItem.title).toBe("Add a measurement guide for kurta");
    expect(guideItem.target).toEqual({
      route: "/products",
    });
  });

  it("applies Rule 3 (Brand with 2+ flagged products -> Medium impact)", async () => {
    // UrbanClassic has 2 flagged products: SKU-TSHIRT-01 and SKU-TSHIRT-02
    await ChartFlag.create({
      sku: "SKU-TSHIRT-01",
      size: "M",
      direction: "runs_small",
      sampleSize: 35,
      returnShare: 0.3,
      suggestedFix: "Fix 1",
    });

    await ChartFlag.create({
      sku: "SKU-TSHIRT-02",
      size: "L",
      direction: "runs_large",
      sampleSize: 32,
      returnShare: 0.28,
      suggestedFix: "Fix 2",
    });

    const res = await request(app)
      .get("/api/suggestions")
      .set("x-api-key", secKey);

    expect(res.status).toBe(200);

    const brandItem = res.body.items.find((i) => i.id === "brand_UrbanClassic");
    expect(brandItem).toBeDefined();
    expect(brandItem.impact).toBe("Medium");
    expect(brandItem.title).toBe("Review inconsistent size labels for UrbanClassic");
    expect(brandItem.target).toEqual({
      route: "/chart-doctor",
    });
  });
});
