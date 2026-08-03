import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT || 465);

// Use Gmail service if using gmail.com, else use standard SMTP with 465/587 fallback
const isGmail = smtpHost.includes("gmail");

export const transporter = nodemailer.createTransport(
     isGmail
          ? {
                 service: "gmail",
                 auth: {
                      user: process.env.SMTP_USER,
                      pass: process.env.SMTP_PASS,
                 },
                 connectionTimeout: 15000,
                 socketTimeout: 15000,
            }
          : {
                 host: smtpHost,
                 port: smtpPort,
                 secure: smtpPort === 465,
                 auth: {
                      user: process.env.SMTP_USER,
                      pass: process.env.SMTP_PASS,
                 },
                 tls: {
                      rejectUnauthorized: false,
                 },
                 connectionTimeout: 15000,
                 socketTimeout: 15000,
            }
);

// Verify connection on startup
transporter.verify(function (error, success) {
     if (error) {
          console.warn("⚠️ SMTP Connection Warning (Retrying on send):", error.message);
     } else {
          console.log("✅ SMTP Server is ready to send emails");
     }
});
