/**
 * API Key Authentication Middleware
 * Enforces authentication via the x-api-key header per API Contract §2.1.
 * Supports "public" (accepts publishable or secret key) and "secret" (accepts secret key only).
 * Raw keys are hashed with SHA-256 before database lookup.
 */

import crypto from "crypto";
import { Store } from "../models/Store.js";

/**
 * Creates an Express middleware to enforce API key authentication.
 *
 * @param {"public"|"secret"} [requiredScope="public"] - "public" allows publishable or secret keys; "secret" requires secret key only.
 * @returns {import("express").RequestHandler}
 */
export const apiKey = (requiredScope = "public") => {
  return async (req, res, next) => {
    // Open access for health check endpoint
    if (req.path === "/health" || req.originalUrl === "/health") {
      return next();
    }

    const rawKey = req.headers["x-api-key"];

    if (!rawKey || typeof rawKey !== "string" || !rawKey.trim()) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Missing API key in x-api-key header",
        },
      });
    }

    try {
      const keyHash = crypto
        .createHash("sha256")
        .update(rawKey.trim())
        .digest("hex");

      const store = await Store.findOne({
        $or: [{ publicKeyHash: keyHash }, { secretKeyHash: keyHash }],
      });

      if (!store) {
        return res.status(401).json({
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid API key",
          },
        });
      }

      const isSecret = store.secretKeyHash === keyHash;
      const isPublic = store.publicKeyHash === keyHash;

      req.store = store;
      req.keyType = isSecret ? "secret" : "public";

      if (requiredScope === "secret" && !isSecret) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Secret key required for this resource",
          },
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

export default apiKey;
