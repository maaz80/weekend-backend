import express from "express";
import {
  verifyWebhook,
  handleWebhook,
  getWhatsAppLeads,
  getWhatsAppLeadDetails,
  updateWhatsAppLeadStatus,
  sendManualWhatsAppMessage,
  handleDataDeletion
} from "../controllers/whatsappController.js";
import { requireAdminForWrites } from "../middleware/adminAuth.js";

const router = express.Router();

// Meta Webhook Verification & Processing (Public endpoints)
router.get("/whatsapp/webhook", verifyWebhook);
router.post("/whatsapp/webhook", handleWebhook);
router.all("/whatsapp/data-deletion", handleDataDeletion);

// Admin Lead Management APIs
router.get("/whatsapp/leads", requireAdminForWrites, getWhatsAppLeads);
router.get("/whatsapp/leads/:id", requireAdminForWrites, getWhatsAppLeadDetails);
router.patch("/whatsapp/leads/:id/status", requireAdminForWrites, updateWhatsAppLeadStatus);
router.post("/whatsapp/leads/:id/reply", requireAdminForWrites, sendManualWhatsAppMessage);

export default router;
