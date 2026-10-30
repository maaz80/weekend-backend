import crypto from "crypto";

const getCrmTokenSecret = () =>
     process.env.CRM_TOKEN_SECRET || process.env.ADMIN_API_KEY || process.env.JWT_SECRET || "";

const safeCompare = (received, expected) => {
     const receivedBuffer = Buffer.from(received || "");
     const expectedBuffer = Buffer.from(expected || "");

     return receivedBuffer.length === expectedBuffer.length &&
          crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
};

const signPayload = (payload, secret) =>
     crypto.createHmac("sha256", secret).update(payload).digest("base64url");

export const createCrmToken = (payload) => {
     const secret = getCrmTokenSecret();
     if (!secret) throw new Error("CRM token signing is not configured.");

     const encodedPayload = Buffer.from(JSON.stringify({
          ...payload,
          portal: "crm",
          exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
     })).toString("base64url");

     return `${encodedPayload}.${signPayload(encodedPayload, secret)}`;
};

export const verifyCrmToken = (token) => {
     const secret = getCrmTokenSecret();
     if (!secret || !token) return null;

     const [encodedPayload, signature, extra] = token.split(".");
     if (!encodedPayload || !signature || extra || !safeCompare(signature, signPayload(encodedPayload, secret))) {
          return null;
     }

     try {
          const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
          if (payload.portal !== "crm" || !Number.isFinite(payload.exp) || payload.exp <= Date.now()) {
               return null;
          }
          return payload;
     } catch {
          return null;
     }
};

export const requireCrmAdmin = (req, res, next) => {
     if (!getCrmTokenSecret()) {
          return res.status(503).json({ error: "CRM token signing is not configured." });
     }

     const authorization = req.get("authorization") || "";
     const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
     const payload = verifyCrmToken(token);

     if (!payload) {
          return res.status(401).json({ error: "Unauthorized CRM request." });
     }
     if (payload.role !== "crm_admin") {
          return res.status(403).json({ error: "CRM administrator access is required." });
     }

     req.crmUser = payload;
     return next();
};
