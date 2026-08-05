import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import apiRouter from "./routes/api.js";

// Load Environment Variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet({
     contentSecurityPolicy: false, // Turn off if it blocks resources in dev
}));

// CORS Configuration
const defaultAllowedOrigins = [
     // "http://localhost:3000",
     // "http://localhost:5173",
     // "http://10.79.125.198:3000",
     "https://weekendux.in",
     "https://www.weekendux.in",
     // "https://weekend-ux-user.netlify.app",
     // "https://weekend-ux-admin.netlify.app",
];

const customOrigins = (process.env.CLIENT_URL || process.env.ALLOWED_ORIGINS || "")
     .split(",")
     .map(o => o.trim())
     .filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...customOrigins])];

app.use(cors({
     origin: (origin, callback) => {
          // Dynamically reflect incoming origin for full CORS support
          return callback(null, true);
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

// Error handling middleware
app.use((err, req, res, next) => {
     console.error("Express Error Handler:", err);
     res.status(err.status || 500).json({
          error: err.message || "Internal Server Error"
     });
});

// Start Server
app.listen(PORT, () => {
     console.log(`Server is running on port ${PORT}`);
     console.log(`API Base URL: http://localhost:${PORT}/api`);
});
