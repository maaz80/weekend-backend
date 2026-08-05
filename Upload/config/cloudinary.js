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
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          const originalName = file.name || "image";
          const nameWithoutExtension = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;

          const seoFriendlyName = nameWithoutExtension
               .toLowerCase()
               .replace(/[^a-z0-9]+/g, "-")
               .replace(/^-+|-+$/g, "");

          const publicId = seoFriendlyName || "image";
          
          return new Promise((resolve, reject) => {
               cloudinary.uploader.upload_stream(
                    {
                         folder,
                         public_id: publicId,
                         resource_type: "auto"
                    },
                    (error, result) => {
                         if (error) {
                              reject(error);
                         } else {
                              resolve(result.secure_url);
                         }
                    }
               ).end(buffer);
          });
     } catch (error) {
          console.error("Cloudinary upload helper error:", error);
          throw new Error("Cloudinary upload failed");
     }
};

export default cloudinary;