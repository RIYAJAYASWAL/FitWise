import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectDB } from "./config/db.js";
import { shutdownResources } from "./config/shutdown.js";
import { initChartDoctorJob } from "./jobs/chartDoctorJob.js";

const PORT = process.env.PORT || env.PORT || 5000;

// Connect to MongoDB on startup
try {
  await connectDB();
  initChartDoctorJob();
} catch (err) {
  logger.error(`Failed to connect to database during startup: ${err.message}`);
  process.exit(1);
}

const server = app.listen(PORT, () => {
  logger.info(`FitWise Node API Server running on port ${PORT} [${env.NODE_ENV}]`);
});

/**
 * Graceful shutdown handler.
 * Closes HTTP listener, Redis connection pool, and MongoDB connections.
 *
 * @param {string} signal
 */
export const handleShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down HTTP server gracefully...`);
  server.close(async (err) => {
    if (err) {
      logger.error(`Error closing HTTP server: ${err.message}`);
    } else {
      logger.info("HTTP server closed successfully.");
    }

    await shutdownResources();
    process.exit(0);
  });
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

export default server;
