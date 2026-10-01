/**
 * Google Sheet Lead Synchronization Service
 * 
 * Non-blocking, asynchronous lead syncing to Google Apps Script Webhook.
 * Supports Website Leads, OTP Verified Bookings, and WhatsApp Leads with Upsert.
 */

export const syncLeadToGoogleSheet = (data) => {
     const googleSheetWebhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
     if (!googleSheetWebhookUrl) {
          return;
     }

     // Non-blocking fire-and-forget execution
     setImmediate(async () => {
          try {
               const payload = {
                    timestamp: data.timestamp || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
                    name: data.name || "Anonymous",
                    phone: data.phone ? String(data.phone).trim() : "",
                    email: data.email ? String(data.email).trim() : "Not provided",
                    source: data.source || "Website Lead",
                    course: data.course || "General Inquiry",
                    status: data.status || data.lead_status || "Pending",
                    remark: data.remark || "",
                    answers: data.answers ? (typeof data.answers === "object" ? JSON.stringify(data.answers) : String(data.answers)) : ""
               };

               await fetch(googleSheetWebhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
               });
          } catch (err) {
               console.error("❌ [SheetSync] Error pushing lead to Google Sheet:", err.message);
          }
     });
};

/**
 * Sync WhatsApp lead state to Google Sheet without blocking chatbot response
 */
export const syncWhatsAppLeadToSheet = (lead, phone) => {
     if (!lead) return;

     const userPhone = phone || lead.whatsapp_number || "";
     const detailsArr = [];

     if (lead.service_interest && lead.service_interest !== "Not Specified") {
          detailsArr.push(`Course: ${lead.service_interest}`);
     }
     if (lead.experience_or_budget && lead.experience_or_budget !== "Not Specified") {
          detailsArr.push(`Background: ${lead.experience_or_budget}`);
     }
     if (lead.preferred_contact_time && lead.preferred_contact_time !== "Anytime") {
          detailsArr.push(`Batch: ${lead.preferred_contact_time}`);
     }
     if (lead.name && lead.name !== "WhatsApp Guest" && lead.name !== "WhatsApp Visitor") {
          detailsArr.push(`Name: ${lead.name}`);
     }
     if (lead.notes && lead.notes.trim()) {
          detailsArr.push(`Inquiry: ${lead.notes.trim()}`);
     }
     if (lead.status === "human_handover") {
          detailsArr.push("Requested Human Counselor");
     }

     const friendlyStatusMap = {
          new: "New Lead",
          in_progress: "In Progress",
          qualified: "Qualified Lead",
          human_handover: "Counselor Requested",
          demo_requested: "Demo Requested",
          converted: "Enrolled",
          closed: "Closed"
     };

     const leadName = (lead.name && lead.name !== "WhatsApp Guest" && lead.name !== "WhatsApp Visitor")
          ? lead.name
          : (lead.name || "WhatsApp Visitor");

     syncLeadToGoogleSheet({
          name: leadName,
          phone: userPhone,
          email: "Not provided",
          source: "WhatsApp Lead",
          course: lead.service_interest && lead.service_interest !== "Not Specified" ? lead.service_interest : "General Inquiry",
          answers: detailsArr.join(" | ") || "Chatbot session started",
          status: "Pending"
     });
};
