import Lead from "../models/Lead.js";
import Courses from "../models/Courses.js";
import { transporter } from "../config/mailer.js";
import connectDB from "../config/db.js";
import { NextResponse } from "next/server";

export const submitLead = async (req) => {
     try {
          await connectDB();
          const { name, email, phone, source, answers, courseId } = await req.json();

          if (!name || !email) {
               return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
          }

          // Basic email format check
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
               return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
          }

          // Determine lead source
          const leadSource = source || (answers?.welcome_service ? "Chatbot Inquiry" : "Website Lead");
          const leadPhone = phone || answers?.contact_phone || "";

          // Save lead to database
          const lead = new Lead({
               name,
               email,
               phone: leadPhone,
               source: leadSource,
               answers: answers || {}
          });
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
                                             Thank you for your interest in <b>${courseItem.title}</b>!
                                        </p>

                                        <div style="margin-bottom: 24px;">
                                             ${(() => {
                                                  const hasChapters = courseItem.chapter && Array.isArray(courseItem.chapter) && courseItem.chapter.length > 0;
                                                  if (!hasChapters) {
                                                       return `
                                                            <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #f3f4f6; color: #4b5563; font-size: 14px;">
                                                                 Our team has received your inquiry for <b>${courseItem.title}</b>. We will get in touch with you shortly with complete course details, batch schedules, and fee structure.
                                                            </div>
                                                       `;
                                                  }

                                                  return courseItem.chapter.map((ch, idx) => `
                                                       <div style="margin-bottom: 16px; padding: 14px 16px; background-color: #f9fafb; border-left: 4px solid #FFD400; border-radius: 8px; border-top: 1px solid #f3f4f6; border-right: 1px solid #f3f4f6; border-bottom: 1px solid #f3f4f6;">
                                                            <h4 style="font-size: 15px; font-weight: 700; color: #111827; margin: 0 0 8px 0;">
                                                                 ${ch.chaptername || `Chapter ${idx + 1}`}
                                                            </h4>
                                                            ${ch.lessons && ch.lessons.length > 0 ? `
                                                                 <ul style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #374151; line-height: 1.6;">
                                                                      ${ch.lessons.map(les => `<li>${typeof les === 'string' ? les : (les.lessonname || 'Core Lesson Topic')}</li>`).join('')}
                                                                 </ul>
                                                            ` : ''}
                                                       </div>
                                                  `).join('');
                                             })()}
                                        </div>

                                        <p style="font-size: 14px; line-height: 1.5; color: #6b7280; border-top: 1px solid #f3f4f6; padding-top: 16px; margin: 0;">
                                             If you have any questions or want to discuss batch details, feel free to reply to this email or contact us at <a href="mailto:info@weekendux.in" style="color: #7c3aed; text-decoration: none;">info@weekendux.in</a>.
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
                         from: process.env.EMAIL_FROM || '"Weekend UX" <info@weekendux.in>',
                         to: email,
                         subject: `Requested Syllabus - ${courseName} | Weekend UX`,
                         html: syllabusHtml
                    });
                    console.log(`✅ Syllabus email successfully sent to user: ${email}`);
               } catch (emailErr) {
                    console.error("❌ Failed to send syllabus email to user:", emailErr);
               }
          }

          // Send Lead Notification Email to Admin
          const adminRecipient = process.env.EMAIL_TO || process.env.EMAIL_USER || process.env.SMTP_USER || 'admin@weekendux.com';
          const isChatbotLead = leadSource === "Chatbot Inquiry" || (answers && Object.keys(answers).length > 0);

          try {
               if (isChatbotLead) {
                    const friendlyLabels = {
                         welcome_service: "Selected Topic / Interest",
                         learning_goal: "Primary Learning Goal",
                         experience_level: "Background & Experience Level",
                         preferred_batch: "Preferred Batch Schedule",
                         timeline: "Planned Start Timeline",
                         consultation: "Free 1-on-1 Counseling Session"
                    };

                    const formattedAnswersRows = Object.entries(answers || {}).map(([key, val]) => {
                         if (["contact_name", "contact_email", "contact_phone"].includes(key)) return "";
                         const label = friendlyLabels[key] || key.replace(/_/g, " ").toUpperCase();
                         const displayVal = Array.isArray(val) ? val.join(", ") : String(val || "");
                         return `
                              <tr style="border-bottom: 1px solid #f3f4f6;">
                                   <td style="padding: 10px; font-weight: bold; width: 42%; color: #4b5563; vertical-align: top;">${label}:</td>
                                   <td style="padding: 10px; color: #111827; font-weight: 500;">${displayVal}</td>
                              </tr>
                         `;
                    }).join("");

                    await transporter.sendMail({
                         from: process.env.EMAIL_FROM || '"Weekend UX" <info@weekendux.in>',
                         to: adminRecipient,
                         subject: `🤖 New Chatbot Lead: ${name} (${email}) | Weekend UX`,
                         html: `
                              <div style="font-family: 'Urbanist', Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff; color: #1f2937;">
                                   <div style="background-color: #7c3aed; padding: 16px 20px; border-radius: 12px; margin-bottom: 20px; text-align: center;">
                                        <h2 style="font-size: 20px; color: #ffffff; margin: 0; font-weight: bold;">
                                             🤖 New Chatbot Inquiry Captured
                                        </h2>
                                        <p style="font-size: 13px; color: #e9d5ff; margin: 4px 0 0 0;">Interactive Chatbot Consultation</p>
                                   </div>

                                   <h3 style="font-size: 15px; color: #111827; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #7c3aed; padding-bottom: 6px;">
                                        📋 Lead Contact Details
                                   </h3>
                                   <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
                                        <tr style="border-bottom: 1px solid #f3f4f6;">
                                             <td style="padding: 10px; font-weight: bold; width: 42%; color: #4b5563;">Full Name:</td>
                                             <td style="padding: 10px; color: #1f2937;"><b>${name}</b></td>
                                        </tr>
                                        <tr style="border-bottom: 1px solid #f3f4f6;">
                                             <td style="padding: 10px; font-weight: bold; color: #4b5563;">Email Address:</td>
                                             <td style="padding: 10px; color: #1f2937;"><a href="mailto:${email}" style="color: #7c3aed; text-decoration: none; font-weight: bold;">${email}</a></td>
                                        </tr>
                                        <tr style="border-bottom: 1px solid #f3f4f6;">
                                             <td style="padding: 10px; font-weight: bold; color: #4b5563;">Phone / WhatsApp:</td>
                                             <td style="padding: 10px; color: #1f2937;">${leadPhone ? `<a href="tel:${leadPhone}" style="color: #16a34a; text-decoration: none; font-weight: bold;">${leadPhone}</a>` : '<span style="color: #9ca3af;">Not provided</span>'}</td>
                                        </tr>
                                        <tr style="border-bottom: 1px solid #f3f4f6;">
                                             <td style="padding: 10px; font-weight: bold; color: #4b5563;">Submitted At:</td>
                                             <td style="padding: 10px; color: #1f2937;">${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} (IST)</td>
                                        </tr>
                                   </table>

                                   <h3 style="font-size: 15px; color: #111827; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #7c3aed; padding-bottom: 6px;">
                                        💬 Selected Learning Answers & Preferences
                                   </h3>
                                   <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
                                        ${formattedAnswersRows}
                                   </table>

                                   <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; border-top: 1px solid #f3f4f6; padding-top: 12px;">This email was automatically generated by Weekend UX Platform Chatbot.</p>
                              </div>
                         `
                    });
               } else {
                    await transporter.sendMail({
                         from: process.env.EMAIL_FROM || '"Weekend UX" <info@weekendux.in>',
                         to: adminRecipient,
                         subject: `🎓 New Course Inquiry: ${name} - ${courseName || 'Website Form'} | Weekend UX`,
                         html: `
                              <div style="font-family: 'Urbanist', Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff; color: #1f2937;">
                                   <div style="background-color: #FFD400; padding: 16px 20px; border-radius: 12px; margin-bottom: 20px; text-align: center;">
                                        <h2 style="font-size: 20px; color: #111827; margin: 0; font-weight: bold;">
                                             🎓 New Course Syllabus Lead Captured
                                        </h2>
                                        <p style="font-size: 13px; color: #374151; margin: 4px 0 0 0;">Course Page / Website Lead Form</p>
                                   </div>

                                   <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 14px;">
                                        <tr style="border-bottom: 1px solid #f3f4f6;">
                                             <td style="padding: 10px; font-weight: bold; width: 35%; color: #4b5563;">Full Name:</td>
                                             <td style="padding: 10px; color: #1f2937;"><b>${name}</b></td>
                                        </tr>
                                        <tr style="border-bottom: 1px solid #f3f4f6;">
                                             <td style="padding: 10px; font-weight: bold; color: #4b5563;">Email Address:</td>
                                             <td style="padding: 10px; color: #1f2937;"><a href="mailto:${email}" style="color: #7c3aed; text-decoration: none; font-weight: bold;">${email}</a></td>
                                        </tr>
                                        <tr style="border-bottom: 1px solid #f3f4f6;">
                                             <td style="padding: 10px; font-weight: bold; color: #4b5563;">Phone Number:</td>
                                             <td style="padding: 10px; color: #1f2937;">${leadPhone ? `<a href="tel:${leadPhone}" style="color: #16a34a; text-decoration: none; font-weight: bold;">${leadPhone}</a>` : '<span style="color: #9ca3af;">Not provided</span>'}</td>
                                        </tr>
                                        <tr style="border-bottom: 1px solid #f3f4f6;">
                                             <td style="padding: 10px; font-weight: bold; color: #4b5563;">Course Page:</td>
                                             <td style="padding: 10px; color: #1f2937;"><b>${courseName || 'General Website Popup'}</b></td>
                                        </tr>
                                        <tr style="border-bottom: 1px solid #f3f4f6;">
                                             <td style="padding: 10px; font-weight: bold; color: #4b5563;">Submitted At:</td>
                                             <td style="padding: 10px; color: #1f2937;">${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} (IST)</td>
                                        </tr>
                                   </table>

                                   <p style="font-size: 12px; color: #9ca3af; margin-top: 20px; border-top: 1px solid #f3f4f6; padding-top: 12px;">This email was automatically generated by Weekend UX Platform.</p>
                              </div>
                         `
                    });
               }
               console.log(`✅ Lead notification email successfully sent to admin: ${adminRecipient}`);
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
