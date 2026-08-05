export async function triggerFrontendBuild() {
     const GITHUB_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN || process.env.GITHUB_TOKEN;
     const GITHUB_OWNER = process.env.GITHUB_OWNER || 'maaz80';
     const GITHUB_REPO = process.env.GITHUB_REPO || 'weekend-ux';

     if (!GITHUB_TOKEN) {
          const msg = "Skipping build trigger: GITHUB_PERSONAL_ACCESS_TOKEN / GITHUB_TOKEN env variable not set in server environment.";
          console.warn(msg);
          return { success: false, reason: msg };
     }

     try {
          const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`, {
               method: "POST",
               headers: {
                    "Accept": "application/vnd.github.v3+json",
                    "Authorization": `Bearer ${GITHUB_TOKEN}`,
                    "User-Agent": "WeekendUX-Admin-App",
                    "Content-Type": "application/json",
                    "Connection": "close"
               },
               body: JSON.stringify({
                    event_type: "admin_content_update"
               })
          });

          if (res.ok || res.status === 204) {
               console.log("GitHub Actions Build Triggered Successfully! Status:", res.status);
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
