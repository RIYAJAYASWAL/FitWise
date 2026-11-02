import mongoose from "mongoose";

const purchaseSchema = new mongoose.Schema(
  {
    storeId: {
      type: String,
      trim: true,
      index: true,
    },
    userId: {
      type: String,
      trim: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    sizeBought: {
      type: String,
      required: true,
      enum: ["XS", "S", "M", "L", "XL", "XXL"],
    },
    kept: {
      type: Boolean,
      required: true,
    },
    returnReason: {
      type: String,
      enum: ["too_small", "too_large", "style", "quality", "other"],
      default: null,
    },
    variant: {
      type: String,
      enum: ["control", "treatment"],
      default: null,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const Purchase = mongoose.models.Purchase || mongoose.model("Purchase", purchaseSchema);
export default Purchase;
