import Lead from "../models/Lead.js";
import Courses from "../models/Courses.js";
import { transporter } from "../config/mailer.js";
import connectDB from "../config/db.js";
import { NextResponse } from "next/server";

export const submitLead = async (req) => {
     try {
          await connectDB();
          const { name, email, courseId } = await req.json();

          if (!name || !email) {
               return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
          }

          // Basic email format check
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
               return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
          }

          // Save lead to database
          const lead = new Lead({ name, email });
          await lead.save();

          // Try to look up the course for syllabus details if courseId is provided
          let courseItem = null;
          let courseName = "";
          let syllabusHtml = "";

          if (courseId) {
               try {
                    const coursesPage = await Courses.findOne();
                    if (coursesPage && coursesPage.course && coursesPage.course.length > 0) {
                         courseItem = coursesPage.course.find(c => c._id && c._id.toString() === courseId.toString());
                         
                         if (courseItem) {
                              courseName = courseItem.title;
                              syllabusHtml = `
                                   <div style="font-family: 'Urbanist', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 12px; background-color: #ffffff; color: #1f2937;">
                                        <div style="text-align: center; margin-bottom: 24px;">
                                             <h2 style="font-size: 26px; color: #7c3aed; margin-bottom: 8px;">Weekend UX</h2>
                                             <p style="font-size: 14px; color: #6b7280; margin: 0;">Your path to professional design mastery</p>
                                        </div>
                                        
                                        <h3 style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 12px; border-bottom: 2px solid #7c3aed; padding-bottom: 6px;">
                                             Syllabus: ${courseItem.title}
                                        </h3>
                                        
                                        <p style="font-size: 15px; line-height: 1.5; color: #374151; margin-bottom: 20px;">
                                             Hi <b>${name}</b>,<br/><br/>
                                             Thank you for your interest in our curriculum! Here is the complete list of chapters and lessons for <b>${courseItem.title}</b>:
                                        </p>

                                        <div style="margin-bottom: 24px;">
                                             ${courseItem.chapter && courseItem.chapter.length > 0 ? 
                                                  courseItem.chapter.map((ch, idx) => `
                                                       <div style="margin-bottom: 16px; padding: 12px; background-color: #f9fafb; border-left: 4px solid #7c3aed; border-radius: 4px;">
                                                            <h4 style="font-size: 16px; font-weight: 600; color: #111827; margin: 0 0 8px 0;">
                                                                 Chapter ${idx + 1}: ${ch.chaptername}
                                                            </h4>
                                                            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #4b5563; line-height: 1.6;">
                                                                 ${ch.lessons && ch.lessons.length > 0 ? 
                                                                      ch.lessons.map(les => `<li>${les.lessonname}</li>`).join('') 
                                                                      : '<li>Lessons coming soon!</li>'
                                                                 }
                                                            </ul>
                                                       </div>
                                                  `).join('') 
                                                  : '<p style="color: #6b7280; font-style: italic;">Syllabus outline is currently being updated. Please check back soon!</p>'
                                             }
                                        </div>

                                        <p style="font-size: 14px; line-height: 1.5; color: #6b7280; border-top: 1px solid #f3f4f6; padding-top: 16px; margin: 0;">
                                             If you have any questions or want to discuss batch details, feel free to reply to this email or contact us at <a href="mailto:info@weekendux.com" style="color: #7c3aed; text-decoration: none;">info@weekendux.com</a>.
                                        </p>
                                   </div>
                              `;
                         }
                    }
               } catch (lookupErr) {
                    console.error("Error generating syllabus content for email:", lookupErr);
               }
          }

          // Send Syllabus Email to user (ONLY if they filled form on a specific course page and course is found)
          if (courseItem && syllabusHtml) {
               try {
                    await transporter.sendMail({
                         from: process.env.EMAIL_FROM || '"Weekend UX" <info@weekendux.com>',
                         to: email,
                         subject: `Requested Syllabus - ${courseName} | Weekend UX`,
                         html: syllabusHtml
                    });
                    console.log(`✅ Syllabus email successfully sent to user: ${email}`);
               } catch (emailErr) {
                    console.error("❌ Failed to send syllabus email to user:", emailErr);
               }
          }

          // Send Lead Notification Email to us (our email)
          try {
               await transporter.sendMail({
                    from: process.env.EMAIL_FROM || '"Weekend UX" <info@weekendux.com>',
                    to: process.env.EMAIL_TO || 'admin@weekendux.com',
                    subject: `New Lead Captured: ${name} | Weekend UX`,
                    html: `
                         <div style="font-family: 'Urbanist', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 12px; background-color: #ffffff; color: #1f2937;">
                              <h2 style="font-size: 20px; color: #7c3aed; margin-bottom: 16px; border-bottom: 2px solid #7c3aed; padding-bottom: 6px; font-weight: bold;">
                                   New Lead Captured
                              </h2>
                              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
                                   <tr style="border-bottom: 1px solid #f3f4f6;">
                                        <td style="padding: 10px; font-weight: bold; width: 35%; color: #4b5563;">Name:</td>
                                        <td style="padding: 10px; color: #1f2937;">${name}</td>
                                   </tr>
                                   <tr style="border-bottom: 1px solid #f3f4f6;">
                                        <td style="padding: 10px; font-weight: bold; color: #4b5563;">Email:</td>
                                        <td style="padding: 10px; color: #1f2937;"><a href="mailto:${email}" style="color: #7c3aed; text-decoration: none;">${email}</a></td>
                                   </tr>
                                   <tr style="border-bottom: 1px solid #f3f4f6;">
                                        <td style="padding: 10px; font-weight: bold; color: #4b5563;">Source Course Page:</td>
                                        <td style="padding: 10px; color: #1f2937;">${courseName ? `<b>${courseName}</b>` : '<span style="color: #9ca3af; font-style: italic;">General Website Popup / Non-Course Page</span>'}</td>
                                   </tr>
                                   <tr style="border-bottom: 1px solid #f3f4f6;">
                                        <td style="padding: 10px; font-weight: bold; color: #4b5563;">Submitted At:</td>
                                        <td style="padding: 10px; color: #1f2937;">${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} (IST)</td>
                                   </tr>
                              </table>
                              <p style="font-size: 12px; color: #9ca3af; margin: 0;">This email was sent automatically from Weekend UX backend.</p>
                         </div>
                    `
               });
               console.log(`✅ Lead notification email successfully sent to admin: ${process.env.EMAIL_TO || 'admin@weekendux.com'}`);
          } catch (adminEmailErr) {
               console.error("❌ Failed to send lead notification to admin:", adminEmailErr);
          }

          return NextResponse.json({ success: true, message: "Lead submitted successfully", lead });
     } catch (error) {
          console.error("Error saving lead:", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};

export const getLeads = async (req) => {
     try {
          await connectDB();
          const leads = await Lead.find().sort({ createdAt: -1 });
          return NextResponse.json(leads);
     } catch (error) {
          console.error("Error fetching leads:", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};
