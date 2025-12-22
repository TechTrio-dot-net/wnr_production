"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Section from "@/components/common/Section";
import Image from "next/image";
import Link from "next/link";
import { IoBagHandleOutline, IoFlashOutline } from "react-icons/io5";
import { CiHeart } from "react-icons/ci";
import { FaHeart } from "react-icons/fa";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { buildUrl as build } from "@/lib/api";
import { useWishlist } from "@/hooks/useWishlist";
import { useProducts } from "@/hooks/useProducts";
import Head from "next/head";
import { usePathname } from "next/navigation";
import ItemListJsonLd from "@/components/seo/ItemListJsonLd";

/* ---------------- Types & helpers ---------------- */
type ImageObject = { url?: string | null; [k: string]: unknown };

type ApiProduct = {
  _id?: string;
  id?: string;
  name?: string;
  price?: number | string;
  pack?: string;
  images?: Array<string | ImageObject>;
  hover?: ImageObject | null;
  hoverImage?: string | null;
  image?: string | null;
  [k: string]: unknown;
};

type ProductCard = {
  id: string;
  name: string;
  image: string;
  hoverImage?: string;
  pack?: string;
  price?: number;
};

const getId = (p: ApiProduct | null | undefined): string =>
  String(p?._id ?? p?.id ?? "");

const firstImage = (p: ApiProduct | null | undefined): string | null => {
  const imgs = Array.isArray(p?.images) ? p!.images : [];
  if (imgs.length > 0) {
    const a = imgs[0];
    if (typeof a === "string") return a;
    if (typeof (a as ImageObject)?.url === "string" && (a as ImageObject).url)
      return (a as ImageObject).url as string;
  }
  if (typeof p?.image === "string" && p.image) return p.image;
  return null;
};

const resolveHover = (p: ApiProduct): string | undefined => {
  // First check for explicit hover image (sachet/pack image)
  if (p?.hover) {
    const hoverObj = p.hover as ImageObject;
    if (typeof hoverObj?.url === "string" && hoverObj.url) {
      return hoverObj.url;
    }
  }
  
  // Fallback to hoverImage string field if it exists
  if (typeof p?.hoverImage === "string" && p.hoverImage) {
    return p.hoverImage;
  }

  // Last resort: use second image from images array (if it's a pack/sachet image)
  const imgs = Array.isArray(p?.images) ? p.images : [];
  if (imgs.length > 1) {
    const secondImg = imgs[1];
    if (typeof secondImg === "string") return secondImg || undefined;
    const secondImgObj = secondImg as ImageObject;
    if (typeof secondImgObj?.url === "string" && secondImgObj.url) {
      return secondImgObj.url;
    }
  }
  
  return undefined;
};

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
});

