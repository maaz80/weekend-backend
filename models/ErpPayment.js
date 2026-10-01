import mongoose from "mongoose";

const erpPaymentSchema = new mongoose.Schema(
  {
    receiptNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ErpStudent",
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    paymentDate: {
      type: Date,
      default: Date.now
    },
    paymentMode: {
      type: String,
      enum: ["UPI", "Bank Transfer", "Cash", "Card", "Cheque"],
      default: "UPI"
    },
    transactionId: {
      type: String,
      trim: true,
      default: ""
    },
    notes: {
      type: String,
      default: ""
    },
    receivedBy: {
      type: String,
      default: "Admin / Accounts"
    }
  },
  {
    timestamps: true
  }
);

const ErpPayment = mongoose.models.ErpPayment || mongoose.model("ErpPayment", erpPaymentSchema);
export default ErpPayment;
