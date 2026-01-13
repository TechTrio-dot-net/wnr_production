/**
 * User Authentication Middleware
 * 
 * Simplified, consistent middleware for user routes.
 * Checks JWT Bearer token from Authorization header OR cookie.
 * Sets req.userId for downstream handlers.
 */

import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { connectDB } from "../lib/db";
import type { Request, Response, NextFunction } from "express";

const COOKIE_NAME = process.env.COOKIE_NAME || "tt_session";

type JWTPayload = { 
  uid?: string; 
  sub?: string; 
  id?: string; 
  _id?: string;
  role?: "admin" | "user";
  [key: string]: unknown;
};

declare global {
  namespace Express {
    interface Request {
      userId?: Types.ObjectId;
      userRole?: "admin" | "user";
    }
  }
}

/**
 * Extract UID from various JWT payload formats
 */
function extractUid(decoded: JWTPayload | string): string | null {
  if (typeof decoded === "string") return null;
  return decoded.uid ?? decoded.sub ?? decoded.id ?? decoded._id ?? null;
}

/**
 * Extract JWT token from Authorization header OR cookie
 * Priority: Authorization header > Cookie
 */
function extractToken(req: Request): string | null {
  // 1. Check Authorization header (Bearer token) - PRIORITY
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  
  // 2. Fallback to cookie (for backward compatibility)
  const cookieToken = req.cookies?.[COOKIE_NAME];
  return cookieToken || null;
}

/**
 * Middleware: Require valid JWT token (from header or cookie)
 * Sets req.userId and req.userRole
 */
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  try {
    await connectDB();
    
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: "No session" });
    }

    // ✅ Verify JWT (NOT Firebase token!)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const uidStr = extractUid(decoded);
    
    if (!uidStr) {
      return res.status(401).json({ message: "Invalid session" });
    }

    // Set userId for downstream handlers
    req.userId = new Types.ObjectId(String(uidStr));
    req.userRole = decoded.role === "admin" ? "admin" : "user";
    
    next();
  } catch (err) {
    // JWT verification failed
    return res.status(401).json({ message: "Unauthorized" });
  }
}

