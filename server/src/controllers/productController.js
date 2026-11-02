/**
 * Product Controller
 * Handles GET /api/products and GET /api/products/:id/sizechart
 * Per FitWise API Contract §4.3 and §4.4.
 */

import { Product } from "../models/Product.js";
import { ChartFlag } from "../models/ChartFlag.js";

/**
 * List all products with current flagCount from ChartFlag.
 * Secret key required (Dashboard).
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export const listProducts = async (req, res, next) => {
  try {
    const products = await Product.find().lean();

    // Aggregate flag counts from ChartFlag per SKU
    const flagCounts = await ChartFlag.aggregate([
      { $group: { _id: "$sku", count: { $sum: 1 } } },
    ]);

    const flagMap = new Map(flagCounts.map((f) => [f._id, f.count]));

    const response = products.map((p) => ({
      sku: p.sku,
      name: p.name || p.sku,
      imageUrl: p.imageUrl || null,
      brand: p.brand,
      category: p.category,
      region: p.region,
      flagCount: flagMap.get(p.sku) || p.flagCount || 0,
    }));

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get product size chart, category, and region by product SKU or ID.
 * Public key allowed (Widget).
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export const getProductSizeChart = async (req, res, next) => {
  try {
    const productId = req.params.id;

    if (!productId || typeof productId !== "string") {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Product ID is required",
        },
      });
    }

    const product = await Product.findOne({ sku: productId }).lean();

    if (!product) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: `Product with SKU '${productId}' not found`,
        },
      });
    }

    return res.status(200).json({
      sku: product.sku,
      brand: product.brand,
      category: product.category,
      region: product.region,
      sizeChart: product.sizeChart,
    });
  } catch (error) {
    return next(error);
  }
};

export default {
  listProducts,
  getProductSizeChart,
};
