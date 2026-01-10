"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { authHeaders, buildUrl } from "@/lib/api";

type OfferStrip = {
  enabled: boolean;
  text: string;
  speed?: number;
  enabled2?: boolean;
  text2?: string;
  speed2?: number;
};

async function fetchOfferStrip(): Promise<OfferStrip> {
  const url = buildUrl("/api/admin/offer-strip");
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to load offer strip (${res.status})`);
  }
  return (await res.json()) as OfferStrip;
}

async function saveOfferStrip(data: OfferStrip): Promise<OfferStrip> {
  const url = buildUrl("/api/admin/offer-strip");
  const res = await fetch(url, {
    method: "PUT",
    headers: authHeaders("application/json"),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to save offer strip (${res.status})`);
  }
  return (await res.json()) as OfferStrip;
}

export default function OfferStripPage() {
  const [data, setData] = useState<OfferStrip>({ enabled: false, text: "", speed: 20, enabled2: false, text2: "", speed2: 20 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const initial = await fetchOfferStrip();
        setData(initial);
      } catch (err) {
        console.error("[offer-strip] load failed", err);
        toast.error(
          err instanceof Error ? err.message : "Failed to load offer strip"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await saveOfferStrip(data);
      setData(updated);
      toast.success("Offer strip saved.");
    } catch (err) {
      console.error("[offer-strip] save failed", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to save offer strip"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Offer Strips</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control the offer strips on the website. First strip appears at the top, second strip appears after the hero section.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="space-y-6 max-w-3xl">
        {/* First Offer Strip */}
        <section className="bg-card border border-border rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Top Offer Strip</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="rounded border-border"
                    checked={data.enabled}
                    onChange={(e) =>
                      setData((prev) => ({ ...prev, enabled: e.target.checked }))
                    }
                  />
                  Show offer strip at the top
                </label>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">
                  Offer text
                </label>
                <input
                  type="text"
                  value={data.text}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, text: e.target.value }))
                  }
                  placeholder="Flat 50% off • Free shipping above ₹999 • Limited time only"
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  This text will scroll horizontally in the black strip at the very top of the website.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">
                  Animation Speed (seconds)
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={data.speed ?? 20}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, speed: Math.max(5, Math.min(60, Number(e.target.value) || 20)) }))
                  }
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  How fast the text scrolls (5-60 seconds). Lower = faster. Default: 20 seconds.
                </p>
              </div>
            </>
          )}
        </section>

        {/* Second Offer Strip */}
        <section className="bg-card border border-border rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Second Offer Strip (After Hero)</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="rounded border-border"
                    checked={data.enabled2 ?? false}
                    onChange={(e) =>
                      setData((prev) => ({ ...prev, enabled2: e.target.checked }))
                    }
                  />
                  Show second offer strip after hero section
                </label>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">
                  Offer text
                </label>
                <input
                  type="text"
                  value={data.text2 ?? ""}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, text2: e.target.value }))
                  }
                  placeholder="Free delivery on orders above ₹499 • Use code WELCOME10"
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  This text will scroll horizontally in the offer strip that appears after the hero section on the homepage.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">
                  Animation Speed (seconds)
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={data.speed2 ?? 20}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, speed2: Math.max(5, Math.min(60, Number(e.target.value) || 20)) }))
                  }
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  How fast the text scrolls (5-60 seconds). Lower = faster. Default: 20 seconds.
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}


