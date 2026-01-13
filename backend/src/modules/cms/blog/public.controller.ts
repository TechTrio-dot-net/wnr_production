// src/modules/cms/blog/public.controller.ts
import { Request, Response } from "express";
import { BlogModel } from "./model";

export async function getPublishedBlogPublic(
  req: Request<{ idOrSlug: string }>,
  res: Response
) {
  try {
    const { idOrSlug } = req.params;
    if (!idOrSlug) {
      return res.status(400).json({ error: "idOrSlug is required" });
    }

    console.log(`[public blogs] Looking for blog with idOrSlug: ${idOrSlug}`);

    // Try MongoDB _id first (primary lookup method)
    let blog: any = null;
    // Check if it's a valid MongoDB ObjectId (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
    console.log(`[public blogs] idOrSlug: ${idOrSlug}, isValidObjectId: ${isValidObjectId}`);
    
    if (isValidObjectId) {
      try {
        blog = await BlogModel.findOne({
          _id: idOrSlug,
          status: "published",
          $or: [
            { showOnWebpage: true },
            { showOnWebpage: { $exists: false } }, // Handle blogs created before showOnWebpage field was added
          ],
        })
          .lean()
          .exec();
        console.log(`[public blogs] Found by ID:`, !!blog);
      } catch (err) {
        console.error(`[public blogs] Error querying by ID:`, err);
      }
    }

    // Fallback to slug if ID not found or doesn't look like an ObjectId
    if (!blog) {
      blog = await BlogModel.findOne({
        slug: idOrSlug,
        status: "published",
        $or: [
          { showOnWebpage: true },
          { showOnWebpage: { $exists: false } },
        ],
      })
        .lean()
        .exec();
      console.log(`[public blogs] Found by slug:`, !!blog);
    }

    if (!blog) {
      console.log(`[public blogs] Blog not found for: ${idOrSlug}`);
      // Debug: check if blog exists at all
      const anyBlog = await BlogModel.findOne({ slug: idOrSlug }).lean().exec();
      if (anyBlog) {
        console.log(`[public blogs] Blog exists but doesn't match criteria:`, {
          status: anyBlog.status,
          showOnWebpage: anyBlog.showOnWebpage,
        });
      } else {
        console.log(`[public blogs] No blog found with slug: ${idOrSlug}`);
      }
      return res.status(404).json({ error: "Blog not found" });
    }

    const safe = {
      id: String(blog._id ?? blog.id ?? blog.slug),
      slug: blog.slug,
      title: blog.title,
      excerpt: blog.excerpt,
      author: blog.author,
      content: blog.content,
      featuredImage: blog.featuredImage ?? null,
      tags: Array.isArray(blog.tags) ? blog.tags : [],
      status: blog.status,
      createdAt: blog.createdAt,
      publishedAt: blog.publishedAt ?? blog.createdAt,
    };

    return res.json(safe);
  } catch (err) {
    console.error("[public blogs] get one error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function listPublishedBlogsPublic(req: Request, res: Response) {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 20)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      BlogModel.find({
        status: "published",
        $or: [
          { showOnWebpage: true },
          { showOnWebpage: { $exists: false } }, // Handle blogs created before showOnWebpage field was added
        ],
      })
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      BlogModel.countDocuments({
        status: "published",
        $or: [
          { showOnWebpage: true },
          { showOnWebpage: { $exists: false } },
        ],
      }),
    ]);

    // map to a clean public shape (no admin-only fields)
    const safe = items.map((b) => ({
      id: String(b._id ?? b.id ?? b.slug),
      slug: b.slug,
      title: b.title,
      excerpt: b.excerpt,
      author: b.author,
      content: b.content,
      featuredImage: b.featuredImage ?? null,
      tags: Array.isArray(b.tags) ? b.tags : [],
      status: b.status, // "published"
      createdAt: b.createdAt,
      publishedAt: b.publishedAt ?? b.createdAt,
    }));

    return res.json({
      items: safe,
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    });
  } catch (err) {
    console.error("[public blogs] list error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
