// src/app/products/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
// import { Heart } from "lucide-react";
import { IoBagHandleOutline, IoFlashOutline } from "react-icons/io5";
import { CiHeart } from "react-icons/ci";
import { FaHeart } from "react-icons/fa";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { buildUrl } from "@/lib/api";
import ProductJsonLd from "@/components/seo/ProductJsonLd";
import BreadcrumbsJsonLd from "@/components/seo/BreadcrumbsJsonLd";
import { trackAddToCart, trackBeginCheckout } from "@/lib/ga";
import { trackViewContent as trackMetaViewContent, trackAddToCart as trackMetaAddToCart, trackInitiateCheckout as trackMetaInitiateCheckout } from "@/lib/metaPixel";
import { ProductReviews } from "@/components/reviews/ProductReviews";

/* ---------------- Backend raw types (as returned) ---------------- */
type ImageObject = { url?: string;[k: string]: unknown };

type DBProductRaw = {
  _id: string;
  sku?: string;
  name: string;
  price?: number;
  images?: ImageObject[]; // [{url, ...}]
  image?: string; // optional legacy single image
  pack?: string;
  stock?: number;
  tag?: string;
  about?: string;
  ingredients?: string | string[];
  description?: string;
  descriptionPoints?: string[];
  steepingInstructions?: string[];
  discountPercentage?: number; // 0-100, e.g., 10 for 10% off
};

/* ---------------- Normalized product (front-end friendly) ---------------- */
type DBProduct = {
  _id: string;
  sku?: string;
  name: string;
  price: number; // Original price
  images: string[]; // array of urls
  pack?: string;
  stock?: number | null;
  tag?: string | null;
  about?: string | null;
  ingredients: string[];
  description?: string | null;
  descriptionPoints: string[];
  steepingInstructions?: string[] | null;
  discountPercentage?: number; // 0-100, e.g., 10 for 10% off
};

/* ---------------- Serviceability ---------------- */
type V1CourierOption = {
  type: string;
  index: number;
  etd: string;
  serviceable: { PICKUP: boolean; COD: boolean; PREPAID: boolean };
};
type V1Normalized = { result: V1CourierOption[]; zone: string | null };

/* ---------------- Defaults & Keys ---------------- */
const DEFAULT_STEEPING = [
  "Boil fresh water and let it cool slightly to 90–95°C.",
  "Place your dip bag in a cup and pour the warm water gently over it.",
  "SLet it steep for 2–5 minutes, allowing the flavours to unfold.",
  "Remove the bag, inhale the soothing aroma and enjoy each sip mindfully.",
];

const WISHLIST_KEY = "wnr:wishlist";
const PIN_LOCAL_KEY = "wnr:pincode";
const SEL_COURIER_KEY = "wnr:selectedCourier";

/** Cache serviceability by pincode: wnr:svc:<pin> */
const svcKey = (pin: string) => `wnr:svc:${pin}`;
const SVC_TTL_MS = 60 * 60 * 1000; // 1 hour

/* ---------------- Small client cache helpers ---------------- */
type Cached<T> = { value: T; ts: number; ttl: number };
function setCache<T>(key: string, value: T, ttlMs: number) {
  try {
    const payload: Cached<T> = { value, ts: Date.now(), ttl: ttlMs };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch { }
}
function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as Cached<T>;
    if (!data || typeof data.ts !== "number" || typeof data.ttl !== "number") return null;
    if (Date.now() - data.ts > data.ttl) {
      localStorage.removeItem(key);
      return null;
    }
    return data.value as T;
  } catch {
    return null;
  }
}

/* ---------------- Wishlist helpers (local) ---------------- */
const loadWishlist = (): Set<string> => {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]") as unknown[];
    return new Set<string>(raw.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set<string>();
  }
};
const saveWishlist = (ids: Set<string>) => {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify([...ids]));
  } catch { }
};

/* ---------------- Normalizers ---------------- */
const toStr = (v: unknown) => (typeof v === "string" ? v : null);
const toNum = (v: unknown, fallback = 0) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const normalizeImages = (raw: DBProductRaw): string[] => {
  const fromArray = Array.isArray(raw.images)
    ? raw.images
      .map((x) => (x && typeof x === "object" ? toStr((x as any).url) : null))
      .filter((u): u is string => !!u)
    : [];
  const single = toStr(raw.image);
  const out = [...fromArray];
  if (single && !out.includes(single)) out.unshift(single);
  return out;
};

const normalizeIngredients = (ing: DBProductRaw["ingredients"]): string[] => {
  if (Array.isArray(ing)) return ing.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean);
  if (typeof ing === "string") return ing.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
};

