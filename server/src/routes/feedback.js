/**
 * Feedback Routes
 * Mounts POST /api/feedback with public key authentication.
 */

import { Router } from "express";
import { apiKey } from "../middleware/apiKey.js";
import { recordFeedback } from "../controllers/feedbackController.js";

const router = Router();

// POST /api/feedback - Public key allowed (Widget / Checkout)
router.post("/", apiKey("public"), recordFeedback);

export default router;
