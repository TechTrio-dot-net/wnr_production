// app/settings/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { authHeaders, buildUrl } from "@/lib/api";

/* ================== API helper & types ================== */

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = buildUrl(path);
  const isGet = !init?.method || init.method.toUpperCase() === "GET";

  const baseHeaders: Record<string, string> = isGet ? authHeaders() : authHeaders("application/json");
  const mergedHeaders: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
    ...baseHeaders,
  };

  const res = await fetch(url, {
    headers: mergedHeaders,
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  // 204 no content
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

type Gateway = "" | "razorpay" | "stripe" | "custom";

type Settings = {
  currency: string;
  currencySymbol: string;
  taxRate: number;
  freeDelivery?: boolean; // If true, shipping charges are 0
  // NOTE: categories in Settings are no longer used for persistence;
  // the UI below uses API-backed `categories` state.
  categories: string[];
  company: {
    name: string;
    gstin: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone: string;
    email: string;
    website: string;
    invoiceNotes: string;
  };
  payments: {
    gateway: Gateway;
    razorpay: { keyId: string; keySecret: string; webhookSecret: string };
    stripe: { publishableKey: string; secretKey: string; webhookSecret: string };
    custom: { merchantId: string; secret: string; publicKey: string };
  };
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
  };
  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    uploadPreset: string;
    folder: string;
  };
};

type Category = {
  _id: string; // If your API uses "id" instead of "_id", change here and in handlers.
  name: string;
  order?: number;
};

/* ================== Constants & storage helpers ================== */

const STORAGE_KEY = "admin.settings.v2";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
  CAD: "C$",
  JPY: "¥",
};

const DEFAULT_SETTINGS: Settings = {
  currency: "INR",
  currencySymbol: "₹",
  taxRate: 18,
  freeDelivery: false,
  categories: ["Beverages", "Snacks", "Groceries"],
  company: {
    name: "",
    gstin: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    country: "India",
    phone: "",
    email: "",
    website: "",
    invoiceNotes: "",
  },
  payments: {
    gateway: "",
    razorpay: { keyId: "", keySecret: "", webhookSecret: "" },
    stripe: { publishableKey: "", secretKey: "", webhookSecret: "" },
    custom: { merchantId: "", secret: "", publicKey: "" },
  },
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: "",
  },
  cloudinary: {
    cloudName: "",
    apiKey: "",
    apiSecret: "",
    uploadPreset: "",
    folder: "",
  },
};

