import mongoose from "mongoose";

const journalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
    },
    excerpt: {
      type: String,
      trim: true,
      default: "",
    },
    authorName: {
      type: String,
      trim: true,
      default: "Store Owner",
    },
    tags: {
      type: [String],
      default: [],
    },
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    liked: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
    storeId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate excerpt from body if excerpt is not provided
journalSchema.pre("save", function (next) {
  if (!this.excerpt && this.body) {
    this.excerpt =
      this.body.length > 150 ? `${this.body.substring(0, 147)}...` : this.body;
  }
  next();
});

export const Journal = mongoose.model("Journal", journalSchema);
export default Journal;
