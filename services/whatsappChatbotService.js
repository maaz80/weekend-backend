import {
  sendWhatsAppText,
  sendWhatsAppInteractiveButtons,
  sendWhatsAppInteractiveList
} from "./whatsappService.js";

/**
 * Process incoming WhatsApp message for Weekend UX (State Machine & Intent Rules)
 */
export async function processConversation({ lead, text, phone, interactiveId }) {
  const normalizedText = (text || "").toLowerCase().trim();
  const actionId = interactiveId || normalizedText;

  // 1. GLOBAL KEYWORDS & RESTART HANDLERS
  if (
    ["hi", "hello", "hey", "start", "menu", "restart", "btn_start_menu"].includes(normalizedText) ||
    actionId === "btn_start_menu"
  ) {
    lead.current_step = "START";
    await lead.save();
    return sendMainMenu(phone);
  }

  // Human Advisor / Handover
  if (
    normalizedText.includes("human") ||
    normalizedText.includes("agent") ||
    normalizedText.includes("counsellor") ||
    normalizedText.includes("advisor") ||
    normalizedText.includes("expert") ||
    normalizedText.includes("talk") ||
    actionId === "btn_talk_human"
  ) {
    lead.status = "human_handover";
    lead.current_step = "HUMAN_HANDOVER";
    await lead.save();

    const replyText = "Sure! A Weekend UX senior counselor will connect with you on this WhatsApp number shortly.";
    await sendWhatsAppText(phone, replyText);
    return { reply: replyText, currentStep: "HUMAN_HANDOVER" };
  }

  // 2. STATE MACHINE FLOW
  const currentStep = lead.current_step || "START";

  switch (currentStep) {
    case "START":
    default: {
      if (
        actionId === "btn_explore_courses" ||
        normalizedText.includes("course") ||
        normalizedText.includes("service") ||
        normalizedText.includes("learn")
      ) {
        lead.current_step = "ASK_SERVICE";
        await lead.save();
        return sendServiceList(phone);
      }
      return sendMainMenu(phone);
    }

    case "ASK_SERVICE": {
      let selectedService = "UI/UX Masterclass";
      if (actionId.startsWith("srv_")) {
        if (actionId.includes("uiux")) selectedService = "UI/UX Design Masterclass";
        else if (actionId.includes("figma")) selectedService = "Figma & AI Tools Bootcamp";
        else if (actionId.includes("product")) selectedService = "Product Design & Portfolio";
        else if (actionId.includes("web")) selectedService = "Web Design & Frontend Dev";
        else if (actionId.includes("1on1")) selectedService = "1-on-1 Mentorship & Career";
      } else if (text) {
        selectedService = text;
      }

      lead.service_interest = selectedService;
      lead.current_step = "ASK_GOAL";
      lead.status = "in_progress";
      await lead.save();

      return sendExperienceButtons(phone, selectedService);
    }

    case "ASK_GOAL": {
      let selectedExp = "Beginner";
      if (actionId.startsWith("exp_")) {
        if (actionId.includes("beginner")) selectedExp = "Complete Beginner";
        else if (actionId.includes("selftaught")) selectedExp = "Self-Taught / Basic Figma";
        else if (actionId.includes("switcher")) selectedExp = "Switching to Design";
        else if (actionId.includes("pro")) selectedExp = "Software Dev / Product Manager";
      } else if (text) {
        selectedExp = text;
      }

      lead.experience_or_budget = selectedExp;
      lead.current_step = "ASK_BATCH";
      await lead.save();

      return sendBatchButtons(phone);
    }

    case "ASK_BATCH": {
      let selectedBatch = "Weekend Batches";
      if (actionId.startsWith("batch_")) {
        if (actionId.includes("weekend")) selectedBatch = "Weekend Live Batches (Sat-Sun)";
        else if (actionId.includes("weekday")) selectedBatch = "Weekday Evening Batches (Mon-Fri)";
        else if (actionId.includes("1on1")) selectedBatch = "1-on-1 Mentorship (Flexible)";
        else if (actionId.includes("selfpaced")) selectedBatch = "Self-Paced + Live Doubts";
      } else if (text) {
        selectedBatch = text;
      }

      lead.preferred_contact_time = selectedBatch;
      lead.current_step = "ASK_NAME";
      await lead.save();

      const replyText = "May I please know your **Full Name**?";
      await sendWhatsAppText(phone, replyText);
      return { reply: replyText, currentStep: "ASK_NAME" };
    }

    case "ASK_NAME": {
      const userName = text ? text.trim() : "Guest Student";
      lead.name = userName;
      lead.current_step = "QUALIFIED";
      lead.status = "qualified";
      await lead.save();

      const summaryText =
        `Thank you ${lead.name}! Your Weekend UX course inquiry is confirmed.\n\n` +
        `• **Course**: ${lead.service_interest}\n` +
        `• **Background**: ${lead.experience_or_budget}\n` +
        `• **Batch**: ${lead.preferred_contact_time}\n\n` +
        `Our UX Learning Counselor will reach out to you shortly.`;

      await sendWhatsAppInteractiveButtons(
        phone,
        summaryText,
        [
          { id: "btn_start_menu", title: "Main Menu" },
          { id: "btn_talk_human", title: "Talk to Counselor" }
        ],
        "Inquiry Received"
      );

      return { reply: summaryText, currentStep: "QUALIFIED" };
    }

    case "QUALIFIED": {
      const replyText = `Hi ${lead.name}! Your course inquiry is already logged. How else can Weekend UX assist you today?`;
      await sendWhatsAppInteractiveButtons(
        phone,
        replyText,
        [
          { id: "btn_explore_courses", title: "Explore Courses" },
          { id: "btn_talk_human", title: "Talk to Counselor" }
        ],
        "Weekend UX Support"
      );
      return { reply: replyText, currentStep: "QUALIFIED" };
    }
  }
}

