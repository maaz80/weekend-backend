import ErpStudent from "../models/ErpStudent.js";
import ErpBatch from "../models/ErpBatch.js";
import ErpPayment from "../models/ErpPayment.js";
import CrmLead from "../models/CrmLead.js";
import User from "../models/Auth.js";
import Courses from "../models/Courses.js";

// Helper to generate next unique Student ID: WUX-2026-001, etc.
const generateStudentId = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `WUX-${currentYear}-`;

  const lastStudent = await ErpStudent.findOne({
    studentId: { $regex: `^${prefix}` }
  })
    .sort({ createdAt: -1 })
    .lean();

  let nextSeq = 1;
  if (lastStudent && lastStudent.studentId) {
    const parts = lastStudent.studentId.split("-");
    const num = parseInt(parts[2], 10);
    if (!isNaN(num)) {
      nextSeq = num + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(3, "0")}`;
};

// Helper to look up official catalog course price from Courses collection
export const getCoursePrice = async (courseName) => {
  if (!courseName) return 45000;
  try {
    const coursesDoc = await Courses.findOne().lean();
    if (coursesDoc && coursesDoc.course && coursesDoc.course.length > 0) {
      const cleanTarget = String(courseName).toLowerCase().replace(/[^a-z0-9]/g, "");
      const matched = coursesDoc.course.find((c) => {
        if (!c.title) return false;
        const cleanTitle = String(c.title).toLowerCase().replace(/[^a-z0-9]/g, "");
        return cleanTitle.includes(cleanTarget) || cleanTarget.includes(cleanTitle);
      });
      if (matched && (matched.price || matched.fee)) {
        const p = Number(matched.price || matched.fee);
        if (p > 0) return p;
      }
    }
  } catch (err) {
    console.error("❌ Error looking up course price:", err.message);
  }
  return 45000;
};

// Helper to sync unlocked course into Website User LMS account (models/Auth.js)
export const syncCourseToUserLms = async ({ name, email, phone, courseId, courseSlug, courseTitle }) => {
  if (!email || !email.includes("@")) return null;
  try {
    const studentEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: studentEmail });
    if (!user) {
      const studentPhone = String(phone || "").trim();
      const defaultPass = "Weekend@" + (studentPhone.length >= 4 ? studentPhone.slice(-4) : "1234");
      user = new User({
        name: name || "Student",
        email: studentEmail,
        password: defaultPass,
        enrolledCourses: []
      });
    }

    if (!user.enrolledCourses) user.enrolledCourses = [];

    const targetCourseIdStr = courseId?.toString();
    const alreadyEnrolled = user.enrolledCourses.some(
      (c) => (targetCourseIdStr && c.courseId?.toString() === targetCourseIdStr) || (courseSlug && c.courseSlug === courseSlug)
    );

    if (!alreadyEnrolled) {
      user.enrolledCourses.push({
        courseId: targetCourseIdStr,
        courseSlug: courseSlug || "",
        enrolledAt: new Date(),
        progress: 0,
        completedLessons: []
      });
      await user.save();
      console.log(`🎓 [LMS Sync] Successfully unlocked "${courseTitle || courseSlug}" for User LMS account (${studentEmail})`);
    }
    return user;
  } catch (err) {
    console.error("❌ [syncCourseToUserLms Error]:", err.message);
    return null;
  }
};

// 1. Get all students with search, filters & pagination
export const getStudents = async (req, res) => {
  try {
    const { search, course, batch, status, paymentStatus, page = 1, limit = 50 } = req.query;

    const query = {};

    if (search) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { studentId: searchRegex }
      ];
    }

    if (course && course !== "all") {
      query.course = course;
    }

    if (batch && batch !== "all") {
      query.batch = batch;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (paymentStatus && paymentStatus !== "all") {
      query["feeDetails.paymentStatus"] = paymentStatus;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [total, students] = await Promise.all([
      ErpStudent.countDocuments(query),
      ErpStudent.find(query)
        .populate("batch", "name batchCode course schedule")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    // Compute duplicates by phone or email & unify fee across duplicate records in table view
    const phoneMap = {};
    const emailMap = {};
    const phonePaymentMap = {};
    const phoneTotalFeeMap = {};

    students.forEach((s) => {
      const p = String(s.phone || "").replace(/\D/g, "").slice(-10);
      if (p) {
        phoneMap[p] = (phoneMap[p] || 0) + 1;
        phonePaymentMap[p] = Math.max(phonePaymentMap[p] || 0, Number(s.feeDetails?.paidAmount) || 0);
        phoneTotalFeeMap[p] = Math.max(phoneTotalFeeMap[p] || 0, Number(s.feeDetails?.totalFee) || 0);
      }
      const e = (s.email || "").trim().toLowerCase();
      if (e && e.includes("@")) emailMap[e] = (emailMap[e] || 0) + 1;
    });

    const processedStudents = students.map((s) => {
      const p = String(s.phone || "").replace(/\D/g, "").slice(-10);
      const e = (s.email || "").trim().toLowerCase();
      const isDup = s.isDuplicate || (p && phoneMap[p] > 1) || (e && emailMap[e] > 1);

      let feeDetails = { ...(s.feeDetails || {}) };
      if (p && phonePaymentMap[p] !== undefined && phonePaymentMap[p] > (feeDetails.paidAmount || 0)) {
        feeDetails.paidAmount = phonePaymentMap[p];
        feeDetails.totalFee = Math.max(feeDetails.totalFee || 0, phoneTotalFeeMap[p] || 0);
        feeDetails.finalFee = Math.max(0, (feeDetails.totalFee || 0) - (feeDetails.discount || 0));
        feeDetails.balance = Math.max(0, feeDetails.finalFee - feeDetails.paidAmount);
        feeDetails.paymentStatus =
          feeDetails.balance === 0 && feeDetails.finalFee > 0
            ? "Paid"
            : feeDetails.paidAmount > 0
            ? "Partial"
            : "Pending";
      }

      return { ...s, isDuplicate: Boolean(isDup), feeDetails };
    });

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      students: processedStudents
    });
  } catch (error) {
    console.error("❌ [ERP getStudents Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Helper to transitively find all linked duplicate students sharing the same phone or email
export const getLinkedStudentIds = async (student) => {
  if (!student) return [];
  const visitedIds = new Set([student._id.toString()]);
  let currentGroup = [student];

  let changed = true;
  while (changed) {
    changed = false;
    const phones = [];
    const emails = [];

    currentGroup.forEach((s) => {
      const p = String(s.phone || "").replace(/\D/g, "").slice(-10);
      if (p && p.length >= 10 && !phones.includes(p)) phones.push(p);
      const e = (s.email || "").trim().toLowerCase();
      if (e && e.includes("@") && e !== "not provided" && !emails.includes(e)) emails.push(e);
    });

    const conditions = [];
    phones.forEach((p) => conditions.push({ phone: { $regex: p } }));
    emails.forEach((e) => conditions.push({ email: e }));

    if (conditions.length === 0) break;

    const matched = await ErpStudent.find({ $or: conditions })
      .select("_id studentId name phone email course feeDetails unlockedCourses isDuplicate createdAt")
      .lean();

    for (const m of matched) {
      if (!visitedIds.has(m._id.toString())) {
        visitedIds.add(m._id.toString());
        currentGroup.push(m);
        changed = true;
      }
    }
  }

  return currentGroup;
};

// 2. Get single student details with payment history & unified duplicate records
export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await ErpStudent.findById(id).populate("batch");

    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    // Find all linked students with the same phone or email
    const linkedStudents = await getLinkedStudentIds(student);
    const allStudentIds = linkedStudents.map((s) => s._id);

    // 1. Fetch all payments across all linked duplicate records
    const payments = await ErpPayment.find({ student: { $in: allStudentIds } })
      .sort({ paymentDate: -1 })
      .lean();

    const totalPaidAcrossRecords = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // 2. Consolidate unlocked courses across all linked records + website LMS
    const coursesDoc = await Courses.findOne().lean();
    const allCourses = coursesDoc?.course || [];

    const courseMap = new Map();
    // Gather from all duplicate student records
    linkedStudents.forEach((s) => {
      (s.unlockedCourses || []).forEach((uc) => {
        const key = uc.courseId || uc.courseSlug || uc.courseTitle;
        if (key && !courseMap.has(key)) {
          courseMap.set(key, uc);
        }
      });
    });

    // Also check Website User LMS account (models/Auth.js)
    const cleanEmail = (student.email || "").trim().toLowerCase();
    if (cleanEmail && cleanEmail.includes("@")) {
      const user = await User.findOne({ email: cleanEmail }).lean();
      if (user && user.enrolledCourses) {
        for (const ec of user.enrolledCourses) {
          const key = ec.courseId?.toString() || ec.courseSlug;
          if (key && !courseMap.has(key)) {
            const cDoc = allCourses.find((c) => c._id?.toString() === key || c.slug === key);
            courseMap.set(key, {
              courseId: key,
              courseTitle: cDoc?.title || cDoc?.name || ec.courseSlug || "LMS Course",
              courseSlug: ec.courseSlug || "",
              price: Number(cDoc?.price || cDoc?.fee) || 0,
              unlockedAt: ec.enrolledAt || new Date(),
              unlockedBy: "Website LMS"
            });
          }
        }
      }
    }

    const consolidatedUnlockedCourses = Array.from(courseMap.values());

    // Ensure prices are populated on unlockedCourses
    consolidatedUnlockedCourses.forEach((uc) => {
      if (!uc.price || uc.price === 0) {
        const cDoc = allCourses.find((c) => c._id?.toString() === uc.courseId || c.slug === uc.courseSlug);
        if (cDoc && (cDoc.price || cDoc.fee)) {
          uc.price = Number(cDoc.price || cDoc.fee);
        }
      }
    });

    // 3. Compute unified fee ledger
    let needsSave = false;
    if (!student.feeDetails) {
      student.feeDetails = { totalFee: 0, discount: 0, finalFee: 0, paidAmount: 0, balance: 0, paymentStatus: "Pending" };
    }

    if (consolidatedUnlockedCourses.length > (student.unlockedCourses || []).length) {
      student.unlockedCourses = consolidatedUnlockedCourses;
      needsSave = true;
    }

    // Calculate sum of fees across distinct courses this student is involved with
    const uniqueCourseNames = new Set();
    linkedStudents.forEach((ls) => {
      if (ls.course && ls.course.trim()) {
        uniqueCourseNames.add(ls.course.trim().toLowerCase());
      }
    });

    let enrolledCoursesFee = 0;
    for (const cName of uniqueCourseNames) {
      const p = await getCoursePrice(cName);
      enrolledCoursesFee += (Number(p) || 0);
    }

    // Add unlocked LMS courses that are not already covered in primary enrolled courses
    let unlockedCoursesSum = 0;
    consolidatedUnlockedCourses.forEach((uc) => {
      const cleanTitle = (uc.courseTitle || "").trim().toLowerCase();
      const alreadyInEnrolled = Array.from(uniqueCourseNames).some(
        (enr) => enr.includes(cleanTitle) || cleanTitle.includes(enr)
      );
      if (!alreadyInEnrolled) {
        unlockedCoursesSum += (Number(uc.price) || 0);
      }
    });

    const unifiedTotalFee = Math.max(enrolledCoursesFee + unlockedCoursesSum, totalPaidAcrossRecords);

    if (
      student.feeDetails.totalFee !== unifiedTotalFee ||
      student.feeDetails.paidAmount !== totalPaidAcrossRecords
    ) {
      student.feeDetails.totalFee = unifiedTotalFee;
      student.feeDetails.paidAmount = totalPaidAcrossRecords;
      const disc = Number(student.feeDetails.discount) || 0;
      student.feeDetails.finalFee = Math.max(0, unifiedTotalFee - disc);
      student.feeDetails.balance = Math.max(0, student.feeDetails.finalFee - totalPaidAcrossRecords);
      student.feeDetails.paymentStatus =
        student.feeDetails.balance === 0 && student.feeDetails.finalFee > 0
          ? "Paid"
          : totalPaidAcrossRecords > 0
          ? "Partial"
          : "Pending";
      needsSave = true;
    }

    if (linkedStudents.length > 1 && !student.isDuplicate) {
      student.isDuplicate = true;
      needsSave = true;
    }

    if (needsSave) {
      await student.save();
      // Keep other duplicate records in sync as well
      for (const ls of linkedStudents) {
        if (ls._id.toString() !== student._id.toString()) {
          await ErpStudent.findByIdAndUpdate(ls._id, {
            unlockedCourses: consolidatedUnlockedCourses,
            "feeDetails.totalFee": student.feeDetails.totalFee,
            "feeDetails.finalFee": student.feeDetails.finalFee,
            "feeDetails.paidAmount": student.feeDetails.paidAmount,
            "feeDetails.balance": student.feeDetails.balance,
            "feeDetails.paymentStatus": student.feeDetails.paymentStatus,
            isDuplicate: true
          });
        }
      }
    }

    // Two-way sync: Ensure Website User LMS account (models/Auth.js) also has these courses unlocked!
    if (cleanEmail && cleanEmail.includes("@") && consolidatedUnlockedCourses.length > 0) {
      try {
        let authUser = await User.findOne({ email: cleanEmail });
        if (!authUser) {
          const studentPhone = String(student.phone || "").trim();
          const defaultPass = "Weekend@" + (studentPhone.length >= 4 ? studentPhone.slice(-4) : "1234");
          authUser = new User({
            name: student.name || "Student",
            email: cleanEmail,
            password: defaultPass,
            enrolledCourses: []
          });
        }
        if (authUser) {
          let userUpdated = false;
          if (!authUser.enrolledCourses) authUser.enrolledCourses = [];
          for (const uc of consolidatedUnlockedCourses) {
            const uCourseId = uc.courseId?.toString();
            const uSlug = uc.courseSlug || "";
            const existsInAuth = authUser.enrolledCourses.some(
              (ec) => (uCourseId && ec.courseId?.toString() === uCourseId) || (uSlug && ec.courseSlug === uSlug)
            );
            if (!existsInAuth) {
              authUser.enrolledCourses.push({
                courseId: uCourseId,
                courseSlug: uSlug,
                enrolledAt: uc.unlockedAt || new Date(),
                progress: 0,
                completedLessons: []
              });
              userUpdated = true;
            }
          }
          if (userUpdated) {
            await authUser.save();
          }
        }
      } catch (err) {
        console.error("❌ Error syncing to User LMS in getStudentById:", err.message);
      }
    }

    const linkedProfiles = linkedStudents
      .filter((s) => s._id.toString() !== student._id.toString())
      .map((s) => ({
        _id: s._id,
        studentId: s.studentId,
        name: s.name,
        course: s.course,
        enrollmentDate: s.enrollmentDate
      }));

    // Fetch student attendance summary and history
    let attendanceSummary = {
      totalSessions: student.attendanceStats?.totalSessions || 0,
      attendedSessions: student.attendanceStats?.attendedSessions || 0,
      percentage: student.attendanceStats?.percentage || 0,
      history: []
    };

    try {
      const ErpAttendance = (await import("../models/ErpAttendance.js")).default;
      const attendanceSessions = await ErpAttendance.find({
        "records.student": student._id
      })
        .sort({ date: -1 })
        .limit(20)
        .lean();

      let presentSessions = 0;
      const history = attendanceSessions.map((s) => {
        const rec = (s.records || []).find((r) => r.student?.toString() === student._id.toString());
        const status = rec?.status || "Present";
        if (status === "Present" || status === "Late") presentSessions++;
        return {
          _id: s._id,
          date: s.date,
          dateStr: s.dateStr,
          topic: s.topic,
          status,
          remarks: rec?.remarks || ""
        };
      });

      const totalSessions = attendanceSessions.length;
      const percentage = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

      attendanceSummary = {
        totalSessions,
        attendedSessions: presentSessions,
        percentage,
        history
      };
    } catch (attErr) {
      console.error("Error fetching attendance in getStudentById:", attErr.message);
    }

    return res.status(200).json({
      success: true,
      student,
      payments,
      linkedProfiles,
      attendance: attendanceSummary
    });
  } catch (error) {
    console.error("❌ [ERP getStudentById Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Create new student manually
export const createStudent = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      course,
      batch,
      feeDetails,
      address,
      education,
      emergencyContact,
      notes
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, error: "Student name and phone number are required." });
    }

    const cleanPhone = String(phone || "").replace(/\D/g, "").slice(-10);
    const existingStudent = await ErpStudent.findOne({
      $or: [
        ...(cleanPhone ? [{ phone: { $regex: cleanPhone } }] : []),
        ...(email && email.includes("@") ? [{ email: email.trim().toLowerCase() }] : [])
      ]
    });

    const isDuplicate = !!existingStudent;
    if (existingStudent && !existingStudent.isDuplicate) {
      existingStudent.isDuplicate = true;
      await existingStudent.save();
    }

    const studentId = await generateStudentId();
    const catalogPrice = await getCoursePrice(course);

    const initialTotalFee = (feeDetails && Number(feeDetails.totalFee) > 0 && Number(feeDetails.totalFee) !== 45000)
      ? Number(feeDetails.totalFee)
      : (catalogPrice || 45000);
    const initialDiscount = (feeDetails && Number(feeDetails.discount)) || 0;
    const finalFee = Math.max(0, initialTotalFee - initialDiscount);
    const paidAmount = (feeDetails && Number(feeDetails.paidAmount)) || 0;
    const balance = Math.max(0, finalFee - paidAmount);
    const paymentStatus = balance === 0 && finalFee > 0 ? "Paid" : (paidAmount > 0 ? "Partial" : "Pending");

    const student = new ErpStudent({
      studentId,
      name: name.trim(),
      phone: phone.trim(),
      email: (email || "").trim(),
      course: (course || "UI/UX Design Masterclass").trim(),
      batch: batch || null,
      isDuplicate,
      feeDetails: {
        totalFee: initialTotalFee,
        discount: initialDiscount,
        finalFee: finalFee,
        paidAmount: paidAmount,
        balance: balance,
        paymentStatus: paymentStatus
      },
      address: address || "",
      education: education || "",
      emergencyContact: emergencyContact || {},
      notes: notes ? [{ text: notes, author: "Admin", createdAt: new Date() }] : []
    });

    await student.save();
    await student.populate("batch", "name batchCode course");

    return res.status(201).json({
      success: true,
      message: "Student enrolled successfully in ERP",
      student
    });
  } catch (error) {
    console.error("❌ [ERP createStudent Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 4. Update student
export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const student = await ErpStudent.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    if (updates.name) student.name = updates.name.trim();
    if (updates.email !== undefined) student.email = updates.email.trim();
    if (updates.phone) student.phone = updates.phone.trim();
    if (updates.course) student.course = updates.course.trim();
    if (updates.batch !== undefined) student.batch = updates.batch || null;
    if (updates.status) student.status = updates.status;
    if (updates.address !== undefined) student.address = updates.address;
    if (updates.education !== undefined) student.education = updates.education;
    if (updates.rollNumber !== undefined) student.rollNumber = updates.rollNumber;
    if (updates.emergencyContact) student.emergencyContact = updates.emergencyContact;

    if (updates.feeDetails) {
      student.feeDetails = {
        ...student.feeDetails.toObject(),
        ...updates.feeDetails
      };
    }

    await student.save();
    await student.populate("batch", "name batchCode course schedule");

    return res.status(200).json({
      success: true,
      message: "Student details updated successfully",
      student
    });
  } catch (error) {
    console.error("❌ [ERP updateStudent Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 5. Delete student
export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await ErpStudent.findById(id);

    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    // Clean up payments and batch references
    await ErpPayment.deleteMany({ student: id });
    await ErpBatch.updateMany({ students: id }, { $pull: { students: id } });

    await ErpStudent.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Student removed from ERP records"
    });
  } catch (error) {
    console.error("❌ [ERP deleteStudent Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 6. Add note to student profile
export const addStudentNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, author = "Counselor" } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: "Note content cannot be empty." });
    }

    const student = await ErpStudent.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    student.notes.unshift({
      text: text.trim(),
      author,
      createdAt: new Date()
    });

    await student.save();

    return res.status(200).json({
      success: true,
      message: "Note added successfully",
      notes: student.notes
    });
  } catch (error) {
    console.error("❌ [ERP addStudentNote Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 7. Helper to instantly sync an individual enrolled CRM lead into ERP
export const syncSingleEnrolledLeadToErp = async (lead) => {
  if (!lead || !lead._id) return null;
  try {
    // 1. Check if student already exists for this exact CRM Lead ID
    let existing = await ErpStudent.findOne({ crmLeadId: lead._id });

    // 2. Check duplicate candidate by phone or email
    const cleanPhone = String(lead.phone || "").replace(/\D/g, "").slice(-10);
    const duplicateStudent = await ErpStudent.findOne({
      ...(existing ? { _id: { $ne: existing._id } } : {}),
      $or: [
        ...(cleanPhone && cleanPhone.length >= 10 ? [{ phone: { $regex: cleanPhone } }] : []),
        ...(lead.email && lead.email.includes("@") && lead.email !== "Not provided" ? [{ email: lead.email.trim().toLowerCase() }] : [])
      ]
    });

    const isDuplicate = Boolean(lead.isDuplicate || (lead.autoTags && lead.autoTags.includes("Duplicate")) || duplicateStudent);
    if (duplicateStudent && !duplicateStudent.isDuplicate) {
      duplicateStudent.isDuplicate = true;
      await duplicateStudent.save();
    }

    const enrolledFee = Number(lead.enrollmentFee) || 0;
    const catalogPrice = await getCoursePrice(lead.course);
    const dealAmount = Number(lead.dealValue) || catalogPrice;

    let previousPaid = 0;
    let combinedUnlockedCourses = [];
    let initialTotalFee = dealAmount;

    if (duplicateStudent) {
      const prevPayments = await ErpPayment.find({ student: duplicateStudent._id }).lean();
      previousPaid = prevPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      combinedUnlockedCourses = [...(duplicateStudent.unlockedCourses || [])];
      initialTotalFee = (Number(duplicateStudent.feeDetails?.totalFee) || 0) + dealAmount;
    }

    const paidAmount = previousPaid + enrolledFee;
    const balance = Math.max(0, initialTotalFee - paidAmount);
    const paymentStatus = balance === 0 && initialTotalFee > 0 ? "Paid" : (paidAmount > 0 ? "Partial" : "Pending");

    // Auto-unlock enrolled course for the student
    const coursesDoc = await Courses.findOne().lean();
    const allCourses = coursesDoc?.course || [];
    const cleanLeadCourse = String(lead.course || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const matchedLeadCourse = allCourses.find((c) => {
      if (!c.title) return false;
      const ct = String(c.title).toLowerCase().replace(/[^a-z0-9]/g, "");
      return ct.includes(cleanLeadCourse) || cleanLeadCourse.includes(ct);
    });

    const enrolledCourseTitle = matchedLeadCourse?.title || lead.course || "UI/UX Design Masterclass";
    const enrolledCourseId = matchedLeadCourse?._id?.toString() || cleanLeadCourse;
    const enrolledCourseSlug = matchedLeadCourse?.slug || "";
    const enrolledCoursePrice = Number(matchedLeadCourse?.price || matchedLeadCourse?.fee) || catalogPrice;

    const hasCourseAlready = combinedUnlockedCourses.some(
      (uc) =>
        (uc.courseId && uc.courseId === enrolledCourseId) ||
        (uc.courseTitle && uc.courseTitle.toLowerCase().replace(/[^a-z0-9]/g, "").includes(cleanLeadCourse))
    );

    if (!existing && lead.name && (lead.phone || lead.email)) {
      const studentId = await generateStudentId();
      const newStudent = new ErpStudent({
        studentId,
        name: lead.name,
        phone: lead.phone || "Not Provided",
        email: lead.email && lead.email !== "Not provided" ? lead.email : "",
        course: lead.course || "UI/UX Design Masterclass",
        crmLeadId: lead._id,
        isDuplicate,
        unlockedCourses: combinedUnlockedCourses, // only keeps courses explicitly unlocked previously
        feeDetails: {
          totalFee: initialTotalFee,
          discount: 0,
          finalFee: initialTotalFee,
          paidAmount: paidAmount,
          balance: balance,
          paymentStatus: paymentStatus
        },
        notes: [
          {
            text: `Synced from CRM Lead Pipeline (Status: Enrolled, Source: ${lead.source || "Website"})${duplicateStudent ? ` [Linked with duplicate student ${duplicateStudent.studentId}]` : ""}`,
            author: "CRM Auto-Sync",
            createdAt: new Date()
          }
        ]
      });

      await newStudent.save();

      // Create official payment receipt if initial enrollment fee was paid
      if (enrolledFee > 0) {
        const year = new Date().getFullYear();
        const receiptNo = `REC-${year}-${String(Math.floor(100 + Math.random() * 900))}`;
        const payment = new ErpPayment({
          receiptNo,
          student: newStudent._id,
          amount: enrolledFee,
          paymentMode: "UPI",
          notes: "Admission enrollment fee recorded via CRM",
          receivedBy: "CRM Admission"
        });
        await payment.save();
      }

      // Also sync duplicateStudent's feeDetails to match
      if (duplicateStudent) {
        duplicateStudent.feeDetails.totalFee = initialTotalFee;
        duplicateStudent.feeDetails.paidAmount = paidAmount;
        duplicateStudent.feeDetails.finalFee = initialTotalFee;
        duplicateStudent.feeDetails.balance = balance;
        duplicateStudent.feeDetails.paymentStatus = paymentStatus;
        duplicateStudent.isDuplicate = true;
        await duplicateStudent.save();
      }

      console.log(`🎓 [ERP Sync] Enrolled student in ERP: ${newStudent.name} (${newStudent.studentId}) - Course: ${newStudent.course} (Total Fee: ₹${initialTotalFee}, Paid: ₹${paidAmount})`);
      return newStudent;
    } else if (existing) {
      let updated = false;
      if (lead.course && existing.course !== lead.course) {
        existing.course = lead.course;
        updated = true;
      }
      if (isDuplicate && !existing.isDuplicate) {
        existing.isDuplicate = true;
        updated = true;
      }
      if (existing.feeDetails?.totalFee === 45000 || !existing.feeDetails?.totalFee) {
        existing.feeDetails.totalFee = dealAmount;
        existing.feeDetails.finalFee = Math.max(0, dealAmount - (Number(existing.feeDetails?.discount) || 0));
        updated = true;
      }
      const existingPaid = Number(existing.feeDetails?.paidAmount || 0);
      if (existingPaid === 0 && enrolledFee > 0) {
        existing.feeDetails.paidAmount = enrolledFee;
        updated = true;

        const existingPay = await ErpPayment.findOne({ student: existing._id });
        if (!existingPay) {
          const year = new Date().getFullYear();
          const receiptNo = `REC-${year}-${String(Math.floor(100 + Math.random() * 900))}`;
          const payment = new ErpPayment({
            receiptNo,
            student: existing._id,
            amount: enrolledFee,
            paymentMode: "UPI",
            notes: "Admission enrollment fee recorded via CRM sync",
            receivedBy: "CRM Admission"
          });
          await payment.save();
        }
      }
      if (updated) {
        const finalAmt = Number(existing.feeDetails.finalFee) || dealAmount;
        const currentPaid = Number(existing.feeDetails.paidAmount) || 0;
        existing.feeDetails.balance = Math.max(0, finalAmt - currentPaid);
        existing.feeDetails.paymentStatus = existing.feeDetails.balance === 0 && finalAmt > 0 ? "Paid" : (currentPaid > 0 ? "Partial" : "Pending");
        await existing.save();
      }
      return existing;
    }
    return null;
  } catch (err) {
    console.error("❌ [syncSingleEnrolledLeadToErp Error]:", err);
    return null;
  }
};

// 8. Auto-Import / Bulk Sync All Enrolled Leads from CRM into ERP
export const importEnrolledLeadsFromCrm = async (req, res) => {
  try {
    const enrolledLeads = await CrmLead.find({
      $or: [
        { status: { $regex: /^enrolled$/i } },
        { stage: { $regex: /^enrolled$/i } },
        { stage: { $regex: /^won$/i } }
      ]
    }).lean();

    if (!enrolledLeads || enrolledLeads.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No enrolled leads found in CRM to import.",
        importedCount: 0
      });
    }

    let importedCount = 0;
    const importedStudents = [];

    for (const lead of enrolledLeads) {
      const student = await syncSingleEnrolledLeadToErp(lead);
      if (student) {
        importedCount++;
        importedStudents.push(student);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully synchronized ${importedCount} enrolled lead(s) from CRM into ERP.`,
      importedCount,
      students: importedStudents
    });
  } catch (error) {
    console.error("❌ [ERP importEnrolledLeadsFromCrm Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 8. ERP High-level statistics
export const getErpStats = async (req, res) => {
  try {
    const [totalStudents, activeStudents, completedStudents, batchesCount] = await Promise.all([
      ErpStudent.countDocuments(),
      ErpStudent.countDocuments({ status: "Active" }),
      ErpStudent.countDocuments({ status: "Completed" }),
      ErpBatch.countDocuments()
    ]);

    // Financial aggregates
    const feeAggregation = await ErpStudent.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$feeDetails.finalFee" },
          totalPaid: { $sum: "$feeDetails.paidAmount" },
          totalPending: { $sum: "$feeDetails.balance" }
        }
      }
    ]);

    const financials = feeAggregation[0] || { totalRevenue: 0, totalPaid: 0, totalPending: 0 };

    return res.status(200).json({
      success: true,
      stats: {
        totalStudents,
        activeStudents,
        completedStudents,
        batchesCount,
        financials
      }
    });
  } catch (error) {
    console.error("❌ [ERP getErpStats Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 9. Fetch all Academy Courses available for LMS unlock
export const getAcademyCourses = async (req, res) => {
  try {
    const coursesDoc = await Courses.findOne().lean();
    const courses = (coursesDoc?.course || []).map((c) => ({
      _id: c._id?.toString(),
      title: c.title || c.name || c.courseName || "Course",
      slug: c.slug || "",
      category: c.category || "Design",
      tagline: c.tagline || "",
      duration: c.duration || "",
      price: Number(c.price || c.fee) || 0,
      sectionsCount: c.curriculum?.length || 0
    }));

    return res.status(200).json({
      success: true,
      courses
    });
  } catch (error) {
    console.error("❌ [ERP getAcademyCourses Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 10. Unlock Course for Student on Website LMS & Add to Fee Ledger
export const unlockCourseForStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { courseId, unlockedBy = "ERP Counselor" } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, error: "Course ID is required to unlock access." });
    }

    const student = await ErpStudent.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found in ERP records." });
    }

    // Find course in Courses collection
    const coursesDoc = await Courses.findOne().lean();
    const allCourses = coursesDoc?.course || [];
    const targetCourse = allCourses.find(
      (c) => c._id?.toString() === courseId.toString() || c.slug === courseId.toString()
    );

    if (!targetCourse) {
      return res.status(404).json({ success: false, error: "Course not found in academy catalog." });
    }

    const targetCourseIdStr = targetCourse._id?.toString();
    const targetTitle = targetCourse.title || targetCourse.name || targetCourse.courseName || "Course";
    const targetSlug = targetCourse.slug || "";
    const coursePrice = Number(targetCourse.price || targetCourse.fee) || 0;

    // 1. Sync / Unlock on Website User LMS account (models/Auth.js)
    const studentEmail = (student.email || "").trim().toLowerCase();
    const studentPhone = (student.phone || "").trim();

    let user = null;
    if (studentEmail) {
      user = await User.findOne({ email: studentEmail });
    }

    // Auto-create Website LMS account if user doesn't exist
    if (!user && studentEmail) {
      const defaultPass = "Weekend@" + (studentPhone.length >= 4 ? studentPhone.slice(-4) : "1234");
      user = new User({
        name: student.name,
        email: studentEmail,
        password: defaultPass,
        enrolledCourses: []
      });
    }

    if (user) {
      const alreadyEnrolledInUser = (user.enrolledCourses || []).some(
        (c) => c.courseId?.toString() === targetCourseIdStr || (targetSlug && c.courseSlug === targetSlug)
      );

      if (!alreadyEnrolledInUser) {
        user.enrolledCourses.push({
          courseId: targetCourse._id,
          courseSlug: targetSlug,
          enrolledAt: new Date(),
          progress: 0,
          completedLessons: []
        });
        await user.save();
      }
    }

    // 2. Add to student's unlockedCourses in ERP & Add to Fee Ledger
    if (!student.unlockedCourses) {
      student.unlockedCourses = [];
    }

    const alreadyUnlockedInStudent = student.unlockedCourses.some(
      (c) => c.courseId === targetCourseIdStr || (targetSlug && c.courseSlug === targetSlug)
    );

    if (!alreadyUnlockedInStudent) {
      student.unlockedCourses.push({
        courseId: targetCourseIdStr,
        courseTitle: targetTitle,
        courseSlug: targetSlug,
        price: coursePrice,
        unlockedAt: new Date(),
        unlockedBy
      });

      // ADD TO FEE LEDGER:
      if (!student.feeDetails) {
        student.feeDetails = { totalFee: 0, discount: 0, finalFee: 0, paidAmount: 0, balance: 0, paymentStatus: "Pending" };
      }

      const initialTotalFee = Number(student.feeDetails.totalFee) || 0;
      const cleanTarget = targetTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanStudentCourse = String(student.course || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const isInitialMatchingCourse = cleanStudentCourse && (cleanTarget.includes(cleanStudentCourse) || cleanStudentCourse.includes(cleanTarget));

      // If this is the very first course unlocked AND it matches the student's initial course AND initialTotalFee already equals coursePrice,
      // it was already counted at enrollment. Otherwise, add coursePrice to totalFee!
      if (!(student.unlockedCourses.length === 1 && isInitialMatchingCourse && initialTotalFee === coursePrice)) {
        student.feeDetails.totalFee = initialTotalFee + coursePrice;
      }

      student.notes.unshift({
        text: `LMS Course Access Unlocked: "${targetTitle}" (${coursePrice > 0 ? `+₹${coursePrice.toLocaleString('en-IN')} added to Fee Ledger` : 'Free'}).`,
        author: unlockedBy,
        createdAt: new Date()
      });

      await student.save();

      // Also sync to all linked duplicate students
      const linkedStudents = await getLinkedStudentIds(student);
      for (const ls of linkedStudents) {
        if (ls._id.toString() !== student._id.toString()) {
          const lStudent = await ErpStudent.findById(ls._id);
          if (lStudent) {
            if (!lStudent.unlockedCourses) lStudent.unlockedCourses = [];
            const exists = lStudent.unlockedCourses.some(
              (c) => c.courseId === targetCourseIdStr || (targetSlug && c.courseSlug === targetSlug)
            );
            if (!exists) {
              lStudent.unlockedCourses.push({
                courseId: targetCourseIdStr,
                courseTitle: targetTitle,
                courseSlug: targetSlug,
                price: coursePrice,
                unlockedAt: new Date(),
                unlockedBy
              });
            }
            lStudent.feeDetails.totalFee = student.feeDetails.totalFee;
            lStudent.feeDetails.paidAmount = student.feeDetails.paidAmount;
            lStudent.isDuplicate = true;
            await lStudent.save();
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully unlocked "${targetTitle}" for ${student.name} (+₹${coursePrice.toLocaleString('en-IN')} added to Fee Ledger)!`,
      student,
      unlockedCourses: student.unlockedCourses,
      feeDetails: student.feeDetails,
      userLmsSynced: !!user
    });
  } catch (error) {
    console.error("❌ [ERP unlockCourseForStudent Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 11. Revoke Course Access from Student & Deduct from Fee Ledger
export const revokeCourseFromStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { courseId, revokedBy = "ERP Counselor" } = req.body;

    const student = await ErpStudent.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found." });
    }

    const removedCourse = (student.unlockedCourses || []).find(
      (c) => c.courseId === courseId || c.courseSlug === courseId
    );

    const coursePrice = Number(removedCourse?.price) || 0;

    student.unlockedCourses = (student.unlockedCourses || []).filter(
      (c) => c.courseId !== courseId && c.courseSlug !== courseId
    );

    if (coursePrice > 0) {
      student.feeDetails.totalFee = Math.max(0, (student.feeDetails.totalFee || 0) - coursePrice);
    }

    student.notes.unshift({
      text: `LMS Course Access Revoked: "${removedCourse?.courseTitle || 'Course'}" (${coursePrice > 0 ? `-₹${coursePrice.toLocaleString('en-IN')} from Fee Ledger` : ''}).`,
      author: revokedBy,
      createdAt: new Date()
    });

    await student.save();

    // Also revoke from User LMS account if exists
    if (student.email) {
      const user = await User.findOne({ email: student.email.toLowerCase() });
      if (user && user.enrolledCourses) {
        user.enrolledCourses = user.enrolledCourses.filter(
          (c) => c.courseId?.toString() !== courseId && c.courseSlug !== courseId
        );
        await user.save();
      }
    }

    // Sync across linked duplicate students
    const linkedStudents = await getLinkedStudentIds(student);
    for (const ls of linkedStudents) {
      if (ls._id.toString() !== student._id.toString()) {
        const lStudent = await ErpStudent.findById(ls._id);
        if (lStudent) {
          lStudent.unlockedCourses = (lStudent.unlockedCourses || []).filter(
            (c) => c.courseId !== courseId && c.courseSlug !== courseId
          );
          if (coursePrice > 0) {
            lStudent.feeDetails.totalFee = Math.max(0, (lStudent.feeDetails.totalFee || 0) - coursePrice);
          }
          await lStudent.save();
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Access revoked for course`,
      student,
      unlockedCourses: student.unlockedCourses,
      feeDetails: student.feeDetails
    });
  } catch (error) {
    console.error("❌ [ERP revokeCourseFromStudent Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
