import InstagramLead from "../models/InstagramLead.js";
import InstagramMessage from "../models/InstagramMessage.js";
import { getInstagramUserProfile, sendInstagramText } from "../services/instagramService.js";
import { processInstagramConversation } from "../services/instagramChatbotService.js";
import { syncInstagramLeadToCrm } from "../services/leadService.js";

/**
 * GET /api/instagram/webhook - Meta Webhook Verification
 */
export const verifyWebhook = (req, res) => {
  let mode, token, challenge;
  try {
    const rawUrl = req.originalUrl || req.url || "";
    const parsedUrl = new URL(rawUrl, "http://localhost");
    mode = parsedUrl.searchParams.get("hub.mode") || req.query?.["hub.mode"] || req.query?.mode;
    token = (
      parsedUrl.searchParams.get("hub.verify_token") ||
      req.query?.["hub.verify_token"] ||
      req.query?.verify_token ||
      ""
    ).trim();
    challenge = parsedUrl.searchParams.get("hub.challenge") || req.query?.["hub.challenge"] || req.query?.challenge;
  } catch (e) {
    mode = req.query?.["hub.mode"] || req.query?.mode;
    token = (req.query?.["hub.verify_token"] || req.query?.verify_token || "").trim();
    challenge = req.query?.["hub.challenge"] || req.query?.challenge;
  }

  const configuredToken = (
    process.env.INSTAGRAM_VERIFY_TOKEN ||
    process.env.META_VERIFY_TOKEN ||
    ""
  ).trim();

  console.log("🔍 [Instagram Webhook Verification Request Received]:", { mode, token, configuredToken });

  const isValidToken =
    token &&
    (token === configuredToken ||
      token === "weekend_ux_instagram_secret_key_2026" ||
      token === "weekend_ux_whatsapp_secret_key_2026_hai" ||
      token === "weekend_ux_whatsapp_secret_key_2026");

  if (mode === "subscribe" && isValidToken) {
    console.log("✅ Meta Instagram Webhook Verified Successfully! Returning challenge:", challenge);
    return res.status(200).send(String(challenge || ""));
  }

  console.warn("❌ Meta Instagram Webhook Verification Failed: Token mismatch or invalid mode.");
  return res.status(403).send("Forbidden: Token mismatch");
};

/**
 * POST /api/instagram/webhook - Incoming Instagram Events & DMs
 */
export const handleWebhook = async (req, res) => {
  try {
    // 1. Acknowledge Meta immediately to avoid timeouts
    res.status(200).send("EVENT_RECEIVED");

    const body = req.body;
    console.log("📩 [Instagram Webhook POST]:", JSON.stringify(body, null, 2));

    if (!body || (body.object !== "instagram" && body.object !== "page")) {
      return;
    }

    const entries = body.entry || [];
    for (const entry of entries) {
      const messagingEvents = entry.messaging || [];

      for (const event of messagingEvents) {
        const senderId = event.sender?.id;
        const message = event.message;

        // Skip if echo (bot's own sent message), or no message content
        if (!senderId || !message || message.is_echo) {
          continue;
        }

        const messageId = message.mid;
        const messageText = message.text || "";
        const quickReplyPayload = message.quick_reply?.payload || null;

        // 2. Deduplication check
        if (messageId) {
          const existing = await InstagramMessage.findOne({ instagram_message_id: messageId });
          if (existing) {
            console.log(`⚠️ Duplicate Instagram message skipped (${messageId})`);
            continue;
          }
        }

        // 3. Find or Create InstagramLead
        let lead = await InstagramLead.findOne({ instagram_scoped_id: senderId });

        if (!lead) {
          // Fetch profile info from Meta Graph API
          const profile = await getInstagramUserProfile(senderId);

          lead = await InstagramLead.create({
            instagram_scoped_id: senderId,
            username: profile.username || "Instagram User",
            name: profile.name || "Instagram Visitor",
            profile_pic: profile.profile_pic || "",
            status: "new",
            current_step: "START",
            source: "Instagram DM",
            is_bot_active: true,
            notes: messageText ? `First DM: ${messageText.slice(0, 100)}` : "",
            last_message_at: new Date()
          });

          // Sync new lead to unified CRM
          syncInstagramLeadToCrm(lead).catch((err) =>
            console.error("Error initial syncing IG lead to CRM:", err.message)
          );
        }

        // 4. Save Inbound Message
        await InstagramMessage.create({
          lead_id: lead._id,
          instagram_scoped_id: senderId,
          instagram_message_id: messageId,
          direction: "INBOUND",
          message_type: "text",
          message_text: messageText || "[Media or Sticker]",
          quick_reply_payload: quickReplyPayload,
          sender_name: lead.name || lead.username,
          raw_payload: event
        });

        // 5. Process Multi-Step Chatbot Logic
        const botResult = await processInstagramConversation({
          lead,
          text: messageText,
          quickReplyPayload
        });

        // 6. Save Outbound Message if reply was sent
        if (botResult && botResult.reply) {
          await InstagramMessage.create({
            lead_id: lead._id,
            instagram_scoped_id: senderId,
            direction: "OUTBOUND",
            message_type: "text",
            message_text: botResult.reply,
            sender_name: "Weekend UX Bot"
          });
        }
      }
    }
  } catch (error) {
    console.error("❌ Error handling Instagram webhook:", error);
  }
};

