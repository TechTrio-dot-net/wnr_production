// Blog API utilities for client-side

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content?: string;
  image?: string;
  featuredImage?: string | null;
  date?: string;
  createdAt?: string;
  publishedAt?: string;
  tags?: string[];
  author?: string;
  href?: string;
};

export async function fetchBlogs(params?: {
  page?: number;
  limit?: number;
}): Promise<{ items: BlogPost[]; total: number; page: number; pages: number }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));

  // Determine backend URL - use localhost in development, production URL otherwise
  const isDevelopment = process.env.NODE_ENV === "development";
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 
    (isDevelopment ? "http://localhost:5001" : "https://wnrbackend-production.up.railway.app");
  const baseUrl = apiBase.replace(/\/+$/, "");
  const url = `${baseUrl}/public/blogs${qs.toString() ? `?${qs}` : ""}`;
  
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to fetch blogs: ${res.status}`);
  }

  const data = await res.json();
  return {
    items: (data.items || []).map((item: any) => ({
      id: item.id || item._id || item.slug,
      slug: item.slug || item.id,
      title: item.title,
      excerpt: item.excerpt,
      content: item.content,
      image: item.featuredImage || item.image,
      featuredImage: item.featuredImage,
      date: item.publishedAt
        ? new Date(item.publishedAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : item.date,
      createdAt: item.createdAt,
      publishedAt: item.publishedAt,
      tags: item.tags || [],
      author: item.author,
      // Use ID for URLs (not slug)
      href: `/blog/${item.id || item._id}`,
    })),
    total: data.total || 0,
    page: data.page || 1,
    pages: data.pages || 1,
  };
}

export async function fetchBlogByIdOrSlug(idOrSlug: string): Promise<BlogPost | null> {
  try {
    // Determine backend URL - use localhost in development, production URL otherwise
    const isDevelopment = process.env.NODE_ENV === "development";
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 
      (isDevelopment ? "http://localhost:5001" : "https://wnrbackend-production.up.railway.app");
    const baseUrl = apiBase.replace(/\/+$/, "");
    const url = `${baseUrl}/public/blogs/${encodeURIComponent(idOrSlug)}`;
    
    console.log(`[blog.ts] Fetching blog from: ${url}`);
    const res = await fetch(url, { cache: "no-store" });

    console.log(`[blog.ts] Response status: ${res.status}`);
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      console.error(`[blog.ts] Failed to fetch blog: ${res.status}`, errorText);
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch blog: ${res.status} - ${errorText}`);
    }

    const item = await res.json();
    return {
      id: item.id || item._id || item.slug,
      slug: item.slug || item.id,
      title: item.title,
      excerpt: item.excerpt,
      content: item.content,
      image: item.featuredImage || item.image,
      featuredImage: item.featuredImage,
      date: item.publishedAt
        ? new Date(item.publishedAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : item.date,
      createdAt: item.createdAt,
      publishedAt: item.publishedAt,
      tags: item.tags || [],
      author: item.author,
      // Use ID for URLs (not slug)
      href: `/blog/${item.id || item._id}`,
    };
  } catch (error) {
    console.error("Error fetching blog:", error);
    return null;
  }
}

