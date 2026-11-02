/**
 * Recommendation Routes
 * Mounts POST /api/recommend with public API key authentication.
 */

import { Router } from "express";
import { apiKey } from "../middleware/apiKey.js";
import { getRecommendation } from "../controllers/recommendController.js";

const router = Router();

// POST /api/recommend - Public access with valid x-api-key
router.post("/", apiKey("public"), getRecommendation);

export default router;
