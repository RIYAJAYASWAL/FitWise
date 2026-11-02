/**
 * Category Definitions and Measurement Requirements
 * Per FitWise API Contract §1.3 and §1.4
 */

export const CATEGORIES = ["tshirt", "jeans", "kurta", "blouse"];

export const REQUIRED_MEASUREMENTS = {
  tshirt: ["height_cm", "weight_kg", "chest_cm", "waist_cm"],
  jeans: ["height_cm", "weight_kg", "waist_cm", "hip_cm"],
  kurta: ["height_cm", "shoulder_cm", "bust_cm", "length_cm"],
  blouse: ["bust_cm", "waist_cm", "shoulder_cm"],
};

export const MEASUREMENT_RANGES = {
  height_cm: { min: 120, max: 220 },
  weight_kg: { min: 30, max: 200 },
  chest_cm: { min: 50, max: 200 },
  waist_cm: { min: 50, max: 200 },
  hip_cm: { min: 50, max: 200 },
  shoulder_cm: { min: 50, max: 200 },
  bust_cm: { min: 50, max: 200 },
  length_cm: { min: 50, max: 200 },
};

export const CATEGORY_CHART_FIELDS = {
  tshirt: ["chest", "waist"],
  jeans: ["waist", "hip"],
  kurta: ["shoulder", "bust", "length"],
  blouse: ["bust", "waist", "shoulder"],
};

/**
 * Validate whether a string is a recognized category.
 *
 * @param {string} category
 * @returns {boolean}
 */
export const isValidCategory = (category) => {
  if (!category || typeof category !== "string") return false;
  return CATEGORIES.includes(category.toLowerCase().trim());
};

/**
 * Retrieve required measurement field names for a category.
 *
 * @param {string} category
 * @returns {string[]|null}
 */
export const getRequiredMeasurements = (category) => {
  if (!isValidCategory(category)) return null;
  return REQUIRED_MEASUREMENTS[category.toLowerCase().trim()] || null;
};

export default {
  CATEGORIES,
  REQUIRED_MEASUREMENTS,
  MEASUREMENT_RANGES,
  CATEGORY_CHART_FIELDS,
  isValidCategory,
  getRequiredMeasurements,
};