function load(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      company: { ...DEFAULT_SETTINGS.company, ...(parsed.company ?? {}) },
      payments: {
        ...DEFAULT_SETTINGS.payments,
        ...(parsed.payments ?? {}),
        razorpay: { ...DEFAULT_SETTINGS.payments.razorpay, ...(parsed.payments?.razorpay ?? {}) },
        stripe: { ...DEFAULT_SETTINGS.payments.stripe, ...(parsed.payments?.stripe ?? {}) },
        custom: { ...DEFAULT_SETTINGS.payments.custom, ...(parsed.payments?.custom ?? {}) },
      },
      firebase: { ...DEFAULT_SETTINGS.firebase, ...(parsed.firebase ?? {}) },
      cloudinary: { ...DEFAULT_SETTINGS.cloudinary, ...(parsed.cloudinary ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
function save(s: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

const gstinRegex = /^[0-9]{2}[A-Z0-9]{10}[A-Z0-9]{3}$/i;

/* ================== Page ================== */

export default function SettingsPage() {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);

  // --- API-backed categories state ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState<boolean>(false);
  const [newCat, setNewCat] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");

  const [loadingSettings, setLoadingSettings] = useState<boolean>(true);

  // Load settings from backend API
  useEffect(() => {
    (async () => {
      try {
        setLoadingSettings(true);
        const data = await api<Settings>("api/settings");
        setS(data);
        // Also save to localStorage as backup
        save(data);
      } catch (e: unknown) {
        // Fallback to localStorage if API fails
        console.warn("Failed to load settings from API, using localStorage:", e);
        setS(load());
      } finally {
        setLoadingSettings(false);
      }
    })();
  }, []);

  // Load categories from API
  useEffect(() => {
    (async () => {
      try {
        setLoadingCats(true);
        const data = await api<Category[]>("api/categories");
        setCategories(data);
      } catch (e: unknown) {
        toast.error(`Failed to load categories: ${(e as Error).message}`);
      } finally {
        setLoadingCats(false);
      }
    })();
  }, []);

  // currency preview
  const pricePreview = useMemo(() => {
    const base = 2450;
    const gross = base * (1 + (s.taxRate || 0) / 100);
    const fmt = (n: number) => n.toLocaleString("en-IN");
    return `${s.currencySymbol}${fmt(base)} → with ${s.taxRate}% tax = ${s.currencySymbol}${fmt(gross)}`;
  }, [s.currencySymbol, s.taxRate]);

  /* -------- General handlers -------- */
  const saveGeneral = async () => {
    try {
      const updated = await api<Settings>("api/settings", {
        method: "PATCH",
        body: JSON.stringify({
          currency: s.currency,
          currencySymbol: s.currencySymbol,
          taxRate: s.taxRate,
          freeDelivery: s.freeDelivery ?? false,
        }),
      });
      setS(updated);
      save(updated);
      toast.success("General settings saved.");
    } catch (e: unknown) {
      toast.error(`Failed to save: ${(e as Error).message}`);
    }
  };

  const setCurrency = (code: string) => {
    const symbol = CURRENCY_SYMBOLS[code] ?? s.currencySymbol;
    const next = { ...s, currency: code, currencySymbol: symbol };
    setS(next);
    save(next); // Local backup
  };
  const setSymbol = (sym: string) => {
    const next = { ...s, currencySymbol: sym || (CURRENCY_SYMBOLS[s.currency] ?? "₹") };
    setS(next);
    save(next); // Local backup
  };
  const setTax = (n: number) => {
    const safe = Math.max(0, Math.min(100, isNaN(n) ? 0 : n));
    const next = { ...s, taxRate: safe };
    setS(next);
    save(next); // Local backup
  };
  const setFreeDelivery = (enabled: boolean) => {
    const next = { ...s, freeDelivery: enabled };
    setS(next);
    save(next); // Local backup
  };

  /* -------- Company save & validate GSTIN -------- */
  const saveCompany = async () => {
    const gst = s.company.gstin?.trim().toUpperCase();
    if (gst && !gstinRegex.test(gst)) {
      return toast.warning("GSTIN looks invalid. Please double-check.");
    }
    const next = { ...s, company: { ...s.company, gstin: gst ?? "" } };
    setS(next);
    save(next); // Local backup
    
    try {
      const updated = await api<Settings>("api/settings", {
        method: "PATCH",
        body: JSON.stringify({ company: next.company }),
      });
      setS(updated);
      save(updated);
      toast.success("Company details saved.");
    } catch (e: unknown) {
      toast.error(`Failed to save: ${(e as Error).message}`);
    }
  };

  /* -------- Payments (encrypted in backend) -------- */
  const savePayments = async () => {
    save(s); // Local backup
    
    try {
      const updated = await api<Settings>("api/settings", {
        method: "PATCH",
        body: JSON.stringify({ payments: s.payments }),
      });
      setS(updated);
      save(updated);
      toast.success("Payment gateway credentials saved (encrypted in database).");
    } catch (e: unknown) {
      toast.error(`Failed to save: ${(e as Error).message}`);
    }
  };

  /* -------- Categories CRUD (API) -------- */

  const beginEdit = (i: number) => {
    setEditIdx(i);
    setEditVal(categories[i]?.name ?? "");
  };

  const addCat = async () => {
    const name = newCat.trim();
    if (!name) return toast.error("Category name cannot be empty.");
    if (categories.find((c) => c.name.toLowerCase() === name.toLowerCase()))
      return toast.warning("Category already exists.");

    try {
      // POST /api/categories { name }
      const created = await api<Category>("api/categories", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setCategories((prev) => [...prev, created]);
      setNewCat("");
      toast.success("Category added.");
    } catch (e: unknown) {
      toast.error(`Add failed: ${(e as Error).message}`);
    }
  };

  const saveEdit = async (i: number) => {
    const cat = categories[i];
    if (!cat) return;
    const name = editVal.trim();
    if (!name) return toast.error("Category cannot be empty.");
    if (categories.some((c, idx) => idx !== i && c.name.toLowerCase() === name.toLowerCase()))
      return toast.warning("Another category already has this name.");

    const original = categories;
    const next = [...categories];
    next[i] = { ...cat, name };
    setCategories(next); // optimistic

    try {
      await api<Category>(`api/categories/${cat._id}`, {
        method: "PUT",
        body: JSON.stringify({ name }),
      });
      toast.success("Category updated.");
    } catch (e: unknown) {
      setCategories(original);
      toast.error(`Update failed: ${(e as Error).message}`);
      return;
    }

    setEditIdx(null);
    setEditVal("");
  };

  const delCat = async (i: number) => {
    const cat = categories[i];
    if (!cat) return;
    const original = categories;
    setCategories((prev) => prev.filter((_, idx) => idx !== i)); // optimistic

    try {
      await api<void>(`api/categories/${cat._id}`, { method: "DELETE" }); // ✅ void instead of {}
      toast.success("Category removed.");
    } catch (e: unknown) {
      setCategories(original);
      toast.error(`Delete failed: ${(e as Error).message}`);
    }
  };

  async function persistOrder(next: Category[]) {
    // Bulk order endpoint recommended:
    await api<void>("api/categories/order", {
      method: "PUT",
      body: JSON.stringify({ ids: next.map((c) => c._id) }),
    }); // ✅ void instead of {}
  }

  const moveCat = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= categories.length) return;

    const next = [...categories];
    [next[i], next[j]] = [next[j], next[i]];
    // Update order fields to match new positions
    next.forEach((cat, idx) => {
      cat.order = idx;
    });
    setCategories(next); // optimistic

    try {
      await persistOrder(next);
      toast.success("Category order updated.");
    } catch (e: unknown) {
      const rolled = [...next];
      [rolled[i], rolled[j]] = [rolled[j], rolled[i]];
      rolled.forEach((cat, idx) => {
        cat.order = idx;
      });
      setCategories(rolled);
      toast.error(`Reorder failed: ${(e as Error).message}`);
    }
  };

  /* ================== JSX ================== */

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      {loadingSettings && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      )}

      {/* General */}
      <section className="bg-card border border-border rounded-xl shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">General</h2>
          <button
            onClick={saveGeneral}
            className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90"
            type="button"
          >
            Save
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Currency</label>
            <select
              value={s.currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.keys(CURRENCY_SYMBOLS).map((c) => (
                <option key={c} value={c}>
                  {c} ({CURRENCY_SYMBOLS[c]})
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">Default: INR (₹)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Currency Symbol</label>
            <input
              type="text"
              value={s.currencySymbol}
              onChange={(e) => setSymbol(e.target.value)}
              maxLength={3}
              placeholder="₹"
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Tax Rate (%)</label>
            <input
              type="number"
              value={s.taxRate}
              onChange={(e) => setTax(Number(e.target.value))}
              min={0}
              max={100}
              step={0.1}
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">Preview: {pricePreview}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Free Delivery</label>
              <p className="text-xs text-muted-foreground">
                When enabled, all orders will have free shipping (shipping charges will be ₹0)
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={s.freeDelivery ?? false}
                onChange={(e) => setFreeDelivery(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>

      </section>

      {/* Company / Billing */}
      <section className="bg-card border border-border rounded-xl shadow-sm p-5 space-y-4">
        <h2 className="text-lg font-semibold">Company / Billing</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* left */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Company Name</label>
              <input
                value={s.company.name}
                onChange={(e) => setS({ ...s, company: { ...s.company, name: e.target.value } })}
                placeholder="Acme Retail Pvt. Ltd."
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">GSTIN</label>
              <input
                value={s.company.gstin}
                onChange={(e) => setS({ ...s, company: { ...s.company, gstin: e.target.value.toUpperCase() } })}
                placeholder="22AAAAA0000A1Z5"
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary uppercase"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Phone</label>
              <input
                value={s.company.phone}
                onChange={(e) => setS({ ...s, company: { ...s.company, phone: e.target.value } })}
                placeholder="+91 98xxxxxx90"
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
                <input
                  value={s.company.email}
                  onChange={(e) => setS({ ...s, company: { ...s.company, email: e.target.value } })}
                  placeholder="billing@company.com"
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Website</label>
                <input
                  value={s.company.website}
                  onChange={(e) => setS({ ...s, company: { ...s.company, website: e.target.value } })}
                  placeholder="https://company.com"
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* right */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Address Line 1</label>
              <input
                value={s.company.address1}
                onChange={(e) => setS({ ...s, company: { ...s.company, address1: e.target.value } })}
                placeholder="Street address, building"
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Address Line 2</label>
              <input
                value={s.company.address2}
                onChange={(e) => setS({ ...s, company: { ...s.company, address2: e.target.value } })}
                placeholder="Area, landmark"
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                value={s.company.city}
                onChange={(e) => setS({ ...s, company: { ...s.company, city: e.target.value } })}
                placeholder="City"
                className="px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                value={s.company.state}
                onChange={(e) => setS({ ...s, company: { ...s.company, state: e.target.value } })}
                placeholder="State"
                className="px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                value={s.company.zip}
                onChange={(e) => setS({ ...s, company: { ...s.company, zip: e.target.value } })}
                placeholder="PIN"
                className="px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <input
              value={s.company.country}
              onChange={(e) => setS({ ...s, company: { ...s.company, country: e.target.value } })}
              placeholder="Country"
              className="px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Invoice Notes</label>
              <textarea
                rows={3}
                value={s.company.invoiceNotes}
                onChange={(e) => setS({ ...s, company: { ...s.company, invoiceNotes: e.target.value } })}
                placeholder="Thank you for your purchase!"
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
        <div>
          <button
            onClick={saveCompany}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90"
            type="button"
          >
            Save Company
          </button>
        </div>
      </section>

      {/* Categories (API-backed) */}
      <section className="bg-card border border-border rounded-xl shadow-sm p-5">
        <h2 className="text-lg font-semibold mb-4">Categories</h2>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="New category name"
            className="flex-1 px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={addCat}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90"
            type="button"
          >
            Add
          </button>
        </div>

        {loadingCats ? (
          <p className="text-sm text-muted-foreground">Loading categories…</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {categories.map((c, i) => (
              <li key={c._id ?? `${c.name}-${i}`} className="flex items-center gap-3 p-3 bg-card">
                {editIdx === i ? (
                  <>
                    <input
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value)}
                      className="flex-1 px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={() => saveEdit(i)}
                      className="px-3 py-2 text-sm rounded-md bg-emerald-600 text-white hover:opacity-90"
                      type="button"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditIdx(null);
                        setEditVal("");
                      }}
                      className="px-3 py-2 text-sm rounded-md bg-muted border border-border hover:bg-muted/80"
                      type="button"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1">{c.name}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => moveCat(i, -1)}
                        className="px-2 py-1 text-xs rounded-md bg-muted border border-border hover:bg-muted/80"
                        type="button"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveCat(i, 1)}
                        className="px-2 py-1 text-xs rounded-md bg-muted border border-border hover:bg-muted/80"
                        type="button"
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => beginEdit(i)}
                        className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90"
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => delCat(i)}
                        className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:opacity-90"
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          These categories are saved on the server (via your Node API), not localStorage.
        </p>
      </section>

      {/* Payment Gateway */}
      <section className="bg-card border border-border rounded-xl shadow-sm p-5 space-y-4">
        <h2 className="text-lg font-semibold">Payment Gateway</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Provider</label>
            <select
              value={s.payments.gateway}
              onChange={(e) => setS({ ...s, payments: { ...s.payments, gateway: e.target.value as Gateway } })}
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select</option>
              <option value="razorpay">Razorpay</option>
              <option value="stripe">Stripe</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Razorpay */}
          {s.payments.gateway === "razorpay" && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <h3 className="text-sm font-semibold">Razorpay Credentials</h3>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Key ID</label>
                <input
                  type="text"
                  value={s.payments.razorpay.keyId}
                  onChange={(e) => setS({ ...s, payments: { ...s.payments, razorpay: { ...s.payments.razorpay, keyId: e.target.value } } })}
                  placeholder="rzp_test_..."
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Key Secret</label>
                <input
                  type="password"
                  value={s.payments.razorpay.keySecret}
                  onChange={(e) => setS({ ...s, payments: { ...s.payments, razorpay: { ...s.payments.razorpay, keySecret: e.target.value } } })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Webhook Secret</label>
                <input
                  type="password"
                  value={s.payments.razorpay.webhookSecret}
                  onChange={(e) => setS({ ...s, payments: { ...s.payments, razorpay: { ...s.payments.razorpay, webhookSecret: e.target.value } } })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* Stripe */}
          {s.payments.gateway === "stripe" && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <h3 className="text-sm font-semibold">Stripe Credentials</h3>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Publishable Key</label>
                <input
                  type="text"
                  value={s.payments.stripe.publishableKey}
                  onChange={(e) => setS({ ...s, payments: { ...s.payments, stripe: { ...s.payments.stripe, publishableKey: e.target.value } } })}
                  placeholder="pk_test_..."
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Secret Key</label>
                <input
                  type="password"
                  value={s.payments.stripe.secretKey}
                  onChange={(e) => setS({ ...s, payments: { ...s.payments, stripe: { ...s.payments.stripe, secretKey: e.target.value } } })}
                  placeholder="sk_test_..."
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Webhook Secret</label>
                <input
                  type="password"
                  value={s.payments.stripe.webhookSecret}
                  onChange={(e) => setS({ ...s, payments: { ...s.payments, stripe: { ...s.payments.stripe, webhookSecret: e.target.value } } })}
                  placeholder="whsec_..."
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* Custom */}
          {s.payments.gateway === "custom" && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <h3 className="text-sm font-semibold">Custom Gateway Credentials</h3>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Merchant ID</label>
                <input
                  type="text"
                  value={s.payments.custom.merchantId}
                  onChange={(e) => setS({ ...s, payments: { ...s.payments, custom: { ...s.payments.custom, merchantId: e.target.value } } })}
                  placeholder="Merchant ID"
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Secret</label>
                <input
                  type="password"
                  value={s.payments.custom.secret}
                  onChange={(e) => setS({ ...s, payments: { ...s.payments, custom: { ...s.payments.custom, secret: e.target.value } } })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Public Key</label>
                <input
                  type="text"
                  value={s.payments.custom.publicKey}
                  onChange={(e) => setS({ ...s, payments: { ...s.payments, custom: { ...s.payments.custom, publicKey: e.target.value } } })}
                  placeholder="Public Key"
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}
        </div>
        <button
          onClick={savePayments}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90"
          type="button"
        >
          Save Payment Credentials
        </button>
        <p className="text-xs text-muted-foreground mt-2">
          🔒 Credentials are encrypted and stored securely in the database. Existing code continues to use environment variables.
        </p>
      </section>

      {/* Firebase */}
      <section className="bg-card border border-border rounded-xl shadow-sm p-5 space-y-4">
        <h2 className="text-lg font-semibold">Firebase Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">API Key</label>
            <input
              type="password"
              value={s.firebase.apiKey}
              onChange={(e) => setS({ ...s, firebase: { ...s.firebase, apiKey: e.target.value } })}
              placeholder="AIza..."
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Auth Domain</label>
            <input
              type="text"
              value={s.firebase.authDomain}
              onChange={(e) => setS({ ...s, firebase: { ...s.firebase, authDomain: e.target.value } })}
              placeholder="project.firebaseapp.com"
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Project ID</label>
            <input
              type="text"
              value={s.firebase.projectId}
              onChange={(e) => setS({ ...s, firebase: { ...s.firebase, projectId: e.target.value } })}
              placeholder="my-project"
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Storage Bucket</label>
            <input
              type="text"
              value={s.firebase.storageBucket}
              onChange={(e) => setS({ ...s, firebase: { ...s.firebase, storageBucket: e.target.value } })}
              placeholder="project.appspot.com"
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Messaging Sender ID</label>
            <input
              type="text"
              value={s.firebase.messagingSenderId}
              onChange={(e) => setS({ ...s, firebase: { ...s.firebase, messagingSenderId: e.target.value } })}
              placeholder="123456789"
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">App ID</label>
            <input
              type="text"
              value={s.firebase.appId}
              onChange={(e) => setS({ ...s, firebase: { ...s.firebase, appId: e.target.value } })}
              placeholder="1:123456789:web:abc123"
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Measurement ID</label>
            <input
              type="text"
              value={s.firebase.measurementId}
              onChange={(e) => setS({ ...s, firebase: { ...s.firebase, measurementId: e.target.value } })}
              placeholder="G-XXXXXXXXXX"
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <button
          onClick={async () => {
            try {
              const updated = await api<Settings>("api/settings", {
                method: "PATCH",
                body: JSON.stringify({ firebase: s.firebase }),
              });
              setS(updated);
              save(updated);
              toast.success("Firebase configuration saved (encrypted in database).");
            } catch (e: unknown) {
              toast.error(`Failed to save: ${(e as Error).message}`);
            }
          }}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90"
          type="button"
        >
          Save Firebase Configuration
        </button>
        <p className="text-xs text-muted-foreground mt-2">
          🔒 API Key is encrypted and stored securely. Existing code continues to use environment variables.
        </p>
      </section>

      {/* Cloudinary */}
      <section className="bg-card border border-border rounded-xl shadow-sm p-5 space-y-4">
        <h2 className="text-lg font-semibold">Cloudinary Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Cloud Name</label>
            <input
              type="text"
              value={s.cloudinary.cloudName}
              onChange={(e) => setS({ ...s, cloudinary: { ...s.cloudinary, cloudName: e.target.value } })}
              placeholder="my-cloud"
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">API Key</label>
            <input
              type="password"
              value={s.cloudinary.apiKey}
              onChange={(e) => setS({ ...s, cloudinary: { ...s.cloudinary, apiKey: e.target.value } })}
              placeholder="123456789"
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">API Secret</label>
            <input
              type="password"
              value={s.cloudinary.apiSecret}
              onChange={(e) => setS({ ...s, cloudinary: { ...s.cloudinary, apiSecret: e.target.value } })}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Upload Preset</label>
            <input
              type="text"
              value={s.cloudinary.uploadPreset}
              onChange={(e) => setS({ ...s, cloudinary: { ...s.cloudinary, uploadPreset: e.target.value } })}
              placeholder="my-preset"
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Folder</label>
            <input
              type="text"
              value={s.cloudinary.folder}
              onChange={(e) => setS({ ...s, cloudinary: { ...s.cloudinary, folder: e.target.value } })}
              placeholder="uploads"
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <button
          onClick={async () => {
            try {
              const updated = await api<Settings>("api/settings", {
                method: "PATCH",
                body: JSON.stringify({ cloudinary: s.cloudinary }),
              });
              setS(updated);
              save(updated);
              toast.success("Cloudinary configuration saved (encrypted in database).");
            } catch (e: unknown) {
              toast.error(`Failed to save: ${(e as Error).message}`);
            }
          }}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90"
          type="button"
        >
          Save Cloudinary Configuration
        </button>
        <p className="text-xs text-muted-foreground mt-2">
          🔒 API Key and Secret are encrypted and stored securely. Existing code continues to use environment variables.
        </p>
      </section>
    </div>
  );
}
