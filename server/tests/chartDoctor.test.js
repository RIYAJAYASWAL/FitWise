import request from "supertest";
import crypto from "crypto";
import path from "path";
import { execSync } from "child_process";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

import { app } from "../src/app.js";
import { Store } from "../src/models/Store.js";
import { Product } from "../src/models/Product.js";
import { Purchase } from "../src/models/Purchase.js";
import { ChartFlag } from "../src/models/ChartFlag.js";
import { chartDoctorService } from "../src/services/chartDoctorService.js";
import { runNow } from "../src/jobs/chartDoctorJob.js";
import { env } from "../src/config/env.js";
import { closeRedis } from "../src/config/redis.js";

describe("Chart Doctor Aggregation Service, Cron Job, and Routes", () => {
  let mongoServer;
  const DEMO_STORE_ID = "store_chart_doctor_demo";
  const DEMO_PUB_KEY = "fw_pub_cd_test";
  const DEMO_SEC_KEY = "fw_sec_cd_test";
  const VALID_INTERNAL_KEY = env.INTERNAL_KEY;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Seed Demo Store
    const pubHash = crypto.createHash("sha256").update(DEMO_PUB_KEY).digest("hex");
    const secHash = crypto.createHash("sha256").update(DEMO_SEC_KEY).digest("hex");

    await Store.create({
      storeId: DEMO_STORE_ID,
      name: "Chart Doctor Test Store",
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
    await Purchase.deleteMany({});
    await ChartFlag.deleteMany({});
    await Product.deleteMany({});
  });

  describe("chartDoctorService.run aggregation logic", () => {
    it("a product that runs small gets flagged with runs_small direction and suggested fix", async () => {
      // 1. Create a Product
      await Product.create({
        sku: "SKU-SLIM-TSHIRT",
        brand: "FitBrand",
        category: "tshirt",
        region: "US",
        sizeChart: [{ size: "M", chest: [94, 99], waist: [80, 85] }],
        flagCount: 0,
      });

      // 2. Generate 40 orders for size M in last 90 days:
      // 16 returned as too_small (40% return share, >= 25% threshold, orders >= 30)
      const purchases = [];
      for (let i = 0; i < 40; i++) {
        const isTooSmall = i < 16;
        purchases.push({
          storeId: DEMO_STORE_ID,
          userId: `u_${i}`,
          sku: "SKU-SLIM-TSHIRT",
          sizeBought: "M",
          kept: !isTooSmall,
          returnReason: isTooSmall ? "too_small" : null,
          createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000), // 10 days ago
        });
      }
      await Purchase.insertMany(purchases);

      // 3. Execute Chart Doctor
      const flaggedCount = await chartDoctorService.run();

      expect(flaggedCount).toBe(1);

      // 4. Verify ChartFlag document
      const flag = await ChartFlag.findOne({ sku: "SKU-SLIM-TSHIRT", size: "M" });
      expect(flag).toBeDefined();
      expect(flag.direction).toBe("runs_small");
      expect(flag.sampleSize).toBe(40);
      expect(flag.returnShare).toBe(0.4);
      expect(flag.suggestedFix).toBe(
        "40% of size M orders were returned as too small. Consider sizing the chart up or adding a note."
      );

      // 5. Verify Product flagCount was updated
      const updatedProduct = await Product.findOne({ sku: "SKU-SLIM-TSHIRT" });
      expect(updatedProduct.flagCount).toBe(1);
    });

    it("a product that runs large gets flagged with runs_large direction", async () => {
      await Product.create({
        sku: "SKU-BAGGY-JEANS",
        brand: "LooseFit",
        category: "jeans",
        region: "US",
        sizeChart: [{ size: "L", waist: [84, 90], hip: [104, 110] }],
        flagCount: 0,
      });

      // 35 orders: 14 returned as too_large (40% >= 25%)
      const purchases = [];
      for (let i = 0; i < 35; i++) {
        const isTooLarge = i < 14;
        purchases.push({
          storeId: DEMO_STORE_ID,
          userId: `u_${i}`,
          sku: "SKU-BAGGY-JEANS",
          sizeBought: "L",
          kept: !isTooLarge,
          returnReason: isTooLarge ? "too_large" : null,
          createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
        });
      }
      await Purchase.insertMany(purchases);

      const flaggedCount = await chartDoctorService.run();
      expect(flaggedCount).toBe(1);

      const flag = await ChartFlag.findOne({ sku: "SKU-BAGGY-JEANS", size: "L" });
      expect(flag).toBeDefined();
      expect(flag.direction).toBe("runs_large");
      expect(flag.sampleSize).toBe(35);
      expect(flag.returnShare).toBe(0.4);
      expect(flag.suggestedFix).toBe(
        "40% of size L orders were returned as too large. Consider sizing the chart down or adding a note."
      );
    });

    it("below thresholds gets none: rejects orders < 30 or return share < 25%", async () => {
      await Product.create({
        sku: "SKU-NORMAL-01",
        brand: "FitBrand",
        category: "tshirt",
        region: "US",
        sizeChart: [{ size: "S" }, { size: "M" }],
        flagCount: 0,
      });

      const purchases = [];

      // Subcase A: High return rate (50%) but sample size < 30 (only 18 orders)
      for (let i = 0; i < 18; i++) {
        purchases.push({
          storeId: DEMO_STORE_ID,
          sku: "SKU-NORMAL-01",
          sizeBought: "S",
          kept: i >= 9,
          returnReason: i < 9 ? "too_small" : null,
          createdAt: new Date(),
        });
      }

      // Subcase B: Sample size >= 30 (40 orders) but return rate < 25% (only 4 returns = 10%)
      for (let i = 0; i < 40; i++) {
        purchases.push({
          storeId: DEMO_STORE_ID,
          sku: "SKU-NORMAL-01",
          sizeBought: "M",
          kept: i >= 4,
          returnReason: i < 4 ? "too_small" : null,
          createdAt: new Date(),
        });
      }

      await Purchase.insertMany(purchases);

      const flaggedCount = await chartDoctorService.run();
      expect(flaggedCount).toBe(0);

      const flags = await ChartFlag.find();
      expect(flags).toHaveLength(0);
    });

    it("ignores purchases older than 90 days", async () => {
      await Product.create({
        sku: "SKU-OLD-DATA",
        brand: "FitBrand",
        category: "kurta",
        region: "IN",
        sizeChart: [{ size: "M" }],
      });

      // 40 orders with 50% returns, but 100 days old (> 90 days)
      const purchases = [];
      const oldDate = new Date(Date.now() - 100 * 24 * 3600 * 1000);
      for (let i = 0; i < 40; i++) {
        purchases.push({
          storeId: DEMO_STORE_ID,
          sku: "SKU-OLD-DATA",
          sizeBought: "M",
          kept: i >= 20,
          returnReason: i < 20 ? "too_small" : null,
          createdAt: oldDate,
        });
      }
      await Purchase.insertMany(purchases);

      const flaggedCount = await chartDoctorService.run();
      expect(flaggedCount).toBe(0);
      const flags = await ChartFlag.find();
      expect(flags).toHaveLength(0);
    });

    it("flags clear when data changes: removes existing flags that no longer qualify", async () => {
      await Product.create({
        sku: "SKU-RESOLVED",
        brand: "FitBrand",
        category: "tshirt",
        region: "US",
        sizeChart: [{ size: "M" }],
        flagCount: 1,
      });

      // Pre-existing flag
      await ChartFlag.create({
        sku: "SKU-RESOLVED",
        size: "M",
        direction: "runs_small",
        sampleSize: 30,
        returnShare: 0.35,
        suggestedFix: "Pre-existing flag",
      });

      // Now data changes: 60 orders in last 90 days, but only 5 returned (5/60 = 8.3% < 25%)
      const purchases = [];
      for (let i = 0; i < 60; i++) {
        purchases.push({
          storeId: DEMO_STORE_ID,
          sku: "SKU-RESOLVED",
          sizeBought: "M",
          kept: i >= 5,
          returnReason: i < 5 ? "too_small" : null,
          createdAt: new Date(),
        });
      }
      await Purchase.insertMany(purchases);

      // Run Chart Doctor
      const flaggedCount = await chartDoctorService.run();
      expect(flaggedCount).toBe(0);

      // Verify the flag was cleaned up
      const remainingFlag = await ChartFlag.findOne({ sku: "SKU-RESOLVED" });
      expect(remainingFlag).toBeNull();

      // Verify Product flagCount reset to 0
      const updatedProduct = await Product.findOne({ sku: "SKU-RESOLVED" });
      expect(updatedProduct.flagCount).toBe(0);
    });
  });

  describe("jobs/chartDoctorJob.js", () => {
    it("runNow exports and triggers chart doctor run", async () => {
      const flagged = await runNow();
      expect(typeof flagged).toBe("number");
    });

    it("supports standalone CLI execution via: node src/jobs/chartDoctorJob.js --once", () => {
      const serverRoot = path.resolve(process.cwd());
      const output = execSync("node src/jobs/chartDoctorJob.js --once", {
        cwd: serverRoot,
        env: {
          ...process.env,
          MONGO_URI: mongoServer.getUri(),
          NODE_ENV: "test",
        },
        encoding: "utf-8",
      });
      expect(output).toContain("Standalone Chart Doctor completed successfully");
    });
  });

  describe("GET /api/chart-doctor/flags (Secret Key Protected)", () => {
    beforeEach(async () => {
      await ChartFlag.create({
        sku: "SKU-TSHIRT-SLIM",
        size: "M",
        direction: "runs_small",
        sampleSize: 45,
        returnShare: 0.32,
        suggestedFix: "Increase M chest range min and max by 2 cm or shift recommendation bias to +1",
        updatedAt: new Date("2026-10-11T02:00:00.000Z"),
      });
    });

    it("secret key: returns 200 with list of flags matching contract", async () => {
      const res = await request(app)
        .get("/api/chart-doctor/flags")
        .set("x-api-key", DEMO_SEC_KEY);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("flags");
      expect(res.body.flags).toHaveLength(1);

      const flag = res.body.flags[0];
      expect(flag.sku).toBe("SKU-TSHIRT-SLIM");
      expect(flag.size).toBe("M");
      expect(flag.direction).toBe("runs_small");
      expect(flag.sampleSize).toBe(45);
      expect(flag.returnShare).toBe(0.32);
      expect(flag.suggestedFix).toContain("Increase M chest range");
    });

    it("publishable key rejected with 403 FORBIDDEN", async () => {
      const res = await request(app)
        .get("/api/chart-doctor/flags")
        .set("x-api-key", DEMO_PUB_KEY);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("missing key rejected with 401 UNAUTHORIZED", async () => {
      const res = await request(app).get("/api/chart-doctor/flags");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("POST /internal/chart-doctor/run (Internal Key Protected)", () => {
    it("internal route needs the key: rejects missing x-internal-key with 401 UNAUTHORIZED", async () => {
      const res = await request(app).post("/internal/chart-doctor/run");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("internal route needs the key: rejects store secret key in x-internal-key with 401 UNAUTHORIZED", async () => {
      // Must not accept a store key
      const res = await request(app)
        .post("/internal/chart-doctor/run")
        .set("x-internal-key", DEMO_SEC_KEY);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("internal route needs the key: accepts valid INTERNAL_KEY and returns { flagged }", async () => {
      const res = await request(app)
        .post("/internal/chart-doctor/run")
        .set("x-internal-key", VALID_INTERNAL_KEY);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("flagged");
      expect(typeof res.body.flagged).toBe("number");
    });
  });
});
