"use client";

import { useEffect } from "react";
import { hasToken } from "@/lib/token";

/**
 * AuthSync Component
 * 
 * Ensures the middleware presence marker cookie is in sync with localStorage token.
 * This allows Next.js middleware to protect routes on the server side.
 * 
 * Note: This is ONLY for middleware route protection. All API auth uses Bearer tokens.
 * 
 * Must be mounted in the root layout.
 */
export default function AuthSync() {
  useEffect(() => {
    const syncAuth = () => {
      if (typeof window === "undefined") return;

      const presence = process.env.NEXT_PUBLIC_FRONT_PRESENCE_COOKIE || "tt_present";
      const isAuthenticated = hasToken();

      if (isAuthenticated) {
        // Token exists - set lightweight presence marker for middleware
        document.cookie = `${presence}=1; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax; Secure=${window.location.protocol === "https:"}`;
      } else {
        // No token - clear presence marker
        document.cookie = `${presence}=; Path=/; Max-Age=0; SameSite=Lax`;
      }
    };

    // Sync on mount
    syncAuth();

    // Sync on storage change (handles multi-tab logout)
    window.addEventListener("storage", syncAuth);

    // Sync on focus (handles coming back to tab)
    window.addEventListener("focus", syncAuth);

    // Sync on custom auth events (login/logout)
    window.addEventListener("wnr:auth:changed", syncAuth);
    window.addEventListener("wnr:logout", syncAuth);

    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("focus", syncAuth);
      window.removeEventListener("wnr:auth:changed", syncAuth);
      window.removeEventListener("wnr:logout", syncAuth);
    };
  }, []);

  return null; // This component doesn't render anything
}

