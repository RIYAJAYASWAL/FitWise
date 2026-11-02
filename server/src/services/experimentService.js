/**
 * Experiment Service
 * Implements deterministic A/B testing variant assignment per FitWise API Contract §4.5.
 * Uses SHA-256 hashing on visitorId + experimentId. No personal data stored.
 */

import crypto from "crypto";
import { Experiment } from "../models/Experiment.js";

// In-memory cache for running experiment to avoid redundant DB queries under high throughput
const experimentCache = new Map();
const CACHE_TTL_MS = 5000;

/**
 * Fetch running experiment for store with short caching.
 *
 * @param {string} storeId
 * @returns {Promise<Object|null>}
 */
export const getRunningExperiment = async (storeId) => {
  const cached = experimentCache.get(storeId);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.experiment;
  }

  const experiment = await Experiment.findOne({
    storeId,
    status: "running",
  }).lean();

  experimentCache.set(storeId, { experiment, timestamp: now });
  return experiment;
};

/**
 * Clear the internal experiment cache (useful in tests).
 */
export const clearExperimentCache = () => {
  experimentCache.clear();
};

/**
 * Assign a visitor to an A/B test variant deterministically.
 * Formula: hash(visitorId + experimentId) mod 100 < split * 100 ? "treatment" : "control"
 *
 * @param {string} storeId
 * @param {string} visitorId
 * @returns {Promise<{ experimentId: string|null, variant: "control"|"treatment" }>}
 */
export const assign = async (storeId, visitorId) => {
  if (!visitorId || typeof visitorId !== "string" || !visitorId.trim()) {
    throw new Error("visitorId is required");
  }

  const cleanVisitorId = visitorId.trim();
  const experiment = await getRunningExperiment(storeId);

  if (!experiment) {
    return {
      experimentId: null,
      variant: "control",
    };
  }

  const split = typeof experiment.split === "number" ? experiment.split : 0.5;
  const hash = crypto
    .createHash("sha256")
    .update(cleanVisitorId + experiment.experimentId)
    .digest("hex");

  // Extract first 8 hex characters as unsigned 32-bit int
  const hashInt = parseInt(hash.substring(0, 8), 16);
  const bucket = hashInt % 100;
  const threshold = Math.round(split * 100);

  const variant = bucket < threshold ? "treatment" : "control";

  return {
    experimentId: experiment.experimentId,
    variant,
  };
};

export const experimentService = {
  assign,
  getRunningExperiment,
  clearExperimentCache,
};

export default experimentService;
