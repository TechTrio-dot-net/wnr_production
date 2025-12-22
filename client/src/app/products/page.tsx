// src/app/products/page.tsx
"use client";

import { useDebounce } from "@/hooks/useDebounce";
import { useProducts } from "@/hooks/useProducts";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { IoBagHandleOutline } from "react-icons/io5";
import { CiHeart } from "react-icons/ci";
import { FaHeart } from "react-icons/fa";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { buildUrl } from "@/lib/api";
import { useWishlist } from "@/context/WishlistContext";
import ItemListJsonLd from "@/components/seo/ItemListJsonLd";
import BreadcrumbsJsonLd from "@/components/seo/BreadcrumbsJsonLd";
import { trackAddToCart } from "@/lib/ga";
import { ProductGridSkeleton } from "@/components/common/SkeletonLoader";

/* ------------ types ------------ */
type ProductRec = {
  id: string;
  name: string;
  image: string;
  price?: number;
  description?: string;
  pack?: string;
};

type ImageObject = { url?: string | null; [k: string]: unknown };
type ApiProduct = {
  _id?: string | number;
  id?: string | number;
  name?: string;
  price?: number | string;
  description?: string;
  pack?: string;
  image?: string;
  images?: Array<string | ImageObject>;
  [k: string]: unknown;
};

/* ------------ utils ------------ */
const primaryImageUrl = (p: ApiProduct | null | undefined): string | null => {
  const imgs = Array.isArray(p?.images) ? p.images : [];
  if (!imgs.length) return null;
  const first = imgs[0];
  if (typeof first === "string") return first;
  return typeof first?.url === "string" && first.url ? first.url : null;
};
const getId = (p: ApiProduct | null | undefined): string =>
  String(p?._id ?? p?.id ?? "");

