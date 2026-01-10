// client/src/components/home/IngredientsStrip.tsx
"use client";

import React, { useEffect, useState } from "react";

type IngredientsStripData = {
  enabled: boolean;
  text: string;
  speed?: number;
};

const FALLBACK_TEXT = "Crafted with natural herbs • Organic ingredients • No artificial additives • Pure wellness";

async function fetchIngredientsStrip(): Promise<IngredientsStripData | null> {
  try {
    const isDevelopment = process.env.NODE_ENV === "development";

    // If no explicit external API base, use same-origin `/public/ingredients-strip`
    // so Next.js rewrites can proxy to the backend.
    const explicitBase = process.env.NEXT_PUBLIC_API_BASE || "";
    let url: string;
    if (!explicitBase) {
      url = "/public/ingredients-strip";
    } else {
      const apiBase =
        explicitBase ||
        (isDevelopment
          ? "http://localhost:5001"
          : "https://wnrbackend-production.up.railway.app");
      const baseUrl = apiBase.replace(/\/+$/, "");
      url = `${baseUrl}/public/ingredients-strip`;
    }

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as Partial<IngredientsStripData>;
    return {
      enabled: Boolean(json.enabled),
      text: typeof json.text === "string" ? json.text : "",
      speed: typeof json.speed === "number" && json.speed >= 5 && json.speed <= 60 ? json.speed : 20,
    };
  } catch (err) {
    console.error("[IngredientsStrip] Failed to load ingredients strip:", err);
    return null;
  }
}

export default function IngredientsStrip() {
  const [data, setData] = useState<IngredientsStripData | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const result = await fetchIngredientsStrip();
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

  // Set CSS variable for animation speed
  useEffect(() => {
    if (enabled) {
      document.documentElement.style.setProperty('--ingredients-strip-speed', `${speed}s`);
    } else {
      document.documentElement.style.setProperty('--ingredients-strip-speed', '20s');
    }
  }, [enabled, speed]);

  // Build one sequence, then we'll render it twice for a seamless loop
  const sequence = Array.from({ length: 8 }, () => text);

  if (!enabled) {
    return null;
  }

  return (
    <div className="ingredients-strip">
      <div className="ingredients-strip-inner">
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

