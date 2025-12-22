// client/src/components/layout/OfferStrip.tsx
"use client";

import React, { useEffect, useState } from "react";

type OfferStripData = {
  enabled: boolean;
  text: string;
  speed?: number;
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
    };
  } catch (err) {
    console.error("[OfferStrip] Failed to load offer strip:", err);
    return null;
  }
}

export default function OfferStrip() {
  const [data, setData] = useState<OfferStripData | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const result = await fetchOfferStrip();
      if (!active) return;
      setData(result);
    })();
    return () => {
      active = false;
    };
  }, []);

  const enabled = data?.enabled && (data.text?.trim().length ?? 0) > 0;
  const text = (data?.text || "").trim() || FALLBACK_TEXT;
  const speed = data?.speed ?? 20;

  // Build one sequence, then we'll render it twice for a seamless loop
  const sequence = Array.from({ length: 8 }, () => text);

  useEffect(() => {
    // Set CSS variables for offer strip height and speed
    if (enabled) {
      // Set speed immediately
      document.documentElement.style.setProperty('--offer-strip-speed', `${speed}s`);
      
      // Use a small delay to ensure DOM is rendered for height calculation
      const timer = setTimeout(() => {
        const strip = document.querySelector('.offer-strip') as HTMLElement;
        if (strip) {
          const height = strip.offsetHeight;
          document.documentElement.style.setProperty('--offer-strip-height', `${height}px`);
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      document.documentElement.style.setProperty('--offer-strip-height', '0px');
      document.documentElement.style.setProperty('--offer-strip-speed', '20s');
    }
  }, [enabled, speed]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="offer-strip">
      <div className="offer-strip-inner">
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


