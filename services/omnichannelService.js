import axios from "axios";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import { transporter } from "../config/mailer.js";
import AutoFaqRule from "../models/AutoFaqRule.js";
import UnifiedConversation from "../models/UnifiedConversation.js";
import UnifiedMessage from "../models/UnifiedMessage.js";

/**
 * Helper to get active Meta API version
 */
const getMetaApiVersion = () => process.env.META_API_VERSION || "v20.0";

/**
 * Helper to get Instagram/Facebook Page Access Token
 */
const getMetaToken = () => {
  return (
    process.env.INSTAGRAM_PAGE_ACCESS_TOKEN ||
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
    process.env.META_ACCESS_TOKEN ||
    ""
  ).trim();
};

/**
 * 1. Match Incoming Text against saved Q&A Rules
 */
export async function matchFaqRule(incomingText, channel = "instagram") {
  if (!incomingText || typeof incomingText !== "string") return null;
  const normalized = incomingText.toLowerCase().trim();

  // Fetch all active rules for this channel
  const activeRules = await AutoFaqRule.find({
    isActive: true,
    channels: channel
  }).lean();

  for (const rule of activeRules) {
    // Check keywords
    if (Array.isArray(rule.keywords) && rule.keywords.length > 0) {
      for (const kw of rule.keywords) {
        if (!kw) continue;
        const cleanKw = kw.toLowerCase().trim();
        if (rule.matchType === "exact") {
          if (normalized === cleanKw) return rule;
        } else {
          // 'contains' or default
          if (normalized.includes(cleanKw)) return rule;
        }
      }
    }

    // Fallback: Check question title similarity
    if (rule.question && normalized.includes(rule.question.toLowerCase().trim())) {
      return rule;
    }
  }

  return null;
}

/**
 * 2. Send Message via Respective Channel API
 */
