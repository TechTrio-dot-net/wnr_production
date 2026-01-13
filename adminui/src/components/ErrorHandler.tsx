"use client";

import { useEffect } from "react";
import { initializeErrorLogging } from "@/lib/errorLogger";

/**
 * Client component that initializes global error handlers
 * Must be rendered on the client side
 */
export default function ErrorHandler() {
  useEffect(() => {
    // Initialize error logging when component mounts
    initializeErrorLogging();
  }, []);

  return null; // This component doesn't render anything
}
