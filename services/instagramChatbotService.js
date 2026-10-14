import { sendInstagramText } from "./instagramService.js";
import { syncInstagramLeadToCrm } from "./leadService.js";

/**
 * Quick reply choices offered to users on Instagram
 */
const DEFAULT_QUICK_REPLIES = [
  { title: "🎯 Free Demo", payload: "ACTION_DEMO" },
  { title: "📘 Syllabus", payload: "ACTION_SYLLABUS" },
  { title: "💳 Fees & Batches", payload: "ACTION_FEES" },
  { title: "💬 Counselor", payload: "ACTION_COUNSELOR" }
];

/**
 * Main State Machine and Conditional Logic for Instagram DM Conversation
 */
export async function processInstagramConversation({ lead, text, quickReplyPayload }) {
  const normalizedText = (text || "").toLowerCase().trim();
  const actionPayload = (quickReplyPayload || "").toUpperCase().trim();

  // If counselor/human took over and turned off the bot for this lead, don't auto-reply
  if (lead.is_bot_active === false) {
    console.log(`ℹ️ [Instagram Bot] Bot is paused for lead @${lead.username || lead.instagram_scoped_id} (Human Takeover Active).`);
    return null;
  }

  let replyText = "";
  let quickReplies = DEFAULT_QUICK_REPLIES;
  const currentStep = lead.current_step || "START";

  // 1. RESTART / GREETING TRIGGERS
  const isGreeting = [
    "hi",
    "hello",
    "hey",
    "start",
    "menu",
    "restart",
    "hola",
    "namaste"
  ].includes(normalizedText);

  // 2. CHECK SPECIFIC KEYWORDS & USER REPLIES (MULTI-STEP CONDITIONAL LOGIC)

  // Condition A: Demo Request
  if (
    actionPayload === "ACTION_DEMO" ||
    normalizedText === "1" ||
    normalizedText.includes("demo") ||
    normalizedText.includes("trial") ||
    normalizedText.includes("session")
  ) {
    replyText =
      `Awesome! 🎯 You're invited to our upcoming Live Interactive Mentorship Session with Senior Product Designers.\n\n` +
      `👉 Register your free demo seat here:\n` +
      `https://weekendux.in/demo\n\n` +
      `Our admissions counselor will also assist you with your schedule. If you have questions, reply 'COUNSELOR' or share your phone number!`;

    lead.status = "demo_requested";
    lead.current_step = "DEMO_SENT";
    quickReplies = [
      { title: "📘 Syllabus", payload: "ACTION_SYLLABUS" },
      { title: "💳 Fees & Batches", payload: "ACTION_FEES" },
      { title: "💬 Counselor", payload: "ACTION_COUNSELOR" }
    ];
  }
  // Condition B: Syllabus & Brochure Download
  else if (
    actionPayload === "ACTION_SYLLABUS" ||
    normalizedText === "2" ||
    normalizedText.includes("syllabus") ||
    normalizedText.includes("brochure") ||
    normalizedText.includes("curriculum") ||
    normalizedText.includes("course details")
  ) {
    replyText =
      `Here is the complete curriculum overview! 📘\n\n` +
      `Our industry-standard programs include:\n` +
      `• UI/UX Design & Design Thinking\n` +
      `• Figma Mastery & Design Systems\n` +
      `• Generative AI Tools for Modern Designers\n` +
      `• 1-on-1 Portfolio Reviews & Placement Assistance\n\n` +
      `📥 Download Syllabus PDF:\nhttps://weekendux.in/brochure.pdf\n\n` +
      `Would you like to attend a free live workshop? Reply 'DEMO' to book!`;

    lead.status = "brochure_sent";
    lead.current_step = "BROCHURE_SENT";
    quickReplies = [
      { title: "🎯 Free Demo", payload: "ACTION_DEMO" },
      { title: "💳 Fees & Batches", payload: "ACTION_FEES" },
      { title: "💬 Counselor", payload: "ACTION_COUNSELOR" }
    ];
  }
  // Condition C: Fees, Cost, Batch timings
  else if (
    actionPayload === "ACTION_FEES" ||
    normalizedText === "3" ||
    normalizedText.includes("fee") ||
    normalizedText.includes("cost") ||
    normalizedText.includes("price") ||
    normalizedText.includes("batch") ||
    normalizedText.includes("timing")
  ) {
    replyText =
      `Here are the upcoming batch details 📅:\n\n` +
      `• Weekend Live Batches: Sat & Sun (Interactive)\n` +
      `• Weekday Evening Batches: Mon to Fri\n` +
      `• Flexible 0% Interest EMI options available\n\n` +
      `Check complete fee breakdown & scholarship offers:\n` +
      `🌐 https://weekendux.in/pricing\n\n` +
      `Reply 'COUNSELOR' if you want personalized scholarship guidance!`;

    lead.status = "qualified";
    lead.current_step = "FEES_SENT";
    quickReplies = [
      { title: "🎯 Free Demo", payload: "ACTION_DEMO" },
      { title: "📘 Syllabus", payload: "ACTION_SYLLABUS" },
      { title: "💬 Counselor", payload: "ACTION_COUNSELOR" }
    ];
  }
  // Condition D: Human Handover / Counselor Request
  else if (
    actionPayload === "ACTION_COUNSELOR" ||
    normalizedText === "4" ||
    normalizedText.includes("counselor") ||
    normalizedText.includes("counsellor") ||
    normalizedText.includes("human") ||
    normalizedText.includes("agent") ||
    normalizedText.includes("advisor") ||
    normalizedText.includes("call") ||
    normalizedText.includes("talk")
  ) {
    replyText =
      `Sure thing! 👤 A senior Weekend UX career counselor will connect with you.\n\n` +
      `Please share your 10-digit WhatsApp number here so our team can share batch slots & speak with you directly.\n\n` +
      `You can also reach our admissions desk directly:\n📞 +91 99999 99999`;

    lead.status = "human_handover";
    lead.current_step = "HUMAN_HANDOVER";
    quickReplies = [
      { title: "🎯 Free Demo", payload: "ACTION_DEMO" },
      { title: "📘 Syllabus", payload: "ACTION_SYLLABUS" }
    ];
  }
  // Condition E: Phone number detected in message
  else if (/\b[6-9]\d{9}\b/.test(normalizedText.replace(/\D/g, ""))) {
    const extractedPhone = normalizedText.replace(/\D/g, "").slice(-10);
    lead.phone = extractedPhone;
    lead.status = "qualified";
    lead.current_step = "PHONE_RECEIVED";

    replyText =
      `Thank you! 🎉 We have noted your contact number (+91 ${extractedPhone}).\n\n` +
      `Our senior mentor will reach out on WhatsApp/Call to guide you on your design career path and schedule your demo session!`;

    quickReplies = [];
  }
  // Condition F: Initial interaction or Default Menu
  else if (currentStep === "START" || isGreeting || !lead.last_message_at) {
    const displayName = lead.name && lead.name !== "Instagram Visitor" ? lead.name : `@${lead.username || "there"}`;

    replyText =
      `Hi ${displayName}! Welcome to Weekend UX 🚀\n` +
      `Leading UI/UX & AI Product Design Academy.\n\n` +
      `Explore our programs & student work here:\n` +
      `🌐 https://weekendux.in\n\n` +
      `How can we help you today? Please reply with:\n` +
      `1️⃣ DEMO - Attend free live mentorship session\n` +
      `2️⃣ SYLLABUS - Get curriculum brochure\n` +
      `3️⃣ FEES - View batch timings & fee breakup\n` +
      `4️⃣ COUNSELOR - Speak with our career advisor`;

    lead.status = "in_progress";
    lead.current_step = "MENU_SENT";
  }
  // Default Follow-up response
  else {
    replyText =
      `Thanks for reaching out! 🙏 We have received your query.\n\n` +
      `Our team will review your message shortly. In the meantime, you can explore:\n` +
      `• Free Demo: Reply 'DEMO'\n` +
      `• Syllabus: Reply 'SYLLABUS'\n` +
      `• Admissions Desk: Reply 'COUNSELOR'`;

    quickReplies = DEFAULT_QUICK_REPLIES;
  }

  // Send the message via Instagram Graph API
  try {
    await sendInstagramText(lead.instagram_scoped_id, replyText, quickReplies);
  } catch (err) {
    console.error(`❌ [Instagram Bot] Failed to deliver reply to ${lead.instagram_scoped_id}:`, err.message);
  }

  // Update lead timestamps and sync to CRM
  lead.last_message_at = new Date();
  await lead.save();

  // Async sync to unified CRM
  syncInstagramLeadToCrm(lead).catch((err) =>
    console.error("❌ [Instagram Bot] Error syncing Instagram lead to CRM:", err.message)
  );

  return { reply: replyText, currentStep: lead.current_step };
}
