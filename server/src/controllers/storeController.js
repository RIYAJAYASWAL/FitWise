import { Store } from "../models/Store.js";
import { Product } from "../models/Product.js";

/**
 * Store Controller
 * Handles:
 * - GET /api/store -> { name, ownerName, website, productCount, createdAt }
 * - PUT /api/store { name, ownerName, website }
 * Secret key only.
 */

export const getStore = async (req, res, next) => {
  try {
    const store = req.store;
    if (!store) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Store context missing",
        },
      });
    }

    const productCount = await Product.countDocuments();

    return res.status(200).json({
      name: store.name,
      ownerName: store.ownerName || "Demo Owner",
      website: store.website || "https://demo.fitwise.store",
      productCount,
      createdAt: store.createdAt,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateStore = async (req, res, next) => {
  try {
    const store = req.store;
    if (!store) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Store context missing",
        },
      });
    }

    const { name, ownerName, website } = req.body || {};

    const updates = {};
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "name must be a non-empty string",
          },
        });
      }
      updates.name = name.trim();
    }

    if (ownerName !== undefined) {
      if (typeof ownerName !== "string" || !ownerName.trim()) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "ownerName must be a non-empty string",
          },
        });
      }
      updates.ownerName = ownerName.trim();
    }

    if (website !== undefined) {
      if (typeof website !== "string" || !website.trim()) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "website must be a non-empty string",
          },
        });
      }
      updates.website = website.trim();
    }

    const updatedStore = await Store.findByIdAndUpdate(store._id, updates, {
      new: true,
    });

    const productCount = await Product.countDocuments();

    return res.status(200).json({
      name: updatedStore.name,
      ownerName: updatedStore.ownerName,
      website: updatedStore.website,
      productCount,
      createdAt: updatedStore.createdAt,
    });
  } catch (error) {
    return next(error);
  }
};

export default {
  getStore,
  updateStore,
};
