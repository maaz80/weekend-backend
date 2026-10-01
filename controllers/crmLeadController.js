import CrmLead from "../models/CrmLead.js";
import Lead from "../models/Lead.js";
import WhatsAppLead from "../models/WhatsAppLead.js";
import connectDB from "../config/db.js";

// Helper: Normalize 10-digit Indian phone
const cleanPhoneNumber = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

/**
 * 1. Get all leads with advanced filtering, search, and pagination
 */
export const getLeads = async (req, res) => {
  try {
    await connectDB();
    const {
      status,
      course,
      source,
      priority,
      search,
      followUp,
      page = 1,
      limit = 100,
      sortBy = "lastActivityAt",
      sortOrder = "desc"
    } = req.query;

    const query = {};

    // Filter by status
    if (status && status !== "All") {
      query.status = status;
    }

    // Filter by course
    if (course && course !== "All") {
      query.course = { $regex: new RegExp(course, "i") };
    }

    // Filter by source
    if (source && source !== "All") {
      query.source = { $regex: new RegExp(source, "i") };
    }

    // Filter by priority
    if (priority && priority !== "All") {
      query.priority = priority;
    }

    // Filter by search term (Name, Phone, Email)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { course: searchRegex }
      ];
    }

    // Filter by Follow-Up timing
    if (followUp) {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      if (followUp === "today") {
        query.followUpDate = { $gte: startOfToday, $lte: endOfToday };
      } else if (followUp === "overdue") {
        query.followUpDate = { $lt: startOfToday };
        query.status = { $nin: ["Enrolled", "Lost"] };
      } else if (followUp === "upcoming") {
        query.followUpDate = { $gt: endOfToday };
      }
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [leads, total] = await Promise.all([
      CrmLead.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      CrmLead.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      leads
    });
  } catch (error) {
    console.error("❌ [CRM getLeads Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 2. Get Single Lead by ID
 */
export const getLeadById = async (req, res) => {
  try {
    await connectDB();
    const lead = await CrmLead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    return res.status(200).json({ success: true, lead });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 3. Create a New Lead Manually (Walk-in, Phone call, Referral)
 */
export const createLead = async (req, res) => {
  try {
    await connectDB();
    const {
      name,
      phone,
      email,
      course,
      source,
      priority,
      status,
      assignedTo,
      initialNote,
      followUpDate,
      followUpTime
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: "Name and Phone number are required." });
    }

    const cleanPhone = cleanPhoneNumber(phone);
    let existingLead = await CrmLead.findOne({
      $or: [{ phone: cleanPhone }, { phone: phone.trim() }]
    });

    if (existingLead) {
      // Append note if provided
      if (initialNote && initialNote.trim()) {
        existingLead.notes.push({
          author: assignedTo || "Counselor",
          text: `[New Inquiry Recorded]: ${initialNote.trim()}`
        });
        existingLead.lastActivityAt = new Date();
        await existingLead.save();
      }
      return res.status(200).json({
        success: true,
        message: "Lead already exists. Updated existing record.",
        lead: existingLead
      });
    }

    const newLeadData = {
      name: name.trim(),
      phone: cleanPhone || phone.trim(),
      email: email ? email.trim() : "",
      course: course || "UI/UX Design Course",
      source: source || "Manual Entry",
      priority: priority || "Warm",
      status: status || "Pending",
      assignedTo: assignedTo || "Unassigned",
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      followUpTime: followUpTime || "",
      notes: initialNote ? [{ author: assignedTo || "Counselor", text: initialNote.trim() }] : [],
      lastActivityAt: new Date()
    };

    const newLead = await CrmLead.create(newLeadData);
    return res.status(201).json({ success: true, message: "Lead created successfully", lead: newLead });
  } catch (error) {
    console.error("❌ [CRM createLead Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 4. Update Lead Details
 */
export const updateLead = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.params;
    const updates = { ...req.body, lastActivityAt: new Date() };

    const lead = await CrmLead.findByIdAndUpdate(id, updates, { new: true });
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    if (lead.status === "Enrolled") {
      import("./erpStudentController.js")
        .then(({ syncSingleEnrolledLeadToErp }) => syncSingleEnrolledLeadToErp(lead))
        .catch((err) => console.error("Error auto-syncing enrolled lead to ERP:", err));
    }

    return res.status(200).json({ success: true, message: "Lead updated", lead });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 5. Update Status (With auto system log & optional drop/enrollment details)
 */
export const updateLeadStatus = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.params;
    const { status, counselorName = "Counselor", enrollmentFee, dropReason, note } = req.body;

    const validStatuses = ["Pending", "Contacted", "In Discussion", "Demo Scheduled", "Enrolled", "Lost"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
    }

    const lead = await CrmLead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    const oldStatus = lead.status;
    lead.status = status;
    lead.lastActivityAt = new Date();

    if (enrollmentFee !== undefined) lead.enrollmentFee = Number(enrollmentFee) || 0;
    if (dropReason !== undefined) lead.dropReason = dropReason;

    // Log status change in notes timeline
    let logText = `Status changed from "${oldStatus}" to "${status}".`;
    if (status === "Enrolled" && enrollmentFee) {
      logText += ` (Enrollment Fee: ₹${enrollmentFee})`;
    }
    if (status === "Lost" && dropReason) {
      logText += ` (Reason: ${dropReason})`;
    }
    if (note && note.trim()) {
      logText += ` Note: ${note.trim()}`;
    }

    lead.notes.push({
      author: counselorName,
      text: logText
    });

    await lead.save();

    // If status transitioned to Enrolled, immediately sync student into ERP
    if (status === "Enrolled") {
      import("./erpStudentController.js")
        .then(({ syncSingleEnrolledLeadToErp }) => syncSingleEnrolledLeadToErp(lead))
        .catch((err) => console.error("Error auto-syncing enrolled lead to ERP:", err));
    }

    return res.status(200).json({ success: true, message: "Status updated successfully", lead });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 6. Add Counselor Note to Lead Timeline
 */
export const addLeadNote = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.params;
    const { author = "Counselor", text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Note text is required." });
    }

    const lead = await CrmLead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    lead.notes.push({
      author: author.trim(),
      text: text.trim(),
      createdAt: new Date()
    });
    lead.lastActivityAt = new Date();

    await lead.save();
    return res.status(200).json({ success: true, message: "Note added successfully", lead });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 7. Schedule / Reschedule Next Follow-Up
 */
export const scheduleFollowUp = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.params;
    const { date, time, note = "", counselorName = "Counselor" } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, message: "Follow-up date is required." });
    }

    const lead = await CrmLead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    lead.followUpDate = new Date(date);
    lead.followUpTime = time || "";
    lead.followUpNote = note;
    lead.lastActivityAt = new Date();

    const formattedDate = new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
    const logText = `Scheduled next follow-up on ${formattedDate}${time ? ` at ${time}` : ""}${note ? `. Remark: ${note}` : ""}`;

    lead.notes.push({
      author: counselorName,
      text: logText
    });

    await lead.save();
    return res.status(200).json({ success: true, message: "Follow-up scheduled", lead });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 8. Comprehensive CRM Analytics & KPIs
 */
export const getAnalytics = async (req, res) => {
  try {
    await connectDB();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const [
      totalLeads,
      todayLeads,
      pendingCount,
      contactedCount,
      inDiscussionCount,
      demoCount,
      enrolledCount,
      lostCount,
      followUpsTodayCount,
      overdueFollowUpsCount,
      sourceStats,
      courseStats
    ] = await Promise.all([
      CrmLead.countDocuments(),
      CrmLead.countDocuments({ createdAt: { $gte: startOfToday, $lte: endOfToday } }),
      CrmLead.countDocuments({ status: "Pending" }),
      CrmLead.countDocuments({ status: "Contacted" }),
      CrmLead.countDocuments({ status: "In Discussion" }),
      CrmLead.countDocuments({ status: "Demo Scheduled" }),
      CrmLead.countDocuments({ status: "Enrolled" }),
      CrmLead.countDocuments({ status: "Lost" }),
      CrmLead.countDocuments({ followUpDate: { $gte: startOfToday, $lte: endOfToday } }),
      CrmLead.countDocuments({
        followUpDate: { $lt: startOfToday },
        status: { $nin: ["Enrolled", "Lost"] }
      }),
      CrmLead.aggregate([
        { $group: { _id: "$source", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      CrmLead.aggregate([
        { $group: { _id: "$course", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 }
      ])
    ]);

    const resolved = enrolledCount + lostCount;
    const conversionRate = resolved > 0 ? ((enrolledCount / resolved) * 100).toFixed(1) : 0;

    return res.status(200).json({
      success: true,
      metrics: {
        totalLeads,
        todayLeads,
        pendingCount,
        contactedCount,
        inDiscussionCount,
        demoCount,
        enrolledCount,
        lostCount,
        followUpsTodayCount,
        overdueFollowUpsCount,
        conversionRate: Number(conversionRate),
        sourceStats,
        courseStats
      }
    });
  } catch (error) {
    console.error("❌ [CRM Analytics Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 9. One-Click Fast Sync Existing Database Leads (from Website `leads` & `whatsappleads`)
 */
export const syncExistingLeads = async (req, res) => {
  try {
    await connectDB();
    const mongoose = (await import("mongoose")).default;

    const [websiteLeads, whatsappLeads, existingCrm] = await Promise.all([
      mongoose.connection.collection("leads").find().toArray(),
      mongoose.connection.collection("whatsappleads").find().toArray(),
      CrmLead.find().select("phone email originalLeadId").lean()
    ]);

    // Build In-Memory Lookup Sets for lightning-fast (O(1)) duplicate checking
    const phoneSet = new Set();
    const emailSet = new Set();
    const origIdSet = new Set();

    for (const c of existingCrm) {
      const p = cleanPhoneNumber(c.phone);
      if (p && p.length >= 10) phoneSet.add(p);
      if (c.email && c.email.includes("@")) emailSet.add(c.email.trim().toLowerCase());
      if (c.originalLeadId) origIdSet.add(String(c.originalLeadId));
    }

    const { calculateLeadScoreAndTags, getDefaultFollowUp } = await import("../services/leadService.js");

    const leadsToInsert = [];
    let importedCount = 0;
    let existingCount = 0;

    // 1. Process Website Leads
    for (const wl of websiteLeads) {
      const cleanPhone = cleanPhoneNumber(wl.phone);
      const emailLower = wl.email ? wl.email.trim().toLowerCase() : "";
      const origIdStr = String(wl._id);

      const isMatch =
        (cleanPhone && cleanPhone.length >= 10 && phoneSet.has(cleanPhone)) ||
        (emailLower && emailLower.includes("@") && emailSet.has(emailLower)) ||
        origIdSet.has(origIdStr);

      if (isMatch) {
        existingCount++;
        continue;
      }

      let answersSummary = "";
      if (wl.answers) {
        if (typeof wl.answers === "object") {
          answersSummary = Object.entries(wl.answers)
            .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
            .join(" | ");
        } else {
          answersSummary = String(wl.answers);
        }
      }

      const courseName = wl.course || wl.answers?.course || wl.answers?.courseName || "General Inquiry";
      const { score, priority, tags } = calculateLeadScoreAndTags({
        name: wl.name,
        phone: cleanPhone,
        email: emailLower,
        course: courseName,
        answersSummary,
        source: wl.source,
        status: wl.status || "Pending"
      });

      const { date: defaultDate, time: defaultTime } = getDefaultFollowUp();

      leadsToInsert.push({
        name: wl.name || "Website Visitor",
        phone: cleanPhone || wl.phone || "Not Provided",
        email: emailLower || "",
        course: courseName,
        source: wl.source || "Website Lead",
        status: wl.status || "Pending",
        priority,
        leadScore: score,
        autoTags: tags,
        followUpDate: defaultDate,
        followUpTime: defaultTime,
        followUpNote: "Auto-assigned callback window",
        answers: wl.answers || {},
        answersSummary,
        originalLeadId: origIdStr,
        originalType: "lead",
        notes: [
          {
            author: "CRM Fast-Sync",
            text: `[Database Sync]: Ingested from Website inquiries. Score: ${score}/100.`,
            createdAt: new Date()
          }
        ],
        createdAt: wl.createdAt || new Date(),
        lastActivityAt: wl.updatedAt || wl.createdAt || new Date()
      });

      if (cleanPhone && cleanPhone.length >= 10) phoneSet.add(cleanPhone);
      if (emailLower && emailLower.includes("@")) emailSet.add(emailLower);
      origIdSet.add(origIdStr);
      importedCount++;
    }

    // 2. Process WhatsApp Leads
    for (const wal of whatsappLeads) {
      const cleanPhone = cleanPhoneNumber(wal.whatsapp_number);
      if (!cleanPhone) continue;
      const origIdStr = String(wal._id);

      const isMatch = (cleanPhone.length >= 10 && phoneSet.has(cleanPhone)) || origIdSet.has(origIdStr);

      if (isMatch) {
        existingCount++;
        continue;
      }

      const detailsArr = [];
      if (wal.service_interest && wal.service_interest !== "Not Specified") {
        detailsArr.push(`Course: ${wal.service_interest}`);
      }
      if (wal.experience_or_budget && wal.experience_or_budget !== "Not Specified") {
        detailsArr.push(`Background: ${wal.experience_or_budget}`);
      }
      if (wal.preferred_contact_time && wal.preferred_contact_time !== "Anytime") {
        detailsArr.push(`Batch: ${wal.preferred_contact_time}`);
      }
      if (wal.notes && wal.notes.trim()) {
        detailsArr.push(`Inquiry: ${wal.notes.trim()}`);
      }
      const answersSummary = detailsArr.join(" | ");

      const leadName = (wal.name && wal.name !== "WhatsApp Guest" && wal.name !== "WhatsApp Visitor")
        ? wal.name
        : (wal.name || "WhatsApp Visitor");

      const courseName = wal.service_interest && wal.service_interest !== "Not Specified"
        ? wal.service_interest
        : "UI/UX Design Course";

      const { score, priority, tags } = calculateLeadScoreAndTags({
        name: leadName,
        phone: cleanPhone,
        email: "",
        course: courseName,
        answersSummary,
        source: "WhatsApp Lead",
        status: wal.status
      });

      const { date: defaultDate, time: defaultTime } = getDefaultFollowUp();

      leadsToInsert.push({
        name: leadName,
        phone: cleanPhone,
        email: "",
        course: courseName,
        source: "WhatsApp Lead",
        status: "Pending",
        priority,
        leadScore: score,
        autoTags: tags,
        followUpDate: defaultDate,
        followUpTime: defaultTime,
        followUpNote: "Immediate WhatsApp callback required",
        answers: {
          service_interest: wal.service_interest,
          experience_or_budget: wal.experience_or_budget,
          preferred_contact_time: wal.preferred_contact_time,
          notes: wal.notes
        },
        answersSummary,
        originalLeadId: origIdStr,
        originalType: "whatsapp",
        notes: [
          {
            author: "CRM Fast-Sync",
            text: `[Database Sync]: Ingested from Meta WhatsApp Chatbot. Score: ${score}/100.`,
            createdAt: new Date()
          }
        ],
        createdAt: wal.createdAt || new Date(),
        lastActivityAt: wal.last_message_at || wal.updatedAt || new Date()
      });

      if (cleanPhone.length >= 10) phoneSet.add(cleanPhone);
      origIdSet.add(origIdStr);
      importedCount++;
    }

    // 3. Batch insert new leads in a single query
    if (leadsToInsert.length > 0) {
      await CrmLead.insertMany(leadsToInsert);
    }

    return res.status(200).json({
      success: true,
      message: `Database sync complete! Imported ${importedCount} new leads. ${existingCount} leads already up to date.`,
      importedCount,
      existingCount
    });
  } catch (error) {
    console.error("❌ [CRM Fast-Sync Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 10. Delete Lead
 */
export const deleteLead = async (req, res) => {
  try {
    await connectDB();
    const lead = await CrmLead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    // 1. Purge from original source collections so background auto-sync does not resurrect it
    if (lead.originalLeadId) {
      if (lead.originalType === "whatsapp") {
        await WhatsAppLead.findByIdAndDelete(lead.originalLeadId);
      } else {
        await Lead.findByIdAndDelete(lead.originalLeadId);
      }
    }

    // 2. Also clean up any unlinked duplicate entries in Lead/WhatsAppLead matching phone or email
    const cleanPhone = cleanPhoneNumber(lead.phone);
    if (cleanPhone && cleanPhone.length >= 10) {
      await Lead.deleteMany({ phone: { $regex: cleanPhone } });
      await WhatsAppLead.deleteMany({ whatsapp_number: { $regex: cleanPhone } });
    }
    if (lead.email && lead.email.includes("@")) {
      await Lead.deleteMany({ email: lead.email.trim().toLowerCase() });
    }

    // 3. Cascade delete to ERP if this lead was ever enrolled as a student
    try {
      const ErpStudent = (await import("../models/ErpStudent.js")).default;
      const ErpPayment = (await import("../models/ErpPayment.js")).default;
      const ErpBatch = (await import("../models/ErpBatch.js")).default;

      const studentQuery = [
        { crmLeadId: lead._id }
      ];
      if (cleanPhone && cleanPhone.length >= 10) {
        studentQuery.push({ phone: { $regex: cleanPhone } });
      }
      if (lead.email && lead.email.includes("@")) {
        studentQuery.push({ email: lead.email.trim().toLowerCase() });
      }

      const linkedStudents = await ErpStudent.find({ $or: studentQuery });
      if (linkedStudents.length > 0) {
        const studentIds = linkedStudents.map((s) => s._id);
        await ErpPayment.deleteMany({ student: { $in: studentIds } });
        await ErpBatch.updateMany({ students: { $in: studentIds } }, { $pull: { students: { $in: studentIds } } });
        await ErpStudent.deleteMany({ _id: { $in: studentIds } });
      }
    } catch (erpErr) {
      console.error("Error cascading lead delete to ERP:", erpErr);
    }

    // 4. Delete from CRM
    await CrmLead.findByIdAndDelete(req.params.id);

    return res.status(200).json({ success: true, message: "Lead deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
