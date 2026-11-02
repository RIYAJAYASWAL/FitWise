/**
 * ML Client Service for FitWise Platform
 * Communicates with the FastAPI ML microservice via HTTP POST /predict.
 * Features:
 * - Shared internal key authentication via x-internal-key header
 * - Configurable timeout from ML_TIMEOUT_MS
 * - Automatic single retry on network failure/timeout
 * - Graceful translation to 503 ML_UNAVAILABLE on connection loss
 * - Strict Zod validation of response schema per API Contract §3.1
 */

import axios from "axios";
import { z } from "zod";
import { env } from "../config/env.js";

/**
 * Zod validation schema matching API Contract §3.1 response specification
 */
export const predictResponseSchema = z.object({
  recommendedSize: z.enum(["XS", "S", "M", "L", "XL", "XXL"]),
  confidence: z.number().min(0).max(1),
  alternatives: z.array(z.string()),
  explanation: z.object({
    summary: z.string(),
    chartReason: z.string(),
    topFactors: z.array(
      z.object({
        feature: z.string(),
        impact: z.number(),
      })
    ),
  }),
});

/**
 * Check if an error was caused by a network/connectivity issue rather than an HTTP error response.
 *
 * @param {any} error
 * @returns {boolean}
 */
const isNetworkError = (error) => {
  return (
    !error.response ||
    error.code === "ECONNABORTED" ||
    error.code === "ECONNREFUSED" ||
    error.code === "ENOTFOUND" ||
    error.code === "ECONNRESET" ||
    error.code === "ETIMEDOUT" ||
    (error.message && error.message.toLowerCase().includes("timeout"))
  );
};

/**
 * Call the ML service /predict endpoint with payload, headers, timeout, and retry.
 *
 * @param {Object} payload - Prediction request body per API Contract §3.1
 * @returns {Promise<z.infer<typeof predictResponseSchema>>}
 */
export const predict = async (payload) => {
  const url = `${env.ML_SERVICE_URL.replace(/\/$/, "")}/predict`;
  const timeout = Number(env.ML_TIMEOUT_MS) || 5000;
  const headers = {
    "Content-Type": "application/json",
    "x-internal-key": env.ML_INTERNAL_KEY,
  };

  const doRequest = async () => {
    return await axios.post(url, payload, { headers, timeout });
  };

  let response;

  try {
    response = await doRequest();
  } catch (firstError) {
    if (isNetworkError(firstError)) {
      console.warn("⚠️ ML Service network error on first attempt. Retrying once...");
      try {
        response = await doRequest();
      } catch (retryError) {
        const unavailableErr = new Error("ML service is unavailable");
        unavailableErr.status = 503;
        unavailableErr.code = "ML_UNAVAILABLE";
        unavailableErr.original = retryError;
        throw unavailableErr;
      }
    } else {
      if (firstError.response?.status >= 500) {
        const unavailableErr = new Error(
          firstError.response?.data?.error?.message || "ML service unavailable"
        );
        unavailableErr.status = 503;
        unavailableErr.code = "ML_UNAVAILABLE";
        throw unavailableErr;
      }

      const clientErr = new Error(
        firstError.response?.data?.error?.message || "ML request failed"
      );
      clientErr.status = firstError.response?.status || 500;
      clientErr.code = firstError.response?.data?.error?.code || "BAD_REQUEST";
      throw clientErr;
    }
  }

  // Validate response shape against API contract
  const validation = predictResponseSchema.safeParse(response.data);
  if (!validation.success) {
    const malformedErr = new Error(
      `Malformed response from ML service: ${validation.error.message}`
    );
    malformedErr.status = 502;
    malformedErr.code = "ML_MALFORMED_RESPONSE";
    malformedErr.details = validation.error.errors;
    throw malformedErr;
  }

  return validation.data;
};

export const mlClient = {
  predict,
  predictResponseSchema,
};

export default mlClient;
