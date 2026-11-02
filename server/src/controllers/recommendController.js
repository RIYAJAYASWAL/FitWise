/**
 * Recommendation Controller
 * Handles POST /api/recommend per FitWise API Contract §4.1.
 */

import { z } from "zod";
import { Product } from "../models/Product.js";
import { Purchase } from "../models/Purchase.js";
import { ChartFlag } from "../models/ChartFlag.js";
import { Recommendation } from "../models/Recommendation.js";
import { REQUIRED_MEASUREMENTS, MEASUREMENT_RANGES } from "../data/categories.js";
import { toRegionSize } from "../services/regionService.js";
import cacheService from "../services/cacheService.js";
import mlClient from "../services/mlClient.js";

/**
 * Zod schema for POST /api/recommend request body
 */
export const recommendBodySchema = z.object({
  productId: z.string().min(1, "productId is required"),
  measurements: z
    .record(z.string(), z.union([z.number(), z.string()]))
    .refine((m) => Object.keys(m).length > 0, {
      message: "measurements must contain body measurement values",
    }),
  userId: z.string().optional(),
  visitorId: z.string().optional(),
  region: z.enum(["US", "UK", "EU", "IN"]).optional(),
});

/**
 * Handle POST /api/recommend
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export const getRecommendation = async (req, res, next) => {
  try {
    // 1. Zod validation of request body
    const parseResult = recommendBodySchema.safeParse(req.body);
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

    const { productId, measurements: rawMeasurements, userId, visitorId, region } =
      parseResult.data;

    // Convert string numeric measurements to numbers
    const measurements = {};
    for (const [key, val] of Object.entries(rawMeasurements)) {
      const numVal = Number(val);
      if (isNaN(numVal)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: `Measurement '${key}' must be a valid number`,
          },
        });
      }
      measurements[key] = numVal;
    }

    // 2. Load Product (404 if missing)
    const product = await Product.findOne({ sku: productId }).lean();
    if (!product) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: `Product with SKU '${productId}' not found`,
        },
      });
    }

    // 3. Validate measurements match the product's category requirements & ranges
    const requiredFields = REQUIRED_MEASUREMENTS[product.category];
    if (!requiredFields) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: `Category '${product.category}' is not supported`,
        },
      });
    }

    const missingFields = requiredFields.filter(
      (field) => measurements[field] === undefined || measurements[field] === null
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: `Missing required measurements for category '${product.category}': ${missingFields.join(", ")}`,
        },
      });
    }

    // Validate measurement ranges
    for (const field of requiredFields) {
      const val = measurements[field];
      const range = MEASUREMENT_RANGES[field];
      if (range && (val < range.min || val > range.max)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: `Measurement '${field}' value ${val} is outside allowed range (${range.min}-${range.max})`,
          },
        });
      }
    }

    // 4. Cache Lookup
    const storeId = req.store?.storeId || "default";
    const cacheKey = cacheService.makeKey(storeId, product.sku, measurements);
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return res.status(200).json(cached);
    }

    // 5. Load User Purchase History (if userId provided)
    let history = [];
    if (userId) {
      const purchases = await Purchase.find({ userId })
        .select("sizeBought kept -_id")
        .lean();
      history = purchases.map((p) => ({
        sizeBought: p.sizeBought,
        kept: p.kept,
      }));
    }

    // 6. Check Product's ChartFlag bias (runs_small = +1, runs_large = -1, else 0)
    let bias = 0;
    const flag = await ChartFlag.findOne({ sku: product.sku }).lean();
    if (flag) {
      if (flag.direction === "runs_small") {
        bias = 1;
      } else if (flag.direction === "runs_large") {
        bias = -1;
      }
    }

    // 7. Predict optimal size via ML microservice
    const mlResult = await mlClient.predict({
      category: product.category,
      measurements,
      sizeChart: product.sizeChart,
      history,
      bias,
    });

    // 8. Convert recommended size to regionSize
    const targetRegion = region || product.region || "US";
    const regionSize =
      toRegionSize(mlResult.recommendedSize, targetRegion, product.category) ||
      mlResult.recommendedSize;

    // 9. Low confidence indicator (confidence < 0.5)
    const lowConfidence = mlResult.confidence < 0.5;

    // 10. Persist recommendation in database
    await Recommendation.create({
      storeId: req.store?.storeId || undefined,
      userId: userId || visitorId || null,
      sku: product.sku,
      predictedSize: mlResult.recommendedSize,
      confidence: mlResult.confidence,
      status: "pending",
    });

    // 11. Format response payload and save in cache (TTL 3600)
    const responsePayload = {
      recommendedSize: mlResult.recommendedSize,
      regionSize,
      confidence: mlResult.confidence,
      alternatives: mlResult.alternatives,
      explanation: mlResult.explanation,
      lowConfidence,
    };

    await cacheService.set(cacheKey, responsePayload, 3600);

    // 12. Return response
    return res.status(200).json(responsePayload);
  } catch (error) {
    if (error.status === 503 || error.code === "ML_UNAVAILABLE") {
      return res.status(503).json({
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Downstream ML service is unavailable",
        },
      });
    }
    return next(error);
  }
};

export default {
  getRecommendation,
  recommendBodySchema,
};
