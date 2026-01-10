// src/components/search/SearchDrawer.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { IoClose, IoBagHandleOutline } from "react-icons/io5";
import { CiHeart } from "react-icons/ci";
import { FaHeart } from "react-icons/fa";
import { toast } from "sonner";
import { blogPosts, type BlogPost } from "../../data/Blog";
import { trackAddToCart } from "@/lib/metaPixel";
import { useProducts } from "@/hooks/useProducts";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

export type SearchDrawerProps = {
  open: boolean;
  onClose: () => void;
  onNavigate: (href: string) => void;
};


type ProductRec = {
  id: string;
  name: string;
  image: string;
  pack?: string;
  price?: number;
  images?: string[];
  stock?: number;
};

type BlogRec = {
  id: string;
  title: string;
  excerpt: string;
  href: string;
};

// ✅ Build a safe blog list with href derived from slug/id (no type assertion)
const blogList: BlogRec[] = (blogPosts as BlogPost[]).map((b) => ({
  id: b.id,
  title: b.title,
  excerpt: b.excerpt,
  href: b.slug ? `/blog/${b.slug}` : `/blog/${b.id}`,
}));

export default function SearchDrawer({ open, onClose, onNavigate }: SearchDrawerProps) {
  const [query, setQuery] = useState("");
  const { add } = useCart();
  const { ids: wishIds, toggle: toggleWish } = useWishlist();
  
  // Fetch products from API
  const { data: apiProducts, isLoading: productsLoading } = useProducts();

  // Convert API products to ProductRec format
  const productList: ProductRec[] = useMemo(() => {
    if (!apiProducts) return [];
    return apiProducts.map((p) => {
      const mainImage = p.image || "/product-placeholder.png";
      const imagesArray: string[] = [mainImage];
      if (p.hoverImage && p.hoverImage !== mainImage) {
        imagesArray.push(p.hoverImage);
      }
      return {
        id: p.id,
        name: p.name,
        image: mainImage,
        pack: p.pack,
        price: p.price,
        stock: p.stock,
        images: imagesArray,
      };
    });
  }, [apiProducts]);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : prev || "";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [open]);

  const q = query.trim().toLowerCase();

  const productHits = useMemo(() => {
    if (!q || !productList.length) return [] as ProductRec[];
    return productList.filter((p) =>
      [p.name, p.pack ?? "", String(p.price ?? ""), ...(p.images ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [q, productList]);

  const blogHits = useMemo(() => {
    if (!q) return [] as BlogRec[];
    return blogList.filter((b) => [b.title, b.excerpt].join(" ").toLowerCase().includes(q));
  }, [q]);

  const handleToggleWish = async (id: string, name?: string) => {
    try {
      await toggleWish(id);
      const isLiked = wishIds.has(id);
      toast.success(isLiked ? "Removed from wishlist" : "Added to wishlist", {
        id: `wish-${id}`,
        description: name,
      });
    } catch (e: any) {
      toast.error(e?.message || "Could not update wishlist");
    }
  };

  const handleAddToCart = async (id: string, name?: string) => {
    try {
      await add(id, 1);
      toast.success("Added to cart", {
        id: `cart-${id}`,
        description: name,
        action: { label: "View cart", onClick: () => onNavigate("/cart") },
      });
      // Meta Pixel: AddToCart
      const product = productList.find((p) => p.id === id);
      if (product) {
        trackAddToCart([{ id: product.id, name: product.name || name, price: product.price || 0, quantity: 1 }]);
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not add to cart");
    }
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
                {productsLoading ? (
                  <p className="text-sm muted">Loading products...</p>
                ) : productHits.length === 0 ? (
                  <p className="text-sm muted">No matching products.</p>
                ) : (
                  <ul className="space-y-3">
                    {productHits.map((p) => {
                      const liked = wishIds.has(p.id);
                      const isOutOfStock = typeof p.stock === 'number' && p.stock === 0;
                      return (
                        <li key={p.id} className={`card ring-soft p-3 flex gap-3 ${isOutOfStock ? 'opacity-75' : ''}`}>
                          <button
                            className={`block relative w-16 h-16 shrink-0 rounded-lg overflow-hidden ${isOutOfStock ? 'grayscale opacity-60' : ''}`}
                            onClick={() => onNavigate(`/products/${p.id}`)}
                            aria-label={`Open ${p.name}`}
                          >
                            <Image 
                              src={p.image || "/product-placeholder.png"} 
                              alt={p.name} 
                              fill 
                              className="object-cover"
                              sizes="64px"
                            />
                            {isOutOfStock && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                                <span className="text-[8px] font-extrabold text-white bg-gray-800 px-1.5 py-0.5 rounded">
                                  OUT
                                </span>
                              </div>
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => onNavigate(`/products/${p.id}`)}
                              className={`font-semibold line-clamp-1 hover:text-[var(--wnr-berry)] text-left ${isOutOfStock ? 'text-gray-500' : ''}`}
                            >
                              {p.name}
                            </button>
                            <p className={`text-sm muted line-clamp-2 ${isOutOfStock ? 'text-gray-400' : ''}`}>
                              {p.pack ?? "15 DIP BAGS"} • ₹{(p.price ?? 399).toLocaleString("en-IN")}/-
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                disabled={isOutOfStock}
                                className={`cursor-pointer grid place-items-center h-8 w-8 rounded-full bg-[var(--wnr-berry)] text-white hover:opacity-90 transition ${
                                  isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                onClick={() => {
                                  if (isOutOfStock) {
                                    toast.error("This product is out of stock");
                                    return;
                                  }
                                  handleAddToCart(p.id, p.name);
                                }}
                                aria-label="Add to cart"
                              >
                                <IoBagHandleOutline size={18} />
                              </button>
                              <button
                                className={`cursor-pointer grid place-items-center h-8 w-8 rounded-full ring-1 ring-black/5 transition ${
                                  liked ? "bg-[var(--wnr-pink)] text-white" : "bg-white text-[var(--wnr-berry)]"
                                }`}
                                onClick={() => handleToggleWish(p.id, p.name)}
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
