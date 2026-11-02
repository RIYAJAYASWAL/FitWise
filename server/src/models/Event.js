import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    storeId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    visitorId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    experimentId: {
      type: String,
      index: true,
      trim: true,
    },
    variant: {
      type: String,
      required: true,
      enum: ["control", "treatment"],
    },
    type: {
      type: String,
      required: true,
      enum: [
        "widget_shown",
        "recommend_requested",
        "add_to_cart",
        "purchase",
        "return",
      ],
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Compound index requested by API contract specification
eventSchema.index({ storeId: 1, type: 1, timestamp: -1 });

export const Event = mongoose.models.Event || mongoose.model("Event", eventSchema);
export default Event;
