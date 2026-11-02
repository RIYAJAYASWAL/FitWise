/**
 * Chart Doctor Service
 * Aggregates order return reasons over the last 90 days to identify
 * size chart discrepancies (products that run small or run large).
 * Per API Contract §4.9 and §4.10.
 */

import { Purchase } from "../models/Purchase.js";
import { Product } from "../models/Product.js";
import { ChartFlag } from "../models/ChartFlag.js";
import { env } from "../config/env.js";

/**
 * Runs the Chart Doctor aggregation algorithm.
 *
 * For each product and size, evaluates purchases over the last 90 days:
 * - Minimum orders threshold: env.CHART_MIN_ORDERS (default 30)
 * - Size-related return share threshold: env.CHART_THRESHOLD (default 0.25 / 25%)
 *
 * Upserts qualifying ChartFlag documents, removes flags that no longer qualify,
 * syncs Product.flagCount, and returns the total number of flagged items.
 *
 * @param {Object} [options]
 * @param {number} [options.minOrders] - Override min orders threshold
 * @param {number} [options.threshold] - Override return share threshold
 * @param {number} [options.days] - Number of days to look back (default 90)
 * @returns {Promise<number>} Number of active flags
 */
export async function run(options = {}) {
  const minOrders =
    typeof options.minOrders === "number"
      ? options.minOrders
      : env.CHART_MIN_ORDERS || 30;

  const threshold =
    typeof options.threshold === "number"
      ? options.threshold
      : env.CHART_THRESHOLD || 0.25;

  const days = typeof options.days === "number" ? options.days : 90;
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // 1. Fetch all purchases within the configured window
  const purchases = await Purchase.find({
    createdAt: { $gte: cutoffDate },
  }).lean();

  // 2. Group purchases by sku and sizeBought
  const groups = new Map();
  for (const purchase of purchases) {
    if (!purchase.sku || !purchase.sizeBought) continue;
    const key = `${purchase.sku}:${purchase.sizeBought}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(purchase);
  }

  // 3. Evaluate each (sku, size) group against thresholds
  const qualifyingFlags = [];

  for (const [key, orders] of groups.entries()) {
    const [sku, size] = key.split(":");
    const sampleSize = orders.length;

    // Check minimum orders threshold
    if (sampleSize < minOrders) {
      continue;
    }

    const smallReturns = orders.filter(
      (o) => o.kept === false && o.returnReason === "too_small"
    ).length;

    const largeReturns = orders.filter(
      (o) => o.kept === false && o.returnReason === "too_large"
    ).length;

    const totalSizeReturns = smallReturns + largeReturns;
    const sizeReturnShare = totalSizeReturns / sampleSize;

    // Check return share threshold (e.g. >= 25%)
    if (sizeReturnShare < threshold) {
      continue;
    }

    // Direction: too_small dominates vs too_large
    const isRunsSmall = smallReturns >= largeReturns;
    const direction = isRunsSmall ? "runs_small" : "runs_large";
    const dominantCount = isRunsSmall ? smallReturns : largeReturns;

    const returnShare = Number((dominantCount / sampleSize).toFixed(2));
    const pct = Math.round(returnShare * 100);

    const suggestedFix = isRunsSmall
      ? `${pct}% of size ${size} orders were returned as too small. Consider sizing the chart up or adding a note.`
      : `${pct}% of size ${size} orders were returned as too large. Consider sizing the chart down or adding a note.`;

    qualifyingFlags.push({
      sku,
      size,
      direction,
      sampleSize,
      returnShare,
      suggestedFix,
    });
  }

  // 4. Upsert qualifying flags
  const qualifiedKeys = new Set();
  for (const flag of qualifyingFlags) {
    const key = `${flag.sku}:${flag.size}`;
    qualifiedKeys.add(key);

    await ChartFlag.findOneAndUpdate(
      { sku: flag.sku, size: flag.size },
      {
        sku: flag.sku,
        size: flag.size,
        direction: flag.direction,
        sampleSize: flag.sampleSize,
        returnShare: flag.returnShare,
        suggestedFix: flag.suggestedFix,
        updatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  // 5. Remove flags that no longer qualify
  const existingFlags = await ChartFlag.find().lean();
  for (const existing of existingFlags) {
    const key = `${existing.sku}:${existing.size}`;
    if (!qualifiedKeys.has(key)) {
      await ChartFlag.deleteOne({ _id: existing._id });
    }
  }

  // 6. Update Product.flagCount for all products
  const flagCounts = await ChartFlag.aggregate([
    { $group: { _id: "$sku", count: { $sum: 1 } } },
  ]);
  const flagMap = new Map(flagCounts.map((f) => [f._id, f.count]));
  const products = await Product.find({}, "sku").lean();
  for (const prod of products) {
    const count = flagMap.get(prod.sku) || 0;
    await Product.updateOne({ sku: prod.sku }, { flagCount: count });
  }

  return qualifyingFlags.length;
}

export const chartDoctorService = {
  run,
};

export default chartDoctorService;
