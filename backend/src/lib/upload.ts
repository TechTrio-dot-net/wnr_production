// src/lib/upload.ts
import multer from "multer";

const storage = multer.memoryStorage();

function imageFileFilter(
  _req: any,
  file: Express.Multer.File,
  cb: (error: any, acceptFile: boolean) => void
) {
  if (file.mimetype && (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/"))) {
    return cb(null, true);
  }
  cb(new Error("Only image and video files are allowed"), false);
}

export const uploadImages = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    files: 8,                 // 7 gallery + 1 hover
    fileSize: 50 * 1024 * 1024, // 50MB per file (videos can be larger)
  },
});
