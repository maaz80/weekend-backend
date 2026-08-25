import { transporter } from "../config/mailer.js";
import connectDB from "../config/db.js";
import User from "../models/Auth.js";
import Courses from "../models/Courses.js";
import { NextResponse } from "next/server";

/**
 * Send Google Meet link to all users enrolled in a specific course (or all users)
 */
export const sendCourseMeetLink = async (req) => {
     try {
          await connectDB();
          const body = await req.json();
          const { courseId, courseSlug, courseTitle, meetUrl, title, scheduledAt, instructions, saveToCourse = true } = body;

          if (!meetUrl) {
               return NextResponse.json({ error: "Google Meet URL is required" }, { status: 400 });
          }

          // Validate URL format roughly
          if (!meetUrl.startsWith("http://") && !meetUrl.startsWith("https://")) {
               return NextResponse.json({ error: "Please provide a valid Meet link (starting with https://)" }, { status: 400 });
          }

          // 1. Fetch Target Enrolled Users
          let targetUsers = [];
          if (courseId && courseId !== "ALL") {
               targetUsers = await User.find({
                    $or: [
                         { "enrolledCourses.courseId": courseId },
                         { "enrolledCourses.courseSlug": courseSlug }
                    ]
               }).select("name email").lean();
          } else {
               targetUsers = await User.find().select("name email").lean();
          }

          if (!targetUsers || targetUsers.length === 0) {
               return NextResponse.json({
                    error: "No enrolled students found for this course to send emails to."
               }, { status: 404 });
          }

          // 2. Save / Update Active Live Class on Course document in MongoDB
          if (saveToCourse && courseId && courseId !== "ALL") {
               const coursesDoc = await Courses.findOne();
               if (coursesDoc && coursesDoc.course) {
                    const targetCourse = coursesDoc.course.find(c =>
                         (c._id && c._id.toString() === courseId.toString()) ||
                         (c.slug && c.slug === courseSlug)
                    );
                    if (targetCourse) {
                         targetCourse.liveClass = {
                              meetUrl,
                              title: title || `Live Session: ${targetCourse.title}`,
                              scheduledAt: scheduledAt || "Live Now",
                              instructions: instructions || "",
                              active: true,
                              updatedAt: new Date()
                         };
                         coursesDoc.markModified("course");
                         await coursesDoc.save();
                    }
               }
          }

          // 3. Dispatch Professional HTML Emails to Enrolled Students
          const emailPromises = targetUsers.map(user => {
               const studentName = user.name || "Student";
               const emailSubject = `🔴 Live Class Invitation: ${title || courseTitle || "Weekend UX Session"}`;

               const htmlBody = `
               <!DOCTYPE html>
               <html>
               <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                         @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
                         body { font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 32px 16px; color: #171717; -webkit-font-smoothing: antialiased; }
                         .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e5e5e5; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05); }
                         .header { background: #FFB500; padding: 32px; text-align: center; color: #ffffff; border-bottom: 4px solid #171717; }
                         .header-title { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; text-transform: uppercase; }
                         .header-subtitle { font-size: 11px; font-weight: 700; color: #ffffff; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 6px; }
                         .body-content { padding: 32px; }
                         .student-greeting { font-size: 20px; font-weight: 700; color: #171717; margin-top: 0; margin-bottom: 12px; }
                         .intro-text { font-size: 14px; line-height: 1.6; color: #404040; margin: 0 0 24px 0; }
                         .course-badge { display: inline-block; background: #171717; color: #FFB500; font-size: 11px; font-weight: 700; padding: 6px 14px; border-radius: 8px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
                         .details-card { background: #fafafa; border: 1px solid #e5e5e5; border-radius: 14px; padding: 20px; margin-bottom: 28px; }
                         .cta-container { text-align: center; margin: 32px 0 24px 0; }
                         .cta-btn { display: inline-block; background: #FFB500; color: #ffffff; font-size: 15px; font-weight: 800; text-decoration: none; padding: 16px 36px; border-radius: 12px; box-shadow: 0 4px 14px rgba(255, 181, 0, 0.4); text-transform: uppercase; letter-spacing: 0.5px; }
                         .link-fallback { font-size: 12px; color: #ffffff; text-align: center; margin-top: 24px; word-break: break-all; }
                         .link-fallback a { color: #ffffff; font-weight: 700; text-decoration: underline; }
                         .footer { background: #fafafa; padding: 24px 32px; text-align: center; font-size: 12px; color: #737373; border-top: 1px solid #f5f5f5; line-height: 1.6; }
                    </style>
               </head>
               <body>
                    <div class="container">
                         <div class="header">
                              <div class="header-title">WEEKEND UX</div>
                              <div class="header-subtitle">🔴 LIVE INTERACTIVE SESSION</div>
                         </div>
                         <div class="body-content">
                              <span class="course-badge">${courseTitle || "Enrolled Course"}</span>
                              <h2 class="student-greeting">Hello ${studentName},</h2>
                              <p class="intro-text">
                                   You are invited to join an exclusive live interactive class for <strong>${courseTitle || "UI/UX Program"}</strong>. Click below to join the Google Meet session.
                              </p>

                              <div class="details-card">
                                   <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                             <td style="padding: 6px 0; font-size: 11px; font-weight: 700; color: #737373; text-transform: uppercase; width: 90px;">Topic:</td>
                                             <td style="padding: 6px 0; font-size: 14px; font-weight: 700; color: #171717;">${title || "Live Mentorship & Q/A"}</td>
                                        </tr>
                                        <tr>
                                             <td style="padding: 6px 0; font-size: 11px; font-weight: 700; color: #737373; text-transform: uppercase;">Time:</td>
                                             <td style="padding: 6px 0; font-size: 14px; font-weight: 700; color: #16a34a;">${scheduledAt || "Live Now"}</td>
                                        </tr>
                                        ${instructions ? `
                                        <tr>
                                             <td style="padding: 6px 0; font-size: 11px; font-weight: 700; color: #737373; text-transform: uppercase; vertical-align: top;">Notes:</td>
                                             <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #404040;">${instructions}</td>
                                        </tr>
                                        ` : ''}
                                   </table>
                              </div>

                              <div class="cta-container">
                                   <a href="${meetUrl}" target="_blank" class="cta-btn">
                                        🔴 Click Here To Join Google Meet
                                   </a>
                              </div>

                              <p class="link-fallback">
                                   Direct Link: <a href="${meetUrl}">${meetUrl}</a>
                              </p>
                         </div>
                         <div class="footer">
                              <strong>Weekend UX Design School</strong><br>
                              This notification was automatically sent to enrolled students.<br>
                              © 2026 Weekend UX. All rights reserved.
                         </div>
                    </div>
               </body>
               </html>
               `;

               return transporter.sendMail({
                    from: `"Weekend UX Live" <${process.env.SMTP_USER || "info@weekendux.in"}>`,
                    to: user.email,
                    subject: emailSubject,
                    html: htmlBody
               }).catch(err => {
                    console.error(`Failed sending meet link email to ${user.email}:`, err.message);
                    return null;
               });
          });

          const results = await Promise.all(emailPromises);
          const successCount = results.filter(Boolean).length;

          return NextResponse.json({
               success: true,
               message: `Meet link successfully emailed to ${successCount} out of ${targetUsers.length} enrolled students.`,
               sentCount: successCount,
               totalStudents: targetUsers.length
          });
     } catch (error) {
          console.error("sendCourseMeetLink error:", error);
          return NextResponse.json({ error: error.message || "Failed to dispatch meet emails" }, { status: 500 });
     }
};

/**
 * Clear/Deactivate active live class for a course
 */
export const clearCourseLiveClass = async (req) => {
     try {
          await connectDB();
          const body = await req.json();
          const { courseId, courseSlug } = body;

          const coursesDoc = await Courses.findOne();
          if (coursesDoc && coursesDoc.course) {
               const targetCourse = coursesDoc.course.find(c =>
                    (c._id && c._id.toString() === courseId?.toString()) ||
                    (c.slug && c.slug === courseSlug)
               );
               if (targetCourse) {
                    if (targetCourse.liveClass) {
                         targetCourse.liveClass.active = false;
                    }
                    coursesDoc.markModified("course");
                    await coursesDoc.save();
               }
          }

          return NextResponse.json({ success: true, message: "Live Class ended/cleared." });
     } catch (error) {
          return NextResponse.json({ error: error.message || "Failed to clear live class" }, { status: 500 });
     }
};
