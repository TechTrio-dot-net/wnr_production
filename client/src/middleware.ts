// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = process.env.COOKIE_NAME || "tt_session";
const FRONT_PRESENCE = process.env.FRONT_PRESENCE_COOKIE || "tt_present"; // first-party marker cookie set by the client after login

/**
 * Protected Routes - Require Authentication
 * 
 * All other routes are PUBLIC by default (/, /products, /about, etc.)
 * Users can browse the entire site without logging in.
 * 
 * Only these routes require authentication:
 */
const PROTECTED = [
  "/profile",
  "/account", 
  "/checkout", 
  "/orders", 
  "/complete-profile",
  "/wishlist"
];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // ✅ Step 1: Check if this is a PROTECTED route that requires authentication
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  
  // ✅ Step 2: If NOT protected, allow access immediately (everything is public by default)
  if (!isProtected) {
    return NextResponse.next();
  }

  // ✅ Step 3: Route IS protected - check for authentication
  const hasSession = req.cookies.get(FRONT_PRESENCE)?.value || req.cookies.get(COOKIE_NAME)?.value;
  
  if (hasSession) {
    return NextResponse.next(); // User is authenticated, allow access
  }

  // ✅ Step 4: User is NOT authenticated but trying to access protected route
  // Redirect to login and save the intended destination
  let dest = pathname + (search || "");
  
  // Prevent infinite redirect loops
  if (dest.includes("/login")) {
    dest = "/";
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = dest === "/" ? "" : `?returnTo=${encodeURIComponent(dest)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
