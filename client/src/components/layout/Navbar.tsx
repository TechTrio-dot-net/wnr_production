// src/components/layout/Navbar.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CiHeart, CiSearch } from "react-icons/ci";
import {
  IoBagHandleOutline,
  IoClose,
  IoLogOutOutline,
  IoPersonCircleOutline,
} from "react-icons/io5";
import { Coins } from "lucide-react";
import CartDrawer from "@/components/cart/CartDrawer";
import SearchDrawer from "@/components/search/SearchDrawer";
import { useUser } from "@/context/UserContext";
import { useCart } from "@/context/CartContext";
import { buildUrl } from "@/lib/api"; // ✅ To build backend URLs
import OfferStrip from "@/components/layout/OfferStrip";

/* ------------------------------ Types ------------------------------ */
type CartItem = { qty?: number; quantity?: number; [k: string]: unknown };
type CartSummary =
  | { count?: number; totalQty?: number; totalQuantity?: number; items?: CartItem[] }
  | null;
type WishlistSummary =
  | { count?: number; total?: number; length?: number; items?: unknown[] }
  | null;

import { getAuthHeader, hasToken } from "@/lib/token";

/* ------------------------------ Helpers ------------------------------ */
async function fetchJSON<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const authHeaders = getAuthHeader();
  
  const res = await fetch(url, { 
    cache: "no-store", 
    ...init,
    headers: {
      ...authHeaders,
      ...init?.headers,
    }
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json() as Promise<T>;
}

function extractCartCount(summary: CartSummary, ctx: any): number {
  if (summary && typeof summary === "object") {
    const direct = Number(summary.count ?? summary.totalQty ?? summary.totalQuantity);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const items = Array.isArray(summary.items) ? summary.items : [];
    if (items.length) {
      return items.reduce<number>(
        (acc, it) => acc + (Number((it as any).qty ?? (it as any).quantity ?? 1) || 1),
        0
      );
    }
  }
  if (ctx && typeof ctx === "object") {
    const direct = Number(ctx.count ?? ctx.totalQty ?? ctx.totalQuantity ?? ctx.qty);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const items = Array.isArray(ctx.items) ? (ctx.items as CartItem[]) : [];
    if (items.length) {
      return items.reduce<number>(
        (acc, it) => acc + (Number((it as any).qty ?? (it as any).quantity ?? 1) || 1),
        0
      );
    }
  }
  return 0;
}

function extractWishlistCount(summary: WishlistSummary): number {
  const data = summary;
  if (!data || typeof data !== "object") return 0;
  const direct = Number((data as any).count ?? (data as any).total ?? (data as any).length);
  if (Number.isFinite(direct) && direct >= 0) return direct;
  const itemsLen = Array.isArray((data as any).items) ? (data as any).items.length : 0;
  return itemsLen || 0;
}

/** Tiny dot badge (8px) – visible only when active */
const DotBadge = ({ active }: { active: boolean }) =>
  active ? (
    <span
      className="absolute top-0 right-0 translate-x-1 -translate-y-1 w-2 h-2 rounded-full border-2 border-white bg-current"
      aria-hidden="true"
    />
  ) : null;

/* =================================================================== */

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  const [cartSummary, setCartSummary] = useState<CartSummary>(null);
  const [wishSummary, setWishSummary] = useState<WishlistSummary>(null);
  const [wishlistLocalCount, setWishlistLocalCount] = useState(0);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);

  const WISHLIST_KEY = "wnr:wishlist";

  const { user, loading, logout } = useUser();
  const pathname = usePathname() || "/";
  const router = useRouter();
  const isHome = pathname === "/";

  // Cart context fallback (for immediate UI feedback)
  const cartCtx: any = useCart?.() ?? {};
  const cartCount = useMemo(() => extractCartCount(cartSummary, cartCtx), [cartSummary, cartCtx]);

  // Final wishlist count = API summary OR localStorage fallback (whichever is > 0)
  const wishlistCount = useMemo(() => {
    const api = extractWishlistCount(wishSummary);
    return Math.max(api || 0, wishlistLocalCount || 0);
  }, [wishSummary, wishlistLocalCount]);

  /* -------------------- Fetch from backend -------------------- */
  const refreshCart = useCallback(async () => {
    // ✅ Only fetch if user is logged in (token exists)
    if (!hasToken()) {
      setCartSummary(null);
      return;
    }
    try {
      const data = await fetchJSON<CartSummary>(buildUrl("/api/cart/summary"));
      setCartSummary(data);
    } catch {
      /* silent */
    }
  }, []);

  const refreshWishlist = useCallback(async () => {
    // ✅ Only fetch if user is logged in (token exists)
    if (!hasToken()) {
      setWishSummary(null);
      return;
    }
    try {
      const data = await fetchJSON<WishlistSummary>(buildUrl("/api/wishlist/summary"));
      setWishSummary(data);
    } catch {
      /* silent */
    }
  }, []);

  const refreshRewards = useCallback(async () => {
    if (!hasToken()) {
      setCoinBalance(null);
      return;
    }
    try {
      const data = await fetchJSON<{ balance?: number }>(buildUrl("/api/rewards/balance"));
      setCoinBalance(typeof data?.balance === "number" ? data.balance : 0);
    } catch {
      /* silent */
    }
  }, []);

  // localStorage fallback reader
  const readWishlistLocal = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(WISHLIST_KEY);
      const arr = raw ? (JSON.parse(raw) as unknown[]) : [];
      setWishlistLocalCount(Array.isArray(arr) ? arr.length : 0);
    } catch {
      setWishlistLocalCount(0);
    }
  }, []);

  useEffect(() => {
    // initial
    refreshCart();
    refreshWishlist();
    refreshRewards();
    readWishlistLocal();

    // focus/visibility revalidate
    const onFocus = () => {
      refreshCart();
      refreshWishlist();
      readWishlistLocal();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("visibilitychange", onFocus);

    // app-wide mutation events
    const onCartChanged = () => refreshCart();
    const onWishlistChanged = () => {
      refreshWishlist();
      readWishlistLocal();
    };
    window.addEventListener("wnr:cart:changed", onCartChanged as EventListener);
    window.addEventListener("wnr:wishlist:changed", onWishlistChanged as EventListener);
    window.addEventListener("wnr:rewards:changed", refreshRewards as EventListener);

    // cross-tab storage updates
    const onStorage = (e: StorageEvent) => {
      if (e.key === WISHLIST_KEY) readWishlistLocal();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("wnr:cart:changed", onCartChanged as EventListener);
      window.removeEventListener("wnr:wishlist:changed", onWishlistChanged as EventListener);
      window.removeEventListener("wnr:rewards:changed", refreshRewards as EventListener);
      window.removeEventListener("storage", onStorage);
    };
    // callbacks are stable (useCallback with empty deps), so no deps needed here
  }, []);

  /* 🔐 When user logs out (or becomes null), hard-clear wishlist badge + summary */
  useEffect(() => {
    if (loading) return;
    if (!user) {
      setWishSummary(null);
      setWishlistLocalCount(0);
      try {
        if (typeof window !== "undefined") window.localStorage.removeItem(WISHLIST_KEY);
      } catch {}
    } else {
      // user present → ensure fresh counts
      refreshWishlist();
      refreshRewards();
      readWishlistLocal();
    }
  }, [user, loading]);

  /* -------------------- Scroll hide/show and color swap -------------------- */
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      if (y > lastScrollY && y > 100) setVisible(false);
      else setVisible(true);
      setScrolled(y > window.innerHeight - 80);
      setLastScrollY(y);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  /* -------------------- Lock body when menu open -------------------- */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : prev || "";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [open]);

  /* -------------------- Close on Esc -------------------- */
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  }, []);
  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onKeyDown]);

  /* -------------------- Refs for desktop drawer click-outside -------------------- */
  const desktopDrawerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (desktopDrawerRef.current && desktopDrawerRef.current.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const closeAnd = (fn?: () => void) => () => {
    setOpen(false);
    fn?.();
  };

  const headerBgClass = isHome
    ? scrolled
      ? "bg-[var(--wnr-berry)] shadow-md"
      : "bg-transparent"
    : "bg-[var(--wnr-berry)]";

  // Unified menu order with Orders as second-last
  const menuItems = [
    { href: "/about", label: "About" },
    { href: "/products", label: "Products" },
    { href: "/contact", label: "Contact" },
    { href: "/faq", label: "FAQs" },
    // { href: "/stories", label: "Stories" },
    { href: "/orders", label: "Orders" },
    { href: "/blog", label: "Blog" },
  ];

  /* Render helpers for Wishlist icon — only when logged in */
  const WishlistIconMobile = () =>
    !loading && user ? (
      <Link
        aria-label="Wishlist"
        href="/wishlist"
        className="relative hover:opacity-80"
        title="Wishlist"
      >
        <CiHeart size={24} />
        <DotBadge active={wishlistCount > 0} />
      </Link>
    ) : null;

  const WishlistIconDesktop = () =>
    !loading && user ? (
      <Link
        aria-label="Wishlist"
        href="/wishlist"
        className="relative hover:opacity-80"
        title="Wishlist"
      >
        <CiHeart />
        <DotBadge active={wishlistCount > 0} />
      </Link>
    ) : null;

  const RewardsIconMobile = () =>
    !loading && user ? (
      <Link
        aria-label="Rewards"
        href="/rewards"
        className="relative hover:opacity-80"
        title={`Rewards - ${coinBalance || 0} coins`}
      >
        <Coins size={24} />
        {coinBalance !== null && coinBalance > 0 && (
          <span className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {coinBalance > 99 ? "99+" : coinBalance}
          </span>
        )}
      </Link>
    ) : null;

  const RewardsIconDesktop = () =>
    !loading && user ? (
      <Link
        aria-label="Rewards"
        href="/rewards"
        className="relative hover:opacity-80"
        title={`Rewards - ${coinBalance || 0} coins`}
      >
        <Coins />
        {coinBalance !== null && coinBalance > 0 && (
          <span className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {coinBalance > 99 ? "99+" : coinBalance}
          </span>
        )}
      </Link>
    ) : null;

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          visible ? "translate-y-0" : "-translate-y-full"
        } ${headerBgClass}`}
      >
        {/* Top offer strip (occupies its own row above nav) */}
        <OfferStrip />

        <div className="py-4 md:py-6">
          <div className="wnr-container">
            {/* ======= MOBILE BAR ======= */}
            <div className="md:hidden grid grid-cols-3 items-center h-14 text-white">
              {/* Hamburger */}
              <div className="flex items-center">
                <button
                  type="button"
                  aria-label={open ? "Close menu" : "Open menu"}
                  onClick={() => setOpen((v) => !v)}
                  className="relative inline-flex w-10 h-10 items-center justify-center"
                >
                  <span className="relative block w-6 h-4">
                    <span
                      className={`absolute left-0 top-0 h-[2px] w-6 bg-current transition-transform duration-300 ${
                        open ? "translate-y-[6px] rotate-45" : ""
                      }`}
                    />
                    <span
                      className={`absolute left-0 top-1/2 h-[2px] w-6 -translate-y-1/2 bg-current transition-opacity duration-200 ${
                        open ? "opacity-0" : "opacity-100"
                      }`}
                    />
                    <span
                      className={`absolute left-0 bottom-0 h-[2px] w-6 bg-current transition-transform duration-300 ${
                        open ? "-translate-y-[6px] -rotate-45" : ""
                      }`}
                    />
                  </span>
                </button>
              </div>

              {/* Logo */}
              <div className="flex items-center justify-center">
                <Link href="/" className="flex items-center" onClick={closeAnd()}>
                  <Image
                    src="/images/wild-root-logo-white.png"
                    alt="Wild n' Root"
                    width={60}
                    height={60}
                    priority
                  />
                  <span className="sr-only">Wild n Root</span>
                </Link>
              </div>

              {/* Icons: Search | Rewards | Wishlist | Cart */}
              <div className="flex items-center justify-end gap-2">
                <button
                  aria-label="Search"
                  onClick={() => setSearchOpen(true)}
                  className="relative hover:opacity-80"
                  title="Search"
                >
                  <CiSearch size={24} />
                </button>

                {/* ✅ Rewards visible only when logged in */}
                <RewardsIconMobile />

                {/* ✅ Wishlist visible only when logged in */}
                <WishlistIconMobile />

                <button
                  aria-label="Cart"
                  onClick={() => setCartOpen(true)}
                  className="relative hover:opacity-80"
                  title="Cart"
                >
                  <IoBagHandleOutline size={24} />
                  <DotBadge active={cartCount > 0} />
                </button>
              </div>
            </div>

            {/* ======= DESKTOP BAR ======= */}
            <div className="hidden md:flex h-16 items-center justify-between text-white">
              <Link href="/" className="flex items-center gap-3" onClick={closeAnd()}>
                <Image
                  src="/images/wild-root-logo-white.png"
                  alt="Wild n Root"
                  width={100}
                  height={100}
                  priority
                />
                <span className="sr-only">Wild n' Root</span>
              </Link>

              <nav className="flex items-center gap-3 text-lg">
                {/* ✅ Rewards visible only when logged in */}
                <RewardsIconDesktop />

                {/* ✅ Wishlist visible only when logged in */}
                <WishlistIconDesktop />

                <button
                  aria-label="Search"
                  onClick={() => setSearchOpen(true)}
                  className="relative hover:opacity-80"
                  title="Search"
                >
                  <CiSearch />
                </button>

                <button
                  aria-label="Cart"
                  onClick={() => setCartOpen(true)}
                  className="relative hover:opacity-80"
                  title="Cart"
                >
                  <IoBagHandleOutline />
                  <DotBadge active={cartCount > 0} />
                </button>

                <button
                  type="button"
                  aria-label={open ? "Close menu" : "Open menu"}
                  onClick={() => setOpen(true)}
                  className="ml-2 inline-flex w-10 h-10 items-center justify-center group"
                  title="Open menu"
                >
                  <span className="relative block w-6 h-4">
                    <span className="absolute left-0 top-0 h-[2px] w-6 bg-current group-hover:opacity-80" />
                    <span className="absolute left-0 top-1/2 h-[2px] w-6 -translate-y-1/2 bg-current group-hover:opacity-80" />
                    <span className="absolute left-0 bottom-0 h-[2px] w-6 bg-current group-hover:opacity-80" />
                  </span>
                </button>
              </nav>
            </div>
          </div>
        </div>

        {/* Overlay */}
        <div
          onClick={() => setOpen(false)}
          className={`fixed inset-0 backdrop-blur-[1px] transition-opacity duration-300 ${
            open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        />

        {/* ======= MOBILE CURTAIN ======= */}
        <aside
          className={`md:hidden fixed top-0 left-0 w-screen h-screen bg-[var(--wnr-berry)] text-white transform transition-transform duration-500 ease-out ${
            open ? "translate-y-0" : "-translate-y-full"
          }`}
          aria-hidden={!open}
          role="dialog"
          aria-label="Main menu"
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-5 py-4">
              <span className="font-semibold text-base">Menu</span>
              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition"
                title="Close menu"
              >
                <IoClose size={22} />
              </button>
            </div>

            <nav className="flex-1 w-full flex flex-col items-center justify-center gap-6 text-lg font-medium">
              {menuItems.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  onClick={closeAnd()}
                  className="hover:opacity-90 transition-opacity"
                >
                  {m.label}
                </Link>
              ))}
            </nav>

            {/* Auth row */}
            {!loading && user ? (
              <div className="flex items-center justify-between px-5 py-4">
                <button
                  onClick={() => {
                    setOpen(false);
                    router.push("/profile");
                  }}
                  className="flex items-center gap-3 cursor-pointer hover:opacity-90"
                  aria-label="Open profile"
                  title="Profile"
                >
                  <IoPersonCircleOutline size={28} className="text-white" />
                  <span className="text-sm font-medium">
                    {user.name || user.phone || "Profile"}
                  </span>
                </button>
                <button
                  onClick={async () => {
                    await logout({});
                    // ensure immediate clear even if redirect doesn't happen yet
                    window.dispatchEvent(new Event("wnr:wishlist:changed"));
                  }}
                  aria-label="Logout"
                  className="hover:opacity-90"
                  title="Logout"
                >
                  <IoLogOutOutline size={20} />
                </button>
              </div>
            ) : (
              <div className="px-5 py-4">
                <Link
                  href="/login"
                  onClick={closeAnd()}
                  className="inline-flex px-4 py-2 rounded-md bg-white text-[var(--wnr-berry)] hover:opacity-90"
                >
                  Sign in
                </Link>
              </div>
            )}

            <div className="px-5 py-4 text-center text-xs/relaxed text-white/80">
              © {new Date().getFullYear()} Wild n' Root
            </div>
          </div>
        </aside>

        {/* ======= DESKTOP RIGHT DRAWER ======= */}
        <aside
          ref={desktopDrawerRef}
          className={`hidden md:block fixed top-0 right-0 h-screen w-[35vw] max-w-md bg-white text-[var(--wnr-text)] shadow-2xl transform transition-transform duration-500 ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <span className="font-semibold text-lg">Menu</span>
              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-black/5 transition"
                title="Close menu"
              >
                <IoClose size={24} />
              </button>
            </div>

            <nav className="flex-1 flex flex-col items-center justify-center gap-6 text-lg font-medium">
              {menuItems.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  onClick={closeAnd()}
                  className="hover:text-[var(--wnr-berry)] transition-colors"
                >
                  {m.label}
                </Link>
              ))}
            </nav>

            {!loading && user ? (
              <div className="flex items-center justify-center gap-3 px-6 py-4 border-t">
                <button
                  onClick={() => {
                    setOpen(false);
                    router.push("/profile");
                  }}
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80"
                  aria-label="Open profile"
                  title="Profile"
                >
                  <IoPersonCircleOutline size={36} className="text-[var(--wnr-berry)]" />
                  <span className="text-sm font-medium text-gray-800">
                    {user.name || user.phone || "Profile"}
                  </span>
                </button>

                <button
                  onClick={async () => {
                    await logout({});
                    window.dispatchEvent(new Event("wnr:wishlist:changed"));
                  }}
                  aria-label="Logout"
                  className="ml-2 text-[var(--wnr-berry)] hover:opacity-80"
                  title="Logout"
                >
                  <IoLogOutOutline size={20} />
                </button>
              </div>
            ) : (
              <div className="flex justify-center px-6 py-4 border-t">
                <Link
                  href="/login"
                  onClick={closeAnd()}
                  className="px-4 py-2 rounded-md bg-[var(--wnr-berry)] text-white hover:opacity-90"
                >
                  Sign in
                </Link>
              </div>
            )}

            <div className="px-6 py-5 border-t text-center text-sm text-black/70">
              © {new Date().getFullYear()} Wild n' Root
            </div>
          </div>
        </aside>
      </header>

      {/* DRAWERS */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onNavigate={(href) => {
          setCartOpen(false);
          router.push(href);
          refreshCart();
        }}
      />
      <SearchDrawer
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={(href) => {
          setSearchOpen(false);
          router.push(href);
        }}
      />
    </>
  );
}
