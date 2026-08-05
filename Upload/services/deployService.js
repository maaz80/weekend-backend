import axios from "axios";

export async function triggerFrontendBuild() {
     try {
          const GITHUB_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN || process.env.GITHUB_TOKEN;
          const GITHUB_OWNER = process.env.GITHUB_OWNER || 'maaz80';
          const GITHUB_REPO = process.env.GITHUB_REPO || 'weekend-ux';

          if (!GITHUB_TOKEN) {
               console.warn("Skipping build trigger: GITHUB_PERSONAL_ACCESS_TOKEN / GITHUB_TOKEN env variable not set.");
               return;
          }

          const response = await axios.post(
               `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`,
               {
                    event_type: 'admin_content_update'
               },
               {
                    headers: {
                         'Accept': 'application/vnd.github.v3+json',
                         'Authorization': `Bearer ${GITHUB_TOKEN}`,
                         'User-Agent': 'WeekendUX-Admin-App'
                    }
               }
          );
          console.log("GitHub Actions Build Triggered Successfully! Status:", response.status);
     } catch (error) {
          const errorDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
          console.error("Failed to trigger GitHub Actions build:", errorDetails);
     }
}
