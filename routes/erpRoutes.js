import express from "express";
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  addStudentNote,
  importEnrolledLeadsFromCrm,
  getErpStats,
  getAcademyCourses,
  unlockCourseForStudent,
  revokeCourseFromStudent
} from "../controllers/erpStudentController.js";
import {
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch
} from "../controllers/erpBatchController.js";
import {
  getPayments,
  recordPayment
} from "../controllers/erpPaymentController.js";
import {
  saveAttendance,
  getBatchAttendanceByDate,
  getBatchAttendanceHistory,
  getStudentAttendanceSummary
} from "../controllers/erpAttendanceController.js";
import erpAuthRoutes from "./erpAuthRoutes.js";

const router = express.Router();

// Authentication Routes
router.use("/auth", erpAuthRoutes);

// Stats & Dashboard
router.get("/stats", getErpStats);

// Academy Courses for LMS Unlock
router.get("/academy-courses", getAcademyCourses);

// CRM Integration: Sync Enrolled leads from CRM into ERP
router.post("/crm-import", importEnrolledLeadsFromCrm);

// Students CRUD
router.get("/students", getStudents);
router.post("/students", createStudent);
router.get("/students/:id", getStudentById);
router.put("/students/:id", updateStudent);
router.delete("/students/:id", deleteStudent);
router.post("/students/:id/notes", addStudentNote);

// Student LMS Course Access Unlock & Revoke
router.post("/students/:id/unlock-course", unlockCourseForStudent);
router.post("/students/:id/revoke-course", revokeCourseFromStudent);

// Batches CRUD
router.get("/batches", getBatches);
router.post("/batches", createBatch);
router.get("/batches/:id", getBatchById);
router.put("/batches/:id", updateBatch);
router.delete("/batches/:id", deleteBatch);

// Payments & Fees
router.get("/payments", getPayments);
router.post("/payments", recordPayment);

// Attendance
router.post("/attendance", saveAttendance);
router.get("/attendance/by-date", getBatchAttendanceByDate);
router.get("/attendance/history", getBatchAttendanceHistory);
router.get("/students/:studentId/attendance", getStudentAttendanceSummary);

export default router;
