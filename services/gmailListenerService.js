import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import connectDB from "../config/db.js";
import UnifiedMessage from "../models/UnifiedMessage.js";
import { handleIncomingMessage } from "./omnichannelService.js";

/**
 * In-memory status & concurrency controls
 */
let isChecking = false;
let pollingTimer = null;
let lastCheckTime = null;
let lastCheckResult = { processedCount: 0, status: "idle" };

/**
 * Determine if an email is an automated newsletter, promotional blast, or daemon bounce
 */
function isAutomatedOrBulkEmail(parsed) {
  const fromAddr = (parsed.from?.value?.[0]?.address || "").toLowerCase().trim();
  const subject = (parsed.subject || "").toLowerCase();

  // 1. Self email (prevent loop)
  const selfUser = (process.env.SMTP_USER || "").toLowerCase().trim();
  const selfFrom = (process.env.EMAIL_FROM || "").toLowerCase().trim();
  if (fromAddr === selfUser || (selfFrom && fromAddr === selfFrom)) {
    return true;
  }

  // 2. Automated daemon / bounce / noreply sender patterns
  const automatedSenderKeywords = [
    "noreply",
    "no-reply",
    "mailer-daemon",
    "postmaster",
    "bounce",
    "notifications@",
    "notification@",
    "donotreply",
    "automated",
    "newsletter",
    "newsgram",
    "facebookmail.com",
    "jobs2web.com",
    "substack.com",
    "weworkremotely.com",
    "internshala.com",
    "emeritus.org",
    "builtin.com",
    "safetywing.com",
    "designlab.com",
    "talentsprint.com",
    "milesweb.co.in"
  ];

  if (automatedSenderKeywords.some((kw) => fromAddr.includes(kw))) {
    return true;
  }

  // 3. Check marketing / automated headers
  if (parsed.headers) {
    const marketingHeaders = [
      "list-unsubscribe",
      "list-id",
      "list",
      "list-help",
      "feedback-id",
      "x-job",
      "x-sfmc-stack",
      "x-campaign",
      "x-mailgun-tag",
      "x-report-abuse",
      "x-sg-eid",
      "x-mandrill-user"
    ];

    if (marketingHeaders.some((h) => parsed.headers.has(h))) {
      return true;
    }

    const precedence = (parsed.headers.get("precedence") || "").toString().toLowerCase();
    if (precedence.includes("bulk") || precedence.includes("list") || precedence.includes("junk")) {
      return true;
    }
    const autoSubmitted = (parsed.headers.get("auto-submitted") || "").toString().toLowerCase();
    if (autoSubmitted && autoSubmitted !== "no") {
      return true;
    }
  }

  // 4. Automated delivery failure subjects
  if (
    subject.startsWith("delivery status notification") ||
    subject.startsWith("undeliverable:") ||
    subject.startsWith("mail delivery failed")
  ) {
    return true;
  }

  return false;
}

/**
 * Create a configured ImapFlow client instance
 */
function createImapClient() {
  const host = process.env.GMAIL_IMAP_HOST || "imap.gmail.com";
  const port = Number(process.env.GMAIL_IMAP_PORT || 993);
  const user = (process.env.GMAIL_USER || process.env.SMTP_USER || "").trim();
  const pass = (process.env.GMAIL_APP_PASSWORD || process.env.IMAP_PASS || process.env.SMTP_PASS || "").replace(/\s+/g, "");

  if (!user || !pass) {
    throw new Error("Missing Gmail credentials in .env (SMTP_USER and SMTP_PASS are required).");
  }

  return new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user, pass },
    logger: false,
    emitLogs: false
  });
}

/**
 * Core function: Check for new unseen customer emails from Gmail and auto-reply
 */
