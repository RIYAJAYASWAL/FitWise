/**
 * Products Routes
 * Mounts GET /api/products (secret key only) and GET /api/products/:id/sizechart (public key allowed).
 */

import { Router } from "express";
import { apiKey } from "../middleware/apiKey.js";
import { listProducts, getProductSizeChart } from "../controllers/productController.js";

const router = Router();

// GET /api/products - Secret key required (Dashboard)
router.get("/", apiKey("secret"), listProducts);

// GET /api/products/:id/sizechart - Public key allowed (Widget)
router.get("/:id/sizechart", apiKey("public"), getProductSizeChart);

export default router;