export async function sendChannelMessage({
  channel,
  recipientId,
  recipientEmail,
  text,
  subject = "Re: Your Weekend UX Inquiry"
}) {
  const version = getMetaApiVersion();

  // Channel: INSTAGRAM DM
  if (channel === "instagram") {
    const token = (process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || "").trim();
    if (!token) {
      console.warn("⚠️ [Omnichannel] Meta Instagram token missing in .env. Message logged in ERP.");
      return { success: false, reason: "NO_TOKEN" };
    }

    const isInstagramToken = token.startsWith("IG");
    const baseUrl = isInstagramToken ? "https://graph.instagram.com" : "https://graph.facebook.com";
    const url = `${baseUrl}/${version}/me/messages`;

    const headers = { "Content-Type": "application/json" };
    if (isInstagramToken) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const payload = {
      recipient: { id: recipientId },
      message: { text }
    };
    if (!isInstagramToken) {
      payload.access_token = token;
    }

    const response = await axios.post(url, payload, { headers, timeout: 10000 });
    return { success: true, data: response.data };
  }

  // Channel: FACEBOOK MESSENGER
  if (channel === "facebook") {
    const token = (process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || "").trim();
    if (!token) {
      console.warn("⚠️ [Omnichannel] Meta Facebook token missing in .env. Message logged in ERP.");
      return { success: false, reason: "NO_TOKEN" };
    }
    const url = `https://graph.facebook.com/${version}/me/messages?access_token=${token}`;
    const payload = {
      recipient: { id: recipientId },
      message: { text }
    };
    const response = await axios.post(url, payload, { timeout: 10000 });
    return { success: true, data: response.data };
  }

  // Channel: EMAIL
  if (channel === "email") {
    const targetEmail = recipientEmail || recipientId;
    if (!targetEmail || !targetEmail.includes("@")) {
      console.warn("⚠️ [Omnichannel] Invalid recipient email address:", targetEmail);
      return { success: false, reason: "INVALID_EMAIL" };
    }

    const mailOptions = {
      from: `"Weekend UX Admissions" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: targetEmail,
      subject: subject,
      text: text,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
          <div style="border-bottom: 2px solid #FFD400; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #0f172a;">Weekend UX</h2>
            <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">Design Mentorship & Academy</p>
          </div>
          <div style="white-space: pre-line; font-size: 14px; color: #334155;">
            ${text}
          </div>
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8;">
            <p style="margin: 0;">Have more questions? Reply directly to this email or visit <a href="https://weekendux.in" style="color: #0284c7;">weekendux.in</a></p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  }

  return { success: false, reason: "UNKNOWN_CHANNEL" };
}

/**
 * 3. Handle Any Inbound Message (from Webhook or Email Parser)
 */
export async function handleIncomingMessage({
  channel,
  externalUserId,
  senderName = "Prospective Student",
  senderHandle = "",
  senderContact = "",
  text = "",
  subject = "",
  avatar = "",
  platformMessageId = ""
}) {
  if (!channel || !externalUserId || !text) {
    throw new Error("Missing required parameters for incoming message.");
  }

  // Ensure DB connection is established before querying
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }

  // Channel-specific avatar fallback colors
  const avatarBg =
    channel === "instagram" ? "E1306C" : channel === "facebook" ? "1877F2" : channel === "email" ? "EA4335" : "FFD400";
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=${avatarBg}&color=fff`;

  // 1. Find or create unified conversation
  let conversation = await UnifiedConversation.findOne({
    channel,
    externalUserId
  });

  if (!conversation) {
    conversation = await UnifiedConversation.create({
      channel,
      externalUserId,
      senderName,
      senderHandle: senderHandle || externalUserId,
      senderContact: senderContact || (channel === "email" ? externalUserId : ""),
      avatar: avatar || defaultAvatar,
      isBotActive: true,
      status: "needs_human_reply",
      unread: true,
      lastMessage: text,
      lastMessageAt: new Date()
    });
  } else {
    // Update sender metadata if newly available
    if (senderName && conversation.senderName === "Prospective Student") conversation.senderName = senderName;
    if (senderHandle && !conversation.senderHandle) conversation.senderHandle = senderHandle;
    if (avatar && !conversation.avatar) conversation.avatar = avatar;
  }

  // 2. Save incoming user message
  const userMessage = await UnifiedMessage.create({
    conversationId: conversation._id,
    sender: "user",
    text,
    channel,
    platformMessageId,
    timestamp: new Date()
  });

  // 3. Process Bot Auto-Reply if bot is enabled for this conversation
  let matchedRule = null;
  if (conversation.isBotActive !== false) {
    matchedRule = await matchFaqRule(text, channel);
  }

  if (matchedRule) {
    // Determine reply subject for email threads
    const replySubject = subject
      ? subject.startsWith("Re:")
        ? subject
        : `Re: ${subject}`
      : "Re: Your Weekend UX Inquiry";

    // Send automated response
    try {
      await sendChannelMessage({
        channel,
        recipientId: externalUserId,
        recipientEmail: channel === "email" ? externalUserId : conversation.senderContact,
        text: matchedRule.answer,
        subject: replySubject
      });
    } catch (err) {
      console.warn("⚠️ [Omnichannel] Could not dispatch auto-reply via channel API:", err.message);
    }

    // Save outbound bot message in database
    await UnifiedMessage.create({
      conversationId: conversation._id,
      sender: "bot",
      text: matchedRule.answer,
      channel,
      matchedFaq: matchedRule.question,
      timestamp: new Date()
    });

    // Increment trigger counter on rule
    await AutoFaqRule.findByIdAndUpdate(matchedRule._id, { $inc: { triggeredCount: 1 } });

    // Update conversation state
    conversation.lastMessage = matchedRule.answer;
    conversation.lastMessageAt = new Date();
    conversation.status = "bot_handled";
    conversation.unread = false;
    await conversation.save();

    return {
      conversation,
      userMessage,
      handledByBot: true,
      matchedRule
    };
  } else {
    // No rule matched: Leave as needs_human_reply so counselor sees it in ERP
    conversation.lastMessage = text;
    conversation.lastMessageAt = new Date();
    conversation.status = "needs_human_reply";
    conversation.unread = true;
    await conversation.save();

    return {
      conversation,
      userMessage,
      handledByBot: false,
      needsHumanReply: true
    };
  }
}

/**
 * 4. Send Manual Reply from ERP Dashboard
 */
export async function sendManualReply(conversationId, replyText) {
  const conversation = await UnifiedConversation.findById(conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  // Send message through the customer's channel
  let dispatchResult = null;
  try {
    dispatchResult = await sendChannelMessage({
      channel: conversation.channel,
      recipientId: conversation.externalUserId,
      recipientEmail: conversation.channel === "email" ? conversation.externalUserId : conversation.senderContact,
      text: replyText
    });
  } catch (err) {
    console.warn(`⚠️ [Omnichannel] Could not dispatch manual reply via ${conversation.channel}:`, err.message);
  }

  // Record outbound agent message in database
  const agentMessage = await UnifiedMessage.create({
    conversationId: conversation._id,
    sender: "agent",
    text: replyText,
    channel: conversation.channel,
    timestamp: new Date()
  });

  // Update conversation record
  conversation.lastMessage = replyText;
  conversation.lastMessageAt = new Date();
  conversation.status = "human_replied";
  conversation.unread = false;
  await conversation.save();

  return {
    success: true,
    message: agentMessage,
    conversation,
    dispatchResult
  };
}
