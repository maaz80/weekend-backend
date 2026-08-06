import "dotenv/config";

function getEnvVar(name, defaultValue = "") {
     if (process.env[name]) return process.env[name].trim();
     for (const key of Object.keys(process.env)) {
          if (key.trim() === name) {
               return (process.env[key] || "").trim();
          }
     }
     return defaultValue;
}

let debounceTimer = null;
let pendingResolves = [];
let pendingModel = "Content";
let pendingDocId = "";

async function executeDispatch(modelName, docId) {
     const GITHUB_TOKEN = getEnvVar("GITHUB_PERSONAL_ACCESS_TOKEN") || getEnvVar("GITHUB_TOKEN");
     const GITHUB_OWNER = getEnvVar("GITHUB_OWNER", "maaz80");
     const GITHUB_REPO = getEnvVar("GITHUB_REPO", "weekend-ux");

     if (!GITHUB_TOKEN) {
          const msg = "Skipping build trigger: GITHUB_PERSONAL_ACCESS_TOKEN / GITHUB_TOKEN environment variable is missing on the server.";
          console.warn(`[BuildTrigger] ${msg}`);
          return { success: false, reason: msg };
     }

     try {
          console.log(`[BuildTrigger] Triggering GitHub build for model: "${modelName}", ID: "${docId}"`);
          const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`, {
               method: "POST",
               headers: {
                    "Accept": "application/vnd.github.v3+json",
                    "Authorization": `Bearer ${GITHUB_TOKEN}`,
                    "User-Agent": "WeekendUX-Backend",
                    "Content-Type": "application/json",
                    "Connection": "close"
               },
               body: JSON.stringify({
                    event_type: "admin_content_update"
               })
          });

          if (res.ok || res.status === 204) {
               console.log("🚀 Frontend build triggered successfully via GitHub Dispatch!");
               return { success: true, status: res.status };
          } else {
               const errorText = await res.text();
               console.error("Failed to trigger GitHub Actions build. Status:", res.status, "Text:", errorText);
               return { success: false, status: res.status, error: errorText };
          }
     } catch (error) {
          console.error("Failed to trigger GitHub Actions build Exception:", error.message);
          return { success: false, error: error.message };
     }
}

export function triggerFrontendBuild(modelName = "Content", docId = "") {
     pendingModel = modelName;
     pendingDocId = docId;

     return new Promise((resolve) => {
          pendingResolves.push(resolve);

          if (debounceTimer) {
               clearTimeout(debounceTimer);
          }

          debounceTimer = setTimeout(async () => {
               debounceTimer = null;
               const resolvesToCall = [...pendingResolves];
               pendingResolves = [];

               const result = await executeDispatch(pendingModel, pendingDocId);
               resolvesToCall.forEach((res) => res(result));
          }, 3000); // 3-second debounce window to coalesce rapid database operations
     });
}

// Global Mongoose plugin that listens to all CRUD operations
export function buildTriggerPlugin(schema) {
     const ignoredModels = ["OTP", "User", "Auth", "Lead", "Booking", "otp", "user", "auth", "lead", "booking", "otps", "users", "leads", "bookings"];

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

