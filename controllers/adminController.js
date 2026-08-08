import crypto from "crypto";
import { createAdminToken } from "../middleware/adminAuth.js";
import { NextResponse } from "next/server";

const safeCompare = (receivedValue, expectedValue) => {
     const received = Buffer.from(receivedValue || "");
     const expected = Buffer.from(expectedValue || "");

     if (received.length !== expected.length) {
          return false;
     }

     return crypto.timingSafeEqual(received, expected);
};

export const loginAdmin = async (req) => {
     try {
          const { username, password } = await req.json();
          const adminUsername = process.env.ADMIN_USERNAME;
          const adminPassword = process.env.ADMIN_PASSWORD;

          if (!adminUsername || !adminPassword) {
               return NextResponse.json({ error: "Admin login is not configured." }, { status: 503 });
          }

          if (!safeCompare(username, adminUsername) || !safeCompare(password, adminPassword)) {
               return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
          }

          const token = createAdminToken();

          return NextResponse.json({
               token,
               expiresIn: 30 * 24 * 60 * 60
          });
     } catch (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};

export const getUsers = async (req) => {
     try {
          const connectDB = (await import("../config/db.js")).default;
          const User = (await import("../models/Auth.js")).default;
          const Courses = (await import("../models/Courses.js")).default;
          await connectDB();

          const users = await User.find().select("-password").sort({ createdAt: -1 }).lean();
          const coursesDoc = await Courses.findOne().lean();
          const allCourses = coursesDoc?.course || [];

          const populatedUsers = users.map(user => {
               const enrolled = (user.enrolledCourses || []).map(item => {
                    const cIdStr = item.courseId?.toString() || "";
                    const cSlugStr = item.courseSlug || "";
                    let found = allCourses.find(c =>
                         (c._id && c._id.toString() === cIdStr) ||
                         (c.slug && c.slug === cIdStr) ||
                         (cSlugStr && c.slug === cSlugStr)
                    );

                    if (!found && allCourses.length === 1) {
                         found = allCourses[0];
                    }

                    let derivedTitle = "Course";
                    if (found) {
                         derivedTitle = found.title || found.name || "Course";
                    } else if (cSlugStr) {
                         derivedTitle = cSlugStr.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                    }

                    return {
                         ...item,
                         courseId: found || { _id: cIdStr, slug: cSlugStr, title: derivedTitle }
                    };
               });
               return {
                    ...user,
                    enrolledCourses: enrolled
               };
          });

          return NextResponse.json({ success: true, users: populatedUsers });
     } catch (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};

export const assignCourseToUser = async (req) => {
     try {
          const connectDB = (await import("../config/db.js")).default;
          const User = (await import("../models/Auth.js")).default;
          const Courses = (await import("../models/Courses.js")).default;
          await connectDB();

          const { userId, courseId } = await req.json();

          if (!userId || !courseId) {
               return NextResponse.json({ error: "Please provide userId and courseId" }, { status: 400 });
          }

          const user = await User.findById(userId);
          if (!user) {
               return NextResponse.json({ error: "User not found" }, { status: 404 });
          }

          const coursesDoc = await Courses.findOne().lean();
          const allCourses = coursesDoc?.course || [];
          const targetCourse = allCourses.find(c => c._id?.toString() === courseId.toString() || c.slug === courseId.toString());

          const targetIdStr = targetCourse?._id?.toString() || courseId.toString();
          const targetSlugStr = targetCourse?.slug || (targetCourse?.title ? targetCourse.title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-") : courseId.toString());

          const alreadyEnrolled = user.enrolledCourses.some((item) => {
               const itemCId = item.courseId?.toString();
               return itemCId === targetIdStr || (targetSlugStr && item.courseSlug === targetSlugStr);
          });

          if (!alreadyEnrolled) {
               user.enrolledCourses.push({
                    courseId: targetIdStr,
                    courseSlug: targetSlugStr,
                    enrolledAt: new Date(),
                    progress: 0
               });
               await user.save();
          }

          return NextResponse.json({
               success: true,
               message: "Course unlocked/assigned for user successfully"
          });
     } catch (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};

export const revokeCourseFromUser = async (req) => {
     try {
          const connectDB = (await import("../config/db.js")).default;
          const User = (await import("../models/Auth.js")).default;
          const Courses = (await import("../models/Courses.js")).default;
          await connectDB();

          const { userId, courseId } = await req.json();

          const targetIdInput = (typeof courseId === 'object' ? (courseId?._id || courseId?.slug) : courseId) || "";

          if (!userId || !targetIdInput) {
               return NextResponse.json({ error: "Please provide userId and courseId" }, { status: 400 });
          }

          const user = await User.findById(userId);
          if (!user) {
               return NextResponse.json({ error: "User not found" }, { status: 404 });
          }

          const coursesDoc = await Courses.findOne().lean();
          const allCourses = coursesDoc?.course || [];
          const targetCourse = allCourses.find(c => c._id?.toString() === targetIdInput.toString() || c.slug === targetIdInput.toString());
          const targetIdStr = targetCourse?._id?.toString() || targetIdInput.toString();
          const targetSlugStr = targetCourse?.slug || targetIdInput.toString();

          user.enrolledCourses = user.enrolledCourses.filter((item) => {
               const itemCId = item.courseId ? item.courseId.toString() : "";
               const itemSlug = item.courseSlug ? item.courseSlug.toString() : "";

               if (itemCId === targetIdStr || itemCId === targetIdInput.toString()) return false;
               if (targetSlugStr && (itemSlug === targetSlugStr || itemCId === targetSlugStr)) return false;

               return true;
          });

          await user.save();

          return NextResponse.json({
               success: true,
               message: "Course revoked/locked for user successfully"
          });
     } catch (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};
