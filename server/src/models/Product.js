import mongoose from "mongoose";

const sizeChartRowSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      required: true,
      enum: ["XS", "S", "M", "L", "XL", "XXL"],
    },
    chest: { type: [Number], default: undefined },
    waist: { type: [Number], default: undefined },
    hip: { type: [Number], default: undefined },
    shoulder: { type: [Number], default: undefined },
    bust: { type: [Number], default: undefined },
    length: { type: [Number], default: undefined },
  },
  { _id: false, strict: false }
);

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    imageUrl: {
      type: String,
      trim: true,
      default: null,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["tshirt", "jeans", "kurta", "blouse"],
      index: true,
    },
    region: {
      type: String,
      required: true,
      enum: ["US", "UK", "EU", "IN"],
      index: true,
    },
    sizeChart: {
      type: [sizeChartRowSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "Product sizeChart must contain at least one size row",
      },
    },
    flagCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
export default Product;
