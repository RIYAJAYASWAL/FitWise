import { jest } from "@jest/globals";
import request from "supertest";
import crypto from "crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

import { app } from "../src/app.js";
import { Store } from "../src/models/Store.js";
import { Product } from "../src/models/Product.js";
import { ChartFlag } from "../src/models/ChartFlag.js";
import { Purchase } from "../src/models/Purchase.js";
import { Recommendation } from "../src/models/Recommendation.js";
import mlClient from "../src/services/mlClient.js";
import cacheService from "../src/services/cacheService.js";
import { closeRedis } from "../src/config/redis.js";

describe("POST /api/recommend API Integration Tests", () => {
  let mongoServer;
  const DEMO_STORE_ID = "store_rec_demo";
  const DEMO_PUB_KEY = "fw_pub_rec_test_key";
  const DEMO_SEC_KEY = "fw_sec_rec_test_key";

  const defaultMockMLResponse = {
    recommendedSize: "M",
    confidence: 0.88,
    alternatives: ["L"],
    explanation: {
      summary: "Size M is the best match for your chest and waist measurements.",
      chartReason: "Your chest is 96 cm; this brand's M covers 94-99 cm.",
      topFactors: [
        { feature: "chest_cm", impact: 0.42 },
        { feature: "waist_cm", impact: 0.28 },
      ],
    },
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Seed Demo Store
    const pubHash = crypto.createHash("sha256").update(DEMO_PUB_KEY).digest("hex");
    const secHash = crypto.createHash("sha256").update(DEMO_SEC_KEY).digest("hex");

    await Store.create({
      storeId: DEMO_STORE_ID,
      name: "Recommendation Demo Store",
      publicKeyHash: pubHash,
      secretKeyHash: secHash,
    });

    // Seed Products
    await Product.create([
      {
        sku: "SKU-TSHIRT-CLASSIC",
        brand: "UrbanClassic",
        category: "tshirt",
        region: "US",
        sizeChart: [
          { size: "XS", chest: [84, 89], waist: [70, 75] },
          { size: "S", chest: [89, 94], waist: [75, 80] },
          { size: "M", chest: [94, 99], waist: [80, 85] },
          { size: "L", chest: [99, 104], waist: [85, 90] },
          { size: "XL", chest: [104, 110], waist: [90, 96] },
          { size: "XXL", chest: [110, 118], waist: [96, 104] },
        ],
      },
      {
        sku: "SKU-TSHIRT-SLIM",
        brand: "EuroSlim",
        category: "tshirt",
        region: "EU",
        sizeChart: [
          { size: "XS", chest: [80, 85], waist: [66, 71] },
          { size: "S", chest: [85, 90], waist: [71, 76] },
          { size: "M", chest: [90, 95], waist: [76, 81] },
          { size: "L", chest: [95, 100], waist: [81, 86] },
          { size: "XL", chest: [100, 106], waist: [86, 92] },
          { size: "XXL", chest: [106, 114], waist: [92, 100] },
        ],
      },
      {
        sku: "SKU-JEANS-BAGGY",
        brand: "DenimCo",
        category: "jeans",
        region: "US",
        sizeChart: [
          { size: "XS", waist: [68, 73], hip: [88, 93] },
          { size: "S", waist: [73, 78], hip: [93, 98] },
          { size: "M", waist: [78, 84], hip: [98, 104] },
          { size: "L", waist: [84, 90], hip: [104, 110] },
          { size: "XL", waist: [90, 97], hip: [110, 117] },
          { size: "XXL", waist: [97, 106], hip: [117, 126] },
        ],
      },
    ]);

    // Seed ChartFlags
    await ChartFlag.create([
      {
        sku: "SKU-TSHIRT-SLIM",
        size: "M",
        direction: "runs_small",
        sampleSize: 50,
        returnShare: 0.35,
        suggestedFix: "Increase chest ranges by 2 cm",
      },
      {
        sku: "SKU-JEANS-BAGGY",
        size: "L",
        direction: "runs_large",
        sampleSize: 45,
        returnShare: 0.30,
        suggestedFix: "Decrease waist ranges by 2 cm",
      },
    ]);

    // Seed User Purchases
    await Purchase.create([
      {
        userId: "usr_shopper_01",
        sku: "SKU-TSHIRT-CLASSIC",
        sizeBought: "M",
        kept: true,
      },
      {
        userId: "usr_shopper_01",
        sku: "SKU-TSHIRT-CLASSIC",
        sizeBought: "S",
        kept: false,
        returnReason: "too_small",
      },
    ]);
  }, 60000);

  afterAll(async () => {
    await closeRedis();
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("valid request: succeeds with 200, saves Recommendation, and returns contract response", async () => {
    const predictSpy = jest
      .spyOn(mlClient, "predict")
      .mockResolvedValueOnce(defaultMockMLResponse);

    const payload = {
      productId: "SKU-TSHIRT-CLASSIC",
      measurements: {
        height_cm: 175,
        weight_kg: 70,
        chest_cm: 96,
        waist_cm: 82,
      },
      userId: "usr_shopper_01",
      visitorId: "vis_1001",
      region: "IN",
    };

    const res = await request(app)
      .post("/api/recommend")
      .set("x-api-key", DEMO_PUB_KEY)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.recommendedSize).toBe("M");
    // Size M converted to Indian region size for tshirt -> 40
    expect(res.body.regionSize).toBe("40");
    expect(res.body.confidence).toBe(0.88);
    expect(res.body.alternatives).toContain("L");
    expect(res.body.lowConfidence).toBe(false);
    expect(res.body.explanation.summary).toBeDefined();

    // Verify ML client was called with purchase history
    expect(predictSpy).toHaveBeenCalledTimes(1);
    expect(predictSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "tshirt",
        history: expect.arrayContaining([
          { sizeBought: "M", kept: true },
          { sizeBought: "S", kept: false },
        ]),
        bias: 0,
      })
    );

    // Verify Recommendation document persisted in DB
    const savedRec = await Recommendation.findOne({
      userId: "usr_shopper_01",
      sku: "SKU-TSHIRT-CLASSIC",
    });
    expect(savedRec).toBeDefined();
    expect(savedRec.predictedSize).toBe("M");
  });

  it("invalid measurements 400: rejects missing or out-of-range category measurements", async () => {
    // Missing chest_cm and waist_cm for tshirt
    const resMissing = await request(app)
      .post("/api/recommend")
      .set("x-api-key", DEMO_PUB_KEY)
      .send({
        productId: "SKU-TSHIRT-CLASSIC",
        measurements: {
          height_cm: 175,
          weight_kg: 70,
        },
      });

    expect(resMissing.status).toBe(400);
    expect(resMissing.body.error).toBeDefined();
    expect(resMissing.body.error.code).toBe("BAD_REQUEST");
    expect(resMissing.body.error.message).toMatch(/Missing required measurements/i);

    // Out of range measurement (height_cm: 50 is below 120cm min)
    const resOutOfRange = await request(app)
      .post("/api/recommend")
      .set("x-api-key", DEMO_PUB_KEY)
      .send({
        productId: "SKU-TSHIRT-CLASSIC",
        measurements: {
          height_cm: 50,
          weight_kg: 70,
          chest_cm: 96,
          waist_cm: 82,
        },
      });

    expect(resOutOfRange.status).toBe(400);
    expect(resOutOfRange.body.error.code).toBe("BAD_REQUEST");
    expect(resOutOfRange.body.error.message).toMatch(/outside allowed range/i);
  });

  it("unknown product 404: returns 404 NOT_FOUND when product does not exist", async () => {
    const res = await request(app)
      .post("/api/recommend")
      .set("x-api-key", DEMO_PUB_KEY)
      .send({
        productId: "SKU-NON-EXISTENT",
        measurements: {
          height_cm: 175,
          weight_kg: 70,
          chest_cm: 96,
          waist_cm: 82,
        },
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(res.body.error.message).toMatch(/Product with SKU 'SKU-NON-EXISTENT' not found/i);
  });

  it("cache hit skips the ML call: identical subsequent request returns cached result without calling ML client", async () => {
    const memoryCache = new Map();
    jest.spyOn(cacheService, "get").mockImplementation(async (key) => memoryCache.get(key) || null);
    jest.spyOn(cacheService, "set").mockImplementation(async (key, val) => {
      memoryCache.set(key, val);
      return true;
    });

    const predictSpy = jest
      .spyOn(mlClient, "predict")
      .mockResolvedValue(defaultMockMLResponse);

    const payload = {
      productId: "SKU-TSHIRT-CLASSIC",
      measurements: {
        height_cm: 180,
        weight_kg: 75,
        chest_cm: 98,
        waist_cm: 84,
      },
    };

    // First request: calls ML client and caches
    const res1 = await request(app)
      .post("/api/recommend")
      .set("x-api-key", DEMO_PUB_KEY)
      .send(payload);

    expect(res1.status).toBe(200);
    expect(predictSpy).toHaveBeenCalledTimes(1);

    // Second request: identical measurements and product
    const res2 = await request(app)
      .post("/api/recommend")
      .set("x-api-key", DEMO_PUB_KEY)
      .send(payload);

    expect(res2.status).toBe(200);
    expect(res2.body.recommendedSize).toBe("M");
    // ML client MUST NOT be called a second time due to cache hit
    expect(predictSpy).toHaveBeenCalledTimes(1);
  });

  it("ML down 503: returns 503 SERVICE_UNAVAILABLE when downstream ML service is unreachable", async () => {
    const unavailableErr = new Error("ML service is unavailable");
    unavailableErr.status = 503;
    unavailableErr.code = "ML_UNAVAILABLE";

    jest.spyOn(mlClient, "predict").mockRejectedValueOnce(unavailableErr);

    const res = await request(app)
      .post("/api/recommend")
      .set("x-api-key", DEMO_PUB_KEY)
      .send({
        productId: "SKU-TSHIRT-CLASSIC",
        measurements: {
          height_cm: 170,
          weight_kg: 65,
          chest_cm: 92,
          waist_cm: 78,
        },
      });

    expect(res.status).toBe(503);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(res.body.error.message).toMatch(/Downstream ML service is unavailable/i);
  });

  it("bias applied from a ChartFlag: applies +1 for runs_small and -1 for runs_large", async () => {
    const predictSpy = jest
      .spyOn(mlClient, "predict")
      .mockResolvedValue(defaultMockMLResponse);

    // 1. Test SKU-TSHIRT-SLIM (has runs_small flag -> bias = +1)
    await request(app)
      .post("/api/recommend")
      .set("x-api-key", DEMO_PUB_KEY)
      .send({
        productId: "SKU-TSHIRT-SLIM",
        measurements: {
          height_cm: 175,
          weight_kg: 70,
          chest_cm: 92,
          waist_cm: 78,
        },
      });

    expect(predictSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        category: "tshirt",
        bias: 1,
      })
    );

    // 2. Test SKU-JEANS-BAGGY (has runs_large flag -> bias = -1)
    await request(app)
      .post("/api/recommend")
      .set("x-api-key", DEMO_PUB_KEY)
      .send({
        productId: "SKU-JEANS-BAGGY",
        measurements: {
          height_cm: 180,
          weight_kg: 75,
          waist_cm: 85,
          hip_cm: 102,
        },
      });

    expect(predictSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        category: "jeans",
        bias: -1,
      })
    );
  });

  it("lowConfidence flag: sets lowConfidence = true when confidence < 0.5", async () => {
    jest.spyOn(mlClient, "predict").mockResolvedValueOnce({
      ...defaultMockMLResponse,
      confidence: 0.45,
      alternatives: ["S", "L"],
    });

    const res = await request(app)
      .post("/api/recommend")
      .set("x-api-key", DEMO_PUB_KEY)
      .send({
        productId: "SKU-TSHIRT-CLASSIC",
        measurements: {
          height_cm: 195,
          weight_kg: 105,
          chest_cm: 112,
          waist_cm: 98,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.confidence).toBe(0.45);
    expect(res.body.lowConfidence).toBe(true);
  });
});