const toNum = (v: unknown): number => {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const PAISA = false;
const asRupees = (v: unknown) => (PAISA ? toNum(v) / 100 : toNum(v));

/* ------------ fetch from backend ------------ */
async function fetchProductsFromApi(): Promise<ProductRec[]> {
  const res = await fetch(buildUrl("/api/products"), { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  const list = (await res.json().catch(() => [])) as unknown;
  const arr: ApiProduct[] = Array.isArray(list) ? (list as ApiProduct[]) : [];
  return arr.map((p): ProductRec => ({
    id: getId(p),
    name: String(p?.name ?? "Untitled"),
    image: primaryImageUrl(p) || "/placeholder.svg",
    price: asRupees(p?.price),
    description: typeof p?.description === "string" ? p.description : undefined,
    pack: typeof p?.pack === "string" ? p.pack : undefined,
  }));
}

export default function ProductsPage() {
  const { add } = useCart();
  const { ids: wishIds, toggle: toggleWish } = useWishlist();

  const [q, setQ] = useState("");
  const [min, setMin] = useState<number | "">("");
  const [max, setMax] = useState<number | "">("");
  
  // Debounce search query to avoid filtering on every keystroke
  const debouncedQ = useDebounce(q, 300);
  
  // Use React Query for products with caching
  const { data: allProducts, isLoading } = useProducts();

  /* ===== Local mirror + evented storage for instant sync ===== */
  const WISHLIST_KEY = "wnr:wishlist";
  const [wlLocal, setWlLocal] = useState<Set<string>>(new Set());

  const readWishlistLocal = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(WISHLIST_KEY);
      const arr = raw ? (JSON.parse(raw) as unknown[]) : [];
      const set = new Set((Array.isArray(arr) ? arr : []).map(String));
      setWlLocal(set);
    } catch {
      setWlLocal(new Set());
    }
  }, []);

  // persist helper: write to localStorage + broadcast app-wide event
  const writeLocalIds = useCallback((ids: string[]) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event("wnr:wishlist:changed"));
  }, []);

  // keep local mirror in lockstep with Context updates
  useEffect(() => {
    setWlLocal(new Set(Array.from(wishIds)));
  }, [wishIds]);

  useEffect(() => {
    readWishlistLocal();

    // listen for global wishlist mutations (other pages/tabs)
    const onChanged = () => readWishlistLocal();
    window.addEventListener("wnr:wishlist:changed", onChanged as EventListener);

    const onStorage = (e: StorageEvent) => {
      if (e.key === WISHLIST_KEY) readWishlistLocal();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("wnr:wishlist:changed", onChanged as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [readWishlistLocal]);
  /* ===== /Local mirror ===== */

  // Filter products with debounced search
  const list = useMemo(() => {
    if (!allProducts) return [];
    
    let out = [...allProducts];

    if (debouncedQ.trim()) {
      const s = debouncedQ.toLowerCase();
      out = out.filter((p) => {
        const name = p.name?.toLowerCase() ?? "";
        const pack = p.pack?.toLowerCase() ?? "";
        return name.includes(s) || pack.includes(s);
      });
    }

    if (min !== "") out = out.filter((p) => (p.price ?? 0) >= min);
    if (max !== "") out = out.filter((p) => (p.price ?? 0) <= max);

    return out;
  }, [allProducts, debouncedQ, min, max]);

  const addToCart = useCallback(
    async (id: string, name?: string, qty = 1) => {
      try {
        await add(id, qty);
        toast.success("Added to cart", { description: name });
        trackAddToCart([{ item_id: id, item_name: name, price: undefined, quantity: qty }]);
      } catch (e: any) {
        toast.error(e?.message || "Could not add to cart");
      }
    },
    [add]
  );

  return (
    <main className="bg-white text-[var(--wnr-text)] min-h-screen pt-[calc(var(--navbar-height-mobile,5.5rem)+var(--offer-strip-height,0px))] md:pt-[calc(var(--navbar-height-desktop,7rem)+var(--offer-strip-height,0px))]">
      {/* Hero / Heading */}
      <section className="h-48 md:h-[260px] bg-[var(--wnr-berry)] text-white flex items-center justify-center">
        <h1 className="text-3xl md:text-5xl font-bold">All Products</h1>
      </section>

      {/* Filters */}
      <div className="wnr-container py-6 md:py-8">
        <div className="rounded-2xl bg-[var(--wnr-sand)]/60 p-4 md:p-5 flex flex-wrap gap-3 items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products..."
            className="flex-1 min-w-[220px] px-4 py-2 rounded-full ring-1 ring-black/10 outline-none bg-white"
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={min}
              onChange={(e) => setMin(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Min ₹"
              className="w-28 px-3 py-2 rounded-full ring-1 ring-black/10 outline-none bg-white"
            />
            <span className="opacity-60">-</span>
            <input
              type="number"
              value={max}
              onChange={(e) => setMax(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Max ₹"
              className="w-28 px-3 py-2 rounded-full ring-1 ring-black/10 outline-none bg-white"
            />
          </div>
          <button
            onClick={() => {
              setQ("");
              setMin("");
              setMax("");
            }}
            className="h-10 px-4 rounded-full bg-white ring-1 ring-black/10 hover:bg黑/5 transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Product Grid */}
      <div className="wnr-container">
        {isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : list.length === 0 ? (
          <div className="text-center py-12 opacity-70">No products found.</div>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 md:gap-6 pb-12 md:pb-16">
            {list.map((p) => {
              const idStr = String(p.id);
              const liked = wlLocal.has(idStr) || wishIds.has(idStr);
              const pack = p.pack ?? "15 DIP BAGS";
              const price = p.price ?? 399;

              return (
                <li
                  key={idStr}
                  className="rounded-2xl ring-1 ring-black/5 shadow-soft bg-white overflow-hidden group"
                >
                  <div className="relative aspect-square">
                    <Link href={`/products/${idStr}`} className="absolute inset-0 block" prefetch>
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                      />
                    </Link>

                    {/* Wishlist */}
                    <button
                      type="button"
                      aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
                      aria-pressed={liked}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();

                        // Optimistic local flip
                        setWlLocal((prev) => {
                          const next = new Set(prev);
                          if (next.has(idStr)) next.delete(idStr);
                          else next.add(idStr);
                          // persist to localStorage + broadcast so other parts update instantly
                          writeLocalIds(Array.from(next));
                          return next;
                        });

                        // Server/context mutation (best-effort); if fails, rollback + re-broadcast
                        void toggleWish(idStr).catch((err: any) => {
                          setWlLocal((prev) => {
                            const next = new Set(prev);
                            if (liked) next.add(idStr);
                            else next.delete(idStr);
                            writeLocalIds(Array.from(next));
                            return next;
                          });
                          toast.error(err?.message || "Could not update wishlist");
                        });

                        toast.success(liked ? "Removed from wishlist" : "Added to wishlist", {
                          description: p.name,
                          id: `wish:${idStr}`,
                        });
                      }}
                      className={`absolute top-2 right-2 z-10 grid place-items-center h-9 w-9 rounded-full backdrop-blur bg-white/90 ring-1 ring-black/10 transition ${
                        liked ? "text-[var(--wnr-pink)]" : "text-[var(--wnr-berry)]"
                      } hover:bg-white`}
                    >
                      {liked ? <FaHeart size={16} /> : <CiHeart size={18} />}
                    </button>
                  </div>

                  <div className="p-4">
                    <Link
                      href={`/products/${idStr}`}
                      className="font-semibold line-clamp-1 hover:text-[var(--wnr-berry)]"
                      prefetch
                    >
                      {p.name}
                    </Link>
                    <div className="text-xs muted mt-1">{pack}</div>
                    <div className="mt-2 font-semibold">₹{price}</div>

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void addToCart(idStr, p.name)}
                        className="flex-1 h-10 rounded-full ring-1 ring-black/10 hover:bg-black/5 grid place-items-center"
                      >
                        <span className="inline-flex items-center gap-1 text-sm">
                          <IoBagHandleOutline /> Add
                        </span>
                      </button>

                      <Link
                        href={`/products/${idStr}`}
                        className="flex-1 h-10 rounded-full bg-[var(--wnr-berry)] text-white grid place-items-center hover:opacity-90 transition"
                        prefetch
                        aria-label={`View details of ${p.name}`}
                      >
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                          View<span aria-hidden>→</span>
                        </span>
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ItemListJsonLd
        items={list.map((p) => ({
          id: String(p.id),
          name: p.name,
          url: `${process.env.NEXT_PUBLIC_SITE_URL}/products/${p.id}`,
          image: p.image,
        }))}
      />

      <BreadcrumbsJsonLd
        id="products-listing"
        items={[
          { name: "Home", url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.wildnroot.com"}/` },
          { name: "Products", url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.wildnroot.com"}/products` },
        ]}
      />
    </main>
  );
}
