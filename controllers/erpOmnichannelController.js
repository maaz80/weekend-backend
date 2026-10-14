import AutoFaqRule from "../models/AutoFaqRule.js";
import UnifiedConversation from "../models/UnifiedConversation.js";
import UnifiedMessage from "../models/UnifiedMessage.js";
import { sendManualReply, handleIncomingMessage } from "../services/omnichannelService.js";
import { checkNewEmails, getGmailListenerStatus } from "../services/gmailListenerService.js";

// Default Seed FAQ Rules for Weekend UX
const DEFAULT_FAQ_RULES = [
  {
    question: "Free Demo Class / Trial Session",
    keywords: ["demo", "trial", "free session", "class trial", "sample class"],
    matchType: "contains",
    answer: "Awesome! 🎯 You're invited to our upcoming Live Interactive Mentorship Session with Senior Product Designers.\n\n👉 Register your free demo seat here:\nhttps://weekendux.in/demo\n\nOur admissions counselor will also assist you with your schedule. If you have questions, reply 'COUNSELOR' or share your phone number!",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 142
  },
  {
    question: "Curriculum & Course Syllabus",
    keywords: ["syllabus", "brochure", "curriculum", "course details", "content", "what will i learn"],
    matchType: "contains",
    answer: "Here is the complete UI/UX curriculum overview! 📘\n\nOur industry-standard programs include:\n• UI/UX Design & Design Thinking\n• Figma Mastery & Design Systems\n• Generative AI Tools for Modern Designers\n• 1-on-1 Portfolio Reviews & Placement Assistance\n\n📥 Download Syllabus PDF:\nhttps://weekendux.in/brochure.pdf",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 98
  },
  {
    question: "Course Fees, EMI & Discount Offers",
    keywords: ["fee", "fees", "cost", "price", "emi", "discount", "kitna lagega"],
    matchType: "contains",
    answer: "The UI/UX Masterclass fee is ₹45,000 (inclusive of live mentorship, portfolio review, and placement support).\n\n💳 Flexible No-Cost EMI options starting at ₹3,750/month are available.\n\nWould you like our counselor to call you with early-bird scholarship details? Reply with your Phone Number!",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 184
  },
  {
    question: "Batch Timings & Weekend Schedule",
    keywords: ["timing", "schedule", "batch", "weekend", "time", "kab start hoga"],
    matchType: "contains",
    answer: "Our upcoming batches are specifically scheduled for working professionals and college students:\n\n🗓️ Weekend Cohort: Saturday & Sunday (11:00 AM – 1:30 PM IST)\n🗓️ Weekday Fastrack: Tuesday & Thursday (7:30 PM – 9:30 PM IST)\n\nAll live sessions are recorded and uploaded to your student LMS dashboard.",
    channels: ["instagram", "facebook"],
    isActive: true,
    triggeredCount: 65
  },
  {
    question: "Placement Assistance & Job Support",
    keywords: ["placement", "job", "guarantee", "career support", "hiring", "package"],
    matchType: "contains",
    answer: "Yes! 💼 Weekend UX offers 100% placement support with dedicated mock interviews, resume critiques, Behance/Dribbble portfolio curation, and direct hiring partner referrals.\n\nOver 800+ alumni have transitioned into leading product companies and design studios.",
    channels: ["instagram", "facebook", "email"],
    isActive: true,
    triggeredCount: 112
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


