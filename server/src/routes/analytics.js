/**
 * Analytics Routes
 * Mounts:
 * - GET /api/analytics/summary (Dashboard secret key required)
 * - GET /api/analytics/trend (Dashboard secret key required)
 */

import { Router } from "express";
import { apiKey } from "../middleware/apiKey.js";
import {
  getAnalyticsSummary,
  getAnalyticsTrend,
} from "../controllers/analyticsController.js";

const router = Router();

// GET /api/analytics/summary?from=&to= - Secret key only (Dashboard)
router.get("/summary", apiKey("secret"), getAnalyticsSummary);

// GET /api/analytics/trend?from=&to= - Secret key only (Dashboard)
router.get("/trend", apiKey("secret"), getAnalyticsTrend);

export default router;
