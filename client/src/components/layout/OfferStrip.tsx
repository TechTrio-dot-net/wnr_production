// client/src/components/layout/OfferStrip.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";

type OfferStripData = {
  enabled: boolean;
  text: string;
  speed?: number;
  enabled2?: boolean;
  text2?: string;
  speed2?: number;
};

const FALLBACK_TEXT = "Flat 50% launch offer on select brews – Limited time only.";

async function fetchOfferStrip(): Promise<OfferStripData | null> {
  try {
    const isDevelopment = process.env.NODE_ENV === "development";

    // If no explicit external API base, use same-origin `/public/offer-strip`
    // so Next.js rewrites can proxy to the backend.
    const explicitBase = process.env.NEXT_PUBLIC_API_BASE || "";
    let url: string;
    if (!explicitBase) {
      url = "/public/offer-strip";
    } else {
      const apiBase =
        explicitBase ||
        (isDevelopment
          ? "http://localhost:5001"
          : "https://wnrbackend-production.up.railway.app");
      const baseUrl = apiBase.replace(/\/+$/, "");
      url = `${baseUrl}/public/offer-strip`;
    }

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as Partial<OfferStripData>;
    return {
      enabled: Boolean(json.enabled),
      text: typeof json.text === "string" ? json.text : "",
      speed: typeof json.speed === "number" && json.speed >= 5 && json.speed <= 60 ? json.speed : 20,
      enabled2: Boolean(json.enabled2),
      text2: typeof json.text2 === "string" ? json.text2 : "",
      speed2: typeof json.speed2 === "number" && json.speed2 >= 5 && json.speed2 <= 60 ? json.speed2 : 20,
    };
  } catch (err) {
    console.error("[OfferStrip] Failed to load offer strip:", err);
    return null;
  }
}

interface OfferStripProps {
  stripNumber?: 1 | 2; // 1 for top strip, 2 for second strip after hero
}

export default function OfferStrip({ stripNumber = 1 }: OfferStripProps) {
  const [data, setData] = useState<OfferStripData | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const isSecondStrip = stripNumber === 2;

  // First useEffect: Fetch data
  useEffect(() => {
    let active = true;
    void (async () => {
      const result = await fetchOfferStrip();
      if (!active) return;
      setData(result);
      // Debug logging for second strip
      if (stripNumber === 2) {
        console.log("[OfferStrip2] Data loaded:", result);
        console.log("[OfferStrip2] enabled2:", result?.enabled2);
        console.log("[OfferStrip2] text2:", result?.text2);
      }
    })();
    return () => {
      active = false;
    };
  }, [stripNumber]);

  // Calculate values (with safe defaults when data is null)
  const text = data
    ? (isSecondStrip 
        ? ((data.text2 || "").trim() || FALLBACK_TEXT)
        : ((data.text || "").trim() || FALLBACK_TEXT))
    : FALLBACK_TEXT;
  
  const enabled = data
    ? (isSecondStrip 
        ? (data.enabled2 === true)
        : (data.enabled === true))
    : false;
  
  const speed = data
    ? (isSecondStrip ? (data.speed2 ?? 20) : (data.speed ?? 20))
    : 20;

  // Build one sequence, then we'll render it twice for a seamless loop
  const sequence = Array.from({ length: 8 }, () => text);

  // Second useEffect: Set CSS variables (only for first strip)
  useEffect(() => {
    if (!isSecondStrip) {
      if (enabled && data) {
        // Set speed immediately
        document.documentElement.style.setProperty('--offer-strip-speed', `${speed}s`);
        
        // Use a small delay to ensure DOM is rendered for height calculation
        const timer = setTimeout(() => {
          if (stripRef.current) {
            const height = stripRef.current.offsetHeight;
            document.documentElement.style.setProperty('--offer-strip-height', `${height}px`);
          }
        }, 100);
        return () => clearTimeout(timer);
      } else {
        document.documentElement.style.setProperty('--offer-strip-height', '0px');
        document.documentElement.style.setProperty('--offer-strip-speed', '20s');
      }
    }
  }, [enabled, speed, isSecondStrip, data]);

  // Don't render if data hasn't loaded yet
  if (!data) {
    return null; // Still loading
  }

  // Don't render if disabled in admin
  if (!enabled) {
    if (stripNumber === 2) {
      console.log("[OfferStrip2] Not rendering - disabled. enabled2:", data?.enabled2);
    }
    return null; // Disabled in admin
  }
  
  // Ensure we have text to display (should always have FALLBACK_TEXT at minimum)
  if (!text || text.trim().length === 0) {
    return null; // No text available (shouldn't happen with FALLBACK_TEXT)
  }

  // Second strip should have very low z-index to stay below all menus and overlays
  const containerStyle = isSecondStrip
    ? { 
        position: 'relative' as const, 
        zIndex: 0, // Below navbar (z-50), overlays (z-51-52), and drawers (z-60-70)
      }
    : undefined;

  return (
    <div 
      ref={stripRef} 
      className="offer-strip" 
      style={containerStyle}
    >
      <div 
        className="offer-strip-inner" 
        style={{ animationDuration: `${speed}s` }}
      >
        {sequence.map((t, idx) => (
          <span key={`a-${idx}`} className="inline-block mr-8">
            {t}
          </span>
        ))}
        {sequence.map((t, idx) => (
          <span key={`b-${idx}`} className="inline-block mr-8">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}


