import mongoose from "mongoose";

const whatsAppLeadSchema = new mongoose.Schema(
  {
    whatsapp_number: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    name: {
      type: String,
      default: "WhatsApp Guest",
      trim: true
    },
    service_interest: {
      type: String,
      default: "Not Specified",
      trim: true
    },
    experience_or_budget: {
      type: String,
      default: "Not Specified",
      trim: true
    },
    project_goal: {
      type: String,
      default: "Not Specified",
      trim: true
    },
    preferred_contact_time: {
      type: String,
      default: "Anytime",
      trim: true
    },
    current_step: {
      type: String,
      default: "START",
      index: true
    },
    status: {
      type: String,
      enum: [
        "new",
        "in_progress",
        "qualified",
        "demo_requested",
        "human_handover",
        "converted",
        "closed"
      ],
      default: "new",
      index: true
    },
    source: {
      type: String,
      default: "website_whatsapp",
      trim: true
    },
    notes: {
      type: String,
      default: ""
    },
    last_message_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.WhatsAppLead || mongoose.model("WhatsAppLead", whatsAppLeadSchema);
