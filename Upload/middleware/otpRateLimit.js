const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_IP = 5;
const MAX_REQUESTS_PER_TARGET = 3;

const ipAttempts = new Map();
const targetAttempts = new Map();

const normalizeTarget = (value) => String(value || "").trim().toLowerCase();

const getClientIp = (req) => {
     const forwardedFor = req.headers["x-forwarded-for"];

     if (forwardedFor) {
          return forwardedFor.split(",")[0].trim();
     }

     return req.ip || req.socket?.remoteAddress || "unknown";
};

const isLimited = (store, key, maxRequests) => {
     const now = Date.now();
     const record = store.get(key);

     if (!record || now > record.resetAt) {
          store.set(key, { count: 1, resetAt: now + WINDOW_MS });
          return false;
     }

     record.count += 1;
     store.set(key, record);

     return record.count > maxRequests;
};

const cleanupExpiredRecords = () => {
     const now = Date.now();

     for (const [key, record] of ipAttempts) {
          if (now > record.resetAt) {
               ipAttempts.delete(key);
          }
     }

     for (const [key, record] of targetAttempts) {
          if (now > record.resetAt) {
               targetAttempts.delete(key);
          }
     }
};

export const otpRateLimit = (req, res, next) => {
     cleanupExpiredRecords();

     const ip = getClientIp(req);
     const phone = normalizeTarget(req.body?.phone);
     const email = normalizeTarget(req.body?.email);
     const targetKey = `${phone}:${email}`;

     if (isLimited(ipAttempts, ip, MAX_REQUESTS_PER_IP)) {
          return res.status(429).json({
               error: "Too many OTP requests from this IP. Please try again after 15 minutes."
          });
     }

     if (phone && email && isLimited(targetAttempts, targetKey, MAX_REQUESTS_PER_TARGET)) {
          return res.status(429).json({
               error: "Too many OTP requests for this phone/email. Please try again after 15 minutes."
          });
     }

     next();
};
