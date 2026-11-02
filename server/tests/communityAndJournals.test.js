import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import crypto from "crypto";
import app from "../src/app.js";
import { Store } from "../src/models/Store.js";
import { Group } from "../src/models/Group.js";
import { Journal } from "../src/models/Journal.js";

const hashKey = (key) => crypto.createHash("sha256").update(key).digest("hex");

describe("Community & Journals API (Store Owner Authored)", () => {
  let mongoServer;
  const storeId = "store_community_test";
  const ownerName = "Riya Jayaswal";
  const pubKey = "fw_pub_comm_test_123";
  const secKey = "fw_sec_comm_test_456";

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
    await Group.deleteMany({});
    await Journal.deleteMany({});

    await Store.create({
      storeId,
      name: "Community Test Store",
      ownerName,
      publicKeyHash: hashKey(pubKey),
      secretKeyHash: hashKey(secKey),
    });
  });

  describe("Authentication Enforcement", () => {
    it("rejects unauthenticated requests with 401 UNAUTHORIZED", async () => {
      const gRes = await request(app).get("/api/community/groups");
      expect(gRes.status).toBe(401);

      const jRes = await request(app).get("/api/journals");
      expect(jRes.status).toBe(401);

      const postGRes = await request(app)
        .post("/api/community/groups")
        .send({ name: "Test Group" });
      expect(postGRes.status).toBe(401);
    });

    it("rejects publishable key requests on all community/journal routes with 403 FORBIDDEN", async () => {
      const gRes = await request(app)
        .get("/api/community/groups")
        .set("x-api-key", pubKey);
      expect(gRes.status).toBe(403);

      const jRes = await request(app)
        .get("/api/journals")
        .set("x-api-key", pubKey);
      expect(jRes.status).toBe(403);

      const postGRes = await request(app)
        .post("/api/community/groups")
        .set("x-api-key", pubKey)
        .send({ name: "Test Group" });
      expect(postGRes.status).toBe(403);

      const postJRes = await request(app)
        .post("/api/journals")
        .set("x-api-key", pubKey)
        .send({ title: "Test", body: "Body" });
      expect(postJRes.status).toBe(403);
    });
  });

  describe("Community Groups Endpoints", () => {
    let group1, group2, group3;

    beforeEach(async () => {
      group1 = await Group.create({
        name: "Denim Cut Discussions",
        description: "Focus on jeans and rises",
        category: "jeans",
        memberCount: 50,
        joined: false,
        isDemo: true,
      });

      group2 = await Group.create({
        name: "Everyday Tees Collective",
        description: "Crewneck styling",
        category: "tshirt",
        memberCount: 30,
        joined: true,
        isDemo: true,
      });

      group3 = await Group.create({
        name: "Tailored Blouses",
        description: "Office fit",
        category: "blouse",
        memberCount: 20,
        joined: false,
        isDemo: false,
      });
    });

    it("GET /api/community/groups returns all groups", async () => {
      const res = await request(app)
        .get("/api/community/groups")
        .set("x-api-key", secKey);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(3);
    });

    it("GET /api/community/groups?tab=discover returns only unjoined groups", async () => {
      const res = await request(app)
        .get("/api/community/groups?tab=discover")
        .set("x-api-key", secKey);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.every((g) => g.joined === false)).toBe(true);
    });

    it("GET /api/community/groups?tab=mine returns only joined groups", async () => {
      const res = await request(app)
        .get("/api/community/groups?tab=mine")
        .set("x-api-key", secKey);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("Everyday Tees Collective");
      expect(res.body[0].joined).toBe(true);
    });

    it("POST /api/community/groups creates a new group authored by store owner", async () => {
      const res = await request(app)
        .post("/api/community/groups")
        .set("x-api-key", secKey)
        .send({
          name: "Kurta Craft & Silhouettes",
          description: "All about ethnic cuts",
          category: "kurta",
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Kurta Craft & Silhouettes");
      expect(res.body.category).toBe("kurta");
      expect(res.body.joined).toBe(true);
      expect(res.body.memberCount).toBe(1);
    });

    it("POST /api/community/groups rejects missing name with 400", async () => {
      const res = await request(app)
        .post("/api/community/groups")
        .set("x-api-key", secKey)
        .send({ description: "No name provided" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });

    it("POST /api/community/groups/:id/join sets joined=true and increments memberCount", async () => {
      const res = await request(app)
        .post(`/api/community/groups/${group1._id}/join`)
        .set("x-api-key", secKey);

      expect(res.status).toBe(200);
      expect(res.body.joined).toBe(true);
      expect(res.body.memberCount).toBe(51);

      // Verify idempotent join doesn't increment count again
      const res2 = await request(app)
        .post(`/api/community/groups/${group1._id}/join`)
        .set("x-api-key", secKey);
      expect(res2.body.memberCount).toBe(51);
    });

    it("POST /api/community/groups/:id/leave sets joined=false and decrements memberCount", async () => {
      const res = await request(app)
        .post(`/api/community/groups/${group2._id}/leave`)
        .set("x-api-key", secKey);

      expect(res.status).toBe(200);
      expect(res.body.joined).toBe(false);
      expect(res.body.memberCount).toBe(29);

      // Verify idempotent leave doesn't decrement below 0
      const res2 = await request(app)
        .post(`/api/community/groups/${group2._id}/leave`)
        .set("x-api-key", secKey);
      expect(res2.body.memberCount).toBe(29);
    });

    it("returns 404 for unknown or invalid group id on join and leave", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res1 = await request(app)
        .post(`/api/community/groups/${fakeId}/join`)
        .set("x-api-key", secKey);
      expect(res1.status).toBe(404);

      const res2 = await request(app)
        .post("/api/community/groups/invalid-id-string/leave")
        .set("x-api-key", secKey);
      expect(res2.status).toBe(404);
    });
  });

  describe("Journals Endpoints", () => {
    let j1, j2, j3;

    beforeEach(async () => {
      j1 = await Journal.create({
        title: "Calibrating Chest Tolerances for Tees",
        body: "A comprehensive guide on tshirt measurements and chest ease tolerances.",
        excerpt: "Guide on tshirt chest ease.",
        authorName: "FitWise Editorial",
        tags: ["tshirt", "sizing", "tolerances"],
        likes: 10,
        liked: false,
        isDemo: true,
      });

      j2 = await Journal.create({
        title: "How I Cut Size Returns by 15%",
        body: "Real merchant experience sharing return insights and customer communication.",
        excerpt: "Store owner case study on returns.",
        authorName: ownerName, // "Riya Jayaswal"
        tags: ["returns", "case-study"],
        likes: 25,
        liked: true,
        isDemo: true,
      });

      j3 = await Journal.create({
        title: "Denim Shrinkage & Washing Advice",
        body: "Raw denim vs pre-washed jeans fit variations after washing.",
        excerpt: "Denim shrinkage notes.",
        authorName: "FitWise Editorial",
        tags: ["jeans", "denim"],
        likes: 5,
        liked: false,
        isDemo: true,
      });
    });

    it("GET /api/journals?filter=all returns all journals", async () => {
      const res = await request(app)
        .get("/api/journals?filter=all")
        .set("x-api-key", secKey);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(3);
    });

    it("GET /api/journals?filter=mine returns only journals authored by the store owner", async () => {
      const res = await request(app)
        .get("/api/journals?filter=mine")
        .set("x-api-key", secKey);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].authorName).toBe(ownerName);
      expect(res.body[0].title).toBe("How I Cut Size Returns by 15%");
    });

    it("GET /api/journals?q= searches across title, body, excerpt, and tags", async () => {
      const resTag = await request(app)
        .get("/api/journals?q=tolerances")
        .set("x-api-key", secKey);
      expect(resTag.status).toBe(200);
      expect(resTag.body).toHaveLength(1);
      expect(resTag.body[0].title).toBe("Calibrating Chest Tolerances for Tees");

      const resWord = await request(app)
        .get("/api/journals?q=denim")
        .set("x-api-key", secKey);
      expect(resWord.status).toBe(200);
      expect(resWord.body).toHaveLength(1);
      expect(resWord.body[0].title).toBe("Denim Shrinkage & Washing Advice");
    });

    it("POST /api/journals creates a journal with auto-populated authorName and excerpt", async () => {
      const res = await request(app)
        .post("/api/journals")
        .set("x-api-key", secKey)
        .send({
          title: "My New Merchant Journal",
          body: "We recently updated all our kurta measurements with shoulder guides.",
          tags: ["kurta", "measurements"],
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe("My New Merchant Journal");
      expect(res.body.authorName).toBe(ownerName);
      expect(res.body.excerpt).toBeTruthy();
      expect(res.body.likes).toBe(0);
      expect(res.body.liked).toBe(false);
      expect(res.body.tags).toEqual(["kurta", "measurements"]);
    });

    it("POST /api/journals rejects missing title or body with 400", async () => {
      const res1 = await request(app)
        .post("/api/journals")
        .set("x-api-key", secKey)
        .send({ body: "Only body" });
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post("/api/journals")
        .set("x-api-key", secKey)
        .send({ title: "Only title" });
      expect(res2.status).toBe(400);
    });

    it("POST /api/journals/:id/like toggles liked and updates likes count", async () => {
      // j1 initially liked: false, likes: 10
      const likeRes = await request(app)
        .post(`/api/journals/${j1._id}/like`)
        .set("x-api-key", secKey);

      expect(likeRes.status).toBe(200);
      expect(likeRes.body.liked).toBe(true);
      expect(likeRes.body.likes).toBe(11);

      // Second call unlikes: liked: false, likes: 10
      const unlikeRes = await request(app)
        .post(`/api/journals/${j1._id}/like`)
        .set("x-api-key", secKey);

      expect(unlikeRes.status).toBe(200);
      expect(unlikeRes.body.liked).toBe(false);
      expect(unlikeRes.body.likes).toBe(10);
    });

    it("returns 404 for unknown journal on like", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/journals/${fakeId}/like`)
        .set("x-api-key", secKey);
      expect(res.status).toBe(404);
    });
  });
});
