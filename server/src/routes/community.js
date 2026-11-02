import { Router } from "express";
import { apiKey } from "../middleware/apiKey.js";
import {
  getGroups,
  createGroup,
  joinGroup,
  leaveGroup,
} from "../controllers/communityController.js";

const router = Router();

// Groups routes (Secret key required)
router.get("/groups", apiKey("secret"), getGroups);
router.post("/groups", apiKey("secret"), createGroup);
router.post("/groups/:id/join", apiKey("secret"), joinGroup);
router.post("/groups/:id/leave", apiKey("secret"), leaveGroup);

export default router;
