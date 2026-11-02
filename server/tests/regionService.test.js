import {
  CATEGORIES,
  REQUIRED_MEASUREMENTS,
  isValidCategory,
  getRequiredMeasurements,
} from "../src/data/categories.js";
import {
  STANDARD_SIZES,
  REGIONS,
  REGION_SIZES,
  isValidStandardSize,
  isValidRegion,
} from "../src/data/regionSizes.js";
import {
  toRegionSize,
  fromRegionSize,
} from "../src/services/regionService.js";

describe("Category Definitions and Measurements", () => {
  it("defines all 4 supported categories matching the API contract", () => {
    expect(CATEGORIES).toEqual(["tshirt", "jeans", "kurta", "blouse"]);
  });

  it("defines exact required measurement fields per category from API Contract §1.3", () => {
    expect(getRequiredMeasurements("tshirt")).toEqual([
      "height_cm",
      "weight_kg",
      "chest_cm",
      "waist_cm",
    ]);
    expect(getRequiredMeasurements("jeans")).toEqual([
      "height_cm",
      "weight_kg",
      "waist_cm",
      "hip_cm",
    ]);
    expect(getRequiredMeasurements("kurta")).toEqual([
      "height_cm",
      "shoulder_cm",
      "bust_cm",
      "length_cm",
    ]);
    expect(getRequiredMeasurements("blouse")).toEqual([
      "bust_cm",
      "waist_cm",
      "shoulder_cm",
    ]);
  });

  it("handles case-insensitive and invalid category lookups", () => {
    expect(isValidCategory("TSHIRT")).toBe(true);
    expect(isValidCategory("  jeans  ")).toBe(true);
    expect(isValidCategory("shoes")).toBe(false);
    expect(isValidCategory("")).toBe(false);
    expect(isValidCategory(null)).toBe(false);
    expect(getRequiredMeasurements("unknown")).toBeNull();
  });
});

