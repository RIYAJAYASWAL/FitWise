/**
 * Rate Limiting Middleware
 * Enforces 60 requests per minute per IP address on /api/* routes.
 * Emits 429 TOO_MANY_REQUESTS in the API Contract error format upon violation.
 */

import rateLimit from "express-rate-limit";

/**
 * Factory for creating configured rate limiters.
 *
 * @param {Object} [overrides={}]
 * @returns {import("express").RequestHandler}
 */
export const createRateLimiter = (overrides = {}) => {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per window
    standardHeaders: true, // Draft-6 RateLimit headers (RateLimit-Limit, RateLimit-Remaining)
    legacyHeaders: false, // Disable X-RateLimit-* headers
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "Rate limit exceeded. Maximum 60 requests per minute.",
        },
      });
    },
    ...overrides,
  });
};

export const apiLimiter = createRateLimiter();

export default apiLimiter;
