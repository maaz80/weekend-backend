import express from "express";
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  updateLeadStatus,
  addLeadNote,
  scheduleFollowUp,
  getAnalytics,
  syncExistingLeads,
  deleteLead
} from "../controllers/crmLeadController.js";

const router = express.Router();

// Lead Analytics & Sync routes
router.get("/analytics", getAnalytics);
router.post("/sync", syncExistingLeads);

// Main CRUD routes
router.get("/", getLeads);
router.post("/", createLead);
router.get("/:id", getLeadById);
router.put("/:id", updateLead);
router.delete("/:id", deleteLead);

// Specialized Lead actions
router.patch("/:id/status", updateLeadStatus);
router.post("/:id/notes", addLeadNote);
router.post("/:id/followup", scheduleFollowUp);

export default router;
