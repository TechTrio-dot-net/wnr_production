/**
 * Authenticated fetch wrapper
 * Automatically includes Authorization Bearer token from localStorage
 */

import { getAuthHeader, getToken } from "./token";

export async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  const authHeaders = getAuthHeader();

  const response = await fetch(url, {
    ...init,
    headers: {
      ...authHeaders,
      ...(init?.headers || {}),
    },
  });

  // Auto-redirect to login on 401 (Unauthorized)
  if (response.status === 401 && typeof window !== "undefined") {
    // ✅ ONLY redirect to login if we're on a PROTECTED page
    // Public pages (home, products, etc.) should NOT redirect on 401
    const protectedRoutes = ["/profile", "/account", "/checkout", "/orders", "/complete-profile", "/wishlist"];
    const isProtectedPage = protectedRoutes.some(route => 
      window.location.pathname === route || window.location.pathname.startsWith(route + "/")
    );
    
    // Don't redirect if already on login page OR if on a public page
    if (!window.location.pathname.startsWith("/login") && isProtectedPage) {
      const returnTo = window.location.pathname + window.location.search;
      window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
    }
  }

  return response;
}

/**
 * Helper to get auth headers (for backwards compatibility)
 */
export function getAuthHeaders(): Record<string, string> {
  return getAuthHeader();
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getToken();
}

