import mongoose from "mongoose";

const erpStudentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ""
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    course: {
      type: String,
      required: true,
      trim: true,
      default: "UI/UX Design Masterclass"
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ErpBatch",
      default: null
    },
    enrollmentDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ["Active", "Completed", "Dropped", "On-Hold"],
      default: "Active",
      index: true
    },
    feeDetails: {
      totalFee: { type: Number, default: 45000 },
      discount: { type: Number, default: 0 },
      finalFee: { type: Number, default: 45000 },
      paidAmount: { type: Number, default: 0 },
      balance: { type: Number, default: 45000 },
      paymentStatus: {
        type: String,
        enum: ["Paid", "Partial", "Pending"],
        default: "Pending"
      }
    },
    crmLeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CrmLead",
      default: null
    },
    emergencyContact: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      relation: { type: String, default: "" }
    },
    notes: [
      {
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        author: { type: String, default: "Counselor" }
      }
    ],
    address: { type: String, default: "" },
    education: { type: String, default: "" },
    rollNumber: { type: String, default: "" },
    unlockedCourses: [
      {
        courseId: { type: String, required: true },
        courseTitle: { type: String, default: "" },
        courseSlug: { type: String, default: "" },
        price: { type: Number, default: 0 },
        unlockedAt: { type: Date, default: Date.now },
        unlockedBy: { type: String, default: "Counselor" }
      }
    ],
    isDuplicate: {
      type: Boolean,
      default: false,
      index: true
    },
    attendanceStats: {
      totalSessions: { type: Number, default: 0 },
      attendedSessions: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

// Auto-calculate fee balance before save
erpStudentSchema.pre("save", function (next) {
  if (this.feeDetails) {
    const total = Number(this.feeDetails.totalFee) || 0;
    const disc = Number(this.feeDetails.discount) || 0;
    const paid = Number(this.feeDetails.paidAmount) || 0;
    const finalAmt = Math.max(0, total - disc);
    this.feeDetails.finalFee = finalAmt;
    this.feeDetails.balance = Math.max(0, finalAmt - paid);

    if (this.feeDetails.balance === 0 && finalAmt > 0) {
      this.feeDetails.paymentStatus = "Paid";
    } else if (paid > 0) {
      this.feeDetails.paymentStatus = "Partial";
    } else {
      this.feeDetails.paymentStatus = "Pending";
    }
  }
  next();
});

const ErpStudent = mongoose.models.ErpStudent || mongoose.model("ErpStudent", erpStudentSchema);
export default ErpStudent;
