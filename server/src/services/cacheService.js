/**
 * Cache Service for FitWise Platform
 * Manages caching of recommendation results in Redis with TTL 3600.
 * Format: "rec:{storeId}:{productId}:{sha256 of measurements rounded to the nearest cm}"
 * Gracefully degrades if Redis is down or REDIS_URL is not configured (never throws).
 */

import crypto from "crypto";
import { getRedisClient } from "../config/redis.js";

/**
 * Generate a deterministic cache key for recommendation results.
 * Formula: "rec:{storeId}:{productId}:{sha256 of measurements rounded to the nearest cm}"
 *
 * @param {string} storeId
 * @param {string} productId
 * @param {Object} measurements
 * @returns {string}
 */
export const makeKey = (storeId, productId, measurements = {}) => {
  const sortedKeys = Object.keys(measurements || {}).sort();
  const rounded = {};

  for (const key of sortedKeys) {
    const val = measurements[key];
    if (val !== null && val !== undefined && !isNaN(Number(val))) {
      rounded[key] = Math.round(Number(val));
    } else {
      rounded[key] = val;
    }
  }

  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(rounded))
    .digest("hex");

  return `rec:${storeId}:${productId}:${hash}`;
};

/**
 * Retrieve and parse JSON value from Redis.
 * Returns null if key does not exist, REDIS_URL is missing, or Redis is down.
 * Never throws.
 *
 * @param {string} key
 * @returns {Promise<any|null>}
 */
export const get = async (key) => {
  try {
    const client = getRedisClient();
    if (!client) {
      return null;
    }

    if (client.status === "wait") {
      try {
        await client.connect();
      } catch (err) {
        console.warn(`⚠️ Redis is down: ${err.message}; continuing without cache.`);
        return null;
      }
    } else if (client.status && client.status !== "ready") {
      console.warn(`⚠️ Redis is offline (${client.status}); continuing without cache.`);
      return null;
    }

    const data = await client.get(key);
    if (!data) return null;

    return JSON.parse(data);
  } catch (error) {
    console.warn(`⚠️ Cache GET failed for key "${key}": ${error.message}; continuing without cache.`);
    return null;
  }
};

/**
 * Store a JSON-serializable value in Redis with a TTL (default 3600 seconds).
 * Returns true on success, false on failure or when Redis is unavailable.
 * Never throws.
 *
 * @param {string} key
 * @param {any} value
 * @param {number} [ttl=3600]
 * @returns {Promise<boolean>}
 */
export const set = async (key, value, ttl = 3600) => {
  try {
    const client = getRedisClient();
    if (!client) {
      return false;
    }

    if (client.status === "wait") {
      try {
        await client.connect();
      } catch (err) {
        console.warn(`⚠️ Redis is down: ${err.message}; continuing without cache.`);
        return false;
      }
    } else if (client.status && client.status !== "ready") {
      console.warn(`⚠️ Redis is offline (${client.status}); continuing without cache.`);
      return false;
    }

    const serialized = JSON.stringify(value);
    await client.set(key, serialized, "EX", ttl);
    return true;
  } catch (error) {
    console.warn(`⚠️ Cache SET failed for key "${key}": ${error.message}; continuing without cache.`);
    return false;
  }
};

/**
 * Delete a cache key from Redis. Never throws.
 *
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export const del = async (key) => {
  try {
    const client = getRedisClient();
    if (!client) return false;

    if (client.status && client.status !== "ready") {
      return false;
    }

    await client.del(key);
    return true;
  } catch (error) {
    console.warn(`⚠️ Cache DEL failed for key "${key}": ${error.message}`);
    return false;
  }
};

export const cacheService = {
  makeKey,
  get,
  set,
  del,
};

export default cacheService;
