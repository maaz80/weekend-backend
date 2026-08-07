import multer from "multer";

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB limit for gallery videos and images

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
     if (!file) return cb(null, true);
     const mime = (file.mimetype || "").toLowerCase();
     const originalName = file.originalname || "";
     const extension = originalName.split(".").pop()?.toLowerCase() || "";

     const isAllowedMime = mime.startsWith("image/") || mime.startsWith("video/") || mime === "application/octet-stream";
     const isAllowedExt = [
          "jpg", "jpeg", "png", "webp", "gif", "svg", "heic", "heif", "avif",
          "mp4", "mov", "webm", "m4v", "avi", "3gp", "3gpp", "mkv", "ts"
     ].includes(extension);

     if (isAllowedMime || isAllowedExt) {
          return cb(null, true);
     }

     cb(new Error(`Invalid file type .${extension} (${mime}). Please upload a valid image or video.`));
};

const upload = multer({
     storage,
     fileFilter,
     limits: {
          fileSize: MAX_FILE_SIZE_BYTES,
          files: 50
     }
});

export default upload;
