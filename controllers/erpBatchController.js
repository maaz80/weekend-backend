import ErpBatch from "../models/ErpBatch.js";
import ErpStudent from "../models/ErpStudent.js";

// Helper to generate next unique Batch Code
const generateBatchCode = async (course) => {
  const codePrefix = "BATCH-" + (course.toUpperCase().includes("UI") ? "UIUX" : "DES") + "-";
  const lastBatch = await ErpBatch.findOne({ batchCode: { $regex: `^${codePrefix}` } })
    .sort({ createdAt: -1 })
    .lean();

  let nextSeq = 1;
  if (lastBatch && lastBatch.batchCode) {
    const parts = lastBatch.batchCode.split("-");
    const num = parseInt(parts[2], 10);
    if (!isNaN(num)) nextSeq = num + 1;
  }

  return `${codePrefix}${String(nextSeq).padStart(2, "0")}`;
};

// 1. Get all batches with student count
export const getBatches = async (req, res) => {
  try {
    const { status, course } = req.query;
    const query = {};

    if (status && status !== "all") query.status = status;
    if (course && course !== "all") query.course = course;

    const batches = await ErpBatch.find(query).sort({ startDate: -1 }).lean();

    // Attach student count to each batch
    const batchesWithCount = await Promise.all(
      batches.map(async (b) => {
        const studentCount = await ErpStudent.countDocuments({ batch: b._id });
        return { ...b, studentCount };
      })
    );

    return res.status(200).json({
      success: true,
      batches: batchesWithCount
    });
  } catch (error) {
    console.error("❌ [ERP getBatches Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 2. Get batch by ID with student roster
export const getBatchById = async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await ErpBatch.findById(id).lean();

    if (!batch) {
      return res.status(404).json({ success: false, error: "Batch not found" });
    }

    const students = await ErpStudent.find({ batch: id })
      .select("studentId name phone email course status feeDetails")
      .lean();

    return res.status(200).json({
      success: true,
      batch: { ...batch, students, studentCount: students.length }
    });
  } catch (error) {
    console.error("❌ [ERP getBatchById Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Create new batch
export const createBatch = async (req, res) => {
  try {
    const {
      name,
      course,
      mentorName,
      mentorEmail,
      schedule,
      startDate,
      endDate,
      maxCapacity,
      status,
      meetingLink,
      classroomUrl,
      notes
    } = req.body;

    if (!name || !course) {
      return res.status(400).json({ success: false, error: "Batch name and course are required." });
    }

    const batchCode = await generateBatchCode(course);

    const batch = new ErpBatch({
      batchCode,
      name: name.trim(),
      course: course.trim(),
      mentorName: (mentorName || "Lead Instructor").trim(),
      mentorEmail: (mentorEmail || "").trim(),
      schedule: schedule || "Sat - Sun (11:00 AM - 1:30 PM)",
      startDate: startDate || new Date(),
      endDate: endDate || null,
      maxCapacity: Number(maxCapacity) || 20,
      status: status || "Upcoming",
      meetingLink: meetingLink || "",
      classroomUrl: classroomUrl || "",
      notes: notes || ""
    });

    await batch.save();

    return res.status(201).json({
      success: true,
      message: "Batch created successfully",
      batch: { ...batch.toObject(), studentCount: 0 }
    });
  } catch (error) {
    console.error("❌ [ERP createBatch Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 4. Update batch
export const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await ErpBatch.findByIdAndUpdate(id, req.body, { new: true });

    if (!batch) {
      return res.status(404).json({ success: false, error: "Batch not found" });
    }

    const studentCount = await ErpStudent.countDocuments({ batch: id });

    return res.status(200).json({
      success: true,
      message: "Batch updated successfully",
      batch: { ...batch.toObject(), studentCount }
    });
  } catch (error) {
    console.error("❌ [ERP updateBatch Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 5. Delete batch
export const deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await ErpBatch.findByIdAndDelete(id);

    if (!batch) {
      return res.status(404).json({ success: false, error: "Batch not found" });
    }

    // Unassign students from this batch
    await ErpStudent.updateMany({ batch: id }, { $set: { batch: null } });

    return res.status(200).json({
      success: true,
      message: "Batch deleted and students unassigned"
    });
  } catch (error) {
    console.error("❌ [ERP deleteBatch Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
