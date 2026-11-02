import { env } from "../src/config/env.js";

describe("Environment Configuration (env.js)", () => {
  it("exports validated environment properties", () => {
    expect(env).toBeDefined();
    expect(typeof env.PORT).toBe("number");
    expect(typeof env.MONGO_URI).toBe("string");
    expect(typeof env.ML_SERVICE_URL).toBe("string");
    expect(typeof env.ML_TIMEOUT_MS).toBe("number");
    expect(env.ML_TIMEOUT_MS).toBe(5000);
    expect(typeof env.ML_INTERNAL_KEY).toBe("string");
    expect(typeof env.INTERNAL_KEY).toBe("string");
    expect(typeof env.ALLOWED_ORIGINS).toBe("string");
  });

  it("handles optional REDIS_URL and ENABLE_CRON", () => {
    // Optional variables default to undefined or boolean false
    expect(env.REDIS_URL === undefined || typeof env.REDIS_URL === "string").toBe(true);
    expect(typeof env.ENABLE_CRON === "boolean" || env.ENABLE_CRON === undefined).toBe(true);
  });
});
