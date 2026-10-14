import express from "express";
import {
  verifyMetaWebhook,
  handleMetaWebhook,
  handleEmailWebhook
} from "../controllers/omnichannelWebhookController.js";

const router = express.Router();

// Meta Webhook (Instagram DM & Facebook Messenger Webhooks)
router.get("/omnichannel/webhook", verifyMetaWebhook);
router.post("/omnichannel/webhook", handleMetaWebhook);

// Inbound Email Webhook (SendGrid Inbound Parse / Mailgun / Forwarder)
router.post("/omnichannel/email/webhook", handleEmailWebhook);

export default router;
