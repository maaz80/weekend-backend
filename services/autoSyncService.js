import CrmLead from "../models/CrmLead.js";
import Lead from "../models/Lead.js";
import WhatsAppLead from "../models/WhatsAppLead.js";
import connectDB from "../config/db.js";

const cleanPhoneNumber = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

// Calculate HubSpot-style Lead Score & Priority
function calculateLeadScoreAndTags({ name, phone, email, course, answersSummary, source, status }) {
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

// Get default follow-up timestamp (Next 2 hours or tomorrow morning)
function getDefaultFollowUp() {
  const now = new Date();
  const followUp = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
  const timeStr = followUp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  return { date: followUp, time: timeStr };
}

let isRunning = false;

export async function runAutoSyncEngine() {
  if (isRunning) return;
  isRunning = true;

  try {
    await connectDB();

    // 1. Scan Website Leads
    const websiteLeads = await Lead.find().sort({ createdAt: -1 }).limit(100).lean();
    for (const wl of websiteLeads) {
      const cleanPhone = cleanPhoneNumber(wl.phone);
      if (!cleanPhone && !wl.email) continue;

      // Check if this exact Lead document has already been ingested into CRM
      const alreadyIngested = await CrmLead.findOne({ originalLeadId: String(wl._id) });
      if (alreadyIngested) continue;

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

      const courseName = wl.course || wl.answers?.course || wl.answers?.courseName || "UI/UX Design Course";

      const { score, priority, tags } = calculateLeadScoreAndTags({
        name: wl.name,
        phone: cleanPhone,
        email: wl.email,
        course: courseName,
        answersSummary,
        source: wl.source,
        status: wl.status
      });

      // Check if phone or email already exists in CRM (Duplicate detection)
      const phoneOrEmailConditions = [];
      if (cleanPhone && cleanPhone.length >= 10) {
        phoneOrEmailConditions.push({ phone: { $regex: cleanPhone } });
      }
      if (wl.email && wl.email !== "Not provided" && wl.email.includes("@")) {
        phoneOrEmailConditions.push({ email: wl.email.trim().toLowerCase() });
      }

      let isDuplicate = false;
      if (phoneOrEmailConditions.length > 0) {
        const matchingExisting = await CrmLead.find({
          $or: phoneOrEmailConditions
        });
        if (matchingExisting.length > 0) {
          isDuplicate = true;
          // Mark previously existing matching leads as duplicate too
          for (const prev of matchingExisting) {
            let changed = false;
            if (!prev.isDuplicate) {
              prev.isDuplicate = true;
              changed = true;
            }
            if (!prev.autoTags.includes("Duplicate")) {
              prev.autoTags.unshift("Duplicate");
              changed = true;
            }
            if (changed) {
              await prev.save();
            }
          }
        }
      }

      if (isDuplicate) {
        tags.unshift("Duplicate");
      }

      const { date: defaultDate, time: defaultTime } = getDefaultFollowUp();

      await CrmLead.create({
        name: wl.name || "Website Visitor",
        phone: cleanPhone || wl.phone || "Not Provided",
        email: (wl.email && wl.email !== "Not provided") ? wl.email : "",
        course: courseName,
        source: wl.source || "Website Lead",
        status: "Pending",
        priority,
        leadScore: score,
        autoTags: tags,
        isDuplicate,
        followUpDate: defaultDate,
        followUpTime: defaultTime,
        followUpNote: "Auto-assigned callback window (HubSpot Automated Engine)",
        answers: wl.answers || {},
        answersSummary,
        originalLeadId: String(wl._id),
        originalType: "lead",
        notes: [
          {
            author: "CRM Automation Bot",
            text: isDuplicate
              ? `[Duplicate Website Inquiry]: Lead re-inquired via ${wl.source || "Website Form"}. Matched existing phone/email. Flagged as Duplicate.`
              : `[Website Auto-Ingest]: Lead captured via ${wl.source || "Website Form"}. Calculated Lead Score: ${score}/100 (${priority}).`
          }
        ],
        createdAt: wl.createdAt || new Date(),
        lastActivityAt: wl.updatedAt || wl.createdAt || new Date()
      });
      console.log(`⚡ [CRM Auto-Sync] Ingested new Website Lead: ${wl.name} (${cleanPhone}) - Source: ${wl.source}${isDuplicate ? " [DUPLICATE]" : ""}`);
    }

    // 2. Scan WhatsApp Leads
    const whatsappLeads = await WhatsAppLead.find().sort({ updatedAt: -1 }).limit(100).lean();
    for (const wal of whatsappLeads) {
      const cleanPhone = cleanPhoneNumber(wal.whatsapp_number);
      if (!cleanPhone) continue;

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

      const { score, priority, tags } = calculateLeadScoreAndTags({
        name: leadName,
        phone: cleanPhone,
        email: "",
        course: wal.service_interest,
        answersSummary,
        source: "WhatsApp Lead",
        status: wal.status
      });

      const exists = await CrmLead.findOne({ phone: cleanPhone });

      if (!exists) {
        const { date: defaultDate, time: defaultTime } = getDefaultFollowUp();

        await CrmLead.create({
          name: leadName,
          phone: cleanPhone,
          email: "",
          course: wal.service_interest && wal.service_interest !== "Not Specified" ? wal.service_interest : "UI/UX Design Course",
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
          originalLeadId: String(wal._id),
          originalType: "whatsapp",
          notes: [
            {
              author: "WhatsApp Bot",
              text: `[HubSpot Auto-Ingest]: Captured via Meta WhatsApp Chatbot. Inquiry: "${wal.notes || "Course Inquiry"}". Score: ${score}/100.`
            }
          ],
          createdAt: wal.createdAt || new Date(),
          lastActivityAt: wal.last_message_at || wal.updatedAt || new Date()
        });
        console.log(`⚡ [CRM Auto-Sync] Ingested new WhatsApp Lead: ${leadName} (${cleanPhone}) - Score: ${score}`);
      } else {
        // If lead already exists, check if name or answers evolved during chat
        let changed = false;
        if (leadName !== "WhatsApp Visitor" && leadName !== "WhatsApp Guest" && exists.name !== leadName) {
          exists.name = leadName;
          changed = true;
        }
        if (wal.service_interest && wal.service_interest !== "Not Specified" && exists.course !== wal.service_interest) {
          exists.course = wal.service_interest;
          changed = true;
        }
        if (answersSummary && exists.answersSummary !== answersSummary) {
          exists.answersSummary = answersSummary;
          exists.answers = {
            ...exists.answers,
            service_interest: wal.service_interest,
            experience_or_budget: wal.experience_or_budget,
            preferred_contact_time: wal.preferred_contact_time
          };
          exists.leadScore = score;
          exists.priority = priority;
          exists.autoTags = tags;
          exists.lastActivityAt = new Date();
          exists.notes.push({
            author: "WhatsApp Bot",
            text: `[Chatbot Update]: Candidate answered new preferences: ${answersSummary}`
          });
          changed = true;
        }

        if (changed) {
          await exists.save();
          console.log(`🔄 [CRM Auto-Sync] Auto-updated WhatsApp Lead: ${leadName} (${cleanPhone})`);
        }
      }
    }
  } catch (err) {
    console.error("❌ [AutoSyncEngine Error]:", err.message);
  } finally {
    isRunning = false;
  }
}

// Helper to tag existing duplicates already in CRM
export async function syncExistingDuplicates() {
  try {
    await connectDB();
    const leads = await CrmLead.find().select("_id phone email isDuplicate autoTags").lean();
    const phoneMap = new Map();
    const emailMap = new Map();

    for (const l of leads) {
      const p = cleanPhoneNumber(l.phone);
      if (p && p.length >= 10) {
        if (!phoneMap.has(p)) phoneMap.set(p, []);
        phoneMap.get(p).push(l._id);
      }
      const e = (l.email || "").trim().toLowerCase();
      if (e && e.includes("@") && e !== "not provided") {
        if (!emailMap.has(e)) emailMap.set(e, []);
        emailMap.get(e).push(l._id);
      }
    }

    const duplicateIds = new Set();
    for (const [_, ids] of phoneMap) {
      if (ids.length > 1) ids.forEach((id) => duplicateIds.add(String(id)));
    }
    for (const [_, ids] of emailMap) {
      if (ids.length > 1) ids.forEach((id) => duplicateIds.add(String(id)));
    }

    if (duplicateIds.size > 0) {
      await CrmLead.updateMany(
        { _id: { $in: Array.from(duplicateIds) } },
        {
          $set: { isDuplicate: true },
          $addToSet: { autoTags: "Duplicate" }
        }
      );
      console.log(`🏷️ [CRM Duplicate Engine] Tagged ${duplicateIds.size} existing duplicate leads in CRM`);
    }
  } catch (err) {
    console.error("❌ [syncExistingDuplicates Error]:", err.message);
  }
}

// Start continuous polling (every 4 seconds)
export function startAutoSyncWorker(intervalMs = 4000) {
  console.log(`🤖 [CRM Auto-Sync Worker] Started polling every ${intervalMs / 1000}s`);
  // Tag any existing duplicate records
  syncExistingDuplicates();
  // Run once immediately
  runAutoSyncEngine();
  // Then run recurringly
  setInterval(runAutoSyncEngine, intervalMs);
}
