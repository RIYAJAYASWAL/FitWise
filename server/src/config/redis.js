/**
 * Redis Connection Configuration
 * Initializes and manages ioredis client based on REDIS_URL environment variable.
 * Gracefully handles disconnection, offline state, and missing configuration.
 */

import Redis from "ioredis";
import { env } from "./env.js";

let redisClient = null;
let warningLogged = false;

/**
 * Get or initialize the Redis client instance.
 * Returns null if REDIS_URL is not configured or client creation fails.
 *
 * @returns {Redis|null}
 */
export const getRedisClient = () => {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || env.REDIS_URL;

  if (!redisUrl) {
    if (!warningLogged) {
      console.warn("⚠️ REDIS_URL is not configured; caching is disabled.");
      warningLogged = true;
    }
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
      connectTimeout: 500,
      disconnectTimeout: 50,
      retryStrategy: () => null, // Do not loop reconnects in background
    });

    redisClient.on("error", (err) => {
      console.warn(`⚠️ Redis error: ${err.message}`);
    });

    redisClient.on("connect", () => {
      console.log("🔴 Connected to Redis cache.");
    });

    return redisClient;
  } catch (error) {
    console.warn(`⚠️ Failed to initialize Redis client: ${error.message}`);
    redisClient = null;
    return null;
  }
};

/**
 * Gracefully close the Redis connection.
 *
 * @returns {Promise<void>}
 */
export const closeRedis = async () => {
  if (redisClient) {
    try {
      if (redisClient.connector?.stream) {
        redisClient.connector.stream.destroy();
      }
      redisClient.disconnect();
    } catch {
      // ignore
    }
    redisClient = null;
  }
};

export default {
  getRedisClient,
  closeRedis,
};
