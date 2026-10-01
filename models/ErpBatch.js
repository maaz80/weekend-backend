import mongoose from "mongoose";

const erpBatchSchema = new mongoose.Schema(
  {
    batchCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    course: {
      type: String,
      required: true,
      trim: true
    },
    mentorName: {
      type: String,
      default: "Head Mentor",
      trim: true
    },
    mentorEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true
    },
    schedule: {
      type: String,
      default: "Sat - Sun (11:00 AM - 1:30 PM)",
      trim: true
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    maxCapacity: {
      type: Number,
      default: 20
    },
    status: {
      type: String,
      enum: ["Upcoming", "Ongoing", "Completed"],
      default: "Upcoming",
      index: true
    },
    meetingLink: {
      type: String,
      default: ""
    },
    classroomUrl: {
      type: String,
      default: ""
    },
    notes: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

const ErpBatch = mongoose.models.ErpBatch || mongoose.model("ErpBatch", erpBatchSchema);
export default ErpBatch;
