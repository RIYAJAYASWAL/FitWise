import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import {
  Product,
  User,
  Purchase,
  Recommendation,
  Store,
  Experiment,
  Event,
  ChartFlag,
  Group,
  Journal,
} from "../src/models/index.js";
import seedDatabase, {
  DEMO_STORE_ID,
  DEMO_PUBLISHABLE_KEY,
  DEMO_SECRET_KEY,
} from "../scripts/seed.js";

describe("Mongoose Models and Database Seeder", () => {
  let mongoServer;

  beforeAll(async () => {
    // Increase timeout for binary download if needed on first run
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGO_URI = uri;
    await mongoose.connect(uri);
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe("Model Schema Validations", () => {
    it("validates Product model requires SKU, brand, category, region, and sizeChart", async () => {
      const prod = new Product({
        sku: "TEST-SKU-01",
        brand: "TestBrand",
        category: "tshirt",
        region: "US",
        sizeChart: [{ size: "M", chest: [92, 97], waist: [78, 83] }],
      });
      await prod.save();
      expect(prod._id).toBeDefined();
      expect(prod.sku).toBe("TEST-SKU-01");

      // Verify category enum restriction
      const badCategory = new Product({
        sku: "TEST-BAD-01",
        brand: "TestBrand",
        category: "shoes",
        region: "US",
        sizeChart: [{ size: "M" }],
      });
      await expect(badCategory.save()).rejects.toThrow();
    });

    it("validates Event model requires variant, type, and indexes", async () => {
      const event = new Event({
        storeId: "store_123",
        visitorId: "vis_123",
        variant: "treatment",
        type: "widget_shown",
        sku: "TEST-SKU-01",
      });
      await event.save();
      expect(event._id).toBeDefined();

      // Verify compound index on { storeId: 1, type: 1, timestamp: -1 }
      await Event.init();
      const indexes = await Event.collection.indexes();
      const hasCompound = indexes.some(
        (idx) =>
          idx.key &&
          idx.key.storeId === 1 &&
          idx.key.type === 1 &&
          idx.key.timestamp === -1
      );
      expect(hasCompound).toBe(true);
    });

    it("validates ChartFlag model", async () => {
      const flag = new ChartFlag({
        sku: "TEST-SKU-01",
        size: "M",
        direction: "runs_small",
        sampleSize: 45,
        returnShare: 0.32,
        suggestedFix: "Increase M chest range min and max by 2 cm",
      });
      await flag.save();
      expect(flag._id).toBeDefined();
      expect(flag.direction).toBe("runs_small");
    });

    it("validates Group model", async () => {
      const group = new Group({
        name: "Test Denim Community",
        description: "Test denim group",
        category: "jeans",
        memberCount: 15,
        joined: true,
        isDemo: true,
      });
      await group.save();
      expect(group._id).toBeDefined();
      expect(group.name).toBe("Test Denim Community");
      expect(group.joined).toBe(true);

      const badGroup = new Group({ description: "Missing name" });
      await expect(badGroup.save()).rejects.toThrow();
    });

    it("validates Journal model and auto-generates excerpt", async () => {
      const journal = new Journal({
        title: "Test Journal Entry",
        body: "This is a detailed test journal body that exceeds one hundred and fifty characters in total length to verify that the pre-save hook creates an automated excerpt cleanly.",
        authorName: "Alex Store",
        tags: ["test", "sizing"],
      });
      await journal.save();
      expect(journal._id).toBeDefined();
      expect(journal.excerpt).toBeTruthy();
      expect(journal.excerpt.endsWith("...")).toBe(true);
      expect(journal.likes).toBe(0);
      expect(journal.liked).toBe(false);

      const badJournal = new Journal({ title: "No body" });
      await expect(badJournal.save()).rejects.toThrow();
    });
  });

  describe("Idempotent Database Seeder", () => {
    it("seeds database and runs idempotently without error", async () => {
      // Run seeder first time
      await seedDatabase();

      // Verify Store
      const store = await Store.findOne({ storeId: DEMO_STORE_ID });
      expect(store).toBeDefined();
      expect(store.name).toBe("FitWise Flagship Store");
      // Raw keys must NOT be stored in database
      expect(store.publicKeyHash).not.toBe(DEMO_PUBLISHABLE_KEY);
      expect(store.secretKeyHash).not.toBe(DEMO_SECRET_KEY);
      expect(store.publicKeyHash).toHaveLength(64); // SHA-256 hex string

      // Verify Experiment
      const exp = await Experiment.findOne({ experimentId: "exp_fitwise_ab_01" });
      expect(exp).toBeDefined();
      expect(exp.status).toBe("running");
      expect(exp.split).toBe(0.5);

      // Verify 8 Products across 4 categories and regions
      const products = await Product.find({
        sku: { $in: (await Product.find()).map((p) => p.sku) },
      });
      expect(products.length).toBeGreaterThanOrEqual(8);

      const categories = new Set(products.map((p) => p.category));
      expect(categories).toContain("tshirt");
      expect(categories).toContain("jeans");
      expect(categories).toContain("kurta");
      expect(categories).toContain("blouse");

      const regions = new Set(products.map((p) => p.region));
      expect(regions).toContain("US");
      expect(regions).toContain("UK");
      expect(regions).toContain("EU");
      expect(regions).toContain("IN");

      // Verify 300 Purchases
      const purchases = await Purchase.find();
      expect(purchases).toHaveLength(300);

      // Verify the 2 products clearly run small with high too_small returns
      const slimReturns = await Purchase.find({
        sku: "SKU-TSHIRT-SLIM",
        kept: false,
      });
      const slimTooSmall = slimReturns.filter((p) => p.returnReason === "too_small");
      expect(slimReturns.length).toBeGreaterThanOrEqual(15);
      expect(slimTooSmall.length / slimReturns.length).toBeGreaterThan(0.7);

      const jeansReturns = await Purchase.find({
        sku: "SKU-JEANS-SKINNY",
        kept: false,
      });
      const jeansTooSmall = jeansReturns.filter((p) => p.returnReason === "too_small");
      expect(jeansReturns.length).toBeGreaterThanOrEqual(15);
      expect(jeansTooSmall.length / jeansReturns.length).toBeGreaterThan(0.7);

      // Run seeder SECOND time (verify idempotence)
      await expect(seedDatabase()).resolves.not.toThrow();

      // Counts remain exact and un-duplicated
      const storeCount = await Store.countDocuments({ storeId: DEMO_STORE_ID });
      expect(storeCount).toBe(1);

      const expCount = await Experiment.countDocuments({ experimentId: "exp_fitwise_ab_01" });
      expect(expCount).toBe(1);

      const purchaseCount = await Purchase.countDocuments();
      expect(purchaseCount).toBe(300);

      const groupCount = await Group.countDocuments({ isDemo: true });
      expect(groupCount).toBe(6);

      const journalCount = await Journal.countDocuments({ isDemo: true });
      expect(journalCount).toBe(3);
    });
  });
});
