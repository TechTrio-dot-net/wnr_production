"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { buildUrl, authHeaders } from "@/lib/api";

type IngredientsStrip = {
  enabled: boolean;
  text: string;
  speed?: number;
};

async function fetchIngredientsStrip(): Promise<IngredientsStrip> {
  const url = buildUrl("/api/admin/ingredients-strip");
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to load ingredients strip (${res.status})`);
  }
  return (await res.json()) as IngredientsStrip;
}

async function saveIngredientsStrip(data: IngredientsStrip): Promise<IngredientsStrip> {
  const url = buildUrl("/api/admin/ingredients-strip");
  const res = await fetch(url, {
    method: "PUT",
    headers: authHeaders("application/json"),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to save ingredients strip (${res.status})`);
  }
  return (await res.json()) as IngredientsStrip;
}

export default function IngredientsStripPage() {
  const [data, setData] = useState<IngredientsStrip>({ enabled: false, text: "", speed: 20 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const initial = await fetchIngredientsStrip();
        setData(initial);
      } catch (err) {
        console.error("[ingredients-strip] load failed", err);
        toast.error(
          err instanceof Error ? err.message : "Failed to load ingredients strip"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await saveIngredientsStrip(data);
      setData(updated);
      toast.success("Ingredients strip saved.");
    } catch (err) {
      console.error("[ingredients-strip] save failed", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to save ingredients strip"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ingredients Strip</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control the ingredients strip displayed below the hero section.
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

      <section className="bg-card border border-border rounded-xl shadow-sm p-5 space-y-4 max-w-3xl">
        {loading ? (
          <p className="text-sm text-muted-foreground">
            Loading...
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.enabled}
                  onChange={(e) => setData({ ...data, enabled: e.target.checked })}
                  className="rounded border-border"
                />
                <span className="text-sm font-medium">Enable Ingredients Strip</span>
              </label>
              <p className="text-xs text-muted-foreground ml-6">
                When enabled, the strip will appear below the hero section on the homepage.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Strip Text
              </label>
              <textarea
                value={data.text}
                onChange={(e) => setData({ ...data, text: e.target.value })}
                placeholder="e.g., Crafted with natural herbs • Organic ingredients • No artificial additives"
                className="w-full min-h-[100px] px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm resize-y"
              />
              <p className="text-xs text-muted-foreground">
                This text will scroll continuously in the strip. Use bullet points (•) to separate items.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Animation Speed (seconds)
              </label>
              <input
                type="number"
                min={5}
                max={60}
                value={data.speed ?? 20}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!isNaN(val) && val >= 5 && val <= 60) {
                    setData({ ...data, speed: val });
                  }
                }}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
              />
              <p className="text-xs text-muted-foreground">
                How fast the text scrolls. Lower = faster. Range: 5-60 seconds.
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

