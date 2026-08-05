import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT || 587);
const isSecure = smtpPort === 465;

export const transporter = nodemailer.createTransport({
     host: smtpHost,
     port: smtpPort,
     secure: isSecure, // true for 465, false for 587
     family: 4, // Force IPv4 to bypass Render IPv6 routing timeout
     pool: true, // Persistent connection pool
     maxConnections: 5,
     maxMessages: 100,
     auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
     },
     tls: {
          rejectUnauthorized: false,
     },
     connectionTimeout: 10000,
     greetingTimeout: 10000,
     socketTimeout: 15000,
});

// Verify connection on startup
transporter.verify(function (error, success) {
     if (error) {
          console.warn("⚠️ SMTP Connection Warning (Retrying on send):", error.message);
     } else {
          console.log("✅ SMTP Server is ready to send emails");
     }
});
