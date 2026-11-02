/**
 * Experiments Routes
 * Mounts GET /api/experiments/assign with public API key authentication.
 */

import { Router } from "express";
import { apiKey } from "../middleware/apiKey.js";
import {
  listExperiments,
  createExperiment,
  updateExperiment,
  assignVariant,
  getExperimentResults,
} from "../controllers/experimentController.js";

const router = Router();

// GET /api/experiments - Secret key required (Dashboard list)
router.get("/", apiKey("secret"), listExperiments);

// POST /api/experiments - Secret key required (Dashboard create)
router.post("/", apiKey("secret"), createExperiment);

// PATCH /api/experiments/:id - Secret key required (Dashboard status update)
router.patch("/:id", apiKey("secret"), updateExperiment);

// GET /api/experiments/assign?visitorId= - Public key allowed (Widget)
router.get("/assign", apiKey("public"), assignVariant);

// GET /api/experiments/:id/results - Secret key required (Dashboard)
router.get("/:id/results", apiKey("secret"), getExperimentResults);

export default router;

