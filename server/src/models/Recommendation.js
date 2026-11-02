import mongoose from "mongoose";

const recommendationSchema = new mongoose.Schema(
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
    predictedSize: {
      type: String,
      required: true,
      enum: ["XS", "S", "M", "L", "XL", "XXL"],
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    status: {
      type: String,
      enum: ["pending", "kept", "returned"],
      default: "pending",
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

export const Recommendation =
  mongoose.models.Recommendation || mongoose.model("Recommendation", recommendationSchema);
export default Recommendation;
