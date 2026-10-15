import AutoFaqRule from "../models/AutoFaqRule.js";
import UnifiedConversation from "../models/UnifiedConversation.js";
import UnifiedMessage from "../models/UnifiedMessage.js";
import { sendManualReply, handleIncomingMessage } from "../services/omnichannelService.js";
import { checkNewEmails, getGmailListenerStatus } from "../services/gmailListenerService.js";

// Default Seed FAQ Rules for Weekend UX
const DEFAULT_FAQ_RULES = [
  {
    question: "Single Student Portfolio with Details & Name",
    keywords: [
      "portfolio",
      "student portfolio",
      "student work",
      "sample work",
      "projects",
      "past projects",
      "case study",
      "student name",
      "behance",
      "dribbble"
    ],
    matchType: "contains",
    answer: "You can explore real student portfolios along with complete project details and the student's name on our official website. All portfolios are built with live industry case studies under 1-on-1 mentor guidance.\n\n🌐 View Student Portfolios: https://weekendux.in/portfolio",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  },
  {
    question: "Video Portfolios Uploaded on Website & App",
    keywords: [
      "video portfolio",
      "video projects",
      "student video",
      "app portfolio",
      "video walkthrough",
      "video review",
      "prototype video",
      "app video"
    ],
    matchType: "contains",
    answer: "Yes! Complete video walkthroughs and project presentations by our students are uploaded directly on both the Weekend UX Website and Mobile App.\n\n📱 Download the Weekend UX App or visit https://weekendux.in to watch live student video portfolios & walkthroughs.",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  },
  {
    question: "Software & Design Tools Trained by Mentors",
    keywords: [
      "software",
      "tools",
      "figma",
      "photoshop",
      "illustrator",
      "indesign",
      "canva",
      "tools taught",
      "software training",
      "which software",
      "graphic tools",
      "ui tools"
    ],
    matchType: "contains",
    answer: "Our industry expert mentors provide practical, hands-on training on all industry-standard software across our programs:\n\n• UI/UX Design: Figma, FigJam, Prototyping tools & Generative AI workflows\n• Graphic Design: Adobe Photoshop, Adobe Illustrator, InDesign & Canva\n\nAll tools are trained with real-world assignments and design systems.",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  },
  {
    question: "Mode of Classes (Online Only - Offline Not Available Currently)",
    keywords: [
      "offline",
      "offline classes",
      "classroom",
      "centre",
      "center",
      "location",
      "in person",
      "offline batch",
      "physical class",
      "face to face"
    ],
    matchType: "contains",
    answer: "Currently, offline classes are not available. We conduct high-engagement, LIVE Interactive Online classes with direct screen sharing, live doubts clearing, and 1-on-1 mentor support. 💻\n\nWhenever offline classes become available, we will announce updates to all students.",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  },
  {
    question: "EMI Option & Registration Fee Policy (10k Initial Payment)",
    keywords: [
      "emi",
      "installment",
      "monthly payment",
      "registration charges",
      "10k",
      "10000",
      "part payment",
      "split payment",
      "emi option",
      "down payment"
    ],
    matchType: "contains",
    answer: "Yes, an EMI option is available for our courses! 💳\n\nEMI Guidelines:\n1. A one-time initial registration payment of ₹10,000 is required to secure your seat.\n2. Once registered, your customized monthly EMI schedule will be activated after discussion with the Weekend UX team.\n\nReply with your Phone Number to discuss your flexible EMI plan with our admissions counselor!",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  },
  {
    question: "Course Duration & Batches (Weekend vs Weekday Schedules)",
    keywords: [
      "duration",
      "timing",
      "timings",
      "schedule",
      "batch",
      "weekend batch",
      "weekday batch",
      "batch timings",
      "how long",
      "kitne time",
      "kab start hoga"
    ],
    matchType: "contains",
    answer: "We offer flexible cohort schedules designed for working professionals and college students:\n\n🗓️ Weekend Cohort: Saturday & Sunday live interactive sessions\n🗓️ Weekday Cohort: Regular weekday evening batches\n\nCourse duration typically ranges from 3 to 6 months depending on your program. All live sessions are recorded and accessible anytime on your LMS dashboard.",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  },
  {
    question: "Fast-Track Accelerated Course Option",
    keywords: [
      "fast track",
      "fasttrack",
      "crash course",
      "express batch",
      "speed course",
      "quick course",
      "jaldi",
      "accelerated"
    ],
    matchType: "contains",
    answer: "Yes! ⚡ Fast-track accelerated course options are available across all our courses for students and working professionals looking for rapid upskilling.\n\nPlease connect with the Weekend UX team to discuss your target completion timeline and enroll in an upcoming fast-track cohort.",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  },
  {
    question: "Job Placement & Career Support (Skill-Dependent Policy)",
    keywords: [
      "placement",
      "job",
      "job guarantee",
      "career",
      "hiring",
      "interview",
      "package",
      "placement support",
      "job assistance",
      "job placement"
    ],
    matchType: "contains",
    answer: "Job placement ultimately depends on your individual skills, dedication, and knowledge. 💼\n\nWeekend UX provides end-to-end career guidance:\n• Direct interview connections with hiring partner companies\n• 1-on-1 Portfolio review and curation\n• Professional Resume preparation guidance\n• Mock interviews & crack-the-interview training to help you tackle design challenges.",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  },
  {
    question: "Fee Refund Policy (Strictly Non-Refundable)",
    keywords: [
      "refund",
      "money back",
      "cancellation",
      "cancel",
      "refundable",
      "return fee",
      "paise wapas",
      "refund policy"
    ],
    matchType: "contains",
    answer: "Please note that course fees and registration payments are strictly Non-Refundable in any case. ⚠️\n\nWe request all prospective students to check the course brochure and clarify all questions with the Weekend UX team prior to making any payment.",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  },
  {
    question: "Help & Support - Weekend UX Genie Chatbot",
    keywords: [
      "support",
      "help",
      "genie",
      "chatbot",
      "contact",
      "customer care",
      "helpdesk",
      "assistance",
      "help and support"
    ],
    matchType: "contains",
    answer: "For all help, admissions guidance, and student support, you can connect directly with our 'Weekend UX Genie Chatbot' available 24/7 on our official website: https://weekendux.in 🤖\n\nOur team is also active on email and chat to resolve your queries.",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  },
  {
    question: "Course Fee Discounts (75% to 90% Off)",
    keywords: [
      "discount",
      "offer",
      "discount offer",
      "75%",
      "90%",
      "coupon",
      "concession",
      "fees discount",
      "kitna discount",
      "special offer"
    ],
    matchType: "contains",
    answer: "All our courses currently have attractive 75% to 90% discounts available, depending on the specific course and cohort! 🏷️\n\nPlease consult with the Weekend UX admissions team to check the exact discount applicable to your selected course.",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  },
  {
    question: "Merit Scholarships (5 Students/Year - 95% in Proctored MCQ Exam)",
    keywords: [
      "scholarship",
      "free seat",
      "scholarships",
      "merit scholarship",
      "95%",
      "mcq",
      "proctored",
      "scholarship exam",
      "test",
      "proctored test"
    ],
    matchType: "contains",
    answer: "Weekend UX offers Merit Scholarships for up to 5 students per year! 🎓\n\nEligibility Criteria:\n• Candidates must score 95% or higher in our official proctored online MCQ assessment exam.\n\nReply with 'SCHOLARSHIP' or contact the Weekend UX team to apply and book your proctored test slot.",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 0
  }
];

