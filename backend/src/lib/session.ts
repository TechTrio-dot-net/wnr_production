import jwt from "jsonwebtoken";
import type { Response } from "express";

const COOKIE_NAME = process.env.COOKIE_NAME || "tt_session";
const COOKIE_SECURE = String(process.env.COOKIE_SECURE) === "true";
const COOKIE_SAMESITE = ((process.env.COOKIE_SAMESITE || "lax") as
  | "lax"
  | "strict"
  | "none");

type SessionPayload = {
  uid: string;
  role: string;
  isProfileComplete: boolean;
};

export function setSessionCookie(res: Response, payload: SessionPayload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "30d" });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,      // true in prod
    sameSite: COOKIE_SAMESITE,  // "none" for cross-site
    // domain: undefined
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAMESITE,
    // domain: undefined
    path: "/",
  });
}
