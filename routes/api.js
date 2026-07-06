import { Router } from "express";
import upload from "../middleware/multer.js";
import { requireAdminForWrites } from "../middleware/adminAuth.js";
import { sanitizeRequest } from "../middleware/security.js";
import { otpRateLimit } from "../middleware/otpRateLimit.js";
import { protectUser } from "../middleware/userAuth.js";

// Controllers
import * as aboutController from "../controllers/aboutController.js";
import * as adminController from "../controllers/adminController.js";
import * as authController from "../controllers/authController.js";
import * as blogController from "../controllers/blogController.js";
import * as bookingController from "../controllers/bookingController.js";
import * as contactController from "../controllers/contactController.js";
import * as coursesController from "../controllers/coursesController.js";
import * as disclaimerController from "../controllers/disclaimerController.js";
import * as faqController from "../controllers/faqController.js";
import * as footerController from "../controllers/footerController.js";
import * as homeController from "../controllers/homeController.js";
import * as locationController from "../controllers/locationController.js";
import * as navbarController from "../controllers/navbarController.js";
import * as otpController from "../controllers/otpController.js";
import * as pageSEOController from "../controllers/pageSEOController.js";
import * as policyController from "../controllers/policyController.js";
import * as testimonialController from "../controllers/testimonialController.js";

import { v2 as cloudinary } from "cloudinary";
import Courses from "../models/Courses.js";
import User from "../models/Auth.js";
import connectDB from "../config/db.js";

// Setup Cloudinary config inside routes for the signature endpoint
cloudinary.config({
     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
     api_key: process.env.CLOUDINARY_API_KEY,
     api_secret: process.env.CLOUDINARY_API_SECRET
});

class MockFormData {
  constructor(req) {
    this.fields = req.body || {};
    this.files = {};
    if (req.file) {
      this.files[req.file.fieldname] = req.file;
    }
    if (req.files) {
      if (Array.isArray(req.files)) {
        req.files.forEach(f => {
          this.files[f.fieldname] = f;
        });
      } else {
        Object.keys(req.files).forEach(fieldname => {
          this.files[fieldname] = req.files[fieldname];
        });
      }
    }
  }

  get(name) {
    if (this.files[name]) {
      const file = this.files[name];
      const f = Array.isArray(file) ? file[0] : file;
      return {
        name: f.originalname,
        arrayBuffer: async () => f.buffer,
        type: f.mimetype,
        size: f.size
      };
    }
    return this.fields[name];
  }

  keys() {
    const allKeys = new Set([
      ...Object.keys(this.fields),
      ...Object.keys(this.files)
    ]);
    return allKeys.keys();
  }
}

export const makeExpressRoute = (controllerFn) => {
  return async (req, res, next) => {
    try {
      const mockReq = {
        url: req.protocol + "://" + req.get("host") + req.originalUrl,
        method: req.method,
        headers: {
          get: (name) => req.headers[name.toLowerCase()] || null,
        },
        json: async () => req.body,
        formData: async () => new MockFormData(req),
        clone: function() {
          return this;
        }
      };

      const paramsPromise = Promise.resolve(req.params || {});

      const response = await controllerFn(mockReq, { params: paramsPromise });

      if (response && typeof response.json === "function") {
        const status = response.status || 200;
        const data = response._jsonBody !== undefined ? response._jsonBody : await response.json();
        return res.status(status).json(data);
      } else {
        return res.sendStatus(200);
      }
    } catch (err) {
      console.error("Error in wrapped controller:", err);
      res.status(500).json({ error: err.message || "Internal Server Error" });
    }
  };
};

const router = Router();

// Apply sanitization to all API requests
router.use(sanitizeRequest);

// 1. About
router.get("/about", makeExpressRoute(aboutController.getAbout));
router.put("/about", requireAdminForWrites, upload.any(), makeExpressRoute(aboutController.updateAbout));

// 2. Admin
router.post("/admin/login", makeExpressRoute(adminController.loginAdmin));

// 3. Auth
router.post("/auth/forgot-password", makeExpressRoute(authController.forgotPassword));
router.post("/auth/login", makeExpressRoute(authController.login));
router.post("/auth/logout", makeExpressRoute(authController.logout));
router.get("/auth/me", makeExpressRoute(authController.getMe));
router.post("/auth/reset-password", makeExpressRoute(authController.resetPassword));
router.post("/auth/send-otp", makeExpressRoute(authController.sendAuthOTP));
router.post("/auth/signup", makeExpressRoute(authController.signup));

