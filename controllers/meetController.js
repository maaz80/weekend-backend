import { transporter } from "../config/mailer.js";
import connectDB from "../config/db.js";
import User from "../models/Auth.js";
import Courses from "../models/Courses.js";
import { NextResponse } from "next/server";

/**
 * Send Zoom Live Class link to all users enrolled in a specific course (or all users)
 */
export const sendCourseMeetLink = async (req) => {
     try {
          await connectDB();
          const body = await req.json();
          const {
               courseId,
               courseSlug,
               courseTitle,
               meetUrl,
               startUrl = "",
               zoomMeetingId = "",
               passcode = "",
               title,
               scheduledAt,
               instructions,
               saveToCourse = true
          } = body;

          if (!meetUrl) {
               return NextResponse.json({ error: "Zoom Meeting URL is required" }, { status: 400 });
          }

          // Validate URL format
          if (!meetUrl.startsWith("http://") && !meetUrl.startsWith("https://")) {
               return NextResponse.json({ error: "Please provide a valid Zoom link (starting with https://)" }, { status: 400 });
          }

          // 1. Save / Update Active Live Class on Course document in MongoDB FIRST
          let savedCourseName = "selected courses";
          if (saveToCourse) {
               const coursesDoc = await Courses.findOne();
               if (coursesDoc && coursesDoc.course && coursesDoc.course.length > 0) {
                    const livePayload = (cTitle) => ({
                         platform: "zoom",
                         meetUrl,
                         startUrl: startUrl || meetUrl,
                         zoomMeetingId,
                         passcode,
                         title: title || `Live Zoom Session: ${cTitle || "UI/UX Class"}`,
                         scheduledAt: scheduledAt || "Live Now",
                         instructions: instructions || "",
                         active: true,
                         updatedAt: new Date()
                    });

                    if (courseId === "ALL") {
                         coursesDoc.course.forEach(c => {
                              c.liveClass = livePayload(c.title);
                         });
                         savedCourseName = "ALL Courses";
                    } else {
                         let targetCourse = coursesDoc.course.find(c =>
                              (c._id && c._id.toString() === courseId.toString()) ||
                              (c.slug && (c.slug === courseSlug || c.slug === courseId)) ||
                              (c.title && courseTitle && c.title.toLowerCase().trim() === courseTitle.toLowerCase().trim())
                         );

                         if (!targetCourse && (courseId || courseSlug)) {
                              const searchStr = (courseSlug || courseId || "").toString().toLowerCase();
                              targetCourse = coursesDoc.course.find(c =>
                                   (c.slug && c.slug.toLowerCase().includes(searchStr)) ||
                                   (c.title && c.title.toLowerCase().includes(searchStr))
                              );
                         }

                         if (targetCourse) {
                              targetCourse.liveClass = livePayload(targetCourse.title);
                              savedCourseName = targetCourse.title;
                         } else if (coursesDoc.course[0]) {
                              coursesDoc.course[0].liveClass = livePayload(coursesDoc.course[0].title);
                              savedCourseName = coursesDoc.course[0].title;
                         }
                    }
                    coursesDoc.markModified("course");
                    await coursesDoc.save();
               }
          }

          // 2. Fetch Target Enrolled Users to Send Email Invites
          let targetUsers = [];
          if (courseId && courseId !== "ALL") {
               targetUsers = await User.find({
                    $or: [
                         { "enrolledCourses.courseId": courseId },
                         { "enrolledCourses.courseSlug": courseSlug },
                         { "enrolledCourses.courseSlug": courseId }
                    ]
               }).select("name email").lean();
          } else {
               targetUsers = await User.find().select("name email").lean();
          }

          // 3. Dispatch Professional HTML Emails to Enrolled Students
          const emailPromises = targetUsers.map(user => {
               const studentName = user.name || "Student";
               const emailSubject = `🔵 Live Zoom Class Invitation: ${title || courseTitle || "Weekend UX Session"}`;

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
                         .header { background: #2D8CFF; padding: 32px; text-align: center; color: #ffffff; border-bottom: 4px solid #171717; }
                         .header-title { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; text-transform: uppercase; }
                         .header-subtitle { font-size: 11px; font-weight: 700; color: #ffffff; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 6px; }
                         .body-content { padding: 32px; }
                         .student-greeting { font-size: 20px; font-weight: 700; color: #171717; margin-top: 0; margin-bottom: 12px; }
                         .intro-text { font-size: 14px; line-height: 1.6; color: #404040; margin: 0 0 24px 0; }
                         .course-badge { display: inline-block; background: #171717; color: #2D8CFF; font-size: 11px; font-weight: 700; padding: 6px 14px; border-radius: 8px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
                         .details-card { background: #fafafa; border: 1px solid #e5e5e5; border-radius: 14px; padding: 20px; margin-bottom: 24px; }
                         .controls-badge-wrap { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
                         .ctrl-pill { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; background: #eef2ff; color: #3730a3; }
                         .cta-container { text-align: center; margin: 28px 0 20px 0; }
                         .cta-btn { display: inline-block; background: #2D8CFF; color: #ffffff; font-size: 15px; font-weight: 800; text-decoration: none; padding: 16px 36px; border-radius: 12px; box-shadow: 0 4px 14px rgba(45, 140, 255, 0.4); text-transform: uppercase; letter-spacing: 0.5px; }
                         .link-fallback { font-size: 12px; color: #737373; text-align: center; margin-top: 20px; word-break: break-all; }
                         .link-fallback a { color: #2D8CFF; font-weight: 700; text-decoration: underline; }
                         .footer { background: #fafafa; padding: 24px 32px; text-align: center; font-size: 12px; color: #737373; border-top: 1px solid #f5f5f5; line-height: 1.6; }
                    </style>
               </head>
               <body>
                    <div class="container">
                         <div class="header">
                              <div class="header-title">WEEKEND UX</div>
                              <div class="header-subtitle">🔵 LIVE ZOOM INTERACTIVE CLASS</div>
                         </div>
                         <div class="body-content">
                              <span class="course-badge">${courseTitle || "Enrolled Course"}</span>
                              <h2 class="student-greeting">Hello ${studentName},</h2>
                              <p class="intro-text">
                                   You are invited to join an exclusive live interactive Zoom class for <strong>${courseTitle || "UI/UX Program"}</strong>. Click below to enter your student meeting room.
                              </p>

                              <div class="details-card">
                                   <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                             <td style="padding: 6px 0; font-size: 11px; font-weight: 700; color: #737373; text-transform: uppercase; width: 100px;">Topic:</td>
                                             <td style="padding: 6px 0; font-size: 14px; font-weight: 700; color: #171717;">${title || "Live Mentorship & Q/A"}</td>
                                        </tr>
                                        <tr>
                                             <td style="padding: 6px 0; font-size: 11px; font-weight: 700; color: #737373; text-transform: uppercase;">Scheduled Time:</td>
                                             <td style="padding: 6px 0; font-size: 14px; font-weight: 700; color: #2563eb;">${scheduledAt || "Live Now"}</td>
                                        </tr>
                                        ${zoomMeetingId ? `
                                        <tr>
                                             <td style="padding: 6px 0; font-size: 11px; font-weight: 700; color: #737373; text-transform: uppercase;">Meeting ID:</td>
                                             <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #171717;">${zoomMeetingId}</td>
                                        </tr>
                                        ` : ''}
                                        ${passcode ? `
                                        <tr>
                                             <td style="padding: 6px 0; font-size: 11px; font-weight: 700; color: #737373; text-transform: uppercase;">Passcode:</td>
                                             <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #171717;">${passcode}</td>
                                        </tr>
                                        ` : ''}
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
                                        🔵 Click Here To Join Zoom Meeting
                                   </a>
                              </div>

                              <p class="link-fallback">
                                   Direct Zoom Link: <a href="${meetUrl}">${meetUrl}</a>
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
                    console.error(`Failed sending Zoom meet link email to ${user.email}:`, err.message);
                    return null;
               });
          });

          const results = await Promise.all(emailPromises);
          const successCount = results.filter(Boolean).length;

          return NextResponse.json({
               success: true,
               message: `Zoom meeting link successfully emailed to ${successCount} out of ${targetUsers.length} enrolled students.`,
               sentCount: successCount,
               totalStudents: targetUsers.length
          });
     } catch (error) {
          console.error("sendCourseMeetLink error:", error);
          return NextResponse.json({ error: error.message || "Failed to dispatch Zoom meet emails" }, { status: 500 });
     }
};

/**
 * Helper to fetch Zoom OAuth Token
 */
async function getZoomAccessToken() {
     const accountId = process.env.ZOOM_ACCOUNT_ID;
     const clientId = process.env.ZOOM_CLIENT_ID;
     const clientSecret = process.env.ZOOM_CLIENT_SECRET;

     if (!accountId || !clientId || !clientSecret) return null;

     const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
     const tokenRes = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`, {
          method: "POST",
          headers: {
               "Authorization": `Basic ${authHeader}`,
               "Content-Type": "application/x-www-form-urlencoded"
          }
     });

     const tokenData = await tokenRes.json();
     return tokenData.access_token || null;
}

/**
 * Helper to Forcefully End an Active Meeting in Zoom Cloud
 */
async function forceEndZoomMeeting(meetingId, accessToken) {
     if (!accessToken) return false;
     let ended = false;

     // 1. Try to end specific meeting number if available
     if (meetingId) {
          try {
               const cleanId = meetingId.toString().replace(/\s+/g, "");
               const res = await fetch(`https://api.zoom.us/v2/meetings/${cleanId}/status`, {
                    method: "PUT",
                    headers: {
                         "Authorization": `Bearer ${accessToken}`,
                         "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ action: "end" })
               });
               if (res.ok || res.status === 204) {
                    console.log(`Successfully ended Zoom meeting ID ${cleanId} in Zoom Cloud`);
                    ended = true;
               }
          } catch (e) {
               console.log("Notice ending meeting by ID:", e.message);
          }
     }

     // 2. Query Zoom API for ALL live running meetings under 'me' and force-end each
     try {
          const liveRes = await fetch("https://api.zoom.us/v2/users/me/meetings?type=live", {
               headers: { "Authorization": `Bearer ${accessToken}` }
          });
          const liveData = await liveRes.json();
          if (liveData && liveData.meetings && Array.isArray(liveData.meetings)) {
               for (const m of liveData.meetings) {
                    if (m.id) {
                         await fetch(`https://api.zoom.us/v2/meetings/${m.id}/status`, {
                              method: "PUT",
                              headers: {
                                   "Authorization": `Bearer ${accessToken}`,
                                   "Content-Type": "application/json"
                              },
                              body: JSON.stringify({ action: "end" })
                         });
                         console.log(`Successfully force-ended live meeting UUID/ID ${m.id}`);
                         ended = true;
                    }
               }
          }
     } catch (e) {
          console.log("Notice checking live meetings list:", e.message);
     }

     return ended;
}

/**
 * Clear/Deactivate active live class for a course and end meeting in Zoom Cloud
 */
export const clearCourseLiveClass = async (req) => {
     try {
          await connectDB();
          const body = await req.json();
          const { courseId, courseSlug } = body;

          const coursesDoc = await Courses.findOne();
          const zoomToken = await getZoomAccessToken();

          const processEndCourseMeeting = async (c) => {
               if (!c || !c.liveClass) return;

               // Extract Meeting ID from zoomMeetingId or meetUrl regex
               let meetingId = c.liveClass.zoomMeetingId;
               if (!meetingId && c.liveClass.meetUrl) {
                    const idMatch = c.liveClass.meetUrl.match(/\/(?:j|wc\/join)\/(\d+)/);
                    if (idMatch && idMatch[1]) meetingId = idMatch[1];
               }

               // 1. FIRST: Forcefully end meeting in Zoom Cloud so participants are disconnected
               if (zoomToken) {
                    await forceEndZoomMeeting(meetingId, zoomToken);
               }

               // 2. Fetch any completed cloud recording immediately before clearing active status
               if (meetingId && zoomToken) {
                    try {
                         const recRes = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}/recordings`, {
                              headers: { "Authorization": `Bearer ${zoomToken}` }
                         });
                         const recData = await recRes.json();
                         if (recData && recData.recording_files && recData.recording_files.length > 0) {
                              const videoFile = recData.recording_files.find(f => f.file_type === "MP4") || recData.recording_files[0];
                              if (videoFile) {
                                   if (!c.recordings) c.recordings = [];
                                   const videoUrl = videoFile.play_url || videoFile.download_url;
                                   const exists = c.recordings.some(r => r.id === videoFile.id || r.videoUrl === videoUrl);
                                   if (!exists) {
                                        c.recordings.push({
                                             id: videoFile.id || Date.now().toString(),
                                             title: recData.topic || `${c.title} - Live Class Recording`,
                                             videoUrl,
                                             downloadUrl: videoFile.download_url || videoFile.play_url,
                                             duration: recData.duration ? `${recData.duration} mins` : "Session",
                                             meetingId: meetingId.toString(),
                                             createdAt: new Date()
                                        });
                                   }
                              }
                         }
                    } catch (e) {
                         console.log("Notice: Recording sync on end meeting:", e.message);
                    }
               }

               // 3. FINALLY: Deactivate live class status in database
               c.liveClass.active = false;
          };

          if (coursesDoc && coursesDoc.course) {
               if (courseId === "ALL" || !courseId) {
                    for (const c of coursesDoc.course) {
                         await processEndCourseMeeting(c);
                    }
               } else {
                    const targetCourse = coursesDoc.course.find(c =>
                         (c._id && c._id.toString() === courseId?.toString()) ||
                         (c.slug && c.slug === courseSlug)
                    );
                    if (targetCourse) {
                         await processEndCourseMeeting(targetCourse);
                    }
               }
               coursesDoc.markModified("course");
               await coursesDoc.save();
          }

          return NextResponse.json({ success: true, message: "Live Zoom session ended in Zoom cloud and removed from courses." });
     } catch (error) {
          return NextResponse.json({ error: error.message || "Failed to clear live class" }, { status: 500 });
     }
};

/**
 * Auto-Generate Real Zoom Meeting via Zoom Server-to-Server OAuth API
 */
export const createZoomMeetingApi = async (req) => {
     try {
          await connectDB();
          const body = req.body || (req.json ? await req.json().catch(() => ({})) : {});
          const {
               topic = "Live Interactive UI/UX Class"
          } = body;

          const accessToken = await getZoomAccessToken();

          if (!accessToken) {
               return NextResponse.json({
                    success: false,
                    needCredentials: true,
                    message: "Zoom API Keys missing in backend .env. Please paste real Zoom URL or configure ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET."
               });
          }

          // 1. Query Zoom API directly for any currently LIVE running meetings under 'me' and force-end them
          try {
               const liveRes = await fetch("https://api.zoom.us/v2/users/me/meetings?type=live", {
                    headers: { "Authorization": `Bearer ${accessToken}` }
               });
               const liveData = await liveRes.json();
               if (liveData && Array.isArray(liveData.meetings)) {
                    for (const m of liveData.meetings) {
                         if (m.id) await forceEndZoomMeeting(m.id, accessToken);
                    }
               }
          } catch (e) {
               console.log("Notice checking live meetings:", e.message);
          }

          // 2. Force end any previous active meetings on Courses to free up the Host account
          const coursesDoc = await Courses.findOne();
          if (coursesDoc && coursesDoc.course) {
               for (const c of coursesDoc.course) {
                    if (c.liveClass && c.liveClass.active) {
                         let meetingId = c.liveClass.zoomMeetingId;
                         if (!meetingId && c.liveClass.meetUrl) {
                              const idMatch = c.liveClass.meetUrl.match(/\/(?:j|wc\/join)\/(\d+)/);
                              if (idMatch && idMatch[1]) meetingId = idMatch[1];
                         }
                         if (meetingId) await forceEndZoomMeeting(meetingId, accessToken);
                         c.liveClass.active = false;
                    }
               }
               coursesDoc.markModified("course");
               await coursesDoc.save();
          }

          // 2. Create New Meeting via Zoom API
          const meetingRes = await fetch("https://api.zoom.us/v2/users/me/meetings", {
               method: "POST",
               headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
               },
               body: JSON.stringify({
                    topic,
                    type: 2, // Scheduled/Instant meeting
                    settings: {
                         host_video: true,
                         participant_video: true,
                         auto_recording: "cloud", // AUTOMATICALLY RECORD MEETING TO ZOOM CLOUD!
                         mute_upon_entry: false,
                         allow_unmute_by_self: true,
                         in_meeting_chat: true,
                         private_chat: true,
                         screen_share_option: "all",
                         waiting_room: false,
                         join_before_host: true,
                         jbh_time: 0,
                         enforce_login: false,
                         breakout_room: { enable: false }
                    }
               })
          });

          const meetingData = await meetingRes.json();
          if (!meetingData.join_url) {
               return NextResponse.json({
                    success: false,
                    error: meetingData.message || "Failed to create Zoom meeting via Zoom API"
               }, { status: 400 });
          }

          return NextResponse.json({
               success: true,
               meetUrl: meetingData.join_url,
               startUrl: meetingData.start_url || meetingData.join_url,
               zoomMeetingId: meetingData.id?.toString() || "",
               passcode: meetingData.password || ""
          });
     } catch (err) {
          return NextResponse.json({
               success: false,
               error: err.message || "Failed to auto-generate Zoom meeting"
          }, { status: 500 });
     }
};

/**
 * Handle Zoom Webhook for recording.completed & automatically attach recording to course
 */
export const handleZoomWebhook = async (req) => {
     try {
          await connectDB();
          const body = await req.json();

          // Validation event check for Zoom Webhook setup
          if (body.event === "endpoint.url_validation") {
               const plainToken = body.payload?.plainToken;
               return NextResponse.json({ plainToken, encryptedToken: plainToken });
          }

          if (body.event === "recording.completed") {
               const meetingObj = body.payload?.object || {};
               const meetingId = meetingObj.id?.toString();
               const topic = meetingObj.topic || "Live Class Session";
               const duration = meetingObj.duration ? `${meetingObj.duration} mins` : "45 mins";
               const recordingFiles = meetingObj.recording_files || [];

               // Find completed video recording file
               const videoFile = recordingFiles.find(f => f.file_type === "MP4") || recordingFiles[0];
               if (!videoFile) {
                    return NextResponse.json({ message: "No MP4 video file found in recording payload" });
               }

               const videoUrl = videoFile.play_url || videoFile.download_url;
               const downloadUrl = videoFile.download_url || videoFile.play_url;

               // Save recording to corresponding course in MongoDB
               const coursesDoc = await Courses.findOne();
               if (coursesDoc && coursesDoc.course) {
                    let matchedCourse = coursesDoc.course.find(c => 
                         c.liveClass?.zoomMeetingId?.toString() === meetingId ||
                         (c.title && topic.toLowerCase().includes(c.title.toLowerCase()))
                    );

                    if (!matchedCourse && coursesDoc.course.length > 0) {
                         matchedCourse = coursesDoc.course[0];
                    }

                    if (matchedCourse) {
                         if (!matchedCourse.recordings) matchedCourse.recordings = [];
                         
                         // Prevent duplicate recording entries
                         const alreadyExists = matchedCourse.recordings.some(r => r.id === videoFile.id || r.videoUrl === videoUrl);
                         if (!alreadyExists) {
                              matchedCourse.recordings.push({
                                   id: videoFile.id || Date.now().toString(),
                                   title: topic || `${matchedCourse.title} - Live Class Recording`,
                                   videoUrl,
                                   downloadUrl,
                                   duration,
                                   meetingId,
                                   createdAt: new Date()
                              });

                              if (matchedCourse.liveClass) {
                                   matchedCourse.liveClass.active = false;
                              }

                              coursesDoc.markModified("course");
                              await coursesDoc.save();
                         }
                    }
               }
          }

          return NextResponse.json({ success: true, message: "Zoom webhook processed." });
     } catch (err) {
          console.error("Zoom webhook error:", err);
          return NextResponse.json({ error: err.message || "Failed to process Zoom webhook" }, { status: 500 });
     }
};

/**
 * Manual/Automatic Endpoint to Sync Cloud Recordings from Zoom API into MongoDB
 */
export const syncZoomRecordings = async (req) => {
     try {
          await connectDB();
          const accessToken = await getZoomAccessToken();

          if (!accessToken) {
               return NextResponse.json({
                    success: false,
                    message: "Zoom API Credentials missing in backend .env. Please configure ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET."
               }, { status: 400 });
          }

          const today = new Date();
          const pastDate = new Date();
          pastDate.setDate(today.getDate() - 90); // Fetch last 90 days
          const fromStr = pastDate.toISOString().split("T")[0];
          const toStr = today.toISOString().split("T")[0];

          // Fetch recordings from Zoom API
          const recRes = await fetch(`https://api.zoom.us/v2/users/me/recordings?page_size=100&from=${fromStr}&to=${toStr}`, {
               headers: { "Authorization": `Bearer ${accessToken}` }
          });

          const recData = await recRes.json();

          if (recData.code || (recData.message && !recData.meetings)) {
               return NextResponse.json({
                    success: false,
                    message: `Zoom API Response: ${recData.message || "Cloud Recording feature is not enabled on this Zoom account. Free Zoom accounts only support local recordings."}`
               }, { status: 400 });
          }

          if (!recData || !recData.meetings || !Array.isArray(recData.meetings) || recData.meetings.length === 0) {
               return NextResponse.json({
                    success: true,
                    message: "No cloud recordings found on your Zoom account for the past 90 days. Make sure Cloud Recording was enabled during the class.",
                    syncedCount: 0
               });
          }

          const coursesDoc = await Courses.findOne();
          if (!coursesDoc || !coursesDoc.course) {
               return NextResponse.json({ success: false, message: "No courses found in database." });
          }

          let addedCount = 0;

          for (const meetingObj of recData.meetings) {
               const meetingId = meetingObj.id?.toString();
               const topic = meetingObj.topic || "Live Class Session";
               const duration = meetingObj.duration ? `${meetingObj.duration} mins` : "Session";
               const recordingFiles = meetingObj.recording_files || [];

               const videoFile = recordingFiles.find(f => f.file_type === "MP4") || recordingFiles[0];
               if (!videoFile) continue;

               const videoUrl = videoFile.play_url || videoFile.download_url;
               const downloadUrl = videoFile.download_url || videoFile.play_url;

               // Match course by meeting ID or title
               let targetCourse = coursesDoc.course.find(c =>
                    c.liveClass?.zoomMeetingId?.toString() === meetingId ||
                    (c.title && topic.toLowerCase().includes(c.title.toLowerCase()))
               );

               if (!targetCourse && coursesDoc.course.length > 0) {
                    targetCourse = coursesDoc.course[0];
               }

               if (targetCourse) {
                    if (!targetCourse.recordings) targetCourse.recordings = [];
                    const exists = targetCourse.recordings.some(r => r.id === videoFile.id || r.videoUrl === videoUrl);
                    if (!exists) {
                         targetCourse.recordings.push({
                              id: videoFile.id || Date.now().toString(),
                              title: topic || `${targetCourse.title} - Recorded Class`,
                              videoUrl,
                              downloadUrl,
                              duration,
                              meetingId,
                              createdAt: meetingObj.start_time ? new Date(meetingObj.start_time) : new Date()
                         });
                         addedCount++;
                    }
               }
          }

          if (addedCount > 0) {
               coursesDoc.markModified("course");
               await coursesDoc.save();
          }

          return NextResponse.json({
               success: true,
               message: addedCount > 0 
                    ? `Successfully synced ${addedCount} new cloud recording(s) from Zoom account!`
                    : "All existing Zoom Cloud recordings are already synced with courses.",
               syncedCount: addedCount
          });
     } catch (err) {
          console.error("syncZoomRecordings error:", err);
          return NextResponse.json({ error: err.message || "Failed to sync Zoom recordings" }, { status: 500 });
     }
};
