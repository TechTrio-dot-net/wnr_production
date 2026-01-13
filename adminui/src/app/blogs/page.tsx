"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";

/* ========================= backend base ========================= */
const PUBLIC_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");
const api = (path: string) => {
  const p = path.startsWith("/") ? path : `/${path}`;
  return PUBLIC_BASE ? `${PUBLIC_BASE}${p}` : p; // same-origin when empty
};

/* ============================== types ============================== */
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

type StatusFilter = "all" | "published" | "draft";

/* =========================== type guards =========================== */
function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function hasData<T = unknown>(x: unknown): x is { data: T } {
  return isObj(x) && "data" in x;
}

function str(x: unknown) {
  return typeof x === "string" ? x : String(x ?? "");
}

/* =========================== normalizers =========================== */
function toBlog(raw: unknown): Blog {
  const r = isObj(raw) ? raw : {};
  const id = r._id ?? r.id;
  const statusVal = str(r.status);
  const status: Blog["status"] =
    statusVal === "published" || statusVal === "draft" ? (statusVal as Blog["status"]) : "draft";

  const tagsArr = Array.isArray(r.tags) ? (r.tags as unknown[]).map(str).filter(Boolean) : [];
  const showOnWebpage = typeof r.showOnWebpage === "boolean" ? r.showOnWebpage : false;

  return {
    id: str(id ?? ""),
    title: str(r.title),
    author: str(r.author),
    content: str(r.content),
    excerpt: str(r.excerpt),
    featuredImage:
      typeof r.featuredImage === "string" && r.featuredImage ? r.featuredImage : undefined,
    tags: tagsArr,
    status,
    showOnWebpage,
    createdAt: str(r.createdAt),
    updatedAt: str(r.updatedAt),
  };
}