// Seed initial rules if table is empty
async function ensureSeedRules() {
  const count = await AutoFaqRule.countDocuments();
  if (count === 0) {
    await AutoFaqRule.insertMany(DEFAULT_FAQ_RULES);
  }
}

// Seed initial demo conversations if empty
async function ensureSeedConversations() {
  const count = await UnifiedConversation.countDocuments();
  if (count === 0) {
    const conv1 = await UnifiedConversation.create({
      channel: "instagram",
      externalUserId: "ig_user_101",
      senderName: "Priya Sharma",
      senderHandle: "@priya.designs",
      senderContact: "priya.sharma99@gmail.com",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
      isBotActive: true,
      status: "bot_handled",
      unread: false,
      lastMessage: "Thank you! I will register for the demo session.",
      lastMessageAt: new Date(Date.now() - 10 * 60 * 1000)
    });

    await UnifiedMessage.create([
      {
        conversationId: conv1._id,
        sender: "user",
        text: "Hi, can I get a free demo class for UI/UX course?",
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        channel: "instagram"
      },
      {
        conversationId: conv1._id,
        sender: "bot",
        text: DEFAULT_FAQ_RULES[0].answer,
        matchedFaq: DEFAULT_FAQ_RULES[0].question,
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        channel: "instagram"
      },
      {
        conversationId: conv1._id,
        sender: "user",
        text: "Thank you! I will register for the demo session.",
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        channel: "instagram"
      }
    ]);

    const conv2 = await UnifiedConversation.create({
      channel: "email",
      externalUserId: "ankit.verma.dev@gmail.com",
      senderName: "Ankit Verma",
      senderHandle: "ankit.verma.dev@gmail.com",
      senderContact: "ankit.verma.dev@gmail.com",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
      isBotActive: false,
      status: "needs_human_reply",
      unread: true,
      lastMessage: "I have 3 years experience in frontend. Can I get a tailored discount if my company sponsors 2 candidates?",
      lastMessageAt: new Date(Date.now() - 25 * 60 * 1000)
    });

    await UnifiedMessage.create([
      {
        conversationId: conv2._id,
        sender: "user",
        text: "Hello Weekend UX team,\nWhat are the fees for the upcoming batch?",
        timestamp: new Date(Date.now() - 40 * 60 * 1000),
        channel: "email"
      },
      {
        conversationId: conv2._id,
        sender: "bot",
        text: DEFAULT_FAQ_RULES[2].answer,
        matchedFaq: DEFAULT_FAQ_RULES[2].question,
        timestamp: new Date(Date.now() - 39 * 60 * 1000),
        channel: "email"
      },
      {
        conversationId: conv2._id,
        sender: "user",
        text: "I have 3 years experience in frontend. Can I get a tailored discount if my company sponsors 2 candidates?",
        timestamp: new Date(Date.now() - 25 * 60 * 1000),
        channel: "email"
      }
    ]);
  }
}

