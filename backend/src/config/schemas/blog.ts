import { z } from "zod";

export const BlogStatusEnum = z.enum(["draft", "published"]);

export const BlogCreateSchema = z.object({
  title: z.string().min(2),
  author: z.string().min(2),
  excerpt: z.string().min(10),
  content: z.string().min(10),
  featuredImage: z.string().url().or(z.string().startsWith("data:")).optional().nullable(),
  tags: z.array(z.string().min(1)).optional().default([]),
  status: BlogStatusEnum.optional().default("draft"),
  showOnWebpage: z.boolean().optional().default(false),
});

export const BlogUpdateSchema = BlogCreateSchema.partial();

export const BlogListQuerySchema = z.object({
  q: z.string().optional(),
  status: BlogStatusEnum.optional(),
  tag: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(12),
});
