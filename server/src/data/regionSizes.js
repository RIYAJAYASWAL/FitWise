/**
 * Regional Size Conversion Tables
 * Maps standard sizes XS..XXL to regional labels (US, UK, EU, IN).
 *
 * Rules:
 * - IN tops use chest-based numbers like 36-46 (XS: 36, S: 38, M: 40, L: 42, XL: 44, XXL: 46)
 * - IN/US/UK jeans use standard waist inches (28-38)
 * - US tops use standard alpha sizing (XS..XXL)
 * - UK tops use chest inches (34-44) and blouse uses UK dress sizes (6-16)
 * - EU tops use European sizes (44-54) and blouse uses EU dress sizes (34-44), jeans use EU sizes (38-48)
 */

export const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export const REGIONS = ["US", "UK", "EU", "IN"];

export const REGION_SIZES = {
  US: {
    tshirt: { XS: "XS", S: "S", M: "M", L: "L", XL: "XL", XXL: "XXL" },
    jeans:  { XS: "28", S: "30", M: "32", L: "34", XL: "36", XXL: "38" },
    kurta:  { XS: "XS", S: "S", M: "M", L: "L", XL: "XL", XXL: "XXL" },
    blouse: { XS: "XS", S: "S", M: "M", L: "L", XL: "XL", XXL: "XXL" },
  },
  UK: {
    tshirt: { XS: "34", S: "36", M: "38", L: "40", XL: "42", XXL: "44" },
    jeans:  { XS: "28", S: "30", M: "32", L: "34", XL: "36", XXL: "38" },
    kurta:  { XS: "34", S: "36", M: "38", L: "40", XL: "42", XXL: "44" },
    blouse: { XS: "6", S: "8", M: "10", L: "12", XL: "14", XXL: "16" },
  },
  EU: {
    tshirt: { XS: "44", S: "46", M: "48", L: "50", XL: "52", XXL: "54" },
    jeans:  { XS: "38", S: "40", M: "42", L: "44", XL: "46", XXL: "48" },
    kurta:  { XS: "44", S: "46", M: "48", L: "50", XL: "52", XXL: "54" },
    blouse: { XS: "34", S: "36", M: "38", L: "40", XL: "42", XXL: "44" },
  },
  IN: {
    tshirt: { XS: "36", S: "38", M: "40", L: "42", XL: "44", XXL: "46" },
    jeans:  { XS: "28", S: "30", M: "32", L: "34", XL: "36", XXL: "38" },
    kurta:  { XS: "36", S: "38", M: "40", L: "42", XL: "44", XXL: "46" },
    blouse: { XS: "36", S: "38", M: "40", L: "42", XL: "44", XXL: "46" },
  },
};

/**
 * Precomputed reverse mapping: Region -> Category -> RegionalLabel -> StandardSize
 */
export const REVERSE_REGION_SIZES = Object.entries(REGION_SIZES).reduce(
  (regionAcc, [region, categories]) => {
    regionAcc[region] = Object.entries(categories).reduce(
      (catAcc, [cat, sizeMap]) => {
        catAcc[cat] = Object.entries(sizeMap).reduce((acc, [stdSize, label]) => {
          acc[label] = stdSize;
          return acc;
        }, {});
        return catAcc;
      },
      {}
    );
    return regionAcc;
  },
  {}
);

/**
 * Check if a size is a valid standard size (XS..XXL).
 *
 * @param {string} size
 * @returns {boolean}
 */
export const isValidStandardSize = (size) => {
  if (!size || typeof size !== "string") return false;
  return STANDARD_SIZES.includes(size.toUpperCase().trim());
};

/**
 * Check if a region is supported (US, UK, EU, IN).
 *
 * @param {string} region
 * @returns {boolean}
 */
export const isValidRegion = (region) => {
  if (!region || typeof region !== "string") return false;
  return REGIONS.includes(region.toUpperCase().trim());
};

export default {
  STANDARD_SIZES,
  REGIONS,
  REGION_SIZES,
  REVERSE_REGION_SIZES,
  isValidStandardSize,
  isValidRegion,
};
