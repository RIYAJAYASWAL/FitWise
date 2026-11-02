import { jest } from "@jest/globals";
import axios from "axios";
import { predict } from "../src/services/mlClient.js";
import { makeKey, get as cacheGet, set as cacheSet } from "../src/services/cacheService.js";
import { closeRedis } from "../src/config/redis.js";
import { env } from "../src/config/env.js";

describe("ML Client and Cache Service", () => {
  const samplePayload = {
    category: "tshirt",
    measurements: {
      height_cm: 175,
      weight_kg: 70,
      chest_cm: 96,
      waist_cm: 82,
    },
    sizeChart: [
      { size: "XS", chest: [84, 89], waist: [70, 75] },
      { size: "S", chest: [89, 94], waist: [75, 80] },
      { size: "M", chest: [94, 99], waist: [80, 85] },
      { size: "L", chest: [99, 104], waist: [85, 90] },
      { size: "XL", chest: [104, 110], waist: [90, 96] },
      { size: "XXL", chest: [110, 118], waist: [96, 104] },
    ],
    history: [{ sizeBought: "M", kept: true }],
    bias: 0,
  };

  const validContractResponse = {
    recommendedSize: "M",
    confidence: 0.88,
    alternatives: ["L"],
    explanation: {
      summary: "Size M is recommended based on your chest and waist measurements.",
      chartReason: "Your chest is 96 cm; this brand's M covers 94-99 cm.",
      topFactors: [
        { feature: "chest_cm", impact: 0.42 },
        { feature: "waist_cm", impact: 0.28 },
      ],
    },
  };

  afterAll(async () => {
    await closeRedis();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("mlClient.predict", () => {
    it("success: returns validated prediction matching the contract", async () => {
      const postSpy = jest
        .spyOn(axios, "post")
        .mockResolvedValueOnce({ data: validContractResponse });

      const result = await predict(samplePayload);

      expect(result).toEqual(validContractResponse);
      expect(result.recommendedSize).toBe("M");
      expect(result.confidence).toBe(0.88);
      expect(result.alternatives).toContain("L");
      expect(result.explanation.summary).toBeDefined();
      expect(postSpy).toHaveBeenCalledTimes(1);
    });

    it("header sent: sends x-internal-key, Content-Type, and timeout", async () => {
      const postSpy = jest
        .spyOn(axios, "post")
        .mockResolvedValueOnce({ data: validContractResponse });

      await predict(samplePayload);

      const expectedUrl = `${env.ML_SERVICE_URL.replace(/\/$/, "")}/predict`;
      expect(postSpy).toHaveBeenCalledWith(
        expectedUrl,
        samplePayload,
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "x-internal-key": env.ML_INTERNAL_KEY,
          }),
          timeout: Number(env.ML_TIMEOUT_MS),
        })
      );
    });

    it("timeout: retries once on timeout and throws { status: 503, code: 'ML_UNAVAILABLE' }", async () => {
      const timeoutError = new Error("timeout of 5000ms exceeded");
      timeoutError.code = "ECONNABORTED";

      const postSpy = jest
        .spyOn(axios, "post")
        .mockRejectedValue(timeoutError);

      await expect(predict(samplePayload)).rejects.toMatchObject({
        status: 503,
        code: "ML_UNAVAILABLE",
      });

      // Must have attempted initial call + 1 retry (2 total)
      expect(postSpy).toHaveBeenCalledTimes(2);
    });

    it("network error recovery: succeeds if the single retry succeeds", async () => {
      const networkError = new Error("Network Error");
      networkError.code = "ECONNRESET";

      const postSpy = jest
        .spyOn(axios, "post")
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({ data: validContractResponse });

      const result = await predict(samplePayload);
      expect(result.recommendedSize).toBe("M");
      expect(postSpy).toHaveBeenCalledTimes(2);
    });

    it("malformed response: throws validation error when response shape violates contract", async () => {
      const invalidResponse = {
        recommendedSize: "INVALID_SIZE", // Not in XS..XXL
        confidence: "high", // Should be number
      };

      jest.spyOn(axios, "post").mockResolvedValueOnce({ data: invalidResponse });

      await expect(predict(samplePayload)).rejects.toThrow(/Malformed response/i);
    });
  });

  describe("cacheService: Cache Key Stability and Fallback", () => {
    it("cache key stability: produces identical keys regardless of measurement key order or minor fractions", () => {
      const measurementsA = {
        height_cm: 172.4, // rounds to 172
        weight_kg: 68.2,  // rounds to 68
        chest_cm: 94.1,   // rounds to 94
        waist_cm: 80.0,   // rounds to 80
      };

      // Same rounded values, but different key order and fractional offsets
      const measurementsB = {
        waist_cm: 79.8,   // rounds to 80
        chest_cm: 94.4,   // rounds to 94
        weight_kg: 67.9,  // rounds to 68
        height_cm: 171.6, // rounds to 172
      };

      const keyA = makeKey("store_demo", "SKU-TSHIRT-CLASSIC", measurementsA);
      const keyB = makeKey("store_demo", "SKU-TSHIRT-CLASSIC", measurementsB);

      expect(keyA).toBe(keyB);
      expect(keyA).toMatch(/^rec:store_demo:SKU-TSHIRT-CLASSIC:[a-f0-9]{64}$/);
    });

    it("produces distinct keys for different products or measurements", () => {
      const measurements1 = { chest_cm: 94, waist_cm: 80 };
      const measurements2 = { chest_cm: 104, waist_cm: 90 };

      const key1 = makeKey("store_1", "PROD_A", measurements1);
      const key2 = makeKey("store_1", "PROD_A", measurements2);
      const key3 = makeKey("store_1", "PROD_B", measurements1);

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
    });

    it("cache fallback: never throws on get/set when Redis is unavailable", async () => {
      // Offline / down cache calls must return null / false and never throw
      await expect(cacheGet("rec:unknown:key")).resolves.toBeNull();
      await expect(cacheSet("rec:unknown:key", { size: "M" })).resolves.toBe(false);
    });
  });
});
