import mongoose from "mongoose";

const whatsAppMessageSchema = new mongoose.Schema(
  {
    lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WhatsAppLead",
      required: true,
      index: true
    },
    whatsapp_number: {
      type: String,
      required: true,
      index: true
    },
    whatsapp_message_id: {
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
    interactive_reply_id: {
      type: String,
      default: null
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

export default mongoose.models.WhatsAppMessage || mongoose.model("WhatsAppMessage", whatsAppMessageSchema);