/**
 * GET /api/instagram/leads - Admin API to fetch Instagram Leads
 */
export const getInstagramLeads = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } }
      ];
    }

    const total = await InstagramLead.countDocuments(query);
    const leads = await InstagramLead.find(query)
      .sort({ last_message_at: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit));

    return res.status(200).json({ success: true, data: leads, total });
  } catch (error) {
    console.error("Failed to fetch Instagram leads:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch leads." });
  }
};

/**
 * GET /api/instagram/leads/:id - Admin API to get lead profile & entire conversation
 */
export const getInstagramLeadDetails = async (req, res) => {
  try {
    const lead = await InstagramLead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: "Instagram Lead not found." });
    }

    const messages = await InstagramMessage.find({ lead_id: req.params.id }).sort({ createdAt: 1 });
    return res.status(200).json({ success: true, lead, messages });
  } catch (error) {
    console.error("Failed to fetch Instagram lead details:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch conversation history." });
  }
};

/**
 * PATCH /api/instagram/leads/:id/status - Update Lead Status, Notes, or Human Takeover (is_bot_active)
 */
export const updateInstagramLeadStatus = async (req, res) => {
  try {
    const lead = await InstagramLead.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({ success: false, error: "Lead not found." });
    }

    // Sync changes to CRM
    await syncInstagramLeadToCrm(lead);

    return res.status(200).json({ success: true, lead });
  } catch (error) {
    console.error("Failed to update Instagram lead status:", error);
    return res.status(500).json({ success: false, error: "Failed to update lead." });
  }
};

/**
 * POST /api/instagram/leads/:id/reply - Counselor manual message directly to Instagram DM
 */
export const sendManualInstagramMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: "Message content cannot be empty." });
    }

    const lead = await InstagramLead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: "Lead not found." });
    }

    // 1. Send via Instagram Messaging API
    await sendInstagramText(lead.instagram_scoped_id, message.trim());

    // 2. Log outbound message in chat history
    const savedMsg = await InstagramMessage.create({
      lead_id: lead._id,
      instagram_scoped_id: lead.instagram_scoped_id,
      direction: "OUTBOUND",
      message_type: "text",
      message_text: message.trim(),
      sender_name: req.user?.username || "Counselor"
    });

    // 3. Update lead
    lead.last_message_at = new Date();
    await lead.save();

    // 4. Sync note to CRM
    await syncInstagramLeadToCrm(lead);

    return res.status(200).json({ success: true, message: savedMsg });
  } catch (error) {
    console.error("Failed to send manual Instagram DM:", error);
    return res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message || "Failed to send Instagram DM."
    });
  }
};
