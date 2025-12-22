// src/modules/cms/blog/controller.ts
import { Request, Response } from "express";
import {
  BlogCreateSchema,
  BlogListQuerySchema,
  BlogUpdateSchema,
} from "../../../config/schemas/blog";
import {
  createBlog,
  deleteBlog,
  getBlogByIdOrSlug,
  listBlogs,
  updateBlog,
} from "./service";

export async function list(req: Request, res: Response) {
  const parsed = BlogListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { page, limit, q, status, tag } = parsed.data;

  // With exactOptionalPropertyTypes, omit undefined keys
  const filters: {
    page: number;
    limit: number;
    q?: string;
    status?: "draft" | "published";
    tag?: string;
  } = { page, limit };

  if (typeof q === "string") filters.q = q;
  if (typeof status === "string") filters.status = status;
  if (typeof tag === "string") filters.tag = tag;

  const data = await listBlogs(filters);
  res.json(data);
}

export async function getOne(
  req: Request<{ idOrSlug: string }>,
  res: Response
) {
  const { idOrSlug } = req.params;
  if (!idOrSlug) return res.status(400).json({ error: "idOrSlug is required" });

  const doc = await getBlogByIdOrSlug(idOrSlug);
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json(doc);
}

export async function create(req: Request, res: Response) {
  const parsed = BlogCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { title, author, excerpt, content, tags, status, featuredImage, showOnWebpage } =
    parsed.data;

  // Map undefined -> omit (or null where type allows)
  const payload: {
    title: string;
    author: string;
    excerpt: string;
    content: string;
    tags?: string[];
    status?: "draft" | "published";
    featuredImage?: string | null;
    showOnWebpage?: boolean;
  } = { title, author, excerpt, content };

  if (Array.isArray(tags)) payload.tags = tags;
  if (typeof status === "string") payload.status = status;
  if (featuredImage !== undefined) payload.featuredImage = featuredImage ?? null;
  if (typeof showOnWebpage === "boolean") payload.showOnWebpage = showOnWebpage;

  const doc = await createBlog(payload);
  res.status(201).json(doc);
}

export async function update(
  req: Request<{ id: string }>,
  res: Response
) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "id is required" });

  const parsed = BlogUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const {
    title,
    author,
    excerpt,
    content,
    tags,
    status,
    featuredImage,
    showOnWebpage,
  } = parsed.data;

  // Build Partial<CreateInput> but omit any undefined fields
  const patch: Partial<{
    title: string;
    author: string;
    excerpt: string;
    content: string;
    tags: string[];
    status: "draft" | "published";
    featuredImage: string | null;
    showOnWebpage: boolean;
  }> = {};

  if (typeof title === "string") patch.title = title;
  if (typeof author === "string") patch.author = author;
  if (typeof excerpt === "string") patch.excerpt = excerpt;
  if (typeof content === "string") patch.content = content;
  if (Array.isArray(tags)) patch.tags = tags;
  if (typeof status === "string") patch.status = status;

  // Only include featuredImage if provided; map undefined → omit, null stays null
  if (featuredImage !== undefined) patch.featuredImage = featuredImage ?? null;
  if (typeof showOnWebpage === "boolean") patch.showOnWebpage = showOnWebpage;

  const doc = await updateBlog(id, patch);
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json(doc);
}

export async function remove(
  req: Request<{ id: string }>,
  res: Response
) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "id is required" });

  const ok = await deleteBlog(id);
  if (!ok) return res.status(404).json({ error: "Not found" });
  res.status(204).send();
}
