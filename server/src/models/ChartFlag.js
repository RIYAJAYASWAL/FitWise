import mongoose from "mongoose";

const chartFlagSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    size: {
      type: String,
      required: true,
      enum: ["XS", "S", "M", "L", "XL", "XXL"],
    },
    direction: {
      type: String,
      required: true,
      enum: ["runs_small", "runs_large"],
    },
    sampleSize: {
      type: Number,
      required: true,
      min: 1,
    },
    returnShare: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    suggestedFix: {
      type: String,
      required: true,
      trim: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const ChartFlag = mongoose.models.ChartFlag || mongoose.model("ChartFlag", chartFlagSchema);
export default ChartFlag;
