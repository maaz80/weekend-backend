import crypto from "crypto";

const safeCompare = (receivedValue, expectedValue) => {
  const received = Buffer.from(receivedValue || "");
  const expected = Buffer.from(expectedValue || "");

  if (received.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(received, expected);
};

export const loginCrm = async (req, res) => {
  try {
    const { username, password } = req.body;
    const crmUsername = (process.env.CRM_USERNAME || "crmadmin").trim();
    const crmPassword = (process.env.CRM_PASSWORD || "Crm@1234567890").trim();

    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Username and password are required." });
    }

    const inputUser = username.trim().toLowerCase();
    const isUserValid = inputUser === crmUsername.toLowerCase() || inputUser === "crmadmin" || inputUser === "weekendcrm";

    if (!isUserValid || !safeCompare(password, crmPassword)) {
      return res.status(401).json({ success: false, error: "Invalid CRM username or password." });
    }

    // Create a 30-day authenticated session token
    const tokenPayload = {
      role: "crm_admin",
      user: crmUsername,
      portal: "crm",
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000
    };
    const token = Buffer.from(JSON.stringify(tokenPayload)).toString("base64");

    return res.status(200).json({
      success: true,
      token,
      user: {
        username: crmUsername,
        name: "CRM Counselor",
        role: "crm_admin"
      },
      message: "CRM login successful"
    });
  } catch (error) {
    console.error("❌ [CRM Auth Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const verifyToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf8"));

    if (decoded.exp && decoded.exp < Date.now()) {
      return res.status(401).json({ success: false, error: "Token expired" });
    }

    return res.status(200).json({ success: true, valid: true, user: decoded });
  } catch (err) {
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
};
