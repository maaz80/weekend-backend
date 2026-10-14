import { handleIncomingMessage } from "../services/omnichannelService.js";
import { getInstagramUserProfile, getFacebookUserProfile } from "../services/instagramService.js";

/**
 * Meta Webhook Verification (GET /api/omnichannel/webhook)
 * Used by Facebook & Instagram Developer App to verify endpoint
 */
export const verifyMetaWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const validTokens = [
    process.env.INSTAGRAM_VERIFY_TOKEN,
    process.env.META_VERIFY_TOKEN,
    "weekend_ux_instagram_secret_key_2026",
    "weekend_ux_whatsapp_secret_key_2026_hai"
  ]
    .filter(Boolean)
    .map((t) => t.trim());

  if (mode && token) {
    if (mode === "subscribe" && validTokens.includes(token.trim())) {
      console.log("✅ [Meta Webhook] Webhook verified successfully by Meta.");
      return res.status(200).send(challenge);
    } else {
      console.warn("⚠️ [Meta Webhook] Verification token mismatch. Received:", token);
      return res.sendStatus(403);
    }
  }
  return res.sendStatus(400);
};

/**
 * Meta Webhook Event Receiver (POST /api/omnichannel/webhook)
 * Handles incoming Instagram DMs and Facebook Messenger chats
 */
export const handleMetaWebhook = async (req, res) => {
  // Always acknowledge Meta with 200 OK immediately
  res.status(200).send("EVENT_RECEIVED");

  try {
    const body = req.body;
    if (!body) return;

    console.log("📩 [Meta Webhook Raw Body]:", JSON.stringify(body));

    // Case 1: Meta "Test" button payload format (body.sample)
    if (body.sample && body.sample.value) {
      const sampleVal = body.sample.value;
      const senderId = sampleVal.sender?.id || "test_user_meta";
      const messageText = sampleVal.message?.text || "Hello! (Meta Webhook Test)";
      const channel = "instagram";

      await handleIncomingMessage({
        channel,
        externalUserId: senderId,
        senderName: "Meta Test User",
        senderHandle: "@meta_tester",
        text: messageText,
        platformMessageId: sampleVal.message?.mid || "test_mid"
      });
      return;
    }

    // Case 2: Live Meta production webhook (body.entry)
    if (body.entry && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        // Collect messages from either entry.messaging or entry.changes
        let events = [];

        if (Array.isArray(entry.messaging)) {
          events = entry.messaging;
        } else if (Array.isArray(entry.changes)) {
          events = entry.changes
            .filter((c) => c.field === "messages" && c.value)
            .map((c) => c.value);
        }

        for (const event of events) {
          // Skip message delivery receipts, read receipts, or echo messages (bot's own replies)
          if (event.delivery || event.read || event.message?.is_echo) {
            continue;
          }

          const senderId = event.sender?.id;
          const messageText = event.message?.text || event.postback?.title || "";
          const messageId = event.message?.mid || "";

          if (!senderId || !messageText) continue;

          // Detect if Instagram or Facebook based on object field
          const channel = body.object === "instagram" ? "instagram" : "facebook";

          // Try to fetch profile for Instagram
          let senderName = channel === "instagram" ? "Instagram User" : "Facebook User";
          let senderHandle = `@user_${senderId.slice(-4)}`;
          let avatar = "";

          if (channel === "instagram") {
            try {
              const profile = await getInstagramUserProfile(senderId);
              if (profile?.name) senderName = profile.name;
              if (profile?.username) senderHandle = `@${profile.username}`;
              if (profile?.profile_pic) avatar = profile.profile_pic;
            } catch {
              // Keep default
            }
          } else if (channel === "facebook") {
            try {
              const fbProfile = await getFacebookUserProfile(senderId);
              if (fbProfile?.name) {
                senderName = fbProfile.name;
                if (fbProfile.name !== "Facebook User") {
                  senderHandle = `@${fbProfile.name}`;
                }
              }
              if (fbProfile?.profile_pic) avatar = fbProfile.profile_pic;
            } catch {
              // Keep default
            }
          }

        console.log(`📩 [Omnichannel] Incoming message from ${channel.toUpperCase()} (${senderHandle}): "${messageText}"`);

          await handleIncomingMessage({
            channel,
            externalUserId: senderId,
            senderName,
            senderHandle,
            text: messageText,
            avatar,
            platformMessageId: messageId
          });
        }
      }
    }
  } catch (error) {
    console.error("❌ [Meta Webhook Error]:", error);
  }
};

/**
 * Inbound Email Webhook Receiver (POST /api/omnichannel/email/webhook)
 * Supports standard SendGrid Inbound Parse, Mailgun, or custom forwarders
 */
export const handleEmailWebhook = async (req, res) => {
  res.status(200).json({ success: true, message: "Email received" });

  try {
    const body = req.body || {};
    // Extract standard inbound email fields
    const senderRaw = body.from || body.sender || req.query.from || "";
    const subject = body.subject || "Course Inquiry";
    const bodyText = body.text || body["stripped-text"] || body.html || "";

    if (!senderRaw || !bodyText) {
      console.warn("⚠️ [Inbound Email] Incomplete email webhook payload.");
      return;
    }

    // Parse email and name from "Priya Sharma <priya@example.com>"
    let senderName = "Prospective Student";
    let senderEmail = senderRaw;

    const emailMatch = senderRaw.match(/<([^>]+)>/);
    if (emailMatch) {
      senderEmail = emailMatch[1].trim();
      senderName = senderRaw.replace(/<[^>]+>/, "").trim() || senderEmail;
    }

    console.log(`📧 [Inbound Email] Received email from ${senderEmail}: "${subject}"`);

    await handleIncomingMessage({
      channel: "email",
      externalUserId: senderEmail,
      senderName,
      senderHandle: senderEmail,
      senderContact: senderEmail,
      text: `${subject}\n\n${bodyText.slice(0, 1000)}`
    });
  } catch (error) {
    console.error("❌ [Email Webhook Error]:", error);
  }
};