/* ============================== page ============================== */
export default function BlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // simple pagination (optional)
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  // confirm delete modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);

  // debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ========================== helpers ========================== */
  const buildQuery = (opts?: {
    q?: string;
    status?: "published" | "draft";
    page?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (opts?.q) qs.set("q", opts.q);
    if (opts?.status) qs.set("status", opts.status);
    if (opts?.page) qs.set("page", String(opts.page));
    if (opts?.limit) qs.set("limit", String(opts.limit));
    return qs.toString();
  };

  const fetchBlogsFromBackend = async (opts?: {
    q?: string;
    status?: "published" | "draft";
    page?: number;
    limit?: number;
  }) => {
    setLoading(true);
    try {
      const qs = buildQuery(opts);
      const url = api(`/api/blogs${qs ? `?${qs}` : ""}`);
      const headers: Record<string,string> = { Accept: "application/json" };
      try { if (typeof window !== "undefined") {
        const t = window.localStorage.getItem("wnr_admin_token"); if (t) headers["Authorization"] = `Bearer ${t}`;
      } } catch {}
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to fetch blogs (${res.status})`);
      }

      const raw: unknown = await res.json();

      // Backend may return:
      // 1) Array of blogs
      // 2) { items,total,page,pages,limit }
      // 3) { data: [...] } or { data: { items,... } }
      const unwrapped: unknown = hasData(raw) ? raw.data : raw;

      if (Array.isArray(unwrapped)) {
        const list = (unwrapped as unknown[]).map(toBlog).filter((b) => b.id);
        setBlogs(list);
        setTotal(list.length);
        setPages(1);
      } else if (isObj(unwrapped)) {
        const items = Array.isArray(unwrapped.items) ? (unwrapped.items as unknown[]) : [];
        const list = items.map(toBlog).filter((b) => b.id);
        const totalVal = Number(unwrapped.total ?? list.length ?? 0);
        const pagesVal = Number(unwrapped.pages ?? 1);
        setBlogs(list);
        setTotal(Number.isFinite(totalVal) ? totalVal : list.length);
        setPages(Number.isFinite(pagesVal) ? pagesVal : 1);
      } else {
        setBlogs([]);
        setTotal(0);
        setPages(1);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch blogs.");
      setBlogs([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  };

  const deleteBlogFromBackend = async (id: string) => {
    try {
      const headers: Record<string,string> = {};
      try { if (typeof window !== "undefined") { const t = window.localStorage.getItem("wnr_admin_token"); if (t) headers["Authorization"] = `Bearer ${t}`; } } catch {}
      const res = await fetch(api(`/api/blogs/${encodeURIComponent(id)}`), { method: "DELETE", headers });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to delete (HTTP ${res.status})`);
      }
      setBlogs((prev) => prev.filter((b) => b.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      toast.success("Blog deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete blog.");
    }
  };

  /* ===================== initial + reactive load ===================== */
  useEffect(() => {
    fetchBlogsFromBackend({ page, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const q = searchTerm.trim();
      const status = statusFilter !== "all" ? (statusFilter as "published" | "draft") : undefined;
      fetchBlogsFromBackend({ q: q || undefined, status, page, limit });
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, page, limit]);

  /* ============================ ui helpers ============================ */
  const filteredBlogs = useMemo(() => {
    // server already filters; this is a safe client fallback
    const q = searchTerm.toLowerCase();
    return blogs.filter((blog) => {
      const matchesSearch =
        !q ||
        blog.title.toLowerCase().includes(q) ||
        blog.author.toLowerCase().includes(q) ||
        blog.tags.some((tag) => tag.toLowerCase().includes(q));
      const matchesStatus = statusFilter === "all" || blog.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [blogs, searchTerm, statusFilter]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const getStatusBadge = (status: Blog["status"]) => {
    switch (status) {
      case "published":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20";
      case "draft":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20";
      default:
        return "bg-muted text-muted-foreground border border-border";
    }
  };

  const askDeleteBlog = (blogId: string) => {
    setTargetId(blogId);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!targetId) return;
    await deleteBlogFromBackend(targetId);
    setConfirmOpen(false);
    setTargetId(null);
  };

  /* =============================== render =============================== */
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-12 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Blog Management</h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const q = searchTerm.trim();
              const status =
                statusFilter !== "all" ? (statusFilter as "published" | "draft") : undefined;
              fetchBlogsFromBackend({ q: q || undefined, status, page, limit });
            }}
            className="px-4 py-2 bg-muted text-foreground border border-border hover:bg-muted/80 rounded text-sm font-medium transition"
          >
            Refresh
          </button>

          <Link
            href="/blogs/add"
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:opacity-90 transition"
          >
            Add New Blog
          </Link>
        </div>
      </div>

      {/* Blog Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card shadow rounded-lg p-6 border border-border">
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Total Blogs</h3>
          <p className="text-3xl font-bold text-foreground">{total || blogs.length}</p>
        </div>
        <div className="bg-card shadow rounded-lg p-6 border border-border">
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Published</h3>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {blogs.filter((b) => b.status === "published").length}
          </p>
        </div>
        <div className="bg-card shadow rounded-lg p-6 border border-border">
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Drafts</h3>
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
            {blogs.filter((b) => b.status === "draft").length}
          </p>
        </div>
        <div className="bg-card shadow rounded-lg p-6 border border-border">
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Authors</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {new Set(blogs.map((b) => b.author)).size}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card shadow rounded-lg p-4 border border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Search Blogs
            </label>
            <input
              type="text"
              placeholder="Search by title, author, or tags..."
              value={searchTerm}
              onChange={(e) => {
                setPage(1);
                setSearchTerm(e.target.value);
              }}
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value as StatusFilter);
              }}
              className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Blogs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBlogs.map((blog) => (
          <div
            key={blog.id || `${blog.title}-${blog.createdAt}`}
            className="bg-card shadow rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow duration-300"
          >
            {blog.featuredImage ? (
              <div className="relative w-full h-48">
                <Image
                  src={blog.featuredImage}
                  alt={blog.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority={false}
                  onError={() => {
                    // no-op: image may be bad; we just don't render it next time
                  }}
                />
              </div>
            ) : null}

            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                      blog.status
                    )}`}
                  >
                    {blog.status.toUpperCase()}
                  </span>
                  {blog.showOnWebpage && blog.status === "published" && (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                      VISIBLE
                    </span>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDate(blog.createdAt)}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2">
                {blog.title}
              </h3>

              <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                {blog.excerpt}
              </p>

              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-foreground">
                  By {blog.author}
                </span>
                {blog.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {blog.tags.slice(0, 2).map((tag, idx) => (
                      <span
                        key={`${blog.id}-tag-${idx}-${tag}`}
                        className="text-xs bg-muted text-foreground/80 border border-border px-2 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {blog.tags.length > 2 && (
                      <span
                        key={`${blog.id}-extra`}
                        className="text-xs text-muted-foreground"
                      >
                        +{blog.tags.length - 2} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {blog.id ? (
                  <Link
                    href={`/blogs/${encodeURIComponent(blog.id)}`}
                    className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-medium hover:opacity-90 transition text-center"
                  >
                    Edit
                  </Link>
                ) : (
                  <button
                    disabled
                    className="flex-1 bg-muted text-foreground/60 px-4 py-2 rounded text-sm border border-border cursor-not-allowed"
                    title="Missing id"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => blog.id && askDeleteBlog(blog.id)}
                  className="bg-red-600 dark:bg-red-500 text-white px-4 py-2 rounded text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
                  disabled={!blog.id}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 rounded border border-border bg-card hover:bg-muted disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            className="px-3 py-1 rounded border border-border bg-card hover:bg-muted disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {filteredBlogs.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-foreground mb-2">No blogs found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== "all"
              ? "Try adjusting your search criteria"
              : "Get started by creating your first blog post"}
          </p>
          <Link
            href="/blogs/add"
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:opacity-90 transition"
          >
            Create Your First Blog
          </Link>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground border border-border rounded-xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-border">
              <h4 className="text-lg font-semibold">Delete blog?</h4>
              <p className="text-sm text-muted-foreground mt-1">
                This action cannot be undone.
              </p>
            </div>
            <div className="p-5 flex flex-col sm:flex-row justify-end gap-2">
              <button
                onClick={() => {
                  setConfirmOpen(false);
                  setTargetId(null);
                }}
                className="px-4 py-2 rounded-md bg-muted text-foreground border border-border hover:bg-muted/80 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-md bg-red-600 dark:bg-red-500 text-white hover:opacity-90 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
