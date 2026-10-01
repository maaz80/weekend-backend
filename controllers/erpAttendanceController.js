import ErpAttendance from "../models/ErpAttendance.js";
import ErpStudent from "../models/ErpStudent.js";
import ErpBatch from "../models/ErpBatch.js";

// Helper to recalculate attendance stats for students in a batch
const recalculateBatchAttendanceStats = async (batchId) => {
  try {
    const allSessions = await ErpAttendance.find({ batch: batchId }).lean();
    const totalSessions = allSessions.length;

    if (totalSessions === 0) return;

    // Student -> { attended: 0, total: 0 }
    const studentMap = {};

    allSessions.forEach((session) => {
      (session.records || []).forEach((rec) => {
        const sId = rec.student?.toString();
        if (!sId) return;
        if (!studentMap[sId]) {
          studentMap[sId] = { attended: 0, total: 0 };
        }
        studentMap[sId].total += 1;
        if (rec.status === "Present" || rec.status === "Late") {
          studentMap[sId].attended += 1;
        }
      });
    });

    const updatePromises = Object.keys(studentMap).map((sId) => {
      const { attended, total } = studentMap[sId];
      const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
      return ErpStudent.findByIdAndUpdate(sId, {
        "attendanceStats.totalSessions": total,
        "attendanceStats.attendedSessions": attended,
        "attendanceStats.percentage": percentage
      });
    });

    await Promise.all(updatePromises);
  } catch (err) {
    console.error("Error recalculating batch attendance stats:", err);
  }
};

// 1. Save or Update Session Attendance for a Batch
export const saveAttendance = async (req, res) => {
  try {
    const { batchId, date, topic, markedBy = "Mentor" } = req.body;
    if (!batchId) {
      return res.status(400).json({ success: false, error: "Batch ID is required." });
    }

    const sessionDate = date ? new Date(date) : new Date();
    const dateStr = sessionDate.toISOString().split("T")[0];

    const incomingRecords = req.body.records || req.body.students || [];
    const formattedRecords = incomingRecords.map((r) => ({
      student: r.studentId || r.student || r._id,
      status: r.status || "Present",
      remarks: r.remarks || ""
    }));

    const attendance = await ErpAttendance.findOneAndUpdate(
      { batch: batchId, dateStr },
      {
        batch: batchId,
        date: sessionDate,
        dateStr,
        topic: topic ? topic.trim() : "Live Class Session",
        records: formattedRecords,
        markedBy
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Recalculate attendance stats across the batch
    await recalculateBatchAttendanceStats(batchId);

    return res.status(200).json({
      success: true,
      message: `Attendance saved successfully for ${dateStr}!`,
      attendance
    });
  } catch (err) {
    console.error("Error saving attendance:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 2. Get Attendance for a specific batch and date
export const getBatchAttendanceByDate = async (req, res) => {
  try {
    const { batchId, dateStr } = req.query;

    if (!batchId || !dateStr) {
      return res.status(400).json({ success: false, error: "batchId and dateStr are required." });
    }

    const attendance = await ErpAttendance.findOne({ batch: batchId, dateStr }).lean();

    return res.status(200).json({
      success: true,
      attendance: attendance || null
    });
  } catch (err) {
    console.error("Error fetching attendance by date:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 3. Get Attendance History for a Batch
export const getBatchAttendanceHistory = async (req, res) => {
  try {
    const { batchId } = req.query;

    if (!batchId) {
      return res.status(400).json({ success: false, error: "batchId is required." });
    }

    const sessions = await ErpAttendance.find({ batch: batchId })
      .sort({ date: -1 })
      .lean();

    const history = sessions.map((s) => {
      const records = s.records || [];
      const presentCount = records.filter((r) => r.status === "Present" || r.status === "Late").length;
      const total = records.length;
      return {
        _id: s._id,
        date: s.date,
        dateStr: s.dateStr,
        topic: s.topic,
        markedBy: s.markedBy,
        totalStudents: total,
        presentCount,
        absentCount: total - presentCount,
        percentage: total > 0 ? Math.round((presentCount / total) * 100) : 0
      };
    });

    return res.status(200).json({
      success: true,
      history
    });
  } catch (err) {
    console.error("Error fetching batch attendance history:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 4. Get Student's Detailed Attendance Summary & History
export const getStudentAttendanceSummary = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await ErpStudent.findById(studentId).lean();
    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found." });
    }

    // Find all attendance sessions that include this student
    const sessions = await ErpAttendance.find({
      "records.student": studentId
    })
      .sort({ date: -1 })
      .lean();

    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let excusedCount = 0;

    const history = sessions.map((s) => {
      const rec = (s.records || []).find((r) => r.student?.toString() === studentId.toString());
      const status = rec?.status || "Present";
      if (status === "Present") presentCount++;
      else if (status === "Late") lateCount++;
      else if (status === "Absent") absentCount++;
      else if (status === "Excused") excusedCount++;

      return {
        _id: s._id,
        batchId: s.batch,
        date: s.date,
        dateStr: s.dateStr,
        topic: s.topic,
        status,
        remarks: rec?.remarks || ""
      };
    });

    const totalSessions = sessions.length;
    const attendedSessions = presentCount + lateCount;
    const percentage = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 0;

    return res.status(200).json({
      success: true,
      summary: {
        totalSessions,
        attendedSessions,
        percentage,
        presentCount,
        lateCount,
        absentCount,
        excusedCount
      },
      history
    });
  } catch (err) {
    console.error("Error fetching student attendance summary:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
