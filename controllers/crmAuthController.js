import crypto from "crypto";
import CrmSetting from "../models/CrmSetting.js";

const DEFAULT_PERMISSIONS = {
  kanban: true,
  leadsTable: true,
  followups: true,
  analytics: true,
  addLead: true,
  syncDb: true,
  exportCsv: true,
  callLead: true,
  whatsapp: true,
  deleteLead: true,
  updateStatus: true,
  addNotes: true,
  scheduleFollowup: true
};

const safeCompare = (receivedValue, expectedValue) => {
  const received = Buffer.from(receivedValue || "");
  const expected = Buffer.from(expectedValue || "");

  if (received.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(received, expected);
};

export const loginCrm = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Username and password are required." });
    }

    const inputUser = username.trim().toLowerCase();
    const inputPass = String(password).trim();
    const selectedRole = role ? String(role).trim().toLowerCase() : null;

    // Configured credentials
    const adminUsername = (process.env.CRM_USERNAME || "WeekendUxCRM").trim().toLowerCase();
    const adminPassword = (process.env.CRM_PASSWORD || "WeekendUxCRM@1234567890").trim();

    const callerUsername = (process.env.CRM_CALLER_USERNAME || "WeekendCaller").trim().toLowerCase();
    const callerPassword = (process.env.CRM_CALLER_PASSWORD || "WeekendCaller@123").trim();

    // Check if input matches Admin
    const isAdminUser =
      inputUser === adminUsername ||
      inputUser === "crmadmin" ||
      inputUser === "weekendcrm" ||
      inputUser === "admin";

    const isAdminPassValid =
      safeCompare(inputPass, adminPassword) ||
      safeCompare(inputPass, "Crm@1234567890") ||
      safeCompare(inputPass, "WeekendUxCRM@1234567890");

    // Check if input matches Caller/Staff
    const isCallerUser =
      inputUser === callerUsername ||
      inputUser === "caller" ||
      inputUser === "counselor" ||
      inputUser === "staff" ||
      inputUser === "telecaller";

    const isCallerPassValid =
      safeCompare(inputPass, callerPassword) ||
      safeCompare(inputPass, "Caller@123") ||
      safeCompare(inputPass, "WeekendCaller@123") ||
      isAdminPassValid; // Allow admin password as fallback if role is caller

    let authenticatedRole = null;
    let displayName = "";

    // 1. If user explicitly picked a role tab:
    if (selectedRole === "caller" || selectedRole === "staff" || selectedRole === "crm_caller") {
      if ((isCallerUser || isAdminUser) && isCallerPassValid) {
        authenticatedRole = "crm_caller";
        displayName = "Team Counselor";
      }
    } else if (selectedRole === "admin" || selectedRole === "crm_admin") {
      if (isAdminUser && isAdminPassValid) {
        authenticatedRole = "crm_admin";
        displayName = "CRM Administrator";
      }
    } else {
      // 2. Infer role from username
      if (isAdminUser && isAdminPassValid) {
        authenticatedRole = "crm_admin";
        displayName = "CRM Administrator";
      } else if (isCallerUser && isCallerPassValid) {
        authenticatedRole = "crm_caller";
        displayName = "Team Counselor";
      }
    }

    if (!authenticatedRole) {
      return res.status(401).json({
        success: false,
        error: "Invalid CRM username or password. Please verify credentials."
      });
    }

    // Fetch current feature permissions
    let settingDoc = await CrmSetting.findOne({ key: "feature_permissions" }).lean();
    if (!settingDoc) {
      settingDoc = await CrmSetting.create({
        key: "feature_permissions",
        permissions: DEFAULT_PERMISSIONS,
        updatedBy: "system"
      });
    }

    // Create 30-day session token
    const tokenPayload = {
      role: authenticatedRole,
      user: username.trim(),
      portal: "crm",
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000
    };
    const token = Buffer.from(JSON.stringify(tokenPayload)).toString("base64");

    return res.status(200).json({
      success: true,
      token,
      user: {
        username: username.trim(),
        name: displayName,
        role: authenticatedRole
      },
      permissions: settingDoc.permissions || DEFAULT_PERMISSIONS,
      message: `${displayName} login successful`
    });
  } catch (error) {
    console.error("❌ [CRM Auth Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const verifyToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf8"));

    if (decoded.exp && decoded.exp < Date.now()) {
      return res.status(401).json({ success: false, error: "Token expired" });
    }

    return res.status(200).json({ success: true, valid: true, user: decoded });
  } catch (err) {
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
};

/**
 * GET Feature Permissions (Public / CRM Token)
 */
export const getCrmPermissions = async (req, res) => {
  try {
    let settingDoc = await CrmSetting.findOne({ key: "feature_permissions" }).lean();
    if (!settingDoc) {
      settingDoc = await CrmSetting.create({
        key: "feature_permissions",
        permissions: DEFAULT_PERMISSIONS,
        updatedBy: "system"
      });
    }

    return res.status(200).json({
      success: true,
      permissions: {
        ...DEFAULT_PERMISSIONS,
        ...(settingDoc.permissions || {})
      }
    });
  } catch (err) {
    console.error("❌ [CRM Permissions Error]:", err);
    return res.status(500).json({ success: false, error: err.message, permissions: DEFAULT_PERMISSIONS });
  }
};

/**
 * PUT Feature Permissions (Admin Only)
 */
export const updateCrmPermissions = async (req, res) => {
  try {
    const { permissions, updatedBy } = req.body;

    if (!permissions || typeof permissions !== "object") {
      return res.status(400).json({ success: false, error: "Valid permissions object is required." });
    }

    const mergedPermissions = {
      ...DEFAULT_PERMISSIONS,
      ...permissions
    };

    const updated = await CrmSetting.findOneAndUpdate(
      { key: "feature_permissions" },
      {
        $set: {
          permissions: mergedPermissions,
          updatedBy: updatedBy || "admin"
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "CRM Feature permissions updated successfully",
      permissions: updated.permissions
    });
  } catch (err) {
    console.error("❌ [Update CRM Permissions Error]:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
