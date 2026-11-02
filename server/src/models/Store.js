import mongoose from "mongoose";

const storeSchema = new mongoose.Schema(
  {
    storeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ownerName: {
      type: String,
      trim: true,
      default: "Demo Owner",
    },
    website: {
      type: String,
      trim: true,
      default: "https://demo.fitwise.store",
    },
    publicKeyHash: {
      type: String,
      required: true,
      index: true,
    },
    secretKeyHash: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Store = mongoose.models.Store || mongoose.model("Store", storeSchema);
export default Store;
