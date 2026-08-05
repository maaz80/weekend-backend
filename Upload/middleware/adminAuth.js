import crypto from "crypto";

const PUBLIC_WRITE_PATHS = new Set([
     "/admin/login",
     "/send-otp",
     "/submit-booking"
]);

const SAFE_METHODS = new Set([
     "GET",
     "HEAD",
     "OPTIONS"
]);

const getRequestToken = (req) => {
     const authorization = req.get("authorization");

     if (authorization?.startsWith("Bearer ")) {
          return authorization.slice("Bearer ".length).trim();
     }

     return req.get("x-admin-api-key") || "";
};

const safeCompare = (receivedToken, expectedToken) => {
     const received = Buffer.from(receivedToken);
     const expected = Buffer.from(expectedToken);

     if (received.length !== expected.length) {
          return false;
     }

     return crypto.timingSafeEqual(received, expected);
};

const base64UrlEncode = (value) => {
     const input = typeof value === "string" ? value : JSON.stringify(value);

     return Buffer.from(input)
          .toString("base64")
          .replace(/=/g, "")
          .replace(/\+/g, "-")
          .replace(/\//g, "_");
};

const base64UrlDecode = (value) => {
     const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
     const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");

     return Buffer.from(padded, "base64").toString("utf8");
};

const signTokenPart = (value, secret) => {
     return crypto
          .createHmac("sha256", secret)
          .update(value)
          .digest("base64")
          .replace(/=/g, "")
          .replace(/\+/g, "-")
          .replace(/\//g, "_");
};

export const createAdminToken = () => {
     const adminApiKey = process.env.ADMIN_API_KEY;

     if (!adminApiKey) {
          throw new Error("Admin API key is not configured.");
     }

     const header = base64UrlEncode({ alg: "HS256", typ: "JWT" });
     const payload = base64UrlEncode({
          role: "admin",
          exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
     });
     const body = `${header}.${payload}`;
     const signature = signTokenPart(body, adminApiKey);

     return `${body}.${signature}`;
};

export const verifyAdminToken = (token) => {
     const adminApiKey = process.env.ADMIN_API_KEY;

     if (!adminApiKey || !token) {
          return false;
     }

     const parts = token.split(".");

     if (parts.length !== 3) {
          return safeCompare(token, adminApiKey);
     }

     const [header, payload, signature] = parts;
     const expectedSignature = signTokenPart(`${header}.${payload}`, adminApiKey);

     if (!safeCompare(signature, expectedSignature)) {
          return false;
     }

     try {
          const data = JSON.parse(base64UrlDecode(payload));

          return data.role === "admin" && data.exp > Math.floor(Date.now() / 1000);
     } catch {
          return false;
     }
};

export const requireAdminForWrites = (req, res, next) => {
     if (SAFE_METHODS.has(req.method) || PUBLIC_WRITE_PATHS.has(req.path)) {
          return next();
     }

     const adminApiKey = process.env.ADMIN_API_KEY;

     if (!adminApiKey) {
          return res.status(503).json({ error: "Admin API key is not configured." });
     }

     const requestToken = getRequestToken(req);

     if (!verifyAdminToken(requestToken)) {
          return res.status(401).json({ error: "Unauthorized admin request." });
     }

     next();
};
