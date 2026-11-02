import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    measurements: {
      type: Map,
      of: Number,
      default: {},
    },
    region: {
      type: String,
      enum: ["US", "UK", "EU", "IN"],
      default: "US",
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
