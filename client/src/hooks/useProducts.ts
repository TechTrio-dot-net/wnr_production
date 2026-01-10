import { useQuery } from "@tanstack/react-query";
import { buildUrl as build } from "@/lib/api";

interface ApiProduct {
  _id: string;
  name: string;
  price: number;
  images: Array<{ url: string } | string>;
  stock?: number;
  status?: string;
  category?: { name: string };
  [key: string]: any;
}

interface ProductCard {
  id: string;
  name: string;
  image: string;
  price?: number;
  pack?: string;
  hoverImage?: string;
  discountPercentage?: number; // 0-100, e.g., 10 for 10% off
  stock?: number; // product stock quantity
}

function getId(p: ApiProduct): string {
  return String(p?._id ?? "");
}

function firstImage(p: ApiProduct): string | undefined {
  const imgs = p?.images;
  if (!Array.isArray(imgs) || imgs.length === 0) return undefined;
  const first = imgs[0];
  return typeof first === "string" ? first : first?.url;
}

function resolveHover(p: ApiProduct): string | undefined {
  if (p?.hover?.url) return p.hover.url;
  const imgs = p?.images;
  if (Array.isArray(imgs) && imgs.length > 1) {
    const second = imgs[1];
    return typeof second === "string" ? second : second?.url;
  }
  return undefined;
}

const toCard = (p: ApiProduct): ProductCard => ({
  id: getId(p),
  name: String(p?.name ?? "Untitled"),
  image: firstImage(p) || "/product-placeholder.png",
  hoverImage: resolveHover(p),
  price:
    typeof p?.price === "number"
      ? p.price
      : typeof p?.price === "string"
      ? Number(p.price) || undefined
      : undefined,
  pack: typeof p?.pack === "string" ? p.pack : undefined,
  discountPercentage:
    typeof p?.discountPercentage === "number" && p.discountPercentage > 0 && p.discountPercentage <= 100
      ? p.discountPercentage
      : undefined,
  stock: typeof p?.stock === "number" && p.stock >= 0 ? p.stock : undefined,
});

async function fetchProductsFromAPI(): Promise<ProductCard[]> {
  const res = await fetch(build("/api/products"), {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  const list = (await res.json().catch(() => [])) as unknown;
  const arr = Array.isArray(list) ? (list as ApiProduct[]) : [];
  return arr.map(toCard);
}

/**
 * React Query hook for fetching products with caching
 */
export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: fetchProductsFromAPI,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}
