import mongoose from "mongoose";

const instagramMessageSchema = new mongoose.Schema(
  {
    lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InstagramLead",
      required: true,
      index: true
    },
    instagram_scoped_id: {
      type: String,
      required: true,
      index: true
    },
    instagram_message_id: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    direction: {
      type: String,
      enum: ["INBOUND", "OUTBOUND"],
      required: true
    },
    message_type: {
      type: String,
      default: "text"
    },
    message_text: {
      type: String,
      required: true
    },
    quick_reply_payload: {
      type: String,
      default: null
    },
    sender_name: {
      type: String,
      default: ""
    },
    raw_payload: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.InstagramMessage || mongoose.model("InstagramMessage", instagramMessageSchema);
