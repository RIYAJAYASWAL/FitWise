import { Router } from "express";
import { apiKey } from "../middleware/apiKey.js";
import { getStore, updateStore } from "../controllers/storeController.js";

const router = Router();

// GET /api/store - Secret key only (Dashboard)
router.get("/", apiKey("secret"), getStore);

// PUT /api/store - Secret key only (Dashboard)
router.put("/", apiKey("secret"), updateStore);

export default router;
