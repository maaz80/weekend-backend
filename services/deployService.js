export async function triggerFrontendBuild(modelName = "Manual", docId = "") {
     const GITHUB_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN || process.env.GITHUB_TOKEN;
     const GITHUB_OWNER = process.env.GITHUB_OWNER || 'maaz80';
     const GITHUB_REPO = process.env.GITHUB_REPO || 'weekend-ux';

     if (!GITHUB_TOKEN) {
          const msg = "Skipping build trigger: GITHUB_PERSONAL_ACCESS_TOKEN / GITHUB_TOKEN env variable not set in server environment.";
          console.warn(msg);
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

// Global Mongoose plugin that listens to all CRUD operations
export function buildTriggerPlugin(schema) {
     const ignoredModels = ["OTP", "User", "Auth", "Lead", "Booking"];

     const handleTrigger = (doc, modelName) => {
          if (!modelName || ignoredModels.includes(modelName)) return;
          triggerFrontendBuild(modelName, doc?._id || doc?.id || "");
     };

     // Document post-save hook
     schema.post("save", function (doc) {
          const modelName = this.constructor?.modelName || doc?.constructor?.modelName;
          handleTrigger(doc, modelName);
     });

     // Document post-remove hook
     schema.post("remove", function (doc) {
          const modelName = this.constructor?.modelName || doc?.constructor?.modelName;
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
               const modelName = this.model?.modelName;
               handleTrigger(res, modelName);
          });
     });
}
