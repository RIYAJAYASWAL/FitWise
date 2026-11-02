/**
 * Event Controller
 * Handles POST /api/events per FitWise API Contract §4.6.
 * Logs customer interaction events with storeId, visitorId, variant, type, sku, timestamp.
 */

import { z } from "zod";
import { Event } from "../models/Event.js";

/**
 * Zod validation schema for POST /api/events
 */
export const eventBodySchema = z.object({
  visitorId: z.string().min(1, "visitorId is required"),
  variant: z.enum(["control", "treatment"], {
    errorMap: () => ({ message: "variant must be either 'control' or 'treatment'" }),
  }),
  type: z.enum(
    [
      "widget_shown",
      "recommend_requested",
      "add_to_cart",
      "purchase",
      "return",
    ],
    {
      errorMap: () => ({
        message:
          "type must be one of: 'widget_shown', 'recommend_requested', 'add_to_cart', 'purchase', 'return'",
      }),
    }
  ),
  sku: z.string().optional(),
  experimentId: z.string().optional(),
  timestamp: z
    .union([z.string().datetime(), z.string(), z.date()])
    .optional(),
});

/**
 * Handle POST /api/events
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export const recordEvent = async (req, res, next) => {
  try {
    const parseResult = eventBodySchema.safeParse(req.body);

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

    const { visitorId, variant, type, sku, timestamp } = parseResult.data;
    const storeId = req.store?.storeId;

    if (!storeId) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Store context missing",
        },
      });
    }

    await Event.create({
      storeId,
      visitorId,
      variant,
      type,
      sku: sku ? sku.toUpperCase().trim() : undefined,
      experimentId: parseResult.data.experimentId || undefined,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });

    return res.status(200).json({ saved: true });
  } catch (error) {
    return next(error);
  }
};

export default {
  recordEvent,
  eventBodySchema,
};
