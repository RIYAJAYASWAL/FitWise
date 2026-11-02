/**
 * Events Routes
 * Mounts POST /api/events with public API key authentication.
 */

import { Router } from "express";
import { apiKey } from "../middleware/apiKey.js";
import { recordEvent } from "../controllers/eventController.js";

const router = Router();

// POST /api/events - Public key allowed (Widget & Storefront)
router.post("/", apiKey("public"), recordEvent);

export default router;
