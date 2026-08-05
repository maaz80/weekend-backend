import multer from "multer";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const allowedMimeTypes = new Set([
     "image/jpeg",
     "image/png",
     "image/webp",
     "video/mp4",
     "video/quicktime",
     "video/webm"
]);

const allowedExtensions = new Set([
     "jpg",
     "jpeg",
     "png",
     "webp",
     "mp4",
     "mov",
     "webm"
]);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
     const extension = file.originalname.split(".").pop()?.toLowerCase();

     if (allowedMimeTypes.has(file.mimetype) && allowedExtensions.has(extension)) {
          return cb(null, true);
     }

     cb(new Error("Invalid file type. Only JPG, PNG, WEBP, MP4, MOV, and WEBM files are allowed."));
};

const upload = multer({
     storage,
     fileFilter,
     limits: {
          fileSize: MAX_FILE_SIZE_BYTES,
          files: 8
     }
});

export default upload;
