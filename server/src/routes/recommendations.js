import { Router } from "express";
import { apiKey } from "../middleware/apiKey.js";
import {
  getRecommendations,
  updateRecommendationStatus,
} from "../controllers/recommendationsController.js";

const router = Router();

// GET /api/recommendations - Secret key only (Dashboard)
router.get("/", apiKey("secret"), getRecommendations);

// PATCH /api/recommendations/:id - Secret key only (Dashboard)
router.patch("/:id", apiKey("secret"), updateRecommendationStatus);

export default router;
