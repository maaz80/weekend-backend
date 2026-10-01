import CrmLead from "../models/CrmLead.js";
import connectDB from "../config/db.js";

// Helper: Normalize 10-digit Indian phone
export const cleanPhoneNumber = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

// Calculate Lead Score & Priority
export function calculateLeadScoreAndTags({ name, phone, email, course, answersSummary, source, status }) {
  let score = 40;
  const tags = [];

  const cleanPhone = cleanPhoneNumber(phone);
  if (cleanPhone && cleanPhone.length === 10) {
    score += 20;
  }

  if (email && email.includes("@") && email !== "Not provided") {
    score += 15;
    tags.push("Email Verified");
  }

  if (course && course !== "General Inquiry") {
    score += 15;
    tags.push(course.split(" ")[0]); // e.g. UI/UX, Video, Figma
  }

  if (answersSummary && answersSummary.length > 15) {
    score += 10;
    if (answersSummary.toLowerCase().includes("1-on-1") || answersSummary.toLowerCase().includes("flexible")) {
      tags.push("1-on-1 Mentorship");
    }
    if (answersSummary.toLowerCase().includes("weekend")) {
      tags.push("Weekend Live");
    }
  }

  if (source && source.toLowerCase().includes("whatsapp")) {
    tags.push("WhatsApp Lead");
  } else if (source && source.toLowerCase().includes("popup")) {
    tags.push("Website Popup");
  } else if (source && source.toLowerCase().includes("brochure")) {
    tags.push("Brochure Download");
  }

  if (status === "human_handover" || status === "qualified") {
    score += 15;
    tags.push("Counselor Requested");
  }

  score = Math.min(Math.max(score, 10), 100);

  let priority = "Warm";
  if (score >= 75) {
    priority = "Hot";
    tags.unshift("🔥 Hot Prospect");
  } else if (score < 50) {
    priority = "Cold";
  } else {
    tags.unshift("⚡ Warm Lead");
  }

  return { score, priority, tags: Array.from(new Set(tags)) };
}

// Get default follow-up timestamp (2 hours from now)
export function getDefaultFollowUp() {
  const now = new Date();
  const followUp = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const timeStr = followUp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  return { date: followUp, time: timeStr };
}

/**
 * UNIFIED LEAD INGESTION
 * Direct Single Source of Truth Entry into CrmLead
 */
export async function ingestUnifiedLead({
  name,
  phone,
  email,
  course,
  source = "Website Lead",
  answers = {},
  answersSummary = "",
  initialNote = ""
}) {
  await connectDB();

  const cleanPhone = cleanPhoneNumber(phone);
  const trimmedEmail = email ? email.trim().toLowerCase() : "";
  const leadName = name ? name.trim() : "Website Visitor";
  const courseName = course || answers?.course || answers?.courseName || "General Inquiry";

  // Build answers summary if not provided
  let formattedSummary = answersSummary;
  if (!formattedSummary && answers && typeof answers === "object") {
    formattedSummary = Object.entries(answers)
      .filter(([k]) => !["name", "email", "phone"].includes(k))
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
      .join(" | ");
  }

  const { score, priority, tags } = calculateLeadScoreAndTags({
    name: leadName,
    phone: cleanPhone,
    email: trimmedEmail,
    course: courseName,
    answersSummary: formattedSummary,
    source,
    status: "Pending"
  });

  // Check if lead already exists in CRM by phone or email
  const searchConditions = [];
  if (cleanPhone && cleanPhone.length >= 10) {
    searchConditions.push({ phone: { $regex: cleanPhone } });
  }
  if (trimmedEmail && trimmedEmail.includes("@") && trimmedEmail !== "not provided") {
    searchConditions.push({ email: trimmedEmail });
  }

  let existingLead = null;
  if (searchConditions.length > 0) {
    existingLead = await CrmLead.findOne({ $or: searchConditions });
  }

  if (existingLead) {
    // Lead already exists - Update activity and append timeline note
    existingLead.lastActivityAt = new Date();
    if (courseName && courseName !== "General Inquiry") {
      existingLead.course = courseName;
    }
    if (answers && Object.keys(answers).length > 0) {
      existingLead.answers = { ...existingLead.answers, ...answers };
    }
    if (formattedSummary) {
      existingLead.answersSummary = formattedSummary;
    }
    if (score > (existingLead.leadScore || 0)) {
      existingLead.leadScore = score;
      existingLead.priority = priority;
    }

    const noteText = initialNote || `[Re-Inquiry via ${source}]: Course: "${courseName}". ${formattedSummary || "User re-submitted inquiry form."}`;
    existingLead.notes.push({
      author: "System Bot",
      text: noteText,
      createdAt: new Date()
    });

    await existingLead.save();
    console.log(`⚡ [LeadService] Updated existing CRM lead: ${existingLead.name} (${existingLead.phone})`);
    return { lead: existingLead, isNew: false };
  }

  // Brand New Lead
  const { date: defaultDate, time: defaultTime } = getDefaultFollowUp();

  const newLead = await CrmLead.create({
    name: leadName,
    phone: cleanPhone || phone || "Not Provided",
    email: trimmedEmail,
    course: courseName,
    source,
    status: "Pending",
    priority,
    leadScore: score,
    autoTags: tags,
    followUpDate: defaultDate,
    followUpTime: defaultTime,
    followUpNote: "Auto-assigned callback window",
    answers: answers || {},
    answersSummary: formattedSummary,
    notes: [
      {
        author: "System Bot",
        text: initialNote || `[Lead Captured]: Submitted via ${source}. Score: ${score}/100 (${priority}).`,
        createdAt: new Date()
      }
    ],
    createdAt: new Date(),
    lastActivityAt: new Date()
  });

  console.log(`✅ [LeadService] Created new unified CRM lead: ${newLead.name} (${newLead.phone}) - Source: ${source}`);
  return { lead: newLead, isNew: true };
}

