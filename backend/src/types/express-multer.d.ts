import "express-serve-static-core";

declare global {
  namespace Express {
    // When using upload.array("images")
    interface Request {
      files?: Express.Multer.File[];
      file?: Express.Multer.File;
    }
  }
}

export {};
