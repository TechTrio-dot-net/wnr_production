// src/middlewares/auth.ts
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { connectDB } from "../lib/db";
import type { Request, Response, NextFunction } from "express";

type DecodedJwt = { uid?: string; sub?: string; id?: string; _id?: string; role?: "admin" | "user" } | string;

declare global {
  namespace Express {
    interface Request {
      userId?: Types.ObjectId;
      userRole?: "admin" | "user";
    }
  }
}

function extractUid(decoded: DecodedJwt): string | null {
  if (typeof decoded === "string") return null;
  return decoded.uid ?? decoded.sub ?? decoded.id ?? decoded._id ?? null;
}

/** Extract token from Authorization header only */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  return null;
}

/** Use this on ADMIN routers: prefer admin cookie */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    await connectDB();
    const token = extractToken(req);
    if (!token) return res.status(401).json({ message: "No session" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedJwt;
    const uidStr = extractUid(decoded);
    if (!uidStr) return res.status(401).json({ message: "Invalid session" });

    req.userId = new Types.ObjectId(String(uidStr));
    req.userRole = typeof decoded !== "string" && decoded.role === "admin" ? "admin" : "user";
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.userRole === "admin") return next();
  return res.status(403).json({ message: "Admin only" });
}
