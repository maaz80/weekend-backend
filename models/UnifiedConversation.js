import mongoose from "mongoose";

const unifiedConversationSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: ["instagram", "facebook", "email"],
      required: true
    },
    externalUserId: {
      type: String,
      required: true,
      trim: true
    },
    senderName: {
      type: String,
      trim: true,
      default: "Prospective Student"
    },
    senderHandle: {
      type: String,
      trim: true,
      default: ""
    },
    senderContact: {
      type: String,
      trim: true,
      default: ""
    },
    avatar: {
      type: String,
      default: ""
    },
    isBotActive: {
      type: Boolean,
      default: true // If set to false, counselor has taken over (Human Takeover)
    },
    status: {
      type: String,
      enum: ["bot_handled", "needs_human_reply", "human_replied", "resolved"],
      default: "needs_human_reply"
    },
    unread: {
      type: Boolean,
      default: true
    },
    lastMessage: {
      type: String,
      default: ""
    },
    lastMessageAt: {
      type: Date,
      default: Date.now
    },
    courseInterest: {
      type: String,
      default: "UI/UX Design Masterclass"
    }
  },
  { timestamps: true }
);

// Unique index per channel + external user ID
unifiedConversationSchema.index({ channel: 1, externalUserId: 1 }, { unique: true });
unifiedConversationSchema.index({ lastMessageAt: -1 });

const UnifiedConversation =
  mongoose.models.UnifiedConversation ||
  mongoose.model("UnifiedConversation", unifiedConversationSchema);

export default UnifiedConversation;
