import request from "supertest";
import crypto from "crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

import { app } from "../src/app.js";
import { Store } from "../src/models/Store.js";
import { Product } from "../src/models/Product.js";
import { ChartFlag } from "../src/models/ChartFlag.js";
import { closeRedis } from "../src/config/redis.js";

const hashKey = (key) => crypto.createHash("sha256").update(key).digest("hex");

describe("Chart Doctor Analysis & Apply Endpoints", () => {
  let mongoServer;
  const storeId = "store_cdaa_test";
  const pubKey = "fw_pub_cdaa_123";
  const secKey = "fw_sec_cdaa_456";

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    await Store.create({
      storeId,
      name: "Chart Doctor Analysis Test Store",
      publicKeyHash: hashKey(pubKey),
      secretKeyHash: hashKey(secKey),
    });
  });

  afterAll(async () => {
    await closeRedis();
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Product.deleteMany({});
    await ChartFlag.deleteMany({});

    await Product.create({
      sku: "SKU-JACKET-01",
      name: "Oversized Denim Jacket",
      brand: "UrbanDenim",
      category: "tshirt",
      region: "US",
      sizeChart: [
        { size: "S", chest: [86, 92], waist: [72, 78] },
        { size: "M", chest: [94, 100], waist: [80, 86] },
        { size: "L", chest: [102, 108], waist: [88, 94] },
      ],
      flagCount: 0,
    });
  });

  describe("GET /api/chart-doctor/analysis", () => {
    it("requires secret key authentication", async () => {
      const noKeyRes = await request(app).get("/api/chart-doctor/analysis?sku=SKU-JACKET-01");
      expect(noKeyRes.status).toBe(401);

      const pubRes = await request(app)
        .get("/api/chart-doctor/analysis?sku=SKU-JACKET-01")
        .set("x-api-key", pubKey);
      expect(pubRes.status).toBe(403);
    });

    it("returns 400 when sku is missing", async () => {
      const res = await request(app)
        .get("/api/chart-doctor/analysis")
        .set("x-api-key", secKey);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });

    it("returns 404 when product is not found", async () => {
      const res = await request(app)
        .get("/api/chart-doctor/analysis?sku=NON-EXISTENT")
        .set("x-api-key", secKey);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("returns empty issues and null suggestedFix when no flags exist", async () => {
      const res = await request(app)
        .get("/api/chart-doctor/analysis?sku=SKU-JACKET-01")
        .set("x-api-key", secKey);

      expect(res.status).toBe(200);
      expect(res.body.sku).toBe("SKU-JACKET-01");
      expect(res.body.category).toBe("tshirt");
      expect(res.body.issues).toEqual([]);
      expect(res.body.suggestedFix).toBeNull();
    });

    it("shifts ranges DOWN for runs_small and UP for runs_large by step (default 2 cm)", async () => {
      // S runs_small (shift DOWN)
      await ChartFlag.create({
        sku: "SKU-JACKET-01",
        size: "S",
        direction: "runs_small",
        sampleSize: 35,
        returnShare: 0.3,
        suggestedFix: "30% of size S orders returned too small",
      });

      // L runs_large (shift UP)
      await ChartFlag.create({
        sku: "SKU-JACKET-01",
        size: "L",
        direction: "runs_large",
        sampleSize: 40,
        returnShare: 0.35,
        suggestedFix: "35% of size L orders returned too large",
      });

      const res = await request(app)
        .get("/api/chart-doctor/analysis?sku=SKU-JACKET-01")
        .set("x-api-key", secKey);

      expect(res.status).toBe(200);
      expect(res.body.issues).toHaveLength(2);
      expect(res.body.suggestedFix).not.toBeNull();
      expect(res.body.suggestedFix.summary).toContain("Shift size S ranges down by 2 cm");
      expect(res.body.suggestedFix.summary).toContain("Shift size L ranges up by 2 cm");

      const changes = res.body.suggestedFix.changes;

      // S chest: was [86, 92] -> shifted down by 2 -> [84, 90]
      const sChest = changes.find((c) => c.size === "S" && c.field === "chest");
      expect(sChest).toBeDefined();
      expect(sChest.from).toEqual([86, 92]);
      expect(sChest.to).toEqual([84, 90]);

      // S waist: was [72, 78] -> [70, 76]
      const sWaist = changes.find((c) => c.size === "S" && c.field === "waist");
      expect(sWaist).toBeDefined();
      expect(sWaist.from).toEqual([72, 78]);
      expect(sWaist.to).toEqual([70, 76]);

      // L chest: was [102, 108] -> shifted up by 2 -> [104, 110]
      const lChest = changes.find((c) => c.size === "L" && c.field === "chest");
      expect(lChest).toBeDefined();
      expect(lChest.from).toEqual([102, 108]);
      expect(lChest.to).toEqual([104, 110]);
    });
  });

  describe("POST /api/chart-doctor/apply", () => {
    beforeEach(async () => {
      await ChartFlag.create({
        sku: "SKU-JACKET-01",
        size: "S",
        direction: "runs_small",
        sampleSize: 35,
        returnShare: 0.3,
        suggestedFix: "Size S issue",
      });

      await ChartFlag.create({
        sku: "SKU-JACKET-01",
        size: "L",
        direction: "runs_large",
        sampleSize: 40,
        returnShare: 0.35,
        suggestedFix: "Size L issue",
      });

      await Product.updateOne({ sku: "SKU-JACKET-01" }, { flagCount: 2 });
    });

    it("requires secret key authentication", async () => {
      const pubRes = await request(app)
        .post("/api/chart-doctor/apply")
        .set("x-api-key", pubKey)
        .send({ sku: "SKU-JACKET-01", changes: [] });

      expect(pubRes.status).toBe(403);
    });

    it("validates missing sku or empty changes", async () => {
      const res1 = await request(app)
        .post("/api/chart-doctor/apply")
        .set("x-api-key", secKey)
        .send({ changes: [{ size: "S", field: "chest", to: [84, 90] }] });
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post("/api/chart-doctor/apply")
        .set("x-api-key", secKey)
        .send({ sku: "SKU-JACKET-01", changes: [] });
      expect(res2.status).toBe(400);
    });

    it("validates range min < max and non-negative values", async () => {
      // min >= max
      const resBadRange = await request(app)
        .post("/api/chart-doctor/apply")
        .set("x-api-key", secKey)
        .send({
          sku: "SKU-JACKET-01",
          changes: [{ size: "S", field: "chest", to: [95, 90] }],
        });
      expect(resBadRange.status).toBe(400);
      expect(resBadRange.body.error.message).toContain("min < max");

      // negative min
      const resNeg = await request(app)
        .post("/api/chart-doctor/apply")
        .set("x-api-key", secKey)
        .send({
          sku: "SKU-JACKET-01",
          changes: [{ size: "S", field: "chest", to: [-2, 90] }],
        });
      expect(resNeg.status).toBe(400);
    });

    it("applies changes, updates Product.sizeChart, removes flags for changed sizes and returns new chart", async () => {
      const res = await request(app)
        .post("/api/chart-doctor/apply")
        .set("x-api-key", secKey)
        .send({
          sku: "SKU-JACKET-01",
          changes: [
            { size: "S", field: "chest", to: [84, 90] },
            { size: "S", field: "waist", to: [70, 76] },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.sku).toBe("SKU-JACKET-01");

      const sRow = res.body.sizeChart.find((r) => r.size === "S");
      expect(sRow.chest).toEqual([84, 90]);
      expect(sRow.waist).toEqual([70, 76]);

      // Database verification
      const updatedProduct = await Product.findOne({ sku: "SKU-JACKET-01" });
      const dbSRow = updatedProduct.sizeChart.find((r) => r.size === "S");
      expect(dbSRow.chest).toEqual([84, 90]);
      expect(updatedProduct.flagCount).toBe(1); // L remains flagged

      // S flag should be deleted, L flag remains
      const sFlag = await ChartFlag.findOne({ sku: "SKU-JACKET-01", size: "S" });
      expect(sFlag).toBeNull();

      const lFlag = await ChartFlag.findOne({ sku: "SKU-JACKET-01", size: "L" });
      expect(lFlag).not.toBeNull();
    });
  });
});
