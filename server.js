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
     message: { error: "Too many requests from this IP, please try again after 15 minutes." }
});
app.use(globalLimiter);

// CORS Configuration - Strict Origin Validation
const defaultAllowedOrigins = [
     "https://weekendux.in",
     "https://www.weekendux.in",
     "http://localhost:3000",
     "http://localhost:5173"
];

const customOrigins = (process.env.CLIENT_URL || process.env.ALLOWED_ORIGINS || "")
     .split(",")
     .map(o => o.trim())
     .filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...customOrigins])];

app.use(cors({
     origin: (origin, callback) => {
          // Allow requests with no origin (like mobile apps, curl, server-to-server)
          if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
               return callback(null, true);
          }
          return callback(new Error("CORS policy violation: Request origin not allowed"));
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

// Body Parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
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

