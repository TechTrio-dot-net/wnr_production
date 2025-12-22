// src/lib/upload.ts
import multer from "multer";

const storage = multer.memoryStorage();

function imageFileFilter(
  _req: any,
  file: Express.Multer.File,
  cb: (error: any, acceptFile: boolean) => void
) {
  if (file.mimetype && file.mimetype.startsWith("image/")) return cb(null, true);
  cb(new Error("Only image files are allowed"), false);
}

export const uploadImages = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    files: 6,                 // 5 gallery + 1 hover (increase from 5)
    fileSize: 20 * 1024 * 1024, // 20MB per file is more typical; adjust as needed
  },
});
