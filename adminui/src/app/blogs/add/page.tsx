"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addBlog, Blog } from "@/lib/api";

type NewBlog = Omit<Blog, "id" | "createdAt" | "updatedAt">;

export default function AddBlogPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);

  const [blog, setBlog] = useState<
    Omit<NewBlog, "featuredImage"> & { featuredImage: string | null }
  >({
    title: "",
    author: "",
    content: "",
    excerpt: "",
    featuredImage: null, // <- prefer null over "" for exactOptionalPropertyTypes
    tags: [],
    status: "draft",
    showOnWebpage: false,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG, GIF, or WebP are allowed.");
      e.target.value = "";
      return;
    }

    // Optional: ~4MB limit (adjust if you like)
    const MAX_BYTES = 4 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      toast.error("Image is too large. Max 4MB.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result !== "string" || !result.startsWith("data:")) {
        toast.error("Could not read image.");
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      setBlog((prev) => ({ ...prev, featuredImage: result }));
      toast.success("Featured image added.");
    };
    reader.onerror = () => {
      toast.error("Failed to read image.");
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    // de-dupe while preserving order
    const deduped: string[] = [];
    for (const t of tags) if (!deduped.includes(t)) deduped.push(t);

    setBlog((prev) => ({ ...prev, tags: deduped }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // tiny extra guards
    if (!blog.title.trim() || !blog.author.trim() || !blog.excerpt.trim() || !blog.content.trim()) {
      toast.error("Please fill all required fields.");
      return;
    }

    setLoading(true);
    try {
      // map local state to API shape (featuredImage can be string|null|undefined)
      const payload: NewBlog = {
        title: blog.title.trim(),
        author: blog.author.trim(),
        content: blog.content.trim(),
        excerpt: blog.excerpt.trim(),
        status: blog.status,
        tags: blog.tags,
        // if null, we simply omit in api.ts (it already omits undefined; null is allowed by backend)
        ...(blog.featuredImage ? { featuredImage: blog.featuredImage } : {}),
      };

      await addBlog(payload);
      toast.success("Blog added successfully.");
      router.push("/blogs");
    } catch (err) {
      console.error("Failed to add blog:", err);
      toast.error(err instanceof Error ? err.message : "Failed to add blog. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Add New Blog</h1>
          <button
            type="button"
            onClick={() => router.push("/blogs")}
            className="px-4 py-2 bg-muted text-foreground border border-border hover:bg-muted/80 rounded text-sm font-medium transition"
            disabled={loading}
          >
            Cancel
          </button>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-card shadow rounded-lg p-6 border border-border"
        >
          <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-6" disabled={loading}>
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Title *
              </label>
              <input
                type="text"
                required
                value={blog.title}
                onChange={(e) => setBlog({ ...blog, title: e.target.value })}
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
                required
                value={blog.author}
                onChange={(e) => setBlog({ ...blog, author: e.target.value })}
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter author name"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Status
              </label>
              <select
                value={blog.status}
                onChange={(e) =>
                  setBlog({ ...blog, status: e.target.value as "published" | "draft" })
                }
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
                  onClick={() => setBlog({ ...blog, showOnWebpage: !blog.showOnWebpage })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    blog.showOnWebpage ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      blog.showOnWebpage ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="text-sm text-foreground">
                  {blog.showOnWebpage ? "Visible on website" : "Hidden from website"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Only published blogs with this enabled will appear on the frontend
              </p>
            </div>

            {/* Tags */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Tags
              </label>
              <input
                type="text"
                value={blog.tags.join(", ")}
                onChange={handleTagsChange}
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="health, nutrition, organic (comma-separated)"
              />
              {blog.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {blog.tags.map((tag, idx) => (
                    <span
                      key={`${tag}-${idx}`}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted text-foreground/80 border border-border"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Featured Image */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Featured Image
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {blog.featuredImage && (
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground mb-2">Preview</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={blog.featuredImage}
                    alt="Featured"
                    className="w-40 h-28 object-cover rounded border border-border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      toast.error("Could not load preview image.");
                    }}
                  />
                </div>
              )}
            </div>

            {/* Excerpt */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Excerpt *
              </label>
              <textarea
                required
                value={blog.excerpt}
                onChange={(e) => setBlog({ ...blog, excerpt: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Brief summary of the blog post"
              />
            </div>

            {/* Content */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Content *
              </label>
              <textarea
                required
                value={blog.content}
                onChange={(e) => setBlog({ ...blog, content: e.target.value })}
                rows={10}
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Full blog content"
              />
            </div>
          </fieldset>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push("/blogs")}
              className="px-6 py-2 bg-muted text-foreground border border-border hover:bg-muted/80 rounded text-sm font-medium transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded text-sm font-medium transition disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Blog"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
