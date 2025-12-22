export type BlogStatus = "draft" | "published";

export interface BlogDTO {
  title: string;
  author: string;
  excerpt: string;
  content: string;
  featuredImage?: string | null; // URL or base64 data URL
  tags?: string[];
  status?: BlogStatus;
  showOnWebpage?: boolean;
}

export interface BlogQuery {
  q?: string;
  status?: BlogStatus;
  tag?: string;
  page?: number;
  limit?: number;
}