const normalizeProduct = (raw: DBProductRaw | null): DBProduct | null => {
  if (!raw) return null;
  const images = normalizeImages(raw);
  const ingredients = normalizeIngredients(raw.ingredients);
  const descriptionPoints = Array.isArray(raw.descriptionPoints)
    ? raw.descriptionPoints.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : [];
  const discountPercentage = typeof raw.discountPercentage === "number" && raw.discountPercentage > 0 && raw.discountPercentage <= 100
    ? raw.discountPercentage
    : undefined;
  
  return {
    _id: raw._id,
    sku: raw.sku,
    name: raw.name,
    price: toNum(raw.price, 0),
    images,
    pack: raw.pack,
    stock: typeof raw.stock === "number" ? raw.stock : null,
    tag: raw.tag ?? null,
    about: toStr(raw.about),
    ingredients,
    description: toStr(raw.description),
    descriptionPoints,
    steepingInstructions: Array.isArray(raw.steepingInstructions) ? raw.steepingInstructions : null,
    discountPercentage,
  };
};

const fixPath = (src?: string | null) => (src ? src : "/product-placeholder.png");

// Check if a URL is a video file
const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  // Check for video file extensions
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
  // Check for Cloudinary video URLs (they often have /video/upload/ in the path)
  return videoExtensions.some(ext => lowerUrl.includes(ext)) || 
         lowerUrl.includes('/video/upload/') ||
         lowerUrl.includes('resource_type=video');
};

const getSteepingSteps = (p: DBProduct | null) =>
  Array.isArray(p?.steepingInstructions) && p!.steepingInstructions!.length
    ? (p!.steepingInstructions as string[])
    : DEFAULT_STEEPING;

