import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env file
dotenv.config();

// If running in test environment, supply defaults for any missing variables
if (process.env.NODE_ENV === "test") {
  process.env.PORT = process.env.PORT || "5001";
  process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/fitwise_test";
  process.env.ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
  process.env.ML_TIMEOUT_MS = process.env.ML_TIMEOUT_MS || "5000";
  process.env.ML_INTERNAL_KEY = process.env.ML_INTERNAL_KEY || "test-ml-internal-key";
  process.env.INTERNAL_KEY = process.env.INTERNAL_KEY || "test-internal-key";
  process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:5173";
}

// If ML_INTERNAL_KEY is not explicitly set, reuse INTERNAL_KEY
if (!process.env.ML_INTERNAL_KEY && process.env.INTERNAL_KEY) {
  process.env.ML_INTERNAL_KEY = process.env.INTERNAL_KEY;
}

const envSchema = z.object({
  PORT: z
    .string()
    .or(z.number())
    .default(5000)
    .transform((val) => Number(val)),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  ML_SERVICE_URL: z.string().url("ML_SERVICE_URL must be a valid URL"),
  ML_TIMEOUT_MS: z
    .string()
    .or(z.number())
    .default(5000)
    .transform((val) => Number(val)),
  ML_INTERNAL_KEY: z.string().min(1, "ML_INTERNAL_KEY is required"),
  INTERNAL_KEY: z.string().min(1, "INTERNAL_KEY is required"),
  ALLOWED_ORIGINS: z.string().min(1, "ALLOWED_ORIGINS is required"),
  REDIS_URL: z.string().optional(),
  ENABLE_CRON: z
    .string()
    .or(z.boolean())
    .optional()
    .transform((val) => val === true || val === "true"),
  CHART_MIN_ORDERS: z
    .string()
    .or(z.number())
    .optional()
    .default(30)
    .transform((val) => Number(val)),
  CHART_THRESHOLD: z
    .string()
    .or(z.number())
    .optional()
    .default(0.25)
    .transform((val) => {
      const num = Number(val);
      return num > 1 ? num / 100 : num;
    }),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  console.error("❌ Environment validation error:", issues);
  throw new Error(`Environment validation failed: ${issues}`);
}

export const env = parsed.data;
export default env;
