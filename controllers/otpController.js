import { generateAndSendOTP, verifyOTP } from "../services/otpService.js";
import { transporter } from "../config/mailer.js";
import connectDB from "../config/db.js";
import { NextResponse } from "next/server";

export const sendOTP = async (req) => {
     try {
          await connectDB();
          const { phone, email } = await req.json();

          // console.log("📩 Send OTP request:", { phone, email });

          if (!phone || !/^[0-9]{10}$/.test(phone)) {
               return NextResponse.json({ error: "Valid 10-digit phone number is required" }, { status: 400 });
          }

          if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
               return NextResponse.json({ error: "Valid email address is required" }, { status: 400 });
          }

          const result = await generateAndSendOTP(phone, email);
          return NextResponse.json(result);
     } catch (error) {
          console.error("Send OTP error:", error);
          return NextResponse.json({ error: error.message || "Failed to send OTP" }, { status: 500 });
     }
};

export const verifyOTPAndSubmit = async (req) => {
     try {
          await connectDB();
          const { fullName, phone, email, message, otp, courseId, course, source } = await req.json();

          // Verify OTP
          const verification = await verifyOTP(phone, otp);

          if (!verification.success) {
               return NextResponse.json({ error: verification.message }, { status: 400 });
          }

          let courseName = course || "";
          let foundCourseItem = null;
          if (courseId) {
               try {
                    const Courses = (await import("../models/Courses.js")).default;
                    const coursesPage = await Courses.findOne().lean();
                    if (coursesPage && coursesPage.course) {
                         foundCourseItem = coursesPage.course.find(c => c._id && c._id.toString() === courseId.toString());
                         if (foundCourseItem && !courseName) courseName = foundCourseItem.title;
                    }
               } catch (err) {}
          }
          if (!courseName) courseName = "General Booking";
          const finalSource = source || "Contact Form Booking (Verified)";

          // Send Syllabus email to user if course item is found
          if (foundCourseItem) {
               try {
                    const syllabusHtml = `
                         <div style="font-family: 'Urbanist', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 12px; background-color: #ffffff; color: #1f2937;">
                              <div style="text-align: center; margin-bottom: 24px;">
                                   <h2 style="font-size: 26px; color: #7c3aed; margin-bottom: 8px;">Weekend UX</h2>
                                   <p style="font-size: 14px; color: #6b7280; margin: 0;">Your path to professional design mastery</p>
                              </div>
                              <h3 style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 12px; border-bottom: 2px solid #7c3aed; padding-bottom: 6px;">
                                   Syllabus: ${foundCourseItem.title}
                              </h3>
                              <p style="font-size: 15px; line-height: 1.5; color: #374151; margin-bottom: 20px;">
                                   Hi <b>${fullName}</b>,<br/><br/>
                                   Thank you for your interest in <b>${foundCourseItem.title}</b>!
                              </p>
                              <p style="font-size: 14px; line-height: 1.5; color: #6b7280; border-top: 1px solid #f3f4f6; padding-top: 16px; margin: 0;">
                                   If you have any questions or want to discuss batch details, feel free to reply to this email or contact us at <a href="mailto:info@weekendux.in" style="color: #7c3aed; text-decoration: none;">info@weekendux.in</a>.
                              </p>
                         </div>
                    `;
                    await transporter.sendMail({
                         from: process.env.EMAIL_FROM || '"Weekend UX" <info@weekendux.in>',
                         to: email,
                         subject: `Requested Syllabus - ${foundCourseItem.title} | Weekend UX`,
                         html: syllabusHtml
                    });
                    console.log(`✅ Syllabus email successfully sent to user: ${email}`);
               } catch (syllabusErr) {
                    console.error("Failed to send syllabus email in OTP verify:", syllabusErr);
               }
          }

          // Send Booking Email to Admin
          await transporter.sendMail({
               from: process.env.EMAIL_FROM || '"Weekend UX" <info@weekendux.in>',
               to: process.env.EMAIL_TO || process.env.EMAIL_USER || 'support@weekendux.in',
               subject: `New Lead Request (${finalSource}) - Weekend UX`,
               html: `
                    <h2>New Lead Request (OTP Verified)</h2>
                    <table border="1" style="border-collapse:collapse; padding: 8px;">
                           <tr>
                                <th style="padding: 8px;">Full Name</th>
                                <td style="padding: 8px;"><b>${fullName}</b></td>
                           </tr>
                           <tr>
                                <th style="padding: 8px;">Phone</th>
                                <td style="padding: 8px;">${phone}</td>
                           </tr>
                           <tr>
                                <th style="padding: 8px;">Email</th>
                                <td style="padding: 8px;">${email}</td>
                           </tr>
                           <tr>
                                <th style="padding: 8px;">Course / Subject</th>
                                <td style="padding: 8px;">${courseName}</td>
                           </tr>
                           <tr>
                                <th style="padding: 8px;">Source</th>
                                <td style="padding: 8px;">${finalSource}</td>
                           </tr>
                           <tr>
                                <th style="padding: 8px;">Message / Requirement</th>
                                <td style="padding: 8px;">${message || "N/A"}</td>
                           </tr>
                           <tr>
                                <th style="padding: 8px;">Verified At</th>
                                <td style="padding: 8px;">${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} (IST)</td>
                           </tr>
                    </table>
               `
          });

          console.log(`✅ Booking email sent to admin for: ${email}`);

          // Save lead to DB
          try {
               const Lead = (await import("../models/Lead.js")).default;
               const lead = new Lead({
                    name: fullName,
                    email,
                    phone,
                    source: finalSource,
                    answers: { message, course: courseName, courseId: courseId || "" }
               });
               await lead.save();
          } catch (leadSaveErr) {
               console.error("Failed to save OTP lead to DB:", leadSaveErr);
          }

          // Push lead data to Google Sheet asynchronously (non-blocking)
          const googleSheetWebhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
          if (googleSheetWebhookUrl) {
               fetch(googleSheetWebhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                         timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
                         name: fullName || "",
                         email: email || "",
                         phone: phone || "",
                         source: finalSource,
                         course: courseName,
                         answers: message ? (typeof message === "object" ? JSON.stringify(message) : String(message)) : ""
                    })
               }).then(() => {
                    console.log("✅ Verified booking lead successfully sent to Google Sheet!");
               }).catch((sheetErr) => {
                    console.error("❌ Failed to push booking lead to Google Sheet:", sheetErr.message);
               });
          }

          // Delete OTP record after successful submission
          const OTP = await import("../models/otpModel.js");
          await OTP.default.deleteOne({ phone });

          return NextResponse.json({ success: true, message: "Booking submitted successfully!" });
     } catch (error) {
          console.error("Submit booking error:", error);
          return NextResponse.json({ error: error.message || "Failed to submit booking" }, { status: 500 });
     }
};