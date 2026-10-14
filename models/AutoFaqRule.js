import mongoose from "mongoose";

const autoFaqRuleSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true
    },
    keywords: [
      {
        type: String,
        trim: true,
        lowercase: true
      }
    ],
    matchType: {
      type: String,
      enum: ["contains", "exact", "ai"],
      default: "contains"
    },
    answer: {
      type: String,
      required: true,
      trim: true
    },
    channels: [
      {
        type: String,
        enum: ["instagram", "facebook", "email"],
        default: ["instagram", "facebook", "email"]
      }
    ],
    isActive: {
      type: Boolean,
      default: true
    },
    triggeredCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Index keywords for rapid lookup during incoming message handling
autoFaqRuleSchema.index({ keywords: 1 });
autoFaqRuleSchema.index({ isActive: 1, channels: 1 });

const AutoFaqRule =
  mongoose.models.AutoFaqRule ||
  mongoose.model("AutoFaqRule", autoFaqRuleSchema);

export default AutoFaqRule;
