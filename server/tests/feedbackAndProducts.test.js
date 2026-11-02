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
import { closeRedis } from "../src/config/redis.js";

describe("Feedback and Products API Endpoints", () => {
  let mongoServer;
  const DEMO_STORE_ID = "store_products_demo";
  const DEMO_PUB_KEY = "fw_pub_products_test_key";
  const DEMO_SEC_KEY = "fw_sec_products_test_key";

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Seed Demo Store
    const pubHash = crypto.createHash("sha256").update(DEMO_PUB_KEY).digest("hex");
    const secHash = crypto.createHash("sha256").update(DEMO_SEC_KEY).digest("hex");

    await Store.create({
      storeId: DEMO_STORE_ID,
      name: "Products & Feedback Store",
      publicKeyHash: pubHash,
      secretKeyHash: secHash,
    });

    // Seed Products
    await Product.create([
      {
        sku: "SKU-PROD-01",
        brand: "FitBrand",
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
        sku: "SKU-PROD-02",
        brand: "EuroStyle",
        category: "jeans",
        region: "EU",
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

    // Seed ChartFlags (2 flags on SKU-PROD-01, 0 flags on SKU-PROD-02)
    await ChartFlag.create([
      {
        sku: "SKU-PROD-01",
        size: "M",
        direction: "runs_small",
        sampleSize: 40,
        returnShare: 0.32,
        suggestedFix: "Increase M chest range by 2 cm",
      },
      {
        sku: "SKU-PROD-01",
        size: "S",
        direction: "runs_small",
        sampleSize: 30,
        returnShare: 0.28,
        suggestedFix: "Increase S chest range by 2 cm",
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

  describe("POST /api/feedback", () => {
    it("valid feedback (kept=true): saves Purchase without returnReason and returns 200", async () => {
      const payload = {
        userId: "usr_buyer_101",
        productId: "SKU-PROD-01",
        sizeBought: "M",
        kept: true,
      };

      const res = await request(app)
        .post("/api/feedback")
        .set("x-api-key", DEMO_PUB_KEY)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ saved: true });

      // Verify Purchase was saved in DB
      const purchase = await Purchase.findOne({
        userId: "usr_buyer_101",
        sku: "SKU-PROD-01",
      });
      expect(purchase).toBeDefined();
      expect(purchase.sizeBought).toBe("M");
      expect(purchase.kept).toBe(true);
      expect(purchase.returnReason).toBeNull();
    });

    it("valid feedback (kept=false): saves Purchase with returnReason and returns 200", async () => {
      const payload = {
        userId: "usr_buyer_102",
        productId: "SKU-PROD-01",
        sizeBought: "S",
        kept: false,
        returnReason: "too_small",
      };

      const res = await request(app)
        .post("/api/feedback")
        .set("x-api-key", DEMO_PUB_KEY)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ saved: true });

      const purchase = await Purchase.findOne({
        userId: "usr_buyer_102",
        sku: "SKU-PROD-01",
      });
      expect(purchase).toBeDefined();
      expect(purchase.kept).toBe(false);
      expect(purchase.returnReason).toBe("too_small");
    });

    it("validation error 400: returnReason is required when kept=false", async () => {
      const payload = {
        userId: "usr_buyer_103",
        productId: "SKU-PROD-01",
        sizeBought: "M",
        kept: false, // missing returnReason
      };

      const res = await request(app)
        .post("/api/feedback")
        .set("x-api-key", DEMO_PUB_KEY)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("BAD_REQUEST");
      expect(res.body.error.message).toMatch(/returnReason is required when kept is false/i);
    });

    it("validation error 400: invalid sizeBought", async () => {
      const payload = {
        productId: "SKU-PROD-01",
        sizeBought: "XXXL", // invalid enum
        kept: true,
      };

      const res = await request(app)
        .post("/api/feedback")
        .set("x-api-key", DEMO_PUB_KEY)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });

    it("404 NOT_FOUND: returns 404 when product does not exist", async () => {
      const payload = {
        productId: "SKU-UNKNOWN-999",
        sizeBought: "M",
        kept: true,
      };

      const res = await request(app)
        .post("/api/feedback")
        .set("x-api-key", DEMO_PUB_KEY)
        .send(payload);

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("key-type enforcement: works with secret key as well as public key", async () => {
      const res = await request(app)
        .post("/api/feedback")
        .set("x-api-key", DEMO_SEC_KEY)
        .send({
          productId: "SKU-PROD-01",
          sizeBought: "L",
          kept: true,
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ saved: true });
    });

    it("key-type enforcement: missing or wrong key returns 401 UNAUTHORIZED", async () => {
      const resMissing = await request(app)
        .post("/api/feedback")
        .send({ productId: "SKU-PROD-01", sizeBought: "M", kept: true });
      expect(resMissing.status).toBe(401);

      const resWrong = await request(app)
        .post("/api/feedback")
        .set("x-api-key", "invalid_api_key")
        .send({ productId: "SKU-PROD-01", sizeBought: "M", kept: true });
      expect(resWrong.status).toBe(401);
    });
  });

  describe("GET /api/products", () => {
    it("secret key: lists all products with accurate flagCount from ChartFlag", async () => {
      const res = await request(app)
        .get("/api/products")
        .set("x-api-key", DEMO_SEC_KEY);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);

      const prod1 = res.body.find((p) => p.sku === "SKU-PROD-01");
      expect(prod1).toBeDefined();
      expect(prod1.brand).toBe("FitBrand");
      expect(prod1.category).toBe("tshirt");
      expect(prod1.region).toBe("US");
      // 2 ChartFlag documents seeded for SKU-PROD-01
      expect(prod1.flagCount).toBe(2);

      const prod2 = res.body.find((p) => p.sku === "SKU-PROD-02");
      expect(prod2).toBeDefined();
      expect(prod2.flagCount).toBe(0);
    });

    it("key-type enforcement: publishable key rejected on secret route with 403 FORBIDDEN", async () => {
      const res = await request(app)
        .get("/api/products")
        .set("x-api-key", DEMO_PUB_KEY);

      expect([401, 403]).toContain(res.status);
      expect(res.body.error).toBeDefined();
      expect(["UNAUTHORIZED", "FORBIDDEN"]).toContain(res.body.error.code);
    });

    it("key-type enforcement: missing key returns 401 UNAUTHORIZED", async () => {
      const res = await request(app).get("/api/products");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("GET /api/products/:id/sizechart", () => {
    it("public key: returns 200 with product size chart including category and region", async () => {
      const res = await request(app)
        .get("/api/products/SKU-PROD-01/sizechart")
        .set("x-api-key", DEMO_PUB_KEY);

      expect(res.status).toBe(200);
      expect(res.body.sku).toBe("SKU-PROD-01");
      expect(res.body.brand).toBe("FitBrand");
      expect(res.body.category).toBe("tshirt");
      expect(res.body.region).toBe("US");
      expect(Array.isArray(res.body.sizeChart)).toBe(true);
      expect(res.body.sizeChart.length).toBe(6);
      expect(res.body.sizeChart[0].size).toBe("XS");
    });

    it("secret key: also permitted to fetch product size chart", async () => {
      const res = await request(app)
        .get("/api/products/SKU-PROD-01/sizechart")
        .set("x-api-key", DEMO_SEC_KEY);

      expect(res.status).toBe(200);
      expect(res.body.sku).toBe("SKU-PROD-01");
    });

    it("404 NOT_FOUND: returns 404 when product SKU does not exist", async () => {
      const res = await request(app)
        .get("/api/products/SKU-DOES-NOT-EXIST/sizechart")
        .set("x-api-key", DEMO_PUB_KEY);

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("key-type enforcement: missing key returns 401 UNAUTHORIZED", async () => {
      const res = await request(app).get("/api/products/SKU-PROD-01/sizechart");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });
});