// HELPER FUNCTIONS FOR INTERACTIVE MESSAGES
async function sendMainMenu(phone) {
  const bodyText = "👋 Welcome to Weekend UX!\n\nWe are India's premier learning platform for UI/UX Design, Figma, AI Tools & Product Design. How can we guide your learning journey today?";
  const buttons = [
    { id: "btn_explore_courses", title: "Explore Courses" },
    { id: "btn_talk_human", title: "Talk to Counselor" }
  ];
  await sendWhatsAppInteractiveButtons(phone, bodyText, buttons, "Weekend UX");
  return { reply: bodyText, currentStep: "START" };
}

async function sendServiceList(phone) {
  const bodyText = "Please select a course or program you are interested in:";
  const sections = [
    {
      title: "Weekend UX Courses",
      rows: [
        { id: "srv_uiux", title: "UI/UX Masterclass", description: "Comprehensive UI/UX & Design Systems" },
        { id: "srv_figma", title: "Figma & AI Bootcamp", description: "Master Figma, Auto Layout & AI Design Tools" },
        { id: "srv_product", title: "Product Design", description: "Portfolio Projects & Career Acceleration" },
        { id: "srv_web", title: "Web & Frontend Dev", description: "Modern Web Design, React & Code" },
        { id: "srv_1on1", title: "1-on-1 Mentorship", description: "Personalized Portfolio & Interview Guidance" }
      ]
    }
  ];
  await sendWhatsAppInteractiveList(phone, bodyText, "Select Course", sections, "Weekend UX Courses");
  return { reply: bodyText, currentStep: "ASK_SERVICE" };
}

async function sendExperienceButtons(phone, courseName) {
  const bodyText = `Great choice! What is your current background for **${courseName}**?`;
  const buttons = [
    { id: "exp_beginner", title: "Complete Beginner" },
    { id: "exp_selftaught", title: "Self-Taught Figma" },
    { id: "exp_switcher", title: "Switching to UX" }
  ];
  await sendWhatsAppInteractiveButtons(phone, bodyText, buttons, "Your Background");
  return { reply: bodyText, currentStep: "ASK_GOAL" };
}

async function sendBatchButtons(phone) {
  const bodyText = "Which batch schedule works best for your schedule?";
  const buttons = [
    { id: "batch_weekend", title: "Weekend Batches" },
    { id: "batch_weekday", title: "Weekday Evenings" },
    { id: "batch_1on1", title: "1-on-1 Flexible" }
  ];
  await sendWhatsAppInteractiveButtons(phone, bodyText, buttons, "Batch Preference");
  return { reply: bodyText, currentStep: "ASK_BATCH" };
}