/**
 * Direct WhatsApp to CRM Upsert
 */
export async function syncWhatsAppLeadToCrm(wal) {
  if (!wal) return null;
  try {
    await connectDB();
    const cleanPhone = cleanPhoneNumber(wal.whatsapp_number);
    if (!cleanPhone) return null;

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

    let crmLead = await CrmLead.findOne({ phone: cleanPhone });

    if (!crmLead) {
      const { date: defaultDate, time: defaultTime } = getDefaultFollowUp();
      crmLead = await CrmLead.create({
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
        notes: [
          {
            author: "WhatsApp Bot",
            text: `[WhatsApp Lead Captured]: Status: ${wal.status || "new"}. Score: ${score}/100.`,
            createdAt: new Date()
          }
        ],
        createdAt: wal.createdAt || new Date(),
        lastActivityAt: wal.last_message_at || wal.updatedAt || new Date()
      });
      console.log(`📱 [WhatsApp->CRM] Ingested new lead: ${leadName} (${cleanPhone})`);
    } else {
      let changed = false;
      if (leadName !== "WhatsApp Visitor" && leadName !== "WhatsApp Guest" && crmLead.name !== leadName) {
        crmLead.name = leadName;
        changed = true;
      }
      if (wal.service_interest && wal.service_interest !== "Not Specified" && crmLead.course !== wal.service_interest) {
        crmLead.course = wal.service_interest;
        changed = true;
      }
      if (answersSummary && crmLead.answersSummary !== answersSummary) {
        crmLead.answersSummary = answersSummary;
        crmLead.answers = {
          ...crmLead.answers,
          service_interest: wal.service_interest,
          experience_or_budget: wal.experience_or_budget,
          preferred_contact_time: wal.preferred_contact_time
        };
        crmLead.leadScore = score;
        crmLead.priority = priority;
        crmLead.autoTags = tags;
        crmLead.lastActivityAt = new Date();
        crmLead.notes.push({
          author: "WhatsApp Bot",
          text: `[Chatbot Update]: Candidate preferences: ${answersSummary}`,
          createdAt: new Date()
        });
        changed = true;
      }
      if (changed) {
        await crmLead.save();
        console.log(`📱 [WhatsApp->CRM] Updated lead: ${leadName} (${cleanPhone})`);
      }
    }
    return crmLead;
  } catch (err) {
    console.error("❌ [syncWhatsAppLeadToCrm Error]:", err.message);
    return null;
  }
}
