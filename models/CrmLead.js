import mongoose from "mongoose";

const noteSchema = new mongoose.Schema({
  author: {
    type: String,
    default: "Counselor",
    trim: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const crmLeadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      default: "Inquiry Visitor"
    },
    phone: {
      type: String,
      default: "Not Provided",
      trim: true,
      index: true
    },
    email: {
      type: String,
      default: "",
      trim: true
    },
    course: {
      type: String,
      default: "UI/UX Design Course",
      trim: true
    },
    source: {
      type: String,
      default: "Website Lead",
      trim: true
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Contacted",
        "In Discussion",
        "Demo Scheduled",
        "Enrolled",
        "Lost"
      ],
      default: "Pending",
      index: true
    },
    priority: {
      type: String,
      enum: ["Hot", "Warm", "Cold"],
      default: "Warm",
      index: true
    },
    leadScore: {
      type: Number,
      default: 60,
      min: 0,
      max: 100,
      index: true
    },
    autoTags: {
      type: [String],
      default: []
    },
    // Answers & preferences from website or WhatsApp chatbot
    answers: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    answersSummary: {
      type: String,
      default: ""
    },
    // Follow-up scheduling
    followUpDate: {
      type: Date,
      default: null,
      index: true
    },
    followUpTime: {
      type: String,
      default: ""
    },
    followUpNote: {
      type: String,
      default: ""
    },
    // Counselor info
    assignedTo: {
      type: String,
      default: "Unassigned",
      trim: true
    },
    // Counselor call notes & timeline
    notes: [noteSchema],
    // Conversion & Drop details
    enrollmentFee: {
      type: Number,
      default: 0
    },
    dropReason: {
      type: String,
      default: ""
    },
    // Reference mapping for syncing
    originalLeadId: {
      type: String,
      default: null
    },
    originalType: {
      type: String,
      enum: ["lead", "whatsapp", "instagram", "manual"],
      default: "manual"
    },
    instagramUsername: {
      type: String,
      default: "",
      trim: true,
      index: true
    },
    instagramScopedId: {
      type: String,
      default: "",
      trim: true,
      index: true
    },
    isDuplicate: {
      type: Boolean,
      default: false,
      index: true
    },
    lastActivityAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound index for quick phone/instagram search and sorting by last activity
crmLeadSchema.index({ phone: 1, lastActivityAt: -1 });
crmLeadSchema.index({ instagramScopedId: 1, lastActivityAt: -1 });

export default mongoose.models.CrmLead || mongoose.model("CrmLead", crmLeadSchema);