// -------------------------------------------------------------
// FAQ RULES CONTROLLERS
// -------------------------------------------------------------

export const getFaqRules = async (req, res) => {
  try {
    await ensureSeedRules();
    const rules = await AutoFaqRule.find().sort({ createdAt: -1 });
    return res.json({ success: true, count: rules.length, rules });
  } catch (error) {
    console.error("Error fetching FAQ rules:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const createFaqRule = async (req, res) => {
  try {
    const { question, keywords, matchType, answer, channels, isActive } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ success: false, error: "Question and Answer are required." });
    }

    const keywordList = Array.isArray(keywords)
      ? keywords
      : typeof keywords === "string"
      ? keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean)
      : [question.toLowerCase().trim()];

    const rule = await AutoFaqRule.create({
      question,
      keywords: keywordList,
      matchType: matchType || "contains",
      answer,
      channels: channels || ["instagram", "facebook", "email"],
      isActive: isActive !== false
    });

    return res.status(201).json({ success: true, rule });
  } catch (error) {
    console.error("Error creating FAQ rule:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateFaqRule = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (typeof updates.keywords === "string") {
      updates.keywords = updates.keywords
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);
    }

    const rule = await AutoFaqRule.findByIdAndUpdate(id, updates, { new: true });
    if (!rule) {
      return res.status(404).json({ success: false, error: "Rule not found." });
    }

    return res.json({ success: true, rule });
  } catch (error) {
    console.error("Error updating FAQ rule:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteFaqRule = async (req, res) => {
  try {
    const { id } = req.params;
    const rule = await AutoFaqRule.findByIdAndDelete(id);
    if (!rule) {
      return res.status(404).json({ success: false, error: "Rule not found." });
    }
    return res.json({ success: true, message: "Rule deleted successfully." });
  } catch (error) {
    console.error("Error deleting FAQ rule:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// -------------------------------------------------------------
// CHAT CONVERSATIONS & INBOX CONTROLLERS
// -------------------------------------------------------------

export const getConversations = async (req, res) => {
  try {
    const { channel, status, search } = req.query;
    const query = {};

    if (channel && channel !== "all") query.channel = channel;
    if (status && status !== "all") {
      if (status === "unread") query.unread = true;
      else query.status = status;
    }

    if (search) {
      query.$or = [
        { senderName: { $regex: search, $options: "i" } },
        { senderHandle: { $regex: search, $options: "i" } },
        { lastMessage: { $regex: search, $options: "i" } }
      ];
    }

    const conversations = await UnifiedConversation.find(query).sort({ lastMessageAt: -1 });

    // Populate messages for each conversation
    const populated = await Promise.all(
      conversations.map(async (conv) => {
        const messages = await UnifiedMessage.find({ conversationId: conv._id })
          .sort({ timestamp: 1 })
          .limit(50);
        return {
          ...conv.toObject(),
          messages
        };
      })
    );

    return res.json({ success: true, count: populated.length, conversations: populated });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getConversationMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await UnifiedMessage.find({ conversationId: id }).sort({ timestamp: 1 });

    // Mark conversation unread = false
    await UnifiedConversation.findByIdAndUpdate(id, { unread: false });

    return res.json({ success: true, count: messages.length, messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const sendReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: "Reply message cannot be empty." });
    }

    const result = await sendManualReply(id, message.trim());
    return res.json(result);
  } catch (error) {
    console.error("Error sending manual reply:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const toggleBot = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBotActive } = req.body;

    const conversation = await UnifiedConversation.findByIdAndUpdate(
      id,
      { isBotActive: Boolean(isBotActive) },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ success: false, error: "Conversation not found." });
    }

    return res.json({ success: true, conversation });
  } catch (error) {
    console.error("Error toggling bot:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Developer / Admin testing endpoint to simulate an inbound message from Instagram/FB/Email
 */
export const simulateInbound = async (req, res) => {
  try {
    const { channel = "instagram", text, senderName, senderHandle } = req.body;
    if (!text) return res.status(400).json({ error: "text is required" });

    const result = await handleIncomingMessage({
      channel,
      externalUserId: "test_user_" + Date.now(),
      senderName: senderName || "Test Chatter",
      senderHandle: senderHandle || `@test_user_${channel}`,
      text
    });

    return res.json({ success: true, result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    await UnifiedMessage.deleteMany({ conversationId: id });
    const deleted = await UnifiedConversation.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Conversation not found" });
    }
    return res.json({ success: true, message: "Conversation deleted successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Trigger immediate check of Gmail Inbox from ERP
 */
export const syncGmail = async (req, res) => {
  try {
    const { sinceHours = 48 } = req.body || {};
    const result = await checkNewEmails({ sinceHours });
    return res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error("Error syncing Gmail:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get Gmail Listener worker status
 */
export const getGmailStatus = async (req, res) => {
  try {
    const status = getGmailListenerStatus();
    return res.json({
      success: true,
      status
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};


