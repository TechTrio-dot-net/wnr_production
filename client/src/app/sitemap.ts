// app/sitemap.ts
import type { MetadataRoute } from "next";
import { headers } from "next/headers";

/** Resolve site base URL from env first, else from request */
async function getBaseUrl(): Promise<string> {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");

  // In your TS setup, headers() returns a Promise<ReadonlyHeaders>
  let host = "localhost:3000";
  let proto = "http";
  try {
    const h = await headers();
    host = h.get("x-forwarded-host") || h.get("host") || host;
    proto =
      h.get("x-forwarded-proto") ||
      (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  } catch {
    // headers() may be unavailable during certain static builds; fall back to defaults/env
  }
  return `${proto}://${host}`.replace(/\/+$/, "");
}

/* ============================== Types ============================== */
type ProductLite = {
  id?: string | number;
  _id?: string | number;
  slug?: string;
  updatedAt?: string;
};
type BlogLite = {
  slug?: string;
  updatedAt?: string;
};

/* =========================== Config: Static pages ===========================
   Widen the type to string[] to avoid union-narrowing issues when comparing.
============================================================================ */
const STATIC_PATHS: string[] = [
  // Core
  "/", "/about", "/contact", "/faq",

  // Store hubs / landings
  "/products", "/collections", // ← include collections explicitly

  // Blog hubs
  "/blog",

  // Policies / legal
  "/privacy", "/terms",
  "/shipping-policy", "/returns-and-refunds", "/cancellation-policy",
  "/privacy-policy", "/terms-and-conditions",

  // Optional public pages (add if you actually have them)
  // "/offers", "/gift-cards", "/wholesale",
];

/* ========================== Fetch helpers ========================== */
async function fetchJson<T>(url: string, revalidateSec = 3600): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: revalidateSec } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function getAllProducts(base: string): Promise<ProductLite[]> {
  const baseEndpoint = `${base}/api/public/products`;

  let data = await fetchJson<any>(`${baseEndpoint}?limit=1000`);
  if (!data) return [];

  if (Array.isArray(data)) return data as ProductLite[];

  if (data && Array.isArray(data.items)) {
    const items: ProductLite[] = [...data.items];
    let nextPage: number | null | undefined = data.nextPage;
    let page = data.page ?? 1;
    const limit = data.limit ?? 100;
    const MAX_PAGES = 200;

    while (nextPage && page < MAX_PAGES) {
      page = nextPage;
      const pageData = await fetchJson<any>(`${baseEndpoint}?page=${page}&limit=${limit}`);
      if (!pageData || !Array.isArray(pageData.items) || pageData.items.length === 0) break;
      items.push(...pageData.items);
      nextPage = pageData.nextPage ?? null;
      if (pageData.items.length < limit) break;
    }
    return items;
  }

  if (data && Array.isArray(data.products)) {
    return data.products as ProductLite[];
  }

  return Array.isArray(data) ? (data as ProductLite[]) : [];
}

async function getAllPosts(base: string): Promise<BlogLite[]> {
  const baseEndpoint = `${base}/api/public/blogs`;

  let data = await fetchJson<any>(`${baseEndpoint}?limit=1000`);
  if (!data) return [];

  if (Array.isArray(data)) return data as BlogLite[];

  if (data && Array.isArray(data.items)) {
    const items: BlogLite[] = [...data.items];
    let nextPage: number | null | undefined = data.nextPage;
    let page = data.page ?? 1;
    const limit = data.limit ?? 100;
    const MAX_PAGES = 200;

    while (nextPage && page < MAX_PAGES) {
      page = nextPage;
      const pageData = await fetchJson<any>(`${baseEndpoint}?page=${page}&limit=${limit}`);
      if (!pageData || !Array.isArray(pageData.items) || pageData.items.length === 0) break;
      items.push(...pageData.items);
      nextPage = pageData.nextPage ?? null;
      if (pageData.items.length < limit) break;
    }
    return items;
  }

  if (data && Array.isArray(data.posts)) {
    return data.posts as BlogLite[];
  }

  return Array.isArray(data) ? (data as BlogLite[]) : [];
}

/* ============================ Utilities ============================ */
function toDateSafe(iso?: string): Date {
  const d = iso ? new Date(iso) : new Date();
  return isNaN(d.getTime()) ? new Date() : d;
}
function toSlugOrId(p: ProductLite): string | null {
  const raw = (p.slug ?? p.id ?? p._id ?? "").toString().trim();
  return raw || null;
}

/* ============================== Main ============================== */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = await getBaseUrl(); // ← await here
  const now = new Date();

  // Fetch dynamic
  const [products, posts] = await Promise.all([getAllProducts(site), getAllPosts(site)]);

  // De-dupe set across ALL URLs
  const seen = new Set<string>();
  const out: MetadataRoute.Sitemap = [];

  // 1) Static pages
  for (const path of STATIC_PATHS) {
    const url = `${site}${path}`;
    if (seen.has(url)) continue;
    seen.add(url);

    const isHome = path === "/";
    const isStoreHub = path === "/products" || path === "/collections";
    const isBlogHub = path === "/blog";
    const isPolicy =
      path.includes("policy") ||
      path === "/privacy" ||
      path === "/terms" ||
      path === "/terms-and-conditions" ||
      path === "/returns-and-refunds";

    out.push({
      url,
      lastModified: now,
      priority: isHome ? 1.0 : isStoreHub ? 0.8 : isBlogHub ? 0.7 : isPolicy ? 0.5 : 0.6,
      changeFrequency: isHome ? "daily" : isStoreHub || isBlogHub ? "weekly" : "monthly",
    });
  }

  // 2) Product detail pages
  for (const p of products || []) {
    const id = toSlugOrId(p);
    if (!id) continue;
    const url = `${site}/products/${encodeURIComponent(id)}`;
    if (seen.has(url)) continue;
    seen.add(url);

    out.push({
      url,
      lastModified: toDateSafe(p.updatedAt),
      priority: 0.7,
      changeFrequency: "weekly",
    });
  }

  // 3) Blog posts
  for (const b of posts || []) {
    const slug = (b.slug || "").trim();
    if (!slug) continue;
    const url = `${site}/blog/${encodeURIComponent(slug)}`;
    if (seen.has(url)) continue;
    seen.add(url);

    out.push({
      url,
      lastModified: toDateSafe(b.updatedAt),
      priority: 0.6,
      changeFrequency: "weekly",
    });
  }

  return out;
}
