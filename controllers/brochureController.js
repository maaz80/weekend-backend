import fs from "fs";
import path from "path";
import connectDB from "../config/db.js";
import Brochure from "../models/Brochure.js";
import { uploadToCloudinary } from "../config/cloudinary.js";

// GET ACTIVE BROCHURE
export const getBrochure = async (req, res) => {
     try {
          await connectDB();
          const brochure = await Brochure.findOne().sort({ updatedAt: -1 });
          return res.status(200).json({
               success: true,
               brochure: brochure || null
          });
     } catch (err) {
          console.error("Error getting brochure:", err);
          return res.status(500).json({
               success: false,
               error: err.message || "Failed to fetch brochure"
          });
     }
};

// UPLOAD / REPLACE BROCHURE
export const uploadBrochure = async (req, res) => {
     try {
          await connectDB();

          let pdfUrl = req.body?.pdfUrl || "";
          let fileName = req.body?.fileName || "Weekend-UX-Brochure.pdf";
          let fileSize = Number(req.body?.fileSize) || 0;
          let mimeType = "application/pdf";

          const file = req.file || (req.files && (Array.isArray(req.files) ? req.files[0] : Object.values(req.files)[0]));

          if (file) {
               fileName = file.originalname || fileName;
               fileSize = file.size || fileSize;
               mimeType = file.mimetype || "application/pdf";

               const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
               const safeName = `${Date.now()}-${cleanName}`;

               // 1. ALWAYS save a local static copy into backend and user public directories
               const backendUploadDir = path.join(process.cwd(), "public", "uploads", "brochures");
               if (!fs.existsSync(backendUploadDir)) {
                    fs.mkdirSync(backendUploadDir, { recursive: true });
               }
               fs.writeFileSync(path.join(backendUploadDir, safeName), file.buffer);

               // Also write to user/public if in workspace
               try {
                    const userUploadDir = path.resolve(process.cwd(), "..", "user", "public", "uploads", "brochures");
                    if (fs.existsSync(path.resolve(process.cwd(), "..", "user", "public"))) {
                         if (!fs.existsSync(userUploadDir)) {
                              fs.mkdirSync(userUploadDir, { recursive: true });
                         }
                         fs.writeFileSync(path.join(userUploadDir, safeName), file.buffer);
                    }
               } catch (copyErr) {
                    console.warn("Could not copy directly to user/public:", copyErr.message);
               }

               const localUrl = `/uploads/brochures/${safeName}`;

               // 2. Try Cloudinary upload
               let cloudinaryUrl = "";
               try {
                    cloudinaryUrl = await uploadToCloudinary(file, "weekend_ux_brochures");
                    if (cloudinaryUrl) {
                         // Test if Cloudinary allows public delivery or returns 401 (blocked PDF setting)
                         const testRes = await fetch(cloudinaryUrl, { method: "HEAD" }).catch(() => null);
                         if (testRes && testRes.status === 200) {
                              pdfUrl = cloudinaryUrl;
                         } else {
                              console.warn("Cloudinary returned non-200 for PDF (restricted by Cloudinary PDF settings). Using local static URL.");
                              pdfUrl = localUrl;
                         }
                    }
               } catch (cloudErr) {
                    console.warn("Cloudinary upload failed, using local URL:", cloudErr.message);
                    pdfUrl = localUrl;
               }

               if (!pdfUrl) {
                    pdfUrl = localUrl;
               }
          }

          if (!pdfUrl) {
               return res.status(400).json({
                    success: false,
                    error: "No PDF file or valid PDF URL provided."
               });
          }

          let brochure = await Brochure.findOne();
          if (!brochure) {
               brochure = new Brochure({
                    title: "Weekend UX Official Brochure",
                    pdfUrl,
                    fileName,
                    fileSize,
                    mimeType,
                    uploadedBy: req.user?.username || "Admin"
               });
          } else {
               brochure.pdfUrl = pdfUrl;
               brochure.fileName = fileName;
               brochure.fileSize = fileSize;
               brochure.mimeType = mimeType;
               brochure.uploadedBy = req.user?.username || "Admin";
          }

          await brochure.save();

          return res.status(200).json({
               success: true,
               message: "Brochure PDF updated successfully",
               brochure
          });
     } catch (err) {
          console.error("Error uploading brochure:", err);
          return res.status(500).json({
               success: false,
               error: err.message || "Failed to upload brochure"
          });
     }
};

// DELETE BROCHURE
export const deleteBrochure = async (req, res) => {
     try {
          await connectDB();
          await Brochure.deleteMany({});
          return res.status(200).json({
               success: true,
               message: "Brochure PDF removed successfully"
          });
     } catch (err) {
          console.error("Error deleting brochure:", err);
          return res.status(500).json({
               success: false,
               error: err.message || "Failed to delete brochure"
          });
     }
};
