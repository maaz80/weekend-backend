import mongoose from "mongoose";

const instagramLeadSchema = new mongoose.Schema(
  {
    instagram_scoped_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    username: {
      type: String,
      default: "Instagram User",
      trim: true,
      index: true
    },
    name: {
      type: String,
      default: "Instagram Visitor",
      trim: true
    },
    profile_pic: {
      type: String,
      default: ""
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
        "brochure_sent",
        "human_handover",
        "converted",
        "closed"
      ],
      default: "new",
      index: true
    },
    is_bot_active: {
      type: Boolean,
      default: true,
      index: true
    },
    source: {
      type: String,
      default: "Instagram DM",
      trim: true
    },
    phone: {
      type: String,
      default: "",
      trim: true
    },
    email: {
      type: String,
      default: "",
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

export default mongoose.models.InstagramLead || mongoose.model("InstagramLead", instagramLeadSchema);
