"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";

/* ========================= backend base helper ========================= */
const PUBLIC_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");
const api = (path: string) => {
  const p = path.startsWith("/") ? path : `/${path}`;
  return PUBLIC_BASE ? `${PUBLIC_BASE}${p}` : p; // falls back to same-origin /api/*
};

/* ================================ types ================================ */
type Blog = {
  id: string;
  title: string;
  author: string;
  content: string;
  excerpt: string;
  featuredImage?: string;
  tags: string[];
  status: "published" | "draft";
  showOnWebpage?: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Narrow an arbitrary value into a { data: T } shape when present */
function hasData<T = unknown>(obj: unknown): obj is { data: T } {
  return typeof obj === "object" && obj !== null && "data" in obj;
}

function toBlog(raw: unknown): Blog {
  const r = typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {};
  const id = (r._id ?? r.id) as string | undefined;
  const st =
    r.status === "published" || r.status === "draft"
      ? (r.status as "published" | "draft")
      : "draft";

  return {
    id: String(id ?? ""),
    title: String(r.title ?? ""),
    author: String(r.author ?? ""),
    content: String(r.content ?? ""),
    excerpt: String(r.excerpt ?? ""),
    featuredImage:
      typeof r.featuredImage === "string" && r.featuredImage ? r.featuredImage : undefined,
    tags: Array.isArray(r.tags) ? (r.tags as unknown[]).map((t) => String(t ?? "")) : [],
    status: st,
    showOnWebpage: typeof r.showOnWebpage === "boolean" ? r.showOnWebpage : undefined,
    createdAt: String(r.createdAt ?? ""),
    updatedAt: String(r.updatedAt ?? ""),
  };
}

async function httpJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers: Record<string,string> = { "Content-Type": "application/json" };
  try { if (typeof window !== "undefined") { const t = window.localStorage.getItem("wnr_admin_token"); if (t) headers["Authorization"] = `Bearer ${t}`; } } catch {}
  const res = await fetch(url, { headers, ...init });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

async function getBlogDirect(idOrSlug: string): Promise<Blog> {
  const payload = await httpJson<unknown>(
    api(`/api/blogs/${encodeURIComponent(idOrSlug)}`)
  );
  const obj = hasData<unknown>(payload) ? payload.data : payload;
  return toBlog(obj);
}

type BlogUpdatableFields = Pick<
  Blog,
  "title" | "author" | "content" | "excerpt" | "featuredImage" | "tags" | "status" | "showOnWebpage"
>;

async function updateBlogDirect(idOrSlug: string, updates: Partial<BlogUpdatableFields>): Promise<Blog> {
  const payload = await httpJson<unknown>(
    api(`/api/blogs/${encodeURIComponent(idOrSlug)}`),
    {
      method: "PUT",
      body: JSON.stringify(updates),
    }
  );
  const obj = hasData<unknown>(payload) ? payload.data : payload;
  return toBlog(obj);
}

/* ============================= component ============================== */
export default function EditBlogPage() {
  const router = useRouter();
  const params = useParams(); // Record<string, string | string[]>
  const rawParam = params?.id as string | string[] | undefined;

  const idOrSlug = useMemo(() => {
    const v = Array.isArray(rawParam) ? rawParam[0] : rawParam;
    return (v ?? "").trim();
  }, [rawParam]);

  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<BlogUpdatableFields>({
    title: "",
    author: "",
    content: "",
    excerpt: "",
    featuredImage: "",
    tags: [],
    status: "draft",
    showOnWebpage: false,
  });

  useEffect(() => {
    // Guard against invalid route like /blogs/undefined or /blogs/null
    if (!idOrSlug || idOrSlug === "undefined" || idOrSlug === "null") {
      toast.error("Invalid blog id.");
      router.push("/blogs");
      return;
    }

    let isCancelled = false;

    (async () => {
      try {
        const data = await getBlogDirect(idOrSlug);
        if (!data?.id) throw new Error("Not found");
        if (isCancelled) return;

        setBlog(data);
        setFormData({
          title: data.title,
          author: data.author,
          content: data.content,
          excerpt: data.excerpt,
          featuredImage: data.featuredImage ?? "",
          tags: data.tags,
          status: data.status,
          showOnWebpage: data.showOnWebpage ?? false,
        });
      } catch (err) {
        if (isCancelled) return;
        // Swallow common Mongoose cast messages to avoid noisy console
        const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "";
        if (/Cast to ObjectId failed/i.test(msg)) {
          toast.error("Invalid blog id.");
        } else {
          toast.error("Blog not found.");
        }
        router.push("/blogs");
      } finally {
        if (!isCancelled) setLoading(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [idOrSlug, router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tagsString = e.target.value;
    const tags = tagsString
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    setFormData((prev) => ({ ...prev, tags }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idOrSlug || idOrSlug === "undefined" || idOrSlug === "null") {
      toast.error("Invalid blog id.");
      return;
    }

    setSaving(true);
    try {
      await updateBlogDirect(idOrSlug, {
        title: formData.title,
        author: formData.author,
        content: formData.content,
        excerpt: formData.excerpt,
        featuredImage: formData.featuredImage || undefined,
        tags: formData.tags ?? [],
        status: formData.status,
        showOnWebpage: formData.showOnWebpage ?? false,
      });
      toast.success("Blog updated successfully.");
      router.push("/blogs");
    } catch {
      // Keep console clean; show toast to user
      toast.error("Failed to update blog. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="space-y-3">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="p-6">
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Blog Not Found</h1>
          <Link
            href="/blogs"
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:opacity-90 transition"
          >
            Back to Blogs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Edit Blog</h1>
        <Link
          href="/blogs"
          className="bg-muted text-foreground border border-border px-4 py-2 rounded-lg font-medium hover:bg-muted/80 transition"
        >
          Back to Blogs
        </Link>
      </div>

      {/* Form Card */}
      <div className="bg-card shadow rounded-lg p-6 border border-border">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter blog title"
              />
            </div>

            {/* Author */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Author *
              </label>
              <input
                type="text"
                name="author"
                value={formData.author}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter author name"
              />
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Excerpt *
            </label>
            <textarea
              name="excerpt"
              value={formData.excerpt}
              onChange={handleInputChange}
              required
              rows={3}
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Brief description of the blog post"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Content *
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              required
              rows={10}
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Full blog content"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Featured Image */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Featured Image URL
              </label>
              <input
                type="url"
                name="featuredImage"
                value={formData.featuredImage ?? ""}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="https://example.com/image.jpg"
              />
              {formData.featuredImage ? (
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground mb-2">Image Preview:</p>
                  <div className="relative w-full h-32">
                    <Image
                      src={formData.featuredImage}
                      alt="Featured image preview"
                      fill
                      className="object-cover rounded-md border border-border"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      onError={() => {
                        setFormData((prev) => ({ ...prev, featuredImage: "" }));
                        toast.error("Couldn’t load image preview.");
                      }}
                      priority={false}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>

            {/* Show on Webpage Toggle */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Show on Webpage
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, showOnWebpage: !formData.showOnWebpage })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.showOnWebpage ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.showOnWebpage ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="text-sm text-foreground">
                  {formData.showOnWebpage ? "Visible on website" : "Hidden from website"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Only published blogs with this enabled will appear on the frontend
              </p>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Tags
            </label>
            <input
              type="text"
              value={formData.tags.join(", ")}
              onChange={handleTagsChange}
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="health, nutrition, organic (comma-separated)"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Separate tags with commas
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link
              href="/blogs"
              className="px-6 py-2 rounded bg-muted text-foreground border border-border hover:bg-muted/80 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded bg-primary text-primary-foreground hover:opacity-90 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