export async function checkNewEmails({ sinceHours = 48, maxEmails = 15 } = {}) {
  if (process.env.GMAIL_AUTO_LISTEN !== "true") {
    lastCheckResult = {
      status: "disabled",
      processedCount: 0,
      message: "Gmail automation is disabled. Set GMAIL_AUTO_LISTEN=true to enable it."
    };
    return lastCheckResult;
  }

  if (isChecking) {
    return { status: "already_running", processedCount: 0 };
  }

  isChecking = true;
  lastCheckTime = new Date();
  const processedDetails = [];

  const client = createImapClient();

  try {
    await connectDB();
    await client.connect();

    const lock = await client.getMailboxLock("INBOX");
    try {
      // Look for unseen messages received recently
      const sinceDate = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
      const uids = await client.search({ seen: false, since: sinceDate });

      if (!uids || uids.length === 0) {
        lastCheckResult = { status: "success", processedCount: 0, message: "No new unseen emails found." };
        return lastCheckResult;
      }

      // Process up to maxEmails at a time to prevent timeout
      const uidsToProcess = uids.slice(-maxEmails);

      for (const uid of uidsToProcess) {
        try {
          const download = await client.download(uid);
          const parsed = await simpleParser(download.content);

          const fromEmail = (parsed.from?.value?.[0]?.address || "").toLowerCase().trim();
          const fromName = parsed.from?.value?.[0]?.name || fromEmail.split("@")[0] || "Prospective Student";
          const subject = parsed.subject || "Course Inquiry";
          const messageId = parsed.messageId || `email_${uid}_${Date.now()}`;
          const rawBody = (parsed.text || parsed.html || "").trim();

          // 1. Skip bulk/newsletter/automated emails
          if (isAutomatedOrBulkEmail(parsed)) {
            // Mark as seen so we don't inspect again next poll
            await client.messageFlagsAdd({ uid }, ["\\Seen"]);
            continue;
          }

          // 2. Check if already processed in database
          const existing = await UnifiedMessage.findOne({ platformMessageId: messageId });
          if (existing) {
            await client.messageFlagsAdd({ uid }, ["\\Seen"]);
            continue;
          }

          // Clean body content (limit length and remove excessive trailing newlines)
          const cleanBody = rawBody.slice(0, 2000).trim();
          const combinedText = subject ? `${subject}\n\n${cleanBody}` : cleanBody;

          console.log(`📩 [Gmail Listener] Processing student inquiry from ${fromEmail} ("${subject}")`);

          // 3. Dispatch to omnichannel auto-responder engine
          const result = await handleIncomingMessage({
            channel: "email",
            externalUserId: fromEmail,
            senderName: fromName,
            senderHandle: fromEmail,
            senderContact: fromEmail,
            text: combinedText,
            subject: subject,
            platformMessageId: messageId
          });

          // Mark message as seen in Gmail
          await client.messageFlagsAdd({ uid }, ["\\Seen"]);

          processedDetails.push({
            uid,
            from: fromEmail,
            subject,
            handledByBot: Boolean(result?.handledByBot),
            matchedRule: result?.matchedRule?.question || null
          });
        } catch (msgErr) {
          console.warn(`⚠️ [Gmail Listener] Error processing email UID ${uid}:`, msgErr.message);
        }
      }

      lastCheckResult = {
        status: "success",
        processedCount: processedDetails.length,
        details: processedDetails,
        timestamp: new Date()
      };
      return lastCheckResult;
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error("❌ [Gmail Listener Error]:", err.message);
    lastCheckResult = {
      status: "error",
      error: err.message,
      processedCount: 0,
      timestamp: new Date()
    };
    return lastCheckResult;
  } finally {
    try {
      await client.logout();
    } catch {
      // Ignore logout cleanup error
    }
    isChecking = false;
  }
}

/**
 * Start the background poller worker
 */
export function startGmailListener(intervalMs = 30000) {
  if (pollingTimer) {
    console.log("ℹ️ [Gmail Listener] Already running.");
    return;
  }

  const user = (process.env.GMAIL_USER || process.env.SMTP_USER || "").trim();
  console.log(`🚀 [Gmail Listener] Initializing automated Gmail worker for ${user} (Polling every ${intervalMs / 1000}s)`);

  // Run initial check after 5 seconds of server startup
  setTimeout(() => {
    checkNewEmails().catch((err) => console.warn("Initial Gmail check notice:", err.message));
  }, 5000);

  // Set recurring poller
  pollingTimer = setInterval(() => {
    checkNewEmails().catch((err) => console.warn("Periodic Gmail check notice:", err.message));
  }, intervalMs);
}

/**
 * Stop the background poller
 */
export function stopGmailListener() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
    console.log("🛑 [Gmail Listener] Worker stopped.");
  }
}

/**
 * Get current health and status
 */
export function getGmailListenerStatus() {
  return {
    isRunning: Boolean(pollingTimer),
    isChecking,
    lastCheckTime,
    lastCheckResult,
    account: (process.env.GMAIL_USER || process.env.SMTP_USER || "").trim()
  };
}
