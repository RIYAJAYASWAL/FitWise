import { jest } from "@jest/globals";
import request from "supertest";
import crypto from "crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

import { app } from "../src/app.js";
import { Store } from "../src/models/Store.js";
import { Experiment } from "../src/models/Experiment.js";
import { Event } from "../src/models/Event.js";
import { assign, clearExperimentCache } from "../src/services/experimentService.js";
import { closeRedis } from "../src/config/redis.js";

describe("Experiments and Events API Endpoints & Assignment Service", () => {
  let mongoServer;
  const DEMO_STORE_ID = "store_exp_events_demo";
  const DEMO_PUB_KEY = "fw_pub_exp_test_key";
  const DEMO_SEC_KEY = "fw_sec_exp_test_key";

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Seed Demo Store
    const pubHash = crypto.createHash("sha256").update(DEMO_PUB_KEY).digest("hex");
    const secHash = crypto.createHash("sha256").update(DEMO_SEC_KEY).digest("hex");

    await Store.create({
      storeId: DEMO_STORE_ID,
      name: "Experiments & Events Demo Store",
      publicKeyHash: pubHash,
      secretKeyHash: secHash,
    });

    // Seed Running Experiment with 0.5 split
    await Experiment.create({
      experimentId: "exp_fitwise_ab_01",
      storeId: DEMO_STORE_ID,
      split: 0.5,
      status: "running",
      startedAt: new Date("2026-10-01T00:00:00.000Z"),
    });
  }, 60000);

  afterAll(async () => {
    await closeRedis();
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(() => {
    clearExperimentCache();
  });

  describe("experimentService.assign", () => {
    it("same visitorId always gets the same variant (deterministic)", async () => {
      const visitorA = "visitor_stable_test_alpha";
      const visitorB = "visitor_stable_test_beta";

      const firstCallA = await assign(DEMO_STORE_ID, visitorA);
      const firstCallB = await assign(DEMO_STORE_ID, visitorB);

      // Verify consistency over 20 consecutive checks
      for (let i = 0; i < 20; i++) {
        const checkA = await assign(DEMO_STORE_ID, visitorA);
        const checkB = await assign(DEMO_STORE_ID, visitorB);

        expect(checkA.variant).toBe(firstCallA.variant);
        expect(checkA.experimentId).toBe("exp_fitwise_ab_01");

        expect(checkB.variant).toBe(firstCallB.variant);
        expect(checkB.experimentId).toBe("exp_fitwise_ab_01");
      }
    });

    it("a 10,000-visitor run is close to the configured split (50/50)", async () => {
      let treatmentCount = 0;
      const totalVisitors = 10000;

      for (let i = 0; i < totalVisitors; i++) {
        const result = await assign(DEMO_STORE_ID, `shopper_uuid_${i}`);
        if (result.variant === "treatment") {
          treatmentCount++;
        }
      }

      const treatmentRatio = treatmentCount / totalVisitors;
      // Close to 0.5 (within ±3%, between 0.47 and 0.53)
      expect(treatmentRatio).toBeGreaterThanOrEqual(0.47);
      expect(treatmentRatio).toBeLessThanOrEqual(0.53);
    });

    it("adapts distribution to custom split (e.g. 70/30 split)", async () => {
      // Update experiment split to 0.70
      await Experiment.updateOne(
        { experimentId: "exp_fitwise_ab_01" },
        { $set: { split: 0.7 } }
      );
      clearExperimentCache();

      let treatmentCount = 0;
      const totalVisitors = 10000;

      for (let i = 0; i < totalVisitors; i++) {
        const result = await assign(DEMO_STORE_ID, `shopper_split70_${i}`);
        if (result.variant === "treatment") {
          treatmentCount++;
        }
      }

      const treatmentRatio = treatmentCount / totalVisitors;
      // Close to 0.70 (within ±3%, between 0.67 and 0.73)
      expect(treatmentRatio).toBeGreaterThanOrEqual(0.67);
      expect(treatmentRatio).toBeLessThanOrEqual(0.73);

      // Restore 0.5 split for other tests
      await Experiment.updateOne(
        { experimentId: "exp_fitwise_ab_01" },
        { $set: { split: 0.5 } }
      );
      clearExperimentCache();
    });
  });

  describe("GET /api/experiments/assign", () => {
    it("returns variant assignment matching contract with public key", async () => {
      const res = await request(app)
        .get("/api/experiments/assign?visitorId=vis_test_123")
        .set("x-api-key", DEMO_PUB_KEY);

      expect(res.status).toBe(200);
      expect(res.body.experimentId).toBe("exp_fitwise_ab_01");
      expect(["control", "treatment"]).toContain(res.body.variant);

      // Consistent on second request
      const resRepeat = await request(app)
        .get("/api/experiments/assign?visitorId=vis_test_123")
        .set("x-api-key", DEMO_PUB_KEY);

      expect(resRepeat.body.variant).toBe(res.body.variant);
    });

    it("validation error 400: returns 400 when visitorId query parameter is missing", async () => {
      const res = await request(app)
        .get("/api/experiments/assign")
        .set("x-api-key", DEMO_PUB_KEY);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("BAD_REQUEST");
      expect(res.body.error.message).toMatch(/visitorId.*required/i);
    });

    it("missing key returns 401 UNAUTHORIZED", async () => {
      const res = await request(app).get("/api/experiments/assign?visitorId=vis_1");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("POST /api/events", () => {
    it("valid event: saves Event with req.store.storeId and returns { saved: true }", async () => {
      const payload = {
        visitorId: "vis_customer_456",
        variant: "treatment",
        type: "widget_shown",
        sku: "SKU-TSHIRT-CLASSIC",
        timestamp: new Date().toISOString(),
      };

      const res = await request(app)
        .post("/api/events")
        .set("x-api-key", DEMO_PUB_KEY)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ saved: true });

      // Verify event document persisted in MongoDB with storeId
      const savedEvent = await Event.findOne({
        visitorId: "vis_customer_456",
        type: "widget_shown",
      });
      expect(savedEvent).toBeDefined();
      expect(savedEvent.storeId).toBe(DEMO_STORE_ID);
      expect(savedEvent.variant).toBe("treatment");
      expect(savedEvent.sku).toBe("SKU-TSHIRT-CLASSIC");
    });

    it("invalid event type -> 400 BAD_REQUEST", async () => {
      const payload = {
        visitorId: "vis_customer_456",
        variant: "control",
        type: "invalid_event_type_action", // Invalid event type
      };

      const res = await request(app)
        .post("/api/events")
        .set("x-api-key", DEMO_PUB_KEY)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("BAD_REQUEST");
      expect(res.body.error.message).toMatch(/type must be one of/i);
    });

    it("invalid variant -> 400 BAD_REQUEST", async () => {
      const payload = {
        visitorId: "vis_customer_456",
        variant: "unknown_variant",
        type: "recommend_requested",
      };

      const res = await request(app)
        .post("/api/events")
        .set("x-api-key", DEMO_PUB_KEY)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });

    it("missing key returns 401 UNAUTHORIZED", async () => {
      const res = await request(app)
        .post("/api/events")
        .send({
          visitorId: "vis_1",
          variant: "control",
          type: "widget_shown",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });
});