async function fetchProductsFromDB(): Promise<ProductCard[]> {
  const res = await fetch(build("/api/products"), { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  const list = (await res.json().catch(() => [])) as unknown;
  const arr = Array.isArray(list) ? (list as ApiProduct[]) : [];
  return arr.map(toCard);
}

/* ---------------- Card ---------------- */
const Card = React.memo(function Card({
  id,
  name,
  image,
  pack,
  price,
  hoverImage,
  liked,
  onAdd,
  onToggleWish,
}: ProductCard & {
  liked: boolean;
  onAdd: (id: string, name?: string) => void;
  onToggleWish: (id: string, name?: string) => void;
}) {
  const hasHover = Boolean(hoverImage);

  const onHeartClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleWish(id, name);
  }, [id, name, onToggleWish]);

  return (
    <Link key={id} href={`/products/${id}`} className="block group/card">
      <div className="group relative w-full overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 shadow-soft transform-gpu transition-all duration-300 ease-out will-change-transform hover:shadow-xl hover:-translate-y-0.5 hover:scale-[1.02] md:hover:scale-[1.03] cursor-pointer group-hover/card:rounded-b-2xl">
        {/* Image stack (background image stays the same on hover) */}
        <div className="relative aspect-[4/5] md:aspect-[4/4.5]">
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover opacity-100"
            sizes="(min-width:1024px) 280px, (min-width:768px) 240px, 88vw"
            priority={false}
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
          />
          {/* Wishlist toggle — MOBILE ONLY */}
          <button
            type="button"
            aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={liked}
            onClick={onHeartClick}
            className={`md:hidden absolute top-2 right-2 z-10 grid place-items-center h-9 w-9 rounded-full backdrop-blur bg-white/90 ring-1 ring-black/10 transition ${
              liked ? "text-[var(--wnr-pink)]" : "text-[var(--wnr-berry)]"
            } hover:bg-white`}
          >
            {liked ? <FaHeart size={16} /> : <CiHeart size={18} />}
          </button>
        </div>

        {/* Hover tint (desktop only) */}
        <div className="pointer-events-none absolute inset-0 transition-all duration-300 ease-out bg-black/0 group-hover:bg-black/20 backdrop-blur-0 group-hover:backdrop-blur-[2px] hidden md:block" />

        {/* Desktop info/actions on hover */}
        <div className="pointer-events-none absolute inset-0 p-3 md:p-4 flex-col justify-between transition-opacity duration-300 z-[10] opacity-0 group-hover:flex group-hover:opacity-100 hidden md:flex">
          {/* Product name at top-left */}
          <div className="absolute left-3 md:left-4 top-3 md:top-4 max-w-[60%] z-[25]">
            <h4 className="text-white text-sm md:text-base font-semibold leading-5 tracking-wide uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              {name}
            </h4>
          </div>

          {/* Floating pack preview (desktop only) - positioned below product name, in upper-left area */}
          {hasHover && (
            <div className="hidden md:block pointer-events-none absolute left-3 md:left-4 top-14 md:top-20 w-[80px] md:w-[95px] aspect-[3/4] z-[20] opacity-0 scale-95 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:scale-100">
              <div className="relative w-full h-full">
                <Image
                  src={hoverImage as string}
                  alt={`${name} pack`}
                  fill
                  className="object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.35)]"
                  sizes="95px"
                />
              </div>
            </div>
          )}

          {/* Price, pack, and actions at bottom with padding to ensure no overlap */}
          <div className="flex items-end justify-between mt-auto pb-3">
            <div className="text-white">
              <p className="text-[12px] md:text-sm font-semibold leading-4 tracking-wide uppercase">
                {pack ?? "15 DIP BAGS"}
              </p>
              <p className="text-[16px] md:text-[20px] font-bold leading-6">
                ₹{(price ?? 399).toLocaleString("en-IN")}/-
              </p>
            </div>
            <div className="flex items-center text-lg gap-2 pointer-events-auto">
              <button
                type="button"
                aria-label="Add to cart"
                className="text-white cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAdd(id, name);
                }}
              >
                <IoBagHandleOutline size={20} />
              </button>

              {/* Desktop wishlist action (inside hover) */}
              <button
                type="button"
                aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
                aria-pressed={liked}
                className={`transition hover:opacity-80 ${liked ? "text-[var(--wnr-pink)]" : "text-white"} cursor-pointer`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onHeartClick(e);
                }}
              >
                {liked ? <FaHeart size={24} /> : <CiHeart size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* ✅ Mobile info footer */}
        <div className="md:hidden p-3">
          <div className="text-lg font-extrabold leading-tight tracking-tight line-clamp-2">
            {name}
          </div>
          <div className="text-[12px] opacity-60 mt-1">
            {pack ?? "15 DIP BAGS"}
          </div>
          <div className="mt-1.5 text-lg font-semibold">
            ₹{(price ?? 399).toLocaleString("en-IN")}
          </div>

          {/* Buttons Row */}
          <div className="mt-3 flex items-stretch gap-2">
            {/* 🛒 Add to Cart */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAdd(id, name);
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-[var(--wnr-berry)] text-white py-3 rounded-lg font-semibold transition active:scale-[0.98] disabled:opacity-60"
            >
              <IoBagHandleOutline className="w-5 h-5" /> Add to Cart
            </button>

            {/* ⚡ Buy Now */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAdd(id, name);
                window.location.href = `/checkout?mode=buynow&id=${encodeURIComponent(
                  id
                )}&qty=1`;
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 text-black py-3 rounded-lg font-semibold hover:bg-yellow-600 transition active:scale-[0.98] disabled:opacity-60"
            >
              <IoFlashOutline className="w-5 h-5" /> Buy Now
            </button>
          </div>
        </div>

        <span className="sr-only">{name}</span>
      </div>

      {/* Desktop info strip - initially visible, hides on hover and card expands to fill its space */}
      <div className="hidden md:block overflow-hidden transition-all duration-500 ease-out group-hover/card:max-h-0 group-hover/card:opacity-0 group-hover/card:p-0 group-hover/card:mt-0">
        <div className="bg-white rounded-b-2xl p-3 flex items-center justify-between gap-2 ring-1 ring-black/5 shadow-soft">
          <div className="text-base font-extrabold leading-tight tracking-tight line-clamp-1 flex-1 text-[var(--wnr-text)]">
            {name}
          </div>
          <div className="text-lg font-semibold whitespace-nowrap text-[var(--wnr-berry)]">
            ₹{(price ?? 399).toLocaleString("en-IN")}
          </div>
        </div>
      </div>
    </Link>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memoization
  return (
    prevProps.id === nextProps.id &&
    prevProps.liked === nextProps.liked &&
    prevProps.image === nextProps.image &&
    prevProps.price === nextProps.price
  );
});

