import { Router } from "express";
import { apiKey } from "../middleware/apiKey.js";
import { getSuggestions } from "../controllers/suggestionsController.js";

const router = Router();

// GET /api/suggestions - Secret key only (Dashboard)
router.get("/", apiKey("secret"), getSuggestions);

export default router;
