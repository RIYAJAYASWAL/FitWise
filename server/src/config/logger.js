/**
 * Central Pino Logger Configuration
 * Provides structured logging with environment-specific formatting and levels.
 */

import pino from "pino";
import { env } from "./env.js";

export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : process.env.LOG_LEVEL || "info",
});

export default logger;
