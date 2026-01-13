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
import { trackAddToCart } from "@/lib/metaPixel";

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
  discountPercentage?: number; // 0-100, e.g., 10 for 10% off
  stock?: number; // product stock quantity
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
  discountPercentage:
    typeof p?.discountPercentage === "number" && p.discountPercentage > 0 && p.discountPercentage <= 100
      ? p.discountPercentage
      : undefined,
  stock: typeof p?.stock === "number" && p.stock >= 0 ? p.stock : undefined,
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
  discountPercentage,
  stock,
  liked,
  onAdd,
  onToggleWish,
}: ProductCard & {
  liked: boolean;
  onAdd: (id: string, name?: string) => void;
  onToggleWish: (id: string, name?: string) => void;
}) {
  const hasHover = Boolean(hoverImage);
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const onHeartClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleWish(id, name);
  }, [id, name, onToggleWish]);

  // Calculate discounted price
  const originalPrice = price ?? 399;
  const finalPrice = discountPercentage && discountPercentage > 0 
    ? Math.round(originalPrice * (1 - discountPercentage / 100))
    : originalPrice;

  // Check if product is out of stock
  const isOutOfStock = typeof stock === 'number' && stock <= 0;

  // Get product color based on name (for background)
  const getProductColor = (productName: string) => {
    const name = productName.toLowerCase();
    if (name.includes('digestive')) return 'bg-[#FF6B35]'; // Orange
    if (name.includes('sugarwise')) return 'bg-[#8BBF6F]'; // Green
    if (name.includes('slim')) return 'bg-[#F5D76E]'; // Yellow
    if (name.includes('gutease')) return 'bg-[#F2B3B3]'; // Pink
    return 'bg-[var(--wnr-orange)]'; // Default orange
  };

  const productBgColor = getProductColor(name);

  return (
    <div 
      className="group/card relative w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/products/${id}`} className="block">
          <div className={`relative w-full overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 shadow-md transform-gpu transition-all duration-500 ease-out will-change-transform ${isOutOfStock ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02] cursor-pointer'}`}>
          {/* Top Section: Product Display Area with Colored Background */}
          <div className={`relative ${productBgColor} aspect-[4/5] md:aspect-[5/5.5] overflow-hidden transition-all duration-500 ${isHovered && !isOutOfStock ? 'brightness-105' : isOutOfStock ? 'grayscale opacity-60' : ''}`}>
            {/* Animated background gradient overlay on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-white/0 transition-all duration-500 ${isHovered ? 'from-white/10 via-white/5 to-white/0' : ''}`} />
            
            {/* Product Image with zoom effect - fills entire card area */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`relative w-full h-full transition-transform duration-700 ease-out ${isHovered ? 'scale-110 md:scale-115' : 'scale-100'}`}>
                {/* Main Product Image */}
                <Image
                  src={image}
                  alt={name}
                  fill
                  className={`object-contain md:object-cover drop-shadow-2xl transition-all duration-700 ${isHovered && hasHover ? 'opacity-90 blur-sm' : isHovered ? 'brightness-110' : ''}`}
                  sizes="(min-width:1024px) 320px, (min-width:768px) 240px, 100vw"
                  priority={false}
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                  onLoad={() => setImageLoaded(true)}
                />
                {/* Hover Image (Sachet) - Desktop Only, Small and Centered */}
                {hasHover && hoverImage && (
                  <div className={`hidden md:flex absolute inset-0 items-center justify-center transition-all duration-700 z-10 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className="relative w-[35%] h-[35%]">
                      <Image
                        src={hoverImage}
                        alt={`${name} - Sachet`}
                        fill
                        className="object-contain drop-shadow-2xl"
                        sizes="(min-width:1024px) 144px, (min-width:768px) 108px"
                        priority={false}
                        loading="lazy"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Out of Stock Badge */}
            {isOutOfStock && (
              <div className="absolute top-3 left-3 z-20">
                <div className="relative">
                  <div className="relative bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 text-white text-[10px] sm:text-xs font-extrabold px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
                    <div className="relative flex items-center gap-1">
                      <span className="leading-none tracking-tight">OUT OF STOCK</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Discount Badge - Floating Designer Style with animation - Only show if discount > 0 */}
            {!isOutOfStock && typeof discountPercentage === 'number' && discountPercentage > 0 && (
              <div className={`absolute top-3 left-3 z-20 transition-all duration-500 ${isHovered ? 'scale-110 rotate-3' : 'scale-100 rotate-0'}`}>
                <div className="relative">
                  {/* Main badge with gradient */}
                  <div className="relative bg-gradient-to-br from-red-500 via-red-600 to-red-700 text-white text-[10px] sm:text-xs font-extrabold px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg shadow-[0_4px_12px_rgba(239,68,68,0.4)] hover:shadow-[0_6px_16px_rgba(239,68,68,0.6)] transition-shadow duration-300">
                    {/* Shine effect */}
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
                    
                    {/* Badge content */}
                    <div className="relative flex items-center gap-1">
                      <span className="leading-none tracking-tight">{discountPercentage}%</span>
                      <span className="text-[8px] sm:text-[10px] leading-none opacity-90">OFF</span>
                    </div>
                    
                    {/* Decorative corner accent */}
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full opacity-80 shadow-sm" />
                  </div>
                  
                  {/* Floating glow effect */}
                  <div className={`absolute inset-0 bg-red-500/30 rounded-lg blur-md -z-10 transition-all duration-500 ${isHovered ? 'animate-pulse scale-110' : 'animate-pulse'}`} />
                </div>
              </div>
            )}

            {/* Wishlist Heart Icon - Top Right with enhanced interaction */}
            <button
              type="button"
              aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={liked}
              onClick={onHeartClick}
              className={`absolute top-3 right-3 z-20 grid place-items-center h-10 w-10 rounded-full bg-white/95 backdrop-blur-sm ring-1 ring-black/10 transition-all duration-300 hover:scale-125 active:scale-95 ${
                liked ? "text-[var(--wnr-pink)] bg-pink-50 ring-pink-200" : "text-[var(--wnr-berry)] hover:bg-white"
              } shadow-lg hover:shadow-xl`}
            >
              {liked ? <FaHeart size={18} className="animate-pulse" /> : <CiHeart size={20} />}
            </button>

          </div>

          {/* Bottom Section: Product Info & Actions UI */}
          <div className="bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-3 space-y-2.5 md:space-y-1.5 transition-all duration-500 border-t border-gray-200/50">
            {/* Product Name */}
            <div className="group/name">
              <h3 className="!text-xl !md:text-sm font-extrabold leading-tight tracking-tight !text-[var(--wnr-berry)] uppercase line-clamp-2 transition-colors duration-300">
                {name}
              </h3>
            </div>

            {/* Pack Info and Price in same line */}
            <div className="flex items-center justify-between gap-2 py-0.5 md:py-0">
              {/* Pack Info with icon-like styling */}
              <div className="flex items-center gap-2">
                <div className="w-1 h-3 !md:h-3.5 bg-[var(--wnr-berry)] rounded-full" />
                <p className="text-xs !md:text-xs font-semibold text-black/70 uppercase tracking-wide">
                  {pack ?? "15 DIP BAGS"}
                </p>
              </div>

              {/* Price with enhanced styling */}
              <div className="flex items-baseline gap-2 md:gap-1.5">
                {typeof discountPercentage === 'number' && discountPercentage > 0 ? (
                  <>
                    <span className="text-base !md:text-sm text-gray-400 line-through font-medium">
                      ₹{originalPrice.toLocaleString("en-IN")}
                    </span>
                    <span className={`text-2xl md:text-3xl font-extrabold ${isOutOfStock ? 'text-gray-400' : 'text-[var(--wnr-berry)]'}`}>
                      ₹{finalPrice.toLocaleString("en-IN")}
                    </span>
                  </>
                ) : (
                  <span className={`text-2xl md:text-3xl font-extrabold ${isOutOfStock ? 'text-gray-400' : 'text-[var(--wnr-berry)]'}`}>
                    ₹{originalPrice.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            </div>
            
            {/* Savings badge - below if discount exists */}
            {typeof discountPercentage === 'number' && discountPercentage > 0 && (
              <div className="flex items-center justify-end pt-0.5">
                <span className="text-xs md:text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                  Save ₹{Math.round(originalPrice - finalPrice)}
                </span>
              </div>
            )}

            {/* Action Buttons with enhanced interactions */}
            <div className="flex items-stretch gap-2.5 pt-1.5 md:pt-1">
              {/* Add to Cart Button */}
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isOutOfStock) {
                    toast.error("This product is out of stock");
                    return;
                  }
                  onAdd(id, name);
                }}
                className={`group/btn flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--wnr-berry)] to-[var(--wnr-berry-700)] text-white py-3.5 md:py-4 rounded-xl font-semibold text-sm md:text-base transition-all duration-300 ${
                  isOutOfStock
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:from-[var(--wnr-berry-700)] hover:to-[var(--wnr-berry-900)] active:scale-[0.97] shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer'
                } relative overflow-hidden`}
              >
                {/* Button shine effect */}
                {!isOutOfStock && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                )}
                <IoBagHandleOutline className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover/btn:scale-110" />
                <span className="relative z-10 hidden sm:inline">
                  {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                </span>
                <span className="relative z-10 sm:hidden">
                  {isOutOfStock ? 'Out' : 'Add'}
                </span>
              </button>

              {/* Buy Now Button */}
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isOutOfStock) {
                    toast.error("This product is out of stock");
                    return;
                  }
                  onAdd(id, name);
                  window.location.href = `/checkout?mode=buynow&id=${encodeURIComponent(
                    id
                  )}&qty=1`;
                }}
                className={`group/btn flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black py-3.5 md:py-4 rounded-xl font-semibold text-sm md:text-base transition-all duration-300 ${
                  isOutOfStock
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:from-yellow-500 hover:to-yellow-600 active:scale-[0.97] shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer'
                } relative overflow-hidden`}
              >
                {/* Button shine effect */}
                {!isOutOfStock && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                )}
                <IoFlashOutline className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover/btn:scale-110 group-hover/btn:rotate-12" />
                <span className="relative z-10">
                  {isOutOfStock ? 'Out of Stock' : 'Buy Now'}
                </span>
              </button>
            </div>

          </div>

          <span className="sr-only">{name}</span>
        </div>
      </Link>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memoization
  return (
    prevProps.id === nextProps.id &&
    prevProps.liked === nextProps.liked &&
    prevProps.image === nextProps.image &&
    prevProps.price === nextProps.price &&
    prevProps.stock === nextProps.stock &&
    prevProps.discountPercentage === nextProps.discountPercentage
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
      // Show all products (including out of stock), take first 5
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
        // Meta Pixel: AddToCart
        const product = items.find((p) => p.id === id);
        if (product) {
          trackAddToCart([{ id: product.id, name: product.name || name, price: product.price || 0, quantity: 1 }]);
        }
      } catch (e: any) {
        toast.error(e?.message || "Could not add to cart");
      }
    },
    [add, items]
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
                  <div className="rounded-2xl ring-1 ring-black/5 shadow-md bg-white overflow-hidden">
                    <div className="animate-pulse">
                      <div className="aspect-[4/5] bg-gradient-to-br from-orange-200 to-orange-300" />
                      <div className="bg-gradient-to-b from-gray-50 to-gray-100 p-4 space-y-3">
                        <div className="h-6 bg-black/10 rounded w-3/4" />
                        <div className="h-4 bg-black/5 rounded w-1/2" />
                        <div className="h-8 bg-black/10 rounded w-1/3" />
                        <div className="flex gap-2.5 pt-2">
                          <div className="flex-1 h-12 bg-black/10 rounded-xl" />
                          <div className="flex-1 h-12 bg-black/10 rounded-xl" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop: Grid skeletons */}
            <div className="hidden md:grid mt-6 grid-cols-[repeat(3,260px)] lg:grid-cols-[repeat(3,300px)] gap-3 md:gap-5 justify-center">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`s1-${i}`} className="w-[260px] lg:w-[300px]">
                  <div className="rounded-2xl ring-1 ring-black/5 shadow-md bg-white overflow-hidden">
                    <div className="animate-pulse">
                      <div className="aspect-[5/5.5] bg-gradient-to-br from-orange-200 to-orange-300" />
                      <div className="bg-gradient-to-b from-gray-50 to-gray-100 p-3 space-y-1.5">
                        <div className="h-5 bg-black/10 rounded w-3/4" />
                        <div className="h-4 bg-black/5 rounded w-1/2" />
                        <div className="h-6 bg-black/10 rounded w-1/3" />
                        <div className="flex gap-2.5 pt-2">
                          <div className="flex-1 h-12 bg-black/10 rounded-xl" />
                          <div className="flex-1 h-12 bg-black/10 rounded-xl" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:grid mt-4 grid-cols-[repeat(2,280px)] lg:grid-cols-[repeat(2,320px)] gap-3 md:gap-5 justify-center">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={`s2-${i}`} className="w-[280px] lg:w-[320px]">
                  <div className="rounded-2xl ring-1 ring-black/5 shadow-md bg-white overflow-hidden">
                    <div className="animate-pulse">
                      <div className="aspect-[5/5.5] bg-gradient-to-br from-orange-200 to-orange-300" />
                      <div className="bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-5 space-y-3">
                        <div className="h-6 bg-black/10 rounded w-3/4" />
                        <div className="h-4 bg-black/5 rounded w-1/2" />
                        <div className="h-8 bg-black/10 rounded w-1/3" />
                        <div className="flex gap-2.5 pt-2">
                          <div className="flex-1 h-12 bg-black/10 rounded-xl" />
                          <div className="flex-1 h-12 bg-black/10 rounded-xl" />
                        </div>
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
            {/* ✅ MOBILE: one-card infinite slider with same card design */}
            <MobileCarousel
              items={items}
              has={hasWish}
              onAdd={onAdd}
              onToggleWish={onToggleWish}
            />

            {/* ✅ DESKTOP/TABLET — 3 + 2 grid with same card design */}
            <div className="hidden md:grid mt-6 grid-cols-[repeat(3,280px)] lg:grid-cols-[repeat(3,320px)] gap-4 md:gap-6 lg:gap-8 justify-center">
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
              <div className="hidden md:grid mt-4 grid-cols-[repeat(2,280px)] lg:grid-cols-[repeat(2,320px)] gap-4 md:gap-6 lg:gap-8 justify-center">
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
