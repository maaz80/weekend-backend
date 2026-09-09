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
        return sendServiceCategoryList(phone);
      }
      return sendMainMenu(phone);
    }

    case "ASK_SERVICE": {
      if (actionId === "cat_design") {
        return sendDesignCoursesList(phone);
      }
      if (actionId === "cat_dev") {
        return sendDevCoursesList(phone);
      }
      if (actionId === "cat_all_text") {
        return sendAllCoursesText(phone);
      }

      let selectedService = "";
      const num = parseInt(normalizedText, 10);
      if (!isNaN(num) && num >= 1 && num <= 18) {
        const numMap = {
          1: "UI/UX Design Course",
          2: "Product Design Program",
          3: "Figma Master Course",
          4: "Figma Advance Course",
          5: "Figma Make AI Course",
          6: "UI Design Course",
          7: "UX Design Course",
          8: "Service Design Program",
          9: "Graphic Design Course",
          10: "Visual Design Course",
          11: "Agentic AI / Gen AI Development",
          12: "AI Automation using Make",
          13: "Full-Stack Development",
          14: "Front-End Development",
          15: "UI Development Course",
          16: "Web Development Course",
          17: "Website / Web Design Course",
          18: "Video Editing Course"
        };
        selectedService = numMap[num];
      } else if (actionId.startsWith("srv_")) {
        if (actionId === "srv_agentic_ai") selectedService = "Agentic AI / Gen AI Development";
        else if (actionId === "srv_ai_make") selectedService = "AI Automation using Make";
        else if (actionId === "srv_figma_adv") selectedService = "Figma Advance Course";
        else if (actionId === "srv_figma_make_ai") selectedService = "Figma Make AI Course";
        else if (actionId === "srv_figma_master") selectedService = "Figma Master Course";
        else if (actionId === "srv_frontend_dev") selectedService = "Front-End Development";
        else if (actionId === "srv_fullstack_dev") selectedService = "Full-Stack Development";
        else if (actionId === "srv_graphic_design") selectedService = "Graphic Design Course";
        else if (actionId === "srv_product_design") selectedService = "Product Design Program";
        else if (actionId === "srv_service_design") selectedService = "Service Design Program";
        else if (actionId === "srv_ui_design") selectedService = "UI Design Course";
        else if (actionId === "srv_ui_dev") selectedService = "UI Development Course";
        else if (actionId === "srv_uiux_design") selectedService = "UI/UX Design Course";
        else if (actionId === "srv_ux_design") selectedService = "UX Design Course";
        else if (actionId === "srv_video_editing") selectedService = "Video Editing Course";
        else if (actionId === "srv_visual_design") selectedService = "Visual Design Course";
        else if (actionId === "srv_web_dev") selectedService = "Web Development Course";
        else if (actionId === "srv_website_design") selectedService = "Website / Web Design Course";
        else if (actionId.includes("uiux")) selectedService = "UI/UX Design Course";
        else if (actionId.includes("figma")) selectedService = "Figma Master Course";
        else if (actionId.includes("product")) selectedService = "Product Design Program";
        else if (actionId.includes("web")) selectedService = "Web Development Course";
      } else if (text) {
        selectedService = text.trim();
      }

      if (!selectedService) selectedService = "UI/UX Design Course";

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

async function sendServiceCategoryList(phone) {
  const bodyText = "🎓 Welcome to Weekend UX Course Catalog!\n\nPlease select a category to view all 18 available courses:";
  const sections = [
    {
      title: "Course Categories",
      rows: [
        { id: "cat_design", title: "🎨 UI/UX & Design (10)", description: "UI/UX, Figma, Product & Graphic Design" },
        { id: "cat_dev", title: "💻 Development & AI (7)", description: "Agentic AI, Full-Stack, Front-End & Web" },
        { id: "srv_video_editing", title: "🎬 Video Editing Course", description: "Premiere Pro, Motion & Visual FX" },
        { id: "cat_all_text", title: "📜 View All 18 Courses List", description: "See full numbered list of all 18 courses" }
      ]
    }
  ];
  await sendWhatsAppInteractiveList(phone, bodyText, "Select Category", sections, "Weekend UX Catalog");
  return { reply: bodyText, currentStep: "ASK_SERVICE" };
}

async function sendDesignCoursesList(phone) {
  const bodyText = "🎨 Please select your desired Design & UX Course:";
  const sections = [
    {
      title: "Design & UX Courses",
      rows: [
        { id: "srv_uiux_design", title: "UI/UX Design Course", description: "Complete UI/UX Training & Portfolio" },
        { id: "srv_product_design", title: "Product Design Program", description: "UX Strategy & Product Design" },
        { id: "srv_figma_master", title: "Figma Master Course", description: "Master Figma, Auto Layout & Design Systems" },
        { id: "srv_figma_adv", title: "Figma Advance Course", description: "Advanced Prototyping & Variables" },
        { id: "srv_figma_make_ai", title: "Figma Make AI Course", description: "AI Tools & Figma Integration" },
        { id: "srv_ui_design", title: "UI Design Course", description: "Visual Interfaces & Design Systems" },
        { id: "srv_ux_design", title: "UX Design Course", description: "User Research & Usability Testing" },
        { id: "srv_service_design", title: "Service Design Program", description: "End-to-End Service Blueprinting" },
        { id: "srv_graphic_design", title: "Graphic Design Course", description: "Branding, Visuals & Creatives" },
        { id: "srv_visual_design", title: "Visual Design Course", description: "Typography, Grids & Aesthetics" }
      ]
    }
  ];
  await sendWhatsAppInteractiveList(phone, bodyText, "Select Design Course", sections, "UI/UX & Design");
  return { reply: bodyText, currentStep: "ASK_SERVICE" };
}

async function sendDevCoursesList(phone) {
  const bodyText = "💻 Please select your desired Development & AI Course:";
  const sections = [
    {
      title: "Dev & AI Courses",
      rows: [
        { id: "srv_agentic_ai", title: "Agentic AI / Gen AI Dev", description: "AI Agents & Generative Systems" },
        { id: "srv_ai_make", title: "AI Automation (Make)", description: "Automate Workflows with Make & AI" },
        { id: "srv_fullstack_dev", title: "Full-Stack Development", description: "Frontend, Backend & MERN Stack" },
        { id: "srv_frontend_dev", title: "Front-End Development", description: "React, Next.js & Modern Web Dev" },
        { id: "srv_ui_dev", title: "UI Development Course", description: "Interface Coding & Component Libraries" },
        { id: "srv_web_dev", title: "Web Development Course", description: "HTML, CSS, JS & Responsive Web" },
        { id: "srv_website_design", title: "Website / Web Design", description: "Modern Website Design & Layouts" }
      ]
    }
  ];
  await sendWhatsAppInteractiveList(phone, bodyText, "Select Dev Course", sections, "Development & AI");
  return { reply: bodyText, currentStep: "ASK_SERVICE" };
}

async function sendAllCoursesText(phone) {
  const text =
    "📚 *Weekend UX - Complete 18 Courses List*\n\n" +
    "🎨 *Design & UX Courses:*\n" +
    "1. UI/UX Design Course\n" +
    "2. Product Design Program\n" +
    "3. Figma Master Course\n" +
    "4. Figma Advance Course\n" +
    "5. Figma Make AI Course\n" +
    "6. UI Design Course\n" +
    "7. UX Design Course\n" +
    "8. Service Design Program\n" +
    "9. Graphic Design Course\n" +
    "10. Visual Design Course\n\n" +
    "💻 *Development & AI Courses:*\n" +
    "11. Agentic AI / Gen AI Development\n" +
    "12. AI Automation using Make\n" +
    "13. Full-Stack Development\n" +
    "14. Front-End Development\n" +
    "15. UI Development Course\n" +
    "16. Web Development Course\n" +
    "17. Website / Web Design Course\n\n" +
    "🎬 *Creative Media:*\n" +
    "18. Video Editing Course\n\n" +
    "👉 *Reply with the Course Number (1-18) or Course Name!*";

  await sendWhatsAppText(phone, text);
  return { reply: text, currentStep: "ASK_SERVICE" };
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
