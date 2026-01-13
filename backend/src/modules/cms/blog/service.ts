// src/modules/cms/blog/service.ts
import { BlogModel, BlogDoc } from "./model";
import { slugify } from "../../../lib/slug";
// Prefer your path alias if configured (tsconfig "paths"):
// import { maybeUploadImage } from "@/lib/cloudinary";
import { maybeUploadImage } from "../../../lib/cloudinary";

type CreateInput = {
  title: string;
  author: string;
  excerpt: string;
  content: string;
  featuredImage?: string | null;
  tags?: string[];
  status?: "draft" | "published";
  showOnWebpage?: boolean;
};

type UpdateInput = Partial<CreateInput>;

export async function listBlogs(opts: {
  q?: string;
  status?: "draft" | "published";
  tag?: string;
  page: number;
  limit: number;
}) {
  const { q, status, tag, page, limit } = opts;
  const query: Record<string, any> = {};

  if (status) query.status = status;
  if (tag) query.tags = tag;
  if (q) query.$text = { $search: q };

  const skip = (page - 1) * limit;
  const cursor = BlogModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);

  const [items, total] = await Promise.all([cursor.exec(), BlogModel.countDocuments(query)]);

  return {
    items,
    total,
    page,
    pages: Math.ceil(total / limit),
    limit,
  };
}

export async function getBlogByIdOrSlug(idOrSlug: string): Promise<BlogDoc | null> {
  if (!idOrSlug) return null;
  
  // Try by slug first (more common for URLs)
  const bySlug = await BlogModel.findOne({ slug: idOrSlug });
  if (bySlug) return bySlug;
  
  // Fallback to MongoDB _id
  // Check if it looks like a MongoDB ObjectId (24 hex characters)
  if (/^[0-9a-fA-F]{24}$/.test(idOrSlug)) {
    const byId = await BlogModel.findById(idOrSlug);
    if (byId) return byId;
  }
  
  return null;
}

/**
 * Ensure unique slug for title.
 * Uses `found.id` (string getter) instead of `_id` to avoid TS 'unknown' issues.
 */
async function ensureUniqueSlug(base: string, existingId?: string) {
  let baseSlug = slugify(base);
  if (!baseSlug) baseSlug = "post";

  let candidate = baseSlug;
  let suffix = 1;

  // Loop until free slug is found
  // Compare via `found.id` (string) to allow keeping the same slug on self-updates.
  // No `._id.equals()` necessary.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const found = await BlogModel.findOne({ slug: candidate });
    if (!found || (existingId && found.id === existingId)) {
      return candidate;
    }
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
}

export async function createBlog(input: CreateInput) {
  // Always generate a slug from the title
  if (!input.title || input.title.trim() === "") {
    throw new Error("Title is required to generate slug");
  }
  
  const slug = await ensureUniqueSlug(input.title);
  const featuredImage = await maybeUploadImage(input.featuredImage);

  const doc = await BlogModel.create({
    ...input,
    slug, // Always set slug
    featuredImage: featuredImage ?? null,
    status: input.status ?? "draft",
    showOnWebpage: input.showOnWebpage ?? false,
    publishedAt: input.status === "published" ? new Date() : null,
  });

  // Double-check slug was saved
  if (!doc.slug || doc.slug.trim() === "") {
    doc.slug = await ensureUniqueSlug(doc.title, doc.id);
    await doc.save();
  }

  return doc;
}

export async function updateBlog(id: string, input: UpdateInput) {
  const doc = await BlogModel.findById(id);
  if (!doc) return null;

  // Always ensure slug exists and is correct
  if (input.title && input.title !== doc.title) {
    doc.slug = await ensureUniqueSlug(input.title, doc.id);
    doc.title = input.title;
  } else if (!doc.slug || doc.slug.trim() === "") {
    // If slug is missing, generate it from current title
    doc.slug = await ensureUniqueSlug(doc.title, doc.id);
  }

  if (typeof input.author === "string") doc.author = input.author;
  if (typeof input.excerpt === "string") doc.excerpt = input.excerpt;
  if (typeof input.content === "string") doc.content = input.content;
  if (Array.isArray(input.tags)) doc.tags = input.tags;

  if (typeof input.status === "string") {
    const prev = doc.status;
    doc.status = input.status;
    if (prev !== "published" && input.status === "published") {
      doc.publishedAt = new Date();
    }
    if (prev === "published" && input.status === "draft") {
      // Optional: clear publishedAt
      // doc.publishedAt = null;
    }
  }

  if (typeof input.featuredImage !== "undefined") {
    doc.featuredImage = (await maybeUploadImage(input.featuredImage)) ?? null;
  }

  if (typeof input.showOnWebpage === "boolean") {
    doc.showOnWebpage = input.showOnWebpage;
  }

  // Ensure slug always exists before saving
  if (!doc.slug || doc.slug.trim() === "") {
    doc.slug = await ensureUniqueSlug(doc.title, doc.id);
  }

  await doc.save();
  
  // Verify slug was saved
  if (!doc.slug || doc.slug.trim() === "") {
    throw new Error("Failed to generate slug for blog");
  }
  
  return doc;
}

export async function deleteBlog(id: string) {
  const res = await BlogModel.findByIdAndDelete(id);
  return Boolean(res);
}
