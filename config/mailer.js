import nodemailer from "nodemailer";

const smtpPort = Number(process.env.SMTP_PORT);
const smtpHost = process.env.SMTP_HOST;

export const transporter = nodemailer.createTransport({
     host: smtpHost,
     port: smtpPort,
     secure: smtpPort === 465,
     requireTLS: smtpPort !== 465,
     auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
     },
     tls: {
          minVersion: "TLSv1.2",
          servername: smtpHost
     }
});

// Verify connection on startup (optional)
transporter.verify(function (error, success) {
     if (error) {
          console.log("❌ SMTP Connection Error:", error);
     } else {
          console.log("✅ SMTP Server is ready to send emails");
     }
});
