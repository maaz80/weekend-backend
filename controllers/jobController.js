import crypto from "crypto";
import Job from "../models/Job.js";
import connectDB from "../config/db.js";

/**
 * Smart helper to extract or generate a deterministic jobId from Apify / Make job payloads
 */
function extractJobId(body) {
  if (!body || typeof body !== "object") return null;

  // 1. Direct ID property checks
  const directId =
    body.jobId ??
    body.id ??
    body.job_id ??
    body.linkedinJobId ??
    body.linkedin_job_id ??
    body.postingId ??
    body.urn;

  if (directId !== undefined && directId !== null && String(directId).trim() !== "") {
    return String(directId).trim();
  }

  // 2. Extract numeric LinkedIn ID from job URL (e.g. linkedin.com/jobs/view/391823912/)
  const urlCandidate = body.jobUrl || body.url || body.link || body.job_url || body.applyUrl;
  if (urlCandidate && typeof urlCandidate === "string") {
    const match =
      urlCandidate.match(/\/view\/(\d+)/) ||
      urlCandidate.match(/currentJobId=(\d+)/) ||
      urlCandidate.match(/(\d{7,15})/);

    if (match && match[1]) {
      return match[1];
    }
  }

  // 3. Generate deterministic hash from URL if available
  if (urlCandidate && typeof urlCandidate === "string" && urlCandidate.trim() !== "") {
    return crypto.createHash("md5").update(urlCandidate.trim()).digest("hex");
  }

  // 4. Fallback: Generate hash from title + company
  const titleCompany = `${body.title || body.jobTitle || body.position || ""}_${body.company || body.companyName || ""}`;
  if (titleCompany.trim() !== "_") {
    return crypto.createHash("md5").update(titleCompany.trim()).digest("hex");
  }

  return null;
}

/**
 * POST /api/jobs
 * Receive job details from Make.com / Apify, authenticate via x-api-key, save to MongoDB,
 * and prevent duplicate jobs based on jobId.
 */
export const receiveJob = async (req, res) => {
  try {
    // 1. API Key Authentication (Headers or Query parameters)
    const apiKey = (
      req.headers["x-api-key"] ||
      req.get("x-api-key") ||
      req.query?.api_key ||
      req.query?.["x-api-key"] ||
      req.query?.key ||
      req.headers["authorization"]?.replace(/^Bearer\s+/i, "") ||
      ""
    ).toString().trim();

    const validKeys = [
      process.env.JOBS_API_KEY,
      process.env.MAKE_API_KEY,
      process.env.ADMIN_API_KEY,
      "weekend_ux_jobs_secret_key_2026"
    ]
      .map(k => (k || "").toString().trim())
      .filter(Boolean);

    const isAuthorized = validKeys.length === 0 || validKeys.includes(apiKey);

    if (!isAuthorized) {
      console.warn(`[POST /api/jobs] ❌ Auth failed. Provided key: "${apiKey || 'NONE'}"`);
      return res.status(401).json({
        status: "error",
        message: "Unauthorized: Invalid or missing x-api-key header"
      });
    }

    // 2. Body Parsing & Normalization
    let body = req.body;

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        // Not stringified JSON
      }
    }

    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length === 0) {
      console.warn("[POST /api/jobs] ⚠️ Received invalid/empty job body payload.");
      return res.status(400).json({
        status: "error",
        message: "Bad Request: Job payload must be a JSON object containing job details"
      });
    }

    // 3. Extract or Generate jobId
    const jobId = extractJobId(body);
    if (!jobId) {
      console.warn("[POST /api/jobs] ⚠️ Could not determine jobId from payload:", JSON.stringify(body).slice(0, 150));
      return res.status(400).json({
        status: "error",
        message: "Validation Error: 'jobId' or valid job URL/title could not be identified"
      });
    }

    // 4. Connect DB & Duplicate Check
    await connectDB();

    const existingJob = await Job.findOne({ jobId });
    if (existingJob) {
      console.log(`[POST /api/jobs] ℹ️ Duplicate job skipped: jobId=${jobId}`);
      return res.status(200).json({
        status: "duplicate",
        message: "Job with this jobId already exists in database",
        jobId
      });
    }

    // 5. Save New Job to MongoDB
    const locationFromAddr = typeof body.companyAddress === "object"
      ? [body.companyAddress.addressLocality, body.companyAddress.addressRegion, body.companyAddress.addressCountry].filter(Boolean).join(", ")
      : "";

    const jobData = {
      ...body,
      jobId,
      title: body.title || body.jobTitle || body.position || "",
      company: body.company || body.companyName || "",
      companyLogo: body.companyLogo || body.logo || body.company_logo || "",
      location: body.location || body.jobLocation || locationFromAddr || "",
      url: body.url || body.jobUrl || body.link || body.applyUrl || body.inputUrl || "",
      description: body.descriptionHtml || body.descriptionText || body.description || body.jobDescription || "",
      salary: body.salary || body.salaryRange || body.compensation || body.compensationRange || ""
    };

    const newJob = new Job(jobData);
    const savedJob = await newJob.save();

    console.log(`[POST /api/jobs] ✅ Successfully saved job: jobId=${jobId}, title="${jobData.title}"`);

    return res.status(200).json({
      status: "created",
      message: "Job saved successfully",
      data: savedJob
    });
  } catch (err) {
    // Duplicate Key Error (MongoDB E11000)
    if (err.code === 11000) {
      const jobId = extractJobId(req.body) || undefined;
      console.log(`[POST /api/jobs] ℹ️ Duplicate key collision (E11000): jobId=${jobId}`);
      return res.status(200).json({
        status: "duplicate",
        message: "Job with this jobId already exists in database",
        jobId
      });
    }

    console.error("[POST /api/jobs] 💥 Internal Server Error:", err);
    return res.status(500).json({
      status: "error",
      message: err.message || "Failed to process job details"
    });
  }
};

/**
 * GET /api/jobs
 * Fetch list of all jobs saved in MongoDB (sorted latest first)
 */
export const getJobs = async (req, res) => {
  try {
    await connectDB();
    const jobs = await Job.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      count: jobs.length,
      jobs
    });
  } catch (err) {
    console.error("[GET /api/jobs] Error fetching jobs:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to fetch jobs"
    });
  }
};
