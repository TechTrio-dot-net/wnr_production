import { Request, Response, NextFunction } from "express";

/**
 * Cache control middleware for API responses
 * Adds appropriate cache headers based on route type
 */
export function cacheControl(maxAge: number = 60) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method === "GET") {
      // Don't cache authenticated requests by default
      if (req.headers.authorization) {
        res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      } else {
        // Public cache for unauthenticated requests
        res.setHeader("Cache-Control", `public, max-age=${maxAge}, s-maxage=${maxAge}`);
        res.setHeader("Vary", "Accept, Accept-Encoding");
      }
    }
    next();
  };
}

/**
 * Short cache for frequently changing data (products, orders, etc.)
 */
export const shortCache = cacheControl(30); // 30 seconds

/**
 * Medium cache for semi-static data (categories, settings)
 */
export const mediumCache = cacheControl(300); // 5 minutes

/**
 * Long cache for static data (static content)
 */
export const longCache = cacheControl(3600); // 1 hour
