import mongoose from "mongoose";

const unifiedMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UnifiedConversation",
      required: true,
      index: true
    },
    sender: {
      type: String,
      enum: ["user", "bot", "agent"],
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    channel: {
      type: String,
      enum: ["instagram", "facebook", "email"]
    },
    matchedFaq: {
      type: String,
      default: ""
    },
    platformMessageId: {
      type: String,
      default: ""
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

unifiedMessageSchema.index({ conversationId: 1, timestamp: 1 });

const UnifiedMessage =
  mongoose.models.UnifiedMessage ||
  mongoose.model("UnifiedMessage", unifiedMessageSchema);

export default UnifiedMessage;
