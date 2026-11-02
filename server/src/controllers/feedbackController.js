/**
 * Feedback Controller
 * Handles POST /api/feedback per FitWise API Contract §4.2.
 * Records order outcome (kept or returned) to feed model training and Chart Doctor.
 */

import { z } from "zod";
import { Product } from "../models/Product.js";
import { Purchase } from "../models/Purchase.js";

/**
 * Zod validation schema for POST /api/feedback
 * returnReason is required when kept is false.
 */
export const feedbackBodySchema = z
  .object({
    userId: z.string().optional(),
    productId: z.string().min(1, "productId is required"),
    sizeBought: z.enum(["XS", "S", "M", "L", "XL", "XXL"]),
    kept: z.boolean(),
    returnReason: z
      .enum(["too_small", "too_large", "style", "quality", "other"])
      .nullable()
      .optional(),
    variant: z.enum(["control", "treatment"]).optional(),
  })
  .refine(
    (data) => {
      if (data.kept === false && (!data.returnReason || data.returnReason.trim() === "")) {
        return false;
      }
      return true;
    },
    {
      message: "returnReason is required when kept is false",
      path: ["returnReason"],
    }
  );

/**
 * Handle POST /api/feedback
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export const recordFeedback = async (req, res, next) => {
  try {
    const parseResult = feedbackBodySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: parseResult.error.issues
            ? parseResult.error.issues
                .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
                .join("; ")
            : parseResult.error.message,
        },
      });
    }

    const { userId, productId, sizeBought, kept, returnReason, variant } = parseResult.data;

    // Check if product exists (404 if missing)
    const product = await Product.findOne({ sku: productId }).lean();
    if (!product) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: `Product with SKU '${productId}' not found`,
        },
      });
    }

    // Persist purchase record
    await Purchase.create({
      storeId: req.store?.storeId || undefined,
      userId: userId || null,
      sku: productId,
      sizeBought,
      kept,
      returnReason: kept ? null : returnReason,
      variant: variant || null,
    });

    return res.status(200).json({ saved: true });
  } catch (error) {
    return next(error);
  }
};

export default {
  recordFeedback,
  feedbackBodySchema,
};