// 4. Blogs
router.get("/blogs", makeExpressRoute(blogController.getBlogs));
router.post("/blogs", requireAdminForWrites, upload.any(), makeExpressRoute(blogController.createBlog));
router.put("/blogs", requireAdminForWrites, upload.any(), makeExpressRoute(blogController.updateBlogPage));
router.get("/blogs/:idOrSlug", makeExpressRoute(blogController.getBlogBySlug));
router.put("/blogs/:idOrSlug", requireAdminForWrites, upload.any(), makeExpressRoute(blogController.updateBlog));
router.delete("/blogs/:idOrSlug", requireAdminForWrites, makeExpressRoute(blogController.deleteBlog));

// 5. Contact
router.get("/contact", makeExpressRoute(contactController.getContact));
router.put("/contact", requireAdminForWrites, upload.any(), makeExpressRoute(contactController.updateContact));

// 6. Courses
router.get("/courses", makeExpressRoute(coursesController.getCourses));
router.put("/courses", requireAdminForWrites, upload.any(), makeExpressRoute(coursesController.updateCourses));
router.get("/courses/:idOrSlug", makeExpressRoute(coursesController.getCourseBySlug));

// 7. Disclaimer
router.get("/disclaimer", makeExpressRoute(disclaimerController.getDisclaimer));
router.put("/disclaimer", requireAdminForWrites, makeExpressRoute(disclaimerController.updateDisclaimer));

// 8. Footer Columns
router.get("/footer-columns", makeExpressRoute(footerController.getFooterColumns));
router.post("/footer-columns", requireAdminForWrites, makeExpressRoute(footerController.createFooterColumn));
router.get("/footer-columns/global", makeExpressRoute(footerController.getFooterGlobalSettings));
router.put("/footer-columns/global", requireAdminForWrites, makeExpressRoute(footerController.updateFooterGlobalSettings));
router.put("/footer-columns/:id", requireAdminForWrites, makeExpressRoute(footerController.updateFooterColumn));
router.delete("/footer-columns/:id", requireAdminForWrites, makeExpressRoute(footerController.deleteFooterColumn));

// 9. Home
router.get("/home", makeExpressRoute(homeController.getHome));
router.put("/home", requireAdminForWrites, upload.any(), makeExpressRoute(homeController.updateHome));

// 10. Locations & Location Items
router.get("/locations", makeExpressRoute(locationController.getLocations));
router.post("/locations", requireAdminForWrites, makeExpressRoute(locationController.createLocation));
router.get("/locations/:id", makeExpressRoute(locationController.getLocationById));
router.put("/locations/:id", requireAdminForWrites, makeExpressRoute(locationController.updateLocation));
router.delete("/locations/:id", requireAdminForWrites, makeExpressRoute(locationController.deleteLocation));

router.post("/locations/:id/items", requireAdminForWrites, upload.any(), async (req, res, next) => {
     req.params.locationId = req.params.id;
     return makeExpressRoute(locationController.addItem)(req, res, next);
});

router.get("/locations/:id/items/:itemId", async (req, res, next) => {
     req.params.locationId = req.params.id;
     return makeExpressRoute(locationController.getItem)(req, res, next);
});

router.put("/locations/:id/items/:itemId", requireAdminForWrites, upload.any(), async (req, res, next) => {
     req.params.locationId = req.params.id;
     return makeExpressRoute(locationController.updateItem)(req, res, next);
});

router.delete("/locations/:id/items/:itemId", requireAdminForWrites, async (req, res, next) => {
     req.params.locationId = req.params.id;
     return makeExpressRoute(locationController.deleteItem)(req, res, next);
});

router.get("/location-items/:idOrSlug", makeExpressRoute(locationController.getLocationItemBySlug));

// 11. Navbar
router.get("/navbar", makeExpressRoute(navbarController.getNavbar));
router.put("/navbar", requireAdminForWrites, upload.any(), makeExpressRoute(navbarController.updateNavbar));

// 12. FAQ & SEO Pages
router.get("/pages/:pageId/faq", makeExpressRoute(faqController.getFaq));
router.put("/pages/:pageId/faq", requireAdminForWrites, makeExpressRoute(faqController.updateFaq));
router.get("/pages/:pageId/seo", makeExpressRoute(pageSEOController.getPageSEO));
router.put("/pages/:pageId/seo", requireAdminForWrites, makeExpressRoute(pageSEOController.updatePageSEO));

// 13. Policy
router.get("/policy", makeExpressRoute(policyController.getPolicy));
router.put("/policy", requireAdminForWrites, makeExpressRoute(policyController.updatePolicy));

// 14. OTP
router.post("/send-otp", otpRateLimit, makeExpressRoute(otpController.sendOTP));
router.post("/submit-booking", makeExpressRoute(otpController.verifyOTPAndSubmit));

// 15. Testimonials
router.get("/testimonials", makeExpressRoute(testimonialController.getTestimonials));
router.post("/testimonials", requireAdminForWrites, upload.any(), makeExpressRoute(testimonialController.createTestimonial));
router.put("/testimonials/:id", requireAdminForWrites, upload.any(), makeExpressRoute(testimonialController.updateTestimonial));
router.delete("/testimonials/:id", requireAdminForWrites, makeExpressRoute(testimonialController.deleteTestimonial));

