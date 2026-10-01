import ErpPayment from "../models/ErpPayment.js";
import ErpStudent from "../models/ErpStudent.js";

// Helper to generate next unique Receipt Number: REC-2026-001
const generateReceiptNo = async () => {
  const year = new Date().getFullYear();
  const prefix = `REC-${year}-`;
  const lastPayment = await ErpPayment.findOne({ receiptNo: { $regex: `^${prefix}` } })
    .sort({ createdAt: -1 })
    .lean();

  let nextSeq = 1;
  if (lastPayment && lastPayment.receiptNo) {
    const parts = lastPayment.receiptNo.split("-");
    const num = parseInt(parts[2], 10);
    if (!isNaN(num)) nextSeq = num + 1;
  }

  return `${prefix}${String(nextSeq).padStart(3, "0")}`;
};

// 1. Get all payments
export const getPayments = async (req, res) => {
  try {
    const { studentId, mode } = req.query;
    const query = {};

    if (studentId) query.student = studentId;
    if (mode && mode !== "all") query.paymentMode = mode;

    const payments = await ErpPayment.find(query)
      .populate("student", "studentId name phone email course feeDetails")
      .sort({ paymentDate: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      payments
    });
  } catch (error) {
    console.error("❌ [ERP getPayments Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 2. Record new payment installment
export const recordPayment = async (req, res) => {
  try {
    const { studentId, amount, paymentMode, transactionId, notes, receivedBy } = req.body;

    if (!studentId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: "Valid student and payment amount are required." });
    }

    const student = await ErpStudent.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    const receiptNo = await generateReceiptNo();

    const payment = new ErpPayment({
      receiptNo,
      student: student._id,
      amount: Number(amount),
      paymentMode: paymentMode || "UPI",
      transactionId: transactionId || "",
      notes: notes || "",
      receivedBy: receivedBy || "Counselor"
    });

    await payment.save();

    // Update student's paidAmount and balance
    student.feeDetails.paidAmount = (Number(student.feeDetails.paidAmount) || 0) + Number(amount);
    await student.save();

    // Also update any linked duplicate students sharing same phone or email
    const cleanPhone = String(student.phone || "").replace(/\D/g, "").slice(-10);
    const studentEmail = (student.email || "").trim().toLowerCase();
    const duplicateQuery = {
      _id: { $ne: student._id },
      $or: [
        ...(cleanPhone && cleanPhone.length >= 10 ? [{ phone: { $regex: cleanPhone } }] : []),
        ...(studentEmail && studentEmail.includes("@") && studentEmail !== "not provided" ? [{ email: studentEmail }] : [])
      ]
    };
    const duplicates = await ErpStudent.find(duplicateQuery);
    for (const d of duplicates) {
      d.feeDetails.paidAmount = student.feeDetails.paidAmount;
      d.feeDetails.totalFee = Math.max(d.feeDetails.totalFee || 0, student.feeDetails.totalFee || 0);
      d.isDuplicate = true;
      await d.save();
    }

    return res.status(201).json({
      success: true,
      message: `Payment of ₹${amount} recorded with receipt #${receiptNo}`,
      payment,
      updatedFeeDetails: student.feeDetails
    });
  } catch (error) {
    console.error("❌ [ERP recordPayment Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
