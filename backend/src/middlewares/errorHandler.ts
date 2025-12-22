import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err?.status || 500;
  const isProduction = process.env.NODE_ENV === "production";
  
  // Log error details (full stack in dev, sanitized in production)
  if (isProduction) {
    logger.error("Request error", {
      status,
      message: err?.message || "Server error",
      path: _req.path,
      method: _req.method,
    });
  } else {
    console.error("❌ Error:", err);
  }

  // Return sanitized error message in production
  const message = isProduction && status === 500
    ? "Internal server error"
    : err?.message || "Server error";

  res.status(status).json({
    message,
    ...(!isProduction && { stack: err?.stack }),
  });
}