/* ---------------- Mobile One-Card Carousel (infinite) ---------------- */
function MobileCarousel({
  items,
  has,
  onAdd,
  onToggleWish,
}: {
  items: ProductCard[];
  has: (id: string) => boolean;
  onAdd: (id: string, name?: string) => void;
  onToggleWish: (id: string, name?: string) => void;
}) {
  const extended = useMemo(() => {
    if (!items.length) return [];
    const first = items[0];
    const last = items[items.length - 1];
    return [last, ...items, first];
  }, [items]);

  const [idx, setIdx] = useState(1);
  const [anim, setAnim] = useState(true);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const AUTOSCROLL_MS = 3000;
  const USER_PAUSE_MS = 5000;
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const pause = useCallback((ms = USER_PAUSE_MS) => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), ms);
  }, []);

  const next = useCallback(() => setIdx((i) => i + 1), []);
  const prev = useCallback(() => setIdx((i) => i - 1), []);

  useEffect(() => {
    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile || extended.length < 2) return;

    if (autoTimer.current) clearInterval(autoTimer.current);
    autoTimer.current = setInterval(() => {
      if (!document.hidden && !paused) next();
    }, AUTOSCROLL_MS);

    const vis = () => {
      if (document.hidden) pause(0);
    };
    document.addEventListener("visibilitychange", vis);

    return () => {
      if (autoTimer.current) clearInterval(autoTimer.current);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [extended.length, paused, next, pause]);

  useEffect(() => {
    if (extended.length === 0) return;
    if (!wrapRef.current) return;

    const handleEnd = () => {
      if (!wrapRef.current) return;
      const i = idx;
      if (i === extended.length - 1) {
        setAnim(false);
        setIdx(1);
      } else if (i === 0) {
        setAnim(false);
        setIdx(extended.length - 2);
      }
    };

    const el = wrapRef.current;
    el.addEventListener("transitionend", handleEnd);
    return () => el.removeEventListener("transitionend", handleEnd);
  }, [idx, extended.length]);

  useEffect(() => {
    if (!anim) {
      const t = setTimeout(() => setAnim(true), 20);
      return () => clearTimeout(t);
    }
  }, [anim]);

  // Touch/drag swipe
  const startX = useRef(0);
  const deltaX = useRef(0);
  const dragging = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    pause();
    dragging.current = true;
    startX.current = e.touches[0].clientX;
    deltaX.current = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    deltaX.current = e.touches[0].clientX - startX.current;
  };
  const onTouchEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const threshold = 50;
    if (Math.abs(deltaX.current) > threshold) {
      if (deltaX.current < 0) next();
      else prev();
    }
    deltaX.current = 0;
  };

  const onCardTap = () => pause();

  const translate = useMemo(() => `translateX(-${idx * 100}%)`, [idx]);

  if (!extended.length) return null;

  // One card per view; smaller visual card via inner max-width wrapper
  return (
    <div
      className="md:hidden mt-6 -mx-4 px-0 overflow-hidden select-none"
      aria-roledescription="carousel"
    >
      <div
        ref={wrapRef}
        className={`flex w-full ${anim ? "transition-transform duration-500 ease-out" : ""}`}
        style={{ transform: translate }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {extended.map((p, i) => (
          <div key={`${p.id}-${i}`} className="w-full flex-shrink-0 px-4">
            {/* smaller card on mobile */}
            <div className="max-w-[420px] w-[88%] mx-auto">
              <div onClick={onCardTap}>
                <Card
                  {...p}
                  liked={has(p.id)}
                  onAdd={(id, name) => {
                    onCardTap();
                    onAdd(id, name);
                  }}
                  onToggleWish={(id, name) => {
                    onCardTap();
                    onToggleWish(id, name);
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {items.map((_, i) => {
          const realIndex =
            idx === 0 ? items.length - 1 : idx === extended.length - 1 ? 0 : idx - 1;
          const active = realIndex === i;
          return (
            <span
              key={`dot-${i}`}
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full transition-transform ${
                active ? "bg-[var(--wnr-berry)] scale-110" : "bg-black/20"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Grid + Mobile Carousel ---------------- */
export default function ProductsGrid() {
  const { add } = useCart();

  // Make wishlist hook shape tolerant (older/newer versions)
  type WL = {
    loading?: boolean;
    ids?: Set<string>;
    has?: (id: string) => boolean;
    toggle?: (id: string) => Promise<void>;
    add?: (id: string) => Promise<void>;
    remove?: (id: string) => Promise<void>;
    refresh?: () => Promise<void>;
    user?: unknown;
    initializing?: boolean;
    syncing?: boolean;
  };

  const wl = (useWishlist() as unknown) as WL;

  // Safe helpers regardless of hook shape
  const hasWish = useCallback((id: string) => !!wl?.has?.(id), [wl]);
  const canToggle = !!wl?.toggle;

  const [items, setItems] = useState<ProductCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Use React Query for caching and better performance
  const { data: allProducts, isLoading } = useProducts();
  
  useEffect(() => {
    if (allProducts) {
      setItems(allProducts.slice(0, 5));
    }
  }, [allProducts]);

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);

  const onToggleWish = useCallback(
    async (id: string, name?: string) => {
      if (!wl?.user) {
        toast("Please sign in to use wishlist");
        return;
      }
      if (!canToggle) {
        toast.error("Wishlist is temporarily unavailable.");
        return;
      }
      const adding = !hasWish(id);
      try {
        await wl.toggle!(id);
        toast.success(adding ? "Added to wishlist" : "Removed from wishlist", {
          description: name,
        });
      } catch (e: any) {
        toast.error(e?.message || "Could not update wishlist");
      }
    },
    [wl, canToggle, hasWish]
  );

  const onAdd = useCallback(
    async (id: string, name?: string) => {
      try {
        await add(id, 1);
        toast.success("Added to cart", { description: name });
      } catch (e: any) {
        toast.error(e?.message || "Could not add to cart");
      }
    },
    [add]
  );

  const firstThree = useMemo(() => items.slice(0, 3), [items]);
  const lastTwo = useMemo(() => items.slice(3, 5), [items]);

  const initializing = !!wl?.initializing;
  const syncing = !!wl?.syncing;

  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.wildnroot.com";
  const pathname = usePathname();
  const canonicalHref = `${SITE.replace(/\/+$/, "")}${pathname || ""}`;

  return (
    <Section>
      <Head>
        <link rel="canonical" href={canonicalHref} />
      </Head>

      {/* ✅ SEO: ItemList JSON-LD for the visible product list */}
      {!loading && items.length > 0 && (
        <ItemListJsonLd
          id="products-grid"
          items={items.map((p) => ({
            id: p.id,
            name: p.name,
            url: `${SITE.replace(/\/+$/, "")}/products/${encodeURIComponent(p.id)}`,
            image: p.image?.startsWith("http")
              ? p.image
              : `${SITE.replace(/\/+$/, "")}${p.image || ""}`,
          }))}
        />
      )}

      <div className="wnr-container">
        <h3 className="section-title text-center text-[var(--wnr-berry)]">PRODUCTS</h3>

        {loading ? (
          <>
            {/* Mobile: Single centered skeleton matching carousel */}
            <div className="md:hidden mt-6 -mx-4 px-0">
              <div className="flex justify-center">
                <div className="w-[88%] max-w-[420px] px-4">
                  <div className="rounded-2xl ring-1 ring-black/5 shadow-soft bg-white overflow-hidden">
                    <div className="animate-pulse">
                      <div className="aspect-[4/5] bg-black/5" />
                      <div className="p-3 space-y-2">
                        <div className="h-5 bg-black/5 rounded w-3/4" />
                        <div className="h-3 bg-black/5 rounded w-1/2" />
                        <div className="h-4 bg-black/5 rounded w-1/3 mt-2" />
                        <div className="h-10 bg-black/5 rounded mt-3" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop: Grid skeletons */}
            <div className="hidden md:grid mt-6 grid-cols-[repeat(3,240px)] lg:grid-cols-[repeat(3,280px)] gap-3 md:gap-5 justify-center">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`s1-${i}`} className="w-[240px] lg:w-[280px]">
                  <div className="rounded-2xl ring-1 ring-black/5 shadow-soft bg-white overflow-hidden">
                    <div className="animate-pulse">
                      <div className="aspect-square bg-black/5" />
                      <div className="p-3 space-y-2">
                        <div className="h-4 bg-black/5 rounded w-2/3" />
                        <div className="h-3 bg-black/5 rounded w-1/3" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:grid mt-4 grid-cols-[repeat(2,240px)] lg:grid-cols-[repeat(2,280px)] gap-3 md:gap-5 justify-center">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={`s2-${i}`} className="w-[240px] lg:w-[280px]">
                  <div className="rounded-2xl ring-1 ring-black/5 shadow-soft bg-white overflow-hidden">
                    <div className="animate-pulse">
                      <div className="aspect-square bg-black/5" />
                      <div className="p-3 space-y-2">
                        <div className="h-4 bg-black/5 rounded w-2/3" />
                        <div className="h-3 bg-black/5 rounded w-1/3" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : items.length === 0 ? (
          <div className="mt-8 text-center opacity-70">No products found.</div>
        ) : (
          <>
            {/* ✅ MOBILE: one-card infinite slider */}
            <MobileCarousel
              items={items}
              has={hasWish}
              onAdd={onAdd}
              onToggleWish={onToggleWish}
            />

            {/* ✅ DESKTOP/TABLET — 3 + 2 grid */}
            <div className="hidden md:grid mt-6 grid-cols-[repeat(3,240px)] lg:grid-cols-[repeat(3,280px)] gap-3 md:gap-5 justify-center">
              {firstThree.map((p) => (
                <Card
                  key={p.id}
                  {...p}
                  liked={hasWish(p.id)}
                  onAdd={onAdd}
                  onToggleWish={onToggleWish}
                />
              ))}
            </div>

            {lastTwo.length > 0 && (
              <div className="hidden md:grid mt-4 grid-cols-[repeat(2,240px)] lg:grid-cols-[repeat(2,280px)] gap-3 md:gap-5 justify-center">
                {lastTwo.map((p) => (
                  <Card
                    key={p.id}
                    {...p}
                    liked={hasWish(p.id)}
                    onAdd={onAdd}
                    onToggleWish={onToggleWish}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Show only on very first auth bootstrap */}
        {initializing && (
          <div className="mt-3 text-center text-xs text-neutral-500">
            Syncing wishlist…
          </div>
        )}

        {/* Optional tiny syncing indicator */}
        {!initializing && syncing && (
          <div className="mt-3 flex justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-black/20 animate-pulse" />
          </div>
        )}
      </div>
    </Section>
  );
}
