import mongoose from "mongoose";
import { Journal } from "../models/Journal.js";

/**
 * GET /api/journals?filter=all|mine&q=
 * Secret key required.
 */
export const getJournals = async (req, res, next) => {
  try {
    const { filter = "all", q } = req.query;

    const conditions = [];

    // Filter by author ownership
    if (filter === "mine") {
      const ownerName = req.store?.ownerName || "Store Owner";
      conditions.push({ authorName: ownerName });
    }

    // Keyword search in title, body, excerpt, or tags
    if (q && typeof q === "string" && q.trim()) {
      const safeQ = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(safeQ, "i");
      conditions.push({
        $or: [
          { title: searchRegex },
          { body: searchRegex },
          { excerpt: searchRegex },
          { tags: searchRegex },
        ],
      });
    }

    const query =
      conditions.length > 1
        ? { $and: conditions }
        : conditions.length === 1
        ? conditions[0]
        : {};

    const journals = await Journal.find(query).sort({ createdAt: -1 }).lean();

    return res.status(200).json(journals);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/journals
 * Secret key required. Creates a journal article authored by store owner.
 */
export const createJournal = async (req, res, next) => {
  try {
    const { title, body, excerpt, authorName, tags, isDemo } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Journal title is required",
        },
      });
    }

    if (!body || typeof body !== "string" || !body.trim()) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Journal body is required",
        },
      });
    }

    let parsedTags = [];
    if (Array.isArray(tags)) {
      parsedTags = tags.map((t) => String(t).trim()).filter(Boolean);
    } else if (typeof tags === "string" && tags.trim()) {
      parsedTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }

    const rawBody = body.trim();
    const finalExcerpt =
      excerpt && typeof excerpt === "string" && excerpt.trim()
        ? excerpt.trim()
        : rawBody.length > 150
        ? `${rawBody.substring(0, 147)}...`
        : rawBody;

    const finalAuthor =
      authorName && typeof authorName === "string" && authorName.trim()
        ? authorName.trim()
        : req.store?.ownerName || "Store Owner";

    const journal = await Journal.create({
      title: title.trim(),
      body: rawBody,
      excerpt: finalExcerpt,
      authorName: finalAuthor,
      tags: parsedTags,
      likes: 0,
      liked: false,
      isDemo: Boolean(isDemo),
      storeId: req.store?.storeId || null,
    });

    return res.status(201).json(journal);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/journals/:id/like
 * Secret key required. Toggles liked state on a journal.
 */
export const likeJournal = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Journal not found",
        },
      });
    }

    const journal = await Journal.findById(id);
    if (!journal) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Journal not found",
        },
      });
    }

    if (journal.liked) {
      journal.liked = false;
      journal.likes = Math.max(0, (journal.likes || 1) - 1);
    } else {
      journal.liked = true;
      journal.likes = (journal.likes || 0) + 1;
    }

    await journal.save();

    return res.status(200).json(journal);
  } catch (error) {
    return next(error);
  }
};

export default {
  getJournals,
  createJournal,
  likeJournal,
};