// 16. Cloudinary Signature
router.get("/cloudinary-signature", (req, res) => {
     try {
          const timestamp = Math.round(new Date().getTime() / 1000);
          const folder = req.query.folder || "courses/videos";
          const publicId = req.query.public_id;

          const paramsToSign = {
               timestamp,
               folder
          };
          
          if (publicId) {
               paramsToSign.public_id = publicId;
          }

          const signature = cloudinary.utils.api_sign_request(
               paramsToSign,
               process.env.CLOUDINARY_API_SECRET
          );

          res.json({
               signature,
               timestamp,
               apiKey: process.env.CLOUDINARY_API_KEY,
               cloudName: process.env.CLOUDINARY_CLOUD_NAME,
               folder,
               publicId
          });
     } catch (error) {
          console.error("Signature generation error:", error);
          res.status(500).json({ error: error.message });
     }
});

// 17. Course Enrollment & Lessons Progress
router.post("/enroll", protectUser, async (req, res) => {
     try {
          await connectDB();
          const { courseId } = req.body;
          if (!courseId) {
               return res.status(400).json({ error: "courseId is required" });
          }

          // Check if course exists
          const coursesPage = await Courses.findOne();
          if (!coursesPage) {
               return res.status(404).json({ error: "No courses page configured" });
          }

          const courseItem = coursesPage.course.find(c => c._id.toString() === courseId);
          if (!courseItem) {
               return res.status(404).json({ error: "Course not found" });
          }

          // Check if already enrolled
          const isEnrolled = req.user.enrolledCourses.some(
               c => c.courseId && c.courseId.toString() === courseId
          );

          if (isEnrolled) {
               return res.json({ success: true, message: "Already enrolled", enrolled: true });
          }

          // Add to enrollment
          req.user.enrolledCourses.push({
               courseId: courseItem._id,
               enrolledAt: new Date(),
               progress: 0,
               completedLessons: []
          });

          await req.user.save();
          res.json({ success: true, message: "Enrolled successfully", enrolled: true });
     } catch (err) {
          console.error("Enroll error:", err);
          res.status(500).json({ error: err.message });
     }
});

router.get("/enrollment/:courseId", protectUser, async (req, res) => {
     try {
          await connectDB();
          const { courseId } = req.params;

          const enrollment = req.user.enrolledCourses.find(
               c => c.courseId && c.courseId.toString() === courseId
          );

          if (!enrollment) {
               return res.json({ enrolled: false });
          }

          res.json({
               enrolled: true,
               progress: enrollment.progress,
               completedLessons: enrollment.completedLessons
          });
     } catch (err) {
          console.error("Get enrollment error:", err);
          res.status(500).json({ error: err.message });
     }
});

router.post("/complete-lesson", protectUser, async (req, res) => {
     try {
          await connectDB();
          const { courseId, sectionIndex, lessonIndex } = req.body;

          if (!courseId || sectionIndex === undefined || lessonIndex === undefined) {
               return res.status(400).json({ error: "courseId, sectionIndex, and lessonIndex are required" });
          }

          const enrollment = req.user.enrolledCourses.find(
               c => c.courseId && c.courseId.toString() === courseId
          );

          if (!enrollment) {
               return res.status(400).json({ error: "User is not enrolled in this course" });
          }

          // Find course structure
          const coursesPage = await Courses.findOne();
          if (!coursesPage) {
               return res.status(404).json({ error: "No courses page configured" });
          }

          const courseItem = coursesPage.course.find(c => c._id.toString() === courseId);
          if (!courseItem) {
               return res.status(404).json({ error: "Course not found" });
          }

          const chapter = courseItem.chapter[sectionIndex];
          if (!chapter) {
               return res.status(404).json({ error: "Chapter not found" });
          }

          const lesson = chapter.lessons[lessonIndex];
          if (!lesson) {
               return res.status(404).json({ error: "Lesson not found" });
          }

          // Add lesson ID to completedLessons if not already present
          const lessonId = lesson._id;
          const isCompleted = enrollment.completedLessons.some(id => id && id.toString() === lessonId.toString());

          if (!isCompleted) {
               enrollment.completedLessons.push(lessonId);
               
               // Calculate total lessons in course
               const totalLessons = courseItem.chapter.reduce((acc, chap) => acc + (chap.lessons ? chap.lessons.length : 0), 0);
               const completedCount = enrollment.completedLessons.length;
               
               enrollment.progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 100;
               
               await req.user.save();
          }

          res.json({
               success: true,
               progress: enrollment.progress,
               completedLessons: enrollment.completedLessons
          });
     } catch (err) {
          console.error("Complete lesson error:", err);
          res.status(500).json({ error: err.message });
     }
});

export default router;
