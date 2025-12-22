"use client";

import { Toaster } from "sonner";

/**
 * Mount Sonner's Toaster once at the app root.
 * - White/light look
 * - Top-center
 * - 3s auto-close with animated progress bar
 * - Queue toasts: show one at a time (no overlap)
 */
export default function ClientToaster() {
  return (
    <Toaster
      position="top-center"
      theme="light"      // force light theme (white)
      closeButton
      expand={false}     // compact; don't auto-expand when stacking
      richColors={false} // keep neutral white styling
      visibleToasts={1}  // queue: one visible at a time, others wait
      gap={10}
      toastOptions={{
        duration: 3000, // 3s; Sonner shows an animated progress bar automatically
        // White card styling
        style: {
          background: "#ffffff",
          color: "#111827",              // tailwind gray-900
          border: "1px solid #e5e7eb",   // tailwind gray-200
          boxShadow:
            "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
          borderRadius: "0.75rem",       // rounded-xl
          padding: "0.75rem 0.875rem",
          zIndex: 99999,
          marginTop: "0.5rem",
        },
        classNames: {
          title: "font-medium",
          description: "text-sm text-gray-600",
          closeButton: "hover:opacity-80",
          // Optional: tighten internal layout a bit (Tailwind classes if you have it)
          toast: "max-w-md",
        },
      }}
    />
  );
}
