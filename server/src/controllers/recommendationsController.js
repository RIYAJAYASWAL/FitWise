import { Recommendation } from "../models/Recommendation.js";
import { Purchase } from "../models/Purchase.js";
import { Product } from "../models/Product.js";

/**
 * GET /api/recommendations?status=all|pending|kept|returned&page=1&limit=20&days=30
 * Protected by secret key.
 *
 * Returns { items: [{ id, sku, name, brand, category, imageUrl, size, confidence, status, createdAt }], total, counts }
 * status = 'kept' or 'returned' from matching Purchase (same userId and sku, after recommendation) or direct status; 'pending' if none.
 */
export const getRecommendations = async (req, res, next) => {
  try {
    const storeId = req.store?.storeId;
    const { status = "all", page = 1, limit = 20, days, from, to } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

    const validStatuses = ["all", "pending", "kept", "returned"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: `status must be one of: ${validStatuses.join(", ")}`,
        },
      });
    }

    // 1. Fetch store's recommendations sorted newest first
    const recQuery = {};
    if (storeId) {
      recQuery.$or = [{ storeId }, { storeId: { $exists: false } }, { storeId: null }];
    }

    // Optional date range filter on query
    if (days && !isNaN(parseInt(days, 10)) && parseInt(days, 10) > 0) {
      const cutoff = new Date(Date.now() - parseInt(days, 10) * 86400000);
      recQuery.createdAt = { $gte: cutoff };
    } else if (from || to) {
      recQuery.createdAt = {};
      if (from && !isNaN(Date.parse(from))) {
        recQuery.createdAt.$gte = new Date(from);
      }
      if (to && !isNaN(Date.parse(to))) {
        recQuery.createdAt.$lte = new Date(to);
      }
    }

    const allRecs = await Recommendation.find(recQuery).sort({ createdAt: -1 }).lean();

    // 2. Fetch products to attach name, brand, category, imageUrl
    const skus = [...new Set(allRecs.map((r) => r.sku))];
    const products = await Product.find({ sku: { $in: skus } }).lean();
    const productMap = new Map(products.map((p) => [p.sku, p]));

    // 3. Fetch potential matching purchases
    const userIds = [...new Set(allRecs.map((r) => r.userId).filter(Boolean))];
    const purchaseQuery = { sku: { $in: skus } };
    if (userIds.length > 0) {
      purchaseQuery.userId = { $in: userIds };
    }
    const purchases = await Purchase.find(purchaseQuery).sort({ createdAt: 1 }).lean();

    // Group purchases by userId:sku
    const purchasesByUserSku = new Map();
    for (const pur of purchases) {
      if (!pur.userId || !pur.sku) continue;
      const key = `${pur.userId}:${pur.sku}`;
      if (!purchasesByUserSku.has(key)) {
        purchasesByUserSku.set(key, []);
      }
      purchasesByUserSku.get(key).push(pur);
    }

    // 4. Compute status for all recommendations and count by status
    const counts = {
      all: allRecs.length,
      pending: 0,
      kept: 0,
      returned: 0,
    };

    const resolvedItems = [];
    for (const rec of allRecs) {
      let recStatus = rec.status || "pending";

      // If status is not explicitly set or is pending, look for matching purchase
      if (recStatus === "pending" && rec.userId && rec.sku) {
        const key = `${rec.userId}:${rec.sku}`;
        const userSkuPurchases = purchasesByUserSku.get(key) || [];
        const matchingPurchase = userSkuPurchases.find(
          (p) => new Date(p.createdAt) >= new Date(rec.createdAt)
        );

        if (matchingPurchase) {
          recStatus = matchingPurchase.kept ? "kept" : "returned";
        }
      }

      if (counts[recStatus] !== undefined) {
        counts[recStatus]++;
      }

      // Check status filter for pagination list
      if (status === "all" || recStatus === status) {
        const prod = productMap.get(rec.sku) || {};
        resolvedItems.push({
          id: rec._id.toString(),
          sku: rec.sku,
          name: prod.name || rec.sku,
          brand: prod.brand || "",
          category: prod.category || "",
          imageUrl: prod.imageUrl || null,
          size: rec.predictedSize,
          confidence: rec.confidence,
          status: recStatus,
          createdAt: rec.createdAt,
        });
      }
    }

    // 5. Pagination
    const total = resolvedItems.length;
    const startIndex = (pageNum - 1) * limitNum;
    const items = resolvedItems.slice(startIndex, startIndex + limitNum);

    return res.status(200).json({ items, total, counts });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/recommendations/:id
 * Protected by secret key.
 * Body: { status: "pending" | "kept" | "returned" }
 * Updates the recommendation status directly.
 */
export const updateRecommendationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    const validStatuses = ["pending", "kept", "returned"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: `status must be one of: ${validStatuses.join(", ")}`,
        },
      });
    }

    const rec = await Recommendation.findById(id);
    if (!rec) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Recommendation not found",
        },
      });
    }

    rec.status = status;
    await rec.save();

    // Also update or insert matching purchase if kept/returned
    if (rec.userId && rec.sku) {
      if (status === "kept" || status === "returned") {
        const isKept = status === "kept";
        await Purchase.findOneAndUpdate(
          {
            userId: rec.userId,
            sku: rec.sku,
            createdAt: { $gte: rec.createdAt },
          },
          {
            $set: {
              storeId: rec.storeId,
              userId: rec.userId,
              sku: rec.sku,
              sizeBought: rec.predictedSize,
              kept: isKept,
              returnReason: isKept ? null : "too_small",
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          { upsert: true, new: true }
        );
      } else if (status === "pending") {
        // Remove purchase if resetting to pending
        await Purchase.deleteMany({
          userId: rec.userId,
          sku: rec.sku,
          createdAt: { $gte: rec.createdAt },
        });
      }
    }

    const prod = await Product.findOne({ sku: rec.sku }).lean();

    return res.status(200).json({
      success: true,
      item: {
        id: rec._id.toString(),
        sku: rec.sku,
        name: prod?.name || rec.sku,
        brand: prod?.brand || "",
        category: prod?.category || "",
        imageUrl: prod?.imageUrl || null,
        size: rec.predictedSize,
        confidence: rec.confidence,
        status: rec.status,
        createdAt: rec.createdAt,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export default {
  getRecommendations,
  updateRecommendationStatus,
};
