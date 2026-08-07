import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";
import apiRouter from "./routes/api.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Trust Proxy for Reverse Proxies (Hostinger, NGINX, Cloudflare, etc.)
app.set("trust proxy", 1);

// Hide technology stack details
app.disable("x-powered-by");

// Enhanced Security Headers via Helmet
app.use(helmet({
     contentSecurityPolicy: false, // Set to false to avoid blocking legitimate cross-domain API assets
     crossOriginResourcePolicy: { policy: "cross-origin" },
     hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
     referrerPolicy: { policy: "no-referrer-when-downgrade" },
     xContentTypeOptions: true,
     xFrameOptions: { action: "deny" }
}));

// Global Rate Limiter: Prevent DoS & Abuse across all endpoints
const globalLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 300, // Limit each IP to 300 requests per windowMs
     standardHeaders: true,
     legacyHeaders: false,
     validate: { xForwardedForHeader: false },
     message: { error: "Too many requests from this IP, please try again after 15 minutes." }
});
app.use(globalLimiter);

// CORS Configuration - Strict Origin Validation
const defaultAllowedOrigins = [
     "https://weekendux.in",
     "https://www.weekendux.in",
     "https://admin.weekendux.in",
     "https://weekend-ux-admin.netlify.app",
     // "http://localhost:3000",
     // "http://localhost:5173",
     // "http://localhost:5174",
     // 'http://10.79.125.198:3000'
];

const customOrigins = (process.env.CLIENT_URL || process.env.ALLOWED_ORIGINS || "")
     .split(",")
     .map(o => o.trim())
     .filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...customOrigins])];

const isAllowedDomain = (origin) => {
     if (!origin) return true;
     if (allowedOrigins.includes(origin)) return true;
     try {
          const host = new URL(origin).hostname;
          if (host.endsWith("weekendux.in") || host.endsWith("vercel.app") || host.endsWith("onrender.com")) {
               return true;
          }
     } catch {
          return false;
     }
     return false;
};

app.use(cors({
     origin: (origin, callback) => {
          if (!origin || isAllowedDomain(origin) || process.env.NODE_ENV !== "production") {
               return callback(null, true);
          }
          console.warn(`[CORS Violation] Blocked request from origin: "${origin}"`);
          return callback(new Error(`CORS policy violation: Request origin "${origin}" not allowed`));
     },
     credentials: true,
     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
     allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-CSRF-Token",
          "X-Requested-With",
          "Accept",
          "Accept-Version",
          "Content-Length",
          "Content-MD5",
          "Date",
          "X-Api-Version",
          "x-admin-api-key"
     ]
}));

// Body Parsers (Support large gallery video & image uploads)
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: true, limit: "500mb" }));
app.use(cookieParser());

// Database Connection
connectDB()
     .then(() => {
          console.log("Database connection initialized successfully");
     })
     .catch((err) => {
          console.error("Failed to connect to database on startup:", err);
     });

// Base Route
app.use("/api", apiRouter);

app.get("/", (req, res) => {
     res.send("Weekend UX API Backend is running successfully!");
});

// 404 Route handler
app.use((req, res, next) => {
     res.status(404).json({ error: "Endpoint not found" });
});

// Error handling middleware (Hide stack traces in production)
app.use((err, req, res, next) => {
     console.error("Express Error Handler:", err);
     const status = err.status || (err.message && err.message.includes("CORS") ? 403 : 500);
     res.status(status).json({
          error: process.env.NODE_ENV === "production" && status === 500
               ? "Internal Server Error"
               : (err.message || "Internal Server Error")
     });
});

// Start Server
app.listen(PORT, () => {
     console.log(`Server is running on port ${PORT}`);
     console.log(`API Base URL: http://localhost:${PORT}/api`);
});

