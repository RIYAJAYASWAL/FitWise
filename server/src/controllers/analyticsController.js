/**
 * Analytics Controller
 * Handles:
 * - GET /api/analytics/summary (API Contract §4.8)
 * - GET /api/analytics/trend
 */

import { summary, trend } from "../services/analyticsService.js";

/**
 * Handle GET /api/analytics/summary?from=&to=
 */
export const getAnalyticsSummary = async (req, res, next) => {
  try {
    const storeId = req.store?.storeId;
    if (!storeId) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Store context missing",
        },
      });
    }

    const { from, to } = req.query;

    if (from && isNaN(Date.parse(from))) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Query parameter 'from' must be a valid ISO date",
        },
      });
    }

    if (to && isNaN(Date.parse(to))) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Query parameter 'to' must be a valid ISO date",
        },
      });
    }

    const result = await summary(storeId, from, to);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Handle GET /api/analytics/trend?from=&to=
 */
export const getAnalyticsTrend = async (req, res, next) => {
  try {
    const storeId = req.store?.storeId;
    if (!storeId) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Store context missing",
        },
      });
    }

    const { from, to } = req.query;

    if (from && isNaN(Date.parse(from))) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Query parameter 'from' must be a valid ISO date",
        },
      });
    }

    if (to && isNaN(Date.parse(to))) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Query parameter 'to' must be a valid ISO date",
        },
      });
    }

    const result = await trend(storeId, from, to);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

export default {
  getAnalyticsSummary,
  getAnalyticsTrend,
};
