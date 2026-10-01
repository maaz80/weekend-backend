import mongoose from "mongoose";

const attendanceRecordSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ErpStudent",
      required: true
    },
    status: {
      type: String,
      enum: ["Present", "Absent", "Late", "Excused"],
      default: "Present"
    },
    remarks: {
      type: String,
      default: ""
    }
  },
  { _id: false }
);

const erpAttendanceSchema = new mongoose.Schema(
  {
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ErpBatch",
      required: true,
      index: true
    },
    date: {
      type: Date,
      required: true,
      index: true
    },
    dateStr: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true
    },
    topic: {
      type: String,
      default: "Live Class Session",
      trim: true
    },
    records: [attendanceRecordSchema],
    markedBy: {
      type: String,
      default: "Mentor"
    }
  },
  {
    timestamps: true
  }
);

erpAttendanceSchema.index({ batch: 1, dateStr: 1 }, { unique: true });

export default mongoose.models.ErpAttendance || mongoose.model("ErpAttendance", erpAttendanceSchema);
