import "dotenv/config";

function getEnvVar(name, defaultValue = "") {
     const direct = process.env[name] || process.env[name.toLowerCase()] || process.env[name.toUpperCase()];
     if (direct && direct.trim() !== "") return direct.trim();
     for (const key of Object.keys(process.env)) {
          if (key.trim().toLowerCase() === name.toLowerCase()) {
               const value = process.env[key];
               if (value && value.trim() !== "") return value.trim();
          }
     }
     return defaultValue;
}

let debounceTimer = null;
let pendingResolves = [];
let pendingModel = "Content";
let pendingDocId = "";

async function clearHostingerWebsiteCache() {
     const token = getEnvVar("HOSTINGER_API_TOKEN");
     const username = getEnvVar("HOSTINGER_USERNAME");
     const domain = getEnvVar("HOSTINGER_CACHE_DOMAIN");

     if (!token || !username || !domain) {
          console.warn("[HostingerCache] Skipped: set HOSTINGER_API_TOKEN, HOSTINGER_USERNAME, and HOSTINGER_CACHE_DOMAIN.");
          return false;
     }

     const endpoint = `https://developers.hostinger.com/api/hosting/v1/accounts/${encodeURIComponent(username)}/websites/${encodeURIComponent(domain)}/cache/clear`;
     try {
          const response = await fetch(endpoint, {
               method: "DELETE",
               headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json"
               }
          });

          if (response.ok) {
               console.log(`[HostingerCache] Website cache cleared for ${domain}.`);
               return true;
          }
          const errorText = await response.text();
          console.error("[HostingerCache] Cache clear failed. Status:", response.status, "Text:", errorText);
          return false;
     } catch (error) {
          console.error("[HostingerCache] Cache clear exception:", error.message);
          return false;
     }
}

async function executeRevalidation(modelName, docId) {
     const url = getEnvVar("FRONTEND_REVALIDATE_URL");
     const secret = getEnvVar("FRONTEND_REVALIDATE_SECRET");
     if (!url || !secret) {
          const message = "Frontend revalidation is not configured (FRONTEND_REVALIDATE_URL / FRONTEND_REVALIDATE_SECRET).";
          console.warn(`[Revalidate] ${message}`);
          return { success: false, reason: message };
     }

     try {
          console.log(`[Revalidate] Invalidating frontend cache after ${modelName} update (${docId}).`);
          const response = await fetch(url, {
               method: "POST",
               headers: { Authorization: `Bearer ${secret}` }
          });
          if (response.ok) {
               console.log("[Revalidate] Frontend cache invalidated successfully.");
               const hostingerCacheCleared = await clearHostingerWebsiteCache();
               return { success: true, status: response.status, hostingerCacheCleared };
          }
          const errorText = await response.text();
          console.error("Frontend cache revalidation failed. Status:", response.status, "Text:", errorText);
          return { success: false, status: response.status, error: errorText };
     } catch (error) {
          console.error("Frontend cache revalidation exception:", error.message);
          return { success: false, error: error.message };
     }
}

export function triggerFrontendBuild(modelName = "Content", docId = "") {
     pendingModel = modelName;
     pendingDocId = docId;

     return new Promise((resolve) => {
          pendingResolves.push(resolve);
          if (debounceTimer) clearTimeout(debounceTimer);

          debounceTimer = setTimeout(async () => {
               debounceTimer = null;
               const resolvesToCall = [...pendingResolves];
               pendingResolves = [];
               const result = await executeRevalidation(pendingModel, pendingDocId);
               resolvesToCall.forEach((resolvePending) => resolvePending(result));
          }, 1000);
     });
}
// Global Mongoose plugin that listens to all CRUD operations
export function buildTriggerPlugin(schema) {
     const ignoredModels = [
          "OTP", "User", "Auth", "Lead", "Booking", "otp", "user", "auth", "lead", "booking", "otps", "users", "leads", "bookings",
          "CrmLead", "crmlead", "crmleads", "WhatsAppLead", "whatsapplead", "whatsappleads",
          "ErpStudent", "erpstudent", "erpstudents", "ErpBatch", "erpbatch", "erpbatches",
          "ErpPayment", "erppayment", "erppayments", "ErpAttendance", "erpattendance",
          "UnifiedMessage", "unifiedmessage", "unifiedmessages",
          "UnifiedConversation", "unifiedconversation", "unifiedconversations",
          "AutoFaqRule", "autofaqrule", "autofaqrules",
          "InstagramMessage", "instagrammessage", "InstagramLead", "instagramlead",
          "WhatsAppMessage", "whatsappmessage"
     ];

     const handleTrigger = (doc, rawModelName) => {
          const modelName = rawModelName || "Content";
          if (ignoredModels.includes(modelName) || ignoredModels.includes(modelName.toLowerCase())) return;
          triggerFrontendBuild(modelName, doc?._id || doc?.id || "");
     };

     // Document post-save hook
     schema.post("save", function (doc) {
          const modelName = this.constructor?.modelName || doc?.constructor?.modelName || this.modelName;
          handleTrigger(doc, modelName);
     });

     // Document post-remove hook
     schema.post("remove", function (doc) {
          const modelName = this.constructor?.modelName || doc?.constructor?.modelName || this.modelName;
          handleTrigger(doc, modelName);
     });

     // Query post hooks (findOneAndUpdate, updateOne, findOneAndDelete, deleteOne, etc.)
     const queryHooks = [
          "findOneAndUpdate",
          "findOneAndDelete",
          "updateOne",
          "updateMany",
          "deleteOne",
          "deleteMany",
          "findByIdAndUpdate",
          "findByIdAndDelete"
     ];

     queryHooks.forEach((hook) => {
          schema.post(hook, function (res) {
               const modelName = this.model?.modelName || this._modelName || this.mongooseCollection?.name || "QueryContent";
               handleTrigger(res, modelName);
          });
     });
}

