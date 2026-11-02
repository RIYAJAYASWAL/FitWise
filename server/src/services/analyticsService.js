/**
 * Analytics Service
 * Provides size and recommendation summary analytics (API Contract §4.8)
 * and statistical A/B experiment evaluation (API Contract §4.7).
 */

import { Recommendation } from "../models/Recommendation.js";
import { Purchase } from "../models/Purchase.js";
import { Experiment } from "../models/Experiment.js";
import { Event } from "../models/Event.js";

/**
 * Abramowitz & Stegun approximation for the error function erf(x).
 * Formula 7.1.26 (max error < 1.5e-7).
 *
 * @param {number} x
 * @returns {number}
 */
export function erf(x) {
  if (x === 0) return 0;
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * absX);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return sign * y;
}

/**
 * Cumulative distribution function of the standard normal distribution Φ(x).
 *
 * @param {number} x
 * @returns {number}
 */
export function normalCdf(x) {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

/**
 * Computes two-proportion z-test statistics:
 * - controlRate = x1 / n1
 * - treatmentRate = x2 / n2
 * - diff = treatmentRate - controlRate
 * - 95% Confidence Interval for (p2 - p1) using unpooled standard error
 * - Two-tailed p-value using pooled standard error
 * - significant = pValue < 0.05
 *
 * @param {number} x1 - Control successes
 * @param {number} n1 - Control trials
 * @param {number} x2 - Treatment successes
 * @param {number} n2 - Treatment trials
 * @returns {{ controlRate: number, treatmentRate: number, diff: number, ci95: [number, number], pValue: number, significant: boolean }}
 */
export function twoPropZTest(x1, n1, x2, n2) {
  if (n1 <= 0 || n2 <= 0) {
    return {
      controlRate: 0,
      treatmentRate: 0,
      diff: 0,
      ci95: [0, 0],
      pValue: 1.0,
      significant: false,
    };
  }

  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const diff = p2 - p1;

  // Unpooled Standard Error for 95% Confidence Interval
  const seCi = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  const zCrit = 1.96;
  const me = zCrit * seCi;
  const ci95 = [
    Number((diff - me).toFixed(4)),
    Number((diff + me).toFixed(4)),
  ];

  // Pooled Standard Error for Hypothesis Testing
  const pooledP = (x1 + x2) / (n1 + n2);
  const sePool = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

  let pValue = 1.0;
  if (sePool > 0) {
    const z = Math.abs(diff) / sePool;
    pValue = 2 * (1 - normalCdf(z));
  } else if (p1 === p2) {
    pValue = 1.0;
  } else {
    pValue = 0.0;
  }

  // Ensure pValue stays strictly in [0, 1]
  pValue = Math.max(0, Math.min(1, pValue));

  const roundedPValue = Number(pValue.toFixed(4));
  const significant = roundedPValue < 0.05;

  return {
    controlRate: Number(p1.toFixed(4)),
    treatmentRate: Number(p2.toFixed(4)),
    diff: Number(diff.toFixed(4)),
    ci95,
    pValue: roundedPValue,
    significant,
  };
}

import { Product } from "../models/Product.js";

/**
 * Computes analytics metrics for a specific date filter.
 */
async function computePeriodMetrics(storeId, dateFilter, productsMap) {
  const recQuery = {};
  const purQuery = {};

  if (storeId) {
    const hasScopedRecs = await Recommendation.exists({ storeId });
    if (hasScopedRecs) {
      recQuery.storeId = storeId;
    } else {
      recQuery.$or = [
        { storeId },
        { storeId: { $exists: false } },
        { storeId: null },
      ];
    }

    const hasScopedPurchases = await Purchase.exists({ storeId });
    if (hasScopedPurchases) {
      purQuery.storeId = storeId;
    } else {
      purQuery.$or = [
        { storeId },
        { storeId: { $exists: false } },
        { storeId: null },
      ];
    }
  }

  if (Object.keys(dateFilter).length > 0) {
    recQuery.createdAt = dateFilter;
    purQuery.createdAt = dateFilter;
  }

  const recommendations = await Recommendation.find(recQuery).lean();
  const purchases = await Purchase.find(purQuery).lean();

  // Widget shown events for conversionRate calculation
  const eventQuery = { type: "widget_shown" };
  if (storeId) {
    eventQuery.storeId = storeId;
  }
  if (Object.keys(dateFilter).length > 0) {
    eventQuery.timestamp = dateFilter;
  }
  const widgetShownCount = await Event.countDocuments(eventQuery);

  const totalRecs = recommendations.length;
  let totalConfidence = 0;
  let lowConfidenceCount = 0;

  const sizeDistribution = {
    XS: 0,
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
    XXL: 0,
  };

  for (const rec of recommendations) {
    if (rec.predictedSize && sizeDistribution[rec.predictedSize] !== undefined) {
      sizeDistribution[rec.predictedSize]++;
    }
    const conf = typeof rec.confidence === "number" ? rec.confidence : 0;
    totalConfidence += conf;
    if (conf < 0.5) {
      lowConfidenceCount++;
    }
  }

  const avgConfidence =
    totalRecs > 0 ? Number((totalConfidence / totalRecs).toFixed(2)) : 0;
  const lowConfidenceShare =
    totalRecs > 0 ? Number((lowConfidenceCount / totalRecs).toFixed(3)) : 0;

  const totalPurchases = purchases.length;
  const returnCount = purchases.filter((p) => p.kept === false).length;
  const returnRate =
    totalPurchases > 0 ? Number((returnCount / totalPurchases).toFixed(3)) : 0;

  const totalOrders = totalPurchases;
  const conversionRate =
    widgetShownCount > 0 ? Number((totalPurchases / widgetShownCount).toFixed(4)) : 0;

  // Active brands: distinct brands among active purchases/recommendations or products
  const activeSkus = new Set([
    ...purchases.map((p) => p.sku),
    ...recommendations.map((r) => r.sku),
  ]);
  const activeBrandsSet = new Set();
  for (const sku of activeSkus) {
    const prod = productsMap.get(sku);
    if (prod?.brand) activeBrandsSet.add(prod.brand);
  }
  const activeBrands =
    activeBrandsSet.size > 0
      ? activeBrandsSet.size
      : new Set(Array.from(productsMap.values()).map((p) => p.brand).filter(Boolean)).size;

  // Top categories with share
  const catCounts = {};
  const dataSource = recommendations.length > 0 ? recommendations : purchases;
  for (const item of dataSource) {
    const prod = productsMap.get(item.sku);
    const cat = prod?.category || "tshirt";
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  }
  const totalCatItems = dataSource.length;
  const topCategories = Object.entries(catCounts)
    .map(([category, count]) => ({
      category,
      share: totalCatItems > 0 ? Number((count / totalCatItems).toFixed(3)) : 0,
    }))
    .sort((a, b) => b.share - a.share);

  return {
    recommendations: totalRecs,
    avgConfidence,
    sizeDistribution,
    returnRate,
    lowConfidenceShare,
    totalOrders,
    conversionRate,
    activeBrands,
    topCategories,
  };
}

/**
 * Computes high-level store size and recommendation analytics for a specified date range.
 * Includes totalOrders, conversionRate, activeBrands, topCategories, and previous period metrics.
 *
 * @param {string} storeId - Store identifier
 * @param {string|Date} [from] - Optional start date (ISO string or Date)
 * @param {string|Date} [to] - Optional end date (ISO string or Date)
 */
export async function summary(storeId, from, to) {
  const products = await Product.find().lean();
  const productsMap = new Map(products.map((p) => [p.sku, p]));

  const now = Date.now();
  const toTime = to && !isNaN(new Date(to).getTime()) ? new Date(to).getTime() : now;
  const fromTime = from && !isNaN(new Date(from).getTime()) ? new Date(from).getTime() : toTime - 30 * 86400000;

  const currentDateFilter = {
    $gte: new Date(fromTime),
    $lte: new Date(toTime),
  };

  const currentMetrics = await computePeriodMetrics(storeId, currentDateFilter, productsMap);

  // Equal-length previous period
  const duration = Math.max(86400000, toTime - fromTime);
  const prevFromTime = fromTime - duration;
  const prevToTime = fromTime;

  const prevDateFilter = {
    $gte: new Date(prevFromTime),
    $lt: new Date(prevToTime),
  };

  const previousMetrics = await computePeriodMetrics(storeId, prevDateFilter, productsMap);

  return {
    ...currentMetrics,
    previous: previousMetrics,
  };
}

/**
 * Computes weekly trend data for widget vs standard fit experience.
 * widget = 1 - size-related return rate among treatment purchases
 * standard = same for control
 * null when a bucket has fewer than 20 purchases.
 *
 * @param {string} storeId
 * @param {string} [from]
 * @param {string} [to]
 * @returns {Promise<{ points: Array<{ date: string, widget: number|null, standard: number|null }> }>}
 */
export async function trend(storeId, from, to) {
  const purQuery = {};
  if (storeId) {
    const hasScopedPurchases = await Purchase.exists({ storeId });
    if (hasScopedPurchases) {
      purQuery.storeId = storeId;
    } else {
      purQuery.$or = [{ storeId }, { storeId: { $exists: false } }, { storeId: null }];
    }
  }

  const now = Date.now();
  const toTime = to && !isNaN(new Date(to).getTime()) ? new Date(to).getTime() : now;
  // Default to 12 weeks lookback if 'from' is omitted
  const fromTime = from && !isNaN(new Date(from).getTime()) ? new Date(from).getTime() : toTime - 12 * 7 * 86400000;

  purQuery.createdAt = {
    $gte: new Date(fromTime),
    $lte: new Date(toTime),
  };

  const purchases = await Purchase.find(purQuery).lean();

  const points = [];
  const ONE_WEEK_MS = 7 * 86400000;
  let currentStart = fromTime;

  while (currentStart < toTime) {
    const currentEnd = Math.min(currentStart + ONE_WEEK_MS, toTime + 1);
    const bucketPurchases = purchases.filter((p) => {
      const pTime = new Date(p.createdAt).getTime();
      return pTime >= currentStart && pTime < currentEnd;
    });

    const treatment = bucketPurchases.filter((p) => p.variant === "treatment");
    const control = bucketPurchases.filter((p) => p.variant === "control");

    let widget = null;
    if (treatment.length >= 20) {
      const sizeReturns = treatment.filter(
        (p) => !p.kept && (p.returnReason === "too_small" || p.returnReason === "too_large")
      ).length;
      widget = Number((1 - sizeReturns / treatment.length).toFixed(4));
    }

    let standard = null;
    if (control.length >= 20) {
      const sizeReturns = control.filter(
        (p) => !p.kept && (p.returnReason === "too_small" || p.returnReason === "too_large")
      ).length;
      standard = Number((1 - sizeReturns / control.length).toFixed(4));
    }

    const dateStr = new Date(currentStart).toISOString().split("T")[0];
    points.push({
      date: dateStr,
      widget,
      standard,
    });

    currentStart += ONE_WEEK_MS;
  }

  return { points };
}

/**
 * Computes statistical comparison between control and treatment variants for an experiment.
 *
 * @param {string} storeId - Store identifier
 * @param {string} experimentId - Experiment identifier
 * @returns {Promise<Object|null>} Returns results object matching API Contract §4.7 or null if not found
 */
export async function experimentResults(storeId, experimentId) {
  // 1. Verify experiment exists and belongs to this store
  const experiment = await Experiment.findOne({ storeId, experimentId }).lean();
  if (!experiment) {
    return null;
  }

  // 2. Fetch events belonging to this store and experiment
  const hasExpEvents = await Event.exists({ storeId, experimentId });
  const eventFilter = hasExpEvents
    ? { storeId, experimentId }
    : { storeId };

  const events = await Event.find(eventFilter).lean();

  const controlEvents = events.filter((e) => e.variant === "control");
  const treatmentEvents = events.filter((e) => e.variant === "treatment");

  // Distinct visitor counts per variant
  const controlVisitors = new Set(controlEvents.map((e) => e.visitorId)).size;
  const treatmentVisitors = new Set(treatmentEvents.map((e) => e.visitorId)).size;

  // Counts of interaction event types per variant
  const controlAddToCart = controlEvents.filter((e) => e.type === "add_to_cart").length;
  const treatmentAddToCart = treatmentEvents.filter((e) => e.type === "add_to_cart").length;

  const controlPurchases = controlEvents.filter((e) => e.type === "purchase").length;
  const treatmentPurchases = treatmentEvents.filter((e) => e.type === "purchase").length;

  const controlReturns = controlEvents.filter((e) => e.type === "return").length;
  const treatmentReturns = treatmentEvents.filter((e) => e.type === "return").length;

  const control = {
    visitors: controlVisitors,
    addToCart: controlAddToCart,
    purchases: controlPurchases,
    returns: controlReturns,
  };

  const treatment = {
    visitors: treatmentVisitors,
    addToCart: treatmentAddToCart,
    purchases: treatmentPurchases,
    returns: treatmentReturns,
  };

  // 3. Compute metrics: add_to_cart_rate, conversion_rate, return_rate
  const atcMetric = {
    name: "add_to_cart_rate",
    ...twoPropZTest(
      control.addToCart,
      control.visitors,
      treatment.addToCart,
      treatment.visitors
    ),
  };

  const convMetric = {
    name: "conversion_rate",
    ...twoPropZTest(
      control.purchases,
      control.visitors,
      treatment.purchases,
      treatment.visitors
    ),
  };

  const retMetric = {
    name: "return_rate",
    ...twoPropZTest(
      control.returns,
      control.purchases,
      treatment.returns,
      treatment.purchases
    ),
  };

  // 4. Sample size warning: if any group has fewer than 100 visitors
  const warning =
    control.visitors < 100 || treatment.visitors < 100
      ? "Sample too small to conclude"
      : null;

  return {
    experimentId,
    control,
    treatment,
    metrics: [atcMetric, convMetric, retMetric],
    warning,
  };
}

export const analyticsService = {
  summary,
  trend,
  experimentResults,
  erf,
  normalCdf,
  twoPropZTest,
};

export default analyticsService;
