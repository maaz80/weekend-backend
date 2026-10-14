import mongoose from "mongoose";

const CrmSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "feature_permissions"
    },
    permissions: {
      kanban: { type: Boolean, default: true },
      leadsTable: { type: Boolean, default: true },
      followups: { type: Boolean, default: true },
      analytics: { type: Boolean, default: true },
      addLead: { type: Boolean, default: true },
      syncDb: { type: Boolean, default: true },
      exportCsv: { type: Boolean, default: true },
      callLead: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: true },
      deleteLead: { type: Boolean, default: true },
      updateStatus: { type: Boolean, default: true },
      addNotes: { type: Boolean, default: true },
      scheduleFollowup: { type: Boolean, default: true }
    },
    updatedBy: {
      type: String,
      default: "admin"
    }
  },
  { timestamps: true }
);

export default mongoose.models.CrmSetting || mongoose.model("CrmSetting", CrmSettingSchema);
