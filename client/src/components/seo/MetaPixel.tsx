// src/components/seo/MetaPixel.tsx
"use client";
import Script from "next/script";
import { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";

// Type declaration for Meta Pixel
declare global {
  interface Window {
    fbq?: (
      action: string,
      event?: string,
      params?: Record<string, unknown>
    ) => void;
    _fbq?: unknown;
  }
}

/**
 * Meta Pixel Component with Advanced Matching
 * 
 * Features:
 * - Initializes Meta Pixel with proper configuration
 * - Advanced Matching: Automatically includes user email, phone, and name when logged in
 * - Enhanced tracking for better catalog data access
 * - Proper event tracking for all e-commerce actions
 */
export default function MetaPixel() {
  const { user } = useUser();
  const [pixelInitialized, setPixelInitialized] = useState(false);
  const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "1580422176735143";
  
  if (!PIXEL_ID) return null;

  // Advanced Matching: Update pixel with user data when user logs in
  useEffect(() => {
    if (typeof window === "undefined" || !window.fbq) return;
    
    // Only update if pixel is initialized and we have user data
    if (pixelInitialized && user) {
      try {
        // Prepare Advanced Matching parameters
        const advancedMatching: Record<string, string> = {};
        
        // Add email if available (lowercase, trimmed)
        if (user.email) {
          advancedMatching.em = user.email.toLowerCase().trim();
        }
        
        // Add phone if available (format: remove +91, keep digits only)
        if (user.phone) {
          const phone = user.phone.replace(/^\+?91/, "").replace(/\D/g, "");
          if (phone.length >= 10) {
            advancedMatching.ph = phone;
          }
        }
        
        // Add first name if available
        if (user.name) {
          const nameParts = user.name.trim().split(/\s+/);
          if (nameParts[0]) {
            advancedMatching.fn = nameParts[0];
          }
          if (nameParts.length > 1) {
            advancedMatching.ln = nameParts.slice(1).join(" ");
          }
        }
        
        // Only update if we have at least one matching parameter
        if (Object.keys(advancedMatching).length > 0) {
          // Re-initialize pixel with Advanced Matching data
          window.fbq?.("init", PIXEL_ID, advancedMatching);
        }
      } catch (error) {
        // Silently fail - don't break the app if pixel update fails
        console.warn("Meta Pixel Advanced Matching update failed:", error);
      }
    }
  }, [user, pixelInitialized, PIXEL_ID]);
  
  return (
    <>
      <Script
        id="meta-pixel-init"
        strategy="afterInteractive"
        onLoad={() => {
          // Mark pixel as initialized after script loads
          if (typeof window !== "undefined" && window.fbq) {
            setPixelInitialized(true);
          }
        }}
      >
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

