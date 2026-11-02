import { ChartFlag } from "../models/ChartFlag.js";
import { Product } from "../models/Product.js";
import { Recommendation } from "../models/Recommendation.js";

/**
 * GET /api/suggestions
 * Secret key only.
 *
 * Rules only (no AI):
 * 1. Each ChartFlag -> High: "Review the size chart for <name>"
 * 2. A category with lowConfidenceShare >= 30% -> Medium: "Add a measurement guide for <category>"
 * 3. A brand with 2+ flagged products -> Medium: "Review inconsistent size labels for <brand>"
 * topInsight = a one-sentence version of the highest-impact item (or null if no items).
 */
export const getSuggestions = async (req, res, next) => {
  try {
    const storeId = req.store?.storeId;

    // 1. Fetch products and build lookup maps
    const products = await Product.find().lean();
    const prodMap = new Map(products.map((p) => [p.sku, p]));

    // 2. Fetch Chart Flags
    const flags = await ChartFlag.find().lean();

    const items = [];

    // Rule 1: Each ChartFlag -> High impact "Review the size chart for <name>"
    for (const flag of flags) {
      const prod = prodMap.get(flag.sku);
      const name = prod?.name || flag.sku;
      const detail =
        flag.suggestedFix ||
        `${Math.round(flag.returnShare * 100)}% of size ${flag.size} orders were returned as ${
          flag.direction === "runs_small" ? "too small" : "too large"
        } (${flag.sampleSize} orders evaluated).`;

      items.push({
        id: `flag_${flag.sku}_${flag.size}`,
        title: `Review the size chart for ${name}`,
        detail,
        impact: "High",
        target: {
          route: "/chart-doctor",
          sku: flag.sku,
        },
      });
    }

    // Rule 2: A category with lowConfidenceShare >= 30% -> Medium "Add a measurement guide for <category>"
    const recQuery = {};
    if (storeId) {
      recQuery.$or = [{ storeId }, { storeId: { $exists: false } }, { storeId: null }];
    }
    const recommendations = await Recommendation.find(recQuery).lean();

    const catRecsMap = new Map();
    for (const rec of recommendations) {
      const prod = prodMap.get(rec.sku);
      const cat = prod?.category || "tshirt";
      if (!catRecsMap.has(cat)) {
        catRecsMap.set(cat, []);
      }
      catRecsMap.get(cat).push(rec);
    }

    for (const [cat, recs] of catRecsMap.entries()) {
      if (recs.length === 0) continue;
      const lowConfCount = recs.filter((r) => r.confidence < 0.5).length;
      const lowConfShare = lowConfCount / recs.length;

      if (lowConfShare >= 0.3) {
        const pct = Math.round(lowConfShare * 100);
        items.push({
          id: `guide_${cat}`,
          title: `Add a measurement guide for ${cat}`,
          detail: `${pct}% of ${cat} recommendations have low confidence (< 0.50). Adding a measurement guide will improve customer sizing precision.`,
          impact: "Medium",
          target: {
            route: "/products",
          },
        });
      }
    }

    // Rule 3: A brand with 2+ flagged products -> Medium "Review inconsistent size labels for <brand>"
    const brandFlaggedSkus = new Map();
    for (const flag of flags) {
      const prod = prodMap.get(flag.sku);
      const brand = prod?.brand;
      if (brand) {
        if (!brandFlaggedSkus.has(brand)) {
          brandFlaggedSkus.set(brand, new Set());
        }
        brandFlaggedSkus.get(brand).add(flag.sku);
      }
    }

    for (const [brand, skusSet] of brandFlaggedSkus.entries()) {
      if (skusSet.size >= 2) {
        items.push({
          id: `brand_${brand}`,
          title: `Review inconsistent size labels for ${brand}`,
          detail: `${brand} has ${skusSet.size} products flagged with size discrepancies. Consider reviewing sizing consistency across this brand.`,
          impact: "Medium",
          target: {
            route: "/chart-doctor",
          },
        });
      }
    }

    // Sort items: High first, then Medium, then Low
    const impactOrder = { High: 1, Medium: 2, Low: 3 };
    items.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);

    // topInsight = a one-sentence version of the highest-impact item
    let topInsight = null;
    if (items.length > 0) {
      const highest = items[0];
      topInsight = `${highest.title}: ${highest.detail}`;
    }

    return res.status(200).json({
      topInsight,
      items,
    });
  } catch (error) {
    return next(error);
  }
};

export default {
  getSuggestions,
};
