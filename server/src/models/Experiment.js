import mongoose from "mongoose";

const experimentSchema = new mongoose.Schema(
  {
    experimentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    storeId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      default: "Widget Sizing Test",
      trim: true,
    },
    description: {
      type: String,
      default: "Compare conversion and return rates with FitWise sizing widget enabled vs disabled.",
      trim: true,
    },
    type: {
      type: String,
      enum: ["widget_toggle", "widget_design", "widget_placement"],
      default: "widget_toggle",
    },
    goal: {
      type: String,
      enum: ["conversion_rate", "return_rate", "add_to_cart_rate"],
      default: "conversion_rate",
    },
    variants: {
      type: {
        a: { label: { type: String, default: "Original" } },
        b: { label: { type: String, default: "FitWise Active" } },
      },
      default: () => ({
        a: { label: "Original" },
        b: { label: "FitWise Active" },
      }),
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    split: {
      type: Number,
      default: 0.5,
      min: 0,
      max: 1,
    },
    status: {
      type: String,
      enum: ["running", "paused", "completed"],
      default: "running",
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const Experiment =
  mongoose.models.Experiment || mongoose.model("Experiment", experimentSchema);
export default Experiment;