describe("Regional Size Conversion Service", () => {
  describe("IN Tops Chest-Based Sizing (36-46)", () => {
    it("converts IN tops (tshirt, kurta, blouse) to chest-based numbers 36-46", () => {
      const topCategories = ["tshirt", "kurta", "blouse"];
      const expectedInSizes = {
        XS: "36",
        S: "38",
        M: "40",
        L: "42",
        XL: "44",
        XXL: "46",
      };

      for (const cat of topCategories) {
        for (const [stdSize, inLabel] of Object.entries(expectedInSizes)) {
          expect(toRegionSize(stdSize, "IN", cat)).toBe(inLabel);
          expect(fromRegionSize(inLabel, "IN", cat)).toBe(stdSize);
        }
      }
    });

    it("converts IN jeans to standard waist inches (28-38)", () => {
      expect(toRegionSize("XS", "IN", "jeans")).toBe("28");
      expect(toRegionSize("M", "IN", "jeans")).toBe("32");
      expect(toRegionSize("XXL", "IN", "jeans")).toBe("38");

      expect(fromRegionSize("28", "IN", "jeans")).toBe("XS");
      expect(fromRegionSize("32", "IN", "jeans")).toBe("M");
      expect(fromRegionSize("38", "IN", "jeans")).toBe("XXL");
    });
  });

  describe("US, UK, and EU Conversions", () => {
    it("converts US sizes as expected", () => {
      expect(toRegionSize("M", "US", "tshirt")).toBe("M");
      expect(toRegionSize("M", "US", "jeans")).toBe("32");
      expect(fromRegionSize("M", "US", "tshirt")).toBe("M");
      expect(fromRegionSize("32", "US", "jeans")).toBe("M");
    });

    it("converts UK sizes as expected", () => {
      expect(toRegionSize("M", "UK", "tshirt")).toBe("38");
      expect(toRegionSize("M", "UK", "blouse")).toBe("10");
      expect(toRegionSize("M", "UK", "jeans")).toBe("32");

      expect(fromRegionSize("38", "UK", "tshirt")).toBe("M");
      expect(fromRegionSize("10", "UK", "blouse")).toBe("M");
      expect(fromRegionSize("32", "UK", "jeans")).toBe("M");
    });

    it("converts EU sizes as expected", () => {
      expect(toRegionSize("M", "EU", "tshirt")).toBe("48");
      expect(toRegionSize("M", "EU", "blouse")).toBe("38");
      expect(toRegionSize("M", "EU", "jeans")).toBe("42");

      expect(fromRegionSize("48", "EU", "tshirt")).toBe("M");
      expect(fromRegionSize("38", "EU", "blouse")).toBe("M");
      expect(fromRegionSize("42", "EU", "jeans")).toBe("M");
    });
  });

  describe("Round Trip Invariance", () => {
    it("successfully round-trips fromRegionSize(toRegionSize(size)) for all regions, categories, and standard sizes", () => {
      for (const region of REGIONS) {
        for (const category of CATEGORIES) {
          for (const size of STANDARD_SIZES) {
            const regionalLabel = toRegionSize(size, region, category);
            expect(regionalLabel).toBeDefined();
            expect(typeof regionalLabel).toBe("string");

            const roundTripped = fromRegionSize(regionalLabel, region, category);
            expect(roundTripped).toBe(size);
          }
        }
      }
    });

    it("handles whitespace, case-insensitivity, and numeric inputs gracefully", () => {
      expect(toRegionSize("  m  ", " in ", "Tshirt")).toBe("40");
      expect(fromRegionSize(" 40 ", " IN ", "TSHIRT")).toBe("M");
      expect(fromRegionSize(40, "IN", "tshirt")).toBe("M");
      expect(fromRegionSize("m", "US", "tshirt")).toBe("M");
    });
  });

  describe("Unknown and Invalid Inputs", () => {
    it("returns null for unknown standard sizes", () => {
      expect(toRegionSize("UNKNOWN", "US", "tshirt")).toBeNull();
      expect(toRegionSize("XXXL", "IN", "tshirt")).toBeNull();
      expect(toRegionSize("38", "IN", "tshirt")).toBeNull(); // 38 is a regional label, not standard size
      expect(toRegionSize("", "US", "tshirt")).toBeNull();
      expect(toRegionSize(null, "US", "tshirt")).toBeNull();
      expect(toRegionSize(undefined, "US", "tshirt")).toBeNull();
      expect(toRegionSize(123, "US", "tshirt")).toBeNull();
    });

    it("returns null for unknown regions", () => {
      expect(toRegionSize("M", "JP", "tshirt")).toBeNull();
      expect(toRegionSize("M", "AU", "jeans")).toBeNull();
      expect(toRegionSize("M", "", "tshirt")).toBeNull();
      expect(toRegionSize("M", null, "tshirt")).toBeNull();

      expect(fromRegionSize("40", "JP", "tshirt")).toBeNull();
      expect(fromRegionSize("40", "", "tshirt")).toBeNull();
      expect(fromRegionSize("40", null, "tshirt")).toBeNull();
    });

    it("returns null for unknown categories", () => {
      expect(toRegionSize("M", "US", "shoes")).toBeNull();
      expect(toRegionSize("M", "IN", "hats")).toBeNull();
      expect(toRegionSize("M", "US", "")).toBeNull();
      expect(toRegionSize("M", "US", null)).toBeNull();

      expect(fromRegionSize("40", "IN", "shoes")).toBeNull();
      expect(fromRegionSize("40", "IN", "")).toBeNull();
      expect(fromRegionSize("40", "IN", null)).toBeNull();
    });

    it("returns null for unknown or mismatched regional labels", () => {
      expect(fromRegionSize("99", "IN", "tshirt")).toBeNull();
      expect(fromRegionSize("INVALID", "US", "tshirt")).toBeNull();
      expect(fromRegionSize("", "US", "tshirt")).toBeNull();
      expect(fromRegionSize(null, "US", "tshirt")).toBeNull();
      expect(fromRegionSize(undefined, "US", "tshirt")).toBeNull();

      // Mismatch: 40 is an IN top label, not valid for US tshirt
      expect(fromRegionSize("40", "US", "tshirt")).toBeNull();
      // Mismatch: 48 is an EU top label, not valid for US tshirt
      expect(fromRegionSize("48", "US", "tshirt")).toBeNull();
    });
  });
});
