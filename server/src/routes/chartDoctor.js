/**
 * Chart Doctor Routes
 * Mounts:
 * - GET /api/chart-doctor/flags (Dashboard secret key required, §4.9)
 * - GET /api/chart-doctor/analysis?sku= (Dashboard secret key required)
 * - POST /api/chart-doctor/apply (Dashboard secret key required)
 * - POST /internal/chart-doctor/run (Protected by x-internal-key, §4.10)
 */

import { Router } from "express";
import { apiKey } from "../middleware/apiKey.js";
import { ChartFlag } from "../models/ChartFlag.js";
import { Product } from "../models/Product.js";
import { chartDoctorService } from "../services/chartDoctorService.js";
import { env } from "../config/env.js";

/**
 * Middleware protecting routes via the x-internal-key header.
 * Must match INTERNAL_KEY (shared microservice secret, not a store key).
 */
export const requireInternalKey = (req, res, next) => {
  const internalKey = req.headers["x-internal-key"];

  if (!internalKey || typeof internalKey !== "string" || internalKey !== env.INTERNAL_KEY) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or missing internal key in x-internal-key header",
      },
    });
  }

  return next();
};

/**
 * Handler for GET /api/chart-doctor/flags
 * Retrieves all products flagged by Chart Doctor.
 */
export const getChartFlags = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.sku) {
      filter.sku = req.query.sku.toUpperCase().trim();
    }

    const flags = await ChartFlag.find(filter)
      .select("sku size direction sampleSize returnShare suggestedFix updatedAt -_id")
      .lean();

    return res.status(200).json({ flags });
  } catch (error) {
    return next(error);
  }
};

/**
 * Handler for GET /api/chart-doctor/analysis?sku=
 * Evaluates flagged sizing issues for a product and computes suggested fix shifts.
 * For runs_small, shifts ranges DOWN by CHART_FIX_STEP_CM (default 2).
 * For runs_large, shifts ranges UP by CHART_FIX_STEP_CM.
 */
