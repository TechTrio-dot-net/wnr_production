// src/components/search/SearchDrawer.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { IoClose, IoBagHandleOutline } from "react-icons/io5";
import { CiHeart } from "react-icons/ci";
import { FaHeart } from "react-icons/fa";
import { toast } from "sonner";
import { products } from "../../data/Product";
import { blogPosts, type BlogPost } from "../../data/Blog";

export type SearchDrawerProps = {
  open: boolean;
  onClose: () => void;
  onNavigate: (href: string) => void;
};

const WISHLIST_KEY = "wnr:wishlist";
const CART_KEY = "wnr:cart";

type CartLine = { id: string; qty: number };

type ProductRec = {
  id: string;
  name: string;
  image: string;
  pack?: string;
  price?: number;
  images?: string[];
};

type BlogRec = {
  id: string;
  title: string;
  excerpt: string;
  href: string;
};

const productList = products as ProductRec[];

// ✅ Build a safe blog list with href derived from slug/id (no type assertion)
const blogList: BlogRec[] = (blogPosts as BlogPost[]).map((b) => ({
  id: b.id,
  title: b.title,
  excerpt: b.excerpt,
  href: b.slug ? `/blog/${b.slug}` : `/blog/${b.id}`,
}));

const loadCart = (): CartLine[] =>
  typeof window === "undefined"
    ? []
    : JSON.parse(localStorage.getItem(CART_KEY) || "[]");

const saveCart = (lines: CartLine[]) => {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(lines));
  } catch {}
};

const addToCartLS = (id: string, qty = 1) => {
  const cart = loadCart();
  const i = cart.findIndex((l) => l.id === id);
  if (i >= 0) cart[i].qty += qty;
  else cart.unshift({ id, qty });
  saveCart(cart);
};

const loadWishlist = (): Set<string> =>
  typeof window === "undefined"
    ? new Set<string>()
    : new Set<string>(JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]"));

const saveWishlist = (ids: Set<string>) => {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify([...ids]));
  } catch {}
};

export default function SearchDrawer({ open, onClose, onNavigate }: SearchDrawerProps) {
  const [query, setQuery] = useState("");
  const [wish, setWish] = useState<Set<string>>(new Set());

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : prev || "";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [open]);

  // Prime wishlist
  useEffect(() => {
    if (open) setWish(loadWishlist());
  }, [open]);

  const q = query.trim().toLowerCase();

  const productHits = useMemo(() => {
    if (!q) return [] as ProductRec[];
    return productList.filter((p) =>
      [p.name, p.pack ?? "", String(p.price ?? ""), ...(p.images ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [q]);

  const blogHits = useMemo(() => {
    if (!q) return [] as BlogRec[];
    return blogList.filter((b) => [b.title, b.excerpt].join(" ").toLowerCase().includes(q));
  }, [q]);

  const toggleWish = (id: string, name?: string) => {
    setWish((prev) => {
      const next = new Set(prev);
      const toastId = `wish-${id}`;
      if (next.has(id)) {
        next.delete(id);
        toast("Removed from wishlist", { id: toastId, description: name });
      } else {
        next.add(id);
        toast.success("Added to wishlist", { id: toastId, description: name });
      }
      saveWishlist(next);
      return next;
    });
  };

  const addToCart = (id: string, name?: string) => {
    addToCartLS(id, 1);
    toast.success("Added to cart", {
      id: `cart-${id}`,
      description: name,
      action: { label: "View cart", onClick: () => onNavigate("/cart") },
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/20 transition-opacity z-[69] ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 h-screen w-full md:w-[35vw] max-w-md bg-white text-[var(--wnr-text)]
        shadow-2xl transform transition-transform duration-500 z-[70] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Search"
        aria-hidden={!open}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <input
            autoFocus={open}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products or blog..."
            className="flex-1 rounded-full px-4 py-2 ring-soft outline-none"
          />
          <button
            aria-label="Close"
            onClick={onClose}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-black/5"
          >
            <IoClose size={22} />
          </button>
        </div>

        <div className="h-[calc(100vh-64px)] overflow-y-auto p-5 space-y-8">
          {q ? (
            <>
              <section>
                <h4 className="font-semibold mb-3">Products</h4>
                {productHits.length === 0 ? (
                  <p className="text-sm muted">No matching products.</p>
                ) : (
                  <ul className="space-y-3">
                    {productHits.map((p) => {
                      const liked = wish.has(p.id);
                      return (
                        <li key={p.id} className="card ring-soft p-3 flex gap-3">
                          <button
                            className="block relative w-16 h-16 shrink-0 rounded-lg overflow-hidden"
                            onClick={() => onNavigate(`/products/${p.id}`)}
                            aria-label={`Open ${p.name}`}
                          >
                            <Image src={p.image} alt={p.name} fill className="object-cover" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => onNavigate(`/products/${p.id}`)}
                              className="font-semibold line-clamp-1 hover:text-[var(--wnr-berry)] text-left"
                            >
                              {p.name}
                            </button>
                            <p className="text-sm muted line-clamp-2">
                              {p.pack ?? "15 DIP BAGS"} • ₹{(p.price ?? 399).toLocaleString("en-IN")}/-
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                className="cursor-pointer grid place-items-center h-8 w-8 rounded-full bg-[var(--wnr-berry)] text-white hover:opacity-90"
                                onClick={() => addToCart(p.id, p.name)}
                                aria-label="Add to cart"
                              >
                                <IoBagHandleOutline size={18} />
                              </button>
                              <button
                                className={`cursor-pointer grid place-items-center h-8 w-8 rounded-full ring-1 ring-black/5 transition ${
                                  liked ? "bg-[var(--wnr-pink)] text-white" : "bg-white text-[var(--wnr-berry)]"
                                }`}
                                onClick={() => toggleWish(p.id, p.name)}
                                aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
                                aria-pressed={liked}
                              >
                                {liked ? <FaHeart size={16} /> : <CiHeart size={18} />}
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section>
                <h4 className="font-semibold mb-3">Blog</h4>
                {blogHits.length === 0 ? (
                  <p className="text-sm muted">No matching posts.</p>
                ) : (
                  <ul className="space-y-3">
                    {blogHits.map((b) => (
                      <li key={b.id} className="card ring-soft p-3 flex gap-3">
                        <Link
                          href={b.href}
                          className="flex-1 min-w-0"
                          onClick={(e) => {
                            e.preventDefault();
                            onNavigate(b.href);
                          }}
                        >
                          <div className="font-semibold line-clamp-1 hover:text-[var(--wnr-berry)]">
                            {b.title}
                          </div>
                          <p className="text-sm muted mt-1 line-clamp-2">{b.excerpt}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : (
            <p className="text-sm muted">Type to search products or blog…</p>
          )}
        </div>
      </aside>
    </>
  );
}
