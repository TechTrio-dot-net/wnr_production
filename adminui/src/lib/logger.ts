// Admin UI Logging Service
// Sends logs to backend to be stored in database

export type LogLevel = "info" | "warn" | "error" | "success";
export type LogAction =
  | "product_create"
  | "product_update"
  | "product_delete"
  | "category_create"
  | "category_update"
  | "category_delete"
  | "order_update"
  | "order_status_change"
  | "user_create"
  | "user_update"
  | "user_delete"
  | "coupon_create"
  | "coupon_update"
  | "coupon_delete"
  | "blog_create"
  | "blog_update"
  | "blog_delete"
  | "settings_update"
  | "offer_strip_update"
  | "inventory_update"
  | "client_error"
  | "client_warning"
  | "other";

interface LogData {
  level: LogLevel;
  action: LogAction;
  message: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

function buildUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (API_BASE) return `${API_BASE}${normalized}`;
  return normalized;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  try {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("wnr_admin_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
  } catch {
    // Ignore localStorage errors
  }

  return headers;
}

/**
 * Log an action to the database
 * This is fire-and-forget - errors are silently caught to not interrupt user flow
 */
export async function logAction(data: LogData): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    const url = buildUrl("/api/admin/logs");

    // Fire and forget - don't wait for response
    fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    }).catch((err) => {
      // Silently fail - logging should never interrupt user experience
      if (process.env.NODE_ENV === "development") {
        console.warn("Failed to log action:", err);
      }
    });
  } catch (err) {
    // Silently fail
    if (process.env.NODE_ENV === "development") {
      console.warn("Failed to log action:", err);
    }
  }
}

/**
 * Helper functions for common log actions
 */
export const logger = {
  info: (action: LogAction, message: string, options?: { resourceType?: string; resourceId?: string; metadata?: Record<string, unknown> }) => {
    logAction({ level: "info", action, message, ...options });
  },

  success: (action: LogAction, message: string, options?: { resourceType?: string; resourceId?: string; metadata?: Record<string, unknown> }) => {
    logAction({ level: "success", action, message, ...options });
  },

  warn: (action: LogAction, message: string, options?: { resourceType?: string; resourceId?: string; metadata?: Record<string, unknown> }) => {
    logAction({ level: "warn", action, message, ...options });
  },

  error: (action: LogAction, message: string, options?: { resourceType?: string; resourceId?: string; metadata?: Record<string, unknown> }) => {
    logAction({ level: "error", action, message, ...options });
  },
};
