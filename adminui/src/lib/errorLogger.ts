// Global Error Logger for Client-Side Errors
// Captures all errors in the admin UI and logs them to the database

import { logger } from "./logger";

let isInitialized = false;

/**
 * Initialize global error handlers
 * Call this once when the app starts
 */
export function initializeErrorLogging() {
  if (isInitialized) return;
  isInitialized = true;

  // Capture unhandled JavaScript errors
  window.addEventListener("error", (event) => {
    const error = event.error || new Error(event.message);
    logger.error("client_error", `Unhandled Error: ${event.message}`, {
      metadata: {
        error: error.toString(),
        stack: error.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        errorName: error.name,
        url: window.location.href,
      },
    });
  });

  // Capture unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    logger.error("client_error", `Unhandled Promise Rejection: ${error.message}`, {
      metadata: {
        error: error.toString(),
        stack: error.stack,
        errorName: error.name,
        reason: String(event.reason),
        url: window.location.href,
      },
    });
  });

  // Capture console errors (override console.error)
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    // Call original console.error
    originalConsoleError.apply(console, args);

    // Extract error message
    const messages = args.map((arg) => {
      if (arg instanceof Error) {
        return arg.message;
      }
      if (typeof arg === "string") {
        return arg;
      }
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }).join(" ");

    // Log to database
    logger.error("client_error", `Console Error: ${messages}`, {
      metadata: {
        args: args.map((arg) => {
          if (arg instanceof Error) {
            return {
              type: "Error",
              message: arg.message,
              stack: arg.stack,
              name: arg.name,
            };
          }
          return arg;
        }),
        url: window.location.href,
      },
    });
  };

  // Capture console warnings (optional, but useful)
  const originalConsoleWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    originalConsoleWarn.apply(console, args);

    const messages = args.map((arg) => {
      if (arg instanceof Error) {
        return arg.message;
      }
      if (typeof arg === "string") {
        return arg;
      }
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }).join(" ");

    logger.warn("client_warning", `Console Warning: ${messages}`, {
      metadata: {
        args: args.map((arg) => {
          if (arg instanceof Error) {
            return {
              type: "Error",
              message: arg.message,
              stack: arg.stack,
              name: arg.name,
            };
          }
          return arg;
        }),
        url: window.location.href,
      },
    });
  };

  // Capture fetch errors
  const originalFetch = window.fetch;
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const getUrl = (): string => {
      const firstArg = args[0];
      if (typeof firstArg === "string") return firstArg;
      if (firstArg instanceof Request) return firstArg.url;
      if (firstArg instanceof URL) return firstArg.toString();
      return String(firstArg);
    };

    try {
      const response = await originalFetch(...args);
      
      // Log failed requests
      if (!response.ok) {
        const url = getUrl();
        try {
          const errorText = await response.clone().text();
          logger.error("client_error", `Fetch Error: ${response.status} ${response.statusText}`, {
            metadata: {
              url,
              status: response.status,
              statusText: response.statusText,
              errorResponse: errorText,
              method: args[1]?.method || "GET",
            },
          });
        } catch {
          // If we can't read the response, still log the error
          logger.error("client_error", `Fetch Error: ${response.status} ${response.statusText}`, {
            metadata: {
              url,
              status: response.status,
              statusText: response.statusText,
              method: args[1]?.method || "GET",
            },
          });
        }
      }
      
      return response;
    } catch (error) {
      const url = getUrl();
      const err = error instanceof Error ? error : new Error(String(error));
      
      logger.error("client_error", `Fetch Network Error: ${err.message}`, {
        metadata: {
          url,
          error: err.toString(),
          stack: err.stack,
          method: args[1]?.method || "GET",
        },
      });
      
      throw error;
    }
  };
}

/**
 * Log a custom error manually
 */
export function logError(error: Error | string, context?: Record<string, unknown>) {
  const err = typeof error === "string" ? new Error(error) : error;
  logger.error("client_error", err.message, {
    metadata: {
      error: err.toString(),
      stack: err.stack,
      errorName: err.name,
      ...context,
      url: window.location.href,
    },
  });
}

/**
 * Log a warning manually
 */
export function logWarning(message: string, context?: Record<string, unknown>) {
  logger.warn("client_warning", message, {
    metadata: {
      ...context,
      url: window.location.href,
    },
  });
}

/**
 * Wrapper for toast.error that also logs to database
 * Use this instead of toast.error directly to ensure errors are logged
 */
export function toastErrorWithLogging(message: string, error?: Error | unknown, context?: Record<string, unknown>) {
  // Import toast dynamically to avoid circular dependencies
  import("sonner").then(({ toast }) => {
    toast.error(message);
  });

  // Log the error
  if (error instanceof Error) {
    logError(error, { toastMessage: message, ...context });
  } else if (error) {
    logger.error("client_error", `Toast Error: ${message}`, {
      metadata: {
        error: String(error),
        toastMessage: message,
        ...context,
        url: window.location.href,
      },
    });
  } else {
    logger.error("client_error", `Toast Error: ${message}`, {
      metadata: {
        toastMessage: message,
        ...context,
        url: window.location.href,
      },
    });
  }
}