/* ---------------- API ---------------- */
async function fetchProduct(id: string): Promise<DBProduct | null> {
  const res = await fetch(buildUrl(`/api/products/${id}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await res.text());
  return normalizeProduct((await res.json()) as DBProductRaw);
}
async function fetchExplore(currentId: string): Promise<DBProduct[]> {
  const res = await fetch(buildUrl(`/api/products`), { cache: "no-store" });
  if (!res.ok) return [];
  const list = (await res.json()) as DBProductRaw[];
  return list
    .filter((p) => String(p._id) !== currentId)
    .map(normalizeProduct)
    .filter((p): p is DBProduct => !!p)
    .slice(0, 8);
}

/* ---------------- Pincode auto-detect ---------------- */
const isPin = (s: unknown) => typeof s === "string" && /^\d{6}$/.test(s);
async function timeout<T>(p: Promise<T>, ms = 3000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Timeout")), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}
async function detectUserPincode(): Promise<string | null> {
  try {
    // 1) URL ?pin=XXXXXX
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const qsPin = url.searchParams.get("pin");
      if (isPin(qsPin)) return qsPin!;
    }
    // 2) localStorage cache
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(PIN_LOCAL_KEY);
      if (isPin(cached)) return cached!;
    }
    // 3) Server IP → pin
    try {
      const res = await timeout(fetch(buildUrl("/api/geo/my-pincode"), { cache: "no-store" }), 2500);
      if (res.ok) {
        const js = (await res.json()) as { pincode?: string };
        if (isPin(js?.pincode)) return js.pincode!;
      }
    } catch { }
    // 4) Geolocation → server reverse geocode
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            maximumAge: 60_000,
            timeout: 4000,
          })
        );
        const { latitude, longitude } = pos.coords;
        const r = await timeout(
          fetch(buildUrl(`/api/geo/pincode?lat=${latitude}&lng=${longitude}`), { cache: "no-store" }),
          3000
        );
        if (r.ok) {
          const js = (await r.json()) as { pincode?: string };
          if (isPin(js?.pincode)) return js.pincode!;
        }
      } catch { }
    }
  } catch { }
  return null;
}

/* ====================================================================================== */

export default function ProductDetailPage() {
  const { add } = useCart();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");

  const [product, setProduct] = useState<DBProduct | null>(null);
  const [explore, setExplore] = useState<DBProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [wish, setWish] = useState<Set<string>>(new Set());
  const productIdStr = product?._id ?? "";
  const liked = product ? wish.has(productIdStr) : false;

  // gallery
  const gallery: string[] = useMemo(() => product?.images ?? [], [product]);
  const first = gallery[0] || "/product-placeholder.png";
  const [selectedImage, setSelectedImage] = useState<string>(fixPath(first));
  useEffect(() => setSelectedImage(fixPath(first)), [first]);

  useEffect(() => setWish(loadWishlist()), []);
  const toggleWish = useCallback((pid: string, name?: string) => {
    setWish((prev) => {
      const next = new Set(prev);
      const toastId = `wish:${pid}`;
      if (next.has(pid)) {
        next.delete(pid);
        saveWishlist(next);
        toast("Removed from wishlist", { id: toastId, description: name });
      } else {
        next.add(pid);
        saveWishlist(next);
        toast.success("Added to wishlist", { id: toastId, description: name });
      }
      return next;
    });
  }, []);

  // fetch product + explore
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchProduct(id);
        if (!alive) return;
        setProduct(data);
        if (data) {
          // Track ViewContent for Meta Pixel with complete catalog data
          trackMetaViewContent(String(data._id), data.name, Number(data.price) || 0, {
            sku: data.sku,
            category: data.tag || undefined,
            brand: "Wild n' Root",
          });
          
          const more = await fetchExplore(String(data._id));
          if (!alive) return;
          setExplore(more);
        } else {
          setExplore([]);
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to load product");
        setProduct(null);
        setExplore([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = true; // noop
    };
  }, [id]);

  /* -------- serviceability state -------- */
  const [pincode, setPincode] = useState("");
  const [deliveryMsg, setDeliveryMsg] = useState("");
  const [quantity, setQuantity] = useState(1);
  const inStock = product?.stock == null ? true : product.stock > 0;

  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinResult, setPinResult] = useState<V1Normalized | null>(null);

  const [selectedCourierIdx, setSelectedCourierIdx] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(SEL_COURIER_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { index?: unknown };
      return typeof parsed?.index === "number" ? parsed.index : null;
    } catch {
      return null;
    }
  });

  // Keep this for top summary sentence; we'll ensure result has exactly one option.
  const sortedCouriers = useMemo(() => {
    const list = pinResult?.result || [];
    return [...list].sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  }, [pinResult]);
  const fastest = sortedCouriers[0];

  const saveSelectedCourier = (opt: V1CourierOption) => {
    try {
      localStorage.setItem(SEL_COURIER_KEY, JSON.stringify({ type: opt.type, index: opt.index }));
    } catch { }
  };

  /* Try cached serviceability first, else hit API — force SINGLE "Standard Delivery" option */
  const handleCheckPincode = async (pinFromArg?: string) => {
    setPinError(null);
    setDeliveryMsg("");
    const pin = (pinFromArg ?? pincode ?? "").trim();

    if (!/^\d{6}$/.test(pin)) {
      setPinResult(null);
      setDeliveryMsg("Enter a valid 6-digit pincode.");
      return;
    }

    // 1) cached?
    const cached = getCache<V1Normalized>(svcKey(pin));
    if (cached) {
      const list = [...(cached.result || [])].sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
      const firstOpt = list[0];
      const single: V1CourierOption | null = firstOpt
        ? { ...firstOpt, type: "Standard Delivery" }
        : null;

      const finalData: V1Normalized = {
        zone: cached.zone ?? null,
        result: single ? [single] : [],
      };

      setPinResult(finalData);
      // setDeliveryMsg(`Great news! Delivery is available to ${pin}${finalData.zone ? ` • Zone: ${finalData.zone}` : ""}.`);
      setDeliveryMsg(`Great news! Delivery is available to ${pin}.`);

      try {
        localStorage.setItem(PIN_LOCAL_KEY, pin);
      } catch { }

      if (single) {
        if (selectedCourierIdx == null) setSelectedCourierIdx(single.index);
        saveSelectedCourier(single);
      }
      return;
    }

    // 2) fetch
    setPinResult(null);
    try {
      setPinLoading(true);
      const res = await fetch(buildUrl("/api/serviceability"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryPincode: pin }),
      });

      if (res.status === 200) {
        const data = (await res.json()) as V1Normalized;

        const list = [...(data.result || [])].sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
        const firstOpt = list[0];
        const single: V1CourierOption | null = firstOpt
          ? { ...firstOpt, type: "Standard Delivery" }
          : null;

        const finalData: V1Normalized = {
          zone: data.zone ?? null,
          result: single ? [single] : [],
        };

        setPinResult(finalData);
        setDeliveryMsg(`Great news! Delivery is available to ${pin}${finalData.zone ? ` • Zone: ${finalData.zone}` : ""}.`);
        try {
          localStorage.setItem(PIN_LOCAL_KEY, pin);
        } catch { }
        setCache<V1Normalized>(svcKey(pin), finalData, SVC_TTL_MS);

        if (single) {
          if (selectedCourierIdx == null) setSelectedCourierIdx(single.index);
          saveSelectedCourier(single);
        }
      } else if (res.status === 400) {
        setDeliveryMsg("");
        setPinResult(null);
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setPinError(data?.message || "This pincode is not serviceable.");
      } else {
        console.error("Serviceability error:", await res.text());
        setPinError("Could not check serviceability. Please try again.");
      }
    } catch (e) {
      console.error(e);
      setPinError("Network error. Please try again.");
    } finally {
      setPinLoading(false);
    }
  };

  /* Auto-detect pincode and auto-check */
  useEffect(() => {
    let done = false;
    (async () => {
      const autoPin = await detectUserPincode();
      if (done) return;
      if (isPin(autoPin)) {
        setPincode(autoPin!);
        void handleCheckPincode(autoPin!);
      }
    })();
    return () => {
      done = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Cart actions ---------------- */
  const handleAddToCart = async (qty = quantity) => {
    if (!product) {
      toast("Product not found");
      return;
    }
    try {
      await add(String(product._id), qty);
      toast.success("Added to cart", {
        description: `${qty} × ${product.name}`,
        action: { label: "Checkout", onClick: () => router.push("/checkout") },
      });
      // GA4: add_to_cart
      trackAddToCart([{ item_id: String(product._id), item_name: product.name, price: Number(product.price) || 0, quantity: qty }]);
      // Meta Pixel: AddToCart with complete catalog data
      trackMetaAddToCart([{
        id: String(product._id),
        name: product.name,
        price: Number(product.price) || 0,
        quantity: qty,
        sku: product.sku,
        category: product.tag || undefined,
        brand: "Wild n' Root",
      }]);
    } catch (e: any) {
      toast.error(e?.message || "Could not add to cart");
    }
  };

  const handleBuyNow = async () => {
    if (!product) {
      toast("Product not found");
      return;
    }
    try {
      // add then go to explicit buynow mode so checkout can compute price/totals reliably
      await add(String(product._id), quantity);
      const courierIdx = selectedCourierIdx ?? fastest?.index ?? "";
      // GA4: begin_checkout
      trackBeginCheckout([{ item_id: String(product._id), item_name: product.name, price: Number(product.price) || 0, quantity: quantity }], (Number(product.price) || 0) * quantity);
      // Meta Pixel: InitiateCheckout with complete catalog data
      trackMetaInitiateCheckout([{
        id: String(product._id),
        name: product.name,
        price: Number(product.price) || 0,
        quantity: quantity,
        sku: product.sku,
        category: product.tag || undefined,
        brand: "Wild n' Root",
      }], (Number(product.price) || 0) * quantity);
      router.push(`/checkout?mode=buynow&id=${encodeURIComponent(product._id)}&qty=${quantity}&courier=${courierIdx}`);
    } catch (e: any) {
      toast.error(e?.message || "Could not proceed to checkout");
    }
  };

  const handleAddSuggested = async (pid: string) => {
    try {
      await add(pid, 1);
      const p = explore.find((x) => String(x._id) === pid);
      toast.success("Added to cart", {
        description: `${p?.name ?? "Product"}`,
        action: { label: "Checkout", onClick: () => router.push("/checkout") },
      });
    } catch (e: any) {
      toast.error(e?.message || "Could not add");
    }
  };

  const notFound = !loading && !product;

  return (
    <main className="bg-white text-gray-900 min-h-screen mt-[calc(var(--navbar-height-mobile,5.5rem)+var(--offer-strip-height,0px))] md:mt-[calc(var(--navbar-height-desktop,7rem)+var(--offer-strip-height,0px))]">
      {loading && (
        <section className="py-24">
          <div className="max-w-5xl mx-auto p-6">
            <div className="h-8 w-56 bg-black/5 rounded mb-6 animate-pulse" />
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="h-80 bg-black/5 rounded animate-pulse" />
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={`sk-${i}`} className="h-16 bg-black/5 rounded animate-pulse" />
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-6 bg-black/5 rounded w-2/3 animate-pulse" />
                <div className="h-6 bg-black/5 rounded w-1/3 animate-pulse" />
                <div className="h-24 bg-black/5 rounded animate-pulse" />
                <div className="h-32 bg-black/5 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </section>
      )}

      {notFound && (
        <section className="py-24">
          <div className="max-w-3xl mx-auto p-6 text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--wnr-berry)]">Product not found</h1>
            <p className="mt-2 text-gray-600">The product you’re looking for doesn’t exist. Explore our other blends:</p>
            <div className="mt-6">
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-full px-5 py-2.5 bg-[var(--wnr-berry)] text-white hover:opacity-90"
              >
                Browse Products
              </Link>
            </div>
          </div>
        </section>
      )}

      {!loading && product && (
        <>
          {/* Title and Price on mobile - side by side */}
          <section className="pt-8 pb-2 px-4 md:hidden">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-[var(--wnr-berry)] flex-1 min-w-0">{product.name}</h1>
              <div className="flex items-center gap-2 shrink-0">
                {product.discountPercentage && product.discountPercentage > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-base text-gray-400 line-through">₹{product.price.toLocaleString("en-IN")}</span>
                    <span className="text-3xl font-extrabold text-[var(--wnr-berry)]">
                      ₹{Math.round(product.price * (1 - product.discountPercentage / 100)).toLocaleString("en-IN")}
                    </span>
                  </div>
                ) : (
                  <span className="text-3xl font-extrabold text-[var(--wnr-berry)]">
                    ₹{product.price.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            </div>
            {product.discountPercentage && product.discountPercentage > 0 && (
              <div className="mt-2">
                <div className="relative inline-block">
                  {/* Main badge with gradient */}
                  <div className="relative inline-flex items-center gap-1.5 bg-gradient-to-br from-red-500 via-red-600 to-red-700 text-white text-xs sm:text-sm font-extrabold px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg shadow-[0_4px_12px_rgba(239,68,68,0.4)] transform transition-all duration-300">
                    {/* Shine effect */}
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
                    
                    {/* Badge content */}
                    <div className="relative flex items-center gap-1">
                      <span className="leading-none tracking-tight">{product.discountPercentage}%</span>
                      <span className="text-[10px] sm:text-xs leading-none opacity-90">OFF</span>
                    </div>
                    
                    {/* Decorative corner accent */}
                    <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white rounded-full opacity-80 shadow-sm" />
                  </div>
                  
                  {/* Floating glow effect */}
                  <div className="absolute inset-0 bg-red-500/30 rounded-lg blur-md -z-10 animate-pulse" />
                </div>
              </div>
            )}
          </section>

          <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 md:mt-28 grid md:grid-cols-2 gap-3 sm:gap-4 md:gap-8">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Main image/video */}
                <div className="relative flex-1 rounded-lg overflow-hidden order-1 md:order-2">
                  {isVideoUrl(selectedImage) ? (
                    <video
                      src={selectedImage}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-auto object-cover"
                      style={{ width: "100%", height: "auto" }}
                    />
                  ) : (
                    <Image
                      src={selectedImage}
                      alt={product.name}
                      width={900}
                      height={900}
                      priority
                      style={{ width: "100%", height: "auto" }}
                      className="object-cover transition-transform duration-300"
                      sizes="(min-width: 768px) 50vw, 100vw"
                    />
                  )}
                  {product.tag ? (
                    <span className="bg-rose-900 absolute top-3 left-3 text-white px-3 py-1 text-sm rounded-full shadow z-10">
                      {product.tag}
                    </span>
                  ) : null}
                </div>

                {/* Thumbnails */}
                <div className="flex flex-row md:flex-col gap-2 md:gap-4 overflow-x-auto md:overflow-visible order-2 md:order-1 pb-1 md:pb-0">
                  {(gallery.length ? gallery : [first]).map((img, idx) => {
                    const src = fixPath(img);
                    const isVideo = isVideoUrl(src);
                    return (
                      <button
                        key={`${src}-${idx}`}
                        onClick={() => setSelectedImage(src)}
                        className={`rounded-md overflow-hidden flex-shrink-0 ${selectedImage === src ? "ring-2 ring-[var(--wnr-berry)]" : ""
                          }`}
                        aria-label={`${product.name} ${isVideo ? 'video' : 'image'} ${idx + 1}`}
                      >
                        {isVideo ? (
                          <video
                            src={src}
                            muted
                            className="w-16 h-16 sm:w-20 sm:h-20 md:w-20 md:h-20 object-cover"
                          />
                        ) : (
                          <Image
                            src={src}
                            alt={`${product.name} ${idx + 1}`}
                            width={80}
                            height={80}
                            className="w-16 h-16 sm:w-20 sm:h-20 md:w-20 md:h-20 object-cover"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6 md:space-y-8">
                <section>
                  <h3 className="text-lg md:text-xl font-bold mb-2">About Product</h3>
                  <p className="text-gray-700 text-sm md:text-base leading-relaxed">
                    {product.about ?? "Crafted with pantry classics & treasured botanicals for a delicious daily ritual."}
                  </p>
                </section>

                <section>
                  <h3 className="text-lg md:text-xl font-bold mb-2">Steeping Instructions</h3>
                  <ol className="list-decimal list-inside space-y-1 text-gray-700 text-sm md:text-base leading-relaxed">
                    {getSteepingSteps(product).map((line, i) => (
                      <li key={`step-${i}`}>{line}</li>
                    ))}
                  </ol>
                </section>

                <section>
                  <h3 className="text-lg md:text-xl font-bold mb-2">Ingredients</h3>
                  <p className="text-gray-700 text-sm md:text-base leading-relaxed">
                    {product.ingredients.length ? product.ingredients.join(", ") : "Organic blend"}
                  </p>
                </section>
              </div>
            </div>

            <div className="space-y-4 md:space-y-6 md:sticky md:top-24 self-start">
              {/* Product Name and Price - Side by Side */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h1 className="hidden md:block text-3xl font-bold text-[var(--wnr-berry)] flex-1 min-w-0">{product.name}</h1>
                <div className="flex items-center gap-3 shrink-0">
                  {product.discountPercentage && product.discountPercentage > 0 ? (
                    <>
                      <span className="text-lg md:text-xl text-gray-400 line-through" aria-label="Original price">
                        ₹{product.price.toLocaleString("en-IN")}
                      </span>
                      <span 
                        className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[var(--wnr-berry)] drop-shadow-sm"
                        itemProp="price"
                        content={Math.round(product.price * (1 - product.discountPercentage / 100)).toString()}
                      >
                        ₹{Math.round(product.price * (1 - product.discountPercentage / 100)).toLocaleString("en-IN")}
                      </span>
                    </>
                  ) : (
                    <span 
                      className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[var(--wnr-berry)] drop-shadow-sm"
                      itemProp="price"
                      content={product.price.toString()}
                    >
                      ₹{product.price.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              </div>

              {/* Out of Stock Badge */}
              {!inStock && (
                <div className="inline-block">
                  <div className="relative">
                    <div className="relative inline-flex items-center gap-1.5 bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 text-white text-sm font-extrabold px-4 py-2 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
                      <div className="relative flex items-center gap-1">
                        <span className="leading-none tracking-tight">OUT OF STOCK</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Discount Badge - Floating Designer Style */}
              {inStock && product.discountPercentage && product.discountPercentage > 0 && (
                <div className="inline-block">
                  <div className="relative">
                    {/* Main badge with gradient */}
                    <div className="relative inline-flex items-center gap-1.5 bg-gradient-to-br from-red-500 via-red-600 to-red-700 text-white text-sm font-extrabold px-4 py-2 rounded-lg shadow-[0_4px_12px_rgba(239,68,68,0.4)] transform transition-all duration-300 hover:scale-105">
                      {/* Shine effect */}
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
                      
                      {/* Badge content */}
                      <div className="relative flex items-center gap-1">
                        <span className="leading-none tracking-tight">{product.discountPercentage}%</span>
                        <span className="text-xs leading-none opacity-90">OFF</span>
                      </div>
                      
                      {/* Decorative corner accent */}
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full opacity-80 shadow-sm" />
                    </div>
                    
                    {/* Floating glow effect */}
                    <div className="absolute inset-0 bg-red-500/30 rounded-lg blur-md -z-10 animate-pulse" />
                  </div>
                </div>
              )}

              <p className="text-gray-700 text-sm md:text-base leading-relaxed">
                {product.description ?? "A premium small-batch blend designed for taste, calm focus, and daily comfort."}
              </p>

              {product.descriptionPoints.length > 0 && (
                <section>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm md:text-base leading-relaxed">
                    {product.descriptionPoints.map((pt, i) => (
                      <li key={`pt-${i}`}>{pt}</li>
                    ))}
                  </ul>
                </section>
              )}

              <div>
                <h5 className="font-semibold text-sm sm:text-base">Check Delivery</h5>
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <input
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={6}
                    placeholder="Enter 6-digit pincode"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="border rounded-md p-2 sm:p-2.5 text-sm sm:text-base flex-1 min-w-0"
                  />
                  <button
                    onClick={() => void handleCheckPincode()}
                    className="bg-[var(--wnr-berry)] text-white px-4 py-2 sm:py-2.5 rounded-md disabled:opacity-60 text-sm sm:text-base font-medium min-h-[44px] whitespace-nowrap"
                    disabled={pinLoading}
                  >
                    {pinLoading ? "Checking..." : "Check"}
                  </button>
                </div>

                {deliveryMsg && <p className="text-sm text-green-700 mt-2">{deliveryMsg}</p>}
                {pinError && <p className="text-sm text-red-600 mt-2">{pinError}</p>}

                {/* Single, non-interactive Standard Delivery card */}
                {sortedCouriers.length > 0 && fastest && (
                  <div className="mt-3 rounded-lg border p-3 bg-white">
                    <p className="text-sm text-gray-700 mb-0">
                      Delivery option: <strong>Standard Delivery</strong> • ETA: <strong>{fastest.etd}</strong>
                    </p>
                  </div>
                )}

              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <span className="font-medium text-gray-700 text-sm sm:text-base">Quantity:</span>
                <div className="flex items-center border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 hover:bg-gray-300 min-w-[40px] text-base sm:text-lg font-semibold"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="px-3 sm:px-4 py-1.5 sm:py-2 min-w-[50px] text-center text-sm sm:text-base font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 hover:bg-gray-300 min-w-[40px] text-base sm:text-lg font-semibold"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <button
                  onClick={() => void handleAddToCart(quantity)}
                  className="flex-1 flex items-center justify-center gap-2 bg-[var(--wnr-berry)] text-white py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-semibold hover:opacity-90 transition min-h-[44px]"
                  disabled={!inStock}
                >
                  <IoBagHandleOutline size={16} className="flex-shrink-0" />
                  <span className="whitespace-nowrap">Add to Cart</span>
                </button>
                <button
                  onClick={() => void handleBuyNow()}
                  className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 text-black py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-semibold hover:bg-yellow-600 transition disabled:opacity-60 min-h-[44px]"
                  disabled={!inStock}
                >
                  <IoFlashOutline className="w-5 h-5 flex-shrink-0" />
                  <span className="whitespace-nowrap">Buy Now</span>
                </button>
              </div>
            </div>
          </div>

          {/* ✅ Correct Product JSON-LD — using current `product` */}
          <ProductJsonLd
            id={product._id}
            name={product.name}
            description={product.description || product.about || undefined}
            images={product.images.length ? product.images : ["/product-placeholder.png"]}
            brand="Wild n' Root"
            sku={product.sku}
            // gtin can be added if you have it on product
            category="Herbal Tea"
            aggregateRating={{ ratingValue: 4.8, reviewCount: 128 }}
            offer={{
              price: product.price,
              priceCurrency: "INR",
              availability: (product.stock == null || product.stock > 0) ? "InStock" : "OutOfStock",
              url: `/products/${product._id}`,
              seller: { name: "Wild n' Root" },
              shippingRate: 0,
              shippingCountry: "IN",
            }}
          />

          {/* ✅ Breadcrumbs JSON-LD for product detail */}
          <BreadcrumbsJsonLd
            id={`product-${product._id}`}
            items={[
              { name: "Home", url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.wildnroot.com"}/` },
              { name: "Products", url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.wildnroot.com"}/products` },
              { name: product.name, url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.wildnroot.com"}/products/${product._id}` },
            ]}
          />

          {/* ===================== DAILY RITUALS (STYLISH) ===================== */}
          <section className="relative overflow-hidden py-16 md:py-24">
            <div className="relative max-w-7xl mx-auto px-4 md:px-8 text-center">
              <div className="mb-12">
                <h2 className="text-2xl md:text-4xl font-bold text-[var(--wnr-berry)] tracking-tight mb-3 animate-fade-in">
                  Daily Rituals for Better Results
                </h2>
                <div className="mx-auto w-24 h-[3px] bg-[var(--wnr-berry)] rounded-full mb-4" />
                <p className="text-gray-700 max-w-3xl mx-auto text-sm md:text-base leading-relaxed">
                  Pair your brews with these mindful routines for balanced energy, improved digestion,
                  and overall wellness. Small steps, practiced daily, bring lasting transformation.
                </p>
              </div>

              {/* Ritual Cards — last two centered on large screens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 md:gap-8">
                {[
                  {
                    title: "Power Brew — Energy & Focus",
                    tips: [
                      "Start your morning with a 10-minute stretch or walk.",
                      "Avoid heavy caffeine; rely on natural energy.",
                      "Include protein-rich breakfast with fruits.",
                      "Keep hydrated through the day with herbal sips."
                    ],
                  },
                  {
                    title: "Gutease Brew — Gut Comfort",
                    tips: [
                      "Walk 20-30 minutes daily, especially post meals.",
                      "Avoid processed or oily food for 21 days.",
                      "Eat slowly and chew thoroughly.",
                      "Stay consistent to feel light and energized."
                    ],
                  },
                  {
                    title: "Sugarwise Brew — Balanced Lifestyle",
                    tips: [
                      "Prefer millet or whole-grain meals over refined carbs.",
                      "Add yoga and deep-breathing for glucose balance.",
                      "Reduce refined sugar; sweeten naturally.",
                      "Enjoy your brew daily for visible results."
                    ],
                  },
                  {
                    title: "Digestive Brew — Light & Easy",
                    tips: [
                      "Drink warm water after meals for easy digestion.",
                      "Eat smaller portions, more frequently.",
                      "Add fibre-rich foods and probiotics.",
                      "Avoid late-night heavy dinners."
                    ],
                  },
                  {
                    title: "Slim Brew — Weight Management",
                    tips: [
                      "Follow a 12-hour fasting window (e.g., 8 PM – 8 AM).",
                      "Focus on protein & fibre for satiety.",
                      "Move daily — yoga, walks, or dance.",
                      "Sleep 7–8 hours for hormonal balance."
                    ],
                  },
                ].map((ritual, i) => {
                  const base =
                    "group relative rounded-3xl bg-white ring-1 ring-black/5 shadow-md hover:shadow-xl transition-all duration-300 p-6 md:p-8 text-left hover:scale-[1.03] hover:ring-[var(--wnr-berry)]";
                  const span = "lg:col-span-2";
                  const center = i === 3 ? "lg:col-start-2" : i === 4 ? "lg:col-start-4" : "";
                  return (
                    <article key={i} className={`${base} ${span} ${center}`}>
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[var(--wnr-berry)]/5 rounded-3xl pointer-events-none" />
                      <h3 className="text-[var(--wnr-berry)] font-semibold text-lg md:text-xl mb-3">
                        {ritual.title}
                      </h3>
                      <ul className="list-disc list-inside space-y-2 text-gray-700 text-sm md:text-base leading-relaxed">
                        {ritual.tips.map((t, j) => (
                          <li key={j}>{t}</li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
          {/* =================== / DAILY RITUALS (STYLISH) =================== */}

          {/* Reviews Section */}
          <ProductReviews productId={String(product._id)} />

          <section className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 md:mb-6 text-center text-[var(--wnr-berry)]">
              Explore More Products
            </h2>
            {explore.length === 0 ? (
              <div className="text-center opacity-70 text-sm sm:text-base">No other products yet.</div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                {explore.map((p) => {
                  const pid = String(p._id);
                  const cover = fixPath(p.images[0]);
                  const likedSmall = wish.has(pid);
                  const pack = p.pack ?? "15 DIP BAGS";
                  const price = p.price ?? 399;

                  return (
                    <li key={pid} className="rounded-2xl ring-1 ring-black/5 bg-white shadow-soft overflow-hidden group">
                      <div className="relative aspect-square">
                        <Link href={`/products/${pid}`} className="absolute inset-0 block" aria-label={p.name || "Product"}>
                          <Image
                            src={cover}
                            alt={p.name || "Product"}
                            fill
                            className="object-cover"
                            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                          />
                        </Link>
                        <button
                          type="button"
                          aria-label={likedSmall ? "Remove from wishlist" : "Add to wishlist"}
                          aria-pressed={likedSmall}
                          onClick={() => toggleWish(pid, p.name)}
                          className={`absolute top-2 right-2 z-10 grid place-items-center h-9 w-9 rounded-full backdrop-blur bg-white/90 ring-1 ring-black/10 transition ${likedSmall ? "text-[var(--wnr-pink)]" : "text-[var(--wnr-berry)]"
                            } hover:bg-white`}
                        >
                          {likedSmall ? <FaHeart size={16} /> : <CiHeart size={18} />}
                        </button>
                      </div>

                      <div className="p-3 sm:p-4">
                        <Link
                          href={`/products/${pid}`}
                          className="font-semibold text-sm sm:text-base line-clamp-2 hover:text-[var(--wnr-berry)]"
                        >
                          {p.name || "Product"}
                        </Link>

                        <div className="text-xs text-gray-500 mt-1">{pack}</div>
                        <div className="mt-2 text-xl sm:text-2xl font-extrabold text-[var(--wnr-berry)]">₹{price}</div>

                        <div className="mt-3 flex flex-col sm:flex-row gap-2">
                          {/* Add to Cart */}
                          <button
                            type="button"
                            aria-label={`Add ${p.name || "product"} to cart`}
                            onClick={() => void handleAddSuggested(pid)}
                            className="flex-1 min-h-[40px] sm:h-10 px-3 sm:px-4 rounded-full grid place-items-center
                                       ring-1 ring-black/10 bg-white hover:bg-black/5
                                       text-[var(--wnr-text)] shadow-sm
                                       transition-[background,transform,box-shadow] duration-200
                                       active:scale-[0.98] focus:outline-none
                                       focus-visible:ring-2 focus-visible:ring-[var(--wnr-berry)]/50"
                          >
                            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium whitespace-nowrap">
                              <IoBagHandleOutline size={14} className="sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline">Add</span>
                              <span className="sm:hidden">Add to Cart</span>
                            </span>
                          </button>

                          {/* View Product */}
                          <Link
                            href={`/products/${pid}`}
                            aria-label={`View details of ${p.name || "product"}`}
                            className="flex-1 min-h-[40px] sm:h-10 px-3 sm:px-4 rounded-full grid place-items-center
                                       bg-[var(--wnr-berry)] text-white hover:opacity-90
                                       shadow-soft transition-[opacity,transform,box-shadow] duration-200
                                       active:scale-[0.98] focus:outline-none
                                       focus-visible:ring-2 focus-visible:ring-[var(--wnr-berry)]/60"
                          >
                            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold whitespace-nowrap">
                              View
                              <span aria-hidden className="hidden sm:inline">→</span>
                            </span>
                          </Link>
                        </div>
                      </div>

                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
