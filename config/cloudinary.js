import { v2 as cloudinary } from "cloudinary";

// console.log("Cloudinary API KEY:", process.env.CLOUDINARY_API_KEY);
cloudinary.config({
     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
     api_key: process.env.CLOUDINARY_API_KEY,
     api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadToCloudinary = async (file, folder = "weekend_ux_media") => {
     if (!file || typeof file === "string") return file || "";
     
     try {
          let buffer;
          let originalName = "media";
          let mimeType = "";

          if (typeof file.arrayBuffer === "function") {
               const arrayBuffer = await file.arrayBuffer();
               buffer = Buffer.from(arrayBuffer);
               originalName = file.name || file.originalname || "media";
               mimeType = file.type || file.mimetype || "";
          } else if (Buffer.isBuffer(file.buffer)) {
               buffer = file.buffer;
               originalName = file.originalname || file.name || "media";
               mimeType = file.mimetype || file.type || "";
          } else if (Buffer.isBuffer(file)) {
               buffer = file;
          } else {
               console.warn("Unrecognized file format passed to uploadToCloudinary:", file);
               return "";
          }

          const nameWithoutExtension = originalName.includes(".")
               ? originalName.substring(0, originalName.lastIndexOf("."))
               : originalName;

          const seoFriendlyName = nameWithoutExtension
               .toLowerCase()
               .replace(/[^a-z0-9]+/g, "-")
               .replace(/^-+|-+$/g, "");

          const uniqueId = `${seoFriendlyName || "media"}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

          const isVideo = folder.includes("video") || mimeType.startsWith("video/");
          const resourceType = isVideo ? "video" : "auto";

          return new Promise((resolve, reject) => {
               const uploadOptions = {
                    folder,
                    public_id: uniqueId,
                    resource_type: resourceType
               };

               cloudinary.uploader.upload_stream(
                    uploadOptions,
                    (error, result) => {
                         if (error) {
                              console.error("[Cloudinary Stream Upload Error]:", error);
                              reject(error);
                         } else {
                              resolve(result.secure_url);
                         }
                    }
               ).end(buffer);
          });
     } catch (error) {
          console.error("Cloudinary upload helper error:", error);
          throw new Error(`Cloudinary upload failed: ${error.message || error}`);
     }
};

export default cloudinary;