export const getChartAnalysis = async (req, res, next) => {
  try {
    const rawSku = req.query.sku;
    if (!rawSku || typeof rawSku !== "string" || !rawSku.trim()) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Query parameter 'sku' is required",
        },
      });
    }

    const sku = rawSku.toUpperCase().trim();
    const product = await Product.findOne({ sku });
    if (!product) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: `Product with SKU '${sku}' not found`,
        },
      });
    }

    const flags = await ChartFlag.find({ sku }).lean();
    const issues = flags.map(
      (f) =>
        f.suggestedFix ||
        `Size ${f.size} ${f.direction === "runs_small" ? "runs small" : "runs large"} (${Math.round(
          f.returnShare * 100
        )}% returned)`
    );

    let suggestedFix = null;
    if (flags.length > 0) {
      const step = Number(process.env.CHART_FIX_STEP_CM) || 2;
      const changes = [];

      for (const flag of flags) {
        const row = product.sizeChart.find((r) => r.size === flag.size);
        if (!row) continue;

        const rangeFields = ["chest", "waist", "hip", "shoulder", "bust", "length"];
        for (const field of rangeFields) {
          const range = row[field];
          if (Array.isArray(range) && range.length === 2 && typeof range[0] === "number") {
            const oldMin = range[0];
            const oldMax = range[1];
            let newMin, newMax;

            if (flag.direction === "runs_small") {
              // Shift DOWN by step
              newMin = Math.max(0, oldMin - step);
              newMax = Math.max(0, oldMax - step);
            } else {
              // Shift UP by step
              newMin = oldMin + step;
              newMax = oldMax + step;
            }

            changes.push({
              size: flag.size,
              field,
              from: [oldMin, oldMax],
              to: [newMin, newMax],
            });
          }
        }
      }

      const summaryParts = flags.map((f) =>
        f.direction === "runs_small"
          ? `Shift size ${f.size} ranges down by ${step} cm`
          : `Shift size ${f.size} ranges up by ${step} cm`
      );

      suggestedFix = {
        summary: summaryParts.join("; ") + ".",
        changes,
      };
    }

    return res.status(200).json({
      sku: product.sku,
      category: product.category,
      sizeChart: product.sizeChart,
      issues,
      suggestedFix,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Handler for POST /api/chart-doctor/apply
 * Validates ranges, updates Product.sizeChart, removes flags for changed sizes, returns new chart.
 */
export const applyChartFix = async (req, res, next) => {
  try {
    const { sku: rawSku, changes } = req.body || {};

    if (!rawSku || typeof rawSku !== "string" || !rawSku.trim()) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "sku is required",
        },
      });
    }

    if (!Array.isArray(changes) || changes.length === 0) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "changes must be a non-empty array",
        },
      });
    }

    const sku = rawSku.toUpperCase().trim();
    const product = await Product.findOne({ sku });
    if (!product) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: `Product with SKU '${sku}' not found`,
        },
      });
    }

    const validSizes = ["XS", "S", "M", "L", "XL", "XXL"];
    const changedSizes = new Set();

    for (let i = 0; i < changes.length; i++) {
      const ch = changes[i];
      if (!ch || typeof ch !== "object") {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: `Invalid change item at index ${i}`,
          },
        });
      }

      if (!validSizes.includes(ch.size)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: `Invalid size '${ch.size}' at index ${i}. Must be one of: ${validSizes.join(", ")}`,
          },
        });
      }

      if (!ch.field || typeof ch.field !== "string") {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: `field is required at index ${i}`,
          },
        });
      }

      if (
        !Array.isArray(ch.to) ||
        ch.to.length !== 2 ||
        typeof ch.to[0] !== "number" ||
        typeof ch.to[1] !== "number" ||
        ch.to[0] >= ch.to[1] ||
        ch.to[0] < 0
      ) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: `Invalid range 'to' at index ${i}. Expected [min, max] with min < max and min >= 0`,
          },
        });
      }

      changedSizes.add(ch.size);
    }

    // Apply changes to product.sizeChart
    const updatedSizeChart = product.sizeChart.map((row) => {
      const rowObj = typeof row.toObject === "function" ? row.toObject() : { ...row };
      for (const ch of changes) {
        if (ch.size === rowObj.size) {
          rowObj[ch.field] = ch.to;
        }
      }
      return rowObj;
    });

    product.sizeChart = updatedSizeChart;
    product.markModified("sizeChart");

    // Remove flags for the changed sizes
    await ChartFlag.deleteMany({
      sku: product.sku,
      size: { $in: Array.from(changedSizes) },
    });

    // Update remaining flagCount
    const remainingFlags = await ChartFlag.countDocuments({ sku: product.sku });
    product.flagCount = remainingFlags;

    await product.save();

    return res.status(200).json({
      sku: product.sku,
      sizeChart: product.sizeChart,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Handler for POST /internal/chart-doctor/run (and POST /api/chart-doctor/run)
 * Triggers the Chart Doctor aggregation algorithm.
 */
export const runChartDoctor = async (req, res, next) => {
  try {
    const flagged = await chartDoctorService.run();
    return res.status(200).json({ flagged });
  } catch (error) {
    return next(error);
  }
};

// Router for /api/chart-doctor
export const chartDoctorRouter = Router();
chartDoctorRouter.get("/flags", apiKey("secret"), getChartFlags);
chartDoctorRouter.get("/analysis", apiKey("secret"), getChartAnalysis);
chartDoctorRouter.post("/apply", apiKey("secret"), applyChartFix);
chartDoctorRouter.post("/run", requireInternalKey, runChartDoctor);

// Router for /internal/chart-doctor
export const internalChartDoctorRouter = Router();
internalChartDoctorRouter.post("/run", requireInternalKey, runChartDoctor);

export default chartDoctorRouter;
