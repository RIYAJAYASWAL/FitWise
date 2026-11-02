/**
 * Graceful Shutdown Utility
 * Handles teardown of Redis connection pools and MongoDB connections.
 */

import { closeRedis } from "./redis.js";
import { disconnectDB } from "./db.js";
import { logger } from "./logger.js";

/**
 * Closes downstream database and cache connections gracefully.
 *
 * @returns {Promise<void>}
 */
export const shutdownResources = async () => {
  try {
    await closeRedis();
    logger.info("Redis connection closed successfully.");
  } catch (redisErr) {
    logger.error(`Error closing Redis connection: ${redisErr.message}`);
  }

  try {
    await disconnectDB();
    logger.info("MongoDB connection closed successfully.");
  } catch (mongoErr) {
    logger.error(`Error disconnecting MongoDB: ${mongoErr.message}`);
  }
};

export default shutdownResources;
