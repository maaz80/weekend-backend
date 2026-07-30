import axios from "axios";

export async function triggerFrontendBuild() {
     try {
          const GITHUB_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
          const GITHUB_OWNER = process.env.GITHUB_OWNER || 'your-github-username';
          const GITHUB_REPO = process.env.GITHUB_REPO || 'your-repo-name';

          if (!GITHUB_TOKEN) {
               console.warn("Skipping build trigger: GITHUB_PERSONAL_ACCESS_TOKEN env variable not set.");
               return;
          }

          await axios.post(
               `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`,
               {
                    event_type: 'admin_content_update'
               },
               {
                    headers: {
                         'Accept': 'application/vnd.github.v3+json',
                         'Authorization': `token ${GITHUB_TOKEN}`
                    }
               }
          );
          console.log("GitHub Actions Build Triggered Successfully!");
     } catch (error) {
          console.error("Failed to trigger GitHub Actions build:", error.message);
     }
}
