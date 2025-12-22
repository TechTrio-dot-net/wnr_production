/**
 * Token Management - Single Source of Truth
 * 
 * Handles JWT token storage and retrieval from localStorage.
 * This is the ONLY place where token operations should happen.
 */

const TOKEN_KEY = "wnr_token";

/**
 * Get the current JWT token from localStorage
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Save JWT token to localStorage with persistence guarantee
 */
export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    
    // Force sync to disk (some browsers need this)
    if ("localStorage" in window) {
      // Trigger storage event for cross-tab sync
      window.dispatchEvent(new StorageEvent("storage", {
        key: TOKEN_KEY,
        newValue: token,
        url: window.location.href,
      }));
    }
    
    console.log("[Token] Saved token to localStorage", { length: token.length });
  } catch (e) {
    console.error("[Token] Failed to save token:", e);
  }
}

/**
 * Remove JWT token from localStorage
 */
export function clearToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    
    // Trigger storage event for cross-tab sync
    window.dispatchEvent(new StorageEvent("storage", {
      key: TOKEN_KEY,
      newValue: null,
      url: window.location.href,
    }));
    
    console.log("[Token] Cleared token from localStorage");
  } catch (e) {
    console.error("[Token] Failed to clear token:", e);
  }
}

/**
 * Check if user has a valid token
 */
export function hasToken(): boolean {
  const token = getToken();
  return !!token && token.length > 0;
}

/**
 * Get Authorization header for fetch requests
 */
export function getAuthHeader(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

