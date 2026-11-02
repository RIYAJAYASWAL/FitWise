import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import crypto from "crypto";
import app from "../src/app.js";
import { Store } from "../src/models/Store.js";
import { Product } from "../src/models/Product.js";
import { Recommendation } from "../src/models/Recommendation.js";
import { Purchase } from "../src/models/Purchase.js";

const hashKey = (key) => crypto.createHash("sha256").update(key).digest("hex");

describe("GET /api/recommendations API Endpoint", () => {
  let mongoServer;
  const storeId = "store_recs_test";
  const pubKey = "fw_pub_recs_test_123";
  const secKey = "fw_sec_recs_test_456";

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

    await Store.create({
      storeId,
      name: "Recommendations Test Store",
      ownerName: "Alice Smith",
      website: "https://alice.example.com",
      publicKeyHash: hashKey(pubKey),
      secretKeyHash: hashKey(secKey),
    });

    await Product.create({
      sku: "SKU-TSHIRT-01",
      name: "Classic Crewneck Tee",
      imageUrl: "https://example.com/tee.jpg",
      brand: "UrbanClassic",
      category: "tshirt",
      region: "US",
      sizeChart: [
        { size: "S", chest: [89, 94], waist: [75, 80] },
        { size: "M", chest: [94, 99], waist: [80, 85] },
        { size: "L", chest: [99, 104], waist: [85, 90] },
      ],
    });
  });

  it("requires secret key authentication (401 without key, 403 with public key)", async () => {
    const noKey = await request(app).get("/api/recommendations");
    expect(noKey.status).toBe(401);
    expect(noKey.body.error.code).toBe("UNAUTHORIZED");

    const pubKeyRes = await request(app)
      .get("/api/recommendations")
      .set("x-api-key", pubKey);
    expect(pubKeyRes.status).toBe(403);
    expect(pubKeyRes.body.error.code).toBe("FORBIDDEN");
  });

  it("returns recommendations with matched statuses: pending, kept, and returned", async () => {
    const now = Date.now();

    // 1. Recommendation with subsequent kept purchase -> status: "kept"
    const recKept = await Recommendation.create({
      storeId,
      userId: "usr_kept_1",
      sku: "SKU-TSHIRT-01",
      predictedSize: "M",
      confidence: 0.92,
      createdAt: new Date(now - 10000),
    });

    await Purchase.create({
      storeId,
      userId: "usr_kept_1",
      sku: "SKU-TSHIRT-01",
      sizeBought: "M",
      kept: true,
      returnReason: null,
      createdAt: new Date(now - 5000),
    });

    // 2. Recommendation with subsequent returned purchase -> status: "returned"
    const recReturned = await Recommendation.create({
      storeId,
      userId: "usr_returned_1",
      sku: "SKU-TSHIRT-01",
      predictedSize: "L",
      confidence: 0.85,
      createdAt: new Date(now - 20000),
    });

    await Purchase.create({
      storeId,
      userId: "usr_returned_1",
      sku: "SKU-TSHIRT-01",
      sizeBought: "L",
      kept: false,
      returnReason: "too_small",
      createdAt: new Date(now - 15000),
    });

    // 3. Recommendation with NO purchase -> status: "pending"
    const recPending = await Recommendation.create({
      storeId,
      userId: "usr_pending_1",
      sku: "SKU-TSHIRT-01",
      predictedSize: "S",
      confidence: 0.78,
      createdAt: new Date(now - 1000),
    });

    // 4. Recommendation where purchase was BEFORE recommendation -> status: "pending"
    await Purchase.create({
      storeId,
      userId: "usr_old_purchase",
      sku: "SKU-TSHIRT-01",
      sizeBought: "M",
      kept: true,
      createdAt: new Date(now - 50000),
    });

    await Recommendation.create({
      storeId,
      userId: "usr_old_purchase",
      sku: "SKU-TSHIRT-01",
      predictedSize: "M",
      confidence: 0.95,
      createdAt: new Date(now - 40000),
    });

    const res = await request(app)
      .get("/api/recommendations")
      .set("x-api-key", secKey);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(4);
    expect(res.body.items).toHaveLength(4);

    const keptItem = res.body.items.find((i) => i.id === recKept._id.toString());
    expect(keptItem).toBeDefined();
    expect(keptItem.status).toBe("kept");
    expect(keptItem.name).toBe("Classic Crewneck Tee");
    expect(keptItem.brand).toBe("UrbanClassic");
    expect(keptItem.category).toBe("tshirt");
    expect(keptItem.imageUrl).toBe("https://example.com/tee.jpg");

    const returnedItem = res.body.items.find(
      (i) => i.id === recReturned._id.toString()
    );
    expect(returnedItem).toBeDefined();
    expect(returnedItem.status).toBe("returned");

    const pendingItem = res.body.items.find(
      (i) => i.id === recPending._id.toString()
    );
    expect(pendingItem).toBeDefined();
    expect(pendingItem.status).toBe("pending");
  });

  it("filters recommendations by status (?status=pending|kept|returned)", async () => {
    const now = Date.now();

    await Recommendation.create({
      storeId,
      userId: "usr_filter_1",
      sku: "SKU-TSHIRT-01",
      predictedSize: "M",
      confidence: 0.88,
      createdAt: new Date(now - 5000),
    });
    await Purchase.create({
      storeId,
      userId: "usr_filter_1",
      sku: "SKU-TSHIRT-01",
      sizeBought: "M",
      kept: true,
      createdAt: new Date(now - 2000),
    });

    await Recommendation.create({
      storeId,
      userId: "usr_filter_2",
      sku: "SKU-TSHIRT-01",
      predictedSize: "S",
      confidence: 0.75,
      createdAt: new Date(now - 1000),
    });

    // Query kept
    const keptRes = await request(app)
      .get("/api/recommendations?status=kept")
      .set("x-api-key", secKey);
    expect(keptRes.status).toBe(200);
    expect(keptRes.body.total).toBe(1);
    expect(keptRes.body.items[0].status).toBe("kept");

    // Query pending
    const pendingRes = await request(app)
      .get("/api/recommendations?status=pending")
      .set("x-api-key", secKey);
    expect(pendingRes.status).toBe(200);
    expect(pendingRes.body.total).toBe(1);
    expect(pendingRes.body.items[0].status).toBe("pending");

    // Query returned (should be 0)
    const returnedRes = await request(app)
      .get("/api/recommendations?status=returned")
      .set("x-api-key", secKey);
    expect(returnedRes.status).toBe(200);
    expect(returnedRes.body.total).toBe(0);
    expect(returnedRes.body.items).toHaveLength(0);
  });

  it("paginates recommendations (?page=1&limit=2)", async () => {
    for (let i = 0; i < 5; i++) {
      await Recommendation.create({
        storeId,
        userId: `usr_page_${i}`,
        sku: "SKU-TSHIRT-01",
        predictedSize: "M",
        confidence: 0.8,
        createdAt: new Date(Date.now() - (10 - i) * 1000),
      });
    }

    const page1Res = await request(app)
      .get("/api/recommendations?page=1&limit=2")
      .set("x-api-key", secKey);
    expect(page1Res.status).toBe(200);
    expect(page1Res.body.total).toBe(5);
    expect(page1Res.body.items).toHaveLength(2);

    const page2Res = await request(app)
      .get("/api/recommendations?page=2&limit=2")
      .set("x-api-key", secKey);
    expect(page2Res.status).toBe(200);
    expect(page2Res.body.total).toBe(5);
    expect(page2Res.body.items).toHaveLength(2);
    expect(page2Res.body.items[0].id).not.toBe(page1Res.body.items[0].id);

    const page3Res = await request(app)
      .get("/api/recommendations?page=3&limit=2")
      .set("x-api-key", secKey);
    expect(page3Res.status).toBe(200);
    expect(page3Res.body.items).toHaveLength(1);
  });
});
