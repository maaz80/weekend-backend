import express from "express";
import {
  verifyWebhook,
  handleWebhook,
  getInstagramLeads,
  getInstagramLeadDetails,
  updateInstagramLeadStatus,
  sendManualInstagramMessage
} from "../controllers/instagramController.js";
import { requireAdminForWrites } from "../middleware/adminAuth.js";

const router = express.Router();

// Meta Instagram Webhook Verification & Processing (Public endpoints for Meta Webhook call)
router.get("/instagram/webhook", verifyWebhook);
router.post("/instagram/webhook", handleWebhook);

// Counselor & Admin Lead Management APIs
router.get("/instagram/leads", requireAdminForWrites, getInstagramLeads);
router.get("/instagram/leads/:id", requireAdminForWrites, getInstagramLeadDetails);
router.patch("/instagram/leads/:id/status", requireAdminForWrites, updateInstagramLeadStatus);
router.post("/instagram/leads/:id/reply", requireAdminForWrites, sendManualInstagramMessage);

export default router;
