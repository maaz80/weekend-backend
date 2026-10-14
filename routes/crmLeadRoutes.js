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
import { getCrmPermissions, updateCrmPermissions } from "../controllers/crmAuthController.js";

const router = express.Router();

// CRM Permissions routes
router.get("/permissions", getCrmPermissions);
router.put("/permissions", updateCrmPermissions);

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
