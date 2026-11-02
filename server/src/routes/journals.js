import { Router } from "express";
import { apiKey } from "../middleware/apiKey.js";
import {
  getJournals,
  createJournal,
  likeJournal,
} from "../controllers/journalController.js";

const router = Router();

// Journal routes (Secret key required)
router.get("/", apiKey("secret"), getJournals);
router.post("/", apiKey("secret"), createJournal);
router.post("/:id/like", apiKey("secret"), likeJournal);

export default router;
