/**
 * Regional Size Conversion Service
 * Provides conversions between standard sizes (XS..XXL) and regional display labels
 * across US, UK, EU, and IN markets.
 */

import {
  STANDARD_SIZES,
  REGIONS,
  REGION_SIZES,
  REVERSE_REGION_SIZES,
} from "../data/regionSizes.js";
import { CATEGORIES } from "../data/categories.js";

/**
 * Converts a standard size (XS..XXL) to a regional size label.
 *
 * @param {string} size - Standard size (XS, S, M, L, XL, XXL)
 * @param {string} [region="US"] - Region code (US, UK, EU, IN)
 * @param {string} [category="tshirt"] - Product category (tshirt, jeans, kurta, blouse)
 * @returns {string|null} - Regional size label or null if any input is invalid/unknown
 */
export const toRegionSize = (size, region = "US", category = "tshirt") => {
  if (!size || typeof size !== "string") return null;
  if (!region || typeof region !== "string") return null;
  if (!category || typeof category !== "string") return null;

  const normalizedSize = size.trim().toUpperCase();
  const normalizedRegion = region.trim().toUpperCase();
  const normalizedCategory = category.trim().toLowerCase();

  if (!STANDARD_SIZES.includes(normalizedSize)) return null;
  if (!REGIONS.includes(normalizedRegion)) return null;
  if (!CATEGORIES.includes(normalizedCategory)) return null;

  const table = REGION_SIZES[normalizedRegion]?.[normalizedCategory];
  if (!table) return null;

  return table[normalizedSize] || null;
};

/**
 * Converts a regional size label back to the standard size (XS..XXL).
 *
 * @param {string|number} label - Regional size label (e.g. "40", "M", "28")
 * @param {string} [region="US"] - Region code (US, UK, EU, IN)
 * @param {string} [category="tshirt"] - Product category (tshirt, jeans, kurta, blouse)
 * @returns {string|null} - Standard size (XS..XXL) or null if unknown
 */
export const fromRegionSize = (label, region = "US", category = "tshirt") => {
  if (label === null || label === undefined) return null;
  if (!region || typeof region !== "string") return null;
  if (!category || typeof category !== "string") return null;

  const rawLabel = typeof label === "string" ? label.trim() : String(label).trim();
  if (rawLabel === "") return null;

  const normalizedRegion = region.trim().toUpperCase();
  const normalizedCategory = category.trim().toLowerCase();

  if (!REGIONS.includes(normalizedRegion)) return null;
  if (!CATEGORIES.includes(normalizedCategory)) return null;

  const reverseMap = REVERSE_REGION_SIZES[normalizedRegion]?.[normalizedCategory];
  if (!reverseMap) return null;

  // Exact lookup
  if (reverseMap[rawLabel]) {
    return reverseMap[rawLabel];
  }

  // Case-insensitive lookup (e.g. "xs", "m")
  const upperLabel = rawLabel.toUpperCase();
  if (reverseMap[upperLabel]) {
    return reverseMap[upperLabel];
  }

  return null;
};

export default {
  toRegionSize,
  fromRegionSize,
};
